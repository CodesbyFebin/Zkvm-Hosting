import React from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero';
import { REPO } from '../lib/constants';
import { usePageMeta, usePageJsonLd } from '../lib/seo';

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'Recursive Compression: Scoping, Not Implementation',
  description: 'What recursive STARK composition or external SNARK wrapping would actually require for this specific AIR -- a literature-review scope, with nothing built yet.',
  author: { '@type': 'Organization', name: 'zkvm.host' },
  mainEntityOfPage: 'https://www.zkvm.host/recursion',
};

function Section({ title, children }) {
  return (
    <div className="border-t border-[#00ff41]/10 pt-10 mt-10">
      <h2 className="font-mono text-lg text-white mb-4 tracking-wide">{title}</h2>
      <div className="font-mono text-sm text-gray-400 leading-relaxed space-y-4">{children}</div>
    </div>
  );
}

export default function Recursion() {
  usePageMeta({
    title: 'Recursion Research Scope',
    description: 'What recursive STARK composition or external SNARK wrapping would require for this specific AIR -- a literature-review scope. Nothing here is built.',
    path: '/recursion',
  });
  usePageJsonLd(JSON_LD);

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <span className="inline-block font-mono text-[10px] font-bold px-2 py-1 border text-cyan-400 border-cyan-400/40 mb-6">RESEARCH — NOTHING BUILT</span>
        <PageHero
          eyebrow="Recursion"
          title="SCOPING,"
          accent="NOT IMPLEMENTATION"
          dek="A literature-review document, not a design doc. Its job is to make 'should we start this' a real decision later, not an open-ended fear."
        />

        <Section title="What we have today">
          <p>
            One Winterfell proof over <code className="text-[#00ff41]">VmAir</code>, Blake3-hashed, ~5–11 KB for the
            examples in this repo, growing with trace length. It verifies off-chain in milliseconds. Nothing about it is
            compact enough, or in a format cheap enough, to check inside an EVM transaction — a STARK is typically tens of
            KB minimum, too large and too gas-expensive to verify directly. See <Link to="/onchain-verifier" className="text-[#00ff41] underline">the On-Chain Verifier page</Link>.
          </p>
        </Section>

        <Section title="The two paths">
          <p>
            <strong className="text-white">(a) Recursive STARK composition.</strong> Prove, in a second, smaller STARK,
            the statement "the first STARK proof verifies." This stays inside STARK-land (no pairing-based trusted setup),
            but means implementing a STARK verifier <em>as an AIR</em> — encoding FRI folding, Merkle path checks, and
            out-of-domain constraint evaluation as constraints in a new circuit. Well-trodden elsewhere (SP1, RISC Zero,
            StarkWare's own construction do this) — but not yet designed for this specific AIR.
          </p>
          <p>
            <strong className="text-white">(b) External SNARK wrapping.</strong> Prove "the STARK verifier accepts this
            proof" as a Groth16 or PLONK circuit over BN254 — a field switch from the current 128-bit prime, since
            pairing-friendly curves use different primes. Needs a trusted setup and R1CS/arithmetic-circuit tooling
            entirely outside what this repo currently touches.
          </p>
          <p>Both paths converge on the same hard sub-problem: implementing this STARK verifier's arithmetic as constraints in some proving system.</p>
        </Section>

        <Section title="What's specific to this AIR, versus generic">
          <ul className="list-disc pl-5 space-y-2">
            <li><strong className="text-white">Field:</strong> Winterfell's 128-bit prime. Any recursive verifier circuit must do arithmetic in this exact field, or handle a field switch explicitly — get this wrong and the recursive proof verifies something other than intended.</li>
            <li><strong className="text-white">Hash:</strong> Blake3_256 — no EVM precompile, no widely-used circuit-friendly implementation. The Keccak-family switch flagged in the On-Chain Verifier page applies here too, and should happen first regardless of which recursion path is chosen.</li>
            <li><strong className="text-white">Constraint count:</strong> VmAir has one transition constraint shape today — unusually small. A recursive circuit's size scales with the inner AIR's complexity, so it would need redoing as branching, registers, and memory grow the AIR. Worth sequencing after the ISA stabilizes.</li>
          </ul>
        </Section>

        <Section title="Open questions">
          <ol className="list-decimal pl-5 space-y-3">
            <li><strong className="text-white">Do we even need hiding?</strong> This system has no secret witness anywhere — see <Link to="/architecture" className="text-[#00ff41] underline">Architecture</Link>. If that never changes, recursion only needs to solve succinctness, not zero-knowledge — a meaningfully smaller problem, worth confirming before designing around hiding that isn't needed.</li>
            <li><strong className="text-white">What's the real proving-time budget?</strong> No target has been set — current settings are correctness-first, not performance-first.</li>
            <li><strong className="text-white">Composition depth:</strong> one level, or folding many executions before the final wrap? The latter amortizes the expensive wrap step but is meaningfully more design work.</li>
            <li><strong className="text-white">Trusted setup, if path (b):</strong> a per-circuit Groth16 setup versus a universal PLONK setup — different stacks entirely.</li>
          </ol>
        </Section>

        <Section title="Verdict">
          <p className="text-white font-bold">This is a 2–3 month research-and-implementation project, done properly.</p>
          <p>
            It does not block the ISA expansion, the MCP endpoint, or anything else in this repo. Nothing here is
            implemented, and nothing should be started opportunistically alongside other work — it deserves being picked
            up as its own deliberate effort, after the Keccak-hasher switch and after the AIR has stabilized. See{' '}
            <Link to="/roadmap" className="text-[#00ff41] underline">the real roadmap</Link> for where this sits relative to everything else.
          </p>
        </Section>

        <div className="mt-10 text-center font-mono text-xs text-gray-500">
          Full document, including references to SP1's and StarkWare's own recursion writeups: <a className="text-[#00ff41] underline" href={`${REPO}/blob/main/docs/RECURSION.md`}>docs/RECURSION.md</a>.
        </div>
      </div>
    </section>
  );
}
