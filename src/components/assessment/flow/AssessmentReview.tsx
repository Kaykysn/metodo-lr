"use client";

import React, { useMemo, useState } from "react";
import { AlertOctagon, AlertTriangle, CheckCircle2, FilePlus2 } from "lucide-react";
import type { Assessment, Trainee } from "@/lib/domain/types";
import { suggest } from "@/lib/domain/suggestion-rules";
import { createDraftFromAssessment } from "@/lib/domain/plans";
import { EXERCISE_BY_ID } from "@/lib/domain/exercise-library";
import { EVIDENCE_BY_ID } from "@/lib/domain/evidence";
import { can } from "@/lib/domain/roles";
import { useData } from "@/components/providers/DataProvider";
import { Badge, Button, ErrorNote, formatDateBR } from "@/components/ui/primitives";
import { regionLabel } from "../AnatomyMap";
import { canPerform, hasFeature } from "@/lib/subscription/entitlements";
import { FeatureLock } from "@/components/subscription/PlanNotices";
import { answerText } from "./controls";

export default function AssessmentReview({
  assessment,
  trainee,
  onComplete,
  onGoTo,
  onDraftCreated,
}: {
  assessment: Assessment;
  trainee: Trainee;
  onComplete: () => Promise<void>;
  onGoTo: (step: number) => void;
  onDraftCreated: (planId: string) => void;
}) {
  const { repo, actor, commercial } = useData();
  const rulesOn = hasFeature(commercial.access, "rule_suggestions");
  const mayDraft = canPerform(actor.role, commercial.access, "plan.draft") && !trainee.archivedAt;
  const result = useMemo(() => suggest(assessment), [assessment]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const b = assessment.blocks;

  const createDraft = async (manual: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const plan = createDraftFromAssessment({
        actor,
        assessment,
        suggestion: manual ? null : result,
        title: `Treino — ${trainee.displayName}`,
        frequencyPerWeek: b.essentials.weeklyAvailability ?? 2,
        weeks: 6,
        startDate: new Date().toISOString().slice(0, 10),
      });
      await repo.savePlan(actor, plan);
      onDraftCreated(plan.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const triage = result.triage;
  const tone = triage.status === "urgent" ? "danger" : triage.status === "refer" ? "caution" : triage.status === "incomplete" ? "caution" : "neutral";

  return (
    <div className="space-y-8">
      {/* Triagem: urgência nunca é só um aviso discreto */}
      <section aria-labelledby="rev-triagem" className="space-y-3">
        <h3 id="rev-triagem" className="text-base font-bold">Triagem de segurança</h3>
        <div
          role={triage.status === "urgent" || triage.status === "refer" ? "alert" : undefined}
          className={`rounded-panel border p-4 ${
            tone === "danger" ? "border-status-danger-border bg-status-danger-bg text-status-danger-fg" : tone === "caution" ? "border-status-caution-border bg-status-caution-bg text-status-caution-fg" : "border-theme-border bg-theme-secondary/60"
          }`}
        >
          <p className="flex items-start gap-2 font-semibold">
            {triage.status === "urgent" ? <AlertOctagon className="mt-0.5 h-5 w-5" /> : triage.status === "none_reported" ? <CheckCircle2 className="mt-0.5 h-5 w-5" /> : <AlertTriangle className="mt-0.5 h-5 w-5" />}
            {triage.note}
          </p>
          {triage.flagged.map((q) => (
            <p key={q.id} className="mt-2 text-[15px]">
              <strong>{q.text}</strong> — {q.guidance}
            </p>
          ))}
          {triage.status === "incomplete" && (
            <button type="button" className="mt-2 text-sm font-semibold underline" onClick={() => onGoTo(1)}>
              Completar a triagem
            </button>
          )}
        </div>
      </section>

      <section aria-labelledby="rev-registro" className="grid gap-6 md:grid-cols-2">
        <h3 id="rev-registro" className="sr-only">Registro da avaliação</h3>
        <div className="space-y-1.5">
          <h4 className="font-semibold">Objetivo e contexto</h4>
          <p className="text-[15px]">{b.essentials.goal || <em className="text-theme-subtle">Não informado</em>}</p>
          <p className="text-sm text-theme-muted">
            Experiência: {b.essentials.experience.replace("nao_informado", "não informada")} · Disponibilidade: {b.essentials.weeklyAvailability ?? "—"}x/semana · Equipamentos: {b.essentials.equipment.join(", ") || "não informados"}
          </p>
          <h4 className="pt-3 font-semibold">Limitações relatadas</h4>
          <p className="text-[15px]">{b.synthesis.limitations || <em className="text-theme-subtle">Não informadas</em>}</p>
        </div>
        <div className="space-y-1.5">
          <h4 className="font-semibold">Sintomas registrados</h4>
          {b.complaint.symptoms.length === 0 ? (
            <p className="text-[15px] text-theme-muted">Queixa atual: {answerText(b.complaint.hasComplaint)}. Nenhuma região marcada.</p>
          ) : (
            <ul className="space-y-1 text-[15px]">
              {b.complaint.symptoms.map((s) => (
                <li key={s.regionId}>
                  {regionLabel(s.regionId)} — {s.intensity === null ? "intensidade não informada" : `${s.intensity}/10`}
                  {s.radiates.state === "yes" && <Badge tone="caution">irradia</Badge>}
                </li>
              ))}
            </ul>
          )}
          <h4 className="pt-3 font-semibold">Medidas</h4>
          {b.functional.tests.length === 0 ? (
            <p className="text-[15px] text-theme-muted">Nenhum teste registrado.</p>
          ) : (
            <ul className="space-y-1 text-[15px]">
              {b.functional.tests.map((t) => (
                <li key={t.id} className="tabular">
                  {t.name || "Teste sem nome"}: {t.value === null ? "sem resultado" : `${t.value.toLocaleString("pt-BR")} ${t.unit}`} ({formatDateBR(t.date)})
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <h4 className="font-semibold">Metas definidas</h4>
          {b.synthesis.goals.filter((g) => g.trim()).length ? (
            <ul className="list-disc pl-5 text-[15px]">{b.synthesis.goals.filter((g) => g.trim()).map((g) => <li key={g}>{g}</li>)}</ul>
          ) : (
            <p className="text-[15px] text-theme-muted">Nenhuma meta definida ainda.</p>
          )}
          {b.synthesis.pending.filter((p) => p.trim()).length > 0 && (
            <>
              <h4 className="pt-3 font-semibold">Pendências</h4>
              <ul className="list-disc pl-5 text-[15px]">{b.synthesis.pending.filter((p) => p.trim()).map((p) => <li key={p}>{p}</li>)}</ul>
            </>
          )}
        </div>
      </section>

      {/* Opções do motor de regras (plano Completo). Triagem acima vale para todos. */}
      {!rulesOn && commercial.access && (
        <section aria-labelledby="rev-opcoes-off" className="space-y-3">
          <h3 id="rev-opcoes-off" className="text-base font-bold">Opções de exercício</h3>
          <FeatureLock feature="rule_suggestions" />
        </section>
      )}
      {rulesOn && (
      <section aria-labelledby="rev-opcoes" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="rev-opcoes" className="text-base font-bold">Opções de exercício</h3>
          <span className="text-sm text-theme-muted">Motor de regras transparente · {result.version}</span>
        </div>
        <p className="text-[15px] font-medium">{result.headline}</p>
        {result.missing.length > 0 && (
          <div className="rounded-panel border border-theme-border p-4">
            <p className="mb-2 font-semibold">Falta registrar:</p>
            <ul className="list-disc pl-5 text-[15px]">{result.missing.map((m) => <li key={m}>{m}</li>)}</ul>
          </div>
        )}
        {result.groups.map((g) => (
          <article key={g.ruleId} className="space-y-3 rounded-panel border border-theme-border bg-theme-raised p-4">
            <header>
              <h4 className="font-semibold">{g.title}</h4>
              <p className="text-sm text-theme-muted">{g.rationale}</p>
            </header>
            <ul className="flex flex-wrap gap-2">
              {g.exerciseIds.map((id) => <li key={id}><Badge tone="accent">{EXERCISE_BY_ID.get(id)?.name}</Badge></li>)}
            </ul>
            <details className="text-sm">
              <summary className="cursor-pointer font-semibold">Por que estas opções</summary>
              <dl className="mt-2 grid gap-2 sm:grid-cols-[160px_1fr]">
                <dt className="text-theme-muted">Achados usados</dt><dd>{g.findingsUsed.join("; ")}</dd>
                <dt className="text-theme-muted">Inclusão</dt><dd>{g.inclusion.join("; ")}</dd>
                <dt className="text-theme-muted">Exclusão</dt><dd>{g.exclusion.join("; ")}</dd>
                <dt className="text-theme-muted">Alternativas</dt><dd>{g.alternatives.map((id) => EXERCISE_BY_ID.get(id)?.name).join(", ")}</dd>
                <dt className="text-theme-muted">Referências</dt>
                <dd>{g.references.length ? g.references.map((r) => <a key={r} className="mr-3 text-theme-teal underline" href={EVIDENCE_BY_ID.get(r)?.url} target="_blank" rel="noreferrer">{EVIDENCE_BY_ID.get(r)?.authors.split(",")[0]} {EVIDENCE_BY_ID.get(r)?.year || ""}</a>) : "Referência específica pendente"}</dd>
                <dt className="text-theme-muted">Limitações</dt><dd>{g.limitations}</dd>
                <dt className="text-theme-muted">Regra</dt><dd>{g.ruleId}</dd>
              </dl>
            </details>
          </article>
        ))}
        <p className="text-sm text-theme-muted">
          Isto é apoio à decisão: não diagnostica, não define dose e não substitui a avaliação do professor.
        </p>
      </section>
      )}

      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="flex flex-wrap gap-3 border-t border-theme-border pt-6">
        {assessment.status !== "completed" && (
          <Button variant="secondary" onClick={onComplete}>
            Marcar avaliação como concluída
          </Button>
        )}
        {mayDraft && (
          <>
            {result.status === "ok" && rulesOn && (
              <Button onClick={() => createDraft(false)} disabled={busy}>
                <FilePlus2 className="h-4 w-4" aria-hidden="true" /> Criar rascunho de treino
              </Button>
            )}
            {result.status !== "blocked" && (
              <Button variant={result.status === "ok" && rulesOn ? "ghost" : "primary"} onClick={() => createDraft(true)} disabled={busy}>
                Criar rascunho manual
              </Button>
            )}
          </>
        )}
        {result.status === "blocked" && (
          <p className="text-[15px] text-theme-muted">Rascunho bloqueado até a avaliação complementar ser registrada.</p>
        )}
      </div>
    </div>
  );
}
