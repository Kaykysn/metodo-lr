/* Testes do catálogo de exercícios v2 (fichas, músculos, filtros e referências).
   Executar: node scripts/run-ts.mjs scripts/test-catalog.ts */
import assert from "node:assert/strict";
import { EXERCISES, EXERCISE_BY_ID, LEGACY_EXERCISE_IDS, exerciseMuscleIds, searchExercises } from "../src/lib/domain/exercise-library";
import { CATALOG_ENTRIES } from "../src/lib/domain/exercise-catalog";
import { expandMuscleRef, isKnownMuscleRef, MUSCLES, MUSCLE_GROUPS_DEF } from "../src/lib/domain/muscles";
import { CLAIM_BY_ID, CLAIMS } from "../src/lib/domain/evidence-claims";
import { EVIDENCE_BY_ID } from "../src/lib/domain/evidence";
import { buildSeed } from "../src/lib/data/seed";
import { suggest } from "../src/lib/domain/suggestion-rules";
import { REGION_BY_ID } from "../src/lib/domain/body-regions";
import { addExerciseToPlan, latest } from "../src/lib/domain/plans";
import { aggregateMonthlyVolume } from "../src/lib/volume";

let n = 0;
const ok = (msg: string) => {
  n++;
  console.log(`✓ ${msg}`);
};

// ---- Compatibilidade com treinos antigos
for (const id of LEGACY_EXERCISE_IDS) assert.ok(EXERCISE_BY_ID.has(id), `ID antigo sem ficha: ${id}`);
const seed = buildSeed();
for (const p of seed.plans) for (const v of p.versions) for (const s of v.sessions) for (const it of s.items) assert.ok(EXERCISE_BY_ID.get(it.exerciseId), `Treino antigo não resolve ${it.exerciseId}`);
for (const a of seed.assessments) for (const g of suggest(a).groups) for (const id of [...g.exerciseIds, ...g.alternatives]) assert.ok(EXERCISE_BY_ID.has(id), `Regra aponta para ID inexistente: ${id}`);
ok(`Todos os ${LEGACY_EXERCISE_IDS.length} IDs antigos, os treinos de demonstração e as regras continuam resolvendo`);

const goblet = EXERCISE_BY_ID.get("goblet-squat")!;
assert.equal(goblet.suggestionEligible, true, "a ficha v2 não pode desligar a elegibilidade no motor de regras");
assert.ok(goblet.references.includes("acsm-2026-rt"), "referências antigas são mantidas");
const lumbar = EXERCISE_BY_ID.get("romanian-deadlift")!;
assert.ok(lumbar.synonyms.some((s) => s.toLocaleLowerCase("pt-BR") === "levantamento romeno"), "o nome antigo vira apelido");
assert.equal(new Set(lumbar.synonyms.map((s) => s.toLocaleLowerCase("pt-BR"))).size, lumbar.synonyms.length, "apelidos sem repetição por caixa");
for (const e of CATALOG_ENTRIES) {
  if (!LEGACY_EXERCISE_IDS.includes(e.id)) continue;
  assert.equal(EXERCISE_BY_ID.get(e.id)!.loadKind, e.loadKind, `${e.id}: a ficha v2 declara outro tipo de carga que o ID antigo`);
}
const vol = aggregateMonthlyVolume(
  seed.logs.map((l) => ({ id: l.id, assessmentId: "", exerciseName: l.prescribedId, date: l.date, setNumber: l.setNumber, reps: l.reps ?? 0, loadKg: l.loadKg ?? 0, isCompleted: l.completed, modality: l.modality })),
  "2027-02"
);
assert.equal(vol.totalVolumeKg, 9480, "o volume de demonstração não pode mudar com o catálogo");
ok("Ficha v2 sobre ID existente preserva elegibilidade, referências, tipo de carga e o nome antigo como apelido (volume de demonstração segue 9.480 kg)");

// ---- Integridade do catálogo
const ids = CATALOG_ENTRIES.map((e) => e.id);
assert.equal(new Set(ids).size, ids.length, "IDs repetidos no catálogo");
assert.equal(new Set(EXERCISES.map((e) => e.id)).size, EXERCISES.length, "IDs repetidos na biblioteca");
const names = EXERCISES.map((e) => e.name.toLocaleLowerCase("pt-BR"));
assert.equal(new Set(names).size, names.length, `Nomes repetidos: ${names.filter((x, i) => names.indexOf(x) !== i).join(", ")}`);
assert.equal(CATALOG_ENTRIES.length, 52);
assert.equal(CATALOG_ENTRIES.filter((e) => e.purposes.includes("hipertrofia")).length >= 31, true);
assert.equal(CATALOG_ENTRIES.filter((e) => e.purposes.includes("reabilitacao")).length >= 21, true);
ok("52 fichas com IDs e nomes únicos (31 de hipertrofia e 21 de retorno ao exercício, com sobreposição)");

