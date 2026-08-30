// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice A pluggable proof-verification backend for `ProofOrchestrator`.
/// @dev `ProofOrchestrator` never judges a proof itself -- it only pays out when
/// the configured verifier's `verify` call returns `true`. This keeps "how do we
/// know a proof is valid" fully swappable: today that might be an honest-but-limited
/// trust model (`AttestedVerifier`), and later a real cryptographic verifier, without
/// touching the orchestrator's task/payment logic at all.
interface IProofVerifier {
    /// @param proof Opaque proof bytes (verifier-specific encoding).
    /// @param publicInputsHash `keccak256` of the exact `.zkasm` program text this
    /// proof is claimed to be a valid execution of. The program text fully
    /// determines the (initial value, instruction sequence, result) triple our
    /// off-chain VM is deterministic over, so hashing the program is sufficient
    /// to pin down what's being claimed -- see `scripts/onchain_demo.sh` for the
    /// exact byte-for-byte convention both sides use.
    /// @return True if `proof` is accepted for `publicInputsHash`.
    function verify(bytes calldata proof, bytes32 publicInputsHash) external view returns (bool);
}
