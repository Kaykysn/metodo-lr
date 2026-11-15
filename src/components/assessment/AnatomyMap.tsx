"use client";

import React, { useId, useMemo, useRef, useState } from "react";
import { Minus, Plus, Crosshair } from "lucide-react";
import { BODY_REGIONS_V2, REGION_BY_ID, sideTag, type RegionDef, type View } from "@/lib/domain/body-regions";
import { ANATOMY_ASSETS, ANATOMY_VIEWBOX } from "@/lib/domain/anatomy-assets";
import type { FreeMark, SymptomEntry } from "@/lib/domain/types";

const W = ANATOMY_VIEWBOX.w;
const H = ANATOMY_VIEWBOX.h;

// Meia silhueta (lado esquerdo da tela) espelhada para o outro lado.
const HALF_BODY =
  "M200 150 L182 150 C170 158 150 162 128 170 C108 178 100 200 98 230 L92 360 C88 410 84 450 80 500 C78 530 72 548 74 566 C80 576 96 574 100 560 L106 500 C110 450 116 410 122 362 L132 250 C136 300 146 330 150 360 C152 400 144 425 138 452 C134 520 140 610 150 700 C156 780 162 860 166 920 C160 945 148 962 152 976 L196 976 C198 950 192 935 190 920 C192 850 190 780 186 700 C190 620 196 560 200 505 Z";

// Grupos musculares superficiais — ESQUEMA, não atlas.
const MUSCLES: Record<View, { d: string; tendon?: boolean }[]> = {
  anterior: [
    { d: "M200 185 C175 182 150 188 136 205 C138 235 160 250 200 248 Z" }, // peitoral maior
    { d: "M128 172 C110 182 104 205 108 232 C120 222 132 208 140 196 Z" }, // deltoide
    { d: "M110 240 C104 280 104 320 112 350 C120 330 124 290 122 248 Z" }, // bíceps
    { d: "M100 372 C94 420 92 460 94 495 L104 495 C110 460 114 420 116 372 Z" }, // flexores do antebraço
    { d: "M200 255 L178 258 L176 300 L200 300 Z" }, // reto do abdômen
    { d: "M200 305 L176 305 L175 350 L200 350 Z" },
    { d: "M200 355 L175 355 L178 430 C186 440 194 446 200 448 Z" },
    { d: "M172 262 C158 270 148 300 150 358 C156 388 164 408 172 420 Z" }, // oblíquo externo
    { d: "M150 470 C142 540 146 620 160 690 C170 690 180 688 186 684 C188 610 186 540 178 490 Z" }, // quadríceps
    { d: "M196 512 C186 540 182 580 184 622 C190 590 196 560 200 522 Z" }, // adutores
    { d: "M160 740 C158 800 160 860 166 905 L174 905 C172 860 172 800 172 745 Z" }, // tibial anterior
    { d: "M178 742 C186 790 188 840 184 880 C180 840 178 790 176 746 Z" }, // gastrocnêmio (medial)
    { d: "M168 693 m-10 0 a10 12 0 1 0 20 0 a10 12 0 1 0 -20 0", tendon: true }, // patela
  ],
  posterior: [
    { d: "M200 135 C190 150 160 165 130 172 C150 190 175 215 200 292 Z" }, // trapézio
    { d: "M128 172 C110 182 104 205 108 232 C120 222 132 208 140 196 Z" }, // deltoide
    { d: "M100 238 C96 280 98 320 106 352 C114 330 118 290 116 244 Z" }, // tríceps
    { d: "M100 372 C94 420 92 460 94 495 L104 495 C110 460 114 420 116 372 Z" }, // extensores do antebraço
    { d: "M140 230 C140 280 150 330 160 380 C176 370 190 340 200 322 L200 296 C180 262 160 242 140 230 Z" }, // latíssimo do dorso
    { d: "M200 302 L186 307 C184 350 186 400 190 430 L200 432 Z" }, // eretores (região lombar)
    { d: "M200 440 C180 435 150 445 142 470 C140 500 150 525 175 530 C188 528 196 522 200 515 Z" }, // glúteo máximo
    { d: "M150 540 C146 600 154 660 166 700 L184 700 C188 650 188 600 182 545 Z" }, // isquiotibiais
    { d: "M156 730 C150 770 152 820 164 850 C174 845 184 820 186 780 C186 760 182 740 176 728 Z" }, // gastrocnêmio
    { d: "M168 858 L170 920 L180 920 L178 858 Z", tendon: true }, // tendão do calcâneo
  ],
};

