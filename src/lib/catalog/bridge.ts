// Ponte entre o catálogo ampliado e o restante do app (treinos, prescrição, avaliação).
// Um exercício do catálogo vira um ExerciseCard e é registrado no mapa EXERCISE_BY_ID, que todas
// as telas de treino já consultam. A curadoria do método não muda.
"use client";

import { useEffect, useState } from "react";
import { EXERCISE_BY_ID, type ExerciseCard, type Modality } from "@/lib/domain/exercise-library";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { DemoCatalogRepo, SupabaseCatalogRepo, type CatalogRepo } from "./repository";
import { equipmentPt, musclePt, regionsOf } from "./labels";
import type { CatalogEditorial, CatalogExercise } from "./types";

let instance: CatalogRepo | null = null;
export function getCatalogRepo(): CatalogRepo {
  if (!instance) {
    const db = getSupabaseBrowserClient();
    instance = db ? new SupabaseCatalogRepo(db) : new DemoCatalogRepo();
  }
  return instance;
}

export const isCatalogId = (id: string) => id.startsWith("wger-") || id.startsWith("cx-");

const PRECAUTION =
  "Ficha do catálogo ampliado: confira execução, amplitude e carga antes de prescrever. Ajuste a dose à avaliação e à tolerância do aluno; registre sintomas à parte do esforço.";

export function toExerciseCard(e: CatalogExercise, ed: CatalogEditorial | null = null): ExerciseCard {
  const cardio = e.category === "Cardio";
  const band = e.equipment.includes("Resistance band");
  const modality: Modality = cardio ? "aeróbio" : band ? "elástico" : e.apparatus === "peso_corporal" ? "peso corporal" : "musculação";
  const loadKind: ExerciseCard["loadKind"] = cardio
    ? "time_or_distance"
    : band
      ? "band"
      : e.apparatus === "peso_corporal" || (e.apparatus === "indefinido" && e.equipment.length === 0)
        ? "bodyweight"
        : "external_kg";
  const name = ed?.name_pt || e.name;
  const description = ed?.description_pt || e.description_pt || e.instructions || e.description_en;
  return {
    id: e.id,
    name,
    synonyms: [e.name_en, ...e.aliases].filter((x) => x && x !== name),
    pattern: "não classificado",
    objective: "",
    primaryMuscles: e.primary_muscles.map((m) => musclePt(m.id, m.name)),
    secondaryMuscles: e.secondary_muscles.map((m) => musclePt(m.id, m.name)),
    equipment: e.equipment.map(equipmentPt),
    modality,
    loadKind,
    execution: description.slice(0, 2000),
    commonErrors: "",
    regressions: [],
    progressions: [],
    doseVariables: cardio ? ["séries", "duração", "descanso"] : ["séries", "repetições", "carga", "descanso", "esforço (RPE ou RIR)", "amplitude", "cadência"],
    precautions: ed?.caution_notes || PRECAUTION,
    media: null,
    references: [],
    evidenceNote: "",
    reviewStatus: "pendente de revisão editorial",
    suggestionEligible: false,
    purposes: ed?.purposes ?? [],
    englishNames: e.name_en ? [e.name_en] : [],
    regions: regionsOf(e),
    detail: null,
    source: e.source,
  };
}

/** Registra no mapa global para que treinos e prescrições resolvam o exercício pelo id. */
export function registerCatalogExercise(e: CatalogExercise, ed: CatalogEditorial | null = null): ExerciseCard {
  const card = toExerciseCard(e, ed);
  EXERCISE_BY_ID.set(card.id, card);
  return card;
}

/**
 * Garante que os exercícios do catálogo usados num treino estejam no mapa. Devolve um número que
 * muda quando algo novo foi registrado (para a tela redesenhar). Falha de rede não quebra a tela:
 * o treino usa o nome gravado na prescrição.
 */
export function useCatalogHydration(ids: string[]): number {
  const [rev, setRev] = useState(0);
  const key = ids.filter((id) => isCatalogId(id) && !EXERCISE_BY_ID.has(id)).sort().join(",");
  useEffect(() => {
    if (!key) return;
    let alive = true;
    getCatalogRepo()
      .getMany(key.split(","))
      .then((rows) => {
        if (!alive || !rows.length) return;
        rows.forEach((r) => registerCatalogExercise(r));
        setRev((x) => x + 1);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [key]);
  return rev;
}

/** Nome para exibir um item prescrito, mesmo se o exercício não puder ser carregado. */
export function itemName(item: { exerciseId: string; exerciseName?: string }): string {
  return EXERCISE_BY_ID.get(item.exerciseId)?.name ?? item.exerciseName ?? "Exercício não encontrado";
}
