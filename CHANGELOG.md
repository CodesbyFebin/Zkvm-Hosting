# Changelog

All notable changes to this project are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] — 2026-08-31

Initial public release.

### Added

- `crates/zkvm-isa` — the VM: an accumulator machine (`ADD`/`SUB`/`MUL`),
  conditional branching (`JZ`/`JNZ`, forward-only), and a 4-register file
  (`LOAD`/`STORE`), with a real interpreter and a `.zkasm` assembly format
  (labels, comments).
- `crates/zkvm-stark` — a from-scratch AIR over
  [Winterfell](https://github.com/facebook/winterfell) binding a STARK proof
  to one specific program *and* its actual execution (control flow, register
  accesses), without a lookup/permutation argument — sound because this
  system has no private witness (see the doc comment in `src/lib.rs`).
- `crates/zkvm-cli` — `run` / `prove` / `verify` / `deploy` / `demo`.
- `crates/zkvm-host-server` — an HTTP proving API (`/v1/proofs`,
  `/v1/verify`), a `ProverBackend` trait with a real `stark` backend and an
  honestly-labeled `mock-echo` routing stub, and MCP tools (`prove`,
  `verify`) verified against a real MCP client handshake.
- `contracts/` — a Foundry project: `ProofOrchestrator` (task/reward
  lifecycle with zero verification logic of its own) plus two verifiers —
  `UnimplementedStarkVerifier` (reverts, honestly, until a real one exists)
  and `AttestedVerifier` (an explicit, documented trust bridge).
- `scripts/onchain_demo.sh` and `scripts/mcp_demo.sh` — real end-to-end
  demos, not simulated output.
- `.github/workflows/zk-ci.yml` — CI that builds, tests, then deploys and
  verifies every example program against a live server on every PR and push
  to `main`.
- Documentation: `docs/ROADMAP.md`, `docs/HOST_SERVICE.md`,
  `docs/ONCHAIN_VERIFIER.md`, `docs/THREAT_MODEL.md`, `docs/RECURSION.md`,
  `docs/MCP.md` — each states plainly what's real, what isn't, and what
  closing a given gap would actually require.

### Known limitations (see `docs/ROADMAP.md` for the full list)

- No loops (jumps are forward-only), no addressable memory, not RISC-V
  compatible.
- On-chain verification is an attested trust bridge, not a cryptographic
  STARK verifier (`docs/ONCHAIN_VERIFIER.md`, `docs/THREAT_MODEL.md`).
- No auth on the HTTP or MCP surfaces — local/trusted-network use only.
