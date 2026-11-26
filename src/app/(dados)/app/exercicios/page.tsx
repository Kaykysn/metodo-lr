"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  DIFFICULTIES,
  EQUIPMENT,
  EXERCISE_BY_ID,
  EXERCISES,
  MODALITIES,
  MUSCLE_OPTIONS,
  PATTERNS,
  searchExercises,
  type ExerciseQuery,
  type Modality,
  type MovementPattern,
  type PurposeFilter,
} from "@/lib/domain/exercise-library";
import { LATERALITY_LABEL, PURPOSE_LABEL, type Difficulty, type Laterality } from "@/lib/domain/exercise-catalog";
import { InfoNote, Panel, inputClass } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ui/PageHeader";
import ExerciseDetailView from "@/components/exercises/ExerciseDetailView";
import AddToPlan from "@/components/exercises/AddToPlan";
import CatalogBrowser from "@/components/catalog/CatalogBrowser";

const REGION_LABEL: Record<string, string> = {
  neck: "Pescoço",
  thoracic: "Coluna torácica",
  lumbar: "Coluna lombar",
  chest: "Peitoral",
  abdomen: "Abdome",
  shoulder: "Ombro",
  arm: "Braço",
  elbow: "Cotovelo",
  forearm: "Antebraço",
  wrist_hand: "Punho e mão",
  hip_groin: "Quadril e virilha",
  glute: "Glúteo",
  anterior_thigh: "Coxa anterior",
  posterior_thigh: "Coxa posterior",
  leg: "Perna (canela)",
  calf: "Panturrilha",
  ankle_foot: "Tornozelo e pé",
};
const REGIONS = Array.from(new Set(EXERCISES.flatMap((e) => e.regions))).sort((a, b) => (REGION_LABEL[a] ?? a).localeCompare(REGION_LABEL[b] ?? b, "pt-BR"));

const EMPTY: Required<ExerciseQuery> = { text: "", purpose: "", pattern: "", muscle: "", region: "", equipment: "", modality: "", laterality: "", difficulty: "" };

function readFicha(): string | null {
  if (typeof window === "undefined") return null;
  const id = new URLSearchParams(window.location.search).get("ficha");
  return id && EXERCISE_BY_ID.has(id) ? id : null;
}

type Fonte = "curadoria" | "catalogo";
const readFonte = (): Fonte => (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("fonte") === "catalogo" ? "catalogo" : "curadoria");

