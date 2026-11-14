/* Testes do catálogo ampliado no site (wger + exercícios próprios): mapeamento para a ficha usada
   nos treinos, busca segura, validação de vídeo, repositório de demonstração e nome de reserva.
   Executar: node scripts/run-ts.mjs scripts/test-catalog-extended.ts
   NÃO testam o banco nem a sincronização (ver backend/tests e backend/supabase/functions/_shared). */
import assert from "node:assert/strict";
import { checkVideoFile, DemoCatalogRepo, searchTerm } from "../src/lib/catalog/repository";
import { itemName, isCatalogId, registerCatalogExercise, toExerciseCard } from "../src/lib/catalog/bridge";
import { regionsOf } from "../src/lib/catalog/labels";
import { EMPTY_QUERY, type CatalogExercise } from "../src/lib/catalog/types";
import { EXERCISE_BY_ID, EXERCISES } from "../src/lib/domain/exercise-library";
import { defaultPrescription } from "../src/lib/domain/plans";
import { relatedSymptoms } from "../src/components/training/AssessmentHints";

let passed = 0;
async function t(name: string, fn: () => void | Promise<void>) {
  await fn();
  passed++;
  console.log(`✓ ${name}`);
}

const base: CatalogExercise = {
  id: "wger-11111111-1111-4111-8111-111111111111", source: "wger", name: "Agachamento com barra", name_en: "Back Squat", name_pt: "Agachamento com barra",
  description_en: "Stand.", description_pt: "Fique de pé.", aliases: [], category: "Legs",
  primary_muscles: [{ id: 10, name: "Quadriceps femoris", name_en: "Quads", is_front: true }], secondary_muscles: [{ id: 8, name: "Gluteus maximus", name_en: "Glutes", is_front: false }],
  muscle_ids: [10, 8], equipment: ["Barbell"], apparatus: "livre", instructions: "", license: "CC-BY-SA 4", license_url: "", authors: ["a"],
  media_status: "none", owner_id: null, visibility: "shared", share_requested: false, is_active: true, last_synced_at: null,
};
const file = (type: string, size: number, name = "v") => ({ type, size, name }) as File;

