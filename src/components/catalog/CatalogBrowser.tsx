"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Film, Image as ImageIcon, Plus, RefreshCw, Star } from "lucide-react";
import { Button, ErrorNote, Field, InfoNote, inputClass, Panel } from "@/components/ui/primitives";
import { useData } from "@/components/providers/DataProvider";
import { PURPOSE_LABEL } from "@/lib/domain/exercise-catalog";
import { getCatalogRepo } from "@/lib/catalog/bridge";
import { APPARATUS_LABEL, CATEGORY_PT, categoryPt, EQUIPMENT_PT, MUSCLE_OPTIONS_PT, musclePt } from "@/lib/catalog/labels";
import { PAGE_SIZE } from "@/lib/catalog/repository";
import { EMPTY_QUERY, type Apparatus, type CatalogExercise, type CatalogQuery } from "@/lib/catalog/types";
import CatalogDetail from "./CatalogDetail";
import CustomExerciseForm from "./CustomExerciseForm";

const SCOPES: { id: CatalogQuery["scope"]; label: string; short: string }[] = [
  { id: "wger", label: "Catálogo wger", short: "wger" },
  { id: "mine", label: "Meus exercícios", short: "Meus" },
  { id: "shared", label: "Compartilhados", short: "Compartilhados" },
];

