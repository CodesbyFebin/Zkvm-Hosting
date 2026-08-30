// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IProofVerifier} from "./IProofVerifier.sol";

/// @notice An honest placeholder: this contract cannot verify a real Winterfell
/// STARK proof, and says so loudly instead of pretending to.
/// @dev A `ProofOrchestrator` wired to this verifier will have every `submitProof`
/// call revert with `VerifierNotImplemented`. That is intentional: shipping a
/// verifier that returns `true` unconditionally lets anyone drain every task's
/// reward with garbage bytes -- reverting is the only honest behavior until a real
/// verifier exists. See /docs/ONCHAIN_VERIFIER.md for exactly what that requires.
contract UnimplementedStarkVerifier is IProofVerifier {
    error VerifierNotImplemented();

    function verify(bytes calldata, bytes32) external pure returns (bool) {
        revert VerifierNotImplemented();
    }
}
