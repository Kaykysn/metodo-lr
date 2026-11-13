"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, Eye, EyeOff, Hand, Minus, Plus, Redo2, RotateCcw, Undo2, X } from "lucide-react";
import {
  computeMeasurements,
  emptyAnnotation,
  stackLabels,
  LANDMARKS,
  mirrorAnnotation,
  POSTURE_NOTE,
  personRightOnScreen,
  anteriorOnScreen,
  VIEW_LABEL,
  type AnnotationData,
  type AnnotationVersion,
  type Landmark,
  type PhotoAsset,
  type PhotoSet,
  type Pt,
  type Visibility,
} from "@/lib/domain/posture";
import { insideImage, panBy, screenToImage, toNorm, viewBoxOf, zoomAt, type Viewport } from "@/lib/media/photo-geometry";
import { PhotoConflictError, type PhotoStore } from "@/lib/data/photo-store";
import type { Actor } from "@/lib/domain/types";
import { Button, ErrorNote, inputClass } from "@/components/ui/primitives";

type Tool = "mover" | "marco" | "vertical" | "horizontal" | "calibracao" | "angulo";
const TOOL_LABEL: Record<Tool, string> = {
  mover: "Mover e ajustar",
  marco: "Marcar pontos",
  vertical: "Vertical de referência",
  horizontal: "Linha de base horizontal",
  calibracao: "Calibração",
  angulo: "Ângulo livre",
};
const CLICKS: Partial<Record<Tool, number>> = { vertical: 2, horizontal: 2, calibracao: 2, angulo: 3 };

interface Props {
  store: PhotoStore;
  actor: Actor;
  set: PhotoSet;
  photo: PhotoAsset;
  url: string;
  onClose: () => void;
  onSetChange: (s: PhotoSet) => void;
}

