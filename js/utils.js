export function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/,
  ];
  for (const p of patterns) { const m = url.match(p); if (m) return m[1]; }
  return null;
}

export function todayISO() { return new Date().toISOString().slice(0, 10); }

export function formatDatePT(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function formatDateShort(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function bestSetLoad(setsArr) {
  if (!setsArr || !setsArr.length) return null;
  const vals = setsArr.map((s) => parseFloat(s.carga)).filter((v) => !isNaN(v));
  return vals.length ? Math.max(...vals) : null;
}

// Número puro ("12,5", "12.5"). Texto como "20kg" ou "20 cada lado" não é número.
export function cleanCarga(value) {
  const s = String(value ?? '').trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return String(n);
}

// Mantém o texto da carga. Só normaliza vírgula quando a linha inteira é um número.
// Linha some apenas se carga e repetição estão vazias.
export function keepCargaText(value) {
  const s = String(value ?? '').trim();
  if (/^\d+,\d+$/.test(s)) return s.replace(',', '.');
  return s;
}

export function collectLoggedSets(rows) {
  const out = [];
  (rows || []).forEach((row) => {
    const carga = keepCargaText(row?.carga);
    const reps = String(row?.reps ?? '').trim();
    if (!carga && !reps) return;
    out.push({ carga, reps: reps || null });
  });
  return out;
}

export function formatSetLoad(set) {
  if (!set) return '';
  const carga = set.carga == null ? '' : String(set.carga).trim();
  const reps = set.reps == null ? '' : String(set.reps).trim();
  if (!carga && !reps) return '';
  const load = !carga ? '' : (/^\d+([.,]\d+)?$/.test(carga) ? `${carga.replace(',', '.')}kg` : carga);
  if (load && reps) return `${load}×${reps}`;
  return load || reps;
}

// Status de um registro já salvo, depois de editar séries / pulos.
// "Fiz" / concluído continua concluído se ainda houver alguma carga —
// registros antigos não têm série em todo exercício da ficha.
export function deriveEditedStatus(original, doneCount, exerciseCount, skipCount) {
  if (doneCount === 0) return 'skipped';
  if (original === 'loads') return 'loads';
  if (original === 'completed') return 'completed';
  if (skipCount === 0 && doneCount === exerciseCount) return 'completed';
  return 'partial';
}

// Encerrar a sessão: pendente ou pela metade não vira "concluído".
// forceCompleted é o atalho explícito "Marcar treino como feito".
export function deriveFinishedStatus({ anySets, forceCompleted, allResolved }) {
  if (forceCompleted) return 'completed';
  if (!anySets) return 'skipped';
  if (!allResolved) return 'partial';
  return 'completed';
}

export function daysUntilSummer() {
  const now = new Date();
  let dec21 = new Date(now.getFullYear(), 11, 21);
  if (now > dec21) dec21 = new Date(now.getFullYear() + 1, 11, 21);
  return Math.ceil((dec21 - now) / 86400000);
}

export function todaysMotivation(messages) {
  const dayIndex = Math.floor(Date.now() / 86400000);
  const idx = dayIndex % messages.length;
  if (messages[idx] === null) return `${daysUntilSummer()} dias para o verão.`;
  return messages[idx];
}

export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
