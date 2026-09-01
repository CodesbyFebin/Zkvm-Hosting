import React from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero';
import { REPO } from '../lib/constants';
import { usePageMeta, usePageJsonLd } from '../lib/seo';

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'Contributing to rust-stark-zkvm',
  description: 'Real setup steps, the actual PR checklist CI enforces, what kind of PRs are useful right now, and what this project explicitly will not accept.',
  author: { '@type': 'Organization', name: 'zkvm.host' },
  mainEntityOfPage: 'https://www.zkvm.host/contributing',
};

function Code({ children }) {
  return <pre className="bg-black border border-[#00ff41]/20 p-4 overflow-x-auto text-[#00ff41] text-xs">{children}</pre>;
}

function Section({ title, children }) {
  return (
    <div className="border-t border-[#00ff41]/10 pt-10 mt-10">
      <h2 className="font-mono text-lg text-white mb-4 tracking-wide">{title}</h2>
      <div className="font-mono text-sm text-gray-400 leading-relaxed space-y-4">{children}</div>
    </div>
  );
}

export default function Contributing() {
  usePageMeta({
    title: 'Contributing',
    description: 'Real setup steps, the actual PR checklist CI enforces, what kind of PRs are useful right now, and what this project explicitly will not accept.',
    path: '/contributing',
  });
  usePageJsonLd(JSON_LD);

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <PageHero
          eyebrow="Contributing"
          title="A SMALL,"
          accent="HONEST ZKVM"
          dek="Read the Roadmap first to see what's real versus what's explicitly not built yet, so a contribution lands where it's actually useful."
        />

        <Section title="Setup">
          <Code>{`git clone --recurse-submodules ${REPO}.git
cd rust-stark-zkvm
cargo build --release
cargo test --release --workspace
cd contracts && forge test`}</Code>
          <p>
            <strong className="text-white">Use --release for tests, not just binaries.</strong> One constraint has a
            data-dependent polynomial degree that trips a Winterfell debug-only self-check stricter than actual soundness
            requires — <code className="text-[#00ff41]">--release</code> compiles that check out; the same tests pass
            either way once that specific assertion is skipped. See <Link to="/architecture" className="text-[#00ff41] underline">Architecture</Link> for the full explanation.
          </p>
        </Section>

        <Section title="Before opening a PR">
          <ul className="list-disc pl-5 space-y-2">
            <li><code className="text-[#00ff41]">cargo clippy --release --workspace --all-targets</code> should be clean.</li>
            <li><code className="text-[#00ff41]">cargo test --release --workspace</code> and <code className="text-[#00ff41]">forge test</code> should both pass — <Link to="/ci" className="text-[#00ff41] underline">CI runs both on every PR</Link>, and a red check means it isn't mergeable as-is.</li>
            <li>If you're touching <code className="text-[#00ff41]">.zkasm</code> semantics or the AIR, add a test — including, where relevant, a <em>negative</em> test (tampering with a claim should be rejected). Soundness is a thing the test suite checks, not a slogan.</li>
          </ul>
        </Section>

        <Section title="What kind of PRs are useful right now">
          <p>
            Check <Link to="/roadmap" className="text-[#00ff41] underline">the real roadmap</Link>'s ordered next steps
            (loops, addressable memory, RISC-V compatibility). If you want to work on something not listed there —
            especially anything touching <code className="text-[#00ff41]">contracts/</code>'s trust model or the on-chain
            verifier — open an issue first. Those are the parts where a well-intentioned change can quietly break a
            soundness guarantee.
          </p>
        </Section>

        <Section title="What this project won't take">
          <p>
            No fake backends named after real projects they don't implement, no <code className="text-[#00ff41]">todo!()</code> or
            "coming soon" left in place of real code (put it in the roadmap docs instead), and no verifier logic that
            accepts something it shouldn't just to make a demo pass. If a PR's tests are testing that the wrong thing was
            accepted, that's a bug in the PR, not in the test.
          </p>
        </Section>

        <Section title="Reporting a soundness or security issue">
          <p>
            Don't open a public issue for a soundness bug in the AIR, or a bug in <code className="text-[#00ff41]">contracts/</code> that
            could let an invalid proof get accepted or paid out. See <Link to="/security" className="text-[#00ff41] underline">the Security page</Link>.
          </p>
        </Section>

        <div className="mt-10 text-center font-mono text-xs text-gray-500">
          Full document: <a className="text-[#00ff41] underline" href={`${REPO}/blob/main/CONTRIBUTING.md`}>CONTRIBUTING.md</a>.
          Code of conduct: <a className="text-[#00ff41] underline" href={`${REPO}/blob/main/CODE_OF_CONDUCT.md`}>CODE_OF_CONDUCT.md</a>.
        </div>
      </div>
    </section>
  );
}
