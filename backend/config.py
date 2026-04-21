import os
from dotenv import load_dotenv

load_dotenv()

OLLAMA_API_KEY: str = os.environ.get("OLLAMA_API_KEY", "")
OLLAMA_HOST: str = os.environ.get("OLLAMA_HOST", "https://ollama.com")

# Temperature kept low — we want deterministic structured output
PIPELINE_TEMPERATURE: float = 0.3

# Timeout per LLM call (seconds)
LLM_TIMEOUT: int = 120

if not OLLAMA_API_KEY:
    import warnings
    warnings.warn(
        "OLLAMA_API_KEY is not set. Add it to your .env file. "
        "All /api/refine requests will fail until it is configured.",
        stacklevel=2,
    )
