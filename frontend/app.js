/* ── PromptForge app.js ──────────────────────────────────────────────────── */

// ── State ─────────────────────────────────────────────────────────────────────
let selectedModel = null;
let models = [];
let state = {
  original: '',
  initialScores: {},
  stages: [],   // { stage, improved_prompt, scores }
  best: null,
};

// ── DOM Refs ──────────────────────────────────────────────────────────────────
const promptInput     = document.getElementById('promptInput');
const forgeBtn        = document.getElementById('forgeBtn');
const charCount       = document.getElementById('charCount');
const inputSection    = document.getElementById('inputSection');
const pipelineSection = document.getElementById('pipelineSection');
const diagnosisCard   = document.getElementById('diagnosisCard');
const weaknessList    = document.getElementById('weaknessList');
const domainBadge     = document.getElementById('domainBadge');
const diagSummary     = document.getElementById('diagSummary');
const initialScoreGrid= document.getElementById('initialScoreGrid');
const stageCards      = document.getElementById('stageCards');
const forgeContext    = document.getElementById('forgeContext');
const bestCard        = document.getElementById('bestCard');
const bestPrompt      = document.getElementById('bestPrompt');
const synthesisNotes  = document.getElementById('synthesisNotes');
const scoreProgression= document.getElementById('scoreProgression');
const overallScore    = document.getElementById('overallScore');
const copyBtn         = document.getElementById('copyBtn');
const resetBtn        = document.getElementById('resetBtn');
const resetRow        = document.getElementById('resetRow');
const modelTrigger    = document.getElementById('modelTrigger');
const modelDropdown   = document.getElementById('modelDropdown');
const selectedModelName= document.getElementById('selectedModelName');

// ── Score Axes ────────────────────────────────────────────────────────────────
const SCORE_KEYS = ['specificity', 'role_clarity', 'context_depth', 'constraint_quality'];
const SCORE_LABELS = {
  specificity:        'Specificity',
  role_clarity:       'Role Clarity',
  context_depth:      'Context Depth',
  constraint_quality: 'Constraints',
};

// ── Model Selector ────────────────────────────────────────────────────────────
async function loadModels() {
  try {
    const res = await fetch('/api/models');
    models = await res.json();
    renderModelDropdown();
    selectModel(models[0]);
  } catch {
    selectedModelName.textContent = 'Error loading models';
  }
}

function renderModelDropdown() {
  modelDropdown.innerHTML = '';
  models.forEach(m => {
    const el = document.createElement('div');
    el.className = 'model-option';
    el.dataset.id = m.id;
    el.innerHTML = `
      <div class="mo-top">
        <span class="mo-name">${m.name}</span>
        <span class="mo-badge">${m.badge}</span>
      </div>
      <div class="mo-desc">${m.description}</div>
      <div class="mo-bars">
        <div class="mo-bar-row">
          <span class="mo-bar-label">Speed</span>
          <div class="pips">${pips(m.speed, 'speed')}</div>
        </div>
        <div class="mo-bar-row">
          <span class="mo-bar-label">Reasoning</span>
          <div class="pips">${pips(m.reasoning, 'reasoning')}</div>
        </div>
      </div>`;
    el.addEventListener('click', () => { selectModel(m); modelDropdown.classList.remove('open'); });
    modelDropdown.appendChild(el);
  });
}

function pips(score, type) {
  return Array.from({ length: 5 }, (_, i) =>
    `<div class="pip ${i < score ? `${type}-on` : ''}"></div>`
  ).join('');
}

function selectModel(m) {
  selectedModel = m;
  selectedModelName.textContent = m.name;
  document.querySelectorAll('.model-option').forEach(el =>
    el.classList.toggle('selected', el.dataset.id === m.id)
  );
}

modelTrigger.addEventListener('click', e => {
  e.stopPropagation();
  const open = modelDropdown.classList.toggle('open');
  modelTrigger.setAttribute('aria-expanded', open);
});
document.addEventListener('click', () => {
  modelDropdown.classList.remove('open');
  modelTrigger.setAttribute('aria-expanded', 'false');
});

