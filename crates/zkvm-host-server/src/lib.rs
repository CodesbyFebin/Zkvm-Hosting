//! The one real piece of the "zkvm.host" pitch this repo can honestly claim: a
//! "push a program, get a proof" HTTP API, backed by the actual zkVM in this repo
//! (`zkvm-isa` + `zkvm-stark`). It is a single-backend proving service, not a
//! multi-VM router across SP1/RISC Zero/Jolt/ZKWASM, and it has no billing, no
//! CI/CD integration, and no edge/WASM proving. See /docs/HOST_SERVICE.md for what
//! that gap actually looks like.

pub mod backend;
pub mod backends;
pub mod mcp;
pub mod router;

use std::sync::Arc;
use std::time::Duration;

use axum::{
    extract::{DefaultBodyLimit, Path, State},
    http::StatusCode,
    response::{IntoResponse, Json, Response},
    routing::{get, post},
    Router,
};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::{Deserialize, Serialize};
use tower::limit::ConcurrencyLimitLayer;
use tower_http::timeout::TimeoutLayer;

use backend::BackendProof;
use backends::{mock_echo::MockEchoBackend, stark::StarkBackend};
use router::ProverRouter;
use zkvm_isa::Program;
use zkvm_stark::{prove_program, public_inputs_for_program, verify_program, Proof};

struct AppState {
    router: ProverRouter,
}

fn default_router() -> ProverRouter {
    let mut router = ProverRouter::new("stark");
    router.register(Arc::new(StarkBackend));
    router.register(Arc::new(MockEchoBackend));
    router
}

/// Above this, a request is rejected before any proving/verification work starts.
/// Tuned against real measurements on ordinary dev-laptop hardware (`zkvm prove`,
/// `INIT 0` + N `ADD 1` instructions, release build): 2,000 instructions ~6s,
/// 4,000 instructions ~32s -- proving time here is clearly worse than linear in
/// program length (consistent with the FFT-heavy operations STARK proving
/// involves), not just "generous." 2,000 was picked to keep worst-case proving
/// time an order of magnitude under `REQUEST_TIMEOUT` even on slower/loaded
/// production hardware. Re-measure before raising this -- it is load-bearing for
/// `REQUEST_TIMEOUT` actually being a backstop rather than routine behavior.
pub const MAX_PROGRAM_INSTRUCTIONS: usize = 2_000;

/// Request body size cap. `.zkasm` source is plain text; a legitimate program
/// under `MAX_PROGRAM_INSTRUCTIONS` fits comfortably within this many times over.
const MAX_BODY_BYTES: usize = 1024 * 1024; // 1 MiB

/// Per-request wall-clock budget, covering the slowest real operation here
/// (STARK proving). Generous relative to anything `MAX_PROGRAM_INSTRUCTIONS`
/// currently produces, specifically so a legitimate request never trips it.
const REQUEST_TIMEOUT: Duration = Duration::from_secs(60);

/// Cap on requests actually being worked on at once (proving is CPU-heavy;
/// unbounded parallel proving is a real resource-exhaustion path on a public
/// endpoint -- see the "operational security" gap named in the external
/// review this const was added in response to). Queued requests wait rather
/// than being rejected; nothing here yet turns a long queue into a 503 -- see
/// `docs/THREAT_MODEL.md` for what's NOT covered.
const MAX_CONCURRENT_REQUESTS: usize = 4;

/// Returns an error message (not any particular error type -- this is shared
/// across the plain HTTP handlers below, the `ProverBackend` impls, and the
/// MCP tools in `mcp.rs`, which each wrap it in their own error type) if
/// `program` is over `MAX_PROGRAM_INSTRUCTIONS`.
pub(crate) fn check_program_size(program: &Program) -> Result<(), String> {
    if program.instructions.len() > MAX_PROGRAM_INSTRUCTIONS {
        return Err(format!(
            "program has {} instructions, over the {MAX_PROGRAM_INSTRUCTIONS} limit",
            program.instructions.len()
        ));
    }
    Ok(())
}

