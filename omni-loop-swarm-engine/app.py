"""Flask API for the Omni-Loop Swarm Engine.

In production this also serves the built frontend (frontend/dist/, produced
by `npm run build`) from the same origin as the API -- one container, one
port, no CORS needed for the normal deployment path. CORS is still
configurable via CORS_ORIGINS for the case where the frontend is deployed
separately (e.g. a static host talking to this API on a different origin).
"""

import os
import threading
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

import jobs
from config import get_config
from llm import get_free_models
from swarm import run_single, run_swarm

FRONTEND_DIST = Path(__file__).parent / "frontend" / "dist"
_has_frontend_build = FRONTEND_DIST.is_dir()

app = Flask(__name__, static_folder=str(FRONTEND_DIST) if _has_frontend_build else None)

_cors_origins = os.environ.get("CORS_ORIGINS", "*")
CORS(app, origins="*" if _cors_origins == "*" else _cors_origins.split(","))


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "free_models": get_free_models(), "config": get_config()})


@app.route("/api/execute", methods=["POST"])
def execute():
    """Validate synchronously, then run the actual (possibly slow) work in a
    background thread and hand back a job id immediately. See jobs.py for
    why -- a swarm run can hold an HTTP request open for minutes otherwise.
    """
    data = request.get_json(silent=True) or {}

    mode = data.get("mode", "single")
    task = (data.get("task") or "").strip()
    constraints = data.get("constraints", "")
    models = data.get("models") or []
    api_key = data.get("api_key", "")
    max_iterations = data.get("max_iterations") or get_config()["swarm"]["max_iterations"]
    arbiter_model = data.get("arbiter_model")

    if not task:
        return jsonify({"error": "task is required"}), 400

    if mode == "single":
        model = models[0] if models else get_config()["default_model"]
    elif mode in ("swarm", "arbiter"):
        if not models:
            return jsonify({"error": "models must be a non-empty list for swarm/arbiter mode"}), 400
        model = None
    else:
        return jsonify({"error": f"unknown mode '{mode}' (expected single, swarm, or arbiter)"}), 400

    job_id = jobs.create_job()

    def _run():
        jobs.mark_running(job_id)
        try:
            if mode == "single":
                result = run_single(task, constraints, model, api_key, max_iterations)
            else:
                resolved_arbiter = arbiter_model
                if mode == "arbiter" and not resolved_arbiter:
                    resolved_arbiter = models[0]
                result = run_swarm(task, constraints, models, api_key, max_iterations, resolved_arbiter)
            jobs.mark_done(job_id, result)
        except ValueError as exc:
            jobs.mark_error(job_id, str(exc))
        except Exception as exc:  # noqa: BLE001 - surface any unexpected failure via the job, not a crash
            jobs.mark_error(job_id, f"internal error: {exc}")

    threading.Thread(target=_run, daemon=True).start()
    jobs.prune_expired()

    return jsonify({"job_id": job_id, "status": "pending"}), 202


@app.route("/api/jobs/<job_id>", methods=["GET"])
def get_job(job_id):
    job = jobs.get_job(job_id)
    if job is None:
        return jsonify({"error": "job not found"}), 404

    response = {"status": job["status"]}
    if job["status"] == "done":
        response["result"] = job["result"]
    elif job["status"] == "error":
        response["error"] = job["error"]
    return jsonify(response)


if _has_frontend_build:

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
        candidate = FRONTEND_DIST / path
        if path and candidate.is_file():
            return send_from_directory(str(FRONTEND_DIST), path)
        return send_from_directory(str(FRONTEND_DIST), "index.html")


if __name__ == "__main__":
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=debug)
