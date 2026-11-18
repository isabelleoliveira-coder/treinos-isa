import { DEFAULT_WORKOUTS, WORKOUT_PLAN_ID } from '../data/workouts.js';

const KEYS = {
  workouts: 'treinosIsa.workouts',
  sessions: 'treinosIsa.sessions',
  theme: 'treinosIsa.theme',
  scheduleLog: 'treinosIsa.scheduleLog',
  workoutPlanId: 'treinosIsa.workoutPlanId',
  archivedWorkouts: 'treinosIsa.archivedWorkouts',
  activeSession: 'treinosIsa.activeSession',
};

function safeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error('Falha ao salvar', key, err);
    return false;
  }
}

// Migra sessões antigas (formato loads) para o formato novo (sets).
// skippedExerciseIds entra vazio nos registros antigos — nada é apagado.
function normalizeSession(s) {
  let next = s;
  if (!s.sets) {
    const sets = {};
    if (s.loads) {
      Object.entries(s.loads).forEach(([exId, val]) => {
        if (val !== '' && val != null) sets[exId] = [{ carga: val, reps: null }];
      });
    }
    next = { ...s, sets, status: s.completed ? 'completed' : 'skipped' };
  }
  if (!Array.isArray(next.skippedExerciseIds)) {
    next = { ...next, skippedExerciseIds: [] };
  }
  // Registro antigo pode ter `completed: true` e já ter `sets`, sem `status`.
  // Sem isso, editar o card tiraria o treino da contagem da semana.
  if (!next.status) {
    const anySets = !!(next.sets && Object.keys(next.sets).some((id) => (next.sets[id] || []).length));
    let status = 'skipped';
    if (next.completed === true) status = 'completed';
    else if (anySets) status = 'partial';
    next = { ...next, status };
  }
  return next;
}

// O app tem um plano atual só. Quando a planilha muda, as fichas que já
// estavam salvas neste celular vão para o arquivo (não se apagam) e o plano
// novo entra. O histórico de sessões não é mexido.
export function loadWorkouts() {
  try {
    const storedPlan = JSON.parse(localStorage.getItem(KEYS.workoutPlanId) || 'null');
    if (storedPlan === WORKOUT_PLAN_ID) return safeGet(KEYS.workouts, DEFAULT_WORKOUTS);
    const stored = safeGet(KEYS.workouts, null);
    if (Array.isArray(stored) && stored.length) {
      const archive = safeGet(KEYS.archivedWorkouts, []);
      const list = Array.isArray(archive) ? archive : [];
      list.push({
        planId: typeof storedPlan === 'string' ? storedPlan : null,
        archivedAt: new Date().toISOString(),
        workouts: stored,
      });
      safeSet(KEYS.archivedWorkouts, list);
      localStorage.removeItem(KEYS.workouts);
    }
    safeSet(KEYS.workoutPlanId, WORKOUT_PLAN_ID);
  } catch {
    // Sem localStorage (por exemplo num teste) usa o plano que veio no arquivo.
  }
  return safeGet(KEYS.workouts, DEFAULT_WORKOUTS);
}

export function loadArchivedWorkoutLists() {
  const raw = safeGet(KEYS.archivedWorkouts, []);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => (entry && Array.isArray(entry.workouts) ? entry.workouts : null))
    .filter(Boolean);
}

export function loadActiveSession() {
  const raw = safeGet(KEYS.activeSession, null);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (typeof raw.workoutId !== 'string' || !raw.workoutId) return null;
  return raw;
}

export function saveActiveSession(session) {
  return safeSet(KEYS.activeSession, session);
}

export function clearActiveSession() {
  try {
    localStorage.removeItem(KEYS.activeSession);
    return true;
  } catch {
    return false;
  }
}
export function saveWorkouts(workouts) {
  return safeSet(KEYS.workouts, workouts);
}
export function loadSessions() {
  const raw = safeGet(KEYS.sessions, []);
  return raw.map(normalizeSession);
}
export function saveSessions(sessions) {
  return safeSet(KEYS.sessions, sessions);
}
export function loadTheme() {
  return safeGet(KEYS.theme, 'dark');
}
export function saveTheme(theme) {
  return safeSet(KEYS.theme, theme);
}
// O calendário de Cross/HYROX/corrida saiu da interface. Estas funções
// continuam aqui para não apagar o registro antigo (treinosIsa.scheduleLog)
// que já está no aparelho — o app só não lê mais esse calendário na tela.
export function loadScheduleLog() {
  return safeGet(KEYS.scheduleLog, {});
}
export function saveScheduleLog(log) {
  return safeSet(KEYS.scheduleLog, log);
}
