// ==============================================================================
// Contratação: DESATIVADA nesta etapa. Nada aqui chama o Asaas, cria cobrança
// ou recebe dados de cartão. A próxima rodada substitui requestCheckout por uma
// chamada a uma rota de servidor (ver INTEGRACAO_PAGAMENTOS_LOGIN.md).
// ==============================================================================
import { getPlan, type PlanId } from "./catalog";

/** Cobrança real ligada? Só muda junto com a integração no servidor. */
export const BILLING_ENABLED = false as const;

export const BILLING_UNAVAILABLE_MESSAGE = "As assinaturas estarão disponíveis em breve. Nenhuma cobrança foi feita.";

export type CheckoutResult = { status: "unavailable"; message: string; planId: PlanId };

/** Placeholder seguro: não faz rede, não aceita cartão, não ativa plano. */
export async function requestCheckout(planId: PlanId): Promise<CheckoutResult> {
  getPlan(planId); // valida o ID; preço definitivo será resolvido no servidor
  return { status: "unavailable", message: BILLING_UNAVAILABLE_MESSAGE, planId };
}

// ---------------------------------------------------------------------------
// Suporte prioritário do Completo: só é anunciado como pronto quando o
// proprietário configurar um canal real no servidor.
//   PRIORITY_SUPPORT_CHANNEL_URL  ex.: mailto:... ou https://...
//   PRIORITY_SUPPORT_HOURS        texto livre, ex.: "dias úteis, 9h–18h"
// Sem as duas variáveis, o benefício aparece como "em preparação".
// ---------------------------------------------------------------------------
export interface SupportConfig {
  prioritySupportReady: boolean;
  channelUrl: string | null;
  hours: string | null;
}

export function readSupportConfig(env: Record<string, string | undefined>): SupportConfig {
  const url = env.PRIORITY_SUPPORT_CHANNEL_URL?.trim() || null;
  const hours = env.PRIORITY_SUPPORT_HOURS?.trim() || null;
  const validUrl = !!url && /^(mailto:|https:\/\/)/i.test(url);
  return { prioritySupportReady: validUrl && !!hours, channelUrl: validUrl ? url : null, hours };
}
