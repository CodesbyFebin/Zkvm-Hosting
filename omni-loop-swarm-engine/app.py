"""Flask API for the Omni-Loop Swarm Engine."""

from flask import Flask, jsonify, request
from flask_cors import CORS

from config import get_config
from llm import get_free_models
from swarm import run_single, run_swarm

app = Flask(__name__)
CORS(app)


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "free_models": get_free_models(), "config": get_config()})


@app.route("/api/execute", methods=["POST"])
def execute():
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

    try:
        if mode == "single":
            model = models[0] if models else get_config()["default_model"]
            result = run_single(task, constraints, model, api_key, max_iterations)
        elif mode in ("swarm", "arbiter"):
            if not models:
                return jsonify({"error": "models must be a non-empty list for swarm/arbiter mode"}), 400
            resolved_arbiter = arbiter_model
            if mode == "arbiter" and not resolved_arbiter:
                resolved_arbiter = models[0]
            result = run_swarm(task, constraints, models, api_key, max_iterations, resolved_arbiter)
        else:
            return jsonify({"error": f"unknown mode '{mode}' (expected single, swarm, or arbiter)"}), 400
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:  # noqa: BLE001 - surface any unexpected failure as a 500 instead of crashing
        return jsonify({"error": f"internal error: {exc}"}), 500

    return jsonify(result)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