export default function ExerciciosPage() {
  const [fonte, setFonte] = useState<Fonte>("curadoria");
  useEffect(() => {
    setFonte(readFonte());
    const onPop = () => setFonte(readFonte());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const choose = (f: Fonte) => {
    setFonte(f);
    const url = new URL(window.location.href);
    url.search = f === "catalogo" ? "?fonte=catalogo" : "";
    window.history.pushState(null, "", url);
  };
  return (
    <div className="space-y-6">
      <PageHeader title="Biblioteca de exercícios" description="Repertório para seleção profissional. Estar cadastrado não é indicação para todos." />
      <div role="tablist" aria-label="Biblioteca" className="flex flex-wrap gap-2 border-b border-theme-border">
        {([["curadoria", "Curadoria do método"], ["catalogo", "Catálogo ampliado"]] as const).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={fonte === id}
            onClick={() => choose(id)}
            className={`-mb-px min-h-[44px] border-b-2 px-3 text-[15px] font-semibold transition-colors ${fonte === id ? "border-theme-teal text-theme-text" : "border-transparent text-theme-muted hover:text-theme-text"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {fonte === "catalogo" ? <CatalogBrowser /> : <CuratedLibrary />}
    </div>
  );
}

function CuratedLibrary() {
  const [q, setQ] = useState<Required<ExerciseQuery>>(EMPTY);
  const [selected, setSelected] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const results = useMemo(() => searchExercises(q), [q]);
  const set = (patch: Partial<ExerciseQuery>) => setQ((cur) => ({ ...cur, ...patch }) as Required<ExerciseQuery>);
  const activeFilters = Object.entries(q).filter(([k, v]) => k !== "purpose" && v).length;
  const activeMore = [q.pattern, q.equipment, q.laterality, q.difficulty, q.modality].filter(Boolean).length;
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setSelected(readFicha());
    const onPop = () => setSelected(readFicha());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const select = (id: string | null) => {
    setSelected(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("ficha", id);
    else url.searchParams.delete("ficha");
    window.history.pushState(null, "", url);
    if (id) requestAnimationFrame(() => detailRef.current?.focus({ preventScroll: window.innerWidth >= 1024 }));
  };

  const ex = selected ? EXERCISE_BY_ID.get(selected) : null;

  return (
    <div className="space-y-6">
      <InfoNote>
        O propósito de um exercício depende da pessoa, da progressão, da carga, da amplitude e do contexto clínico. As fichas descrevem contribuições musculares típicas e aguardam revisão editorial.
      </InfoNote>

      <div role="radiogroup" aria-label="Propósito" className="flex flex-wrap gap-2">
        {(["", "hipertrofia", "reabilitacao"] as PurposeFilter[]).map((p) => (
          <button
            key={p || "todos"}
            type="button"
            role="radio"
            aria-checked={q.purpose === p}
            onClick={() => set({ purpose: p })}
            className={`min-h-[44px] rounded-control border px-4 text-[15px] font-semibold transition-colors ${q.purpose === p ? "border-theme-teal bg-theme-teal-subtle text-theme-text" : "border-theme-border bg-theme-primary text-theme-muted hover:text-theme-text"}`}
          >
            {p ? PURPOSE_LABEL[p] : "Todos"}
          </button>
        ))}
      </div>

      <Panel className="space-y-2 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label htmlFor="q" className="mb-1 block text-sm font-semibold">Buscar</label>
          <input id="q" type="search" className={inputClass} value={q.text} onChange={(e) => set({ text: e.target.value })} placeholder="nome, apelido, nome em inglês ou músculo" />
        </div>
        <Select id="m" label="Músculo" value={q.muscle} onChange={(v) => set({ muscle: v })} options={MUSCLE_OPTIONS} />
        <Select id="r" label="Região do corpo" value={q.region} onChange={(v) => set({ region: v })} options={REGIONS.map((r) => ({ value: r, label: REGION_LABEL[r] ?? r }))} />
        </div>
        <details open={moreOpen} onToggle={(e) => setMoreOpen((e.target as HTMLDetailsElement).open)}>
          <summary className="inline-flex min-h-[44px] cursor-pointer items-center text-sm font-semibold text-theme-teal">
            Mais filtros{activeMore ? ` (${activeMore} ativo${activeMore > 1 ? "s" : ""})` : ""}
          </summary>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Select id="p" label="Padrão de movimento" value={q.pattern} onChange={(v) => set({ pattern: v as MovementPattern | "" })} options={PATTERNS.map((x) => ({ value: x, label: x }))} />
        <Select id="eq" label="Equipamento" value={q.equipment} onChange={(v) => set({ equipment: v })} options={EQUIPMENT.map((x) => ({ value: x, label: x }))} />
        <Select id="la" label="Execução" value={q.laterality} onChange={(v) => set({ laterality: v as Laterality | "" })} options={(Object.keys(LATERALITY_LABEL) as Laterality[]).map((x) => ({ value: x, label: LATERALITY_LABEL[x] }))} />
        <Select id="di" label="Dificuldade" value={q.difficulty} onChange={(v) => set({ difficulty: v as Difficulty | "" })} options={DIFFICULTIES.map((x) => ({ value: x, label: x }))} />
        <Select id="mo" label="Modalidade" value={q.modality} onChange={(v) => set({ modality: v as Modality | "" })} options={MODALITIES.map((x) => ({ value: x, label: x }))} />
          </div>
        </details>
        <div>
          <button type="button" disabled={!activeFilters} onClick={() => setQ({ ...EMPTY, purpose: q.purpose })} className="min-h-[44px] text-sm font-semibold text-theme-teal underline disabled:text-theme-muted disabled:no-underline">
            Limpar filtros
          </button>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
        <section aria-label="Resultados" className={ex ? "hidden lg:block" : ""}>
          <p className="mb-2 text-sm text-theme-muted" aria-live="polite">{results.length} exercício(s) encontrados</p>
          {results.length === 0 ? (
            <p className="rounded-panel border border-theme-border bg-theme-primary p-4 text-[15px]">Nenhum exercício com esses filtros. Remova um filtro ou busque por outro nome.</p>
          ) : (
            <ul className="divide-y divide-theme-border overflow-hidden rounded-panel border border-theme-border bg-theme-primary">
              {results.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => select(e.id)}
                    aria-current={selected === e.id ? "true" : undefined}
                    className={`flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors hover:bg-theme-secondary ${selected === e.id ? "bg-theme-teal-subtle" : ""}`}
                  >
                    <span className="font-semibold">{e.name}</span>
                    <span className="text-sm text-theme-muted">
                      {e.purposes.length ? e.purposes.map((p) => PURPOSE_LABEL[p]).join(" · ") : "Sem propósito definido"} · {e.primaryMuscles.join(", ")}
                    </span>
                    {!e.detail && <span className="text-xs text-theme-muted">Ficha detalhada pendente</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div ref={detailRef} tabIndex={-1} className="min-w-0 outline-hidden lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto">
          {ex ? (
            <Panel className="space-y-4 p-4 sm:p-6">
              <button type="button" onClick={() => select(null)} className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-theme-teal lg:hidden">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar à lista
              </button>
              <ExerciseDetailView key={ex.id} exercise={ex} onSelect={select} actions={<AddToPlan exercise={ex} />} />
            </Panel>
          ) : (
            <p className="hidden rounded-panel border border-dashed border-theme-border p-6 text-[15px] text-theme-muted lg:block">Escolha um exercício na lista para ver a ficha completa.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Select({ id, label, value, onChange, options }: { id: string; label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">{label}</label>
      <select id={id} className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Todos</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