/// Builds the axum app. Exposed separately from `main` so tests can drive it
/// in-process (see `tests/api.rs`) without binding a real socket.
///
/// `/v1/proofs` and `/v1/verify` are the original, single-backend endpoints and
/// are unchanged -- they always use the `stark` backend directly. The
/// `/v1/backends*` endpoints are the new, additive multi-backend surface (see
/// `backend::ProverBackend` / `router::ProverRouter`); nothing about the
/// original two endpoints' behavior changed.
///
/// Hardening applied uniformly to every route: a request body size cap, a
/// per-request timeout, and a concurrency cap (see the constants above for
/// why each value was picked, and what's still NOT covered).
pub fn app() -> Router {
    Router::new()
        .route("/healthz", get(healthz))
        .route("/v1/proofs", post(create_proof))
        .route("/v1/verify", post(verify_proof_handler))
        .route("/v1/backends", get(list_backends))
        .route("/v1/backends/{name}/proofs", post(create_backend_proof))
        .route("/v1/backends/{name}/verify", post(verify_backend_proof))
        .layer(DefaultBodyLimit::max(MAX_BODY_BYTES))
        .layer(TimeoutLayer::with_status_code(
            StatusCode::REQUEST_TIMEOUT,
            REQUEST_TIMEOUT,
        ))
        .layer(ConcurrencyLimitLayer::new(MAX_CONCURRENT_REQUESTS))
        .with_state(Arc::new(AppState {
            router: default_router(),
        }))
}

async fn healthz() -> &'static str {
    "ok"
}

struct ApiError(StatusCode, String);

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (self.0, Json(serde_json::json!({ "error": self.1 }))).into_response()
    }
}

fn bad_request(msg: impl Into<String>) -> ApiError {
    ApiError(StatusCode::BAD_REQUEST, msg.into())
}

fn internal_error(msg: impl Into<String>) -> ApiError {
    ApiError(StatusCode::INTERNAL_SERVER_ERROR, msg.into())
}

#[derive(Debug, Deserialize)]
struct CreateProofRequest {
    /// A `.zkasm` program, as text (see `zkvm_isa::Program::parse`).
    program: String,
}

#[derive(Debug, Serialize)]
struct CreateProofResponse {
    initial: String,
    result: String,
    proof_bytes: usize,
    proof_base64: String,
}

/// `POST /v1/proofs` -- "push code, get a ZK proof" as a single HTTP call. This is
/// literally the whole "no circuits, no prover clusters, no infra" pitch, scoped to
/// the one real proving backend that exists in this repo.
async fn create_proof(
    State(_state): State<Arc<AppState>>,
    Json(req): Json<CreateProofRequest>,
) -> Result<Json<CreateProofResponse>, ApiError> {
    let program = Program::parse(&req.program).map_err(bad_request)?;
    check_program_size(&program).map_err(bad_request)?;
    let (proof, pub_inputs) = prove_program(&program).map_err(internal_error)?;
    let bytes = proof_to_bytes(&proof);

    Ok(Json(CreateProofResponse {
        initial: pub_inputs.initial.to_string(),
        result: pub_inputs.result.to_string(),
        proof_bytes: bytes.len(),
        proof_base64: STANDARD.encode(bytes),
    }))
}

#[derive(Debug, Deserialize)]
struct VerifyRequest {
    program: String,
    proof_base64: String,
}

#[derive(Debug, Serialize)]
struct VerifyResponse {
    valid: bool,
    result: Option<String>,
    error: Option<String>,
}

