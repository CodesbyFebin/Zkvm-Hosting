import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero';
import { REPO, STATUS_COLORS, STATUS_LABELS } from '../lib/constants';
import { usePageMeta, usePageJsonLd } from '../lib/seo';

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'zkVM Capability Status',
  description: 'Every real capability of rust-stark-zkvm, honestly labeled implemented, roadmap, research, or not planned -- no item marked done unless it actually is.',
  url: 'https://www.zkvm.host/capabilities',
};

const NOT_PLANNED_COLOR = 'text-gray-400 border-gray-500/30 bg-gray-500/10';
const NOT_PLANNED_LABEL = 'NOT PLANNED';

const CATEGORIES = [
  { id: 'core', label: 'Core VM & AIR', icon: '◫' },
  { id: 'interfaces', label: 'Interfaces', icon: '⌘' },
  { id: 'onchain', label: 'On-Chain & Trust', icon: '⛓' },
  { id: 'gaps', label: 'Language & Execution Gaps', icon: '↻' },
  { id: 'not-planned', label: 'Explicitly Not Planned', icon: '⊘' },
];

const ITEMS = [
  // Core VM & AIR
  {
    id: 1,
    category: 'core',
    title: 'Accumulator + register ISA',
    desc: 'INIT/ADD/SUB/MUL, forward-only JZ/JNZ, LOAD/STORE across 4 fixed registers -- a real interpreter and a .zkasm assembly format.',
    status: 'implemented',
    detail: 'crates/zkvm-isa. See the .zkasm Spec for the complete instruction table and the exact forward-jump error string.',
    link: '/zkasm-spec',
  },
  {
    id: 2,
    category: 'core',
    title: 'STARK proof via Winterfell',
    desc: 'A from-scratch AIR binding a proof to one exact program and its actual execution. Real proof, ~11 KB, ~5.5ms to verify.',
    status: 'implemented',
    detail: 'crates/zkvm-stark::prove_program / verify_program. See Architecture for the full transition/boundary constraint walkthrough.',
    link: '/architecture',
  },
  {
    id: 3,
    category: 'core',
    title: 'No-secret-witness soundness design',
    desc: 'Because the program and inputs are fully public, the verifier re-executes and asserts almost everything directly -- no lookup or permutation argument needed.',
    status: 'implemented',
    detail: 'This is this project\'s own term for the design, not standard vocabulary. See the glossary entry for where it stops applying (private inputs, dynamic addressing).',
    link: '/glossary/no-secret-witness/',
    external: true,
  },
  {
    id: 4,
    category: 'core',
    title: 'One-hot selectors instead of a mux',
    desc: 'Seven opcode-selector columns and a register selector, multiplied algebraically instead of using a lookup/mux gadget.',
    status: 'implemented',
    detail: 'See the "registers without a mux" post for the full technique.',
    link: 'https://www.zkvm.host/blog/registers-without-a-mux/',
    external: true,
  },

  // Interfaces
  {
    id: 5,
    category: 'interfaces',
    title: 'CLI: run / prove / verify / deploy / demo',
    desc: 'Five subcommands, one binary. deploy pushes a program to a running zkvm-host-server and verifies the returned proof locally.',
    status: 'implemented',
    detail: 'crates/zkvm-cli. Exact usage strings and sample output on the CLI Reference page.',
    link: '/cli-reference',
  },
  {
    id: 6,
    category: 'interfaces',
    title: 'Hardened HTTP proving API',
    desc: '1 MB body limit, 60s timeout, 4 concurrent requests, and a 2,000-instruction ceiling derived from real measured proving times.',
    status: 'implemented',
    detail: 'crates/zkvm-host-server. Every route and exact request/response shape on the API Reference page.',
    link: '/api-reference',
  },
  {
    id: 7,
    category: 'interfaces',
    title: 'MCP server (prove / verify tools)',
    desc: 'Real prove/verify MCP tools, verified against an actual initialize -> tools/list -> tools/call handshake, on their own port.',
    status: 'implemented',
    detail: "Runs on port 4478, not nested on the HTTP API -- rmcp's StreamableHttpService doesn't nest cleanly onto axum::Router.",
    link: '/mcp',
  },

  // On-Chain & Trust
  {
    id: 8,
    category: 'onchain',
    title: 'ProofOrchestrator + AttestedVerifier',
    desc: 'A task/reward lifecycle contract with zero verification logic of its own, plus an explicit, documented trust-bridge verifier.',
    status: 'implemented',
    detail: 'AttestedVerifier checks an ECDSA signature from one designated attester key over the claimed result -- not the STARK proof itself.',
    link: '/contracts',
  },
  {
    id: 9,
    category: 'onchain',
    title: 'UnimplementedStarkVerifier',
    desc: 'Reverts, always -- the honest state of "no real on-chain verifier exists yet," instead of a stub that quietly returns true.',
    status: 'implemented',
    detail: 'Doing this insecurely would silently accept invalid proofs, strictly worse than an explicit trust assumption.',
    link: '/contracts',
  },
  {
    id: 10,
    category: 'onchain',
    title: 'Foundry test suite',
    desc: '8 real tests: the unimplemented verifier makes payout impossible, the attested happy path, and every failure mode (wrong proof, wrong caller, double-fulfillment, unclaimed tasks).',
    status: 'implemented',
    detail: 'contracts/test/ProofOrchestrator.t.sol, run on every PR via CI.',
    link: '/ci',
  },
  {
    id: 11,
    category: 'onchain',
    title: 'A real trustless on-chain STARK verifier',
    desc: 'Five pieces needed: Fiat-Shamir recompute (Keccak, not Blake3), Merkle authentication, FRI verification, field arithmetic in Solidity/Yul, and the out-of-domain constraint check.',
    status: 'roadmap',
    detail: "None of these five are built. AttestedVerifier is the honest stand-in until they are.",
    link: '/onchain-verifier',
  },
  {
    id: 12,
    category: 'onchain',
    title: 'Recursive proof compression / SNARK wrapping',
    desc: 'The path to genuinely cheap, trustless on-chain verification -- proving the STARK verifier\'s own execution with a SNARK.',
    status: 'research',
    detail: 'docs/RECURSION.md is a scoped literature review, not an implementation. Verdict: a real 2-3 month project, nothing started.',
    link: '/recursion',
  },

  // Language & Execution Gaps
  {
    id: 13,
    category: 'gaps',
    title: 'Loops (backward jumps)',
    desc: 'JZ/JNZ can only jump forward today. Real loops need a dynamically-sized, bounded execution trace.',
    status: 'roadmap',
    detail: 'First item in the real "suggested next slice" ordering -- most validation-per-effort of the three gaps.',
    link: '/roadmap',
  },
  {
    id: 14,
    category: 'gaps',
    title: 'Addressable memory',
    desc: 'LOAD/STORE address one of four statically-named registers, not a runtime-computed address.',
    status: 'roadmap',
    detail: "Open question: does the no-secret-witness trick still work once addresses are dynamic, or is a real permutation argument required?",
    link: '/roadmap',
  },
  {
    id: 15,
    category: 'gaps',
    title: 'RV32I compatibility',
    desc: 'A standard RISC-V subset instead of the custom .zkasm ISA.',
    status: 'roadmap',
    detail: 'Deliberately last in the real ordering -- only worth pursuing once loops and memory are solid.',
    link: '/roadmap',
  },

  // Explicitly Not Planned
  {
    id: 16,
    category: 'not-planned',
    title: 'Formal verification, fuzzing, external audit',
    desc: 'The only soundness evidence today is this repo\'s own unit test suite.',
    status: 'not-planned',
    detail: 'Named plainly in docs/ROADMAP.md as a real gap, not glossed over.',
    link: '/security',
  },
  {
    id: 17,
    category: 'not-planned',
    title: 'GPU/ASIC performance work',
    desc: 'Blake3_256 and a 128-bit field with default parameters were chosen for correctness first, not speed.',
    status: 'not-planned',
    detail: 'Real measured numbers exist (~1.2s at 1,000 instructions, ~32s at 4,000) -- optimizing them is simply not in scope yet.',
    link: '/benchmarks',
  },
  {
    id: 18,
    category: 'not-planned',
    title: 'A second real proving backend',
    desc: 'SP1 was specifically investigated and declined.',
    status: 'not-planned',
    detail: '518 resolved dependencies, a Go FFI requirement, and an ISA mismatch -- the concrete reasons were written down, not silently dropped.',
    link: 'https://www.zkvm.host/blog/why-not-sp1/',
    external: true,
  },
  {
    id: 19,
    category: 'not-planned',
    title: 'Auth on the HTTP or MCP surfaces',
    desc: 'Both are local/trusted-network use only, on purpose, today.',
    status: 'not-planned',
    detail: 'Named explicitly in docs/THREAT_MODEL.md as a real limitation, not an oversight.',
    link: '/threat-model',
  },
  {
    id: 20,
    category: 'not-planned',
    title: 'Token, marketplace, decentralized prover network',
    desc: 'No token, no proving marketplace, no cross-chain bridges -- none of it has a code artifact anywhere in this repo.',
    status: 'not-planned',
    detail: 'This is the single most common inflated claim in zkVM marketing generally. This project makes none of them.',
    link: '/faq',
  },
];

