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
