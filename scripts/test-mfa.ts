/* Segundo fator: regras puras usadas pelo login, pela tela de segurança e pelo proxy.
   Executar: node scripts/run-ts.mjs scripts/test-mfa.ts
   NÃO testa o Supabase Auth; a exigência no banco está em backend/tests/db.test.mjs. */
import assert from "node:assert/strict";
import { CODE_INVALID, codeErrorMessage, needsCode, normalizeCode, safeNext } from "../src/lib/auth/mfa";

let n = 0;
const ok = (msg: string) => {
  n++;
  console.log(`✓ ${msg}`);
};

assert.equal(needsCode("aal1", "aal2"), true);
assert.equal(needsCode("aal2", "aal2"), false);
assert.equal(needsCode("aal1", "aal1"), false);
assert.equal(needsCode(null, null), false);
ok("Pede o código só quando há autenticador e a sessão ainda é aal1");

assert.equal(normalizeCode("123456"), "123456");
assert.equal(normalizeCode(" 123 456 "), "123456");
assert.equal(normalizeCode("123-456"), "123456");
for (const bad of ["12345", "1234567", "12a456", "", "١٢٣٤٥٦"]) assert.equal(normalizeCode(bad), null, bad);
ok("Código: só 6 dígitos, aceitando espaço ou hífen no meio");

assert.equal(safeNext("/admin"), "/admin");
assert.equal(safeNext("/conta/seguranca"), "/conta/seguranca");
assert.equal(safeNext("/planos?plano=evolucao"), "/planos?plano=evolucao", "volta ao resumo do plano escolhido na página inicial");
for (const bad of ["/planos?plano=gratis", "/planos?plano=evolucao&x=1", "/planos/../admin"]) assert.equal(safeNext(bad), null, bad);
for (const bad of ["//evil.com", "https://evil.com", "/\evil", "/login", "/admin?x=1", null]) assert.equal(safeNext(bad as string | null), null, String(bad));
ok("Destino depois do código: só caminhos internos conhecidos");

assert.equal(codeErrorMessage({ code: "mfa_verification_failed", status: 422 }), CODE_INVALID);
assert.match(codeErrorMessage({ status: 429 }), /Muitas tentativas/);
assert.doesNotMatch(codeErrorMessage({ status: 500, code: "unexpected_failure" }), /unexpected/);
ok("Mensagens fixas: nada do provedor vai para a tela");

console.log(`\n${n} grupos de testes passaram.`);
