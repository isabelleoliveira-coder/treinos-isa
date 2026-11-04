import { PROTOCOL_INFO, TIPS, MOTIVATIONAL_MESSAGES } from '../data/workouts.js';
import { AVATAR_URL } from '../data/avatar.js';
import { loadWorkouts, saveWorkouts, loadSessions, saveSessions, loadTheme, saveTheme } from './storage.js';
import { LAST_BACKUP_KEY, buildBackup, backupFilename, readLastBackup, validateBackup, restoreBackup, deliverBackup } from './backup.js';
import { icon } from './icons.js';
import { extractYouTubeId, todayISO, formatDatePT, formatDateShort, daysAgo, bestSetLoad, todaysMotivation, escapeHtml, uid, collectLoggedSets, deriveEditedStatus, deriveFinishedStatus, formatSetLoad } from './utils.js';
import { renderActiveSession, bindActiveSessionEvents } from './screens/session.js';

const TRACKED = new Set(['completed', 'partial', 'loads']);

const STATUS_META = {
  completed: { icon: 'check', color: 'var(--accent)', bg: 'var(--accent-soft)', label: 'Concluído' },
  partial: { icon: 'info', color: '#B8860F', bg: 'rgba(184,134,15,0.14)', label: 'Incompleto' },
  skipped: { icon: 'x', color: 'var(--danger)', bg: 'var(--danger-soft)', label: 'Não feito' },
  loads: { icon: 'dumbbell', color: 'var(--accent)', bg: 'var(--accent-soft)', label: 'Só cargas' },
};

const SESSION_TOAST = {
  completed: 'Treino salvo ✓',
  partial: 'Treino parcial salvo',
  skipped: 'Registrado como não feito',
  loads: 'Cargas salvas ✓',
};

export const state = {
  workouts: loadWorkouts(),
  sessions: loadSessions(),
  theme: loadTheme(),
  tab: 'hoje',
  browseWorkoutId: null,
  activeSession: null,
  logModalOpen: false,
  loadsDraft: null,
  editDraft: null,
  historicoSubTab: 'registros',
  historicoFilter: 'all',
  toast: '',
  browseState: { editingId: null, videoOpenId: null },
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
  recomputeAllPrs();
  persistSessions();
  showToast(SESSION_TOAST[session.status] || 'Treino salvo ✓');
}

function replaceSession(session) {
  state.sessions = state.sessions.map((s) => (s.id === session.id ? session : s));
  recomputeAllPrs();
  persistSessions();
  showToast('Treino atualizado');
}

export function deleteSession(id) {
  state.sessions = state.sessions.filter((s) => s.id !== id);
  recomputeAllPrs();
  persistSessions();
  render();
}

function sessionsNewestFirst() {
  return [...state.sessions].sort(compareSessionsDesc);
}

export function getLastSetValue(exerciseId, setIdx) {
  for (const session of sessionsNewestFirst()) {
    const arr = session.sets?.[exerciseId];
    if (arr && arr.length) return arr[setIdx] || arr[arr.length - 1];
  }
  return null;
}

function lastSetsFor(exerciseId) {
  for (const session of sessionsNewestFirst()) {
    const arr = session.sets?.[exerciseId];
    if (arr && arr.length) return arr;
  }
  return null;
}

function formatSetsInline(arr) {
  return (arr || []).map((set) => formatSetLoad(set)).filter(Boolean).join(' · ');
}

export function bestEverLoad(exerciseId) {
  let best = null;
  state.sessions.forEach((s) => {
    const b = bestSetLoad(s.sets?.[exerciseId]);
    if (b != null && (best == null || b > best)) best = b;
  });
  return best;
}

function computePrs(session, all) {
  const workout = state.workouts.find((w) => w.id === session.workoutId);
  if (!workout) return [];
  return workout.exercises.filter((e) => {
    const now = bestSetLoad(session.sets?.[e.id]);
    if (now == null) return false;
    let before = null;
    all.forEach((s) => {
      if (s.id === session.id) return;
      const b = bestSetLoad(s.sets?.[e.id]);
      if (b != null && (before == null || b > before)) before = b;
    });
    return before == null || now > before;
  }).map((e) => e.id);
}

function sameIds(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  return a.every((id, i) => id === b[i]);
}

// Um registro editado ou apagado muda o recorde dos outros. Recalcula todos.
function recomputeAllPrs() {
  const all = state.sessions;
  state.sessions = all.map((session) => {
    const prs = computePrs(session, all);
    return sameIds(session.prs, prs) ? session : { ...session, prs };
  });
}

function compareSessionsDesc(a, b) {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  const ta = a.finishedAt || a.startedAt || a.date;
  const tb = b.finishedAt || b.startedAt || b.date;
  if (ta !== tb) return ta < tb ? 1 : -1;
  return 0;
}

function exerciseName(workoutId, exId) {
  return state.workouts.find((w) => w.id === workoutId)?.exercises.find((e) => e.id === exId)?.name || exId;
}

function suggestedWorkoutId() {
  const last = sessionsNewestFirst().find((s) => s.status !== 'skipped' && s.status !== 'loads');
  if (!last) return state.workouts[0].id;
  const idx = state.workouts.findIndex((w) => w.id === last.workoutId);
  if (idx < 0) return state.workouts[0].id;
  return state.workouts[(idx + 1) % state.workouts.length].id;
}

function blankRow() {
  return { carga: '', reps: '' };
}

function skippedIdsFromActive(s, workout) {
  return workout.exercises
    .filter((e) => (s.skippedIds || []).includes(e.id) && !(s.loggedSets[e.id] || []).length)
    .map((e) => e.id);
}

export function startSession(workoutId) {
  const workout = state.workouts.find((w) => w.id === workoutId);
  state.activeSession = {
    workoutId, exIdx: 0, phase: 'exercise', loggedSets: {}, skippedIds: [], editingIdx: null,
    carga: '', reps: '', videoOpen: false, confirmExit: false, exerciseListOpen: false,
    forceCompleted: false, skipOfferDismissed: false,
    restRemaining: 0, restPaused: false, restReady: false, restTotal: 0,
    startedAt: new Date().toISOString(), timerHandle: null,
  };
  initSetInputs(workout.exercises[0]);
  render();
}

