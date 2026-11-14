"use client";

import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Badge, Button, ErrorNote, Panel } from "@/components/ui/primitives";
import { getCatalogRepo } from "@/lib/catalog/bridge";
import type { CatalogExercise, CatalogMedia, SyncRun } from "@/lib/catalog/types";

const STATUS: Record<SyncRun["status"], { label: string; tone: "success" | "caution" | "danger" | "neutral" }> = {
  running: { label: "Em andamento", tone: "neutral" },
  success: { label: "Concluída", tone: "success" },
  partial: { label: "Parcial", tone: "caution" },
  failed: { label: "Falhou", tone: "danger" },
};
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }) : "—");

/** Catálogo wger (sincronização manual e histórico) e autorizações de compartilhamento. */
export default function CatalogAdminPanel() {
  const [repo] = useState(getCatalogRepo);
  const [runs, setRuns] = useState<SyncRun[] | null>(null);
  const [requests, setRequests] = useState<{ exercises: CatalogExercise[]; media: CatalogMedia[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    repo.syncRuns().then(setRuns).catch(() => setRuns([]));
    repo.shareRequests().then(setRequests).catch(() => setRequests({ exercises: [], media: [] }));
  }, [repo]);
  useEffect(load, [load]);

  if (repo.mode !== "supabase") {
    return (
      <Panel className="p-5">
        <h2 className="font-bold">Catálogo de exercícios</h2>
        <p className="mt-1 text-[15px] text-theme-muted">Na demonstração o catálogo usa uma amostra fixa do wger. A sincronização existe só com o backend real.</p>
      </Panel>
    );
  }

  const sync = async () => {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const r = await repo.syncNow();
      setMsg(`Sincronização ${STATUS[r.status].label.toLowerCase()}: ${r.created} novos, ${r.updated} atualizados, ${r.unchanged} sem mudança, ${r.deactivated} saíram da fonte.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na sincronização.");
    } finally {
      setBusy(false);
      load();
    }
  };
  const decide = async (kind: "exercise" | "media", id: string, shared: boolean) => {
    setError(null);
    try {
      await repo.setShared(kind, id, shared);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível registrar a decisão.");
    }
  };
  const pending = (requests?.exercises.length ?? 0) + (requests?.media.length ?? 0);

  return (
    <Panel className="space-y-5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold">Catálogo de exercícios (wger)</h2>
          <p className="text-[15px] text-theme-muted">Importa e atualiza os exercícios públicos do wger.de. Nada é apagado: o que sai da fonte fica arquivado e os treinos continuam válidos.</p>
        </div>
        <Button onClick={sync} disabled={busy}>
          <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} aria-hidden="true" /> {busy ? "Sincronizando… (até 2 min)" : "Sincronizar agora"}
        </Button>
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      {msg && <p role="status" className="rounded-control border border-status-success-border bg-status-success-bg px-3 py-2 text-sm text-status-success-fg">{msg}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">Últimas sincronizações</caption>
          <thead className="text-theme-muted">
            <tr><th scope="col" className="py-2">Início</th><th scope="col">Situação</th><th scope="col">Na fonte</th><th scope="col">Novos</th><th scope="col">Atualizados</th><th scope="col">Arquivados</th><th scope="col">Com vídeo / imagem</th></tr>
          </thead>
          <tbody className="divide-y divide-theme-border">
            {runs === null ? (
              <tr><td colSpan={7} className="py-3 text-theme-muted">Carregando…</td></tr>
            ) : runs.length === 0 ? (
              <tr><td colSpan={7} className="py-3 text-theme-muted">Nenhuma sincronização ainda.</td></tr>
            ) : (
              runs.map((r) => (
                <tr key={r.id} className="tabular align-top">
                  <td className="py-2">{when(r.started_at)}<span className="block text-xs text-theme-muted">{r.trigger === "cron" ? "automática" : "manual"}</span></td>
                  <td><Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>{r.errors.length > 0 && <span className="mt-1 block text-xs text-theme-muted">{r.errors[0].message}</span>}</td>
                  <td>{r.source_count ?? "—"}</td>
                  <td>{r.created}</td>
                  <td>{r.updated}</td>
                  <td>{r.deactivated}</td>
                  <td>{r.with_video ?? "—"} / {r.with_image ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <section aria-labelledby="share-req" className="space-y-2 border-t border-theme-border pt-4">
        <h3 id="share-req" className="font-semibold">Pedidos de compartilhamento {pending > 0 && <Badge tone="caution">{pending}</Badge>}</h3>
        {!requests ? (
          <p className="text-sm text-theme-muted">Carregando…</p>
        ) : pending === 0 ? (
          <p className="text-sm text-theme-muted">Nenhum pedido. Quando um professor pedir para compartilhar um exercício ou vídeo próprio, ele aparece aqui para você autorizar.</p>
        ) : (
          <ul className="space-y-2">
            {requests.exercises.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-theme-border p-3 text-sm">
                <span><strong>Exercício:</strong> {e.name} <a href={`/app/exercicios?fonte=catalogo&catalogo=mine&item=${encodeURIComponent(e.id)}`} className="ml-1 text-theme-teal underline">ver ficha</a></span>
                <span className="flex gap-1">
                  <Button variant="secondary" onClick={() => decide("exercise", e.id, true)}>Autorizar</Button>
                  <Button variant="ghost" onClick={() => decide("exercise", e.id, false)}>Recusar</Button>
                </span>
              </li>
            ))}
            {requests.media.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-theme-border p-3 text-sm">
                <span><strong>Vídeo:</strong> {m.title || "sem título"} <span className="text-theme-muted">({m.exercise_id})</span></span>
                <span className="flex gap-1">
                  <Button variant="secondary" onClick={() => decide("media", m.id, true)}>Autorizar</Button>
                  <Button variant="ghost" onClick={() => decide("media", m.id, false)}>Recusar</Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Panel>
  );
}
