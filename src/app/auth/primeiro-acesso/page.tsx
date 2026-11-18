"use client";

// Primeiro acesso pelo convite enviado depois da aprovação.
// O link traz um código de uso único (token_hash). Ele só é conferido quando a pessoa clica em
// "Continuar": programas que abrem links de e-mail para checar segurança não gastam o convite.
// Depois: Criar senha + Confirmar senha. A função account-password confere o vínculo do convite,
// a aprovação e a regra de senha no servidor, grava a senha e ativa a conta.
import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import AppearanceBar from "@/components/appearance/AppearanceBar";
import PasswordFields, { passwordReady } from "@/components/auth/PasswordFields";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { savePassword } from "@/lib/auth/account-password";
import { AlertCircle, CheckCircle2, KeyRound } from "lucide-react";

type Stage = "intro" | "checking" | "form" | "saving" | "done" | "invalid" | "unavailable";
const LINK_TYPES = ["invite", "recovery", "magiclink", "email"] as const;
type LinkType = (typeof LINK_TYPES)[number];

export default function PrimeiroAcessoPage() {
  return (
    <Suspense fallback={null}>
      <PrimeiroAcesso />
    </Suspense>
  );
}

function PrimeiroAcesso() {
  const [stage, setStage] = useState<Stage>("intro");
  const [link, setLink] = useState<{ token: string; type: LinkType } | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Lê o código do link e tira da barra de endereço (não fica no histórico nem em capturas)
  useEffect(() => {
    if (!isSupabaseConfigured) return setStage("unavailable");
    const q = new URLSearchParams(window.location.search);
    const token = q.get("token_hash") ?? "";
    const type = q.get("type") as LinkType | null;
    if (token && token.length <= 512 && type && LINK_TYPES.includes(type)) setLink({ token, type });
    else setStage("invalid");
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const openLink = async () => {
    const db = getSupabaseBrowserClient();
    if (!db || !link) return setStage("unavailable");
    setStage("checking");
    setError(null);
    try {
      const { data, error: err } = await db.auth.verifyOtp({ token_hash: link.token, type: link.type });
      if (err || !data.session) return setStage("invalid");
      const { data: p } = await db.from("profiles").select("full_name, email, activated_at").eq("id", data.session.user.id).maybeSingle();
      if (p?.activated_at) {
        // Já ativada: o link serviu só para entrar; segue para a área profissional
        // (navegação completa de propósito: o proxy relê os cookies da sessão recém-criada)
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/app";
        return;
      }
      setFullName(p?.full_name ?? "");
      setEmail(p?.email ?? data.session.user.email ?? "");
      setStage("form");
    } catch {
      setError("Sem conexão com o servidor. Verifique a internet e tente de novo.");
      setStage("intro");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) return setError("As duas senhas não são iguais.");
    setStage("saving");
    const r = await savePassword("activate", password, fullName);
    if (!r.ok) {
      if (r.expired) return setStage("invalid");
      setError(r.message);
      return setStage("form");
    }
    setStage("done");
    // Navegação completa: a área profissional relê a sessão já com a conta ativada
    window.setTimeout(() => {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/app";
    }, 1200);
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <AppearanceBar />
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center font-black text-ink-950 text-lg shadow-xs">LR</div>
          <span className="text-xl font-bold tracking-tight text-theme-text">Leandro Rangel</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-theme-text">Primeiro acesso</h1>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-theme-primary py-8 px-6 sm:px-10 rounded-2xl border border-theme-border shadow-card space-y-6">
          {stage === "intro" && (
            <div className="space-y-4 text-center">
              <KeyRound className="mx-auto h-8 w-8 text-theme-teal" aria-hidden />
              <p className="text-sm text-theme-muted">Seu acesso foi aprovado. Continue para criar a sua senha.</p>
              {error && <p role="alert" className="text-sm text-status-danger-fg">{error}</p>}
              <button type="button" onClick={openLink} className="w-full py-3 rounded-xl bg-inverse hover:bg-inverse-hover text-inverse-fg text-sm font-bold">
                Continuar
              </button>
            </div>
          )}

          {stage === "checking" && <p role="status" className="text-center text-sm text-theme-muted">Conferindo o convite…</p>}

          {(stage === "invalid" || stage === "unavailable") && (
            <div className="space-y-4">
              <div role="alert" className="p-4 rounded-xl bg-status-danger-bg border border-status-danger-border text-sm text-status-danger-fg flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
                <span>
                  {stage === "invalid"
                    ? "Este convite expirou ou já foi usado. Peça um novo convite à equipe pelo mesmo e-mail."
                    : "O primeiro acesso ainda não está disponível neste ambiente."}
                </span>
              </div>
              <Link href="/login" className="block w-full text-center py-3 rounded-xl border border-theme-boundary/60 text-sm font-semibold hover:bg-theme-secondary">
                Ir para o login
              </Link>
            </div>
          )}

          {(stage === "form" || stage === "saving") && (
            <form onSubmit={submit} className="space-y-5" noValidate>
              <p className="text-sm text-theme-muted">
                {fullName ? <>Olá, <strong className="text-theme-text">{fullName.split(" ")[0]}</strong>. </> : null}
                Crie a senha para entrar{email ? <> com <strong className="text-theme-text break-all">{email}</strong></> : null}.
              </p>
              <PasswordFields password={password} confirm={confirm} onPassword={setPassword} onConfirm={setConfirm} fullName={fullName} />
              {error && (
                <p role="alert" className="flex items-start gap-2 text-sm text-status-danger-fg">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden /> {error}
                </p>
              )}
              <button
                type="submit"
                disabled={stage === "saving" || !passwordReady(password, confirm, fullName)}
                className="w-full py-3 rounded-xl bg-inverse hover:bg-inverse-hover text-inverse-fg text-sm font-bold disabled:opacity-60"
              >
                {stage === "saving" ? "Salvando…" : "Criar senha e entrar"}
              </button>
            </form>
          )}

          {stage === "done" && (
            <p role="status" className="flex items-center justify-center gap-2 text-sm text-status-success-fg">
              <CheckCircle2 className="h-5 w-5" aria-hidden /> Senha criada. Abrindo a sua área…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
