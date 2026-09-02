"""Builder -> Reviewer -> Remediation orchestration, single-agent or swarm.

Each candidate runs its own independent build/review/remediate loop
(`_build_candidate`). In swarm mode, candidates run concurrently via a
thread pool -- these are network-bound LLM calls, so threads (not
processes) are the right tool. An optional Arbiter can compare every
candidate that passed review and pick a winner.
"""

import random
import re
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

from llm import call_llm

BUILDER_SYSTEM = """You are the Builder in a multi-agent build/review loop.
Given a task and constraints, produce a complete, working solution.

Respond in exactly this format and nothing else:
<output>
...your complete solution here (code, config, prose -- whatever the task calls for)...
</output>
<notes>
...one or two sentences on key decisions or tradeoffs, optional...
</notes>"""

REVIEWER_SYSTEM = """You are the Reviewer in a multi-agent build/review loop.
You will be given the original task, its constraints, and a candidate
solution produced by another model (the Builder). Judge only whether the
solution actually satisfies the task and constraints -- do not rewrite it
yourself.

Respond in exactly this format and nothing else:
<verdict>PASS</verdict> or <verdict>FAIL</verdict>
<feedback>
If PASS: one sentence confirming why it satisfies the task.
If FAIL: the specific, concrete problems the Builder must fix -- precise
enough that another model could act on it without seeing your reasoning.
</feedback>"""

REMEDIATION_SYSTEM = """You are the Builder, revising your previous solution.
You will be given the original task, your previous output, and a
Reviewer's feedback explaining what's wrong. Produce a corrected, complete
solution that addresses every point in the feedback -- do not just patch
around it.

Respond in exactly this format and nothing else:
<output>
...your complete, corrected solution...
</output>
<notes>
...one sentence on what you changed and why, optional...
</notes>"""

ARBITER_SYSTEM = """You are the Arbiter in a multi-agent build competition.
Multiple models independently produced solutions to the same task, and each
one already passed an independent review. Pick the single best one and say
why -- considering correctness, completeness, clarity, and fit to the
stated constraints.

Respond in exactly this format and nothing else:
<arbiter_winner>the exact model id of the winning candidate</arbiter_winner>
<reasoning>
2-4 sentences on why this candidate is the strongest, and what
distinguished it from the others.
</reasoning>"""


def _extract(text, tag, default=""):
    match = re.search(rf"<{tag}>(.*?)</{tag}>", text, re.DOTALL | re.IGNORECASE)
    return match.group(1).strip() if match else default


def _pick_reviewer(builder_model, all_models, failed_models, iteration=0):
    """Pick a reviewer: never the builder, never a known-failed model.

    Deterministic round-robin over the eligible pool, keyed by iteration, so
    repeated rounds cycle through different reviewers instead of hammering
    one model. Falls back to any non-builder model if every other model has
    already failed, and to the builder itself only if it's the sole model
    in the swarm.
    """
    candidates = [m for m in all_models if m != builder_model and m not in failed_models]
    if not candidates:
        candidates = [m for m in all_models if m != builder_model]
    if not candidates:
        return builder_model
    return candidates[iteration % len(candidates)]


def _format_build_prompt(task, constraints):
    parts = [f"Task:\n{task}"]
    if constraints:
        parts.append(f"Constraints:\n{constraints}")
    return "\n\n".join(parts)


def _format_review_prompt(task, constraints, output):
    parts = [f"Task:\n{task}"]
    if constraints:
        parts.append(f"Constraints:\n{constraints}")
    parts.append(f"Candidate solution to review:\n{output}")
    return "\n\n".join(parts)


def _format_remediation_prompt(task, constraints, previous_output, feedback):
    parts = [f"Task:\n{task}"]
    if constraints:
        parts.append(f"Constraints:\n{constraints}")
    parts.append(f"Your previous solution:\n{previous_output}")
    parts.append(f"Reviewer feedback (must be addressed):\n{feedback}")
    return "\n\n".join(parts)


