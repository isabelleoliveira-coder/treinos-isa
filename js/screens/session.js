import { icon } from '../icons.js';
import { extractYouTubeId, fmtTime, bestSetLoad, escapeHtml } from '../utils.js';

function currentExercise(state) {
  const workout = state.workouts.find((w) => w.id === state.activeSession.workoutId);
  return { workout, ex: workout.exercises[state.activeSession.exIdx] };
}

export function renderActiveSession(state, helpers) {
  const s = state.activeSession;
  const { workout, ex } = currentExercise(state);

  if (s.phase === 'summary') return renderSummary(state, workout, helpers);
  if (s.phase === 'rest') return renderRest(state, workout, ex);
  return renderExercisePhase(state, workout, ex, helpers);
}

function renderExercisePhase(state, workout, ex, helpers) {
  const s = state.activeSession;
  const doneCount = (s.loggedSets[ex.id] || []).length;
  const activeIdx = s.editingIdx != null ? s.editingIdx : doneCount;
  const isEditingPast = s.editingIdx != null;
  const isLastExercise = s.exIdx === workout.exercises.length - 1;
  const ytId = extractYouTubeId(ex.videoUrl);
  const lastVal = helpers.getLastSetValue(ex.id, activeIdx);
  const loggedForEx = s.loggedSets[ex.id] || [];

  return `
    <div style="background:var(--bg);min-height:100vh;color:var(--text);max-width:480px;margin:0 auto;display:flex;flex-direction:column">
      <div style="padding:16px 20px 10px">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <button class="btn-icon" data-sact="open-exit">${icon('x', 20)}</button>
          <div style="font-size:12px;color:var(--muted);font-weight:600">${escapeHtml(workout.name)} · Exercício ${s.exIdx + 1} de ${workout.exercises.length}</div>
          <div style="width:31px"></div>
        </div>
        <div class="progress-bar-row">
          ${workout.exercises.map((_, i) => `<div class="progress-seg ${i < s.exIdx ? 'done' : i === s.exIdx ? 'current' : ''}"></div>`).join('')}
        </div>
      </div>

      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:10px 24px">
        <div style="text-align:center;margin-bottom:6px">
          <h1 class="font-head" style="font-size:25px;margin:0;text-transform:uppercase;letter-spacing:0.3px">${escapeHtml(ex.name)}</h1>
          <div style="color:var(--accent);font-weight:700;font-size:15px;margin-top:4px">
            ${isEditingPast ? `Editando série ${activeIdx + 1}` : `Série ${activeIdx + 1} de ${ex.setsCount}`}
          </div>
          <div style="color:var(--muted);font-size:12.5px;margin-top:2px">Meta: ${escapeHtml(ex.repsTarget)}</div>
          ${ex.note ? `<div style="color:var(--faint);font-size:11.5px;margin-top:3px;font-style:italic">${escapeHtml(ex.note)}</div>` : ''}
          ${lastVal
            ? `<div style="color:var(--faint);font-size:11.5px;margin-top:4px">Última vez: ${lastVal.carga}kg × ${lastVal.reps || '—'}</div>`
            : `<div style="color:var(--faint);font-size:11.5px;margin-top:4px">Primeira vez nesse exercício</div>`}

          ${ytId ? `
            <button class="btn-pill ${s.videoOpen ? 'active' : ''}" data-sact="toggle-video" style="margin-top:12px">${icon('play', 13, `style="fill:currentColor"`)} Como executar</button>` : ''}
          ${s.videoOpen && ytId ? `
            <div style="margin-top:12px;border-radius:14px;overflow:hidden;aspect-ratio:16/9">
              <iframe width="100%" height="100%" src="https://www.youtube.com/embed/${ytId}" title="${escapeHtml(ex.name)}" style="border:none;display:block" allowfullscreen></iframe>
            </div>` : ''}
        </div>

        <div style="display:flex;gap:12px;margin-top:22px">
          <div class="stepper-wrap">
            <div class="stepper-label">Carga (kg)</div>
            <div class="stepper-row">
              <button class="stepper-btn" data-sact="adjust" data-field="carga" data-dir="-1">${icon('minus', 16)}</button>
              <input type="number" inputmode="decimal" class="stepper-input" id="input-carga" value="${s.carga}" />
              <button class="stepper-btn" data-sact="adjust" data-field="carga" data-dir="1">${icon('plus', 16)}</button>
            </div>
          </div>
          <div class="stepper-wrap">
            <div class="stepper-label">Repetições</div>
            <div class="stepper-row">
              <button class="stepper-btn" data-sact="adjust" data-field="reps" data-dir="-1">${icon('minus', 16)}</button>
              <input type="number" inputmode="decimal" class="stepper-input" id="input-reps" value="${s.reps}" />
              <button class="stepper-btn" data-sact="adjust" data-field="reps" data-dir="1">${icon('plus', 16)}</button>
            </div>
          </div>
        </div>

        ${doneCount > 0 ? `
          <div style="display:flex;gap:6px;justify-content:center;margin-top:20px;flex-wrap:wrap">
            ${loggedForEx.map((set, i) => `
              <button class="set-chip ${s.editingIdx === i ? 'active' : ''}" data-sact="edit-set" data-idx="${i}">${i + 1}: ${set.carga}kg×${set.reps || '?'}</button>
            `).join('')}
          </div>` : ''}
      </div>

      <div style="padding:10px 24px 28px">
        <button class="btn-primary" data-sact="confirm-set" ${s.carga === '' ? 'disabled style="opacity:0.5"' : ''}>${icon('check', 19)} ${isEditingPast ? `Salvar série ${activeIdx + 1}` : 'Concluir série'}</button>
        ${isEditingPast ? `<button data-sact="cancel-edit" style="background:none;border:none;color:var(--muted);font-size:12.5px;font-weight:600;padding:10px 0 0;width:100%">Cancelar edição</button>` : ''}
      </div>

      ${s.confirmExit ? renderExitSheet() : ''}
    </div>
  `;
}

