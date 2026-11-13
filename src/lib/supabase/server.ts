// Cliente do Supabase para rotas do Next (servidor) com a sessão do usuário em cookies.
// Só a chave pública: o site não tem nem usa a chave de serviço.
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isSupabaseConfigured } from "./client";
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "@/lib/app-mode";

export async function createRouteClient() {
  if (!isSupabaseConfigured) throw new Error("Supabase não configurado");
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        for (const { name, value, options } of list) store.set(name, value, options);
      },
    },
  });
}
