import threading
import time
import unittest
from unittest.mock import patch

import swarm


def _fast_pass_llm(prompt, model, api_key="", system="", temperature=0.3, max_tokens=4000):
    time.sleep(0.05)
    if system == swarm.REVIEWER_SYSTEM:
        return "<verdict>PASS</verdict><feedback>Looks good.</feedback>"
    return "<output>done</output>"


class TestParallelism(unittest.TestCase):
    @patch("swarm.call_llm", side_effect=_fast_pass_llm)
    def test_swarm_runs_candidates_in_parallel(self, _mock):
        models = [f"kilo/model-{i}" for i in range(9)]
        start = time.time()
        result = swarm.run_swarm("do the thing", models=models, max_iterations=3)
        elapsed = time.time() - start

        # Sequential would be 9 models * 2 calls (build+review) * 0.05s = 0.9s.
        # A thread pool of 9 workers should finish in roughly one round-trip.
        self.assertLess(elapsed, 0.45, "swarm did not appear to run candidates in parallel")
        self.assertEqual(result["passed"], 9)
        self.assertEqual(result["total_models"], 9)


class TestPickReviewer(unittest.TestCase):
    def test_round_robin_cycles_through_candidates(self):
        models = ["A", "B", "C", "D"]
        self.assertEqual(swarm._pick_reviewer("A", models, set(), iteration=0), "B")
        self.assertEqual(swarm._pick_reviewer("A", models, set(), iteration=1), "C")
        self.assertEqual(swarm._pick_reviewer("A", models, set(), iteration=2), "D")
        self.assertEqual(swarm._pick_reviewer("A", models, set(), iteration=3), "B")

    def test_never_picks_the_builder(self):
        models = ["A", "B"]
        for i in range(5):
            self.assertNotEqual(swarm._pick_reviewer("A", models, set(), iteration=i), "A")

    def test_excludes_failed_models(self):
        models = ["A", "B", "C", "D"]
        result = swarm._pick_reviewer("B", models, {"A"}, iteration=0)
        self.assertNotIn(result, ("A", "B"))
        self.assertEqual(result, "C")

    def test_falls_back_when_all_others_failed(self):
        models = ["A", "B", "C"]
        result = swarm._pick_reviewer("A", models, {"B", "C"}, iteration=0)
        self.assertIn(result, ("B", "C"))

    def test_falls_back_to_builder_when_it_is_the_only_model(self):
        self.assertEqual(swarm._pick_reviewer("A", ["A"], set(), iteration=0), "A")


class TestRemediationLoop(unittest.TestCase):
    def test_round_robin_reviewers_across_failed_iterations(self):
        def fake_llm(prompt, model, api_key="", system="", temperature=0.3, max_tokens=4000):
            if system == swarm.BUILDER_SYSTEM:
                return "<output>v0</output>"
            if system == swarm.REMEDIATION_SYSTEM:
                return "<output>v1</output>"
            return "<verdict>FAIL</verdict><feedback>needs work</feedback>"

        with patch("swarm.call_llm", side_effect=fake_llm):
            result = swarm._build_candidate(
                "task", "", "A", ["A", "B", "C"], "", max_iterations=2,
                failed_models=set(), lock=threading.Lock(),
            )

        reviewers = [h["reviewer"] for h in result["history"]]
        self.assertEqual(reviewers, ["B", "C"])
        self.assertEqual(result["status"], "max_iterations")

    def test_passes_when_reviewer_approves(self):
        def fake_llm(prompt, model, api_key="", system="", temperature=0.3, max_tokens=4000):
            if system == swarm.BUILDER_SYSTEM:
                return "<output>v0</output>"
            return "<verdict>PASS</verdict><feedback>fine</feedback>"

        with patch("swarm.call_llm", side_effect=fake_llm):
            result = swarm._build_candidate(
                "task", "", "A", ["A", "B"], "", max_iterations=3,
                failed_models=set(), lock=threading.Lock(),
            )

        self.assertEqual(result["status"], "passed")
        self.assertEqual(result["iterations"], 1)

    def test_build_failure_marks_model_failed(self):
        def fake_llm(prompt, model, api_key="", system="", temperature=0.3, max_tokens=4000):
            raise RuntimeError("simulated outage")

        failed = set()
        with patch("swarm.call_llm", side_effect=fake_llm):
            result = swarm._build_candidate(
                "task", "", "A", ["A", "B"], "", max_iterations=2,
                failed_models=failed, lock=threading.Lock(),
            )

        self.assertEqual(result["status"], "failed")
        self.assertIn("A", failed)


