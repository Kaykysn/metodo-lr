// ==============================================================================
// Contratação: regras puras usadas pelas telas (sem rede). A chamada ao servidor
// fica em checkout.ts; a cobrança acontece no checkout hospedado do Asaas e o
// acesso só muda quando o webhook confirma o pagamento (INTEGRACAO_PAGAMENTOS_LOGIN.md).
// ==============================================================================

/**
 * Contratação aberta neste ambiente? Liga com NEXT_PUBLIC_BILLING_ENABLED=true depois que
 * a chave do Asaas e o webhook estiverem configurados no Supabase. Desligada, as telas
 * mostram BILLING_UNAVAILABLE_MESSAGE e nada chama o servidor de cobrança.
 */
export const BILLING_ENABLED: boolean = process.env.NEXT_PUBLIC_BILLING_ENABLED === "true";

export const BILLING_UNAVAILABLE_MESSAGE = "As assinaturas estarão disponíveis em breve. Nenhuma cobrança foi feita.";

/** Mesma regra do servidor: com teste em andamento, a primeira cobrança fica para o fim dele. */
export function firstChargeDate(trialEndsAt: string | null, nowMs: number): Date {
  const end = trialEndsAt ? Date.parse(trialEndsAt) : NaN;
  return Number.isFinite(end) && end > nowMs ? new Date(end) : new Date(nowMs);
}

/** Só segue para páginas https do Asaas (o servidor já confere; aqui é a segunda trava). */
export function isAsaasCheckoutUrl(v: unknown): v is string {
  if (typeof v !== "string") return false;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && (u.hostname === "asaas.com" || u.hostname.endsWith(".asaas.com"));
  } catch {
    return false;
  }
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
