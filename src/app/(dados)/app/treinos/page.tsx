"use client";

import React from "react";
import Link from "next/link";
import { useAsync, useData } from "@/components/providers/DataProvider";
import { Badge, ButtonLink, DemoBadge, EmptyState, ErrorNote, Loading, formatDateBR } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ui/PageHeader";
import { latest, published } from "@/lib/domain/plans";
import { can } from "@/lib/domain/roles";

export default function TreinosPage() {
  const { repo, actor, revision, mode } = useData();
  const data = useAsync(async () => {
    const [plans, trainees] = await Promise.all([repo.listPlans(actor), repo.listTrainees(actor)]);
    return { plans, trainees };
  }, [repo, actor, revision]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Treinos"
        description="Rascunhos, versões aprovadas e o que está disponível para cada aluno."
        badge={mode === "demo" ? <DemoBadge /> : undefined}
        actions={can(actor.role, "plan.draft") && <ButtonLink href="/app/treinos/novo">Novo treino</ButtonLink>}
      />
      {data.status === "loading" && <Loading />}
      {data.status === "error" && <ErrorNote>{data.error}</ErrorNote>}
      {data.status === "ready" &&
        (data.data!.plans.length === 0 ? (
          <EmptyState title="Nenhum treino ainda">O caminho recomendado é concluir uma avaliação e criar o rascunho na revisão.</EmptyState>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {data.data!.plans.map((p) => {
              const t = data.data!.trainees.find((x) => x.id === p.traineeId);
              const l = latest(p);
              const pub = published(p);
              return (
                <li key={p.id}>
                  <Link href={`/app/treinos/${p.id}`} className="block rounded-panel border border-theme-border bg-theme-primary p-5 transition-colors hover:border-theme-teal/60">
                    <p className="text-sm text-theme-muted">{t?.displayName} · {t?.code}</p>
                    <p className="mt-0.5 text-lg font-semibold">{p.title}</p>
                    <p className="tabular mt-1 text-sm text-theme-muted">
                      Início {formatDateBR(p.startDate)} · {p.weeks} semanas · {p.frequencyPerWeek}x/semana
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {pub ? <Badge tone="success">Disponível ao aluno: v{pub.number}</Badge> : <Badge>Ainda não disponível ao aluno</Badge>}
                      {l.status === "draft" && <Badge tone="caution">Rascunho v{l.number}{l.manualDraft ? " (manual)" : ""}</Badge>}
                      {l.status === "approved" && <Badge tone="accent">Aprovado v{l.number}, aguardando disponibilizar</Badge>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ))}
    </div>
  );
}
