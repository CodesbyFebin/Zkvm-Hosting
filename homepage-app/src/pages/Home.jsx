import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { REPO, TERMINAL_LINES, USE_CASES, TECH_STACK } from '../lib/constants';
import { usePageMeta, usePageJsonLd } from '../lib/seo';

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareSourceCode',
  name: 'rust-stark-zkvm',
  alternateName: 'zkvm.host',
  description: 'A real STARK-provable zero-knowledge virtual machine written in Rust, built on Winterfell: a custom instruction set with conditional branching and a register file, a from-scratch AIR, an HTTP + MCP proving service, and Foundry contracts with a documented on-chain trust model.',
  codeRepository: REPO,
  programmingLanguage: ['Rust', 'Solidity'],
  license: `${REPO}/blob/main/LICENSE`,
  url: 'https://www.zkvm.host/',
  sameAs: [REPO],
};

const LINK_GROUPS = [
  {
    title: 'Learn',
    links: [
      { to: '/getting-started', icon: '▸', label: 'Getting Started', desc: 'Clone, build, prove, verify -- real commands, in order.' },
      { to: '/architecture', icon: '◫', label: 'Architecture', desc: 'Diagram, invariants, source, tests -- the real AIR explained end to end.' },
      { to: '/zkasm-spec', icon: '</>', label: '.zkasm Spec', desc: 'The complete real instruction set and the forward-only jump rule.' },
      { to: '/features', icon: '✓', label: 'Features', desc: 'Every capability labeled IMPLEMENTED, ROADMAP, or RESEARCH.' },
      { to: '/faq', icon: '?', label: 'FAQ', desc: 'Is this actually zero-knowledge? Plainly answered.' },
    ],
  },
  {
    title: 'Try It',
    links: [
      { to: '/playground', icon: '▶', label: 'Playground', desc: 'Run a tiny program in your browser and watch the real pipeline stages.' },
      { to: '/benchmarks', icon: '◆', label: 'Benchmarks', desc: 'Measured proof size, prove time, and verify time -- with methodology.' },
    ],
  },
  {
    title: 'Reference',
    links: [
      { to: '/api-reference', icon: '⊞', label: 'API Reference', desc: 'Every HTTP route -- exact request/response fields.' },
      { to: '/mcp', icon: '⌘', label: 'MCP Server', desc: 'The real prove/verify MCP tools, and why they run on their own port.' },
      { to: '/contracts', icon: '§', label: 'Contracts', desc: 'IProofVerifier, AttestedVerifier, and the 8 real Foundry tests.' },
      { to: '/ci', icon: '⟳', label: 'CI', desc: 'The real workflow that proves and verifies every example before a PR merges.' },
    ],
  },
  {
    title: 'Trust & Roadmap',
    links: [
      { to: '/threat-model', icon: '⛨', label: 'Threat Model', desc: 'The proof is trustless. The on-chain payment is not.' },
      { to: '/onchain-verifier', icon: '⛓', label: 'On-Chain Verifier', desc: 'The five real pieces a trustless verifier needs.' },
      { to: '/recursion', icon: '∞', label: 'Recursion', desc: 'What recursive compression would take -- research scope, nothing built.' },
      { to: '/roadmap', icon: '↻', label: 'Roadmap', desc: 'Loops, then addressable memory, then RV32I -- the real order.' },
    ],
  },
  {
    title: 'Project',
    links: [
      { to: '/contributing', icon: '⚒', label: 'Contributing', desc: 'Setup, the real PR checklist, and what this project won\'t take.' },
      { to: '/security', icon: '⚑', label: 'Security', desc: 'Not audited. What counts as a real finding, and how to disclose it.' },
    ],
  },
];

