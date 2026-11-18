export const PROTOCOL_INFO = {
  aluna: 'Isa',
  inicio: '24/08/2026',
  objetivo: 'Treinos A, B e C da Déka, e também a planilha DG (Treinos 1 a 4). Os dois ficam na tela Hoje para escolher.',
  personal: 'Déka Lagranha',
};

// Marca que este celular já recebeu os Treinos 1 a 4 junto com A, B e C.
// Não troca o plano: as fichas salvas no aparelho continuam ativas.
export const WORKOUT_PLAN_ID = 'abc-e-dg-2026-11';

export const TIPS = [
  { label: 'Aquecimento', value: '5–10 min para preparar e ativar os músculos' },
  { label: 'Alongamento após', value: 'Foco em relaxar, recuperar e prevenir dores' },
  { label: 'Cadência', value: 'Seguir o tempo indicado (ex: 3010, 2020), sempre com controle' },
  { label: 'Cargas', value: 'Aumentar sempre que possível, quando o exercício ficar fácil' },
];

// Textos da planilha (aba DG), abaixo dos quatro treinos. Valem para o ciclo
// inteiro — não são exercícios de um treino só.
export const CYCLE_WEEKS = [
  {
    label: 'Semana 1 · Aprendizado',
    value: 'DESAFIO: Familiarização com a planilha e buscar perfeição na execução dos exercícios. Sempre focar na qualidade de controle de cada movimento.',
  },
  {
    label: 'Semana 2 · Volume muscular',
    value: "DESAFIO: Aumente a cadência em 1'' a 2'' por repetição. Movimentos mais lentos.",
  },
  {
    label: 'Semana 3 · Carga',
    value: 'DESAFIO: Torne os movimentos mais dinâmicos, com menos cadência e tente aumentar a carga nos exercícios com sobrepeso.',
  },
  {
    label: 'Semana 4 · Deload',
    value: 'Reduza o volume (reduza 1 séries por exercício) e foque na técnica. Se possível, aumente para uma carga ainda maior que a semana anterior.',
  },
];

const ATIVACAO = 'Ativação';
const POR_LADO = 'por lado';
const REST_2 = "Rest 2' entre as séries";
const SUPERSET_PULL = 'Fazer um exercício seguido do outro e, se precisar, usar superband no primeiro. NÃO USAR GRIP.';
const REST_PULL = "Rest 1'30'' a 2' entre as séries";

function ex(id, name, scheme, setsCount, repsTarget, note, videoUrl) {
  return {
    id, name, scheme, setsCount, repsTarget,
    restSeconds: 0,
    note: note || '',
    videoUrl: videoUrl || '',
  };
}