function Select({ id, label, value, onChange, options }: { id: string; label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <Field label={label} htmlFor={id}>
      <select id={id} className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Todos</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
}

function readUrl(): { scope: CatalogQuery["scope"]; id: string | null } {
  if (typeof window === "undefined") return { scope: "wger", id: null };
  const p = new URLSearchParams(window.location.search);
  const f = p.get("catalogo");
  return { scope: f === "mine" || f === "shared" ? f : "wger", id: p.get("item") };
}

export default function CatalogBrowser() {
  const { actor } = useData();
  const [repo] = useState(getCatalogRepo);
  const [q, setQ] = useState<CatalogQuery>(EMPTY_QUERY);
  const [debounced, setDebounced] = useState(q);
  const [items, setItems] = useState<CatalogExercise[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<CatalogExercise | null>(null);
  const [creating, setCreating] = useState(false);
  const [retry, setRetry] = useState(0);
  const detailRef = useRef<HTMLDivElement>(null);
  const set = (p: Partial<CatalogQuery>) => setQ((c) => ({ ...c, ...p }));

  // Busca por texto espera a digitação parar; filtros aplicam na hora
  useEffect(() => {
    if (q === debounced) return;
    const t = setTimeout(() => {
      setDebounced(q);
      setPage(0);
    }, q.text === debounced.text ? 0 : 300);
    return () => clearTimeout(t);
  }, [q, debounced]);

  useEffect(() => {
    const u = readUrl();
    setQ((c) => ({ ...c, scope: u.scope }));
    if (u.id) repo.get(u.id).then((e) => e && setSelected(e)).catch(() => {});
    repo.favorites().then(setFavs).catch(() => {});
  }, [repo]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    repo
      .search(debounced, page)
      .then((r) => {
        if (!alive) return;
        setItems((cur) => (page === 0 ? r.items : [...cur, ...r.items]));
        setTotal(r.total);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Não foi possível carregar o catálogo."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [repo, debounced, page, retry]);

  const pushUrl = (scope: string, id: string | null) => {
    const url = new URL(window.location.href);
    url.searchParams.set("fonte", "catalogo");
    url.searchParams.set("catalogo", scope);
    if (id) url.searchParams.set("item", id);
    else url.searchParams.delete("item");
    window.history.pushState(null, "", url);
  };
  const select = (e: CatalogExercise | null) => {
    setCreating(false);
    setSelected(e);
    pushUrl(q.scope, e?.id ?? null);
    if (e) requestAnimationFrame(() => detailRef.current?.focus({ preventScroll: window.innerWidth >= 1024 }));
  };
  const toggleFav = useCallback(
    async (id: string) => {
      const on = !favs.has(id);
      setFavs((s) => {
        const n = new Set(s);
        if (on) n.add(id);
        else n.delete(id);
        return n;
      });
      try {
        await repo.setFavorite(id, on);
      } catch {
        setFavs((s) => {
          const n = new Set(s);
          if (on) n.delete(id);
          else n.add(id);
          return n;
        });
      }
    },
    [favs, repo]
  );
  const replaceItem = (e: CatalogExercise) => {
    setSelected(e);
    setItems((cur) => (cur.some((x) => x.id === e.id) ? cur.map((x) => (x.id === e.id ? e : x)) : [e, ...cur]));
  };
  const activeFilters = [q.text, q.category, q.muscle, q.equipment, q.apparatus, q.purpose].filter(Boolean).length + (q.favorites ? 1 : 0) + (q.withMedia ? 1 : 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Origem dos exercícios" className="grid w-full grid-cols-3 rounded-control border border-theme-border bg-theme-secondary p-1 sm:inline-flex sm:w-auto">
          {SCOPES.map((s) => (
            <button
              key={s.id}
              role="tab"
              type="button"
              aria-selected={q.scope === s.id}
              onClick={() => { set({ scope: s.id }); setSelected(null); pushUrl(s.id, null); }}
              className={`min-h-[40px] rounded-lg px-2 text-[13px] font-semibold transition-colors sm:px-4 sm:text-sm ${q.scope === s.id ? "bg-theme-raised shadow-subtle" : "text-theme-muted hover:text-theme-text"}`}
            >
              <span className="sm:hidden">{s.short}</span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>
        <Button onClick={() => { setSelected(null); setCreating(true); requestAnimationFrame(() => detailRef.current?.focus()); }}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Cadastrar exercício
        </Button>
      </div>

      {q.scope === "wger" && (
        <div className={selected || creating ? "hidden lg:block" : ""}>
        <InfoNote>
          Exercícios importados do <a href="https://wger.de/" target="_blank" rel="noopener noreferrer" className="font-semibold underline">wger</a>, base aberta mantida por voluntários. Nomes e descrições
          sem tradução aparecem no original em inglês. Imagens e vídeos são exibidos direto da fonte, com autoria e licença.
        </InfoNote>
        </div>
      )}

      <Panel className={`space-y-3 p-4 ${selected || creating ? "hidden lg:block" : ""}`}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <Field label="Buscar" htmlFor="cq">
              <input id="cq" type="search" className={inputClass} value={q.text} onChange={(e) => set({ text: e.target.value })} placeholder="nome em português ou em inglês" />
            </Field>
          </div>
          <Select id="cg" label="Grupo muscular" value={q.category} onChange={(v) => set({ category: v })} options={Object.entries(CATEGORY_PT).map(([value, label]) => ({ value, label }))} />
          <Select id="cm" label="Músculo" value={q.muscle} onChange={(v) => set({ muscle: v })} options={MUSCLE_OPTIONS_PT.map((m) => ({ value: String(m.id), label: m.pt }))} />
          <Select id="ce" label="Equipamento" value={q.equipment} onChange={(v) => set({ equipment: v })} options={Object.entries(EQUIPMENT_PT).map(([value, label]) => ({ value, label }))} />
          <Select id="ca" label="Livre ou máquina" value={q.apparatus} onChange={(v) => set({ apparatus: v as Apparatus | "" })} options={(["livre", "maquina", "peso_corporal"] as Apparatus[]).map((a) => ({ value: a, label: APPARATUS_LABEL[a] }))} />
          <Select id="cp" label="Foco de prescrição" value={q.purpose} onChange={(v) => set({ purpose: v as CatalogQuery["purpose"] })} options={(["hipertrofia", "reabilitacao"] as const).map((p) => ({ value: p, label: PURPOSE_LABEL[p] }))} />
          <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
            <label className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={q.favorites} onChange={(e) => set({ favorites: e.target.checked })} /> Só favoritos
            </label>
            <label className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={q.withMedia} onChange={(e) => set({ withMedia: e.target.checked })} /> Com imagem ou vídeo
            </label>
          </div>
        </div>
        {q.purpose && (
          <p className="text-sm text-theme-muted">Foco de prescrição é uma classificação editorial do app, revisada aos poucos; não é um dado da fonte nem uma indicação para todos.</p>
        )}
        <button type="button" disabled={!activeFilters} onClick={() => setQ({ ...EMPTY_QUERY, scope: q.scope })} className="min-h-[44px] text-sm font-semibold text-theme-teal underline disabled:text-theme-muted disabled:no-underline">
          Limpar filtros
        </button>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
        <section aria-label="Resultados" className={selected || creating ? "hidden lg:block" : ""}>
          <p className="mb-2 text-sm text-theme-muted" aria-live="polite">{loading && page === 0 ? "Buscando…" : `${total} exercício(s)`}</p>
          {error ? (
            <div className="space-y-3">
              <ErrorNote>{error}</ErrorNote>
              <Button variant="secondary" onClick={() => setRetry((r) => r + 1)}><RefreshCw className="h-4 w-4" aria-hidden="true" /> Tentar de novo</Button>
            </div>
          ) : loading && page === 0 ? (
            <ul aria-hidden="true" className="space-y-2">
              {Array.from({ length: 6 }, (_, i) => <li key={i} className="h-[68px] animate-pulse rounded-panel bg-theme-secondary" />)}
            </ul>
          ) : items.length === 0 ? (
            <div className="rounded-panel border border-theme-border bg-theme-primary p-4 text-[15px]">
              {q.scope === "mine" && !activeFilters ? (
                <>Você ainda não cadastrou exercícios. Use <strong>Cadastrar exercício</strong> para criar o primeiro.</>
              ) : q.scope === "wger" && !activeFilters && repo.mode === "supabase" ? (
                <>O catálogo ainda não foi importado. O administrador faz a primeira sincronização em <strong>Administração</strong>.</>
              ) : (
                <>Nenhum exercício com esses filtros. Remova um filtro ou busque por outro nome.</>
              )}
            </div>
          ) : (
            <>
              <ul className="divide-y divide-theme-border overflow-hidden rounded-panel border border-theme-border bg-theme-primary">
                {items.map((e) => (
                  <li key={e.id} className={`flex items-stretch transition-colors hover:bg-theme-secondary ${selected?.id === e.id ? "bg-theme-teal-subtle" : ""}`}>
                    <button type="button" onClick={() => select(e)} aria-current={selected?.id === e.id ? "true" : undefined} className="flex min-w-0 flex-1 flex-col items-start gap-0.5 px-4 py-3 text-left">
                      <span className="font-semibold">{e.name}</span>
                      <span className="text-sm text-theme-muted">
                        {[categoryPt(e.category), e.primary_muscles.map((m) => musclePt(m.id, m.name)).join(", ")].filter(Boolean).join(" · ")}
                      </span>
                      <span className="flex items-center gap-2 text-xs text-theme-muted">
                        {e.media_status === "video" ? <><Film className="h-3.5 w-3.5" aria-hidden="true" /> Vídeo</> : e.media_status === "image" ? <><ImageIcon className="h-3.5 w-3.5" aria-hidden="true" /> Imagem</> : "Sem demonstração"}
                        {!e.name_pt && e.source === "wger" && " · em inglês"}
                        {e.source === "custom" && e.visibility === "private" && " · privado"}
                        {!e.is_active && " · arquivado"}
                      </span>
                    </button>
                    <button type="button" onClick={() => toggleFav(e.id)} aria-pressed={favs.has(e.id)} aria-label={`${favs.has(e.id) ? "Remover" : "Adicionar"} ${e.name} ${favs.has(e.id) ? "dos" : "aos"} favoritos`} className="inline-flex w-12 flex-shrink-0 items-center justify-center">
                      <Star className={`h-4 w-4 ${favs.has(e.id) ? "fill-current text-status-caution-fg" : "text-theme-muted"}`} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
              {items.length < total && (
                <Button variant="secondary" className="mt-3 w-full" disabled={loading} onClick={() => setPage((p) => p + 1)}>
                  {loading ? "Carregando…" : `Carregar mais (${Math.min(PAGE_SIZE, total - items.length)} de ${total - items.length})`}
                </Button>
              )}
            </>
          )}
        </section>

        <div ref={detailRef} tabIndex={-1} className="min-w-0 outline-none lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto">
          {creating ? (
            <Panel className="space-y-4 p-4 sm:p-6">
              <button type="button" onClick={() => setCreating(false)} className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-theme-teal lg:hidden">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar à lista
              </button>
              <h2 className="text-xl font-bold">Cadastrar exercício</h2>
              <CustomExerciseForm
                repo={repo}
                onCancel={() => setCreating(false)}
                onSaved={(e) => {
                  setCreating(false);
                  if (q.scope !== "mine") set({ scope: "mine" });
                  replaceItem(e);
                  pushUrl("mine", e.id);
                }}
              />
            </Panel>
          ) : selected ? (
            <Panel className="p-4 sm:p-6">
              <button type="button" onClick={() => select(null)} className="mb-2 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-theme-teal lg:hidden">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar à lista
              </button>
              <CatalogDetail key={selected.id} repo={repo} actor={actor} exercise={selected} favorite={favs.has(selected.id)} onToggleFavorite={() => toggleFav(selected.id)} onChanged={replaceItem} />
            </Panel>
          ) : (
            <p className="hidden rounded-panel border border-dashed border-theme-border p-6 text-[15px] text-theme-muted lg:block">Escolha um exercício na lista para ver a ficha, a demonstração e os músculos.</p>
          )}
        </div>
      </div>
    </div>
  );
}
