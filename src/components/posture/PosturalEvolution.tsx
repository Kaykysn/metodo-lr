"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useData } from "@/components/providers/DataProvider";
import { canUsePhotos, newPhotoSet, type ComparisonNote } from "@/lib/data/photo-store";
import {
  buildTrend,
  compareRecords,
  computeMeasurements,
  LANDMARK_PROTOCOL,
  POSTURE_NOTE,
  stackLabels,
  VIEW_LABEL,
  type AnnotationVersion,
  type MeasurementRecord,
  type PhotoAsset,
  type PhotoSet,
  type PhotoView,
} from "@/lib/domain/posture";
import { viewBoxOf } from "@/lib/media/photo-geometry";
import { TimeLine } from "@/components/charts/Charts";
import type { Trainee } from "@/lib/domain/types";
import { Button, EmptyState, ErrorNote, Field, Loading, Panel, inputClass } from "@/components/ui/primitives";
import PhotoSetEditor, { usePhotoStore } from "./PhotoSetPanel";

const fmtDate = (d: string) => d.split("-").reverse().join("/");
const num = (v: number | null | undefined) => (v === null || v === undefined ? "—" : v.toLocaleString("pt-BR", { maximumFractionDigits: 1 }));

interface Side {
  set: PhotoSet;
  photo: PhotoAsset;
  url: string;
  annotation: AnnotationVersion | null;
}

