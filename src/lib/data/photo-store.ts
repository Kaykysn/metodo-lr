// ==============================================================================
// Armazenamento de fotos posturais.
// - Demonstração: IndexedDB deste navegador (nada sai do aparelho).
// - Real (Supabase): Edge Function "posture" (backend/), que confere sessão, dono do
//   aluno (RLS), conteúdo do arquivo e devolvem links assinados que expiram.
// O mesmo modelo de conjunto (PhotoSet) serve a avaliação e a reavaliação/evolução.
// ==============================================================================
import type { Actor } from "@/lib/domain/types";
import type { AnnotationData, AnnotationVersion, PhotoAsset, PhotoSet, PhotoView, ProfileSide } from "@/lib/domain/posture";
import { LANDMARK_PROTOCOL } from "@/lib/domain/posture";
import { newId } from "@/lib/domain/plans";
import type { ProcessedPhoto } from "@/lib/media/image-intake";
import { callFunction, FunctionError } from "@/lib/supabase/functions";

export class PhotoConflictError extends Error {
  constructor(public latest: AnnotationVersion) {
    super(`Outra pessoa (${latest.authorName}) salvou a versão ${latest.version} desta marcação depois que você abriu a foto.`);
  }
}

export interface PendingUpload {
  key: string;
  setId: string;
  view: PhotoView;
  fileName: string;
  startedAt: string;
}

export interface ComparisonNote {
  id: string;
  traineeId: string;
  baselineSetId: string;
  currentSetId: string;
  view: PhotoView;
  text: string;
  authorName: string;
  updatedAt: string;
}

export interface PhotoStore {
  readonly mode: "demo" | "supabase";
  listSets(actor: Actor, traineeId: string): Promise<PhotoSet[]>;
  getSetForAssessment(actor: Actor, assessmentId: string): Promise<PhotoSet | null>;
  saveSet(actor: Actor, set: PhotoSet): Promise<PhotoSet>;
  putPhoto(actor: Actor, set: PhotoSet, view: PhotoView, profileSide: ProfileSide | null, photo: ProcessedPhoto, originalName: string, idempotencyKey: string): Promise<PhotoSet>;
  photoUrl(actor: Actor, photo: PhotoAsset): Promise<string>;
  deletePhoto(actor: Actor, set: PhotoSet, view: PhotoView): Promise<PhotoSet>;
  updatePhoto(actor: Actor, set: PhotoSet, view: PhotoView, patch: Partial<Pick<PhotoAsset, "profileSide" | "mirrorConfirmed" | "transforms">>): Promise<PhotoSet>;
  listAnnotations(actor: Actor, photoId: string): Promise<AnnotationVersion[]>;
  /** Grava nova versão. Lança PhotoConflictError se outra versão foi salva depois de basedOn. */
  saveAnnotation(actor: Actor, photoId: string, basedOn: number | null, data: AnnotationData): Promise<AnnotationVersion>;
  getPending(setId: string): Promise<PendingUpload[]>;
  setPending(p: PendingUpload | null, key: string): Promise<void>;
  getComparisonNote(actor: Actor, traineeId: string, baselineSetId: string, currentSetId: string, view: PhotoView): Promise<ComparisonNote | null>;
  saveComparisonNote(actor: Actor, note: ComparisonNote): Promise<ComparisonNote>;
}

export function newPhotoSet(args: { actor: Actor; traineeId: string; ownerId: string; assessmentId: string | null; context: PhotoSet["context"]; capturedOn: string }): PhotoSet {
  const now = new Date().toISOString();
  return {
    id: newId("ps"),
    traineeId: args.traineeId,
    ownerId: args.ownerId,
    assessmentId: args.assessmentId,
    context: args.context,
    capturedOn: args.capturedOn,
    assessorId: args.actor.id,
    assessorName: args.actor.name,
    notes: "",
    consent: { documented: false, method: "", recordedAt: null },
    capture: { shoes: "não informado", distance: "", cameraHeight: "", lens: "", lighting: "", feet: "" },
    photos: {},
    createdAt: now,
    updatedAt: now,
  };
}

/** Só profissionais com acesso ao aluno leem e alteram fotos. O aluno não acessa as próprias fotos por aqui. */
export function canUsePhotos(actor: Actor, ownerId: string): boolean {
  if (actor.role === "teacher" || actor.role === "physiotherapist") return actor.id === ownerId;
  if (actor.role === "pe_student") return actor.id === ownerId || actor.supervisorId === ownerId;
  return false;
}