// Planilha DG (aba DG): TREINO 1 a 4, acrescentados aos treinos A, B e C.
// Células que o Excel virou data (8/8, 6/6, 10/10) entram como repetições por lado.
export const DG_WORKOUTS = [
  {
    id: '1',
    name: 'Treino 1',
    focus: 'Ombro, peito e tríceps',
    subfocus: '',
    warmup: '',
    finisher: '',
    exercises: [
      ex('t1e1', 'Band External Cuban Rotation', '3x 8/8', 3, '8/8', `${ATIVACAO} · ${POR_LADO}`, 'https://www.youtube.com/watch?v=5ws137dgVzw'),
      ex('t1e2', 'DB Frontal Raises', '3x 8', 3, '8', ATIVACAO, 'https://www.youtube.com/watch?v=9WBGOxhRkEY'),
      ex('t1e3', 'Elbow Plank Hold', "3x 1'", 3, "1'", ATIVACAO, 'https://youtu.be/SwHhJZk3x9g'),
      ex('t1e4', 'DB Bench Press', '5x 8', 5, '8', REST_2, 'https://youtu.be/ooYedAJbH7k'),
      ex('t1e5', 'Seated DB Alt. S. Press', '5x 6/6', 5, '6/6', `${POR_LADO} · ${REST_2}`),
      ex('t1e6', 'DB Combine Raises (6 frente e 6 lado alt)', '3x 12', 3, '12', REST_2, 'https://www.youtube.com/watch?v=-FylaRaYCck'),
      ex('t1e7', 'Banded Triceps', '3x 12', 3, '12', REST_2, 'https://www.youtube.com/watch?v=HXia-KuaBu4'),
    ],
  },
  {
    id: '2',
    name: 'Treino 2',
    focus: 'Glúteo, costas e bíceps',
    subfocus: '',
    warmup: '',
    finisher: '',
    exercises: [
      ex('t2e1', 'Scap retraction', '3x 10', 3, '10', ATIVACAO, 'https://www.youtube.com/watch?v=3_7bhp_dIW0'),
      ex('t2e2', 'Single Arm Standing Banded R. Fly', '3x 10/10', 3, '10/10', `${ATIVACAO} · ${POR_LADO}`, 'https://www.youtube.com/watch?v=2s35VKmym_s'),
      ex('t2e3', 'Barbell Hip Thrust', '4x 8', 4, '8', "Rest 1'30'' entre as séries", 'https://www.youtube.com/watch?v=Zp26q4BY5HE'),
      ex('t2e4', 'Double DB Step Down', '3x 6/6', 3, '6/6', POR_LADO, 'https://www.youtube.com/watch?v=p0g2kKvYu7k'),
      ex('t2e5', 'Supine Bent Over Row', '3x 12 a 15', 3, '12 a 15', REST_2, 'https://youtu.be/jgoDYjZ49ts'),
      ex('t2e6', 'Biceps Curl', '3x 20', 3, '20', REST_2, 'https://www.youtube.com/watch?v=LY1V6UbRHFM'),
      ex('t2e7', 'One Arm Ring Row', '3x 8/8', 3, '8/8', POR_LADO, 'https://www.youtube.com/watch?v=xuXXRJKJ3iQ'),
    ],
  },
  {
    id: '3',
    name: 'Treino 3',
    focus: 'Handstand e empurrar',
    subfocus: '',
    warmup: '',
    finisher: '',
    exercises: [
      ex('t3e1', 'Alternate Retraction on the wall', '3x 6/6', 3, '6/6', `${ATIVACAO} · ${POR_LADO}`, 'https://www.youtube.com/watch?v=Kn-n1ner0sI'),
      ex('t3e2', 'Superband scap retraction', '3x 12', 3, '12', ATIVACAO, 'https://www.youtube.com/watch?v=idnj7bbZ3F8'),
      ex('t3e3', 'Box Handstand Hold', "3x 30''-40''", 3, "30''-40''", '', 'https://youtu.be/J9nHXH3wyss'),
      ex('t3e4', 'Wall Facing Handstand Hold', "3x 20''-30''", 3, "20''-30''", '', 'https://www.youtube.com/watch?v=yHuLx1J9orw'),
      ex('t3e5', 'DB Eye Press', '3x 8-12', 3, '8-12', '', 'https://www.youtube.com/shorts/hi6rrOUeW_M'),
      ex('t3e6', 'Incline Push Up', '3x 10-20', 3, '10-20', '', 'https://www.youtube.com/watch?v=0CcVzNxrcdc'),
    ],
  },
  {
    id: '4',
    name: 'Treino 4',
    focus: 'Puxar, core e pernas',
    subfocus: '',
    warmup: '',
    finisher: '',
    exercises: [
      ex('t4e1', 'Banded reverse pull', '3x 10', 3, '10', ATIVACAO, 'https://youtu.be/tGqBPFMperk'),
      ex('t4e2', 'Bird Dog Hold', "3x 30''/30''", 3, "30''/30''", ATIVACAO, 'https://youtu.be/9N-3oDRuK8o'),
      ex('t4e3', 'Pull Up Hold', "4x 10'' a 15''", 4, "10'' a 15''", `${SUPERSET_PULL} ${REST_PULL}`, 'https://youtu.be/C6nULzPl4BM'),
      ex('t4e4', 'Hanging Knee Raise Hold', "4x 10'' a 15''", 4, "10'' a 15''", `${SUPERSET_PULL} ${REST_PULL}`, 'https://www.youtube.com/watch?v=bmGG1_25uDc'),
      ex('t4e5', 'Banded Strict Pull Up', "EMOM 12' · 4x 6 a 12", 4, '6 a 12', "EMOM 12'. Minuto 1 de cada ciclo de 3. Min 3: Rest.", 'https://youtu.be/4xnePwVXEf4'),
      ex('t4e6', 'Knee Raises', "EMOM 12' · 4x 6-10", 4, '6-10', "EMOM 12'. Minuto 2, lento. Min 3: Rest.", 'https://www.youtube.com/watch?v=ubZZS94K4uw'),
      ex('t4e7', 'Banded Good Morning', '2x 30', 2, '30', '', 'https://www.youtube.com/watch?v=CTRaCzE8pWU'),
      ex('t4e8', 'Single DB Bulgarian Split Squat', '4x 8/8', 4, '8/8', POR_LADO, 'https://youtu.be/wBmQX_jrLFw'),
    ],
  },
];

