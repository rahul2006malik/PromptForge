import json
import re
from ollama import Client
from backend.config import OLLAMA_API_KEY, OLLAMA_HOST

# ── Singleton client ───────────────────────────────────────────────────────────
_client: Client | None = None


def _get_client() -> Client:
    global _client
    if _client is None:
        _client = Client(
            host=OLLAMA_HOST,
            headers={"Authorization": f"Bearer {OLLAMA_API_KEY}"},
        )
    return _client


def _clean_response(text: str) -> str:
    """
    Strip non-JSON wrapping that reasoning models may emit:
      1. <think>...</think> blocks (DeepSeek V3.1, Kimi K2 Thinking)
      2. Markdown code fences (```json ... ```)
    """
    text = text.strip()

    # Remove <think> ... </think> blocks (may span multiple lines)
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()

    # Remove ```json ... ``` or ``` ... ``` fences
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)

    return text.strip()


def call_llm_json(
    model: str,
    system_prompt: str,
    user_message: str,
    temperature: float = 0.3,
) -> dict:
    """
    Call the Ollama Cloud API and return a parsed JSON dict.
    Raises ValueError if the response cannot be parsed as JSON.
    """
    client = _get_client()

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]

    # Collect streamed response
    full_content = ""
    for part in client.chat(
        model,
        messages=messages,
        stream=True,
        options={"temperature": temperature},
    ):
        chunk = part["message"]["content"]
        if chunk:
            full_content += chunk

    cleaned = _clean_response(full_content)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise ValueError(
            f"Model returned non-JSON response.\n"
            f"Parse error: {e}\n"
            f"Raw response (first 500 chars):\n{full_content[:500]}"
        )