export default function PostureAnnotator({ store, actor, set, photo, url, onClose, onSetChange }: Props) {
  const view = photo.view;
  const W = photo.width;
  const H = photo.height;
  const template = LANDMARKS[view];
  const box = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ cw: 800, ch: 600 });
  const [vp, setVp] = useState<Omit<Viewport, "cw" | "ch" | "w" | "h">>({ zoom: 1, cx: W / 2, cy: H / 2 });
  const viewport: Viewport = { ...size, w: W, h: H, ...vp };
  const [data, setData] = useState<AnnotationData>(emptyAnnotation());
  const [past, setPast] = useState<AnnotationData[]>([]);
  const [future, setFuture] = useState<AnnotationData[]>([]);
  const [baseVersion, setBaseVersion] = useState<number | null>(null);
  const [versions, setVersions] = useState<AnnotationVersion[]>([]);
  const [tool, setTool] = useState<Tool>("marco");
  const [active, setActive] = useState<string | null>(template[0]?.id ?? null);
  const [selected, setSelected] = useState<string | null>(null);
  const [clicks, setClicks] = useState<Pt[]>([]);
  const [calLength, setCalLength] = useState("");
  const [showOverlay, setShowOverlay] = useState(true);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<AnnotationVersion | null>(null);
  const [dirty, setDirty] = useState(false);
  const drag = useRef<{ kind: "pan" | "point"; id?: string; last: Pt; before: AnnotationData } | null>(null);
  // Pinça (dois dedos): zoom em torno do ponto médio, sem marcar nada
  const touches = useRef(new Map<number, Pt>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  // No toque, a marcação acontece ao soltar o dedo (e só se não virou pinça nem arrasto longo)
  const pendingTap = useRef<{ id: number; at: Pt } | null>(null);
  const flipped = photo.mirrorConfirmed === true;

  // Carrega a versão mais recente das marcações
  useEffect(() => {
    let alive = true;
    store
      .listAnnotations(actor, photo.id)
      .then((list) => {
        if (!alive) return;
        setVersions(list);
        const last = list.at(-1);
        if (last) {
          setData(last.data);
          setBaseVersion(last.version);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Não foi possível carregar as marcações."));
    return () => {
      alive = false;
    };
  }, [store, actor, photo.id]);

  // Tamanho do contêiner (redimensionar não move os marcos: tudo é convertido pela mesma função)
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ cw: e.contentRect.width, ch: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    dialog.current?.focus();
  }, []);

  const commit = useCallback((next: AnnotationData, before?: AnnotationData) => {
    setPast((p) => [...p.slice(-49), before ?? data]);
    setFuture([]);
    setData(next);
    setDirty(true);
    setStatus("idle");
  }, [data]);

  const undo = () => {
    const prev = past.at(-1);
    if (!prev) return;
    setFuture((f) => [data, ...f]);
    setPast((p) => p.slice(0, -1));
    setData(prev);
    setDirty(true);
  };
  const redo = () => {
    const nxt = future[0];
    if (!nxt) return;
    setPast((p) => [...p, data]);
    setFuture((f) => f.slice(1));
    setData(nxt);
    setDirty(true);
  };

  // Tamanho real do contêiner no momento do toque (não depende do observador de redimensionamento já ter rodado)
  const liveViewport = (): Viewport => {
    const r = box.current!.getBoundingClientRect();
    return { ...viewport, cw: r.width, ch: r.height };
  };
  const local = (e: { clientX: number; clientY: number }): Pt => {
    const r = box.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const toImg = (screen: Pt): Pt => screenToImage(screen, liveViewport());

  const setLandmark = (id: string, imgPt: Pt, base?: AnnotationData, visibility?: Visibility) => {
    const n = toNorm(imgPt, W, H);
    const src = base ?? data;
    const existing = src.landmarks.find((l) => l.id === id);
    const l: Landmark = { id, x: n.x, y: n.y, visibility: visibility ?? existing?.visibility ?? "visível", note: existing?.note ?? "" };
    return { ...src, landmarks: [...src.landmarks.filter((x) => x.id !== id), l] };
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      /* alguns dispositivos recusam a captura; o gesto continua funcionando dentro da área */
    }
    if (e.pointerType === "touch") {
      touches.current.set(e.pointerId, local(e));
      if (touches.current.size === 2) {
        const [a, b] = Array.from(touches.current.values());
        pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: vp.zoom };
        if (drag.current?.kind === "point") setData(drag.current.before); // segundo dedo cancela o arrasto do ponto
        drag.current = null;
        pendingTap.current = null;
        return;
      }
      if (touches.current.size > 2) return;
    }
    const s = local(e);
    const handle = (e.target as Element).closest("[data-landmark]")?.getAttribute("data-landmark");
    if (tool === "mover" || (handle && tool === "marco")) {
      if (handle) {
        setSelected(handle);
        drag.current = { kind: "point", id: handle, last: s, before: data };
      } else drag.current = { kind: "pan", last: s, before: data };
      return;
    }
    if (e.pointerType === "touch") {
      pendingTap.current = { id: e.pointerId, at: s };
      return;
    }
    placeAt(s);
  };

  /** Marca um ponto ou um clique de ferramenta na posição da tela s. */
  const placeAt = (s: Pt) => {
    if (!insideImage(s, liveViewport())) return;
    const p = toImg(s);
    if (tool === "marco") {
      if (!active) return;
      commit(setLandmark(active, p));
      setSelected(active);
      const placed = new Set([...data.landmarks.map((l) => l.id), active]);
      setActive(template.find((t) => !placed.has(t.id))?.id ?? null);
      return;
    }
    const need = CLICKS[tool]!;
    const next = [...clicks, toNorm(p, W, H)];
    if (next.length < need) {
      setClicks(next);
      return;
    }
    setClicks([]);
    if (tool === "vertical") commit({ ...data, vertical: { a: next[0], b: next[1], source: data.vertical?.source ?? "grade ajustada pelo avaliador" } });
    if (tool === "horizontal") commit({ ...data, horizontal: { a: next[0], b: next[1] } });
    if (tool === "calibracao") {
      const len = Number(calLength.replace(",", "."));
      commit({ ...data, calibration: { a: next[0], b: next[1], lengthCm: len > 0 ? len : 0 } });
    }
    if (tool === "angulo") commit({ ...data, angles: [...data.angles, { id: `ang${Date.now()}`, label: `Ângulo ${data.angles.length + 1}`, a: next[0], vertex: next[1], c: next[2] }] });
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "touch" && touches.current.has(e.pointerId)) {
      touches.current.set(e.pointerId, local(e));
      const t = pendingTap.current;
      if (t && t.id === e.pointerId) {
        const s = local(e);
        if (Math.hypot(s.x - t.at.x, s.y - t.at.y) > 10) pendingTap.current = null; // virou deslize: não marca
      }
      if (pinch.current && touches.current.size >= 2) {
        const [a, b] = Array.from(touches.current.values());
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const ratio = Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.dist;
        const live = liveViewport();
        const target = pinch.current.zoom * ratio;
        setVp((v) => {
          const nv = zoomAt({ cw: live.cw, ch: live.ch, w: W, h: H, ...v }, mid, target);
          return { zoom: nv.zoom, cx: nv.cx, cy: nv.cy };
        });
        return;
      }
    }
    const d = drag.current;
    if (!d) return;
    const s = local(e);
    if (d.kind === "pan") {
      const live = liveViewport();
      setVp((v) => {
        const nv = panBy({ cw: live.cw, ch: live.ch, w: W, h: H, ...v }, { x: s.x - d.last.x, y: s.y - d.last.y });
        return { zoom: nv.zoom, cx: nv.cx, cy: nv.cy };
      });
      d.last = s;
    } else if (d.id) {
      const p = toImg(s);
      setData((cur) => setLandmark(d.id!, { x: Math.min(W, Math.max(0, p.x)), y: Math.min(H, Math.max(0, p.y)) }, cur));
      setDirty(true);
    }
  };

  const onPointerUp = (e?: React.PointerEvent<SVGSVGElement>) => {
    if (e && e.pointerType === "touch") {
      touches.current.delete(e.pointerId);
      if (pinch.current) {
        if (touches.current.size < 2) pinch.current = null;
        drag.current = null;
        pendingTap.current = null;
        return;
      }
      const t = pendingTap.current;
      pendingTap.current = null;
      if (t && t.id === e.pointerId && e.type === "pointerup") placeAt(t.at);
    }
    const d = drag.current;
    drag.current = null;
    if (d?.kind === "point") {
      setPast((p) => [...p.slice(-49), d.before]);
      setFuture([]);
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    const s = local(e);
    const live = liveViewport();
    setVp((v) => {
      const nv = zoomAt({ cw: live.cw, ch: live.ch, w: W, h: H, ...v }, s, v.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
      return { zoom: nv.zoom, cx: nv.cx, cy: nv.cy };
    });
  };

  const zoomBy = (f: number) =>
    setVp((v) => {
      const nv = zoomAt({ ...size, w: W, h: H, ...v }, { x: size.cw / 2, y: size.ch / 2 }, v.zoom * f);
      return { zoom: nv.zoom, cx: nv.cx, cy: nv.cy };
    });

  // Teclado: setas movem o ponto selecionado (1 px; Shift = 10 px); Delete remove
  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).closest("input, select, textarea")) return;
    if (e.key === "Escape") {
      if (clicks.length) setClicks([]);
      else onClose();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (!selected) return;
    const l = data.landmarks.find((x) => x.id === selected);
    if (!l) return;
    const step = e.shiftKey ? 10 : 1;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (d) {
      e.preventDefault();
      commit(setLandmark(l.id, { x: l.x * W + d[0], y: l.y * H + d[1] }));
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      commit({ ...data, landmarks: data.landmarks.filter((x) => x.id !== l.id) });
      setSelected(null);
    }
  };

  const measurements = useMemo(() => computeMeasurements({ view, profileSide: photo.profileSide, width: W, height: H, data }), [view, photo.profileSide, W, H, data]);

  const save = async (basedOn: number | null) => {
    setStatus("saving");
    setError(null);
    setConflict(null);
    try {
      const v = await store.saveAnnotation(actor, photo.id, basedOn, data);
      setBaseVersion(v.version);
      setVersions((vs) => [...vs, v]);
      setDirty(false);
      setStatus("saved");
    } catch (e) {
      setStatus("idle");
      if (e instanceof PhotoConflictError) setConflict(e.latest);
      else setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
  };

  const confirmMirror = async (mirrored: boolean) => {
    try {
      const transforms = mirrored
        ? [...photo.transforms, { kind: "espelhamento horizontal" as const, at: new Date().toISOString(), by: actor.id, effect: "Imagem exibida espelhada; marcações existentes espelhadas e lados direito/esquerdo trocados." }]
        : photo.transforms;
      const next = await store.updatePhoto(actor, set, view, { mirrorConfirmed: mirrored, transforms });
      onSetChange(next);
      if (mirrored && photo.mirrorConfirmed !== true) commit(mirrorAnnotation(data));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível registrar a orientação.");
    }
  };

  const tryClose = () => {
    if (dirty && !window.confirm("Há marcações não salvas. Sair mesmo assim?")) return;
    onClose();
  };

  // ---------- Desenho ----------
  const vb = viewBoxOf(viewport);
  const k = Math.min(size.cw / vb.w, size.ch / vb.h) || 1;
  const px = (n: number) => n / k; // tamanho em px de tela → px da imagem
  const P = (p: Pt) => ({ x: p.x * W, y: p.y * H });
  const gridStep = (data.grid.spacingPct / 100) * H;
  const gridColor = data.grid.contrast === "claro" ? "#ffffff" : "#0b1620";
  const label = (p: Pt, text: string, key: string) => (
    <g key={key} transform={`translate(${p.x + px(10)} ${p.y - px(10)})`}>
      <text fontSize={px(13)} fontWeight={700} paintOrder="stroke" stroke="#0b1620" strokeWidth={px(3.5)} fill="#ffffff" style={{ fontFamily: "var(--font-sans), system-ui" }}>
        {text}
      </text>
    </g>
  );
  const pairs: [string, string][] =
    view === "frente" ? [["acromio-d", "acromio-e"], ["eias-d", "eias-e"], ["joelho-frente-d", "joelho-frente-e"], ["tornozelo-frente-d", "tornozelo-frente-e"]]
    : view === "costas" ? [["acromio-costas-d", "acromio-costas-e"], ["eips-d", "eips-e"], ["joelho-costas-d", "joelho-costas-e"], ["calcanhar-d", "calcanhar-e"]]
    : [["maleolo", "joelho-perfil"], ["joelho-perfil", "trocanter"], ["trocanter", "acromio-perfil"], ["acromio-perfil", "trago"]];
  const lmById = new Map(data.landmarks.map((l) => [l.id, l]));
  const sideHint =
    view === "perfil"
      ? photo.profileSide ? `Perfil ${photo.profileSide}: a frente da pessoa aponta para a ${anteriorOnScreen(photo.profileSide)} da tela.` : "Informe o lado do perfil para medir ângulos."
      : `${VIEW_LABEL[view]}: o lado direito da pessoa aparece à ${personRightOnScreen(view)} da tela.`;
  const midline = (() => {
    if (!data.showMidline || view === "perfil") return null;
    const [r, l] = view === "frente" ? ["tornozelo-frente-d", "tornozelo-frente-e"] : ["calcanhar-d", "calcanhar-e"];
    const a = lmById.get(r);
    const b = lmById.get(l);
    if (!a || !b) return null;
    const mx = ((a.x + b.x) / 2) * W;
    return <line x1={mx} y1={0} x2={mx} y2={H} stroke="#f5b942" strokeWidth={px(1.5)} strokeDasharray={`${px(8)} ${px(6)}`} />;
  })();

  return (
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-label={`Análise postural: ${VIEW_LABEL[view]}${photo.profileSide ? ` ${photo.profileSide}` : ""}`}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-[60] flex flex-col bg-[#0f1418] text-[#eef2f3] outline-none lg:flex-row"
    >
      {/* Área da foto: superfície neutra, sem vidro nem movimento */}
      <div className="relative min-h-[48vh] flex-1">
        <div className="absolute left-2 top-2 z-10 flex flex-wrap gap-1">
          <IconBtn label="Aproximar" onClick={() => zoomBy(1.4)}><Plus className="h-4 w-4" /></IconBtn>
          <IconBtn label="Afastar" onClick={() => zoomBy(1 / 1.4)}><Minus className="h-4 w-4" /></IconBtn>
          <IconBtn label="Ver a foto inteira" onClick={() => setVp({ zoom: 1, cx: W / 2, cy: H / 2 })}><RotateCcw className="h-4 w-4" /></IconBtn>
          <IconBtn label={showOverlay ? "Ocultar marcações" : "Mostrar marcações"} onClick={() => setShowOverlay((v) => !v)}>{showOverlay ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</IconBtn>
          <IconBtn label="Desfazer" onClick={undo} disabled={!past.length}><Undo2 className="h-4 w-4" /></IconBtn>
          <IconBtn label="Refazer" onClick={redo} disabled={!future.length}><Redo2 className="h-4 w-4" /></IconBtn>
        </div>
        <p className="absolute bottom-2 left-2 right-2 z-10 rounded bg-black/60 px-2 py-1 text-xs">
          {sideHint} {Math.round(vp.zoom * 100)}%
        </p>
        <div ref={box} className="absolute inset-0" onWheel={onWheel}>
          <svg
            className="h-full w-full select-none"
            style={{ touchAction: "none", cursor: tool === "mover" ? "grab" : "crosshair" }}
            viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
            preserveAspectRatio="xMidYMid meet"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            role="img"
            aria-label="Foto com marcações"
          >
            {/* Camada de pixels */}
            <image href={url} x={0} y={0} width={W} height={H} transform={flipped ? `translate(${W} 0) scale(-1 1)` : undefined} preserveAspectRatio="none" />
            {/* Camada vetorial (separada) */}
            {showOverlay && (
              <g>
                {data.grid.visible &&
                  Array.from({ length: Math.ceil(W / gridStep) + 1 }, (_, i) => <line key={`gv${i}`} x1={i * gridStep} y1={0} x2={i * gridStep} y2={H} stroke={gridColor} strokeOpacity={data.grid.opacity} strokeWidth={px(1)} />)}
                {data.grid.visible &&
                  Array.from({ length: Math.ceil(H / gridStep) + 1 }, (_, i) => <line key={`gh${i}`} x1={0} y1={i * gridStep} x2={W} y2={i * gridStep} stroke={gridColor} strokeOpacity={data.grid.opacity} strokeWidth={px(1)} />)}
                {data.vertical && <RefLineSvg a={P(data.vertical.a)} b={P(data.vertical.b)} color="#6fd3ff" w={px(2)} extend={H} label="Vertical" px={px} />}
                {data.horizontal && <RefLineSvg a={P(data.horizontal.a)} b={P(data.horizontal.b)} color="#ffd36f" w={px(2)} extend={W} label="Base" px={px} />}
                {midline}
                {data.calibration && (
                  <g>
                    <line x1={P(data.calibration.a).x} y1={P(data.calibration.a).y} x2={P(data.calibration.b).x} y2={P(data.calibration.b).y} stroke="#c58cff" strokeWidth={px(2.5)} />
                    {label(P(data.calibration.b), data.calibration.lengthCm > 0 ? `${data.calibration.lengthCm} cm` : "comprimento?", "cal")}
                  </g>
                )}
                {pairs.map(([a, b]) => {
                  const la = lmById.get(a);
                  const lb = lmById.get(b);
                  if (!la || !lb || la.visibility === "não visível" || lb.visibility === "não visível") return null;
                  return <line key={`${a}-${b}`} x1={la.x * W} y1={la.y * H} x2={lb.x * W} y2={lb.y * H} stroke="#7ee2c4" strokeWidth={px(2)} />;
                })}
                {data.angles.map((g) => (
                  <polyline key={g.id} points={[g.a, g.vertex, g.c].map((p) => `${p.x * W},${p.y * H}`).join(" ")} fill="none" stroke="#ff9d6f" strokeWidth={px(2)} />
                ))}
                {stackLabels(measurements).map(({ m, row }) => label({ x: m.anchor!.x, y: m.anchor!.y + row * px(18) }, m.short, m.methodId))}
                {data.landmarks.map((l) => {
                  const def = template.find((t) => t.id === l.id);
                  const sel = selected === l.id;
                  return (
                    <g key={l.id} data-landmark={l.id} style={{ cursor: "move" }}>
                      <circle cx={l.x * W} cy={l.y * H} r={px(14)} fill="transparent" />
                      <circle cx={l.x * W} cy={l.y * H} r={px(sel ? 7 : 5)} fill={l.visibility === "estimado" ? "#ffd36f" : "#7ee2c4"} stroke="#0b1620" strokeWidth={px(2)} />
                      {sel && <circle cx={l.x * W} cy={l.y * H} r={px(11)} fill="none" stroke="#ffffff" strokeWidth={px(1.5)} />}
                      {label({ x: l.x * W, y: l.y * H + px(22) }, def?.label ?? l.id, `t-${l.id}`)}
                    </g>
                  );
                })}
                {clicks.map((c, i) => <circle key={`c${i}`} cx={c.x * W} cy={c.y * H} r={px(5)} fill="#ffffff" />)}
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* Painel lateral */}
      <aside className="max-h-[52vh] w-full overflow-y-auto border-t border-white/10 bg-[#161d22] p-4 lg:max-h-none lg:w-[380px] lg:border-l lg:border-t-0">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-lg font-bold">{VIEW_LABEL[view]}{photo.profileSide ? ` — perfil ${photo.profileSide}` : ""}</p>
            <p className="text-xs text-[#b7c4c9]">{set.capturedOn.split("-").reverse().join("/")} · {set.assessorName}{baseVersion ? ` · versão ${baseVersion}` : ""}</p>
          </div>
          <button type="button" onClick={tryClose} aria-label="Fechar análise" className="close-x-highlight inline-flex h-11 w-11 items-center justify-center rounded-lg border transition-colors hover:bg-[#f87171]/35"><X className="h-5 w-5" /></button>
        </div>

        {photo.mirrorConfirmed === null && (
          <div className="mb-3 space-y-2 rounded-lg border border-[#f5b942]/40 bg-[#f5b942]/10 p-3 text-sm">
            <p className="font-semibold">Confirme a orientação da foto</p>
            <p>Fotos de câmera frontal (selfie) costumam sair espelhadas e trocam direita e esquerda.</p>
            <div className="flex flex-wrap gap-2">
              <DarkBtn onClick={() => confirmMirror(false)}>Não está espelhada</DarkBtn>
              <DarkBtn onClick={() => confirmMirror(true)}>Está espelhada: corrigir</DarkBtn>
            </div>
          </div>
        )}

        <fieldset className="mb-3">
          <legend className="mb-1 text-sm font-semibold">Ferramenta</legend>
          <div className="grid grid-cols-2 gap-1">
            {(Object.keys(TOOL_LABEL) as Tool[]).map((t) => (
              <button key={t} type="button" aria-pressed={tool === t} onClick={() => { setTool(t); setClicks([]); }} className={`min-h-[40px] rounded-lg border px-2 text-left text-sm ${tool === t ? "border-[#7ee2c4] bg-[#7ee2c4]/15" : "border-white/15 hover:bg-white/5"}`}>
                {t === "mover" ? <Hand className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" /> : t === "marco" ? <Crosshair className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" /> : null}
                {TOOL_LABEL[t]}
              </button>
            ))}
          </div>
          {CLICKS[tool] && <p className="mt-1 text-xs text-[#b7c4c9]" aria-live="polite">Toque {CLICKS[tool]} pontos na foto ({clicks.length} de {CLICKS[tool]}).{tool === "vertical" ? " Use um fio de prumo fotografado quando houver." : ""}</p>}
          {tool === "calibracao" && (
            <label className="mt-2 block text-sm">
              Comprimento real entre os dois pontos (cm), no mesmo plano do corpo
              <input inputMode="decimal" className={`${inputClass} mt-1`} value={calLength} onChange={(e) => setCalLength(e.target.value)} placeholder="ex.: 100" />
            </label>
          )}
          {data.vertical && (
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={data.vertical.source === "fio de prumo fotografado"} onChange={(e) => commit({ ...data, vertical: { ...data.vertical!, source: e.target.checked ? "fio de prumo fotografado" : "grade ajustada pelo avaliador" } })} />
              A vertical segue um fio de prumo fotografado
            </label>
          )}
        </fieldset>

        <section className="mb-3">
          <h3 className="mb-1 text-sm font-semibold">Pontos anatômicos</h3>
          <p className="mb-2 text-xs text-[#b7c4c9]">Escolha um ponto e toque na foto. Selecionado, ele se move pelas setas do teclado (Shift = 10 px). Pontos cobertos ou incertos podem ficar sem marcação.</p>
          <ul className="space-y-1">
            {template.map((t) => {
              const l = lmById.get(t.id);
              return (
                <li key={t.id} className={`rounded-lg border p-2 ${active === t.id && tool === "marco" ? "border-[#7ee2c4]" : "border-white/10"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <button type="button" onClick={() => { setTool("marco"); setActive(t.id); setSelected(l ? t.id : null); }} className="min-h-[36px] flex-1 text-left text-sm font-semibold">
                      {t.label} {l ? <span className="text-xs font-normal text-[#7ee2c4]">marcado</span> : <span className="text-xs font-normal text-[#b7c4c9]">sem marcação</span>}
                    </button>
                    {l && (
                      <select aria-label={`Visibilidade de ${t.label}`} value={l.visibility} onChange={(e) => commit({ ...data, landmarks: data.landmarks.map((x) => (x.id === t.id ? { ...x, visibility: e.target.value as Visibility } : x)) })} className="min-h-[36px] rounded border border-white/15 bg-[#0f1418] px-1 text-xs">
                        <option value="visível">visível</option>
                        <option value="estimado">estimado (incerto)</option>
                        <option value="não visível">não visível</option>
                      </select>
                    )}
                  </div>
                  <details className="text-xs text-[#b7c4c9]"><summary className="cursor-pointer">Definição</summary>{t.definition}{t.requiresPalpation ? " A identificação deve ser feita e registrada pelo avaliador." : ""}</details>
                </li>
              );
            })}
          </ul>
          {view !== "perfil" && (
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={data.showMidline} onChange={(e) => commit({ ...data, showMidline: e.target.checked })} /> Mostrar linha média (entre os pés)
            </label>
          )}
        </section>

        <section className="mb-3 space-y-2">
          <h3 className="text-sm font-semibold">Escala das distâncias</h3>
          <p className="text-xs text-[#b7c4c9]">Com calibração, as distâncias saem em cm. Sem calibração, escolha dois pontos para expressar as distâncias em % desse segmento; sem nenhum dos dois, ficam em pixels.</p>
          <div className="grid grid-cols-2 gap-2">
            {(["from", "to"] as const).map((k) => (
              <label key={k} className="block text-sm">{k === "from" ? "De" : "Até"}
                <select
                  value={data.referenceSegment?.[k] ?? ""}
                  onChange={(e) => {
                    const cur = data.referenceSegment ?? { from: "", to: "" };
                    const next = { ...cur, [k]: e.target.value };
                    commit({ ...data, referenceSegment: next.from && next.to && next.from !== next.to ? next : next.from || next.to ? (next as { from: string; to: string }) : null });
                  }}
                  className="mt-1 block min-h-[36px] w-full rounded border border-white/15 bg-[#0f1418] px-2"
                >
                  <option value="">Nenhum</option>
                  {template.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </label>
            ))}
          </div>
          {data.referenceSegment && (!data.referenceSegment.from || !data.referenceSegment.to || data.referenceSegment.from === data.referenceSegment.to) && (
            <p className="text-xs text-[#ffd36f]">Escolha dois pontos diferentes, ambos marcados na foto.</p>
          )}
        </section>

        <section className="mb-3 space-y-2">
          <h3 className="text-sm font-semibold">Grade</h3>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={data.grid.visible} onChange={(e) => setData({ ...data, grid: { ...data.grid, visible: e.target.checked } })} /> Mostrar grade</label>
          <label className="block text-sm">Espaçamento: {data.grid.spacingPct}% da altura
            <input type="range" min={2} max={12} step={1} value={data.grid.spacingPct} onChange={(e) => setData({ ...data, grid: { ...data.grid, spacingPct: Number(e.target.value) } })} className="w-full" />
          </label>
          <label className="block text-sm">Opacidade: {Math.round(data.grid.opacity * 100)}%
            <input type="range" min={0.1} max={0.9} step={0.05} value={data.grid.opacity} onChange={(e) => setData({ ...data, grid: { ...data.grid, opacity: Number(e.target.value) } })} className="w-full" />
          </label>
          <label className="block text-sm">Contraste
            <select value={data.grid.contrast} onChange={(e) => setData({ ...data, grid: { ...data.grid, contrast: e.target.value as "claro" | "escuro" } })} className="mt-1 block min-h-[36px] w-full rounded border border-white/15 bg-[#0f1418] px-2">
              <option value="claro">Linhas claras</option>
              <option value="escuro">Linhas escuras</option>
            </select>
          </label>
          <p className="text-xs text-[#b7c4c9]">A grade ajustada não elimina inclinação da câmera nem distorção de perspectiva.</p>
        </section>

        <section className="mb-3 space-y-2" aria-labelledby="medidas-titulo">
          <h3 id="medidas-titulo" className="text-sm font-semibold">Medidas e observações</h3>
          <p className="text-xs text-[#b7c4c9]">Calibração: {data.calibration && data.calibration.lengthCm > 0 ? `registrada (${data.calibration.lengthCm} cm)` : "não registrada — distâncias em pixels"}.</p>
          <ul className="space-y-1.5" aria-live="polite">
            {measurements.map((m) => (
              <li key={m.methodId} className="rounded-lg border border-white/10 p-2 text-sm">
                <div className="flex justify-between gap-2"><span>{m.label}</span><span className="tabular font-bold">{m.value === null ? "—" : m.short}</span></div>
                <p className="text-xs text-[#b7c4c9]">{m.missing ?? `Diferença observada: ${m.reading.toLocaleLowerCase("pt-BR")}`}</p>
                <details className="text-xs text-[#b7c4c9]"><summary className="cursor-pointer">Como é medido</summary>{m.definition}</details>
              </li>
            ))}
          </ul>
          <p className="rounded-lg bg-white/5 p-2 text-xs">{POSTURE_NOTE}</p>
        </section>

        <section className="mb-3 space-y-2">
          <h3 className="text-sm font-semibold">Qualidade e comparabilidade</h3>
          <label className="block text-sm">Enquadramento
            <select value={data.quality.framing} onChange={(e) => commit({ ...data, quality: { ...data.quality, framing: e.target.value as AnnotationData["quality"]["framing"] } })} className="mt-1 block min-h-[36px] w-full rounded border border-white/15 bg-[#0f1418] px-2">
              <option value="corpo inteiro">Corpo inteiro</option>
              <option value="cortada">Cortada</option>
            </select>
          </label>
          <label className="block text-sm">Câmera
            <select value={data.quality.cameraLevel} onChange={(e) => commit({ ...data, quality: { ...data.quality, cameraLevel: e.target.value as AnnotationData["quality"]["cameraLevel"] } })} className="mt-1 block min-h-[36px] w-full rounded border border-white/15 bg-[#0f1418] px-2">
              <option value="não verificado">Nivelamento não verificado</option>
              <option value="nivelada">Nivelada</option>
              <option value="inclinada">Inclinada</option>
            </select>
          </label>
          <label className="block text-sm">Observações sobre a foto
            <textarea value={data.quality.notes} onChange={(e) => setData({ ...data, quality: { ...data.quality, notes: e.target.value } })} className="mt-1 block min-h-[60px] w-full rounded border border-white/15 bg-[#0f1418] p-2" />
          </label>
        </section>

        {error && <ErrorNote>{error}</ErrorNote>}
        {conflict && (
          <div role="alert" className="mb-2 space-y-2 rounded-lg border border-[#ff9d6f]/50 bg-[#ff9d6f]/10 p-3 text-sm">
            <p>{conflict.authorName || "Outra pessoa"} salvou a versão {conflict.version} desta marcação enquanto você editava. Nada foi sobrescrito.</p>
            <div className="flex flex-wrap gap-2">
              <DarkBtn onClick={() => { setData(conflict.data); setBaseVersion(conflict.version); setConflict(null); setDirty(false); }}>Abrir a versão {conflict.version}</DarkBtn>
              <DarkBtn onClick={() => save(conflict.version)}>Salvar a minha como versão {conflict.version + 1}</DarkBtn>
            </div>
          </div>
        )}
        <div className="sticky bottom-0 flex flex-wrap items-center gap-2 bg-[#161d22] pt-2">
          <Button onClick={() => save(baseVersion)} disabled={status === "saving" || !dirty}>{status === "saving" ? "Salvando…" : "Salvar nova versão"}</Button>
          <Button variant="ghost" onClick={() => { if (window.confirm("Limpar todas as marcações desta foto? Você ainda pode desfazer.")) commit(emptyAnnotation()); }}>Limpar</Button>
          <span className="text-xs text-[#b7c4c9]" role="status">{status === "saved" ? "Salvo." : dirty ? "Alterações não salvas." : versions.length ? `${versions.length} versão(ões) salvas.` : ""}</span>
        </div>
      </aside>
    </div>
  );
}

function IconBtn({ label, onClick, children, disabled }: { label: string; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/20 bg-black/55 text-white hover:bg-black/75 disabled:opacity-40">
      {children}
    </button>
  );
}

function DarkBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="min-h-[40px] rounded-lg border border-white/20 px-3 text-sm font-semibold hover:bg-white/10">
      {children}
    </button>
  );
}

function RefLineSvg({ a, b, color, w, extend, label, px }: { a: Pt; b: Pt; color: string; w: number; extend: number; label: string; px: (n: number) => number }) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const E = extend * 2;
  return (
    <g>
      <line x1={a.x - ux * E} y1={a.y - uy * E} x2={b.x + ux * E} y2={b.y + uy * E} stroke={color} strokeWidth={w} strokeDasharray={`${px(10)} ${px(6)}`} />
      <circle cx={a.x} cy={a.y} r={px(4)} fill={color} />
      <circle cx={b.x} cy={b.y} r={px(4)} fill={color} />
      <text x={b.x + px(8)} y={b.y} fontSize={px(12)} fill={color} paintOrder="stroke" stroke="#0b1620" strokeWidth={px(3)}>{label}</text>
    </g>
  );
}
