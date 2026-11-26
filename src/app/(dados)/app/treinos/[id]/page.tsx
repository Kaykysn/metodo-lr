"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Eye, Printer } from "lucide-react";
import { useAsync, useData } from "@/components/providers/DataProvider";
import { Badge, Button, ButtonLink, DemoBadge, EmptyState, ErrorNote, InfoNote, Loading, Panel, formatDateBR } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ui/PageHeader";
import { approve, estimateMinutes, latest, practitionerView, proposeNewVersion, publish, published } from "@/lib/domain/plans";
import { can, ROLE_LABEL } from "@/lib/domain/roles";
import { DEMO_ACTORS } from "@/lib/data/seed";
import { ItemSummary, weeklySetsByMuscle } from "@/components/training/format";
import type { PlanVersion, TrainingPlan } from "@/lib/domain/types";
import { canPerform, hasFeature } from "@/lib/subscription/entitlements";
import { useCreateBlock } from "@/components/subscription/PlanNotices";
import { useCatalogHydration } from "@/lib/catalog/bridge";

const STATUS: Record<PlanVersion["status"], { label: string; tone: "caution" | "accent" | "success" | "neutral" }> = {
  draft: { label: "Rascunho", tone: "caution" },
  approved: { label: "Aprovado", tone: "accent" },
  published: { label: "Disponível ao aluno", tone: "success" },
  superseded: { label: "Substituído", tone: "neutral" },
};