function deny(): never {
  throw new Error("Você não tem acesso às fotos deste aluno.");
}

// ---------------------------------------------------------------------------
// Demonstração: IndexedDB
// ---------------------------------------------------------------------------
const DB_NAME = "lr_posture_v1";
const STORES = ["sets", "blobs", "annotations", "pending", "notes"] as const;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("Este navegador não permite guardar fotos localmente."));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      for (const s of STORES) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Falha ao abrir o armazenamento local."));
  });
}

async function tx<T>(store: (typeof STORES)[number], mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const r = fn(s);
    let result: T;
    if (r) r.onsuccess = () => (result = r.result);
    t.oncomplete = () => {
      db.close();
      resolve(result);
    };
    t.onerror = () => {
      db.close();
      reject(t.error ?? new Error("Falha no armazenamento local."));
    };
    t.onabort = () => {
      db.close();
      reject(t.error ?? new Error("Armazenamento local cheio ou bloqueado."));
    };
  });
}

const all = <T,>(store: (typeof STORES)[number]) => tx<T[]>(store, "readonly", (s) => s.getAll() as IDBRequest<T[]>);
const get = <T,>(store: (typeof STORES)[number], key: string) => tx<T | undefined>(store, "readonly", (s) => s.get(key) as IDBRequest<T | undefined>);
const put = (store: (typeof STORES)[number], key: string, value: unknown) => tx<IDBValidKey>(store, "readwrite", (s) => s.put(value, key));
const del = (store: (typeof STORES)[number], key: string) => tx<undefined>(store, "readwrite", (s) => s.delete(key));

export class DemoPhotoStore implements PhotoStore {
  readonly mode = "demo" as const;
  private urls = new Map<string, string>();

  async listSets(actor: Actor, traineeId: string) {
    const sets = (await all<PhotoSet>("sets")).filter((s) => s.traineeId === traineeId);
    if (sets.length && !canUsePhotos(actor, sets[0].ownerId)) deny();
    return sets.sort((a, b) => a.capturedOn.localeCompare(b.capturedOn) || a.createdAt.localeCompare(b.createdAt));
  }

  async getSetForAssessment(actor: Actor, assessmentId: string) {
    const s = (await all<PhotoSet>("sets")).find((x) => x.assessmentId === assessmentId) ?? null;
    if (s && !canUsePhotos(actor, s.ownerId)) deny();
    return s;
  }

  async saveSet(actor: Actor, set: PhotoSet) {
    if (!canUsePhotos(actor, set.ownerId)) deny();
    const existing = await get<PhotoSet>("sets", set.id);
    // As fotos só mudam pelas operações próprias; salvar metadados não apaga fotos.
    const next = { ...set, photos: existing?.photos ?? set.photos, updatedAt: new Date().toISOString() };
    await put("sets", set.id, next);
    return next;
  }

  async putPhoto(actor: Actor, set: PhotoSet, view: PhotoView, profileSide: ProfileSide | null, photo: ProcessedPhoto, originalName: string, idempotencyKey: string) {
    if (!canUsePhotos(actor, set.ownerId)) deny();
    const current = (await get<PhotoSet>("sets", set.id)) ?? set;
    const prev = current.photos[view];
    // Requisição repetida (duplo clique, nova tentativa): devolve o que já foi gravado.
    if (prev && prev.storageKey === `demo:${idempotencyKey}`) return current;
    const asset: PhotoAsset = {
      id: newId("ph"),
      setId: set.id,
      view,
      profileSide: view === "perfil" ? profileSide : null,
      width: photo.width,
      height: photo.height,
      mime: photo.mime,
      bytes: photo.blob.size,
      storageKey: `demo:${idempotencyKey}`,
      originalName,
      uploadedAt: new Date().toISOString(),
      uploadedBy: actor.id,
      mirrorConfirmed: null,
      transforms: photo.orientation !== 1 ? [{ kind: "orientação EXIF aplicada", at: new Date().toISOString(), by: actor.id, effect: `Orientação ${photo.orientation} aplicada (${photo.orientationApplied}) antes de qualquer marcação.` }] : [],
      replaces: prev?.id ?? null,
    };
    await put("blobs", asset.storageKey, photo.blob);
    const next: PhotoSet = { ...current, photos: { ...current.photos, [view]: asset }, updatedAt: new Date().toISOString() };
    await put("sets", set.id, next);
    if (prev) await this.removeBlob(prev);
    return next;
  }