/** Aba "Evolução postural": conjuntos datados, comparação lado a lado e tabela de medidas. */
export default function PosturalEvolution({ trainee }: { trainee: Trainee }) {
  const { actor } = useData();
  const store = usePhotoStore();
  const [sets, setSets] = useState<PhotoSet[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [baseId, setBaseId] = useState("");
  const [curId, setCurId] = useState("");
  const [view, setView] = useState<PhotoView>("frente");

  const allowed = canUsePhotos(actor, trainee.ownerId);

  useEffect(() => {
    if (!allowed) return;
    store
      .listSets(actor, trainee.id)
      .then(setSets)
      .catch((e) => setError(e instanceof Error ? e.message : "Não foi possível carregar as fotos."));
  }, [store, actor, trainee.id, allowed]);

  if (!allowed) return null;

  const addSet = async () => {
    try {
      const s = await store.saveSet(actor, newPhotoSet({ actor, traineeId: trainee.id, ownerId: trainee.ownerId, assessmentId: null, context: "reavaliação", capturedOn: new Date().toISOString().slice(0, 10) }));
      setSets((cur) => [...(cur ?? []), s]);
      setEditing(s.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível criar o conjunto.");
    }
  };

  const updateSet = (s: PhotoSet) => setSets((cur) => cur?.map((x) => (x.id === s.id ? s : x)) ?? null);
  // Ordem por data da captura; padrões: primeira data como base, última como acompanhamento.
  const sorted = sets ? [...sets].sort((a, b) => a.capturedOn.localeCompare(b.capturedOn) || a.createdAt.localeCompare(b.createdAt)) : [];
  const effBase = sorted.some((x) => x.id === baseId) ? baseId : sorted[0]?.id ?? "";
  const effCur = sorted.some((x) => x.id === curId) ? curId : sorted.at(-1)?.id ?? "";

  return (
    <Panel className="space-y-5 p-4 sm:p-6" as="section">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Evolução postural</h2>
          <p className="text-[15px] text-theme-muted">Compare vistas iguais entre duas datas. Mudanças nas medidas descrevem a foto; o significado clínico depende da sua avaliação.</p>
        </div>
        <Button variant="secondary" onClick={addSet}>Novo conjunto de reavaliação</Button>
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      {!sets && !error && <Loading label="Carregando fotos…" />}

      {sets && sets.length > 0 && (
        <section aria-label="Conjuntos de fotos">
          <h3 className="mb-2 text-sm font-semibold text-theme-muted">Conjuntos de fotos</h3>
          <ul className="divide-y divide-theme-border rounded-panel border border-theme-border">
            {sorted.map((s) => (
              <li key={s.id} className="space-y-3 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[15px]">
                    <span className="font-semibold">{fmtDate(s.capturedOn)}</span> · {s.context} · {Object.keys(s.photos).length} de 3 vistas · {s.assessorName}
                    {s.assessmentId && <> · <Link href={`/app/avaliacoes/${s.assessmentId}`} className="text-theme-teal underline">abrir avaliação</Link></>}
                  </p>
                  <Button variant="ghost" onClick={() => setEditing(editing === s.id ? null : s.id)} aria-expanded={editing === s.id}>
                    {editing === s.id ? "Fechar" : "Fotos e análise postural"}
                  </Button>
                </div>
                {editing === s.id && <PhotoSetEditor key={s.id} set={s} onChange={updateSet} />}
              </li>
            ))}
          </ul>
        </section>
      )}

      {sets && sets.length < 2 && (
        <EmptyState title="Comparação disponível a partir de duas datas">
          {sets.length === 0 ? "Nenhuma foto registrada para este aluno." : "Há um conjunto de fotos. Registre outra data para comparar."} As fotos da avaliação também aparecem aqui.
        </EmptyState>
      )}

      {sets && sets.length >= 2 && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Data de base" htmlFor="pe-base">
              <select id="pe-base" className={inputClass} value={effBase} onChange={(e) => setBaseId(e.target.value)}>
                {sorted.map((s) => <option key={s.id} value={s.id}>{fmtDate(s.capturedOn)} ({s.context})</option>)}
              </select>
            </Field>
            <Field label="Data de acompanhamento" htmlFor="pe-cur">
              <select id="pe-cur" className={inputClass} value={effCur} onChange={(e) => setCurId(e.target.value)}>
                {sorted.map((s) => <option key={s.id} value={s.id}>{fmtDate(s.capturedOn)} ({s.context})</option>)}
              </select>
            </Field>
            <Field label="Vista" htmlFor="pe-view">
              <select id="pe-view" className={inputClass} value={view} onChange={(e) => setView(e.target.value as PhotoView)}>
                {(["frente", "perfil", "costas"] as PhotoView[]).map((v) => <option key={v} value={v}>{VIEW_LABEL[v]}</option>)}
              </select>
            </Field>
          </div>
          {effBase === effCur ? (
            <p className="text-[15px] text-theme-muted">Escolha duas datas diferentes.</p>
          ) : (
            <Compare key={`${effBase}-${effCur}-${view}`} base={sorted.find((s) => s.id === effBase)!} cur={sorted.find((s) => s.id === effCur)!} view={view} trainee={trainee} />
          )}
          <Trend key={`trend-${view}-${sorted.map((x) => x.id + x.updatedAt).join(",")}`} sets={sorted} view={view} />
        </>
      )}
    </Panel>
  );
}

/** Tendência datada de uma medida: só datas com definição e calibração compatíveis. */
function Trend({ sets, view }: { sets: PhotoSet[]; view: PhotoView }) {
  const { actor } = useData();
  const store = usePhotoStore();
  const [records, setRecords] = useState<(MeasurementRecord & { date: string; label: string })[] | null>(null);
  const [method, setMethod] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const out: (MeasurementRecord & { date: string; label: string })[] = [];
      for (const s of sets) {
        const photo = s.photos[view];
        if (!photo) continue;
        const ann = (await store.listAnnotations(actor, photo.id)).at(-1);
        if (!ann) continue;
        const ms = computeMeasurements({ view, profileSide: photo.profileSide, width: photo.width, height: photo.height, data: ann.data });
        for (const m of ms) {
          out.push({
            date: s.capturedOn,
            label: m.label,
            methodId: m.methodId,
            value: m.value,
            unit: m.unit,
            view,
            profileSide: photo.profileSide,
            protocol: ann.protocol,
            calibrated: !!(ann.data.calibration && ann.data.calibration.lengthCm > 0),
            verticalSource: ann.data.vertical?.source ?? null,
            mirrorConfirmed: photo.mirrorConfirmed,
            referenceSegment: m.basis?.kind === "segmento" && m.basis.refPoints ? m.basis.refPoints.join("–") : null,
          });
        }
      }
      if (alive) setRecords(out);
    })().catch((e) => alive && setError(e instanceof Error ? e.message : "Não foi possível montar a tendência."));
    return () => {
      alive = false;
    };
  }, [sets, view, store, actor]);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!records) return null;
  const methods = Array.from(new Map(records.filter((r) => r.value !== null).map((r) => [r.methodId, r.label])).entries());
  if (!methods.length) return null;
  const m = methods.some(([id]) => id === method) ? method : methods[0][0];
  const label = methods.find(([id]) => id === m)![1];
  const trend = buildTrend(records.filter((r) => r.methodId === m));
  const vals = trend.points.map((p) => p.value);
  const lo = Math.min(0, ...vals);
  const hi = Math.max(1, ...vals);
  const pad = (hi - lo) * 0.15 || 1;
  return (
    <section aria-labelledby="tendencia-titulo" className="space-y-3 border-t border-theme-border pt-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 id="tendencia-titulo" className="font-semibold">Tendência ao longo das datas</h3>
          <p className="text-sm text-theme-muted">Entram só as datas medidas com a mesma definição, calibração e referências da primeira data com valor.</p>
        </div>
        <Field label="Medida" htmlFor="pe-trend">
          <select id="pe-trend" className={inputClass} value={m} onChange={(e) => setMethod(e.target.value)}>
            {methods.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
          </select>
        </Field>
      </div>
      {trend.points.length >= 2 ? (
        <TimeLine label={`${label} (${trend.unit})`} unit={trend.unit === "°" ? "°" : ` ${trend.unit}`} points={trend.points.map((p) => ({ ...p, context: "Foto marcada" }))} yMin={Math.floor(lo - pad)} yMax={Math.ceil(hi + pad)} color="rgb(var(--chart-bar))" height={200} />
      ) : (
        <p className="text-[15px] text-theme-muted">Ainda não há duas datas compatíveis para esta medida.</p>
      )}
      {trend.excluded.length > 0 && (
        <ul className="space-y-1 text-sm text-theme-muted" aria-label="Datas fora da tendência">
          {trend.excluded.map((x) => <li key={x.date}>{fmtDate(x.date)}: fora da tendência ({x.reasons.join("; ")})</li>)}
        </ul>
      )}
    </section>
  );
}

