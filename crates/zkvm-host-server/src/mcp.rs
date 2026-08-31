//! Exposes the real `prove`/`verify` functionality as MCP tools, so an MCP
//! client (Claude, Cursor, or anything else speaking the protocol) can call
//! this server directly. Built against rmcp 3.1's actual API, verified against
//! the upstream repo's own examples rather than guessed -- notably its tool
//! macros take a `Parameters<T>`-wrapped, `schemars::JsonSchema`-deriving
//! struct per tool, not inline attributes on bare parameters.
//!
//! Runs on its own port (see `serve` below), not nested onto the `/v1/*` axum
//! router: `StreamableHttpService` implements `tower::Service`, but its
//! `Response` body type doesn't line up with `axum::Router::nest_service`
//! without an adapter, and rmcp's own examples serve it via a raw hyper accept
//! loop for exactly that reason -- so that's what this does too, rather than
//! claiming an unverified "just nest it" integration.

use std::net::SocketAddr;

use base64::{engine::general_purpose::STANDARD, Engine as _};
use hyper_util::{
    rt::{TokioExecutor, TokioIo},
    server::conn::auto::Builder,
    service::TowerToHyperService,
};
use rmcp::{
    handler::server::{router::tool::ToolRouter, wrapper::Parameters},
    model::{CallToolResult, ContentBlock, Implementation, ProtocolVersion, ServerCapabilities, ServerInfo},
    schemars,
    tool, tool_handler, tool_router,
    transport::streamable_http_server::{session::local::LocalSessionManager, StreamableHttpService},
    ErrorData as McpError, ServerHandler,
};

use winter_utils::Deserializable;
use zkvm_isa::Program;
use zkvm_stark::{prove_program, public_inputs_for_program, verify_program, Proof};

#[derive(Debug, serde::Deserialize, schemars::JsonSchema)]
struct ProveArgs {
    /// The `.zkasm` program text to prove (see the repo README for the format).
    program: String,
}

#[derive(Debug, serde::Deserialize, schemars::JsonSchema)]
struct VerifyArgs {
    /// The exact `.zkasm` program text the proof is claimed to be for.
    program: String,
    /// Base64-encoded proof bytes, as returned by the `prove` tool.
    proof_base64: String,
}

#[derive(Clone)]
pub struct ZkvmMcp {
    // Read by the `#[tool_handler]`-generated `ServerHandler::call_tool` impl below,
    // through macro hygiene rustc's dead-code lint can't see across -- not actually
    // unused. Same field, same warning, in rmcp's own upstream examples.
    #[allow(dead_code)]
    tool_router: ToolRouter<ZkvmMcp>,
}

#[tool_router]
impl ZkvmMcp {
    fn new() -> Self {
        Self { tool_router: Self::tool_router() }
    }

    #[tool(
        description = "Generate a real STARK proof that a .zkasm program executes to its claimed result. Returns the base64-encoded proof and the (initial, result) public inputs."
    )]
    async fn prove(&self, Parameters(args): Parameters<ProveArgs>) -> Result<CallToolResult, McpError> {
        let program = Program::parse(&args.program).map_err(|e| McpError::invalid_params(e, None))?;
        let (proof, pub_inputs) =
            prove_program(&program).map_err(|e| McpError::internal_error(e, None))?;
        let bytes = proof.to_bytes();

        let response = serde_json::json!({
            "initial": pub_inputs.initial.to_string(),
            "result": pub_inputs.result.to_string(),
            "proof_bytes": bytes.len(),
            "proof_base64": STANDARD.encode(bytes),
        });
        Ok(CallToolResult::success(vec![ContentBlock::text(response.to_string())]))
    }

    #[tool(
        description = "Verify a proof (from the prove tool) against the exact .zkasm program it claims to be for. Re-executes the program locally to know what to check -- it never trusts the proof's own claims."
    )]
    async fn verify(&self, Parameters(args): Parameters<VerifyArgs>) -> Result<CallToolResult, McpError> {
        let program = Program::parse(&args.program).map_err(|e| McpError::invalid_params(e, None))?;
        let bytes = STANDARD
            .decode(&args.proof_base64)
            .map_err(|e| McpError::invalid_params(format!("bad base64: {e}"), None))?;
        let proof =
            Proof::read_from_bytes(&bytes).map_err(|e| McpError::invalid_params(format!("bad proof bytes: {e}"), None))?;

        let padded = program.padded();
        let pub_inputs = public_inputs_for_program(&padded);
        let claimed_result = pub_inputs.result.to_string();

        let response = match verify_program(proof, pub_inputs) {
            Ok(()) => serde_json::json!({ "valid": true, "result": claimed_result }),
            Err(e) => serde_json::json!({ "valid": false, "error": e.to_string() }),
        };
        Ok(CallToolResult::success(vec![ContentBlock::text(response.to_string())]))
    }
}

#[tool_handler]
impl ServerHandler for ZkvmMcp {
    fn get_info(&self) -> ServerInfo {
        ServerInfo::new(ServerCapabilities::builder().enable_tools().build())
            .with_server_info(Implementation::new("zkvm-host-server", env!("CARGO_PKG_VERSION")))
            .with_protocol_version(ProtocolVersion::V_2024_11_05)
            .with_instructions(
                "Tools for the zkvm-host STARK prover: `prove` a .zkasm program, `verify` a proof against one."
                    .to_string(),
            )
    }
}

/// Runs the MCP server on its own listener until the process exits or the
/// socket fails to bind.
pub async fn serve(addr: SocketAddr) -> std::io::Result<()> {
    let service = TowerToHyperService::new(StreamableHttpService::new(
        || Ok(ZkvmMcp::new()),
        LocalSessionManager::default().into(),
        Default::default(),
    ));
    let listener = tokio::net::TcpListener::bind(addr).await?;
    println!("zkvm-host-server MCP tools listening on http://{addr}");
    loop {
        let (stream, _) = listener.accept().await?;
        let io = TokioIo::new(stream);
        let service = service.clone();
        tokio::spawn(async move {
            let _ = Builder::new(TokioExecutor::default()).serve_connection(io, service).await;
        });
    }
}
