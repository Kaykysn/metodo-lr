// ==============================================================================
// Motor de regras v1 — apoio à decisão. NÃO é IA, não diagnostica, não define dose.
// Cada sugestão guarda achados usados, critérios, referências, limitações e versão.
// ==============================================================================
import type { Assessment, AssessmentBlocks } from "./types";
import { evaluateTriage, type TriageResult } from "./triage";
import { EXERCISE_BY_ID } from "./exercise-library";
import { REGION_BY_ID } from "./body-regions";

export const RULE_ENGINE_VERSION = "regras-v1.0.0 (2026-11-06)";

export interface SuggestedGroup {
  ruleId: string;
  title: string;
  rationale: string;
  findingsUsed: string[];
  inclusion: string[];
  exclusion: string[];
  references: string[];
  limitations: string;
  exerciseIds: string[];
  alternatives: string[];
}

export interface SuggestionResult {
  status: "blocked" | "insufficient" | "needs_review" | "ok";
  headline: string;
  triage: TriageResult;
  missing: string[];
  groups: SuggestedGroup[];
  version: string;
}

const yes = (a: { state: string } | undefined) => a?.state === "yes" || a?.state === "value";

/** O que falta para a avaliação ser considerada suficiente para sugerir opções. */
export function missingForSuggestion(b: AssessmentBlocks): string[] {
  const m: string[] = [];
  if (!b.essentials.goal.trim()) m.push("Objetivo do aluno (bloco 1)");
  if (b.essentials.experience === "nao_informado") m.push("Experiência com treino (bloco 1)");
  if (b.essentials.weeklyAvailability == null) m.push("Disponibilidade semanal (bloco 1)");
  if (b.complaint.hasComplaint.state === "unanswered") m.push("Se há queixa atual (bloco 3)");
  if (yes(b.complaint.hasComplaint) && b.complaint.symptoms.length === 0) m.push("Ao menos uma região de sintoma registrada (bloco 3)");
  return m;
}

function hasLumbarSymptom(b: AssessmentBlocks) {
  return b.complaint.symptoms.some((s) => s.regionId === "lumbar" || s.regionId.startsWith("sacroiliac"));
}

function equipmentHas(b: AssessmentBlocks, ...names: string[]) {
  const eq = b.essentials.equipment.map((e) => e.toLocaleLowerCase("pt-BR"));
  return names.some((n) => eq.some((e) => e.includes(n)));
}

