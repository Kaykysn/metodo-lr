"use client";

import React, { useMemo, useState } from "react";
import { useAsync, useData } from "@/components/providers/DataProvider";
import { Badge, Button, ButtonLink, EmptyState, ErrorNote, Field, InfoNote, Loading, Panel, formatDateBR, inputClass } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ui/PageHeader";
import { AlertCircle, ChevronLeft, ChevronRight, Pencil, Plus } from "lucide-react";
import type { ScheduleOccurrence, StudentSchedule, TeacherAvailability } from "@/lib/data/repository";
import { WEEKDAYS, WEEKDAYS_SHORT, addDays, localParts, weekStartOf } from "@/lib/domain/schedule";

const STATUS_LABEL: Record<string, string> = {
  agendada: "Agendada",
  reposicao: "Reposição",
  cancelada: "Cancelada",
  perdida: "Falta",
  remarcada: "Remarcada",
  realizada: "Realizada",
};
const STATUS_TONE: Record<string, "neutral" | "success" | "caution" | "danger" | "accent"> = {
  agendada: "success",
  reposicao: "accent",
  perdida: "danger",
  cancelada: "neutral",
  remarcada: "neutral",
  realizada: "neutral",
};

type Teacher = { id: string; teacherUserId: string; traineeId: string; fullName: string; institution: string | null };

