"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Maximize2, RefreshCw, ScanLine, Trash2, X } from "lucide-react";
import { useData } from "@/components/providers/DataProvider";
import { getPhotoStore, newPhotoSet, canUsePhotos, type PendingUpload, type PhotoStore } from "@/lib/data/photo-store";
import { processPhoto, RETENTION_POLICY, type IntakeError } from "@/lib/media/image-intake";
import { VIEW_LABEL, type PhotoAsset, type PhotoSet, type PhotoView, type ProfileSide } from "@/lib/domain/posture";
import type { Actor } from "@/lib/domain/types";
import { newId } from "@/lib/domain/plans";
import { Button, ErrorNote, Field, Loading, Panel, inputClass } from "@/components/ui/primitives";
import PostureAnnotator from "./PostureAnnotator";

const VIEWS: PhotoView[] = ["frente", "perfil", "costas"];

export function usePhotoStore(): PhotoStore {
  const { mode } = useData();
  return getPhotoStore(mode);
}

/** Orientações curtas de captura (padronização para comparar datas). */
export function CaptureGuide() {
  return (
    <details className="rounded-control border border-theme-border bg-theme-secondary/50 p-3 text-[15px]">
      <summary className="cursor-pointer font-semibold">Como fotografar para comparar depois</summary>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Corpo inteiro no quadro, da cabeça aos pés, sem cortar.</li>
        <li>Mesma distância, mesma altura da câmera (por volta da cintura) e a mesma lente em todas as datas. Evite grande-angular.</li>
        <li>Câmera nivelada, de preferência em tripé. Um fio de prumo ao lado da pessoa serve de vertical de referência.</li>
        <li>Pés na mesma posição marcada no chão, postura natural e relaxada.</li>
        <li>Luz uniforme, fundo liso e contrastante.</li>
        <li>No perfil, fotografe sempre o mesmo lado e registre qual foi.</li>
        <li>Registre se a pessoa estava de calçado.</li>
      </ul>
    </details>
  );
}

type SlotState =
  | { kind: "idle" }
  | { kind: "working"; step: string; fileName: string }
  | { kind: "error"; message: string; file: File | null; heic?: boolean; retryable?: boolean };

