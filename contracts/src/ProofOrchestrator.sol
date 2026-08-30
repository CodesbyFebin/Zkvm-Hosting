// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IProofVerifier} from "./IProofVerifier.sol";

/// @notice Routes proof-generation tasks to provers and pays them once a task's
/// proof is accepted by the configured `IProofVerifier`.
/// @dev This contract deliberately contains NO verification logic of its own --
/// every acceptance decision is delegated to `verifier.verify(...)`. That is the
/// fix for the classic "verifyProof always returns true" bug: there is no code
/// path here that can mark a task fulfilled without an external `true` from the
/// verifier contract. See /docs/ONCHAIN_VERIFIER.md for what that verifier
/// actually needs to be for this to be a trustless system end to end.
contract ProofOrchestrator {
    error TaskNotFound();
    error TaskAlreadyClaimed();
    error TaskAlreadyFulfilled();
    error NotTheProver();
    error ProofRejected();
    error RewardTransferFailed();

    struct Task {
        bytes32 publicInputsHash;
        address requester;
        address prover;
        uint256 reward;
        bool fulfilled;
    }

    IProofVerifier public immutable verifier;
    mapping(bytes32 => Task) public tasks;
    uint256 public taskCount;

    event TaskSubmitted(bytes32 indexed taskId, address indexed requester, bytes32 publicInputsHash, uint256 reward);
    event TaskClaimed(bytes32 indexed taskId, address indexed prover);
    event TaskFulfilled(bytes32 indexed taskId, address indexed prover, uint256 reward);

    constructor(IProofVerifier _verifier) {
        verifier = _verifier;
    }

    /// @notice Submit a task: "pay `msg.value` to whoever produces a proof, accepted
    /// by `verifier`, for the computation whose public inputs hash to `publicInputsHash`."
    function submitTask(bytes32 publicInputsHash) external payable returns (bytes32 taskId) {
        taskCount++;
        taskId = keccak256(abi.encodePacked(block.chainid, address(this), taskCount));
        tasks[taskId] = Task({
            publicInputsHash: publicInputsHash,
            requester: msg.sender,
            prover: address(0),
            reward: msg.value,
            fulfilled: false
        });
        emit TaskSubmitted(taskId, msg.sender, publicInputsHash, msg.value);
    }

    /// @notice Claim a task before working on it, so two provers don't race to submit.
    function claimTask(bytes32 taskId) external {
        Task storage task = tasks[taskId];
        if (task.requester == address(0)) revert TaskNotFound();
        if (task.fulfilled) revert TaskAlreadyFulfilled();
        if (task.prover != address(0)) revert TaskAlreadyClaimed();
        task.prover = msg.sender;
        emit TaskClaimed(taskId, msg.sender);
    }

    /// @notice Submit `proof` for `taskId`. Pays the reward iff `verifier.verify`
    /// accepts it against the task's registered `publicInputsHash`.
    function submitProof(bytes32 taskId, bytes calldata proof) external {
        Task storage task = tasks[taskId];
        if (task.requester == address(0)) revert TaskNotFound();
        if (task.fulfilled) revert TaskAlreadyFulfilled();
        if (task.prover != msg.sender) revert NotTheProver();

        if (!verifier.verify(proof, task.publicInputsHash)) revert ProofRejected();

        task.fulfilled = true;
        uint256 reward = task.reward;
        task.reward = 0;

        emit TaskFulfilled(taskId, msg.sender, reward);

        if (reward > 0) {
            (bool sent,) = payable(msg.sender).call{value: reward}("");
            if (!sent) revert RewardTransferFailed();
        }
    }
}
