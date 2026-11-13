"use client";

import React from "react";
import Link from "next/link";
import { ClipboardList, Dumbbell, Users } from "lucide-react";
import { useAsync, useData } from "@/components/providers/DataProvider";
import { ButtonLink, DemoBadge, EmptyState, ErrorNote, Loading, PageHeader, Panel, formatDateBR, Badge } from "@/components/ui/primitives";
import { latest, published } from "@/lib/domain/plans";
import { can } from "@/lib/domain/roles";

export default function OverviewPage() {
  const { repo, actor, revision, mode } = useData();
  const data = useAsync(async () => {
    const [trainees, assessments, plans] = await Promise.all([repo.listTrainees(actor), repo.listAssessments(actor), repo.listPlans(actor)]);
    return { trainees, assessments, plans };
  }, [repo, actor, revision]);

  if (actor.role === "practitioner") {
    return (
      <EmptyState title="Esta é a área do professor" action={<ButtonLink href="/aluno">Ir para o meu treino</ButtonLink>}>
        Como aluno, você acessa apenas o treino disponibilizado e o registro do que fez.
      </EmptyState>
    );
  }
  if (actor.role === "admin") {
    return (
      <EmptyState title="Administração não acessa dados de saúde" action={<ButtonLink href="/admin" variant="secondary">Abrir gestão de acessos</ButtonLink>}>
        O perfil de administração gerencia solicitações e prazos de acesso. Fichas de alunos ficam restritas aos profissionais responsáveis.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Visão geral"
        description="O que precisa da sua atenção hoje."
        badge={mode === "demo" ? <DemoBadge /> : undefined}
        actions={can(actor.role, "assessment.write") && <ButtonLink href="/app/avaliacoes/nova">Nova avaliação</ButtonLink>}
      />
      {data.status === "loading" && <Loading />}
      {data.status === "error" && <ErrorNote>Não foi possível carregar seus dados: {data.error}</ErrorNote>}
      {data.status === "ready" && data.data && (
        <>
          <dl className="grid gap-px overflow-hidden rounded-panel border border-theme-border bg-theme-border sm:grid-cols-3">
            {[
              { icon: Users, label: "Alunos sob sua responsabilidade", value: data.data.trainees.length, href: "/app/alunos" },
              { icon: ClipboardList, label: "Avaliações em rascunho", value: data.data.assessments.filter((a) => a.status === "draft").length, href: "/app/avaliacoes" },
              { icon: Dumbbell, label: "Treinos aguardando aprovação", value: data.data.plans.filter((p) => latest(p).status === "draft").length, href: "/app/treinos" },
            ].map(({ icon: Icon, label, value, href }) => (
              <Link key={label} href={href} className="group bg-theme-primary p-5 hover:bg-theme-secondary/60">
                <dt className="flex items-center gap-2 text-sm text-theme-muted">
                  <Icon className="h-4 w-4" aria-hidden="true" /> {label}
                </dt>
                <dd className="tabular mt-1 text-3xl font-bold">{value}</dd>
              </Link>
            ))}
          </dl>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel className="p-5">
              <h2 className="mb-3 text-lg font-bold">Avaliações recentes</h2>
              {data.data.assessments.length === 0 ? (
                <EmptyState title="Nenhuma avaliação ainda" action={<ButtonLink href="/app/avaliacoes/nova">Começar a primeira</ButtonLink>} />
              ) : (
                <ul className="divide-y divide-theme-border">
                  {data.data.assessments.slice(0, 5).map((a) => {
                    const t = data.data!.trainees.find((x) => x.id === a.traineeId);
                    return (
                      <li key={a.id}>
                        <Link href={`/app/avaliacoes/${a.id}`} className="flex min-h-[52px] items-center justify-between gap-3 py-2 hover:text-theme-teal">
                          <span>
                            <span className="font-semibold">{t?.displayName ?? "Aluno"}</span>{" "}
                            <span className="text-sm text-theme-muted">{t?.code} · {formatDateBR(a.date)}</span>
                          </span>
                          <Badge tone={a.status === "completed" ? "success" : "neutral"}>{a.status === "completed" ? "Concluída" : "Rascunho"}</Badge>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
            <Panel className="p-5">
              <h2 className="mb-3 text-lg font-bold">Treinos</h2>
              {data.data.plans.length === 0 ? (
                <EmptyState title="Nenhum treino criado">Crie um rascunho a partir da revisão de uma avaliação.</EmptyState>
              ) : (
                <ul className="divide-y divide-theme-border">
                  {data.data.plans.map((p) => {
                    const t = data.data!.trainees.find((x) => x.id === p.traineeId);
                    const l = latest(p);
                    return (
                      <li key={p.id}>
                        <Link href={`/app/treinos/${p.id}`} className="flex min-h-[52px] items-center justify-between gap-3 py-2 hover:text-theme-teal">
                          <span>
                            <span className="font-semibold">{p.title}</span> <span className="text-sm text-theme-muted">{t?.code}</span>
                          </span>
                          <span className="flex gap-1.5">
                            {published(p) && <Badge tone="success">Disponível ao aluno (v{published(p)!.number})</Badge>}
                            {l.status === "draft" && <Badge tone="caution">Rascunho v{l.number}</Badge>}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