const STATUS_ORDER = ['implemented', 'roadmap', 'research', 'not-planned'];

function statusStyle(status) {
  return status === 'not-planned' ? NOT_PLANNED_COLOR : STATUS_COLORS[status];
}

function statusLabel(status) {
  return status === 'not-planned' ? NOT_PLANNED_LABEL : STATUS_LABELS[status];
}

function ItemCard({ item, expanded, onToggle }) {
  const Wrapper = ({ children }) => (
    <div
      className={`border bg-black/50 p-5 transition-all cursor-pointer ${
        expanded ? 'border-[#00ff41]/50 bg-[#00ff41]/5' : 'border-[#00ff41]/15 hover:border-[#00ff41]/40'
      }`}
      onClick={onToggle}
    >
      {children}
    </div>
  );

  return (
    <Wrapper>
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-mono text-sm font-bold text-white">{item.title}</h3>
        <span className={`font-mono text-[9px] px-2 py-0.5 border whitespace-nowrap ${statusStyle(item.status)}`}>
          {statusLabel(item.status)}
        </span>
      </div>
      <p className="font-mono text-xs text-gray-500 leading-relaxed">{item.desc}</p>
      {expanded && (
        <div className="border-t border-[#00ff41]/10 pt-3 mt-3">
          <p className="font-mono text-xs text-gray-300 leading-relaxed mb-2">{item.detail}</p>
          {item.external ? (
            <a href={item.link} className="font-mono text-[10px] text-[#00ff41] underline">
              Full detail &rarr;
            </a>
          ) : (
            <Link to={item.link} className="font-mono text-[10px] text-[#00ff41] underline">
              Full detail &rarr;
            </Link>
          )}
        </div>
      )}
      <div className="font-mono text-[10px] text-gray-600 mt-2">
        {expanded ? '▲ click to collapse' : '▼ click to expand'}
      </div>
    </Wrapper>
  );
}

