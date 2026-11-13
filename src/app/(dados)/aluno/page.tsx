"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Logo from "@/components/brand/Logo";
import ThemeSelector from "@/components/appearance/ThemeSelector";
import { useAsync, useData } from "@/components/providers/DataProvider";
import SessionGate from "@/components/providers/SessionGate";
import { Button, DemoBadge, EmptyState, ErrorNote, InfoNote, Loading, Panel } from "@/components/ui/primitives";
import { NumberInput } from "@/components/assessment/flow/controls";
import { practitionerView } from "@/lib/domain/plans";
import { EXERCISE_BY_ID } from "@/lib/domain/exercise-library";
import { doseText, resistanceText, effortText } from "@/components/training/format";
import type { ExecutionLog, PrescribedExercise } from "@/lib/domain/types";
import { newId } from "@/lib/domain/plans";

type Row = { done: boolean; reps: number | null; seconds: number | null; kg: number | null };

function modalityOf(it: PrescribedExercise): ExecutionLog["modality"] {
  if (it.resistance.kind === "external_kg") return "weight";
  if (it.resistance.kind === "band") return "band";
  if (it.resistance.kind === "pilates_springs") return "pilates";
  return "bodyweight";
}

export default function AlunoPage() {
  const { repo, actor, revision, bump, mode } = useData();
  const plans = useAsync(() => repo.listPlans(actor), [repo, actor, revision]);
  const view = useMemo(() => (plans.data?.[0] ? practitionerView(plans.data[0], actor) : null), [plans.data, actor]);
  const [sessionId, setSessionId] = useState<string>("");
  const session = view?.sessions.find((s) => s.id === sessionId) ?? view?.sessions[0];
  const [rows, setRows] = useState<Record<string, Row[]>>({});
  const [rpe, setRpe] = useState<number | null>(null);
  const [symptom, setSymptom] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

  const rowsFor = (it: PrescribedExercise): Row[] => rows[it.id] ?? Array.from({ length: it.dose.sets }, () => ({ done: false, reps: null, seconds: null, kg: it.resistance.kind === "external_kg" ? it.resistance.kg : null }));
  const setRow = (it: PrescribedExercise, i: number, p: Partial<Row>) => setRows((r) => ({ ...r, [it.id]: rowsFor(it).map((x, j) => (j === i ? { ...x, ...p } : x)) }));

  const submit = async () => {
    if (!view || !session) return;
    const logs: ExecutionLog[] = [];
    for (const it of session.items) {
      rowsFor(it).forEach((r, i) => {
        if (!r.done && r.reps === null && r.seconds === null) return; // série não registrada fica ausente
        logs.push({
          id: newId("lg"), planVersionId: view.id, traineeId: actor.traineeId!, sessionId: session.id, prescribedId: it.id, date: today,
          setNumber: i + 1, reps: r.reps, seconds: r.seconds, loadKg: it.resistance.kind === "external_kg" ? r.kg : null, modality: modalityOf(it),
          completed: r.done, effortRpe: rpe, symptomIntensity: symptom, note,
        });
      });
    }
    if (!logs.length) return setMsg({ ok: false, text: "Nenhuma série registrada ainda." });
    try {
      const rc = await repo.addLogs(actor, logs);
      setMsg({ ok: true, text: `${logs.length} série(s) registradas ${rc.target === "supabase" ? "no servidor" : "neste navegador (demonstração)"}.` });
      setRows({});
      bump();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-theme-border bg-theme-primary">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="text-theme-text"><Logo variant="horizontal" size={30} frame="accent" /></Link>
          <ThemeSelector compact />
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        <SessionGate>
        {mode === "demo" && (
          <InfoNote tone="caution">
            {actor.role === "practitioner" ? (
              <>Demonstração: dados fictícios guardados só neste navegador.</>
            ) : (
              <>Demonstração: para ver esta tela como aluno, escolha “Aluno AL-0142” em <Link href="/app" className="underline">Simular perfil</Link>.</>
            )}
          </InfoNote>
        )}
        {actor.role !== "practitioner" ? (
          <EmptyState title="Área do aluno praticante">Aqui o aluno vê apenas o treino disponibilizado pelo professor e registra o que fez.</EmptyState>
        ) : plans.status === "loading" ? (
          <Loading />
        ) : plans.status === "error" ? (
          <ErrorNote>{plans.error}</ErrorNote>
        ) : !view ? (
          <EmptyState title="Ainda não há treino disponível">Seu professor ainda não disponibilizou um treino.</EmptyState>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-2xl font-bold">Treino de hoje</h1>
              {mode === "demo" && <DemoBadge />}
            </div>
            {view.sessions.length > 1 && (
              <div role="tablist" aria-label="Sessão" className="flex gap-1">
                {view.sessions.map((s) => (
                  <button key={s.id} role="tab" type="button" aria-selected={s.id === session?.id} onClick={() => setSessionId(s.id)} className={`min-h-[44px] rounded-control border px-4 text-sm font-semibold ${s.id === session?.id ? "border-theme-teal bg-theme-teal-subtle" : "border-theme-border"}`}>Sessão {s.name}</button>
                ))}
              </div>
            )}
            {session?.items.map((it, idx) => {
              const ex = EXERCISE_BY_ID.get(it.exerciseId);
              const effort = effortText(it.effort);
              return (
                <Panel key={it.id} className="p-4">
                  <p className="text-sm text-theme-muted">{idx + 1} de {session.items.length}</p>
                  <h2 className="text-lg font-semibold">{ex?.name}</h2>
                  <p className="tabular text-[15px]">{doseText(it.dose)} · {resistanceText(it.resistance)}{effort && ` · ${effort}`}{it.restSeconds !== null && ` · descanso ${it.restSeconds} s`}</p>
                  {it.cues && <p className="mt-1 text-[15px] text-theme-muted">{it.cues}</p>}
                  <table className="mt-3 w-full text-left text-[15px]">
                    <caption className="sr-only">Registro das séries de {ex?.name}</caption>
                    <thead className="text-sm text-theme-muted"><tr><th scope="col">Série</th><th scope="col">{it.dose.kind === "time" ? "Segundos" : "Repetições"}</th>{it.resistance.kind === "external_kg" && <th scope="col">Carga (kg)</th>}<th scope="col">Feita</th></tr></thead>
                    <tbody>
                      {rowsFor(it).map((r, i) => (
                        <tr key={i}>
                          <td className="tabular py-1.5">{i + 1}</td>
                          <td className="py-1.5 pr-2">
                            {it.dose.kind === "time" ? (
                              <NumberInput id={`s-${it.id}-${i}`} aria-label={`Segundos da série ${i + 1}`} min={0} max={3600} value={r.seconds} onChange={(v) => setRow(it, i, { seconds: v })} />
                            ) : (
                              <NumberInput id={`r-${it.id}-${i}`} aria-label={`Repetições da série ${i + 1}`} min={0} max={200} value={r.reps} onChange={(v) => setRow(it, i, { reps: v })} />
                            )}
                          </td>
                          {it.resistance.kind === "external_kg" && (
                            <td className="py-1.5 pr-2"><NumberInput id={`k-${it.id}-${i}`} aria-label={`Carga da série ${i + 1}`} min={0} max={500} step={0.5} value={r.kg} onChange={(v) => setRow(it, i, { kg: v })} /></td>
                          )}
                          <td className="py-1.5"><input type="checkbox" aria-label={`Série ${i + 1} feita`} className="h-6 w-6 accent-[rgb(var(--accent-teal))]" checked={r.done} onChange={(e) => setRow(it, i, { done: e.target.checked })} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Panel>
              );
            })}
            <Panel className="grid gap-4 p-4 sm:grid-cols-2">
              <div>
                <label htmlFor="rpe" className="block text-sm font-semibold">Esforço da sessão (0–10)</label>
                <p className="text-sm text-theme-muted">Quão pesado foi, de 0 (nada) a 10 (máximo).</p>
                <NumberInput id="rpe" min={0} max={10} value={rpe} onChange={setRpe} />
              </div>
              <div>
                <label htmlFor="sym" className="block text-sm font-semibold">Dor ou desconforto (0–10)</label>
                <p className="text-sm text-theme-muted">Separado do esforço. Deixe vazio se não quiser informar.</p>
                <NumberInput id="sym" min={0} max={10} value={symptom} onChange={setSymptom} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="nt" className="block text-sm font-semibold">Observação para o professor</label>
                <textarea id="nt" className="mt-1 w-full min-h-[72px] rounded-control border border-theme-boundary/70 bg-theme-raised px-3 py-2" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </Panel>
            {msg && (msg.ok ? <InfoNote>{msg.text}</InfoNote> : <ErrorNote>{msg.text}</ErrorNote>)}
            <Button onClick={submit} className="w-full sm:w-auto">Registrar sessão</Button>
          </>
        )}
        </SessionGate>
      </main>
    </div>
  );
}
