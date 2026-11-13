"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import AppearanceBar from "@/components/appearance/AppearanceBar";
import { isSupabaseConfigured, getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ShieldCheck, Mail, Lock, ArrowRight, AlertCircle, Check } from "lucide-react";

// Mensagens fixas: nada vindo do provedor vai para a tela, e nenhuma delas revela se o e-mail tem conta.
const CALLBACK_ERRORS: Record<string, string> = {
  indisponivel: "O login ainda não está disponível neste ambiente. Use a demonstração para conhecer a plataforma.",
  provedor: "O login com Google não foi concluído. Tente de novo.",
  codigo: "O link de acesso expirou ou já foi usado. Peça um novo.",
  sessao: "O link de acesso expirou ou já foi usado. Peça um novo.",
  interno: "Não foi possível concluir o login agora. Tente de novo em instantes.",
};
const NOTICES: Record<string, string> = {
  senha: "Senha alterada. Entre com a nova senha.",
};
const UNAVAILABLE = "O login ainda não está disponível neste ambiente. Use a demonstração para conhecer a plataforma.";

function loginErrorMessage(error: { status?: number; code?: string }): string {
  if (error.status === 429 || error.code === "over_request_rate_limit") return "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.";
  // Só aparece com a senha certa, então não revela a existência da conta a quem não a conhece.
  if (error.code === "email_not_confirmed") return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  return "E-mail ou senha incorretos.";
}

