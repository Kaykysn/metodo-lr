"use client";

// Acompanhamento na ficha do aluno: próximos atendimentos (horário habitual + avulsos +
// remarcados), horário habitual por dia da semana e feedback por atendimento ou por data.
// O aluno continua sendo um registro do profissional: nada aqui cria login ou convite.
// Horários exibidos no fuso do estabelecimento (America/Sao_Paulo).
import React, { useMemo, useState } from "react";
import { CalendarClock, CalendarPlus, MessageSquarePlus, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useAsync, useData } from "@/components/providers/DataProvider";
import { Badge, Button, ErrorNote, Field, Loading, Panel, formatDateBR, inputClass } from "@/components/ui/primitives";
import { followUpProblem, type SlotInput } from "@/lib/data/repository";
import { STUDIO_TZ, WEEKDAYS, WEEKDAYS_SHORT, formatAppointment, localParts, sortNotes, upcomingAppointments, zonedToUtc, type Appointment, type FollowUpNote } from "@/lib/domain/schedule";
import type { Trainee } from "@/lib/domain/types";

type Form =
  | null
  | { type: "slots"; rows: SlotInput[] }
  | { type: "avulso"; date: string; time: string; duration: number; note: string }
  | { type: "remarcar"; appt: Appointment; date: string; time: string }
  | { type: "note"; id?: string; occurredOn: string; sessionAt: string | null; studentReport: string; professionalNote: string };

const SOURCE: Record<Appointment["source"], { label: string; tone: "neutral" | "accent" | "caution" | "danger" }> = {
  habitual: { label: "Horário habitual", tone: "neutral" },
  avulso: { label: "Avulso", tone: "accent" },
  remarcado: { label: "Remarcado", tone: "caution" },
  cancelado: { label: "Cancelado", tone: "danger" },
};

const timeOf = (iso: string) => localParts(Date.parse(iso)).time;
const dateOf = (iso: string) => localParts(Date.parse(iso)).date;

