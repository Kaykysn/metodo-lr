// ==============================================================================
// Catálogo comercial (planos de assinatura do software para o profissional).
// NÃO confundir com TrainingPlan (treino do aluno) em src/lib/domain/plans.ts.
//
// Valores em centavos. Nenhum componente deve escrever preço ou limite à mão:
// tudo sai daqui. A versão do catálogo vai junto com cada intenção/assinatura
// para que um reajuste neste arquivo não altere o que já foi contratado.
// ==============================================================================

export const CATALOG_VERSION = "2026-11-06.1";

export type PlanId = "essencial" | "evolucao" | "completo";
export const PLAN_IDS: readonly PlanId[] = ["essencial", "evolucao", "completo"] as const;

/** Recursos que variam entre os planos. Os comuns a todos estão em BASE_FEATURES. */
export type Feature =
  // comuns (nunca bloqueados por plano: segurança, histórico e dados próprios)
  | "assessment"
  | "triage"
  | "body_map"
  | "exercise_library"
  | "manual_plan"
  | "plan_review_versions"
  | "practitioner_area"
  | "history_print"
  | "basic_progress"
  | "access_billing_help"
  // adicionais
  | "plan_reuse"
  | "assessment_compare"
  | "rule_suggestions"
  | "consolidated_dashboard"
  | "priority_support";

export const BASE_FEATURES: readonly Feature[] = [
  "assessment",
  "triage",
  "body_map",
  "exercise_library",
  "manual_plan",
  "plan_review_versions",
  "practitioner_area",
  "history_print",
  "basic_progress",
  "access_billing_help",
];

export interface CatalogPlan {
  id: PlanId;
  name: string;
  priceCents: number;
  currency: "BRL";
  interval: "monthly";
  /** Profissionais por assinatura. */
  seats: 1;
  /** Alunos ativos simultâneos (arquivados não contam). */
  activeTraineeLimit: number;
  features: readonly Feature[];
  /** Perfil de uso, em uma frase. */
  forWhom: string;
  /** Até cinco benefícios centrais mostrados no cartão. */
  highlights: readonly string[];
}

const plan = (p: Omit<CatalogPlan, "currency" | "interval" | "seats">): CatalogPlan => ({ currency: "BRL", interval: "monthly", seats: 1, ...p });

export const PLANS: readonly CatalogPlan[] = [
  plan({
    id: "essencial",
    name: "Essencial",
    priceCents: 2990,
    activeTraineeLimit: 10,
    features: [...BASE_FEATURES],
    forWhom: "Para uma carteira pequena e montagem manual de treinos.",
    highlights: [
      "Até 10 alunos ativos",
      "Anamnese, triagem e mapa corporal",
      "Biblioteca de exercícios e montagem manual",
      "Área do aluno com o treino aprovado",
      "Histórico, versões e evolução básica",
    ],
  }),
  plan({
    id: "evolucao",
    name: "Evolução",
    priceCents: 3990,
    activeTraineeLimit: 20,
    features: [...BASE_FEATURES, "plan_reuse", "assessment_compare"],
    forWhom: "Mais praticidade para acompanhar sua carteira.",
    highlights: [
      "Até 20 alunos ativos",
      "Tudo do Essencial",
      "Reaproveitar um treino como novo rascunho",
      "Comparar duas avaliações lado a lado",
    ],
  }),
  plan({
    id: "completo",
    name: "Completo",
    priceCents: 5990,
    activeTraineeLimit: 100,
    features: [...BASE_FEATURES, "plan_reuse", "assessment_compare", "rule_suggestions", "consolidated_dashboard", "priority_support"],
    forWhom: "Para quem quer a avaliação ligada ao treino e o acompanhamento completo.",
    highlights: [
      "Até 100 alunos ativos",
      "Tudo do Evolução",
      "Opções de exercício ligadas à avaliação (motor de regras)",
      "Painel de volume semanal, adesão e filtros",
      "Suporte humano prioritário de uso",
    ],
  }),
];

export const PLAN_BY_ID: ReadonlyMap<PlanId, CatalogPlan> = new Map(PLANS.map((p) => [p.id, p]));

export function isPlanId(v: unknown): v is PlanId {
  return typeof v === "string" && (PLAN_IDS as readonly string[]).includes(v);
}

export function getPlan(id: PlanId): CatalogPlan {
  const p = PLAN_BY_ID.get(id);
  if (!p) throw new Error(`Plano desconhecido: ${id}`);
  return p;
}

