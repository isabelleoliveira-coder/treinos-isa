// Tudo que o app guarda no celular usa este prefixo. O backup lista as chaves
// pelo prefixo, então um dado novo entra sozinho no arquivo.
export const STORAGE_PREFIX = 'treinosIsa.';
export const LAST_BACKUP_KEY = 'treinosIsa.lastBackup';

export function readPrefixedRaw(storage) {
  const keys = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
    keys[key] = storage.getItem(key);
  }
  return keys;
}

function decodeStored(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function buildBackup(storage, now = new Date()) {
  const keys = {};
  Object.entries(readPrefixedRaw(storage)).forEach(([key, raw]) => {
    keys[key] = decodeStored(raw);
  });
  return {
    app: 'treinos-isa',
    exportedAt: now.toISOString(),
    keys,
  };
}

export function backupFilename(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `treinos-isa-backup-${y}-${m}-${d}.json`;
}

export function readLastBackup(storage) {
  try {
    const raw = storage.getItem(LAST_BACKUP_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    return typeof value === 'string' ? value : null;
  } catch {
    return null;
  }
}

export function summarizeBackup(keys) {
  const sessions = Array.isArray(keys['treinosIsa.sessions']) ? keys['treinosIsa.sessions'] : [];
  const workouts = Array.isArray(keys['treinosIsa.workouts']) ? keys['treinosIsa.workouts'] : null;
  const dates = sessions
    .map((s) => s && s.date)
    .filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
  return {
    sessions: sessions.length,
    workouts: workouts ? workouts.length : null,
    from: dates[0] || null,
    to: dates[dates.length - 1] || null,
  };
}

function invalid(error) {
  return { ok: false, error };
}

export function validateBackup(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || !data.keys || typeof data.keys !== 'object' || Array.isArray(data.keys)) {
    return invalid('Esse arquivo não é um backup do Treinos Isa. Nada foi alterado.');
  }
  const keys = {};
  Object.entries(data.keys).forEach(([key, value]) => {
    if (typeof key === 'string' && key.startsWith(STORAGE_PREFIX) && value !== undefined) keys[key] = value;
  });
  if (!Object.keys(keys).length) {
    return invalid('Não achei nenhum dado do Treinos Isa nesse arquivo. Nada foi alterado.');
  }
  const sessions = keys['treinosIsa.sessions'];
  if (sessions != null && !Array.isArray(sessions)) {
    return invalid('A lista de treinos está inválida. Nada foi alterado.');
  }
  const workouts = keys['treinosIsa.workouts'];
  if (workouts != null) {
    const bad = !Array.isArray(workouts) || workouts.length === 0 || workouts.some((w) => (
      !w || typeof w !== 'object' || typeof w.id !== 'string' || !Array.isArray(w.exercises)
    ));
    if (bad) return invalid('As fichas de exercícios estão inválidas. Nada foi alterado.');
  }
  const theme = keys['treinosIsa.theme'];
  if (theme != null && theme !== 'dark' && theme !== 'light') {
    return invalid('O tema nesse backup não é válido. Nada foi alterado.');
  }
  const schedule = keys['treinosIsa.scheduleLog'];
  if (schedule != null && (typeof schedule !== 'object' || Array.isArray(schedule))) {
    return invalid('O registro antigo da semana está inválido. Nada foi alterado.');
  }
  return {
    ok: true,
    keys,
    summary: summarizeBackup(keys),
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : null,
  };
}

// Troca as chaves do app pelas do backup. Se a gravação falhar, devolve o que estava antes.
export function restoreBackup(storage, keys) {
  const snapshot = readPrefixedRaw(storage);
  const entries = Object.entries(keys).filter(([key, value]) => key.startsWith(STORAGE_PREFIX) && value !== undefined);
  try {
    Object.keys(snapshot).forEach((key) => storage.removeItem(key));
    entries.forEach(([key, value]) => storage.setItem(key, JSON.stringify(value)));
  } catch (err) {
    const leftover = Object.keys(readPrefixedRaw(storage));
    leftover.forEach((key) => storage.removeItem(key));
    Object.entries(snapshot).forEach(([key, value]) => storage.setItem(key, value));
    throw err;
  }
}

export function isStandaloneDisplay() {
  try {
    return window.navigator.standalone === true
      || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  } catch {
    return false;
  }
}

function triggerDownload(json, filename) {
  try {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2500);
    return true;
  } catch {
    return false;
  }
}

// iPhone instalado: compartilhar o arquivo. Senão, baixar. No app da tela de início
// o download costuma não abrir, então o texto fica na tela para copiar.
export async function deliverBackup(json, filename) {
  const file = new File([json], filename, { type: 'application/json' });
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const data = { files: [file], title: 'Backup Treinos Isa' };
      if (typeof navigator.canShare !== 'function' || navigator.canShare(data)) {
        await navigator.share(data);
        return 'share';
      }
    } catch (err) {
      if (err && err.name === 'AbortError') return 'cancel';
    }
  }
  const downloaded = triggerDownload(json, filename);
  if (downloaded && !isStandaloneDisplay()) return 'download';
  return 'text';
}
