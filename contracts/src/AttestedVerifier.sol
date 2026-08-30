// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IProofVerifier} from "./IProofVerifier.sol";

/// @notice An explicitly-trusted interim verifier: a designated `attester` address
/// (in production, a key held by a service that actually runs `zkvm verify`
/// off-chain) registers which (proof, publicInputsHash) pairs it has checked.
/// @dev This is NOT a cryptographic verifier and must never be described as one --
/// it moves trust from "the EVM checked the math" to "you trust the attester's
/// key". It exists so `ProofOrchestrator`'s task/payment logic can be built,
/// tested, and used end to end today, with a seam (`IProofVerifier`) a real
/// verifier can drop into later with zero changes to the orchestrator. See
/// /docs/ONCHAIN_VERIFIER.md for why the real thing is a much larger undertaking,
/// and for the STARK-wrapped-in-a-SNARK path most production systems take instead
/// of verifying a STARK directly on the EVM.
contract AttestedVerifier is IProofVerifier {
    error NotAttester();

    address public immutable attester;

    /// keccak256(publicInputsHash, proofHash) => attested valid.
    mapping(bytes32 => bool) private accepted;

    event ProofAttested(bytes32 indexed publicInputsHash, bytes32 indexed proofHash);

    constructor(address _attester) {
        attester = _attester;
    }

    /// @notice Record that `proofHash` (= keccak256(proof)) was checked off-chain
    /// and found valid against `publicInputsHash`.
    function attest(bytes32 publicInputsHash, bytes32 proofHash) external {
        if (msg.sender != attester) revert NotAttester();
        accepted[_key(publicInputsHash, proofHash)] = true;
        emit ProofAttested(publicInputsHash, proofHash);
    }

    function verify(bytes calldata proof, bytes32 publicInputsHash) external view returns (bool) {
        return accepted[_key(publicInputsHash, keccak256(proof))];
    }

    function _key(bytes32 publicInputsHash, bytes32 proofHash) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(publicInputsHash, proofHash));
    }
}
