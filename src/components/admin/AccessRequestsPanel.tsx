"use client";

// Fila de pedidos de acesso (nome e e-mail). Etapas: pedido → aprovado e convidado (e-mail enviado
// ao endereço do pedido) → ativado (senha criada). O convite pode ser reenviado se não chegar ou
// vencer; cada reenvio invalida o link anterior. Quem já tem conta recebe o link para criar nova
// senha. O link também aparece aqui, para o admin (com segundo fator) mandar por outro canal.
import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Copy, KeyRound, MailCheck, MailX, RefreshCw, Send, XCircle } from "lucide-react";
import {
  inviteRequest,
  loadRequests,
  rejectRequest,
  type AccessRequest,
  type InviteResult,
  type MailOutcome,
  type MailStatus,
  type RequestStatus,
} from "@/lib/data/admin-api";

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

const OUTCOME: Record<MailOutcome, string> = {
  sent: "E-mail enviado para a pessoa.",
  not_configured: "O e-mail não saiu: o envio de e-mails ainda não está configurado no servidor.",
  test_sender: "O e-mail não saiu: o remetente de teste do Resend só entrega ao dono da conta Resend.",
  failed: "O e-mail não saiu: o serviço de e-mail recusou ou não respondeu. Tente de novo ou copie o link.",
};

const MAIL_WARNING: Record<Exclude<MailStatus, "ready">, string> = {
  not_configured: "O envio de e-mails não está configurado no servidor. Os convites são gerados, mas não chegam à pessoa: copie o link e envie por outro canal.",
  test_sender: "O servidor usa o remetente de teste do Resend, que só entrega ao dono da conta Resend. Os convites não chegam aos clientes: configure o SMTP ou um domínio verificado.",
};

const TZ = "America/Sao_Paulo";
const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: TZ }) : "";
const hoursText = (h: number) => (h === 1 ? "1 hora" : `${h} horas`);

/** Fim da validade do último link enviado (o prazo vale a partir do envio). */
function linkExpiry(r: AccessRequest, hours: number): Date | null {
  if (!r.invite_sent_at || r.status === "ativado" || r.status === "recusado") return null;
  return new Date(new Date(r.invite_sent_at).getTime() + hours * 3_600_000);
}

