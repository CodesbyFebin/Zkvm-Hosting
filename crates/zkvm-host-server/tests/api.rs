use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use tower::ServiceExt;

use zkvm_host_server::app;

const PROGRAM: &str = "INIT 5\nADD 3\nMUL 2\nSUB 4\n"; // ((5+3)*2)-4 = 12

async fn post_json(path: &str, body: Value) -> (StatusCode, Value) {
    let request = Request::builder()
        .method("POST")
        .uri(path)
        .header("content-type", "application/json")
        .body(Body::from(body.to_string()))
        .unwrap();
    let response = app().oneshot(request).await.unwrap();
    let status = response.status();
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    let json: Value = serde_json::from_slice(&bytes).unwrap();
    (status, json)
}

#[tokio::test]
async fn healthz_reports_ok() {
    let request = Request::builder()
        .uri("/healthz")
        .body(Body::empty())
        .unwrap();
    let response = app().oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn create_proof_and_verify_round_trip() {
    let (status, body) = post_json("/v1/proofs", json!({ "program": PROGRAM })).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["result"], "12");
    assert!(body["proof_bytes"].as_u64().unwrap() > 0);
    let proof_base64 = body["proof_base64"].as_str().unwrap().to_string();

    let (status, body) = post_json(
        "/v1/verify",
        json!({ "program": PROGRAM, "proof_base64": proof_base64 }),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["valid"], true);
    assert_eq!(body["result"], "12");
}

#[tokio::test]
async fn create_proof_rejects_an_unparseable_program() {
    let (status, body) = post_json("/v1/proofs", json!({ "program": "NOT A PROGRAM" })).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(!body["error"].as_str().unwrap().is_empty());
}

#[tokio::test]
async fn verify_rejects_a_proof_against_a_different_program() {
    let (_, body) = post_json("/v1/proofs", json!({ "program": PROGRAM })).await;
    let proof_base64 = body["proof_base64"].as_str().unwrap().to_string();

    let different_program = "INIT 5\nADD 3\nMUL 2\nSUB 5\n"; // => 11, not 12
    let (status, body) = post_json(
        "/v1/verify",
        json!({ "program": different_program, "proof_base64": proof_base64 }),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["valid"], false);
}

#[tokio::test]
async fn verify_rejects_garbage_base64() {
    let (status, _body) = post_json(
        "/v1/verify",
        json!({ "program": PROGRAM, "proof_base64": "not-valid-base64!!" }),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

// ---- Multi-backend router ----

async fn get_json(path: &str) -> (StatusCode, Value) {
    let request = Request::builder().uri(path).body(Body::empty()).unwrap();
    let response = app().oneshot(request).await.unwrap();
    let status = response.status();
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    let json: Value = serde_json::from_slice(&bytes).unwrap();
    (status, json)
}

#[tokio::test]
async fn lists_registered_backends() {
    let (status, body) = get_json("/v1/backends").await;
    assert_eq!(status, StatusCode::OK);
    let names: Vec<&str> = body["backends"]
        .as_array()
        .unwrap()
        .iter()
        .map(|v| v.as_str().unwrap())
        .collect();
    assert!(names.contains(&"stark"));
    assert!(names.contains(&"mock-echo"));
    assert_eq!(body["default"], "stark");
}

#[tokio::test]
async fn stark_backend_round_trips_through_the_router() {
    let (status, body) =
        post_json("/v1/backends/stark/proofs", json!({ "program": PROGRAM })).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["backend"], "stark");
    assert!(body["bytes_len"].as_u64().unwrap() > 0);
    let bytes_base64 = body["bytes_base64"].as_str().unwrap().to_string();

    let (status, body) = post_json(
        "/v1/backends/stark/verify",
        json!({ "program": PROGRAM, "bytes_base64": bytes_base64 }),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["valid"], true);
}

#[tokio::test]
async fn mock_echo_backend_produces_a_proof_but_never_verifies_one() {
    let (status, body) = post_json(
        "/v1/backends/mock-echo/proofs",
        json!({ "program": PROGRAM }),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["backend"], "mock-echo");

    let bytes_base64 = body["bytes_base64"].as_str().unwrap().to_string();
    let (status, body) = post_json(
        "/v1/backends/mock-echo/verify",
        json!({ "program": PROGRAM, "bytes_base64": bytes_base64 }),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["valid"], false);
    assert!(body["error"].as_str().unwrap().contains("routing stub"));
}

#[tokio::test]
async fn unknown_backend_name_is_a_404_not_a_silent_success() {
    let (status, _body) = post_json("/v1/backends/sp1/proofs", json!({ "program": PROGRAM })).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

// ---- Hardening: request-size limits (see the constants at the top of src/lib.rs) ----

fn program_with_instructions(count: usize) -> String {
    let mut text = String::from("INIT 0\n");
    for _ in 0..count {
        text.push_str("ADD 1\n");
    }
    text
}

#[tokio::test]
async fn create_proof_rejects_a_program_over_the_instruction_limit() {
    // One over the limit -- confirms the check is "> MAX", not "off by one" in
    // either direction, without actually building a 10,001-row trace.
    let program = program_with_instructions(zkvm_host_server::MAX_PROGRAM_INSTRUCTIONS + 1);
    let (status, body) = post_json("/v1/proofs", json!({ "program": program })).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(body["error"].as_str().unwrap().contains("limit"));
}

#[tokio::test]
async fn backend_router_also_rejects_a_program_over_the_instruction_limit() {
    // The router path calls into StarkBackend::prove separately from
    // create_proof -- confirms the check isn't only wired on one of the two.
    let program = program_with_instructions(zkvm_host_server::MAX_PROGRAM_INSTRUCTIONS + 1);
    let (status, _body) =
        post_json("/v1/backends/stark/proofs", json!({ "program": program })).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn create_proof_accepts_a_program_at_exactly_the_instruction_limit() {
    // Guards against an off-by-one that would reject legitimate programs at
    // the boundary.
    let program = program_with_instructions(zkvm_host_server::MAX_PROGRAM_INSTRUCTIONS);
    let (status, _body) = post_json("/v1/proofs", json!({ "program": program })).await;
    assert_eq!(status, StatusCode::OK);
}

#[tokio::test]
async fn create_proof_rejects_an_oversized_request_body() {
    // Padding via a comment line, not more instructions -- isolates the body-size
    // limit from the separate instruction-count limit tested above.
    let padding = "# ".to_string() + &"x".repeat(2 * 1024 * 1024);
    let program = format!("INIT 0\n{padding}\nADD 1\n");
    let request = Request::builder()
        .method("POST")
        .uri("/v1/proofs")
        .header("content-type", "application/json")
        .body(Body::from(json!({ "program": program }).to_string()))
        .unwrap();
    let response = app().oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::PAYLOAD_TOO_LARGE);
}
