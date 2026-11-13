// ==============================================================================
// Biblioteca de exercícios — repertório para seleção profissional.
// Cadastro ≠ indicação. `suggestionEligible` separa itens que o motor de regras
// pode oferecer (com regra e fonte próprias) dos que só entram por escolha manual.
// ==============================================================================

export type MovementPattern =
  | "agachar"
  | "dobrar quadril"
  | "unilateral"
  | "empurrar"
  | "puxar"
  | "acessório"
  | "tronco"
  | "transporte"
  | "mobilidade"
  | "equilíbrio e marcha"
  | "aeróbio"
  | "potência"
  | "pilates";

export type Modality = "musculação" | "peso corporal" | "elástico" | "pilates" | "aeróbio" | "funcional";

import { CATALOG_ENTRIES, type CatalogEntry, type Difficulty, type ExerciseDetail, type Laterality, type Purpose } from "./exercise-catalog";
import { MUSCLES, MUSCLE_BY_ID, MUSCLE_GROUPS_DEF, MUSCLE_GROUP_BY_ID, expandMuscleRef, fold, muscleRefName } from "./muscles";

export interface ExerciseCard {
  id: string;
  name: string;
  synonyms: string[];
  pattern: MovementPattern;
  objective: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  modality: Modality;
  /** Tipo de carga que o registro de execução aceita (não converter molas/elástico em kg). */
  loadKind: "external_kg" | "bodyweight" | "band" | "pilates_springs" | "time_or_distance";
  execution: string;
  commonErrors: string;
  regressions: string[]; // ids
  progressions: string[]; // ids
  doseVariables: string[];
  precautions: string;
  media: null; // nenhuma mídia autorizada cadastrada ainda
  references: string[]; // ids de EVIDENCE
  evidenceNote: string;
  reviewStatus: "rascunho — revisão profissional pendente" | "pendente de revisão editorial";
  suggestionEligible: boolean;
  /** Propósitos (um exercício pode ter mais de um). Vazio = só aparece em "Todos". */
  purposes: Purpose[];
  englishNames: string[];
  laterality?: Laterality;
  difficulty?: Difficulty;
  /** Regiões do mapa corporal ligadas aos músculos da ficha. */
  regions: string[];
  /** Ficha detalhada do catálogo v2; null nos itens ainda não detalhados. */
  detail: ExerciseDetail | null;
}

const RT_NOTE =
  "Treino resistido progressivo em adultos saudáveis tem respaldo geral (ACSM 2026). Isso não comprova esta variação específica para nenhuma condição; aplicação depende de avaliação.";
const PENDING = "Variação de exercício; aplicação depende de avaliação. Referência específica pendente.";

type Seed = Omit<ExerciseCard, "media" | "reviewStatus" | "references" | "evidenceNote" | "synonyms" | "secondaryMuscles" | "doseVariables" | "suggestionEligible" | "purposes" | "englishNames" | "regions" | "detail"> &
  Partial<Pick<ExerciseCard, "references" | "evidenceNote" | "synonyms" | "secondaryMuscles" | "doseVariables" | "suggestionEligible">>;

const RT_DOSE = ["séries", "repetições", "carga", "descanso", "esforço (RPE ou RIR)", "amplitude", "cadência"];
const TIME_DOSE = ["séries", "duração", "descanso", "nível de apoio"];

function card(s: Seed): ExerciseCard {
  const resisted = ["musculação", "peso corporal", "elástico"].includes(s.modality) && s.pattern !== "mobilidade" && s.pattern !== "equilíbrio e marcha";
  return {
    synonyms: [],
    secondaryMuscles: [],
    doseVariables: s.loadKind === "time_or_distance" ? TIME_DOSE : RT_DOSE,
    references: resisted ? ["acsm-2026-rt"] : [],
    evidenceNote: resisted ? RT_NOTE : PENDING,
    suggestionEligible: false,
    media: null,
    reviewStatus: "rascunho — revisão profissional pendente",
    purposes: [],
    englishNames: [],
    regions: [],
    detail: null,
    ...s,
  };
}

const P_LOWER = "Ajustar amplitude e carga a sintomas relatados e ao controle do movimento. Dor durante o exercício é registrada à parte do esforço; critérios de interrupção são definidos pelo professor para o caso.";
const P_UPPER = "Ajustar amplitude do ombro e carga ao conforto e ao controle. Registrar sintomas separadamente do esforço.";
const P_TRUNK = "Manter respiração contínua; regredir a alavanca se perder o alinhamento. Não é tratamento universal de dor lombar.";
const P_BAL = "Garantir apoio próximo e ambiente livre de obstáculos. Supervisão conforme risco de queda avaliado.";
const P_PWR = "Exige seleção e dose próprias: só após base de força e técnica estável; volume baixo e descanso completo.";
const P_PIL = "Registrar aparelho, molas e montagem; não converter resistência de molas em kg.";

