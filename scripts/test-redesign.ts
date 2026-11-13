/* Testes do redesign (lateralidade, triagem/regras, versões, autorização, persistência).
   Executar: npm run test:domain */
import assert from "node:assert/strict";
import { BODY_REGIONS_V2, REGION_BY_ID, migrateLegacyRegions, screenSide } from "../src/lib/domain/body-regions";
import { suggest } from "../src/lib/domain/suggestion-rules";
import { evaluateTriage } from "../src/lib/domain/triage";
import { approve, createDraftFromAssessment, practitionerView, proposeNewVersion, publish, updateDraft, latest } from "../src/lib/domain/plans";
import { DemoRepository } from "../src/lib/data/repository";
import { DEMO_ACTORS, buildSeed, emptyBlocks } from "../src/lib/data/seed";
import { EXERCISES, EXERCISE_BY_ID } from "../src/lib/domain/exercise-library";
import { EVIDENCE_BY_ID } from "../src/lib/domain/evidence";
import type { Assessment } from "../src/lib/domain/types";

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  await fn();
  passed++;
  console.log("✓", name);
}

class MemStorage {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
  key() { return null; }
  get length() { return this.m.size; }
}
const actor = (id: string) => DEMO_ACTORS.find((a) => a.id === id)!;

(async () => {
  // ---------------- Lateralidade
  await test("Vista anterior: lado direito da pessoa fica à esquerda da tela", () => {
    const r = REGION_BY_ID.get("knee:right")!;
    assert.ok(r.at.anterior!.x < 0.5, "joelho direito deveria estar à esquerda na vista anterior");
    assert.equal(screenSide("right", "anterior"), "left");
  });
  await test("Vista posterior: lado direito da pessoa fica à direita da tela", () => {
    const r = REGION_BY_ID.get("knee:right")!;
    assert.ok(r.at.posterior!.x > 0.5);
    assert.equal(screenSide("right", "posterior"), "right");
  });
  await test("Regiões bilaterais são espelhadas e IDs são únicos", () => {
    const ids = BODY_REGIONS_V2.map((r) => r.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const r of BODY_REGIONS_V2.filter((x) => x.side === "right")) {
      const l = REGION_BY_ID.get(`${r.base}:left`)!;
      for (const v of ["anterior", "posterior"] as const) {
        if (r.at[v]) assert.ok(Math.abs(r.at[v]!.x + l.at[v]!.x - 1) < 1e-9, `${r.id} espelhado em ${v}`);
      }
    }
  });
  await test("Todas as regiões têm ponto em pelo menos uma vista", () => {
    for (const r of BODY_REGIONS_V2) assert.ok(r.at.anterior || r.at.posterior, r.id);
  });
  await test("Migração dos IDs v1 sem perda (sacroilíaca vira as duas)", () => {
    const { ids, unknown } = migrateLegacyRegions(["right_knee", "cervical", "sacroiliac", "xyz"]);
    assert.deepEqual(new Set(ids), new Set(["knee:right", "neck", "sacroiliac:right", "sacroiliac:left"]));
    assert.deepEqual(unknown, ["xyz"]);
  });

  // ---------------- Triagem e regras
  const seed = buildSeed();
  const a142 = seed.assessments.find((a) => a.id === "av_0142_1")!;
  await test("Avaliação suficiente de iniciante gera opções rastreáveis (R1)", () => {
    const s = suggest(a142);
    assert.equal(s.status, "ok");
    const g = s.groups.find((x) => x.ruleId === "R1-forca-global-iniciante")!;
    assert.ok(g.exerciseIds.length >= 4);
    assert.ok(g.references.every((r) => EVIDENCE_BY_ID.has(r)));
    assert.ok(g.findingsUsed.length > 0);
  });
  await test("Triagem não respondida não vira 'normal'", () => {
    const blank: Assessment = { ...a142, blocks: emptyBlocks() };
    const t = evaluateTriage(blank.blocks.safety);
    assert.equal(t.status, "incomplete");
    const s = suggest(blank);
    assert.equal(s.status, "insufficient");
    assert.ok(s.missing.length > 0);
  });
  await test("Sinal de urgência bloqueia sugestão automática", () => {
    const b = JSON.parse(JSON.stringify(a142)) as Assessment;
    b.blocks.safety.answers.saddle_bladder = { state: "yes" };
    const s = suggest(b);
    assert.equal(s.status, "blocked");
    assert.equal(s.groups.length, 0);
    assert.equal(s.triage.status, "urgent");
  });
  await test("Dor irradiada bloqueia treino terapêutico automático", () => {
    const b = JSON.parse(JSON.stringify(seed.assessments[1])) as Assessment;
    b.blocks.safety.answers.trauma = { state: "no" };
    b.blocks.complaint.symptoms[0].radiates = { state: "yes", value: "perna esquerda" };
    assert.equal(suggest(b).status, "blocked");
  });
  await test("Lombar sem alerta oferece opções graduais (R3) com fonte OMS", () => {
    const b = JSON.parse(JSON.stringify(seed.assessments[1])) as Assessment;
    b.blocks.safety.answers.trauma = { state: "no" };
    const s = suggest(b);
    assert.equal(s.status, "ok");
    const g = s.groups.find((x) => x.ruleId === "R3-lombar-sem-alerta")!;
    assert.deepEqual(g.references, ["who-2023-lbp"]);
  });
  await test("Gestação exige revisão qualificada, sem defaults", () => {
    const b = JSON.parse(JSON.stringify(a142)) as Assessment;
    b.blocks.safety.pregnancy = { state: "yes" };
    assert.equal(suggest(b).status, "needs_review");
  });
  await test("Sugestões só usam exercícios elegíveis e existentes", () => {
    for (const g of suggest(a142).groups) for (const id of g.exerciseIds) assert.ok(EXERCISE_BY_ID.get(id)?.suggestionEligible, id);
  });
  await test("Catálogo: IDs únicos, regressões/progressões válidas, nenhuma referência inventada", () => {
    assert.equal(new Set(EXERCISES.map((e) => e.id)).size, EXERCISES.length);
    for (const e of EXERCISES) {
      for (const r of [...e.regressions, ...e.progressions]) assert.ok(EXERCISE_BY_ID.has(r), `${e.id} → ${r}`);
      for (const ref of e.references) assert.ok(EVIDENCE_BY_ID.has(ref), `${e.id} ref ${ref}`);
    }
  });

  // ---------------- Versões e aprovação
  const profA = actor("prof_a");
  const student = actor("est_1");
  const pract = actor("aluno_142");
  await test("Fluxo rascunho → aprovar → publicar; aluno só vê a publicada", () => {
    let p = createDraftFromAssessment({ actor: profA, assessment: a142, suggestion: suggest(a142), title: "T", frequencyPerWeek: 3, weeks: 8, startDate: "2027-03-01" });
    assert.equal(latest(p).status, "draft");
    assert.ok(latest(p).suggestionTrace?.ruleIds.length);
    assert.equal(practitionerView(p, pract), null, "rascunho não pode aparecer ao aluno");
    p = approve(p, profA);
    assert.equal(practitionerView(p, pract), null, "aprovado mas não publicado ainda não aparece");
    p = publish(p, profA);
    const v = practitionerView(p, pract)!;
    assert.equal(v.status, "published");
    assert.ok(v.sessions.every((s) => s.items.every((i) => i.privateNote === "")));
  });
  await test("Estudante não aprova nem publica treino", () => {
    const p = createDraftFromAssessment({ actor: student, assessment: a142, suggestion: null, title: "T", frequencyPerWeek: 2, weeks: 4, startDate: "2027-03-01" });
    assert.equal(latest(p).manualDraft, true);
    assert.throws(() => approve(p, student), /professor responsável/);
  });
  await test("Reavaliação gera nova versão sem alterar a publicada", () => {
    let p = createDraftFromAssessment({ actor: profA, assessment: a142, suggestion: suggest(a142), title: "T", frequencyPerWeek: 3, weeks: 8, startDate: "2027-03-01" });
    p = publish(approve(p, profA), profA);
    const before = JSON.stringify(p.versions[0].sessions);
    p = proposeNewVersion(p, profA, "Após reavaliação");
    p = updateDraft(p, profA, [{ ...p.versions[1].sessions[0], items: [] }]);
    assert.equal(JSON.stringify(p.versions[0].sessions), before);
    assert.equal(p.versions[0].status, "published");
    assert.equal(p.versions[1].status, "draft");
    assert.throws(() => approve(p, profA), /ao menos um exercício/);
  });

  // ---------------- Autorização e persistência (repositório de demonstração)
  await test("Professor A não acessa alunos do professor B", async () => {
    const repo = new DemoRepository(new MemStorage() as unknown as Storage);
    const aList = await repo.listTrainees(profA);
    assert.ok(aList.every((t) => t.ownerId === "prof_a"));
    assert.equal(await repo.getTrainee(profA, "tr_0203"), null);
    assert.equal(await repo.getAssessment(profA, "av_0203_1"), null);
    await assert.rejects(() => repo.createAssessment(profA, "tr_0203"));
  });
  await test("Aluno vê só o próprio treino publicado e não lista alunos", async () => {
    const repo = new DemoRepository(new MemStorage() as unknown as Storage);
    assert.equal((await repo.listTrainees(pract)).length, 0);
    const plans = await repo.listPlans(pract);
    assert.ok(plans.length === 1 && plans[0].traineeId === "tr_0142");
    assert.equal((await repo.listAssessments(pract)).length, 0, "aluno não lê avaliações/hipóteses");
  });
  await test("Administração não lê dados de saúde", async () => {
    const repo = new DemoRepository(new MemStorage() as unknown as Storage);
    const adm = actor("admin_1");
    assert.equal((await repo.listTrainees(adm)).length, 0);
    assert.equal((await repo.listAssessments(adm)).length, 0);
  });
  await test("Duas avaliações diferentes persistem e voltam sem mistura após recarregar", async () => {
    const storage = new MemStorage() as unknown as Storage;
    const repo = new DemoRepository(storage);
    const t = await repo.createTrainee(profA, { displayName: "Teste", goal: "Força", experience: "iniciante" });
    const x = await repo.createAssessment(profA, t.id);
    const y = await repo.createAssessment(profA, t.id);
    x.blocks.essentials.routine = "rotina X";
    y.blocks.essentials.routine = "rotina Y";
    const rx = await repo.saveAssessment(profA, x);
    await repo.saveAssessment(profA, y);
    assert.equal(rx.target, "demo-browser");
    const reloaded = new DemoRepository(storage); // simula recarregar a página
    assert.equal((await reloaded.getAssessment(profA, x.id))!.blocks.essentials.routine, "rotina X");
    assert.equal((await reloaded.getAssessment(profA, y.id))!.blocks.essentials.routine, "rotina Y");
    assert.equal(y.version, 2);
  });
  await test("Cliente não consegue trocar o dono da avaliação", async () => {
    const repo = new DemoRepository(new MemStorage() as unknown as Storage);
    const a = (await repo.getAssessment(profA, "av_0142_1"))!;
    await repo.saveAssessment(profA, { ...a, ownerId: "prof_b" });
    assert.equal((await repo.getAssessment(profA, "av_0142_1"))!.ownerId, "prof_a");
  });
  await test("Repositório recusa editar versão publicada e estudante publicando", async () => {
    const repo = new DemoRepository(new MemStorage() as unknown as Storage);
    const p = (await repo.getPlan(profA, "pl_0142"))!;
    const tampered = JSON.parse(JSON.stringify(p));
    tampered.versions[0].sessions[0].items = [];
    await assert.rejects(() => repo.savePlan(profA, tampered), /não podem ser editadas/);
    const t = await repo.createTrainee(student, { displayName: "Caso", goal: "Força", experience: "iniciante" });
    const a = await repo.createAssessment(student, t.id);
    let draft = createDraftFromAssessment({ actor: student, assessment: a, suggestion: null, title: "x", frequencyPerWeek: 2, weeks: 4, startDate: "2027-03-01" });
    draft = { ...draft, versions: [{ ...draft.versions[0], status: "published" }] };
    await assert.rejects(() => repo.savePlan(student, draft), /professor responsável/);
  });
  await test("Execução só em versão publicada", async () => {
    const repo = new DemoRepository(new MemStorage() as unknown as Storage);
    const base = { id: "l1", traineeId: "tr_0142", sessionId: "ss_a", prescribedId: "x", date: "2027-03-01", setNumber: 1, reps: 10, seconds: null, loadKg: 10, modality: "weight" as const, completed: true, effortRpe: 6, symptomIntensity: null, note: "" };
    await repo.addLogs(pract, [{ ...base, planVersionId: "pv_0142_1" }]);
    await assert.rejects(() => repo.addLogs(pract, [{ ...base, id: "l2", planVersionId: "nao-existe" }]));
  });

  console.log(`\n${passed} testes passaram.`);
})().catch((e) => {
  console.error("✗ FALHA:", e);
  process.exit(1);
});
