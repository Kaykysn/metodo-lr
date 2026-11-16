"use client";

import React from "react";
import Link from "next/link";
import AppearanceBar from "@/components/appearance/AppearanceBar";
import { Clock, CheckCircle2, ArrowRight, ShieldCheck, Mail } from "lucide-react";

export default function AguardandoAprovacaoPage() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

  return (
    <div className="relative min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <AppearanceBar />
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center font-black text-ink-950 text-xl shadow-xs">
            LR
          </div>
          <span className="text-xl font-bold tracking-tight text-theme-text">
            Leandro Rangel
          </span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-lg px-4 sm:px-0">
        <div className="bg-theme-primary py-10 px-6 sm:px-10 rounded-2xl border border-theme-border shadow-card text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-status-caution-bg border border-status-caution-border text-status-caution-fg flex items-center justify-center mx-auto shadow-xs">
            <Clock className="w-8 h-8 text-status-caution-fg animate-pulse" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-theme-text">
              Solicitação em Análise
            </h1>
            <p className="text-xs sm:text-sm text-theme-muted leading-relaxed sm:leading-5">
              Recebemos seus dados. A equipe analisa cada pedido e avisa pelo contato informado. Seus 30 dias só começam no primeiro acesso depois da aprovação.
            </p>
          </div>

          {/* Garantia dos 30 dias */}
          <div className="p-4 bg-theme-secondary/70 border border-theme-border rounded-xl text-left text-xs space-y-2 text-theme-text">
            <div className="flex items-center gap-2 font-bold text-theme-text">
              <ShieldCheck className="w-4 h-4 text-status-success-fg" />
              <span>Seus 30 dias estão preservados:</span>
            </div>
            <p className="text-theme-muted leading-relaxed">
              O seu período de 30 dias de teste gratuito <strong>não está correndo</strong> enquanto sua solicitação é analisada. O cronômetro só é acionado no momento em que você faz o primeiro login após a aprovação formal.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/demo"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-inverse hover:bg-inverse-hover text-inverse-fg text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              <span>Explorar Demonstração Interativa</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-theme-boundary/50 text-theme-text text-xs font-semibold hover:bg-theme-secondary transition-colors"
            >
              Voltar à Página Inicial
            </Link>
          </div>

          {contactEmail && (
            <div className="pt-4 border-t border-theme-border text-xs text-theme-muted">
              Dúvidas sobre o status da aprovação? Entre em contato pelo e-mail:{" "}
              <a href={`mailto:${contactEmail}`} className="font-semibold text-theme-text underline">
                {contactEmail}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
