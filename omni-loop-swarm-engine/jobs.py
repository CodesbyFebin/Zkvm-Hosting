"""A minimal in-memory job store.

A single /api/execute call can make many sequential LLM calls (build, then
review/remediate per iteration, per candidate) -- potentially minutes of
real wall-clock time. Blocking an HTTP request/response cycle for that long
ties up a request-handling thread for no good reason. Instead, /api/execute
starts the work in a background thread and returns a job id immediately;
the frontend polls GET /api/jobs/<id> until it's done.

This is intentionally NOT Celery/Redis/RQ -- there's exactly one process
(see the Dockerfile: gunicorn runs a single worker so this in-memory dict is
shared by every request), and that's the right amount of infrastructure for
a reference app at this scale. It stops being enough the moment you need
more than one process or machine handling requests; at that point this
needs a real shared store, not more dict.
"""

import threading
import time
import uuid

_jobs = {}
_lock = threading.Lock()
_JOB_TTL_SECONDS = 3600  # bound memory growth on a long-running instance


def create_job():
    job_id = uuid.uuid4().hex
    with _lock:
        _jobs[job_id] = {"status": "pending", "result": None, "error": None, "created_at": time.time()}
    return job_id


def mark_running(job_id):
    with _lock:
        if job_id in _jobs:
            _jobs[job_id]["status"] = "running"


def mark_done(job_id, result):
    with _lock:
        if job_id in _jobs:
            _jobs[job_id].update(status="done", result=result)


def mark_error(job_id, error):
    with _lock:
        if job_id in _jobs:
            _jobs[job_id].update(status="error", error=error)


def get_job(job_id):
    with _lock:
        job = _jobs.get(job_id)
        return dict(job) if job else None


def prune_expired():
    cutoff = time.time() - _JOB_TTL_SECONDS
    with _lock:
        for job_id in [jid for jid, job in _jobs.items() if job["created_at"] < cutoff]:
            del _jobs[job_id]
