export const PROTOCOL_INFO = {
  aluna: 'Isa',
  inicio: '24/08/2026',
  objetivo: 'Fortalecimento e preparação para corrida · Hipertrofia isolada de membros inferiores',
  personal: 'Déka Lagranha',
};

export const TIPS = [
  { label: 'Aquecimento', value: '5–10 min para preparar e ativar os músculos' },
  { label: 'Alongamento após', value: 'Foco em relaxar, recuperar e prevenir dores' },
  { label: 'Cadência', value: 'Seguir o tempo indicado (ex: 3010, 2020), sempre com controle' },
  { label: 'Cargas', value: 'Aumentar sempre que possível, quando o exercício ficar fácil' },
];

export const DEFAULT_WORKOUTS = [
  {
    id: 'A', name: 'Treino A', focus: 'Quadríceps + Glúteo', subfocus: '',
    warmup: "3' de ativação da musculatura de inferiores", finisher: '',
    exercises: [
      { id: 'a1', name: 'Agachamento Livre', scheme: '4x 8–10', setsCount: 4, repsTarget: '8–10', restSeconds: 90, note: 'Carga progressiva, velocidade controlada', videoUrl: 'https://www.youtube.com/watch?v=YL9b9Q0A7wc' },
      { id: 'a2', name: 'Leg Press 45°', scheme: '3x 10–12', setsCount: 3, repsTarget: '10–12', restSeconds: 75, note: '', videoUrl: 'https://www.youtube.com/watch?v=NcmQ-wVlQdc' },
      { id: 'a3', name: 'Cadeira Extensora', scheme: '3x 10–12', setsCount: 3, repsTarget: '10–12', restSeconds: 45, note: '', videoUrl: 'https://www.youtube.com/watch?v=JJnyfrUJgf0' },
      { id: 'a4', name: 'Hip Thrust', scheme: '4x 8–10', setsCount: 4, repsTarget: '8–10', restSeconds: 90, note: '+10s de isometria na última rep', videoUrl: 'https://www.youtube.com/watch?v=5S8SApGU_Lk' },
      { id: 'a5', name: 'Abdução de Quadril na Máquina', scheme: '3x 15–20', setsCount: 3, repsTarget: '15–20', restSeconds: 45, note: '', videoUrl: 'https://www.youtube.com/watch?v=BnMobvODy1E' },
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

export const MOTIVATIONAL_MESSAGES = [
  'Disciplina também pode ser um ato de autocuidado.',
  'Consistência é uma forma silenciosa de transformação.',
  'Vai sem vontade mesmo.',
  null, // dias para o verão — calculado dinamicamente
  'Você nunca se arrepende de ter ido.',
  'Não precisa querer. Só precisa ir.',
  'Nem todo treino precisa ser incrível. Só precisa acontecer.',
  'A vontade vem depois que você começa.',
  'Você não precisa estar motivada para ser consistente.',
  'O resultado é consequência do que você repete.',
  'Não negocie com a preguiça.',
  'A versão que você quer ser está sendo construída agora.',
  'Faça mesmo nos dias comuns. É aí que acontece.',
  'Treino feito é melhor que treino perfeito.',
  'Você não precisa acelerar. Só não pare.',
];