function Figure({ view, idPrefix }: { view: View; idPrefix: string }) {
  const asset = ANATOMY_ASSETS[view];
  if (asset) {
    return <image href={asset.src} x={0} y={0} width={W} height={H} preserveAspectRatio="xMidYMid meet" />;
  }
  const half = (
    <g>
      <path d={HALF_BODY} style={{ fill: `url(#${idPrefix}-skin)`, stroke: "rgb(var(--map-body-stroke))" }} strokeWidth={1.5} />
      {MUSCLES[view].map((m, i) => (
        <path
          key={i}
          d={m.d}
          style={{ fill: m.tendon ? "rgb(var(--surface-raised))" : "rgb(var(--map-muscle) / 0.55)", stroke: "rgb(var(--map-muscle-line) / 0.7)" }}
          strokeWidth={1}
        />
      ))}
    </g>
  );
  return (
    <g>
      <defs>
        <linearGradient id={`${idPrefix}-skin`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: "rgb(var(--map-body-from))" }} />
          <stop offset="100%" style={{ stopColor: "rgb(var(--map-body-to))" }} />
        </linearGradient>
      </defs>
      <ellipse cx={200} cy={70} rx={40} ry={50} style={{ fill: `url(#${idPrefix}-skin)`, stroke: "rgb(var(--map-body-stroke))" }} strokeWidth={1.5} />
      {half}
      <g transform={`translate(${W} 0) scale(-1 1)`}>{half}</g>
    </g>
  );
}

export interface AnatomyMapProps {
  selected: string[];
  symptoms: SymptomEntry[];
  freeMarks: FreeMark[];
  onToggleRegion: (id: string) => void;
  onAddFreeMark?: (m: Omit<FreeMark, "id" | "note">) => void;
  readOnly?: boolean;
  /** Papel muscular por região (fichas de exercício). Substitui seleção e sintomas na renderização. */
  roles?: Record<string, RegionRole>;
}

export type RegionRole = "primary" | "secondary" | "stabilizer";
const ROLE_TEXT: Record<RegionRole, string> = { primary: "músculo principal", secondary: "músculo secundário", stabilizer: "estabilizador" };

function regionState(id: string, selected: string[], symptoms: SymptomEntry[]) {
  const s = symptoms.find((x) => x.regionId === id);
  if (s && s.intensity !== null) return { kind: "symptom" as const, intensity: s.intensity };
  if (s || selected.includes(id)) return { kind: "selected" as const, intensity: null };
  return { kind: "none" as const, intensity: null };
}

