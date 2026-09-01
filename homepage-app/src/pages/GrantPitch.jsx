import React from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero';
import { REPO } from '../lib/constants';
import { usePageMeta, usePageJsonLd } from '../lib/seo';

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'zkVM Grant Pitch',
  description: 'The one-page case for funding this project -- what it is, why the honesty discipline itself is the asset, and the four scoped items funding would go toward, mirrored from docs/GRANT_PITCH.md.',
  author: { '@type': 'Organization', name: 'zkvm.host' },
  mainEntityOfPage: 'https://www.zkvm.host/grant-pitch',
};

function Section({ title, children }) {
  return (
    <div className="border-t border-[#00ff41]/10 pt-10 mt-10">
      <h2 className="font-mono text-lg text-white mb-4 tracking-wide">{title}</h2>
      <div className="font-mono text-sm text-gray-400 leading-relaxed space-y-4">{children}</div>
    </div>
  );
}

export default function GrantPitch() {
  usePageMeta({
    title: 'Grant Pitch',
    description: 'A one-page case for funding this project, for Ethereum Foundation ESP, Protocol Labs Research, Gitcoin Grants, or similar -- every claim checkable against the code.',
    path: '/grant-pitch',
  });
  usePageJsonLd(JSON_LD);

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <PageHero
          eyebrow="Funding"
          title="THE CASE FOR"
          accent="FUNDING THIS"
          dek="For anyone evaluating this project for Ethereum Foundation ESP, Protocol Labs Research, Gitcoin Grants, or a similar program. Every claim below is checkable against the code in this repo."
        />

        <Section title="What this is">
          <p>
            A small, real STARK-based zkVM: an interpreter, a from-scratch AIR (arithmetization) binding a proof to
            one exact program <em>and its actual execution</em> — including which branch it took and which register
            it touched — and a prover/verifier on{' '}
            <a href="https://github.com/facebook/winterfell" target="_blank" rel="noreferrer" className="text-[#00ff41] underline">Winterfell</a>.
            Not a wrapper around an existing zkVM (SP1, RISC Zero) and not a simulation of one: the AIR, the constraint
            system, and the soundness argument are original work in this repo, with negative tests that confirm
            tampering with a proof's claimed program, result, control flow, or register access is rejected.
          </p>
        </Section>

        <Section title="Why it's worth funding">
          <p>
            Most public zkVM writeups either (a) claim more than the code does, or (b) are research papers with no
            runnable artifact. This project's discipline is the opposite: every doc in <code className="text-[#00ff41]">docs/</code> states
            plainly what's real versus what a much larger business-strategy document it grew out of aspires to,
            including a <Link to="/roadmap" className="text-[#00ff41] underline">Roadmap</Link> section titled "What's
            explicitly NOT here yet" and a <Link to="/threat-model" className="text-[#00ff41] underline">Threat Model</Link> that
            names the on-chain verifier's actual trust assumption (an attested bridge, not a cryptographic verifier)
            instead of glossing over it. An SP1 integration was investigated and explicitly declined, with the
            concrete reasons written down, rather than either building it badly or silently dropping the idea.
          </p>
          <p>That discipline is the asset: a small, correct, honestly-scoped base that funding can extend without first having to untangle inflated claims.</p>
        </Section>

        <Section title="What funding would go toward">
          <p>In the order the Roadmap already lays out, most validation-per-effort first:</p>
          <ol className="list-decimal pl-5 space-y-3">
            <li>
              <strong className="text-white">Loops</strong> — a dynamically-sized execution trace (bounded,
              padded/truncated by actual run length) so JZ/JNZ can jump backward. The current fixed-length,
              forward-only trace is the main practical limitation on what .zkasm programs can express.
            </li>
            <li>
              <strong className="text-white">Addressable memory</strong> — dynamic addresses (LD r0, [r1]), distinct
              from today's four static register slots. Open research question already flagged in{' '}
              <Link to="/recursion" className="text-[#00ff41] underline">Recursion</Link>: whether this system's
              "verifier re-executes and asserts everything" soundness trick still holds once addresses are
              runtime-computed, or whether a real lookup/permutation argument becomes necessary.
            </li>
            <li>
              <strong className="text-white">Recursive proof compression</strong> — required for genuinely trustless
              on-chain verification (today's AttestedVerifier is an explicit trust bridge, not a cryptographic
              verifier). The Recursion page is currently a scoped literature-review, not an implementation; turning
              it into one is a real research-and-engineering undertaking.
            </li>
            <li>
              <strong className="text-white">External review</strong> — no formal verification, fuzzing, or
              third-party audit exists yet. The only soundness evidence today is this repo's own unit test suite.
            </li>
          </ol>
        </Section>

        <Section title="What this is not asking for">
          <p>
            Not funding for a token, a proving marketplace, or a decentralized prover network — none of that has a
            code artifact here, and none of it is in scope. The ask is engineering time against the four items above,
            nothing broader.
          </p>
        </Section>

        <Section title="Ask">
          <p>
            Budget depends on the program and the scope it wants to fund (a single milestone above vs. several) —
            happy to scope a specific number against a specific program's format on request. Reach out at{' '}
            <a href="mailto:codesbyfebin@gmail.com" className="text-[#00ff41] underline">codesbyfebin@gmail.com</a>.
          </p>
        </Section>

        <div className="mt-10 text-center font-mono text-xs text-gray-500">
          Full document: <a className="text-[#00ff41] underline" href={`${REPO}/blob/main/docs/GRANT_PITCH.md`}>docs/GRANT_PITCH.md</a>.
          Related: <a href="/funding/" className="text-[#00ff41] underline">Funding</a>, <Link to="/roadmap" className="text-[#00ff41] underline">Roadmap</Link>.
        </div>
      </div>
    </section>
  );
}
