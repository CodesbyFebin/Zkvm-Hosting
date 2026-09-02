import { Link } from 'react-router-dom'
import { usePageMeta } from '../lib/seo.js'

export default function Docs() {
  usePageMeta({
    title: 'API Reference — Omni-Loop Swarm Engine',
    description:
      'The real HTTP API: GET /api/health, POST /api/execute (returns a job id), GET /api/jobs/<id> to poll for the result. Exact request and response shapes for single, swarm, and arbiter mode.',
  })

  return (
    <main className="docs-page">
      <Link to="/" className="back-link">
        &larr; Back to the tool
      </Link>
      <h1>API Reference</h1>
      <p className="docs-dek">
        Three endpoints. Submitting a task never blocks the request &mdash; it returns a job id
        immediately, and you poll for the result.
      </p>

      <section>
        <h2>
          <code>GET /api/health</code>
        </h2>
        <p>Status, the free model list, and the current swarm config.</p>
        <pre>{`{
  "status": "ok",
  "free_models": ["kilo/deepseek-chat-v3-free", "..."],
  "config": {
    "default_model": "kilo/deepseek-chat-v3-free",
    "swarm": { "max_agents": 6, "default_agents": 4, "max_iterations": 3, "round_robin": true, "parallel": true }
  }
}`}</pre>
      </section>

      <section>
        <h2>
          <code>POST /api/execute</code>
        </h2>
        <p>
          Validates synchronously &mdash; a missing task, an empty model list in swarm/arbiter mode,
          or an unknown mode all return <code>400</code> immediately, before any job is created.
          Otherwise the run starts in a background thread and this returns right away.
        </p>
        <pre>{`{
  "mode": "single | swarm | arbiter",
  "task": "...",
  "constraints": "...",
  "models": ["kilo/deepseek-chat-v3-free", "..."],
  "api_key": "",
  "max_iterations": 3,
  "arbiter_model": "kilo/qwen-2.5-72b-instruct-free"
}`}</pre>
        <p className="arrow-line">
          &rarr; <code>202 {'{"job_id": "...", "status": "pending"}'}</code>
        </p>
      </section>

      <section>
        <h2>
          <code>GET /api/jobs/&lt;job_id&gt;</code>
        </h2>
        <p>
          Poll this until <code>status</code> is <code>done</code> or <code>error</code>. An unknown
          job id returns <code>404</code>.
        </p>
        <pre>{`{"status": "pending" | "running"}

{"status": "done", "result": {
  "mode": "swarm",
  "candidates": [
    {"model": "...", "iterations": 2, "history": [...], "final_output": "...", "status": "passed", "error": null}
  ],
  "total_models": 3,
  "passed": 2,
  "failed": 1,
  "arbiter": {"winner_model": "...", "reasoning": "..."},
  "final_output": "...",
  "winner_model": "..."
}}

{"status": "error", "error": "..."}`}</pre>
      </section>

      <section>
        <h2>Model ids</h2>
        <p>
          Provider-prefixed: <code>kilo/&lt;model&gt;</code>, <code>openai/&lt;model&gt;</code>, or{' '}
          <code>anthropic/&lt;model&gt;</code>. All three currently require an API key &mdash; pass it
          per-request as <code>api_key</code>, or set <code>KILO_API_KEY</code>,{' '}
          <code>OPENAI_API_KEY</code>, or <code>ANTHROPIC_API_KEY</code> server-side as a fallback.
        </p>
      </section>

      <section>
        <h2>The three modes</h2>
        <ul>
          <li>
            <strong>Single</strong> &mdash; one model builds a solution, no review loop.
          </li>
          <li>
            <strong>Swarm</strong> &mdash; every selected model independently builds a solution in
            parallel, each gets reviewed by a different model in the swarm (round-robin, never
            itself, never a model that has already failed), and revises based on feedback for up to
            a configurable number of iterations. Each candidate ends <code>passed</code>,{' '}
            <code>max_iterations</code>, or <code>failed</code>.
          </li>
          <li>
            <strong>Arbiter</strong> &mdash; swarm mode, then one designated model compares every
            candidate that passed review and picks a winner with reasoning.
          </li>
        </ul>
      </section>

      <p className="docs-footer">
        Full source, tests, and deployment docs are in the project's <code>README.md</code>.
      </p>
    </main>
  )
}
