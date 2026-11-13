// ==============================================================================
// Leitura de assinatura e registro de intenção de plano.
// - Demonstração: intenção guardada no navegador (não concede nada).
// - Supabase: intenção via RPC select_plan_intent (servidor valida o plano e a
//   versão do catálogo); assinatura só é lida, nunca escrita pelo cliente.
// NÃO TESTADO contra um projeto Supabase real.
// ==============================================================================
import type { SupabaseClient } from "@supabase/supabase-js";
import { CATALOG_VERSION, isPlanId, type PlanId } from "./catalog";
import type { BillingStatus, PlanIntent, SubscriptionRecord } from "./entitlements";

export interface SubscriptionSnapshot {
  subscription: SubscriptionRecord | null;
  intent: PlanIntent | null;
  /** true quando as tabelas ainda não existem no banco (migração não aplicada). */
  unavailable: boolean;
}

export interface SubscriptionStore {
  read(userId: string): Promise<SubscriptionSnapshot>;
  recordIntent(userId: string, planId: PlanId): Promise<PlanIntent>;
}

const KEY = "lr_demo_plan_intent_v1";

export class DemoSubscriptionStore implements SubscriptionStore {
  constructor(private storage: Storage | null) {}
  private all(): Record<string, PlanIntent> {
    try {
      const raw = this.storage?.getItem(KEY);
      return raw ? (JSON.parse(raw) as Record<string, PlanIntent>) : {};
    } catch {
      return {};
    }
  }
  async read(userId: string): Promise<SubscriptionSnapshot> {
    const intent = this.all()[userId];
    return { subscription: null, intent: intent && isPlanId(intent.planId) ? intent : null, unavailable: false };
  }
  async recordIntent(userId: string, planId: PlanId): Promise<PlanIntent> {
    if (!isPlanId(planId)) throw new Error("Plano desconhecido.");
    const intent: PlanIntent = { planId, catalogVersion: CATALOG_VERSION, selectedAt: new Date().toISOString() };
    const all = { ...this.all(), [userId]: intent };
    this.storage?.setItem(KEY, JSON.stringify(all));
    return intent;
  }
  reset() {
    this.storage?.removeItem(KEY);
  }
}

const BILLING: BillingStatus[] = ["none", "active", "past_due", "canceled"];

function toSubscription(r: any): SubscriptionRecord {
  return {
    planId: isPlanId(r.plan_id) ? r.plan_id : null,
    catalogVersion: r.catalog_version ?? null,
    billingStatus: BILLING.includes(r.billing_status) ? r.billing_status : "none",
    currentPeriodStart: r.current_period_start ?? null,
    paidThrough: r.paid_through ?? null,
    cancelAtPeriodEnd: !!r.cancel_at_period_end,
    pendingPlanId: isPlanId(r.pending_plan_id) ? r.pending_plan_id : null,
    provider: r.provider === "asaas" ? "asaas" : null,
    providerSubscriptionId: r.provider_subscription_id ?? null,
  };
}

export class SupabaseSubscriptionStore implements SubscriptionStore {
  constructor(private db: SupabaseClient) {}
  async read(userId: string): Promise<SubscriptionSnapshot> {
    const [sub, intent] = await Promise.all([
      this.db.from("subscriptions").select("*").eq("user_id", userId).maybeSingle(),
      this.db.from("plan_intents").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (sub.error || intent.error) return { subscription: null, intent: null, unavailable: true };
    return {
      subscription: sub.data ? toSubscription(sub.data) : null,
      intent: intent.data && isPlanId(intent.data.plan_id) ? { planId: intent.data.plan_id, catalogVersion: intent.data.catalog_version, selectedAt: intent.data.created_at } : null,
      unavailable: false,
    };
  }
  async recordIntent(_userId: string, planId: PlanId): Promise<PlanIntent> {
    // O servidor usa auth.uid(); o cliente não envia user_id nem preço.
    const { data, error } = await this.db.rpc("select_plan_intent", { p_plan_id: planId });
    if (error) throw new Error(error.message);
    return { planId, catalogVersion: data?.catalog_version ?? CATALOG_VERSION, selectedAt: data?.created_at ?? new Date().toISOString() };
  }
}
