/* Modo do site explícito: o build de produção falha sem modo ou com modo real incompleto, e a regra
   do navegador (src/lib/app-mode.ts) concorda com a do build (next.config.mjs).
   Executar: node scripts/run-ts.mjs scripts/test-app-mode.ts */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { appModeProblems, resolveAppMode } from "../src/lib/app-mode";

const E = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;
let n = 0;
const ok = (msg: string) => {
  n++;
  console.log(`✓ ${msg}`);
};

const URL_OK = "https://abcdefghijklmnop.supabase.co";
const KEY_OK = "sb_publishable_testeSemValorReal0000000000";
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const ANON_JWT = `${b64({ alg: "HS256" })}.${b64({ role: "anon" })}.assinatura-falsa`;
const SERVICE_JWT = `${b64({ alg: "HS256" })}.${b64({ role: "service_role" })}.assinatura-falsa`;
const cases: { env: Record<string, string>; build: boolean; mode: "demo" | "supabase" }[] = [
  { env: {}, build: false, mode: "demo" },
  { env: { NEXT_PUBLIC_APP_MODE: "producao" }, build: false, mode: "demo" },
  { env: { NEXT_PUBLIC_APP_MODE: "demo" }, build: true, mode: "demo" },
  { env: { NEXT_PUBLIC_APP_MODE: "demo", NEXT_PUBLIC_SUPABASE_URL: URL_OK, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: KEY_OK }, build: true, mode: "demo" },
  { env: { NEXT_PUBLIC_APP_MODE: "supabase" }, build: false, mode: "demo" },
  { env: { NEXT_PUBLIC_APP_MODE: "supabase", NEXT_PUBLIC_SUPABASE_URL: "https://seu-projeto.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: KEY_OK }, build: false, mode: "demo" },
  { env: { NEXT_PUBLIC_APP_MODE: "supabase", NEXT_PUBLIC_SUPABASE_URL: "http://abc.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: KEY_OK }, build: false, mode: "demo" },
  { env: { NEXT_PUBLIC_APP_MODE: "supabase", NEXT_PUBLIC_SUPABASE_URL: URL_OK, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sua-chave-publica-anonima" }, build: false, mode: "demo" },
  { env: { NEXT_PUBLIC_APP_MODE: "supabase", NEXT_PUBLIC_SUPABASE_URL: URL_OK, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: KEY_OK }, build: true, mode: "supabase" },
  { env: { NEXT_PUBLIC_APP_MODE: "supabase", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: KEY_OK }, build: true, mode: "supabase" },
  { env: { NEXT_PUBLIC_APP_MODE: "demo", NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: "x" }, build: false, mode: "demo" },
  // Projeto antigo: chave anon (JWT) no nome antigo continua aceita.
  { env: { NEXT_PUBLIC_APP_MODE: "supabase", NEXT_PUBLIC_SUPABASE_URL: URL_OK, NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON_JWT }, build: true, mode: "supabase" },
  // Chave secreta colada no lugar da pública: barrada, em qualquer modo.
  { env: { NEXT_PUBLIC_APP_MODE: "supabase", NEXT_PUBLIC_SUPABASE_URL: URL_OK, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_naoPodeIrParaONavegador000" }, build: false, mode: "demo" },
  { env: { NEXT_PUBLIC_APP_MODE: "supabase", NEXT_PUBLIC_SUPABASE_URL: URL_OK, NEXT_PUBLIC_SUPABASE_ANON_KEY: SERVICE_JWT }, build: false, mode: "demo" },
  { env: { NEXT_PUBLIC_APP_MODE: "demo", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_naoPodeIrParaONavegador000" }, build: false, mode: "demo" },
];

const runBuildConfig = (env: Record<string, string>) => {
  const clean: Record<string, string> = { PATH: process.env.PATH ?? "", SystemRoot: process.env.SystemRoot ?? "" };
  const script = `import(${JSON.stringify("file:///" + path.join(process.cwd(), "next.config.mjs").replace(/\\/g, "/"))}).then((m) => { m.default("phase-production-build"); process.stdout.write("ok"); }).catch((e) => { process.stdout.write("erro:" + e.message); });`;
  return execFileSync(process.execPath, ["--input-type=module", "-e", script], { env: E({ ...clean, ...env }), cwd: process.cwd(), encoding: "utf8" });
};

for (const c of cases) {
  const out = runBuildConfig(c.env);
  const label = JSON.stringify(c.env);
  assert.equal(out === "ok", c.build, `build ${c.build ? "deveria passar" : "deveria falhar"} com ${label}: ${out}`);
  const mode = resolveAppMode({ mode: c.env.NEXT_PUBLIC_APP_MODE, url: c.env.NEXT_PUBLIC_SUPABASE_URL, anonKey: c.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || c.env.NEXT_PUBLIC_SUPABASE_ANON_KEY });
  assert.equal(mode, c.mode, `modo efetivo errado com ${label}`);
  if (!c.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
    const tsOk = appModeProblems({ mode: c.env.NEXT_PUBLIC_APP_MODE, url: c.env.NEXT_PUBLIC_SUPABASE_URL, anonKey: c.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || c.env.NEXT_PUBLIC_SUPABASE_ANON_KEY }).length === 0;
    assert.equal(tsOk, c.build, `regra do navegador diverge da do build com ${label}`);
  }
}
ok(`Build de produção barra modo ausente, inválido, URL/chave de exemplo, http fora de localhost, chave secreta no lugar da pública e NEXT_PUBLIC_ com SERVICE (${cases.length} casos)`);
ok("Configuração inválida nunca liga o modo real: o site cai em demonstração só onde o build já teria falhado");

const devOut = execFileSync(process.execPath, ["--input-type=module", "-e", `import(${JSON.stringify("file:///" + path.join(process.cwd(), "next.config.mjs").replace(/\\/g, "/"))}).then((m) => { const c = m.default("phase-development-server"); process.stdout.write(JSON.stringify(c.typescript)); });`], { env: E({ PATH: process.env.PATH ?? "" }), encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
assert.equal(JSON.parse(devOut).ignoreBuildErrors, false);
ok("Desenvolvimento sem modo só avisa; erros de tipo barram o build");

const cspOf = (phase: string) =>
  execFileSync(process.execPath, ["--input-type=module", "-e", `import(${JSON.stringify("file:///" + path.join(process.cwd(), "next.config.mjs").replace(/\\/g, "/"))}).then(async (m) => { const h = await m.default(${JSON.stringify(phase)}).headers(); process.stdout.write(h[0].headers.find((x) => x.key === "Content-Security-Policy").value); });`], { env: E({ PATH: process.env.PATH ?? "", NEXT_PUBLIC_APP_MODE: "demo" }), encoding: "utf8" });
assert.doesNotMatch(cspOf("phase-production-build"), /unsafe-eval/, "produção não pode liberar eval");
assert.match(cspOf("phase-development-server"), /unsafe-eval/);
ok("CSP de produção sem 'unsafe-eval' (só o servidor de desenvolvimento libera)");

console.log(`\n${n} testes do modo do site passaram.`);