function initSetInputs(ex) {
  const s = state.activeSession;
  const done = s.loggedSets[ex.id] || [];
  const fromSession = done[done.length - 1];
  const last = fromSession || getLastSetValue(ex.id, done.length);
  s.carga = last?.carga != null ? String(last.carga) : '';
  s.reps = fromSession ? (fromSession.reps || '') : (last?.reps || ex.repsTarget || '');
  s.editingIdx = null;
}

export function exitSession(save) {
  const s = state.activeSession;
  if (s.timerHandle) clearInterval(s.timerHandle);
  const workout = state.workouts.find((w) => w.id === s.workoutId);
  const skippedExerciseIds = skippedIdsFromActive(s, workout);
  const hasAny = Object.values(s.loggedSets).some((arr) => arr && arr.length);
  state.activeSession = null;
  state.tab = 'hoje';
  state.browseWorkoutId = null;
  if (save && (hasAny || skippedExerciseIds.length)) {
    const session = {
      id: uid(), workoutId: workout.id, workoutName: workout.name, date: todayISO(),
      status: hasAny ? 'partial' : 'skipped', sets: s.loggedSets, skippedExerciseIds,
      note: 'Treino interrompido', startedAt: s.startedAt, finishedAt: new Date().toISOString(),
    };
    saveSession(session);
    return;
  }
  render();
}

export function finishSessionFromSummary() {
  const s = state.activeSession;
  const workout = state.workouts.find((w) => w.id === s.workoutId);
  if (s.timerHandle) clearInterval(s.timerHandle);
  const anySets = workout.exercises.some((e) => (s.loggedSets[e.id] || []).length);
  const allResolved = workout.exercises.every((e) => {
    const logged = (s.loggedSets[e.id] || []).length;
    const skipped = (s.skippedIds || []).includes(e.id) && logged === 0;
    return skipped || logged >= e.setsCount;
  });
  const session = {
    id: uid(), workoutId: s.workoutId, workoutName: workout.name, date: todayISO(),
    status: deriveFinishedStatus({ anySets, forceCompleted: !!s.forceCompleted, allResolved }),
    sets: s.loggedSets, skippedExerciseIds: skippedIdsFromActive(s, workout), note: '',
    startedAt: s.startedAt, finishedAt: new Date().toISOString(),
  };
  state.activeSession = null;
  state.tab = 'hoje';
  state.browseWorkoutId = null;
  saveSession(session);
}

export function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.theme);
  saveTheme(state.theme);
  render();
}

// ---------------- Cargas avulsas e edição ----------------
function openLoadsLogger(workoutId) {
  const id = workoutId || suggestedWorkoutId();
  state.loadsDraft = { workoutId: id, date: todayISO(), note: '', rowsByWorkout: {} };
  ensureLoadsRows(id);
  state.logModalOpen = false;
  render();
}

function ensureLoadsRows(workoutId) {
  const draft = state.loadsDraft;
  if (!draft || draft.rowsByWorkout[workoutId]) return;
  const workout = state.workouts.find((w) => w.id === workoutId);
  const rows = {};
  workout.exercises.forEach((ex) => { rows[ex.id] = [blankRow()]; });
  draft.rowsByWorkout[workoutId] = rows;
}

function buildEditDraft(session) {
  const workout = state.workouts.find((w) => w.id === session.workoutId);
  const order = [];
  const names = new Map();
  (workout?.exercises || []).forEach((ex) => { order.push(ex.id); names.set(ex.id, ex.name); });
  Object.keys(session.sets || {}).forEach((id) => {
    if (!names.has(id)) { order.push(id); names.set(id, id); }
  });
  (session.skippedExerciseIds || []).forEach((id) => {
    if (!names.has(id)) { order.push(id); names.set(id, id); }
  });
  return {
    id: session.id,
    workoutId: session.workoutId,
    workoutName: session.workoutName,
    date: session.date,
    note: session.note || '',
    originalStatus: session.status,
    startedAt: session.startedAt || null,
    finishedAt: session.finishedAt || null,
    exercises: order.map((id) => {
      const protocol = workout?.exercises.find((ex) => ex.id === id);
      const skipped = (session.skippedExerciseIds || []).includes(id);
      const sets = (session.sets?.[id] || []).map((set) => ({
        carga: set.carga != null ? String(set.carga) : '',
        reps: set.reps != null ? String(set.reps) : '',
      }));
      return {
        id, name: names.get(id), scheme: protocol?.scheme || '', repsTarget: protocol?.repsTarget || '',
        skipped, sets: sets.length ? sets : [blankRow()],
      };
    }),
  };
}

function syncOpenDrafts() {
  if (state.loadsDraft) {
    const rows = state.loadsDraft.rowsByWorkout[state.loadsDraft.workoutId];
    document.querySelectorAll('[data-role="loads-carga"]').forEach((el) => {
      const list = rows?.[el.dataset.ex];
      const idx = Number(el.dataset.idx);
      if (list && list[idx]) list[idx].carga = el.value;
    });
    document.querySelectorAll('[data-role="loads-reps"]').forEach((el) => {
      const list = rows?.[el.dataset.ex];
      const idx = Number(el.dataset.idx);
      if (list && list[idx]) list[idx].reps = el.value;
    });
    const date = document.getElementById('loads-date');
    if (date) state.loadsDraft.date = date.value;
    const note = document.getElementById('loads-note');
    if (note) state.loadsDraft.note = note.value;
  }
  if (state.editDraft) {
    document.querySelectorAll('[data-role="edit-carga"]').forEach((el) => {
      const ex = state.editDraft.exercises.find((e) => e.id === el.dataset.ex);
      const idx = Number(el.dataset.idx);
      if (ex && ex.sets[idx]) ex.sets[idx].carga = el.value;
    });
    document.querySelectorAll('[data-role="edit-reps"]').forEach((el) => {
      const ex = state.editDraft.exercises.find((e) => e.id === el.dataset.ex);
      const idx = Number(el.dataset.idx);
      if (ex && ex.sets[idx]) ex.sets[idx].reps = el.value;
    });
    const date = document.getElementById('edit-date');
    if (date) state.editDraft.date = date.value;
    const note = document.getElementById('edit-note');
    if (note) state.editDraft.note = note.value;
  }
}