/// `POST /v1/verify` -- re-executes `program` locally (cheap) to know what public
/// inputs to check `proof_base64` against, then verifies. Deliberately does NOT
/// require the caller to have kept anything from the `/v1/proofs` response other
/// than the proof bytes themselves -- the program is the only shared trust anchor.
async fn verify_proof_handler(
    State(_state): State<Arc<AppState>>,
    Json(req): Json<VerifyRequest>,
) -> Result<Json<VerifyResponse>, ApiError> {
    let program = Program::parse(&req.program).map_err(bad_request)?;
    check_program_size(&program).map_err(bad_request)?;
    let bytes = STANDARD
        .decode(&req.proof_base64)
        .map_err(|e| bad_request(format!("bad base64: {e}")))?;
    let proof =
        proof_from_bytes(&bytes).map_err(|e| bad_request(format!("bad proof bytes: {e}")))?;

    let padded = program.padded();
    let pub_inputs = public_inputs_for_program(&padded);
    let claimed_result = pub_inputs.result.to_string();

    match verify_program(proof, pub_inputs) {
        Ok(()) => Ok(Json(VerifyResponse {
            valid: true,
            result: Some(claimed_result),
            error: None,
        })),
        Err(e) => Ok(Json(VerifyResponse {
            valid: false,
            result: None,
            error: Some(e.to_string()),
        })),
    }
}

fn proof_to_bytes(proof: &Proof) -> Vec<u8> {
    proof.to_bytes()
}

fn proof_from_bytes(bytes: &[u8]) -> Result<Proof, String> {
    use winter_utils::Deserializable;
    Proof::read_from_bytes(bytes).map_err(|e| e.to_string())
}

// ---- Multi-backend surface (additive; does not change the two endpoints above) ----

#[derive(Debug, Serialize)]
struct BackendsResponse {
    backends: Vec<String>,
    default: String,
}

/// `GET /v1/backends` -- lists what's actually registered, so "multi-VM" is a
/// checkable claim rather than marketing copy. Today that's `stark` (real) and
/// `mock-echo` (a routing stub, not a second prover).
async fn list_backends(State(state): State<Arc<AppState>>) -> Json<BackendsResponse> {
    Json(BackendsResponse {
        backends: state.router.names(),
        default: state.router.default_name().to_string(),
    })
}

fn backend_not_found(name: &str) -> ApiError {
    ApiError(StatusCode::NOT_FOUND, format!("no such backend: {name}"))
}

/// `POST /v1/backends/{name}/proofs` -- the router-dispatched equivalent of
/// `/v1/proofs`, generalized to whichever backend `{name}` names.
async fn create_backend_proof(
    State(state): State<Arc<AppState>>,
    Path(name): Path<String>,
    Json(req): Json<CreateProofRequest>,
) -> Result<Json<BackendProof>, ApiError> {
    let backend = state
        .router
        .get(Some(&name))
        .ok_or_else(|| backend_not_found(&name))?;
    let program = Program::parse(&req.program).map_err(bad_request)?;
    check_program_size(&program).map_err(bad_request)?;
    let proof = backend
        .prove(&program)
        .await
        .map_err(|e| internal_error(e.0))?;
    Ok(Json(proof))
}

#[derive(Debug, Deserialize)]
struct VerifyBackendRequest {
    program: String,
    bytes_base64: String,
}

#[derive(Debug, Serialize)]
struct VerifyBackendResponse {
    valid: bool,
    error: Option<String>,
}

/// `POST /v1/backends/{name}/verify` -- the router-dispatched equivalent of
/// `/v1/verify`. A backend that cannot verify anything (see `MockEchoBackend`)
/// reports that as an error, never as `valid: true`.
async fn verify_backend_proof(
    State(state): State<Arc<AppState>>,
    Path(name): Path<String>,
    Json(req): Json<VerifyBackendRequest>,
) -> Result<Json<VerifyBackendResponse>, ApiError> {
    let backend = state
        .router
        .get(Some(&name))
        .ok_or_else(|| backend_not_found(&name))?;
    let program = Program::parse(&req.program).map_err(bad_request)?;
    check_program_size(&program).map_err(bad_request)?;
    let bytes = STANDARD
        .decode(&req.bytes_base64)
        .map_err(|e| bad_request(format!("bad base64: {e}")))?;

    match backend.verify(&program, &bytes).await {
        Ok(valid) => Ok(Json(VerifyBackendResponse { valid, error: None })),
        Err(e) => Ok(Json(VerifyBackendResponse {
            valid: false,
            error: Some(e.0),
        })),
    }
}
