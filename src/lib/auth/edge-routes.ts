// Classificação das rotas usada pela borda do Next (src/proxy.ts).
// A comparação é por segmento inteiro: "/administrator" não é "/admin", e "/app-x" não é "/app".
// Manter estas funções puras permite testar as regras sem executar a borda.

export const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/solicitar-acesso",
  "/aguardando-aprovacao",
  "/demo",
  "/privacidade",
  "/termos",
  "/auth/callback",
  "/auth/reset-password",
  "/auth/primeiro-acesso",
  "/planos",
] as const;

export const PROTECTED_ROUTES = [
  "/app",
  "/conta",
  "/aluno",
] as const;

export const ADMIN_ROUTES = ["/admin"] as const;

function matchesSegment(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => matchesSegment(pathname, route));
}

export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => matchesSegment(pathname, route));
}

export function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some((route) => matchesSegment(pathname, route));
}

/** Área de conta deve permanecer alcançável para administrador configurar o segundo fator. */
export function isAccountRoute(pathname: string): boolean {
  return matchesSegment(pathname, "/conta");
}

/** Rotas logadas onde a conta precisa estar ativada (senha do convite ou Google aprovado). */
export function needsActivation(pathname: string): boolean {
  return isProtectedRoute(pathname) && !isAccountRoute(pathname) && !isPublicRoute(pathname);
}
