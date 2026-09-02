import os
import unittest
from unittest.mock import MagicMock, patch

import requests as real_requests

import llm


class TestResolveProvider(unittest.TestCase):
    def test_requires_provider_prefix(self):
        with self.assertRaises(ValueError):
            llm._resolve_provider("no-prefix-model")

    def test_unknown_provider_raises(self):
        with self.assertRaises(ValueError):
            llm._resolve_provider("bogus/model")

    def test_known_provider_resolves(self):
        _, model_id, provider = llm._resolve_provider("kilo/deepseek-chat-v3-free")
        self.assertEqual(model_id, "deepseek-chat-v3-free")
        self.assertTrue(provider["requires_key"])


class TestCallLlmKeyHandling(unittest.TestCase):
    """Regression coverage for the kilo/ auth gap found via a live call:
    the real endpoint returned 401 unauthenticated, so requires_key must be
    True and there must be an env-var fallback, same as the other providers.
    """

    def test_missing_key_raises_value_error(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(ValueError):
                llm.call_llm("prompt", "kilo/deepseek-chat-v3-free")

    def test_env_fallback_used_when_no_key_passed(self):
        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {"choices": [{"message": {"content": "hi"}}]}

        with patch.dict(os.environ, {"KILO_API_KEY": "env-key"}, clear=True):
            with patch("llm.requests.post", return_value=mock_response) as mock_post:
                result = llm.call_llm("prompt", "kilo/deepseek-chat-v3-free")

        self.assertEqual(result, "hi")
        self.assertEqual(mock_post.call_args.kwargs["headers"]["Authorization"], "Bearer env-key")

    def test_explicit_key_overrides_env(self):
        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {"choices": [{"message": {"content": "hi"}}]}

        with patch.dict(os.environ, {"KILO_API_KEY": "env-key"}, clear=True):
            with patch("llm.requests.post", return_value=mock_response) as mock_post:
                llm.call_llm("prompt", "kilo/deepseek-chat-v3-free", api_key="explicit-key")

        self.assertEqual(mock_post.call_args.kwargs["headers"]["Authorization"], "Bearer explicit-key")

    def test_anthropic_uses_x_api_key_header_and_its_own_env_var(self):
        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {"content": [{"text": "hi"}]}

        with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "ant-key"}, clear=True):
            with patch("llm.requests.post", return_value=mock_response) as mock_post:
                result = llm.call_llm("prompt", "anthropic/claude-3-haiku")

        self.assertEqual(result, "hi")
        self.assertEqual(mock_post.call_args.kwargs["headers"]["x-api-key"], "ant-key")

    def test_http_error_includes_status_code(self):
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.raise_for_status.side_effect = real_requests.exceptions.HTTPError("401 Unauthorized")

        with patch("llm.requests.post", return_value=mock_response):
            with self.assertRaises(RuntimeError) as ctx:
                llm.call_llm("prompt", "kilo/deepseek-chat-v3-free", api_key="k")

        self.assertIn("401", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
