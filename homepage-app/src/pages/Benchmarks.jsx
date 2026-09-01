import React from 'react';
import PageHero from '../components/PageHero';
import { BENCHMARKS, REPO } from '../lib/constants';
import { usePageMeta, usePageJsonLd } from '../lib/seo';

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'rust-stark-zkvm proving and verification benchmarks',
  description: 'Measured proof size, verify time (10 raw samples), and prove time at 1,000/2,000/4,000 instructions for the rust-stark-zkvm STARK prover.',
  url: 'https://www.zkvm.host/benchmarks',
  dateModified: '2026-08-31',
  creator: { '@type': 'Organization', name: 'zkvm.host' },
  variableMeasured: ['proof size', 'verification time', 'proving time'],
  isBasedOn: `${REPO}/blob/main/examples/fibonacci_like.zkasm`,
};

const PROVE_CURVE = [
  { instr: '1,000', time: '~1.2s' },
  { instr: '2,000', time: '~6.0s' },
  { instr: '4,000', time: '~32.0s' },
];

const VERIFY_SAMPLES = [6.01, 5.34, 5.58, 5.22, 5.19, 5.85, 5.71, 5.36, 5.71, 5.2];

export default function Benchmarks() {
  usePageMeta({
    title: 'Benchmarks',
    description: 'Real measured proof size (~11 KB), verify time (~5.5ms), and prove time at 1,000/2,000/4,000 instructions, with full reproducible methodology.',
    path: '/benchmarks',
  });
  usePageJsonLd(JSON_LD);

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <PageHero
          eyebrow="Performance"
          title="MEASURED."
          accent="REPRODUCIBLE."
          dek="Every number below was measured on this hardware, on this workload, before it was published -- not estimated. Full methodology and raw samples linked throughout."
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {BENCHMARKS.map((m, idx) => (
            <div key={idx} className="border border-[#00ff41]/20 bg-black/50 p-6 text-center">
              <div className="font-mono text-3xl font-bold text-[#00ff41] mb-2">{m.value}</div>
              <div className="font-mono text-xs text-gray-500 tracking-wider">{m.label}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="border border-[#00ff41]/20 bg-black/50 p-6">
            <div className="font-mono text-xs text-[#00ff41] tracking-widest mb-4">VERIFY TIME — 10 RAW SAMPLES (ms)</div>
            <div className="flex items-end gap-1.5 h-32 mb-3">
              {VERIFY_SAMPLES.map((v, i) => (
                <div key={i} className="flex-1 bg-[#00ff41]/40 hover:bg-[#00ff41] transition-colors" style={{ height: `${(v / 6.01) * 100}%` }} title={`${v}ms`} />
              ))}
            </div>
            <div className="font-mono text-[11px] text-gray-500">min 5.19ms · avg 5.51ms · fibonacci_like.zkasm, real CLI, 10 fresh processes</div>
          </div>

          <div className="border border-[#00ff41]/20 bg-black/50 p-6">
            <div className="font-mono text-xs text-[#00ff41] tracking-widest mb-4">PROVE TIME VS. INSTRUCTION COUNT</div>
            <table className="w-full font-mono text-xs text-gray-400">
              <thead>
                <tr className="text-left text-gray-600 border-b border-[#00ff41]/10">
                  <th className="pb-2 font-normal">Instructions</th>
                  <th className="pb-2 font-normal">Prove time</th>
                </tr>
              </thead>
              <tbody>
                {PROVE_CURVE.map((row, i) => (
                  <tr key={i} className="border-b border-[#00ff41]/5">
                    <td className="py-2">{row.instr}</td>
                    <td className="py-2 text-[#00ff41]">{row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="font-mono text-[11px] text-gray-500 mt-3">Worse-than-linear scaling — the reason the HTTP service caps requests at 2,000 instructions.</div>
          </div>
        </div>

        <div className="border border-[#00ff41]/20 bg-black/50 p-6 font-mono text-xs mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[#00ff41] tracking-wider">METHODOLOGY</span>
            <span className="text-[#00ff41]">✓ REPRODUCIBLE</span>
          </div>
          <div className="space-y-2 text-gray-400">
            <div><span className="text-[#00ff41]">Verify time:</span> 10 back-to-back runs of the real <code>zkvm</code> CLI binary, each a fresh process, verifying a real proof of <code>examples/fibonacci_like.zkasm</code> — see the <a className="underline text-[#00ff41]/80" href="/blog/sub-10ms-verify/">sub-10ms verify post</a> for the exact command and every raw sample.</div>
            <div><span className="text-[#00ff41]">Prove time:</span> benchmarked at 1,000/2,000/4,000 synthetic instructions specifically to size the HTTP service's instruction-count cap — see the <a className="underline text-[#00ff41]/80" href="/blog/hardening-a-prover-api/">hardening post</a> for the incident that made this necessary (an earlier 10,000-instruction default never finished in reasonable time).</div>
            <div><span className="text-[#00ff41]">Not yet published:</span> the exact CPU/RAM spec these numbers were measured on, and a full instruction-count-vs-time curve across the whole supported range. Tracked as open work in <a className="underline text-[#00ff41]/80" href={`${REPO}/blob/main/docs/ROADMAP.md`}>docs/ROADMAP.md</a>, not silently assumed to generalize.</div>
          </div>
        </div>

        <div className="border border-violet-400/20 bg-violet-400/5 p-6 font-mono text-xs text-gray-400">
          <span className="text-violet-300">What this doesn't show:</span> a benchmark against SP1, RISC Zero, or any other zkVM. This project investigated integrating SP1 as a second backend and documented exactly why it didn't (518 transitive dependencies, a Go FFI requirement, an ISA mismatch) — see <a className="underline text-violet-300" href="/blog/why-not-sp1/">that post</a> — but has never run a head-to-head benchmark, and publishing comparison numbers without one would be exactly the kind of unverified claim this page exists to avoid.
        </div>
      </div>
    </section>
  );
}
