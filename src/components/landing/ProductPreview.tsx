"use client";

import React, { useRef, useState } from "react";
import { BodyMapFigure } from "@/components/assessment/AnatomyMap";
import { Bars } from "@/components/charts/Charts";
import { aggregateMonthlyVolume, formatKgPtBR } from "@/lib/volume";
import type { DemoCase } from "@/lib/landing/demo-case";

const TABS = [
  { id: "avaliacao", label: "Avaliação" },
  { id: "treino", label: "Treino" },
  { id: "evolucao", label: "Evolução" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const MONTH_LABEL = (ym: string) =>
  new Date(`${ym}-15T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
const DATE_LABEL = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

/**
 * Demonstração principal da landing: um caso fictício em três abas, com os mesmos
 * componentes e cálculos do app. Os dados chegam prontos do servidor (buildDemoCase),
 * então o catálogo de exercícios não entra no JavaScript da landing.
 * Os dados de demonstração têm a região registrada em AL-0157 e o treino/execuções em
 * AL-0142, por isso cada aba mostra o código do caso que exibe.
 */
export default function ProductPreview({ demo }: { demo: DemoCase }) {
  const [tab, setTab] = useState<TabId>("avaliacao");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: React.KeyboardEvent, i: number) => {
    let n: number;
    if (e.key === "ArrowRight") n = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft") n = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = TABS.length - 1;
    else return;
    e.preventDefault();
    setTab(TABS[n].id);
    tabRefs.current[n]?.focus();
  };

  return (
    <div className="preview-rim preview-enter rounded-[24px] p-1.5 sm:p-2">
      <div className="overflow-hidden rounded-[18px] border border-theme-border bg-theme-primary text-theme-text">
        <div className="flex flex-col gap-3 border-b border-theme-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 id="caso-demonstrativo" className="text-base font-bold">Caso demonstrativo</h2>
            <span className="text-sm text-theme-muted">Dados fictícios de demonstração</span>
          </div>
          <div role="tablist" aria-labelledby="caso-demonstrativo" className="glass-soft grid grid-cols-3 gap-1 rounded-control border border-theme-border bg-theme-secondary p-1 sm:inline-grid">
            {TABS.map((t, i) => (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                id={`demo-tab-${t.id}`}
                role="tab"
                type="button"
                aria-selected={tab === t.id}
                aria-controls={`demo-panel-${t.id}`}
                tabIndex={tab === t.id ? 0 : -1}
                onClick={() => setTab(t.id)}
                onKeyDown={(e) => onKey(e, i)}
                className={`min-h-[44px] rounded-lg px-3 text-[15px] font-semibold transition-colors sm:px-5 ${
                  tab === t.id ? "bg-theme-raised text-theme-text shadow-subtle" : "text-theme-muted hover:text-theme-text"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Altura reservada: trocar de aba não faz a página pular */}
        <div
          key={tab}
          id={`demo-panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`demo-tab-${tab}`}
          tabIndex={0}
          className="tab-fade min-h-[570px] p-4 focus-visible:-outline-offset-4 sm:min-h-[470px] sm:p-5"
        >
          {tab === "avaliacao" && <AvaliacaoPanel data={demo.avaliacao} />}
          {tab === "treino" && <TreinoPanel data={demo.treino} />}
          {tab === "evolucao" && <EvolucaoPanel data={demo.evolucao} />}
        </div>
      </div>
    </div>
  );
}

function CaseLine({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-theme-muted">{children}</p>;
}

function AvaliacaoPanel({ data }: { data: DemoCase["avaliacao"] }) {
  if (!data) return <p className="text-theme-muted">Nenhuma região registrada nas avaliações de demonstração.</p>;
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 sm:gap-8">
      <figure className="w-[112px] sm:w-[148px]">
        <BodyMapFigure view="posterior" selected={data.selectedRegions} symptoms={data.symptoms} />
        <figcaption className="mt-1.5 text-xs leading-snug text-theme-muted">Costas — o lado direito da pessoa aparece à sua direita (D)</figcaption>
      </figure>
      <div className="min-w-0">
        <CaseLine>
          {data.code} · avaliação de {DATE_LABEL(data.date)}
        </CaseLine>
        <p className="mt-3 text-sm font-semibold text-theme-muted">Região registrada</p>
        <h3 className="text-2xl font-bold tracking-tight">{data.regionLabel}</h3>
        {data.summary && <p className="mt-2 max-w-prose text-[15px] text-theme-muted">{data.summary}</p>}
        <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 sm:gap-x-6">
          {data.facts.map(([k, v]) => (
            <div key={k} className="border-t border-theme-border pt-2">
              <dt className="text-sm text-theme-muted">{k}</dt>
              <dd className="tabular font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-theme-muted">Esquema vetorial provisório dos grupos musculares superficiais. Não é ilustração anatômica validada.</p>
      </div>
    </div>
  );
}

function TreinoPanel({ data }: { data: DemoCase["treino"] }) {
  if (!data) return <p className="text-theme-muted">Nenhum treino publicado nos dados de demonstração.</p>;
  return (
    <div>
      <CaseLine>
        {data.code} · {data.title} · Sessão {data.session}
      </CaseLine>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[460px] text-left text-[15px]">
          <caption className="sr-only">Exercícios da sessão {data.session}, com séries, repetições e carga</caption>
          <thead className="text-sm text-theme-muted">
            <tr className="border-b border-theme-border">
              <th scope="col" className="py-2 pr-3 font-semibold">Exercício</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">Séries</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">Repetições</th>
              <th scope="col" className="py-2 font-semibold">Carga</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-theme-border">
            {data.rows.map((r) => (
              <tr key={r.id}>
                <th scope="row" className="py-3 pr-3 font-semibold">{r.name}</th>
                <td className="tabular py-3 pr-3 text-right">{r.sets}</td>
                <td className="tabular py-3 pr-3 text-right">{r.reps}</td>
                <td className="tabular py-3">{r.load}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-theme-muted">O aluno vê só o treino aprovado e registra o que fez.</p>
    </div>
  );
}

function EvolucaoPanel({ data }: { data: DemoCase["evolucao"] }) {
  const [month, setMonth] = useState(data?.months.at(-1) ?? "");
  if (!data || data.months.length === 0) return <p className="text-theme-muted">Nenhuma execução registrada nos dados de demonstração.</p>;
  const vol = aggregateMonthlyVolume(data.records, month);
  return (
    <div>
      <CaseLine>{data.code} · execuções registradas pelo aluno</CaseLine>
      <div className="mb-4 mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-theme-muted">Total do mês</p>
          <p className="tabular text-3xl font-bold tracking-tight">
            {formatKgPtBR(vol.totalVolumeKg)} <span className="text-lg font-semibold text-theme-muted">kg</span>
          </p>
        </div>
        <div className="w-full max-w-[220px]">
          <label htmlFor="lp-mes" className="mb-1 block text-sm font-semibold">Mês</label>
          <select
            id="lp-mes"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="min-h-[44px] w-full rounded-control border border-theme-boundary/70 bg-theme-raised px-3 text-[15px] focus:border-theme-teal focus:outline-hidden focus:ring-2 focus:ring-theme-teal/25"
          >
            {data.months.map((m) => (
              <option key={m} value={m}>{MONTH_LABEL(m)}</option>
            ))}
          </select>
        </div>
      </div>
      <Bars
        label={`Volume de carga externa por semana (${MONTH_LABEL(month)})`}
        unit="kg"
        bars={vol.weeks.map((w) => ({ label: `Sem. ${w.weekIndex}`, sub: w.isPartial ? "parcial" : "", value: w.completedSetsCount === 0 ? null : w.volumeKg, note: w.isPartial ? "semana parcial" : "" }))}
      />
    </div>
  );
}