// ── Char Counter ──────────────────────────────────────────────────────────────
promptInput.addEventListener('input', () => {
  const len = promptInput.value.length;
  charCount.textContent = `${len} / 4000`;
  charCount.style.color = len > 3800 ? 'var(--red)' : '';
});

// ── Utilities ─────────────────────────────────────────────────────────────────
function escHtml(str) {
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function scoreColor(v) {
  return v <= 3 ? 'sc-low' : v <= 6 ? 'sc-mid' : 'sc-high';
}
function scoreFill(v) {
  return v <= 3 ? 'fill-low' : v <= 6 ? 'fill-mid' : 'fill-high';
}

// ── Animated counter for score values ─────────────────────────────────────────
function animateCounter(el, target, duration = 600) {
  const start = performance.now();
  function step(now) {
    const pct = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - pct, 3);
    el.textContent = Math.round(eased * target) + '/10';
    if (pct < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ── Score Grid ────────────────────────────────────────────────────────────────
function renderScoreGrid(scores, container, animate = true) {
  container.innerHTML = '';
  SCORE_KEYS.forEach(key => {
    const val = scores[key] ?? 0;
    const pct = (val / 10) * 100;
    const fillClass = scoreFill(val);
    const valClass  = scoreColor(val);

    const item = document.createElement('div');
    item.className = 'score-item';
    item.innerHTML = `
      <div class="score-lbl">${SCORE_LABELS[key]}</div>
      <div class="score-track"><div class="score-fill ${fillClass}" style="width:0%"></div></div>
      <div class="score-val ${valClass}">0/10</div>`;

    container.appendChild(item);

    // Animate bar and counter after paint
    requestAnimationFrame(() => {
      const fill = item.querySelector('.score-fill');
      const valEl = item.querySelector('.score-val');
      fill.style.transition = 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
      fill.style.width = `${pct}%`;
      if (animate) animateCounter(valEl, val);
      else valEl.textContent = `${val}/10`;
    });
  });
}

// ── Diff ──────────────────────────────────────────────────────────────────────
function renderDiff(oldText, newText) {
  const dmp = new diff_match_patch();
  const diffs = dmp.diff_main(oldText, newText);
  dmp.diff_cleanupSemantic(diffs);
  return diffs.map(([op, data]) => {
    const esc = escHtml(data);
    if (op === 1)  return `<span class="diff-ins">${esc}</span>`;
    if (op === -1) return `<span class="diff-del">${esc}</span>`;
    return esc;
  }).join('');
}

// ── Diagnosis Render ──────────────────────────────────────────────────────────
function renderDiagnosis(data) {
  state.initialScores = data.initial_scores;

  domainBadge.textContent = `Domain: ${data.detected_domain}`;
  diagSummary.textContent = data.diagnosis_summary || '';

  weaknessList.innerHTML = data.weaknesses.map(w =>
    `<div class="weakness-item">${escHtml(w)}</div>`
  ).join('');

  renderScoreGrid(data.initial_scores, initialScoreGrid, true);
  diagnosisCard.style.display = 'block';
}

// ── Stage Cards ───────────────────────────────────────────────────────────────
const STAGE_META = {
  context:    { num: '02', chip: 'chip-context',    label: 'Context Enrichment' },
  role:       { num: '03', chip: 'chip-role',       label: 'Role Definition' },
  constraint: { num: '04', chip: 'chip-constraint', label: 'Constraint Addition' },
};

function createLoadingCard(stage, loadingLabel) {
  const meta = STAGE_META[stage] || { num: '--', chip: '', label: loadingLabel };
  const card = document.createElement('div');
  card.className = 'stage-card';
  card.id = `card-${stage}`;
  card.dataset.stage = stage;
  card.innerHTML = `
    <div class="sc-header">
      <div class="sc-left">
        <span class="sc-num">${meta.num}</span>
        <span class="stage-chip ${meta.chip}">${meta.label}</span>
      </div>
      <span class="sc-chevron">▾</span>
    </div>
    <div class="sc-loading">
      <div class="spinner"></div>
      <span class="loading-text">${loadingLabel}</span>
    </div>`;
  return card;
}

function populateStageCard(card, data) {
  const meta = STAGE_META[data.stage] || { num: '--', chip: '', label: data.stage_label };

  const prevPrompt = state.stages.length > 0
    ? state.stages[state.stages.length - 1].improved_prompt
    : state.original;

  const diffHtml = renderDiff(prevPrompt, data.improved_prompt);

  state.stages.push({
    stage: data.stage,
    improved_prompt: data.improved_prompt,
    scores: data.scores,
  });

  const changesHtml = (data.changes || []).map(c =>
    `<div class="change-item">${escHtml(c)}</div>`
  ).join('');

  card.innerHTML = `
    <div class="sc-header" onclick="toggleCard('${data.stage}')">
      <div class="sc-left">
        <span class="sc-num">${meta.num}</span>
        <span class="stage-chip ${meta.chip}">${data.stage_label}</span>
      </div>
      <span class="sc-chevron">▾</span>
    </div>
    <div class="sc-body">
      <div class="prompt-block">${diffHtml}</div>
      <div class="changes-title">Changes Made</div>
      <div class="changes-list">${changesHtml}</div>
      <div class="reasoning-box">${escHtml(data.reasoning || '')}</div>
      <div class="score-row" id="scores-${data.stage}"></div>
    </div>`;

  renderScoreGrid(data.scores, card.querySelector(`#scores-${data.stage}`), true);
}

window.toggleCard = function(stage) {
  document.getElementById(`card-${stage}`)?.classList.toggle('collapsed');
};

// ── Best Version ──────────────────────────────────────────────────────────────
function renderBestVersion(data) {
  state.best = data.best_prompt;
  bestPrompt.textContent = data.best_prompt;
  overallScore.textContent = `Score: ${data.overall_score}/10`;

  // Synthesis notes
  synthesisNotes.innerHTML = `<div class="synth-title">Synthesis Notes</div>` +
    (data.synthesis_notes || []).map(n => `<div class="synth-item">${escHtml(n)}</div>`).join('');

  renderProgression(data.final_scores);
  bestCard.style.display = 'block';
  resetRow.style.display = 'flex';
}

function renderProgression(finalScores) {
  const stageData = [
    { label: 'Weak',       scores: state.initialScores, fillClass: 'pf-diag' },
    { label: 'Context',    scores: state.stages.find(s => s.stage === 'context')?.scores    || {}, fillClass: 'pf-context' },
    { label: 'Role',       scores: state.stages.find(s => s.stage === 'role')?.scores       || {}, fillClass: 'pf-role' },
    { label: 'Constraint', scores: state.stages.find(s => s.stage === 'constraint')?.scores || {}, fillClass: 'pf-constraint' },
    { label: 'Best',       scores: finalScores, fillClass: 'pf-best' },
  ];

  scoreProgression.innerHTML = `<div class="prog-title">Score Progression Across Stages</div><div class="prog-axes" id="progAxes"></div>`;
  const progAxes = document.getElementById('progAxes');

  SCORE_KEYS.forEach(key => {
    const row = document.createElement('div');
    row.className = 'prog-axis';
    const stepsHtml = stageData.map((s, i) => {
      const val = s.scores[key] ?? 0;
      const pct = (val / 10) * 100;
      const arrow = i < stageData.length - 1 ? '<span class="prog-arrow">▶</span>' : '';
      return `
        <div class="prog-step">
          <div class="prog-bar"><div class="prog-fill ${s.fillClass}" style="width:0%" data-pct="${pct}"></div></div>
          <div class="prog-val" data-target="${val}">0</div>
        </div>${arrow}`;
    }).join('');

    row.innerHTML = `<div class="prog-axis-name">${SCORE_LABELS[key]}</div><div class="prog-steps">${stepsHtml}</div>`;
    progAxes.appendChild(row);
  });

  // Animate all bars after paint
  requestAnimationFrame(() => {
    progAxes.querySelectorAll('.prog-fill').forEach(el => {
      el.style.transition = 'width 0.9s cubic-bezier(0.4, 0, 0.2, 1)';
      el.style.width = `${el.dataset.pct}%`;
    });
    progAxes.querySelectorAll('.prog-val').forEach(el => {
      animateCounter(el, parseInt(el.dataset.target), 700);
    });
  });
}

// ── Copy Button ───────────────────────────────────────────────────────────────
copyBtn.addEventListener('click', () => {
  if (!state.best) return;
  navigator.clipboard.writeText(state.best).then(() => {
    copyBtn.classList.add('copied');
    copyBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied`;
    setTimeout(() => {
      copyBtn.classList.remove('copied');
      copyBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;
    }, 2000);
  });
});

// ── Reset ─────────────────────────────────────────────────────────────────────
resetBtn.addEventListener('click', () => {
  pipelineSection.style.display = 'none';
  inputSection.style.display = 'block';
  promptInput.value = '';
  charCount.textContent = '0 / 4000';

  // Reset state
  state = { original: '', initialScores: {}, stages: [], best: null };
  stageCards.innerHTML = '';
  synthesisNotes.innerHTML = '';
  scoreProgression.innerHTML = '';
  weaknessList.innerHTML = '';
  diagSummary.textContent = '';
  diagnosisCard.style.display = 'none';
  bestCard.style.display = 'none';
  resetRow.style.display = 'none';
  forgeBtn.disabled = false;
  promptInput.focus();
});

// ── SSE Consumer ──────────────────────────────────────────────────────────────
async function runPipeline(prompt, modelId) {
  state.original = prompt;

  inputSection.style.display = 'none';
  pipelineSection.style.display = 'flex';
  forgeContext.innerHTML = `Forging: <strong>${escHtml(prompt.length > 80 ? prompt.slice(0, 80) + '…' : prompt)}</strong> &nbsp;·&nbsp; ${selectedModel.name}`;

  try {
    const res = await fetch('/api/refine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model: modelId }),
    });

    if (!res.ok) {
      const err = await res.json();
      const detail = Array.isArray(err.detail)
        ? err.detail.map(d => d.msg || JSON.stringify(d)).join('; ')
        : (err.detail || 'Request failed.');
      showError(detail);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let completed = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (!raw) continue;
        try {
          const event = JSON.parse(raw);
          if (event.type === 'complete') completed = true;
          handleEvent(event);
        } catch (e) {
          console.error('SSE parse error:', raw, e);
        }
      }
    }

    if (!completed) {
      showError('Pipeline did not complete — the connection was interrupted. Check your API key and model availability, then try again.');
    }

  } catch (e) {
    showError(`Connection error: ${e.message}`);
  } finally {
    forgeBtn.disabled = false;
  }
}

function handleEvent(event) {
  switch (event.type) {
    case 'pipeline_start': break;

    case 'diagnosis':
      renderDiagnosis(event);
      break;

    case 'stage_start': {
      const card = createLoadingCard(event.stage, event.label);
      stageCards.appendChild(card);
      break;
    }

    case 'stage_result': {
      const card = document.getElementById(`card-${event.stage}`);
      if (card) populateStageCard(card, event);
      break;
    }

    case 'complete':
      renderBestVersion(event);
      break;

    case 'error':
      showError(event.message);
      break;
  }
}

function showError(msg) {
  inputSection.style.display = 'none';
  pipelineSection.style.display = 'flex';
  const el = document.createElement('div');
  el.className = 'error-block';
  el.textContent = `Error: ${msg}`;
  stageCards.innerHTML = ''; // Clear previous cards if any
  stageCards.appendChild(el);
  resetRow.style.display = 'flex'; // Allow resetting from error state
  forgeBtn.disabled = false;
}

// ── Forge Button ──────────────────────────────────────────────────────────────
forgeBtn.addEventListener('click', () => {
  const prompt = promptInput.value.trim();
  if (!prompt) { 
    showError('Please enter a prompt.');
    promptInput.focus(); 
    return; 
  }
  if (prompt.length > 4000) {
    showError('Prompt exceeds 4000 character limit.');
    return;
  }
  if (!selectedModel) return;
  forgeBtn.disabled = true;
  runPipeline(prompt, selectedModel.id);
});

promptInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) forgeBtn.click();
});

// ── Init ──────────────────────────────────────────────────────────────────────
loadModels();
promptInput.focus();
