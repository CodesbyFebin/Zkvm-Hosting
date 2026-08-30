use async_trait::async_trait;
use base64::{engine::general_purpose::STANDARD, Engine as _};

use zkvm_isa::Program;

use crate::backend::{BackendError, BackendProof, ProverBackend};

/// A deliberately non-cryptographic stand-in, registered only to prove the
/// router can hold more than one backend before a second real prover (SP1,
/// RISC Zero, ...) is actually integrated. It does NOT produce a real proof,
/// and `verify` always rejects -- same "fail loudly, never fake success" rule
/// as `contracts/src/UnimplementedStarkVerifier.sol`. Deliberately not named
/// "sp1" or "risc-zero": naming a stub after a real project it doesn't
/// implement would be actively misleading, not just incomplete.
pub struct MockEchoBackend;

#[async_trait]
impl ProverBackend for MockEchoBackend {
    fn name(&self) -> &str {
        "mock-echo"
    }

    async fn prove(&self, program: &Program) -> Result<BackendProof, BackendError> {
        let note = format!(
            "mock-echo: {} instruction(s) -- NOT a real proof, routing stub only",
            program.instructions.len()
        );
        Ok(BackendProof {
            backend: self.name().to_string(),
            bytes_len: note.len(),
            bytes_base64: STANDARD.encode(note.as_bytes()),
            public_inputs: serde_json::json!({
                "note": "mock-echo produces no real public inputs"
            }),
        })
    }

    async fn verify(&self, _program: &Program, _proof_bytes: &[u8]) -> Result<bool, BackendError> {
        Err(BackendError(
            "mock-echo cannot verify anything -- it is a routing stub, not a prover".into(),
        ))
    }
}