def _build_candidate(task, constraints, builder_model, all_models, api_key, max_iterations, failed_models, lock):
    """Run one candidate's full BUILD -> (REVIEW -> REMEDIATE)* loop.

    Returns {model, iterations, history, final_output, status, error} with
    status one of "passed", "max_iterations", "failed".
    """
    history = []

    try:
        response = call_llm(
            _format_build_prompt(task, constraints),
            builder_model,
            api_key=api_key,
            system=BUILDER_SYSTEM,
        )
        output = _extract(response, "output", default=response)
    except Exception as exc:  # noqa: BLE001 - any provider/network failure means this candidate is dead
        with lock:
            failed_models.add(builder_model)
        return {
            "model": builder_model,
            "iterations": 0,
            "history": history,
            "final_output": "",
            "status": "failed",
            "error": f"build failed: {exc}",
        }

    for iteration in range(max_iterations):
        with lock:
            current_failed = set(failed_models)
        reviewer = _pick_reviewer(builder_model, all_models, current_failed, iteration)

        try:
            review_response = call_llm(
                _format_review_prompt(task, constraints, output),
                reviewer,
                api_key=api_key,
                system=REVIEWER_SYSTEM,
            )
        except Exception as exc:  # noqa: BLE001 - a reviewer outage shouldn't kill the candidate
            history.append(
                {
                    "iteration": iteration,
                    "reviewer": reviewer,
                    "verdict": "ERROR",
                    "feedback": f"reviewer call failed: {exc}",
                }
            )
            continue

        verdict = _extract(review_response, "verdict", default="FAIL").strip().upper()
        feedback = _extract(review_response, "feedback", default=review_response).strip()
        history.append({"iteration": iteration, "reviewer": reviewer, "verdict": verdict, "feedback": feedback})

        if verdict == "PASS":
            return {
                "model": builder_model,
                "iterations": iteration + 1,
                "history": history,
                "final_output": output,
                "status": "passed",
                "error": None,
            }

        if iteration == max_iterations - 1:
            break

        try:
            remediation_response = call_llm(
                _format_remediation_prompt(task, constraints, output, feedback),
                builder_model,
                api_key=api_key,
                system=REMEDIATION_SYSTEM,
            )
            output = _extract(remediation_response, "output", default=output)
        except Exception as exc:  # noqa: BLE001
            with lock:
                failed_models.add(builder_model)
            return {
                "model": builder_model,
                "iterations": iteration + 1,
                "history": history,
                "final_output": output,
                "status": "failed",
                "error": f"remediation failed: {exc}",
            }

    return {
        "model": builder_model,
        "iterations": max_iterations,
        "history": history,
        "final_output": output,
        "status": "max_iterations",
        "error": None,
    }


def _arbitrate(task, candidates, arbiter_model, api_key):
    survivors = [c for c in candidates if c["status"] == "passed"]

    if not survivors:
        return {"winner_model": None, "reasoning": "No candidates passed review; nothing to arbitrate."}

    if len(survivors) == 1:
        return {
            "winner_model": survivors[0]["model"],
            "reasoning": "Only one candidate passed review; selected by default.",
        }

    comparison = "\n\n".join(f"--- Candidate: {c['model']} ---\n{c['final_output']}" for c in survivors)
    prompt = f"Task:\n{task}\n\nCandidates to compare:\n\n{comparison}"

    survivor_models = {c["model"] for c in survivors}
    try:
        response = call_llm(prompt, arbiter_model, api_key=api_key, system=ARBITER_SYSTEM)
    except Exception as exc:  # noqa: BLE001
        fallback = survivors[0]["model"]
        return {
            "winner_model": fallback,
            "reasoning": f"Arbiter call failed ({exc}); defaulted to the first passing candidate.",
        }

    winner = _extract(response, "arbiter_winner").strip()
    reasoning = _extract(response, "reasoning", default=response).strip()

    if winner not in survivor_models:
        fallback = survivors[0]["model"]
        return {
            "winner_model": fallback,
            "reasoning": (
                f"Arbiter returned an unrecognized model id ('{winner}'); defaulted to the "
                f"first passing candidate. Raw reasoning: {reasoning}"
            ),
        }

    return {"winner_model": winner, "reasoning": reasoning}


def run_single(task, constraints="", model=None, api_key="", max_iterations=3):
    if not model:
        raise ValueError("model is required for single mode")

    result = _build_candidate(
        task, constraints, model, [model], api_key, max_iterations,
        failed_models=set(), lock=threading.Lock(),
    )
    passed = result["status"] == "passed"

    return {
        "mode": "single",
        "candidates": [result],
        "total_models": 1,
        "passed": 1 if passed else 0,
        "failed": 0 if passed else 1,
        "final_output": result["final_output"] if passed else None,
        "winner_model": model if passed else None,
    }


def run_swarm(task, constraints="", models=None, api_key="", max_iterations=3, arbiter_model=None):
    models = models or []
    if not models:
        raise ValueError("models must be a non-empty list")

    failed_models = set()
    lock = threading.Lock()
    results_by_model = {}

    with ThreadPoolExecutor(max_workers=len(models)) as executor:
        future_to_model = {
            executor.submit(
                _build_candidate, task, constraints, model, models, api_key, max_iterations, failed_models, lock
            ): model
            for model in models
        }
        for future in as_completed(future_to_model):
            results_by_model[future_to_model[future]] = future.result()

    candidates = [results_by_model[m] for m in models]
    passed = sum(1 for c in candidates if c["status"] == "passed")
    failed = len(candidates) - passed

    result = {
        "mode": "swarm",
        "candidates": candidates,
        "total_models": len(models),
        "passed": passed,
        "failed": failed,
    }

    winner_model = None
    if arbiter_model:
        arbiter_result = _arbitrate(task, candidates, arbiter_model, api_key)
        result["arbiter"] = arbiter_result
        winner_model = arbiter_result.get("winner_model")
    else:
        passing = [c for c in candidates if c["status"] == "passed"]
        if passing:
            winner_model = passing[0]["model"]

    final_output = None
    if winner_model:
        winning = next((c for c in candidates if c["model"] == winner_model), None)
        final_output = winning["final_output"] if winning else None

    result["final_output"] = final_output
    result["winner_model"] = winner_model
    return result
