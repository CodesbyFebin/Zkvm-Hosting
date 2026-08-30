---
name: Feature / ISA proposal
about: Propose an addition to the ISA, AIR, host service, or contracts
title: ""
labels: enhancement
assignees: ""
---

**What's the gap?**
Check [`docs/ROADMAP.md`](../../docs/ROADMAP.md) first — is this already
listed under "What's explicitly NOT here yet" or "Suggested next slice"? If
so, link the relevant bullet instead of re-describing it.

**What would it let you do?**
A concrete program or use case this unblocks — ideally a `.zkasm` snippet, or
a real workflow through the CLI/HTTP/MCP surface.

**Soundness sketch (if it touches the AIR)**
This VM's AIR gets its soundness from "the verifier already re-executes the
program, so most things are asserted directly rather than derived via an
algebraic gadget" (see the doc comment in `crates/zkvm-stark/src/lib.rs`).
If your proposal is control-flow- or memory-related, does that trick still
apply, or does it need a real lookup/permutation argument? A rough sketch
here saves a lot of back-and-forth later.

**Scope check**
Is this a small, testable increment (like the register file or branching
work), or does it depend on something bigger not yet built (recursion, a
second real proving backend, etc.)? If the latter, it probably belongs in
the long-term roadmap discussion, not a single PR.
