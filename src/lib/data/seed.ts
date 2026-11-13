// Dados FICTÍCIOS de demonstração. Toda entidade tem isDemo: true e a UI exibe o rótulo.
import type { Actor, Assessment, AssessmentBlocks, ExecutionLog, Trainee, TrainingPlan } from "@/lib/domain/types";
import { defaultPrescription } from "@/lib/domain/plans";
import { EXERCISE_BY_ID } from "@/lib/domain/exercise-library";

export const DEMO_ACTORS: Actor[] = [
  { id: "prof_a", name: "Prof. Leandro (demonstração)", role: "teacher" },
  { id: "prof_b", name: "Prof. Camila (demonstração)", role: "teacher" },
  { id: "est_1", name: "Estudante Júlia (demonstração)", role: "pe_student", supervisorId: "prof_a" },
  { id: "aluno_142", name: "Aluno AL-0142 (demonstração)", role: "practitioner", traineeId: "tr_0142" },
  { id: "admin_1", name: "Administração (demonstração)", role: "admin" },
];

export function emptyBlocks(): AssessmentBlocks {
  return {
    essentials: { goal: "", experience: "nao_informado", weeklyAvailability: null, sessionMinutes: null, equipment: [], routine: "" },
    safety: { answers: {}, history: "", medications: "", surgeries: "", pregnancy: { state: "unanswered" } },
    complaint: {
      hasComplaint: { state: "unanswered" },
      lbpRecovered: { state: "unanswered" },
      summary: "",
      selectedRegions: [],
      symptoms: [],
      freeMarks: [],
      sleep: "",
      relevantActivities: "",
    },
    functional: { tests: [], sitToStandDifficulty: { state: "unanswered" }, observations: "" },
    synthesis: { goals: [], limitations: "", nextSteps: "", pending: [] },
  };
}

const NO = { state: "no" } as const;
const allNo = { chest_pain: NO, syncope: NO, known_cmr_disease: NO, saddle_bladder: NO, progressive_neuro: NO, systemic: NO, trauma: NO };

