import { CLASSIC_WORKOUTS, DEFAULT_WORKOUTS, DG_WORKOUTS, WORKOUT_PLAN_ID } from '../data/workouts.js';

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

// Uma versão anterior deste app chegou a trocar A/B/C pela planilha.
// Se o celular ficou nesse estado, as fichas arquivadas voltam a ficar ativas.
const REPLACED_PLAN_ID = 'dg-planilha-2026-11';
const CLASSIC_IDS = ['A', 'B', 'C'];
const DG_IDS = ['1', '2', '3', '4'];

function validWorkouts(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((w) => w && typeof w.id === 'string' && Array.isArray(w.exercises));
}

// Se a ficha da planilha já foi salva sem o link, completa o vídeo vazio
// com o da planilha. Um link que a Isa colocou no celular fica como está.
function fillBlankVideos(storedW, fileW) {
  if (!storedW) return fileW;
  if (!fileW) return storedW;
  const fileById = new Map((fileW.exercises || []).map((e) => [e.id, e]));
  let changed = false;
  const exercises = storedW.exercises.map((e) => {
    const fromFile = fileById.get(e.id);
    if (fromFile && !String(e.videoUrl || '').trim() && fromFile.videoUrl) {
      changed = true;
      return { ...e, videoUrl: fromFile.videoUrl };
    }
    return e;
  });
  return changed ? { ...storedW, exercises } : storedW;
}

// As fichas já salvas no aparelho ganham. O arquivo só completa o que falta
// (A/B/C se sumiram, e os Treinos 1 a 4 da planilha).
export function combineWorkoutPlans(storedList, recoveredList = []) {
  const byId = new Map();
  validWorkouts(storedList).forEach((w) => byId.set(w.id, w));
  validWorkouts(recoveredList).forEach((w) => {
    if (!byId.has(w.id)) byId.set(w.id, w);
  });
  const pick = (id, fallback) => byId.get(id) || fallback.find((w) => w.id === id);
  const classic = CLASSIC_IDS.map((id) => pick(id, CLASSIC_WORKOUTS)).filter(Boolean);
  const dg = DG_IDS.map((id) => fillBlankVideos(byId.get(id), DG_WORKOUTS.find((w) => w.id === id))).filter(Boolean);
  const known = new Set([...CLASSIC_IDS, ...DG_IDS]);
  const extras = [];
  byId.forEach((w, id) => {
    if (!known.has(id)) extras.push(w);
  });
  return [...classic, ...extras, ...dg];
}

// O app mostra os dois planos juntos. Nada que já está no celular é arquivado
// nem substituído: A, B e C salvos continuam, e os Treinos 1 a 4 entram junto.
export function loadWorkouts() {
  try {
    const storedPlan = JSON.parse(localStorage.getItem(KEYS.workoutPlanId) || 'null');
    let stored = safeGet(KEYS.workouts, null);
    let recovered = [];
    if (storedPlan === REPLACED_PLAN_ID) {
      recovered = loadArchivedWorkoutLists().flat();
      const phone = new Map(validWorkouts(stored).map((w) => [w.id, w]));
      validWorkouts(recovered).forEach((w) => phone.set(w.id, w));
      stored = [...phone.values()];
    }
    if (!validWorkouts(stored).length && !validWorkouts(recovered).length) {
      safeSet(KEYS.workoutPlanId, WORKOUT_PLAN_ID);
      return DEFAULT_WORKOUTS;
    }
    const merged = combineWorkoutPlans(stored, recovered);
    const storedValid = validWorkouts(stored);
    const same = storedPlan === WORKOUT_PLAN_ID
      && storedValid.length === merged.length
      && storedValid.every((w, i) => w === merged[i]);
    if (!same) {
      safeSet(KEYS.workouts, merged);
      safeSet(KEYS.workoutPlanId, WORKOUT_PLAN_ID);
    }
    return merged;
  } catch {
    return DEFAULT_WORKOUTS;
  }
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