function VersionView({ v, plan, studentView }: { v: PlanVersion; plan: TrainingPlan; studentView: boolean }) {
  useCatalogHydration(v.sessions.flatMap((s) => s.items.map((i) => i.exerciseId)));
  const perWeek = Math.max(1, Math.round(plan.frequencyPerWeek / Math.max(1, v.sessions.length)));
  const weekly = weeklySetsByMuscle(v.sessions, Object.fromEntries(v.sessions.map((s) => [s.id, perWeek])));
  return (
    <div className="space-y-6">
      {v.sessions.map((s) => {
        const est = estimateMinutes(s);
        return (
          <section key={s.id} className="break-inside-avoid">
            <h3 className="mb-2 text-lg font-bold">Sessão {s.name}</h3>
            {s.items.length === 0 ? (
              <p className="text-theme-muted">Sessão vazia.</p>
            ) : (
              <ol className="divide-y divide-theme-border rounded-panel border border-theme-border">
                {s.items.map((it, i) => (
                  <li key={it.id} className="flex gap-3 p-4">
                    <span className="tabular w-6 font-bold text-theme-muted">{i + 1}</span>
                    <ItemSummary item={it} showPrivate={!studentView} />
                  </li>
                ))}
              </ol>
            )}
            {s.items.length > 0 && <p className="mt-2 text-sm text-theme-muted"><span className="tabular font-semibold text-theme-text">≈ {est.minutes} min</span> · {est.basis}</p>}
          </section>
        );
      })}
      {!studentView && weekly.length > 0 && (
        <section className="break-inside-avoid">
          <h3 className="mb-1 text-lg font-bold">Resumo semanal de séries</h3>
          <p className="mb-2 text-sm text-theme-muted">
            Supondo cada sessão {perWeek}x por semana ({plan.frequencyPerWeek} sessões/semana ÷ {v.sessions.length} sessão(ões)). Convenção: cada série conta para todos os músculos principais da ficha; secundários não contam.
          </p>
          <table className="w-full max-w-md text-left text-[15px]">
            <caption className="sr-only">Séries semanais por grupo muscular</caption>
            <thead className="text-sm text-theme-muted"><tr><th scope="col" className="py-1">Músculo principal</th><th scope="col" className="py-1 text-right">Séries/semana</th></tr></thead>
            <tbody className="divide-y divide-theme-border">
              {weekly.map(([m, n]) => <tr key={m}><td className="py-1.5">{m}</td><td className="tabular py-1.5 text-right">{n}</td></tr>)}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

export default function TreinoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { repo, actor, revision, bump, commercial } = useData();
  const createBlock = useCreateBlock();
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const data = useAsync(async () => {
    const plan = await repo.getPlan(actor, id);
    if (!plan) return null;
    return { plan, trainee: await repo.getTrainee(actor, plan.traineeId) };
  }, [repo, actor, id, revision]);

  if (data.status === "loading") return <Loading />;
  if (data.status === "error") return <ErrorNote>{data.error}</ErrorNote>;
  if (!data.data) return <EmptyState title="Treino não encontrado" action={<ButtonLink href="/app/treinos" variant="secondary">Voltar</ButtonLink>}>Confira o endereço ou volte à lista.</EmptyState>;

  const { plan, trainee } = data.data;
  const l = latest(plan);
  const pub = published(plan);
  const act = async (fn: (p: TrainingPlan) => TrainingPlan) => {
    setErr(null);
    try {
      await repo.savePlan(actor, fn(plan));
      bump();
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  const archived = !!trainee?.archivedAt;
  const may = (a: Parameters<typeof can>[1]) => !archived && canPerform(actor.role, commercial.access, a);
  const studentPreview = practitionerView(plan, { id: "preview", name: "Prévia", role: "practitioner", traineeId: plan.traineeId });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <span className="flex flex-wrap items-center gap-2">
            <Link href={`/app/alunos/${plan.traineeId}`} className="hover:underline">{trainee?.displayName} · {trainee?.code}</Link>
            {plan.isDemo && <DemoBadge />}
          </span>
        }
        title={plan.title}
        description={`Início ${formatDateBR(plan.startDate)} · ${plan.weeks} semanas · ${plan.frequencyPerWeek} sessões por semana`}
        actions={
          <>
            {l.status === "draft" && can(actor.role, "plan.draft") && <ButtonLink href={`/app/treinos/${plan.id}/editar`}>Editar rascunho</ButtonLink>}
            {l.status === "draft" && may("plan.approve") && <Button variant="secondary" onClick={() => act((p) => approve(p, actor))}>Aprovar versão {l.number}</Button>}
            {l.status === "approved" && may("plan.publish") && <Button onClick={() => act((p) => publish(p, actor))}>Disponibilizar ao aluno</Button>}
            {l.status !== "draft" && may("plan.draft") && <Button variant="secondary" onClick={() => act((p) => proposeNewVersion(p, actor, "Nova versão a partir da anterior"))}>Criar nova versão</Button>}
            {may("plan.draft") && plan.ownerId === actor.id && hasFeature(commercial.access, "plan_reuse") && (
              <ButtonLink variant="ghost" href={`/app/treinos/novo?origem=${plan.id}`}>Reaproveitar como novo rascunho</ButtonLink>
            )}
            <Button variant="ghost" onClick={() => setPreview((v) => !v)} aria-pressed={preview}><Eye className="h-4 w-4" aria-hidden="true" /> {preview ? "Ver como professor" : "Pré-visualizar como aluno"}</Button>
            <Button variant="ghost" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden="true" /> Imprimir</Button>
          </>
        }
      />
      {err && <ErrorNote>{err}</ErrorNote>}
      {createBlock && can(actor.role, "plan.draft") && <InfoNote tone="caution">{createBlock} O treino já disponibilizado continua visível ao aluno.</InfoNote>}
      {archived && <InfoNote>Aluno arquivado: o histórico fica para consulta. Reative o aluno para criar versões.</InfoNote>}
      {actor.role === "pe_student" && l.status === "draft" && <InfoNote>Como estudante, você prepara o rascunho. A aprovação e a disponibilização ao aluno são feitas pelo professor responsável.</InfoNote>}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Panel className="p-5 sm:p-6">
          {preview ? (
            <>
              <h2 className="mb-1 text-lg font-bold">Como o aluno verá</h2>
              {studentPreview ? (
                <>
                  <p className="mb-4 text-sm text-theme-muted">Versão {studentPreview.number}, disponibilizada. Notas privadas e o raciocínio da sugestão ficam ocultos.</p>
                  <VersionView v={studentPreview} plan={plan} studentView />
                </>
              ) : (
                <p className="text-theme-muted">Nada aparece ao aluno ainda: nenhuma versão foi disponibilizada.</p>
              )}
            </>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold">Versão {l.number}</h2>
                <Badge tone={STATUS[l.status].tone}>{STATUS[l.status].label}</Badge>
                {l.manualDraft && <Badge>Manual</Badge>}
              </div>
              {pub && pub.id !== l.id && <InfoNote>O aluno continua vendo a versão {pub.number} até esta ser aprovada e disponibilizada.</InfoNote>}
              <div className="mt-4"><VersionView v={l} plan={plan} studentView={false} /></div>
            </>
          )}
        </Panel>

        <aside className="space-y-4 print:hidden">
          <Panel className="p-4">
            <h2 className="mb-2 font-bold">Histórico de versões</h2>
            <ol className="space-y-3 text-sm">
              {[...plan.versions].reverse().map((v) => {
                const author = DEMO_ACTORS.find((a) => a.id === v.authorId);
                return (
                  <li key={v.id} className="border-l border-theme-border pl-3">
                    <p className="font-semibold">v{v.number} <Badge tone={STATUS[v.status].tone}>{STATUS[v.status].label}</Badge></p>
                    <p className="text-theme-muted">{v.changeNote}</p>
                    <p className="text-theme-muted">Autor: {author ? `${author.name} (${ROLE_LABEL[author.role]})` : v.authorId} · {formatDateBR(v.createdAt)}</p>
                    {v.approvedAt && <p className="text-theme-muted">Aprovada em {formatDateBR(v.approvedAt)}</p>}
                    {v.sourceAssessmentId && <Link className="text-theme-teal underline" href={`/app/avaliacoes/${v.sourceAssessmentId}`}>Avaliação v{v.sourceAssessmentVersion}</Link>}
                    {v.suggestionTrace && <p className="text-theme-muted">Regras: {v.suggestionTrace.ruleIds.join(", ")} ({v.suggestionTrace.ruleVersion})</p>}
                  </li>
                );
              })}
            </ol>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
