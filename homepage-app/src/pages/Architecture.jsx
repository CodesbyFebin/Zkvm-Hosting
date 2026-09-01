import React from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero';
import { ARCHITECTURE_STEPS, REPO } from '../lib/constants';
import { usePageMeta, usePageJsonLd } from '../lib/seo';

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: "Architecture: Program → Proof → Verify",
  description: "A line-by-line walk through this zkVM's real AIR -- the column layout, the boundary assertions, the two transition-constraint shapes, and what a prover cannot do -- with links to the exact source and tests.",
  author: { '@type': 'Organization', name: 'zkvm.host' },
  mainEntityOfPage: 'https://www.zkvm.host/architecture',
  about: { '@type': 'SoftwareSourceCode', name: 'rust-stark-zkvm', codeRepository: REPO },
};

function Section({ title, children }) {
  return (
    <div className="border-t border-[#00ff41]/10 pt-10 mt-10">
      <h2 className="font-mono text-lg text-white mb-4 tracking-wide">{title}</h2>
      <div className="font-mono text-sm text-gray-400 leading-relaxed space-y-4">{children}</div>
    </div>
  );
}

export default function Architecture() {
  usePageMeta({
    title: 'Architecture',
    description: "The real AIR explained end to end: column layout, boundary assertions, the two transition-constraint shapes, security implications, and links to the exact source and tests.",
    path: '/architecture',
  });
  usePageJsonLd(JSON_LD);

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-4xl mx-auto">
        <PageHero
          eyebrow="Architecture"
          title="PROGRAM →"
          accent="PROOF → VERIFY"
          dek="Diagram, then explanation, then the actual invariants and implementation -- with links to the source and tests that enforce them. This is the whole AIR; nothing is summarized away."
        />

        {/* Diagram */}
        <div className="relative mb-8">
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00ff41]/30 to-transparent -translate-y-1/2" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {ARCHITECTURE_STEPS.map((step, idx) => (
              <div key={idx} className="relative border border-[#00ff41]/20 bg-black/80 p-4 text-center">
                <div className="font-mono text-2xl text-[#00ff41] mb-2">{step.icon}</div>
                <div className="font-mono text-[11px] font-bold text-white tracking-wider mb-1">{step.label}</div>
                <div className="font-mono text-[9px] text-gray-500">{step.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Explanation */}
        <Section title="What's actually in the trace">
          <p>
            One row per <em>static</em> instruction — never revisited (see the Loops section below) — holding: the accumulator value,
            four register values, seven one-hot opcode selectors (<code className="text-[#00ff41]">s_add, s_sub, s_mul, s_jz, s_jnz, s_load, s_store</code>),
            the shared immediate/target/register operand, an <code className="text-[#00ff41]">active</code> flag (did this row actually run, or
            was it skipped by an earlier taken jump), and a one-hot <code className="text-[#00ff41]">reg_sel</code> (which register a
            LOAD/STORE addresses). Ten fixed columns, plus two per register.
          </p>
        </Section>

        {/* Invariants */}
        <Section title="The invariant: no secret witness, so most of this is asserted, not proven">
          <p>
            This system has no private input. The verifier already re-executes the program to know the correct value of
            every column at every row — the same way it knows the initial accumulator value and the claimed final result.
            Because of that, every column except the accumulator and the registers — including <code className="text-[#00ff41]">active</code> and
            <code className="text-[#00ff41]"> reg_sel</code> — is individually asserted (as a boundary constraint) against the specific program
            and its actual execution, for every row, not just the first and last.
          </p>
          <p>
            That's sound without an algebraic is-zero/lookup gadget deriving branch outcomes or a mux selecting a register,
            specifically <em>because</em> there's no witness to hide it behind. The things that <em>are</em> checked algebraically —
            via the AIR's transition constraints — are whether the accumulator's and each register's trajectory are
            consistent with that already-known-correct sequence.
          </p>
        </Section>

        {/* Implementation */}
        <Section title="The transition constraint, in the actual Rust">
          <p>Only two things need algebra: the accumulator's update, and each register's update.</p>
          <pre className="bg-black border border-[#00ff41]/20 p-4 overflow-x-auto text-[#00ff41] text-xs">
{`let applied = s_add * (acc + right)
    + s_sub * (acc - right)
    + s_mul * (acc * right)
    + (s_jz + s_jnz + s_store) * acc
    + s_load * loaded;

result[0] = next_acc - (active * applied + (E::ONE - active) * acc);`}
          </pre>
          <p>
            <code className="text-[#00ff41]">loaded</code> is the one-hot-selected register value. Because the opcode selectors are
            already known-correct from the boundary assertions, at most one term in <code className="text-[#00ff41]">applied</code> is
            non-zero for any row — a selector-weighted sum standing in for a match statement. The register update follows the
            same shape, once per register:
          </p>
          <pre className="bg-black border border-[#00ff41]/20 p-4 overflow-x-auto text-[#00ff41] text-xs">
{`let write_k = active * s_store * reg_sel[k];
result[1 + k] = next_r_k - (write_k * acc + (E::ONE - write_k) * r_k);`}
          </pre>
          <p>
            The worst-case term (<code className="text-[#00ff41]">active * s_mul * acc * right</code>) is degree 4, so that's the
            declared bound — even though the interpolated degree degenerates to 3 on straight-line traces. Winterfell's
            debug-only self-check is stricter than that, which is why this workspace's tests run under <code>--release</code>.
          </p>
        </Section>

        {/* Security implications */}
        <Section title="Security implications: what a prover cannot do">
          <p>
            A prover cannot swap in a different sequence of instructions, a different control-flow outcome, or a different
            register access, for the same instructions, and still produce a proof that verifies. The test suite checks this
            directly: tampering with the claimed result, program, <code className="text-[#00ff41]">active</code> flags, or register
            selectors after proof generation causes verification to fail.
          </p>
          <p>
            What this does <em>not</em> cover: forward-only jumps mean loops aren't supported yet (a trace-length-depends-on-runtime
            problem), the fixed 4-register file isn't general-purpose memory, and the on-chain path is an attested trust
            bridge, not a cryptographic on-chain check — see the <Link to="/faq" className="text-[#00ff41] underline">FAQ</Link> for
            the trust boundary stated plainly.
          </p>
        </Section>

        {/* Source + tests */}
        <Section title="Source and tests">
          <ul className="list-disc pl-5 space-y-2">
            <li><a className="text-[#00ff41] underline" href={`${REPO}/blob/main/crates/zkvm-stark/src/lib.rs`}>crates/zkvm-stark/src/lib.rs</a> — the AIR, <code>VmAir::evaluate_transition</code>, <code>VmAir::get_assertions</code></li>
            <li><a className="text-[#00ff41] underline" href={`${REPO}/blob/main/crates/zkvm-isa`}>crates/zkvm-isa</a> — the interpreter that produces the execution trace</li>
            <li><a className="text-[#00ff41] underline" href={`${REPO}/blob/main/docs/THREAT_MODEL.md`}>docs/THREAT_MODEL.md</a> — what's trustless (the proof) vs. what isn't (the on-chain payment)</li>
            <li><a className="text-[#00ff41] underline" href={`${REPO}/blob/main/docs/ROADMAP.md`}>docs/ROADMAP.md</a> — loops, addressable memory, RV32I, recursion, in the actual planned order</li>
          </ul>
        </Section>

        {/* References */}
        <Section title="Further reading">
          <ul className="list-disc pl-5 space-y-2">
            <li><a className="text-[#00ff41] underline" href="/blog/no-secret-witness/">Why This zkVM's Soundness Doesn't Need a Lookup Argument</a></li>
            <li><a className="text-[#00ff41] underline" href="/blog/reading-a-winterfell-air/">Reading a Winterfell AIR: One Degree-4 Constraint, Two Kinds of Check</a></li>
            <li><a className="text-[#00ff41] underline" href="/blog/registers-without-a-mux/">A Register File Without an Algebraic Mux</a></li>
            <li><a className="text-[#00ff41] underline" href="/blog/the-trust-boundary/">The Trust Boundary, Written Down</a></li>
          </ul>
        </Section>
      </div>
    </section>
  );
}
