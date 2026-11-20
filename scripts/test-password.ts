/* Regra de senha do site: mesmos casos de backend/supabase/functions/_shared/password_test.ts.
   Executar: node scripts/run-ts.mjs scripts/test-password.ts */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { nameParts, passwordProblems } from "../src/lib/auth/password-rule";

let n = 0;
const ok = (m: string) => console.log(`✓ ${++n}. ${m}`);
const CLAUDIA = "Cláudia Ribeiro";

assert.deepEqual(passwordProblems("Mar!27", CLAUDIA), []);
ok("Mar!27 atende a regra para Cláudia Ribeiro");

assert.deepEqual(passwordProblems("Mar!2", CLAUDIA), ["curta"]);
assert.deepEqual(passwordProblems("mar!27", CLAUDIA), ["maiuscula"]);
assert.deepEqual(passwordProblems("Mar127", CLAUDIA), ["simbolo"]);
assert.deepEqual(passwordProblems("Claudia!27", CLAUDIA), ["nome"]);
assert.deepEqual(passwordProblems("MeuRIBEIRO#9", CLAUDIA), ["nome"]);
ok("Mar!2, mar!27, Mar127, Claudia!27 e MeuRIBEIRO#9 falham, cada uma pelo seu motivo");

for (const s of ["!", "@", "#", "$"]) assert.deepEqual(passwordProblems(`Treino${s}x`, CLAUDIA), []);
assert.deepEqual(passwordProblems("Agua#Fresca", CLAUDIA), [], "número não é exigido");
ok("Cada um dos quatro símbolos vale sozinho e número não é exigido");

assert.deepEqual(passwordProblems("CLÁUDIA@1", CLAUDIA), ["nome"]);
assert.deepEqual(nameParts("Maria das Dores da Silva e Souza"), ["maria", "dores", "silva", "souza"]);
ok("Nome com acento ou maiúsculas é reconhecido; partículas (de, da, dos, e…) são ignoradas");

// A regra do site e a do servidor precisam ser a mesma
const backend = path.join(process.cwd(), "backend", "supabase", "functions", "_shared", "password.ts");
if (fs.existsSync(backend)) {
  const norm = (f: string) =>
    fs.readFileSync(f, "utf8").split("\n").filter((l) => !/^\s*(\/\/|\/\*\*|\*)/.test(l) && !/PASSWORD_REQUIREMENTS|^\s*\{ id:|^\];$|^\s*$/.test(l)).join("\n");
  const site = norm(path.join(process.cwd(), "src", "lib", "auth", "password-rule.ts"));
  for (const fn of ["PASSWORD_MIN = 6", "PASSWORD_MAX = 72", '["!", "@", "#", "$"]', '"de", "da", "do", "dos", "das", "e"', "p.length >= 3"]) {
    assert.ok(site.includes(fn) && norm(backend).includes(fn), `regra diverge entre site e servidor: ${fn}`);
  }
  ok("Site e servidor usam os mesmos limites, símbolos e partículas");
}

console.log(`\n${n} testes da regra de senha passaram.`);
