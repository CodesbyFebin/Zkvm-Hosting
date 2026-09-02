# Omni-Loop Swarm Engine

A standalone Flask + React reference implementation of a Builder -> Reviewer
-> Remediation loop, runnable against a single model or a swarm of models in
parallel, with an optional Arbiter to pick a winner among candidates that
passed review.

This directory is intentionally **not** part of any npm-workspaces monorepo
elsewhere in this repo -- it has its own Python environment and its own
`frontend/` with its own `package.json`, and is meant to be read, run, and
ported from as a self-contained reference, not deployed alongside anything
else here.

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
`openai/gpt-4o-mini` (see `llm.py`'s `PROVIDER_MAP`). The `kilo/` prefix
needs no API key; `openai/` and `anthropic/` do (`OPENAI_API_KEY` is read
from the environment as a fallback for OpenAI if no key is passed in).

## Running it

```bash
make install   # python venv + pip install + npm install
make backend   # Flask on :5000
make frontend  # Vite dev server on :5173, proxying /api -> :5000
make test      # python -m pytest test_swarm.py -v
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

`POST /api/execute`:

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

Response shape (swarm/arbiter mode):

```json
{
  "mode": "swarm",
  "candidates": [{"model": "...", "iterations": 2, "history": [...], "final_output": "...", "status": "passed", "error": null}],
  "total_models": 3,
  "passed": 2,
  "failed": 1,
  "arbiter": {"winner_model": "...", "reasoning": "..."},
  "final_output": "...",
  "winner_model": "..."
}
```

## Testing without live model calls

`test_swarm.py` mocks `swarm.call_llm` throughout, so the whole suite runs
offline and deterministically -- it verifies real parallel execution
(wall-clock timing), round-robin reviewer selection, failed-model exclusion
from the reviewer pool, input validation, and arbiter winner selection.
