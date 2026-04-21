# PromptForge — Setup, Run & Test Guide

---

## 1. Final File Structure

Save everything exactly as shown. The folder name is `promptforge/`.

```
promptforge/
│
├── run.py                          ← Entry point (just run this)
├── requirements.txt                ← Python dependencies
├── .env                            ← YOU CREATE THIS (see Step 2)
├── .env.example                    ← Template for .env
├── README.md
│
├── backend/
│   ├── __init__.py                 ← Empty, required by Python
│   ├── main.py                     ← FastAPI app + SSE routes
│   ├── config.py                   ← Loads OLLAMA_API_KEY from .env
│   ├── models_catalog.py           ← 6 curated Ollama Cloud models
│   │
│   └── pipeline/
│       ├── __init__.py             ← Empty, required by Python
│       ├── client.py               ← Ollama Cloud API wrapper
│       ├── prompts.py              ← System prompts for all 5 stages
│       └── stages.py               ← Pipeline stage functions
│
└── frontend/
    ├── index.html                  ← Single-page UI
    ├── style.css                   ← All styles
    └── app.js                      ← SSE consumer + UI logic
```

**Critical:** Do not rename any file or move any file to a different folder.
Python imports are path-sensitive (`from backend.pipeline.client import ...`).

---

## 2. First-Time Setup

### Step 1 — Prerequisites

