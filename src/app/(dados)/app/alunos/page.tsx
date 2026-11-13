"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAsync, useData } from "@/components/providers/DataProvider";
import { Button, DemoBadge, EmptyState, ErrorNote, Field, InfoNote, Loading, PageHeader, Panel, inputClass } from "@/components/ui/primitives";
import { can } from "@/lib/domain/roles";
import type { Trainee } from "@/lib/domain/types";
import { canPerform } from "@/lib/subscription/entitlements";
import { checkActivation, isArchived, traineeUsage, usageMessage } from "@/lib/subscription/limits";
import { useCreateBlock } from "@/components/subscription/PlanNotices";

const EXP: Record<Trainee["experience"], string> = { iniciante: "Iniciante", intermediario: "Intermediário", avancado: "Avançado", nao_informado: "Não informado" };

export default function AlunosPage() {
  const { repo, actor, revision, bump, mode, commercial } = useData();
  const list = useAsync(() => repo.listTrainees(actor), [repo, actor, revision]);
  const [open, setOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [form, setForm] = useState({ displayName: "", goal: "", experience: "nao_informado" as Trainee["experience"] });
  const [err, setErr] = useState<string | null>(null);
  const [rowErr, setRowErr] = useState<string | null>(null);
  const isStudent = actor.role === "pe_student";

  const createBlock = useCreateBlock();
  const usage = traineeUsage(list.data ?? [], commercial.access?.traineeLimit ?? null);
  const activation = checkActivation(usage);
  const canWrite = can(actor.role, "trainee.write");
  const canAdd = canPerform(actor.role, commercial.access, "trainee.write") && activation.ok;
  const active = (list.data ?? []).filter((t) => !isArchived(t));
  const archived = (list.data ?? []).filter(isArchived);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.displayName.trim()) return setErr("Informe como o aluno será identificado.");
    try {
      await repo.createTrainee(actor, form);
      setForm({ displayName: "", goal: "", experience: "nao_informado" });
      setOpen(false);
      setErr(null);
      bump();
    } catch (x) {
      setErr((x as Error).message);
    }
  };

  const toggleArchive = async (t: Trainee, archive: boolean) => {
    setRowErr(null);
    try {
      await repo.setTraineeArchived(actor, t.id, archive);
      bump();
    } catch (x) {
      setRowErr((x as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isStudent ? "Casos didáticos" : "Alunos"}
        description={isStudent ? "Casos de estudo com rascunhos supervisionados. Publicar treino é papel do professor responsável." : "Pessoas acompanhadas sob sua responsabilidade."}
        badge={mode === "demo" ? <DemoBadge /> : undefined}
        actions={canWrite && <Button onClick={() => setOpen((v) => !v)} aria-expanded={open} disabled={!canAdd}>{isStudent ? "Novo caso" : "Cadastrar aluno"}</Button>}
      />

      {canWrite && list.status === "ready" && commercial.access && (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px]">
          <span className={usage.state === "over_limit" ? "font-semibold text-status-caution-fg" : "text-theme-muted"}>
            {usageMessage(usage)}
            {usage.archived > 0 && ` · ${usage.archived} arquivado${usage.archived > 1 ? "s" : ""}`}
          </span>
          <Link href="/planos" className="text-sm font-semibold underline underline-offset-2">Comparar planos</Link>
        </p>
      )}
      {canWrite && createBlock && <InfoNote tone="caution">{createBlock}</InfoNote>}
      {canWrite && !createBlock && !activation.ok && <InfoNote tone="caution">{activation.message}</InfoNote>}
      {rowErr && <ErrorNote>{rowErr}</ErrorNote>}

      {open && canAdd && (
        <Panel className="p-5">
          <form onSubmit={create} className="grid gap-4 md:grid-cols-3" noValidate>
            <Field label="Nome curto ou apelido" htmlFor="dn" required hint="Evite nome completo; o código é gerado automaticamente." error={err ?? undefined}>
              <input id="dn" className={inputClass} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} aria-invalid={!!err} />
            </Field>
            <Field label="Objetivo" htmlFor="gl">
              <input id="gl" className={inputClass} value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
            </Field>
            <Field label="Experiência" htmlFor="ex">
              <select id="ex" className={inputClass} value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value as Trainee["experience"] })}>
                {Object.entries(EXP).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <div className="flex gap-2 md:col-span-3">
              <Button type="submit">Salvar</Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            </div>
          </form>
        </Panel>
      )}

      {list.status === "loading" && <Loading />}
      {list.status === "error" && <ErrorNote>{list.error}</ErrorNote>}
      {list.status === "ready" && (active.length === 0 ? (
        <EmptyState title={archived.length ? "Nenhum aluno ativo" : "Nenhum aluno cadastrado"}>
          {archived.length ? "Os arquivados estão logo abaixo e podem ser reativados." : "Cadastre o primeiro aluno para começar uma avaliação."}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-panel border border-theme-border bg-theme-primary">
          <table className="w-full text-left text-[15px]">
            <caption className="sr-only">Alunos ativos</caption>
            <thead className="border-b border-theme-border text-sm text-theme-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Aluno</th>
                <th scope="col" className="px-4 py-3 font-semibold">Código</th>
                <th scope="col" className="px-4 py-3 font-semibold">Objetivo</th>
                <th scope="col" className="px-4 py-3 font-semibold">Experiência</th>
                {canWrite && <th scope="col" className="px-4 py-3"><span className="sr-only">Ações</span></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {active.map((t) => (
                <tr key={t.id} className="hover:bg-theme-secondary/50">
                  <td className="px-4 py-3"><Link href={`/app/alunos/${t.id}`} className="font-semibold hover:text-theme-teal hover:underline">{t.displayName}</Link></td>
                  <td className="tabular px-4 py-3 text-theme-muted">{t.code}</td>
                  <td className="px-4 py-3">{t.goal || <span className="text-theme-subtle">—</span>}</td>
                  <td className="px-4 py-3">{EXP[t.experience]}</td>
                  {canWrite && (
                    <td className="px-2 py-1 text-right">
                      <button type="button" onClick={() => toggleArchive(t, true)} className="min-h-[44px] rounded-control px-3 text-sm font-semibold text-theme-muted hover:bg-theme-secondary hover:text-theme-text">
                        Arquivar<span className="sr-only"> {t.displayName}</span>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {list.status === "ready" && archived.length > 0 && (
        <section className="space-y-3">
          <button type="button" aria-expanded={showArchived} aria-controls="lista-arquivados" onClick={() => setShowArchived((v) => !v)} className="min-h-[44px] text-[15px] font-semibold underline-offset-2 hover:underline">
            {showArchived ? "Ocultar" : "Mostrar"} arquivados ({archived.length})
          </button>
          {showArchived && (
            <div id="lista-arquivados" className="space-y-3">
              <p className="text-sm text-theme-muted">Arquivados não contam no limite e continuam consultáveis. Para registrar algo novo, reative o aluno.</p>
              <ul className="divide-y divide-theme-border rounded-panel border border-theme-border bg-theme-primary">
                {archived.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                    <Link href={`/app/alunos/${t.id}`} className="font-semibold hover:underline">
                      {t.displayName} <span className="tabular font-normal text-theme-muted">{t.code}</span>
                    </Link>
                    {canWrite && (
                      <Button variant="secondary" onClick={() => toggleArchive(t, false)} disabled={!canAdd}>
                        Reativar<span className="sr-only"> {t.displayName}</span>
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
