import React from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero';
import { REPO } from '../lib/constants';
import { usePageMeta, usePageJsonLd } from '../lib/seo';

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'Getting Started with rust-stark-zkvm',
  description: 'The real CLI walkthrough: build the workspace, run/prove/verify a program locally, push it over HTTP, talk to it via MCP, and run the full on-chain demo.',
  author: { '@type': 'Organization', name: 'zkvm.host' },
  mainEntityOfPage: 'https://www.zkvm.host/getting-started',
};

function Step({ n, title, children }) {
  return (
    <div className="border border-[#00ff41]/20 bg-black/50 p-6 mb-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 border border-[#00ff41]/40 flex items-center justify-center font-mono text-[#00ff41] text-sm">{n}</div>
        <h2 className="font-mono text-white text-sm tracking-wide">{title}</h2>
      </div>
      <div className="font-mono text-xs text-gray-400 leading-relaxed space-y-3 pl-11">{children}</div>
    </div>
  );
}

function Code({ children }) {
  return <pre className="bg-black border border-[#00ff41]/20 p-3 overflow-x-auto text-[#00ff41] text-xs">{children}</pre>;
}

export default function GettingStarted() {
  usePageMeta({
    title: 'Getting Started',
    description: 'Build the workspace, run/prove/verify a .zkasm program locally, push it over HTTP, talk to it via MCP, and run the full on-chain demo -- real commands, in order.',
    path: '/getting-started',
  });
  usePageJsonLd(JSON_LD);

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <PageHero
          eyebrow="Getting Started"
          title="CLONE."
          accent="BUILD. PROVE."
          dek="Every command below is real -- copied from this repo's own README and CI workflow, not written for this page. Run them in order."
        />

        <Step n="1" title="Clone and build">
          <p>Use <code className="text-[#00ff41]">--release</code> even for tests -- one constraint has a data-dependent polynomial degree that trips a stricter-than-necessary Winterfell debug check. See the <Link to="/architecture" className="text-[#00ff41] underline">Architecture page</Link> for why.</p>
          <Code>{`git clone ${REPO}
cd rust-stark-zkvm
cargo build --release
cargo test --release --workspace`}</Code>
        </Step>

        <Step n="2" title="Run, prove, and verify locally">
          <Code>{`cargo run --release -p zkvm-cli -- demo

cargo run --release -p zkvm-cli -- run    examples/fibonacci_like.zkasm
cargo run --release -p zkvm-cli -- prove  examples/fibonacci_like.zkasm out.proof
cargo run --release -p zkvm-cli -- verify examples/fibonacci_like.zkasm out.proof`}</Code>
          <p><code className="text-[#00ff41]">demo</code> runs the full execute → prove → verify → tamper-check cycle, including two deliberate tamper attempts that should get rejected.</p>
        </Step>

        <Step n="3" title="Push a program over HTTP instead of proving locally">
          <Code>{`cargo run --release -p zkvm-host-server &   # listens on :4477
cargo run --release -p zkvm-cli -- deploy examples/fibonacci_like.zkasm
cargo run --release -p zkvm-cli -- verify examples/fibonacci_like.zkasm examples/fibonacci_like.zkasm.proof`}</Code>
          <p>This is a real HTTP round trip, not a mock -- see the <Link to="/api-reference" className="text-[#00ff41] underline">API Reference</Link> for every route, or <a className="text-[#00ff41] underline" href={`${REPO}/blob/main/docs/HOST_SERVICE.md`}>docs/HOST_SERVICE.md</a> for exactly what the service does and doesn't cover.</p>
        </Step>

        <Step n="4" title="Talk to it over MCP">
          <Code>{`cargo build --release -p zkvm-host-server
./scripts/mcp_demo.sh`}</Code>
          <p>Exposes real <code className="text-[#00ff41]">prove</code>/<code className="text-[#00ff41]">verify</code> MCP tools on port 4478 for Claude, Cursor, or any MCP client -- see the <Link to="/mcp" className="text-[#00ff41] underline">MCP page</Link> for the exact tool schemas.</p>
        </Step>

        <Step n="5" title="The full on-chain loop">
          <Code>{`cd contracts && forge test
cd .. && ./scripts/onchain_demo.sh`}</Code>
          <p>Deploys the contracts to a local chain, gets a real proof from a real running server, verifies it locally, attests it on-chain, and confirms the prover is actually paid. Read <Link to="/faq" className="text-[#00ff41] underline">the FAQ</Link> first if you're expecting this to be trustless end to end -- it isn't, on purpose, and that's stated plainly.</p>
        </Step>

        <div className="mt-8 text-center font-mono text-xs text-gray-500">
          Next: <Link to="/zkasm-spec" className="text-[#00ff41] underline">the .zkasm language spec</Link>, or write your own program and run it through step 2 above.
        </div>
      </div>
    </section>
  );
}
