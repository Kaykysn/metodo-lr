// Modo do site, sempre explícito: "demo" (dados fictícios só no navegador) ou "supabase" (contas e
// dados reais no backend). Sem modo definido o build de produção falha (next.config.mjs), para que
// um erro de configuração nunca vire, em silêncio, um site de demonstração no ar.
export type AppMode = "demo" | "supabase";

export interface ModeEnv {
  mode?: string;
  url?: string;
  anonKey?: string;
}

const isPlaceholder = (v: string) => /seu-projeto|sua-chave|example|exemplo/i.test(v);

/** Chave que dá acesso total ao banco: nunca pode ir para o navegador. */
export function isSecretKey(key: string): boolean {
  if (/^sb_secret_/i.test(key)) return true;
  const parts = key.split(".");
  if (parts.length !== 3) return false;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("utf8");
    return (JSON.parse(json) as { role?: string }).role === "service_role";
  } catch {
    return false;
  }
}

/** Problemas de configuração para o modo pedido (lista vazia = configuração válida). */
export function appModeProblems(env: ModeEnv): string[] {
  const problems: string[] = [];
  if (env.anonKey && isSecretKey(env.anonKey)) {
    problems.push("A chave pública do Supabase é uma chave SECRETA (sb_secret_/service_role). Use a publishable (sb_publishable_) ou a anon.");
  }
  if (env.mode !== "demo" && env.mode !== "supabase") {
    problems.push('NEXT_PUBLIC_APP_MODE deve ser "demo" ou "supabase".');
    return problems;
  }
  if (env.mode === "supabase") {
    const url = (env.url ?? "").replace(/\/$/, "");
    const valid = /^https:\/\/[a-z0-9.-]+$/i.test(url) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(url);
    if (!url || isPlaceholder(url) || !valid) {
      problems.push("NEXT_PUBLIC_SUPABASE_URL ausente ou inválida (esperado https://<projeto>.supabase.co).");
    }
    if (!env.anonKey || isPlaceholder(env.anonKey) || env.anonKey.length < 20) {
      problems.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ausente ou inválida.");
    }
  }
  return problems;
}

/** Modo efetivo. Configuração inválida nunca liga o modo real; fica em demonstração (o build já barrou). */
export function resolveAppMode(env: ModeEnv): AppMode {
  return env.mode === "supabase" && appModeProblems(env).length === 0 ? "supabase" : "demo";
}

// Referências literais: o Next só embute no navegador variáveis NEXT_PUBLIC_ escritas assim.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
/** Chave pública: a nova "publishable" (sb_publishable_…) ou, em projetos antigos, a "anon". */
export const SUPABASE_PUBLIC_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const APP_MODE: AppMode = resolveAppMode({
  mode: process.env.NEXT_PUBLIC_APP_MODE,
  url: SUPABASE_URL,
  anonKey: SUPABASE_PUBLIC_KEY,
});
