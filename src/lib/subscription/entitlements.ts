// ==============================================================================
// Acesso comercial. Cinco camadas separadas, combinadas só no fim:
//   1. identidade e papel (roles.ts)
//   2. aprovação/restrição administrativa (profiles.status)
//   3. teste de 30 dias (trial_started_at / trial_expires_at)
//   4. assinatura (SubscriptionRecord; só a integração de pagamento escreve)
//   5. capacidade efetiva = papel ∩ vínculo aos dados ∩ recurso do plano
//
// Intenção de plano (PlanIntent) NUNCA concede acesso pago.
// Pagamento NUNCA remove revogação nem dá permissão de papel.
// ==============================================================================
import type { Role } from "@/lib/domain/roles";
import { can, type Action } from "@/lib/domain/roles";
import { BASE_FEATURES, TRIAL_FEATURES, TRIAL_TRAINEE_LIMIT, getPlan, isPlanId, type Feature, type PlanId } from "./catalog";

export type BillingStatus = "none" | "active" | "past_due" | "canceled";

/** Leitura confiável da assinatura (gravada só pelo servidor/integração). */
export interface SubscriptionRecord {
  planId: PlanId | null;
  catalogVersion: string | null;
  billingStatus: BillingStatus;
  currentPeriodStart: string | null; // ISO UTC
  paidThrough: string | null; // ISO UTC: fim do período efetivamente pago
  cancelAtPeriodEnd: boolean;
  /** Mudança de plano agendada (intenção; não concede nada). */
  pendingPlanId: PlanId | null;
  provider: "asaas" | null;
  providerSubscriptionId: string | null;
}

/** Plano escolhido pelo usuário para depois do teste. Só intenção. */
export interface PlanIntent {
  planId: PlanId;
  catalogVersion: string;
  selectedAt: string;
}

export type AdminStatus = "pending" | "active" | "paused" | "revoked";

export interface TrialWindow {
  startedAt: string | null;
  expiresAt: string | null;
}

export type CommercialPhase =
  | "not_applicable" // aluno praticante e administração não compram estes planos
  | "blocked" // restrição administrativa (pendente, pausado, revogado)
  | "trial_not_started"
  | "trial"
  | "paid"
  | "expired"; // teste encerrado sem período pago válido: só consulta

export interface CommercialAccess {
  phase: CommercialPhase;
  /** Plano cujos recursos estão valendo agora (no teste: recursos de software do Completo). */
  effectivePlanId: PlanId | null;
  /** Plano pago vigente, separado dos recursos de teste. */
  paidPlanId: PlanId | null;
  features: ReadonlySet<Feature>;
  /** Limite de alunos ativos; null = não se aplica. */
  traineeLimit: number | null;
  /** Pode criar alunos, avaliações, treinos e publicações. */
  canCreate: boolean;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  paidThrough: string | null;
}

const PROFESSIONAL_ROLES: Role[] = ["teacher", "pe_student", "physiotherapist", "student", "postgraduate"];

export function isProfessionalRole(role: Role): boolean {
  return PROFESSIONAL_ROLES.includes(role);
}

/** Assinatura com período pago ainda válido no instante `nowMs`. */
export function hasValidPaidPeriod(sub: SubscriptionRecord | null, nowMs: number): sub is SubscriptionRecord & { planId: PlanId; paidThrough: string } {
  if (!sub || !isPlanId(sub.planId) || !sub.paidThrough) return false;
  if (sub.billingStatus === "none") return false;
  // past_due e canceled mantêm o período já quitado até o fim
  const end = Date.parse(sub.paidThrough);
  return Number.isFinite(end) && end > nowMs;
}

