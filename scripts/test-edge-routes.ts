/* Testes das regras de rota usadas pela borda do Next (sem executar a borda nem supabase).
   Executar: node scripts/run-ts.mjs scripts/test-edge-routes.ts */
import assert from "node:assert/strict";
import {
  isAdminRoute,
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

console.log(`\n${n} testes de rotas de borda passaram.`);
