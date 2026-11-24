"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAsync, useData } from "@/components/providers/DataProvider";
import { Badge, Button, ButtonLink, EmptyState, ErrorNote, InfoNote, Loading, PageHeader, Panel, formatDateBR } from "@/components/ui/primitives";
import { latest, published } from "@/lib/domain/plans";
import { can } from "@/lib/domain/roles";
import { canPerform, hasFeature } from "@/lib/subscription/entitlements";
import { ARCHIVED_MESSAGE } from "@/lib/data/repository";
import FollowUpPanel from "@/components/followup/FollowUpPanel";
import TraineePhotos from "@/components/posture/TraineePhotos";
import PractitionerAccessPanel from "@/components/trainee/PractitionerAccessPanel";

export default function AlunoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { repo, actor, revision, bump, commercial, mode } = useData();
  const [err, setErr] = useState<string | null>(null);
  const data = useAsync(async () => {
    const trainee = await repo.getTrainee(actor, id);
    if (!trainee) return null;
    const [assessments, plans] = await Promise.all([repo.listAssessments(actor, id), repo.listPlans(actor, id)]);
    return { trainee, assessments, plans };
  }, [repo, actor, id, revision]);

  if (data.status === "loading") return <Loading />;
  if (data.status === "error") return <ErrorNote>{data.error}</ErrorNote>;
  if (!data.data) return <EmptyState title="Aluno não encontrado" action={<ButtonLink href="/app/alunos" variant="secondary">Voltar para alunos</ButtonLink>}>Ele não existe ou está sob responsabilidade de outro profissional.</EmptyState>;

  const { trainee, assessments, plans } = data.data;
  const newAssessment = async () => {
    try {
      const a = await repo.createAssessment(actor, trainee.id);
      router.push(`/app/avaliacoes/${a.id}`);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const archived = !!trainee.archivedAt;
  const canCreate = (a: Parameters<typeof can>[1]) => !archived && canPerform(actor.role, commercial.access, a);
  const canCompare = hasFeature(commercial.access, "assessment_compare");
  const setArchived = async (v: boolean) => {
    setErr(null);
    try {
      await repo.setTraineeArchived(actor, trainee.id, v);
      bump();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badge={archived ? <Badge>Arquivado</Badge> : undefined}
        eyebrow={<Link href="/app/alunos" className="hover:underline">Alunos</Link>}
        title={trainee.displayName}
        description={`${trainee.code} · ${trainee.goal || "objetivo não informado"}`}
        actions={
          <>
            {canCreate("assessment.write") && <Button onClick={newAssessment}>Nova avaliação</Button>}
            {canCreate("plan.draft") && <ButtonLink variant="secondary" href={`/app/treinos/novo?aluno=${trainee.id}`}>Novo treino</ButtonLink>}
            <ButtonLink variant="ghost" href={`/app/evolucao?aluno=${trainee.id}`}>Ver evolução</ButtonLink>
            {can(actor.role, "trainee.write") && (
              <Button variant="ghost" onClick={() => setArchived(!archived)}>{archived ? "Reativar aluno" : "Arquivar aluno"}</Button>
            )}
          </>
        }
      />
      {err && <ErrorNote>{err}</ErrorNote>}
      {archived && <InfoNote>{ARCHIVED_MESSAGE}</InfoNote>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">Avaliações</h2>
            {assessments.length >= 2 && canCompare && (
              <Link href={`/app/avaliacoes/comparar?aluno=${trainee.id}`} className="text-sm font-semibold underline underline-offset-2">Comparar duas avaliações</Link>
            )}
          </div>
          {assessments.length === 0 ? (
            <p className="text-theme-muted">Nenhuma avaliação registrada.</p>
          ) : (
            <ul className="divide-y divide-theme-border">
              {assessments.map((a) => (
                <li key={a.id}>
                  <Link href={`/app/avaliacoes/${a.id}`} className="flex min-h-[48px] items-center justify-between py-2 hover:text-theme-teal">
                    <span>Versão {a.version} · {formatDateBR(a.date)}</span>
                    <Badge tone={a.status === "completed" ? "success" : "neutral"}>{a.status === "completed" ? "Concluída" : "Rascunho"}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel className="p-5">
          <h2 className="mb-3 text-lg font-bold">Treinos</h2>
          {plans.length === 0 ? (
            <p className="text-theme-muted">Nenhum treino criado.</p>
          ) : (
            <ul className="divide-y divide-theme-border">
              {plans.map((p) => (
                <li key={p.id}>
                  <Link href={`/app/treinos/${p.id}`} className="flex min-h-[48px] items-center justify-between gap-2 py-2 hover:text-theme-teal">
                    <span className="font-medium">{p.title}</span>
                    <span className="flex gap-1.5">
                      {published(p) && <Badge tone="success">Disponível v{published(p)!.number}</Badge>}
                      {latest(p).status === "draft" && <Badge tone="caution">Rascunho v{latest(p).number}</Badge>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      {/* Só o professor responsável dá acesso ao aluno (estudante trabalha com casos didáticos) */}
      {can(actor.role, "plan.publish") && trainee.ownerId === actor.id && (
        <PractitionerAccessPanel traineeId={trainee.id} demo={mode !== "supabase"} archived={archived} />
      )}
      {can(actor.role, "trainee.read") && <FollowUpPanel trainee={trainee} canWrite={canCreate("trainee.write")} />}
      {can(actor.role, "trainee.read") && <TraineePhotos trainee={trainee} />}
    </div>
  );
}
