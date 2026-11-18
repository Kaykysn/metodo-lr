"use client";

// Fila de pedidos de acesso (nome e e-mail). Etapas separadas: pedido → aprovado e convidado
// (e-mail enviado ou link copiado) → ativado (senha criada). O convite pode ser reenviado se não
// chegar ou expirar. O link aparece só aqui, para o admin (com segundo fator) mandar por outro canal.
import React, { useCallback, useEffect, useState } from "react";
import { Check, Copy, MailCheck, MailX, RefreshCw, Send, XCircle } from "lucide-react";
import { inviteRequest, loadRequests, rejectRequest, type AccessRequest, type RequestStatus } from "@/lib/data/admin-api";

const LABEL: Record<RequestStatus, { text: string; cls: string }> = {
  pendente: { text: "Pendente", cls: "border-status-caution-border bg-status-caution-bg text-status-caution-fg" },
  aprovado: { text: "Aprovado", cls: "border-theme-border bg-theme-secondary text-theme-text" },
  convidado: { text: "Convite enviado", cls: "border-theme-teal/40 bg-theme-teal-subtle text-theme-text" },
  ativado: { text: "Ativado", cls: "border-status-success-border bg-status-success-bg text-status-success-fg" },
  recusado: { text: "Recusado", cls: "border-status-danger-border bg-status-danger-bg text-status-danger-fg" },
  conta_existente: { text: "Já tem conta", cls: "border-theme-border bg-theme-secondary text-theme-muted" },
};

const FILTERS: { id: RequestStatus | "abertos" | "all"; label: string }[] = [
  { id: "abertos", label: "Em aberto" },
  { id: "ativado", label: "Ativados" },
  { id: "recusado", label: "Recusados" },
  { id: "all", label: "Todos" },
];

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) : "";

