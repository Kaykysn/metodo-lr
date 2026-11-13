"use client";

import React from "react";
import Link from "next/link";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { ShieldAlert, AlertTriangle } from "lucide-react";

export default function TermosPage() {
  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 max-w-container mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="p-4 bg-status-caution-bg border border-status-caution-border rounded-2xl flex items-start gap-3 text-status-caution-fg text-xs">
            <AlertTriangle className="w-5 h-5 text-status-caution-fg flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Minuta Preliminar para Revisão Institucional:</strong>
              <span>
                Termos preliminares da fase experimental. Não substitui assessoria regulatória ou jurídica formal.
              </span>
            </div>
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-theme-text">
              Condições de Uso
            </span>
            <h1 className="text-3xl font-extrabold text-theme-text mt-1">
              Termos de Uso Educacional
            </h1>
            <span className="text-xs text-theme-muted block mt-1">
              Última atualização: Novembro de 2026 • Studio Leandro Rangel
            </span>
          </div>

          <div className="bg-theme-primary rounded-2xl p-6 sm:p-8 border border-theme-border shadow-card space-y-6 text-sm text-theme-text leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-base font-bold text-theme-text">1. Natureza Exclusivamente Educacional</h2>
              <p className="text-xs text-theme-muted leading-relaxed">
                O Studio Leandro Rangel é uma plataforma desenvolvida para fins estritamente pedagógicos, de simulação e de estruturação do raciocínio metodológico para estudantes de Educação Física, professores e profissionais em formação continuada.
              </p>
              <div className="p-3 bg-status-danger-bg border border-status-danger-border rounded-xl text-xs text-status-danger-fg font-semibold">
                Aviso Mandatório: O sistema não é um dispositivo médico, não emite diagnósticos, não prescreve tratamentos clínicos e não substitui a avaliação presencial individualizada e a soberania do julgamento profissional do Profissional de Educação Física registrado no CREF.
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-theme-text">2. Concessão de Acesso e Período Experimental</h2>
              <p className="text-xs text-theme-muted leading-relaxed">
                Cada usuário aprovado pela moderação faz jus a um período experimental de 30 (trinta) dias consecutivos. O prazo tem início atômico no exato instante do primeiro acesso à área logada após a aprovação.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-theme-text">3. Continuidade da Infraestrutura Web</h2>
              <p className="text-xs text-theme-muted leading-relaxed">
                A expiração da licença experimental de um usuário individual restringe apenas o acesso às suas telas de trabalho protegidas, nunca acarretando o desligamento da infraestrutura geral do website, que permanece online de forma contínua para o público.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-theme-text">4. Propriedade Intelectual</h2>
              <p className="text-xs text-theme-muted leading-relaxed">
                O conteúdo didático, a marca nominativa &apos;Studio Leandro Rangel&apos;, elementos visuais, layouts e metodologias pedagógicas são protegidos pelas leis de propriedade intelectual. Os métodos de triagem e avaliação física referenciados pertencem aos seus respectivos autores e instituições, sendo citados apenas para fins educacionais.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
