import React from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero';
import { REPO } from '../lib/constants';
import { usePageMeta, usePageJsonLd } from '../lib/seo';

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'zkVM Changelog',
  description: 'Real, dated changes to rust-stark-zkvm -- what shipped in v0.1.0 and what has changed since, mirrored from CHANGELOG.md.',
  author: { '@type': 'Organization', name: 'zkvm.host' },
  mainEntityOfPage: 'https://www.zkvm.host/changelog',
};

function Section({ title, children }) {
  return (
    <div className="border-t border-[#00ff41]/10 pt-10 mt-10">
      <h2 className="font-mono text-lg text-white mb-4 tracking-wide">{title}</h2>
      <div className="font-mono text-sm text-gray-400 leading-relaxed space-y-4">{children}</div>
    </div>
  );
}

export default function Changelog() {
  usePageMeta({
    title: 'Changelog',
    description: 'Real, dated changes to rust-stark-zkvm: the v0.1.0 initial release contents and every change since, mirrored from the actual CHANGELOG.md.',
    path: '/changelog',
  });
  usePageJsonLd(JSON_LD);

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <PageHero
          eyebrow="Changelog"
          title="WHAT ACTUALLY"
          accent="CHANGED"
          dek="Every entry here corresponds to a real commit. No entry is added until the change it describes has landed."
        />

        <Section title="Unreleased">
          <div>
            <h3 className="font-mono text-sm text-white mb-2">Changed</h3>
            <p>
              <code className="text-[#00ff41]">zkvm_stark::public_inputs_for(program, trace)</code> replaced with{' '}
              <code className="text-[#00ff41]">public_inputs_for_program(program)</code>. The old signature took a
              program and a trace but silently ignored the program (<code className="text-[#00ff41]">let _ = program;</code>)
              — every call site in this repo always re-executed the program immediately beforehand, so this was never a
              live bug here, but nothing in the type system stopped a caller from passing a trace that didn't actually
              correspond to the program argument. The new function takes only the program and re-executes it internally,
              making that mismatch impossible to construct. Found via an external code review; verified against the
              actual source (all four call sites in <code className="text-[#00ff41]">zkvm-cli</code>,{' '}
              <code className="text-[#00ff41]">zkvm-host-server</code>) before fixing.
            </p>
          </div>
        </Section>

        <Section title="v0.1.0 — 2026-08-31">
          <p>Initial public release.</p>
          <div>
            <h3 className="font-mono text-sm text-white mb-2">Added</h3>
            <ul className="list-disc pl-5 space-y-3">
              <li><code className="text-[#00ff41]">crates/zkvm-isa</code> — the VM: an accumulator machine (ADD/SUB/MUL), conditional branching (JZ/JNZ, forward-only), and a 4-register file (LOAD/STORE), with a real interpreter and a .zkasm assembly format (labels, comments).</li>
              <li><code className="text-[#00ff41]">crates/zkvm-stark</code> — a from-scratch AIR over Winterfell binding a STARK proof to one specific program <em>and</em> its actual execution (control flow, register accesses), without a lookup/permutation argument — sound because this system has no private witness.</li>
              <li><code className="text-[#00ff41]">crates/zkvm-cli</code> — run / prove / verify / deploy / demo.</li>
              <li><code className="text-[#00ff41]">crates/zkvm-host-server</code> — an HTTP proving API (/v1/proofs, /v1/verify), a ProverBackend trait with a real stark backend and an honestly-labeled mock-echo routing stub, and MCP tools (prove, verify) verified against a real MCP client handshake.</li>
              <li><code className="text-[#00ff41]">contracts/</code> — a Foundry project: ProofOrchestrator (task/reward lifecycle with zero verification logic of its own) plus two verifiers — UnimplementedStarkVerifier (reverts, honestly, until a real one exists) and AttestedVerifier (an explicit, documented trust bridge).</li>
              <li><code className="text-[#00ff41]">scripts/onchain_demo.sh</code> and <code className="text-[#00ff41]">scripts/mcp_demo.sh</code> — real end-to-end demos, not simulated output.</li>
              <li><code className="text-[#00ff41]">.github/workflows/zk-ci.yml</code> — CI that builds, tests, then deploys and verifies every example program against a live server on every PR and push to main.</li>
              <li>Documentation: ROADMAP.md, HOST_SERVICE.md, ONCHAIN_VERIFIER.md, THREAT_MODEL.md, RECURSION.md, MCP.md — each states plainly what's real, what isn't, and what closing a given gap would actually require.</li>
            </ul>
          </div>
          <div>
            <h3 className="font-mono text-sm text-white mb-2">Known limitations</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>No loops (jumps are forward-only), no addressable memory, not RISC-V compatible.</li>
              <li>On-chain verification is an attested trust bridge, not a cryptographic STARK verifier.</li>
              <li>No auth on the HTTP or MCP surfaces — local/trusted-network use only.</li>
            </ul>
          </div>
        </Section>

        <div className="mt-10 text-center font-mono text-xs text-gray-500">
          Full file: <a className="text-[#00ff41] underline" href={`${REPO}/blob/main/CHANGELOG.md`}>CHANGELOG.md</a>.
          Related: <Link to="/roadmap" className="text-[#00ff41] underline">Roadmap</Link>, <Link to="/contributing" className="text-[#00ff41] underline">Contributing</Link>.
        </div>
      </div>
    </section>
  );
}
