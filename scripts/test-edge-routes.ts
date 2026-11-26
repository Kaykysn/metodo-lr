/* Testes das regras de rota usadas pela borda do Next (sem executar a borda nem supabase).
   Executar: node scripts/run-ts.mjs scripts/test-edge-routes.ts */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  isAdminRoute,
  isBlockedPath,
  isProtectedRoute,
  isPublicRoute,
  needsActivation,
} from "../src/lib/auth/edge-routes";

let n = 0;
const ok = (message: string) => {
  n++;
  console.log("✓", message);
};

for (const path of [
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
  "/privacidade/extra",
]) {
  assert.equal(isPublicRoute(path), true, `pública: ${path}`);
}
ok("Rotas públicas incluem primeiro acesso, callback e planos");

for (const path of ["/app", "/app/treinos/novo", "/conta", "/conta/seguranca", "/aluno"]) {
  assert.equal(isProtectedRoute(path), true, `protegida: ${path}`);
}
ok("Áreas /app, /conta e /aluno exigem sessão");

for (const path of ["/admin", "/admin/relatorios"]) {
  assert.equal(isAdminRoute(path), true, `administrativa: ${path}`);
}
ok("Área administrativa cobre /admin e subpastas");

// Correspondência por segmento inteiro: prefixos parecidos não viram rota protegida/admin.
for (const path of ["/apparently", "/conta-corrente", "/administrator", "/alunos", "/adminx"]) {
  assert.equal(isProtectedRoute(path), false, `não protegida: ${path}`);
  assert.equal(isAdminRoute(path), false, `não administrativa: ${path}`);
}
ok("Prefixos parciais não são tratados como rotas protegidas ou administrativas");

for (const path of ["/app", "/app/treinos", "/aluno", "/aluno/agenda"]) {
  assert.equal(needsActivation(path), true, `exige ativação: ${path}`);
}
for (const path of ["/conta", "/conta/seguranca", "/admin", "/planos", "/login", "/auth/callback", "/apparently"]) {
  assert.equal(needsActivation(path), false, `não exige ativação: ${path}`);
}
ok("Gate de ativação cobre áreas logadas, exceto /conta (MFA do admin) e rotas públicas");

// Caminhos internos e sondagens comuns respondem 404, sem afetar nenhuma página ou arquivo público
for (const p of [
  "/includes", "/includes/db.php", "/private_data", "/Private_Data/x", "/backend", "/supabase/.env",
  "/.env", "/.env.local", "/.git/config", "/config.toml", "/backup.sql", "/wp-admin", "/wp-login.php",
  "/phpmyadmin", "/server-status", "/node_modules/x", "/%2e%2e/%2eenv", "/%E0%A4%A", "/app/../.env",
]) {
  assert.equal(isBlockedPath(p), true, `deveria bloquear ${p}`);
}
const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const publicFiles = walk(path.join(process.cwd(), "public")).map((f) => "/" + path.relative(path.join(process.cwd(), "public"), f).split(path.sep).join("/"));
const appPages = walk(path.join(process.cwd(), "src", "app"))
  .filter((f) => /[\\/](page|route)\.tsx?$/.test(f))
  .map((f) => "/" + path.relative(path.join(process.cwd(), "src", "app"), path.dirname(f)).split(path.sep).filter((seg) => !/^\(.*\)$/.test(seg)).join("/"))
  .map((p) => p.replace(/\[[^\]]+\]/g, "x"));
for (const p of [...publicFiles, ...appPages, "/.well-known/security.txt", "/robots.txt", "/sitemap.xml", "/app/alunos/123", "/admin"]) {
  assert.equal(isBlockedPath(p), false, `não deveria bloquear ${p}`);
}
ok(`Bloqueio de caminhos internos: sondagens dão 404; ${publicFiles.length} arquivos públicos e ${appPages.length} páginas seguem acessíveis`);

console.log(`\n${n} testes de rotas de borda passaram.`);
