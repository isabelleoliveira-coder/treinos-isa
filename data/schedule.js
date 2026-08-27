// Camada de programação/calendário. NÃO contém exercícios de Cross ou HYROX —
// apenas o rótulo da sessão do dia. Musculação aponta pro workout já cadastrado
// (workoutLink: true → abre a ficha existente, sem duplicar nada).

export const DAY_ORDER = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];

export const DAY_LABELS = {
  segunda: 'Segunda', terca: 'Terça', quarta: 'Quarta', quinta: 'Quinta',
  sexta: 'Sexta', sabado: 'Sábado', domingo: 'Domingo',
};
export const DAY_LABELS_SHORT = {
  segunda: 'SEG', terca: 'TER', quarta: 'QUA', quinta: 'QUI',
  sexta: 'SEX', sabado: 'SÁB', domingo: 'DOM',
};

// JS Date.getDay(): 0=domingo, 1=segunda, ... 6=sábado
export const DAY_KEY_BY_JS_INDEX = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

export const WEEKLY_SCHEDULE = {
  segunda: [
    { id: 'seg-cross', type: 'cross', emoji: '🔥', label: 'Cross' },
  ],
  terca: [
    { id: 'ter-corrida', type: 'corrida', emoji: '🏃', label: 'Corrida fácil', subtitle: '5–6 km', intensity: 'leve' },
    { id: 'ter-cross', type: 'cross', emoji: '🔥', label: 'Cross' },
    { id: 'ter-fortalecimento', type: 'fortalecimento', emoji: '🦵', label: 'Fortalecimento de corrida', subtitle: '20–25 min', intensity: 'leve' },
  ],
  quarta: [
    { id: 'qua-cross', type: 'cross', emoji: '🔥', label: 'Cross', subtitle: 'Bastante corrida — controlar intensidade', intensity: 'moderada' },
  ],
  quinta: [
    { id: 'qui-hyrox', type: 'hyrox', emoji: '🟧', label: 'HYROX', intensity: 'alta' },
  ],
  sexta: [
    { id: 'sex-cross', type: 'cross', emoji: '🔥', label: 'Cross', subtitle: 'Corrida/condicionamento — controlar intensidade', intensity: 'moderada' },
  ],
  sabado: [
    { id: 'sab-longao', type: 'corrida', emoji: '🏃', label: 'Longão', subtitle: '10–12 km', intensity: 'alta' },
    { id: 'sab-musculacao', type: 'musculacao', emoji: '🏋️', label: 'Musculação', workoutLink: true },
  ],
  domingo: [
    { id: 'dom-hyrox', type: 'hyrox', emoji: '🟧', label: 'HYROX', intensity: 'alta' },
  ],
};

export function getTodayDayKey() {
  return DAY_KEY_BY_JS_INDEX[new Date().getDay()];
}

// Exceções pontuais por data — usadas só nesta semana de transição (antes da
// programação recorrente começar, na segunda 31/08). A partir daí, cada data
// já cai certinho no dia da semana correspondente do WEEKLY_SCHEDULE acima.
export const WEEK_OVERRIDES = {
  '2026-08-28': [ // sexta
    { id: 'ovr-2026-08-28-corrida', type: 'corrida', emoji: '🏃', label: 'Corrida' },
    { id: 'ovr-2026-08-28-musculacao', type: 'musculacao', emoji: '🏋️', label: 'Musculação', workoutLink: true },
  ],
  '2026-08-29': [ // sábado
    { id: 'ovr-2026-08-29-cross', type: 'cross', emoji: '🔥', label: 'Cross' },
  ],
  '2026-08-30': [ // domingo
    { id: 'ovr-2026-08-30-longao', type: 'corrida', emoji: '🏃', label: 'Longão de corrida', intensity: 'alta' },
    { id: 'ovr-2026-08-30-musculacao', type: 'musculacao', emoji: '🏋️', label: 'Musculação', workoutLink: true },
  ],
};

// Ponto único de leitura: dá prioridade à exceção da data específica;
// se não houver, cai no padrão recorrente do dia da semana.
export function getSessionsForDate(dateISO) {
  if (WEEK_OVERRIDES[dateISO]) return WEEK_OVERRIDES[dateISO];
  const [y, m, d] = dateISO.split('-').map(Number);
  const dayKey = DAY_KEY_BY_JS_INDEX[new Date(y, m - 1, d).getDay()];
  return WEEKLY_SCHEDULE[dayKey] || [];
}
