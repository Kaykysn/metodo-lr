"use client";

import React from "react";
import Link from "next/link";
import { useAsync, useData } from "@/components/providers/DataProvider";
import { Badge, ButtonLink, DemoBadge, EmptyState, ErrorNote, Loading, PageHeader, formatDateBR } from "@/components/ui/primitives";
import { can } from "@/lib/domain/roles";
import { evaluateTriage } from "@/lib/domain/triage";

export default function AvaliacoesPage() {
  const { repo, actor, revision, mode } = useData();
  const data = useAsync(async () => {
    const [assessments, trainees] = await Promise.all([repo.listAssessments(actor), repo.listTrainees(actor)]);
    return { assessments, trainees };
  }, [repo, actor, revision]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Avaliações"
        description="Cada avaliação pertence a um aluno e fica salva com versão e data."
        badge={mode === "demo" ? <DemoBadge /> : undefined}
        actions={can(actor.role, "assessment.write") && <ButtonLink href="/app/avaliacoes/nova">Nova avaliação</ButtonLink>}
      />
      {data.status === "loading" && <Loading />}
      {data.status === "error" && <ErrorNote>{data.error}</ErrorNote>}
      {data.status === "ready" &&
        (data.data!.assessments.length === 0 ? (
          <EmptyState title="Nenhuma avaliação" action={can(actor.role, "assessment.write") ? <ButtonLink href="/app/avaliacoes/nova">Começar avaliação</ButtonLink> : undefined}>
            {can(actor.role, "assessment.read") ? "Comece escolhendo um aluno." : "Seu perfil não acessa avaliações."}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto rounded-panel border border-theme-border bg-theme-primary">
            <table className="w-full text-left text-[15px]">
              <caption className="sr-only">Avaliações registradas</caption>
              <thead className="border-b border-theme-border text-sm text-theme-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Aluno</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Data</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Versão</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Triagem</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {data.data!.assessments.map((a) => {
                  const t = data.data!.trainees.find((x) => x.id === a.traineeId);
                  const tr = evaluateTriage(a.blocks.safety);
                  return (
                    <tr key={a.id} className="hover:bg-theme-secondary/50">
                      <td className="px-4 py-3">
                        <Link href={`/app/avaliacoes/${a.id}`} className="font-semibold hover:text-theme-teal hover:underline">{t?.displayName ?? "Aluno"}</Link>
                        <span className="ml-2 text-sm text-theme-muted">{t?.code}</span>
                      </td>
                      <td className="tabular px-4 py-3">{formatDateBR(a.date)}</td>
                      <td className="tabular px-4 py-3">v{a.version}</td>
                      <td className="px-4 py-3">
                        {tr.status === "urgent" && <Badge tone="danger">Possível urgência</Badge>}
                        {tr.status === "refer" && <Badge tone="caution">Avaliação complementar</Badge>}
                        {tr.status === "incomplete" && <Badge>Incompleta</Badge>}
                        {tr.status === "none_reported" && <Badge tone="success">Sem alerta relatado</Badge>}
                      </td>
                      <td className="px-4 py-3"><Badge tone={a.status === "completed" ? "success" : "neutral"}>{a.status === "completed" ? "Concluída" : "Rascunho"}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );
}