Make sure you have:
- Python 3.10 or higher  (`python --version`)
- pip                    (`pip --version`)
- An Ollama Cloud API key (from https://ollama.com)

### Step 2 — Create your .env file

In the `promptforge/` root folder, create a file named exactly `.env`:

```
OLLAMA_API_KEY=your_actual_key_here
```

No quotes around the key. No spaces around the `=`.

### Step 3 — Install dependencies

Open a terminal inside the `promptforge/` folder and run:

```bash
pip install -r requirements.txt
```

This installs: fastapi, uvicorn, ollama, python-dotenv, pydantic.

---

## 3. Running the App

From inside the `promptforge/` folder:

```bash
python run.py
```

Then open your browser at:

```
http://localhost:8000
```

You should see the PromptForge UI immediately.

**Alternative command (same result):**
```bash
uvicorn backend.main:app --reload --port 8000
```

**To stop the server:** Press `Ctrl + C` in the terminal.

---

## 4. Tests to Perform

Run these in order. Each one validates a specific part of the system.

---

### TEST 1 — Health Check (30 seconds)
**What it checks:** Server is running and reachable.

Open your browser and go to:
```
http://localhost:8000/health
```

**Expected response:**
```json
{"status": "ok"}
```

✅ Pass: You see `{"status": "ok"}`
❌ Fail: Check that `python run.py` is still running in your terminal.

---

### TEST 2 — Models API (1 minute)
**What it checks:** Model catalog loads correctly, metadata is correct.

Go to:
```
http://localhost:8000/api/models
```

**Expected response:** A JSON array with 6 models. Verify:
- All 6 models are present
- Each has: `id`, `name`, `description`, `speed`, `reasoning`, `badge`
- Speed and reasoning values are integers between 1–5

✅ Pass: 6 models with complete data
❌ Fail: Empty array or server error → check `models_catalog.py` is saved correctly.

---

### TEST 3 — UI Loads Correctly (2 minutes)
**What it checks:** Frontend renders, model selector works, fonts load.

Go to `http://localhost:8000` and verify:

- [ ] Big title "Weak Prompt. Precision Out." is visible
- [ ] Model selector in the top-right shows a model name (not "Loading…")
- [ ] Clicking the model selector opens a dropdown with 6 models
- [ ] Each model shows speed/reasoning pip bars
- [ ] Textarea has an amber underline animation when you click into it
- [ ] Forge button has a shadow offset style

✅ Pass: All 6 items above are visible and interactive
❌ Fail: Check browser console (F12) for 404 errors on CSS/JS files.

---

### TEST 4 — End-to-End Pipeline with Simple Prompt (5–10 minutes)
**What it checks:** Full pipeline runs, all 5 stages complete, SSE streaming works.

**Input prompt to use:**
```
write code
```
(Use this exact weak prompt — it scores 0 on almost every axis, which makes the improvement dramatic and easy to verify.)

**Model to select:** Qwen3-Next 80B (fastest balanced option for testing)

**Steps:**
1. Type the prompt, click Forge Prompt
2. Watch the pipeline appear stage by stage

**At each stage, verify:**

| Stage | Check |
|---|---|
| Diagnosis | Shows at least 3 weaknesses. Initial scores are all low (0–3). Domain is detected (e.g. "software engineering"). |
| Context (Stage 02) | Prompt block appears with green diff highlights. Changes list has at least 2 items. Scores increased from diagnosis. |
| Role (Stage 03) | A specific expert persona was added (not generic "you are an expert"). Score for role_clarity visibly higher. |
| Constraint (Stage 04) | Output format or length guidance was added. constraint_quality score is now 7+. |
| Best Version | Final prompt appears in the amber-bordered card. Synthesis notes explain what was kept from each stage. Score progression chart shows all 5 stages. |

**After completion:**
- [ ] Click the Copy button — verify it says "Copied" briefly then resets
- [ ] Click "Forge another prompt" — verify UI resets cleanly to the input screen

✅ Pass: All 5 stages complete, diff highlights appear, scores increase across stages
❌ Fail: See Troubleshooting below.

---

### TEST 5 — End-to-End with Complex Prompt (5–10 minutes)
**What it checks:** Pipeline handles non-trivial input without hallucinating or breaking.

**Input prompt to use:**
```
analyze customer churn
```

**Expected behavior:**
- Domain should be detected as "data analysis" or "business analytics"
- Role stage should produce something like "Senior Data Scientist" or "Customer Analytics Lead"
- Constraints should include output format (e.g. report structure, metrics to include)
- Best Version should be meaningfully different from just concatenating the stages

✅ Pass: Final prompt is coherent, reads naturally, and you could actually use it.
❌ Fail: If the model returns malformed JSON, you'll see an error card. This usually means the model timed out or returned a reasoning block. Try switching to MiniMax M2.7 (most reliable structured output).

---

### TEST 6 — Input Validation (2 minutes)
**What it checks:** The API correctly rejects bad input.

**Test 6a — Empty prompt:**
- Click Forge Prompt with an empty textarea
- Expected: Button does nothing (focus returns to textarea), no request sent

**Test 6b — Invalid model via API (curl or Postman):**
```bash
curl -X POST http://localhost:8000/api/refine \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test", "model": "fake-model:cloud"}'
```
Expected response:
```json
{"detail": [{"msg": "...Unknown model id..."}]}
```

**Test 6c — Prompt over 4000 characters:**
Paste 4001+ characters into the textarea. The counter turns red. Submit it.
Expected: API returns a validation error, UI shows an error card.

✅ Pass: All three cases are handled gracefully (no server crash, no blank screen)
❌ Fail: Server returns 500 → check pydantic validators in `main.py`.

---

### TEST 7 — Model Switching (3 minutes)
**What it checks:** Different models produce valid output.

Run the pipeline twice with the same prompt (`analyze customer churn`):
- First run: DeepSeek V3.1
- Second run: Gemini 3 Flash

**Verify:**
- Both complete successfully
- Gemini 3 Flash should noticeably complete faster
- Both produce valid JSON (no error cards)

✅ Pass: Both runs complete, output quality is sensible
❌ Fail: One model fails but not the other → that model may be down or rate-limited on Ollama Cloud.

---

## 5. Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| `OLLAMA_API_KEY` warning on startup | `.env` file missing or key not set | Create `.env` with your key |
| `ModuleNotFoundError: backend` | Running from wrong directory | `cd` into `promptforge/` before running |
| Error card: "Model returned non-JSON" | Model emitted reasoning block or timed out | Switch to MiniMax M2.7 in the selector |
| Error card: "Connection was interrupted" | Ollama Cloud timeout on large model | Try Qwen3-Next 80B or Gemini 3 Flash |
| UI shows "Loading…" forever in model selector | `/api/models` failed | Open browser console (F12), check for errors |
| Port 8000 already in use | Another process on port 8000 | `uvicorn backend.main:app --port 8001` then go to `localhost:8001` |
| CSS/JS not loading | Frontend files in wrong folder | Verify `frontend/` is inside `promptforge/`, not inside `backend/` |

---

## 6. Quick Reference

```bash
# Start
cd promptforge
python run.py

# App URL
http://localhost:8000

# Health check
http://localhost:8000/health

# Models list
http://localhost:8000/api/models

# Stop
Ctrl + C
```
