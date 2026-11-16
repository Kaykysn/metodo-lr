"use client";

import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { ErrorNote, Field, inputClass } from "@/components/ui/primitives";
import { getCatalogRepo, registerCatalogExercise } from "@/lib/catalog/bridge";
import { CATEGORY_PT, categoryPt, musclePt } from "@/lib/catalog/labels";
import { EMPTY_QUERY, type CatalogExercise, type CatalogQuery } from "@/lib/catalog/types";

/** Seleção compacta do catálogo ampliado dentro da montagem de treino. */
export default function CatalogPicker({ onPick, label }: { onPick: (id: string) => void; label: string }) {
  const [repo] = useState(getCatalogRepo);
  const [q, setQ] = useState<CatalogQuery>(EMPTY_QUERY);
  const [items, setItems] = useState<CatalogExercise[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      setError(null);
      repo
        .search(q, 0)
        .then((r) => {
          if (!alive) return;
          setItems(r.items);
          setTotal(r.total);
        })
        .catch((e) => alive && setError(e instanceof Error ? e.message : "Falha ao buscar."));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [repo, q]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label="Origem">
        {([["wger", "wger"], ["mine", "Meus"], ["shared", "Compartilhados"]] as const).map(([id, l]) => (
          <button key={id} type="button" role="radio" aria-checked={q.scope === id} onClick={() => setQ({ ...q, scope: id })} className={`min-h-[40px] rounded-control border px-2 text-sm font-semibold ${q.scope === id ? "border-theme-teal bg-theme-teal-subtle" : "border-theme-border text-theme-muted"}`}>
            {l}
          </button>
        ))}
      </div>
      <Field label="Buscar no catálogo" htmlFor="cat-q">
        <input id="cat-q" type="search" className={inputClass} value={q.text} onChange={(e) => setQ({ ...q, text: e.target.value })} placeholder="nome em português ou inglês" />
      </Field>
      <label className="sr-only" htmlFor="cat-g">Grupo muscular</label>
      <select id="cat-g" className={inputClass} value={q.category} onChange={(e) => setQ({ ...q, category: e.target.value })}>
        <option value="">Grupo: todos</option>
        {Object.entries(CATEGORY_PT).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {error && <ErrorNote>{error}</ErrorNote>}
      <p className="text-sm text-theme-muted" aria-live="polite">{items === null ? "Buscando…" : `${total} exercício(s)${total > items.length ? `, mostrando ${items.length}` : ""}`}</p>
      <ul className="max-h-[52vh] divide-y divide-theme-border overflow-y-auto rounded-control border border-theme-border">
        {items?.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-2 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-medium">{e.name}</p>
              <p className="truncate text-[13px] text-theme-muted">{[categoryPt(e.category), e.primary_muscles.map((m) => musclePt(m.id, m.name)).join(", ")].filter(Boolean).join(" · ")}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                registerCatalogExercise(e);
                onPick(e.id);
              }}
              aria-label={`${label} ${e.name}`}
              className="inline-flex h-10 min-w-10 shrink-0 items-center justify-center gap-1 rounded-control border border-theme-boundary/60 px-2 text-sm font-semibold hover:bg-theme-secondary"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
