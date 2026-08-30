# What's real vs. what's pitched, for "zkvm.host"

The "zkvm.host" pitch describes a company: a multi-VM router (SP1/RISC Zero/Jolt/
ZKWASM), a serverless pay-per-proof API, CI/CD integration, an edge/WASM proving SDK,
AI-agent-execution verification, and a four-tier business model. This repo cannot
honestly claim to have built that. What it *can* claim, and does, is the one piece
that's directly buildable on top of the real zkVM already in this repo: **"push a
program, get a proof" as an actual HTTP call.**

## What exists: [`crates/zkvm-host-server`](../crates/zkvm-host-server)

- `POST /v1/proofs` — body `{"program": "<.zkasm text>"}`, returns the STARK proof
  (base64) and public inputs. This *is* the core mechanic of "no circuits, no
  prover clusters, no infra" — the caller doesn't link against `zkvm-stark` or run
  a prover locally, they make one HTTP call.
- `POST /v1/verify` — checks a proof against a program. The server re-executes the
  program itself (cheap) to know what public inputs to check against; it never
  needs the caller's execution trace.
- `GET /healthz`.
- [`zkvm-cli`](../crates/zkvm-cli)'s `deploy` subcommand: reads a `.zkasm` file,
  POSTs it to a running server, saves the returned proof locally. Verification stays
  local and CLI-driven — deliberately: you should never have to trust a proving
  service's own claim that a proof is valid, only the (cheap, fast) verification you
  ran yourself. Tested end to end: the CLI's `deploy` → `verify` round-trip is a real
  HTTP request against a real running server, not a mock.
- A `ProverBackend` trait (`src/backend.rs`) and `ProverRouter` (`src/router.rs`):
  `GET /v1/backends` lists what's registered, `POST /v1/backends/{name}/proofs` and
  `/verify` dispatch to a named backend. Two are registered: `stark` (the real
  prover above, reachable this way too) and `mock-echo` — a routing stub that is
  explicit about doing nothing cryptographic (its `verify` always returns an error,
  never `valid: true`; see `backends/mock_echo.rs`). This makes "multi-VM router" an
  architecturally real, tested claim — adding SP1 or RISC Zero later is one new file
  plus one `router.register()` call, not an HTTP-layer rewrite — while being explicit
  that no second *real* backend exists yet. Deliberately not named `sp1` /
  `risc-zero`: naming a stub after a project it doesn't implement would misrepresent
  it, the same mistake `contracts/`'s original `verifyProof() { return true; }`
  draft made in the other direction.
- [`scripts/onchain_demo.sh`](../scripts/onchain_demo.sh) closes the loop this doc
  used to list as missing: it deploys `contracts/`, gets a *real* proof from a
  *real* running server, verifies it locally, attests it on-chain, and confirms the
  prover is actually paid — see the "On-chain settlement" section below.
- [`.github/workflows/zk-ci.yml`](../.github/workflows/zk-ci.yml): on every PR
  touching `.zkasm` examples, the server/CLI crates, or `contracts/`, it builds the
  workspace, runs every Rust and Solidity test, then boots the real server and runs
  `zkvm deploy` + `zkvm verify` against every example program — the PR fails if any
  of them don't actually verify. "Proof as a CI check," for real, not just described.
