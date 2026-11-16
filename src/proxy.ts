// ==============================================================================
// STUDIO LEANDRO RANGEL - Next.js Proxy (antigo middleware)
// ==============================================================================
// Middleware de segurança executado em todas as requisições.
// - Validação de Origin/Referer para proteção CSRF
// - Redirecionamento de autenticação
// - Headers de segurança adicionais

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { APP_MODE, SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "@/lib/app-mode";

// Rotas públicas que não requerem autenticação
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/solicitar-acesso",
  "/aguardando-aprovacao",
  "/demo",
  "/privacidade",
  "/termos",
  "/auth/callback",
  "/auth/reset-password",
];

// Rotas protegidas que requerem autenticação
const PROTECTED_ROUTES = [
  "/app",
  "/conta",
];

// Rotas administrativas
const ADMIN_ROUTES = [
  "/admin",
  "/test-email", // envia e-mail real pelo Resend: só administração
];

/**
 * Verifica se a rota é pública.
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Verifica se a rota é protegida.
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => 
    pathname.startsWith(route)
  );
}

/**
 * Verifica se a rota é administrativa.
 */
function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(route => 
    pathname.startsWith(route)
  );
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

  // Cria cliente Supabase para middleware
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

  // Se não há usuário e está tentando acessar rota protegida
  if (!user && (isProtectedRoute(pathname) || isAdminRoute(pathname))) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Se há usuário mas está tentando acessar admin, verifica role
  if (user && isAdminRoute(pathname)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin" || profile.status !== "active") {
      return NextResponse.redirect(new URL("/app", request.url));
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