export function suggest(assessment: Assessment): SuggestionResult {
  const b = assessment.blocks;
  const triage = evaluateTriage(b.safety);
  const base = { triage, version: RULE_ENGINE_VERSION };

  if (triage.status === "urgent" || triage.status === "refer") {
    return {
      ...base,
      status: "blocked",
      headline: triage.status === "urgent" ? "Possível urgência: não gerar treino" : "Avaliação complementar necessária antes de sugerir opções",
      missing: [],
      groups: [],
    };
  }

  // Dor irradiada: não gerar treino terapêutico automaticamente
  const radiating = b.complaint.symptoms.filter((s) => yes(s.radiates));
  if (radiating.length) {
    return {
      ...base,
      status: "blocked",
      headline: "Sintoma irradiado registrado: indicar avaliação apropriada",
      missing: [],
      groups: [],
    };
  }

  const missing = missingForSuggestion(b);
  if (triage.status === "incomplete") missing.unshift(...triage.unanswered.map((q) => `Triagem: “${q.text}”`));
  if (missing.length) {
    return { ...base, status: "insufficient", headline: "Avaliação incompleta: complete os itens ou crie um rascunho manual identificado", missing, groups: [] };
  }

  // Contextos complexos exigem revisão qualificada (sem defaults genéricos)
  const complex: string[] = [];
  if (yes(b.safety.pregnancy)) complex.push("gestação");
  if (b.safety.surgeries.trim()) complex.push("cirurgia relatada");
  if (complex.length) {
    return {
      ...base,
      status: "needs_review",
      headline: `Contexto que exige protocolo específico e revisão qualificada (${complex.join(", ")})`,
      missing: ["Restrições e liberação específicas para o contexto relatado"],
      groups: [],
    };
  }

  const groups: SuggestedGroup[] = [];
  const exp = b.essentials.experience;
  const goal = b.essentials.goal.toLocaleLowerCase("pt-BR");

  if (exp === "iniciante" && /(força|forca|fortalec|condicion|geral|saúde|saude)/.test(goal)) {
    const hasDb = equipmentHas(b, "halter", "kettlebell");
    const hasMachine = equipmentHas(b, "máquina", "maquina", "academia", "polia");
    groups.push({
      ruleId: "R1-forca-global-iniciante",
      title: "Estrutura de treino global para iniciante",
      rationale: "Um exercício por padrão básico de movimento, compatível com a experiência e o equipamento informados. O professor define a dose.",
      findingsUsed: [`Experiência: iniciante`, `Objetivo: ${b.essentials.goal}`, `Equipamentos: ${b.essentials.equipment.join(", ") || "nenhum informado"}`, `Disponibilidade: ${b.essentials.weeklyAvailability}x/semana`],
      inclusion: ["Iniciante", "Objetivo de força ou condicionamento geral", "Triagem sem alerta relatado"],
      exclusion: ["Alerta na triagem", "Sintoma irradiado", "Gestação ou pós-operatório (exigem protocolo próprio)"],
      references: ["acsm-2026-rt", "who-2020-pa"],
      limitations: "Base em adultos saudáveis. Não substitui a escolha de dose, progressão e monitoramento pelo professor.",
      exerciseIds: [hasDb ? "goblet-squat" : "sit-to-stand", hasDb ? "kb-deadlift-elevated" : "glute-bridge", hasMachine ? "chest-press" : "wall-push-up", hasMachine ? "seated-row" : "band-row", "standing-calf-raise"],
      alternatives: ["box-squat", "step-up", "incline-push-up", "chest-supported-row"],
    });
  }

  if (yes(b.functional.sitToStandDifficulty)) {
    groups.push({
      ruleId: "R2-tarefa-sentar-levantar",
      title: "Variações da tarefa de sentar e levantar",
      rationale: "Dificuldade relatada na tarefa: considerar variações dela e força de membros inferiores, com progressão revisada. O achado não indica diagnóstico.",
      findingsUsed: ["Dificuldade para sentar e levantar: sim"],
      inclusion: ["Dificuldade relatada ou observada na tarefa"],
      exclusion: ["Alerta na triagem"],
      references: [],
      limitations: "Referência específica pendente. Seleção e dose dependem da avaliação.",
      exerciseIds: ["sit-to-stand", "box-squat", "supported-step-up"],
      alternatives: ["squat-supported", "step-up"],
    });
  }

  const lumbar = hasLumbarSymptom(b);
  if (lumbar && yes(b.complaint.hasComplaint)) {
    const regions = b.complaint.symptoms.filter((s) => s.regionId === "lumbar" || s.regionId.startsWith("sacroiliac")).map((s) => REGION_BY_ID.get(s.regionId)?.label ?? s.regionId);
    groups.push({
      ruleId: "R3-lombar-sem-alerta",
      title: "Opções graduais para dor lombar sem alerta identificado",
      rationale: "Exercício estruturado integra as opções de cuidado; não há modalidade superior para todos. A escolha considera preferência, avaliação e tolerância.",
      findingsUsed: [`Sintoma registrado: ${regions.join(", ")}`, "Triagem sem alerta relatado", "Sem sintoma irradiado registrado"],
      inclusion: ["Dor lombar relatada", "Sem alerta na triagem", "Sem irradiação registrada"],
      exclusion: ["Irradiação ou piora neurológica", "Alerta na triagem", "Crise aguda (avaliar caso a caso)"],
      references: ["who-2023-lbp"],
      limitations: "Recomendação condicional da OMS para dor lombar primária crônica. Não define método universal nem corte de dor para interromper.",
      exerciseIds: ["walking", "glute-bridge", "bird-dog", "pelvic-spine-movements"],
      alternatives: ["cycling", "dead-bug", "kb-deadlift-elevated", "pilates-bridge"],
    });
  }

  if (yes(b.complaint.lbpRecovered) && !lumbar) {
    groups.push({
      ruleId: "R4-caminhada-pos-lombalgia",
      title: "Caminhada progressiva com educação (contexto WalkBack)",
      rationale: "Pessoa recuperada de episódio de lombalgia inespecífica: caminhada individualizada e progressiva com educação pode ser apresentada como opção.",
      findingsUsed: ["Recuperado(a) de episódio de lombalgia inespecífica: sim", "Sem sintoma lombar atual registrado"],
      inclusion: ["Episódio recente de lombalgia inespecífica já recuperado"],
      exclusion: ["Crise aguda atual", "Radiculopatia", "Alerta na triagem"],
      references: ["walkback-2024"],
      limitations: "Não extrapolar para dor lombar ativa ou radiculopatia, nem aplicar caminhada sem o componente educacional e a progressão estudados.",
      exerciseIds: ["walking"],
      alternatives: ["interval-walking"],
    });
  }

  // Garantia: só ids existentes e elegíveis
  for (const g of groups) g.exerciseIds = g.exerciseIds.filter((id) => EXERCISE_BY_ID.get(id)?.suggestionEligible);

  if (!groups.length) {
    return {
      ...base,
      status: "insufficient",
      headline: "Nenhuma regra se aplica a este contexto. Monte o treino manualmente.",
      missing: [],
      groups: [],
    };
  }
  return { ...base, status: "ok", headline: `${groups.length} conjunto(s) de opções compatíveis com o registrado`, missing: [], groups };
}
