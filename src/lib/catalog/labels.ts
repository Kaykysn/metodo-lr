// Rótulos em português para os valores do wger (que chegam em inglês) e mapeamento editorial
// músculo → região do mapa corporal do app. O mapeamento é do app, não da fonte.
import type { Apparatus, CatalogExercise } from "./types";

export const CATEGORY_PT: Record<string, string> = {
  Abs: "Abdômen",
  Arms: "Braços",
  Back: "Costas",
  Calves: "Panturrilhas",
  Cardio: "Cardio",
  Chest: "Peitoral",
  Legs: "Pernas",
  Shoulders: "Ombros",
};

export const EQUIPMENT_PT: Record<string, string> = {
  Barbell: "Barra",
  Bench: "Banco",
  "Cable machine": "Polia (cabo)",
  Dumbbell: "Halter",
  "Gym mat": "Colchonete",
  "Incline bench": "Banco inclinado",
  Kettlebell: "Kettlebell",
  "Pull-up bar": "Barra fixa",
  "Resistance band": "Elástico",
  "SZ-Bar": "Barra W (SZ)",
  "Swiss Ball": "Bola suíça",
  "none (bodyweight exercise)": "Peso corporal",
};

export const APPARATUS_LABEL: Record<Apparatus, string> = {
  livre: "Peso livre",
  maquina: "Máquina ou polia",
  peso_corporal: "Peso corporal",
  indefinido: "Não informado",
};

/** Os 15 músculos do wger, com nome em português e regiões do mapa corporal do app. */
export const WGER_MUSCLES: { id: number; pt: string; regions: string[] }[] = [
  { id: 2, pt: "Deltoide anterior", regions: ["shoulder"] },
  { id: 1, pt: "Bíceps braquial", regions: ["arm", "elbow"] },
  { id: 11, pt: "Isquiotibiais (bíceps femoral)", regions: ["posterior_thigh"] },
  { id: 13, pt: "Braquial", regions: ["arm", "elbow"] },
  { id: 7, pt: "Gastrocnêmio", regions: ["calf"] },
  { id: 8, pt: "Glúteo máximo", regions: ["glute", "hip_groin"] },
  { id: 12, pt: "Latíssimo do dorso", regions: ["thoracic", "shoulder"] },
  { id: 14, pt: "Oblíquo externo", regions: ["abdomen"] },
  { id: 4, pt: "Peitoral maior", regions: ["chest", "shoulder"] },
  { id: 10, pt: "Quadríceps", regions: ["anterior_thigh"] },
  { id: 6, pt: "Reto do abdome", regions: ["abdomen"] },
  { id: 3, pt: "Serrátil anterior", regions: ["shoulder", "thoracic"] },
  { id: 15, pt: "Sóleo", regions: ["calf"] },
  { id: 9, pt: "Trapézio", regions: ["neck", "thoracic"] },
  { id: 5, pt: "Tríceps braquial", regions: ["arm", "elbow"] },
];
export const MUSCLE_BY_WGER_ID = new Map(WGER_MUSCLES.map((m) => [m.id, m]));
export const MUSCLE_OPTIONS_PT = [...WGER_MUSCLES].sort((a, b) => a.pt.localeCompare(b.pt, "pt-BR"));

export const categoryPt = (c: string) => CATEGORY_PT[c] ?? (c || "Sem grupo");
export const equipmentPt = (e: string) => EQUIPMENT_PT[e] ?? e;
export const musclePt = (id: number, fallback = "") => MUSCLE_BY_WGER_ID.get(id)?.pt ?? fallback;

/** Regiões do mapa corporal ligadas aos músculos cadastrados (principais e secundários). */
export function regionsOf(ex: Pick<CatalogExercise, "muscle_ids">): string[] {
  return Array.from(new Set(ex.muscle_ids.flatMap((id) => MUSCLE_BY_WGER_ID.get(id)?.regions ?? [])));
}

export const SOURCE_LABEL = { wger: "wger", custom: "Cadastro próprio" } as const;