  private async removeBlob(p: PhotoAsset) {
    await del("blobs", p.storageKey);
    const u = this.urls.get(p.storageKey);
    if (u) URL.revokeObjectURL(u);
    this.urls.delete(p.storageKey);
  }

  async photoUrl(actor: Actor, photo: PhotoAsset) {
    const set = await get<PhotoSet>("sets", photo.setId);
    if (!set || !canUsePhotos(actor, set.ownerId)) deny();
    const cached = this.urls.get(photo.storageKey);
    if (cached) return cached;
    const blob = await get<Blob>("blobs", photo.storageKey);
    if (!blob) throw new Error("Arquivo da foto não encontrado neste navegador.");
    const url = URL.createObjectURL(blob);
    this.urls.set(photo.storageKey, url);
    return url;
  }

  async deletePhoto(actor: Actor, set: PhotoSet, view: PhotoView) {
    if (!canUsePhotos(actor, set.ownerId)) deny();
    const current = (await get<PhotoSet>("sets", set.id)) ?? set;
    const p = current.photos[view];
    if (!p) return current;
    await this.removeBlob(p);
    for (const a of (await all<AnnotationVersion>("annotations")).filter((x) => x.photoId === p.id)) await del("annotations", a.id);
    const photos = { ...current.photos };
    delete photos[view];
    const next = { ...current, photos, updatedAt: new Date().toISOString() };
    await put("sets", set.id, next);
    return next;
  }

  async updatePhoto(actor: Actor, set: PhotoSet, view: PhotoView, patch: Partial<Pick<PhotoAsset, "profileSide" | "mirrorConfirmed" | "transforms">>) {
    if (!canUsePhotos(actor, set.ownerId)) deny();
    const current = (await get<PhotoSet>("sets", set.id)) ?? set;
    const p = current.photos[view];
    if (!p) throw new Error("Foto não encontrada.");
    const next = { ...current, photos: { ...current.photos, [view]: { ...p, ...patch } }, updatedAt: new Date().toISOString() };
    await put("sets", set.id, next);
    return next;
  }

  async listAnnotations(actor: Actor, photoId: string) {
    const list = (await all<AnnotationVersion>("annotations")).filter((a) => a.photoId === photoId).sort((a, b) => a.version - b.version);
    return list;
  }

  async saveAnnotation(actor: Actor, photoId: string, basedOn: number | null, data: AnnotationData) {
    const list = await this.listAnnotations(actor, photoId);
    const latest = list.at(-1) ?? null;
    if ((latest?.version ?? null) !== basedOn && latest) throw new PhotoConflictError(latest);
    const v: AnnotationVersion = {
      id: newId("an"),
      photoId,
      version: (latest?.version ?? 0) + 1,
      basedOn,
      authorId: actor.id,
      authorName: actor.name,
      createdAt: new Date().toISOString(),
      protocol: LANDMARK_PROTOCOL,
      data,
    };
    await put("annotations", v.id, v);
    return v;
  }

  async getPending(setId: string) {
    return (await all<PendingUpload>("pending")).filter((p) => p.setId === setId);
  }

  async setPending(p: PendingUpload | null, key: string) {
    if (p) await put("pending", key, p);
    else await del("pending", key);
  }

  async getComparisonNote(_actor: Actor, traineeId: string, baselineSetId: string, currentSetId: string, view: PhotoView) {
    return (await get<ComparisonNote>("notes", `${traineeId}:${baselineSetId}:${currentSetId}:${view}`)) ?? null;
  }

  async saveComparisonNote(_actor: Actor, note: ComparisonNote) {
    const next = { ...note, updatedAt: new Date().toISOString() };
    await put("notes", `${note.traineeId}:${note.baselineSetId}:${note.currentSetId}:${note.view}`, next);
    return next;
  }
}

// ---------------------------------------------------------------------------
// Real: Edge Function "posture" do backend (autorização e validação no servidor;
// links assinados). O caminho abaixo é relativo a /functions/v1/posture.
// ---------------------------------------------------------------------------
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    return await callFunction<T>("posture", path, init);
  } catch (e) {
    if (e instanceof FunctionError && e.status === 409 && e.body.latest) throw new PhotoConflictError(e.body.latest as AnnotationVersion);
    throw e;
  }
}

