// ==============================================================================
// Semente repetível do catálogo (exercícios, fontes e afirmações) para o Supabase.
// - Rodar várias vezes dá o mesmo resultado (upsert por ID).
// - Exercícios personalizados (is_custom = true) nunca são sobrescritos nem apagados.
// - Nada é removido: IDs fora do catálogo continuam no banco (treinos antigos).
// ==============================================================================
import { EXERCISES, LEGACY_EXERCISE_IDS, type ExerciseCard } from "./exercise-library";
import { CATALOG_VERSION } from "./exercise-catalog";
import { EVIDENCE } from "./evidence";
import { CLAIMS } from "./evidence-claims";

const q = (v: string | null | undefined) => (v === null || v === undefined ? "NULL" : `'${v.replace(/'/g, "''")}'`);
const arr = (xs: string[]) => `ARRAY[${xs.map(q).join(", ")}]::TEXT[]`;
const json = (v: unknown) => `${q(JSON.stringify(v))}::JSONB`;

export interface SeedRow {
  id: string;
  is_custom: boolean;
  name: string;
}

function exerciseValues(e: ExerciseCard): string {
  const { detail, ...card } = e;
  return `(${[
    q(e.id),
    q(e.name),
    json(card),
    e.suggestionEligible ? "true" : "false",
    q(e.reviewStatus),
    arr(e.synonyms),
    arr(e.englishNames),
    arr(e.purposes),
    q(e.laterality ?? null),
    q(e.difficulty ?? null),
    detail ? json(detail) : "NULL",
    q(CATALOG_VERSION),
    "false",
    "NULL",
    "now()",
  ].join(", ")})`;
}

export function buildExerciseSeedSql(): string {
  const lines: string[] = [];
  lines.push("-- Gerado por scripts/build-exercise-seed.ts. Não editar à mão.");
  lines.push(`-- ${CATALOG_VERSION}. ${EXERCISES.length} exercícios (${LEGACY_EXERCISE_IDS.length} IDs anteriores preservados), ${EVIDENCE.length} fontes, ${CLAIMS.length} afirmações.`);
  lines.push("BEGIN;");
  lines.push("");
  lines.push("INSERT INTO public.evidence_sources (id, title, authors, year, study_type, population, intervention, comparator, outcome, limitations, doi, url, verified_on, verification_note) VALUES");
  lines.push(
    EVIDENCE.map((s) => `(${[q(s.id), q(s.title), q(s.authors), s.year ? String(s.year) : "NULL", q(s.type), q(s.population), q(s.intervention), q(s.comparator), q(s.outcome), q(s.limitations), q(s.doi ?? null), q(s.url), q(s.verifiedOn), q(s.verificationNote)].join(", ")})`).join(",\n")
  );
  lines.push("ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, authors = EXCLUDED.authors, year = EXCLUDED.year, study_type = EXCLUDED.study_type, population = EXCLUDED.population, intervention = EXCLUDED.intervention, comparator = EXCLUDED.comparator, outcome = EXCLUDED.outcome, limitations = EXCLUDED.limitations, doi = EXCLUDED.doi, url = EXCLUDED.url, verified_on = EXCLUDED.verified_on, verification_note = EXCLUDED.verification_note;");
  lines.push("");
  lines.push("INSERT INTO public.evidence_claims (id, source_id, label, claim, population, limitations, review_status, review_basis, reviewed_on) VALUES");
  lines.push(CLAIMS.map((c) => `(${[q(c.id), q(c.sourceId), q(c.label), q(c.claim), q(c.population), q(c.limitations), q(c.reviewStatus), q(c.reviewBasis), q(c.reviewedOn)].join(", ")})`).join(",\n"));
  lines.push("ON CONFLICT (id) DO UPDATE SET source_id = EXCLUDED.source_id, label = EXCLUDED.label, claim = EXCLUDED.claim, population = EXCLUDED.population, limitations = EXCLUDED.limitations, review_status = EXCLUDED.review_status, review_basis = EXCLUDED.review_basis, reviewed_on = EXCLUDED.reviewed_on;");
  lines.push("");
  lines.push("INSERT INTO public.exercises (id, name, card, suggestion_eligible, review_status, aliases, english_names, purposes, laterality, difficulty, detail, catalog_version, is_custom, owner_id, updated_at) VALUES");
  lines.push(EXERCISES.map(exerciseValues).join(",\n"));
  lines.push(
    "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, card = EXCLUDED.card, suggestion_eligible = EXCLUDED.suggestion_eligible, review_status = EXCLUDED.review_status, aliases = EXCLUDED.aliases, english_names = EXCLUDED.english_names, purposes = EXCLUDED.purposes, laterality = EXCLUDED.laterality, difficulty = EXCLUDED.difficulty, detail = EXCLUDED.detail, catalog_version = EXCLUDED.catalog_version, updated_at = now()"
  );
  lines.push("WHERE public.exercises.is_custom = false;");
  lines.push("");
  lines.push("COMMIT;");
  return lines.join("\n") + "\n";
}

/** Mesma regra da semente, aplicada em memória (para testes): upsert por ID, nunca toca personalizados. */
export function applySeed<T extends SeedRow>(existing: T[], seed: T[]): T[] {
  const byId = new Map(existing.map((r) => [r.id, r]));
  for (const s of seed) {
    const cur = byId.get(s.id);
    if (!cur) byId.set(s.id, s);
    else if (!cur.is_custom) byId.set(s.id, { ...cur, ...s, is_custom: false });
  }
  return Array.from(byId.values());
}