function renderRest(state, workout, ex) {
  const s = state.activeSession;
  const pct = s.restTotal ? ((s.restTotal - s.restRemaining) / s.restTotal) * 100 : 100;
  const doneCount = (s.loggedSets[ex.id] || []).length;
  const nextIsNewExercise = doneCount >= ex.setsCount;
  const isLastExercise = s.exIdx === workout.exercises.length - 1;
  const nextLabel = nextIsNewExercise
    ? (isLastExercise ? 'Finalizar treino' : `Próximo: ${workout.exercises[s.exIdx + 1]?.name}`)
    : 'Próxima série';
  const circumference = 2 * Math.PI * 98;

  return `
    <div style="background:var(--bg);min-height:100vh;color:var(--text);max-width:480px;margin:0 auto;display:flex;flex-direction:column">
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px">
        <div style="font-size:12px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:18px">Descanso</div>
        <div style="position:relative;width:220px;height:220px;display:flex;align-items:center;justify-content:center">
          <svg class="rest-ring" width="220" height="220" style="position:absolute;transform:rotate(-90deg)">
            <circle cx="110" cy="110" r="98" fill="none" stroke="var(--border)" stroke-width="10"/>
            <circle cx="110" cy="110" r="98" fill="none" stroke="${s.restReady ? 'var(--accent)' : 'var(--accent-dim)'}" stroke-width="10"
              stroke-dasharray="${circumference}" stroke-dashoffset="${circumference * (1 - pct / 100)}" stroke-linecap="round"/>
          </svg>
          <div class="font-head" style="font-size:52px;color:${s.restReady ? 'var(--accent)' : 'var(--text)'}">${fmtTime(s.restRemaining)}</div>
        </div>
        <div style="display:flex;gap:10px;margin-top:26px">
          <button class="btn-ghost" data-sact="rest-adjust" data-dir="-1" style="width:auto;padding:10px 16px;display:flex;align-items:center;gap:4px">${icon('minus', 14)} 15s</button>
          <button class="btn-ghost" data-sact="rest-pause" style="width:auto;padding:10px 16px;display:flex;align-items:center;gap:6px">${icon(s.restPaused ? 'play' : 'pause', 14)} ${s.restPaused ? 'Retomar' : 'Pausar'}</button>
          <button class="btn-ghost" data-sact="rest-adjust" data-dir="1" style="width:auto;padding:10px 16px;display:flex;align-items:center;gap:4px">${icon('plus', 14)} 15s</button>
        </div>
      </div>
      <div style="padding:0 24px 28px;display:flex;flex-direction:column;gap:10px">
        <button class="btn-primary" data-sact="continue-after-rest" style="opacity:${s.restReady ? 1 : 0.55}">${s.restReady ? icon('check', 18) : ''} ${escapeHtml(nextLabel)}</button>
        ${!s.restReady ? `<button data-sact="continue-after-rest" style="background:none;border:none;color:var(--muted);font-size:12.5px;font-weight:600;padding:4px">Pular descanso</button>` : ''}
      </div>
    </div>
  `;
}

