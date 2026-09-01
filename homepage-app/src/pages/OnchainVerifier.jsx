import React from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero';
import { REPO } from '../lib/constants';
import { usePageMeta, usePageJsonLd } from '../lib/seo';

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'What a Real On-Chain STARK Verifier Requires',
  description: 'The five pieces a trustless on-chain STARK verifier needs -- Fiat-Shamir, Merkle authentication, FRI, field arithmetic, and the out-of-domain constraint check -- and why every production system instead wraps the STARK in a SNARK.',
  author: { '@type': 'Organization', name: 'zkvm.host' },
  mainEntityOfPage: 'https://www.zkvm.host/onchain-verifier',
};

function Section({ title, children }) {
  return (
    <div className="border-t border-[#00ff41]/10 pt-10 mt-10">
      <h2 className="font-mono text-lg text-white mb-4 tracking-wide">{title}</h2>
      <div className="font-mono text-sm text-gray-400 leading-relaxed space-y-4">{children}</div>
    </div>
  );
}

const PIECES = [
  { n: 1, title: 'Recompute Fiat-Shamir randomness', desc: 'Re-derive every random challenge by hashing the same transcript the prover used. This project uses Blake3_256, which has no EVM precompile -- an on-chain verifier would need Keccak256 instead, which Winterfell already supports switching to.' },
  { n: 2, title: 'Merkle authentication', desc: 'Re-hash each authentication path up to the committed root. With 32 queries (this AIR\'s default), each log2(trace_length × blowup_factor) nodes deep, this is the bulk of verification gas cost.' },
  { n: 3, title: 'FRI verification', desc: 'Check the low-degree proof in rounds -- fold, check query-consistency via more Merkle paths, verify the final remainder polynomial. Algorithmically the most intricate part to port; every step needs the exact field arithmetic the prover used.' },
  { n: 4, title: 'Field arithmetic', desc: "Winterfell's 128-bit prime field has no native EVM support -- every add/sub/mul must be hand-rolled Solidity/Yul, reduced mod that specific prime, matching the prover bit-for-bit." },
  { n: 5, title: 'Out-of-domain constraint check', desc: "Evaluate the AIR's transition constraints (VmAir::evaluate_transition, ported to Solidity) at the out-of-domain point. This is the step that actually encodes \"was this the right AIR\" -- it has to be hand-regenerated any time the AIR changes." },
];

export default function OnchainVerifier() {
  usePageMeta({
    title: 'On-Chain Verifier Requirements',
    description: 'The five real pieces a trustless on-chain STARK verifier needs, why porting one to Solidity is a large undertaking, and the SNARK-wrapping path production systems actually take instead.',
    path: '/onchain-verifier',
  });
  usePageJsonLd(JSON_LD);

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <PageHero
          eyebrow="On-Chain Verification"
          title="WHAT IT WOULD"
          accent="ACTUALLY TAKE"
          dek="AttestedVerifier is a trust bridge, not a cryptographic verifier -- this is the real gap between what exists and what trustless on-chain verification requires."
        />

        <Section title="The two verifiers that exist today">
          <p>
            <code className="text-[#00ff41]">UnimplementedStarkVerifier</code> reverts, always — honest about doing nothing.{' '}
            <code className="text-[#00ff41]">AttestedVerifier</code> accepts a proof once a trusted party attests off-chain
            that <code className="text-[#00ff41]">zkvm verify</code> passed. That moves trust from "the EVM checked the
            math" to "you trust this one key" — legitimate for testing the rest of the system today, but it must never be
            described as trustless. See <Link to="/threat-model" className="text-[#00ff41] underline">the Threat Model page</Link> for the full trust boundary.
          </p>
        </Section>

        <Section title="The five pieces a real verifier needs, in order">
          <div className="space-y-4">
            {PIECES.map((p) => (
              <div key={p.n} className="border border-[#00ff41]/20 bg-black/50 p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-6 h-6 border border-[#00ff41]/40 flex items-center justify-center font-mono text-[#00ff41] text-xs shrink-0">{p.n}</div>
                  <h3 className="font-mono text-sm text-white">{p.title}</h3>
                </div>
                <p className="text-xs text-gray-400 pl-9">{p.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Why this isn't a small addition">
          <p>
            Every real production STARK-on-Ethereum verifier — Starknet's, RISC Zero's, SP1's — is thousands of lines of
            specialized Solidity/Yul, built by teams with dedicated cryptography engineers, re-audited whenever the AIR or
            hash choice changes. Doing it correctly but insecurely doesn't fail loudly — it produces a verifier that
            silently accepts invalid proofs, strictly worse than <code className="text-[#00ff41]">AttestedVerifier</code>'s
            explicit trust assumption. That's why <code className="text-[#00ff41]">UnimplementedStarkVerifier</code> reverts
            instead of stubbing something "close enough."
          </p>
        </Section>

        <Section title="The path production systems actually take: wrap it in a SNARK">
          <p>
            Because verifying a STARK directly on the EVM is so gas-heavy, most production systems instead run the STARK
            verifier itself as a program, prove <em>that verifier's execution</em> with a SNARK that has a small, fixed,
            cheap-to-verify proof and a real EVM precompile for the underlying pairing curve, and put only that small
            SNARK-verification call on-chain. STARK for cheap, fast, transparent-setup proving of the actual computation;
            a thin SNARK wrapper only for the part that has to run on Ethereum.
          </p>
        </Section>

        <Section title="What would actually be worth building next, in order">
          <ol className="list-decimal pl-5 space-y-2">
            <li>Switch the hasher from Blake3_256 to a Keccak/SHA3-family hasher — real, scoped, testable today.</li>
            <li>A native Rust reference verifier mimicking exactly what an on-chain verifier would do, as a test, before writing any Solidity/Yul.</li>
            <li>Only after that: a from-scratch Solidity/Yul verifier, or a SNARK-wrapping approach.</li>
          </ol>
          <p className="text-xs text-gray-500 pt-2">None of this is started. AttestedVerifier is the honest stand-in until it is.</p>
        </Section>

        <div className="mt-10 text-center font-mono text-xs text-gray-500">
          Full document: <a className="text-[#00ff41] underline" href={`${REPO}/blob/main/docs/ONCHAIN_VERIFIER.md`}>docs/ONCHAIN_VERIFIER.md</a>.
          Related: <Link to="/contracts" className="text-[#00ff41] underline">Contracts</Link>, <Link to="/threat-model" className="text-[#00ff41] underline">Threat Model</Link>.
        </div>
      </div>
    </section>
  );
}
