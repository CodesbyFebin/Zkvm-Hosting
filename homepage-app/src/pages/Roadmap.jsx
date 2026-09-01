import React from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero';
import { REPO } from '../lib/constants';
import { usePageMeta, usePageJsonLd } from '../lib/seo';

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'The Real Engineering Roadmap',
  description: 'What ships today, what is explicitly not built yet, and the actual next-slice order -- loops, then addressable memory, then RV32I -- mirrored from docs/ROADMAP.md.',
  author: { '@type': 'Organization', name: 'zkvm.host' },
  mainEntityOfPage: 'https://www.zkvm.host/roadmap',
};

function Section({ title, children }) {
  return (
    <div className="border-t border-[#00ff41]/10 pt-10 mt-10">
      <h2 className="font-mono text-lg text-white mb-4 tracking-wide">{title}</h2>
      <div className="font-mono text-sm text-gray-400 leading-relaxed space-y-3">{children}</div>
    </div>
  );
}

const NOT_YET = [
  { title: 'Loops', desc: 'JZ/JNZ are forward-only; nothing revisits a static instruction twice. Real loops need a dynamically-sized execution trace, not just added control flow.' },
  { title: 'Addressable memory', desc: 'The register file is 4 fixed, statically-named slots. Real memory means a dynamic address computed at runtime -- closer to the branching problem than to the register file.' },
  { title: 'RISC-V compatibility', desc: 'The instruction set is custom and minimal, not RV32I. Real ELF-binary execution is future work.' },
  { title: 'Formal verification, fuzzing, external audits', desc: 'The only soundness evidence today is the unit test suite in zkvm-stark.' },
  { title: 'Performance work', desc: 'GPU/ASIC proving, recursion, aggregation, sub-second targets -- not started. Blake3_256 + a 128-bit field with default parameters is correctness-first, not performance-first.' },
  { title: 'Trustless on-chain verification', desc: "AttestedVerifier is a trusted bridge, not a cryptographic verifier. See docs/ONCHAIN_VERIFIER.md for what closing that gap actually requires." },
  { title: 'Everything economic or network-effect related', desc: 'No token, no proving marketplace, no decentralized prover network, no cross-chain bridges. None of that has a code artifact.' },
  { title: 'A second real proving backend', desc: 'SP1 was specifically investigated and not pursued -- 518 resolved dependencies, a Go FFI requirement, and an ISA mismatch. See docs/HOST_SERVICE.md.' },
];

export default function Roadmap() {
  usePageMeta({
    title: 'Roadmap',
    description: 'The real, ordered engineering roadmap: loops, then addressable memory, then RV32I -- plus an explicit list of what is not built and why, mirrored from docs/ROADMAP.md.',
    path: '/roadmap',
  });
  usePageJsonLd(JSON_LD);

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <PageHero
          eyebrow="Roadmap"
          title="WHAT'S NEXT,"
          accent="IN THE ACTUAL ORDER"
          dek="This mirrors docs/ROADMAP.md directly -- the same document the rest of this site links out to, presented in full here instead of only as an external link."
        />

        <Section title="Why this scope, specifically">
          <p>
            Building a real STARK-based VM with unconstrained branching, memory, and a full RISC-V-compatible instruction
            set is a multi-year effort for a team, not a single session. This project picked the smallest slice that still
            has the essential hard part: an AIR whose transition constraints correctly gate multiple instruction types via
            opcode selectors, with per-row assertions that bind the proof to an exact program — the same core technique
            (generalized) that real STARK-based VMs like RISC Zero, SP1, Cairo, and Miden use. Once that pattern is
            validated, extending it is additive work, not a redesign.
          </p>
        </Section>

        <Section title="Suggested next slice, in order">
          <ol className="list-decimal pl-5 space-y-4">
            <li>
              <strong className="text-white">Loops:</strong> a dynamically-sized trace (bounded by a max-cycle count,
              padded/truncated based on actual execution length) so JZ/JNZ can jump backward too. The "verifier
              re-executes and asserts everything" trick still works — but trace-length selection and the resulting
              proof-size variability need real design.
            </li>
            <li>
              <strong className="text-white">Addressable memory</strong> (dynamic addresses, distinct from the static
              register file) — worth checking first whether the same re-execute-and-assert trick extends here before
              assuming a full permutation/lookup argument is required.
            </li>
            <li>
              <strong className="text-white">Only after 1–2 are solid:</strong> consider RV32I compatibility.
            </li>
          </ol>
        </Section>

        <Section title="What's explicitly not here yet">
          <div className="grid sm:grid-cols-2 gap-3 not-prose">
            {NOT_YET.map((item, i) => (
              <div key={i} className="border border-violet-400/20 bg-violet-400/5 p-4">
                <div className="text-violet-300 text-xs font-bold mb-1">{item.title}</div>
                <div className="text-gray-400 text-[11px] leading-relaxed">{item.desc}</div>
              </div>
            ))}
          </div>
        </Section>

        <div className="mt-10 text-center font-mono text-xs text-gray-500">
          Full document with complete reasoning: <a className="text-[#00ff41] underline" href={`${REPO}/blob/main/docs/ROADMAP.md`}>docs/ROADMAP.md</a>.
          Related: <Link to="/faq" className="text-[#00ff41] underline">FAQ</Link>, <Link to="/architecture" className="text-[#00ff41] underline">Architecture</Link>.
        </div>
      </div>
    </section>
  );
}