/** O teste de 30 dias libera os recursos de software do Completo, sem o suporte prioritário. */
export const TRIAL_FEATURES: readonly Feature[] = getPlan("completo").features.filter((f) => f !== "priority_support");
export const TRIAL_TRAINEE_LIMIT = getPlan("completo").activeTraineeLimit;

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
/** Formata centavos como moeda brasileira ("R$ 29,90"). */
export function formatPrice(cents: number): string {
  // Intl usa espaço não separável entre "R$" e o número; mantemos assim.
  return BRL.format(cents / 100);
}

export function priceDifference(from: PlanId, to: PlanId): number {
  return getPlan(to).priceCents - getPlan(from).priceCents;
}

export const FEATURE_LABEL: Record<Feature, string> = {
  assessment: "Anamnese em 5 blocos",
  triage: "Triagem pré-participação",
  body_map: "Mapa corporal disponível",
  exercise_library: "Biblioteca de exercícios",
  manual_plan: "Montagem manual de treinos",
  plan_review_versions: "Revisão, aprovação e versões",
  practitioner_area: "Área do aluno com treino aprovado",
  history_print: "Histórico e impressão básica",
  basic_progress: "Evolução básica: dor, medidas e carga por exercício",
  access_billing_help: "Ajuda de uso e canal para acesso e cobrança",
  plan_reuse: "Reaproveitar um treino como novo rascunho",
  assessment_compare: "Comparar duas avaliações lado a lado",
  rule_suggestions: "Opções de exercícios ligadas à avaliação, pelo motor de regras",
  consolidated_dashboard: "Painel consolidado: volume semanal, adesão e filtros",
  priority_support: "Suporte humano prioritário de uso",
};

/** Plano mais barato que inclui o recurso. */
export function cheapestPlanWith(feature: Feature): CatalogPlan {
  return PLANS.find((p) => p.features.includes(feature)) ?? getPlan("completo");
}

/** Linhas da tabela comparativa: diferenças primeiro, depois o que é comum. */
export type CompareCell = boolean | string;
export interface CompareRow {
  label: string;
  values: Record<PlanId, CompareCell>;
}

const byPlan = (fn: (p: CatalogPlan) => CompareCell) => Object.fromEntries(PLANS.map((p) => [p.id, fn(p)])) as Record<PlanId, CompareCell>;

export const COMPARE_ROWS: readonly CompareRow[] = [
  { label: "Preço mensal total", values: byPlan((p) => formatPrice(p.priceCents)) },
  { label: "Alunos ativos", values: byPlan((p) => `Até ${p.activeTraineeLimit}`) },
  ...(["plan_reuse", "assessment_compare", "rule_suggestions", "consolidated_dashboard", "priority_support"] as Feature[]).map((f) => ({
    label: FEATURE_LABEL[f],
    values: byPlan((p) => p.features.includes(f)),
  })),
  { label: "Profissionais por assinatura", values: byPlan((p) => String(p.seats)) },
  ...BASE_FEATURES.map((f) => ({ label: FEATURE_LABEL[f], values: byPlan((p) => p.features.includes(f)) })),
];

/**
 * Recomendação por critérios objetivos (não empurra o mais caro).
 * - até 10 alunos e uso manual → Essencial
 * - até 20 e interesse em reaproveitar/comparar → Evolução
 * - recursos avançados ou mais de 20 ativos → Completo
 * Acima de 100 ativos nenhum plano atende: devolve null.
 */
export function recommendPlan(input: { activeTrainees: number; wantsReuse: boolean; wantsAdvanced: boolean }): { planId: PlanId | null; reason: string } {
  const n = Math.max(0, Math.floor(input.activeTrainees));
  if (n > getPlan("completo").activeTraineeLimit) return { planId: null, reason: `Nenhum plano atual atende mais de ${getPlan("completo").activeTraineeLimit} alunos ativos.` };
  if (input.wantsAdvanced || n > getPlan("evolucao").activeTraineeLimit) return { planId: "completo", reason: input.wantsAdvanced ? "Você quer opções ligadas à avaliação ou o painel consolidado." : `Mais de ${getPlan("evolucao").activeTraineeLimit} alunos ativos.` };
  if (input.wantsReuse || n > getPlan("essencial").activeTraineeLimit) return { planId: "evolucao", reason: input.wantsReuse ? "Você quer reaproveitar treinos ou comparar avaliações." : `Mais de ${getPlan("essencial").activeTraineeLimit} alunos ativos.` };
  return { planId: "essencial", reason: `Até ${getPlan("essencial").activeTraineeLimit} alunos e montagem manual.` };
}
