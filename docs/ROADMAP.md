# Roadmap

This repo started from a five-phase, 36-month strategy document envisioning a
"universal zero-knowledge layer" (zkVM.host): a security-audited proving foundation,
a sub-second proving stack, a full developer platform, a token-based proving economy,
and eventually cross-chain network effects.

That document is a business strategy, not an engineering spec. This repo is the first
real engineering artifact underneath it: a genuine, working, tested zkVM MVP — an
interpreter, a from-scratch AIR (algebraic constraint system), a real STARK prover and
verifier (via [Winterfell](https://github.com/facebook/winterfell)), and soundness
tests that actually try to break it. Everything below is honest about what's real today
versus what the strategy doc aspires to.

**Decided direction: this is a zkVM, not a multi-VM router.** The SP1 investigation
(see below) surfaced a real fork: keep extending this repo's own `.zkasm` ISA and own
that stack end to end (this option), or treat `.zkasm` as a demo fixture and make the
`ProverBackend` router the actual product, routing to whatever proving backend a user
brings. The router abstraction (`crates/zkvm-host-server/src/router.rs`) stays — future
backends aren't ruled out — but they'd need to speak this ISA's semantics or a
from-scratch equivalent maintained in this repo, not "plug in SP1 as-is." The practical
consequence: trustless on-chain verification means building recursive STARK
compression *for this specific AIR* eventually — a genuine research undertaking (see
[`docs/ONCHAIN_VERIFIER.md`](ONCHAIN_VERIFIER.md)) — not something inherited for free
from an external prover's existing recursion pipeline.

## What exists today (Phase 0 → Phase 1, first slice)

- [`crates/zkvm-isa`](../crates/zkvm-isa): the VM itself. An accumulator machine
  (`ADD`/`SUB`/`MUL`) with **real conditional control flow** (`JZ`/`JNZ`,
  forward-only — see below), **a small fixed register file** (`LOAD`/`STORE`, 4
  registers — see below), a real interpreter, and a tiny assembly format (`.zkasm`,
  with labels) for writing programs.
- [`crates/zkvm-stark`](../crates/zkvm-stark): arithmetization. Defines the AIR
  (transition constraints + boundary assertions) that binds a STARK proof to one
  specific program *and* its actual control-flow outcome — not just "some valid
  trace" — and a prover/verifier built on Winterfell.
- [`crates/zkvm-cli`](../crates/zkvm-cli): a `zkvm` binary — `run`, `prove`, `verify`,
  and `demo` (which also runs two tamper attempts to show they get rejected).
- Tests at both layers, including negative tests: a proof must be rejected if the
  claimed result or the claimed program is tampered with after the fact. This is the
  actual soundness property a zkVM needs — not a slogan, a thing the test suite checks.
- [`contracts/`](../contracts): an on-chain task/reward orchestrator (Foundry/Solidity,
  tested with `forge test`) that delegates every accept/reject decision to a pluggable
  `IProofVerifier`. The two verifiers that exist are deliberately honest about not being
  a real cryptographic verifier yet — see
  [`docs/ONCHAIN_VERIFIER.md`](ONCHAIN_VERIFIER.md) for exactly what one would require
  and why that's a separate, large undertaking (not shipped as a "close enough" stub).
- [`crates/zkvm-host-server`](../crates/zkvm-host-server): an HTTP "push a program, get
  a proof" service wrapping the one real proving backend in this repo, plus a `zkvm
  deploy` CLI command that drives it end to end (tested with a real HTTP round-trip,
  not mocked). It also exposes a `ProverBackend`-trait `/v1/backends*` surface so
  "multi-VM router" is an architecturally real, tested claim rather than a promise —
  today with one real backend (`stark`) and one honestly-labeled routing stub
  (`mock-echo`, which refuses to verify anything rather than faking success). See
  [`docs/HOST_SERVICE.md`](HOST_SERVICE.md) for how this relates to the much larger
  "zkvm.host" multi-VM/serverless/CI-CD/edge-proving pitch it grew out of — most of
  that pitch has no code here on purpose.
- [`scripts/onchain_demo.sh`](../scripts/onchain_demo.sh): the previously-missing
  wiring between the server and `contracts/` — deploys both contracts to a local
  chain, gets a real proof from the real server, verifies it locally, attests it
  on-chain, and confirms the prover is actually paid. Run and passing.
- [`.github/workflows/zk-ci.yml`](../.github/workflows/zk-ci.yml): "proof as a CI
  check" for real — every PR touching the VM, server, CLI, or contracts builds,
  runs every test, then deploys and locally verifies every example program against
  a live server, failing the PR if any proof doesn't check out.
- MCP tools ([`docs/MCP.md`](MCP.md)): `prove`/`verify` exposed to any MCP client
  (Claude Desktop, Cursor, ...), verified with a real `initialize` →
  `tools/call` transcript against a running server, not just written.
- [`docs/THREAT_MODEL.md`](THREAT_MODEL.md): states plainly what's trustless (the
  proof itself) versus what isn't (the on-chain payment, which trusts one attester
  key) — a documented design decision rather than a silent gap.
- **Conditional branching (`JZ`/`JNZ`).** Proof of a program whose result genuinely
  depends on runtime data, not just straight-line arithmetic — `examples/branching.zkasm`,
  tested both branches taken and not, plus a negative test that tampering with the
  claimed control-flow outcome (which row actually executed) is rejected. Sound
  without a lookup/permutation argument specifically because this system has no
  private witness: the verifier already re-executes the program to know the correct
  per-row `active` flag, the same way it already knew the correct opcode selectors —
  see the doc comment at the top of `zkvm-stark/src/lib.rs` for the full argument.
  Jumps are forward-only (no loops yet — see "Suggested next slice" below).
- **A small fixed register file (`LOAD`/`STORE`, 4 registers).** `examples/counter.zkasm`
  stores a value, does unrelated arithmetic, then loads it back — the first program
  this VM can write that needs to hold more than one live value at once. The same
  "no secret witness" trick that made branching sound without a gadget extends here
  too: which register a `LOAD`/`STORE` addresses is a one-hot column asserted per row
  (like the opcode selectors), not derived via an algebraic mux — see the updated
  doc comment in `zkvm-stark/src/lib.rs`. Tested including a negative test that
  claiming a different register was addressed is rejected.

### Why this scope, specifically

Building a real STARK-based VM with unconstrained branching, memory, and a full
RISC-V-compatible instruction set is a multi-year effort for a team, not a single
session. Rather than fake that scope with stubs, this MVP picks the smallest slice that
still has the essential hard part: **an AIR whose transition constraints correctly gate
multiple instruction types via opcode selectors, with per-row assertions that bind the
proof to an exact program.** That's the same core technique (generalized) that real
STARK-based VMs — RISC Zero, SP1, Cairo, Miden — use to prove arbitrary programs. Once
this pattern is validated, extending it is additive work, not a redesign.

## What's explicitly NOT here yet

Mapped against the original roadmap's phases, so it's clear what's aspirational:

- **Loops.** `JZ`/`JNZ` are forward-only; nothing revisits a static instruction twice.
  Real loops need a dynamically-sized execution trace (padded/truncated based on how
  many iterations actually ran, not the fixed program length) — a bigger change than
  adding control flow to a fixed-length trace was.
- **Memory (addressable RAM, distinct from the fixed register file).** The register
  file is 4 fixed, statically-named slots — addressing is entirely static (which
  register is baked into the instruction). Real memory means a *dynamic* address
  (computed at runtime, e.g. `LD r0, [r1]` where `r1` holds the address), which is a
  materially different problem: the verifier can still re-execute and know the
  correct value at every access (see `docs/ROADMAP.md`'s note on this below), but
  proving *which* address was accessed, when that address is itself a trace value
  rather than a constant baked into the instruction, is closer to the branching
  problem (a dynamic pc) than to the register file (static slots) — worth designing
  deliberately rather than assuming either pattern extends for free.
- **RISC-V compatibility.** The instruction set here is custom and minimal, not RV32I.
  Real ELF-binary execution is future work.
- **Formal verification, fuzzing, external audits, a public "Soundness Shield"
  dashboard.** None of this exists. The only soundness evidence right now is the unit
  test suite in `zkvm-stark`.
- **Performance work** (GPU/ASIC proving, recursion, aggregation, sub-second proving
  targets). Not started; `Blake3_256` + a 128-bit field with default parameters is a
  correctness-first, not performance-first, configuration.
- **Trustless on-chain proof verification.** `contracts/`'s `AttestedVerifier` is a
  trusted bridge (an off-chain party attests a proof checked out), not a cryptographic
  verifier. Making that trustless means porting FRI/Merkle/field-arithmetic
  verification into Solidity (or wrapping the STARK in a SNARK) — see
  [`docs/ONCHAIN_VERIFIER.md`](ONCHAIN_VERIFIER.md).
- **Everything economic/network-effect-related** — the `$ZKVM` token, a proving
  marketplace, decentralized prover network, cross-chain bridges, DAO/alliance
  formation. None of that has a code artifact, and several of those items (running a
  token launch, executing trades) are outside what an engineering session like this one
  should be doing regardless of implementation status.
- **A second real proving backend — SP1, specifically investigated and not pursued.**
  Confirmed real crate, real API, but: 518 resolved dependencies for a bare "hello
  world" (>3x this whole workspace), a Go-based FFI dependency for Groth16 wrapping,
  and a `cargo check` that took ~4 minutes before failing on a missing system
  dependency without yet reaching the RISC-V toolchain or an actual proof. More
  fundamentally, SP1 proves compiled RISC-V ELF binaries — unrelated to this repo's
  `.zkasm` ISA — so integrating it isn't "one file," it's a compiler project first.
  See [`docs/HOST_SERVICE.md`](HOST_SERVICE.md) for the full writeup.

## Suggested next slice

In rough order of "smallest change with the biggest validation value":

1. Loops: a dynamically-sized trace (bounded by a max-cycle count, padded/truncated
   based on actual execution length) so `JZ`/`JNZ` can jump backward too. This is a
   materially bigger change than forward-only branching — the "verifier re-executes
   and asserts everything" trick still works (the verifier can still just run the
   loop itself), but trace-length selection and the resulting proof-size variability
   need real design.
2. Addressable memory (dynamic addresses, distinct from the static register file --
   see above). Worth checking first whether the "verifier re-executes and asserts
   everything" trick extends here too before assuming a full permutation/lookup
   argument is required — the trick has held for everything so far specifically
   *because* there's no secret witness anywhere in this system; that's also the open
   question `docs/RECURSION.md` flags about whether hiding data is ever added later.
3. Only after 1–2 are solid: consider RV32I compatibility.