export default function FollowUpPanel({ trainee, canWrite }: { trainee: Trainee; canWrite: boolean }) {
  const { repo, actor, revision } = useData();
  const [tick, setTick] = useState(0);
  const [now] = useState(() => Date.now());
  const [form, setForm] = useState<Form>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const data = useAsync(() => repo.getFollowUp(actor, trainee.id), [repo, actor, trainee.id, revision, tick]);

  const upcoming = useMemo(() => (data.data ? upcomingAppointments(data.data, { fromMs: now, days: 35, limit: 8, includeCanceled: true }) : []), [data.data, now]);
  const notes = useMemo(() => (data.data ? sortNotes(data.data.notes) : []), [data.data]);
  const today = localParts(now).date;

  const run = async (fn: () => Promise<unknown>, message: string) => {
    setSaving(true);
    setErr(null);
    setSaved(null);
    try {
      await fn();
      setForm(null);
      setSaved(message);
      setTick((t) => t + 1); // relê do armazenamento: o que aparece é o que foi gravado
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (data.status === "loading" && !data.data) return <Panel className="p-5"><Loading label="Carregando acompanhamento…" /></Panel>;
  if (data.status === "error") return <Panel className="p-5"><ErrorNote>{data.error}</ErrorNote></Panel>;
  const fu = data.data!;

  const submitSlots = (rows: SlotInput[]) => {
    const why = followUpProblem({ slots: rows });
    if (why) return setErr(why);
    void run(() => repo.saveWeeklySlots(actor, trainee.id, rows), "Horário habitual salvo.");
  };
  const submitAvulso = (f: Extract<Form, { type: "avulso" }>) => {
    if (!f.date || !f.time) return setErr("Informe a data e a hora.");
    const at = new Date(zonedToUtc(f.date, f.time, STUDIO_TZ)).toISOString();
    void run(() => repo.addSessionChange(actor, { traineeId: trainee.id, kind: "avulso", originalAt: null, scheduledAt: at, durationMin: f.duration, note: f.note.trim() }), "Atendimento agendado.");
  };
  const submitRemarcar = (f: Extract<Form, { type: "remarcar" }>) => {
    if (!f.date || !f.time) return setErr("Informe a nova data e a hora.");
    const at = new Date(zonedToUtc(f.date, f.time, STUDIO_TZ)).toISOString();
    void run(
      () => repo.addSessionChange(actor, { traineeId: trainee.id, kind: "remarcacao", originalAt: f.appt.originalAt, scheduledAt: at, durationMin: f.appt.durationMin, note: "" }),
      "Atendimento remarcado. As outras semanas continuam no horário habitual."
    );
  };
  const cancelOccurrence = (a: Appointment) => {
    if (!window.confirm(`Cancelar só o atendimento de ${formatAppointment(a.at)}? As outras semanas continuam no horário habitual.`)) return;
    void run(() => repo.addSessionChange(actor, { traineeId: trainee.id, kind: "cancelamento", originalAt: a.originalAt, scheduledAt: null, durationMin: a.durationMin, note: "" }), "Atendimento cancelado.");
  };
  const undoChange = (a: Appointment) => {
    if (!a.changeId) return;
    const text = a.source === "avulso" ? "Excluir este atendimento avulso?" : "Desfazer esta alteração e voltar ao horário habitual?";
    if (!window.confirm(text)) return;
    void run(() => repo.removeSessionChange(actor, trainee.id, a.changeId!), a.source === "avulso" ? "Atendimento excluído." : "Alteração desfeita.");
  };
  const submitNote = (f: Extract<Form, { type: "note" }>) => {
    const input = { id: f.id, traineeId: trainee.id, occurredOn: f.occurredOn, sessionAt: f.sessionAt, studentReport: f.studentReport.trim(), professionalNote: f.professionalNote.trim() };
    const why = followUpProblem({ note: input });
    if (why) return setErr(why);
    void run(() => repo.saveFollowUpNote(actor, input), "Feedback salvo.");
  };
  const openNote = (n?: FollowUpNote, appt?: Appointment) =>
    setForm(
      n
        ? { type: "note", id: n.id, occurredOn: n.occurredOn, sessionAt: n.sessionAt, studentReport: n.studentReport, professionalNote: n.professionalNote }
        : { type: "note", occurredOn: appt ? dateOf(appt.at) : today, sessionAt: appt ? appt.at : null, studentReport: "", professionalNote: "" }
    );

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold">Acompanhamento</h2>
          <p className="text-sm text-theme-muted">Horários e feedback deste aluno. Horários no fuso de Brasília.</p>
        </div>
        {canWrite && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => { setErr(null); setForm({ type: "avulso", date: today, time: "08:00", duration: 60, note: "" }); }}>
              <CalendarPlus className="h-4 w-4" aria-hidden /> Agendar atendimento
            </Button>
            <Button variant="secondary" onClick={() => { setErr(null); openNote(); }}>
              <MessageSquarePlus className="h-4 w-4" aria-hidden /> Nota por data
            </Button>
          </div>
        )}
      </div>

      {saved && <p role="status" className="mt-3 text-sm text-status-success-fg">{saved}</p>}
      {err && <div className="mt-3"><ErrorNote>{err}</ErrorNote></div>}

      {/* Formulários (um por vez) */}
      {form?.type === "avulso" && (
        <FormBox title="Agendar atendimento em data específica" onClose={() => setForm(null)}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Data" htmlFor="av-d"><input id="av-d" type="date" className={inputClass} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Hora" htmlFor="av-h"><input id="av-h" type="time" className={inputClass} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></Field>
            <Field label="Duração (min)" htmlFor="av-m"><input id="av-m" type="number" min={10} max={300} className={inputClass} value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Observação (opcional)" htmlFor="av-n"><input id="av-n" className={inputClass} maxLength={500} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="ex.: reavaliação" /></Field>
          <Button disabled={saving} onClick={() => submitAvulso(form)}>{saving ? "Salvando…" : "Agendar"}</Button>
        </FormBox>
      )}
      {form?.type === "remarcar" && (
        <FormBox title={`Remarcar só o atendimento de ${formatAppointment(form.appt.at)}`} onClose={() => setForm(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nova data" htmlFor="rm-d"><input id="rm-d" type="date" className={inputClass} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Nova hora" htmlFor="rm-h"><input id="rm-h" type="time" className={inputClass} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></Field>
          </div>
          <p className="text-sm text-theme-muted">As outras semanas continuam no horário habitual.</p>
          <Button disabled={saving} onClick={() => submitRemarcar(form)}>{saving ? "Salvando…" : "Salvar remarcação"}</Button>
        </FormBox>
      )}
      {form?.type === "note" && (
        <FormBox
          title={form.id ? "Editar feedback" : form.sessionAt ? `Feedback do atendimento de ${formatAppointment(form.sessionAt)}` : "Nota por data"}
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
            <textarea id="nt-p" rows={3} maxLength={4000} className={`${inputClass} py-2`} value={form.professionalNote} onChange={(e) => setForm({ ...form, professionalNote: e.target.value })} placeholder="O que você observou e decidiu no atendimento." />
          </Field>
          <Button disabled={saving} onClick={() => submitNote(form)}>{saving ? "Salvando…" : "Salvar feedback"}</Button>
        </FormBox>
      )}

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        {/* Próximos atendimentos */}
        <section aria-labelledby="fu-prox">
          <h3 id="fu-prox" className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-theme-muted">
            <CalendarClock className="h-4 w-4" aria-hidden /> Próximos atendimentos
          </h3>
          {upcoming.length === 0 ? (
            <p className="text-sm text-theme-muted">Nenhum atendimento nas próximas semanas. Cadastre o horário habitual ou agende um atendimento.</p>
          ) : (
            <ul className="divide-y divide-theme-border rounded-control border border-theme-border">
              {upcoming.map((a) => (
                <li key={a.key} className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 ${a.source === "cancelado" ? "opacity-70" : ""}`}>
                  <div className="min-w-0">
                    <p className={`font-semibold capitalize ${a.source === "cancelado" ? "line-through" : ""}`}>{formatAppointment(a.at)}</p>
                    <p className="flex flex-wrap items-center gap-2 text-[13px] text-theme-muted">
                      <Badge tone={SOURCE[a.source].tone}>{SOURCE[a.source].label}</Badge>
                      <span>{a.durationMin} min</span>
                      {a.note && <span className="truncate">· {a.note}</span>}
                    </p>
                  </div>
                  {canWrite && (
                    <div className="flex flex-wrap gap-1">
                      {a.source !== "cancelado" && <IconBtn label="Registrar feedback" onClick={() => { setErr(null); openNote(undefined, a); }}><MessageSquarePlus className="h-4 w-4" /></IconBtn>}
                      {a.source === "habitual" && <IconBtn label="Remarcar este atendimento" onClick={() => { setErr(null); setForm({ type: "remarcar", appt: a, date: dateOf(a.at), time: timeOf(a.at) }); }}><Pencil className="h-4 w-4" /></IconBtn>}
                      {a.source === "habitual" && <IconBtn label="Cancelar só este atendimento" onClick={() => cancelOccurrence(a)}><X className="h-4 w-4" /></IconBtn>}
                      {a.changeId && <IconBtn label={a.source === "avulso" ? "Excluir atendimento avulso" : "Desfazer alteração"} onClick={() => undoChange(a)}>{a.source === "avulso" ? <Trash2 className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}</IconBtn>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Horário habitual */}
        <section aria-labelledby="fu-hab">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 id="fu-hab" className="text-sm font-bold uppercase tracking-wide text-theme-muted">Horário habitual</h3>
            {canWrite && form?.type !== "slots" && (
              <button type="button" className="text-sm font-semibold underline" onClick={() => { setErr(null); setForm({ type: "slots", rows: fu.slots.map(({ weekday, startTime, durationMin }) => ({ weekday, startTime, durationMin })) }); }}>
                {fu.slots.length ? "Editar" : "Cadastrar"}
              </button>
            )}
          </div>
          {form?.type === "slots" ? (
            <div className="space-y-2 rounded-control border border-theme-border p-3">
              {form.rows.length === 0 && <p className="text-sm text-theme-muted">Nenhum horário. Adicione um dia.</p>}
              {form.rows.map((r, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] items-end gap-2">
                  <Field label="Dia" htmlFor={`sl-d-${i}`}>
                    <select id={`sl-d-${i}`} className={inputClass} value={r.weekday} onChange={(e) => setForm({ ...form, rows: form.rows.map((x, j) => (j === i ? { ...x, weekday: Number(e.target.value) } : x)) })}>
                      {WEEKDAYS.map((d, n) => <option key={d} value={n}>{d}</option>)}
                    </select>
                  </Field>
                  <Field label="Hora" htmlFor={`sl-h-${i}`}>
                    <input id={`sl-h-${i}`} type="time" className={`${inputClass} w-[7.5rem]`} value={r.startTime} onChange={(e) => setForm({ ...form, rows: form.rows.map((x, j) => (j === i ? { ...x, startTime: e.target.value } : x)) })} />
                  </Field>
                  <Field label="Min" htmlFor={`sl-m-${i}`}>
                    <input id={`sl-m-${i}`} type="number" min={10} max={300} className={`${inputClass} w-20`} value={r.durationMin} onChange={(e) => setForm({ ...form, rows: form.rows.map((x, j) => (j === i ? { ...x, durationMin: Number(e.target.value) } : x)) })} />
                  </Field>
                  <IconBtn label={`Remover ${WEEKDAYS[r.weekday]} ${r.startTime}`} onClick={() => setForm({ ...form, rows: form.rows.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></IconBtn>
                </div>
              ))}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="ghost" onClick={() => setForm({ ...form, rows: [...form.rows, { weekday: 1, startTime: "07:00", durationMin: 60 }] })}><Plus className="h-4 w-4" aria-hidden /> Adicionar dia</Button>
                <Button disabled={saving} onClick={() => submitSlots(form.rows)}>{saving ? "Salvando…" : "Salvar horário"}</Button>
                <Button variant="ghost" onClick={() => setForm(null)}>Cancelar</Button>
              </div>
            </div>
          ) : fu.slots.length === 0 ? (
            <p className="text-sm text-theme-muted">Nenhum horário habitual cadastrado.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {[...fu.slots].sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime)).map((s) => (
                <li key={s.id} className="rounded-control border border-theme-border px-3 py-1.5 text-sm">
                  <span className="font-semibold">{WEEKDAYS_SHORT[s.weekday]}</span> {s.startTime} <span className="text-theme-muted">· {s.durationMin} min</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Histórico de feedback */}
      <section aria-labelledby="fu-hist" className="mt-6">
        <h3 id="fu-hist" className="mb-2 text-sm font-bold uppercase tracking-wide text-theme-muted">Histórico de feedback</h3>
        {notes.length === 0 ? (
          <p className="text-sm text-theme-muted">Nenhum feedback registrado ainda.</p>
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

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-theme-border hover:bg-theme-secondary">
      {children}
    </button>
  );
}
