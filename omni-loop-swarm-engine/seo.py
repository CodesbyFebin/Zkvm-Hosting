"""Server-side per-route metadata injection for the SPA shell.

frontend/index.html ships real default content (visible as-is via Vite dev
mode, or a raw static-file serve with no Flask in front) between
SSR:HEAD:START/END and SSR:NOSCRIPT:START/END comment markers. render_index()
swaps that block for the requested route's real content before Flask serves
it -- genuine server-side content per URL, delivered on the very first
response with zero JavaScript execution required to read it, without
migrating off Vite+React to a full SSR framework for what is currently a
two-page app.
"""

import json
import re
from html import escape

BASE_URL = "https://swarm.zkvm.host"

_HEAD_RE = re.compile(r"<!-- SSR:HEAD:START -->.*?<!-- SSR:HEAD:END -->", re.DOTALL)
_NOSCRIPT_RE = re.compile(r"<!-- SSR:NOSCRIPT:START -->.*?<!-- SSR:NOSCRIPT:END -->", re.DOTALL)

ROUTE_META = {
    "/": {
        "title": "Omni-Loop Swarm Engine",
        "description": (
            "A Builder -> Reviewer -> Remediation loop for LLMs: run one model, or a swarm of "
            "models in parallel that build, review, and fix each other's work, with an optional "
            "Arbiter to pick the best result."
        ),
        "jsonld": {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Omni-Loop Swarm Engine",
            "url": f"{BASE_URL}/",
            "applicationCategory": "DeveloperApplication",
            "operatingSystem": "Any (Docker)",
            "description": (
                "A Flask + React reference implementation of a Builder -> Reviewer -> Remediation "
                "loop for LLMs, runnable against a single model or a swarm of models in parallel, "
                "with an optional Arbiter to pick a winner among candidates that passed review."
            ),
            "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
        },
        "noscript_html": """
      <main style="font-family: sans-serif; max-width: 640px; margin: 40px auto; padding: 0 20px; color: #111">
        <h1>Omni-Loop Swarm Engine</h1>
        <p>
          A Builder &rarr; Reviewer &rarr; Remediation loop for LLMs. This UI needs JavaScript to run
          interactively, but here is what it does:
        </p>
        <ul>
          <li><strong>Single mode</strong>: one model builds a solution, no review loop.</li>
          <li>
            <strong>Swarm mode</strong>: every selected model independently builds a solution in parallel, each
            gets reviewed by a different model in the swarm (round-robin, never itself, never a model that has
            already failed), and revises based on feedback for up to a configurable number of iterations.
          </li>
          <li>
            <strong>Arbiter mode</strong>: swarm mode, then one designated model compares every candidate that
            passed review and picks a winner with reasoning.
          </li>
        </ul>
        <p>
          API: <code>GET /api/health</code>, <code>POST /api/execute</code> (returns a job id),
          <code>GET /api/jobs/&lt;id&gt;</code> (poll for the result). Full API reference at
          <a href="/docs">/docs</a>.
        </p>
      </main>
""",
    },
    "/docs": {
        "title": "API Reference — Omni-Loop Swarm Engine",
        "description": (
            "The real HTTP API: GET /api/health, POST /api/execute (returns a job id), "
            "GET /api/jobs/<id> to poll for the result. Exact request and response shapes for "
            "single, swarm, and arbiter mode."
        ),
        "jsonld": {
            "@context": "https://schema.org",
            "@type": "TechArticle",
            "headline": "Omni-Loop Swarm Engine API Reference",
            "url": f"{BASE_URL}/docs",
            "description": (
                "GET /api/health, POST /api/execute, and GET /api/jobs/<id> -- exact request and "
                "response shapes, and the difference between single, swarm, and arbiter mode."
            ),
        },
        "noscript_html": """
      <main style="font-family: sans-serif; max-width: 640px; margin: 40px auto; padding: 0 20px; color: #111">
        <h1>API Reference</h1>
        <p><code>GET /api/health</code> -- status, free model list, config.</p>
        <p><code>POST /api/execute</code> -- submit a task; returns <code>{"job_id": "...", "status": "pending"}</code> (202).</p>
        <p><code>GET /api/jobs/&lt;job_id&gt;</code> -- poll for <code>{"status": "done", "result": {...}}</code> or <code>{"status": "error", "error": "..."}</code>.</p>
        <p>Single mode: one model builds, no review loop. Swarm mode: every selected model builds in
        parallel and reviews another model's work round-robin. Arbiter mode: swarm mode, then one
        model picks a winner. Back to <a href="/">the tool</a>.</p>
      </main>
""",
    },
}


def render_index(template_html, path):
    """Swap the SSR:HEAD and SSR:NOSCRIPT blocks in template_html for the
    given path's real content. Falls back to "/"'s content for any path
    that isn't a known route -- React Router's own NotFound page still
    renders client-side once JS loads; this fallback just needs to be
    honest and non-broken for the pre-JS response, not pixel-perfect."""
    meta = ROUTE_META.get(path, ROUTE_META["/"])
    canonical = f"{BASE_URL}{path}" if path != "/" else f"{BASE_URL}/"

    head_html = f"""<!-- SSR:HEAD:START -->
    <title>{escape(meta['title'])}</title>
    <meta name="description" content="{escape(meta['description'])}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="{canonical}" />

    <meta property="og:type" content="website" />
    <meta property="og:url" content="{canonical}" />
    <meta property="og:title" content="{escape(meta['title'])}" />
    <meta property="og:description" content="{escape(meta['description'])}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="{escape(meta['title'])}" />
    <meta name="twitter:description" content="{escape(meta['description'])}" />

    <script type="application/ld+json">
      {json.dumps(meta['jsonld'])}
    </script>
    <!-- SSR:HEAD:END -->"""

    noscript_html = f"""<!-- SSR:NOSCRIPT:START -->
    <noscript>{meta['noscript_html']}</noscript>
    <!-- SSR:NOSCRIPT:END -->"""

    html = _HEAD_RE.sub(lambda _m: head_html, template_html, count=1)
    html = _NOSCRIPT_RE.sub(lambda _m: noscript_html, html, count=1)
    return html
