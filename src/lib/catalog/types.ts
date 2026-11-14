// Catálogo ampliado: exercícios importados do wger e cadastrados pelos professores.
// A curadoria do método (src/lib/domain/exercise-library.ts) continua separada e intacta.

export type CatalogSource = "wger" | "custom";
export type Apparatus = "livre" | "maquina" | "peso_corporal" | "indefinido";
export type MediaStatus = "video" | "image" | "none";
export type Visibility = "private" | "shared";

export interface CatalogMuscle {
  id: number;
  name: string;
  name_en: string;
  is_front: boolean;
}

export interface CatalogExercise {
  id: string;
  source: CatalogSource;
  name: string;
  name_en: string;
  name_pt: string;
  description_en: string;
  description_pt: string;
  aliases: string[];
  category: string;
  primary_muscles: CatalogMuscle[];
  secondary_muscles: CatalogMuscle[];
  muscle_ids: number[];
  equipment: string[];
  apparatus: Apparatus;
  instructions: string;
  license: string;
  license_url: string;
  authors: string[];
  media_status: MediaStatus;
  owner_id: string | null;
  visibility: Visibility;
  share_requested: boolean;
  is_active: boolean;
  last_synced_at: string | null;
}

export interface CatalogMedia {
  id: string;
  exercise_id: string;
  source: "wger" | "upload";
  media_type: "video" | "image" | "animation";
  source_url: string | null;
  thumbnail_url: string | null;
  storage_path: string | null;
  thumbnail_path: string | null;
  mime: string;
  size_bytes: number | null;
  duration_seconds: number | null;
  codec: string;
  is_main_at_source: boolean;
  is_ai_generated: boolean;
  title: string;
  author: string;
  attribution: string;
  license: string;
  license_url: string;
  owner_id: string | null;
  visibility: Visibility;
  share_requested: boolean;
  is_active: boolean;
  created_at: string;
}

/** Camada editorial do app: revisável, separada dos dados da fonte. */
export interface CatalogEditorial {
  exercise_id: string;
  name_pt: string;
  description_pt: string;
  purposes: ("hipertrofia" | "reabilitacao")[];
  agonists: string[];
  synergists: string[];
  stabilizers: string[];
  technical_notes: string;
  caution_notes: string;
  reviewed_at: string | null;
}

export interface CatalogQuery {
  text: string;
  category: string;
  muscle: string; // id do músculo do wger, como texto
  equipment: string;
  apparatus: Apparatus | "";
  purpose: "" | "hipertrofia" | "reabilitacao";
  favorites: boolean;
  scope: "wger" | "mine" | "shared";
  withMedia: boolean;
}

export const EMPTY_QUERY: CatalogQuery = { text: "", category: "", muscle: "", equipment: "", apparatus: "", purpose: "", favorites: false, scope: "wger", withMedia: false };

export interface CustomExerciseInput {
  name: string;
  description_pt: string;
  instructions: string;
  category: string;
  primary_muscle_ids: number[];
  secondary_muscle_ids: number[];
  equipment: string[];
  apparatus: Apparatus;
}

export interface SyncRun {
  id: string;
  trigger: "manual" | "cron";
  status: "running" | "success" | "partial" | "failed";
  started_at: string;
  finished_at: string | null;
  source_count: number | null;
  received: number;
  created: number;
  updated: number;
  unchanged: number;
  deactivated: number;
  with_video: number | null;
  with_image: number | null;
  errors: { stage: string; message: string; page?: number }[];
}

export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"] as const;
