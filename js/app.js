import { PROTOCOL_INFO, TIPS, MOTIVATIONAL_MESSAGES } from '../data/workouts.js';
import { AVATAR_URL } from '../data/avatar.js';
import { loadWorkouts, saveWorkouts, loadSessions, saveSessions, loadTheme, saveTheme } from './storage.js';
import { icon } from './icons.js';
import { extractYouTubeId, todayISO, formatDatePT, formatDateShort, daysAgo, bestSetLoad, todaysMotivation, escapeHtml, uid } from './utils.js';
import { renderActiveSession, bindActiveSessionEvents } from './screens/session.js';

export const state = {
  workouts: loadWorkouts(),
  sessions: loadSessions(),
  theme: loadTheme(),
  tab: 'hoje',
  browseWorkoutId: null,
  activeSession: null,
  logModalOpen: false,
  historicoSubTab: 'registros',
  historicoFilter: 'all',
  toast: '',
  browseState: { editingId: null, videoOpenId: null },
  homePickedId: null,
};

document.documentElement.setAttribute('data-theme', state.theme);

let toastTimer = null;
export function showToast(msg) {
  state.toast = msg;
  render();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { state.toast = ''; render(); }, 2200);
}

export function persistWorkouts() { saveWorkouts(state.workouts); }
export function persistSessions() { saveSessions(state.sessions); }

export function updateExercise(workoutId, exerciseId, patch) {
  state.workouts = state.workouts.map((w) => w.id === workoutId
    ? { ...w, exercises: w.exercises.map((e) => (e.id === exerciseId ? { ...e, ...patch } : e)) } : w);
  persistWorkouts();
}

export function saveSession(session) {
  state.sessions = [...state.sessions, session];
  persistSessions();
  showToast(session.status === 'completed' ? 'Treino salvo ✓' : session.status === 'partial' ? 'Treino parcial salvo' : 'Registrado como não feito');
}
export function deleteSession(id) {
  state.sessions = state.sessions.filter((s) => s.id !== id);
  persistSessions();
  render();
}

export function getLastSetValue(exerciseId, setIdx) {
  const sessions = state.sessions;
  for (let i = sessions.length - 1; i >= 0; i--) {
    const arr = sessions[i].sets?.[exerciseId];
    if (arr && arr.length) return arr[setIdx] || arr[arr.length - 1];
  }
  return null;
}
export function bestEverLoad(exerciseId) {
  let best = null;
  state.sessions.forEach((s) => {
    const b = bestSetLoad(s.sets?.[exerciseId]);
    if (b != null && (best == null || b > best)) best = b;
  });
  return best;
}

function suggestedWorkoutId() {
  const last = [...state.sessions].reverse().find((s) => s.status !== 'skipped');
  if (!last) return state.workouts[0].id;
  const idx = state.workouts.findIndex((w) => w.id === last.workoutId);
  return state.workouts[(idx + 1) % state.workouts.length].id;
}

export function startSession(workoutId) {
  const workout = state.workouts.find((w) => w.id === workoutId);
  state.activeSession = {
    workoutId, exIdx: 0, phase: 'exercise', loggedSets: {}, editingIdx: null,
    carga: '', reps: '', videoOpen: false, confirmExit: false,
    restRemaining: 0, restPaused: false, restReady: false, restTotal: 0,
    startedAt: new Date().toISOString(), timerHandle: null,
  };
  initSetInputs(workout.exercises[0]);
  render();
}

function initSetInputs(ex) {
  const s = state.activeSession;
  const doneCount = (s.loggedSets[ex.id] || []).length;
  const last = getLastSetValue(ex.id, doneCount);
  s.carga = last?.carga != null ? String(last.carga) : '';
  s.reps = last?.reps || ex.repsTarget || '';
}

export function exitSession(save) {
  const s = state.activeSession;
  if (s.timerHandle) clearInterval(s.timerHandle);
  if (save) {
    const workout = state.workouts.find((w) => w.id === s.workoutId);
    const hasAny = Object.values(s.loggedSets).some((arr) => arr.length);
    if (hasAny) {
      saveSession({
        id: uid(), workoutId: s.workoutId, workoutName: workout.name, date: todayISO(),
        status: 'partial', sets: s.loggedSets, note: 'Treino interrompido',
        startedAt: s.startedAt, finishedAt: new Date().toISOString(),
      });
    }
  }
  state.activeSession = null;
  state.tab = 'hoje';
  state.browseWorkoutId = null;
  render();
}

