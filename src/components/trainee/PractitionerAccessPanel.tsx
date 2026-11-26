"use client";

// Acesso do aluno à própria ficha. O professor informa o e-mail do aluno e o convite sai para ele;
// a conta nasce como aluno, ligada só a esta ficha, e o login leva direto a "Meu treino".
// Reenviar invalida o link anterior. Remover o acesso bloqueia a conta do aluno na hora.
import React, { useCallback, useEffect, useState } from "react";
import { Check, Copy, KeyRound, MailCheck, MailX, Send, UserX } from "lucide-react";
import { Badge, Button, ErrorNote, Field, InfoNote, Loading, Panel, inputClass } from "@/components/ui/primitives";
import type { MailOutcome } from "@/lib/data/admin-api";
import {
  invitePractitioner,
  loadPractitionerAccess,
  removePractitioner,
  type PractitionerAccess,
  type PractitionerInvite,
} from "@/lib/data/practitioner-api";

const OUTCOME: Record<MailOutcome, string> = {
  sent: "E-mail enviado para o aluno. Se não chegar em alguns minutos, peça para ele olhar o spam. Por segurança, o link fica só no e-mail dele.",
  not_configured: "O e-mail não saiu: o envio de e-mails ainda não está configurado.",
  test_sender: "O e-mail não saiu: o envio está em modo de teste.",
  failed: "O e-mail não saiu: o serviço de e-mail não respondeu.",
};

const when = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }) : "";

function linkExpiry(iso: string | null | undefined, hours: number) {
  if (!iso) return null;
  const end = new Date(iso).getTime() + hours * 3600_000;
  return { end: new Date(end).toISOString(), expired: end <= Date.now() };
}

