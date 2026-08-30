## What this does

<!-- One or two sentences. Link the issue if there is one. -->

## Checklist

- [ ] `cargo test --release --workspace` passes
- [ ] `cargo clippy --release --workspace --all-targets` is clean
- [ ] `forge test` passes (if `contracts/` changed)
- [ ] New behavior has a test — including a **negative** test if this touches
      the AIR or the on-chain verifier (a claim that should be rejected
      actually is)
- [ ] Docs updated if this changes what's real vs. not real
      (`docs/ROADMAP.md`, `docs/HOST_SERVICE.md`, or the relevant `docs/*.md`)
- [ ] No `todo!()`, no stub that silently accepts/returns success, no
      component named after a real project it doesn't actually integrate with

## Soundness impact (delete if not applicable)

<!--
If this touches crates/zkvm-stark's AIR or contracts/'s verifier logic:
what's the argument that this is still sound? Does it rely on the
"verifier re-executes and asserts everything" trick (see the doc comment
in zkvm-stark/src/lib.rs), or does it need something new (a lookup/
permutation argument, an is-zero gadget)?
-->
