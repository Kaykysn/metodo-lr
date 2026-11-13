// ==============================================================================
// Triagem de segurança — regras transparentes, sem diagnóstico.
// Perguntas cardiovasculares/metabólicas: base em Riebe et al. 2015 (ACSM).
// Sinais de alerta musculoesqueléticos/neurológicos: lista operacional de sinais
// classicamente descritos; a fonte NICE CKS ainda não foi conferida (ver evidence.ts).
// Ausência de alerta preenchido NÃO certifica segurança.
// ==============================================================================
import type { Answer, AssessmentBlocks } from "./types";

export type TriageSeverity = "urgent" | "refer";

export interface TriageQuestion {
  id: string;
  text: string;
  help?: string;
  severity: TriageSeverity;
  guidance: string;
  sourceIds: string[];
}

export const TRIAGE_QUESTIONS: TriageQuestion[] = [
  {
    id: "chest_pain",
    text: "Dor, pressão ou desconforto no peito em repouso ou durante esforço?",
    severity: "urgent",
    guidance: "Interrompa a sessão. Se o sintoma estiver presente agora, procure atendimento de urgência (SAMU 192). Não iniciar exercício sem avaliação médica.",
    sourceIds: ["acsm-2015-screening"],
  },
  {
    id: "syncope",
    text: "Desmaio, tontura forte ou falta de ar desproporcional ao esforço?",
    severity: "refer",
    guidance: "Encaminhar para avaliação médica antes de iniciar ou progredir o exercício.",
    sourceIds: ["acsm-2015-screening"],
  },
  {
    id: "known_cmr_disease",
    text: "Doença cardiovascular, metabólica (ex.: diabetes) ou renal diagnosticada?",
    help: "Não impede exercício por si só; define a necessidade de liberação conforme atividade atual e intensidade pretendida.",
    severity: "refer",
    guidance: "Solicitar liberação médica conforme o algoritmo de triagem pré-participação antes de progredir a intensidade.",
    sourceIds: ["acsm-2015-screening"],
  },
  {
    id: "saddle_bladder",
    text: "Perda de controle da bexiga ou do intestino, ou dormência na região entre as pernas?",
    severity: "urgent",
    guidance: "Orientar busca IMEDIATA de atendimento médico de urgência. Não realizar treino.",
    sourceIds: ["nice-cks-lbp"],
  },
  {
    id: "progressive_neuro",
    text: "Fraqueza ou dormência nas pernas ou braços que está piorando?",
    severity: "refer",
    guidance: "Encaminhar para avaliação médica com prioridade. Não gerar treino terapêutico.",
    sourceIds: ["nice-cks-lbp"],
  },
  {
    id: "systemic",
    text: "Febre, perda de peso sem explicação ou histórico de câncer com dor nova?",
    severity: "refer",
    guidance: "Encaminhar para avaliação médica antes de qualquer prescrição relacionada à queixa.",
    sourceIds: ["nice-cks-lbp"],
  },
  {
    id: "trauma",
    text: "Queda ou trauma significativo recente na região da queixa?",
    severity: "refer",
    guidance: "Encaminhar para avaliação (possível fratura) antes de exercitar a região.",
    sourceIds: ["nice-cks-lbp"],
  },
];

export interface TriageResult {
  status: "incomplete" | "urgent" | "refer" | "none_reported";
  flagged: TriageQuestion[];
  unanswered: TriageQuestion[];
  note: string;
}

const isYes = (a: Answer | undefined) => a?.state === "yes" || a?.state === "value";
const isAnswered = (a: Answer | undefined) => !!a && a.state !== "unanswered";

export function evaluateTriage(safety: AssessmentBlocks["safety"]): TriageResult {
  const flagged = TRIAGE_QUESTIONS.filter((q) => isYes(safety.answers[q.id]));
  const unanswered = TRIAGE_QUESTIONS.filter((q) => !isAnswered(safety.answers[q.id]));
  if (flagged.some((q) => q.severity === "urgent")) {
    return { status: "urgent", flagged, unanswered, note: "Sinal de possível urgência registrado. Siga a orientação abaixo antes de qualquer treino." };
  }
  if (flagged.length) {
    return { status: "refer", flagged, unanswered, note: "Há sinais que pedem avaliação complementar. Sugestões automáticas ficam bloqueadas." };
  }
  if (unanswered.length) {
    return { status: "incomplete", flagged, unanswered, note: `${unanswered.length} pergunta(s) da triagem sem resposta.` };
  }
  return {
    status: "none_reported",
    flagged,
    unanswered,
    note: "Nenhum sinal de alerta foi relatado. Isso não certifica segurança: o professor define monitoramento e critérios para o caso.",
  };
}
