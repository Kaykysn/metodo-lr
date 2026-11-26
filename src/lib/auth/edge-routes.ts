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

/**
 * Caminhos que nunca são servidos: arquivos de configuração e de código, pastas internas e as
 * sondagens automáticas mais comuns. Sempre 404, mesmo que um arquivo com esse nome apareça em
 * public/ por engano.
 */
const BLOCKED_SEGMENTS = new Set([
  "includes", "include", "inc", "private", "private_data", "privado", "backend", "supabase", "server",
  "config", "configs", "secrets", "backup", "backups", "bkp", "db", "database", "sql", "logs", "tmp",
  "node_modules", "src", "scripts", "vendor", "cgi-bin", "phpmyadmin", "pma", "wp-admin", "wp-content",
  "wp-includes", "wp-login.php", "xmlrpc.php", "administrator", "server-status",
]);
const BLOCKED_FILE = /(^|\/)\.(?!well-known(\/|$))[^/]*|\.(env|sql|sqlite|db|bak|backup|old|orig|swp|log|ini|conf|cfg|pem|key|crt|p12|pfx|ya?ml|toml|lock|php|asp|aspx|jsp|sh|ps1|py|rb)$/i;

export function isBlockedPath(pathname: string): boolean {
  let path: string;
  try {
    path = decodeURIComponent(pathname).toLowerCase();
  } catch {
    return true;
  }
  if (BLOCKED_FILE.test(path)) return true;
  return path.split("/").some((segment) => BLOCKED_SEGMENTS.has(segment));
}

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