export function finishSessionFromSummary() {
  const s = state.activeSession;
  const workout = state.workouts.find((w) => w.id === s.workoutId);
  if (s.timerHandle) clearInterval(s.timerHandle);
  const prs = workout.exercises.filter((e) => {
    const arr = s.loggedSets[e.id];
    if (!arr) return false;
    const now = bestSetLoad(arr);
    const before = bestEverLoad(e.id);
    return now != null && (before == null || now > before);
  });
  saveSession({
    id: uid(), workoutId: s.workoutId, workoutName: workout.name, date: todayISO(),
    status: 'completed', sets: s.loggedSets, note: '', startedAt: s.startedAt,
    finishedAt: new Date().toISOString(), prs: prs.map((e) => e.id),
  });
  state.activeSession = null;
  state.tab = 'hoje';
  state.browseWorkoutId = null;
  render();
}

export function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.theme);
  saveTheme(state.theme);
  render();
}

// ---------------- Render ----------------
export function render() {
  const app = document.getElementById('app');
  if (state.activeSession) {
    app.innerHTML = renderActiveSession(state, { getLastSetValue, bestEverLoad });
    bindActiveSessionEvents(app, state, { render, showToast, getLastSetValue, bestEverLoad, exitSession, finishSessionFromSummary, initSetInputs });
    return;
  }

  const browseWorkout = state.browseWorkoutId ? state.workouts.find((w) => w.id === state.browseWorkoutId) : null;

  let body;
  if (browseWorkout) body = renderExerciseBrowse(browseWorkout);
  else if (state.tab === 'hoje') body = renderHoje();
  else if (state.tab === 'exercicios') body = renderExercicios();
  else if (state.tab === 'historico') body = renderHistorico();
  else body = renderPerfil();

  app.innerHTML = `
    ${state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : ''}
    ${body}
    ${state.tab === 'historico' && state.historicoSubTab === 'registros' && !browseWorkout ? `
      <button class="fab" data-action="open-log-modal">${icon('plus', 24)}</button>` : ''}
    ${!browseWorkout ? `
      <nav class="bottom-nav">
        <button class="tab-btn ${state.tab === 'hoje' ? 'active' : ''}" data-action="set-tab" data-tab="hoje">${icon('home')}<span>Hoje</span></button>
        <button class="tab-btn ${state.tab === 'exercicios' ? 'active' : ''}" data-action="set-tab" data-tab="exercicios">${icon('dumbbell')}<span>Exercícios</span></button>
        <button class="tab-btn ${state.tab === 'historico' ? 'active' : ''}" data-action="set-tab" data-tab="historico">${icon('calendar')}<span>Histórico</span></button>
        <button class="tab-btn ${state.tab === 'perfil' ? 'active' : ''}" data-action="set-tab" data-tab="perfil">${icon('user')}<span>Perfil</span></button>
      </nav>` : ''}
    ${state.logModalOpen ? renderRetroLogModal() : ''}
  `;
  bindGlobalEvents(app, browseWorkout);
}

