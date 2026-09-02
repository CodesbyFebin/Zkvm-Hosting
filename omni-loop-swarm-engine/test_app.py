import time
import unittest
from unittest.mock import patch

import app as app_module


def _wait_for_status(client, job_id, target_statuses, timeout=2.0):
    deadline = time.time() + timeout
    body = None
    while time.time() < deadline:
        resp = client.get(f"/api/jobs/{job_id}")
        body = resp.get_json()
        if body["status"] in target_statuses:
            return body
        time.sleep(0.02)
    raise AssertionError(f"job never reached {target_statuses}, last saw: {body}")


class TestExecuteValidation(unittest.TestCase):
    """These should all fail before a job is even created -- no background
    thread, no network call, just a synchronous 400."""

    def setUp(self):
        self.client = app_module.app.test_client()

    def test_missing_task_returns_400(self):
        resp = self.client.post("/api/execute", json={})
        self.assertEqual(resp.status_code, 400)
        self.assertIn("task", resp.get_json()["error"])

    def test_swarm_mode_without_models_returns_400(self):
        resp = self.client.post("/api/execute", json={"mode": "swarm", "task": "x", "models": []})
        self.assertEqual(resp.status_code, 400)

    def test_unknown_mode_returns_400(self):
        resp = self.client.post("/api/execute", json={"mode": "bogus", "task": "x"})
        self.assertEqual(resp.status_code, 400)


class TestExecuteJobLifecycle(unittest.TestCase):
    """Regression coverage for the async job fix: /api/execute must return
    immediately (202 + job_id) instead of blocking on the LLM calls."""

    def setUp(self):
        self.client = app_module.app.test_client()

    @patch("app.run_single")
    def test_single_mode_returns_job_id_and_completes(self, mock_run_single):
        mock_run_single.return_value = {
            "mode": "single",
            "candidates": [],
            "total_models": 1,
            "passed": 1,
            "failed": 0,
            "final_output": "done",
            "winner_model": "kilo/x",
        }

        resp = self.client.post("/api/execute", json={"mode": "single", "task": "x", "models": ["kilo/x"]})
        self.assertEqual(resp.status_code, 202)
        job_id = resp.get_json()["job_id"]
        self.assertTrue(job_id)

        body = _wait_for_status(self.client, job_id, {"done", "error"})
        self.assertEqual(body["status"], "done")
        self.assertEqual(body["result"]["final_output"], "done")

    @patch("app.run_swarm")
    def test_swarm_mode_completes(self, mock_run_swarm):
        mock_run_swarm.return_value = {
            "mode": "swarm",
            "candidates": [],
            "total_models": 2,
            "passed": 2,
            "failed": 0,
            "final_output": "winning output",
            "winner_model": "kilo/a",
        }

        resp = self.client.post(
            "/api/execute", json={"mode": "swarm", "task": "x", "models": ["kilo/a", "kilo/b"]}
        )
        self.assertEqual(resp.status_code, 202)
        job_id = resp.get_json()["job_id"]

        body = _wait_for_status(self.client, job_id, {"done", "error"})
        self.assertEqual(body["status"], "done")
        self.assertEqual(body["result"]["winner_model"], "kilo/a")

    @patch("app.run_single")
    def test_job_error_is_surfaced(self, mock_run_single):
        mock_run_single.side_effect = RuntimeError("boom")

        resp = self.client.post("/api/execute", json={"mode": "single", "task": "x", "models": ["kilo/x"]})
        job_id = resp.get_json()["job_id"]

        body = _wait_for_status(self.client, job_id, {"done", "error"})
        self.assertEqual(body["status"], "error")
        self.assertIn("boom", body["error"])

    def test_unknown_job_id_returns_404(self):
        resp = self.client.get("/api/jobs/does-not-exist")
        self.assertEqual(resp.status_code, 404)


if __name__ == "__main__":
    unittest.main()