export default function AlunoAgendaPage() {
  const { repo, actor, revision, bump } = useData();
  const [weekStart, setWeekStart] = useState(() => weekStartOf(new Date()));
  const [scheduleForm, setScheduleForm] = useState<{ teacher: Teacher; schedule?: StudentSchedule } | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ScheduleOccurrence | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const myTeachers = useAsync(() => repo.listMyTeachers(actor), [repo, actor, revision]);
  const teachers: Teacher[] = myTeachers.data ?? [];

  const studentSchedules = useAsync(async () => {
    const all = await Promise.all(teachers.map((t) => repo.listStudentSchedules(actor, t.traineeId)));
    return all.flat();
  }, [repo, actor, myTeachers.data, revision]);

  const occurrences = useAsync(async () => {
    const all = await Promise.all(teachers.map((t) => repo.listScheduleOccurrences(actor, t.traineeId, weekStart)));
    return all.flat();
  }, [repo, actor, myTeachers.data, weekStart, revision]);

  // A política do banco já devolve só os horários ativos dos professores com vínculo aprovado
  const availability = useAsync(() => (teachers.length ? repo.listTeacherAvailability(actor) : Promise.resolve([])), [repo, actor, myTeachers.data, revision]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const byDay = useMemo(() => {
    const map: Record<string, ScheduleOccurrence[]> = {};
    for (const o of occurrences.data ?? []) {
      const { date } = localParts(new Date(o.scheduledAt).getTime());
      (map[date] ??= []).push(o);
    }
    for (const k of Object.keys(map)) map[k].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    return map;
  }, [occurrences.data]);

  async function confirmCancel() {
    if (!cancelTarget) return;
    try {
      const r = await repo.cancelOccurrence(actor, cancelTarget.id, "Cancelado pelo aluno");
      setNotice(r.message);
      setCancelTarget(null);
      bump();
    } catch (e) {
      setCancelTarget(null);
      setNotice((e as Error).message);
    }
  }

  if (myTeachers.status === "loading") return <Loading />;
  if (myTeachers.status === "error") return <ErrorNote>{myTeachers.error}</ErrorNote>;

  return (
    <div className="min-h-screen">
      <header className="border-b border-theme-border bg-theme-primary">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <span className="text-xl font-bold tracking-tight text-theme-text">Leandro Rangel</span>
          <span className="text-sm text-theme-muted">Aluno</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {teachers.length === 0 ? (
          <>
            <PageHeader title="Minha agenda" description="Sua agenda aparece aqui quando o seu professor liberar o seu acesso." />
            <EmptyState
              title="Nenhum professor vinculado"
              description="O acesso do aluno vem do convite que o professor envia para o seu e-mail. Se ele já enviou, abra o link do convite; se o link venceu, peça um novo a ele."
            />
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <PageHeader title="Minha agenda" description={`Semana de ${formatDateBR(weekStart)} a ${formatDateBR(addDays(weekStart, 6))}`} />
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" aria-label="Semana anterior" onClick={() => setWeekStart((d) => addDays(d, -7))}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => setWeekStart(weekStartOf(new Date()))}>Esta semana</Button>
                <Button variant="ghost" size="sm" aria-label="Próxima semana" onClick={() => setWeekStart((d) => addDays(d, 7))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>

            {notice && <InfoNote>{notice}</InfoNote>}
            {occurrences.status === "error" && <ErrorNote>{occurrences.error}</ErrorNote>}

            <Panel className="overflow-hidden">
              <ol className="grid grid-cols-1 divide-y divide-theme-border sm:grid-cols-7 sm:divide-x sm:divide-y-0">
                {days.map((day) => {
                  const [, m, d] = day.split("-");
                  const list = byDay[day] ?? [];
                  const wd = new Date(day + "T12:00:00Z").getUTCDay();
                  return (
                    <li key={day} className="min-h-[96px] p-2">
                      <p className="text-xs font-semibold text-theme-muted">{WEEKDAYS_SHORT[wd]} {d}/{m}</p>
                      <ul className="mt-2 space-y-2">
                        {list.map((o) => {
                          const canCancel = (o.status === "agendada" || o.status === "reposicao") && new Date(o.scheduledAt).getTime() > Date.now();
                          return (
                            <li key={o.id} className="rounded-control border border-theme-border bg-theme-secondary/60 p-2 text-xs">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-mono font-semibold text-theme-text">{localParts(new Date(o.scheduledAt).getTime()).time}</span>
                                <Badge tone={STATUS_TONE[o.status] ?? "neutral"}>{STATUS_LABEL[o.status] ?? o.status}</Badge>
                              </div>
                              {o.gymName && <p className="mt-1 truncate text-theme-muted">{o.gymName}</p>}
                              {canCancel && (
                                <Button variant="ghost" size="sm" className="mt-1 w-full" onClick={() => setCancelTarget(o)}>
                                  <AlertCircle className="mr-1 h-3 w-3" /> Cancelar
                                </Button>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  );
                })}
              </ol>
            </Panel>

            {teachers.map((t) => {
              const mine = (studentSchedules.data ?? []).filter((s) => s.traineeId === t.traineeId && s.status !== "cancelado");
              return (
                <Panel key={t.id} className="p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-bold">Horários fixos com {t.fullName || "seu professor"}</h2>
                      {t.institution && <p className="text-sm text-theme-muted">{t.institution}</p>}
                    </div>
                    <Button onClick={() => setScheduleForm({ teacher: t })}><Plus className="mr-2 h-4 w-4" /> Escolher horário</Button>
                  </div>
                  {mine.length === 0 ? (
                    <p className="text-sm text-theme-muted">Você ainda não escolheu um horário fixo.</p>
                  ) : (
                    <ul className="divide-y divide-theme-border">
                      {mine.map((s) => (
                        <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <Badge tone={s.status === "ativo" ? "success" : "neutral"}>{WEEKDAYS[s.weekday]}</Badge>
                            <span className="font-mono font-medium">{s.startTime}</span>
                            <span className="text-sm text-theme-muted">{s.durationMin} min</span>
                            {s.gymName && <span className="text-sm text-theme-muted">{s.gymName}</span>}
                            {s.status === "pausado" && <span className="text-sm text-theme-muted">(pausado pelo professor)</span>}
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => setScheduleForm({ teacher: t, schedule: s })}>
                            <Pencil className="mr-1 h-4 w-4" /> Trocar
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-3 text-xs text-theme-muted">Para deixar de ter um horário fixo, fale com o seu professor.</p>
                </Panel>
              );
            })}
          </>
        )}

        {scheduleForm && (
          <ScheduleFormModal
            teacher={scheduleForm.teacher}
            schedule={scheduleForm.schedule}
            availability={(availability.data ?? []).filter((a) => a.ownerId === scheduleForm.teacher.teacherUserId && a.isActive)}
            onClose={() => setScheduleForm(null)}
            onSaved={() => { setScheduleForm(null); setNotice("Horário salvo. Seu professor foi avisado."); bump(); }}
          />
        )}

        {cancelTarget && (
          <CancelConfirmModal occurrence={cancelTarget} onConfirm={confirmCancel} onCancel={() => setCancelTarget(null)} />
        )}
      </main>
    </div>
  );
}

function ScheduleFormModal({ teacher, schedule, availability, onClose, onSaved }: {
  teacher: Teacher;
  schedule?: StudentSchedule;
  availability: TeacherAvailability[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { repo, actor } = useData();
  const [availabilityId, setAvailabilityId] = useState(schedule?.teacherAvailabilityId ?? "");
  const [gymName, setGymName] = useState(schedule?.gymName ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!availabilityId) return setErr("Escolha um dos horários do professor.");
    setSaving(true);
    setErr(null);
    try {
      await repo.chooseStudentSchedule(actor, { traineeId: teacher.traineeId, availabilityId, gymName, scheduleId: schedule?.id });
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="sch-title">
      <form onSubmit={submit} className="w-full max-w-md rounded-panel border border-theme-border bg-theme-primary p-6" noValidate>
        <h2 id="sch-title" className="mb-4 text-lg font-bold">{schedule ? "Trocar horário fixo" : "Escolher horário fixo"}</h2>
        {availability.length === 0 ? (
          <p className="mb-4 text-sm text-theme-muted">O professor ainda não abriu horários na agenda.</p>
        ) : (
          <Field label="Horário" htmlFor="sch-avail">
            <select id="sch-avail" className={inputClass} value={availabilityId} onChange={(e) => setAvailabilityId(e.target.value)}>
              <option value="">Selecione</option>
              {availability.map((a) => (
                <option key={a.id} value={a.id}>
                  {WEEKDAYS[a.weekday]} {a.startTime} · {a.durationMin} min{a.gymName ? ` · ${a.gymName}` : ""}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Academia (opcional)" htmlFor="sch-gym" hint="Se ficar em branco, vale a academia do horário.">
          <input id="sch-gym" className={inputClass} maxLength={120} value={gymName} onChange={(e) => setGymName(e.target.value)} />
        </Field>
        {err && <ErrorNote>{err}</ErrorNote>}
        <div className="mt-4 flex gap-2">
          <Button type="submit" disabled={saving || availability.length === 0} className="flex-1">{saving ? "Salvando…" : "Confirmar"}</Button>
          <Button variant="ghost" onClick={onClose} className="flex-1">Voltar</Button>
        </div>
      </form>
    </div>
  );
}

function CancelConfirmModal({ occurrence, onConfirm, onCancel }: { occurrence: ScheduleOccurrence; onConfirm: () => void; onCancel: () => void }) {
  // Só para avisar antes; quem decide se é falta é o servidor, na hora do cancelamento
  const minutes = Math.max(0, Math.floor((new Date(occurrence.scheduledAt).getTime() - Date.now()) / 60000));
  const isLate = minutes <= 60;
  const { date, time } = localParts(new Date(occurrence.scheduledAt).getTime());
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
      <div className="w-full max-w-md rounded-panel border border-theme-border bg-theme-primary p-6">
        <h2 id="cancel-title" className="mb-4 text-lg font-bold">Cancelar a aula de {formatDateBR(date)} às {time}?</h2>
        <p className="mb-4 text-sm text-theme-muted">
          {isLate
            ? <span className="font-semibold text-status-danger-fg">Falta menos de 1 hora para a aula. Se cancelar agora, ela conta como falta e não pode ser reposta.</span>
            : "Com mais de 1 hora de antecedência, a aula pode ser reposta na mesma semana."}
        </p>
        <div className="flex gap-2">
          <Button variant={isLate ? "danger" : "secondary"} onClick={onConfirm} className="flex-1">Cancelar aula</Button>
          <Button variant="ghost" onClick={onCancel} className="flex-1">Manter aula</Button>
        </div>
      </div>
    </div>
  );
}
