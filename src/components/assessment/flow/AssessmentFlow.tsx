"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, CircleAlert, CloudOff, Loader2 } from "lucide-react";
import type { Assessment, AssessmentBlocks, Trainee } from "@/lib/domain/types";
import { useData } from "@/components/providers/DataProvider";
import { can } from "@/lib/domain/roles";
import { useStageTransition } from "@/components/motion/StageTransition";
import { Button, Panel, RequiredLegend } from "@/components/ui/primitives";
import { StepComplaint, StepEssentials, StepFunctional, StepSafety, StepSynthesis } from "./Steps";
import AssessmentReview from "./AssessmentReview";

const STEPS = [
  { key: "essentials", title: "Dados essenciais", desc: "Objetivo, experiência, rotina e equipamentos" },
  { key: "safety", title: "Histórico e triagem", desc: "Segurança antes de planejar" },
  { key: "complaint", title: "Queixa e mapa corporal", desc: "Sintomas, sono e atividades" },
  { key: "functional", title: "Avaliação funcional", desc: "Testes e medidas registrados" },
  { key: "synthesis", title: "Síntese e metas", desc: "Metas e próximos passos" },
  { key: "review", title: "Revisão", desc: "Resultado e rascunho de treino" },
] as const;

type SaveState = { kind: "idle" } | { kind: "dirty" } | { kind: "saving" } | { kind: "saved"; at: string; target: string } | { kind: "error"; message: string };