// Plano da Déka que já estava no app (com vídeos). Continua ativo, junto com a planilha DG.
export const CLASSIC_WORKOUTS = [
  {
    id: 'A', name: 'Treino A', focus: 'Quadríceps + Glúteo', subfocus: '',
    warmup: "3' de ativação da musculatura de inferiores", finisher: '',
    exercises: [
      { id: 'a1', name: 'Agachamento Livre', scheme: '4x 8–10', setsCount: 4, repsTarget: '8–10', restSeconds: 90, note: 'Carga progressiva, velocidade controlada', videoUrl: 'https://www.youtube.com/watch?v=ksgYtiWgLhA' },
      { id: 'a2', name: 'Leg Press 45°', scheme: '3x 10–12', setsCount: 3, repsTarget: '10–12', restSeconds: 75, note: '', videoUrl: 'https://www.youtube.com/watch?v=NcmQ-wVlQdc' },
      { id: 'a3', name: 'Cadeira Extensora', scheme: '3x 10–12', setsCount: 3, repsTarget: '10–12', restSeconds: 45, note: '', videoUrl: 'https://www.youtube.com/watch?v=JJnyfrUJgf0' },
      { id: 'a4', name: 'Hip Thrust', scheme: '4x 8–10', setsCount: 4, repsTarget: '8–10', restSeconds: 90, note: '+10s de isometria na última rep', videoUrl: 'https://www.youtube.com/watch?v=5S8SApGU_Lk' },
      { id: 'a5', name: 'Abdução de Quadril na Máquina', scheme: '3x 15–20', setsCount: 3, repsTarget: '15–20', restSeconds: 45, note: '', videoUrl: 'https://m.youtube.com/watch?v=Qk0X4x03hR0' },
      { id: 'a6', name: 'Afundo Reverso no Smith', scheme: '3x 10/10', setsCount: 3, repsTarget: '10 cada perna', restSeconds: 60, note: '', videoUrl: 'https://www.youtube.com/watch?v=qoB-mdm4hYU' },
      { id: 'a7', name: 'Cadeira Abdutora', scheme: '3x 12 pesada + 15 leves', setsCount: 4, repsTarget: '12 (última: 15 leve)', restSeconds: 45, note: 'Baixa a carga, tronco inclinado pra frente', videoUrl: 'https://www.youtube.com/watch?v=wlCuIIlc9Qc' },
    ],
  },
  {
    id: 'B', name: 'Treino B', focus: 'Fortalecimento p/ corrida', subfocus: 'Canela · Tornozelo · Panturrilha · Quadril',
    warmup: 'Marcha na ponta do pé 2x20m + Marcha no calcanhar 2x20m (5–8 min)',
    finisher: 'Bi-set: Pogo jump (perna estendida) 20" + 20m de caminhada lateral com band (em "X" sob o pé)',
    exercises: [
      { id: 'b1', name: 'Step Down Controlado (caixa baixa)', scheme: '3x 10 cada perna', setsCount: 3, repsTarget: '10 cada perna', restSeconds: 60, note: 'Controle de joelho e tornozelo', videoUrl: 'https://www.youtube.com/watch?v=otxjFuny_4I' },
      { id: 'b2', name: 'Elevação de Panturrilha Plate (em pé)', scheme: '4x 12–15', setsCount: 4, repsTarget: '12–15', restSeconds: 45, note: 'Subida forte + descida lenta', videoUrl: 'https://www.youtube.com/watch?v=cklp_Xh5V8M' },
      { id: 'b3', name: 'Tibial Raise (encostada na parede)', scheme: '4x 15–20', setsCount: 4, repsTarget: '15–20', restSeconds: 45, note: 'Exercício principal pensando em canela', videoUrl: 'https://www.youtube.com/watch?v=pn7DLqo-IKs' },
      { id: 'b4', name: 'Elevação de Panturrilha Sentado (sóleo)', scheme: '4x 15–20', setsCount: 4, repsTarget: '15–20', restSeconds: 45, note: 'Pés na plate, peso no colo', videoUrl: 'https://www.youtube.com/watch?v=A28KS0th1kM' },
      { id: 'b5', name: 'Tibial Raise Unilateral (sentado com KTB)', scheme: '3x 12–15', setsCount: 3, repsTarget: '12–15', restSeconds: 45, note: '', videoUrl: 'https://www.youtube.com/watch?v=kIRvGGD21Zw' },
      { id: 'b6', name: 'Step-Up Unilateral com Drive de Joelho', scheme: '3x 10/10', setsCount: 3, repsTarget: '10 cada perna', restSeconds: 60, note: 'Caixa feminina', videoUrl: 'https://www.youtube.com/watch?v=CsTElDw1oXg' },
    ],
  },
  {
    id: 'C', name: 'Treino C', focus: 'Posterior + Glúteo', subfocus: '',
    warmup: "3' de ativação da musculatura de inferiores",
    finisher: "8' de simulador de escada ou esteira, PSE 6, inclinação alta (se houver tempo)",
    exercises: [
      { id: 'c1', name: 'Levantamento Terra Romeno', scheme: '4x 8–10', setsCount: 4, repsTarget: '8–10', restSeconds: 90, note: '', videoUrl: 'https://www.youtube.com/watch?v=P39OhuC8a4Q' },
      { id: 'c2', name: 'Cadeira Flexora', scheme: '3x 10–12', setsCount: 3, repsTarget: '10–12', restSeconds: 45, note: '', videoUrl: 'https://www.youtube.com/watch?v=4qwPt7XcDBs' },
      { id: 'c3', name: 'Coice na Polia', scheme: '3x 10/10', setsCount: 3, repsTarget: '10 cada perna', restSeconds: 45, note: '', videoUrl: 'https://www.youtube.com/watch?v=8wN0YCs_rUc' },
      { id: 'c4', name: 'Glúte Drive (elevação pélvica na máquina)', scheme: '3x 12 + 12 curtinhas', setsCount: 3, repsTarget: '12 completas + 12 curtinhas', restSeconds: 60, note: 'Curtinhas: meio pra cima', videoUrl: 'https://www.youtube.com/watch?v=DnHjZpt76NU' },
      { id: 'c5', name: 'Bi-set: Good Morning + Stiff Unilateral', scheme: '3x 10 + 8/8', setsCount: 3, repsTarget: '10 + 8/8', restSeconds: 75, note: '', videoUrl: 'https://www.youtube.com/watch?v=1jY9xhgLkTM' },
      { id: 'c6', name: 'Cadeira Adutora', scheme: '3x 12', setsCount: 3, repsTarget: '12 (+15s iso na última)', restSeconds: 45, note: '', videoUrl: 'https://www.youtube.com/watch?v=M_2CxnklU-0' },
      { id: 'c7', name: 'Back Extension 45°', scheme: '3x 12–15', setsCount: 3, repsTarget: '12–15', restSeconds: 45, note: 'Ênfase em glúteo, anilha no peito', videoUrl: 'https://www.youtube.com/watch?v=_GjQaYfUNdM' },
    ],
  },
];