class TestFailedModelExclusion(unittest.TestCase):
    def test_prefailed_model_never_used_as_reviewer(self):
        def fake_llm(prompt, model, api_key="", system="", temperature=0.3, max_tokens=4000):
            if system == swarm.BUILDER_SYSTEM:
                return "<output>ok</output>"
            return "<verdict>PASS</verdict><feedback>fine</feedback>"

        with patch("swarm.call_llm", side_effect=fake_llm):
            result = swarm._build_candidate(
                "task", "", "B", ["A", "B", "C"], "", max_iterations=2,
                failed_models={"A"}, lock=threading.Lock(),
            )

        reviewers_used = [h["reviewer"] for h in result["history"]]
        self.assertNotIn("A", reviewers_used)
        self.assertEqual(result["status"], "passed")

    def test_run_swarm_isolates_a_failed_builder(self):
        def fake_llm(prompt, model, api_key="", system="", temperature=0.3, max_tokens=4000):
            if model == "A" and system == swarm.BUILDER_SYSTEM:
                raise RuntimeError("simulated outage")
            if system == swarm.BUILDER_SYSTEM:
                return "<output>ok</output>"
            return "<verdict>PASS</verdict><feedback>fine</feedback>"

        with patch("swarm.call_llm", side_effect=fake_llm):
            result = swarm.run_swarm("task", models=["A", "B", "C"], max_iterations=2)

        a_result = next(c for c in result["candidates"] if c["model"] == "A")
        self.assertEqual(a_result["status"], "failed")
        self.assertEqual(result["passed"], 2)
        self.assertEqual(result["failed"], 1)


class TestValidation(unittest.TestCase):
    def test_empty_models_raises(self):
        with self.assertRaises(ValueError):
            swarm.run_swarm("task", models=[])

    def test_run_single_requires_model(self):
        with self.assertRaises(ValueError):
            swarm.run_single("task", model=None)


class TestArbitrate(unittest.TestCase):
    def test_arbiter_picks_winner_among_survivors(self):
        candidates = [
            {"model": "A", "status": "passed", "final_output": "solution A"},
            {"model": "B", "status": "passed", "final_output": "solution B"},
            {"model": "C", "status": "failed", "final_output": ""},
        ]

        def fake_llm(prompt, model, api_key="", system="", temperature=0.3, max_tokens=4000):
            return "<arbiter_winner>B</arbiter_winner><reasoning>B is more complete.</reasoning>"

        with patch("swarm.call_llm", side_effect=fake_llm):
            result = swarm._arbitrate("task", candidates, "judge/model", "")

        self.assertEqual(result["winner_model"], "B")

    def test_arbitrate_short_circuits_zero_survivors(self):
        candidates = [{"model": "A", "status": "failed", "final_output": ""}]
        result = swarm._arbitrate("task", candidates, "judge/model", "")
        self.assertIsNone(result["winner_model"])

    def test_arbitrate_short_circuits_one_survivor(self):
        candidates = [
            {"model": "A", "status": "passed", "final_output": "x"},
            {"model": "B", "status": "failed", "final_output": ""},
        ]
        result = swarm._arbitrate("task", candidates, "judge/model", "")
        self.assertEqual(result["winner_model"], "A")

    def test_arbitrate_falls_back_on_unrecognized_winner(self):
        candidates = [
            {"model": "A", "status": "passed", "final_output": "x"},
            {"model": "B", "status": "passed", "final_output": "y"},
        ]

        def fake_llm(prompt, model, api_key="", system="", temperature=0.3, max_tokens=4000):
            return "<arbiter_winner>not-a-real-model</arbiter_winner><reasoning>oops</reasoning>"

        with patch("swarm.call_llm", side_effect=fake_llm):
            result = swarm._arbitrate("task", candidates, "judge/model", "")

        self.assertEqual(result["winner_model"], "A")


if __name__ == "__main__":
    unittest.main()
