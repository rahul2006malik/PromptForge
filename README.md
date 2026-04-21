# PromptForge

A prompt engineering pipeline that transforms weak prompts into precision prompts through four structured stages: context enrichment, role definition, constraint addition, and final synthesis.

## Setup

### 1. Clone and install dependencies

```bash
cd promptforge
pip install -r requirements.txt
```

### 2. Configure your API key

```bash
cp .env.example .env
# Edit .env and add your Ollama API key
```

```
OLLAMA_API_KEY=your_key_here
```

### 3. Run the server

```bash
uvicorn backend.main:app --reload --port 8000
```

Then open [http://localhost:8000](http://localhost:8000) in your browser.

---

## Project Structure

```
promptforge/
├── backend/
│   ├── main.py                # FastAPI app — routes, SSE streaming
│   ├── models_catalog.py      # Curated Ollama Cloud model list
│   ├── config.py              # Environment config
│   └── pipeline/
│       ├── stages.py          # One function per pipeline stage
│       ├── prompts.py         # System prompts for each stage
│       └── client.py          # Ollama Cloud API wrapper
├── frontend/
│   ├── index.html             # Single-page UI
│   ├── style.css              # Styling
│   └── app.js                 # SSE consumer, diff rendering, UI logic
├── .env.example
└── requirements.txt
```

---

## Pipeline

```
Weak Prompt
    │
    ▼  Diagnosis       — scores 4 axes, identifies weaknesses
    ▼  Context Stage   — adds domain framing and background
    ▼  Role Stage      — assigns expert persona
    ▼  Constraint Stage— adds output format and quality guardrails
    ▼
Best Version           — synthesis of all stages, not just the last one
```

Each stage returns structured JSON: improved prompt, list of changes made, reasoning, and updated scores on four axes (specificity, role clarity, context depth, constraint quality).

Scores are visualized as a live progression chart in the UI.

---

## API

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Serves the frontend |
| `/api/models` | GET | Returns curated model list with metadata |
| `/api/refine` | POST | Runs the pipeline, returns SSE stream |
| `/health` | GET | Health check |

### POST /api/refine

```json
{
  "prompt": "your weak prompt here",
  "model": "deepseek-v3.1:671b-cloud"
}
```

Returns a Server-Sent Events stream with event types:
- `pipeline_start`
- `diagnosis`
- `stage_start`
- `stage_result`
- `complete`
- `error`

---

## Models

| Model | Tag | Best For |
|---|---|---|
| DeepSeek V3.1 | `deepseek-v3.1:671b-cloud` | Best overall reasoning |
| Kimi K2 Thinking | `kimi-k2-thinking:cloud` | Deep step-by-step |
| GLM-5 | `glm-5:cloud` | Long-horizon tasks |
| MiniMax M2.7 | `minimax-m2.7:cloud` | Structured output |
| Qwen3-Next 80B | `qwen3-next:80b-cloud` | Balanced speed |
| Gemini 3 Flash | `gemini-3-flash-preview:cloud` | Fastest |
