"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAsync, useData } from "@/components/providers/DataProvider";
import { Button, ErrorNote, Field, InfoNote, Loading, Panel, inputClass, formatDateBR } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ui/PageHeader";
import { NumberInput } from "@/components/assessment/flow/controls";
import { createDraftFromAssessment, latest, published, reuseAsDraft } from "@/lib/domain/plans";
import { suggest } from "@/lib/domain/suggestion-rules";
import { hasFeature } from "@/lib/subscription/entitlements";
import { isArchived } from "@/lib/subscription/limits";
import { FeatureLock, useCreateBlock } from "@/components/subscription/PlanNotices";

export default function NovoTreinoPage() {
  return (
    <Suspense fallback={<Loading />}>
      <NovoTreino />
    </Suspense>
  );
}

function NovoTreino() {
  const { repo, actor, revision, commercial } = useData();
  const router = useRouter();
  const params = useSearchParams();
  const originId = params.get("origem");
  const data = useAsync(async () => {
    const [all, assessments, source] = await Promise.all([repo.listTrainees(actor), repo.listAssessments(actor), originId ? repo.getPlan(actor, originId) : Promise.resolve(null)]);
    // Arquivados ficam fora: reative o aluno para planejar
    return { trainees: all.filter((t) => !isArchived(t)), assessments, source };
  }, [repo, actor, revision, originId]);
  const rulesOn = hasFeature(commercial.access, "rule_suggestions");
  const reuseOn = hasFeature(commercial.access, "plan_reuse");
  const createBlock = useCreateBlock();
  const source = data.data?.source ?? null;
  useEffect(() => {
    if (source) setForm((f) => ({ ...f, weeks: source.weeks, freq: source.frequencyPerWeek }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source?.id]);
  const [form, setForm] = useState({ traineeId: params.get("aluno") ?? "", assessmentId: "", title: "", weeks: 6 as number | null, freq: 2 as number | null, start: new Date().toISOString().slice(0, 10) });
  const [err, setErr] = useState<string | null>(null);

  const forTrainee = data.data?.assessments.filter((a) => a.traineeId === form.traineeId) ?? [];
  useEffect(() => {
    if (forTrainee.length && !forTrainee.some((a) => a.id === form.assessmentId)) setForm((f) => ({ ...f, assessmentId: forTrainee[0].id }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.traineeId, data.status]);

  const assessment = forTrainee.find((a) => a.id === form.assessmentId);
  // A triagem vale em todos os planos; as opções do motor de regras são do Completo
  const result = assessment ? suggest(assessment) : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assessment) return setErr("Escolha o aluno e a avaliação de origem. Sem avaliação, registre uma antes de planejar.");
    if (!form.weeks || !form.freq) return setErr("Informe período e frequência.");
    try {
      const t = data.data!.trainees.find((x) => x.id === form.traineeId)!;
      if (result?.status === "blocked") return setErr("A triagem desta avaliação pede avaliação complementar antes de criar treino.");
      const plan = source
        ? reuseAsDraft({ actor, source: { ...source, weeks: form.weeks, frequencyPerWeek: form.freq }, targetAssessment: assessment, title: form.title.trim() || `${source.title} — ${t.displayName}`, startDate: form.start })
        : createDraftFromAssessment({
            actor,
            assessment,
            suggestion: rulesOn && result?.status === "ok" ? result : null,
            title: form.title.trim() || `Treino — ${t.displayName}`,
            frequencyPerWeek: form.freq,
            weeks: form.weeks,
            startDate: form.start,
          });
      await repo.savePlan(actor, plan);
      router.push(`/app/treinos/${plan.id}/editar`);
    } catch (x) {
      setErr((x as Error).message);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        eyebrow={<Link href="/app/treinos" className="hover:underline">Treinos</Link>}
        title={originId ? "Reaproveitar treino" : "Novo treino"}
        description={originId ? "A estrutura vira um novo rascunho para o aluno escolhido, ligado à avaliação dele. Nada é aprovado automaticamente." : "Todo treino nasce ligado a um aluno e à avaliação que o fundamenta."}
      />
      {data.status === "loading" && <Loading />}
      {data.status === "error" && <ErrorNote>{data.error}</ErrorNote>}
      {data.status === "ready" && originId && !source && <ErrorNote>O treino de origem não foi encontrado.</ErrorNote>}
      {data.status === "ready" && originId && source && !reuseOn && commercial.access && <FeatureLock feature="plan_reuse" />}
      {data.status === "ready" && createBlock && <InfoNote tone="caution">{createBlock}</InfoNote>}
      {data.status === "ready" && (!originId || (source && reuseOn)) && (
        <Panel className="p-5">
          <form className="grid gap-5 sm:grid-cols-2" onSubmit={submit} noValidate>
            <Field label="Aluno" htmlFor="t" required>
              <select id="t" className={inputClass} value={form.traineeId} onChange={(e) => setForm({ ...form, traineeId: e.target.value, assessmentId: "" })}>
                <option value="">Escolha…</option>
                {data.data!.trainees.map((t) => <option key={t.id} value={t.id}>{t.displayName} ({t.code})</option>)}
              </select>
            </Field>
            <Field label="Avaliação de origem" htmlFor="a" required>
              <select id="a" className={inputClass} value={form.assessmentId} disabled={!forTrainee.length} onChange={(e) => setForm({ ...form, assessmentId: e.target.value })}>
                {!forTrainee.length && <option value="">Nenhuma avaliação para este aluno</option>}
                {forTrainee.map((a) => <option key={a.id} value={a.id}>v{a.version} — {formatDateBR(a.date)} ({a.status === "completed" ? "concluída" : "rascunho"})</option>)}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Nome do treino" htmlFor="n">
                <input id="n" className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="ex.: Força global — fase 1" />
              </Field>
            </div>
            <Field label="Período (semanas)" htmlFor="w" required>
              <NumberInput id="w" min={1} max={52} value={form.weeks} onChange={(v) => setForm({ ...form, weeks: v })} />
            </Field>
            <Field label="Frequência (sessões/semana)" htmlFor="f" required>
              <NumberInput id="f" min={1} max={14} value={form.freq} onChange={(v) => setForm({ ...form, freq: v })} />
            </Field>
            <Field label="Início" htmlFor="s" required>
              <input id="s" type="date" className={inputClass} value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
            </Field>
            <div className="sm:col-span-2 space-y-3">
              {source && (
                <InfoNote>
                  Origem: “{source.title}”, versão {(published(source) ?? latest(source)).number}. Exercícios, doses e orientações são copiados; notas privadas e critérios individualizados do aluno de origem não. Revise tudo antes de aprovar.
                </InfoNote>
              )}
              {!source && result && result.status === "ok" && !rulesOn && commercial.access && (
                <InfoNote>O rascunho começa vazio para montagem manual. Opções de exercício ligadas à avaliação fazem parte do plano Completo; a triagem continua valendo em todos os planos.</InfoNote>
              )}
              {!source && rulesOn && result && result.status === "ok" && <InfoNote>O rascunho começa com as opções compatíveis da avaliação ({result.groups.map((g) => g.title).join("; ")}). Você define a dose.</InfoNote>}
              {result && result.status !== "ok" && (
                <InfoNote tone="caution">
                  {result.headline}.{result.status === "blocked" ? " Não é possível criar treino a partir desta avaliação." : " O rascunho será manual e identificado como tal."}
                </InfoNote>
              )}
              {err && <ErrorNote>{err}</ErrorNote>}
              <Button type="submit" disabled={result?.status === "blocked" || !!createBlock}>Criar rascunho</Button>
            </div>
          </form>
        </Panel>
      )}
    </div>
  );
}
