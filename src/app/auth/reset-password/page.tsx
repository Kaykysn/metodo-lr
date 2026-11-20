"use client";

// Nova senha a partir do link de recuperação enviado por e-mail.
// O cliente do navegador troca o código do link por uma sessão de recuperação (PKCE, mesmo
// navegador que pediu o link). A senha é gravada pela função account-password, que aplica a
// regra do Método LR no servidor; a checagem aqui só adianta os avisos.
import React, { useEffect, useState } from "react";
import Link from "next/link";
import AppearanceBar from "@/components/appearance/AppearanceBar";
import PasswordFields, { passwordReady } from "@/components/auth/PasswordFields";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { savePassword } from "@/lib/auth/account-password";
import { AlertCircle } from "lucide-react";

type Stage = "checking" | "ready" | "invalid" | "unavailable";

export default function ResetPasswordPage() {
  const [stage, setStage] = useState<Stage>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStage("unavailable");
      return;
    }
    const db = getSupabaseBrowserClient();
    if (!db) {
      setStage("unavailable");
      return;
    }
    let active = true;
    (async () => {
      try {
        // getSession espera o cliente terminar de ler o código do link na URL.
        let { data } = await db.auth.getSession();
        const code = new URLSearchParams(window.location.search).get("code");
        if (!data.session && code && code.length <= 512) {
          await db.auth.exchangeCodeForSession(code);
          data = (await db.auth.getSession()).data;
        }
        // Tira o código da barra de endereço (não fica no histórico nem em capturas de tela).
        if (code) window.history.replaceState(null, "", window.location.pathname);
        // Nome cadastrado: a senha não pode conter o nome nem o sobrenome
        if (data.session) {
          const { data: p } = await db.from("profiles").select("full_name").eq("id", data.session.user.id).maybeSingle();
          if (active) setFullName(p?.full_name ?? "");
        }
        if (active) setStage(data.session ? "ready" : "invalid");
      } catch {
        if (active) setStage("invalid");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) return setError("As duas senhas não são iguais.");
    const db = getSupabaseBrowserClient();
    if (!db) return setStage("unavailable");
    setSaving(true);
    try {
      const r = await savePassword("reset", password, fullName);
      if (!r.ok) {
        if (r.expired) setStage("invalid");
        else setError(r.message);
        return;
      }
      // Encerra todas as sessões (inclusive esta): quem tinha a senha antiga perde o acesso.
      await db.auth.signOut({ scope: "global" });
      // Navegação completa: descarta a sessão de recuperação que estava em memória.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login?aviso=senha";
    } catch {
      setError("Sem conexão com o servidor. Verifique a internet e tente de novo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <AppearanceBar />
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center font-black text-ink-950 text-lg shadow-xs">LR</div>
          <span className="text-xl font-bold tracking-tight text-theme-text">Leandro Rangel</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-theme-text">Criar nova senha</h1>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-theme-primary py-8 px-6 sm:px-10 rounded-2xl border border-theme-border shadow-card space-y-6">
          {stage === "checking" && (
            <p role="status" className="text-sm text-theme-muted text-center">
              Conferindo o link de recuperação…
            </p>
          )}

          {(stage === "invalid" || stage === "unavailable") && (
            <div className="space-y-4">
              <div role="alert" className="p-4 rounded-xl bg-status-danger-bg border border-status-danger-border text-xs text-status-danger-fg flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {stage === "invalid"
                    ? "Este link expirou, já foi usado ou foi aberto em outro navegador. Peça um novo na tela de login, no mesmo navegador em que vai abrir o e-mail."
                    : "A recuperação de senha ainda não está disponível neste ambiente."}
                </span>
              </div>
              <Link href="/login" className="block w-full text-center py-3 rounded-xl bg-inverse hover:bg-inverse-hover text-inverse-fg text-sm font-bold">
                Voltar ao login
              </Link>
            </div>
          )}

          {stage === "ready" && (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {error && (
                <div role="alert" className="p-4 rounded-xl bg-status-danger-bg border border-status-danger-border text-xs text-status-danger-fg flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <PasswordFields password={password} confirm={confirm} onPassword={setPassword} onConfirm={setConfirm} fullName={fullName} labels={{ password: "Nova senha", confirm: "Confirmar nova senha" }} />
              <button
                type="submit"
                disabled={saving || !passwordReady(password, confirm, fullName)}
                className="w-full py-3 rounded-xl bg-inverse hover:bg-inverse-hover text-inverse-fg text-sm font-bold shadow-xs transition-all disabled:opacity-60"
              >
                {saving ? "Salvando…" : "Salvar nova senha"}
              </button>
              <p className="text-[11px] text-theme-muted">Ao salvar, todas as sessões abertas são encerradas e você entra de novo com a nova senha.</p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
