import { NextResponse, type NextRequest } from "next/server";
import { APP_MODE, SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "@/lib/app-mode";
import { needsCode } from "@/lib/auth/mfa";
import { createServerClient } from "@supabase/ssr";

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
const PROTECTED_ROUTES = ["/app", "/conta"];

// Rotas administrativas
const ADMIN_ROUTES = ["/admin"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
}

function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some((route) => pathname.startsWith(route));
}

/** Valida Origin/Referer para proteção CSRF em mutations. */
function validateOrigin(request: NextRequest): boolean {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    return true;
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  if (process.env.NODE_ENV === "development") {
    const allowedOrigins = [`http://${host}`, `https://${host}`, "http://localhost:3000"];
    if (origin && allowedOrigins.includes(origin)) return true;
    if (referer && allowedOrigins.some((o) => referer.startsWith(o))) return true;
  } else {
    const expectedOrigin = `https://${host}`;
    if (origin === expectedOrigin) return true;
    if (referer && referer.startsWith(expectedOrigin)) return true;
  }

  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!validateOrigin(request)) {
    console.warn(JSON.stringify({ level: "warn", kind: "csrf_origin", method: request.method }));
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) {
    return NextResponse.next();
  }

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Modo demonstração: sem sessão/dados reais a proteger no edge.
  if (APP_MODE !== "supabase" || !SUPABASE_URL || !SUPABASE_PUBLIC_KEY) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && (isProtectedRoute(pathname) || isAdminRoute(pathname))) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const guarded = isProtectedRoute(pathname) || isAdminRoute(pathname);
  const { data: lv } =
    user && guarded ? await supabase.auth.mfa.getAuthenticatorAssuranceLevel() : { data: null };
  if (user && guarded && lv && needsCode(lv.currentLevel, lv.nextLevel)) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("etapa", "codigo");
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAdminRoute(pathname)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin" || profile.status !== "active") {
      return NextResponse.redirect(new URL("/app", request.url));
    }

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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)",
  ],
};
