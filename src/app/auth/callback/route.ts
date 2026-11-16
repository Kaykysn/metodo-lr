// Retorno do login (Google e link por e-mail): troca o código por sessão no servidor e
// encaminha conforme o status do perfil. Mensagens de erro são códigos fixos; nada vindo do
// provedor é repassado à tela. Destinos são só caminhos internos fixos (sem redirecionamento aberto).
import { NextResponse, type NextRequest } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { needsCode } from "@/lib/auth/mfa";

const go = (origin: string, path: string) => NextResponse.redirect(new URL(path, origin));

export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url);
  if (!isSupabaseConfigured) return go(origin, "/login?erro=indisponivel");
  if (searchParams.get("error")) return go(origin, "/login?erro=provedor");
  const code = searchParams.get("code");
  if (!code || code.length > 512) return go(origin, "/login?erro=codigo");

  try {
    const supabase = await createRouteClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return go(origin, "/login?erro=sessao");
    const { data } = await supabase.auth.getUser();
    if (!data.user) return go(origin, "/login?erro=sessao");
    // Conta com autenticador: o Google sozinho não basta, o login pede o código
    const { data: lv } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (lv && needsCode(lv.currentLevel, lv.nextLevel)) return go(origin, "/login?etapa=codigo");
    const { data: profile } = await supabase.from("profiles").select("status").eq("id", data.user.id).maybeSingle();
    const status = (profile as { status?: string } | null)?.status;
    if (!status || status === "pending") return go(origin, "/aguardando-aprovacao");
    if (status === "active") return go(origin, "/app");
    return go(origin, "/conta/acesso");
  } catch {
    return go(origin, "/login?erro=interno");
  }
}
