"use client";

import React, { useId, useState } from "react";
import { Button, ErrorNote, Field, inputClass } from "@/components/ui/primitives";
import { APPARATUS_LABEL, CATEGORY_PT, EQUIPMENT_PT, MUSCLE_OPTIONS_PT } from "@/lib/catalog/labels";
import type { CatalogRepo } from "@/lib/catalog/repository";
import type { Apparatus, CatalogExercise, CustomExerciseInput } from "@/lib/catalog/types";

const ta = `${inputClass} min-h-[96px] py-2`;

function Chips({ legend, options, value, onChange, disabled = [] }: { legend: string; options: { value: string; label: string }[]; value: string[]; onChange: (v: string[]) => void; disabled?: string[] }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = value.includes(o.value);
          const off = disabled.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              disabled={off}
              onClick={() => onChange(on ? value.filter((x) => x !== o.value) : [...value, o.value])}
              className={`min-h-[36px] rounded-control border px-3 text-sm transition-colors disabled:opacity-40 ${on ? "border-theme-teal bg-theme-teal-subtle font-semibold text-theme-text" : "border-theme-border text-theme-muted hover:text-theme-text"}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function CustomExerciseForm({ repo, initial, onSaved, onCancel }: { repo: CatalogRepo; initial?: CatalogExercise | null; onSaved: (e: CatalogExercise) => void; onCancel: () => void }) {
  const id = useId();
  const [f, setF] = useState<CustomExerciseInput>(() => ({
    name: initial?.name ?? "",
    description_pt: initial?.description_pt ?? "",
    instructions: initial?.instructions ?? "",
    category: initial?.category ?? "",
    primary_muscle_ids: initial?.primary_muscles.map((m) => m.id) ?? [],
    secondary_muscle_ids: initial?.secondary_muscles.map((m) => m.id) ?? [],
    equipment: initial?.equipment ?? [],
    apparatus: initial?.apparatus ?? "indefinido",
  }));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<CustomExerciseInput>) => setF((c) => ({ ...c, ...p }));
  const muscles = MUSCLE_OPTIONS_PT.map((m) => ({ value: String(m.id), label: m.pt }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return setError("Informe o nome do exercício.");
    setBusy(true);
    setError(null);
    try {
      onSaved(initial ? await repo.updateCustom(initial.id, f) : await repo.createCustom(f));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o exercício.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" aria-label={initial ? "Editar exercício próprio" : "Cadastrar exercício próprio"}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Nome do exercício" htmlFor={`${id}-n`} required>
            <input id={`${id}-n`} className={inputClass} required maxLength={160} value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="ex.: Agachamento no banco com pausa" />
          </Field>
        </div>
        <Field label="Grupo muscular" htmlFor={`${id}-c`}>
          <select id={`${id}-c`} className={inputClass} value={f.category} onChange={(e) => set({ category: e.target.value })}>
            <option value="">Não informado</option>
            {Object.entries(CATEGORY_PT).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Tipo de resistência" htmlFor={`${id}-a`}>
          <select id={`${id}-a`} className={inputClass} value={f.apparatus} onChange={(e) => set({ apparatus: e.target.value as Apparatus })}>
            {(Object.keys(APPARATUS_LABEL) as Apparatus[]).map((a) => <option key={a} value={a}>{APPARATUS_LABEL[a]}</option>)}
          </select>
        </Field>
      </div>
      <Chips legend="Músculos principais" options={muscles} value={f.primary_muscle_ids.map(String)} onChange={(v) => set({ primary_muscle_ids: v.map(Number) })} />
      <Chips legend="Músculos secundários" options={muscles} value={f.secondary_muscle_ids.map(String)} onChange={(v) => set({ secondary_muscle_ids: v.map(Number) })} disabled={f.primary_muscle_ids.map(String)} />
      <Chips legend="Equipamento" options={Object.entries(EQUIPMENT_PT).map(([v, l]) => ({ value: v, label: l }))} value={f.equipment} onChange={(v) => set({ equipment: v })} />
      <Field label="Descrição" htmlFor={`${id}-d`} hint="O que é o exercício e para que você costuma usá-lo.">
        <textarea id={`${id}-d`} className={ta} maxLength={12000} value={f.description_pt} onChange={(e) => set({ description_pt: e.target.value })} />
      </Field>
      <Field label="Orientações de execução" htmlFor={`${id}-i`} hint="Posição inicial, movimento, respiração e pontos de atenção.">
        <textarea id={`${id}-i`} className={ta} maxLength={12000} value={f.instructions} onChange={(e) => set({ instructions: e.target.value })} />
      </Field>
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>{busy ? "Salvando…" : initial ? "Salvar alterações" : "Cadastrar exercício"}</Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>Cancelar</Button>
      </div>
      <p className="text-sm text-theme-muted">O exercício fica visível só para você. Para disponibilizá-lo a todos os professores, peça o compartilhamento na ficha: o administrador autoriza.</p>
    </form>
  );
}
