// Segundo fator (código de 6 dígitos de um aplicativo autenticador, TOTP) pelo Supabase Auth.
// Obrigatório para administradores: o banco só reconhece admin em sessão aal2 (is_admin()).
// Para as demais contas é opcional; quem cadastrar passa a precisar do código para entrar.
// Mensagens fixas: nada vindo do provedor vai para a tela.
import type { SupabaseClient } from "@supabase/supabase-js";

export type AalLevel = string | null | undefined; // "aal1" | "aal2" (o Supabase tipa como string aberta)

/** A sessão tem autenticador cadastrado, mas ainda não confirmou o código. */
export const needsCode = (current: AalLevel, next: AalLevel): boolean => next === "aal2" && current !== "aal2";

/** Aceita "123 456" ou "123456"; devolve só os 6 dígitos, ou null. */
export function normalizeCode(raw: string): string | null {
  const d = raw.replace(/[\s-]/g, "");
  return /^\d{6}$/.test(d) ? d : null;
}

/** Destino depois do login: só caminhos internos conhecidos (sem redirecionamento aberto). */
export function safeNext(raw: string | null): string | null {
  if (!raw || raw.length > 200 || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return null;
  return /^\/(app|conta|admin)(\/[A-Za-z0-9/_-]*)?$/.test(raw) ? raw : null;
}

export const CODE_INVALID = "Código incorreto ou vencido. Confira o horário do celular e use o código atual.";
const CODE_RATE = "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.";
const CODE_GENERIC = "Não foi possível confirmar o código agora. Tente de novo em instantes.";

export function codeErrorMessage(error: { status?: number; code?: string } | null | undefined): string {
  if (!error) return CODE_GENERIC;
  if (error.status === 429 || error.code === "over_request_rate_limit") return CODE_RATE;
  if (error.code === "mfa_verification_failed" || error.code === "mfa_challenge_expired" || error.status === 422 || error.status === 400) return CODE_INVALID;
  return CODE_GENERIC;
}

export async function assurance(client: SupabaseClient): Promise<{ current: AalLevel; next: AalLevel }> {
  const { data, error } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return { current: null, next: null };
  return { current: data.currentLevel, next: data.nextLevel };
}

/** Autenticador já confirmado na conta (o primeiro TOTP verificado). */
export async function verifiedTotpId(client: SupabaseClient): Promise<string | null> {
  const { data, error } = await client.auth.mfa.listFactors();
  if (error || !data) return null;
  return data.totp.find((f) => f.status === "verified")?.id ?? null;
}

/** Confirma o código do autenticador já cadastrado; sobe a sessão para aal2. Devolve a mensagem de erro, ou null. */
export async function verifyCode(client: SupabaseClient, raw: string): Promise<string | null> {
  const code = normalizeCode(raw);
  if (!code) return "Digite os 6 números do aplicativo autenticador.";
  const factorId = await verifiedTotpId(client);
  if (!factorId) return CODE_GENERIC;
  const { error } = await client.auth.mfa.challengeAndVerify({ factorId, code });
  return error ? codeErrorMessage(error) : null;
}

export interface EnrollStart {
  factorId: string;
  /** QR code em SVG (data URI) para ler com o celular. */
  qr: string;
  /** Chave para digitar à mão, se a câmera não ler o QR. */
  secret: string;
}

/** Começa o cadastro: descarta tentativas anteriores não confirmadas e cria um TOTP novo. */
export async function startEnroll(client: SupabaseClient): Promise<EnrollStart | { error: string }> {
  const { data: list } = await client.auth.mfa.listFactors();
  for (const f of list?.all ?? []) {
    if (f.factor_type === "totp" && f.status !== "verified") await client.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: `Autenticador ${new Date().toISOString().slice(0, 10)}` });
  if (error || !data || data.type !== "totp") {
    if (error?.status === 429) return { error: CODE_RATE };
    return { error: "Não foi possível iniciar o cadastro do autenticador agora. Tente de novo em instantes." };
  }
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

/** Conclui o cadastro com o primeiro código gerado pelo aplicativo. Devolve a mensagem de erro, ou null. */
export async function confirmEnroll(client: SupabaseClient, factorId: string, raw: string): Promise<string | null> {
  const code = normalizeCode(raw);
  if (!code) return "Digite os 6 números do aplicativo autenticador.";
  const { error } = await client.auth.mfa.challengeAndVerify({ factorId, code });
  return error ? codeErrorMessage(error) : null;
}
