import { icon } from '../icons.js';
import { extractYouTubeId, fmtTime, bestSetLoad, escapeHtml } from '../utils.js';

const PROGRESS_LABEL = {
  done: 'Feito',
  partial: 'Em andamento',
  skipped: 'Pulado',
  pending: 'Pendente',
};

function currentExercise(state) {
  const workout = state.workouts.find((w) => w.id === state.activeSession.workoutId);
  return { workout, ex: workout.exercises[state.activeSession.exIdx] };
}

function exerciseProgress(s, ex) {
  const logged = (s.loggedSets[ex.id] || []).length;
  if ((s.skippedIds || []).includes(ex.id) && logged === 0) return 'skipped';
  if (logged >= ex.setsCount) return 'done';
  if (logged > 0) return 'partial';
  return 'pending';
}

// Próximo exercício ainda sem todas as séries. allowSkipped inclui os pulados.
// Não devolve o exercício atual: "próximo" só anda pra frente.
export function nextExerciseIndex(workout, s, allowSkipped) {
  const n = workout.exercises.length;
  for (let step = 1; step < n; step++) {
    const i = (s.exIdx + step) % n;
    const e = workout.exercises[i];
    const logged = (s.loggedSets[e.id] || []).length;
    if (logged >= e.setsCount) continue;
    const skipped = (s.skippedIds || []).includes(e.id) && logged === 0;
    if (skipped && !allowSkipped) continue;
    return i;
  }
  return null;
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
  const ytId = extractYouTubeId(ex.videoUrl);
  const lastVal = helpers.getLastSetValue(ex.id, activeIdx);
  const loggedForEx = s.loggedSets[ex.id] || [];
  const progress = exerciseProgress(s, ex);
  const hasNext = nextExerciseIndex(workout, s, false) != null;
  const skipLabel = doneCount > 0 ? (hasNext ? 'Próximo exercício' : 'Finalizar treino') : 'Pular exercício';

  return `
    <div style="background:var(--bg);min-height:100vh;color:var(--text);max-width:480px;margin:0 auto;display:flex;flex-direction:column">
      <div style="padding:16px 20px 10px">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <button class="btn-icon" data-sact="open-exit">${icon('x', 20)}</button>
          <div style="font-size:12px;color:var(--muted);font-weight:600">${escapeHtml(workout.name)} · Exercício ${s.exIdx + 1} de ${workout.exercises.length}</div>
          <div style="width:31px"></div>
        </div>
        <div class="progress-bar-row">
          ${workout.exercises.map((e, i) => {
            const st = exerciseProgress(s, e);
            const cls = [i === s.exIdx ? 'current' : '', st === 'pending' ? '' : st].filter(Boolean).join(' ');
            return `<button type="button" class="progress-seg ${cls}" data-sact="goto-ex" data-idx="${i}" aria-label="${escapeHtml(e.name)} · ${PROGRESS_LABEL[st]}"></button>`;
          }).join('')}
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

          ${progress === 'skipped' ? `
            <div class="skip-banner">
              Você pulou este exercício. Pode fazer agora ou deixar pra depois.
              <button type="button" data-sact="unskip">Desfazer pulo</button>
            </div>` : ''}

          ${ytId ? `
            <button class="btn-pill ${s.videoOpen ? 'active' : ''}" data-sact="toggle-video" style="margin-top:12px">${icon('play', 13, 'style="fill:currentColor"')} Como executar</button>` : ''}
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
              <input type="number" inputmode="decimal" class="stepper-input" id="input-carga" value="${escapeHtml(s.carga)}" />
              <button class="stepper-btn" data-sact="adjust" data-field="carga" data-dir="1">${icon('plus', 16)}</button>
            </div>
          </div>
          <div class="stepper-wrap">
            <div class="stepper-label">Repetições</div>
            <div class="stepper-row">
              <button class="stepper-btn" data-sact="adjust" data-field="reps" data-dir="-1">${icon('minus', 16)}</button>
              <input type="number" inputmode="decimal" class="stepper-input" id="input-reps" value="${escapeHtml(s.reps)}" />
              <button class="stepper-btn" data-sact="adjust" data-field="reps" data-dir="1">${icon('plus', 16)}</button>
            </div>
          </div>
        </div>

        ${doneCount > 0 ? `
          <div style="display:flex;gap:6px;justify-content:center;margin-top:20px;flex-wrap:wrap">
            ${loggedForEx.map((set, i) => `
              <button class="set-chip ${s.editingIdx === i ? 'active' : ''}" data-sact="edit-set" data-idx="${i}">${i + 1}: ${escapeHtml(set.carga)}kg×${escapeHtml(set.reps || '?')}</button>
            `).join('')}
          </div>` : ''}
      </div>

      <div style="padding:10px 24px 28px;display:flex;flex-direction:column;gap:8px">
        <button class="btn-primary" data-sact="confirm-set" ${s.carga === '' ? 'disabled style="opacity:0.5"' : ''}>${icon('check', 19)} ${isEditingPast ? `Salvar série ${activeIdx + 1}` : 'Concluir série'}</button>
        <div class="btn-row">
          <button type="button" class="btn-ghost" data-sact="skip-exercise">${skipLabel}</button>
          <button type="button" class="btn-ghost" data-sact="open-exercise-list">Exercícios</button>
        </div>
        ${isEditingPast ? `<button data-sact="cancel-edit" style="background:none;border:none;color:var(--muted);font-size:12.5px;font-weight:600;padding:4px 0 0;width:100%">Cancelar edição</button>` : ''}
      </div>

      ${s.confirmExit ? renderExitSheet() : ''}
      ${s.exerciseListOpen ? renderExerciseListSheet(state, workout) : ''}
    </div>
  `;
}