export default function AssessmentFlow({ initial, trainee }: { initial: Assessment; trainee: Trainee }) {
  const { repo, actor } = useData();
  const router = useRouter();
  const [a, setA] = useState<Assessment>(initial);
  const [step, setStep] = useState(0);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const readOnly = !can(actor.role, "assessment.write");
  const panelRef = useStageTransition<HTMLDivElement>(step);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const latest = useRef(a);
  latest.current = a;
  const timer = useRef<number | null>(null);

  const persist = useCallback(async () => {
    setSave({ kind: "saving" });
    try {
      const r = await repo.saveAssessment(actor, latest.current);
      const at = new Date(r.savedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
      setSave({ kind: "saved", at, target: r.target === "supabase" ? "no servidor" : "neste navegador (demonstração)" });
    } catch (e) {
      setSave({ kind: "error", message: (e as Error).message });
    }
  }, [repo, actor]);

  // Autosave: 1,2 s após a última alteração
  const patch = useCallback(
    <K extends keyof AssessmentBlocks>(key: K) =>
      (p: Partial<AssessmentBlocks[K]>) => {
        setA((prev) => ({ ...prev, blocks: { ...prev.blocks, [key]: { ...prev.blocks[key], ...p } } }));
        setSave({ kind: "dirty" });
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(persist, 1200);
      },
    [persist]
  );

  // Salva pendências ao sair da página
  useEffect(() => {
    const onLeave = (e: BeforeUnloadEvent) => {
      if (save.kind === "dirty" || save.kind === "saving") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [save.kind]);
  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const go = async (i: number) => {
    if (save.kind === "dirty") {
      if (timer.current) window.clearTimeout(timer.current);
      await persist();
    }
    setStep(i);
    requestAnimationFrame(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      headingRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      headingRef.current?.focus({ preventScroll: true });
    });
  };

  const complete = async () => {
    const next = { ...latest.current, status: "completed" as const };
    setA(next);
    latest.current = next;
    await persist();
  };

  const stepDone = useMemo(() => {
    const b = a.blocks;
    return [
      !!b.essentials.goal && b.essentials.experience !== "nao_informado" && b.essentials.weeklyAvailability != null,
      Object.keys(b.safety.answers).length >= 7,
      b.complaint.hasComplaint.state !== "unanswered",
      b.functional.tests.length > 0 || b.functional.sitToStandDifficulty.state !== "unanswered",
      b.synthesis.goals.some((g) => g.trim()),
      a.status === "completed",
    ];
  }, [a]);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      {/* Etapas visíveis */}
      <nav aria-label="Etapas da avaliação" className="min-w-0 lg:sticky lg:top-6 lg:self-start">
        <ol className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-1 lg:overflow-visible">
          {STEPS.map((s, i) => (
            <li key={s.key} className="shrink-0">
              <button
                type="button"
                onClick={() => go(i)}
                aria-current={step === i ? "step" : undefined}
                className={`flex min-h-[44px] w-full items-center gap-3 rounded-control px-3 py-2 text-left text-sm transition-colors ${
                  step === i ? "bg-theme-teal-subtle font-semibold text-theme-text" : "text-theme-muted hover:bg-theme-secondary"
                }`}
              >
                <span
                  className={`tabular inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                    stepDone[i] ? "border-theme-teal bg-theme-teal text-cta-text" : "border-theme-boundary"
                  }`}
                  aria-hidden="true"
                >
                  {stepDone[i] ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="whitespace-nowrap lg:whitespace-normal">
                  {s.title}
                  <span className="sr-only">{stepDone[i] ? " (preenchida)" : ""}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-theme-muted">
              Etapa {step + 1} de {STEPS.length} · {trainee.code} — {trainee.displayName} · avaliação v{a.version}
            </p>
            <h2 ref={headingRef} tabIndex={-1} className="scroll-mt-24 text-xl font-bold focus:outline-hidden">
              {STEPS[step].title}
            </h2>
          </div>
          <SaveIndicator state={save} onRetry={persist} readOnly={readOnly} />
        </div>

        <div ref={panelRef}>
          <Panel className="p-5 sm:p-7">
            {step < 5 && <div className="mb-5"><RequiredLegend /></div>}
            {step === 0 && <StepEssentials b={a.blocks.essentials} set={patch("essentials")} ro={readOnly} />}
            {step === 1 && <StepSafety b={a.blocks.safety} set={patch("safety")} ro={readOnly} />}
            {step === 2 && <StepComplaint b={a.blocks.complaint} set={patch("complaint")} ro={readOnly} />}
            {step === 3 && <StepFunctional b={a.blocks.functional} set={patch("functional")} ro={readOnly} date={a.date} />}
            {step === 4 && <StepSynthesis b={a.blocks.synthesis} set={patch("synthesis")} ro={readOnly} />}
            {step === 5 && (
              <AssessmentReview
                assessment={a}
                trainee={trainee}
                onComplete={complete}
                onGoTo={go}
                onDraftCreated={(planId) => router.push(`/app/treinos/${planId}/editar`)}
              />
            )}
          </Panel>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button variant="secondary" disabled={step === 0} onClick={() => go(step - 1)}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Voltar
          </Button>
          {step < STEPS.length - 1 && (
            <Button onClick={() => go(step + 1)}>
              Continuar <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SaveIndicator({ state, onRetry, readOnly }: { state: SaveState; onRetry: () => void; readOnly: boolean }) {
  if (readOnly) return <span className="text-sm text-theme-muted">Somente leitura</span>;
  return (
    <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm">
      {state.kind === "idle" && <span className="text-theme-muted">Sem alterações nesta sessão</span>}
      {state.kind === "dirty" && <span className="text-theme-muted">Alterações ainda não salvas</span>}
      {state.kind === "saving" && (
        <span className="flex items-center gap-1.5 text-theme-muted">
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Salvando…
        </span>
      )}
      {state.kind === "saved" && (
        <span className="flex items-center gap-1.5 text-status-success-fg">
          <Check className="h-4 w-4" aria-hidden="true" /> Salvo {state.target} às {state.at}
        </span>
      )}
      {state.kind === "error" && (
        <span className="flex items-center gap-2 text-status-danger-fg">
          <CloudOff className="h-4 w-4" aria-hidden="true" /> Não salvo: {state.message}
          <button type="button" onClick={onRetry} className="font-semibold underline">
            Tentar de novo
          </button>
        </span>
      )}
      {state.kind === "error" && <CircleAlert className="sr-only" />}
    </p>
  );
}
