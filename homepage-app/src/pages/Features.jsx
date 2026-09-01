import React from 'react';
import PageHero from '../components/PageHero';
import { FEATURES, STATUS_COLORS, STATUS_LABELS, REPO } from '../lib/constants';

export default function Features() {
  return (
    <section className="relative py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <PageHero
          eyebrow="Features"
          title="BUILT FOR"
          accent="VERIFIABLE COMPUTE"
          dek="Every capability below is labeled IMPLEMENTED, ROADMAP, or RESEARCH -- the same three-state discipline the rest of this project's docs use. Nothing here is aspirational copy dressed as a shipped feature."
        />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, idx) => (
            <div
              key={idx}
              className="group border border-[#00ff41]/20 bg-black/50 hover:border-[#00ff41]/50 hover:bg-[#00ff41]/5 transition-all p-6 animate-fadeUp flex flex-col"
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 border border-[#00ff41]/30 flex items-center justify-center text-[#00ff41] text-xl font-mono">
                  {f.icon}
                </div>
                <span className={`font-mono text-[9px] px-2 py-1 border ${STATUS_COLORS[f.status]}`}>
                  {STATUS_LABELS[f.status]}
                </span>
              </div>
              <h3 className="font-mono font-bold text-white text-sm mb-2 tracking-wider">{f.title}</h3>
              <p className="font-mono text-xs text-gray-500 leading-relaxed mb-3">{f.desc}</p>
              <p className="font-mono text-[11px] text-gray-600 leading-relaxed border-t border-[#00ff41]/10 pt-3 mt-auto">{f.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center font-mono text-xs text-gray-500">
          What's not on this list at all -- a decentralized prover network, GPU proving, general RISC-V execution, private-witness ZK -- isn't quietly deferred.
          It's absent because it isn't built, and the <a className="text-[#00ff41] underline" href={`${REPO}/blob/main/docs/ROADMAP.md`}>real roadmap</a> says so directly.
        </div>
      </div>
    </section>
  );
}
