// Convenção de borda ativa do Next 16: proxy.ts. Não recriar middleware.ts:
// o Next 16 falha o build se as duas convenções existirem juntas em src/.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { APP_MODE, SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "@/lib/app-mode";
import { needsCode } from "@/lib/auth/mfa";
import { isAdminRoute, isBlockedPath, isProtectedRoute, isPublicRoute, needsActivation } from "@/lib/auth/edge-routes";

/** Responde com a página "não encontrada" (status 404), sem revelar se o endereço existe. */
function notFound(request: NextRequest) {
  return NextResponse.rewrite(new URL("/404", request.url), { status: 404 });
}

/**
 * Valida Origin/Referer para proteção CSRF em mutations.
 */
function validateOrigin(request: NextRequest): boolean {
  // Só valida em métodos que alteram estado
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    return true;
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  // Em desenvolvimento, aceita localhost
  if (process.env.NODE_ENV === "development") {
    const allowedOrigins = [
      `http://${host}`,
      `https://${host}`,
      "http://localhost:3000",
    ];

    if (origin && allowedOrigins.includes(origin)) {
      return true;
    }

    if (referer && allowedOrigins.some(o => referer.startsWith(o))) {
      return true;
    }
  } else {
    // Em produção, só aceita mesmo host
    const expectedOrigin = `https://${host}`;

    if (origin === expectedOrigin) {
      return true;
    }

    if (referer && referer.startsWith(expectedOrigin)) {
      return true;
    }
  }

  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Endereços que nunca são públicos (arquivos de configuração, pastas internas, sondagens comuns)
  if (isBlockedPath(pathname)) return notFound(request);

  // Validação CSRF para mutations
  if (!validateOrigin(request)) {
    console.warn(JSON.stringify({ level: "warn", kind: "csrf_origin", method: request.method }));

    return new NextResponse("Forbidden", { status: 403 });
  }

  // Para assets estáticos, continua sem verificação
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Para rotas públicas, continua sem verificação de sessão
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Para rotas protegidas, verifica sessão
  const supabaseUrl = SUPABASE_URL;
  const supabaseAnonKey = SUPABASE_PUBLIC_KEY;

  // Modo demonstração (NEXT_PUBLIC_APP_MODE=demo): o próprio /app é a demonstração, com dados
  // fictícios guardados só no navegador; não há sessão nem dado real a proteger. O modo é explícito
  // e o build de produção falha sem ele (next.config.mjs), então não há queda silenciosa para cá.
  if (APP_MODE !== "supabase" || !supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Cria cliente Supabase para a borda
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Verifica sessão
  const { data: { user } } = await supabase.auth.getUser();

  // Administração: para quem não é administrador ativo, o endereço simplesmente não existe
  // (sem redirecionar para o login, o que confirmaria que há uma área ali).
  if (isAdminRoute(pathname)) {
    if (!user) return notFound(request);
    const { data: profile } = await supabase.from("profiles").select("role, status").eq("id", user.id).maybeSingle();
    if (!profile || profile.role !== "admin" || profile.status !== "active") return notFound(request);
  }

  // Se não há usuário e está tentando acessar rota protegida
  if (!user && isProtectedRoute(pathname)) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Conta com autenticador e sessão só com a senha: volta ao login para digitar o código
  const guarded = isProtectedRoute(pathname) || isAdminRoute(pathname);
  const { data: lv } = user && guarded ? await supabase.auth.mfa.getAuthenticatorAssuranceLevel() : { data: null };
  if (user && guarded && lv && needsCode(lv.currentLevel, lv.nextLevel)) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("etapa", "codigo");
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Áreas logadas só com a conta ativada (senha criada pelo convite ou Google aprovado).
  // /conta fica de fora para o administrador poder configurar o segundo fator.
  if (user && needsActivation(pathname)) {
    const { data: p } = await supabase.from("profiles").select("status, activated_at").eq("id", user.id).maybeSingle();
    if (p && p.status === "active" && !p.activated_at) {
      return NextResponse.redirect(new URL("/aguardando-aprovacao", request.url));
    }
  }

  // Administrador confirmado acima: a administração ainda exige o segundo fator
  // (o banco também exige: is_admin() só vale em aal2)
  if (user && isAdminRoute(pathname)) {
    if (lv?.currentLevel !== "aal2") {
      const setup = new URL("/conta/seguranca", request.url);
      setup.searchParams.set("redirect", "/admin");
      return NextResponse.redirect(setup);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)",
  ],
};
