"use client";

import React, { useEffect, useState } from "react";
import { ErrorNote, Field, inputClass } from "@/components/ui/primitives";
import PickRow from "./PickRow";
import { getCatalogRepo, registerCatalogExercise } from "@/lib/catalog/bridge";
import { CATEGORY_PT, categoryPt, musclePt } from "@/lib/catalog/labels";
import { EMPTY_QUERY, type CatalogExercise, type CatalogQuery } from "@/lib/catalog/types";

/** Seleção compacta do catálogo ampliado dentro da montagem de treino. */
export default function CatalogPicker({ onPick, replacing, inSession }: { onPick: (id: string) => void; replacing: boolean; inSession: Set<string> }) {
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
      <div className="grid grid-cols-3 gap-1 rounded-control border border-theme-border bg-theme-secondary p-1" role="radiogroup" aria-label="Origem">
        {([["wger", "wger", "Catálogo público wger"], ["mine", "Meus", "Exercícios que você criou"], ["shared", "Equipe", "Compartilhados com todos os professores"]] as const).map(([id, l, t]) => (
          <button key={id} type="button" role="radio" aria-checked={q.scope === id} title={t} onClick={() => setQ({ ...q, scope: id })} className={`min-h-[36px] rounded-lg px-1 text-[13px] font-semibold transition-colors ${q.scope === id ? "bg-theme-raised text-theme-text shadow-subtle" : "text-theme-muted hover:text-theme-text"}`}>
            {l}
          </button>
        ))}
      </div>
      <div>
        <label className="sr-only" htmlFor="cat-q">Buscar no catálogo</label>
        <input id="cat-q" type="search" className={inputClass} value={q.text} onChange={(e) => setQ({ ...q, text: e.target.value })} placeholder="Buscar em português ou inglês" />
      </div>
      <Field label="Grupo muscular" htmlFor="cat-g">
        <select id="cat-g" className={inputClass} value={q.category} onChange={(e) => setQ({ ...q, category: e.target.value })}>
          <option value="">Todos</option>
          {Object.entries(CATEGORY_PT).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </Field>
      {error && <ErrorNote>{error}</ErrorNote>}
      <p className="text-sm text-theme-muted" aria-live="polite">{items === null ? "Buscando…" : `${total} exercício${total === 1 ? "" : "s"}${total > items.length ? `, mostrando ${items.length}` : ""}`}</p>
      {items && items.length === 0 ? (
        <p className="rounded-control border border-dashed border-theme-border px-3 py-6 text-center text-sm text-theme-muted">Nenhum exercício encontrado.</p>
      ) : (
        <ul className="max-h-[60vh] divide-y divide-theme-border overflow-y-auto overscroll-contain rounded-control border border-theme-border">
          {items?.map((e) => (
            <PickRow
              key={e.id}
              name={e.name}
              meta={[categoryPt(e.category), e.primary_muscles.map((m) => musclePt(m.id, m.name)).join(", ")].filter(Boolean).join(" · ")}
              replacing={replacing}
              inSession={inSession.has(e.id)}
              onPick={() => {
                registerCatalogExercise(e);
                onPick(e.id);
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