(async () => {
  await t("Ficha do catálogo vira ficha de treino com músculos em português e tipo de carga coerente", () => {
    const c = toExerciseCard(base);
    assert.equal(c.primaryMuscles[0], "Quadríceps");
    assert.equal(c.loadKind, "external_kg");
    assert.equal(c.modality, "musculação");
    assert.deepEqual(regionsOf(base).sort(), ["anterior_thigh", "glute", "hip_groin"]);
    assert.equal(c.suggestionEligible, false, "nunca entra no motor de sugestões automaticamente");
    assert.equal(c.source, "wger");
    assert.equal(toExerciseCard({ ...base, category: "Cardio" }).loadKind, "time_or_distance");
    assert.equal(toExerciseCard({ ...base, equipment: ["Resistance band"] }).loadKind, "band");
    assert.equal(toExerciseCard({ ...base, apparatus: "peso_corporal", equipment: [] }).loadKind, "bodyweight");
  });

  await t("Camada editorial prevalece sobre a fonte, sem alterar o dado original", () => {
    const c = toExerciseCard(base, { exercise_id: base.id, name_pt: "Agachamento livre", description_pt: "Revisado.", purposes: ["hipertrofia"], agonists: [], synergists: [], stabilizers: [], technical_notes: "", caution_notes: "Ajustar amplitude.", reviewed_at: null });
    assert.equal(c.name, "Agachamento livre");
    assert.equal(c.execution, "Revisado.");
    assert.deepEqual(c.purposes, ["hipertrofia"]);
    assert.equal(base.name, "Agachamento com barra");
  });

  await t("Prescrição guarda nome e origem; treino continua legível se o exercício não carregar", () => {
    const card = registerCatalogExercise(base);
    const p = defaultPrescription(card);
    assert.equal(p.exerciseName, "Agachamento com barra");
    assert.equal(p.exerciseSource, "wger");
    assert.equal(itemName({ exerciseId: "wger-saiu-da-fonte", exerciseName: "Remada antiga" }), "Remada antiga");
    assert.equal(itemName({ exerciseId: "inexistente" }), "Exercício não encontrado");
    assert.ok(isCatalogId(base.id) && isCatalogId("cx-1") && !isCatalogId("goblet-squat"));
  });

  await t("Curadoria do método não muda (96 fichas, ids preservados)", () => {
    assert.equal(EXERCISES.length, 96);
    assert.ok(EXERCISES.every((e) => EXERCISE_BY_ID.get(e.id) === e));
  });

  await t("Busca: texto não injeta operadores no filtro do PostgREST", () => {
    assert.equal(searchTerm("supino),name.eq.x"), "supino name.eq.x");
    assert.equal(searchTerm("*%agacha%*"), "agacha");
    assert.ok(searchTerm("a".repeat(200)).length <= 60);
  });

  await t("Vídeo: só MP4, MOV ou WebM, até 50 MB", () => {
    assert.equal(checkVideoFile(file("video/mp4", 1000)), null);
    assert.equal(checkVideoFile(file("", 1000, "clip.MOV")), null);
    assert.equal(checkVideoFile(file("video/webm", 50 * 1024 * 1024)), null);
    assert.match(checkVideoFile(file("video/mp4", 50 * 1024 * 1024 + 1))!, /50 MB/);
    assert.match(checkVideoFile(file("image/gif", 10))!, /Formato/);
    assert.match(checkVideoFile(file("video/mp4", 0))!, /vazio/);
  });

  await t("Demonstração: amostra real do wger, filtros, favoritos e exercício próprio isolado", async () => {
    const r = new DemoCatalogRepo();
    const all = await r.search(EMPTY_QUERY, 0);
    assert.equal(all.total, 24);
    assert.ok(all.items.every((e) => e.source === "wger" && e.license));
    const legs = await r.search({ ...EMPTY_QUERY, category: "Legs" }, 0);
    assert.ok(legs.total > 0 && legs.items.every((e) => e.category === "Legs"));
    const media = await r.search({ ...EMPTY_QUERY, withMedia: true }, 0);
    assert.equal(media.total, 16);
    const quads = await r.search({ ...EMPTY_QUERY, muscle: "10" }, 0);
    assert.ok(quads.items.every((e) => e.muscle_ids.includes(10)));
    assert.equal((await r.search({ ...EMPTY_QUERY, purpose: "hipertrofia" }, 0)).total, 0, "classificação editorial não é inventada");
    await r.setFavorite(all.items[0].id, true);
    assert.equal((await r.search({ ...EMPTY_QUERY, favorites: true }, 0)).total, 1);
    const mine = await r.createCustom({ name: "Meu exercício", description_pt: "", instructions: "", category: "Legs", primary_muscle_ids: [10], secondary_muscle_ids: [10, 8], equipment: [], apparatus: "livre" });
    assert.ok(mine.id.startsWith("cx-"));
    assert.deepEqual(mine.secondary_muscles.map((m) => m.id), [8], "músculo não fica como principal e secundário ao mesmo tempo");
    assert.equal((await r.search({ ...EMPTY_QUERY, scope: "mine" }, 0)).total, 1);
    assert.equal((await r.search(EMPTY_QUERY, 0)).total, 24, "exercício próprio não entra no catálogo wger");
    await r.setCustomActive(mine.id, false);
    assert.equal((await r.search({ ...EMPTY_QUERY, scope: "mine" }, 0)).total, 0);
    await assert.rejects(() => r.createCustom({ name: "  ", description_pt: "", instructions: "", category: "", primary_muscle_ids: [], secondary_muscle_ids: [], equipment: [], apparatus: "indefinido" }));
  });

  await t("Mídia da demonstração: vídeo do wger só por URL da fonte, com atribuição e licença", async () => {
    const r = new DemoCatalogRepo();
    const withVideo = (await r.search({ ...EMPTY_QUERY, withMedia: true }, 0)).items.find((e) => e.media_status === "video")!;
    const media = await r.media(withVideo.id);
    assert.ok(media.some((m) => m.media_type === "video"));
    for (const m of media) {
      assert.ok(m.source_url?.startsWith("https://wger.de/"));
      assert.ok(m.attribution.includes("wger.de") && m.license);
      assert.equal(m.storage_path, null, "nada copiado para o armazenamento");
    }
  });

  await t("Pontos da avaliação: sintoma no joelho aparece para exercício de coxa; sem relação, não aparece", () => {
    const a = { blocks: { complaint: { symptoms: [{ regionId: "knee:right" }, { regionId: "neck" }] } } } as unknown as Parameters<typeof relatedSymptoms>[0];
    const r = relatedSymptoms(a, toExerciseCard(base));
    assert.deepEqual(r.map((s) => s.regionId), ["knee:right"]);
  });

  console.log(`\n${passed} passaram.`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
