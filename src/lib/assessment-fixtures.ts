// ==============================================================================
// STUDIO LEANDRO RANGEL - Estrutura e Fixtures das 11 Etapas da Avaliação
// ==============================================================================
// Importante: Plataforma educativa. Não inventa algoritmos de triagem clínica,
// não substitui julgamento profissional e não coleta nomes completos de alunos praticantes (V1 pseudonimizada).

export interface StageDefinition {
  id: number;
  slug: string;
  title: string;
  shortDesc: string;
  category: "Conheça o caso" | "Organize as hipóteses" | "Planeje o acompanhamento" | "Reavalie a evolução";
  estimatedMinutes: number;
}

export const STAGES_LIST: StageDefinition[] = [
  { id: 0, slug: "inicio", title: "0. Início e Contexto", shortDesc: "Boas-vindas, orientações de uso, mapa do percurso e status de acesso.", category: "Conheça o caso", estimatedMinutes: 3 },
  { id: 1, slug: "paciente", title: "1. Dados do Aluno", shortDesc: "Código gerado, iniciais, demografia essencial e queixa principal.", category: "Conheça o caso", estimatedMinutes: 4 },
  { id: 2, slug: "sinais-alerta", title: "2. Sinais de Alerta (Red Flags)", shortDesc: "Rastreio estruturado de cauda equina, fratura, neoplasia e infecção.", category: "Conheça o caso", estimatedMinutes: 5 },
  { id: 3, slug: "anamnese-sinss", title: "3. Anamnese SINSS & Mapa da Dor", shortDesc: "Gravidade, Irritabilidade, Natureza, Estágio, Estabilidade e mapa corporal interativo.", category: "Conheça o caso", estimatedMinutes: 8 },
  { id: 4, slug: "mecanismo-dor", title: "4. Hipóteses de Mecanismo", shortDesc: "Raciocínio clínico sobre componentes nociceptivo, neuropático e nociplástico.", category: "Organize as hipóteses", estimatedMinutes: 6 },
  { id: 5, slug: "ferramentas-avaliacao", title: "5. Catálogo de Ferramentas", shortDesc: "Fichas técnicas de questionários e escalas validados para avaliação física.", category: "Organize as hipóteses", estimatedMinutes: 5 },
  { id: 6, slug: "exame-fisico", title: "6. Exame Físico Estruturado", shortDesc: "Sensibilidade, reflexos, força miotômica, neurodinâmica e algometria.", category: "Organize as hipóteses", estimatedMinutes: 10 },
  { id: 7, slug: "fatores-psicossociais", title: "7. Fatores Psicossociais", shortDesc: "Sono, crenças de medo-evitação, estresse percebido e contexto educativo.", category: "Organize as hipóteses", estimatedMinutes: 6 },
  { id: 8, slug: "plano-acompanhamento", title: "8. Plano de Acompanhamento", shortDesc: "Até 3 metas significativas, justificativa clínica e prescrição de sobrecarga.", category: "Planeje o acompanhamento", estimatedMinutes: 8 },
  { id: 9, slug: "evolucao", title: "9. Evolução e Volume de Treino", shortDesc: "Linha do tempo de reavaliação, dor/função e agregação semanal de volume de carga.", category: "Reavalie a evolução", estimatedMinutes: 7 },
  { id: 10, slug: "glossario-referencias", title: "10. Glossário e Referências", shortDesc: "Terminologia científica padronizada e repositório de evidências candidatas.", category: "Reavalie a evolução", estimatedMinutes: 4 },
];

export interface AssessmentRecord {
  id: string;
  patientCode: string; // Ex: TRE-5831
  patientInitials: string; // Ex: M.R.
  age: number;
  activityLevel: string;
  complaint: string;
  assessmentDate: string;
  painRegion: string;
  currentStage: number;
  isDemo: boolean;
  
  // Etapa 2: Red flags checklist
  redFlags: {
    caudaEquina: { checked: boolean; note: string };
    fracture: { checked: boolean; note: string };
    malignancy: { checked: boolean; note: string };
    infection: { checked: boolean; note: string };
    overallStatus: "clear" | "alert_present" | "pending_review";
  };

  // Etapa 3: SINSS & Body map
  sinss: {
    severity: "Leve (EVA 1-3)" | "Moderada (EVA 4-6)" | "Acentuada (EVA 7-10)";
    irritability: "Baixa (demora a piorar, alivia rápido)" | "Moderada" | "Alta (piora imediata, alívio lento)";
    nature: string;
    stage: "Agudo (< 6 sem)" | "Subagudo (6 a 12 sem)" | "Crônico (> 12 sem)";
    stability: "Melhorando" | "Estável" | "Piorando";
    dailyPattern: string;
    aggravatingFactors: string[];
    relievingFactors: string[];
    sleepImpact: string;
    selectedBodyRegions: string[]; // Chaves do mapa anatômico
  };

