// Acesso ao catálogo ampliado. Modo real: Supabase (RLS decide o que cada professor vê e altera).
// Demonstração: amostra real do wger embutida + cadastros só neste navegador.
import type { SupabaseClient } from "@supabase/supabase-js";
import { callFunction, FunctionError } from "@/lib/supabase/functions";
import demo from "./demo-catalog.json";
import {
  VIDEO_MAX_BYTES,
  VIDEO_TYPES,
  type CatalogEditorial,
  type CatalogExercise,
  type CatalogMedia,
  type CatalogQuery,
  type CustomExerciseInput,
  type SyncRun,
} from "./types";
import { MUSCLE_BY_WGER_ID } from "./labels";

export const PAGE_SIZE = 30;

export interface CatalogPage {
  items: CatalogExercise[];
  total: number;
}

export interface CatalogRepo {
  readonly mode: "demo" | "supabase";
  search(q: CatalogQuery, page: number): Promise<CatalogPage>;
  get(id: string): Promise<CatalogExercise | null>;
  getMany(ids: string[]): Promise<CatalogExercise[]>;
  media(exerciseId: string): Promise<CatalogMedia[]>;
  mediaUrl(m: CatalogMedia): Promise<string | null>;
  thumbUrl(m: CatalogMedia): Promise<string | null>;
  editorial(exerciseId: string): Promise<CatalogEditorial | null>;
  favorites(): Promise<Set<string>>;
  setFavorite(exerciseId: string, on: boolean): Promise<void>;
  mainChoice(exerciseId: string): Promise<string | null>;
  setMainChoice(exerciseId: string, mediaId: string | null): Promise<void>;
  createCustom(input: CustomExerciseInput): Promise<CatalogExercise>;
  updateCustom(id: string, input: CustomExerciseInput): Promise<CatalogExercise>;
  setCustomActive(id: string, active: boolean): Promise<void>;
  requestShare(kind: "exercise" | "media", id: string, on: boolean): Promise<void>;
  uploadVideo(exerciseId: string, file: File, thumb: Blob | null, title: string): Promise<CatalogMedia>;
  deleteMedia(m: CatalogMedia): Promise<void>;
  // Administração
  saveEditorial(e: CatalogEditorial): Promise<void>;
  shareRequests(): Promise<{ exercises: CatalogExercise[]; media: CatalogMedia[] }>;
  setShared(kind: "exercise" | "media", id: string, shared: boolean): Promise<void>;
  syncNow(): Promise<SyncRun>;
  syncRuns(): Promise<SyncRun[]>;
  currentUserId(): Promise<string | null>;
}

export class CatalogError extends Error {}

/** Validação no navegador (o bucket repete tipo e tamanho no servidor). */
export function checkVideoFile(file: File): string | null {
  const type = file.type || (/\.mov$/i.test(file.name) ? "video/quicktime" : "");
  if (!(VIDEO_TYPES as readonly string[]).includes(type)) return "Formato não aceito. Envie MP4, MOV ou WebM.";
  if (file.size > VIDEO_MAX_BYTES) return `O vídeo tem ${(file.size / 1048576).toFixed(0)} MB. O limite é 50 MB: encurte ou comprima antes de enviar.`;
  if (file.size === 0) return "Arquivo vazio.";
  return null;
}

