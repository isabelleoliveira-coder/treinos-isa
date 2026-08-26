import { DEFAULT_WORKOUTS } from '../data/workouts.js';

const KEYS = {
  workouts: 'treinosIsa.workouts',
  sessions: 'treinosIsa.sessions',
  theme: 'treinosIsa.theme',
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

// Migra sessões antigas (formato loads) para o formato novo (sets)
function normalizeSession(s) {
  if (s.sets) return s;
  const sets = {};
  if (s.loads) {
    Object.entries(s.loads).forEach(([exId, val]) => {
      if (val !== '' && val != null) sets[exId] = [{ carga: val, reps: null }];
    });
  }
  return { ...s, sets, status: s.completed ? 'completed' : 'skipped' };
}

export function loadWorkouts() {
  return safeGet(KEYS.workouts, DEFAULT_WORKOUTS);
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