function Compare({ base, cur, view, trainee }: { base: PhotoSet; cur: PhotoSet; view: PhotoView; trainee: Trainee }) {
  const { actor } = useData();
  const store = usePhotoStore();
  const [sides, setSides] = useState<[Side | null, Side | null] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [overlay, setOverlay] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ x: 0.5, y: 0.5 });
  const [opacityMode, setOpacityMode] = useState(false);
  const [aligned, setAligned] = useState(false);
  const [opacity, setOpacity] = useState(0.5);
  const [note, setNote] = useState<ComparisonNote | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteSaved, setNoteSaved] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async (s: PhotoSet): Promise<Side | null> => {
      const photo = s.photos[view];
      if (!photo) return null;
      const [url, list] = await Promise.all([store.photoUrl(actor, photo), store.listAnnotations(actor, photo.id)]);
      return { set: s, photo, url, annotation: list.at(-1) ?? null };
    };
    Promise.all([load(base), load(cur)])
      .then((r) => alive && setSides(r as [Side | null, Side | null]))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Não foi possível abrir as fotos."));
    store.getComparisonNote(actor, trainee.id, base.id, cur.id, view).then((n) => {
      if (!alive) return;
      setNote(n);
      setNoteText(n?.text ?? "");
    }).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [store, actor, base, cur, view, trainee.id]);

  const rows = useMemo(() => {
    if (!sides || !sides[0] || !sides[1]) return [];
    const recs = sides.map((s) => {
      const data = s!.annotation?.data;
      if (!data) return new Map<string, MeasurementRecord & { label: string; definition: string }>();
      const ms = computeMeasurements({ view, profileSide: s!.photo.profileSide, width: s!.photo.width, height: s!.photo.height, data });
      return new Map(ms.map((m) => [m.methodId, {
        methodId: m.methodId,
        value: m.value,
        unit: m.unit,
        view,
        profileSide: s!.photo.profileSide,
        protocol: s!.annotation!.protocol,
        calibrated: !!(data.calibration && data.calibration.lengthCm > 0),
        verticalSource: data.vertical?.source ?? null,
        mirrorConfirmed: s!.photo.mirrorConfirmed,
        referenceSegment: m.basis?.kind === "segmento" && m.basis.refPoints ? m.basis.refPoints.join("–") : null,
        label: m.label,
        definition: m.definition,
      }]));
    });
    const ids = Array.from(new Set(Array.from(recs[0].keys()).concat(Array.from(recs[1].keys()))));
    return ids.map((id) => {
      const a = recs[0].get(id);
      const b = recs[1].get(id);
      const label = (a ?? b)!.label;
      if (!a || !b) return { id, label, cmp: null, definition: (a ?? b)!.definition };
      return { id, label, cmp: compareRecords(a, b), definition: a.definition };
    });
  }, [sides, view]);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!sides) return <Loading label="Abrindo fotos…" />;
  const [a, b] = sides;
  const missing = [!a && fmtDate(base.capturedOn), !b && fmtDate(cur.capturedOn)].filter(Boolean);
  if (missing.length) return <p className="text-[15px] text-theme-muted">Sem foto de {VIEW_LABEL[view].toLocaleLowerCase("pt-BR")} em {missing.join(" e ")}.</p>;
  const sideMismatch = view === "perfil" && a!.photo.profileSide !== b!.photo.profileSide;
  const compatible = !sideMismatch && a!.annotation?.protocol === b!.annotation?.protocol;

  const saveNote = async () => {
    try {
      const n = await store.saveComparisonNote(actor, { id: note?.id ?? `cn_${Date.now().toString(36)}`, traineeId: trainee.id, baselineSetId: base.id, currentSetId: cur.id, view, text: noteText, authorName: actor.name, updatedAt: new Date().toISOString() });
      setNote(n);
      setNoteSaved("Interpretação salva.");
    } catch (e) {
      setNoteSaved(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
  };

  return (
    <div className="space-y-4">
      {sideMismatch && <p className="rounded-control border border-status-caution-border bg-status-caution-bg p-2 text-sm text-status-caution-fg">As duas fotos de perfil são de lados diferentes. As medidas não são comparáveis.</p>}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={overlay} onChange={(e) => setOverlay(e.target.checked)} /> Mostrar marcações</label>
        <label className="flex items-center gap-2">Zoom sincronizado
          <input type="range" min={1} max={4} step={0.25} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom sincronizado" />
          <span className="tabular w-10">{Math.round(zoom * 100)}%</span>
        </label>
        {zoom > 1 && (
          <label className="flex items-center gap-2">Altura da área
            <input type="range" min={0} max={1} step={0.05} value={center.y} onChange={(e) => setCenter({ ...center, y: Number(e.target.value) })} aria-label="Posição vertical da área ampliada" />
          </label>
        )}
        <label className="flex items-center gap-2"><input type="checkbox" checked={opacityMode} onChange={(e) => { setOpacityMode(e.target.checked); setAligned(false); }} /> Comparar por sobreposição</label>
      </div>

      {opacityMode && !aligned ? (
        <div className="space-y-2 rounded-control border border-theme-border p-3 text-[15px]">
          <p>A sobreposição só faz sentido com fotos alinhadas e tiradas nas mesmas condições (distância, altura e lente da câmera, posição dos pés). As proporções do corpo não são alteradas.</p>
          <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={aligned} onChange={(e) => setAligned(e.target.checked)} /> Confirmo que as duas fotos estão alinhadas e foram tiradas em condições comparáveis.</label>
        </div>
      ) : opacityMode ? (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">Transparência da foto de acompanhamento
            <input type="range" min={0} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} />
          </label>
          <div className="relative mx-auto aspect-3/4 max-w-md overflow-hidden rounded-panel bg-[#0f1418]">
            <PhotoWithOverlay side={a!} view={view} overlay={overlay} zoom={zoom} center={center} />
            <div className="absolute inset-0" style={{ opacity }}>
              <PhotoWithOverlay side={b!} view={view} overlay={overlay} zoom={zoom} center={center} transparent />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {[a!, b!].map((s, i) => (
            <figure key={s.set.id} className="space-y-1">
              <div className="relative aspect-3/4 overflow-hidden rounded-panel bg-[#0f1418]">
                <PhotoWithOverlay side={s} view={view} overlay={overlay} zoom={zoom} center={center} />
              </div>
              <figcaption className="text-sm">
                <span className="font-semibold">{i === 0 ? "Base" : "Acompanhamento"}: {fmtDate(s.set.capturedOn)}</span>
                <span className="block text-theme-muted">
                  {s.set.assessorName} · {s.annotation ? `marcação v${s.annotation.version} (${s.annotation.protocol})` : "sem marcação"} · calibração {s.annotation?.data.calibration && s.annotation.data.calibration.lengthCm > 0 ? "registrada" : "ausente"} · câmera {s.annotation?.data.quality.cameraLevel ?? "não verificada"} · {s.set.capture.shoes}
                  {s.photo.profileSide ? ` · perfil ${s.photo.profileSide}` : ""}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-panel border border-theme-border bg-theme-primary">
        <table className="w-full min-w-[680px] text-left text-[15px]">
          <caption className="sr-only">Medidas da data de base e da data de acompanhamento</caption>
          <thead className="text-sm text-theme-muted">
            <tr className="border-b border-theme-border">
              <th scope="col" className="px-3 py-2">Medida</th>
              <th scope="col" className="px-3 py-2 text-right">Base</th>
              <th scope="col" className="px-3 py-2 text-right">Atual</th>
              <th scope="col" className="px-3 py-2 text-right">Diferença</th>
              <th scope="col" className="px-3 py-2">Unidade</th>
              <th scope="col" className="px-3 py-2">Comparabilidade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-theme-border">
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-3 text-theme-muted">Marque os pontos nas duas fotos (Analisar) para ver as medidas.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <th scope="row" className="px-3 py-2 font-medium">
                  {r.label}
                  <details className="text-xs font-normal text-theme-muted"><summary className="cursor-pointer">Método</summary>{r.definition}</details>
                </th>
                <td className="tabular px-3 py-2 text-right">{num(r.cmp?.baseline)}</td>
                <td className="tabular px-3 py-2 text-right">{num(r.cmp?.current)}</td>
                <td className="tabular px-3 py-2 text-right">{r.cmp?.diff === null || r.cmp?.diff === undefined ? "—" : `${r.cmp.diff > 0 ? "+" : ""}${r.cmp.diff.toLocaleString("pt-BR")}`}</td>
                <td className="px-3 py-2">{r.cmp?.unit ?? "—"}</td>
                <td className="px-3 py-2 text-sm">{!r.cmp ? "Medida presente em só uma data" : r.cmp.comparable ? "Comparável" : r.cmp.reasons.join("; ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-theme-muted">
        “Diferença” é a variação em relação à avaliação de base (atual − base). Uma redução numérica de assimetria é uma mudança descritiva; o significado clínico precisa de avaliação. {POSTURE_NOTE}
        {!compatible && " Há diferenças de protocolo ou de lado entre as fotos."}
      </p>

      <div className="space-y-2">
        <Field label="Sua interpretação da mudança" htmlFor="pe-note" hint="Relacione com dor, função, força e treino do aluno.">
          <textarea id="pe-note" className={`${inputClass} min-h-[90px] py-2`} value={noteText} onChange={(e) => { setNoteText(e.target.value); setNoteSaved(null); }} />
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={saveNote}>Salvar interpretação</Button>
          {noteSaved && <span className="text-sm text-theme-muted" role="status">{noteSaved}</span>}
          {note && <span className="text-xs text-theme-muted">Última edição por {note.authorName} em {new Date(note.updatedAt).toLocaleDateString("pt-BR")}</span>}
        </div>
        <p className="text-sm text-theme-muted">
          Contexto do aluno: <a href="#evolucao-graficos" className="text-theme-teal underline">dor, função e carga</a> · <Link href={`/app/alunos/${trainee.id}`} className="text-theme-teal underline">avaliações e treinos</Link>
        </p>
      </div>
    </div>
  );
}

/** Foto contida com marcações (somente leitura). O zoom é o mesmo nas duas datas. */
function PhotoWithOverlay({ side, view, overlay, zoom, center, transparent = false }: { side: Side; view: PhotoView; overlay: boolean; zoom: number; center: { x: number; y: number }; transparent?: boolean }) {
  const W = side.photo.width;
  const H = side.photo.height;
  const vb = viewBoxOf({ cw: 1, ch: 1, w: W, h: H, zoom, cx: center.x * W, cy: center.y * H });
  const data = side.annotation?.data;
  const ms = data ? computeMeasurements({ view, profileSide: side.photo.profileSide, width: W, height: H, data }) : [];
  const s = Math.max(W, H) / 600 / zoom;
  return (
    <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full" role="img" aria-label={`Foto de ${fmtDate(side.set.capturedOn)}`}>
      {!transparent && <rect x={0} y={0} width={W} height={H} fill="#0f1418" />}
      <image href={side.url} width={W} height={H} transform={side.photo.mirrorConfirmed ? `translate(${W} 0) scale(-1 1)` : undefined} preserveAspectRatio="none" />
      {overlay && data && (
        <g>
          {data.horizontal && <line x1={data.horizontal.a.x * W} y1={data.horizontal.a.y * H} x2={data.horizontal.b.x * W} y2={data.horizontal.b.y * H} stroke="#ffd36f" strokeWidth={2 * s} strokeDasharray={`${10 * s} ${6 * s}`} />}
          {data.vertical && <line x1={data.vertical.a.x * W} y1={data.vertical.a.y * H} x2={data.vertical.b.x * W} y2={data.vertical.b.y * H} stroke="#6fd3ff" strokeWidth={2 * s} strokeDasharray={`${10 * s} ${6 * s}`} />}
          {data.landmarks.filter((l) => l.visibility !== "não visível").map((l) => <circle key={l.id} cx={l.x * W} cy={l.y * H} r={5 * s} fill="#7ee2c4" stroke="#0b1620" strokeWidth={2 * s} />)}
          {stackLabels(ms).map(({ m, row }) => (
            <text key={m.methodId} x={m.anchor!.x + 10 * s} y={m.anchor!.y - 10 * s + row * 18 * s} fontSize={13 * s} fontWeight={700} fill="#fff" paintOrder="stroke" stroke="#0b1620" strokeWidth={3.5 * s}>{m.short}</text>
          ))}
        </g>
      )}
    </svg>
  );
}

export { LANDMARK_PROTOCOL };
