import React from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero';
import { REPO } from '../lib/constants';
import { usePageMeta, usePageJsonLd } from '../lib/seo';

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'zkvm-host-server HTTP API Reference',
  description: 'The real, complete HTTP API -- every route, exact request/response field names, verified line by line against the axum handler source.',
  author: { '@type': 'Organization', name: 'zkvm.host' },
  mainEntityOfPage: 'https://www.zkvm.host/api-reference',
};

function Code({ children }) {
  return <pre className="bg-black border border-[#00ff41]/20 p-4 overflow-x-auto text-[#00ff41] text-xs">{children}</pre>;
}

function Endpoint({ method, path, title, children }) {
  return (
    <div className="border border-[#00ff41]/20 bg-black/50 p-6 mb-6">
      <div className="flex items-center gap-3 mb-2">
        <span className={`font-mono text-[10px] font-bold px-2 py-1 border ${method === 'GET' ? 'text-[#00ff41] border-[#00ff41]/40' : 'text-violet-300 border-violet-400/40'}`}>{method}</span>
        <code className="font-mono text-sm text-white">{path}</code>
      </div>
      <h3 className="font-mono text-xs text-gray-400 mb-3">{title}</h3>
      <div className="font-mono text-xs text-gray-400 leading-relaxed space-y-3">{children}</div>
    </div>
  );
}

export default function ApiReference() {
  usePageMeta({
    title: 'HTTP API Reference',
    description: 'Every route on zkvm-host-server -- POST /v1/proofs, POST /v1/verify, GET /v1/backends, and the backend-dispatched equivalents -- with exact request/response fields.',
    path: '/api-reference',
  });
  usePageJsonLd(JSON_LD);

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <PageHero
          eyebrow="API Reference"
          title="THE REAL"
          accent="HTTP API"
          dek="Runs as a local/self-hosted process on :4477 -- not a hosted multi-tenant service. Every field name below is copied from the actual request/response structs, not reconstructed from memory."
        />

        <Endpoint method="GET" path="/healthz" title="Liveness check, used by zk-ci.yml before deploying anything to a fresh server.">
          <p>No body. Returns 200 once the server is ready to accept requests.</p>
        </Endpoint>

        <Endpoint method="POST" path="/v1/proofs" title='"Push code, get a proof" -- the whole "no circuits, no prover clusters" pitch, for the one real backend.'>
          <p><strong className="text-white">Request:</strong></p>
          <Code>{`{ "program": "INIT 5\\nADD 3\\nMUL 2\\nSUB 4" }`}</Code>
          <p><strong className="text-white">Response:</strong></p>
          <Code>{`{
  "initial": "5",
  "result": "24",
  "proof_bytes": 11234,
  "proof_base64": "..."
}`}</Code>
          <p>Rejects anything over the 2,000-instruction cap -- see <Link to="/features" className="text-[#00ff41] underline">Features</Link> for why that number specifically.</p>
        </Endpoint>

        <Endpoint method="POST" path="/v1/verify" title="Re-executes program locally (cheap) to know what to check proof_base64 against, then verifies.">
          <p><strong className="text-white">Request:</strong></p>
          <Code>{`{ "program": "INIT 5\\n...", "proof_base64": "..." }`}</Code>
          <p><strong className="text-white">Response:</strong></p>
          <Code>{`{ "valid": true, "result": "24", "error": null }`}</Code>
          <p>Deliberately doesn't require anything from the <code className="text-[#00ff41]">/v1/proofs</code> response other than the proof bytes -- the program itself is the only shared trust anchor.</p>
        </Endpoint>

        <Endpoint method="GET" path="/v1/backends" title='Lists what is actually registered, so "multi-VM" is checkable rather than asserted.'>
          <Code>{`{ "backends": ["stark", "mock-echo"], "default": "stark" }`}</Code>
          <p><code className="text-[#00ff41]">mock-echo</code> is a routing stub -- its verify always errors, never reports <code className="text-[#00ff41]">valid: true</code>.</p>
        </Endpoint>

        <Endpoint method="POST" path="/v1/backends/{name}/proofs" title="The router-dispatched equivalent of /v1/proofs, generalized to whichever backend {name} names.">
          <p>Same request shape as <code className="text-[#00ff41]">/v1/proofs</code>. A 404 if <code className="text-[#00ff41]">{'{name}'}</code> isn't registered.</p>
        </Endpoint>

        <Endpoint method="POST" path="/v1/backends/{name}/verify" title="The router-dispatched equivalent of /v1/verify.">
          <p><strong className="text-white">Request:</strong></p>
          <Code>{`{ "program": "...", "bytes_base64": "..." }`}</Code>
          <p><strong className="text-white">Response:</strong></p>
          <Code>{`{ "valid": false, "error": "mock-echo cannot verify anything" }`}</Code>
        </Endpoint>

        <div className="border-t border-[#00ff41]/10 pt-8 mt-8 font-mono text-xs text-gray-500">
          Hardening applied to all routes: 1&nbsp;MB body limit, 60s timeout, 4 concurrent requests max.
          Full source: <a className="text-[#00ff41] underline" href={`${REPO}/blob/main/crates/zkvm-host-server/src/lib.rs`}>crates/zkvm-host-server/src/lib.rs</a>.
          Design rationale: <a className="text-[#00ff41] underline" href={`${REPO}/blob/main/docs/HOST_SERVICE.md`}>docs/HOST_SERVICE.md</a>.
        </div>
      </div>
    </section>
  );
}