function saveLoads() {
  syncOpenDrafts();
  const draft = state.loadsDraft;
  if (!draft.date) { showToast('Escolhe a data'); return; }
  const workout = state.workouts.find((w) => w.id === draft.workoutId);
  const rows = draft.rowsByWorkout[draft.workoutId] || {};
  const sets = {};
  Object.entries(rows).forEach(([exId, list]) => {
    const logged = collectLoggedSets(list);
    if (logged.length) sets[exId] = logged;
  });
  if (!Object.keys(sets).length) { showToast('Informe pelo menos uma carga'); return; }
  const session = {
    id: uid(), workoutId: workout.id, workoutName: workout.name, date: draft.date,
    status: 'loads', sets, skippedExerciseIds: [], note: (draft.note || '').trim(),
    finishedAt: new Date().toISOString(),
  };
  state.loadsDraft = null;
  state.tab = 'historico';
  state.historicoSubTab = 'cargas';
  state.browseWorkoutId = null;
  saveSession(session);
}

function saveEdit() {
  syncOpenDrafts();
  const draft = state.editDraft;
  if (!draft.date) { showToast('Escolhe a data'); return; }
  const sets = {};
  const skippedExerciseIds = [];
  draft.exercises.forEach((ex) => {
    if (ex.skipped) { skippedExerciseIds.push(ex.id); return; }
    const logged = collectLoggedSets(ex.sets);
    if (logged.length) sets[ex.id] = logged;
  });
  const session = {
    id: draft.id,
    workoutId: draft.workoutId,
    workoutName: draft.workoutName,
    date: draft.date,
    status: deriveEditedStatus(draft.originalStatus, Object.keys(sets).length, draft.exercises.length, skippedExerciseIds.length),
    sets,
    skippedExerciseIds,
    note: (draft.note || '').trim(),
    startedAt: draft.startedAt,
    finishedAt: draft.finishedAt || new Date().toISOString(),
  };
  state.editDraft = null;
  replaceSession(session);
}

function renderSetRows(kind, ex, rows) {
  const cargaRole = kind === 'loads' ? 'loads-carga' : 'edit-carga';
  const repsRole = kind === 'loads' ? 'loads-reps' : 'edit-reps';
  const addAction = kind === 'loads' ? 'loads-add-set' : 'edit-add-set';
  const removeAction = kind === 'loads' ? 'loads-remove-set' : 'edit-remove-set';
  return `
    ${rows.length ? `
      <div style="display:flex;gap:8px;margin-bottom:2px;padding-left:62px">
        <span style="flex:1;font-size:10px;color:var(--faint);font-weight:700;letter-spacing:0.4px">CARGA (KG)</span>
        <span style="flex:1;font-size:10px;color:var(--faint);font-weight:700;letter-spacing:0.4px">REPS</span>
        <span style="width:28px"></span>
      </div>` : ''}
    <div style="display:flex;flex-direction:column;gap:8px">
      ${rows.map((row, i) => {
        const last = getLastSetValue(ex.id, i);
        const ph = last?.carga != null ? last.carga : 'kg';
        return `
          <div class="set-edit-row">
            <div class="set-label">Série ${i + 1}</div>
            <input type="text" inputmode="decimal" autocomplete="off" data-role="${cargaRole}" data-ex="${ex.id}" data-idx="${i}" placeholder="${escapeHtml(ph)}" value="${escapeHtml(row.carga)}" aria-label="Carga da série ${i + 1} de ${escapeHtml(ex.name)}" />
            <input type="text" inputmode="decimal" autocomplete="off" data-role="${repsRole}" data-ex="${ex.id}" data-idx="${i}" placeholder="reps" value="${escapeHtml(row.reps)}" aria-label="Repetições da série ${i + 1} de ${escapeHtml(ex.name)}" />
            <button type="button" class="btn-icon" data-action="${removeAction}" data-ex="${ex.id}" data-idx="${i}" aria-label="Remover série ${i + 1}">${icon('trash', 14)}</button>
          </div>`;
      }).join('')}
    </div>
    <button type="button" class="btn-ghost" data-action="${addAction}" data-ex="${ex.id}" style="margin-top:8px;padding:10px 0">Adicionar série</button>
  `;
}

function renderLoadsLogger() {
  const draft = state.loadsDraft;
  const workout = state.workouts.find((w) => w.id === draft.workoutId);
  const rows = draft.rowsByWorkout[draft.workoutId] || {};
  return `
    <div style="padding:16px 20px 28px">
      <button type="button" class="btn-icon" data-action="close-loads" style="color:var(--accent);gap:4px;padding:0;margin-bottom:12px;font-size:13px;font-weight:600">${icon('chevronLeft', 16)} Voltar</button>
      <h2 class="font-head" style="font-size:24px;margin:0">Anotar cargas</h2>
      <p style="color:var(--muted);font-size:13px;margin:6px 0 16px;line-height:1.45">Registra só o peso que quiser. Não precisa completar o treino, passar pelo timer nem preencher repetição. Linha em branco fica de fora.</p>
      <div class="workout-switch">
        ${state.workouts.map((w) => `
          <button type="button" data-action="loads-pick-workout" data-workout="${w.id}" style="border:1px solid ${draft.workoutId === w.id ? 'var(--accent)' : 'var(--border)'};background:${draft.workoutId === w.id ? 'var(--accent)' : 'transparent'};color:${draft.workoutId === w.id ? 'var(--bg)' : 'var(--text)'}">${w.id}</button>
        `).join('')}
      </div>
      <label style="font-size:12px;color:var(--muted);font-weight:600">Data</label>
      <input type="date" id="loads-date" value="${draft.date}" style="margin-top:4px;margin-bottom:14px" />
      ${workout.exercises.map((ex) => {
        const last = lastSetsFor(ex.id);
        return `
          <div class="card" style="margin-bottom:10px">
            <div style="font-weight:700;font-size:14px">${escapeHtml(ex.name)}</div>
            <div style="color:var(--accent-dim);font-size:12.5px;font-weight:600;margin-top:2px">${escapeHtml(ex.scheme)}</div>
            ${last ? `<div style="color:var(--faint);font-size:11.5px;margin-top:3px">Última vez: ${escapeHtml(formatSetsInline(last))}</div>` : ''}
            <div style="margin-top:10px">${renderSetRows('loads', ex, rows[ex.id] || [])}</div>
          </div>`;
      }).join('')}
      <label style="font-size:12px;color:var(--muted);font-weight:600">Observação (opcional)</label>
      <textarea id="loads-note" rows="2" placeholder="Algo pra lembrar dessa carga..." style="margin-top:4px;margin-bottom:16px">${escapeHtml(draft.note)}</textarea>
      <button type="button" class="btn-primary" data-action="loads-save">Salvar cargas</button>
    </div>
  `;
}

