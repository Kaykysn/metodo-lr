/* Regressão do envio de plan_versions: aprovação é UPDATE, criação é INSERT.
   Executar: node scripts/run-ts.mjs scripts/test-plan-save.ts
   O .upsert() antigo gerava INSERT ... ON CONFLICT e a RLS recusava o status
   'approved' na política de INSERT. Aqui conferimos a montagem da chamada. */
import assert from "node:assert/strict";
import { SupabaseRepository } from "../src/lib/data/supabase-repository";

type Call = { op: string; table: string; payload?: any; filters: Record<string, unknown> };

class FakeQuery {
  private filters: Record<string, unknown> = {};
  constructor(private calls: Call[], private table: string, private op: string, private payload?: any) {}
  select() { return this; }
  eq(key: string, value: unknown) { this.filters[key] = value; return this; }
  insert(payload: any) { return new FakeQuery(this.calls, this.table, "insert", payload); }
  update(payload: any) { return new FakeQuery(this.calls, this.table, "update", payload); }
  upsert(payload: any) { return new FakeQuery(this.calls, this.table, "upsert", payload); }
  private record() { this.calls.push({ op: this.op, table: this.table, payload: this.payload, filters: { ...this.filters } }); }
  private result() {
    if (this.table === "plan_versions" && this.op === "select") return [{ id: "pv1" }];
    if (this.op === "insert" || this.op === "update") return { id: this.payload?.id ?? this.filters.id ?? "linha" };
    return null;
  }
  single() { this.record(); return Promise.resolve({ data: this.result(), error: null }); }
  maybeSingle() { this.record(); return Promise.resolve({ data: this.result(), error: null }); }
  then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
    this.record();
    return Promise.resolve({ data: this.result(), error: null }).then(resolve, reject);
  }
}

const calls: Call[] = [];
const db: any = {
  from(table: string) {
    return new FakeQuery(calls, table, "select");
  },
};
const repo = new SupabaseRepository(db);
const actor = { id: "prof-a", role: "teacher" } as any;
const existing: any = {
  id: "pv1", planId: "pl1", number: 1, status: "approved", sessions: [{ id: "s1", items: [{ id: "i1" }] }],
  sourceAssessmentId: "av1", sourceAssessmentVersion: 2, suggestionTrace: null, manualDraft: true,
  authorId: "prof-a", createdAt: "2027-01-01T00:00:00Z", changeNote: "v1",
};
const created: any = {
  id: "pv2", planId: "pl1", number: 2, status: "draft", sessions: [],
  sourceAssessmentId: null, sourceAssessmentVersion: null, suggestionTrace: null, manualDraft: true,
  authorId: "prof-a", createdAt: "2027-01-02T00:00:00Z", changeNote: "v2",
};
const plan: any = {
  id: "pl1", traineeId: "al1", ownerId: "prof-a", title: "Força", goal: "", startDate: "2027-02-01",
  weeks: 4, frequencyPerWeek: 2, isDemo: false, versions: [existing, created],
};

async function main() {
  await repo.savePlan(actor, plan);
  const versions = calls.filter((c) => c.table === "plan_versions");
  const selectIds = versions.find((c) => c.op === "select" && c.filters.plan_id === "pl1");
  assert.ok(selectIds, "deve consultar as versões existentes pelo plan_id");
  assert.ok(!versions.some((c) => c.op === "upsert"), "plan_versions não deve mais usar upsert");

  const update = versions.find((c) => c.op === "update" && c.filters.id === "pv1");
  assert.ok(update, "versão existente deve ser UPDATE");
  assert.equal(update.payload.status, "approved");
  assert.equal(update.payload.change_note, "v1");
  for (const forbidden of ["id", "plan_id", "number", "author_id", "approved_by", "approved_at"]) {
    assert.ok(!(forbidden in update.payload), `UPDATE não deve enviar ${forbidden}`);
  }

  const insert = versions.find((c) => c.op === "insert" && c.payload?.id === "pv2");
  assert.ok(insert, "versão nova deve ser INSERT");
  assert.equal(insert.payload.plan_id, "pl1");
  assert.equal(insert.payload.number, 2);
  assert.equal(insert.payload.author_id, "prof-a");
  assert.equal(insert.payload.status, "draft");

  console.log("✓ savePlan usa UPDATE para aprovar e INSERT para criar versão");
}
void main();