export function buildSeed() {
  const now = "2027-02-01T12:00:00.000Z";
  const trainees: Trainee[] = [
    { id: "tr_0142", ownerId: "prof_a", code: "AL-0142", displayName: "Marina", birthYear: 1988, goal: "Ganhar força geral e disposição", experience: "iniciante", createdAt: now, isDemo: true },
    { id: "tr_0157", ownerId: "prof_a", code: "AL-0157", displayName: "Roberto", birthYear: 1975, goal: "Voltar a treinar com menos dor nas costas", experience: "intermediario", createdAt: now, isDemo: true },
    { id: "tr_0203", ownerId: "prof_b", code: "AL-0203", displayName: "Paula", birthYear: 1992, goal: "Condicionamento para corrida", experience: "avancado", createdAt: now, isDemo: true },
    { id: "tr_case1", ownerId: "est_1", code: "CASO-01", displayName: "Caso didático 1", goal: "Força geral", experience: "iniciante", createdAt: now, isDemo: true },
  ];

  const a142: Assessment = {
    id: "av_0142_1",
    traineeId: "tr_0142",
    ownerId: "prof_a",
    version: 1,
    status: "completed",
    date: "2027-01-28",
    isDemo: true,
    updatedAt: now,
    blocks: {
      ...emptyBlocks(),
      essentials: { goal: "Ganhar força geral e disposição", experience: "iniciante", weeklyAvailability: 3, sessionMinutes: 50, equipment: ["halteres", "elástico", "máquinas de academia"], routine: "Trabalho sentado, caminha 20 min nos fins de semana." },
      safety: { answers: allNo, history: "Sem histórico relevante relatado.", medications: "", surgeries: "", pregnancy: NO },
      complaint: { ...emptyBlocks().complaint, hasComplaint: NO, lbpRecovered: NO },
      functional: {
        tests: [
          { id: "t1", name: "Sentar e levantar em 30 s", value: 11, unit: "repetições", date: "2027-01-28", note: "" },
          { id: "t2", name: "Prancha frontal", value: 35, unit: "s", date: "2027-01-28", note: "Parou por cansaço" },
        ],
        sitToStandDifficulty: NO,
        observations: "Boa coordenação; precisa aprender o padrão de dobrar o quadril.",
      },
      synthesis: { goals: ["Treinar 3x por semana durante 8 semanas", "Aprender os padrões básicos com boa técnica"], limitations: "Nenhuma limitação relatada.", nextSteps: "Montar treino global A/B.", pending: [] },
    },
  };

  const a157: Assessment = {
    id: "av_0157_1",
    traineeId: "tr_0157",
    ownerId: "prof_a",
    version: 1,
    status: "draft",
    date: "2027-02-03",
    isDemo: true,
    updatedAt: now,
    blocks: {
      ...emptyBlocks(),
      essentials: { goal: "Voltar a treinar com menos dor nas costas", experience: "intermediario", weeklyAvailability: 2, sessionMinutes: 60, equipment: ["academia completa"], routine: "Motorista, longos períodos sentado." },
      safety: { answers: { ...allNo, trauma: { state: "unanswered" } }, history: "Episódios de dor lombar nos últimos 2 anos.", medications: "", surgeries: "", pregnancy: { state: "not_applicable" } },
      complaint: {
        ...emptyBlocks().complaint,
        hasComplaint: { state: "yes" },
        lbpRecovered: NO,
        summary: "Dor lombar que piora após dirigir muito tempo.",
        selectedRegions: ["lumbar"],
        symptoms: [{ regionId: "lumbar", intensity: 4, quality: "dor", onset: "há 3 meses", frequency: "intermitente", radiates: NO, aggravating: "Ficar sentado mais de 1 h", easing: "Caminhar", note: "" }],
      },
    },
  };

  const a203: Assessment = {
    id: "av_0203_1",
    traineeId: "tr_0203",
    ownerId: "prof_b",
    version: 1,
    status: "completed",
    date: "2027-01-20",
    isDemo: true,
    updatedAt: now,
    blocks: { ...emptyBlocks(), essentials: { goal: "Condicionamento para corrida", experience: "avancado", weeklyAvailability: 4, sessionMinutes: 45, equipment: ["academia completa"], routine: "" } },
  };

  // Treino publicado para AL-0142
  const items = ["goblet-squat", "kb-deadlift-elevated", "chest-press", "seated-row", "standing-calf-raise"].map((id) => {
    const p = defaultPrescription(EXERCISE_BY_ID.get(id)!);
    if (p.resistance.kind === "external_kg") p.resistance = { kind: "external_kg", kg: id === "goblet-squat" ? 10 : id === "kb-deadlift-elevated" ? 12 : 20 };
    p.effort = { scale: "rir", target: 3 };
    return p;
  });
  const plan142: TrainingPlan = {
    id: "pl_0142",
    traineeId: "tr_0142",
    ownerId: "prof_a",
    title: "Força global — fase 1",
    goal: "Ganhar força geral e disposição",
    startDate: "2027-02-01",
    weeks: 8,
    frequencyPerWeek: 3,
    isDemo: true,
    versions: [
      {
        id: "pv_0142_1",
        planId: "pl_0142",
        number: 1,
        status: "published",
        sessions: [{ id: "ss_a", name: "A", items }],
        sourceAssessmentId: "av_0142_1",
        sourceAssessmentVersion: 1,
        suggestionTrace: { ruleIds: ["R1-forca-global-iniciante"], ruleVersion: "regras-v1.0.0 (2026-11-06)", findingsUsed: ["Experiência: iniciante"], generatedAt: now },
        manualDraft: false,
        authorId: "prof_a",
        createdAt: now,
        approvedBy: "prof_a",
        approvedAt: now,
        publishedAt: now,
        changeNote: "Primeira versão",
      },
    ],
  };

  // Execuções: 3 semanas, sessões ter/qui/sáb, sintomas e esforço separados
  const logs: ExecutionLog[] = [];
  const dates = ["2027-02-02", "2027-02-04", "2027-02-09", "2027-02-11", "2027-02-13", "2027-02-16", "2027-02-18"];
  dates.forEach((date, di) => {
    items.forEach((it, ii) => {
      for (let s = 1; s <= 2; s++) {
        const kg = it.resistance.kind === "external_kg" ? (it.resistance.kg ?? 0) + Math.floor(di / 3) * 2 : null;
        logs.push({
          id: `lg_${di}_${ii}_${s}`,
          planVersionId: "pv_0142_1",
          traineeId: "tr_0142",
          sessionId: "ss_a",
          prescribedId: it.id,
          date,
          setNumber: s,
          reps: 10,
          seconds: null,
          loadKg: kg,
          modality: kg === null ? "bodyweight" : "weight",
          completed: !(di === 4 && ii === 4 && s === 2),
          effortRpe: 6 + (di % 2),
          symptomIntensity: null,
          note: "",
        });
      }
    });
  });

  return { trainees, assessments: [a142, a157, a203], plans: [plan142], logs };
}