function renderEditSession() {
  const draft = state.editDraft;
  return `
    <div style="padding:16px 20px 28px">
      <button type="button" class="btn-icon" data-action="close-edit" style="color:var(--accent);gap:4px;padding:0;margin-bottom:12px;font-size:13px;font-weight:600">${icon('chevronLeft', 16)} Voltar</button>
      <h2 class="font-head" style="font-size:24px;margin:0">Editar treino</h2>
      <p style="color:var(--muted);font-size:13px;margin:6px 0 16px;line-height:1.45">${escapeHtml(draft.workoutName)}. Dá pra mudar carga, repetição, série e o que foi pulado. Salvar substitui este registro.</p>
      <label style="font-size:12px;color:var(--muted);font-weight:600">Data</label>
      <input type="date" id="edit-date" value="${draft.date}" style="margin-top:4px;margin-bottom:14px" />
      ${draft.exercises.map((ex) => `
        <div class="card" style="margin-bottom:10px;${ex.skipped ? 'box-shadow:inset 3px 0 0 var(--danger)' : ''}">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
            <div style="min-width:0">
              <div style="font-weight:700;font-size:14px">${escapeHtml(ex.name)}</div>
              ${ex.scheme ? `<div style="color:var(--accent-dim);font-size:12.5px;font-weight:600;margin-top:2px">${escapeHtml(ex.scheme)}</div>` : ''}
            </div>
            <button type="button" class="btn-pill" data-action="edit-toggle-skip" data-ex="${ex.id}" style="flex-shrink:0;padding:6px 12px;font-size:12px;${ex.skipped ? 'background:var(--danger);color:var(--bg);border-color:var(--danger)' : ''}">${ex.skipped ? 'Desfazer' : 'Pular'}</button>
          </div>
          ${ex.skipped
            ? `<div style="color:var(--danger);font-size:12.5px;margin-top:8px">Marcado como pulado. As séries dele não entram neste registro.</div>`
            : `<div style="margin-top:10px">${renderSetRows('edit', ex, ex.sets)}</div>`}
        </div>
      `).join('')}
      <label style="font-size:12px;color:var(--muted);font-weight:600">Observação</label>
      <textarea id="edit-note" rows="2" placeholder="Como foi, dor, ajuste..." style="margin-top:4px;margin-bottom:16px">${escapeHtml(draft.note)}</textarea>
      <button type="button" class="btn-primary" data-action="edit-save">Salvar alterações</button>
    </div>
  `;
}