function renderSummary(state, workout, helpers) {
  const s = state.activeSession;
  const prs = workout.exercises.filter((e) => {
    const arr = s.loggedSets[e.id];
    if (!arr) return false;
    const now = bestSetLoad(arr);
    const before = helpers.bestEverLoad(e.id);
    return now != null && (before == null || now > before);
  });
  const totalSets = Object.values(s.loggedSets).reduce((sum, arr) => sum + arr.length, 0);
  const totalVolume = Object.values(s.loggedSets).reduce((sum, arr) => sum + arr.reduce((a, set) => a + (parseFloat(set.carga) || 0) * (parseFloat(set.reps) || 0), 0), 0);
  const durationMin = Math.round((Date.now() - new Date(s.startedAt).getTime()) / 60000);

  return `
    <div style="background:var(--bg);min-height:100vh;color:var(--text);max-width:480px;margin:0 auto;display:flex;flex-direction:column">
      <div style="flex:1;padding:48px 24px 24px;text-align:center">
        <div style="width:72px;height:72px;border-radius:50%;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;margin:0 auto 18px;color:var(--accent)">${icon('check', 34)}</div>
        <h1 class="font-head" style="font-size:26px;margin:0 0 4px">Treino concluído</h1>
        <div style="color:var(--muted);font-size:13.5px">${escapeHtml(workout.name)} · ${escapeHtml(workout.focus)}</div>
        <div style="display:flex;gap:10px;margin-top:24px">
          <div class="card card-raised" style="flex:1;text-align:center;padding:14px 6px"><div class="font-head" style="font-size:19px;color:var(--accent)">${totalSets}</div><div style="font-size:10.5px;color:var(--muted);margin-top:2px">Séries</div></div>
          <div class="card card-raised" style="flex:1;text-align:center;padding:14px 6px"><div class="font-head" style="font-size:19px;color:var(--accent)">${Math.round(totalVolume)}kg</div><div style="font-size:10.5px;color:var(--muted);margin-top:2px">Volume</div></div>
          <div class="card card-raised" style="flex:1;text-align:center;padding:14px 6px"><div class="font-head" style="font-size:19px;color:var(--accent)">${durationMin}min</div><div style="font-size:10.5px;color:var(--muted);margin-top:2px">Duração</div></div>
        </div>
        ${prs.length > 0 ? `
          <div style="margin-top:22px;text-align:left">
            <div style="font-size:12px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;display:flex;align-items:center;gap:6px">${icon('trophy', 14)} Novos recordes</div>
            ${prs.map((e) => `<div class="card card-raised" style="padding:10px 14px;margin-bottom:8px;font-size:13.5px">${escapeHtml(e.name)}</div>`).join('')}
          </div>` : ''}
      </div>
      <div style="padding:0 24px 28px">
        <button class="btn-primary" data-sact="save-summary">Salvar e finalizar</button>
      </div>
    </div>
  `;
}

function renderExitSheet() {
  return `
    <div class="sheet-overlay" data-sact="cancel-exit">
      <div class="sheet" onclick="event.stopPropagation()">
        <div class="sheet-handle"></div>
        <h3 class="font-head" style="font-size:19px;margin:0 0 6px">Opções do treino</h3>
        <p style="color:var(--muted);font-size:13.5px;margin:0 0 20px;line-height:1.5">Você pode marcar como feito direto, sair salvando o que já foi feito, ou sair sem salvar nada.</p>
        <button class="btn-primary" data-sact="mark-as-done" style="margin-bottom:10px">Marcar treino como feito</button>
        <button class="btn-ghost" data-sact="exit-save" style="border-color:var(--accent);color:var(--accent);margin-bottom:10px;display:flex;align-items:center;justify-content:center;gap:6px">${icon('check', 14)} Sair e salvar como incompleto</button>
        <button data-sact="exit-discard" style="background:none;border:none;color:var(--danger);font-size:13.5px;font-weight:700;width:100%;padding:12px 0">Sair sem salvar</button>
        <button class="btn-ghost" data-sact="cancel-exit">Continuar treinando</button>
      </div>
    </div>
  `;
}