export default function AccessRequestsPanel() {
  const [items, setItems] = useState<AccessRequest[] | null>(null);
  const [linkHours, setLinkHours] = useState(1);
  const [mail, setMail] = useState<MailStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("abertos");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, InviteResult>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const reload = useCallback(async () => {
    try {
      setError(null);
      const q = await loadRequests("all");
      setItems(q.items);
      setLinkHours(q.linkHours);
      setMail(q.mail);
      setNow(Date.now());
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  // Atualiza a indicação de "venceu" sem recarregar a fila
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const invite = async (r: AccessRequest) => {
    const resend = r.invite_count > 0;
    if (resend && !window.confirm(`Gerar um novo link para ${r.email}? O link enviado antes deixa de funcionar.`)) return;
    setBusyId(r.id);
    setError(null);
    try {
      const res = await inviteRequest(r.id);
      setResults((m) => ({ ...m, [r.id]: res }));
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
      window.prompt("Copie o link:", link);
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
          <p className="text-sm text-theme-muted">
            Aprovar envia ao e-mail do pedido um link de uso único, válido por {hoursText(linkHours)}, para a pessoa criar a senha.
          </p>
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

      {mail && mail !== "ready" && (
        <p role="status" className="m-5 mb-0 flex items-start gap-2 rounded-xl border border-status-caution-border bg-status-caution-bg p-3 text-sm text-status-caution-fg">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {MAIL_WARNING[mail]}
        </p>
      )}
      {error && <p role="alert" className="m-5 rounded-xl border border-status-danger-border bg-status-danger-bg p-3 text-sm text-status-danger-fg">{error}</p>}
      {items === null && !error && <p role="status" className="p-5 text-sm text-theme-muted">Carregando pedidos…</p>}
      {items !== null && shown.length === 0 && <p className="p-5 text-sm text-theme-muted">Nenhum pedido nesta lista.</p>}

      <ul className="divide-y divide-theme-border">
        {shown.map((r) => {
          const res = results[r.id];
          const hasAccount = r.status === "conta_existente" || r.status === "ativado";
          const canSend = ["pendente", "aprovado", "convidado", "recusado", "conta_existente", "ativado"].includes(r.status);
          const expiry = linkExpiry(r, res?.validity_hours ?? linkHours);
          const expired = expiry !== null && expiry.getTime() <= now;
          const label = hasAccount
            ? r.invite_count > 0 ? "Reenviar link de senha" : "Enviar link para criar senha"
            : r.status === "convidado" ? "Reenviar convite" : "Aprovar e enviar convite";
          return (
            <li key={r.id} className="grid gap-3 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-theme-text">{r.full_name}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-[12px] font-semibold ${LABEL[r.status].cls}`}>{LABEL[r.status].text}</span>
                  {expired && <span className="rounded-full border border-status-danger-border bg-status-danger-bg px-2 py-0.5 text-[12px] font-semibold text-status-danger-fg">Link vencido</span>}
                </div>
                <p className="break-all text-sm text-theme-muted">{r.email}</p>
                <p className="mt-1 text-[12px] text-theme-muted">
                  Pedido em {when(r.created_at)}
                  {r.request_count > 1 && <> · repetido {r.request_count - 1}x (último {when(r.last_requested_at)})</>}
                  {r.invite_sent_at && (
                    <>
                      {" "}· {hasAccount ? "link de senha" : "convite"} {r.invite_count > 1 ? `nº ${r.invite_count} ` : ""}em {when(r.invite_sent_at)}{" "}
                      {r.invite_email_ok ? (
                        <span className="inline-flex items-center gap-1"><MailCheck className="h-3 w-3" aria-hidden />e-mail enviado</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-status-caution-fg"><MailX className="h-3 w-3" aria-hidden />e-mail não saiu</span>
                      )}
                      {expiry && <> · {expired ? `venceu em ${when(expiry.toISOString())}: reenvie` : `vale até ${when(expiry.toISOString())}`}</>}
                    </>
                  )}
                  {r.activated_at && <> · ativado em {when(r.activated_at)}</>}
                </p>
                {r.status === "conta_existente" && !r.invite_sent_at && (
                  <p className="mt-1 text-[12px] text-theme-muted">Este e-mail já tem conta ativada. Se a pessoa não tem ou esqueceu a senha, envie o link para criar uma nova.</p>
                )}
                {res && (
                  <div className="mt-3 rounded-xl border border-theme-border bg-theme-secondary/60 p-3 text-sm">
                    <p className="font-semibold text-theme-text">{OUTCOME[res.email ?? (res.emailed ? "sent" : "failed")]}</p>
                    <p className="mt-0.5 text-theme-muted">
                      {res.kind === "password" ? "Link para criar nova senha" : "Convite"} de uso único, válido por {res.validity}, enviado para {r.email}. Se precisar, copie e mande só para essa pessoa.
                    </p>
                    <button type="button" onClick={() => void copy(r.id, res.link)} className="mt-2 inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-theme-boundary/60 px-3 font-semibold hover:bg-theme-primary">
                      {copied === r.id ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                      {copied === r.id ? "Link copiado" : "Copiar link"}
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                {canSend && (
                  <button type="button" disabled={busyId === r.id} onClick={() => void invite(r)} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-inverse px-4 text-sm font-bold text-inverse-fg hover:bg-inverse-hover disabled:opacity-60">
                    {hasAccount ? <KeyRound className="h-4 w-4" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
                    {busyId === r.id ? "Enviando…" : label}
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