const LEGACY_EXERCISES: ExerciseCard[] = [
  // ---------------- Agachar e levantar
  card({ id: "sit-to-stand", name: "Sentar e levantar", synonyms: ["levantar da cadeira"], pattern: "agachar", objective: "Força e controle de membros inferiores em tarefa diária", primaryMuscles: ["quadríceps", "glúteo máximo"], secondaryMuscles: ["adutores", "panturrilha"], equipment: ["cadeira ou banco"], modality: "peso corporal", loadKind: "bodyweight", execution: "Pés à largura do quadril, inclinar o tronco à frente e levantar até ficar em pé; sentar com controle.", commonErrors: "Cair na cadeira sem controle; joelhos se aproximando muito; usar só impulso do tronco.", regressions: ["squat-supported"], progressions: ["box-squat", "goblet-squat", "sit-to-stand-fast"], precautions: P_LOWER, suggestionEligible: true }),
  card({ id: "squat-supported", name: "Agachamento com apoio", synonyms: ["agachamento assistido"], pattern: "agachar", objective: "Aprender o padrão de agachar com segurança", primaryMuscles: ["quadríceps", "glúteo máximo"], equipment: ["apoio fixo", "TRX ou barra"], modality: "peso corporal", loadKind: "bodyweight", execution: "Segurar um apoio estável e agachar até a amplitude confortável, voltando com controle.", commonErrors: "Puxar demais com os braços; perder o apoio dos calcanhares.", regressions: [], progressions: ["sit-to-stand", "bodyweight-squat"], precautions: P_LOWER }),
  card({ id: "bodyweight-squat", name: "Agachamento com peso corporal", synonyms: ["agachamento livre sem carga", "air squat"], pattern: "agachar", objective: "Força de membros inferiores sem carga externa", primaryMuscles: ["quadríceps", "glúteo máximo"], secondaryMuscles: ["adutores", "eretores da espinha"], equipment: [], modality: "peso corporal", loadKind: "bodyweight", execution: "Descer flexionando quadril e joelhos, tronco estável, e subir empurrando o chão.", commonErrors: "Calcanhares saindo do chão; perda de alinhamento do joelho com o pé.", regressions: ["squat-supported", "box-squat"], progressions: ["goblet-squat"], precautions: P_LOWER }),
  card({ id: "goblet-squat", name: "Agachamento goblet", synonyms: ["agachamento com halter à frente"], pattern: "agachar", objective: "Força de membros inferiores com carga externa", primaryMuscles: ["quadríceps", "glúteo máximo"], secondaryMuscles: ["adutores", "core"], equipment: ["halter ou kettlebell"], modality: "musculação", loadKind: "external_kg", execution: "Segurar o peso junto ao peito e agachar mantendo o tronco estável.", commonErrors: "Peso afastado do corpo; tronco desabando à frente.", regressions: ["box-squat", "bodyweight-squat"], progressions: ["leg-press"], precautions: P_LOWER, suggestionEligible: true }),
  card({ id: "box-squat", name: "Agachamento até banco", synonyms: ["agachamento na caixa"], pattern: "agachar", objective: "Controlar amplitude e profundidade do agachamento", primaryMuscles: ["quadríceps", "glúteo máximo"], equipment: ["banco ou caixa"], modality: "peso corporal", loadKind: "bodyweight", execution: "Agachar até tocar o banco levemente, sem relaxar, e subir.", commonErrors: "Sentar e relaxar no banco; usar banco baixo demais.", regressions: ["sit-to-stand"], progressions: ["goblet-squat"], precautions: P_LOWER }),
  card({ id: "leg-press", name: "Leg press", pattern: "agachar", objective: "Força de membros inferiores com tronco apoiado", primaryMuscles: ["quadríceps", "glúteo máximo"], equipment: ["leg press"], modality: "musculação", loadKind: "external_kg", execution: "Empurrar a plataforma com os pés inteiros, sem travar os joelhos no final.", commonErrors: "Tirar o quadril do encosto no fim da descida; travar joelhos.", regressions: ["box-squat"], progressions: [], precautions: P_LOWER }),
  // ---------------- Quadril e cadeia posterior
  card({ id: "dowel-hinge", name: "Hinge com bastão", synonyms: ["dobradiça de quadril com bastão"], pattern: "dobrar quadril", objective: "Aprender a flexão de quadril com coluna estável", primaryMuscles: ["isquiotibiais", "glúteo máximo"], equipment: ["bastão"], modality: "peso corporal", loadKind: "bodyweight", execution: "Bastão encostado na cabeça, tórax e sacro; levar o quadril para trás mantendo os três contatos.", commonErrors: "Perder contato do bastão; flexionar demais os joelhos.", regressions: [], progressions: ["kb-deadlift-elevated", "romanian-deadlift"], precautions: P_LOWER }),
  card({ id: "romanian-deadlift", name: "Levantamento romeno", synonyms: ["stiff romeno", "RDL"], pattern: "dobrar quadril", objective: "Força da cadeia posterior", primaryMuscles: ["isquiotibiais", "glúteo máximo"], secondaryMuscles: ["eretores da espinha"], equipment: ["halteres ou barra"], modality: "musculação", loadKind: "external_kg", execution: "Descer o peso junto às coxas levando o quadril para trás, joelhos levemente flexionados.", commonErrors: "Arredondar a coluna para alcançar mais amplitude; afastar o peso do corpo.", regressions: ["dowel-hinge", "kb-deadlift-elevated"], progressions: [], precautions: P_LOWER }),
  card({ id: "kb-deadlift-elevated", name: "Levantamento com kettlebell elevado", pattern: "dobrar quadril", objective: "Levantamento do chão com amplitude reduzida", primaryMuscles: ["glúteo máximo", "isquiotibiais", "quadríceps"], equipment: ["kettlebell", "step ou anilhas"], modality: "musculação", loadKind: "external_kg", execution: "Kettlebell sobre um apoio elevado; levantar empurrando o chão e estendendo o quadril.", commonErrors: "Puxar com os braços; hiperestender no topo.", regressions: ["dowel-hinge"], progressions: ["romanian-deadlift"], precautions: P_LOWER, suggestionEligible: true }),
  card({ id: "glute-bridge", name: "Ponte de quadril", synonyms: ["elevação pélvica no solo"], pattern: "dobrar quadril", objective: "Extensão de quadril com baixa demanda técnica", primaryMuscles: ["glúteo máximo"], secondaryMuscles: ["isquiotibiais"], equipment: ["colchonete"], modality: "peso corporal", loadKind: "bodyweight", execution: "Deitado, joelhos flexionados, elevar o quadril até alinhar com joelhos e ombros.", commonErrors: "Arquear a lombar em vez de estender o quadril.", regressions: [], progressions: ["hip-thrust"], precautions: P_LOWER, suggestionEligible: true }),
  card({ id: "hip-thrust", name: "Hip thrust", synonyms: ["elevação pélvica com apoio"], pattern: "dobrar quadril", objective: "Força de extensão de quadril com carga", primaryMuscles: ["glúteo máximo"], equipment: ["banco", "barra ou halter"], modality: "musculação", loadKind: "external_kg", execution: "Costas apoiadas no banco, carga sobre o quadril; estender o quadril até o tronco ficar horizontal.", commonErrors: "Hiperestender a lombar; empurrar com a ponta dos pés.", regressions: ["glute-bridge"], progressions: [], precautions: P_LOWER }),
  card({ id: "leg-curl", name: "Flexora", synonyms: ["mesa flexora", "cadeira flexora"], pattern: "acessório", objective: "Força de isquiotibiais", primaryMuscles: ["isquiotibiais"], equipment: ["máquina flexora"], modality: "musculação", loadKind: "external_kg", execution: "Flexionar os joelhos contra a resistência e voltar devagar.", commonErrors: "Tirar o quadril do apoio; descer sem controle.", regressions: [], progressions: [], precautions: P_LOWER }),
  // ---------------- Unilaterais e degraus
  card({ id: "step-up", name: "Step-up", synonyms: ["subida no degrau"], pattern: "unilateral", objective: "Força unilateral e transferência para subir escadas", primaryMuscles: ["quadríceps", "glúteo máximo"], equipment: ["step ou degrau"], modality: "peso corporal", loadKind: "bodyweight", execution: "Pé inteiro no degrau, subir empurrando com a perna de cima, descer com controle.", commonErrors: "Impulsionar com a perna de baixo; joelho desalinhado.", regressions: ["supported-step-up"], progressions: ["step-down", "fast-step-up"], precautions: P_LOWER, suggestionEligible: true }),
  card({ id: "step-down", name: "Step-down", synonyms: ["descida do degrau"], pattern: "unilateral", objective: "Controle excêntrico unilateral", primaryMuscles: ["quadríceps", "glúteo médio"], equipment: ["step"], modality: "peso corporal", loadKind: "bodyweight", execution: "Em pé no degrau, descer o calcanhar oposto até tocar o chão de leve e voltar.", commonErrors: "Quadril caindo para o lado; descer rápido demais.", regressions: ["step-up"], progressions: [], precautions: P_LOWER }),
  card({ id: "split-squat-supported", name: "Split squat com apoio", synonyms: ["afundo estacionário com apoio"], pattern: "unilateral", objective: "Força unilateral com estabilidade assistida", primaryMuscles: ["quadríceps", "glúteo máximo"], equipment: ["apoio fixo"], modality: "peso corporal", loadKind: "bodyweight", execution: "Pés afastados à frente e atrás, segurar um apoio e descer o joelho de trás em direção ao chão.", commonErrors: "Base estreita demais; tronco inclinando para o lado.", regressions: [], progressions: ["reverse-lunge"], precautions: P_LOWER }),
  card({ id: "reverse-lunge", name: "Afundo reverso", pattern: "unilateral", objective: "Força unilateral e controle dinâmico", primaryMuscles: ["quadríceps", "glúteo máximo"], equipment: [], modality: "peso corporal", loadKind: "bodyweight", execution: "Dar um passo para trás, descer e voltar à posição inicial empurrando com a perna da frente.", commonErrors: "Passo curto demais; perda de equilíbrio lateral.", regressions: ["split-squat-supported"], progressions: [], precautions: P_LOWER }),
  card({ id: "single-leg-box-squat", name: "Agachamento unilateral até banco com apoio", pattern: "unilateral", objective: "Força unilateral com amplitude controlada", primaryMuscles: ["quadríceps", "glúteo máximo"], equipment: ["banco", "apoio fixo"], modality: "peso corporal", loadKind: "bodyweight", execution: "Apoiado, sentar no banco usando uma perna e levantar com a mesma perna.", commonErrors: "Cair no banco; joelho desalinhado.", regressions: ["box-squat"], progressions: [], precautions: P_LOWER }),
  // ---------------- Empurrar
  card({ id: "wall-push-up", name: "Flexão na parede", pattern: "empurrar", objective: "Introdução ao empurrar horizontal", primaryMuscles: ["peitoral maior", "tríceps"], secondaryMuscles: ["deltoide anterior"], equipment: ["parede"], modality: "peso corporal", loadKind: "bodyweight", execution: "Mãos na parede na altura dos ombros, aproximar o peito e empurrar de volta com o corpo alinhado.", commonErrors: "Quadril para trás; cotovelos muito abertos.", regressions: [], progressions: ["incline-push-up"], precautions: P_UPPER, suggestionEligible: true }),
  card({ id: "incline-push-up", name: "Flexão inclinada", pattern: "empurrar", objective: "Empurrar horizontal com carga intermediária", primaryMuscles: ["peitoral maior", "tríceps"], equipment: ["banco ou barra"], modality: "peso corporal", loadKind: "bodyweight", execution: "Mãos em um apoio elevado, corpo alinhado, flexionar e estender os cotovelos.", commonErrors: "Quadril cedendo; amplitude curta.", regressions: ["wall-push-up"], progressions: ["push-up"], precautions: P_UPPER }),
  card({ id: "push-up", name: "Flexão no solo", synonyms: ["apoio"], pattern: "empurrar", objective: "Força de empurrar com peso corporal", primaryMuscles: ["peitoral maior", "tríceps"], equipment: [], modality: "peso corporal", loadKind: "bodyweight", execution: "Corpo alinhado da cabeça aos pés, descer o peito até próximo do chão e empurrar.", commonErrors: "Quadril caindo; cabeça projetada à frente.", regressions: ["incline-push-up"], progressions: [], precautions: P_UPPER }),
  card({ id: "db-bench-press", name: "Supino com halteres", pattern: "empurrar", objective: "Força de empurrar horizontal com carga", primaryMuscles: ["peitoral maior", "tríceps"], equipment: ["banco", "halteres"], modality: "musculação", loadKind: "external_kg", execution: "Deitado no banco, descer os halteres na linha do peito e empurrar para cima.", commonErrors: "Cotovelos a 90° do tronco; perder controle no fundo.", regressions: ["chest-press"], progressions: [], precautions: P_UPPER }),
  card({ id: "chest-press", name: "Chest press", synonyms: ["supino máquina"], pattern: "empurrar", objective: "Empurrar horizontal com trajetória guiada", primaryMuscles: ["peitoral maior", "tríceps"], equipment: ["máquina"], modality: "musculação", loadKind: "external_kg", execution: "Ajustar o banco para as manoplas na altura do peito e empurrar sem travar os cotovelos.", commonErrors: "Banco mal ajustado; ombros subindo.", regressions: ["incline-push-up"], progressions: ["db-bench-press"], precautions: P_UPPER, suggestionEligible: true }),
  card({ id: "landmine-press", name: "Landmine press", pattern: "empurrar", objective: "Empurrar em diagonal, intermediário entre horizontal e vertical", primaryMuscles: ["deltoide anterior", "peitoral maior superior", "tríceps"], equipment: ["barra com landmine"], modality: "musculação", loadKind: "external_kg", execution: "Segurar a ponta da barra à altura do ombro e empurrar para cima e à frente.", commonErrors: "Arquear a lombar; girar o tronco.", regressions: [], progressions: ["db-shoulder-press"], precautions: P_UPPER }),
  card({ id: "db-shoulder-press", name: "Desenvolvimento com halteres", pattern: "empurrar", objective: "Força de empurrar vertical", primaryMuscles: ["deltoide", "tríceps"], equipment: ["halteres", "banco"], modality: "musculação", loadKind: "external_kg", execution: "Empurrar os halteres acima da cabeça a partir da altura dos ombros.", commonErrors: "Compensar com a lombar; amplitude limitada por desconforto ignorado.", regressions: ["landmine-press"], progressions: [], precautions: P_UPPER }),
  // ---------------- Puxar
  card({ id: "band-row", name: "Remada com elástico", pattern: "puxar", objective: "Puxar horizontal com baixa exigência", primaryMuscles: ["dorsais", "romboides", "trapézio médio"], secondaryMuscles: ["bíceps"], equipment: ["elástico"], modality: "elástico", loadKind: "band", execution: "Puxar o elástico em direção ao tronco aproximando as escápulas.", commonErrors: "Elevar os ombros; puxar só com os braços.", regressions: [], progressions: ["seated-row"], precautions: P_UPPER, suggestionEligible: true }),
  card({ id: "seated-row", name: "Remada baixa", pattern: "puxar", objective: "Força de puxar horizontal", primaryMuscles: ["dorsais", "romboides"], equipment: ["polia baixa"], modality: "musculação", loadKind: "external_kg", execution: "Sentado, puxar o cabo até o abdômen mantendo o tronco estável.", commonErrors: "Balançar o tronco; encolher os ombros.", regressions: ["band-row"], progressions: ["one-arm-row"], precautions: P_UPPER, suggestionEligible: true }),
  card({ id: "one-arm-row", name: "Remada unilateral", synonyms: ["serrote"], pattern: "puxar", objective: "Puxar unilateral com controle do tronco", primaryMuscles: ["dorsais", "romboides"], equipment: ["halter", "banco"], modality: "musculação", loadKind: "external_kg", execution: "Apoiado no banco, puxar o halter em direção ao quadril.", commonErrors: "Girar o tronco; puxar em direção ao ombro.", regressions: ["chest-supported-row"], progressions: [], precautions: P_UPPER }),
  card({ id: "chest-supported-row", name: "Remada com apoio de tronco", pattern: "puxar", objective: "Puxar com tronco apoiado, reduzindo demanda lombar", primaryMuscles: ["dorsais", "romboides", "trapézio médio"], equipment: ["banco inclinado", "halteres"], modality: "musculação", loadKind: "external_kg", execution: "Peito apoiado no banco inclinado, puxar os halteres aproximando as escápulas.", commonErrors: "Tirar o peito do apoio.", regressions: ["band-row"], progressions: ["one-arm-row"], precautions: P_UPPER }),
  card({ id: "lat-pulldown", name: "Puxada frontal", pattern: "puxar", objective: "Força de puxar vertical", primaryMuscles: ["latíssimo do dorso"], secondaryMuscles: ["bíceps"], equipment: ["polia alta"], modality: "musculação", loadKind: "external_kg", execution: "Puxar a barra até a parte superior do peito com o tronco levemente inclinado.", commonErrors: "Puxar atrás da nuca; balançar o tronco.", regressions: [], progressions: ["assisted-pull-up"], precautions: P_UPPER }),
  card({ id: "assisted-pull-up", name: "Barra assistida", pattern: "puxar", objective: "Puxar o próprio peso com assistência", primaryMuscles: ["latíssimo do dorso", "bíceps"], equipment: ["barra", "elástico ou máquina"], modality: "musculação", loadKind: "external_kg", execution: "Com assistência, puxar até o queixo passar a barra e descer com controle.", commonErrors: "Amplitude parcial sem critério; balanço.", regressions: ["lat-pulldown"], progressions: [], precautions: P_UPPER }),
  // ---------------- Acessórios
  card({ id: "leg-extension", name: "Extensora", synonyms: ["cadeira extensora"], pattern: "acessório", objective: "Força de quadríceps isolada", primaryMuscles: ["quadríceps"], equipment: ["máquina extensora"], modality: "musculação", loadKind: "external_kg", execution: "Estender os joelhos contra a resistência e voltar devagar.", commonErrors: "Chutar o peso; ajuste do encosto inadequado.", regressions: [], progressions: [], precautions: P_LOWER }),
  card({ id: "hip-abduction", name: "Abdução de quadril", pattern: "acessório", objective: "Força de abdutores de quadril", primaryMuscles: ["glúteo médio", "glúteo mínimo"], equipment: ["máquina, elástico ou peso corporal"], modality: "musculação", loadKind: "external_kg", execution: "Afastar as pernas contra a resistência sem inclinar o tronco.", commonErrors: "Compensar inclinando o tronco.", regressions: [], progressions: [], precautions: P_LOWER }),
  card({ id: "hip-adduction", name: "Adução de quadril", pattern: "acessório", objective: "Força de adutores", primaryMuscles: ["adutores"], equipment: ["máquina ou elástico"], modality: "musculação", loadKind: "external_kg", execution: "Aproximar as pernas contra a resistência com controle.", commonErrors: "Amplitude além do conforto no início.", regressions: [], progressions: [], precautions: P_LOWER }),
  card({ id: "standing-calf-raise", name: "Elevação de panturrilha em pé", pattern: "acessório", objective: "Força de flexores plantares", primaryMuscles: ["gastrocnêmio", "sóleo"], equipment: ["degrau opcional"], modality: "peso corporal", loadKind: "bodyweight", execution: "Subir na ponta dos pés e descer devagar, com apoio para equilíbrio se necessário.", commonErrors: "Movimento rápido sem controle; apoio só nos dedos externos.", regressions: [], progressions: ["seated-calf-raise"], precautions: P_LOWER, suggestionEligible: true }),
  card({ id: "seated-calf-raise", name: "Panturrilha sentado", pattern: "acessório", objective: "Força de sóleo", primaryMuscles: ["sóleo"], equipment: ["máquina ou carga sobre os joelhos"], modality: "musculação", loadKind: "external_kg", execution: "Sentado, elevar os calcanhares contra a carga apoiada nos joelhos.", commonErrors: "Amplitude curta.", regressions: [], progressions: [], precautions: P_LOWER }),
  card({ id: "resisted-dorsiflexion", name: "Dorsiflexão resistida", pattern: "acessório", objective: "Força de dorsiflexores", primaryMuscles: ["tibial anterior"], equipment: ["elástico"], modality: "elástico", loadKind: "band", execution: "Puxar a ponta do pé em direção à canela contra o elástico.", commonErrors: "Girar o pé.", regressions: [], progressions: [], precautions: P_LOWER }),
  card({ id: "elbow-curl-extension", name: "Rosca e extensão de cotovelo", synonyms: ["rosca direta", "tríceps"], pattern: "acessório", objective: "Força de flexores e extensores do cotovelo", primaryMuscles: ["bíceps braquial", "tríceps braquial"], equipment: ["halteres, cabo ou elástico"], modality: "musculação", loadKind: "external_kg", execution: "Flexionar ou estender o cotovelo mantendo o braço junto ao corpo.", commonErrors: "Balançar o tronco.", regressions: [], progressions: [], precautions: P_UPPER }),
  // ---------------- Tronco e transporte
  card({ id: "dead-bug", name: "Dead bug", pattern: "tronco", objective: "Controle do tronco com movimento dos membros", primaryMuscles: ["reto do abdômen", "oblíquos", "transverso do abdômen"], equipment: ["colchonete"], modality: "peso corporal", loadKind: "time_or_distance", execution: "Deitado, braços e joelhos elevados, estender braço e perna opostos sem perder o contato da lombar.", commonErrors: "Prender a respiração; lombar descolando.", regressions: [], progressions: [], precautions: P_TRUNK }),
  card({ id: "bird-dog", name: "Bird dog", synonyms: ["quatro apoios alternado"], pattern: "tronco", objective: "Estabilidade do tronco em quatro apoios", primaryMuscles: ["eretores da espinha", "glúteo máximo"], equipment: ["colchonete"], modality: "peso corporal", loadKind: "time_or_distance", execution: "Em quatro apoios, estender braço e perna opostos mantendo o tronco estável.", commonErrors: "Girar o quadril; elevar demais a perna.", regressions: [], progressions: [], precautions: P_TRUNK }),
  card({ id: "incline-plank", name: "Prancha inclinada", pattern: "tronco", objective: "Prancha com alavanca reduzida", primaryMuscles: ["reto do abdômen", "transverso do abdômen"], equipment: ["banco"], modality: "peso corporal", loadKind: "time_or_distance", execution: "Antebraços em um banco, corpo alinhado, manter a posição respirando.", commonErrors: "Quadril alto ou baixo.", regressions: [], progressions: ["front-plank"], precautions: P_TRUNK }),
  card({ id: "front-plank", name: "Prancha frontal", pattern: "tronco", objective: "Resistência isométrica do tronco", primaryMuscles: ["reto do abdômen", "transverso do abdômen"], equipment: ["colchonete"], modality: "peso corporal", loadKind: "time_or_distance", execution: "Antebraços e pés no chão, corpo alinhado da cabeça aos pés.", commonErrors: "Lombar cedendo; prender a respiração.", regressions: ["incline-plank"], progressions: [], precautions: P_TRUNK }),
  card({ id: "side-plank-mod", name: "Prancha lateral adaptada", pattern: "tronco", objective: "Resistência de oblíquos e abdutores", primaryMuscles: ["oblíquos", "glúteo médio"], equipment: ["colchonete"], modality: "peso corporal", loadKind: "time_or_distance", execution: "De lado, apoiado no antebraço e nos joelhos, elevar o quadril.", commonErrors: "Quadril caindo; ombro sobrecarregado.", regressions: [], progressions: [], precautions: P_TRUNK }),
  card({ id: "pallof-press", name: "Pallof press", pattern: "tronco", objective: "Resistir à rotação do tronco", primaryMuscles: ["oblíquos", "transverso do abdômen"], equipment: ["elástico ou cabo"], modality: "elástico", loadKind: "band", execution: "De lado para a ancoragem, empurrar o elástico à frente do peito sem deixar o tronco girar.", commonErrors: "Girar o tronco; resistência alta demais.", regressions: [], progressions: [], precautions: P_TRUNK }),
  card({ id: "farmer-carry", name: "Farmer carry", synonyms: ["caminhada do fazendeiro"], pattern: "transporte", objective: "Força de preensão e estabilidade durante a marcha", primaryMuscles: ["antebraço", "trapézio", "core"], equipment: ["halteres ou kettlebells"], modality: "musculação", loadKind: "external_kg", execution: "Caminhar segurando um peso em cada mão, postura alta.", commonErrors: "Inclinar o tronco; passos curtos e rápidos.", regressions: [], progressions: ["suitcase-carry"], precautions: P_TRUNK }),
  card({ id: "suitcase-carry", name: "Suitcase carry", synonyms: ["carregamento unilateral"], pattern: "transporte", objective: "Resistir à inclinação lateral durante a marcha", primaryMuscles: ["oblíquos", "quadrado lombar", "antebraço"], equipment: ["halter ou kettlebell"], modality: "musculação", loadKind: "external_kg", execution: "Caminhar com peso em uma mão, mantendo o tronco reto.", commonErrors: "Inclinar para o lado da carga.", regressions: ["farmer-carry"], progressions: [], precautions: P_TRUNK }),
  // ---------------- Mobilidade ativa
  card({ id: "ankle-wall-mobility", name: "Mobilidade de tornozelo na parede", pattern: "mobilidade", objective: "Amplitude ativa de dorsiflexão", primaryMuscles: ["sóleo", "gastrocnêmio"], equipment: ["parede"], modality: "peso corporal", loadKind: "time_or_distance", execution: "Pé à frente da parede, levar o joelho em direção à parede sem tirar o calcanhar do chão.", commonErrors: "Calcanhar sair do chão; joelho cair para dentro.", regressions: [], progressions: [], precautions: "Mobilidade não é correção automática de dor. Respeitar o conforto." }),
  card({ id: "thoracic-rotation", name: "Rotação torácica", synonyms: ["abertura de livro"], pattern: "mobilidade", objective: "Amplitude ativa de rotação torácica", primaryMuscles: ["oblíquos", "musculatura torácica"], equipment: ["colchonete"], modality: "peso corporal", loadKind: "time_or_distance", execution: "Deitado de lado, joelhos flexionados, abrir o braço de cima acompanhando com o olhar.", commonErrors: "Girar a pelve junto.", regressions: [], progressions: [], precautions: "Mobilidade não é correção automática de dor. Respeitar o conforto." }),
  card({ id: "assisted-hip-mobility", name: "Mobilidade de quadril assistida", pattern: "mobilidade", objective: "Amplitude ativa de quadril com apoio", primaryMuscles: ["flexores e extensores do quadril"], equipment: ["apoio fixo"], modality: "peso corporal", loadKind: "time_or_distance", execution: "Segurando um apoio, realizar círculos e balanços controlados da perna.", commonErrors: "Compensar com a lombar.", regressions: [], progressions: [], precautions: P_BAL }),
  card({ id: "shoulder-wall-mobility", name: "Mobilidade de ombro na parede", synonyms: ["deslizamento na parede"], pattern: "mobilidade", objective: "Amplitude ativa de elevação do ombro", primaryMuscles: ["deltoide", "serrátil anterior"], equipment: ["parede"], modality: "peso corporal", loadKind: "time_or_distance", execution: "Antebraços na parede, deslizar para cima até a amplitude confortável.", commonErrors: "Arquear a lombar; elevar os ombros às orelhas.", regressions: [], progressions: [], precautions: P_UPPER }),
  card({ id: "pelvic-spine-movements", name: "Movimentos pélvicos e de coluna confortáveis", synonyms: ["báscula pélvica", "gato-camelo"], pattern: "mobilidade", objective: "Movimento ativo da coluna dentro do conforto", primaryMuscles: ["musculatura do tronco"], equipment: ["colchonete"], modality: "peso corporal", loadKind: "time_or_distance", execution: "Em quatro apoios ou deitado, mover a pelve e a coluna lentamente dentro da amplitude confortável.", commonErrors: "Forçar o fim da amplitude.", regressions: [], progressions: [], precautions: "Mobilidade não é correção automática de dor." }),
  // ---------------- Equilíbrio e marcha
  card({ id: "weight-shift", name: "Transferência de peso", pattern: "equilíbrio e marcha", objective: "Controle postural em apoio bipodal", primaryMuscles: ["musculatura de tornozelo e quadril"], equipment: ["apoio próximo"], modality: "peso corporal", loadKind: "time_or_distance", execution: "Transferir o peso lentamente entre os pés, à frente e para os lados.", commonErrors: "Mover só o tronco.", regressions: [], progressions: ["tandem-stance"], precautions: P_BAL }),
  card({ id: "tandem-stance", name: "Apoio tandem", pattern: "equilíbrio e marcha", objective: "Equilíbrio com base reduzida", primaryMuscles: ["musculatura de tornozelo e quadril"], equipment: ["apoio próximo"], modality: "peso corporal", loadKind: "time_or_distance", execution: "Um pé à frente do outro, calcanhar encostado nos dedos, manter a posição.", commonErrors: "Prender a respiração; olhar para os pés.", regressions: ["weight-shift"], progressions: ["single-leg-stance-assisted"], precautions: P_BAL }),
  card({ id: "single-leg-stance-assisted", name: "Apoio unipodal assistido", pattern: "equilíbrio e marcha", objective: "Equilíbrio em uma perna com segurança", primaryMuscles: ["glúteo médio", "musculatura do tornozelo"], equipment: ["apoio fixo"], modality: "peso corporal", loadKind: "time_or_distance", execution: "Ficar em uma perna tocando levemente um apoio.", commonErrors: "Quadril caindo para o lado.", regressions: ["tandem-stance"], progressions: [], precautions: P_BAL }),
  card({ id: "gait-direction-change", name: "Marcha com mudança de direção", pattern: "equilíbrio e marcha", objective: "Controle dinâmico da marcha", primaryMuscles: ["membros inferiores"], equipment: ["espaço livre"], modality: "peso corporal", loadKind: "time_or_distance", execution: "Caminhar e mudar de direção ao comando, em velocidade confortável.", commonErrors: "Giros bruscos.", regressions: [], progressions: ["obstacle-step"], precautions: P_BAL }),
  card({ id: "obstacle-step", name: "Transposição de obstáculos baixos", pattern: "equilíbrio e marcha", objective: "Elevar o pé e manter o equilíbrio na marcha", primaryMuscles: ["flexores do quadril", "membros inferiores"], equipment: ["obstáculos baixos"], modality: "peso corporal", loadKind: "time_or_distance", execution: "Caminhar passando por cima de obstáculos baixos.", commonErrors: "Obstáculo alto demais para o nível atual.", regressions: ["gait-direction-change"], progressions: [], precautions: P_BAL }),
  card({ id: "supported-step-up", name: "Subida de degrau com apoio", pattern: "equilíbrio e marcha", objective: "Subir degrau com segurança", primaryMuscles: ["quadríceps", "glúteo máximo"], equipment: ["degrau", "corrimão"], modality: "peso corporal", loadKind: "bodyweight", execution: "Segurando o corrimão, subir e descer o degrau com controle.", commonErrors: "Puxar demais com os braços.", regressions: [], progressions: ["step-up"], precautions: P_BAL }),
  // ---------------- Aeróbio
  card({ id: "walking", name: "Caminhada", pattern: "aeróbio", objective: "Condicionamento aeróbio de baixo impacto", primaryMuscles: ["membros inferiores"], equipment: [], modality: "aeróbio", loadKind: "time_or_distance", execution: "Caminhar em ritmo e duração definidos, progredindo gradualmente.", commonErrors: "Progressão rápida demais.", regressions: [], progressions: ["interval-walking"], precautions: "Na lombalgia, o resultado do WalkBack vale para pessoas recuperadas de episódio inespecífico, com educação e progressão individualizada; não extrapolar para crise aguda ou radiculopatia.", references: ["who-2020-pa", "walkback-2024"], evidenceNote: "Atividade aeróbia tem respaldo geral (OMS 2020). O WalkBack (2024) estudou caminhada progressiva + educação após recuperação de lombalgia inespecífica.", suggestionEligible: true }),
  card({ id: "cycling", name: "Bicicleta", pattern: "aeróbio", objective: "Condicionamento aeróbio sem impacto", primaryMuscles: ["quadríceps", "glúteos"], equipment: ["bicicleta ergométrica"], modality: "aeróbio", loadKind: "time_or_distance", execution: "Pedalar em intensidade e duração definidas, banco ajustado.", commonErrors: "Banco baixo demais.", regressions: [], progressions: [], precautions: "Ajustar altura do banco.", references: ["who-2020-pa"], evidenceNote: "Atividade aeróbia tem respaldo geral (OMS 2020); variação específica depende de avaliação." }),
  card({ id: "elliptical", name: "Elíptico", synonyms: ["transport"], pattern: "aeróbio", objective: "Condicionamento aeróbio de baixo impacto", primaryMuscles: ["membros inferiores e superiores"], equipment: ["elíptico"], modality: "aeróbio", loadKind: "time_or_distance", execution: "Movimento contínuo em intensidade definida, postura alta.", commonErrors: "Apoiar o peso nos braços.", regressions: [], progressions: [], precautions: P_BAL, references: ["who-2020-pa"], evidenceNote: "Atividade aeróbia tem respaldo geral (OMS 2020); variação específica depende de avaliação." }),
  card({ id: "interval-walking", name: "Caminhada intervalada adaptada", pattern: "aeróbio", objective: "Alternar ritmos para progredir o condicionamento", primaryMuscles: ["membros inferiores"], equipment: [], modality: "aeróbio", loadKind: "time_or_distance", execution: "Alternar períodos de caminhada mais rápida e mais leve.", commonErrors: "Intervalos intensos demais para o nível atual.", regressions: ["walking"], progressions: [], precautions: "Intensidade conforme avaliação e tolerância.", references: ["who-2020-pa"], evidenceNote: "Atividade aeróbia tem respaldo geral (OMS 2020); esta variação depende de avaliação." }),
  // ---------------- Potência e tarefa funcional
  card({ id: "sit-to-stand-fast", name: "Sentar e levantar com intenção de subir mais rápido", pattern: "potência", objective: "Velocidade de movimento em tarefa diária", primaryMuscles: ["quadríceps", "glúteo máximo"], equipment: ["cadeira"], modality: "peso corporal", loadKind: "bodyweight", execution: "Levantar o mais rápido possível com segurança; sentar devagar.", commonErrors: "Perder o controle ao sentar.", regressions: ["sit-to-stand"], progressions: [], precautions: P_PWR }),
  card({ id: "fast-step-up", name: "Subida de degrau com intenção rápida", pattern: "potência", objective: "Velocidade em tarefa unilateral", primaryMuscles: ["quadríceps", "glúteo máximo"], equipment: ["degrau"], modality: "peso corporal", loadKind: "bodyweight", execution: "Subir o degrau rapidamente com controle, descer devagar.", commonErrors: "Tropeçar por fadiga.", regressions: ["step-up"], progressions: [], precautions: P_PWR }),
  card({ id: "light-med-ball-throw", name: "Arremesso leve de medicine ball", pattern: "potência", objective: "Potência de membros superiores e tronco", primaryMuscles: ["peitoral", "tríceps", "core"], equipment: ["medicine ball leve", "parede"], modality: "funcional", loadKind: "external_kg", execution: "Arremessar a bola contra a parede a partir do peito, em contexto adequado.", commonErrors: "Bola pesada demais; arremessos com fadiga.", regressions: [], progressions: [], precautions: P_PWR, references: [], evidenceNote: PENDING }),
  // ---------------- Pilates
  card({ id: "reformer-footwork", name: "Footwork no Reformer", pattern: "pilates", objective: "Força e controle de membros inferiores no Reformer", primaryMuscles: ["quadríceps", "glúteos", "panturrilha"], equipment: ["Reformer"], modality: "pilates", loadKind: "pilates_springs", execution: "Deitado no carrinho, pés na barra, estender e flexionar os joelhos com controle.", commonErrors: "Travar os joelhos; molas sem registro.", regressions: [], progressions: [], precautions: P_PIL }),
  card({ id: "pilates-bridge", name: "Ponte (Pilates)", pattern: "pilates", objective: "Mobilidade e controle da coluna e extensão de quadril", primaryMuscles: ["glúteo máximo", "isquiotibiais"], equipment: ["colchonete ou Reformer"], modality: "pilates", loadKind: "pilates_springs", execution: "Elevar a pelve articulando a coluna e descer vértebra a vértebra.", commonErrors: "Arquear a lombar no topo.", regressions: [], progressions: [], precautions: P_PIL }),
  card({ id: "spring-arm-work", name: "Trabalho de braços com molas", pattern: "pilates", objective: "Força de membros superiores com molas", primaryMuscles: ["deltoide", "tríceps", "bíceps"], equipment: ["Reformer ou Cadillac"], modality: "pilates", loadKind: "pilates_springs", execution: "Movimentos de braço contra a resistência das molas com tronco estável.", commonErrors: "Tronco compensando.", regressions: [], progressions: [], precautions: P_PIL }),
  card({ id: "pilates-quadruped", name: "Quadrupedia (Pilates)", pattern: "pilates", objective: "Estabilidade de tronco em quatro apoios", primaryMuscles: ["core", "glúteos"], equipment: ["Reformer ou colchonete"], modality: "pilates", loadKind: "pilates_springs", execution: "Em quatro apoios, deslizar ou estender os membros mantendo a estabilidade.", commonErrors: "Perda do alinhamento da pelve.", regressions: [], progressions: [], precautions: P_PIL }),
  card({ id: "pilates-side-series", name: "Série lateral (Pilates)", pattern: "pilates", objective: "Controle de quadril em decúbito lateral", primaryMuscles: ["glúteo médio", "adutores"], equipment: ["colchonete"], modality: "pilates", loadKind: "pilates_springs", execution: "Deitado de lado, movimentar a perna de cima com a pelve estável.", commonErrors: "Rolar a pelve para trás.", regressions: [], progressions: [], precautions: P_PIL }),
  card({ id: "chair-assisted", name: "Exercícios assistidos na Chair", pattern: "pilates", objective: "Força e controle com assistência das molas da Chair", primaryMuscles: ["membros inferiores", "core"], equipment: ["Chair"], modality: "pilates", loadKind: "pilates_springs", execution: "Exercícios de subida, pressão do pedal e controle com molas ajustadas para assistência.", commonErrors: "Montagem sem registro; molas que não oferecem a assistência pretendida.", regressions: [], progressions: [], precautions: P_PIL }),
];

