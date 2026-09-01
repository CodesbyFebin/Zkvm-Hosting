import React from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero';
import { REPO } from '../lib/constants';
import { usePageMeta, usePageJsonLd } from '../lib/seo';

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: "Threat Model: What You're Trusting, and Why",
  description: 'The proof is trustless. The on-chain payment is not -- the exact trust assumption, what breaks if it fails, and what it would take for that to change.',
  author: { '@type': 'Organization', name: 'zkvm.host' },
  mainEntityOfPage: 'https://www.zkvm.host/threat-model',
};

function Section({ title, children }) {
  return (
    <div className="border-t border-[#00ff41]/10 pt-10 mt-10">
      <h2 className="font-mono text-lg text-white mb-4 tracking-wide">{title}</h2>
      <div className="font-mono text-sm text-gray-400 leading-relaxed space-y-4">{children}</div>
    </div>
  );
}

export default function ThreatModel() {
  usePageMeta({
    title: 'Threat Model',
    description: "The proof itself is trustless. The on-chain payment is not -- the exact attester-key trust assumption, what breaks if it fails, and when this stops being true.",
    path: '/threat-model',
  });
  usePageJsonLd(JSON_LD);

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <PageHero
          eyebrow="Security"
          title="WHAT YOU'RE TRUSTING,"
          accent="AND WHY"
          dek="The one-page version of docs/THREAT_MODEL.md -- stated in exactly the terms the underlying document uses, not softened for a marketing page."
        />

        <Section title="The proof itself: trustless">
          <p>
            A <code className="text-[#00ff41]">zkvm-stark</code> proof — produced by{' '}
            <code className="text-[#00ff41]">prove_program</code>, checked by{' '}
            <code className="text-[#00ff41]">verify_program</code> — is a real STARK. Verifying it, whether locally via{' '}
            <code className="text-[#00ff41]">zkvm verify</code>, over HTTP, or via the <code className="text-[#00ff41]">verify</code> MCP
            tool, requires no trust in whoever generated it. This is standard, load-bearing cryptography: the test suite
            includes negative tests (<code className="text-[#00ff41]">rejects_tampered_result</code>,{' '}
            <code className="text-[#00ff41]">rejects_tampered_program</code>) confirming a proof manufactured for one claim
            is rejected against a different one.
          </p>
          <p className="text-white font-bold">This is the only trustless part of the system end to end.</p>
        </Section>

        <Section title="The on-chain path: an attested bridge, not a cryptographic verifier">
          <p>
            <code className="text-[#00ff41]">ProofOrchestrator</code> pays a prover once a proof is "accepted," and what
            "accepted" means depends entirely on which <code className="text-[#00ff41]">IProofVerifier</code> it's configured with:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong className="text-white">UnimplementedStarkVerifier</strong> — accepts nothing. Every submitProof call reverts. No trust required, because no payment is possible.</li>
            <li><strong className="text-white">AttestedVerifier</strong> (the one <code className="text-[#00ff41]">scripts/onchain_demo.sh</code> uses) — accepts a proof once a designated attester address calls <code className="text-[#00ff41]">attest(publicInputsHash, proofHash)</code>.</li>
          </ul>
          <p>
            Concretely, the trust assumption is: <em>the attester key is not compromised, and whoever controls it always
            verifies locally before attesting, never on faith.</em> If that fails — key theft, or a careless/malicious
            attester — a false attestation pays out a real reward for a proof that either doesn't exist or doesn't verify.
            The contract has no way to detect this; it only checks that the attester's signature is present, not that the
            underlying math is sound.
          </p>
          <p>
            This is the same trust model a centralized sequencer has before its fraud/validity proofs go live: a known,
            single point of trust, acceptable because it's explicit and small, not because it's absent.
          </p>
        </Section>

        <Section title="Key management, honestly">
          <p>
            There is currently no key management story beyond "a private key exists and someone runs{' '}
            <code className="text-[#00ff41]">cast send ... --private-key</code>." Concretely, for anything beyond a local demo:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>The attester key should never be the same key used for anything else — a compromise of one shouldn't compromise the other.</li>
            <li>It should live in whatever secrets store the deployment environment already has — <code className="text-[#00ff41]">scripts/onchain_demo.sh</code>'s hardcoded Anvil test keys are demo-only.</li>
            <li>Rotation means deploying a new AttestedVerifier with the new attester address — there's no in-place key-rotation function.</li>
          </ul>
          <p className="text-xs text-gray-500">None of this is implemented. It's written here so the gap is a documented decision, not a silent omission.</p>
        </Section>

        <Section title="When does this stop being true?">
          <p>
            Only when a real cryptographic verifier replaces <code className="text-[#00ff41]">AttestedVerifier</code> —
            see <Link to="/onchain-verifier" className="text-[#00ff41] underline">the On-Chain Verifier page</Link> for exactly
            what that requires. Until then, <strong className="text-white">"the proof is trustless, the payment is not"</strong> is
            the accurate description of this system, stated in exactly those terms.
          </p>
        </Section>

        <div className="mt-10 text-center font-mono text-xs text-gray-500">
          Full document: <a className="text-[#00ff41] underline" href={`${REPO}/blob/main/docs/THREAT_MODEL.md`}>docs/THREAT_MODEL.md</a>.
          Related: <Link to="/onchain-verifier" className="text-[#00ff41] underline">On-Chain Verifier</Link>, <Link to="/contracts" className="text-[#00ff41] underline">Contracts</Link>, <Link to="/faq" className="text-[#00ff41] underline">FAQ</Link>.
        </div>
      </div>
    </section>
  );
}