export class ApiPhotoStore implements PhotoStore {
  readonly mode = "supabase" as const;
  listSets(_a: Actor, traineeId: string) {
    return api<PhotoSet[]>(`/sets?aluno=${encodeURIComponent(traineeId)}`);
  }
  async getSetForAssessment(_a: Actor, assessmentId: string) {
    const r = await api<PhotoSet[]>(`/sets?avaliacao=${encodeURIComponent(assessmentId)}`);
    return r[0] ?? null;
  }
  saveSet(_a: Actor, set: PhotoSet) {
    return api<PhotoSet>("/sets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(set) });
  }
  putPhoto(_a: Actor, set: PhotoSet, view: PhotoView, profileSide: ProfileSide | null, photo: ProcessedPhoto, originalName: string, idempotencyKey: string) {
    const fd = new FormData();
    fd.set("arquivo", photo.blob, "foto.jpg");
    fd.set("conjunto", set.id);
    fd.set("vista", view);
    if (profileSide) fd.set("perfil", profileSide);
    fd.set("largura", String(photo.width));
    fd.set("altura", String(photo.height));
    fd.set("orientacao", String(photo.orientation));
    fd.set("nome", originalName.slice(0, 120));
    return api<PhotoSet>("/photos", { method: "POST", body: fd, headers: { "idempotency-key": idempotencyKey } });
  }
  async photoUrl(_a: Actor, photo: PhotoAsset) {
    return (await api<{ url: string }>(`/photos/${encodeURIComponent(photo.id)}`)).url;
  }
  deletePhoto(_a: Actor, set: PhotoSet, view: PhotoView) {
    const p = set.photos[view];
    if (!p) return Promise.resolve(set);
    return api<PhotoSet>(`/photos/${encodeURIComponent(p.id)}`, { method: "DELETE" });
  }
  updatePhoto(_a: Actor, set: PhotoSet, view: PhotoView, patch: Partial<Pick<PhotoAsset, "profileSide" | "mirrorConfirmed" | "transforms">>) {
    const p = set.photos[view];
    if (!p) return Promise.reject(new Error("Foto não encontrada."));
    return api<PhotoSet>(`/photos/${encodeURIComponent(p.id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
  }
  listAnnotations(_a: Actor, photoId: string) {
    return api<AnnotationVersion[]>(`/photos/${encodeURIComponent(photoId)}/annotations`);
  }
  saveAnnotation(_a: Actor, photoId: string, basedOn: number | null, data: AnnotationData) {
    return api<AnnotationVersion>(`/photos/${encodeURIComponent(photoId)}/annotations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ basedOn, data, protocol: LANDMARK_PROTOCOL }) });
  }
  // Envios interrompidos ficam registrados só neste navegador (não contêm a foto).
  async getPending(setId: string) {
    try {
      return (JSON.parse(localStorage.getItem("lr_posture_pending") ?? "[]") as PendingUpload[]).filter((p) => p.setId === setId);
    } catch {
      return [];
    }
  }
  async setPending(p: PendingUpload | null, key: string) {
    try {
      const list = (JSON.parse(localStorage.getItem("lr_posture_pending") ?? "[]") as PendingUpload[]).filter((x) => x.key !== key);
      if (p) list.push(p);
      localStorage.setItem("lr_posture_pending", JSON.stringify(list));
    } catch {
      /* sem armazenamento local: não há recuperação após sair da página */
    }
  }
  async getComparisonNote(_a: Actor, traineeId: string, baselineSetId: string, currentSetId: string, view: PhotoView) {
    const r = await api<ComparisonNote[]>(`/notes?aluno=${encodeURIComponent(traineeId)}&base=${encodeURIComponent(baselineSetId)}&atual=${encodeURIComponent(currentSetId)}&vista=${view}`);
    return r[0] ?? null;
  }
  saveComparisonNote(_a: Actor, note: ComparisonNote) {
    return api<ComparisonNote>("/notes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(note) });
  }
}

let demoStore: DemoPhotoStore | null = null;
let apiStore: ApiPhotoStore | null = null;
export function getPhotoStore(mode: "demo" | "supabase"): PhotoStore {
  if (mode === "demo") return (demoStore ??= new DemoPhotoStore());
  return (apiStore ??= new ApiPhotoStore());
}
