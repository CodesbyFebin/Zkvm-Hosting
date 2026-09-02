"""Central configuration for the Omni-Loop Swarm Engine."""

DEFAULT_CONFIG = {
    "default_model": "kilo/deepseek-chat-v3-free",
    "free_models": [
        "kilo/deepseek-chat-v3-free",
        "kilo/llama-3.1-8b-instruct-free",
        "kilo/qwen-2.5-72b-instruct-free",
        "kilo/gemini-flash-1.5-free",
    ],
    "swarm": {
        "max_agents": 6,
        "default_agents": 4,
        "max_iterations": 3,
        "round_robin": True,
        "parallel": True,
    },
}


def get_config():
    return DEFAULT_CONFIG
