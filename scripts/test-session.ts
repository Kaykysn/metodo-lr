/* Testes da sessão real com um cliente Supabase simulado (sem rede).
   Executar: node scripts/run-ts.mjs scripts/test-session.ts */
import assert from "node:assert/strict";
import { loadSession } from "../src/lib/data/session";
import { reactToAuthEvent } from "../src/lib/auth/session-events";

type Row = Record<string, unknown>;
function fakeDb(opts: { user: { id: string } | null; profile: Row | null; trainee?: Row | null; rpcProfile?: Row }) {
  const calls: string[] = [];
  const query = (table: string) => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => {
          calls.push(`select:${table}`);
          return { data: table === "profiles" ? opts.profile : opts.trainee ?? null, error: null };
        },
      }),
    }),
  });
  const db = {
    auth: { getUser: async () => ({ data: { user: opts.user }, error: null }) },
    from: query,
    rpc: async (name: string) => {
      calls.push(`rpc:${name}`);
      return { data: opts.rpcProfile ?? null, error: null };
    },
  };

  return { db: db as any, calls };
}

const base = { id: "u1", email: "a@b.c", full_name: "Ana", role: "teacher", status: "active", trial_started_at: null, trial_expires_at: null, paused_remaining_seconds: 0, created_at: "2026-11-01T00:00:00Z", updated_at: "2026-11-01T00:00:00Z", activated_at: "2026-11-01T00:00:00Z" };
const future = new Date(Date.now() + 10 * 864e5).toISOString();

(async () => {
  let n = 0;
  const ok = (m: string) => { n++; console.log("✓", m); };

  assert.equal((await loadSession(fakeDb({ user: null, profile: null }).db)).status, "signed_out");
  ok("Sem login → signed_out");

  const pending = await loadSession(fakeDb({ user: { id: "u1" }, profile: { ...base, status: "pending" } }).db);
  assert.equal(pending.status, "blocked");
  assert.equal(pending.status === "blocked" && pending.reason, "pending");
  ok("Perfil pendente → bloqueado sem consumir dias");

  const notActivated = fakeDb({ user: { id: "u1" }, profile: { ...base, activated_at: null } });
  const na = await loadSession(notActivated.db);
  assert.equal(na.status === "blocked" && na.reason, "not_activated");
  assert.ok(!notActivated.calls.includes("rpc:activate_my_trial"), "teste não começa antes de criar a senha");
  ok("Aprovado sem a senha do convite → bloqueado, sem iniciar os 30 dias");

  const f = fakeDb({ user: { id: "u1" }, profile: base, rpcProfile: { ...base, trial_started_at: new Date().toISOString(), trial_expires_at: future } });
  const first = await loadSession(f.db);
  assert.equal(first.status, "active");
  assert.ok(f.calls.includes("rpc:activate_my_trial"), "primeiro acesso deve ativar o teste no servidor");
  ok("Primeiro acesso aprovado → ativa os 30 dias pelo servidor");

  const g = fakeDb({ user: { id: "u1" }, profile: { ...base, trial_started_at: "2026-11-01T00:00:00Z", trial_expires_at: future } });
  await loadSession(g.db);
  assert.ok(!g.calls.includes("rpc:activate_my_trial"), "não reativa quem já começou");
  ok("Acesso já iniciado → não chama ativação de novo");

  const expired = await loadSession(fakeDb({ user: { id: "u1" }, profile: { ...base, trial_started_at: "2026-01-01T00:00:00Z", trial_expires_at: "2026-01-31T00:00:00Z" } }).db);
  assert.equal(expired.status === "blocked" && expired.reason, "expired");
  ok("Período vencido → bloqueado como expirado");

  const p = await loadSession(fakeDb({ user: { id: "u9" }, profile: { ...base, id: "u9", role: "practitioner", trial_started_at: "2026-11-01T00:00:00Z", trial_expires_at: future }, trainee: { id: "tr_9" } }).db);
  assert.equal(p.status === "active" && p.actor.traineeId, "tr_9");
  ok("Aluno praticante → vinculado ao próprio registro de aluno");

  const unknownRole = await loadSession(fakeDb({ user: { id: "u1" }, profile: { ...base, role: "superuser", trial_started_at: "2026-11-01T00:00:00Z", trial_expires_at: future } }).db);
  assert.equal(unknownRole.status, "blocked");
  assert.equal(unknownRole.status === "blocked" && unknownRole.reason, "unknown_role");
  ok("Papel desconhecido vindo do banco continua bloqueado (nem professor, nem admin)");

  // ---- Voltar para a aba não pode recarregar as telas (perderia o que está em edição)
  const U = "user-1";
  assert.equal(reactToAuthEvent("INITIAL_SESSION", undefined, U), "ignore");
  assert.equal(reactToAuthEvent("TOKEN_REFRESHED", U, U), "ignore");
  assert.equal(reactToAuthEvent("SIGNED_IN", U, U), "ignore");
  assert.equal(reactToAuthEvent("USER_UPDATED", U, U), "session");
  assert.equal(reactToAuthEvent("MFA_CHALLENGE_VERIFIED", U, U), "session");
  ok("Revalidação da mesma pessoa ao voltar para a aba não recarrega as telas");
  assert.equal(reactToAuthEvent("SIGNED_IN", null, U), "reload");
  assert.equal(reactToAuthEvent("SIGNED_OUT", U, null), "reload");
  assert.equal(reactToAuthEvent("SIGNED_IN", U, "user-2"), "reload");
  assert.equal(reactToAuthEvent("SIGNED_IN", undefined, U), "reload");
  ok("Entrar, sair ou trocar de conta recarrega tudo (dados de uma pessoa nunca ficam na tela da outra)");

  console.log(`\n${n} testes de sessão passaram.`);
})().catch((e) => {
  console.error("✗ FALHA:", e);
  process.exit(1);
});
