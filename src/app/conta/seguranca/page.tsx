"use client";

import React, { useCallback, useEffect, useState } from "react";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { Button, ButtonLink, ErrorNote, InfoNote, Loading, Panel } from "@/components/ui/primitives";
import CodeForm from "@/components/auth/CodeForm";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { assurance, confirmEnroll, needsCode, safeNext, startEnroll, verifiedTotpId, verifyCode, type EnrollStart } from "@/lib/auth/mfa";

type View =
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "signed_out" }
  | { kind: "error"; message: string }
  | { kind: "setup" }
  | { kind: "scan"; enroll: EnrollStart }
  | { kind: "verify" }
  | { kind: "active" };

// Segurança da conta: cadastro do aplicativo autenticador (segundo fator).
// Fica fora do grupo de dados para abrir mesmo sem acesso ativo ao app.
export default function SegurancaPage() {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <Header />
      <main id="conteudo" className="mx-auto w-full max-w-[720px] flex-1 px-4 py-10 sm:px-6 lg:py-14">
        <h1 className="text-3xl font-bold tracking-tight">Segurança da conta</h1>
        <p className="mt-2 text-[15px] text-theme-muted">Verificação em duas etapas com um aplicativo autenticador no celular.</p>
        <div className="mt-8">
          <Conteudo />
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Conteudo() {
  const [view, setView] = useState<View>({ kind: "loading" });
  const [isAdmin, setIsAdmin] = useState(false);
  const [next, setNext] = useState<string | null>(null);

  const load = useCallback(async () => {
    const client = getSupabaseBrowserClient();
    if (!isSupabaseConfigured || !client) return setView({ kind: "unavailable" });
    try {
      const { data } = await client.auth.getUser();
      if (!data.user) return setView({ kind: "signed_out" });
      const { data: profile } = await client.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      setIsAdmin((profile as { role?: string } | null)?.role === "admin");
      const lv = await assurance(client);
      if (needsCode(lv.current, lv.next)) return setView({ kind: "verify" });
      setView((await verifiedTotpId(client)) ? { kind: "active" } : { kind: "setup" });
    } catch {
      setView({ kind: "error", message: "Não foi possível ler a sua conta agora. Recarregue a página." });
    }
  }, []);

  useEffect(() => {
    setNext(safeNext(new URLSearchParams(window.location.search).get("redirect")));
    void load();
  }, [load]);

  /** Depois de confirmar: segue para o destino pedido com navegação completa (o proxy relê a sessão). */
  const done = () => {
    if (next) window.location.href = next;
    else setView({ kind: "active" });
  };

  switch (view.kind) {
    case "loading":
      return <Loading label="Verificando sua conta…" />;
    case "unavailable":
      return <InfoNote>A verificação em duas etapas só existe nas contas reais. A demonstração não tem login.</InfoNote>;
    case "signed_out":
      return (
        <Panel className="space-y-4 p-6">
          <p className="text-[15px]">Entre na sua conta para configurar a verificação em duas etapas.</p>
          <ButtonLink href="/login?redirect=/conta/seguranca">Entrar</ButtonLink>
        </Panel>
      );
    case "error":
      return <ErrorNote>{view.message}</ErrorNote>;
    case "verify":
      return (
        <Panel className="space-y-4 p-6">
          <p className="text-[15px]">Sua conta já tem um autenticador. Digite o código atual para continuar.</p>
          <CodeForm submitLabel="Confirmar código" onSubmit={async (code) => {
            const client = getSupabaseBrowserClient();
            const err = client ? await verifyCode(client, code) : "Sem conexão com o servidor.";
            if (!err) done();
            return err;
          }} />
        </Panel>
      );
    case "active":
      return (
        <Panel className="space-y-4 p-6">
          <p className="text-[15px] font-semibold">Verificação em duas etapas ativa.</p>
          <p className="text-[15px] text-theme-muted">
            Ao entrar, depois da senha, o site pede o código de 6 números do aplicativo autenticador.
          </p>
          <InfoNote>
            Perdeu o celular? Fale com a equipe: a remoção do autenticador é feita pela administração do sistema, depois de confirmar sua identidade.
          </InfoNote>
          <div className="flex flex-wrap gap-2">
            {isAdmin && <ButtonLink href="/admin">Ir para a administração</ButtonLink>}
            <ButtonLink href="/app" variant={isAdmin ? "secondary" : "primary"}>Ir para o app</ButtonLink>
          </div>
        </Panel>
      );
    case "setup":
      return (
        <Panel className="space-y-4 p-6">
          {isAdmin ? (
            <InfoNote tone="caution">Obrigatória para administradores: sem ela, a área de administração fica fechada para a sua conta.</InfoNote>
          ) : (
            <p className="text-[15px]">Opcional. Com ela, quem descobrir a sua senha ainda não consegue entrar sem o seu celular.</p>
          )}
          <p className="text-[15px] text-theme-muted">
            Você vai precisar de um aplicativo autenticador no celular, como Google Authenticator, Microsoft Authenticator ou 1Password.
          </p>
          <SetupButton onStarted={(enroll) => setView({ kind: "scan", enroll })} />
        </Panel>
      );
    case "scan":
      return (
        <Panel className="space-y-5 p-6">
          <ol className="list-decimal space-y-2 pl-5 text-[15px]">
            <li>No aplicativo autenticador, escolha adicionar conta e leia o QR code abaixo.</li>
            <li>Digite o código de 6 números que o aplicativo mostrar.</li>
          </ol>
          {/* QR em SVG gerado pelo Supabase Auth (data URI); a CSP já permite img data: */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={view.enroll.qr} alt="QR code para cadastrar a conta no aplicativo autenticador" width={200} height={200} className="rounded-control border border-theme-border bg-white p-2" />
          <details className="text-[15px]">
            <summary className="cursor-pointer font-semibold">Não consegue ler o QR code?</summary>
            <p className="mt-2 text-theme-muted">Digite esta chave no aplicativo (tipo: baseada em tempo):</p>
            <code className="mt-1 block break-all rounded-control bg-theme-secondary p-2 text-sm select-all">{view.enroll.secret}</code>
          </details>
          <CodeForm submitLabel="Ativar verificação" onSubmit={async (code) => {
            const client = getSupabaseBrowserClient();
            const err = client ? await confirmEnroll(client, view.enroll.factorId, code) : "Sem conexão com o servidor.";
            if (!err) done();
            return err;
          }} />
          <p className="text-sm text-theme-muted">Ao ativar, outros aparelhos conectados nesta conta saem e precisam entrar de novo.</p>
        </Panel>
      );
  }
}

function SetupButton({ onStarted }: { onStarted: (e: EnrollStart) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      {error && <ErrorNote>{error}</ErrorNote>}
      <Button disabled={busy} onClick={async () => {
        setBusy(true);
        setError(null);
        const client = getSupabaseBrowserClient();
        const r = client ? await startEnroll(client) : { error: "Sem conexão com o servidor." };
        setBusy(false);
        if ("error" in r) setError(r.error);
        else onStarted(r);
      }}>
        {busy ? "Preparando…" : "Configurar autenticador"}
      </Button>
    </div>
  );
}
