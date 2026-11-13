"use client";

import React, { useState } from "react";
import { formatDateBR } from "@/components/ui/primitives";

export interface Point {
  date: string; // YYYY-MM-DD
  value: number;
  context?: string;
}

/** Linha temporal com escala Y fixa (ex.: 0–10) e eixo X em datas reais.
 *  Pontos ausentes não são inventados: a linha liga só medições existentes, tracejada. */
export function TimeLine({ points, yMin, yMax, unit, label, color = "rgb(var(--chart-line))", height = 220 }: { points: Point[]; yMin: number; yMax: number; unit: string; label: string; color?: string; height?: number }) {
  const [table, setTable] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = height, P = { l: 40, r: 16, t: 16, b: 34 };
  if (!points.length) return <p className="py-6 text-[15px] text-theme-muted">Sem medições registradas neste período. Ausência de dado não é zero.</p>;
  const ts = points.map((p) => new Date(`${p.date}T12:00:00`).getTime());
  const t0 = Math.min(...ts), t1 = Math.max(...ts);
  const x = (t: number) => P.l + (t1 === t0 ? (W - P.l - P.r) / 2 : ((t - t0) / (t1 - t0)) * (W - P.l - P.r));
  const y = (v: number) => H - P.b - ((v - yMin) / (yMax - yMin)) * (H - P.t - P.b);
  const ticks = Array.from({ length: 6 }, (_, i) => yMin + ((yMax - yMin) * i) / 5);
  return (
    <figure className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <figcaption className="font-semibold">{label}</figcaption>
        <button type="button" className="text-sm font-semibold text-theme-teal underline" onClick={() => setTable((v) => !v)}>{table ? "Ver gráfico" : "Ver tabela"}</button>
      </div>
      {table ? (
        <table className="w-full text-left text-[15px]">
          <thead className="text-sm text-theme-muted"><tr><th scope="col">Data</th><th scope="col" className="text-right">Valor ({unit})</th><th scope="col">Contexto</th></tr></thead>
          <tbody className="divide-y divide-theme-border">{points.map((p, i) => <tr key={i}><td className="tabular py-1.5">{formatDateBR(p.date)}</td><td className="tabular py-1.5 text-right">{p.value.toLocaleString("pt-BR")}</td><td className="py-1.5 text-theme-muted">{p.context ?? "—"}</td></tr>)}</tbody>
        </table>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${label}: ${points.length} medições de ${formatDateBR(points[0].date)} a ${formatDateBR(points[points.length - 1].date)}. Use "Ver tabela" para os valores.`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} style={{ stroke: "rgb(var(--chart-grid))" }} strokeDasharray={t === yMin ? undefined : "3 4"} />
                <text x={P.l - 8} y={y(t) + 4} textAnchor="end" fontSize={12} className="tabular" style={{ fill: "rgb(var(--text-secondary))" }}>{Number.isInteger(t) ? t : t.toFixed(1)}</text>
              </g>
            ))}
            <polyline points={points.map((p, i) => `${x(ts[i])},${y(p.value)}`).join(" ")} fill="none" style={{ stroke: color }} strokeWidth={2} strokeDasharray="5 4" />
            {points.map((p, i) => (
              <g key={i} tabIndex={0} role="button" aria-label={`${formatDateBR(p.date)}: ${p.value} ${unit}${p.context ? `, ${p.context}` : ""}`} onFocus={() => setHover(i)} onBlur={() => setHover(null)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className="body-map-spot">
                <circle cx={x(ts[i])} cy={y(p.value)} r={14} fill="transparent" />
                <circle cx={x(ts[i])} cy={y(p.value)} r={hover === i ? 7 : 5} style={{ fill: color, stroke: "rgb(var(--surface-primary))" }} strokeWidth={2} />
                <circle className="body-map-focus" cx={x(ts[i])} cy={y(p.value)} r={10} fill="none" strokeWidth={2} />
              </g>
            ))}
            <text x={P.l} y={H - 8} fontSize={12} style={{ fill: "rgb(var(--text-secondary))" }}>{formatDateBR(points[0].date)}</text>
            <text x={W - P.r} y={H - 8} fontSize={12} textAnchor="end" style={{ fill: "rgb(var(--text-secondary))" }}>{formatDateBR(points[points.length - 1].date)}</text>
          </svg>
          {hover !== null && (
            <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-control border border-theme-border bg-theme-raised px-3 py-1.5 text-sm shadow-card" role="status">
              <strong className="tabular">{points[hover].value.toLocaleString("pt-BR")} {unit}</strong> · {formatDateBR(points[hover].date)}
              {points[hover].context && <span className="block text-theme-muted">{points[hover].context}</span>}
            </div>
          )}
        </div>
      )}
    </figure>
  );
}

export interface Bar {
  label: string;
  sub?: string;
  value: number | null; // null = sem registro (≠ 0)
  note?: string;
}

/** Barras com base zero comum; null aparece como "—" (sem registro). */
export function Bars({ bars, unit, label }: { bars: Bar[]; unit: string; label: string }) {
  const [table, setTable] = useState(false);
  const max = Math.max(1, ...bars.map((b) => b.value ?? 0));
  return (
    <figure className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <figcaption className="font-semibold">{label}</figcaption>
        <button type="button" className="text-sm font-semibold text-theme-teal underline" onClick={() => setTable((v) => !v)}>{table ? "Ver gráfico" : "Ver tabela"}</button>
      </div>
      {table ? (
        <table className="w-full text-left text-[15px]">
          <thead className="text-sm text-theme-muted"><tr><th scope="col">Período</th><th scope="col" className="text-right">Valor ({unit})</th><th scope="col">Observação</th></tr></thead>
          <tbody className="divide-y divide-theme-border">{bars.map((b) => <tr key={b.label}><td className="py-1.5">{b.label} {b.sub && <span className="text-theme-muted">{b.sub}</span>}</td><td className="tabular py-1.5 text-right">{b.value === null ? "sem registro" : b.value.toLocaleString("pt-BR")}</td><td className="py-1.5 text-theme-muted">{b.note ?? ""}</td></tr>)}</tbody>
        </table>
      ) : (
        <ul className="flex h-56 items-end gap-3 border-b border-chart-zero px-1" aria-label={label}>
          {bars.map((b) => (
            <li key={b.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1" aria-label={`${b.label}: ${b.value === null ? "sem registro" : `${b.value.toLocaleString("pt-BR")} ${unit}`}`}>
              <span className="tabular text-xs font-semibold">{b.value === null ? "—" : b.value.toLocaleString("pt-BR")}</span>
              <span className="block w-full max-w-[64px] rounded-t-md bg-chart-bar" style={{ height: `${((b.value ?? 0) / max) * 85}%` }} />
            </li>
          ))}
        </ul>
      )}
      {!table && (
        <div className="flex gap-3 px-1" aria-hidden="true">
          {bars.map((b) => <div key={b.label} className="flex-1 text-center text-xs text-theme-muted"><span className="block font-semibold text-theme-text">{b.label}</span>{b.sub}</div>)}
        </div>
      )}
    </figure>
  );
}

/** Anel para proporção real (ex.: sessões concluídas / previstas), com denominador explícito. */
export function Ratio({ done, total, label }: { done: number; total: number; label: string }) {
  const pct = total > 0 ? Math.min(1, done / total) : 0;
  const r = 34, c = 2 * Math.PI * r;
  return (
    <figure className="flex items-center gap-4">
      <svg viewBox="0 0 80 80" width={88} height={88} aria-hidden="true">
        <circle cx={40} cy={40} r={r} fill="none" strokeWidth={8} style={{ stroke: "rgb(var(--chart-grid))" }} />
        <circle cx={40} cy={40} r={r} fill="none" strokeWidth={8} strokeLinecap="round" strokeDasharray={`${pct * c} ${c}`} transform="rotate(-90 40 40)" style={{ stroke: "rgb(var(--chart-bar))" }} />
      </svg>
      <figcaption>
        <p className="tabular text-2xl font-bold">{done} de {total}</p>
        <p className="text-sm text-theme-muted">{label}{total > 0 ? ` (${Math.round(pct * 100)}%)` : ""}</p>
      </figcaption>
    </figure>
  );
}
