// ==============================================================================
// Entidades do domínio (avaliação → planejamento → acompanhamento)
// ==============================================================================
import type { Role } from "./roles";
import type { ModalityType } from "@/lib/volume";

export type ISODate = string; // YYYY-MM-DD
export type ISODateTime = string;

/** Estado de uma resposta: diferencia ausência, "não avaliado", "não se aplica" e "não". */
export type Answer<T = string> =
  | { state: "unanswered" }
  | { state: "not_assessed"; note?: string }
  | { state: "not_applicable" }
  | { state: "no" }
  | { state: "yes"; value?: T }
  | { state: "value"; value: T };

export const UNANSWERED: Answer = { state: "unanswered" };

export interface Actor {
  id: string;
  name: string;
  role: Role;
  /** Professor(a) responsável, quando o ator é estudante supervisionado. */
  supervisorId?: string;
  /** Para praticante: o registro de aluno correspondente. */
  traineeId?: string;
}

export interface Trainee {
  id: string;
  ownerId: string; // professor(a)/estudante responsável
  code: string; // pseudônimo exibido (ex.: AL-0142)
  displayName: string; // nome curto/apelido escolhido pelo profissional
  birthYear?: number;
  goal: string;
  experience: "iniciante" | "intermediario" | "avancado" | "nao_informado";
  createdAt: ISODateTime;
  /** Arquivado: não conta no limite de ativos, continua consultável e não recebe novos registros. */
  archivedAt?: ISODateTime | null;
  isDemo: boolean;
}

// ---------------------------------------------------------------------------
// Avaliação em 5 blocos
// ---------------------------------------------------------------------------
export type SymptomQuality = "dor" | "rigidez" | "formigamento" | "queimacao" | "fraqueza" | "cansaco" | "outro";

export interface SymptomEntry {
  regionId: string; // ex.: "knee:right"
  /** 0–10. null = não informado (≠ zero). */
  intensity: number | null;
  quality: SymptomQuality | null;
  onset: string; // início/duração em texto livre ("há 3 semanas")
  frequency: "constante" | "intermitente" | "aos_esforcos" | "nao_informado";
  radiates: Answer<string>;
  aggravating: string;
  easing: string;
  note: string;
}

export interface FreeMark {
  id: string;
  view: "anterior" | "posterior";
  x: number; // 0–1
  y: number; // 0–1
  note: string;
}

export interface FunctionalTest {
  id: string;
  name: string;
  value: number | null;
  unit: string; // "repetições", "s", "cm", "kg"
  date: ISODate;
  note: string;
}

export interface AssessmentBlocks {
  essentials: {
    goal: string;
    experience: Trainee["experience"];
    weeklyAvailability: number | null; // sessões possíveis por semana
    sessionMinutes: number | null;
    equipment: string[];
    routine: string;
  };
  safety: {
    /** Triagem pré-participação: chaves de TRIAGE_QUESTIONS → resposta */
    answers: Record<string, Answer>;
    history: string;
    medications: string;
    surgeries: string;
    pregnancy: Answer;
  };
  complaint: {
    hasComplaint: Answer;
    /** Recuperado recentemente de episódio de lombalgia inespecífica (contexto do WalkBack). */
    lbpRecovered: Answer;
    summary: string;
    selectedRegions: string[];
    symptoms: SymptomEntry[];
    freeMarks: FreeMark[];
    sleep: string;
    relevantActivities: string;
  };
  functional: {
    tests: FunctionalTest[];
    sitToStandDifficulty: Answer;
    observations: string;
  };
  synthesis: {
    goals: string[];
    limitations: string;
    nextSteps: string;
    pending: string[];
  };
}

export interface Assessment {
  id: string;
  traineeId: string;
  ownerId: string;
  version: number;
  status: "draft" | "completed";
  date: ISODate;
  blocks: AssessmentBlocks;
  /** Etapas 0–10 do formato antigo, preservadas sem perda. */
  legacy?: Record<string, unknown>;
  updatedAt: ISODateTime;
  isDemo: boolean;
}

// ---------------------------------------------------------------------------
// Treino: plano → versões → sessões → exercícios prescritos
// ---------------------------------------------------------------------------
export type Dose =
  | { kind: "reps"; sets: number; repsMin: number; repsMax: number }
  | { kind: "time"; sets: number; seconds: number }
  | { kind: "distance"; sets: number; meters: number };

export type Resistance =
  | { kind: "external_kg"; kg: number | null }
  | { kind: "bodyweight" }
  | { kind: "band"; color: string; note: string }
  | { kind: "pilates_springs"; apparatus: string; springs: string; setup: string }
  | { kind: "machine_setting"; setting: string };

export type Effort =
  | { scale: "rpe"; target: number | null } // 0–10 percepção de esforço
  | { scale: "rir"; target: number | null } // repetições em reserva
  | { scale: "none" };

export interface PrescribedExercise {
  id: string;
  exerciseId: string;
  dose: Dose;
  resistance: Resistance;
  effort: Effort;
  restSeconds: number | null;
  rangeNote: string; // amplitude orientada
  regression: string;
  progression: string;
  cues: string; // instruções de execução
  reviewCriteria: string; // critérios individualizados de revisão
  privateNote: string; // não exibido ao aluno
  /** Cadência (ex.: "3-1-1-0"). Opcional: registros antigos não têm. */
  tempo?: string;
  /** Tempo de sustentação por repetição ou série, em segundos. */
  holdSeconds?: number | null;
  /** Contexto de retorno ao exercício, preenchido pelo profissional. */
  rehab?: RehabContext;
}

/** Campos de reabilitação / retorno ao exercício. Seleção e progressão ficam com o profissional. */
export interface RehabContext {
  phase: string;
  restrictions: string;
  symptomsDuring: string;
  symptomsAfter: string;
  toleratedRange: string;
  progressionCriterion: string;
}

export interface TrainingSession {
  id: string;
  name: string; // "A", "B", "Segunda"...
  items: PrescribedExercise[];
}

export type PlanStatus = "draft" | "approved" | "published" | "superseded";

export interface PlanVersion {
  id: string;
  planId: string;
  number: number;
  status: PlanStatus;
  sessions: TrainingSession[];
  sourceAssessmentId: string | null;
  sourceAssessmentVersion: number | null;
  suggestionTrace: SuggestionTrace | null;
  manualDraft: boolean; // rascunho manual (sem sugestão validada)
  authorId: string;
  createdAt: ISODateTime;
  approvedBy?: string;
  approvedAt?: ISODateTime;
  publishedAt?: ISODateTime;
  changeNote: string;
}

export interface TrainingPlan {
  id: string;
  traineeId: string;
  ownerId: string;
  title: string;
  goal: string;
  startDate: ISODate;
  weeks: number;
  frequencyPerWeek: number;
  versions: PlanVersion[];
  isDemo: boolean;
}

export interface ExecutionLog {
  id: string;
  planVersionId: string;
  traineeId: string;
  sessionId: string;
  prescribedId: string;
  date: ISODate;
  setNumber: number;
  reps: number | null;
  seconds: number | null;
  loadKg: number | null;
  modality: ModalityType;
  completed: boolean;
  effortRpe: number | null;
  /** Sintoma durante a sessão, separado do esforço. null = não informado. */
  symptomIntensity: number | null;
  note: string;
}

export interface SuggestionTrace {
  ruleIds: string[];
  ruleVersion: string;
  findingsUsed: string[];
  generatedAt: ISODateTime;
}