// ---------------- Render ----------------
export function render() {
  const app = document.getElementById('app');
  if (state.activeSession) {
    app.innerHTML = renderActiveSession(state, { getLastSetValue, bestEverLoad });
    bindActiveSessionEvents(app, state, { render, showToast, getLastSetValue, bestEverLoad, exitSession, finishSessionFromSummary, initSetInputs });
    return;
  }

  const toast = state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : '';
  if (state.loadsDraft) {
    app.innerHTML = toast + renderLoadsLogger();
    bindGlobalEvents(app, null);
    return;
  }
  if (state.editDraft) {
    app.innerHTML = toast + renderEditSession();
    bindGlobalEvents(app, null);
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
    ${toast}
    ${body}
    ${state.tab === 'historico' && state.historicoSubTab === 'registros' && !browseWorkout ? `
      <button class="fab" data-action="open-log-modal" aria-label="Registrar treino passado">${icon('plus', 24)}</button>` : ''}
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
// Só musculação. O calendário de Cross, HYROX e corrida saiu da interface;
// a programação segue em data/schedule.js e o que já foi marcado no aparelho não é apagado.
function renderHoje() {
  const weekCount = state.sessions.filter((s) => s.date >= daysAgo(6) && s.status === 'completed').length;
  const totalCount = state.sessions.filter((s) => s.status === 'completed').length;
  const motivation = todaysMotivation(MOTIVATIONAL_MESSAGES);
  const suggestedId = suggestedWorkoutId();

  const tracked = state.sessions
    .filter((s) => TRACKED.has(s.status))
    .sort((a, b) => compareSessionsDesc(b, a));
  let lastImprovement = null;
  outer:
  for (let i = tracked.length - 1; i >= 0; i--) {
    const s = tracked[i];
    for (const exId of Object.keys(s.sets || {})) {
      const prevSessions = tracked.slice(0, i).filter((p) => p.sets?.[exId]);
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
      <p style="color:var(--muted);font-size:13px;margin:8px 0 0">Escolhe o treino ou só anota as cargas.</p>
    </div>

    <div style="padding:16px 20px 0">
      ${state.workouts.map((w) => renderWorkoutLauncher(w, suggestedId)).join('')}
      <button type="button" class="btn-ghost" data-action="open-loads" data-workout="${suggestedId}" style="border-color:var(--accent);color:var(--accent);margin-top:4px">Anotar cargas sem fazer o treino</button>
    </div>

    <div style="padding:14px 20px 4px">
      <div class="card card-raised" style="border-left:3px solid var(--accent);padding:18px 20px">
        <p class="font-quote" style="font-size:16px;line-height:1.45;color:var(--text);margin:0">${escapeHtml(motivation)}</p>
      </div>
    </div>
    <div style="display:flex;gap:10px;padding:14px 20px 0">
      <div class="card" style="flex:1;text-align:center;padding:14px 8px">
        <div class="font-head" style="font-size:22px;color:var(--accent)">${weekCount}</div>
        <div style="font-size:10.5px;color:var(--muted);margin-top:2px">Musculação essa semana</div>
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
    <div style="height:8px"></div>
  `;
}

function renderWorkoutLauncher(w, suggestedId) {
  const suggested = w.id === suggestedId;
  return `
    <div class="card" style="margin-bottom:10px;${suggested ? 'box-shadow:inset 0 0 0 1.5px var(--accent)' : ''}">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="font-head" style="width:44px;height:44px;border-radius:50%;background:var(--bg);border:2px solid var(--accent);display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <span style="font-size:18px;color:var(--accent)">${escapeHtml(w.id)}</span>
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:14.5px">${escapeHtml(w.focus)}</div>
          <div style="color:var(--muted);font-size:12px;margin-top:2px">${escapeHtml(w.name)} · ${w.exercises.length} exercícios</div>
          ${suggested ? `<div style="color:var(--accent);font-size:11px;font-weight:800;margin-top:3px;letter-spacing:0.4px">SUGESTÃO</div>` : ''}
        </div>
      </div>
      <button type="button" class="btn-primary" data-action="start-session" data-workout="${w.id}" style="margin-top:12px;padding:13px 0">Começar</button>
    </div>
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
            <div class="font-head" style="width:44px;height:44px;border-radius:50%;background:var(--bg);border:2px solid var(--accent);display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <span style="font-size:18px;color:var(--accent)">${escapeHtml(w.id)}</span>
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
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:14px">
        <button class="btn-ghost" data-action="start-session" data-workout="${workout.id}" style="display:flex;align-items:center;justify-content:center;gap:6px;border-color:var(--accent);color:var(--accent)">${icon('flame', 15)} Iniciar este treino</button>
        <button type="button" class="btn-ghost" data-action="open-loads" data-workout="${workout.id}">Anotar cargas</button>
      </div>
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
function renderHistorico() {
  const sorted = [...state.sessions].sort(compareSessionsDesc);
  const filtered = state.historicoFilter === 'all' ? sorted : sorted.filter((s) => s.workoutId === state.historicoFilter);

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
        ${filtered.length === 0 ? `<div style="color:var(--muted);font-size:13.5px;text-align:center;padding:48px 20px;line-height:1.6">Nenhum treino registrado ainda. Toque em + pra adicionar um treino passado, ou em Cargas pra anotar só o peso.</div>` : ''}
        <div style="display:flex;flex-direction:column;gap:10px">
          ${filtered.map((s) => renderSessionCard(s)).join('')}
        </div>
      ` : renderCargasBody()}
    </div>
  `;
}

function skippedLine(session) {
  const ids = session.skippedExerciseIds || [];
  if (!ids.length) return '';
  const names = ids.map((id) => exerciseName(session.workoutId, id));
  if (names.length === 1) return `Pulado: ${names[0]}`;
  if (names.length === 2) return `Pulados: ${names[0]} e ${names[1]}`;
  return `${names.length} exercícios pulados`;
}

function undoneExercises(session) {
  if (session.status === 'loads' || session.status === 'skipped') return [];
  const workout = state.workouts.find((w) => w.id === session.workoutId);
  if (!workout) return [];
  return workout.exercises.filter((ex) => {
    const has = (session.sets?.[ex.id] || []).length > 0;
    const skipped = (session.skippedExerciseIds || []).includes(ex.id);
    return !has && !skipped;
  });
}

function renderSessionCard(session) {
  const status = STATUS_META[session.status] || STATUS_META.skipped;
  const entries = Object.entries(session.sets || {}).filter(([, arr]) => arr && arr.length);
  const skippedIds = session.skippedExerciseIds || [];
  const undone = undoneExercises(session);
  const hasDetail = entries.length > 0 || skippedIds.length > 0 || undone.length > 0;
  const skipText = skippedLine(session);
  return `
    <div class="card" data-session-card="${session.id}">
      <div style="display:flex;align-items:center;gap:10px;cursor:${hasDetail ? 'pointer' : 'default'}" ${hasDetail ? `data-action="toggle-session-card" data-session="${session.id}"` : ''}>
        <div style="width:32px;height:32px;border-radius:50%;background:${status.bg};display:flex;align-items:center;justify-content:center;flex-shrink:0;color:${status.color}">${icon(status.icon, 15)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:13.5px">${escapeHtml(session.workoutName)}</div>
          <div style="color:var(--muted);font-size:11.5px">${formatDatePT(session.date)} · ${status.label}</div>
        </div>
        <button type="button" class="btn-icon" data-action="edit-session" data-session="${session.id}" style="gap:4px;font-size:12px;font-weight:700;color:var(--accent)">${icon('pencil', 13)} Editar</button>
        <button type="button" class="btn-icon" data-action="delete-session" data-session="${session.id}" style="padding:4px;color:var(--faint)" aria-label="Apagar treino">${icon('trash', 14)}</button>
      </div>
      ${skipText ? `<div style="font-size:12px;color:var(--danger);font-weight:700;margin-top:8px">${escapeHtml(skipText)}</div>` : ''}
      ${session.note ? `<div style="font-size:12px;color:var(--muted);margin-top:8px;font-style:italic">${escapeHtml(session.note)}</div>` : ''}
      <div data-role="session-detail" data-session="${session.id}" style="display:none;margin-top:10px;border-top:1px solid var(--border);padding-top:10px;flex-direction:column;gap:6px">
        ${entries.map(([exId, arr]) => `
          <div style="display:flex;justify-content:space-between;gap:10px;font-size:12px">
            <span style="color:var(--muted)">${escapeHtml(exerciseName(session.workoutId, exId))}</span>
            <span style="font-weight:700;text-align:right">${escapeHtml(formatSetsInline(arr))}</span>
          </div>
        `).join('')}
        ${skippedIds.map((exId) => `
          <div style="display:flex;justify-content:space-between;gap:10px;font-size:12px">
            <span style="color:var(--muted)">${escapeHtml(exerciseName(session.workoutId, exId))}</span>
            <span class="ex-status ex-status-skipped">Pulado</span>
          </div>
        `).join('')}
        ${undone.map((ex) => `
          <div style="display:flex;justify-content:space-between;gap:10px;font-size:12px">
            <span style="color:var(--muted)">${escapeHtml(ex.name)}</span>
            <span class="ex-status ex-status-pending">Não feito</span>
          </div>
        `).join('')}
      </div>
      ${hasDetail ? `<div data-role="session-hint" data-session="${session.id}" style="margin-top:6px;font-size:11px;color:var(--accent-dim)">Toque para ver as cargas</div>` : ''}
    </div>
  `;
}

function renderCargasBody() {
  const allExercises = state.workouts.flatMap((w) => w.exercises.map((e) => ({ ...e, workoutId: w.id })));
  const tracked = state.sessions.filter((s) => TRACKED.has(s.status));

  const rows = allExercises.map((ex) => {
    const hits = tracked.filter((s) => bestSetLoad(s.sets?.[ex.id]) != null).sort((a, b) => -compareSessionsDesc(a, b));
    if (!hits.length) return null;
    const latest = hits[hits.length - 1];
    const prev = hits.length > 1 ? hits[hits.length - 2] : null;
    const latestBest = bestSetLoad(latest.sets[ex.id]);
    const prevBest = prev ? bestSetLoad(prev.sets[ex.id]) : null;
    const latestReps = latest.sets[ex.id].find((s) => bestSetLoad([s]) === latestBest)?.reps;
    return { ex, latestBest, latestReps, prevBest, prevDate: prev?.date, latestDate: latest.date };
  }).filter(Boolean).sort((a, b) => (a.latestDate < b.latestDate ? 1 : -1));

  const button = `<button type="button" class="btn-ghost" data-action="open-loads" data-workout="${suggestedWorkoutId()}" style="border-color:var(--accent);color:var(--accent);margin-bottom:14px">Anotar cargas</button>`;

  if (!rows.length) {
    return `
      ${button}
      <div style="color:var(--muted);font-size:13.5px;text-align:center;padding:28px 12px;line-height:1.6">Ainda não tem carga registrada. Dá pra anotar o peso sem completar o treino.</div>
    `;
  }

  return `
    ${button}
    <p style="color:var(--muted);font-size:13px;margin:0 0 14px">Comparado com o registro anterior de cada exercício. Entra treino feito e carga anotada solta.</p>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${rows.map(({ ex, latestBest, latestReps, prevBest, prevDate, latestDate }) => {
        const delta = prevBest != null && latestBest != null ? latestBest - prevBest : null;
        const deltaColor = delta > 0 ? 'var(--accent)' : delta < 0 ? 'var(--danger)' : 'var(--muted)';
        const deltaText = delta == null ? '' : `${delta > 0 ? '+' : ''}${Number.isInteger(delta) ? delta : delta.toFixed(1)}kg`;
        return `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div>
              <div style="font-weight:700;font-size:14px">${escapeHtml(ex.name)}</div>
              <div style="font-size:12.5px;color:var(--muted);margin-top:4px">Mais recente: <b style="color:var(--text)">${latestBest}kg${latestReps ? ` × ${escapeHtml(latestReps)}` : ''}</b> · ${formatDateShort(latestDate)}</div>
              ${prevBest != null
                ? `<div style="font-size:12px;color:var(--faint);margin-top:2px">Anterior: ${prevBest}kg · ${formatDateShort(prevDate)}</div>`
                : `<div style="font-size:12px;color:var(--faint);margin-top:2px">Ainda sem comparação anterior</div>`}
            </div>
            ${deltaText ? `<div class="font-head" style="font-size:15px;flex-shrink:0;margin-left:10px;color:${deltaColor}">${deltaText}</div>` : ''}
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

      ${renderBackupSection()}

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

// ---------------- BACKUP ----------------
const backupUi = { json: '', importText: '', error: '', pending: null };

function formatBackupWhen(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const day = date.toLocaleDateString('pt-BR');
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${day}, ${time}`;
}

function reloadFromStorage() {
  state.workouts = loadWorkouts();
  state.sessions = loadSessions();
  state.theme = loadTheme();
  document.documentElement.setAttribute('data-theme', state.theme);
}

function renderBackupSection() {
  const last = formatBackupWhen(readLastBackup(localStorage));
  return `
    <div style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Backup</div>
    <div class="card" style="margin-bottom:18px">
      <p style="color:var(--muted);font-size:13px;line-height:1.5;margin:0 0 10px">Seus treinos ficam só neste celular. Exporte uma cópia para guardar nos Arquivos, no iCloud ou enviar para você mesma.</p>
      <div style="font-size:12.5px;font-weight:700;margin-bottom:12px">${last ? `Último backup: ${escapeHtml(last)}` : 'Ainda não exportou um backup neste celular.'}</div>
      <button type="button" class="btn-primary" data-action="export-backup" style="margin-bottom:10px">Exportar backup</button>
        <label class="btn-ghost" style="display:flex;align-items:center;justify-content:center;margin-bottom:10px;cursor:pointer">
        Importar arquivo
        <input id="backup-file" type="file" accept="application/json,.json,text/plain" style="display:none" />
      </label>
      <label style="font-size:12px;color:var(--muted);font-weight:600">Ou cole o backup aqui</label>
      <textarea id="backup-paste" rows="3" placeholder="Cole o JSON do backup" style="margin-top:4px;margin-bottom:8px">${escapeHtml(backupUi.importText)}</textarea>
      <button type="button" class="btn-ghost" data-action="preview-backup-text">Conferir texto colado</button>
      ${backupUi.error ? `<div style="color:var(--danger);font-size:12.5px;font-weight:700;margin-top:10px;line-height:1.4">${escapeHtml(backupUi.error)}</div>` : ''}
      ${backupUi.json ? `
        <label style="font-size:12px;color:var(--muted);font-weight:600;display:block;margin-top:14px">Se o arquivo não abriu, copie o texto</label>
        <textarea id="backup-json" readonly rows="6" style="margin-top:4px;margin-bottom:8px">${escapeHtml(backupUi.json)}</textarea>
        <button type="button" class="btn-ghost" data-action="copy-backup">Copiar</button>
      ` : ''}
    </div>
    ${backupUi.pending ? renderBackupConfirm(backupUi.pending) : ''}
  `;
}

function renderBackupConfirm(pending) {
  const { summary } = pending;
  const range = summary.from
    ? (summary.from === summary.to ? `Data: ${formatDatePT(summary.from)}` : `De ${formatDatePT(summary.from)} a ${formatDatePT(summary.to)}`)
    : 'Sem datas de treino';
  const fichas = summary.workouts == null
    ? ''
    : `<div style="font-size:13.5px;margin-top:4px">${summary.workouts === 1 ? '1 ficha de exercícios' : `${summary.workouts} fichas de exercícios`}</div>`;
  return `
    <div class="sheet-overlay" data-action="cancel-backup-import">
      <div class="sheet" onclick="event.stopPropagation()">
        <div class="sheet-handle"></div>
        <h3 class="font-head" style="font-size:19px;margin:0 0 6px">Substituir os dados deste celular?</h3>
        <p style="color:var(--muted);font-size:13.5px;margin:0 0 14px;line-height:1.5">O que está neste aparelho é trocado pelo backup. Dá para cancelar agora. Se o arquivo for inválido, nada muda.</p>
        <div class="card" style="margin-bottom:16px">
          <div style="font-weight:700;font-size:14px">${summary.sessions === 1 ? '1 treino registrado' : `${summary.sessions} treinos registrados`}</div>
          <div style="color:var(--muted);font-size:13px;margin-top:4px">${range}</div>
          ${fichas}
        </div>
        <button type="button" class="btn-primary" data-action="confirm-backup-import" style="margin-bottom:10px">Substituir meus dados</button>
        <button type="button" class="btn-ghost" data-action="cancel-backup-import">Cancelar</button>
      </div>
    </div>
  `;
}

async function copyBackup() {
  const el = document.getElementById('backup-json');
  const text = (el && el.value) || backupUi.json;
  if (!text) return;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(text);
    else if (el) {
      el.focus();
      el.select();
      document.execCommand('copy');
    }
    showToast('Backup copiado');
  } catch {
    showToast('Selecione o texto e copie.');
  }
}

function markBackupExported(iso) {
  localStorage.setItem(LAST_BACKUP_KEY, JSON.stringify(iso));
}

async function exportBackup() {
  try {
    const now = new Date();
    const payload = buildBackup(localStorage, now);
    const json = JSON.stringify(payload, null, 2);
    const filename = backupFilename(now);
    backupUi.error = '';
    const how = await deliverBackup(json, filename);
    if (how === 'cancel') return;
    markBackupExported(payload.exportedAt);
    backupUi.json = how === 'text' ? json : '';
    if (how === 'share') showToast('Backup enviado');
    else if (how === 'download') showToast('Backup baixado');
    else showToast('Copie o texto do backup');
  } catch (err) {
    console.error(err);
    backupUi.error = 'Não consegui exportar o backup. Nada foi apagado.';
    render();
  }
}

function previewBackupText(text, { remember = true } = {}) {
  if (remember) backupUi.importText = text;
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    backupUi.pending = null;
    backupUi.error = 'O texto não é um JSON válido. Nada foi alterado.';
    render();
    return;
  }
  const result = validateBackup(data);
  if (!result.ok) {
    backupUi.pending = null;
    backupUi.error = result.error;
    render();
    return;
  }
  backupUi.error = '';
  backupUi.pending = result;
  render();
}

function confirmBackupImport() {
  const pending = backupUi.pending;
  if (!pending) return;
  try {
    restoreBackup(localStorage, pending.keys);
    if (pending.exportedAt) localStorage.setItem(LAST_BACKUP_KEY, JSON.stringify(pending.exportedAt));
  } catch (err) {
    console.error(err);
    backupUi.error = 'Não consegui gravar o backup. Seus dados continuam como estavam.';
    backupUi.pending = null;
    render();
    return;
  }
  backupUi.pending = null;
  backupUi.error = '';
  backupUi.importText = '';
  backupUi.json = '';
  reloadFromStorage();
  showToast('Backup restaurado');
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
        <div class="workout-switch">
          ${state.workouts.map((w) => `
            <button type="button" data-action="retro-pick-workout" data-workout="${w.id}" style="border:1px solid ${retroDraft.workoutId === w.id ? 'var(--accent)' : 'var(--border)'};background:${retroDraft.workoutId === w.id ? 'var(--accent)' : 'transparent'};color:${retroDraft.workoutId === w.id ? 'var(--bg)' : 'var(--text)'}">${w.id}</button>
          `).join('')}
        </div>
        <label style="font-size:12px;color:var(--muted);font-weight:600">Data</label>
        <input type="date" id="retro-date" value="${retroDraft.date}" style="margin-top:4px;margin-bottom:14px" />
        <div style="display:flex;gap:8px;margin-bottom:16px">
          <button type="button" data-action="retro-set-completed" data-val="true" style="flex:1;padding:10px 0;border-radius:10px;border:1px solid ${retroDraft.completed ? 'var(--accent)' : 'var(--border)'};background:${retroDraft.completed ? 'var(--accent)' : 'transparent'};color:${retroDraft.completed ? 'var(--bg)' : 'var(--text)'};font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px">${icon('check', 15)} Fiz</button>
          <button type="button" data-action="retro-set-completed" data-val="false" style="flex:1;padding:10px 0;border-radius:10px;border:1px solid ${!retroDraft.completed ? 'var(--danger)' : 'var(--border)'};background:${!retroDraft.completed ? 'var(--danger)' : 'transparent'};color:${!retroDraft.completed ? 'var(--bg)' : 'var(--text)'};font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px">${icon('x', 15)} Não fiz</button>
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
      handleAction(el.dataset.action, el.dataset);
    });
  });

  const dateInput = document.getElementById('retro-date');
  if (dateInput) dateInput.addEventListener('change', (e) => { retroDraft.date = e.target.value; });
  const noteInput = document.getElementById('retro-note');
  if (noteInput) noteInput.addEventListener('input', (e) => { retroDraft.note = e.target.value; });
  app.querySelectorAll('[data-role="retro-load"]').forEach((el) => {
    el.addEventListener('input', (e) => { retroDraft.loads[el.dataset.ex] = e.target.value; });
  });

  const backupFile = document.getElementById('backup-file');
  if (backupFile) {
    backupFile.addEventListener('change', () => {
      const file = backupFile.files && backupFile.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => previewBackupText(String(reader.result || ''), { remember: false });
      reader.onerror = () => {
        backupUi.error = 'Não consegui ler o arquivo. Nada foi alterado.';
        backupUi.pending = null;
        render();
      };
      reader.readAsText(file);
    });
  }
  const backupPaste = document.getElementById('backup-paste');
  if (backupPaste) backupPaste.addEventListener('input', (e) => { backupUi.importText = e.target.value; });

  if (browseWorkout) {
    app.querySelectorAll('[data-role="edit-video-url"]').forEach((el) => {
      el.addEventListener('blur', (e) => updateExercise(browseWorkout.id, el.dataset.ex, { videoUrl: e.target.value.trim() }));
    });
    app.querySelectorAll('[data-role="edit-note"]').forEach((el) => {
      el.addEventListener('blur', (e) => updateExercise(browseWorkout.id, el.dataset.ex, { note: e.target.value }));
    });
  }
  bindDraftInputs(app);
}

function bindDraftInputs(app) {
  if (state.loadsDraft) {
    const rowsOf = () => state.loadsDraft?.rowsByWorkout[state.loadsDraft.workoutId];
    app.querySelectorAll('[data-role="loads-carga"]').forEach((el) => {
      el.addEventListener('input', () => {
        const list = rowsOf()?.[el.dataset.ex];
        if (list && list[el.dataset.idx]) list[el.dataset.idx].carga = el.value;
      });
    });
    app.querySelectorAll('[data-role="loads-reps"]').forEach((el) => {
      el.addEventListener('input', () => {
        const list = rowsOf()?.[el.dataset.ex];
        if (list && list[el.dataset.idx]) list[el.dataset.idx].reps = el.value;
      });
    });
    const date = document.getElementById('loads-date');
    if (date) date.addEventListener('input', () => { if (state.loadsDraft) state.loadsDraft.date = date.value; });
    const note = document.getElementById('loads-note');
    if (note) note.addEventListener('input', () => { if (state.loadsDraft) state.loadsDraft.note = note.value; });
  }
  if (state.editDraft) {
    const findEx = (id) => state.editDraft?.exercises.find((e) => e.id === id);
    app.querySelectorAll('[data-role="edit-carga"]').forEach((el) => {
      el.addEventListener('input', () => {
        const ex = findEx(el.dataset.ex);
        if (ex && ex.sets[el.dataset.idx]) ex.sets[el.dataset.idx].carga = el.value;
      });
    });
    app.querySelectorAll('[data-role="edit-reps"]').forEach((el) => {
      el.addEventListener('input', () => {
        const ex = findEx(el.dataset.ex);
        if (ex && ex.sets[el.dataset.idx]) ex.sets[el.dataset.idx].reps = el.value;
      });
    });
    const date = document.getElementById('edit-date');
    if (date) date.addEventListener('input', () => { if (state.editDraft) state.editDraft.date = date.value; });
    const note = document.getElementById('edit-note');
    if (note) note.addEventListener('input', () => { if (state.editDraft) state.editDraft.note = note.value; });
  }
}

function handleAction(action, ds) {
  if (action !== 'loads-save' && action !== 'edit-save') syncOpenDrafts();
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
    case 'start-session':
      startSession(ds.workout); break;
    case 'open-loads':
      openLoadsLogger(ds.workout); break;
    case 'close-loads':
      state.loadsDraft = null; render(); break;
    case 'loads-pick-workout':
      state.loadsDraft.workoutId = ds.workout;
      ensureLoadsRows(ds.workout);
      render();
      break;
    case 'loads-add-set':
      state.loadsDraft.rowsByWorkout[state.loadsDraft.workoutId][ds.ex].push(blankRow());
      render();
      break;
    case 'loads-remove-set':
      state.loadsDraft.rowsByWorkout[state.loadsDraft.workoutId][ds.ex].splice(Number(ds.idx), 1);
      render();
      break;
    case 'loads-save':
      saveLoads(); break;
    case 'edit-session': {
      const session = state.sessions.find((s) => s.id === ds.session);
      if (!session) break;
      state.editDraft = buildEditDraft(session);
      render();
      break;
    }
    case 'close-edit':
      state.editDraft = null; render(); break;
    case 'edit-toggle-skip': {
      const ex = state.editDraft.exercises.find((e) => e.id === ds.ex);
      if (!ex) break;
      ex.skipped = !ex.skipped;
      if (!ex.skipped && !ex.sets.length) ex.sets.push(blankRow());
      render();
      break;
    }
    case 'edit-add-set': {
      const ex = state.editDraft.exercises.find((e) => e.id === ds.ex);
      if (ex) ex.sets.push(blankRow());
      render();
      break;
    }
    case 'edit-remove-set': {
      const ex = state.editDraft.exercises.find((e) => e.id === ds.ex);
      if (ex) ex.sets.splice(Number(ds.idx), 1);
      render();
      break;
    }
    case 'edit-save':
      saveEdit(); break;
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
    case 'export-backup':
      exportBackup(); break;
    case 'copy-backup':
      copyBackup(); break;
    case 'preview-backup-text': {
      const paste = document.getElementById('backup-paste');
      previewBackupText(paste ? paste.value : backupUi.importText);
      break;
    }
    case 'cancel-backup-import':
      backupUi.pending = null; render(); break;
    case 'confirm-backup-import':
      confirmBackupImport(); break;
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
        Object.entries(retroDraft.loads).forEach(([exId, v]) => {
          const logged = collectLoggedSets([{ carga: v, reps: '' }]);
          if (logged.length) sets[exId] = logged;
        });
      }
      const session = {
        id: uid(), workoutId: retroDraft.workoutId, workoutName: workout.name, date: retroDraft.date,
        status: retroDraft.completed ? 'completed' : 'skipped', sets, skippedExerciseIds: [], note: retroDraft.note.trim(),
      };
      state.logModalOpen = false;
      saveSession(session);
      break;
    }
    default: break;
  }
}

render();