export default function PractitionerAccessPanel({ traineeId, demo, archived }: { traineeId: string; demo: boolean; archived: boolean }) {
  const [state, setState] = useState<PractitionerAccess | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<PractitionerInvite | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoadErr(null);
    try {
      const s = await loadPractitionerAccess(traineeId);
      setState(s);
      if (s.email) setEmail(s.email);
    } catch (e) {
      setLoadErr((e as Error).message);
    }
  }, [traineeId]);

  useEffect(() => {
    if (!demo) void load();
  }, [demo, load]);

  if (demo) {
    return (
      <Panel className="p-5">
        <h2 className="text-lg font-bold">Acesso do aluno</h2>
        <p className="mt-2 text-sm text-theme-muted">Na conta real, você digita aqui o e-mail do aluno e ele recebe um convite para ver o treino disponibilizado e registrar o que fez.</p>
      </Panel>
    );
  }

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const target = email.trim();
    if (!target) return;
    if (state && state.status !== "none" && !window.confirm(`Enviar um novo link para ${target}? O link anterior deixa de funcionar.`)) return;
    setBusy(true);
    setErr(null);
    setResult(null);
    setCopied(false);
    try {
      const r = await invitePractitioner(traineeId, target);
      setResult(r);
      setState(r);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Remover o acesso deste aluno? Ele deixa de entrar na hora. Você pode convidar de novo depois.")) return;
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      setState(await removePractitioner(traineeId));
      setEmail("");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!result?.link) return;
    try {
      await navigator.clipboard.writeText(result.link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const status = state?.status ?? "none";
  const expiry = status === "invited" ? linkExpiry(state?.invited_at, state?.link_hours ?? 1) : null;

  return (
    <Panel className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Acesso do aluno</h2>
        {status === "active" && <Badge tone="success">Aluno entra no site</Badge>}
        {status === "invited" && (expiry?.expired ? <Badge tone="danger">Link vencido</Badge> : <Badge tone="caution">Convite enviado</Badge>)}
        {status === "blocked" && <Badge tone="danger">Acesso suspenso</Badge>}
      </div>

      {!state && !loadErr && <Loading label="Carregando acesso…" />}
      {loadErr && <ErrorNote>{loadErr}</ErrorNote>}

      {state && (
        <div className="space-y-4">
          <p className="text-sm text-theme-muted">
            {status === "none" && "O aluno recebe um convite por e-mail, cria a senha e passa a ver só o treino que você disponibilizar nesta ficha, além de registrar o que fez."}
            {status === "invited" && (
              <>
                Convite enviado para <strong className="text-theme-text">{state.email}</strong> em {when(state.invited_at)}
                {expiry && <> · {expiry.expired ? "venceu em" : "vale até"} {when(expiry.end)}</>}. Ele ainda não criou a senha.
              </>
            )}
            {status === "active" && (
              <>
                <strong className="text-theme-text">{state.email}</strong> criou a senha em {when(state.activated_at)}. No login, ele cai direto em &quot;Meu treino&quot;.
              </>
            )}
            {status === "blocked" && "A conta deste aluno está suspensa pela equipe. Fale com a administração."}
          </p>

          {state.mail !== "ready" && status !== "active" && (
            <InfoNote tone="caution">O envio de e-mails não está pronto no servidor. O convite é criado mesmo assim e o link aparece aqui para você mandar ao aluno.</InfoNote>
          )}

          {!archived && status !== "active" && status !== "blocked" && (
            <form onSubmit={send} className="space-y-3">
              <Field label="E-mail do aluno" htmlFor={`aluno-email-${traineeId}`} hint="Use o e-mail que o aluno lê. Se ele entrar com Google, precisa ser o mesmo e-mail.">
                <input
                  id={`aluno-email-${traineeId}`}
                  type="email"
                  required
                  autoComplete="off"
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="aluno@email.com"
                  className={inputClass}
                />
              </Field>
              <Button type="submit" disabled={busy}>
                <Send className="h-4 w-4" aria-hidden />
                {busy ? "Enviando…" : status === "invited" ? "Reenviar convite" : "Dar acesso ao aluno"}
              </Button>
            </form>
          )}
          {archived && status === "none" && <InfoNote>Reative o aluno para dar acesso.</InfoNote>}

          {err && <ErrorNote>{err}</ErrorNote>}

          {result && (
            <div className="space-y-2 rounded-control border border-theme-border bg-theme-secondary p-3 text-sm">
              <p className="flex items-start gap-2">
                {result.emailed ? <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-status-success-fg" aria-hidden /> : <MailX className="mt-0.5 h-4 w-4 shrink-0 text-status-caution-fg" aria-hidden />}
                <span>
                  {result.kind === "password" ? "Link para criar nova senha gerado. " : "Convite gerado. "}
                  {OUTCOME[result.email_outcome]} O link vale por {result.validity} e só funciona uma vez.
                  {result.link && " Copie o link abaixo e mande só para o aluno."}
                  {!result.link && !result.emailed && result.kind === "password" &&
                    " Por segurança, o link de nova senha não aparece aqui: peça ao aluno para usar “Esqueci minha senha” na tela de login. Tente reenviar mais tarde."}
                </span>
              </p>
              {result.link && (
                <div className="flex flex-wrap items-center gap-2">
                  <code className="max-w-full flex-1 truncate rounded bg-theme-primary px-2 py-1 text-xs">{result.link}</code>
                  <Button type="button" variant="secondary" onClick={copy}>
                    {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                    {copied ? "Copiado" : "Copiar link"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {(status === "active" || status === "invited") && (
            <div className="flex flex-wrap gap-2 border-t border-theme-border pt-3">
              {status === "active" && !archived && (
                <Button type="button" variant="secondary" disabled={busy} onClick={() => void send()}>
                  <KeyRound className="h-4 w-4" aria-hidden />
                  Enviar link para nova senha
                </Button>
              )}
              <Button type="button" variant="ghost" disabled={busy} onClick={remove}>
                <UserX className="h-4 w-4" aria-hidden />
                Remover acesso
              </Button>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
