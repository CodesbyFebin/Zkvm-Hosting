//! The pluggable-backend abstraction that makes "multi-VM router" more than a
//! slogan: adding a prover means implementing this trait and registering it,
//! not touching the HTTP layer. There is exactly one real implementation today
//! (`backends::stark`); `backends::mock_echo` exists only to prove the router
//! itself works with more than one entry, and is honest about doing nothing
//! cryptographic.

use async_trait::async_trait;
use zkvm_isa::Program;

/// An opaque, backend-tagged proof. `bytes_base64`'s format is defined entirely
/// by `backend` -- there is no shared proof format across backends, because
/// different proving backends (STARK today; SP1/RISC Zero if integrated later)
/// produce fundamentally different proof objects.
#[derive(Debug, Clone, serde::Serialize)]
pub struct BackendProof {
    pub backend: String,
    pub bytes_len: usize,
    pub bytes_base64: String,
    pub public_inputs: serde_json::Value,
}

#[derive(Debug, thiserror::Error)]
#[error("{0}")]
pub struct BackendError(pub String);

impl From<String> for BackendError {
    fn from(s: String) -> Self {
        BackendError(s)
    }
}

#[async_trait]
pub trait ProverBackend: Send + Sync {
    /// The name this backend is registered and routed under (used in
    /// `?backend=` and `/v1/backends/:name/...`).
    fn name(&self) -> &str;

    async fn prove(&self, program: &Program) -> Result<BackendProof, BackendError>;

    /// Checks `proof_bytes` (this backend's own format) against `program`.
    /// A backend that cannot verify anything (e.g. a routing stub) must return
    /// `Err`, never `Ok(true)` -- see `contracts/src/UnimplementedStarkVerifier.sol`
    /// for the same rule applied on the Solidity side.
    async fn verify(&self, program: &Program, proof_bytes: &[u8]) -> Result<bool, BackendError>;
}