function MapCanvas({ view, zoom, props, markMode, onMark }: { view: View; zoom: number; props: AnatomyMapProps; markMode: boolean; onMark: (x: number, y: number) => void }) {
  const idp = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const regions = BODY_REGIONS_V2.filter((r) => r.at[view]);

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!markMode || !svgRef.current) return;
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return;
    const p = pt.matrixTransform(ctm.inverse());
    if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) return;
    onMark(p.x / W, p.y / H);
  };

  return (
    <div className="relative overflow-auto rounded-panel border border-theme-border bg-[#021226] shadow-inner" style={{ maxHeight: 560 }}>
      {/* Espaço reservado: a proporção é a do viewBox, sem salto de layout */}
      <div style={{ width: `${zoom * 100}%`, minWidth: "100%" }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className={`block h-auto w-full select-none ${markMode ? "cursor-crosshair" : ""}`}
          role="group"
          aria-label={`Mapa corporal — vista ${view === "anterior" ? "de frente" : "de costas"}`}
          onClick={handleClick}
        >
          <Figure view={view} idPrefix={`${idp}-${view}`} />
          {/* Orientação D/E com o significado da pessoa avaliada */}
          <g aria-hidden="true" style={{ fill: "#76D7BE", opacity: 0.85 }} fontSize={24} fontWeight={800}>
            <text x={24} y={48}>{view === "anterior" ? "D" : "E"}</text>
            <text x={W - 42} y={48}>{view === "anterior" ? "E" : "D"}</text>
          </g>
          {regions.map((r) => {
            const at = r.at[view]!;
            const cx = at.x * W;
            const cy = at.y * H;
            const rad = at.r * H;
            if (props.roles) {
              const role = props.roles[r.id];
              if (!role) return <circle key={r.id} cx={cx} cy={cy} r={5} aria-hidden="true" style={{ fill: "rgb(var(--map-dot) / 0.25)" }} />;
              return (
                <g key={r.id} role="img" aria-label={`${r.label}: ${ROLE_TEXT[role]}`}>
                  <title>{`${r.label}: ${ROLE_TEXT[role]}`}</title>
                  {role === "primary" && <circle cx={cx} cy={cy} r={rad} style={{ fill: "rgb(var(--accent-teal) / 0.55)", stroke: "rgb(var(--accent-teal))" }} strokeWidth={3} />}
                  {role === "secondary" && <circle cx={cx} cy={cy} r={rad * 0.85} style={{ fill: "rgb(var(--accent-teal) / 0.18)", stroke: "rgb(var(--accent-teal))" }} strokeWidth={2.5} strokeDasharray="7 5" />}
                  {role === "stabilizer" && <circle cx={cx} cy={cy} r={rad * 0.7} style={{ fill: "none", stroke: "rgb(var(--text-secondary))" }} strokeWidth={2.5} strokeDasharray="2 5" strokeLinecap="round" />}
                </g>
              );
            }
            const st = regionState(r.id, props.selected, props.symptoms);
            const label = `${r.label}: ${st.kind === "symptom" ? `sintoma ${st.intensity}/10` : st.kind === "selected" ? "selecionada, intensidade não informada" : "não selecionada"}`;
            return (
              <g
                key={r.id}
                role="button"
                tabIndex={props.readOnly || markMode ? -1 : 0}
                aria-pressed={st.kind !== "none"}
                aria-label={label}
                className="body-map-spot cursor-pointer"
                onClick={(e) => {
                  if (markMode) return;
                  e.stopPropagation();
                  if (!props.readOnly) props.onToggleRegion(r.id);
                }}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && !props.readOnly) {
                    e.preventDefault();
                    props.onToggleRegion(r.id);
                  }
                }}
              >
                <title>{label}</title>
                <circle cx={cx} cy={cy} r={Math.max(rad, 22)} fill="transparent" />
                <circle className="body-map-focus" cx={cx} cy={cy} r={rad + 7} fill="none" strokeWidth={3} />
                {st.kind === "none" && (
                  <g>
                    <circle cx={cx} cy={cy} r={8} style={{ fill: "rgba(255, 255, 255, 0.45)", stroke: "#021226" }} strokeWidth={2} />
                    <circle cx={cx} cy={cy} r={3} style={{ fill: "#021226" }} />
                  </g>
                )}
                {st.kind === "selected" && (
                  <g>
                    <circle cx={cx} cy={cy} r={rad} style={{ fill: "rgba(118, 215, 190, 0.32)", stroke: "#76D7BE" }} strokeWidth={2.5} strokeDasharray="6 4" />
                    <circle cx={cx} cy={cy} r={8.5} style={{ fill: "#76D7BE", stroke: "#021226" }} strokeWidth={2} />
                  </g>
                )}
                {st.kind === "symptom" && (
                  <g>
                    <circle cx={cx} cy={cy} r={rad} style={{ fill: "rgba(240, 110, 100, 0.35)", stroke: "rgb(var(--symptom))" }} strokeWidth={2.5} />
                    <circle cx={cx} cy={cy} r={14} style={{ fill: "#ffffff", stroke: "rgb(var(--symptom))" }} strokeWidth={2.5} />
                    <text x={cx} y={cy + 5} textAnchor="middle" fontSize={15} fontWeight={800} style={{ fill: "#021226" }}>
                      {st.intensity}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
          {props.freeMarks.filter((m) => m.view === view).map((m, i) => (
            <g key={m.id} aria-label={`Marcação livre ${i + 1}`}>
              <path d={`M${m.x * W - 9} ${m.y * H} L${m.x * W + 9} ${m.y * H} M${m.x * W} ${m.y * H - 9} L${m.x * W} ${m.y * H + 9}`} style={{ stroke: "rgb(var(--symptom))" }} strokeWidth={3} strokeLinecap="round" />
              <text x={m.x * W + 11} y={m.y * H - 8} fontSize={14} fontWeight={700} style={{ fill: "rgb(var(--text-primary))" }}>{i + 1}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

export default function AnatomyMap(props: AnatomyMapProps) {
  const [view, setView] = useState<View>("anterior");
  const [zoom, setZoom] = useState(1);
  const [markMode, setMarkMode] = useState(false);
  const usingSchematic = !ANATOMY_ASSETS.anterior || !ANATOMY_ASSETS.posterior;

  const grouped = useMemo(() => {
    const g = new Map<string, RegionDef[]>();
    for (const r of BODY_REGIONS_V2) g.set(r.group, [...(g.get(r.group) ?? []), r]);
    return Array.from(g.entries());
  }, []);

  const mark = (v: View) => (x: number, y: number) => {
    props.onAddFreeMark?.({ view: v, x, y });
    setMarkMode(false);
  };

  return (
    <div className="space-y-4">
      {usingSchematic && (
        <p className="rounded-control border border-status-caution-border bg-status-caution-bg px-3 py-2 text-sm text-status-caution-fg">
          Esquema vetorial provisório dos grupos musculares superficiais. Não é ilustração anatômica validada; a arte realista revisada ainda não foi incorporada.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Vista do mapa" className="inline-flex rounded-control border border-theme-border bg-theme-secondary p-1 xl:hidden">
          {(["anterior", "posterior"] as View[]).map((v) => (
            <button
              key={v}
              role="tab"
              type="button"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`min-h-[40px] rounded-lg px-4 text-sm font-semibold ${view === v ? "bg-theme-raised text-theme-text shadow-subtle" : "text-theme-muted"}`}
            >
              {v === "anterior" ? "Frente" : "Costas"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Diminuir zoom" disabled={zoom <= 1} onClick={() => setZoom((z) => Math.max(1, +(z - 0.5).toFixed(1)))} className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-theme-border disabled:opacity-40">
            <Minus className="h-4 w-4" />
          </button>
          <span className="tabular w-12 text-center text-sm text-theme-muted" aria-live="polite">{Math.round(zoom * 100)}%</span>
          <button type="button" aria-label="Aumentar zoom" disabled={zoom >= 2.5} onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.5).toFixed(1)))} className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-theme-border disabled:opacity-40">
            <Plus className="h-4 w-4" />
          </button>
          {props.onAddFreeMark && !props.readOnly && (
            <button
              type="button"
              aria-pressed={markMode}
              onClick={() => setMarkMode((m) => !m)}
              className={`ml-1 inline-flex min-h-[40px] items-center gap-1.5 rounded-control border px-3 text-sm font-semibold ${markMode ? "border-theme-teal bg-theme-teal-subtle" : "border-theme-border"}`}
            >
              <Crosshair className="h-4 w-4" aria-hidden="true" />
              {markMode ? "Toque no ponto do corpo" : "Marcação livre"}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {(["anterior", "posterior"] as View[]).map((v) => (
          <figure key={v} className={v === view ? "block" : "hidden xl:block"}>
            <MapCanvas view={v} zoom={zoom} props={props} markMode={markMode} onMark={mark(v)} />
            <figcaption className="mt-1.5 text-center text-sm text-theme-muted">
              {v === "anterior" ? "Frente — o lado direito da pessoa aparece à sua esquerda (D)" : "Costas — o lado direito da pessoa aparece à sua direita (D)"}
            </figcaption>
          </figure>
        ))}
      </div>

      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-theme-muted" aria-label="Legenda do mapa">
        <li className="flex items-center gap-2"><span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-dashed border-theme-teal bg-theme-teal/15" aria-hidden="true" /> Região selecionada, intensidade não informada</li>
        <li className="flex items-center gap-2"><span className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-symptom text-[11px] font-bold text-theme-text" aria-hidden="true">4</span> Sintoma relatado com intensidade (0–10)</li>
        <li className="flex items-center gap-2"><Crosshair className="h-4 w-4 text-symptom" aria-hidden="true" /> Marcação livre numerada</li>
      </ul>

      {/* Lista equivalente, operável por teclado e leitor de tela */}
      <details className="rounded-panel border border-theme-border bg-theme-primary">
        <summary className="cursor-pointer px-4 py-3 text-[15px] font-semibold">Selecionar regiões pela lista ({props.selected.length} selecionada{props.selected.length === 1 ? "" : "s"})</summary>
        <div className="grid gap-4 border-t border-theme-border p-4 sm:grid-cols-2 lg:grid-cols-3">
          {grouped.map(([group, regs]) => (
            <fieldset key={group}>
              <legend className="mb-1 text-sm font-semibold capitalize text-theme-text">{group}</legend>
              {regs.map((r) => (
                <label key={r.id} className="flex min-h-[36px] items-center gap-2 text-[15px]">
                  <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--accent-teal))]" checked={props.selected.includes(r.id)} disabled={props.readOnly} onChange={() => props.onToggleRegion(r.id)} />
                  {r.label}
                  {r.side !== "midline" && <span className="text-[13px] text-theme-muted">({sideTag(r.side)})</span>}
                </label>
              ))}
            </fieldset>
          ))}
        </div>
      </details>
    </div>
  );
}

/** Uma vista do mapa, só leitura (prévias e resumos). Mesmo desenho e marcações do mapa completo. */
export function BodyMapFigure({ view, selected, symptoms, roles }: { view: View; selected: string[]; symptoms: SymptomEntry[]; roles?: Record<string, RegionRole> }) {
  const noop = () => {};
  return (
    <MapCanvas
      view={view}
      zoom={1}
      props={{ selected, symptoms, freeMarks: [], onToggleRegion: noop, readOnly: true, roles }}
      markMode={false}
      onMark={noop}
    />
  );
}

export function regionLabel(id: string) {
  return REGION_BY_ID.get(id)?.label ?? id;
}