  // Etapa 4: Hipóteses de Mecanismo
  mechanisms: {
    nociceptiveRating: "improvável" | "possível" | "provável";
    neuropathicRating: "improvável" | "possível" | "provável";
    nociplasticRating: "improvável" | "possível" | "provável";
    clinicalRationale: string;
  };

  // Etapa 5: Ferramentas selecionadas
  selectedTools: string[];

  // Etapa 6: Exame físico
  physicalExam: {
    sensationNotes: string;
    reflexes: { patellar: string; achilles: string };
    strengthMiotomes: { l2_l3: string; l4: string; l5: string; s1: string };
    neurodynamicTests: { slr: string; slump: string };
    algometryKgPerCm2?: number;
  };

  // Etapa 7: Fatores psicossociais
  psychosocial: {
    sleepQuality: "Boa" | "Moderada" | "Prejudicada";
    fearAvoidanceIndicators: string;
    stressLevel: "Baixo" | "Moderado" | "Elevado";
    educationalNotes: string;
  };

  // Etapa 8: Plano de Acompanhamento
  carePlan: {
    goals: [string, string?, string?];
    rationale: string;
    plannedExercises: Array<{
      name: string;
      sets: number;
      reps: number;
      targetLoadKg: number;
      frequency: string;
    }>;
    nextReassessmentDate: string;
  };

  // Etapa 9: Evolução
  evolutionNotes: string;
}

// ==============================================================================
// REGISTRO FICTÍCIO DE DEMONSTRAÇÃO (TRE-5831)
// ==============================================================================
export const DEMO_ASSESSMENT_FIXTURE: AssessmentRecord = {
  id: "demo-tre-5831",
  patientCode: "TRE-5831",
  patientInitials: "M. R.",
  age: 42,
  activityLevel: "Moderadamente ativo (caminhada 2x/sem, trabalho em escritório)",
  complaint: "Dor lombar baixa à direita há 6 semanas com irradiação intermitente para glúteo e face posterior da coxa.",
  assessmentDate: "2027-02-01",
  painRegion: "Coluna Lombar e Glúteo Direito",
  currentStage: 3,
  isDemo: true,

  redFlags: {
    caudaEquina: { checked: false, note: "Sem anestesia em sela, sem incontinência esfincteriana ou perda de controle motor súbita." },
    fracture: { checked: false, note: "Sem trauma recente de alta energia, sem uso crônico de corticoide." },
    malignancy: { checked: false, note: "Sem perda de peso inexplicada, sem dor noturna não mecânica incessante, sem histórico oncológico." },
    infection: { checked: false, note: "Afebril, sem calafrios, sem procedimentos invasivos recentes ou imunossupressão." },
    overallStatus: "clear",
  },

  sinss: {
    severity: "Moderada (EVA 4-6)",
    irritability: "Moderada",
    nature: "Apresentação predominantemente mecânica com possível sensibilidade neural periférica.",
    stage: "Subagudo (6 a 12 sem)",
    stability: "Estável",
    dailyPattern: "Rigidez leve ao acordar (< 15 min), piora após 40 minutos na postura sentada; melhora ao levantar e caminhar.",
    aggravatingFactors: ["Permanecer sentado prolongado", "Flexão de tronco com carga", "Tosse/espirro ocasional"],
    relievingFactors: ["Caminhada em ritmo confortável", "Decúbito dorsal com pernas elevadas", "Calor local superficial"],
    sleepImpact: "Despertares esporádicos ao mudar de decúbito na cama.",
    selectedBodyRegions: ["lumbar", "right_glute", "right_posterior_thigh"],
  },

  mechanisms: {
    nociceptiveRating: "provável",
    neuropathicRating: "possível",
    nociplasticRating: "improvável",
    clinicalRationale: "Sintomas mecânicos claros na região lombar/glútea com alívio postural, sem déficit neurológico deficitário instalado. Aspecto sugestivo de componente nociceptivo musculoesquelético predominante com discreta sensibilização mecânica neural.",
  },

  selectedTools: ["vas", "par-q"],

  physicalExam: {
    sensationNotes: "Sensibilidade tátil superficial preservada e simétrica em dermátomos L3, L4, L5 e S1.",
    reflexes: { patellar: "Normorreflexo (+2/+2 bilateral)", achilles: "Normorreflexo (+2/+2 bilateral)" },
    strengthMiotomes: { l2_l3: "Grau 5/5 bilateral", l4: "Grau 5/5 bilateral", l5: "Grau 5/5 bilateral", s1: "Grau 5/5 bilateral" },
    neurodynamicTests: {
      slr: "Elevação da perna reta direita a 65° reproduz tensão em face posterior da coxa; sensibilização por dorsiflexão discreta.",
      slump: "Slump test positivo à direita com alívio na extensão cervical.",
    },
    algometryKgPerCm2: 3.2,
  },

  psychosocial: {
    sleepQuality: "Moderada",
    fearAvoidanceIndicators: "Receio de agachar ou carregar sacolas leves por medo de danificar a coluna.",
    stressLevel: "Moderado",
    educationalNotes: "Necessidade de desmistificar a vulnerabilidade estrutural da coluna e promover reintrodução gradual de movimento com sobrecarga dosada.",
  },

  carePlan: {
    goals: [
      "Permanecer sentado em estação de trabalho por até 60 minutos sem desconforto acima de EVA 2.",
      "Retomar caminhada contínua de 40 minutos em ritmo moderado.",
      "Realizar agachamento caixa com carga de 25-30 kg mantendo percepção de segurança.",
    ],
    rationale: "Foco em exposição gradual ao movimento, restauração de capacidade de carga para extensores de quadril e cadeia posterior, e fortalecimento progressivo.",
    plannedExercises: [
      { name: "Agachamento Caixa", sets: 3, reps: 10, targetLoadKg: 25, frequency: "2x por semana" },
      { name: "Leg Press Horizontal", sets: 3, reps: 10, targetLoadKg: 20, frequency: "2x por semana" },
      { name: "Ponte Glútea com Elástico", sets: 3, reps: 15, targetLoadKg: 0, frequency: "3x por semana" },
    ],
    nextReassessmentDate: "2027-03-01",
  },

  evolutionNotes: "Aluno demonstrou excelente tolerância às cargas iniciais de fevereiro. Volume semanal progrediu de 1.200 kg para 1.600 kg sem exacerbação dos sintomas.",
};

