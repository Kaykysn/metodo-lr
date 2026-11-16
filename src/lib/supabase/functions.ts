// Chamada às Edge Functions do backend (backend/supabase/functions).
// Envia só o token da sessão do usuário e a chave pública: a autorização é feita lá (e na RLS).
import { getSupabaseBrowserClient } from "./client";
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "@/lib/app-mode";

export class FunctionError extends Error {
  constructor(message: string, public status: number, public body: Record<string, unknown>) {
    super(message);
  }
}

export async function callFunction<T>(name: "posture" | "admin-access" | "exercise-sync" | "send-email" | "billing", path: string, init: RequestInit = {}): Promise<T> {
  const db = getSupabaseBrowserClient();
  const base = SUPABASE_URL;
  const anon = SUPABASE_PUBLIC_KEY;
  if (!db || !base || !anon) throw new FunctionError("Backend não configurado.", 0, {});
  const { data } = await db.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new FunctionError("Sua sessão expirou. Entre novamente.", 401, {});
  let res: Response;
  try {
    res = await fetch(`${base}/functions/v1/${name}${path}`, {
      ...init,
      headers: { ...(init.headers as Record<string, string> | undefined), Authorization: `Bearer ${token}`, apikey: anon },
    });
  } catch {
    throw new FunctionError("Sem conexão com o servidor. Verifique a internet e tente de novo.", 0, {});
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new FunctionError(typeof body.error === "string" ? body.error : "Não foi possível concluir a operação.", res.status, body);
  return body as T;
}
