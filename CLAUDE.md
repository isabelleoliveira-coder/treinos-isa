# Treinos Isa

App pessoal de treino da Isa, com o protocolo de musculação da personal
trainer Déka Lagranha (`data/workouts.js` → `PROTOCOL_INFO`), incluindo
também uma camada leve de programação semanal para as sessões de Cross,
HYROX e corrida que complementam a musculação.

## Arquitetura

JavaScript puro (sem framework, sem bundler, sem build step) rodando como
PWA offline. O estado vive em memória (`state` em `js/app.js`) e é
persistido em `localStorage` — não há backend nem sincronização entre
aparelhos (ver `LEIA-ME.md`).

O app renderiza via re-render completo de string HTML a cada mudança de
estado (função `render()` em `js/app.js`), sem virtual DOM.

### Estrutura de pastas

- `index.html` — shell da página, registra o service worker.
- `manifest.json` — manifesto do PWA (ícones, tema, modo standalone).
- `service-worker.js` — cache-first do app shell para uso offline; requests
  cross-origin (ex: player do YouTube) vão direto pra rede.
- `js/app.js` — estado global, lógica de tela e renderização principal.
- `js/screens/session.js` — tela da sessão de treino ativa (série, timer de
  descanso, registro de carga/reps).
- `js/storage.js` — toda leitura/escrita em `localStorage`, incluindo
  migração de sessões salvas em formato antigo.
- `js/icons.js` — ícones SVG inline usados na UI.
- `js/utils.js` — helpers (datas, parsing de YouTube, formatação, etc.).
- `data/workouts.js` — protocolo de musculação (`PROTOCOL_INFO`, treinos
  padrão, dicas, mensagens motivacionais).
- `data/schedule.js` — programação semanal de sessões (Cross/HYROX/corrida).
- `data/avatar.js` — URL do avatar exibido na tela inicial.
- `assets/` — ícones do PWA.

## Decisões de design

- **Tema escuro** (padrão): fundo quase preto (`--bg: #121310`) com
  **verde-lima** (`--accent: #D6FF3F`) como cor de destaque.
- **Tema claro**: fundo bege claro (`--bg: #FAF7F8`) com **rosa**
  (`--accent: #D6336C`) como cor de destaque.
- Ambos os temas são declarados em `css/styles.css` via
  `:root[data-theme="dark"]` / `:root[data-theme="light"]`, aplicados no
  `<html>` a partir do valor salvo em `loadTheme()`.
- **Tipografia**: headers e números grandes usam fonte condensada
  (`.font-head` → "Arial Narrow"/"Helvetica Neue"), reforçando o visual de
  app de treino/atlético. A frase motivacional do dia usa **Fraunces**
  itálica (`.font-quote`), carregada do Google Fonts, para um contraste
  editorial/pessoal com o resto da UI condensada.

## Programação semanal (`data/schedule.js`)

A tela "Minha Semana" / "Hoje" é resolvida por `getSessionsForDate(dateISO)`,
que segue uma regra de prioridade única:

1. **`WEEK_OVERRIDES`** — mapa de exceções pontuais indexado por data exata
   (`'YYYY-MM-DD'`). Se a data pedida existir aqui, essas sessões são usadas
   e o padrão semanal é ignorado. Serve para semanas de transição ou ajustes
   pontuais (ex: trocar a sessão de um dia específico sem alterar a
   recorrência).
2. **`WEEKLY_SCHEDULE`** — padrão recorrente, indexado por dia da semana
   (`segunda`...`domingo`, ver `DAY_ORDER`/`DAY_KEY_BY_JS_INDEX`). Usado
   sempre que a data não tem override.

Cada sessão tem `id`, `type`, `emoji`, `label` e, opcionalmente, `subtitle`,
`intensity` (`leve`/`moderada`/`alta`, usada na cor do `.intensity-dot`) e
`workoutLink: true` quando a sessão aponta para uma ficha de musculação já
cadastrada em `data/workouts.js` (não duplica exercícios aqui).

O progresso de cada sessão (feita ou não) é guardado separadamente em
`state.scheduleLog`, com chave `` `${dateISO}:${sessionId}` ``, persistido via
`loadScheduleLog`/`saveScheduleLog` em `js/storage.js` — os dados de
`schedule.js` são só a definição da programação; o que foi concluído mora no
log.