export default function PhotoSetEditor({ set: initial, onChange, readOnlyMeta = false }: { set: PhotoSet; onChange?: (s: PhotoSet) => void; readOnlyMeta?: boolean }) {
  const { actor } = useData();
  const store = usePhotoStore();
  const [set, setSetState] = useState(initial);
  const [saved, setSaved] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [analyze, setAnalyze] = useState<{ view: PhotoView; url: string } | null>(null);
  const [zoom, setZoom] = useState<{ view: PhotoView; url: string } | null>(null);

  const setSet = useCallback((s: PhotoSet) => {
    setSetState(s);
    onChange?.(s);
  }, [onChange]);

  useEffect(() => {
    store.getPending(set.id).then(setPending).catch(() => setPending([]));
  }, [store, set.id]);

  const patch = (p: Partial<PhotoSet>) => {
    setSetState((s) => ({ ...s, ...p }));
    setSaved(false);
  };

  const saveMeta = async () => {
    setMetaError(null);
    if (set.consent.documented && !set.consent.method.trim()) return setMetaError("Descreva como a autorização foi documentada.");
    try {
      const s = await store.saveSet(actor, { ...set, consent: { ...set.consent, recordedAt: set.consent.documented ? set.consent.recordedAt ?? new Date().toISOString() : null } });
      setSet(s);
      setSaved(true);
    } catch (e) {
      setMetaError(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
  };

  const consentOk = set.consent.documented && set.consent.method.trim().length > 0 && saved;

  return (
    <div className="space-y-4">
      <CaptureGuide />

      <fieldset className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" disabled={readOnlyMeta}>
        <legend className="sr-only">Dados do conjunto de fotos</legend>
        <Field label="Data da captura" htmlFor={`cap-${set.id}`} hint="Diferente da data de envio.">
          <input id={`cap-${set.id}`} type="date" className={inputClass} value={set.capturedOn} max={new Date().toISOString().slice(0, 10)} onChange={(e) => patch({ capturedOn: e.target.value })} />
        </Field>
        <Field label="Avaliador" htmlFor={`av-${set.id}`}>
          <input id={`av-${set.id}`} className={inputClass} value={set.assessorName} readOnly />
        </Field>
        <Field label="Calçado" htmlFor={`sh-${set.id}`}>
          <select id={`sh-${set.id}`} className={inputClass} value={set.capture.shoes} onChange={(e) => patch({ capture: { ...set.capture, shoes: e.target.value as PhotoSet["capture"]["shoes"] } })}>
            <option value="não informado">Não informado</option>
            <option value="descalço">Descalço</option>
            <option value="com calçado">Com calçado</option>
          </select>
        </Field>
        <Field label="Distância e altura da câmera" htmlFor={`ds-${set.id}`} hint="ex.: 3 m, câmera a 1 m do chão">
          <input id={`ds-${set.id}`} className={inputClass} value={set.capture.distance} onChange={(e) => patch({ capture: { ...set.capture, distance: e.target.value } })} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Observações" htmlFor={`ob-${set.id}`}>
            <textarea id={`ob-${set.id}`} className={`${inputClass} min-h-[64px] py-2`} value={set.notes} onChange={(e) => patch({ notes: e.target.value })} />
          </Field>
        </div>
        <div className="space-y-2 rounded-control border border-theme-border p-3 sm:col-span-2">
          <label className="flex items-start gap-2 text-[15px]">
            <input type="checkbox" className="mt-1 h-4 w-4" checked={set.consent.documented} onChange={(e) => patch({ consent: { ...set.consent, documented: e.target.checked } })} />
            <span>A autorização do aluno para tirar e guardar estas fotos está documentada.</span>
          </label>
          <Field label="Como foi documentada" htmlFor={`cm-${set.id}`} hint="ex.: termo assinado em 03/02/2027, arquivado no estúdio">
            <input id={`cm-${set.id}`} className={inputClass} value={set.consent.method} onChange={(e) => patch({ consent: { ...set.consent, method: e.target.value } })} />
          </Field>
        </div>
      </fieldset>
      {!readOnlyMeta && (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={saveMeta} disabled={saved}>Salvar dados do conjunto</Button>
          <span className="text-sm text-theme-muted" role="status">{saved ? "Dados salvos." : "Há alterações não salvas."}</span>
        </div>
      )}
      {metaError && <ErrorNote>{metaError}</ErrorNote>}
      {!consentOk && <p className="text-sm text-status-caution-fg">Para enviar fotos, registre e salve a autorização documentada.</p>}

      <div className="grid gap-4 md:grid-cols-3">
        {VIEWS.map((v) => (
          <PhotoSlot
            key={v}
            store={store}
            actor={actor}
            set={set}
            view={v}
            enabled={consentOk}
            pending={pending.find((p) => p.view === v && !set.photos[v]) ?? null}
            onClearPending={async (key) => {
              await store.setPending(null, key);
              setPending((ps) => ps.filter((p) => p.key !== key));
            }}
            onSet={setSet}
            onZoom={(url) => setZoom({ view: v, url })}
            onAnalyze={(url) => setAnalyze({ view: v, url })}
          />
        ))}
      </div>
      <p className="text-sm text-theme-muted">{RETENTION_POLICY}</p>

      {zoom && <PhotoViewer url={zoom.url} title={`${VIEW_LABEL[zoom.view]} — ${set.capturedOn.split("-").reverse().join("/")}`} onClose={() => setZoom(null)} />}
      {analyze && set.photos[analyze.view] && (
        <PostureAnnotator store={store} actor={actor} set={set} photo={set.photos[analyze.view]!} url={analyze.url} onSetChange={setSet} onClose={() => setAnalyze(null)} />
      )}
    </div>
  );
}

function PhotoSlot({
  store,
  actor,
  set,
  view,
  enabled,
  pending,
  onClearPending,
  onSet,
  onZoom,
  onAnalyze,
}: {
  store: PhotoStore;
  actor: Actor;
  set: PhotoSet;
  view: PhotoView;
  enabled: boolean;
  pending: PendingUpload | null;
  onClearPending: (key: string) => void;
  onSet: (s: PhotoSet) => void;
  onZoom: (url: string) => void;
  onAnalyze: (url: string) => void;
}) {
  const photo = set.photos[view];
  const [state, setState] = useState<SlotState>({ kind: "idle" });
  const [url, setUrl] = useState<string | null>(null);
  const [side, setSide] = useState<ProfileSide | "">(photo?.profileSide ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const id = `${set.id}-${view}`;

  useEffect(() => {
    let alive = true;
    setUrl(null);
    if (!photo) return;
    store.photoUrl(actor, photo).then((u) => alive && setUrl(u)).catch((e) => alive && setState({ kind: "error", message: e instanceof Error ? e.message : "Não foi possível abrir a foto.", file: null }));
    return () => {
      alive = false;
    };
  }, [store, actor, photo]);

  const upload = async (file: File) => {
    if (view === "perfil" && !side) {
      setState({ kind: "error", message: "Escolha se o perfil é direito ou esquerdo e toque em Tentar de novo.", file, retryable: true });
      return;
    }
    const key = newId("up").replace("_", "-");
    const marker: PendingUpload = { key, setId: set.id, view, fileName: file.name, startedAt: new Date().toISOString() };
    await store.setPending(marker, key).catch(() => undefined);
    setState({ kind: "working", step: "Preparando", fileName: file.name });
    try {
      const processed = await processPhoto(file, (step) => setState({ kind: "working", step, fileName: file.name }));
      if ("code" in processed) {
        // Arquivo inválido: repetir não resolve; o caminho é escolher outra foto.
        setState({ kind: "error", message: (processed as IntakeError).message, file, heic: processed.code === "heic", retryable: false });
        return;
      }
      setState({ kind: "working", step: "Salvando", fileName: file.name });
      const next = await store.putPhoto(actor, set, view, view === "perfil" ? (side as ProfileSide) : null, processed, file.name, key);
      onSet(next);
      setState({ kind: "idle" });
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : "O envio falhou. Tente de novo.", file, retryable: true });
    } finally {
      await store.setPending(null, key).catch(() => undefined);
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) void upload(f);
  };

  const changeSide = async (s: ProfileSide | "") => {
    setSide(s);
    if (photo && s && s !== photo.profileSide) {
      if (!window.confirm("Mudar o lado do perfil altera o sentido anterior/posterior das medidas já feitas. Continuar?")) {
        setSide(photo.profileSide ?? "");
        return;
      }
      try {
        onSet(await store.updatePhoto(actor, set, view, { profileSide: s }));
      } catch (e) {
        setState({ kind: "error", message: e instanceof Error ? e.message : "Não foi possível alterar o lado.", file: null });
      }
    }
  };

  const remove = async () => {
    try {
      onSet(await store.deletePhoto(actor, set, view));
      setConfirmDelete(false);
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : "Não foi possível excluir.", file: null });
    }
  };

  const working = state.kind === "working";
  return (
    <article aria-labelledby={`${id}-t`} className="flex flex-col overflow-hidden rounded-panel border border-theme-border bg-theme-primary">
      <header className="flex items-center justify-between gap-2 border-b border-theme-border px-3 py-2">
        <h4 id={`${id}-t`} className="font-semibold">{VIEW_LABEL[view]}</h4>
        {view === "perfil" && (
          <label className="flex items-center gap-2 text-sm">
            <span>Lado</span>
            <select aria-label="Lado do perfil" value={side} onChange={(e) => changeSide(e.target.value as ProfileSide | "")} className="min-h-[36px] rounded-control border border-theme-boundary/60 bg-theme-raised px-2 text-sm">
              <option value="">Escolher</option>
              <option value="direito">Direito</option>
              <option value="esquerdo">Esquerdo</option>
            </select>
          </label>
        )}
      </header>

      {/* Foto contida: corpo inteiro e proporções preservados */}
      <div className="relative aspect-3/4 bg-[#e9eef0] dark:bg-[#0f1418]">
        {photo && url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`Foto de ${VIEW_LABEL[view].toLocaleLowerCase("pt-BR")}${photo.profileSide ? ` (perfil ${photo.profileSide})` : ""}`} className="absolute inset-0 h-full w-full object-contain" style={photo.mirrorConfirmed ? { transform: "scaleX(-1)" } : undefined} />
        ) : photo ? (
          <div className="absolute inset-0 flex items-center justify-center"><Loading label="Abrindo foto…" /></div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-theme-muted">Sem foto</div>
        )}
        {working && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-theme-primary/90 p-4 text-center" role="status" aria-live="polite">
            <RefreshCw className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            <p className="text-sm font-semibold">{state.step}…</p>
            <p className="text-xs text-theme-muted">{state.fileName}</p>
          </div>
        )}
      </div>

      <div className="space-y-2 p-3">
        {pending && !working && (
          <div className="rounded-control border border-status-caution-border bg-status-caution-bg p-2 text-sm text-status-caution-fg" role="status">
            O envio de “{pending.fileName}” não terminou. Escolha a foto de novo.
            <button type="button" onClick={() => onClearPending(pending.key)} className="ml-2 font-semibold underline">Dispensar aviso</button>
          </div>
        )}
        {state.kind === "error" && (
          <div className="space-y-2" role="alert">
            <ErrorNote>{state.message}</ErrorNote>
            {state.file && state.retryable && <Button variant="secondary" onClick={() => upload(state.file!)}>Tentar de novo</Button>}
            {!state.retryable && <p className="text-sm text-theme-muted">Escolha outra foto em “{photo ? "Substituir" : "Adicionar da galeria"}”.</p>}
          </div>
        )}
        {photo && (
          <p className="text-xs text-theme-muted">
            {photo.width} × {photo.height} px · enviada em {new Date(photo.uploadedAt).toLocaleDateString("pt-BR")}
            {photo.mirrorConfirmed === null ? " · orientação não confirmada" : ""}
          </p>
        )}
        <input ref={gallery} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={onFile} />
        <input ref={camera} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={onFile} />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={!enabled || working} onClick={() => gallery.current?.click()}>
            <ImagePlus className="h-4 w-4" aria-hidden="true" /> {photo ? "Substituir" : "Adicionar da galeria"}
          </Button>
          <Button variant="ghost" disabled={!enabled || working} onClick={() => camera.current?.click()} aria-label={`Tirar foto: ${VIEW_LABEL[view]}`}>
            <Camera className="h-4 w-4" aria-hidden="true" /> Câmera
          </Button>
          {photo && url && (
            <>
              <Button variant="ghost" onClick={() => onZoom(url)}><Maximize2 className="h-4 w-4" aria-hidden="true" /> Ampliar</Button>
              <Button variant="ghost" onClick={() => onAnalyze(url)}><ScanLine className="h-4 w-4" aria-hidden="true" /> Analisar</Button>
            </>
          )}
        </div>
        {photo && !confirmDelete && (
          <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex min-h-[40px] items-center gap-1 text-sm text-theme-muted hover:text-status-danger-fg">
            <Trash2 className="h-4 w-4" aria-hidden="true" /> Excluir foto
          </button>
        )}
        {confirmDelete && (
          <div className="space-y-2 rounded-control border border-status-danger-border bg-status-danger-bg p-2 text-sm text-status-danger-fg" role="alertdialog" aria-label="Confirmar exclusão">
            <p>Excluir esta foto e todas as marcações dela? Não dá para desfazer.</p>
            <div className="flex gap-2">
              <Button variant="danger" onClick={remove}>Excluir</Button>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

export function PhotoViewer({ url, title, onClose, mirrored = false }: { url: string; title: string; onClose: () => void; mirrored?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} onKeyDown={(e) => e.key === "Escape" && onClose()} className="fixed inset-0 z-60 flex flex-col bg-[#0f1418] text-white outline-hidden">
      <div className="flex items-center justify-between gap-2 p-3">
        <p className="font-semibold">{title}</p>
        <button type="button" onClick={onClose} aria-label="Fechar" className="close-x-highlight inline-flex h-11 w-11 items-center justify-center rounded-lg border transition-colors hover:bg-[#f87171]/35"><X className="h-5 w-5" /></button>
      </div>
      <div className="relative flex-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={title} className="absolute inset-0 h-full w-full object-contain" style={mirrored ? { transform: "scaleX(-1)" } : undefined} />
      </div>
    </div>
  );
}

/** Seção "Fotos e análise postural" dentro de uma avaliação. */
export function AssessmentPhotos({ assessmentId, assessmentDate, traineeId, ownerId }: { assessmentId: string; assessmentDate: string; traineeId: string; ownerId: string }) {
  const { actor } = useData();
  const store = usePhotoStore();
  const [set, setSet] = useState<PhotoSet | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canUsePhotos(actor, ownerId)) return;
    store.getSetForAssessment(actor, assessmentId).then(setSet).catch((e) => setError(e instanceof Error ? e.message : "Não foi possível carregar as fotos."));
  }, [store, actor, assessmentId, ownerId]);

  if (!canUsePhotos(actor, ownerId)) return null;
  return (
    <Panel className="space-y-4 p-4 sm:p-6">
      <div>
        <h2 className="text-xl font-bold">Fotos e análise postural</h2>
        <p className="text-[15px] text-theme-muted">Frente, perfil e costas desta avaliação. Fotos parciais são aceitas.</p>
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      {set === undefined && !error && <Loading label="Carregando fotos…" />}
      {set === null && (
        <Button
          variant="secondary"
          onClick={async () => {
            try {
              setSet(await store.saveSet(actor, newPhotoSet({ actor, traineeId, ownerId, assessmentId, context: "avaliação", capturedOn: assessmentDate })));
            } catch (e) {
              setError(e instanceof Error ? e.message : "Não foi possível criar o conjunto.");
            }
          }}
        >
          Começar conjunto de fotos
        </Button>
      )}
      {set && <PhotoSetEditor key={set.id} set={set} onChange={setSet} />}
    </Panel>
  );
}
