# PromptForge

**Weak Prompt In. Precision Out.**

PromptForge is a sophisticated prompt engineering pipeline designed to transform simple, underspecified prompts into high-performance "precision prompts." It uses a structured 4-stage refinement process—Context Enrichment, Role Definition, Constraint Addition, and Final Synthesis—to ensure your LLM interactions are reliable, specific, and production-ready.

---

## 🚀 Key Features

- **Multi-Stage Pipeline:** Progressively improves prompts with specialized LLM calls at each step.
- **Live Scoring:** Visualizes prompt quality across four axes: Specificity, Role Clarity, Context Depth, and Constraints.
- **Curated Model Catalog:** Supports high-performance cloud models including DeepSeek, Kimi, and Gemini.
- **SSE Streaming:** Real-time updates as the pipeline processes your prompt.
- **Modern UI:** Responsive dashboard with diff highlights to show exactly what was added at each stage.

---

## 📂 Project Structure

```text
PromptForge/
├── backend/
│   ├── main.py                # FastAPI server & SSE logic
│   ├── config.py              # Configuration & Environment loading
│   ├── models_catalog.py      # Curated model list & metadata
│   └── pipeline/
│       ├── stages.py          # Core pipeline stage functions
│       ├── client.py          # Ollama Cloud API wrapper
│       └── prompts.py         # Specialized system prompts
├── frontend/
│   ├── index.html             # Single-page application UI
│   ├── style.css              # Custom design system
│   └── app.js                 # SSE consumer & UI orchestration
├── .env.example               # Template for your credentials
├── requirements.txt           # Python dependencies
└── run.py                     # Project entry point
```

---

## 🛠️ Getting Started

### 1. Prerequisites
- **Python 3.10+**
- **Ollama Cloud API Key:** Get your key from [Ollama.com](https://ollama.com)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/rahul2006malik/PromptForge.git
cd PromptForge

# Install dependencies
pip install -r requirements.txt
```

### 3. Configuration
Copy the example environment file and add your API key:
```bash
cp .env.example .env
```
Edit `.env`:
```env
OLLAMA_API_KEY=your_actual_key_here
OLLAMA_HOST=https://ollama.com
```

### 4. Running the Server
```bash
python run.py
```
Visit **[http://localhost:8000](http://localhost:8000)** in your browser.

---

## 🧪 Testing the Setup

Follow these steps to ensure everything is running correctly:

1.  **Health Check:** Visit `http://localhost:8000/health`. You should see `{"status": "ok"}`.
2.  **Models API:** Visit `http://localhost:8000/api/models`. You should see a list of available models.
3.  **End-to-End Test:** 
    - Enter a weak prompt like `write code`.
    - Select a model (e.g., Gemini 3 Flash).
    - Click **Forge Prompt** and watch the 5-stage progression complete.

---

## 📝 API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/` | `GET` | Serves the frontend application |
| `/api/models` | `GET` | Returns the curated model list |
| `/api/refine` | `POST` | Starts the refinement pipeline (SSE Stream) |
| `/health` | `GET` | Server health check |

---

## 🤝 Contributing
For internal development, please ensure you check the local `BUGS_AND_IMPROVEMENTS_REPORT.md` before starting new features.

---
**Note:** Do not commit your `.env` file. It is ignored by Git to protect your API keys.
