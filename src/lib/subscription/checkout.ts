// ==============================================================================
// Contratação (navegador): pede ao servidor o link do checkout hospedado do Asaas
// e encerra a renovação. O navegador envia só o planId; preço, cliente e vínculo
// com a conta são decididos na Edge Function "billing". Dados de cartão ficam no Asaas.
// ==============================================================================
import { callFunction } from "@/lib/supabase/functions";
import { isPlanId, type PlanId } from "./catalog";
import { isAsaasCheckoutUrl } from "./billing";

export async function startCheckout(planId: PlanId): Promise<string> {
  if (!isPlanId(planId)) throw new Error("Plano desconhecido.");
  const r = await callFunction<{ url?: unknown }>("billing", "/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ planId }),
  });
  if (!isAsaasCheckoutUrl(r.url)) throw new Error("O serviço de pagamento devolveu um endereço inesperado. Nenhuma cobrança foi feita.");
  return r.url;
}

export async function cancelRenewal(): Promise<{ paidThrough: string | null }> {
  const r = await callFunction<{ paidThrough?: string | null }>("billing", "/cancelar", { method: "POST" });
  return { paidThrough: r.paidThrough ?? null };
}
