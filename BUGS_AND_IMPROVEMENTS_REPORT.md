# Bugs and Improvements Report - PromptForge

## 1. Bugs Found and Fixed
- **Critical: Incorrect Project Structure:** All source files were located in the root directory, causing `ModuleNotFoundError` for internal imports (e.g., `from backend.pipeline import ...`) and `404 Not Found` for static frontend assets.
  - *Fix:* Reorganized into `backend/`, `backend/pipeline/`, and `frontend/` directories as per the documentation.
- **Missing Package Initialization:** `backend/pipeline/` lacked an `__init__.py` file, which is necessary for it to be treated as a Python package.
  - *Fix:* Created the missing `__init__.py`.
- **Hardcoded API Host:** `OLLAMA_HOST` was hardcoded in the source code, preventing users from pointing the pipeline to a local or custom Ollama instance.
  - *Fix:* Updated `config.py` and `.env` to make `OLLAMA_HOST` configurable.
- **UI Validation Bypass:** The frontend allowed clicking the "Forge" button even with empty or excessively long prompts, relying solely on the backend for validation.
  - *Fix:* Added client-side validation in `app.js` to block empty or >4000 char prompts and show an error message immediately.
- **Robust Error Display:** Errors in `app.js` were appended to a hidden section if the pipeline hadn't started yet.
  - *Fix:* Updated `showError` to ensure the pipeline section is shown and the error is clearly visible.

## 2. Potential Improvements
- **Dockerization:** Add a `Dockerfile` and `docker-compose.yml` to simplify deployment and ensure environmental consistency across different machines.
- **Dynamic Model Catalog:** Instead of a hardcoded list in `models_catalog.py`, the app could query the Ollama API's `GET /api/tags` endpoint and then augment the results with curated metadata.
- **Persistent History:** Currently, all data is lost on page refresh. Adding local storage or a lightweight database (like SQLite) to save previous "Forged" prompts would be a major UX win.
- **Retry Logic:** Add a "Retry" button to individual stages that fail due to timeouts or temporary API unavailability, rather than requiring a full restart of the pipeline.
- **Enhanced Progress UI:** Add a "Time Elapsed" counter for each stage so users can see how long different models take for different tasks.
- **Markdown Rendering in Changes:** The "Changes Made" list is currently plain text. Supporting markdown would allow for better formatting (bolding, code snippets) in the reasoning and changes sections.
- **Theme Support:** Add a Dark Mode toggle (the current theme is already quite "warm" and professional, but a true dark mode would be beneficial).