/** Texto de busca seguro para o filtro do PostgREST (sem vírgulas, parênteses ou curingas). */
export function searchTerm(raw: string): string {
  return raw.replace(/[,()*%\\:;"'`]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

const LIST_COLS =
  "id, source, name, name_en, name_pt, description_en, description_pt, aliases, category, primary_muscles, secondary_muscles, muscle_ids, equipment, apparatus, instructions, license, license_url, authors, media_status, owner_id, visibility, share_requested, is_active, last_synced_at";
const MEDIA_COLS =
  "id, exercise_id, source, media_type, source_url, thumbnail_url, storage_path, thumbnail_path, mime, size_bytes, duration_seconds, codec, is_main_at_source, is_ai_generated, title, author, attribution, license, license_url, owner_id, visibility, share_requested, is_active, created_at";

function musclesFromIds(ids: number[]) {
  return ids.map((id) => ({ id, name: MUSCLE_BY_WGER_ID.get(id)?.pt ?? String(id), name_en: "", is_front: true }));
}
function customRow(input: CustomExerciseInput) {
  const name = input.name.trim().slice(0, 160);
  if (!name) throw new CatalogError("Informe o nome do exercício.");
  return {
    name,
    name_pt: name,
    description_pt: input.description_pt.trim().slice(0, 12000),
    instructions: input.instructions.trim().slice(0, 12000),
    category: input.category,
    primary_muscles: musclesFromIds(input.primary_muscle_ids),
    secondary_muscles: musclesFromIds(input.secondary_muscle_ids.filter((x) => !input.primary_muscle_ids.includes(x))),
    muscle_ids: Array.from(new Set([...input.primary_muscle_ids, ...input.secondary_muscle_ids])),
    equipment: input.equipment.slice(0, 20),
    apparatus: input.apparatus,
  };
}
const ext = (f: File) => (f.type === "video/webm" ? "webm" : f.type === "video/quicktime" || /\.mov$/i.test(f.name) ? "mov" : "mp4");

// ------------------------------------------------------------------------------
// Supabase
// ------------------------------------------------------------------------------
export class SupabaseCatalogRepo implements CatalogRepo {
  readonly mode = "supabase" as const;
  private uid: string | null | undefined;
  private cache = new Map<string, CatalogExercise>();
  constructor(private db: SupabaseClient) {}

  async currentUserId() {
    if (this.uid === undefined) this.uid = (await this.db.auth.getUser()).data.user?.id ?? null;
    return this.uid;
  }
  private must<T>(r: { data: T | null; error: { message: string } | null }): T {
    if (r.error) throw new CatalogError(r.error.message.includes("permission") || r.error.message.includes("policy") ? "Você não tem permissão para esta ação." : "Não foi possível consultar o catálogo. Tente de novo.");
    return r.data as T;
  }

  async search(q: CatalogQuery, page: number): Promise<CatalogPage> {
    const uid = await this.currentUserId();
    let ids: string[] | null = null;
    if (q.favorites) ids = Array.from(await this.favorites());
    if (q.purpose) {
      const ed = this.must(await this.db.from("exercise_editorial").select("exercise_id").contains("purposes", [q.purpose]).limit(2000)) as { exercise_id: string }[];
      const pids = ed.map((r) => r.exercise_id);
      ids = ids ? ids.filter((i) => pids.includes(i)) : pids;
    }
    if (ids && ids.length === 0) return { items: [], total: 0 };
    let b = this.db.from("exercise_catalog").select(LIST_COLS, { count: "exact" }).eq("is_active", true);
    if (q.scope === "wger") b = b.eq("source", "wger");
    else if (q.scope === "mine") b = b.eq("source", "custom").eq("owner_id", uid ?? "00000000-0000-0000-0000-000000000000");
    else b = b.eq("source", "custom").eq("visibility", "shared");
    const t = searchTerm(q.text);
    if (t) b = b.or(`name.ilike.%${t}%,name_en.ilike.%${t}%,name_pt.ilike.%${t}%`);
    if (q.category) b = b.eq("category", q.category);
    if (q.muscle) b = b.contains("muscle_ids", [Number(q.muscle)]);
    if (q.equipment) b = b.contains("equipment", [q.equipment]);
    if (q.apparatus) b = b.eq("apparatus", q.apparatus);
    if (q.withMedia) b = b.neq("media_status", "none");
    if (ids) b = b.in("id", ids.slice(0, 500));
    const r = await b.order("name").range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    const items = this.must(r) as CatalogExercise[];
    items.forEach((e) => this.cache.set(e.id, e));
    return { items, total: r.count ?? items.length };
  }
  async get(id: string) {
    if (this.cache.has(id)) return this.cache.get(id)!;
    const r = this.must(await this.db.from("exercise_catalog").select(LIST_COLS).eq("id", id).maybeSingle()) as CatalogExercise | null;
    if (r) this.cache.set(id, r);
    return r;
  }
  async getMany(ids: string[]) {
    const missing = ids.filter((i) => !this.cache.has(i)).slice(0, 200);
    if (missing.length) {
      const rows = this.must(await this.db.from("exercise_catalog").select(LIST_COLS).in("id", missing)) as CatalogExercise[];
      rows.forEach((e) => this.cache.set(e.id, e));
    }
    return ids.map((i) => this.cache.get(i)).filter((e): e is CatalogExercise => !!e);
  }
  async media(exerciseId: string) {
    return this.must(await this.db.from("exercise_media").select(MEDIA_COLS).eq("exercise_id", exerciseId).eq("is_active", true).order("created_at")) as CatalogMedia[];
  }
  async mediaUrl(m: CatalogMedia) {
    if (m.source === "wger") return m.source_url;
    if (!m.storage_path) return null;
    const r = await this.db.storage.from("exercise-media").createSignedUrl(m.storage_path, 3600);
    return r.data?.signedUrl ?? null;
  }
  async thumbUrl(m: CatalogMedia) {
    if (m.source === "wger") return m.thumbnail_url ?? (m.media_type === "image" ? m.source_url : null);
    if (!m.thumbnail_path) return null;
    const r = await this.db.storage.from("exercise-media").createSignedUrl(m.thumbnail_path, 3600);
    return r.data?.signedUrl ?? null;
  }
  async editorial(exerciseId: string) {
    return this.must(await this.db.from("exercise_editorial").select("*").eq("exercise_id", exerciseId).maybeSingle()) as CatalogEditorial | null;
  }
  async favorites() {
    const rows = this.must(await this.db.from("exercise_favorites").select("exercise_id")) as { exercise_id: string }[];
    return new Set(rows.map((r) => r.exercise_id));
  }
  async setFavorite(exerciseId: string, on: boolean) {
    const uid = await this.currentUserId();
    if (!uid) throw new CatalogError("Sessão expirada.");
    if (on) this.must(await this.db.from("exercise_favorites").upsert({ owner_id: uid, exercise_id: exerciseId }));
    else this.must(await this.db.from("exercise_favorites").delete().eq("exercise_id", exerciseId));
  }
  async mainChoice(exerciseId: string) {
    const r = this.must(await this.db.from("exercise_media_choice").select("media_id").eq("exercise_id", exerciseId).maybeSingle()) as { media_id: string } | null;
    return r?.media_id ?? null;
  }
  async setMainChoice(exerciseId: string, mediaId: string | null) {
    const uid = await this.currentUserId();
    if (!uid) throw new CatalogError("Sessão expirada.");
    if (mediaId) this.must(await this.db.from("exercise_media_choice").upsert({ owner_id: uid, exercise_id: exerciseId, media_id: mediaId, updated_at: new Date().toISOString() }));
    else this.must(await this.db.from("exercise_media_choice").delete().eq("exercise_id", exerciseId));
  }
  async createCustom(input: CustomExerciseInput) {
    const uid = await this.currentUserId();
    if (!uid) throw new CatalogError("Sessão expirada.");
    const r = this.must(await this.db.from("exercise_catalog").insert({ ...customRow(input), source: "custom", owner_id: uid }).select(LIST_COLS).single()) as CatalogExercise;
    this.cache.set(r.id, r);
    return r;
  }
  async updateCustom(id: string, input: CustomExerciseInput) {
    const r = this.must(await this.db.from("exercise_catalog").update(customRow(input)).eq("id", id).select(LIST_COLS).single()) as CatalogExercise;
    this.cache.set(r.id, r);
    return r;
  }
  async setCustomActive(id: string, active: boolean) {
    this.must(await this.db.from("exercise_catalog").update({ is_active: active }).eq("id", id).select("id").single());
    this.cache.delete(id);
  }
  async requestShare(kind: "exercise" | "media", id: string, on: boolean) {
    const table = kind === "exercise" ? "exercise_catalog" : "exercise_media";
    if (kind === "media" && on) await this.verifyVideo(id); // vídeo que ficou sem conferência (queda de rede no envio)
    this.must(await this.db.from(table).update({ share_requested: on }).eq("id", id).select("id").single());
    this.cache.delete(id);
  }
  async uploadVideo(exerciseId: string, file: File, thumb: Blob | null, title: string) {
    const problem = checkVideoFile(file);
    if (problem) throw new CatalogError(problem);
    const uid = await this.currentUserId();
    if (!uid) throw new CatalogError("Sessão expirada.");
    const key = crypto.randomUUID();
    const path = `${uid}/${exerciseId}/${key}.${ext(file)}`;
    const thumbPath = thumb ? `${uid}/${exerciseId}/${key}.jpg` : null;
    const type = file.type || "video/quicktime";
    const up = await this.db.storage.from("exercise-media").upload(path, file, { contentType: type, upsert: false, cacheControl: "3600" });
    if (up.error) throw new CatalogError(/size|large/i.test(up.error.message) ? "O vídeo passou do limite de 50 MB." : "Não foi possível enviar o vídeo. Verifique a conexão e tente de novo.");
    if (thumb && thumbPath) await this.db.storage.from("exercise-media").upload(thumbPath, thumb, { contentType: "image/jpeg", upsert: false });
    const ins = await this.db
      .from("exercise_media")
      .insert({ exercise_id: exerciseId, source: "upload", media_type: "video", storage_path: path, thumbnail_path: thumbPath, mime: type, size_bytes: file.size, title: title.trim().slice(0, 160), owner_id: uid })
      .select(MEDIA_COLS)
      .single();
    if (ins.error) {
      await this.db.storage.from("exercise-media").remove([path, ...(thumbPath ? [thumbPath] : [])]);
      throw new CatalogError("O vídeo foi enviado, mas não pôde ser registrado. Nada ficou salvo; tente de novo.");
    }
    await this.verifyVideo((ins.data as CatalogMedia).id);
    return ins.data as CatalogMedia;
  }
  /** O servidor confere os primeiros bytes do arquivo; se não for vídeo, ele apaga tudo e responde 415. */
  private async verifyVideo(id: string) {
    try {
      await callFunction("exercise-media", "/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    } catch (e) {
      if (e instanceof FunctionError && (e.status === 415 || e.status === 404)) throw new CatalogError(e.message);
      // Falha de rede ou do servidor: o vídeo fica salvo só para você (sem conferência ninguém mais o vê)
      // e a conferência é refeita quando você pedir o compartilhamento.
    }
  }
  async deleteMedia(m: CatalogMedia) {
    if (m.source !== "upload") throw new CatalogError("Mídias da fonte não podem ser excluídas.");
    this.must(await this.db.from("exercise_media").delete().eq("id", m.id));
    await this.db.storage.from("exercise-media").remove([m.storage_path!, ...(m.thumbnail_path ? [m.thumbnail_path] : [])]);
  }
  async saveEditorial(e: CatalogEditorial) {
    const uid = await this.currentUserId();
    this.must(await this.db.from("exercise_editorial").upsert({ ...e, reviewed_by: uid, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
  }
  async shareRequests() {
    const exercises = this.must(await this.db.from("exercise_catalog").select(LIST_COLS).eq("share_requested", true).eq("visibility", "private")) as CatalogExercise[];
    const media = this.must(await this.db.from("exercise_media").select(MEDIA_COLS).eq("share_requested", true).eq("visibility", "private")) as CatalogMedia[];
    return { exercises, media };
  }
  async setShared(kind: "exercise" | "media", id: string, shared: boolean) {
    const table = kind === "exercise" ? "exercise_catalog" : "exercise_media";
    this.must(await this.db.from(table).update({ visibility: shared ? "shared" : "private", share_requested: false }).eq("id", id).select("id").single());
    this.cache.delete(id);
  }
  async syncNow() {
    return callFunction<SyncRun>("exercise-sync", "", { method: "POST" });
  }
  async syncRuns() {
    return this.must(await this.db.from("catalog_sync_runs").select("*").order("started_at", { ascending: false }).limit(10)) as SyncRun[];
  }
}

// ------------------------------------------------------------------------------
// Demonstração
// ------------------------------------------------------------------------------
type DemoItem = Omit<CatalogExercise, "instructions" | "owner_id" | "visibility" | "share_requested" | "is_active" | "last_synced_at"> & {
  media: { external_uuid: string; media_type: "video" | "image"; source_url: string; thumbnail_url: string; mime: string; size_bytes: number | null; duration_seconds: number | null; codec: string; is_main: boolean; is_ai_generated: boolean; author: string; attribution: string; license: string; license_url: string }[];
};
const DEMO_KEY = "lr_demo_catalog";
const DEMO_USER = "demo-user";

export class DemoCatalogRepo implements CatalogRepo {
  readonly mode = "demo" as const;
  private items: CatalogExercise[];
  private mediaRows: CatalogMedia[];
  private state = { custom: [] as CatalogExercise[], favorites: [] as string[], choice: {} as Record<string, string> };
  private uploads: CatalogMedia[] = [];
  private blobs = new Map<string, string>();

  constructor() {
    const rows = (demo as unknown as { items: DemoItem[] }).items;
    this.items = rows.map(({ media: _m, ...e }) => ({ ...e, instructions: "", owner_id: null, visibility: "shared", share_requested: false, is_active: true, last_synced_at: "2026-11-14T00:00:00Z" }));
    this.mediaRows = rows.flatMap((e) =>
      e.media.map((m) => ({
        id: m.external_uuid, exercise_id: e.id, source: "wger" as const, media_type: m.media_type, source_url: m.source_url, thumbnail_url: m.thumbnail_url || null,
        storage_path: null, thumbnail_path: null, mime: m.mime, size_bytes: m.size_bytes, duration_seconds: m.duration_seconds, codec: m.codec,
        is_main_at_source: m.is_main, is_ai_generated: m.is_ai_generated, title: "", author: m.author, attribution: m.attribution, license: m.license,
        license_url: m.license_url, owner_id: null, visibility: "shared" as const, share_requested: false, is_active: true, created_at: "2026-11-14T00:00:00Z",
      }))
    );
    try {
      const saved = JSON.parse(window.localStorage.getItem(DEMO_KEY) ?? "null");
      if (saved && Array.isArray(saved.custom)) this.state = { custom: saved.custom, favorites: saved.favorites ?? [], choice: saved.choice ?? {} };
    } catch {
      /* sem armazenamento: só nesta aba */
    }
  }
  private persist() {
    try {
      window.localStorage.setItem(DEMO_KEY, JSON.stringify(this.state));
    } catch {
      /* ignora */
    }
  }
  private all() {
    return [...this.items, ...this.state.custom];
  }
  async currentUserId() {
    return DEMO_USER;
  }
  async search(q: CatalogQuery, page: number) {
    const t = searchTerm(q.text).toLowerCase();
    const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const res = this.all().filter((e) => {
      if (!e.is_active) return false;
      if (q.scope === "wger" && e.source !== "wger") return false;
      if (q.scope === "mine" && !(e.source === "custom" && e.owner_id === DEMO_USER)) return false;
      if (q.scope === "shared" && !(e.source === "custom" && e.visibility === "shared")) return false;
      if (t && ![e.name, e.name_en, e.name_pt, ...e.aliases].some((x) => fold(x).includes(fold(t)))) return false;
      if (q.category && e.category !== q.category) return false;
      if (q.muscle && !e.muscle_ids.includes(Number(q.muscle))) return false;
      if (q.equipment && !e.equipment.includes(q.equipment)) return false;
      if (q.apparatus && e.apparatus !== q.apparatus) return false;
      if (q.withMedia && e.media_status === "none") return false;
      if (q.favorites && !this.state.favorites.includes(e.id)) return false;
      if (q.purpose) return false; // classificação editorial: definida pelo admin no modo real
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    return { items: res.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE), total: res.length };
  }
  async get(id: string) {
    return this.all().find((e) => e.id === id) ?? null;
  }
  async getMany(ids: string[]) {
    return this.all().filter((e) => ids.includes(e.id));
  }
  async media(exerciseId: string) {
    return [...this.mediaRows, ...this.uploads].filter((m) => m.exercise_id === exerciseId);
  }
  async mediaUrl(m: CatalogMedia) {
    return m.source === "wger" ? m.source_url : this.blobs.get(m.id) ?? null;
  }
  async thumbUrl(m: CatalogMedia) {
    return m.source === "wger" ? m.thumbnail_url ?? (m.media_type === "image" ? m.source_url : null) : this.blobs.get(`${m.id}:thumb`) ?? null;
  }
  async editorial() {
    return null;
  }
  async favorites() {
    return new Set(this.state.favorites);
  }
  async setFavorite(id: string, on: boolean) {
    this.state.favorites = on ? Array.from(new Set([...this.state.favorites, id])) : this.state.favorites.filter((x) => x !== id);
    this.persist();
  }
  async mainChoice(id: string) {
    return this.state.choice[id] ?? null;
  }
  async setMainChoice(id: string, mediaId: string | null) {
    if (mediaId) this.state.choice[id] = mediaId;
    else delete this.state.choice[id];
    this.persist();
  }
  async createCustom(input: CustomExerciseInput) {
    const e: CatalogExercise = {
      id: `cx-${crypto.randomUUID()}`, source: "custom", name_en: "", description_en: "", aliases: [], license: "", license_url: "", authors: [],
      media_status: "none", owner_id: DEMO_USER, visibility: "private", share_requested: false, is_active: true, last_synced_at: null, ...customRow(input),
    };
    this.state.custom.push(e);
    this.persist();
    return e;
  }
  async updateCustom(id: string, input: CustomExerciseInput) {
    const i = this.state.custom.findIndex((e) => e.id === id);
    if (i < 0) throw new CatalogError("Exercício não encontrado.");
    this.state.custom[i] = { ...this.state.custom[i], ...customRow(input) };
    this.persist();
    return this.state.custom[i];
  }
  async setCustomActive(id: string, active: boolean) {
    this.state.custom = this.state.custom.map((e) => (e.id === id ? { ...e, is_active: active } : e));
    this.persist();
  }
  async requestShare(kind: "exercise" | "media", id: string, on: boolean) {
    if (kind === "exercise") this.state.custom = this.state.custom.map((e) => (e.id === id ? { ...e, share_requested: on } : e));
    else this.uploads = this.uploads.map((m) => (m.id === id ? { ...m, share_requested: on } : m));
    this.persist();
  }
  async uploadVideo(exerciseId: string, file: File, thumb: Blob | null, title: string) {
    const problem = checkVideoFile(file);
    if (problem) throw new CatalogError(problem);
    const id = crypto.randomUUID();
    this.blobs.set(id, URL.createObjectURL(file));
    if (thumb) this.blobs.set(`${id}:thumb`, URL.createObjectURL(thumb));
    const m: CatalogMedia = {
      id, exercise_id: exerciseId, source: "upload", media_type: "video", source_url: null, thumbnail_url: null, storage_path: `demo/${id}`, thumbnail_path: thumb ? `demo/${id}.jpg` : null,
      mime: file.type, size_bytes: file.size, duration_seconds: null, codec: "", is_main_at_source: false, is_ai_generated: false, title, author: "", attribution: "",
      license: "", license_url: "", owner_id: DEMO_USER, visibility: "private", share_requested: false, is_active: true, created_at: new Date().toISOString(),
    };
    this.uploads.push(m);
    return m;
  }
  async deleteMedia(m: CatalogMedia) {
    this.uploads = this.uploads.filter((x) => x.id !== m.id);
    for (const k of [m.id, `${m.id}:thumb`]) {
      const u = this.blobs.get(k);
      if (u) URL.revokeObjectURL(u);
      this.blobs.delete(k);
    }
  }
  private realOnly(): never {
    throw new CatalogError("Disponível só com o backend real (administração do catálogo).");
  }
  async saveEditorial() {
    this.realOnly();
  }
  async shareRequests() {
    return { exercises: [], media: [] };
  }
  async setShared() {
    this.realOnly();
  }
  async syncNow(): Promise<SyncRun> {
    this.realOnly();
  }
  async syncRuns() {
    return [];
  }
}
