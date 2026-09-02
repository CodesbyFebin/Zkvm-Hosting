# Omni-Loop Swarm Engine

A standalone Flask + React reference implementation of a Builder -> Reviewer
-> Remediation loop, runnable against a single model or a swarm of models in
parallel, with an optional Arbiter to pick a winner among candidates that
passed review.

This directory is intentionally **not** part of any npm-workspaces monorepo
elsewhere in this repo -- it has its own Python environment and its own
`frontend/` with its own `package.json`, own `Dockerfile`, and own
`fly.toml`, and is meant to be read, run, ported from, and (if you want)
deployed as a self-contained unit, independent of anything else here.

## How it works

- **Single mode**: one model builds a solution. No review loop.
- **Swarm mode**: every model in the list independently builds a solution
  (in parallel, via a thread pool), each gets reviewed by a different model
  in the swarm (round-robin, never itself, never a model that has already
  failed), and revises based on feedback for up to `max_iterations` rounds.
  Each candidate ends `passed`, `max_iterations` (never got a clean pass),
  or `failed` (a build or remediation call errored out).
- **Arbiter mode**: swarm mode, then one designated model compares every
  candidate that passed review and picks a winner with reasoning.

Model ids are provider-prefixed, e.g. `kilo/deepseek-chat-v3-free` or
`openai/gpt-4o-mini` (see `llm.py`'s `PROVIDER_MAP`). All three providers
(`kilo`, `openai`, `anthropic`) require an API key -- each has its own
environment-variable fallback (`KILO_API_KEY`, `OPENAI_API_KEY`,
`ANTHROPIC_API_KEY`) used when a request doesn't supply `api_key` in the
body.

## Running it

```bash
make install   # python venv + pip install + npm install
make backend   # Flask on :5000
make frontend  # Vite dev server on :5173, proxying /api -> :5000
make test      # python -m pytest test_swarm.py test_llm.py test_app.py -v
```

Or manually:

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python app.py                    # backend on :5000

cd frontend && npm install && npm run dev   # frontend on :5173
```

## API

`GET /api/health` -> `{status, free_models, config}`

`POST /api/execute` validates synchronously (missing task, empty model list,
unknown mode all return `400` immediately) and otherwise starts the actual
run in a background thread, returning right away:

```json
{
  "mode": "single | swarm | arbiter",
  "task": "...",
  "constraints": "...",
  "models": ["kilo/deepseek-chat-v3-free", "..."],
  "api_key": "",
  "max_iterations": 3,
  "arbiter_model": "kilo/qwen-2.5-72b-instruct-free"
}
```

-> `202 {"job_id": "...", "status": "pending"}`

`GET /api/jobs/<job_id>` -> poll this until `status` is `done` or `error`:

```json
{"status": "pending" | "running"}
{"status": "done", "result": {"mode": "swarm", "candidates": [...], "total_models": 3, "passed": 2, "failed": 1, "arbiter": {"winner_model": "...", "reasoning": "..."}, "final_output": "...", "winner_model": "..."}}
{"status": "error", "error": "..."}
```

An unknown `job_id` returns `404`. See `jobs.py` for why this is a job
queue rather than a blocking call: a single swarm run can make many
sequential LLM calls per candidate and take minutes.

## Testing without live model calls

`test_swarm.py`, `test_llm.py`, and `test_app.py` mock `call_llm` (or the
`run_single`/`run_swarm` orchestration functions) throughout, so the whole
suite runs offline and deterministically:

- `test_swarm.py` -- parallel execution (wall-clock timing), round-robin
  reviewer selection, failed-model exclusion from the reviewer pool, input
  validation, arbiter winner selection.
- `test_llm.py` -- provider resolution, API-key-required enforcement, the
  per-provider environment-variable fallback, Anthropic's distinct header
  shape, and HTTP error propagation with status code.
- `test_app.py` -- `/api/execute` returns `202` + a job id without
  blocking, validation errors still return synchronous `400`s, a job
  transitions to `done`/`error` correctly, and an unknown job id `404`s.

## Deployment

One Docker image builds the frontend and serves it from the same Flask app
that serves `/api/*`, on gunicorn -- no separate frontend host, no CORS
config needed for the default path.

```bash
make docker-build          # or: docker build -t omni-loop-swarm-engine .
make docker-run            # serves on :5000
curl localhost:5000/api/health
```

### Fly.io

`fly.toml` is checked in with a placeholder app name -- Fly app names are
globally unique, so rename it before your first deploy:

```bash
fly launch --no-deploy      # picks up fly.toml, prompts for a real app name
fly deploy
```

The `/api/health` check in `fly.toml` is what Fly uses to decide the machine
is up; `auto_stop_machines`/`min_machines_running = 0` means it scales to
zero when idle (fine for a reference app; remove those two lines if you want
it always warm).

### Environment variables

See `.env.example`. `CORS_ORIGINS` only matters if you deploy the frontend
separately from the API (e.g. the frontend on a static host, hitting this
API on a different origin) -- the default single-container deployment
serves both from the same origin and never touches CORS at all.

### Resolved: worker-blocking on long swarm runs

A single `/api/execute` call in swarm/arbiter mode can make many sequential
LLM calls per candidate (build, then review/remediate per iteration).
Originally this blocked the HTTP request/response cycle for the entire
duration. Fixed: `/api/execute` now validates synchronously and hands the
actual run to a background thread, returning a job id immediately (`202`);
the frontend polls `GET /api/jobs/<id>`. See `jobs.py`'s module docstring
for why this is a plain in-memory dict rather than Celery/Redis (and
exactly where that stops being enough): gunicorn runs a **single** worker
process (`--workers 1 --threads 8` in the Dockerfile) specifically so every
request shares that one dict -- multiple worker processes would each have
their own inconsistent view of job state.

### Resolved: `kilo/` provider auth

`llm.py`'s `PROVIDER_MAP` originally marked `kilo` as `requires_key: False`,
based on the "free pool" description this project was scaffolded from. A
live test against the real `kilocode.ai` endpoint returned `401
Unauthorized` even with no key sent. Fixed: `kilo` is now marked
`requires_key: True` like the other two providers, with its own
`KILO_API_KEY` environment-variable fallback (previously only `openai` had
one -- `anthropic` now has `ANTHROPIC_API_KEY` too, for consistency). The
request/response plumbing itself (including HTTP error propagation with
status code) was already correct end-to-end; this was purely a wrong
assumption about the provider's auth requirement, now aligned with observed
reality and covered by `test_llm.py`.

## SEO / AEO / GEO / machine-readability

This is a one-page internal tool, not a content site, so the goal here is
narrower than on a marketing site: make sure a crawler or an AI
answer-engine fetcher that doesn't execute JavaScript still gets accurate,
real content on the first fetch, instead of an empty `<div id="root">`.

- **Not true SSR, and that's a deliberate call, not an oversight.** Real
  SSR would mean rendering the actual React tree server-side, which for a
  plain Vite + React app means migrating to a framework with SSR support
  (Next.js, Remix, vite-plugin-ssr) -- a real rewrite, disproportionate for
  a single-page tool whose primary audience is developers reading the
  source. Instead, `frontend/index.html` carries real `<meta
  name="description">`, Open Graph/Twitter tags, a `SoftwareApplication`
  JSON-LD block, and a `<noscript>` fallback describing all three modes and
  the API in plain text -- all delivered in the initial HTML response
  Flask serves, with zero JavaScript execution required to read it. That
  covers the actual goal (machine-readable content on first fetch) without
  the disproportionate framework migration.
- **`robots.txt`** (`frontend/public/robots.txt`) -- allows all crawlers,
  points to `sitemap.xml`.
- **`sitemap.xml`** (`frontend/public/sitemap.xml`) -- one `<url>` entry,
  honestly: this is a single-page client-rendered app with exactly one real
  route. Absolute URLs at `https://swarm.zkvm.host/`, the intended deployed
  subdomain (see `fly.toml`'s comment for how to wire that domain up on
  Fly -- it isn't automatic just because it's in these files).
- **`llms.txt`** (`frontend/public/llms.txt`) -- a machine-readable summary
  of what this tool does and its real API surface. Named after a real
  proposal (Jeremy Howard, Sept 2024), but worth knowing: no major AI lab
  has confirmed using `llms.txt` for crawling, training, or retrieval as of
  2026 -- treat it as a cheap, unproven nice-to-have, not a guaranteed
  visibility lever.
- **No `ai.txt`.** It isn't a real standard -- no spec, no adopting
  crawler, nothing behind the name despite showing up in SEO listicles. The
  JSON-LD + `robots.txt` + `llms.txt` above already cover the actual
  underlying goal (telling automated systems what this is); a fourth file
  with an invented name wouldn't add anything real.
- All three (`robots.txt`, `llms.txt`, `sitemap.xml`) live in Vite's
  `public/` directory, so `npm run build` copies them into `dist/` verbatim
  and Flask's existing static-file route serves them with no additional
  backend code.
