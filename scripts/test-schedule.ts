/* Acompanhamento: próximos atendimentos no fuso do estabelecimento, remarcação pontual e histórico.
   Executar: node scripts/run-ts.mjs scripts/test-schedule.ts */
import assert from "node:assert/strict";
import { localParts, sortNotes, upcomingAppointments, zonedToUtc, type FollowUpNote, type SessionChange, type WeeklySlot } from "../src/lib/domain/schedule";

let n = 0;
const ok = (m: string) => console.log(`✓ ${++n}. ${m}`);

// Segunda-feira, 23/11/2026, 06:00 em São Paulo (UTC-3)
const from = zonedToUtc("2026-11-23", "06:00");
assert.equal(new Date(from).toISOString(), "2026-11-23T09:00:00.000Z");
assert.deepEqual(localParts(from), { date: "2026-11-23", time: "06:00", weekday: 1 });
ok("Relógio de São Paulo converte para o instante certo (UTC-3)");

const slots: WeeklySlot[] = [
  { id: "s1", traineeId: "t", weekday: 1, startTime: "07:00", durationMin: 60 }, // segunda
  { id: "s2", traineeId: "t", weekday: 4, startTime: "18:30", durationMin: 45 }, // quinta
];
const base = upcomingAppointments({ slots, changes: [] }, { fromMs: from, days: 14 });
assert.deepEqual(base.map((a) => [localParts(Date.parse(a.at)).date, localParts(Date.parse(a.at)).time]), [
  ["2026-11-23", "07:00"], ["2026-11-26", "18:30"], ["2026-11-30", "07:00"], ["2026-12-03", "18:30"], // 07/12 07:00 passa da janela (termina 07/12 06:00)
]);
assert.ok(base.every((a) => a.source === "habitual"));
ok("Horário habitual gera as próximas ocorrências na ordem, no fuso do estabelecimento");

const seg30 = new Date(zonedToUtc("2026-11-30", "07:00")).toISOString();
const changes: SessionChange[] = [
  { id: "c1", traineeId: "t", kind: "remarcacao", originalAt: seg30, scheduledAt: new Date(zonedToUtc("2026-12-01", "08:00")).toISOString(), durationMin: 60, note: "viagem", createdAt: "" },
  { id: "c2", traineeId: "t", kind: "cancelamento", originalAt: new Date(zonedToUtc("2026-11-26", "18:30")).toISOString(), scheduledAt: null, durationMin: 45, note: "", createdAt: "" },
  { id: "c3", traineeId: "t", kind: "avulso", originalAt: null, scheduledAt: new Date(zonedToUtc("2026-11-28", "09:00")).toISOString(), durationMin: 50, note: "avaliação", createdAt: "" },
];
const withChanges = upcomingAppointments({ slots, changes }, { fromMs: from, days: 14 });
const view = withChanges.map((a) => `${localParts(Date.parse(a.at)).date} ${localParts(Date.parse(a.at)).time} ${a.source}`);
assert.deepEqual(view, ["2026-11-23 07:00 habitual", "2026-11-28 09:00 avulso", "2026-12-01 08:00 remarcado", "2026-12-03 18:30 habitual"]);
ok("Remarcação muda só aquela sessão; cancelamento some da lista; avulso entra na data dele");

const all = upcomingAppointments({ slots, changes }, { fromMs: from, days: 14, includeCanceled: true });
assert.equal(all.filter((a) => a.source === "cancelado").length, 1);
assert.equal(upcomingAppointments({ slots, changes }, { fromMs: from, days: 14, limit: 2 }).length, 2);
ok("Cancelado aparece quando pedido (para desfazer) e o limite corta a lista");

const notes: FollowUpNote[] = [
  { id: "a", traineeId: "t", occurredOn: "2026-11-20", sessionAt: null, studentReport: "", professionalNote: "x", authorId: "p", authorName: "P", createdAt: "2026-11-20T12:00:00Z", updatedAt: "" },
  { id: "b", traineeId: "t", occurredOn: "2026-11-23", sessionAt: "2026-11-23T10:00:00Z", studentReport: "y", professionalNote: "", authorId: "p", authorName: "P", createdAt: "2026-11-23T11:00:00Z", updatedAt: "" },
  { id: "c", traineeId: "t", occurredOn: "2026-11-23", sessionAt: "2026-11-23T21:30:00Z", studentReport: "z", professionalNote: "", authorId: "p", authorName: "P", createdAt: "2026-11-23T22:00:00Z", updatedAt: "" },
];
assert.deepEqual(sortNotes(notes).map((x) => x.id), ["c", "b", "a"]);
ok("Histórico do mais recente para o mais antigo");

console.log(`\n${n} testes do acompanhamento passaram.`);