export function resolveCommercialAccess(input: {
  role: Role;
  adminStatus: AdminStatus;
  trial: TrialWindow;
  subscription: SubscriptionRecord | null;
  nowMs: number;
}): CommercialAccess {
  const { role, adminStatus, trial, subscription, nowMs } = input;
  const base = { trialStartedAt: trial.startedAt, trialEndsAt: trial.expiresAt, paidThrough: subscription?.paidThrough ?? null };

  if (!isProfessionalRole(role)) {
    return { ...base, phase: "not_applicable", effectivePlanId: null, paidPlanId: null, features: new Set(BASE_FEATURES), traineeLimit: null, canCreate: false };
  }
  if (adminStatus !== "active") {
    return { ...base, phase: "blocked", effectivePlanId: null, paidPlanId: null, features: new Set(), traineeLimit: null, canCreate: false };
  }

  const paid = hasValidPaidPeriod(subscription, nowMs) ? getPlan(subscription!.planId!) : null;
  const trialEnd = trial.expiresAt ? Date.parse(trial.expiresAt) : NaN;
  const trialRunning = !trial.expiresAt || trialEnd > nowMs;

  if (trialRunning) {
    // Recursos de software do Completo; o plano pago (se houver) soma o que faltar (ex.: suporte)
    const features = new Set<Feature>([...TRIAL_FEATURES, ...(paid?.features ?? [])]);
    return {
      ...base,
      phase: trial.expiresAt ? "trial" : "trial_not_started",
      effectivePlanId: "completo",
      paidPlanId: paid?.id ?? null,
      features,
      traineeLimit: Math.max(TRIAL_TRAINEE_LIMIT, paid?.activeTraineeLimit ?? 0),
      canCreate: true,
    };
  }

  if (paid) {
    return { ...base, phase: "paid", effectivePlanId: paid.id, paidPlanId: paid.id, features: new Set(paid.features), traineeLimit: paid.activeTraineeLimit, canCreate: true };
  }

  // Vencido: consulta dos próprios registros, sem novas criações
  return { ...base, phase: "expired", effectivePlanId: null, paidPlanId: null, features: new Set(BASE_FEATURES), traineeLimit: null, canCreate: false };
}

export function hasFeature(access: CommercialAccess | null, feature: Feature): boolean {
  return !!access && access.features.has(feature);
}

const CREATE_ACTIONS: Action[] = ["trainee.write", "assessment.write", "plan.draft", "plan.approve", "plan.publish"];

/**
 * Capacidade efetiva = permissão do papel ∩ acesso comercial.
 * O plano nunca acrescenta permissão que o papel não tem.
 */
export function canPerform(role: Role, access: CommercialAccess | null, action: Action): boolean {
  if (!can(role, action)) return false;
  if (!CREATE_ACTIONS.includes(action)) return true;
  return !!access && access.canCreate;
}

// ---------------------------------------------------------------------------
// Avisos do teste (7 e 3 dias, e no vencimento). Datas exibidas em São Paulo;
// a comparação usa o instante exato.
// ---------------------------------------------------------------------------
export type TrialNotice = { level: "week" | "days" | "ended"; daysLeft: number; endsAt: string };

export function trialNotice(access: CommercialAccess | null, nowMs: number): TrialNotice | null {
  if (!access || !access.trialEndsAt) return null;
  if (access.phase === "paid" || access.phase === "not_applicable" || access.phase === "blocked") return null;
  const remaining = Date.parse(access.trialEndsAt) - nowMs;
  if (remaining <= 0) return access.phase === "expired" ? { level: "ended", daysLeft: 0, endsAt: access.trialEndsAt } : null;
  const daysLeft = Math.ceil(remaining / 864e5);
  if (daysLeft <= 3) return { level: "days", daysLeft, endsAt: access.trialEndsAt };
  if (daysLeft <= 7) return { level: "week", daysLeft, endsAt: access.trialEndsAt };
  return null;
}

export const PHASE_LABEL: Record<CommercialPhase, string> = {
  not_applicable: "Não se aplica a este perfil",
  blocked: "Acesso restrito pela administração",
  trial_not_started: "Teste de 30 dias (começa no primeiro acesso)",
  trial: "Teste de 30 dias em andamento",
  paid: "Plano pago vigente",
  expired: "Teste encerrado: somente consulta",
};