export default function Home() {
  usePageMeta({
    title: 'Open-Source STARK Proving Infrastructure',
    description: 'A real, open-source STARK-provable zero-knowledge virtual machine written in Rust. Every capability explicitly labeled implemented, roadmap, or research -- no marketing fiction.',
    path: '/',
  });
  usePageJsonLd(JSON_LD);

  const [terminalCount, setTerminalCount] = useState(0);

  // Reveals TERMINAL_LINES one at a time. Written so a duplicate effect
  // invocation (StrictMode, HMR, or otherwise) can only ever converge the
  // count toward the same end state -- never index past the array's end.
  useEffect(() => {
    let intervalId;
    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        setTerminalCount(c => {
          const next = Math.min(c + 1, TERMINAL_LINES.length);
          if (next >= TERMINAL_LINES.length) clearInterval(intervalId);
          return next;
        });
      }, 350);
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, []);

  return (
    <>
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 px-6">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fadeUp" style={{ animationDuration: '0.8s' }}>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-2 h-2 bg-[#00ff41] animate-pulse" />
                <span className="font-mono text-xs text-[#00ff41] tracking-widest">RUST STARK ZKVM</span>
              </div>

              <h1 className="font-mono font-black text-5xl md:text-6xl lg:text-7xl text-white leading-[0.95] mb-6 tracking-tight">
                RUST STARK<br />
                <span className="text-[#00ff41]">ZKVM</span>
              </h1>

              <div className="font-mono text-lg md:text-xl text-gray-400 mb-4 tracking-wider">
                STARK-VERIFIABLE VIRTUAL MACHINE
              </div>
              <div className="font-mono text-2xl md:text-3xl text-[#00ff41] mb-8 tracking-wide">
                FOR PROVABLE COMPUTATION
              </div>

              <div className="flex flex-wrap gap-4 mb-10">
                <div className="flex items-center gap-2 px-4 py-2 border border-[#00ff41]/20 bg-[#00ff41]/5">
                  <span className="text-[#00ff41]">◇</span>
                  <span className="font-mono text-xs text-gray-300">OPEN SOURCE</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 border border-[#00ff41]/20 bg-[#00ff41]/5">
                  <span className="text-[#00ff41]">&lt;/&gt;</span>
                  <span className="font-mono text-xs text-gray-300">MIT LICENSED</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 border border-[#00ff41]/20 bg-[#00ff41]/5">
                  <span className="text-[#00ff41]">✓</span>
                  <span className="font-mono text-xs text-gray-300">NO SECRET WITNESS</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <Link to="/playground" className="px-8 py-3 bg-[#00ff41] text-black font-mono font-bold text-sm hover:bg-[#00ff41]/80 transition-colors tracking-wider">
                  GET STARTED &gt;
                </Link>
                <a href={REPO} target="_blank" rel="noreferrer" className="px-8 py-3 border border-[#00ff41]/40 text-[#00ff41] font-mono text-sm hover:bg-[#00ff41]/10 transition-colors tracking-wider">
                  VIEW GITHUB
                </a>
              </div>
            </div>

            <div className="relative animate-fadeUp" style={{ animationDuration: '0.8s', animationDelay: '0.15s' }}>
              <div className="absolute -inset-4 bg-[#00ff41]/5 blur-3xl" />
              <div className="relative border border-[#00ff41]/30 bg-black/80 backdrop-blur-sm">
                <div className="flex items-center gap-2 px-4 py-2 border-b border-[#00ff41]/20 bg-[#00ff41]/5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  <span className="ml-2 font-mono text-[10px] text-gray-500">zkvm — real CLI transcript</span>
                </div>
                <div className="p-6 font-mono text-sm min-h-[320px]">
                  {TERMINAL_LINES.slice(0, terminalCount).map((line, idx) => (
                    <div
                      key={idx}
                      className={`mb-1 animate-fadeUp ${
                        line.type === 'command' ? 'text-white' :
                        line.type === 'success' ? 'text-[#00ff41]' :
                        line.type === 'info' ? 'text-gray-400' : 'text-[#00ff41]'
                      }`}
                      style={{ animationDuration: '0.25s' }}
                    >
                      {line.text}
                      {line.type === 'cursor' && <span className="inline-block w-2 h-4 bg-[#00ff41] ml-1 animate-pulse" />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="absolute -top-8 -right-8 w-24 h-24 border-2 border-[#00ff41]/30 rotate-45 flex items-center justify-center">
                <div className="w-16 h-16 border border-[#00ff41]/50 rotate-45 flex items-center justify-center">
                  <span className="font-mono text-[#00ff41] font-bold text-2xl -rotate-45">Z</span>
                </div>
              </div>
            </div>
          </div>

          {/* Status bar -- only things that are actually true */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-3 gap-4">
            {['STARK PROVER', 'VERIFIER', 'CLI + HTTP + MCP', 'OPEN SOURCE', 'MIT LICENSED', 'NO SECRET WITNESS'].map((label, idx) => (
              <div key={idx} className="flex items-center gap-2 px-4 py-2 border border-[#00ff41]/10 bg-[#00ff41]/5">
                <span className="text-[#00ff41]">✓</span>
                <span className="font-mono text-xs text-gray-300">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick links to the rest of the app */}
      <section className="relative py-24 px-6 border-t border-[#00ff41]/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="font-mono text-xs text-[#00ff41] tracking-widest mb-4">— EXPLORE —</div>
            <h2 className="font-mono font-bold text-4xl md:text-5xl text-white">
              ONE REAL BACKEND, <span className="text-[#00ff41]">NO VISION COPY</span>
            </h2>
          </div>
          <div className="space-y-12">
            {LINK_GROUPS.map((group) => (
              <div key={group.title}>
                <div className="font-mono text-xs text-violet-300 tracking-widest mb-4">{group.title.toUpperCase()}</div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.links.map(({ to, icon, label, desc }) => (
                    <Link
                      key={to}
                      to={to}
                      className="group border border-[#00ff41]/20 bg-black/50 hover:border-[#00ff41]/50 hover:bg-[#00ff41]/5 transition-all p-6"
                    >
                      <div className="w-12 h-12 border border-[#00ff41]/30 flex items-center justify-center text-[#00ff41] text-xl font-mono mb-4">
                        {icon}
                      </div>
                      <h3 className="font-mono font-bold text-white text-sm mb-2 tracking-wider group-hover:text-[#00ff41]">{label} →</h3>
                      <p className="font-mono text-xs text-gray-500 leading-relaxed">{desc}</p>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Built With */}
      <section className="relative py-16 px-6 border-t border-[#00ff41]/10">
        <div className="max-w-7xl mx-auto">
          <div className="font-mono text-xs text-[#00ff41] tracking-widest mb-8 text-center">— BUILT WITH —</div>
          <div className="flex flex-wrap justify-center gap-3">
            {TECH_STACK.map((t, idx) => (
              <div key={idx} className="flex items-center gap-3 px-5 py-3 border border-[#00ff41]/20 bg-black/50 hover:border-[#00ff41]/40 transition-all">
                <div className="w-8 h-8 border border-[#00ff41]/30 flex items-center justify-center font-mono text-[#00ff41] text-sm">
                  {t.icon}
                </div>
                <span className="font-mono text-sm text-gray-300">{t.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="relative py-24 px-6 border-t border-[#00ff41]/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="font-mono text-xs text-[#00ff41] tracking-widest mb-4">— POTENTIAL APPLICATIONS —</div>
            <h2 className="font-mono font-bold text-4xl md:text-5xl text-white mb-4">
              WHAT THE PRIMITIVE <span className="text-[#00ff41]">ENABLES</span>
            </h2>
            <p className="font-mono text-sm text-gray-500 max-w-2xl mx-auto">
              None of these are built integrations. This is what "prove a program executed correctly" is useful for in general — not a product roadmap.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {USE_CASES.map((uc, idx) => (
              <div
                key={idx}
                className="border border-[#00ff41]/20 bg-black/50 p-6 hover:border-[#00ff41]/50 transition-all animate-fadeUp"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="text-3xl mb-4">{uc.icon}</div>
                <h3 className="font-mono font-bold text-white text-sm mb-2 tracking-wider">{uc.title}</h3>
                <p className="font-mono text-xs text-gray-500 leading-relaxed">{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Source */}
      <section className="relative py-24 px-6 border-t border-[#00ff41]/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <div className="font-mono text-xs text-[#00ff41] tracking-widest mb-4">— OPEN SOURCE —</div>
              <h2 className="font-mono font-bold text-3xl md:text-4xl text-white mb-6">
                MIT LICENSED.<br />
                BUILT IN THE <span className="text-[#00ff41]">OPEN.</span>
              </h2>
              <p className="font-mono text-sm text-gray-400 leading-relaxed mb-8">
                Open source and MIT licensed. Bug reports, .zkasm programs that break something, and small honestly-scoped PRs are welcome.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: '◇', label: '100%', sub: 'OPEN SOURCE' },
                  { icon: '<>', label: 'MIT', sub: 'LICENSE' },
                  { icon: '●', label: 'ACTIVELY', sub: 'DEVELOPED' },
                  { icon: '◆', label: 'SINGLE', sub: 'MAINTAINER' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 border border-[#00ff41]/10 bg-[#00ff41]/5">
                    <span className="text-[#00ff41] text-lg">{item.icon}</span>
                    <div>
                      <div className="font-mono text-sm font-bold text-white">{item.label}</div>
                      <div className="font-mono text-[10px] text-gray-500 tracking-wider">{item.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-[#00ff41]/30 bg-black/80">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-[#00ff41]/20 bg-[#00ff41]/5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                <span className="ml-2 font-mono text-[10px] text-gray-500">terminal</span>
              </div>
              <div className="p-6 font-mono text-xs space-y-1">
                <div className="text-[#00ff41]">$ git clone {REPO}</div>
                <div className="text-gray-400">Cloning into 'rust-stark-zkvm'...</div>
                <div className="text-gray-400">Receiving objects: 100% (351/351), done.</div>
                <div className="text-gray-500 text-[10px]">(.git ≈ 836 KB on disk, 22 commits — checked at publish time)</div>
                <div className="text-[#00ff41] mt-4">$ cargo build --release --workspace</div>
                <div className="text-gray-400">Compiling zkvm-isa, zkvm-stark, zkvm-cli, zkvm-host-server...</div>
                <div className="text-[#00ff41] mt-2">$ cargo run --release -p zkvm-host-server &amp;</div>
                <div className="text-[#00ff41]">✓ listening on :4477</div>
                <div className="text-[#00ff41] mt-2">$ _</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-32 px-6 border-t border-[#00ff41]/10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="font-mono text-xs text-[#00ff41] tracking-widest mb-6">— OPEN SOURCE · HONESTLY SCOPED —</div>
          <h2 className="font-mono font-black text-5xl md:text-7xl text-white mb-6 tracking-tight">
            BUILD. PROVE. <span className="text-[#00ff41]">VERIFY.</span>
          </h2>
          <p className="font-mono text-lg text-gray-400 mb-10">
            A real STARK-verifiable virtual machine, with every gap named in the open.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/playground" className="px-10 py-4 bg-[#00ff41] text-black font-mono font-bold text-sm hover:bg-[#00ff41]/80 transition-colors tracking-widest">
              GET STARTED &gt;
            </Link>
            <a href={`${REPO}/blob/main/docs/ROADMAP.md`} target="_blank" rel="noreferrer" className="px-10 py-4 border border-[#00ff41]/40 text-[#00ff41] font-mono text-sm hover:bg-[#00ff41]/10 transition-colors tracking-widest">
              READ THE ROADMAP
            </a>
          </div>

          <div className="mt-16 flex flex-wrap justify-center gap-6 font-mono text-xs text-gray-500">
            <span>github.com/CodesbyFebin/rust-stark-zkvm</span>
            <span>·</span>
            <span>Open Source</span>
            <span>·</span>
            <span>MIT License</span>
            <span>·</span>
            <span>Single Maintainer</span>
          </div>
        </div>
      </section>
    </>
  );
}
