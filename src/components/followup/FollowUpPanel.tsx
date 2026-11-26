"use client";

// Anotações do acompanhamento na ficha do aluno: relato do aluno e observação do profissional
// por data. A agenda (horário fixo, aulas, reposições e cancelamentos) fica só na aba "Agenda",
// que é a mesma que o aluno vê e usa na área dele.
// O aluno continua sendo um registro do profissional: nada aqui cria login ou convite.
import React, { useMemo, useState } from "react";
import { MessageSquarePlus, X } from "lucide-react";
import { useAsync, useData } from "@/components/providers/DataProvider";
import { Button, ErrorNote, Field, Loading, Panel, formatDateBR, inputClass } from "@/components/ui/primitives";
import { followUpProblem } from "@/lib/data/repository";
import { formatAppointment, localParts, sortNotes, type FollowUpNote } from "@/lib/domain/schedule";
import type { Trainee } from "@/lib/domain/types";

type NoteForm = null | { id?: string; occurredOn: string; sessionAt: string | null; studentReport: string; professionalNote: string };

const timeOf = (iso: string) => localParts(Date.parse(iso)).time;

export default function FollowUpPanel({ trainee, canWrite }: { trainee: Trainee; canWrite: boolean }) {
  const { repo, actor, revision } = useData();
  const [tick, setTick] = useState(0);
  const [now] = useState(() => Date.now());
  const [form, setForm] = useState<NoteForm>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const data = useAsync(() => repo.getFollowUp(actor, trainee.id), [repo, actor, trainee.id, revision, tick]);

  const notes = useMemo(() => (data.data ? sortNotes(data.data.notes) : []), [data.data]);
  const today = localParts(now).date;

  if (data.status === "loading" && !data.data) return <Panel className="p-5"><Loading label="Carregando anotações…" /></Panel>;
  if (data.status === "error") return <Panel className="p-5"><ErrorNote>{data.error}</ErrorNote></Panel>;

  const submitNote = async (f: NonNullable<NoteForm>) => {
    const input = { id: f.id, traineeId: trainee.id, occurredOn: f.occurredOn, sessionAt: f.sessionAt, studentReport: f.studentReport.trim(), professionalNote: f.professionalNote.trim() };
    const why = followUpProblem({ note: input });
    if (why) return setErr(why);
    setSaving(true);
    setErr(null);
    setSaved(null);
    try {
      await repo.saveFollowUpNote(actor, input);
      setForm(null);
      setSaved("Anotação salva.");
      setTick((t) => t + 1); // relê do armazenamento: o que aparece é o que foi gravado
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  const openNote = (n?: FollowUpNote) =>
    setForm(
      n
        ? { id: n.id, occurredOn: n.occurredOn, sessionAt: n.sessionAt, studentReport: n.studentReport, professionalNote: n.professionalNote }
        : { occurredOn: today, sessionAt: null, studentReport: "", professionalNote: "" }
    );

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold">Anotações do acompanhamento</h2>
          <p className="text-sm text-theme-muted">Relato do aluno e suas observações por data. Horários e aulas ficam na aba Agenda.</p>
        </div>
        {canWrite && (
          <Button variant="secondary" onClick={() => { setErr(null); openNote(); }}>
            <MessageSquarePlus className="h-4 w-4" aria-hidden /> Nova anotação
          </Button>
        )}
      </div>

      {saved && <p role="status" className="mt-3 text-sm text-status-success-fg">{saved}</p>}
      {err && <div className="mt-3"><ErrorNote>{err}</ErrorNote></div>}

      {form && (
        <FormBox
          title={form.id ? "Editar anotação" : form.sessionAt ? `Anotação do atendimento de ${formatAppointment(form.sessionAt)}` : "Nova anotação"}
          onClose={() => setForm(null)}
        >
          {!form.sessionAt && (
            <div className="max-w-[220px]">
              <Field label="Data" htmlFor="nt-d"><input id="nt-d" type="date" className={inputClass} value={form.occurredOn} onChange={(e) => setForm({ ...form, occurredOn: e.target.value })} /></Field>
            </div>
          )}
          <Field label="Relato do aluno" htmlFor="nt-r">
            <textarea id="nt-r" rows={3} maxLength={4000} className={`${inputClass} py-2`} value={form.studentReport} onChange={(e) => setForm({ ...form, studentReport: e.target.value })} placeholder="O que o aluno contou: sono, dor, disposição, como foi a semana…" />
          </Field>
          <Field label="Observação do profissional" htmlFor="nt-p">
            <textarea id="nt-p" rows={3} maxLength={4000} className={`${inputClass} py-2`} value={form.professionalNote} onChange={(e) => setForm({ ...form, professionalNote: e.target.value })} placeholder="O que você observou e decidiu." />
          </Field>
          <Button disabled={saving} onClick={() => void submitNote(form)}>{saving ? "Salvando…" : "Salvar anotação"}</Button>
        </FormBox>
      )}

      <section aria-labelledby="fu-hist" className="mt-5">
        <h3 id="fu-hist" className="mb-2 text-sm font-bold uppercase tracking-wide text-theme-muted">Histórico</h3>
        {notes.length === 0 ? (
          <p className="text-sm text-theme-muted">Nenhuma anotação registrada ainda.</p>
        ) : (
          <ol className="space-y-3">
            {notes.map((n) => (
              <li key={n.id} className="rounded-control border border-theme-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm">
                    <strong>{formatDateBR(n.occurredOn)}</strong>
                    {n.sessionAt && <> · atendimento das {timeOf(n.sessionAt)}</>}
                    <span className="text-theme-muted"> · por {n.authorName || "profissional"}</span>
                  </p>
                  {canWrite && <button type="button" className="text-sm font-semibold underline" onClick={() => { setErr(null); openNote(n); }}>Editar</button>}
                </div>
                {n.studentReport && (
                  <div className="mt-2">
                    <p className="text-[12px] font-bold uppercase tracking-wide text-theme-muted">Relato do aluno</p>
                    <p className="whitespace-pre-line text-[15px]">{n.studentReport}</p>
                  </div>
                )}
                {n.professionalNote && (
                  <div className="mt-2">
                    <p className="text-[12px] font-bold uppercase tracking-wide text-theme-muted">Observação do profissional</p>
                    <p className="whitespace-pre-line text-[15px]">{n.professionalNote}</p>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </Panel>
  );
}

function FormBox({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="mt-4 space-y-3 rounded-control border border-theme-teal/40 bg-theme-secondary/50 p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        <button type="button" onClick={onClose} aria-label="Fechar formulário" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control hover:bg-theme-secondary"><X className="h-4 w-4" /></button>
      </div>
      {children}
    </div>
  );
}