// ---------------------------------------------------------------------------
// Junção com o catálogo detalhado (v2)
// Estratégia de migração: o ID é estável. Se a ficha v2 usa um ID existente, ela
// substitui os campos descritivos e o nome antigo vira apelido; referências,
// elegibilidade no motor de regras e o histórico de treinos continuam iguais.
// Campos legados de músculo (texto livre) são derivados dos papéis da ficha.
// ---------------------------------------------------------------------------
function unique<T>(xs: T[]): T[] {
  return Array.from(new Set(xs));
}

function fromEntry(e: CatalogEntry, legacy?: ExerciseCard): ExerciseCard {
  const names = (role: string) => e.detail.muscles.filter((m) => m.role === role).map((m) => muscleRefName(m.ref));
  const seen = new Set([fold(e.name), ...e.englishNames.map(fold)]);
  const aliases = [...e.aliases, ...(legacy ? [legacy.name, ...legacy.synonyms] : [])].filter((a) => {
    const k = fold(a);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return {
    id: e.id,
    name: e.name,
    synonyms: aliases,
    englishNames: e.englishNames,
    pattern: e.pattern,
    objective: e.objective,
    primaryMuscles: names("primary"),
    secondaryMuscles: [...names("secondary"), ...names("stabilizer")],
    equipment: e.equipment,
    // Tipo de carga e modalidade de IDs antigos não mudam: a prescrição padrão e os registros
    // de execução de treinos existentes dependem deles.
    modality: legacy?.modality ?? e.modality,
    loadKind: legacy?.loadKind ?? e.loadKind,
    execution: e.detail.instructions.join(" "),
    commonErrors: e.commonErrors,
    regressions: e.regressions,
    progressions: e.progressions,
    doseVariables: e.detail.prescriptionFields,
    precautions: e.precautions,
    media: null,
    references: legacy?.references ?? [],
    evidenceNote: legacy?.evidenceNote ?? "Afirmações e referências na aba Referências.",
    reviewStatus: "pendente de revisão editorial",
    suggestionEligible: legacy?.suggestionEligible ?? false,
    purposes: e.purposes,
    laterality: e.laterality,
    difficulty: e.difficulty,
    regions: unique(e.detail.muscles.flatMap((m) => expandMuscleRef(m.ref).flatMap((x) => x.regions))),
    detail: e.detail,
  };
}

function mergeCatalog(legacy: ExerciseCard[], entries: CatalogEntry[]): ExerciseCard[] {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const merged = legacy.map((l) => (byId.has(l.id) ? fromEntry(byId.get(l.id)!, l) : l));
  const legacyIds = new Set(legacy.map((l) => l.id));
  const added = entries.filter((e) => !legacyIds.has(e.id)).map((e) => fromEntry(e));
  return [...merged, ...added];
}

export const EXERCISES: ExerciseCard[] = mergeCatalog(LEGACY_EXERCISES, CATALOG_ENTRIES);
/** IDs que existiam antes do catálogo v2 (treinos antigos podem referenciá-los). */
export const LEGACY_EXERCISE_IDS: string[] = LEGACY_EXERCISES.map((e) => e.id);

export const EXERCISE_BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export const PATTERNS: MovementPattern[] = Array.from(new Set(EXERCISES.map((e) => e.pattern)));
export const MODALITIES: Modality[] = Array.from(new Set(EXERCISES.map((e) => e.modality)));
/** Lista legada de músculos em texto (mantida para compatibilidade). */
export const MUSCLE_GROUPS: string[] = Array.from(new Set(EXERCISES.flatMap((e) => e.primaryMuscles))).sort((a, b) => a.localeCompare(b, "pt-BR"));
export const EQUIPMENT: string[] = Array.from(new Set(EXERCISES.flatMap((e) => e.equipment))).sort((a, b) => a.localeCompare(b, "pt-BR"));

/** Opções do filtro de músculo: grupos e músculos individuais do registro anatômico. */
export const MUSCLE_OPTIONS: { value: string; label: string }[] = [
  ...MUSCLE_GROUPS_DEF.map((g) => ({ value: g.id, label: g.name })),
  ...MUSCLES.filter((m) => !m.groupId).map((m) => ({ value: m.id, label: m.name })),
  ...MUSCLES.filter((m) => m.groupId).map((m) => ({ value: m.id, label: m.name })),
].sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

export const DIFFICULTIES: Difficulty[] = ["iniciante", "intermediário", "avançado"];

/** Todos os IDs de músculo e grupo ligados a uma ficha (para filtro). */
export function exerciseMuscleIds(e: ExerciseCard): Set<string> {
  const ids = new Set<string>();
  if (!e.detail) return ids;
  for (const r of e.detail.muscles) {
    ids.add(r.ref);
    for (const m of expandMuscleRef(r.ref)) {
      ids.add(m.id);
      if (m.groupId) ids.add(m.groupId);
    }
  }
  return ids;
}

function legacyMuscleMatch(e: ExerciseCard, muscleId: string): boolean {
  const label = fold(MUSCLE_GROUP_BY_ID.get(muscleId)?.name ?? MUSCLE_BY_ID.get(muscleId)?.name ?? muscleId);
  return [...e.primaryMuscles, ...e.secondaryMuscles].some((m) => fold(m) === label || fold(m).startsWith(label));
}

export type PurposeFilter = "" | Purpose;

export interface ExerciseQuery {
  text?: string;
  pattern?: MovementPattern | "";
  muscle?: string;
  equipment?: string;
  modality?: Modality | "";
  purpose?: PurposeFilter;
  region?: string;
  laterality?: Laterality | "";
  difficulty?: Difficulty | "";
}

export function searchExercises(q: ExerciseQuery): ExerciseCard[] {
  const t = fold(q.text ?? "");
  return EXERCISES.filter((e) => {
    if (q.purpose && !e.purposes.includes(q.purpose)) return false;
    if (q.pattern && e.pattern !== q.pattern) return false;
    if (q.modality && e.modality !== q.modality) return false;
    if (q.equipment && !e.equipment.includes(q.equipment)) return false;
    if (q.region && !e.regions.includes(q.region)) return false;
    if (q.laterality && e.laterality !== q.laterality) return false;
    if (q.difficulty && e.difficulty !== q.difficulty) return false;
    if (q.muscle && !exerciseMuscleIds(e).has(q.muscle) && !legacyMuscleMatch(e, q.muscle)) return false;
    if (!t) return true;
    const muscleNames = e.detail ? e.detail.muscles.flatMap((r) => [muscleRefName(r.ref), ...expandMuscleRef(r.ref).map((m) => m.name)]) : [];
    return [e.name, ...e.synonyms, ...e.englishNames, e.pattern, ...e.primaryMuscles, ...muscleNames].some((s) => fold(s).includes(t));
  });
}