export function bindActiveSessionEvents(app, state, ctx) {
  const s = state.activeSession;
  const { workout, ex } = currentExercise(state);

  // inputs de carga/reps — atualizam o state sem re-render (preserva foco)
  const cargaInput = document.getElementById('input-carga');
  const confirmBtn = app.querySelector('[data-sact="confirm-set"]');
  if (cargaInput) cargaInput.addEventListener('input', (e) => {
    s.carga = e.target.value;
    if (confirmBtn) {
      const empty = s.carga === '';
      confirmBtn.disabled = empty;
      confirmBtn.style.opacity = empty ? '0.5' : '1';
    }
  });
  const repsInput = document.getElementById('input-reps');
  if (repsInput) repsInput.addEventListener('input', (e) => { s.reps = e.target.value; });

  app.querySelectorAll('[data-sact]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      handle(el.dataset.sact, el.dataset);
    });
  });

  function handle(action, ds) {
    switch (action) {
      case 'open-exit': s.confirmExit = true; ctx.render(); break;
      case 'cancel-exit': s.confirmExit = false; ctx.render(); break;
      case 'toggle-video': s.videoOpen = !s.videoOpen; ctx.render(); break;

      case 'adjust': {
        const field = ds.field;
        const step = field === 'carga' ? 2.5 : 1;
        const dir = Number(ds.dir);
        const cur = parseFloat(s[field]) || 0;
        const next = Math.max(0, cur + dir * step);
        s[field] = String(Number.isInteger(next) ? next : next.toFixed(1));
        ctx.render();
        break;
      }

      case 'edit-set': {
        const idx = Number(ds.idx);
        const set = (s.loggedSets[ex.id] || [])[idx];
        s.editingIdx = idx;
        s.carga = set?.carga != null ? String(set.carga) : '';
        s.reps = set?.reps || '';
        ctx.render();
        break;
      }
      case 'cancel-edit': s.editingIdx = null; ctx.render(); break;

      case 'confirm-set': confirmSet(); break;

      case 'rest-adjust': {
        const dir = Number(ds.dir);
        s.restRemaining = Math.max(0, s.restRemaining + dir * 15);
        ctx.render();
        break;
      }
      case 'rest-pause': s.restPaused = !s.restPaused; startOrStopTimer(); ctx.render(); break;
      case 'continue-after-rest': continueAfterRest(); break;

      case 'mark-as-done': s.confirmExit = false; s.phase = 'summary'; if (s.timerHandle) clearInterval(s.timerHandle); ctx.render(); break;
      case 'exit-save': ctx.exitSession(true); break;
      case 'exit-discard': ctx.exitSession(false); break;

      case 'save-summary': ctx.finishSessionFromSummary(); break;
      default: break;
    }
  }

  function confirmSet() {
    const isEditingPast = s.editingIdx != null;
    const activeIdx = isEditingPast ? s.editingIdx : (s.loggedSets[ex.id] || []).length;
    const arr = [...(s.loggedSets[ex.id] || [])];
    arr[activeIdx] = { carga: s.carga, reps: s.reps };
    s.loggedSets = { ...s.loggedSets, [ex.id]: arr };
    s.editingIdx = null;

    if (isEditingPast) {
      const pendingIdx = arr.length;
      const last = ctx.getLastSetValue(ex.id, pendingIdx);
      s.carga = last?.carga != null ? String(last.carga) : '';
      s.reps = last?.reps || ex.repsTarget || '';
      ctx.render();
      return;
    }

    const isLastExercise = s.exIdx === workout.exercises.length - 1;
    const finishedExercise = arr.length >= ex.setsCount;
    if (!finishedExercise) {
      openRest(Math.min(ex.restSeconds, 30));
    } else if (!isLastExercise) {
      openRest(ex.restSeconds);
    } else {
      s.phase = 'summary';
      ctx.render();
    }
  }

  function openRest(seconds) {
    s.restRemaining = seconds;
    s.restTotal = seconds;
    s.restPaused = false;
    s.restReady = false;
    s.phase = 'rest';
    ctx.render();
    startOrStopTimer();
  }

  function startOrStopTimer() {
    if (s.timerHandle) { clearInterval(s.timerHandle); s.timerHandle = null; }
    if (s.phase !== 'rest' || s.restPaused) return;
    s.timerHandle = setInterval(() => {
      if (s.restRemaining <= 1) {
        clearInterval(s.timerHandle);
        s.timerHandle = null;
        s.restRemaining = 0;
        s.restReady = true;
      } else {
        s.restRemaining -= 1;
      }
      ctx.render();
    }, 1000);
  }

  function continueAfterRest() {
    if (s.timerHandle) clearInterval(s.timerHandle);
    const finishedExercise = (s.loggedSets[ex.id] || []).length >= ex.setsCount;
    if (finishedExercise) {
      s.exIdx += 1;
      const nextEx = workout.exercises[s.exIdx];
      ctx.initSetInputs(nextEx);
    }
    s.phase = 'exercise';
    ctx.render();
  }

  // inicia o timer se acabamos de entrar na fase de descanso (após render inicial)
  if (s.phase === 'rest' && !s.timerHandle && !s.restPaused && s.restRemaining > 0) {
    startOrStopTimer();
  }
}
