// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ProofOrchestrator} from "../src/ProofOrchestrator.sol";
import {UnimplementedStarkVerifier} from "../src/UnimplementedStarkVerifier.sol";
import {AttestedVerifier} from "../src/AttestedVerifier.sol";

/// Proves the headline property: with an honest "not implemented yet" verifier,
/// there is no way to get paid. This is the direct fix for a verifier that used to
/// unconditionally `return true`.
contract ProofOrchestratorUnimplementedTest is Test {
    ProofOrchestrator orchestrator;
    UnimplementedStarkVerifier verifier;

    address requester = address(0xA11CE);
    address prover = address(0xB0B);

    function setUp() public {
        verifier = new UnimplementedStarkVerifier();
        orchestrator = new ProofOrchestrator(verifier);
        vm.deal(requester, 10 ether);
    }

    function test_submitProof_alwaysRevertsWithoutARealVerifier() public {
        vm.prank(requester);
        bytes32 taskId = orchestrator.submitTask{value: 1 ether}(keccak256("public-inputs"));

        vm.prank(prover);
        orchestrator.claimTask(taskId);

        vm.prank(prover);
        vm.expectRevert(UnimplementedStarkVerifier.VerifierNotImplemented.selector);
        orchestrator.submitProof(taskId, hex"1234");
    }
}

/// The interim, honestly-trusted path: an attester (standing in for a service that
/// actually runs `zkvm verify` off-chain) has to sign off before any reward moves.
contract ProofOrchestratorAttestedTest is Test {
    ProofOrchestrator orchestrator;
    AttestedVerifier verifier;

    address attesterKey = address(0xA77E5);
    address requester = address(0xA11CE);
    address prover = address(0xB0B);
    address rando = address(0xBAD);

    bytes32 publicInputsHash = keccak256("initial=5,result=12,program=...");
    bytes proof = hex"deadbeef";

    function setUp() public {
        verifier = new AttestedVerifier(attesterKey);
        orchestrator = new ProofOrchestrator(verifier);
        vm.deal(requester, 10 ether);
    }

    function _submitAndClaim() internal returns (bytes32 taskId) {
        vm.prank(requester);
        taskId = orchestrator.submitTask{value: 1 ether}(publicInputsHash);
        vm.prank(prover);
        orchestrator.claimTask(taskId);
    }

    function test_paysOutOnlyAfterAttestation() public {
        bytes32 taskId = _submitAndClaim();

        // No attestation yet -> rejected.
        vm.prank(prover);
        vm.expectRevert(ProofOrchestrator.ProofRejected.selector);
        orchestrator.submitProof(taskId, proof);

        vm.prank(attesterKey);
        verifier.attest(publicInputsHash, keccak256(proof));

        uint256 balanceBefore = prover.balance;
        vm.prank(prover);
        orchestrator.submitProof(taskId, proof);
        assertEq(prover.balance, balanceBefore + 1 ether);

        (,,,, bool fulfilled) = orchestrator.tasks(taskId);
        assertTrue(fulfilled);
    }

    function test_rejectsProofBytesThatDontMatchTheAttestation() public {
        bytes32 taskId = _submitAndClaim();
        vm.prank(attesterKey);
        verifier.attest(publicInputsHash, keccak256(proof));

        vm.prank(prover);
        vm.expectRevert(ProofOrchestrator.ProofRejected.selector);
        orchestrator.submitProof(taskId, hex"00"); // different bytes -> different hash
    }

    function test_onlyAttesterCanAttest() public {
        vm.prank(rando);
        vm.expectRevert(AttestedVerifier.NotAttester.selector);
        verifier.attest(publicInputsHash, keccak256(proof));
    }

    function test_cannotDoubleFulfill() public {
        bytes32 taskId = _submitAndClaim();
        vm.prank(attesterKey);
        verifier.attest(publicInputsHash, keccak256(proof));

        vm.prank(prover);
        orchestrator.submitProof(taskId, proof);

        vm.prank(prover);
        vm.expectRevert(ProofOrchestrator.TaskAlreadyFulfilled.selector);
        orchestrator.submitProof(taskId, proof);
    }

    function test_onlyTheClaimingProverCanSubmit() public {
        bytes32 taskId = _submitAndClaim();
        vm.prank(attesterKey);
        verifier.attest(publicInputsHash, keccak256(proof));

        vm.prank(rando);
        vm.expectRevert(ProofOrchestrator.NotTheProver.selector);
        orchestrator.submitProof(taskId, proof);
    }

    function test_cannotClaimAnAlreadyClaimedTask() public {
        bytes32 taskId = _submitAndClaim();
        vm.prank(rando);
        vm.expectRevert(ProofOrchestrator.TaskAlreadyClaimed.selector);
        orchestrator.claimTask(taskId);
    }

    function test_cannotClaimOrSubmitForAnUnknownTask() public {
        bytes32 fakeTaskId = keccak256("does-not-exist");

        vm.expectRevert(ProofOrchestrator.TaskNotFound.selector);
        orchestrator.claimTask(fakeTaskId);

        vm.expectRevert(ProofOrchestrator.TaskNotFound.selector);
        orchestrator.submitProof(fakeTaskId, proof);
    }
}
