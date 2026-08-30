# Threat model: what you're trusting, and why

This is the one-page version. For the underlying cryptographic detail, see
[`docs/ONCHAIN_VERIFIER.md`](ONCHAIN_VERIFIER.md); for what's built versus pitched
overall, see [`docs/HOST_SERVICE.md`](HOST_SERVICE.md).

## The proof itself: trustless

A `zkvm-stark` proof (produced by `prove_program`, checked by `verify_program`) is a
real STARK. Verifying it — locally via `zkvm verify`, over HTTP via `/v1/verify`, or
via the `verify` MCP tool — requires no trust in whoever generated it. This is
standard, load-bearing cryptography: `zkvm-stark`'s test suite includes negative
tests (`rejects_tampered_result`, `rejects_tampered_program`) that confirm a proof
manufactured for one claim is rejected against a different one.

**This is the only trustless part of the system end to end.** Everything below is
about what happens once that proof needs to affect something outside a local
process — specifically, an on-chain payment.

## The on-chain path: an attested bridge, not a cryptographic verifier

`contracts/`'s `ProofOrchestrator` pays a prover once a proof is "accepted." What
"accepted" means depends entirely on which `IProofVerifier` it's configured with:

- **`UnimplementedStarkVerifier`** — accepts nothing. Every `submitProof` call
  reverts. No trust required because no payment is possible.
- **`AttestedVerifier`** (the one `scripts/onchain_demo.sh` actually uses) — accepts
  a proof once a designated `attester` address calls `attest(publicInputsHash,
  proofHash)`. **You are trusting that this one key only attests to proofs it (or
  whoever holds it) actually ran `zkvm verify` against and got `Ok(())`.**

Concretely, the trust assumption is: *the attester key is not compromised, and
whoever controls it always verifies locally before attesting, never on faith.*
If that assumption fails — key theft, or a careless/malicious attester — a false
attestation pays out a real reward for a proof that either doesn't exist or doesn't
verify. The contract has no way to detect this; it only checks that the attester's
signature is present, not that the underlying math is sound.

This is the same trust model a centralized sequencer has before its fraud/validity
proofs go live (e.g. early-stage optimistic rollups): a known, single point of
trust, acceptable because it's explicit and small, not because it's absent.

### Key management, honestly

There is currently no key management story beyond "a private key exists and someone
runs `cast send ... --private-key`." Concretely, for anything beyond a local demo,
at minimum:

- The attester key should never be the same key used for anything else (deploying
  contracts, holding funds) — a compromise of one shouldn't compromise the other.
- It should live in whatever secrets store the deployment environment already has
  (not a `.env` file, not shell history — `scripts/onchain_demo.sh`'s hardcoded
  Anvil test keys are demo-only and must never be reused anywhere real funds could
  reach them).
- Rotation means deploying a new `AttestedVerifier` with the new attester address —
  there's no in-place key-rotation function on the current contract. That's a real
  gap if this ever needs to run continuously.

None of this is implemented. It's written here so the gap is a documented decision,
not a silent omission.

## When does this stop being true?

Only when a real cryptographic verifier replaces `AttestedVerifier` — porting
FRI/Merkle/field-arithmetic verification into Solidity, or wrapping the STARK in a
SNARK cheap enough to verify on-chain. Both are described, with why they're
substantial independent undertakings, in
[`docs/ONCHAIN_VERIFIER.md`](ONCHAIN_VERIFIER.md). Until one of those exists, "the
proof is trustless, the payment is not" is the accurate description of this system,
and should be stated in exactly those terms to anyone relying on it.
