# Grant pitch

A one-page case for funding this project, for anyone evaluating it for
[Ethereum Foundation ESP](https://esp.ethereum.foundation/),
[Protocol Labs Research](https://research.protocol.ai/),
[Gitcoin Grants](https://www.gitcoin.co/grants), or a similar program. Every
claim below is checkable against the code in this repo — see
[`docs/ROADMAP.md`](ROADMAP.md) for the full, unedited status.

## What this is

A small, real STARK-based zkVM: an interpreter, a from-scratch AIR
(arithmetization) binding a proof to one exact program *and its actual
execution* — including which branch it took and which register it touched —
and a prover/verifier on [Winterfell](https://github.com/facebook/winterfell).
Not a wrapper around an existing zkVM (SP1, RISC Zero) and not a simulation of
one: the AIR, the constraint system, and the soundness argument are original
work in this repo, with negative tests that confirm tampering with a proof's
claimed program, result, control flow, or register access is rejected.

## Why it's worth funding

Most public zkVM writeups either (a) claim more than the code does, or (b) are
research papers with no runnable artifact. This project's discipline is the
opposite: every doc in `docs/` states plainly what's real versus what a much
larger business-strategy document it grew out of aspires to, including a
[`docs/ROADMAP.md`](ROADMAP.md) section titled "What's explicitly NOT here
yet" and a [`docs/THREAT_MODEL.md`](THREAT_MODEL.md) that names the on-chain
verifier's actual trust assumption (an attested bridge, not a cryptographic
verifier) instead of glossing over it. A SP1 integration was investigated and
explicitly declined, with the concrete reasons written down
([`docs/HOST_SERVICE.md`](HOST_SERVICE.md)), rather than either building it
badly or silently dropping the idea.

That discipline is the asset: a small, correct, honestly-scoped base that
funding can extend without first having to untangle inflated claims.

## What funding would go toward

In the order [`docs/ROADMAP.md`](ROADMAP.md) already lays out, most
validation-per-effort first:

1. **Loops** — a dynamically-sized execution trace (bounded, padded/truncated
   by actual run length) so `JZ`/`JNZ` can jump backward. The current
   fixed-length, forward-only trace is the main practical limitation on what
   `.zkasm` programs can express.
2. **Addressable memory** — dynamic addresses (`LD r0, [r1]`), distinct from
   today's four static register slots. Open research question already flagged
   in [`docs/RECURSION.md`](RECURSION.md): whether this system's "verifier
   re-executes and asserts everything" soundness trick (see the doc comment in
   `crates/zkvm-stark/src/lib.rs`) still holds once addresses are
   runtime-computed, or whether a real lookup/permutation argument becomes
   necessary.
3. **Recursive proof compression** — required for genuinely trustless on-chain
   verification (today's `AttestedVerifier` is an explicit trust bridge, not a
   cryptographic verifier). `docs/RECURSION.md` is currently a scoped
   literature-review, not an implementation; turning it into one is a real
   research-and-engineering undertaking.
4. **External review** — no formal verification, fuzzing, or third-party audit
   exists yet. The only soundness evidence today is this repo's own unit test
   suite.

## What this is not asking for

Not funding for a token, a proving marketplace, or a decentralized prover
network — none of that has a code artifact here, and none of it is in scope.
The ask is engineering time against the four items above, nothing broader.

## Ask

Budget depends on the program and the scope it wants to fund (a single
milestone above vs. several) — happy to scope a specific number against a
specific program's format on request. Reach out at
[codesbyfebin@gmail.com](mailto:codesbyfebin@gmail.com).
