---
name: Bug report
about: Something built and tested here doesn't behave as documented
title: ""
labels: bug
assignees: ""
---

**Where**
Which crate/file (`crates/zkvm-isa`, `crates/zkvm-stark`, `crates/zkvm-host-server`,
`crates/zkvm-cli`, `contracts/`, a script, a doc)?

**What happened**
A clear description of the actual behavior.

**What you expected**
What the docs (README / `docs/*.md`) say should happen instead, with a link
or quote if you can.

**Minimal repro**
A `.zkasm` program, a command, or a test case that reproduces it. This
project's whole design is that claims are checkable by a test — a repro in
that form is the fastest to act on.

```
# paste here
```

**Environment**
- `rustc --version` / `cargo --version`:
- `forge --version` (if `contracts/`-related):
- OS:

---

If this is a soundness or security issue (a proof or attestation being
accepted when it shouldn't be), please don't file it here — see
[`SECURITY.md`](../../SECURITY.md) instead.
