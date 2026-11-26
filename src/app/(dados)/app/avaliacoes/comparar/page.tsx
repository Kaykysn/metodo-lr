"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAsync, useData } from "@/components/providers/DataProvider";
import { DemoBadge, EmptyState, ErrorNote, Field, InfoNote, Loading, PageHeader, Panel, inputClass, formatDateBR } from "@/components/ui/primitives";
import { FeatureGate } from "@/components/subscription/PlanNotices";
import { compareAssessments, type CompareLine } from "@/lib/domain/assessment-compare";
import { regionLabel } from "@/components/assessment/AnatomyMap";
import type { Assessment } from "@/lib/domain/types";

export default function CompararPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Comparar />
    </Suspense>
  );
}

const label = (a: Assessment) => `Versão ${a.version} · ${formatDateBR(a.date)}${a.status === "completed" ? "" : " (rascunho)"}`;

function Comparar() {
  const { repo, actor, revision, mode } = useData();
  const params = useSearchParams();
  const traineeId = params.get("aluno") ?? "";
  const data = useAsync(async () => {
    const trainee = await repo.getTrainee(actor, traineeId);
    if (!trainee) return null;
    const list = (await repo.listAssessments(actor, traineeId)).sort((x, y) => x.date.localeCompare(y.date) || x.version - y.version);
    return { trainee, list };
  }, [repo, actor, traineeId, revision]);
  const [ids, setIds] = useState<{ a: string; b: string }>({ a: "", b: "" });

  if (data.status === "loading") return <Loading />;
  if (data.status === "error") return <ErrorNote>{data.error}</ErrorNote>;
  if (!data.data) return <EmptyState title="Aluno não encontrado">Confira o endereço ou volte à lista.</EmptyState>;

  const { trainee, list } = data.data;
  const aId = ids.a || list[list.length - 2]?.id || "";
  const bId = ids.b || list[list.length - 1]?.id || "";
  const A = list.find((x) => x.id === aId);
  const B = list.find((x) => x.id === bId);
  const lines = A && B && A.id !== B.id ? compareAssessments(A, B, regionLabel) : [];
  const sections = Array.from(new Set(lines.map((l) => l.section)));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<Link href={`/app/alunos/${trainee.id}`} className="hover:underline">{trainee.displayName} · {trainee.code}</Link>}
        title="Comparar avaliações"
        description="Duas avaliações do mesmo aluno, lado a lado. Cada medida só é comparada com ela mesma, na mesma unidade."
        badge={mode === "demo" ? <DemoBadge /> : undefined}
      />
      <FeatureGate feature="assessment_compare">
        {list.length < 2 ? (
          <EmptyState title="É preciso ter duas avaliações">Registre uma reavaliação para comparar.</EmptyState>
        ) : (
          <>
            <Panel className="grid gap-3 p-4 sm:grid-cols-2">
              <Field label="Avaliação anterior" htmlFor="cmp-a">
                <select id="cmp-a" className={inputClass} value={aId} onChange={(e) => setIds({ a: e.target.value, b: bId })}>
                  {list.map((x) => <option key={x.id} value={x.id}>{label(x)}</option>)}
                </select>
              </Field>
              <Field label="Avaliação posterior" htmlFor="cmp-b">
                <select id="cmp-b" className={inputClass} value={bId} onChange={(e) => setIds({ a: aId, b: e.target.value })}>
                  {list.map((x) => <option key={x.id} value={x.id}>{label(x)}</option>)}
                </select>
              </Field>
            </Panel>
            {A && B && A.id === B.id && <InfoNote tone="caution">Escolha duas avaliações diferentes.</InfoNote>}
            {lines.length > 0 && (
              <div className="overflow-x-auto rounded-panel border border-theme-border bg-theme-primary">
                <table className="w-full min-w-[560px] text-left text-[15px]">
                  <caption className="sr-only">Comparação entre {label(A!)} e {label(B!)}</caption>
                  <thead className="border-b border-theme-border text-sm text-theme-muted">
                    <tr>
                      <th scope="col" className="w-[34%] px-4 py-3 font-semibold">Item</th>
                      <th scope="col" className="px-4 py-3 font-semibold">{label(A!)}</th>
                      <th scope="col" className="px-4 py-3 font-semibold">{label(B!)}</th>
                    </tr>
                  </thead>
                  {sections.map((sec) => (
                    <tbody key={sec} className="divide-y divide-theme-border border-b border-theme-border last:border-b-0">
                      <tr className="bg-theme-secondary/60">
                        <th scope="colgroup" colSpan={3} className="px-4 py-2 text-sm font-semibold">{sec}</th>
                      </tr>
                      {lines.filter((l) => l.section === sec).map((l: CompareLine) => (
                        <tr key={`${sec}-${l.label}`}>
                          <th scope="row" className="px-4 py-2.5 font-medium">{l.label}</th>
                          <td className="tabular px-4 py-2.5">{l.a}</td>
                          <td className={`tabular px-4 py-2.5 ${l.changed ? "font-semibold" : ""}`}>{l.b}</td>
                        </tr>
                      ))}
                    </tbody>
                  ))}
                </table>
              </div>
            )}
            <InfoNote>Valores em negrito na segunda coluna diferem da primeira; isso não indica melhora ou piora. “Não registrado” significa que a medida não foi feita naquela avaliação, o que é diferente de zero.</InfoNote>
          </>
        )}
      </FeatureGate>
    </div>
  );
}
