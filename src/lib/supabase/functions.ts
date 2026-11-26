// Chamada às Edge Functions do backend (backend/supabase/functions).
// Envia só o token da sessão do usuário e a chave pública: a autorização é feita lá (e na RLS).
import { getSupabaseBrowserClient } from "./client";
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "@/lib/app-mode";

export class FunctionError extends Error {
  constructor(message: string, public status: number, public body: Record<string, unknown>) {
    super(message);
  }
}

type SessionFunction = "posture" | "admin-access" | "exercise-sync" | "send-email" | "billing" | "account-password" | "practitioner-access" | "exercise-media";
/** Funções abertas a quem ainda não tem conta (a própria função limita e confere o captcha). */
type PublicFunction = "access-request";

async function request<T>(name: string, path: string, init: RequestInit, token: string | null): Promise<T> {
  const base = SUPABASE_URL;
  const key = SUPABASE_PUBLIC_KEY;
  if (!base || !key) throw new FunctionError("Backend não configurado.", 0, {});
  let res: Response;
  try {
    res = await fetch(`${base}/functions/v1/${name}${path}`, {
      ...init,
      headers: {
        ...(init.headers as Record<string, string> | undefined),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        apikey: key,
      },
    });
  } catch {
    throw new FunctionError("Sem conexão com o servidor. Verifique a internet e tente de novo.", 0, {});
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new FunctionError(typeof body.error === "string" ? body.error : "Não foi possível concluir a operação.", res.status, body);
  return body as T;
}

export async function callFunction<T>(name: SessionFunction, path: string, init: RequestInit = {}): Promise<T> {
  const db = getSupabaseBrowserClient();
  if (!db) throw new FunctionError("Backend não configurado.", 0, {});
  const { data } = await db.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new FunctionError("Sua sessão expirou. Entre novamente.", 401, {});
  return request<T>(name, path, init, token);
}

/** Sem sessão: só a chave pública vai junto. */
export function callPublicFunction<T>(name: PublicFunction, path: string, init: RequestInit = {}): Promise<T> {
  return request<T>(name, path, init, null);
}
