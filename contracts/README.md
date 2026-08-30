# zkVM on-chain orchestrator (Foundry)

A task/reward router for proof-generation work, plus two honestly-scoped proof
verifiers. See [`../docs/ONCHAIN_VERIFIER.md`](../docs/ONCHAIN_VERIFIER.md) for the
full explanation of what's real here versus what a trustless on-chain STARK verifier
actually requires.

- [`src/ProofOrchestrator.sol`](src/ProofOrchestrator.sol) — task lifecycle
  (submit → claim → submit proof → get paid). Contains **no verification logic of
  its own**: every accept/reject decision is delegated to an `IProofVerifier`.
- [`src/IProofVerifier.sol`](src/IProofVerifier.sol) — the interface that decision
  is delegated through.
- [`src/UnimplementedStarkVerifier.sol`](src/UnimplementedStarkVerifier.sol) — reverts,
  always. The honest state of "no real verifier exists yet," instead of a
  `verifyProof` that quietly returns `true` for anything.
- [`src/AttestedVerifier.sol`](src/AttestedVerifier.sol) — an explicitly-trusted
  interim verifier: a designated key attests off-chain that it ran `zkvm verify` and
  the proof checked out. Not a cryptographic verifier — a documented trust bridge
  that lets the rest of the system be built and tested today.

## Quick start

```bash
forge build
forge test -vv
```

`test/ProofOrchestrator.t.sol` exercises both verifiers: it proves the
"unimplemented verifier means no payout is possible" property, and exercises the
full attested happy path plus its failure modes (wrong proof bytes, wrong caller,
double-fulfillment, unclaimed/unknown tasks).
