# Recursive compression: scoping, not implementation

This is a literature-review scope, not a design doc — nothing here is built. Its job
is to state the problem precisely enough that "should we start this" is a real
decision later, not an open-ended fear. See [`docs/ONCHAIN_VERIFIER.md`](ONCHAIN_VERIFIER.md)
for the broader on-chain-verification picture this is one path into, and
[`docs/THREAT_MODEL.md`](THREAT_MODEL.md) for what the system trusts *today*, without
any of this.

## What we have

A single STARK proof over `VmAir` (see `zkvm-stark/src/lib.rs`): one Winterfell proof,
Blake3-hashed, ~5–7 KB for the toy programs in `examples/`, growing with trace length
(roughly logarithmically per query, linearly in the number of queries — see
`default_options()`). It verifies off-chain in milliseconds via `zkvm verify`, the
`/v1/verify` HTTP endpoint, or the `verify` MCP tool. Nothing about this proof is
compact enough, or in a format cheap enough, to check inside an EVM transaction.

## What we'd need

A proof that's either small and EVM-native enough to verify directly on-chain (a
STARK is typically tens of KB minimum — too large and too gas-expensive to verify
directly, per the numbers in `docs/ONCHAIN_VERIFIER.md`), or wrapped in something
that is. Concretely: a Groth16 proof (~192 bytes, ~300k gas to verify via the
`ecPairing` precompile) or a PLONK proof (similar order of magnitude).

## The two paths

**(a) Recursive STARK composition.** Prove, in a *second*, smaller STARK, the
statement "the first STARK proof verifies." Iterate (fold many proofs into one) if
batching multiple executions. This stays inside STARK-land (no pairing-based
trusted setup), but means implementing a STARK verifier *as an AIR* — encoding FRI
folding, Merkle path checks, and out-of-domain constraint evaluation as constraints
in a new circuit, all over the same field. This is a well-trodden path (it's what
SP1, RISC Zero, and StarkWare's own STARK-in-STARK construction do), but "well
established elsewhere" and "not yet designed for our specific AIR" are different
things.

**(b) External SNARK wrapping.** Prove "the STARK verifier accepts this proof" as a
Groth16 (or PLONK) circuit over BN254 — a field switch from our current 128-bit
prime field, since pairing-friendly curves use different, much larger primes. This
needs a trusted setup (or a universal one, for PLONK) and R1CS/arithmetic-circuit
tooling (arkworks, circom, gnark) entirely outside what this repo currently touches.

Both paths converge on the same hard sub-problem: implementing our specific STARK
verifier's arithmetic (field ops, Merkle authentication, FRI) as constraints in
*some* proving system, which is genuinely new engineering regardless of which
system.

## What's specific to *our* AIR versus generic

- **Field**: Winterfell's 128-bit prime (`winter_math::fields::f128`). Any recursive
  verifier circuit must do arithmetic in this exact field, or handle a field
  extension/switch explicitly (a real source of subtle bugs — get this wrong and the
  recursive proof verifies something other than what was intended).
- **Hash**: `Blake3_256` (see `Hasher` in `zkvm-stark/src/lib.rs`). No EVM precompile,
  no widely-used circuit-friendly implementation. `docs/ONCHAIN_VERIFIER.md` already
  flags that a Keccak-family hasher would need to replace it before *any* on-chain
  verification work (recursive or direct) makes sense — this applies here too, and
  should happen first regardless of which recursion path is chosen.
- **Constraint count**: `VmAir` has exactly one transition constraint today (see the
  branching design note at the top of `zkvm-stark/src/lib.rs`), which is unusually
  small. A recursive verifier circuit's size scales with the *inner* AIR's
  complexity, so today's circuit would be smaller than it will be once branching,
  registers, and memory (see `docs/ROADMAP.md`) grow the AIR — meaning recursion
  design done now would need to be redone as the AIR grows. Worth sequencing after
  the ISA stabilizes somewhat, not before.

## Open questions

1. **Do we even need hiding?** This system currently has no secret witness anywhere
   — the verifier already re-executes the program to know every expected trace value
   (see the doc comment in `zkvm-stark/src/lib.rs`). If that never changes, recursion
   only needs to solve *succinctness* (making the proof small/cheap to check
   on-chain), not *zero-knowledge* (hiding a witness) — a meaningfully smaller
   problem than the general case, and worth confirming explicitly before designing
   around hiding that isn't needed.
2. **What's the real proving-time budget?** Recursive composition and SNARK wrapping
   both add real prover-side latency on top of the base STARK. No target has been
   set (see `docs/ONCHAIN_VERIFIER.md`'s note that current settings are
   correctness-first, not performance-first) — without one, "how much recursion
   depth is acceptable" has no answer.
3. **Composition depth.** One level of recursion (prove the base proof once), or
   folding many executions into one before the final wrap? The latter is more
   valuable (amortizes the expensive wrap step across many proofs) but is
   meaningfully more design work.
4. **Trusted setup, if path (b).** A per-circuit Groth16 setup (single-purpose,
   needs a real ceremony or a well-audited existing one) versus a universal PLONK
   setup (reusable, but PLONK proofs and tooling are a different stack entirely).

## References (for whoever picks this up)

- SP1's own recursion/compression pipeline (their prover crate implements exactly
  path (a) followed by a field-switch "shrink" step and a final Groth16/PLONK wrap;
  see their public docs and source for the concrete shape of a shipped version of
  this).
- StarkWare's STARK-in-STARK / recursive STARK writeups (the general technique
  behind path (a)).
- Winterfell's own architecture (`winter-air`, `winter-prover`) — since the base
  proof here is already a Winterfell proof, a recursive verifier circuit would need
  to mirror Winterfell's exact verification algorithm, not a generic STARK verifier.

## Verdict

**This is a 2–3 month research-and-implementation project, done properly.** It does
not block the ISA expansion (branching is done; registers/memory are next per
`docs/ROADMAP.md`), the MCP endpoint, or anything else in this repo. Nothing here is
implemented, and nothing should be started opportunistically alongside other work —
it deserves being picked up as its own deliberate effort, after the Keccak-hasher
switch and after the AIR has stabilized enough that the recursive verifier circuit
being designed for it won't need a rewrite a month later.