// ---------------- HOJE ----------------
function renderHoje() {
  if (!state.homePickedId) state.homePickedId = suggestedWorkoutId();
  const workout = state.workouts.find((w) => w.id === state.homePickedId);
  const weekCount = state.sessions.filter((s) => s.date >= daysAgo(6) && s.status === 'completed').length;
  const totalCount = state.sessions.filter((s) => s.status === 'completed').length;
  const motivation = todaysMotivation(MOTIVATIONAL_MESSAGES);

  const completed = state.sessions.filter((s) => s.status === 'completed');
  let lastImprovement = null;
  outer:
  for (let i = completed.length - 1; i >= 0; i--) {
    const s = completed[i];
    for (const exId of Object.keys(s.sets || {})) {
      const prevSessions = completed.slice(0, i).filter((p) => p.sets?.[exId]);
      if (!prevSessions.length) continue;
      const prev = prevSessions[prevSessions.length - 1];
      const now = bestSetLoad(s.sets[exId]);
      const before = bestSetLoad(prev.sets[exId]);
      if (now != null && before != null && now > before) {
        const w = state.workouts.find((w) => w.exercises.some((e) => e.id === exId));
        const ex = w?.exercises.find((e) => e.id === exId);
        lastImprovement = { name: ex?.name, delta: (now - before).toFixed(1).replace(/\.0$/, '') };
        break outer;
      }
    }
  }

  return `
    <div style="padding:26px 20px 4px">
      <div style="font-size:11px;letter-spacing:1.5px;color:var(--accent);font-weight:700;text-transform:uppercase">Olá, ${escapeHtml(PROTOCOL_INFO.aluna)}</div>
      <h1 class="font-head" style="font-size:26px;margin:4px 0 0">Pronta pra treinar?</h1>
    </div>
    <div style="padding:14px 20px 4px">
      <div class="card card-raised" style="border-left:3px solid var(--accent);padding:18px 20px">
        <p class="font-quote" style="font-size:16.5px;line-height:1.35;color:var(--accent);margin:0;letter-spacing:0.1px">${escapeHtml(motivation)}</p>
      </div>
    </div>
    <div style="padding:0 20px">
      <div class="card card-raised" style="text-align:center;padding:26px 20px">
        <div style="font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:1px">Sugestão de hoje</div>
        <div style="width:68px;height:68px;border-radius:50%;background:var(--bg);border:3px solid var(--accent);display:flex;align-items:center;justify-content:center;margin:14px auto 10px" class="font-head">
          <span style="font-size:28px;color:var(--accent)">${workout.id}</span>
        </div>
        <div style="font-weight:700;font-size:17px">${escapeHtml(workout.focus)}</div>
        ${workout.subfocus ? `<div style="color:var(--muted);font-size:12.5px;margin-top:3px">${escapeHtml(workout.subfocus)}</div>` : ''}
        <div style="color:var(--muted);font-size:12px;margin-top:4px">${workout.exercises.length} exercícios</div>
        <button class="btn-primary" style="margin-top:18px" data-action="start-session" data-workout="${workout.id}">${icon('flame')} Iniciar treino</button>
        <div style="display:flex;gap:8px;justify-content:center;margin-top:14px">
          ${state.workouts.map((w) => `
            <button data-action="pick-home-workout" data-workout="${w.id}" style="width:34px;height:34px;border-radius:50%;border:1.5px solid ${w.id === state.homePickedId ? 'var(--accent)' : 'var(--border)'};background:${w.id === state.homePickedId ? 'var(--accent-soft)' : 'transparent'};color:${w.id === state.homePickedId ? 'var(--accent)' : 'var(--muted)'};font-weight:700;font-size:13px">${w.id}</button>
          `).join('')}
        </div>
      </div>
    </div>
    <div style="display:flex;gap:10px;padding:16px 20px 0">
      <div class="card" style="flex:1;text-align:center;padding:14px 8px">
        <div class="font-head" style="font-size:22px;color:var(--accent)">${weekCount}</div>
        <div style="font-size:10.5px;color:var(--muted);margin-top:2px">Essa semana</div>
      </div>
      <div class="card" style="flex:1;text-align:center;padding:14px 8px">
        <div class="font-head" style="font-size:22px;color:var(--accent)">${totalCount}</div>
        <div style="font-size:10.5px;color:var(--muted);margin-top:2px">Total de treinos</div>
      </div>
    </div>
    ${lastImprovement ? `
      <div class="card" style="margin:14px 20px 0;display:flex;align-items:center;gap:10px">
        ${icon('trendingUp', 18)}
        <div style="font-size:13px"><b>${escapeHtml(lastImprovement.name || '')}</b>: +${lastImprovement.delta}kg desde o último registro</div>
      </div>` : ''}
  `;
}

