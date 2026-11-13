"use client";

import React, { useState } from "react";
import Link from "next/link";
import AppearanceBar from "@/components/appearance/AppearanceBar";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ShieldCheck, Clock, CheckCircle2, ArrowRight } from "lucide-react";

export default function SolicitarAcessoPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    role: "teacher",
    institution: "",
    motivation: "",
    acceptedTerms: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ kind: "sent" | "demo" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !/^\S+@\S+\.\S+$/.test(formData.email) || !formData.acceptedTerms) {
      setResult({ kind: "error", text: "Preencha nome, um e-mail válido e aceite os termos para enviar." });
      return;
    }
    setIsSubmitting(true);
    setResult(null);
    try {
      if (!isSupabaseConfigured) {
        // Sem servidor: nada é enviado. Dizemos isso em vez de simular sucesso.
        setResult({ kind: "demo", text: "Este ambiente ainda não tem servidor configurado, então o pedido não foi enviado. Use a demonstração para conhecer a plataforma." });
        return;
      }
      const db = getSupabaseBrowserClient();
      if (!db) throw new Error("indisponivel");
      // Link de confirmação por e-mail; o perfil nasce "pendente" no banco (trigger handle_new_user)
      const { error } = await db.auth.signInWithOtp({
        email: formData.email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/aguardando-aprovacao`,
          data: { full_name: formData.fullName.trim(), institution: formData.institution.trim(), requested_role: formData.role, motivation: formData.motivation.trim() },
        },
      });
      if (error) throw error;
      setResult({ kind: "sent", text: `Enviamos um link de confirmação para ${formData.email.trim()}. Depois de confirmar, seu pedido fica em análise pela equipe.` });
    } catch (err) {
      // Mensagem fixa: o texto do provedor não vai para a tela (nem revela se o e-mail já tem conta).
      const status = (err as { status?: number }).status;
      setResult({
        kind: "error",
        text: status === 429 ? "Muitos pedidos seguidos. Aguarde alguns minutos e tente de novo." : "Não foi possível enviar o pedido agora. Tente de novo em instantes.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <AppearanceBar />
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center font-black text-ink-950 text-lg shadow-sm">
            LR
          </div>
          <span className="text-xl font-bold tracking-tight text-theme-text">
            Leandro Rangel
          </span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-theme-text">
          Solicitar 30 Dias de Acesso Gratuito
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-theme-muted max-w-md mx-auto">
          Para profissionais e estudantes de Educação Física. Cada pedido é analisado pela equipe.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4 sm:px-0">
        <div className="bg-theme-primary py-8 px-6 sm:px-10 rounded-2xl border border-theme-border shadow-card space-y-6">
          {/* Caixa de Regra Transparente */}
          <div className="p-4 bg-theme-secondary/70 border border-theme-border rounded-xl text-xs text-theme-text space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-theme-text">
              <Clock className="w-4 h-4 text-brand-500" />
              <span>Como funciona a concessão do acesso:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-theme-muted">
              <li>Cada solicitação é revisada manualmente pela equipe pedagógica.</li>
              <li>A contagem dos 30 dias só inicia no momento do seu primeiro acesso à plataforma.</li>
              <li>Ao fim do período, nenhum registro pessoal é excluído.</li>
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-1">
                Nome Completo
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Seu nome"
                className="w-full px-3.5 py-2.5 rounded-xl bg-theme-primary border border-theme-boundary/80 text-sm text-theme-text focus:outline-none focus:border-theme-teal focus:ring-2 focus:ring-theme-teal/25"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-1">
                E-mail Institucional ou Profissional
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="seu.email@instituicao.edu.br"
                className="w-full px-3.5 py-2.5 rounded-xl bg-theme-primary border border-theme-boundary/80 text-sm text-theme-text focus:outline-none focus:border-theme-teal focus:ring-2 focus:ring-theme-teal/25"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-1">
                  Perfil
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-theme-boundary/80 text-sm text-theme-text focus:outline-none focus:border-theme-teal focus:ring-2 focus:ring-theme-teal/25 bg-theme-primary"
                >
                  <option value="teacher">Professor(a) de Educação Física</option>
                  <option value="pe_student">Estudante de Educação Física</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-1">
                  Instituição de ensino ou local de trabalho
                </label>
                <input
                  type="text"
                  required
                  value={formData.institution}
                  onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                  placeholder="Nome da universidade/clínica"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-theme-primary border border-theme-boundary/80 text-sm text-theme-text focus:outline-none focus:border-theme-teal focus:ring-2 focus:ring-theme-teal/25"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-1">
                Objetivo de Estudo com a Plataforma
              </label>
              <textarea
                rows={3}
                required
                value={formData.motivation}
                onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
                placeholder="Ex: Aprofundar o raciocínio na avaliação de dor lombar crônica e acompanhamento de sobrecarga de treino..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-theme-primary border border-theme-boundary/80 text-sm text-theme-text focus:outline-none focus:border-theme-teal focus:ring-2 focus:ring-theme-teal/25"
              />
            </div>

            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={formData.acceptedTerms}
                  onChange={(e) => setFormData({ ...formData, acceptedTerms: e.target.checked })}
                  className="mt-1 w-4 h-4 rounded text-theme-text border-theme-boundary/50"
                />
                <span className="text-xs text-theme-muted leading-relaxed">
                  Declaro que compreendo o caráter estritamente educacional da plataforma e concordo com os{" "}
                  <Link href="/termos" target="_blank" className="font-semibold text-theme-text underline">
                    Termos de Uso
                  </Link>{" "}
                  e a{" "}
                  <Link href="/privacidade" target="_blank" className="font-semibold text-theme-text underline">
                    Política de Privacidade
                  </Link>
                  .
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-cta hover:bg-cta-hover text-cta-text font-bold text-sm shadow-elevated transition-all flex items-center justify-center gap-2 mt-4"
            >
              <span>{isSubmitting ? "Enviando…" : "Enviar solicitação"}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            {result && (
              <p
                role={result.kind === "error" ? "alert" : "status"}
                className={`rounded-control border p-3 text-sm ${
                  result.kind === "sent"
                    ? "border-status-success-border bg-status-success-bg text-status-success-fg"
                    : result.kind === "demo"
                      ? "border-status-caution-border bg-status-caution-bg text-status-caution-fg"
                      : "border-status-danger-border bg-status-danger-bg text-status-danger-fg"
                }`}
              >
                {result.text} {result.kind === "demo" && <Link href="/app" className="font-semibold underline">Abrir demonstração</Link>}
              </p>
            )}
          </form>

          <div className="pt-4 border-t border-theme-border text-center text-xs text-theme-muted">
            Já possui acesso liberado?{" "}
            <Link href="/login" className="font-bold text-theme-text hover:underline">
              Fazer login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
