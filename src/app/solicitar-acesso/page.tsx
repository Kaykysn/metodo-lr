"use client";

// Pedido de acesso: só nome e e-mail. Não cria conta, não pede senha e não usa Google.
// O pedido passa pela função access-request do servidor, que confere a verificação do Cloudflare
// (Turnstile) e limita por endereço de rede antes de gravar na fila do admin. Depois da aprovação,
// a pessoa recebe um convite de uso único para criar a senha (/auth/primeiro-acesso).
// Repetir o pedido não duplica nada, e a resposta é sempre a mesma (não revela se o e-mail já tem conta).
import React, { useRef, useState } from "react";
import Link from "next/link";
import AppearanceBar from "@/components/appearance/AppearanceBar";
import Captcha, { type CaptchaHandle } from "@/components/auth/Captcha";
import { CAPTCHA, CAPTCHA_MESSAGES } from "@/lib/auth/captcha";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { callPublicFunction, FunctionError } from "@/lib/supabase/functions";
import { ArrowRight, CheckCircle2, Clock } from "lucide-react";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-xl bg-theme-primary border border-theme-boundary/80 text-sm text-theme-text focus:outline-hidden focus:border-theme-teal focus:ring-2 focus:ring-theme-teal/25";

export default function SolicitarAcessoPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ kind: "sent" | "demo" | "error"; text: string } | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captcha = useRef<CaptchaHandle>(null);
  const inFlight = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return; // cliques repetidos não geram envios paralelos
    const name = fullName.trim().replace(/\s+/g, " ");
    const mail = email.trim();
    if (name.length < 2) return setResult({ kind: "error", text: "Informe seu nome." });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return setResult({ kind: "error", text: "Informe um e-mail válido." });
    if (!isSupabaseConfigured) {
      // Sem servidor: nada é enviado. Dizemos isso em vez de simular sucesso.
      return setResult({ kind: "demo", text: "Este ambiente ainda não tem servidor configurado, então o pedido não foi enviado. Use a demonstração para conhecer a plataforma." });
    }
    if (!CAPTCHA) return setResult({ kind: "error", text: "A verificação de segurança não está disponível agora. Tente de novo mais tarde." });
    if (!captchaToken) return setResult({ kind: "error", text: CAPTCHA_MESSAGES.pending });
    inFlight.current = true;
    setSending(true);
    setResult(null);
    try {
      await callPublicFunction("access-request", "", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: mail, captchaToken }),
      });
      setResult({ kind: "sent", text: "Solicitação recebida. Acompanhe seu e-mail para saber os próximos passos." });
    } catch (err) {
      // A função já responde em português (campo inválido, verificação recusada, limite atingido)
      const status = err instanceof FunctionError ? err.status : 0;
      setResult({
        kind: "error",
        text: err instanceof FunctionError && status >= 400 && status < 500 ? err.message : "Não foi possível enviar o pedido agora. Tente de novo em instantes.",
      });
      captcha.current?.reset(); // cada token vale para um envio
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  };

  const sent = result?.kind === "sent";

  return (
    <div className="relative min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <AppearanceBar />
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center font-black text-ink-950 text-lg shadow-xs">LR</div>
          <span className="text-xl font-bold tracking-tight text-theme-text">Leandro Rangel</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-theme-text">Solicitar acesso</h1>
        <p className="mt-2 text-sm text-theme-muted max-w-sm mx-auto">Para profissionais e estudantes de Educação Física. Cada pedido é analisado pela equipe.</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-theme-primary py-8 px-6 sm:px-10 rounded-2xl border border-theme-border shadow-card space-y-6">
          <div className="p-4 bg-theme-secondary/70 border border-theme-border rounded-xl text-[13px] text-theme-muted space-y-1.5">
            <p className="flex items-center gap-2 font-bold text-theme-text">
              <Clock className="w-4 h-4 text-theme-teal" aria-hidden /> Como funciona
            </p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Você envia só o nome e o e-mail.</li>
              <li>Com o pedido aprovado, chega um convite para criar a sua senha.</li>
              <li>Os 30 dias de teste começam no primeiro acesso.</li>
            </ul>
          </div>

          {sent ? (
            <p role="status" className="flex items-start gap-2.5 rounded-xl border border-status-success-border bg-status-success-bg p-4 text-sm text-status-success-fg">
              <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden /> {result.text}
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="nome" className="block text-xs font-bold text-theme-text mb-1">Nome</label>
                <input id="nome" type="text" autoComplete="name" required maxLength={120} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome completo" className={inputClass} />
              </div>
              <div>
                <label htmlFor="email" className="block text-xs font-bold text-theme-text mb-1">E-mail</label>
                <input id="email" type="email" autoComplete="email" inputMode="email" required maxLength={320} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" className={inputClass} />
              </div>
              <Captcha ref={captcha} onToken={setCaptchaToken} onUnavailable={() => setResult({ kind: "error", text: "A verificação de segurança não carregou. Recarregue a página e tente de novo." })} />
              <button type="submit" disabled={sending} aria-busy={sending} className="w-full py-3.5 rounded-xl bg-cta hover:bg-cta-hover text-cta-text font-bold text-sm shadow-elevated transition-all flex items-center justify-center gap-2 disabled:opacity-70">
                <span>{sending ? "Enviando…" : "Solicitar acesso"}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              {result && (
                <p role={result.kind === "error" ? "alert" : "status"} className={`rounded-control border p-3 text-sm ${result.kind === "demo" ? "border-status-caution-border bg-status-caution-bg text-status-caution-fg" : "border-status-danger-border bg-status-danger-bg text-status-danger-fg"}`}>
                  {result.text} {result.kind === "demo" && <Link href="/app" className="font-semibold underline">Abrir demonstração</Link>}
                </p>
              )}
              <p className="text-[12px] leading-relaxed text-theme-muted">
                Ao enviar, você concorda com os <Link href="/termos" target="_blank" className="font-semibold text-theme-text underline">Termos de Uso</Link> e a{" "}
                <Link href="/privacidade" target="_blank" className="font-semibold text-theme-text underline">Política de Privacidade</Link>.
              </p>
            </form>
          )}

          <div className="pt-4 border-t border-theme-border text-center text-sm text-theme-muted">
            Já ativou sua conta?{" "}
            <Link href="/login" className="font-bold text-theme-text hover:underline">Entrar</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
