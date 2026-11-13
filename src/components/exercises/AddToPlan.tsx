"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useData } from "@/components/providers/DataProvider";
import { can } from "@/lib/domain/roles";
import { addExerciseToPlan, latest } from "@/lib/domain/plans";
import type { ExerciseCard } from "@/lib/domain/exercise-library";
import type { Trainee, TrainingPlan } from "@/lib/domain/types";
import { Button, ErrorNote, Field, inputClass } from "@/components/ui/primitives";

/**
 * Adiciona o exercício a uma sessão do treino de um aluno. Usa o fluxo normal de versões:
 * rascunho aberto recebe o exercício; versão publicada gera nova versão em rascunho.
 */
export default function AddToPlan({ exercise }: { exercise: ExerciseCard }) {
  const { repo, actor, bump } = useData();
  const [open, setOpen] = useState(false);
  const [trainees, setTrainees] = useState<Trainee[] | null>(null);
  const [traineeId, setTraineeId] = useState("");
  const [plans, setPlans] = useState<TrainingPlan[] | null>(null);
  const [planId, setPlanId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ planId: string; newVersion: boolean; session: string } | null>(null);

  const allowed = can(actor.role, "plan.draft");

  useEffect(() => {
    if (!open || trainees) return;
    repo
      .listTrainees(actor)
      .then((t) => setTrainees(t.filter((x) => !x.archivedAt)))
      .catch(() => setError("Não foi possível carregar os alunos."));
  }, [open, trainees, repo, actor]);

  useEffect(() => {
    setPlans(null);
    setPlanId("");
    setSessionId("");
    if (!traineeId) return;
    repo
      .listPlans(actor, traineeId)
      .then(setPlans)
      .catch(() => setError("Não foi possível carregar os treinos deste aluno."));
  }, [traineeId, repo, actor]);

  useEffect(() => {
    setDone(null);
    setError(null);
  }, [exercise.id]);

  const plan = plans?.find((p) => p.id === planId) ?? null;
  const sessions = plan ? latest(plan).sessions : [];

  if (!allowed) return null;

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden="true" /> Adicionar ao treino do aluno
      </Button>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan || !sessionId) return;
    setBusy(true);
    setError(null);
    try {
      const res = addExerciseToPlan({ plan, actor, sessionId, exercise });
      await repo.savePlan(actor, res.plan);
      bump();
      setDone({ planId: plan.id, newVersion: res.newVersion, session: sessions.find((s) => s.id === sessionId)?.name ?? "" });
      setPlans((ps) => ps?.map((p) => (p.id === plan.id ? res.plan : p)) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível adicionar o exercício.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-panel border border-theme-border bg-theme-secondary/60 p-4" aria-label={`Adicionar ${exercise.name} ao treino de um aluno`}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Aluno" htmlFor="atp-aluno">
          <select id="atp-aluno" className={inputClass} value={traineeId} onChange={(e) => setTraineeId(e.target.value)} disabled={!trainees}>
            <option value="">{trainees ? "Escolha o aluno" : "Carregando…"}</option>
            {trainees?.map((t) => <option key={t.id} value={t.id}>{t.displayName} ({t.code})</option>)}
          </select>
        </Field>
        <Field label="Treino ou plano de retorno" htmlFor="atp-plano">
          <select id="atp-plano" className={inputClass} value={planId} onChange={(e) => { setPlanId(e.target.value); setSessionId(""); }} disabled={!plans}>
            <option value="">{!traineeId ? "Escolha o aluno primeiro" : plans ? (plans.length ? "Escolha o treino" : "Este aluno não tem treino") : "Carregando…"}</option>
            {plans?.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </Field>
        <Field label="Sessão" htmlFor="atp-sessao">
          <select id="atp-sessao" className={inputClass} value={sessionId} onChange={(e) => setSessionId(e.target.value)} disabled={!plan}>
            <option value="">{plan ? "Escolha a sessão" : "Escolha o treino primeiro"}</option>
            {sessions.map((s) => <option key={s.id} value={s.id}>Sessão {s.name}</option>)}
          </select>
        </Field>
      </div>
      {plan && latest(plan).status !== "draft" && (
        <p className="text-sm text-theme-muted">A versão atual já foi aprovada ou publicada. O exercício entra numa nova versão em rascunho; o aluno só vê depois da sua aprovação.</p>
      )}
      {traineeId && plans && plans.length === 0 && (
        <p className="text-sm text-theme-muted">
          Crie o treino a partir da avaliação do aluno em <Link href="/app/treinos/novo" className="font-semibold text-theme-teal underline">Novo treino</Link>.
        </p>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}
      {done && (
        <p role="status" className="rounded-control border border-status-success-border bg-status-success-bg px-3 py-2 text-sm text-status-success-fg">
          {exercise.name} adicionado à sessão {done.session}{done.newVersion ? " numa nova versão em rascunho" : " no rascunho"}.{" "}
          <Link href={`/app/treinos/${done.planId}/editar`} className="font-semibold underline">Abrir o treino</Link>
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!sessionId || busy}>{busy ? "Adicionando…" : "Adicionar"}</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Fechar</Button>
      </div>
    </form>
  );
}
