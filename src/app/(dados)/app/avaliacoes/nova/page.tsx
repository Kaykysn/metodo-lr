"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAsync, useData } from "@/components/providers/DataProvider";
import { Button, EmptyState, ErrorNote, Field, Loading, Panel, inputClass } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ui/PageHeader";

export default function NovaAvaliacaoPage() {
  const { repo, actor, revision } = useData();
  const router = useRouter();
  const trainees = useAsync(() => repo.listTrainees(actor), [repo, actor, revision]);
  const [traineeId, setTraineeId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const start = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!traineeId) return setErr("Escolha o aluno.");
    setBusy(true);
    try {
      const a = await repo.createAssessment(actor, traineeId);
      router.push(`/app/avaliacoes/${a.id}`);
    } catch (x) {
      setErr((x as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <PageHeader eyebrow={<Link href="/app/avaliacoes" className="hover:underline">Avaliações</Link>} title="Nova avaliação" description="Cada aluno tem suas próprias avaliações; uma nova avaliação não apaga as anteriores." />
      {trainees.status === "loading" && <Loading />}
      {trainees.status === "error" && <ErrorNote>{trainees.error}</ErrorNote>}
      {trainees.status === "ready" &&
        (trainees.data!.length === 0 ? (
          <EmptyState title="Cadastre um aluno primeiro" action={<Link className="font-semibold text-theme-teal underline" href="/app/alunos">Ir para alunos</Link>} />
        ) : (
          <Panel className="p-5">
            <form onSubmit={start} className="space-y-4" noValidate>
              <Field label="Aluno" htmlFor="aluno" required error={err ?? undefined}>
                <select id="aluno" className={inputClass} value={traineeId} onChange={(e) => setTraineeId(e.target.value)} aria-invalid={!!err}>
                  <option value="">Escolha…</option>
                  {trainees.data!.map((t) => (
                    <option key={t.id} value={t.id}>{t.displayName} ({t.code})</option>
                  ))}
                </select>
              </Field>
              <Button type="submit" disabled={busy}>Começar avaliação</Button>
            </form>
          </Panel>
        ))}
    </div>
  );
}
