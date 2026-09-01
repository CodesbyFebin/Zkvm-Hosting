import React from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero';
import { REPO } from '../lib/constants';
import { usePageMeta, usePageJsonLd } from '../lib/seo';

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'Connecting to a Real STARK Prover via MCP',
  description: 'The real prove and verify MCP tools -- exact input schemas, why they run on their own port instead of nested onto the HTTP API, and how to point Claude or Cursor at them.',
  author: { '@type': 'Organization', name: 'zkvm.host' },
  mainEntityOfPage: 'https://www.zkvm.host/mcp',
};

function Code({ children }) {
  return <pre className="bg-black border border-[#00ff41]/20 p-4 overflow-x-auto text-[#00ff41] text-xs">{children}</pre>;
}

export default function Mcp() {
  usePageMeta({
    title: 'MCP Server',
    description: 'The real prove and verify MCP tools on port 4478 -- exact input schemas and why they run separately from the HTTP API.',
    path: '/mcp',
  });
  usePageJsonLd(JSON_LD);

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <PageHero
          eyebrow="MCP"
          title="TALK TO IT FROM"
          accent="CLAUDE OR CURSOR"
          dek="Two real tools, verified with an actual initialize → tools/list → tools/call handshake -- not written and assumed to work."
        />

        <div className="border-t border-[#00ff41]/10 pt-10 mb-10">
          <h2 className="font-mono text-lg text-white mb-4">The two tools</h2>

          <div className="border border-[#00ff41]/20 bg-black/50 p-6 mb-4">
            <code className="text-[#00ff41] font-mono text-sm">prove</code>
            <p className="font-mono text-xs text-gray-400 mt-2 mb-3">"Generate a real STARK proof that a .zkasm program executes to its claimed result. Returns the base64-encoded proof and the (initial, result) public inputs."</p>
            <Code>{`{ "program": "<.zkasm text>" }`}</Code>
          </div>

          <div className="border border-[#00ff41]/20 bg-black/50 p-6">
            <code className="text-[#00ff41] font-mono text-sm">verify</code>
            <p className="font-mono text-xs text-gray-400 mt-2 mb-3">"Verify a proof (from the prove tool) against the exact .zkasm program it claims to be for. Re-executes the program locally to know what to check -- it never trusts the proof's own claims."</p>
            <Code>{`{ "program": "<.zkasm text>", "proof_base64": "<from prove>" }`}</Code>
          </div>
        </div>

        <div className="border-t border-[#00ff41]/10 pt-10 mb-10">
          <h2 className="font-mono text-lg text-white mb-4">Why its own port, not nested on the HTTP API</h2>
          <p className="font-mono text-sm text-gray-400 leading-relaxed">
            <code className="text-[#00ff41]">rmcp</code>'s <code className="text-[#00ff41]">StreamableHttpService</code> implements{' '}
            <code className="text-[#00ff41]">tower::Service</code>, but its response body type doesn't line up with{' '}
            <code className="text-[#00ff41]">axum::Router::nest_service</code> without an adapter layer -- and the upstream examples
            serve it via a raw <code className="text-[#00ff41]">hyper</code> accept loop rather than mounting it on an existing router,
            a strong signal that isn't a supported plug-and-play path. So it runs on <code className="text-[#00ff41]">:4478</code>, separate
            from the HTTP API's <code className="text-[#00ff41]">:4477</code>, following the pattern the upstream examples actually use.
          </p>
        </div>

        <div className="border-t border-[#00ff41]/10 pt-10">
          <h2 className="font-mono text-lg text-white mb-4">Run it</h2>
          <Code>{`cargo build --release -p zkvm-host-server
./scripts/mcp_demo.sh`}</Code>
          <p className="font-mono text-xs text-gray-500 mt-4">
            Point any MCP client at <code className="text-[#00ff41]">http://127.0.0.1:4478</code>. Full setup for Claude Desktop and
            Cursor specifically: <a className="text-[#00ff41] underline" href={`${REPO}/blob/main/docs/MCP.md`}>docs/MCP.md</a>. Source:{' '}
            <a className="text-[#00ff41] underline" href={`${REPO}/blob/main/crates/zkvm-host-server/src/mcp.rs`}>crates/zkvm-host-server/src/mcp.rs</a>.
          </p>
          <p className="font-mono text-xs text-gray-500 mt-4">
            The rest of the API these tools sit alongside: <Link to="/api-reference" className="text-[#00ff41] underline">HTTP API Reference</Link>.
          </p>
        </div>
      </div>
    </section>
  );
}
