// ==============================================================================
// Situações comerciais SIMULADAS, só para a demonstração (dados no navegador).
// Em modo real (Supabase) estas fixtures são ignoradas: ver commercialInputsFor().
// ==============================================================================
import type { PlanId } from "./catalog";
import { CATALOG_VERSION } from "./catalog";
import type { SubscriptionRecord, TrialWindow } from "./entitlements";

export type DemoScenario = "trial" | "trial_ending" | "trial_expired" | "paid_essencial" | "paid_evolucao" | "paid_completo";

export const DEMO_SCENARIOS: { id: DemoScenario; label: string }[] = [
  { id: "trial", label: "Teste de 30 dias (faltam 25 dias)" },
  { id: "trial_ending", label: "Teste terminando (faltam 3 dias)" },
  { id: "trial_expired", label: "Teste encerrado, sem plano" },
  { id: "paid_essencial", label: "Essencial pago (teste encerrado)" },
  { id: "paid_evolucao", label: "Evolução pago (teste encerrado)" },
  { id: "paid_completo", label: "Completo pago (teste encerrado)" },
];

export function isDemoScenario(v: unknown): v is DemoScenario {
  return DEMO_SCENARIOS.some((s) => s.id === v);
}

const DAY = 864e5;

function simulatedPaid(planId: PlanId, nowMs: number): SubscriptionRecord {
  return {
    planId,
    catalogVersion: CATALOG_VERSION,
    billingStatus: "active",
    currentPeriodStart: new Date(nowMs - 5 * DAY).toISOString(),
    paidThrough: new Date(nowMs + 25 * DAY).toISOString(),
    cancelAtPeriodEnd: false,
    pendingPlanId: null,
    provider: null, // simulação: nenhum ID externo fictício
    providerSubscriptionId: null,
  };
}

export function scenarioInputs(s: DemoScenario, nowMs: number): { trial: TrialWindow; subscription: SubscriptionRecord | null } {
  const trialFrom = (daysLeft: number): TrialWindow => ({
    startedAt: new Date(nowMs - (30 - daysLeft) * DAY).toISOString(),
    expiresAt: new Date(nowMs + daysLeft * DAY).toISOString(),
  });
  switch (s) {
    case "trial":
      return { trial: trialFrom(25), subscription: null };
    case "trial_ending":
      return { trial: trialFrom(2.5), subscription: null };
    case "trial_expired":
      return { trial: trialFrom(-4), subscription: null };
    case "paid_essencial":
      return { trial: trialFrom(-10), subscription: simulatedPaid("essencial", nowMs) };
    case "paid_evolucao":
      return { trial: trialFrom(-10), subscription: simulatedPaid("evolucao", nowMs) };
    case "paid_completo":
      return { trial: trialFrom(-10), subscription: simulatedPaid("completo", nowMs) };
  }
}

/**
 * Escolhe de onde vêm trial e assinatura. Fora da demonstração a simulação é
 * descartada: nenhuma fixture concede acesso em produção.
 */
export function commercialInputsFor(args: {
  mode: "demo" | "supabase";
  scenario: DemoScenario | null;
  real: { trial: TrialWindow; subscription: SubscriptionRecord | null };
  nowMs: number;
}): { trial: TrialWindow; subscription: SubscriptionRecord | null; simulated: boolean } {
  if (args.mode === "demo" && args.scenario) return { ...scenarioInputs(args.scenario, args.nowMs), simulated: true };
  return { ...args.real, simulated: false };
}
