# Security Policy

This is a small, experimental zkVM (see [`docs/ROADMAP.md`](docs/ROADMAP.md) for
exactly what's implemented). It is **not audited** and should not be trusted with
real value. That said, soundness bugs are taken seriously, and responsible
disclosure is genuinely useful here.

## What counts as a security issue

- A crafted program, proof, or public-inputs value that causes `zkvm-stark` to
  accept a proof it shouldn't (a soundness bug in the AIR).
- Anything in `contracts/` that lets `ProofOrchestrator` pay out a reward
  without a genuinely valid, correctly-attested proof.
- A way to make `AttestedVerifier` accept an attestation it shouldn't, other
  than the already-documented trust assumption in
  [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md) (compromising the attester
  key itself isn't a new finding — that trust boundary is already disclosed).
- A way to make the MCP server or HTTP API (`crates/zkvm-host-server`) execute
  something it shouldn't, beyond the already-documented lack of auth (see
  [`docs/HOST_SERVICE.md`](docs/HOST_SERVICE.md) and
  [`docs/MCP.md`](docs/MCP.md) — no auth on either surface is a known,
  disclosed gap, not a new report).

## What doesn't need a private report

Anything already named as a gap in `docs/ROADMAP.md`, `docs/HOST_SERVICE.md`,
`docs/ONCHAIN_VERIFIER.md`, or `docs/THREAT_MODEL.md` — those are documented,
known limitations, not vulnerabilities. Feel free to open a normal public issue
if you think one of those docs is itself wrong or out of date.

## Reporting

Email **codesbyfebin@gmail.com** with:

- What you found and why it's a soundness/security issue (not just a bug).
- A minimal repro if you have one (a `.zkasm` program, a proof, or a test
  case is ideal — this repo's whole design philosophy is that soundness
  claims should be checkable by a test, so a report in that form is the
  fastest to act on).

Please don't open a public GitHub issue for a real soundness finding until
there's been a chance to look at it. Anything else — a typo in a doc, a
clippy warning, a test that could be clearer — a normal issue or PR is fine.