// ==============================================================================
// CATÁLOGO DE FERRAMENTAS VALIDADAS (CASCA EDUCATIVA SEM FERIR DIREITOS)
// ==============================================================================
export interface ToolCatalogItem {
  id: string;
  name: string;
  acronym: string;
  purpose: string;
  targetDomain: string;
  validatedInBrazil: boolean;
  versionReference: string;
  licensingNotice: string;
  clinicalInterpretationNote: string;
}

export const TOOLS_CATALOG: ToolCatalogItem[] = [
  {
    id: "vas",
    name: "Escala Visual Analógica / Numérica",
    acronym: "EVA / EVN",
    purpose: "Avaliação unidimensional da intensidade subjetiva da dor (0 a 10).",
    targetDomain: "Intensidade da Dor",
    validatedInBrazil: true,
    versionReference: "Instrumento de domínio público universalmente validado em diversas populações.",
    licensingNotice: "Domínio público.",
    clinicalInterpretationNote: "Aferição simples com valores ancorados de 0 ('Sem dor') a 10 ('A pior dor imaginável').",
  },
  {
    id: "par-q",
    name: "Physical Activity Readiness Questionnaire",
    acronym: "PAR-Q+",
    purpose: "Triagem pré-participação para identificar indivíduos que necessitam de avaliação médica antes de iniciar atividade física.",
    targetDomain: "Triagem de Segurança",
    validatedInBrazil: true,
    versionReference: "Warburton DER et al. The Physical Activity Readiness Questionnaire for Everyone (PAR-Q+) and Electronic Physical Activity Readiness Medical Examination (ePARmed-X+), 2015.",
    licensingNotice: "Disponível para uso profissional com citação adequada.",
    clinicalInterpretationNote: "Respostas afirmativas indicam necessidade de liberação médica ou modificação supervisionada do programa.",
  },
  {
    id: "ipaq",
    name: "International Physical Activity Questionnaire",
    acronym: "IPAQ",
    purpose: "Avaliação do nível de atividade física habitual em diferentes contextos (trabalho, transporte, lazer).",
    targetDomain: "Nível de Atividade Física",
    validatedInBrazil: true,
    versionReference: "Matsudo S et al. Questionário Internacional de Atividade Física (IPAQ): estudo de validade e reprodutibilidade no Brasil (Rev Bras Ativ Fís Saúde, 2001).",
    licensingNotice: "Domínio público para uso acadêmico e profissional.",
    clinicalInterpretationNote: "Classifica em sedentário, insuficientemente ativo, ativo ou muito ativo.",
  },
  {
    id: "rpe",
    name: "Escala de Percepção Subjetiva de Esforço",
    acronym: "RPE / PSE",
    purpose: "Monitoramento da intensidade do exercício pela percepção subjetiva do praticante.",
    targetDomain: "Controle de Carga",
    validatedInBrazil: true,
    versionReference: "Borg G. Borg's Perceived Exertion and Pain Scales (1998). Versões CR10 e CR100.",
    licensingNotice: "Escalas originais protegidas; versões adaptadas de uso comum na prática profissional.",
    clinicalInterpretationNote: "Valores entre 6-8 indicam esforço moderado-alto; acima de 8 é esforço muito intenso.",
  },
  {
    id: "sit-reach",
    name: "Teste de Sentar e Alcançar",
    acronym: "Sit-and-Reach",
    purpose: "Avaliação da flexibilidade da cadeia posterior (isquiotibiais e região lombar).",
    targetDomain: "Capacidade Física",
    validatedInBrazil: true,
    versionReference: "Wells KF, Dillon EK. The sit and reach: a test of back and leg flexibility (Res Q, 1952). Normas brasileiras: Projeto Esporte Brasil (PROESP-BR).",
    licensingNotice: "Domínio público.",
    clinicalInterpretationNote: "Valores de referência variam por idade e sexo. Limitações importantes devem ser investigadas.",
  },
];

