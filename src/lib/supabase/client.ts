// Cliente do Supabase no navegador. Só a chave pública (publishable/anon): a autorização é da RLS e das
// Edge Functions em backend/. O modo vem de NEXT_PUBLIC_APP_MODE (ver src/lib/app-mode.ts).
import { createBrowserClient } from "@supabase/ssr";
import { APP_MODE, SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "@/lib/app-mode";

export const isSupabaseConfigured = APP_MODE === "supabase";

export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured) return null;
  return createBrowserClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
}