function renderRest(state, workout, ex) {
  const s = state.activeSession;
  const pct = s.restTotal ? ((s.restTotal - s.restRemaining) / s.restTotal) * 100 : 100;
  const doneCount = (s.loggedSets[ex.id] || []).length;
  const nextIsNewExercise = doneCount >= ex.setsCount;
  let nextLabel = 'Próxima série';
  if (nextIsNewExercise) {
    const nextIdx = nextExerciseIndex(workout, s, false);
    nextLabel = nextIdx == null ? 'Finalizar treino' : `Próximo: ${workout.exercises[nextIdx].name}`;
  }
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
        <button type="button" class="btn-ghost" data-sact="open-exercise-list">Ver exercícios</button>
      </div>
      ${s.exerciseListOpen ? renderExerciseListSheet(state, workout) : ''}
    </div>
  `;
}

function renderExerciseListSheet(state, workout) {
  const s = state.activeSession;
  return `
    <div class="sheet-overlay" data-sact="close-exercise-list">
      <div class="sheet" onclick="event.stopPropagation()">
        <div class="sheet-handle"></div>
        <h3 class="font-head" style="font-size:19px;margin:0 0 6px">Exercícios</h3>
        <p style="color:var(--muted);font-size:13.5px;margin:0 0 14px;line-height:1.45">Toque pra ir a qualquer um. Dá pra voltar num pulado e fazer depois, ou finalizar com ele pulado.</p>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
          ${workout.exercises.map((e, i) => {
            const st = exerciseProgress(s, e);
            const logged = (s.loggedSets[e.id] || []).length;
            const current = i === s.exIdx && s.phase === 'exercise';
            return `
              <button type="button" class="ex-jump ${current ? 'current' : ''}" data-sact="goto-ex" data-idx="${i}">
                <span class="font-head" style="color:var(--accent);width:18px">${i + 1}</span>
                <span style="flex:1;min-width:0">
                  <span style="font-weight:700;font-size:13.5px;display:block">${escapeHtml(e.name)}</span>
                  <span style="color:var(--faint);font-size:11.5px">${logged}/${e.setsCount} séries${current ? ' · agora' : ''}</span>
                </span>
                <span class="ex-status ex-status-${st}">${PROGRESS_LABEL[st]}</span>
              </button>`;
          }).join('')}
        </div>
        <button type="button" class="btn-primary" data-sact="finish-now">Finalizar treino</button>
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
  const anySets = totalSets > 0;
  const pending = workout.exercises.filter((e) => exerciseProgress(s, e) === 'pending');
  const hasSkipped = workout.exercises.some((e) => exerciseProgress(s, e) === 'skipped');
  let title = 'Treino concluído';
  if (!anySets && !s.forceCompleted) title = 'Nada registrado';
  else if (hasSkipped || pending.length) title = 'Treino finalizado';
  const saveLabel = !anySets && !s.forceCompleted ? 'Salvar como não feito' : 'Salvar e finalizar';

  return `
    <div style="background:var(--bg);min-height:100vh;color:var(--text);max-width:480px;margin:0 auto;display:flex;flex-direction:column">
      <div style="flex:1;overflow:auto;padding:36px 24px 24px;text-align:center">
        <div style="width:72px;height:72px;border-radius:50%;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;margin:0 auto 18px;color:var(--accent)">${icon(anySets || s.forceCompleted ? 'check' : 'x', 34)}</div>
        <h1 class="font-head" style="font-size:26px;margin:0 0 4px">${title}</h1>
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
        <div style="margin-top:22px;text-align:left">
          <div style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Exercícios</div>
          ${workout.exercises.map((e) => {
            const st = exerciseProgress(s, e);
            const arr = s.loggedSets[e.id] || [];
            const detail = arr.length
              ? arr.map((set) => `${set.carga}kg${set.reps ? `×${set.reps}` : ''}`).join(' · ')
              : PROGRESS_LABEL[st];
            const detailClass = arr.length ? '' : `ex-status ex-status-${st}`;
            return `
              <div class="card" style="padding:10px 14px;margin-bottom:8px;display:flex;justify-content:space-between;gap:10px;align-items:center">
                <span style="font-size:13.5px;font-weight:700">${escapeHtml(e.name)}</span>
                <span class="${detailClass}" style="text-align:right;font-size:12px;font-weight:700">${escapeHtml(detail)}</span>
              </div>`;
          }).join('')}
          ${pending.length ? `<div style="color:var(--faint);font-size:12px;line-height:1.45">Pendente não entra como pulado. Se não for fazer, volte e toque em Pular exercício — ou use o botão abaixo.</div>` : ''}
        </div>
      </div>
      <div style="padding:0 24px 28px;display:flex;flex-direction:column;gap:8px">
        ${pending.length ? `<button type="button" class="btn-ghost" data-sact="skip-pending" style="border-color:var(--danger);color:var(--danger)">Marcar pendentes como pulados</button>` : ''}
        <button type="button" class="btn-ghost" data-sact="summary-back">Voltar aos exercícios</button>
        <button class="btn-primary" data-sact="save-summary">${saveLabel}</button>
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
        <p style="color:var(--muted);font-size:13.5px;margin:0 0 20px;line-height:1.5">Você pode marcar como feito direto, sair salvando o que já foi feito (inclusive exercícios pulados), ou sair sem salvar nada.</p>
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
      case 'open-exit': s.confirmExit = true; s.exerciseListOpen = false; ctx.render(); break;
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

      case 'open-exercise-list': s.exerciseListOpen = true; s.confirmExit = false; ctx.render(); break;
      case 'close-exercise-list': s.exerciseListOpen = false; ctx.render(); break;
      case 'goto-ex': goToExercise(Number(ds.idx)); break;
      case 'skip-exercise': skipExercise(); break;
      case 'unskip': {
        s.skippedIds = (s.skippedIds || []).filter((id) => id !== ex.id);
        ctx.render();
        break;
      }
      case 'finish-now': {
        if (s.timerHandle) { clearInterval(s.timerHandle); s.timerHandle = null; }
        s.exerciseListOpen = false;
        s.confirmExit = false;
        s.forceCompleted = false;
        s.phase = 'summary';
        ctx.render();
        break;
      }
      case 'skip-pending': {
        s.skippedIds = s.skippedIds || [];
        workout.exercises.forEach((e) => {
          const logged = (s.loggedSets[e.id] || []).length;
          if (logged === 0 && !s.skippedIds.includes(e.id)) s.skippedIds.push(e.id);
        });
        ctx.render();
        break;
      }
      case 'summary-back': {
        const skippedIdx = workout.exercises.findIndex((e) => exerciseProgress(s, e) === 'skipped');
        const idx = skippedIdx >= 0 ? skippedIdx : Math.min(s.exIdx, workout.exercises.length - 1);
        s.forceCompleted = false;
        s.phase = 'exercise';
        s.exIdx = idx;
        s.exerciseListOpen = true;
        ctx.initSetInputs(workout.exercises[idx]);
        ctx.render();
        break;
      }

      case 'mark-as-done':
        s.confirmExit = false;
        s.forceCompleted = true;
        s.phase = 'summary';
        if (s.timerHandle) clearInterval(s.timerHandle);
        ctx.render();
        break;
      case 'exit-save': ctx.exitSession(true); break;
      case 'exit-discard': ctx.exitSession(false); break;

      case 'save-summary': ctx.finishSessionFromSummary(); break;
      default: break;
    }
  }

  function goToExercise(idx) {
    if (!Number.isInteger(idx) || !workout.exercises[idx]) return;
    if (idx === s.exIdx && s.phase === 'exercise') {
      s.exerciseListOpen = false;
      ctx.render();
      return;
    }
    if (s.timerHandle) { clearInterval(s.timerHandle); s.timerHandle = null; }
    s.exIdx = idx;
    s.phase = 'exercise';
    s.editingIdx = null;
    s.videoOpen = false;
    s.exerciseListOpen = false;
    s.confirmExit = false;
    ctx.initSetInputs(workout.exercises[idx]);
    ctx.render();
  }

  function skipExercise() {
    const hasSets = (s.loggedSets[ex.id] || []).length > 0;
    if (!hasSets) {
      s.skippedIds = s.skippedIds || [];
      if (!s.skippedIds.includes(ex.id)) s.skippedIds = [...s.skippedIds, ex.id];
    }
    if (s.timerHandle) { clearInterval(s.timerHandle); s.timerHandle = null; }
    const next = nextExerciseIndex(workout, s, false);
    if (next == null) {
      s.phase = 'summary';
      s.exerciseListOpen = false;
      s.forceCompleted = false;
      ctx.render();
      return;
    }
    s.exIdx = next;
    s.phase = 'exercise';
    s.editingIdx = null;
    s.videoOpen = false;
    s.exerciseListOpen = false;
    ctx.initSetInputs(workout.exercises[next]);
    ctx.render();
  }

  function confirmSet() {
    const isEditingPast = s.editingIdx != null;
    const activeIdx = isEditingPast ? s.editingIdx : (s.loggedSets[ex.id] || []).length;
    const arr = [...(s.loggedSets[ex.id] || [])];
    arr[activeIdx] = { carga: s.carga, reps: s.reps };
    s.loggedSets = { ...s.loggedSets, [ex.id]: arr };
    s.editingIdx = null;
    s.skippedIds = (s.skippedIds || []).filter((id) => id !== ex.id);

    if (isEditingPast) {
      const pendingIdx = arr.length;
      const last = ctx.getLastSetValue(ex.id, pendingIdx);
      s.carga = last?.carga != null ? String(last.carga) : '';
      s.reps = last?.reps || ex.repsTarget || '';
      ctx.render();
      return;
    }

    const finishedExercise = arr.length >= ex.setsCount;
    if (!finishedExercise) {
      openRest(Math.min(ex.restSeconds, 30));
    } else if (nextExerciseIndex(workout, s, false) != null) {
      openRest(ex.restSeconds);
    } else {
      s.forceCompleted = false;
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
    if (s.timerHandle) { clearInterval(s.timerHandle); s.timerHandle = null; }
    const finishedExercise = (s.loggedSets[ex.id] || []).length >= ex.setsCount;
    if (finishedExercise) {
      const next = nextExerciseIndex(workout, s, false);
      if (next == null) {
        s.forceCompleted = false;
        s.phase = 'summary';
        ctx.render();
        return;
      }
      s.exIdx = next;
      ctx.initSetInputs(workout.exercises[next]);
    }
    s.phase = 'exercise';
    ctx.render();
  }

  // inicia o timer se acabamos de entrar na fase de descanso (após render inicial)
  if (s.phase === 'rest' && !s.timerHandle && !s.restPaused && s.restRemaining > 0) {
    startOrStopTimer();
  }
}