// ---------------- EXERCÍCIOS ----------------
function renderExercicios() {
  return `
    <div style="padding:22px 20px">
      <h2 class="font-head" style="font-size:24px;margin:0 0 4px">Exercícios</h2>
      <p style="color:var(--muted);font-size:13px;margin:0 0 18px">Consulte séries, adicione vídeos e observações.</p>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${state.workouts.map((w) => `
          <button class="card" data-action="open-browse" data-workout="${w.id}" style="display:flex;align-items:center;gap:14px;width:100%;border:none;text-align:left">
            <div style="width:44px;height:44px;border-radius:50%;background:var(--bg);border:2px solid var(--accent);display:flex;align-items:center;justify-content:center;flex-shrink:0" class="font-head">
              <span style="font-size:18px;color:var(--accent)">${w.id}</span>
            </div>
            <div style="flex:1">
              <div style="font-weight:700;font-size:14.5px">${escapeHtml(w.focus)}</div>
              <div style="color:var(--muted);font-size:12px;margin-top:2px">${w.exercises.length} exercícios</div>
            </div>
            <span style="color:var(--faint)">${icon('chevronRight', 18)}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function renderExerciseBrowse(workout) {
  const bs = state.browseState;
  return `
    <div style="padding:16px 20px 14px">
      <button class="btn-icon" data-action="close-browse" style="color:var(--accent);gap:4px;padding:0;margin-bottom:12px;font-size:13px;font-weight:600">${icon('chevronLeft', 16)} Exercícios</button>
      <h2 class="font-head" style="font-size:24px;margin:0">${escapeHtml(workout.name)} <span style="color:var(--accent)">· ${escapeHtml(workout.focus)}</span></h2>
      ${workout.warmup ? `<div style="color:var(--muted);font-size:12.5px;margin-top:8px"><b style="color:var(--text)">Aquecimento: </b>${escapeHtml(workout.warmup)}</div>` : ''}
      <button class="btn-ghost" data-action="start-session" data-workout="${workout.id}" style="margin-top:14px;display:flex;align-items:center;justify-content:center;gap:6px;border-color:var(--accent);color:var(--accent)">${icon('flame', 15)} Iniciar este treino</button>
    </div>
    <div style="padding:4px 20px;display:flex;flex-direction:column;gap:10px">
      ${workout.exercises.map((ex, i) => {
        const isEditing = bs.editingId === ex.id;
        const isVideoOpen = bs.videoOpenId === ex.id;
        const ytId = extractYouTubeId(ex.videoUrl);
        return `
        <div class="card">
          <div style="display:flex;gap:10px">
            <div class="font-head" style="color:var(--accent);font-size:15px;width:18px">${i + 1}</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:14px">${escapeHtml(ex.name)}</div>
              <div style="color:var(--accent-dim);font-size:12.5px;font-weight:600;margin-top:2px">${escapeHtml(ex.scheme)}</div>
              ${ex.note ? `<div style="color:var(--muted);font-size:11.5px;margin-top:3px;font-style:italic">${escapeHtml(ex.note)}</div>` : ''}
              <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
                ${ytId ? `<button class="btn-pill ${isVideoOpen ? 'active' : ''}" data-action="toggle-video" data-ex="${ex.id}" style="padding:6px 13px;font-size:12px">${icon('play', 11)} Como executar</button>`
                  : `<span style="font-size:11.5px;color:var(--faint)">Sem vídeo ainda</span>`}
                <button class="btn-icon" data-action="toggle-edit-ex" data-ex="${ex.id}" style="padding:6px 4px;gap:4px;color:var(--faint);font-size:11.5px;font-weight:600">${icon('pencil', 12)} ${ex.videoUrl ? 'Editar' : 'Adicionar vídeo'}</button>
              </div>
              ${isVideoOpen && ytId ? `
                <div style="margin-top:10px;border-radius:10px;overflow:hidden;aspect-ratio:16/9">
                  <iframe width="100%" height="100%" src="https://www.youtube.com/embed/${ytId}" title="${escapeHtml(ex.name)}" style="border:none;display:block" allowfullscreen></iframe>
                </div>` : ''}
              ${isEditing ? `
                <div style="margin-top:10px;display:flex;flex-direction:column;gap:6px">
                  <input type="text" data-role="edit-video-url" data-ex="${ex.id}" value="${escapeHtml(ex.videoUrl)}" placeholder="Cole o link do YouTube" />
                  <textarea data-role="edit-note" data-ex="${ex.id}" rows="2" placeholder="Motivo / observação do exercício">${escapeHtml(ex.note)}</textarea>
                  <button data-action="save-ex-edit" data-ex="${ex.id}" style="align-self:flex-end;background:var(--accent);color:var(--bg);border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700">Salvar</button>
                </div>` : ''}
            </div>
          </div>
        </div>`;
      }).join('')}
      ${workout.finisher ? `<div class="card" style="background:none;border:1px dashed var(--border);font-size:12.5px;color:var(--muted)"><b style="color:var(--accent)">Finalização: </b>${escapeHtml(workout.finisher)}</div>` : ''}
    </div>
    <div style="height:20px"></div>
  `;
}

// ---------------- HISTÓRICO ----------------
const STATUS_META = {
  completed: { icon: 'check', color: 'var(--accent)', bg: 'var(--accent-soft)', label: 'Concluído' },
  partial: { icon: 'info', color: '#B8860F', bg: 'rgba(184,134,15,0.14)', label: 'Incompleto' },
  skipped: { icon: 'x', color: 'var(--danger)', bg: 'var(--danger-soft)', label: 'Não feito' },
};

function renderHistorico() {
  const sorted = [...state.sessions].sort((a, b) => (a.date < b.date ? 1 : -1));
  const filtered = state.historicoFilter === 'all' ? sorted : sorted.filter((s) => s.workoutId === state.historicoFilter);
  const getExerciseName = (workoutId, exId) => state.workouts.find((w) => w.id === workoutId)?.exercises.find((e) => e.id === exId)?.name || exId;

  return `
    <div style="padding:22px 20px">
      <h2 class="font-head" style="font-size:24px;margin:0 0 14px">Histórico</h2>
      <div class="segmented">
        <button class="${state.historicoSubTab === 'registros' ? 'active' : ''}" data-action="set-historico-subtab" data-sub="registros">Registros</button>
        <button class="${state.historicoSubTab === 'cargas' ? 'active' : ''}" data-action="set-historico-subtab" data-sub="cargas">Cargas</button>
      </div>
      ${state.historicoSubTab === 'registros' ? `
        <div style="display:flex;gap:8px;margin-bottom:16px;overflow-x:auto">
          ${['all', ...state.workouts.map((w) => w.id)].map((f) => `
            <button class="chip ${state.historicoFilter === f ? 'active' : ''}" data-action="set-historico-filter" data-filter="${f}">${f === 'all' ? 'Todos' : f}</button>
          `).join('')}
        </div>
        ${filtered.length === 0 ? `<div style="color:var(--muted);font-size:13.5px;text-align:center;padding:48px 20px;line-height:1.6">Nenhum treino registrado ainda. Toque em + pra adicionar um treino passado.</div>` : ''}
        <div style="display:flex;flex-direction:column;gap:10px">
          ${filtered.map((s) => renderSessionCard(s, getExerciseName)).join('')}
        </div>
      ` : renderCargasBody()}
    </div>
  `;
}

function renderSessionCard(session, getExerciseName) {
  const status = STATUS_META[session.status] || STATUS_META.skipped;
  const entries = Object.entries(session.sets || {}).filter(([, arr]) => arr && arr.length);
  return `
    <div class="card" data-session-card="${session.id}">
      <div style="display:flex;align-items:center;gap:10px;cursor:${entries.length ? 'pointer' : 'default'}" data-action="${entries.length ? 'toggle-session-card' : ''}" data-session="${session.id}">
        <div style="width:32px;height:32px;border-radius:50%;background:${status.bg};display:flex;align-items:center;justify-content:center;flex-shrink:0;color:${status.color}">${icon(status.icon, 15)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:13.5px">${escapeHtml(session.workoutName)}</div>
          <div style="color:var(--muted);font-size:11.5px">${formatDatePT(session.date)} · ${status.label}</div>
        </div>
        <button class="btn-icon" data-action="delete-session" data-session="${session.id}" style="padding:4px;color:var(--faint)">${icon('trash', 14)}</button>
      </div>
      ${session.note ? `<div style="font-size:12px;color:var(--muted);margin-top:8px;font-style:italic">${escapeHtml(session.note)}</div>` : ''}
      <div data-role="session-detail" data-session="${session.id}" style="display:none;margin-top:10px;border-top:1px solid var(--border);padding-top:10px;flex-direction:column;gap:6px">
        ${entries.map(([exId, arr]) => `
          <div style="display:flex;justify-content:space-between;font-size:12px">
            <span style="color:var(--muted)">${escapeHtml(getExerciseName(session.workoutId, exId))}</span>
            <span style="font-weight:700">${arr.map((s) => `${s.carga}kg${s.reps ? `×${s.reps}` : ''}`).join(' · ')}</span>
          </div>
        `).join('')}
      </div>
      ${entries.length > 0 ? `<div data-role="session-hint" data-session="${session.id}" style="margin-top:6px;font-size:11px;color:var(--accent-dim)">Toque para ver as cargas</div>` : ''}
    </div>
  `;
}

function renderCargasBody() {
  const allExercises = state.workouts.flatMap((w) => w.exercises.map((e) => ({ ...e, workoutId: w.id })));
  const completed = state.sessions.filter((s) => s.status === 'completed' || s.status === 'partial');

  const rows = allExercises.map((ex) => {
    const hits = completed.filter((s) => bestSetLoad(s.sets?.[ex.id]) != null).sort((a, b) => (a.date < b.date ? -1 : 1));
    if (!hits.length) return null;
    const latest = hits[hits.length - 1];
    const prev = hits.length > 1 ? hits[hits.length - 2] : null;
    const latestBest = bestSetLoad(latest.sets[ex.id]);
    const prevBest = prev ? bestSetLoad(prev.sets[ex.id]) : null;
    const latestReps = latest.sets[ex.id].find((s) => bestSetLoad([s]) === latestBest)?.reps;
    return { ex, latestBest, latestReps, prevBest, prevDate: prev?.date, latestDate: latest.date };
  }).filter(Boolean).sort((a, b) => (a.latestDate < b.latestDate ? 1 : -1));

  if (!rows.length) {
    return `<div style="color:var(--muted);font-size:13.5px;text-align:center;padding:48px 20px;line-height:1.6">Ainda sem dados suficientes. Complete alguns treinos pra começar a ver suas cargas aqui.</div>`;
  }

  return `
    <p style="color:var(--muted);font-size:13px;margin:0 0 14px">Comparado com o registro anterior de cada exercício.</p>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${rows.map(({ ex, latestBest, latestReps, prevBest, prevDate, latestDate }) => {
        const delta = prevBest != null && latestBest != null ? latestBest - prevBest : null;
        const deltaColor = delta > 0 ? 'var(--accent)' : delta < 0 ? 'var(--danger)' : 'var(--muted)';
        return `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div>
              <div style="font-weight:700;font-size:14px">${escapeHtml(ex.name)}</div>
              <div style="font-size:12.5px;color:var(--muted);margin-top:4px">Mais recente: <b style="color:var(--text)">${latestBest}kg${latestReps ? ` × ${latestReps}` : ''}</b> · ${formatDateShort(latestDate)}</div>
              ${prevBest != null
                ? `<div style="font-size:12px;color:var(--faint);margin-top:2px">Anterior: ${prevBest}kg · ${formatDateShort(prevDate)}</div>`
                : `<div style="font-size:12px;color:var(--faint);margin-top:2px">Ainda sem comparação anterior</div>`}
            </div>
            ${delta != null ? `<div class="font-head" style="font-size:15px;flex-shrink:0;margin-left:10px;color:${deltaColor}">${delta > 0 ? '+' : ''}${delta}kg</div>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>
  `;
}

// ---------------- PERFIL ----------------
function renderPerfil() {
  return `
    <div style="padding:22px 20px">
      <h2 class="font-head" style="font-size:24px;margin:0 0 18px">Perfil</h2>
      <div class="card card-raised" style="margin-bottom:18px;display:flex;align-items:center;gap:14px">
        <img src="${AVATAR_URL}" alt="${escapeHtml(PROTOCOL_INFO.aluna)}" class="avatar-ring" style="width:60px;height:60px;flex-shrink:0" />
        <div style="min-width:0">
          <div style="font-size:11px;letter-spacing:1.5px;color:var(--accent);font-weight:700;text-transform:uppercase">Protocolo · ${escapeHtml(PROTOCOL_INFO.personal)}</div>
          <div class="font-head" style="font-size:22px;margin:3px 0 0">${escapeHtml(PROTOCOL_INFO.aluna)}</div>
        </div>
      </div>
      <div class="card" style="margin-bottom:18px">
        <p style="color:var(--muted);font-size:13px;line-height:1.5;margin:0">${escapeHtml(PROTOCOL_INFO.objetivo)}</p>
        <div style="color:var(--muted);font-size:12px;margin-top:8px">Início ${escapeHtml(PROTOCOL_INFO.inicio)}</div>
      </div>

      <div style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Aparência</div>
      <button class="card" data-action="toggle-theme" style="width:100%;border:none;text-align:left;display:flex;align-items:center;gap:12px;margin-bottom:18px">
        <div style="width:38px;height:38px;border-radius:50%;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--accent)">
          ${icon(state.theme === 'dark' ? 'moon' : 'sun', 17)}
        </div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:14px">${state.theme === 'dark' ? 'Modo escuro' : 'Modo claro'}</div>
          <div style="color:var(--muted);font-size:11.5px;margin-top:1px">Toque para trocar</div>
        </div>
        <div style="width:46px;height:26px;border-radius:999px;background:${state.theme === 'dark' ? 'var(--border)' : 'var(--accent)'};display:flex;align-items:center;padding:3px;justify-content:${state.theme === 'dark' ? 'flex-start' : 'flex-end'};flex-shrink:0">
          <div style="width:20px;height:20px;border-radius:50%;background:${state.theme === 'dark' ? 'var(--faint)' : 'var(--bg)'}"></div>
        </div>
      </button>

      <div style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Lembretes da Déka</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${TIPS.map((t) => `
          <div class="card">
            <div style="font-size:11px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:0.5px">${escapeHtml(t.label)}</div>
            <div style="font-size:13px;color:var(--text);margin-top:2px">${escapeHtml(t.value)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ---------------- MODAL: registro retroativo ----------------
let retroDraft = { workoutId: null, date: todayISO(), completed: true, loads: {}, note: '' };

function renderRetroLogModal() {
  if (!retroDraft.workoutId) retroDraft.workoutId = state.workouts[0].id;
  const workout = state.workouts.find((w) => w.id === retroDraft.workoutId);
  return `
    <div class="sheet-overlay" data-action="close-log-modal">
      <div class="sheet" onclick="event.stopPropagation()">
        <div class="sheet-handle"></div>
        <h3 class="font-head" style="font-size:19px;margin:0 0 16px">Registrar treino passado</h3>
        <div style="display:flex;gap:8px;margin-bottom:14px">
          ${state.workouts.map((w) => `
            <button data-action="retro-pick-workout" data-workout="${w.id}" style="flex:1;padding:10px 0;border-radius:10px;border:1px solid ${retroDraft.workoutId === w.id ? 'var(--accent)' : 'var(--border)'};background:${retroDraft.workoutId === w.id ? 'var(--accent)' : 'transparent'};color:${retroDraft.workoutId === w.id ? 'var(--bg)' : 'var(--text)'};font-weight:700">${w.id}</button>
          `).join('')}
        </div>
        <label style="font-size:12px;color:var(--muted);font-weight:600">Data</label>
        <input type="date" id="retro-date" value="${retroDraft.date}" style="margin-top:4px;margin-bottom:14px" />
        <div style="display:flex;gap:8px;margin-bottom:16px">
          <button data-action="retro-set-completed" data-val="true" style="flex:1;padding:10px 0;border-radius:10px;border:1px solid ${retroDraft.completed ? 'var(--accent)' : 'var(--border)'};background:${retroDraft.completed ? 'var(--accent)' : 'transparent'};color:${retroDraft.completed ? 'var(--bg)' : 'var(--text)'};font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px">${icon('check', 15)} Fiz</button>
          <button data-action="retro-set-completed" data-val="false" style="flex:1;padding:10px 0;border-radius:10px;border:1px solid ${!retroDraft.completed ? 'var(--danger)' : 'var(--border)'};background:${!retroDraft.completed ? 'var(--danger)' : 'transparent'};color:${!retroDraft.completed ? 'var(--bg)' : 'var(--text)'};font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px">${icon('x', 15)} Não fiz</button>
        </div>
        ${retroDraft.completed ? `
          <div style="margin-bottom:14px">
            <div style="font-size:12px;color:var(--muted);font-weight:600;margin-bottom:6px">Cargas utilizadas (kg)</div>
            <div style="display:flex;flex-direction:column;gap:8px">
              ${workout.exercises.map((ex) => {
                const last = getLastSetValue(ex.id, 0);
                return `
                <div style="display:flex;align-items:center;gap:10px">
                  <div style="flex:1;font-size:13px">${escapeHtml(ex.name)}</div>
                  <input type="number" inputmode="decimal" data-role="retro-load" data-ex="${ex.id}" placeholder="${last?.carga != null ? last.carga : '—'}" value="${retroDraft.loads[ex.id] ?? ''}" style="width:60px;padding:6px 8px;font-size:13px;text-align:center" />
                </div>`;
              }).join('')}
            </div>
          </div>` : ''}
        <label style="font-size:12px;color:var(--muted);font-weight:600">${retroDraft.completed ? 'Observações' : 'Motivo (opcional)'}</label>
        <textarea id="retro-note" rows="2" placeholder="${retroDraft.completed ? 'Como se sentiu, dores, ajustes...' : 'Cansaço, viagem, imprevisto...'}" style="margin-top:4px;margin-bottom:18px">${escapeHtml(retroDraft.note)}</textarea>
        <button class="btn-primary" data-action="retro-save">Salvar registro</button>
      </div>
    </div>
  `;
}

// ---------------- Event binding ----------------
function bindGlobalEvents(app, browseWorkout) {
  app.querySelectorAll('[data-action]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = el.dataset.action;
      handleAction(action, el.dataset);
    });
  });

  // inputs do modal retroativo
  const dateInput = document.getElementById('retro-date');
  if (dateInput) dateInput.addEventListener('change', (e) => { retroDraft.date = e.target.value; });
  const noteInput = document.getElementById('retro-note');
  if (noteInput) noteInput.addEventListener('input', (e) => { retroDraft.note = e.target.value; });
  app.querySelectorAll('[data-role="retro-load"]').forEach((el) => {
    el.addEventListener('input', (e) => { retroDraft.loads[el.dataset.ex] = e.target.value; });
  });

  // inputs de edição de exercício (vídeo/nota) — sem re-render pra não perder foco
  app.querySelectorAll('[data-role="edit-video-url"]').forEach((el) => {
    el.addEventListener('blur', (e) => updateExercise(browseWorkout.id, el.dataset.ex, { videoUrl: e.target.value.trim() }));
  });
  app.querySelectorAll('[data-role="edit-note"]').forEach((el) => {
    el.addEventListener('blur', (e) => updateExercise(browseWorkout.id, el.dataset.ex, { note: e.target.value }));
  });
}

function handleAction(action, ds) {
  switch (action) {
    case 'set-tab':
      state.tab = ds.tab; state.browseWorkoutId = null; render(); break;
    case 'open-browse':
      state.browseWorkoutId = ds.workout; state.browseState = { editingId: null, videoOpenId: null }; render(); break;
    case 'close-browse':
      state.browseWorkoutId = null; render(); break;
    case 'toggle-video':
      state.browseState.videoOpenId = state.browseState.videoOpenId === ds.ex ? null : ds.ex; render(); break;
    case 'toggle-edit-ex':
      state.browseState.editingId = state.browseState.editingId === ds.ex ? null : ds.ex; render(); break;
    case 'save-ex-edit':
      state.browseState.editingId = null; render(); break;
    case 'pick-home-workout':
      state.homePickedId = ds.workout; render(); break;
    case 'start-session':
      startSession(ds.workout); break;
    case 'set-historico-subtab':
      state.historicoSubTab = ds.sub; render(); break;
    case 'set-historico-filter':
      state.historicoFilter = ds.filter; render(); break;
    case 'toggle-session-card': {
      const detail = document.querySelector(`[data-role="session-detail"][data-session="${ds.session}"]`);
      const hint = document.querySelector(`[data-role="session-hint"][data-session="${ds.session}"]`);
      if (detail) {
        const open = detail.style.display === 'flex';
        detail.style.display = open ? 'none' : 'flex';
        if (hint) hint.style.display = open ? 'block' : 'none';
      }
      break;
    }
    case 'delete-session':
      deleteSession(ds.session); break;
    case 'toggle-theme':
      toggleTheme(); break;
    case 'open-log-modal':
      retroDraft = { workoutId: state.workouts[0].id, date: todayISO(), completed: true, loads: {}, note: '' };
      state.logModalOpen = true; render(); break;
    case 'close-log-modal':
      state.logModalOpen = false; render(); break;
    case 'retro-pick-workout':
      retroDraft.workoutId = ds.workout; render(); break;
    case 'retro-set-completed':
      retroDraft.completed = ds.val === 'true'; render(); break;
    case 'retro-save': {
      const workout = state.workouts.find((w) => w.id === retroDraft.workoutId);
      const sets = {};
      if (retroDraft.completed) {
        Object.entries(retroDraft.loads).forEach(([exId, v]) => { if (v !== '' && v != null) sets[exId] = [{ carga: v, reps: null }]; });
      }
      saveSession({
        id: uid(), workoutId: retroDraft.workoutId, workoutName: workout.name, date: retroDraft.date,
        status: retroDraft.completed ? 'completed' : 'skipped', sets, note: retroDraft.note.trim(),
      });
      state.logModalOpen = false; render(); break;
    }
    default: break;
  }
}

render();
