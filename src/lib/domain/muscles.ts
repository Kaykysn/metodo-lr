// ==============================================================================
// Registro anatômico de músculos — nomes em português, grupos e regiões do mapa.
// Fonte de nomes e ações: anatomia funcional (OpenStax Anatomy and Physiology 2e,
// cap. 11.5 e 11.6). As ações são descrições gerais; o papel de cada músculo num
// exercício depende da variação, da posição articular, do apoio e da amplitude.
// ==============================================================================

export type MuscleDepth = "superficial" | "profundo";

export interface Muscle {
  id: string;
  name: string;
  /** Grupo a que pertence (ex.: cabeças do quadríceps → "quadriceps"). */
  groupId?: string;
  /** Regiões do mapa corporal (bases de body-regions) onde o músculo fica. */
  regions: string[];
  depth: MuscleDepth;
  /** Ações principais, em linguagem de anatomia funcional. */
  actions: string;
}

export interface MuscleGroup {
  id: string;
  name: string;
  members: string[];
  /** Observação que vale para o grupo (ex.: músculos biarticulares). */
  note?: string;
}

const M = (id: string, name: string, regions: string[], depth: MuscleDepth, actions: string, groupId?: string): Muscle => ({ id, name, regions, depth, actions, groupId });

export const MUSCLES: Muscle[] = [
  // ---------------- Quadril e coxa
  M("reto-femoral", "Reto femoral", ["anterior_thigh"], "superficial", "Estende o joelho e flexiona o quadril (biarticular).", "quadriceps"),
  M("vasto-lateral", "Vasto lateral", ["anterior_thigh"], "superficial", "Estende o joelho.", "quadriceps"),
  M("vasto-medial", "Vasto medial", ["anterior_thigh"], "superficial", "Estende o joelho.", "quadriceps"),
  M("vasto-intermedio", "Vasto intermédio", ["anterior_thigh"], "profundo", "Estende o joelho; fica sob o reto femoral.", "quadriceps"),
  M("biceps-femoral-longa", "Bíceps femoral (cabeça longa)", ["posterior_thigh"], "superficial", "Estende o quadril e flexiona o joelho (biarticular).", "isquiotibiais"),
  M("biceps-femoral-curta", "Bíceps femoral (cabeça curta)", ["posterior_thigh"], "profundo", "Flexiona o joelho. Não cruza o quadril: não participa da extensão do quadril.", "isquiotibiais"),
  M("semitendineo", "Semitendíneo", ["posterior_thigh"], "superficial", "Estende o quadril e flexiona o joelho (biarticular).", "isquiotibiais"),
  M("semimembranaceo", "Semimembranáceo", ["posterior_thigh"], "profundo", "Estende o quadril e flexiona o joelho (biarticular).", "isquiotibiais"),
  M("gluteo-maximo", "Glúteo máximo", ["glute"], "superficial", "Estende e roda lateralmente o quadril."),
  M("gluteo-medio", "Glúteo médio", ["glute"], "superficial", "Abduz o quadril e estabiliza a pelve no apoio unipodal."),
  M("gluteo-minimo", "Glúteo mínimo", ["glute"], "profundo", "Abduz o quadril; fica sob o glúteo médio."),
  M("tensor-fascia-lata", "Tensor da fáscia lata", ["hip_groin"], "superficial", "Flexiona e abduz o quadril; contribuição varia com a posição do quadril."),
  M("adutor-longo", "Adutor longo", ["hip_groin"], "superficial", "Aduz o quadril.", "adutores"),
  M("adutor-curto", "Adutor curto", ["hip_groin"], "profundo", "Aduz o quadril.", "adutores"),
  M("adutor-magno", "Adutor magno", ["hip_groin", "posterior_thigh"], "profundo", "Aduz o quadril; a porção posterior também estende o quadril.", "adutores"),
  M("gracil", "Grácil", ["hip_groin"], "superficial", "Aduz o quadril e flexiona o joelho.", "adutores"),
  M("pectineo", "Pectíneo", ["hip_groin"], "profundo", "Aduz e flexiona o quadril.", "adutores"),
  M("iliopsoas", "Iliopsoas", ["hip_groin"], "profundo", "Flexiona o quadril."),
  M("piriforme", "Piriforme", ["glute"], "profundo", "Roda lateralmente o quadril em extensão.", "rotadores-laterais-quadril"),
  M("obturadores-gemeos", "Obturadores e gêmeos", ["glute"], "profundo", "Rodam lateralmente o quadril.", "rotadores-laterais-quadril"),
  M("quadrado-femoral", "Quadrado femoral", ["glute"], "profundo", "Roda lateralmente o quadril.", "rotadores-laterais-quadril"),
  // ---------------- Perna e pé
  M("gastrocnemio", "Gastrocnêmio", ["calf"], "superficial", "Flexão plantar do tornozelo; auxilia a flexão do joelho (biarticular).", "triceps-sural"),
  M("soleo", "Sóleo", ["calf"], "profundo", "Flexão plantar do tornozelo; não cruza o joelho.", "triceps-sural"),
  M("tibial-anterior", "Tibial anterior", ["leg"], "superficial", "Dorsiflexão e inversão do pé."),
  M("extensores-longos-dedos", "Extensores longos dos dedos e do hálux", ["leg"], "superficial", "Estendem os dedos e auxiliam a dorsiflexão."),
  M("fibular-longo", "Fibular longo", ["leg"], "superficial", "Everte o pé e auxilia a flexão plantar.", "fibulares"),
  M("fibular-curto", "Fibular curto", ["leg"], "profundo", "Everte o pé.", "fibulares"),
  M("tibial-posterior", "Tibial posterior", ["calf"], "profundo", "Inverte o pé e auxilia a flexão plantar."),
  M("musculatura-intrinseca-pe", "Musculatura intrínseca do pé", ["ankle_foot"], "profundo", "Sustenta o arco e controla o apoio do pé."),
  // ---------------- Tronco
  M("reto-abdome", "Reto do abdome", ["abdomen"], "superficial", "Flexiona o tronco e resiste à extensão."),
  M("obliquo-externo", "Oblíquo externo", ["abdomen"], "superficial", "Roda e inclina o tronco; resiste à rotação e à inclinação."),
  M("obliquo-interno", "Oblíquo interno", ["abdomen"], "profundo", "Roda e inclina o tronco; resiste à rotação e à inclinação."),
  M("transverso-abdome", "Transverso do abdome", ["abdomen"], "profundo", "Comprime o abdome e contribui para a estabilidade do tronco."),
  M("quadrado-lombar", "Quadrado lombar", ["lumbar"], "profundo", "Inclina o tronco e resiste à inclinação lateral."),
  M("eretores-espinha", "Eretores da espinha", ["thoracic", "lumbar"], "superficial", "Estendem a coluna e resistem à flexão do tronco."),
  M("multifidos", "Multífidos", ["lumbar"], "profundo", "Estabilizam segmentos da coluna e auxiliam a extensão."),
  // ---------------- Cintura escapular e ombro
  M("peitoral-maior-clavicular", "Peitoral maior (porção clavicular)", ["chest"], "superficial", "Flexiona, aduz e roda medialmente o ombro.", "peitoral-maior"),
  M("peitoral-maior-esternocostal", "Peitoral maior (porção esternocostal)", ["chest"], "superficial", "Aduz, estende a partir da flexão e roda medialmente o ombro.", "peitoral-maior"),
  M("peitoral-menor", "Peitoral menor", ["chest"], "profundo", "Abaixa e protrai a escápula."),
  M("deltoide-anterior", "Deltoide (porção anterior)", ["shoulder"], "superficial", "Flexiona e roda medialmente o ombro.", "deltoide"),
  M("deltoide-medio", "Deltoide (porção média)", ["shoulder"], "superficial", "Abduz o ombro.", "deltoide"),
  M("deltoide-posterior", "Deltoide (porção posterior)", ["shoulder"], "superficial", "Estende, abduz horizontalmente e roda lateralmente o ombro.", "deltoide"),
  M("supraespinal", "Supraespinal", ["shoulder"], "profundo", "Inicia e auxilia a abdução; estabiliza a cabeça do úmero.", "manguito-rotador"),
  M("infraespinal", "Infraespinal", ["shoulder", "thoracic"], "profundo", "Roda lateralmente o ombro; estabiliza a cabeça do úmero.", "manguito-rotador"),
  M("redondo-menor", "Redondo menor", ["shoulder"], "profundo", "Roda lateralmente o ombro; estabiliza a cabeça do úmero.", "manguito-rotador"),
  M("subescapular", "Subescapular", ["shoulder"], "profundo", "Roda medialmente o ombro; estabiliza a cabeça do úmero.", "manguito-rotador"),
  M("latissimo-dorso", "Latíssimo do dorso", ["thoracic", "lumbar"], "superficial", "Estende, aduz e roda medialmente o ombro."),
  M("redondo-maior", "Redondo maior", ["shoulder", "thoracic"], "superficial", "Estende, aduz e roda medialmente o ombro."),
  M("romboides", "Romboides", ["thoracic"], "profundo", "Retraem e rodam inferiormente a escápula; ficam sob o trapézio."),
  M("trapezio-superior", "Trapézio (porção superior)", ["neck", "shoulder"], "superficial", "Eleva e roda superiormente a escápula.", "trapezio"),
  M("trapezio-medio", "Trapézio (porção média)", ["thoracic"], "superficial", "Retrai a escápula.", "trapezio"),
  M("trapezio-inferior", "Trapézio (porção inferior)", ["thoracic"], "superficial", "Abaixa e roda superiormente a escápula.", "trapezio"),
  M("serratil-anterior", "Serrátil anterior", ["chest"], "superficial", "Protrai e roda superiormente a escápula; mantém a escápula junto ao tórax."),
  // ---------------- Braço e antebraço
  M("biceps-braquial", "Bíceps braquial", ["arm"], "superficial", "Flexiona o cotovelo e supina o antebraço; auxilia a flexão do ombro."),
  M("braquial", "Braquial", ["arm"], "profundo", "Flexiona o cotovelo em qualquer posição do antebraço."),
  M("braquiorradial", "Braquiorradial", ["forearm"], "superficial", "Flexiona o cotovelo, com mais participação em posição neutra do antebraço."),
  M("triceps-longa", "Tríceps braquial (cabeça longa)", ["arm"], "superficial", "Estende o cotovelo e auxilia a extensão do ombro (biarticular).", "triceps-braquial"),
  M("triceps-lateral", "Tríceps braquial (cabeça lateral)", ["arm"], "superficial", "Estende o cotovelo.", "triceps-braquial"),
  M("triceps-medial", "Tríceps braquial (cabeça medial)", ["arm"], "profundo", "Estende o cotovelo.", "triceps-braquial"),
  M("ancoeneo", "Ancôneo", ["elbow"], "superficial", "Auxilia a extensão do cotovelo."),
  M("flexores-punho-dedos", "Flexores do punho e dos dedos", ["forearm", "wrist_hand"], "superficial", "Flexionam o punho e os dedos; sustentam a preensão."),
];