/** Destino depois do login: só caminhos internos conhecidos (sem redirecionamento aberto). */
function safeNext(raw: string | null): string | null {
  if (!raw || raw.length > 200 || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return null;
  return /^\/(app|conta|admin)(\/[A-Za-z0-9/_-]*)?$/.test(raw) ? raw : null;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoverySent, setRecoverySent] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const erro = q.get("erro");
    if (erro && CALLBACK_ERRORS[erro]) setErrorMessage(CALLBACK_ERRORS[erro]);
    const aviso = q.get("aviso");
    if (aviso && NOTICES[aviso]) setNotice(NOTICES[aviso]);
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isSupabaseConfigured) {
      setErrorMessage(UNAVAILABLE);
      return;
    }

    setIsLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error("indisponivel");

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error || !data.user) {
        setErrorMessage(loginErrorMessage(error ?? {}));
        return;
      }
      // Encaminha pelo status real do perfil (a RLS só devolve o próprio perfil).
      const { data: profile } = await supabase.from("profiles").select("status").eq("id", data.user.id).maybeSingle();
      const status = (profile as { status?: string } | null)?.status;
      const next = safeNext(new URLSearchParams(window.location.search).get("redirect"));
      // Navegação completa de propósito: o middleware relê os cookies da sessão recém-criada.
      const target = !status || status === "pending" ? "/aguardando-aprovacao" : status === "active" ? (next ?? "/app") : "/conta/acesso";
      window.location.href = target;
    } catch {
      setErrorMessage("Sem conexão com o servidor. Verifique a internet e tente de novo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage(null);

    if (!isSupabaseConfigured) {
      setErrorMessage(UNAVAILABLE);
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error("indisponivel");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) setErrorMessage(CALLBACK_ERRORS.provedor);
    } catch {
      setErrorMessage(CALLBACK_ERRORS.provedor);
    }
  };

  const handlePasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail) return;

    if (!isSupabaseConfigured) {
      setRecoverySent(true);
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        // Resposta igual exista a conta ou não (sem enumeração de e-mails).
        await supabase.auth.resetPasswordForEmail(recoveryEmail.trim(), {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });
      }
      setRecoverySent(true);
    } catch {
      setRecoverySent(true);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <AppearanceBar />
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center font-black text-ink-950 text-lg shadow-sm">
            LR
          </div>
          <span className="text-xl font-bold tracking-tight text-theme-text">
            Leandro Rangel
          </span>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-theme-text">
          Entrar na Plataforma
        </h2>
        <p className="mt-2 text-xs text-theme-muted">
          Entre com a conta aprovada pela equipe
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-theme-primary py-8 px-6 sm:px-10 rounded-2xl border border-theme-border shadow-card space-y-6">
          {/* Mensagem de Erro ou Estado de Configuração */}
          {notice && !errorMessage && (
            <div role="status" className="p-4 rounded-xl bg-status-success-bg border border-status-success-border text-xs text-status-success-fg flex items-start gap-2.5">
              <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{notice}</span>
            </div>
          )}
          {errorMessage && (
            <div role="alert" className="p-4 rounded-xl bg-status-danger-bg border border-status-danger-border text-xs text-status-danger-fg flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-status-danger-fg flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Botão de Login Social Google */}
          <div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-theme-boundary/50 bg-theme-primary hover:bg-theme-secondary text-theme-text text-sm font-semibold shadow-subtle transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continuar com Google</span>
            </button>
            <span className="text-[11px] text-theme-muted block text-center mt-2">
              Confirmação de identidade social vinculada ao e-mail institucional
            </span>
          </div>

          <div className="flex items-center gap-3" role="separator" aria-label="ou com e-mail e senha">
            <div className="h-px flex-1 bg-theme-border" />
            <span className="whitespace-nowrap text-xs text-theme-muted uppercase tracking-wider font-semibold">
              ou com e-mail e senha
            </span>
            <div className="h-px flex-1 bg-theme-border" />
          </div>

          {/* Formulário de E-mail / Senha */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-1">
                E-mail Profissional ou Acadêmico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-theme-subtle absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.nome@exemplo.com.br"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-theme-primary border border-theme-boundary/80 text-sm text-theme-text focus:outline-none focus:border-theme-teal focus:ring-2 focus:ring-theme-teal/25"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="login-senha" className="block text-xs font-bold text-theme-text uppercase tracking-wider">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs text-theme-text hover:underline"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-theme-subtle absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="login-senha"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-theme-primary border border-theme-boundary/80 text-sm text-theme-text focus:outline-none focus:border-theme-teal focus:ring-2 focus:ring-theme-teal/25"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-inverse hover:bg-inverse-hover text-inverse-fg text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <span>{isLoading ? "Validando credenciais..." : "Acessar Plataforma"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Nota de Governança de Acesso */}
          <div className="p-3 bg-theme-secondary rounded-xl border border-theme-border text-xs text-theme-muted space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-theme-text">
              <ShieldCheck className="w-4 h-4 text-brand-500" />
              <span>Regra de Liberação:</span>
            </div>
            <p>
              O login confirma a identidade. O acesso à área protegida é concedido após aprovação da solicitação pela equipe.
            </p>
          </div>

          {/* Links de Apoio */}
          <div className="text-center pt-2 space-y-2 text-xs">
            <p className="text-theme-muted">
              Ainda não solicitou seu período experimental?{" "}
              <Link href="/solicitar-acesso" className="font-bold text-theme-text hover:underline">
                Solicitar 30 dias gratuitos
              </Link>
            </p>
            <p className="text-theme-muted">
              Quer testar sem cadastro?{" "}
              <Link href="/demo" className="font-bold text-status-caution-fg hover:underline">
                Acessar Demonstração Pública
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Recuperação de Senha */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-ink-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-theme-primary rounded-2xl max-w-md w-full p-6 space-y-4 shadow-elevated border border-theme-border">
            <h3 className="text-lg font-bold text-theme-text">Recuperação de Senha</h3>
            <p className="text-xs text-theme-muted leading-relaxed">
              Informe seu e-mail cadastrado para receber instruções seguras de redefinição de acesso.
            </p>

            {recoverySent ? (
              <div className="p-4 bg-status-success-bg border border-status-success-border rounded-xl text-xs text-status-success-fg space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <Check className="w-4 h-4 text-status-success-fg" />
                  <span>Solicitação registrada</span>
                </div>
                <p>Se houver uma conta aprovada com este e-mail, as instruções foram enviadas.</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setRecoverySent(false);
                  }}
                  className="mt-2 w-full py-2 bg-emerald-700 text-white rounded-lg font-bold text-xs"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordRecovery} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-theme-text mb-1">
                    E-mail Cadastrado
                  </label>
                  <input
                    type="email"
                    required
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com.br"
                    className="w-full px-3.5 py-2 rounded-xl border border-theme-boundary/50 text-xs"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-3 py-2 text-xs font-semibold text-theme-muted hover:text-theme-text"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-inverse hover:bg-inverse-hover text-inverse-fg rounded-xl text-xs font-bold"
                  >
                    Enviar Link de Recuperação
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
