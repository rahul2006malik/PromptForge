from dataclasses import dataclass


@dataclass
class ModelInfo:
    id: str
    name: str
    description: str
    speed: int        # 1-5 (5 = fastest)
    reasoning: int    # 1-5 (5 = best reasoning)
    badge: str        # short label shown in UI


MODELS: list[ModelInfo] = [
    ModelInfo(
        id="deepseek-v3.1:671b-cloud",
        name="DeepSeek V3.1",
        description="685B MoE. Hybrid thinking/non-thinking mode. Best overall reasoning.",
        speed=2,
        reasoning=5,
        badge="Best Reasoning",
    ),
    ModelInfo(
        id="kimi-k2-thinking:cloud",
        name="Kimi K2 Thinking",
        description="1T params. Moonshot's best thinking model. Deep step-by-step reasoning.",
        speed=2,
        reasoning=5,
        badge="Deep Thinking",
    ),
    ModelInfo(
        id="glm-5:cloud",
        name="GLM-5",
        description="744B total / 40B active. Complex systems, long-horizon reasoning.",
        speed=3,
        reasoning=4,
        badge="Long Horizon",
    ),
    ModelInfo(
        id="minimax-m2.7:cloud",
        name="MiniMax M2.7",
        description="Professional coding & structured output. Best for clean JSON responses.",
        speed=3,
        reasoning=4,
        badge="Structured Output",
    ),
    ModelInfo(
        id="qwen3-next:80b-cloud",
        name="Qwen3-Next 80B",
        description="80B. Best parameter efficiency. Balanced speed and performance.",
        speed=4,
        reasoning=3,
        badge="Balanced",
    ),
    ModelInfo(
        id="gemini-3-flash-preview:cloud",
        name="Gemini 3 Flash",
        description="Fastest frontier intelligence. Great for rapid iteration.",
        speed=5,
        reasoning=3,
        badge="Fastest",
    ),
]

MODELS_BY_ID: dict[str, ModelInfo] = {m.id: m for m in MODELS}


def get_model(model_id: str) -> ModelInfo:
    if model_id not in MODELS_BY_ID:
        raise ValueError(f"Unknown model: {model_id}")
    return MODELS_BY_ID[model_id]
