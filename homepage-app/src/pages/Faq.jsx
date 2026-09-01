import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero';
import { REPO } from '../lib/constants';
import { usePageMeta, usePageJsonLd } from '../lib/seo';

const FAQS = [
  {
    q: 'What is a zkVM?',
    a: 'A virtual machine whose execution can be proven correct with a cryptographic proof, so a verifier can check the result without re-running the program. Despite the name, most zkVMs (this one included) don\'t hide any inputs -- "zk" here is industry shorthand for "provable," not a guarantee of privacy.',
  },
  {
    q: 'Is this actually zero-knowledge?',
    a: 'No, and this project is deliberate about that distinction: it produces validity proofs -- cryptographic evidence that a specific, fully public program executed correctly. Private-witness zero-knowledge (hiding inputs from the verifier) would need an entirely different AIR design and isn\'t built or planned. See the Architecture page for exactly why the current design has no witness to hide.',
  },
  {
    q: 'What proof system does this use?',
    a: 'STARKs, via Winterfell -- FRI-based, transparent (no trusted setup), with hash-based commitments. A real proof of the reference workload is about 11 KB and verifies in about 5.5ms.',
  },
  {
    q: 'What instruction set does the VM support?',
    a: 'A custom accumulator-plus-registers ISA: INIT/ADD/SUB/MUL for arithmetic, JZ/JNZ for forward-only conditional jumps, and LOAD/STORE across 4 fixed registers. Not RISC-V, not configurable -- RV32I compatibility is a named, ordered item in the real roadmap, not started yet.',
  },
  {
    q: 'Can I write programs in Rust?',
    a: 'Not yet. Programs are written in .zkasm, a small assembly-style format with labels. There is no Rust-to-zkVM compiler or guest-program SDK in this repo.',
  },
  {
    q: 'Is the on-chain part trustless?',
    a: 'The proof itself is trustless -- verifying it requires no trust in whoever generated it, and the test suite includes negative tests that confirm a tampered proof is rejected. The on-chain payment path is not: AttestedVerifier.sol accepts a proof once a designated attester signs off on a verification that happened off-chain. That is a documented trust bridge, not a cryptographic on-chain check. See the Architecture page and docs/THREAT_MODEL.md.',
  },
  {
    q: 'Can I self-host a prover?',
    a: 'Yes -- the entire stack is open-source and runs on commodity hardware as a local process (CLI, HTTP API on :4477, or MCP server on :4478). There is no GPU-accelerated proving and no multi-machine distributed proving; those aren\'t built or scheduled.',
  },
  {
    q: 'Is there a decentralized prover network?',
    a: 'No. This is a single-maintainer, single-backend project. The ProverBackend trait and router exist and are architecturally real (one real "stark" backend, one honestly-labeled "mock-echo" stub), but there is no second real backend, no marketplace, and no network of independent nodes.',
  },
  {
    q: "What's actually next?",
    a: 'In the real, ordered roadmap: loops (backward jumps), addressable memory, RV32I compatibility, then recursive proof compression (currently a literature-review scope, not an implementation) and an external audit. See docs/ROADMAP.md for the full reasoning behind that order.',
  },
];

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
};

export default function Faq() {
  usePageMeta({
    title: 'FAQ',
    description: "Is this actually zero-knowledge? Is the on-chain part trustless? Is there a decentralized prover network? Answered plainly, including where the honest answer is no.",
    path: '/faq',
  });
  usePageJsonLd(JSON_LD);

  const [open, setOpen] = useState(0);

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <PageHero
          eyebrow="Questions"
          title="FREQUENTLY"
          accent="ASKED"
          dek="Answered plainly, including the ones where the honest answer is 'no' or 'not yet.'"
        />

        <div className="space-y-3">
          {FAQS.map((item, idx) => (
            <div key={idx} className="border border-[#00ff41]/20 bg-black/50">
              <button
                onClick={() => setOpen(open === idx ? -1 : idx)}
                className="w-full flex items-center justify-between px-5 py-4 text-left font-mono text-sm text-white hover:text-[#00ff41] transition-colors"
              >
                <span>{item.q}</span>
                <span className={`text-[#00ff41] transition-transform ${open === idx ? 'rotate-45' : ''}`}>+</span>
              </button>
              {open === idx && (
                <div className="px-5 pb-4 font-mono text-xs text-gray-400 leading-relaxed">{item.a}</div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 text-center font-mono text-xs text-gray-500">
          More detail on any of these: <Link to="/architecture" className="text-[#00ff41] underline">Architecture</Link>,{' '}
          <a className="text-[#00ff41] underline" href={`${REPO}/blob/main/docs/ROADMAP.md`}>the real roadmap</a>, or{' '}
          <a className="text-[#00ff41] underline" href="/blog/">the blog</a>.
        </div>
      </div>
    </section>
  );
}