for (const e of CATALOG_ENTRIES) {
  const d = e.detail;
  for (const [k, v] of Object.entries({ name: e.name, objective: e.objective, variation: d.variation, start: d.startingPosition, breathing: d.breathing, roleVariation: d.roleVariation, tolerance: d.toleranceNotes, errors: e.commonErrors })) {
    assert.ok(String(v).trim().length > 3, `${e.id}: campo ${k} vazio`);
  }
  assert.ok(d.instructions.length >= 2, `${e.id}: instruções insuficientes`);
  assert.ok(d.jointActions.length >= 1, `${e.id}: ações articulares ausentes`);
  assert.ok(d.adjustments.length >= 1, `${e.id}: ajustes ausentes`);
  assert.ok(d.prescriptionFields.length >= 3, `${e.id}: campos de prescrição ausentes`);
  assert.ok(d.muscles.some((m) => m.role === "primary"), `${e.id}: sem músculo principal`);
  for (const p of e.purposes) assert.ok(d.purposeNotes[p], `${e.id}: falta nota para o propósito ${p}`);
  assert.equal(d.reviewStatus, "pendente de revisão editorial");
  assert.equal(d.media.status, "sem mídia autorizada");
  for (const r of [...e.regressions, ...e.progressions]) assert.ok(EXERCISE_BY_ID.has(r), `${e.id}: regressão/progressão inexistente ${r}`);
  assert.ok(d.claims.length >= 1, `${e.id}: sem afirmação ligada`);
  for (const c of d.claims) assert.ok(CLAIM_BY_ID.has(c), `${e.id}: afirmação inexistente ${c}`);
}
ok("Toda ficha tem execução, ajustes, prescrição, notas por propósito, revisão pendente e afirmações existentes");

for (const e of CATALOG_ENTRIES) {
  const seen = new Map<string, string>();
  for (const r of e.detail.muscles) {
    assert.ok(isKnownMuscleRef(r.ref), `${e.id}: músculo desconhecido ${r.ref}`);
    for (const m of expandMuscleRef(r.ref)) {
      assert.ok(!seen.has(m.id), `${e.id}: ${m.name} aparece duas vezes (${seen.get(m.id)} e ${r.ref})`);
      seen.set(m.id, r.ref);
    }
  }
}
ok("Nenhuma ficha repete um músculo entre o grupo e os músculos individuais");

for (const m of MUSCLES) for (const r of m.regions) assert.ok(Array.from(REGION_BY_ID.values()).some((x) => x.base === r), `Região desconhecida ${r} em ${m.id}`);
for (const g of MUSCLE_GROUPS_DEF) for (const id of g.members) assert.ok(MUSCLES.some((m) => m.id === id && m.groupId === g.id) || g.id === "parede-abdominal", `Grupo ${g.id} com membro inconsistente ${id}`);
ok("Músculos apontam para regiões existentes do mapa corporal e grupos são consistentes");

const curta = expandMuscleRef("biceps-femoral-curta")[0];
assert.match(curta.actions, /não participa da extensão do quadril/);
assert.equal(expandMuscleRef("quadriceps").length, 4);
assert.equal(expandMuscleRef("triceps-braquial").length, 3);
assert.equal(expandMuscleRef("isquiotibiais").length, 4);
ok("Grupos amplos se expandem nas cabeças e componentes anatômicos");

// ---- Referências
for (const c of CLAIMS) {
  assert.ok(EVIDENCE_BY_ID.has(c.sourceId), `Afirmação ${c.id} sem fonte`);
  assert.equal(c.reviewStatus, "pendente de revisão editorial", `${c.id} não pode constar como revisada sem leitura do texto completo`);
}
for (const id of ["plotkin-2023-hipthrust", "maeo-2021-hamstrings", "maeo-2022-triceps", "ferber-2015-pfp", "hopewell-2021-grasp", "ferreira-2010-sapo"]) {
  const s = EVIDENCE_BY_ID.get(id)!;
  assert.ok(s.doi && s.url.includes(s.doi), `${id}: DOI e URL divergentes`);
}
ok("Cada afirmação aponta para uma fonte; nenhuma consta como revisada; DOIs batem com as URLs");