export const MUSCLE_GROUPS_DEF: MuscleGroup[] = [
  { id: "quadriceps", name: "Quadríceps", members: ["reto-femoral", "vasto-lateral", "vasto-medial", "vasto-intermedio"], note: "As quatro cabeças estendem o joelho; só o reto femoral cruza o quadril." },
  { id: "isquiotibiais", name: "Isquiotibiais", members: ["biceps-femoral-longa", "biceps-femoral-curta", "semitendineo", "semimembranaceo"], note: "Cabeça longa do bíceps femoral, semitendíneo e semimembranáceo são biarticulares; a cabeça curta só atua no joelho." },
  { id: "adutores", name: "Adutores do quadril", members: ["adutor-longo", "adutor-curto", "adutor-magno", "gracil", "pectineo"] },
  { id: "rotadores-laterais-quadril", name: "Rotadores laterais profundos do quadril", members: ["piriforme", "obturadores-gemeos", "quadrado-femoral"] },
  { id: "triceps-sural", name: "Tríceps sural", members: ["gastrocnemio", "soleo"], note: "Com o joelho flexionado, o gastrocnêmio fica encurtado e o sóleo responde por mais da flexão plantar." },
  { id: "fibulares", name: "Fibulares", members: ["fibular-longo", "fibular-curto"] },
  { id: "peitoral-maior", name: "Peitoral maior", members: ["peitoral-maior-clavicular", "peitoral-maior-esternocostal"] },
  { id: "deltoide", name: "Deltoide", members: ["deltoide-anterior", "deltoide-medio", "deltoide-posterior"] },
  { id: "manguito-rotador", name: "Manguito rotador", members: ["supraespinal", "infraespinal", "redondo-menor", "subescapular"] },
  { id: "trapezio", name: "Trapézio", members: ["trapezio-superior", "trapezio-medio", "trapezio-inferior"] },
  { id: "triceps-braquial", name: "Tríceps braquial", members: ["triceps-longa", "triceps-lateral", "triceps-medial"], note: "Só a cabeça longa cruza o ombro; com o braço acima da cabeça ela fica alongada." },
  { id: "parede-abdominal", name: "Parede abdominal", members: ["reto-abdome", "obliquo-externo", "obliquo-interno", "transverso-abdome"] },
];

export const MUSCLE_BY_ID = new Map(MUSCLES.map((m) => [m.id, m]));
export const MUSCLE_GROUP_BY_ID = new Map(MUSCLE_GROUPS_DEF.map((g) => [g.id, g]));

/** Nome de um músculo ou grupo. */
export function muscleRefName(ref: string): string {
  return MUSCLE_GROUP_BY_ID.get(ref)?.name ?? MUSCLE_BY_ID.get(ref)?.name ?? ref;
}

/** Expande uma referência (grupo ou músculo) nos músculos individuais. */
export function expandMuscleRef(ref: string): Muscle[] {
  const g = MUSCLE_GROUP_BY_ID.get(ref);
  if (g) return g.members.map((id) => MUSCLE_BY_ID.get(id)).filter((m): m is Muscle => Boolean(m));
  const m = MUSCLE_BY_ID.get(ref);
  return m ? [m] : [];
}

export function isKnownMuscleRef(ref: string): boolean {
  return MUSCLE_GROUP_BY_ID.has(ref) || MUSCLE_BY_ID.has(ref);
}

/** Remove acentos e caixa para busca ("glúteo" encontra "gluteo"). */
export function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR").trim();
}
