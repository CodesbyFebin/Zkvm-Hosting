"""Thin, provider-agnostic LLM call wrapper.

Every model id is provider-prefixed, e.g. "kilo/deepseek-chat-v3-free" or
"openai/gpt-4o-mini". call_llm() resolves the prefix, builds the right
request shape for that provider, and returns plain text.
"""

import os

import requests

KILO_FREE_POOL = [
    "kilo/deepseek-chat-v3-free",
    "kilo/llama-3.1-8b-instruct-free",
    "kilo/qwen-2.5-72b-instruct-free",
    "kilo/gemini-flash-1.5-free",
]

PROVIDER_MAP = {
    "kilo": {
        "base_url": "https://kilocode.ai/api/openrouter/v1",
        "requires_key": False,
        "kind": "openai",
    },
    "openai": {
        "base_url": "https://api.openai.com/v1",
        "requires_key": True,
        "kind": "openai",
    },
    "anthropic": {
        "base_url": "https://api.anthropic.com/v1",
        "requires_key": True,
        "kind": "anthropic",
    },
}


def _resolve_provider(model):
    if "/" not in model:
        raise ValueError(
            f"Model id '{model}' must be prefixed with a provider, e.g. 'kilo/<model>'."
        )
    provider_key, model_id = model.split("/", 1)
    provider = PROVIDER_MAP.get(provider_key)
    if provider is None:
        raise ValueError(
            f"Unknown provider '{provider_key}' for model '{model}'. "
            f"Known providers: {sorted(PROVIDER_MAP)}"
        )
    return provider_key, model_id, provider


def call_llm(prompt, model, api_key="", system="", temperature=0.3, max_tokens=4000):
    """Call an LLM and return its text response.

    Raises ValueError for bad input (unknown provider, missing required key)
    and RuntimeError for transport/HTTP failures (status code included).
    """
    provider_key, model_id, provider = _resolve_provider(model)

    key = api_key
    if not key and provider_key == "openai":
        key = os.environ.get("OPENAI_API_KEY", "")

    if provider["requires_key"] and not key:
        raise ValueError(
            f"Model '{model}' requires an API key for provider '{provider_key}', "
            f"and none was provided (checked argument and environment)."
        )

    if provider["kind"] == "anthropic":
        url = f"{provider['base_url']}/messages"
        headers = {
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        payload = {
            "model": model_id,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system:
            payload["system"] = system
    else:
        url = f"{provider['base_url']}/chat/completions"
        headers = {"content-type": "application/json"}
        if key:
            headers["Authorization"] = f"Bearer {key}"
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        payload = {
            "model": model_id,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

    response = None
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=120)
        response.raise_for_status()
    except requests.exceptions.HTTPError as exc:
        status = response.status_code if response is not None else "unknown"
        raise RuntimeError(f"LLM call to '{model}' failed with HTTP {status}: {exc}") from exc
    except requests.exceptions.RequestException as exc:
        raise RuntimeError(f"LLM call to '{model}' failed: {exc}") from exc

    data = response.json()
    if provider["kind"] == "anthropic":
        return data["content"][0]["text"]
    return data["choices"][0]["message"]["content"]


def get_free_models():
    return list(KILO_FREE_POOL)
