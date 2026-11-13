"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAsync, useData } from "@/components/providers/DataProvider";
import AssessmentFlow from "@/components/assessment/flow/AssessmentFlow";
import { AssessmentPhotos } from "@/components/posture/PhotoSetPanel";
import { ButtonLink, DemoBadge, EmptyState, ErrorNote, Loading, PageHeader } from "@/components/ui/primitives";

export default function AvaliacaoPage() {
  const { id } = useParams<{ id: string }>();
  const { repo, actor, revision } = useData();
  const data = useAsync(async () => {
    const a = await repo.getAssessment(actor, id);
    if (!a) return null;
    const t = await repo.getTrainee(actor, a.traineeId);
    return t ? { a, t } : null;
  }, [repo, actor, id, revision]);

  if (data.status === "loading") return <Loading label="Carregando avaliação…" />;
  if (data.status === "error") return <ErrorNote>{data.error}</ErrorNote>;
  if (!data.data)
    return (
      <EmptyState title="Avaliação não encontrada" action={<ButtonLink href="/app/avaliacoes" variant="secondary">Voltar</ButtonLink>}>
        Ela não existe ou pertence a outro profissional.
      </EmptyState>
    );

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={
          <span className="flex flex-wrap items-center gap-2">
            <Link href={`/app/alunos/${data.data.t.id}`} className="hover:underline">{data.data.t.displayName}</Link>
            {data.data.a.isDemo && <DemoBadge />}
          </span>
        }
        title="Avaliação"
      />
      {/* key garante estado limpo ao trocar de avaliação: dados de uma nunca vazam para outra */}
      <AssessmentFlow key={data.data.a.id} initial={data.data.a} trainee={data.data.t} />
      <AssessmentPhotos assessmentId={data.data.a.id} assessmentDate={data.data.a.date} traineeId={data.data.t.id} ownerId={data.data.t.ownerId} />
    </div>
  );
}
