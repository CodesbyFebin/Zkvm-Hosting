import React from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero';
import { REPO } from '../lib/constants';
import { usePageMeta, usePageJsonLd } from '../lib/seo';

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'Proof as a CI Check',
  description: 'The real GitHub Actions workflow that boots a live prover and proves plus verifies every example program before a pull request can merge -- not tests that mock the prover.',
  author: { '@type': 'Organization', name: 'zkvm.host' },
  mainEntityOfPage: 'https://www.zkvm.host/ci',
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

export default function Ci() {
  usePageMeta({
    title: 'Proof as a CI Check',
    description: 'The real zk-ci.yml workflow: builds the workspace, runs every test, then boots a live prover and proves plus verifies every example program before a PR can merge.',
    path: '/ci',
  });
  usePageJsonLd(JSON_LD);

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <PageHero
          eyebrow="CI / DevOps"
          title="PROOF AS A"
          accent="CI CHECK"
          dek="Easy to say, easy to fake with a unit test that mocks the prover. Here's the actual workflow, gated on a real HTTP round trip against a real running server."
        />

        <Section title="When it runs">
          <p>Only when it matters — path-filtered to <code className="text-[#00ff41]">examples/**.zkasm</code>, <code className="text-[#00ff41]">crates/**</code>, <code className="text-[#00ff41]">contracts/**</code>, or the workflow file itself — on every pull request and every push to main.</p>
        </Section>

        <Section title="Job 1: build, test, then actually prove">
          <Code>{`cargo build --release --workspace
cargo test --release --workspace`}</Code>
          <p>So far, a normal Rust CI job. What makes this "proof as a CI check" rather than "tests as a CI check": the workflow starts a real <code className="text-[#00ff41]">zkvm-host-server</code> in the background, polls <code className="text-[#00ff41]">/healthz</code> for up to 15 seconds, then runs this loop against every example program:</p>
          <Code>{`for f in examples/*.zkasm; do
  ./target/release/zkvm deploy "$f" --out "\${f}.proof"
  ./target/release/zkvm verify "$f" "\${f}.proof"
done`}</Code>
          <p>Every <code className="text-[#00ff41]">.zkasm</code> file gets deployed to the live server and its returned proof verified, over a real HTTP round trip. If any one fails to prove or verify, the job fails and the PR is blocked.</p>
        </Section>

        <Section title="Job 2: forge test">
          <Code>{`cd contracts && forge test -vv`}</Code>
          <p>Runs independently, with <code className="text-[#00ff41]">contracts/lib/forge-std</code> checked out as a git submodule (<code className="text-[#00ff41]">submodules: true</code> — easy to forget, fails with a confusing "file not found" if missed). See <Link to="/contracts" className="text-[#00ff41] underline">the Contracts page</Link> for what the 8 tests check.</p>
        </Section>

        <Section title="What this gate does not catch">
          <p>
            Performance regressions — a program that used to prove in 2 seconds and now takes 20 still passes, as long as it
            eventually verifies — and anything about the on-chain path, since <code className="text-[#00ff41]">scripts/onchain_demo.sh</code> isn't
            wired into CI yet. A break there would only surface by running it manually.
          </p>
        </Section>

        <div className="mt-10 text-center font-mono text-xs text-gray-500">
          Full workflow: <a className="text-[#00ff41] underline" href={`${REPO}/blob/main/.github/workflows/zk-ci.yml`}>.github/workflows/zk-ci.yml</a>.
          More detail: <a className="text-[#00ff41] underline" href="/blog/proof-as-a-ci-check/">the blog post</a>.
        </div>
      </div>
    </section>
  );
}