// ---- Filtros e busca
const hyp = searchExercises({ purpose: "hipertrofia" }).map((e) => e.id);
const reab = searchExercises({ purpose: "reabilitacao" }).map((e) => e.id);
assert.ok(hyp.includes("goblet-squat") && reab.includes("goblet-squat"), "exercício com dois propósitos deve aparecer nos dois filtros");
assert.ok(hyp.includes("back-squat") && !reab.includes("back-squat"));
assert.ok(reab.includes("clamshell") && !hyp.includes("clamshell"));
assert.equal(searchExercises({}).length, EXERCISES.length, "Todos mostra a biblioteca inteira");
ok("Filtros de propósito aceitam exercícios com as duas etiquetas; “Todos” mostra tudo");

const find = (text: string) => searchExercises({ text }).map((e) => e.id);
assert.ok(find("gluteo maximo").includes("hip-thrust"), "busca sem acento por músculo");
assert.ok(find("AGACHAMENTO BULGARO").includes("bulgarian-split-squat"), "busca sem acento e sem caixa");
assert.ok(find("hip thrust").includes("hip-thrust"), "nome em inglês");
assert.ok(find("lat pulldown").includes("lat-pulldown"));
assert.ok(find("stiff").includes("romanian-deadlift"), "apelido em português");
assert.ok(find("vasto lateral").includes("leg-extension"), "músculo individual expandido do grupo");
ok("Busca ignora acentos e caixa e encontra apelidos, nomes em inglês e músculos individuais");

assert.ok(searchExercises({ muscle: "biceps-femoral-curta" }).some((e) => e.id === "seated-leg-curl"));
assert.ok(searchExercises({ muscle: "isquiotibiais" }).some((e) => e.id === "romanian-deadlift"), "grupo encontra ficha que lista os músculos individuais");
assert.ok(searchExercises({ muscle: "quadriceps" }).some((e) => e.id === "step-down"));
assert.ok(searchExercises({ region: "calf" }).some((e) => e.id === "seated-calf-raise"));
assert.ok(searchExercises({ laterality: "unilateral" }).every((e) => e.laterality === "unilateral"));
assert.ok(searchExercises({ difficulty: "avançado" }).some((e) => e.id === "back-squat"));
assert.ok(exerciseMuscleIds(EXERCISE_BY_ID.get("romanian-deadlift")!).has("isquiotibiais"));
ok("Filtros por músculo, grupo, região, lateralidade e dificuldade");

// ---- Adicionar ao treino do aluno
{
  const plan = seed.plans[0];
  const teacher = { id: plan.ownerId, name: "Prof.", role: "teacher" as const };
  const sess = latest(plan).sessions[0];
  const before = latest(plan).sessions[0].items.length;
  const r1 = addExerciseToPlan({ plan, actor: teacher, sessionId: sess.id, exercise: EXERCISE_BY_ID.get("clamshell")! });
  assert.equal(r1.newVersion, true, "versão publicada gera nova versão em rascunho");
  assert.equal(latest(r1.plan).status, "draft");
  assert.equal(r1.plan.versions.find((v) => v.status === "published")!.sessions[0].items.length, before, "a versão publicada não muda");
  const added = latest(r1.plan).sessions[0].items.at(-1)!;
  assert.equal(added.exerciseId, "clamshell");
  assert.ok(added.rehab, "exercício de retorno ao exercício abre o contexto de reabilitação");
  const r2 = addExerciseToPlan({ plan: r1.plan, actor: teacher, sessionId: sess.id, exercise: EXERCISE_BY_ID.get("seated-leg-curl")! });
  assert.equal(r2.newVersion, false, "rascunho aberto recebe o exercício sem nova versão");
  assert.equal(r2.plan.versions.length, r1.plan.versions.length);
  assert.equal(latest(r2.plan).sessions[0].items.at(-1)!.rehab, undefined);
  assert.throws(() => addExerciseToPlan({ plan, actor: { id: "outro", name: "Outro", role: "teacher" }, sessionId: sess.id, exercise: EXERCISE_BY_ID.get("clamshell")! }));
  ok("Adicionar ao treino usa o fluxo de versões e respeita o dono do treino");
}

console.log(`\n${n} testes do catálogo passaram.`);
