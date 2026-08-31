use async_trait::async_trait;
use base64::{engine::general_purpose::STANDARD, Engine as _};

use zkvm_isa::Program;
use zkvm_stark::{prove_program, public_inputs_for_program, verify_program, Proof};

use crate::backend::{BackendError, BackendProof, ProverBackend};

/// The one real backend: the Winterfell-based STARK prover already exercised
/// by `zkvm-cli` and the plain `/v1/proofs` / `/v1/verify` endpoints.
pub struct StarkBackend;

#[async_trait]
impl ProverBackend for StarkBackend {
    fn name(&self) -> &str {
        "stark"
    }

    async fn prove(&self, program: &Program) -> Result<BackendProof, BackendError> {
        let (proof, pub_inputs) = prove_program(program).map_err(BackendError)?;
        let bytes = proof_to_bytes(&proof);
        Ok(BackendProof {
            backend: self.name().to_string(),
            bytes_len: bytes.len(),
            bytes_base64: STANDARD.encode(&bytes),
            public_inputs: serde_json::json!({
                "initial": pub_inputs.initial.to_string(),
                "result": pub_inputs.result.to_string(),
            }),
        })
    }

    async fn verify(&self, program: &Program, proof_bytes: &[u8]) -> Result<bool, BackendError> {
        let proof = proof_from_bytes(proof_bytes).map_err(BackendError)?;
        let padded = program.padded();
        let pub_inputs = public_inputs_for_program(&padded);
        Ok(verify_program(proof, pub_inputs).is_ok())
    }
}

fn proof_to_bytes(proof: &Proof) -> Vec<u8> {
    proof.to_bytes()
}

fn proof_from_bytes(bytes: &[u8]) -> Result<Proof, String> {
    use winter_utils::Deserializable;
    Proof::read_from_bytes(bytes).map_err(|e| e.to_string())
}
