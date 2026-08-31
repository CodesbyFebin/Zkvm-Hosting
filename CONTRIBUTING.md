# Contributing

Thanks for looking at this. It's a small, honest zkVM — read
[`docs/ROADMAP.md`](docs/ROADMAP.md) first to see what's real versus what's
explicitly not built yet, so a contribution lands where it's actually useful.

## Setup

You need [Rust](https://rustup.rs) and [Foundry](https://getfoundry.sh):

```bash
git clone --recurse-submodules https://github.com/CodesbyFebin/rust-stark-zkvm.git
cd rust-stark-zkvm
cargo build --release
cargo test --release --workspace   # see "why --release" below
cd contracts && forge test
```

**Use `--release` for tests, not just binaries.** One of `zkvm-stark`'s
constraints has a data-dependent polynomial degree (see the comment on
`VmAir::evaluate_transition`), which trips a Winterfell debug-only self-check
that's stricter than actual soundness requires. `--release` compiles that
check out — it isn't hiding a real bug, the same tests pass either way once
that specific assertion is skipped.

## Before opening a PR

- `cargo clippy --release --workspace --all-targets` should be clean.
- `cargo test --release --workspace` and `forge test` (in `contracts/`) should
  both pass. CI runs both on every PR — it's not decorative, a red check means
  the PR isn't mergeable as-is.
- If you're touching `.zkasm` semantics or the AIR, add a test — including,
  where relevant, a *negative* test (tampering with a claim should be
  rejected). This VM's whole point is that soundness is a thing the test
  suite checks, not a slogan.

## What kind of PRs are useful right now

Check [`docs/ROADMAP.md`](docs/ROADMAP.md)'s "Suggested next slice" section —
it's kept current and states the actual next steps (loops, addressable
memory, RISC-V compatibility) along with why each one is scoped the way it
is. If you want to work on something not listed there, especially anything
touching `contracts/`'s trust model or the on-chain verifier
(`docs/ONCHAIN_VERIFIER.md`, `docs/THREAT_MODEL.md`), open an issue first —
those are the parts where a well-intentioned change can quietly break a
soundness guarantee.

## What this project won't take

Per `docs/HOST_SERVICE.md` and `docs/ROADMAP.md`: no fake backends named
after real projects they don't implement, no `todo!()` or "coming soon" left
in place of real code (put it in the roadmap docs instead), and no verifier
logic that accepts something it shouldn't just to make a demo pass. If a PR's
tests are testing that the wrong thing was accepted, that's a bug in the PR,
not in the test.

## Reporting a soundness or security issue

Please don't open a public issue for a soundness bug in the AIR or a bug in
`contracts/` that could let an invalid proof get accepted or paid out. See
[`SECURITY.md`](SECURITY.md).