- [`src/mcp.rs`](../crates/zkvm-host-server/src/mcp.rs): `prove` and `verify` exposed
  as real MCP tools (via the [`rmcp`](https://github.com/modelcontextprotocol/rust-sdk)
  crate), so any MCP client (Claude, Cursor, or anything else speaking the protocol)
  can call this server directly. Verified with an actual MCP `initialize` →
  `tools/list` → `tools/call` handshake over HTTP, not just written and assumed to
  work — see the "MCP" section below for why it runs on its own port instead of
  nested onto `/v1/*`.

That's genuinely the demand-side developer-experience mechanic the pitch describes,
architecturally extended to more than one backend, with the on-chain and CI pieces
that used to be listed below as gaps now closed.

## MCP: why it's a separate port, not `nest_service`

`rmcp`'s `StreamableHttpService` implements `tower::Service`, but its `Response`
body type doesn't line up with `axum::Router::nest_service` without an adapter
layer — and `rmcp`'s own examples serve it via a raw `hyper` accept loop rather
than mounting it on an existing `axum::Router`, which is a strong signal that
isn't a supported plug-and-play path. `mcp::serve` follows the same verified
pattern the upstream examples use, on its own listener (port 4478 by default),
rather than asserting an untested "just nest it" integration.

## A second real backend: investigated, not built

SP1 (`sp1-sdk`) was checked for real, not assumed:

- The crate and its API are real (confirmed against the `succinctlabs/sp1`
  source at the exact released tag) — `ProverClient::from_env().await`,
  `.setup(elf).await` and `.prove(&pk, stdin).groth16().await` all exist. Two
  API details from an earlier draft were wrong, though: `setup()` returns a
  single `SP1ProvingKey`, not a `(pk, vk)` tuple, and `prove()` takes `stdin`
  by value, not by reference.
- A bare "hello world" depending on `sp1-sdk` resolves **518 crates** — more
  than 3x this entire workspace's current dependency count — and includes a
  Go-based FFI dependency (`sp1-recursion-gnark-ffi`) for its Groth16/PLONK
  wrapping step, on top of Rust.
- `cargo check` on that bare project ran for **~4 minutes of wall time (861s of
  CPU time)** before failing on a missing system dependency (`protoc`), having
  not yet reached the RISC-V guest toolchain, network-fetched proving
  parameters, or an actual proof.
- More fundamentally: SP1 proves compiled RISC-V ELF binaries from Rust guest
  programs via its own build toolchain. It has no relationship to this repo's
  `.zkasm` accumulator ISA — integrating it as "just another `ProverBackend`"
  would mean either compiling `.zkasm` programs down to a RISC-V guest binary
  (a real compiler that doesn't exist) or changing the trait to accept an
  entirely different input type for this one backend, breaking the shared
  `Program` abstraction the other two backends rely on.

None of this makes SP1 a bad choice eventually — it's the opposite of the
`mock-echo` problem, a backend that's *too* real to fake a quick integration of.
But "one file + one `register()` call" undersells it substantially, and
attempting it blind risked repeating the exact category of error (guessed APIs,
untested toolchains) this whole exercise has been about catching. Not pursued
further this session.

## What's explicitly not here

- **A second real proving backend.** `mock-echo` proves the *router* works; it is
  not, and is not trying to be, SP1/RISC Zero/Jolt/ZKWASM. See above for what
  investigating SP1 specifically turned up.
- **Trustless on-chain verification.** `scripts/onchain_demo.sh` pays a prover for a
  real proof, but only after an `AttestedVerifier` attestation — a trusted bridge,
  not a cryptographic check of the STARK proof itself. See
  [`docs/ONCHAIN_VERIFIER.md`](ONCHAIN_VERIFIER.md) for exactly what closing that
  gap for real requires.
- **Multi-tenant serverless infrastructure, billing, usage tiers.** The server here
  is a single process with no auth, no rate limiting, no persistence, no queuing —
  it's meant to be run locally or in a trusted network, not exposed as a public paid
  API. "Free / $49/mo / usage-based / Enterprise" implies a whole billing and
  account system that doesn't exist.
- **Edge/WASM proving SDK.** Nothing runs the prover in-browser or on an edge
  runtime; `zkvm-stark`'s dependencies (and STARK proving in general) are not
  scoped for that today.
- **AI agent verification.** No integration with any agent framework, and no AIR
  designed around "did this agent follow a policy" — that would need its own
  instruction-set/constraint design, not a wrapper around the existing accumulator
  machine.

## If this were actually going further

In rough order of "most directly extends what's real, least new infrastructure":

1. Add auth (even something as simple as a static API key) and per-key rate
   limiting to the server — the minimum needed before it could be exposed beyond a
   trusted network.
2. Persist submitted proofs/tasks (currently everything is synchronous, in-memory,
   request-scoped) so a `GET /v1/proofs/:id` style status check is meaningful for
   proofs that take longer than an HTTP request timeout.
3. Replace `scripts/onchain_demo.sh`'s manual `cast` calls with a `zkvm-cli attest`
   (or similar) subcommand once the attestation flow needs to run somewhere other
   than a developer's terminal — e.g. as the CI job's own follow-up step.
4. Only after those: a second *real* backend, to prove the abstraction actually
   generalizes rather than assuming it does from one mock.