export default function Capabilities() {
  usePageMeta({
    title: 'Capability Status',
    description: 'Every real capability of this zkVM, honestly labeled implemented, roadmap, research, or not planned. Searchable and filterable -- no item marked done unless it actually is.',
    path: '/capabilities',
  });
  usePageJsonLd(JSON_LD);

  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const filtered = useMemo(() => {
    return ITEMS.filter((item) => {
      const matchesCategory = category === 'all' || item.category === category;
      const q = query.toLowerCase();
      const matchesQuery = !q || item.title.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const counts = useMemo(() => {
    const c = { implemented: 0, roadmap: 0, research: 0, 'not-planned': 0 };
    ITEMS.forEach((item) => { c[item.status] += 1; });
    return c;
  }, []);

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <PageHero
          eyebrow="Capability Status"
          title="WHAT'S ACTUALLY"
          accent="BUILT"
          dek={`${ITEMS.length} real capabilities, each labeled honestly. Nothing here is marked done unless it is -- and nothing marked "not planned" is quietly reframed as coming soon.`}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10 not-prose">
          {STATUS_ORDER.map((s) => (
            <div key={s} className={`border p-4 text-center ${statusStyle(s)}`}>
              <div className="font-mono text-2xl font-bold">{counts[s]}</div>
              <div className="font-mono text-[9px] tracking-wider mt-1">{statusLabel(s)}</div>
            </div>
          ))}
        </div>

        <div className="mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search capabilities..."
            className="w-full bg-black border border-[#00ff41]/30 font-mono text-sm text-[#00ff41] px-4 py-3 focus:outline-none focus:border-[#00ff41]/60 placeholder:text-gray-600"
          />
        </div>

        <div className="flex flex-wrap gap-2 mb-10 not-prose">
          <button
            onClick={() => setCategory('all')}
            className={`px-3 py-1.5 font-mono text-[11px] border ${category === 'all' ? 'border-[#00ff41]/50 bg-[#00ff41]/10 text-[#00ff41]' : 'border-gray-700 text-gray-500'}`}
          >
            ALL ({ITEMS.length})
          </button>
          {CATEGORIES.map((cat) => {
            const n = ITEMS.filter((i) => i.category === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-3 py-1.5 font-mono text-[11px] border ${category === cat.id ? 'border-[#00ff41]/50 bg-[#00ff41]/10 text-[#00ff41]' : 'border-gray-700 text-gray-500'}`}
              >
                {cat.icon} {cat.label.toUpperCase()} ({n})
              </button>
            );
          })}
        </div>

        <div className="space-y-12">
          {CATEGORIES.map((cat) => {
            const items = filtered.filter((i) => i.category === cat.id);
            if (items.length === 0) return null;
            return (
              <div key={cat.id}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 border border-[#00ff41]/30 flex items-center justify-center text-[#00ff41]">{cat.icon}</div>
                  <h2 className="font-mono text-sm font-bold text-white tracking-wide">{cat.label}</h2>
                  <div className="flex-1 h-px bg-[#00ff41]/10" />
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  {items.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      expanded={expandedId === item.id}
                      onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="font-mono text-sm text-gray-500 text-center py-10">No capabilities match that search.</p>
          )}
        </div>

        <div className="mt-16 text-center font-mono text-xs text-gray-500">
          Every item here is sourced from real docs already on this site --{' '}
          <Link to="/roadmap" className="text-[#00ff41] underline">Roadmap</Link>,{' '}
          <Link to="/threat-model" className="text-[#00ff41] underline">Threat Model</Link>,{' '}
          <Link to="/onchain-verifier" className="text-[#00ff41] underline">On-Chain Verifier</Link>,{' '}
          <Link to="/recursion" className="text-[#00ff41] underline">Recursion</Link> -- nothing new was invented for this page,
          it's just a browsable index of claims made elsewhere.
          Full source: <a className="text-[#00ff41] underline" href={REPO}>GitHub</a>.
        </div>
      </div>
    </section>
  );
}
