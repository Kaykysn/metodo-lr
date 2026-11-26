"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAsync, useData } from "@/components/providers/DataProvider";
import PlanEditor from "@/components/training/PlanEditor";
import { ButtonLink, DemoBadge, EmptyState, ErrorNote, Loading, PageHeader } from "@/components/ui/primitives";
import { latest } from "@/lib/domain/plans";
import { can } from "@/lib/domain/roles";

export default function EditarTreinoPage() {
  const { id } = useParams<{ id: string }>();
  const { repo, actor, revision } = useData();
  const data = useAsync(async () => {
    const plan = await repo.getPlan(actor, id);
    if (!plan) return null;
    const [trainee, assessment] = await Promise.all([repo.getTrainee(actor, plan.traineeId), latest(plan).sourceAssessmentId ? repo.getAssessment(actor, latest(plan).sourceAssessmentId!) : Promise.resolve(null)]);
    return { plan, trainee, assessment };
  }, [repo, actor, id, revision]);

  if (data.status === "loading") return <Loading />;
  if (data.status === "error") return <ErrorNote>{data.error}</ErrorNote>;
  if (!data.data || !can(actor.role, "plan.draft"))
    return <EmptyState title="Treino não encontrado" action={<ButtonLink href="/app/treinos" variant="secondary">Voltar</ButtonLink>}>Confira o endereço ou volte à lista.</EmptyState>;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={
          <span className="flex flex-wrap items-center gap-2">
            <Link href={`/app/treinos/${id}`} className="hover:underline">{data.data.plan.title}</Link>
            {data.data.plan.isDemo && <DemoBadge />}
          </span>
        }
        title={`Montar treino — ${data.data.trainee?.displayName ?? ""}`}
        description={`${data.data.plan.frequencyPerWeek}x por semana, ${data.data.plan.weeks} semanas.`}
      />
      <PlanEditor key={latest(data.data.plan).id} initial={data.data.plan} assessment={data.data.assessment} />
    </div>
  );
}
