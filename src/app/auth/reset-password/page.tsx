"use client";

// Nova senha a partir do link de recuperação enviado por e-mail.
// O cliente do navegador troca o código do link por uma sessão de recuperação (PKCE, mesmo
// navegador que pediu o link). A regra de senha vale no servidor (backend/supabase/config.toml);
// a checagem aqui só adianta o aviso. Mensagens fixas, nada do provedor vai para a tela.
import React, { useEffect, useState } from "react";
import Link from "next/link";
import AppearanceBar from "@/components/appearance/AppearanceBar";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { AlertCircle, Lock } from "lucide-react";

const MIN_LENGTH = 10;

type Stage = "checking" | "ready" | "invalid" | "unavailable";

function passwordProblem(pw: string): string | null {
  if (pw.length < MIN_LENGTH) return `Use pelo menos ${MIN_LENGTH} caracteres.`;
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/\d/.test(pw)) return "Misture letras minúsculas, maiúsculas e números.";
  return null;
}

export default function ResetPasswordPage() {
  const [stage, setStage] = useState<Stage>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
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
    const problem = passwordProblem(password);
    if (problem) return setError(problem);
    if (password !== confirm) return setError("As duas senhas não são iguais.");
    const db = getSupabaseBrowserClient();
    if (!db) return setStage("unavailable");
    setSaving(true);
    try {
      const { error: err } = await db.auth.updateUser({ password });
      if (err) {
        if (err.code === "same_password") setError("Use uma senha diferente da anterior.");
        else if (err.code === "weak_password") setError("Senha fraca. Use pelo menos 10 caracteres com minúsculas, maiúsculas e números.");
        else if (err.status === 429) setError("Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.");
        else if (err.status === 401 || err.status === 403) setStage("invalid");
        else setError("Não foi possível alterar a senha agora. Tente de novo.");
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

  const inputClass =
    "w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-theme-primary border border-theme-boundary/80 text-sm text-theme-text focus:outline-none focus:border-theme-teal focus:ring-2 focus:ring-theme-teal/25";

  return (
    <div className="relative min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <AppearanceBar />
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center font-black text-ink-950 text-lg shadow-sm">LR</div>
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
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
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
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <div>
                <label htmlFor="nova-senha" className="block text-xs font-bold text-theme-text mb-1">
                  Nova senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-theme-subtle absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
                  <input
                    id="nova-senha"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={MIN_LENGTH}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-describedby="regra-senha"
                    className={inputClass}
                  />
                </div>
                <p id="regra-senha" className="mt-1 text-[11px] text-theme-muted">
                  Pelo menos {MIN_LENGTH} caracteres, com minúsculas, maiúsculas e números.
                </p>
              </div>
              <div>
                <label htmlFor="confirmar-senha" className="block text-xs font-bold text-theme-text mb-1">
                  Repita a nova senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-theme-subtle absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
                  <input
                    id="confirmar-senha"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 rounded-xl bg-inverse hover:bg-inverse-hover text-inverse-fg text-sm font-bold shadow-sm transition-all disabled:opacity-60"
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
