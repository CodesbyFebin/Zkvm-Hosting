import React from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero';
import { REPO } from '../lib/constants';
import { usePageMeta, usePageJsonLd } from '../lib/seo';

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'Security Policy',
  description: 'Not audited, should not be trusted with real value. What counts as a real security finding, what is already a documented gap and needs no report, and how to disclose responsibly.',
  author: { '@type': 'Organization', name: 'zkvm.host' },
  mainEntityOfPage: 'https://www.zkvm.host/security',
};

function Section({ title, children }) {
  return (
    <div className="border-t border-[#00ff41]/10 pt-10 mt-10">
      <h2 className="font-mono text-lg text-white mb-4 tracking-wide">{title}</h2>
      <div className="font-mono text-sm text-gray-400 leading-relaxed space-y-4">{children}</div>
    </div>
  );
}

export default function Security() {
  usePageMeta({
    title: 'Security Policy',
    description: 'Not audited, should not be trusted with real value. What counts as a real security finding versus an already-documented gap, and how to disclose responsibly.',
    path: '/security',
  });
  usePageJsonLd(JSON_LD);

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <PageHero
          eyebrow="Security Policy"
          title="NOT AUDITED."
          accent="DISCLOSE RESPONSIBLY."
          dek="A small, experimental zkVM. It is not audited and should not be trusted with real value -- but soundness bugs are taken seriously, and responsible disclosure is genuinely useful here."
        />

        <Section title="What counts as a security issue">
          <ul className="list-disc pl-5 space-y-2">
            <li>A crafted program, proof, or public-inputs value that causes <code className="text-[#00ff41]">zkvm-stark</code> to accept a proof it shouldn't — a soundness bug in the AIR. See <Link to="/architecture" className="text-[#00ff41] underline">Architecture</Link> for what the AIR is supposed to guarantee.</li>
            <li>Anything in <code className="text-[#00ff41]">contracts/</code> that lets <code className="text-[#00ff41]">ProofOrchestrator</code> pay out a reward without a genuinely valid, correctly-attested proof.</li>
            <li>A way to make <code className="text-[#00ff41]">AttestedVerifier</code> accept an attestation it shouldn't, <em>other than</em> the already-documented trust assumption on <Link to="/threat-model" className="text-[#00ff41] underline">the Threat Model page</Link> — compromising the attester key itself isn't a new finding, that boundary is already disclosed.</li>
            <li>A way to make the MCP server or HTTP API execute something it shouldn't, beyond the already-documented lack of auth on either surface — see <Link to="/api-reference" className="text-[#00ff41] underline">API Reference</Link> and <Link to="/mcp" className="text-[#00ff41] underline">MCP</Link>.</li>
          </ul>
        </Section>

        <Section title="What doesn't need a private report">
          <p>
            Anything already named as a gap on the <Link to="/roadmap" className="text-[#00ff41] underline">Roadmap</Link>,{' '}
            <Link to="/onchain-verifier" className="text-[#00ff41] underline">On-Chain Verifier</Link>, or{' '}
            <Link to="/threat-model" className="text-[#00ff41] underline">Threat Model</Link> pages — those are documented,
            known limitations, not vulnerabilities. Open a normal public issue if you think one of those docs is itself
            wrong or out of date.
          </p>
        </Section>

        <Section title="Reporting">
          <p>Email <a className="text-[#00ff41] underline" href="mailto:codesbyfebin@gmail.com">codesbyfebin@gmail.com</a> with:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>What you found and why it's a soundness/security issue, not just a bug.</li>
            <li>A minimal repro if you have one — a <code className="text-[#00ff41]">.zkasm</code> program, a proof, or a
              test case is ideal. This repo's whole design philosophy is that soundness claims should be checkable by a
              test, so a report in that form is the fastest to act on.</li>
          </ul>
          <p className="text-xs text-gray-500">
            Please don't open a public GitHub issue for a real soundness finding until there's been a chance to look at
            it. Anything else — a typo in a doc, a clippy warning, a test that could be clearer — a normal issue or PR is fine.
          </p>
        </Section>

        <div className="mt-10 text-center font-mono text-xs text-gray-500">
          Full policy: <a className="text-[#00ff41] underline" href={`${REPO}/blob/main/SECURITY.md`}>SECURITY.md</a>.
          General contribution guide: <Link to="/contributing" className="text-[#00ff41] underline">Contributing</Link>.
        </div>
      </div>
    </section>
  );
}