export const DEFAULT_WORKOUTS = [...CLASSIC_WORKOUTS, ...DG_WORKOUTS];

export const MOTIVATIONAL_MESSAGES = [
  'Presença já é uma forma de cuidado.',
  'O corpo responde ao que se repete.',
  'Ir sem pressa ainda é ir.',
  'A constância pesa mais que a pressa.',
  'Hoje basta cumprir o combinado.',
  'Cuidar do corpo pode ser discreto.',
  'Uma série atenta já é bastante.',
  'Voltar no dia seguinte também conta.',
  'O treino não precisa ser grandioso.',
  'O seu ritmo também é progresso.',
  'Ficar até o final é disciplina.',
  'O corpo registra o que você repete.',
  'Sem alarde. Apenas o trabalho de hoje.',
  'Descansar é parte do respeito ao corpo.',
  'A carga boa é a que você sustenta.',
  'Comparecer importa mais que impressionar.',
  'Atenção no movimento já é treino.',
  'Sem pressa. Com continuidade.',
  'O hábito se faz nos dias comuns.',
  'Menos espetáculo, mais presença.',
  'Regularidade serve mais que intensidade.',
  'Repetir com calma também fortalece.',
  'Concluir o que começou já basta.',
  'A força se apoia na regularidade.',
  'Estar presente já é uma decisão.',
];
