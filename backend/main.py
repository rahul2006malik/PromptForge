import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, field_validator

from backend.models_catalog import MODELS, get_model
from backend.pipeline import stages

app = FastAPI(title="PromptForge API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static frontend ────────────────────────────────────────────────────────────
FRONTEND_DIR = Path(__file__).parent.parent / "frontend"
app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")


@app.get("/")
async def serve_frontend():
    return FileResponse(str(FRONTEND_DIR / "index.html"))


# ── Models endpoint ────────────────────────────────────────────────────────────
@app.get("/api/models")
async def list_models():
    return [
        {
            "id": m.id,
            "name": m.name,
            "description": m.description,
            "speed": m.speed,
            "reasoning": m.reasoning,
            "badge": m.badge,
        }
        for m in MODELS
    ]


# ── Refine endpoint ────────────────────────────────────────────────────────────
class RefineRequest(BaseModel):
    prompt: str
    model: str

    @field_validator("prompt")
    @classmethod
    def prompt_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Prompt cannot be empty.")
        if len(v) > 4000:
            raise ValueError("Prompt exceeds 4000 character limit.")
        return v

    @field_validator("model")
    @classmethod
    def model_must_exist(cls, v: str) -> str:
        try:
            get_model(v)
        except ValueError:
            raise ValueError(f"Unknown model id: {v}")
        return v


def _sse(event_type: str, data: dict) -> str:
    """Format a Server-Sent Event."""
    payload = json.dumps({"type": event_type, **data})
    return f"data: {payload}\n\n"


def _sse_error(message: str) -> str:
    return _sse("error", {"message": message})


async def pipeline_stream(prompt: str, model: str):
    """
    Generator that runs the full pipeline and yields SSE events.

    Event types emitted:
      pipeline_start   — signals pipeline has begun
      diagnosis        — diagnosis results
      stage_start      — signals a stage is beginning (shows spinner)
      stage_result     — full stage output
      complete         — pipeline finished, includes best version
      error            — any stage failed
    """
    try:
        yield _sse("pipeline_start", {"model": model, "prompt": prompt})

        # ── Diagnosis ──────────────────────────────────────────────────────────
        yield _sse("stage_start", {"stage": "diagnosis", "label": "Diagnosing prompt..."})
        diagnosis = stages.run_diagnosis(prompt, model)
        yield _sse("diagnosis", diagnosis)

        # ── Stage 1: Context ───────────────────────────────────────────────────
        yield _sse("stage_start", {"stage": "context", "label": "Enriching with context..."})
        context_result = stages.run_context_stage(prompt, diagnosis, model)
        yield _sse("stage_result", context_result)

        # ── Stage 2: Role ──────────────────────────────────────────────────────
        yield _sse("stage_start", {"stage": "role", "label": "Defining expert role..."})
        role_result = stages.run_role_stage(context_result, diagnosis, model)
        yield _sse("stage_result", role_result)

        # ── Stage 3: Constraints ───────────────────────────────────────────────
        yield _sse("stage_start", {"stage": "constraint", "label": "Adding constraints..."})
        constraint_result = stages.run_constraint_stage(role_result, diagnosis, model)
        yield _sse("stage_result", constraint_result)

        # ── Stage 4: Best Version ──────────────────────────────────────────────
        yield _sse("stage_start", {"stage": "best", "label": "Synthesizing best version..."})
        best_result = stages.run_best_version_stage(
            original_prompt=prompt,
            context_result=context_result,
            role_result=role_result,
            constraint_result=constraint_result,
            diagnosis=diagnosis,
            model=model,
        )
        yield _sse("complete", best_result)

    except ValueError as e:
        yield _sse_error(str(e))
    except Exception as e:
        yield _sse_error(f"Pipeline error: {str(e)}")


@app.post("/api/refine")
async def refine_prompt(body: RefineRequest):
    return StreamingResponse(
        pipeline_stream(body.prompt, body.model),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── Health ─────────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok"}