// ==============================================================================
// GLOSSÁRIO E REGISTRO DE REFERÊNCIAS
// ==============================================================================
export interface GlossaryItem {
  term: string;
  category: "Dor" | "Biomecânica" | "Metodologia" | "Legislação" | "Treinamento";
  definition: string;
  clinicalRelevance: string;
  sourceCandidate: string;
}

export const GLOSSARY_ITEMS: GlossaryItem[] = [
  {
    term: "RPE (percepção subjetiva de esforço)",
    category: "Treinamento",
    definition: "Nota de 0 a 10 que o aluno dá para o quanto a série ou a sessão foi pesada.",
    clinicalRelevance: "Ajuda a ajustar a carga no dia a dia. Não é a mesma coisa que dor: os dois são registrados em campos separados.",
    sourceCandidate: "Escalas de percepção de esforço (ex.: Borg CR10). Conferir a versão usada antes de padronizar.",
  },
  {
    term: "RIR (repetições em reserva)",
    category: "Treinamento",
    definition: "Quantas repetições o aluno ainda conseguiria fazer ao terminar a série.",
    clinicalRelevance: "Outra forma de controlar o esforço. O sistema não converte RIR em RPE automaticamente.",
    sourceCandidate: "Literatura de autorregulação em treino resistido; ver ACSM 2026 na bibliografia.",
  },
  {
    term: "Dose",
    category: "Treinamento",
    definition: "Combinação de séries, repetições ou duração, carga, descanso e esforço prescrita para um exercício.",
    clinicalRelevance: "A evidência de uma modalidade não define a dose individual: quem decide é o professor, a partir da avaliação.",
    sourceCandidate: "ACSM 2026 (adultos saudáveis).",
  },
  {
    term: "Regressão e progressão",
    category: "Treinamento",
    definition: "Versões mais fáceis ou mais difíceis do mesmo exercício, usadas para ajustar a tarefa ao aluno.",
    clinicalRelevance: "Cada ficha da biblioteca indica regressões e progressões cadastradas.",
    sourceCandidate: "Critério operacional do produto.",
  },
  {
    term: "Triagem pré-participação",
    category: "Metodologia",
    definition: "Perguntas feitas antes de iniciar ou progredir o exercício para identificar quem precisa de liberação médica.",
    clinicalRelevance: "Um 'sim' bloqueia sugestões automáticas. Ausência de alerta não certifica segurança.",
    sourceCandidate: "Riebe et al., 2015 (ACSM). DOI 10.1249/MSS.0000000000000664.",
  },
  {
    term: "Volume de Carga (Volume Load)",
    category: "Biomecânica",
    definition: "Métrica quantitativa definida como o somatório do produto de repetições concluídas pela carga externa em quilogramas em todas as séries realizadas.",
    clinicalRelevance: "Permite monitorar a tolerância do aluno e planejar progressões seguras no treinamento resistido.",
    sourceCandidate: "Schoenfeld BJ et al. Muscular adaptations in low-versus high-load resistance training (J Strength Cond Res, 2016).",
  },
  {
    term: "Red Flags (Sinais de Alerta)",
    category: "Metodologia",
    definition: "Sinais e sintomas indicativos de condições graves subjacentes (infecção, fratura, neoplasia, síndrome da cauda equina) que demandam encaminhamento médico imediato.",
    clinicalRelevance: "Prioridade absoluta na triagem inicial para segurança do aluno antes de qualquer exercício intenso.",
    sourceCandidate: "Verhagen AP et al. Red flags presented in current low back pain guidelines (Eur Spine J, 2016).",
  },
  {
    term: "Pseudonimização (LGPD)",
    category: "Legislação",
    definition: "Tratamento por meio do qual um dado perde a possibilidade de associação, direta ou indireta, a um indivíduo, senão pelo uso de informação adicional mantida separadamente.",
    clinicalRelevance: "O Studio Leandro Rangel utiliza códigos gerados (ex: TRE-5831) em vez de nomes completos para resguardar a privacidade na fase educativa.",
    sourceCandidate: "Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018, Art. 13).",
  },
];
