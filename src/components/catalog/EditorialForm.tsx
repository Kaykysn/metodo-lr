"use client";

import React, { useId, useState } from "react";
import { Button, ErrorNote, Field, inputClass } from "@/components/ui/primitives";
import type { CatalogRepo } from "@/lib/catalog/repository";
import type { CatalogEditorial } from "@/lib/catalog/types";
import { PURPOSE_LABEL } from "@/lib/domain/exercise-catalog";

const list = (s: string) => s.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean).slice(0, 20);
const ta = `${inputClass} min-h-[80px] py-2`;

/** Camada editorial (só administrador): revisão em português e classificação do app. */
export default function EditorialForm({ repo, exerciseId, initial, onSaved }: { repo: CatalogRepo; exerciseId: string; initial: CatalogEditorial | null; onSaved: (e: CatalogEditorial) => void }) {
  const id = useId();
  const [e, setE] = useState<CatalogEditorial>(
    initial ?? { exercise_id: exerciseId, name_pt: "", description_pt: "", purposes: [], agonists: [], synergists: [], stabilizers: [], technical_notes: "", caution_notes: "", reviewed_at: null }
  );
  const [text, setText] = useState({ agonists: e.agonists.join(", "), synergists: e.synergists.join(", "), stabilizers: e.stabilizers.join(", ") });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const set = (p: Partial<CatalogEditorial>) => {
    setOk(false);
    setE((c) => ({ ...c, ...p }));
  };

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const next = { ...e, agonists: list(text.agonists), synergists: list(text.synergists), stabilizers: list(text.stabilizers) };
      await repo.saveEditorial(next);
      onSaved({ ...next, reviewed_at: new Date().toISOString() });
      setOk(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-4 rounded-panel border border-theme-border p-4" aria-label="Revisão editorial do exercício">
      <div>
        <p className="font-semibold">Revisão editorial (administração)</p>
        <p className="text-sm text-theme-muted">Fica separada dos dados da fonte e não é sobrescrita pela sincronização. Use linguagem descritiva: nada de &quot;indicado para&quot; ou &quot;seguro para&quot; uma condição.</p>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Categorias editoriais do app</legend>
        <div className="flex flex-wrap gap-3">
          {(["hipertrofia", "reabilitacao"] as const).map((p) => (
            <label key={p} className="inline-flex min-h-[44px] items-center gap-2 text-[15px]">
              <input type="checkbox" checked={e.purposes.includes(p)} onChange={(x) => set({ purposes: x.target.checked ? [...e.purposes, p] : e.purposes.filter((y) => y !== p) })} />
              {PURPOSE_LABEL[p]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome revisado em português" htmlFor={`${id}-n`}>
          <input id={`${id}-n`} className={inputClass} maxLength={200} value={e.name_pt} onChange={(x) => set({ name_pt: x.target.value })} />
        </Field>
        <Field label="Agonistas / motores principais" htmlFor={`${id}-ag`} hint="Separe por vírgula.">
          <input id={`${id}-ag`} className={inputClass} value={text.agonists} onChange={(x) => setText({ ...text, agonists: x.target.value })} />
        </Field>
        <Field label="Sinergistas relevantes" htmlFor={`${id}-si`}>
          <input id={`${id}-si`} className={inputClass} value={text.synergists} onChange={(x) => setText({ ...text, synergists: x.target.value })} />
        </Field>
        <Field label="Estabilizadores relevantes" htmlFor={`${id}-es`} hint="Só quando houver fundamentação.">
          <input id={`${id}-es`} className={inputClass} value={text.stabilizers} onChange={(x) => setText({ ...text, stabilizers: x.target.value })} />
        </Field>
      </div>
      <Field label="Descrição revisada em português" htmlFor={`${id}-d`}>
        <textarea id={`${id}-d`} className={ta} maxLength={12000} value={e.description_pt} onChange={(x) => set({ description_pt: x.target.value })} />
      </Field>
      <Field label="Observações técnicas" htmlFor={`${id}-t`}>
        <textarea id={`${id}-t`} className={ta} maxLength={4000} value={e.technical_notes} onChange={(x) => set({ technical_notes: x.target.value })} />
      </Field>
      <Field label="Pontos de cuidado na prescrição" htmlFor={`${id}-c`} hint="Ajustes a considerar conforme a avaliação. Não é contraindicação universal.">
        <textarea id={`${id}-c`} className={ta} maxLength={4000} value={e.caution_notes} onChange={(x) => set({ caution_notes: x.target.value })} />
      </Field>
      {error && <ErrorNote>{error}</ErrorNote>}
      {ok && <p role="status" className="text-sm text-status-success-fg">Revisão salva.</p>}
      <Button type="submit" disabled={busy}>{busy ? "Salvando…" : "Salvar revisão"}</Button>
    </form>
  );
}