export default function AccessRequestsPanel() {
  const [items, setItems] = useState<AccessRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("abertos");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [links, setLinks] = useState<Record<string, { link: string; emailed: boolean; validity: string }>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setError(null);
      setItems(await loadRequests("all"));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);

  const invite = async (r: AccessRequest) => {
    setBusyId(r.id);
    setError(null);
    try {
      const res = await inviteRequest(r.id);
      setLinks((m) => ({ ...m, [r.id]: { link: res.link, emailed: res.emailed, validity: res.validity } }));
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };
  const reject = async (r: AccessRequest) => {
    if (!window.confirm(`Recusar o pedido de ${r.full_name}? Se a pessoa pedir de novo, o pedido volta para a fila.`)) return;
    setBusyId(r.id);
    try {
      await rejectRequest(r.id);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };
  const copy = async (id: string, link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(id);
      window.setTimeout(() => setCopied((c) => (c === id ? null : c)), 2500);
    } catch {
      window.prompt("Copie o link de convite:", link);
    }
  };

  const shown = (items ?? []).filter((r) =>
    filter === "all" ? true : filter === "abertos" ? ["pendente", "aprovado", "convidado", "conta_existente"].includes(r.status) : r.status === filter
  );
  const pendingCount = (items ?? []).filter((r) => r.status === "pendente").length;

  return (
    <section aria-labelledby="pedidos-titulo" className="bg-theme-primary rounded-2xl border border-theme-border shadow-xs">
      <div className="flex flex-col gap-3 border-b border-theme-border p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="pedidos-titulo" className="text-lg font-bold text-theme-text">
            Pedidos de acesso {pendingCount > 0 && <span className="tabular ml-1 rounded-full bg-status-caution-bg px-2 py-0.5 text-sm text-status-caution-fg">{pendingCount}</span>}
          </h2>
          <p className="text-sm text-theme-muted">Nome e e-mail enviados pelo formulário. Aprovar gera um convite de uso único para a pessoa criar a senha.</p>
        </div>
        <div className="flex flex-wrap items-center gap-1" role="radiogroup" aria-label="Filtrar pedidos">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" role="radio" aria-checked={filter === f.id} onClick={() => setFilter(f.id)} className={`min-h-[36px] rounded-lg px-3 text-sm font-semibold ${filter === f.id ? "bg-theme-secondary text-theme-text" : "text-theme-muted hover:text-theme-text"}`}>
              {f.label}
            </button>
          ))}
          <button type="button" onClick={() => void reload()} aria-label="Atualizar a fila" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-theme-muted hover:bg-theme-secondary hover:text-theme-text">
            <RefreshCw className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      {error && <p role="alert" className="m-5 rounded-xl border border-status-danger-border bg-status-danger-bg p-3 text-sm text-status-danger-fg">{error}</p>}
      {items === null && !error && <p role="status" className="p-5 text-sm text-theme-muted">Carregando pedidos…</p>}
      {items !== null && shown.length === 0 && <p className="p-5 text-sm text-theme-muted">Nenhum pedido nesta lista.</p>}

      <ul className="divide-y divide-theme-border">
        {shown.map((r) => {
          const l = links[r.id];
          const canInvite = ["pendente", "aprovado", "convidado", "recusado"].includes(r.status);
          return (
            <li key={r.id} className="grid gap-3 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-theme-text">{r.full_name}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-[12px] font-semibold ${LABEL[r.status].cls}`}>{LABEL[r.status].text}</span>
                </div>
                <p className="break-all text-sm text-theme-muted">{r.email}</p>
                <p className="mt-1 text-[12px] text-theme-muted">
                  Pedido em {when(r.created_at)}
                  {r.request_count > 1 && <> · repetido {r.request_count - 1}x (último {when(r.last_requested_at)})</>}
                  {r.invite_sent_at && (
                    <>
                      {" "}· convite {r.invite_count > 1 ? `nº ${r.invite_count} ` : ""}em {when(r.invite_sent_at)}{" "}
                      {r.invite_email_ok ? <span className="inline-flex items-center gap-1"><MailCheck className="h-3 w-3" aria-hidden />e-mail aceito pelo provedor</span> : <span className="inline-flex items-center gap-1 text-status-caution-fg"><MailX className="h-3 w-3" aria-hidden />e-mail não enviado: use o link</span>}
                    </>
                  )}
                  {r.activated_at && <> · ativado em {when(r.activated_at)}</>}
                </p>
                {r.status === "conta_existente" && <p className="mt-1 text-[12px] text-theme-muted">Este e-mail já tem conta: a pessoa entra pelo login normal. Nada foi alterado na conta.</p>}
                {l && (
                  <div className="mt-3 rounded-xl border border-theme-border bg-theme-secondary/60 p-3 text-sm">
                    <p className="font-semibold text-theme-text">{l.emailed ? "Convite enviado por e-mail." : "O e-mail não saiu (o remetente ainda não tem domínio próprio verificado)."}</p>
                    <p className="mt-0.5 text-theme-muted">Link de uso único, válido por {l.validity}. Envie só para {r.email}.</p>
                    <button type="button" onClick={() => void copy(r.id, l.link)} className="mt-2 inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-theme-boundary/60 px-3 font-semibold hover:bg-theme-primary">
                      {copied === r.id ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                      {copied === r.id ? "Link copiado" : "Copiar link de convite"}
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                {canInvite && (
                  <button type="button" disabled={busyId === r.id} onClick={() => void invite(r)} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-inverse px-4 text-sm font-bold text-inverse-fg hover:bg-inverse-hover disabled:opacity-60">
                    <Send className="h-4 w-4" aria-hidden />
                    {busyId === r.id ? "Gerando…" : r.status === "convidado" ? "Reenviar convite" : "Aprovar e enviar convite"}
                  </button>
                )}
                {["pendente", "aprovado", "conta_existente"].includes(r.status) && (
                  <button type="button" disabled={busyId === r.id} onClick={() => void reject(r)} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-theme-boundary/60 px-4 text-sm font-semibold text-theme-muted hover:text-status-danger-fg disabled:opacity-60">
                    <XCircle className="h-4 w-4" aria-hidden /> Recusar
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
