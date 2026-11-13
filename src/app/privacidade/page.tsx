"use client";

import React from "react";
import Link from "next/link";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { ShieldCheck, AlertTriangle } from "lucide-react";

export default function PrivacidadePage() {
  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 max-w-container mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="p-4 bg-status-caution-bg border border-status-caution-border rounded-2xl flex items-start gap-3 text-status-caution-fg text-xs">
            <AlertTriangle className="w-5 h-5 text-status-caution-fg flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Minuta Preliminar para Revisão Jurídica:</strong>
              <span>
                Este documento constitui um rascunho operacional e transparente para a fase de testes e protótipo V1, sujeito à homologação e assessoria jurídica formal antes de operações comerciais.
              </span>
            </div>
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-theme-text">
              Privacidade & Proteção de Dados
            </span>
            <h1 className="text-3xl font-extrabold text-theme-text mt-1">
              Política de Privacidade (Minuta LGPD)
            </h1>
            <span className="text-xs text-theme-muted block mt-1">
              Última atualização: Novembro de 2026 • Studio Leandro Rangel
            </span>
          </div>

          <div className="bg-theme-primary rounded-2xl p-6 sm:p-8 border border-theme-border shadow-card space-y-6 text-sm text-theme-text leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-base font-bold text-theme-text">1. Princípio da Minimização de Dados (LGPD Art. 6º, III)</h2>
              <p className="text-xs text-theme-muted leading-relaxed">
                O Studio Leandro Rangel opera estritamente sob o princípio da necessidade. Na versão V1 da plataforma educacional, é expressamente vedada a coleta de nomes civis completos, números de CPF, documentos de identidade civil ou endereços residenciais de alunos praticantes.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-theme-text">2. Pseudonimização de Registros de Avaliação</h2>
              <p className="text-xs text-theme-muted leading-relaxed">
                Todas as avaliações de estudo cadastradas utilizam códigos alfanuméricos gerados automaticamente (ex: TRE-5831) e iniciais opcionais (ex: M.R.), reduzindo drasticamente riscos de identificação direta e resguardando o sigilo ético preconizado pelo CONFEF e pela LGPD.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-theme-text">3. Dados dos Usuários Cadastrados</h2>
              <p className="text-xs text-theme-muted leading-relaxed">
                Para fins de controle de acesso ao período gratuito de 30 dias e autenticação segura, coletamos apenas nome do profissional/estudante, e-mail institucional/profissional, perfil de atuação e instituição acadêmica ou estabelecimento. Não compartilhamos nem comercializamos estes dados com terceiros para fins publicitários.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-theme-text">4. Armazenamento e Encerramento do Período de Teste</h2>
              <p className="text-xs text-theme-muted leading-relaxed">
                Ao término dos 30 dias de teste de um usuário individual, os registros não são sumariamente eliminados. O titular poderá solicitar exportação ou exclusão definitiva de seus dados conforme os direitos previstos no Artigo 18 da Lei nº 13.709/2018 (LGPD).
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-theme-text">5. Canal de Contato com o Encarregado</h2>
              <p className="text-xs text-theme-muted leading-relaxed">
                Dúvidas sobre o tratamento de dados pessoais podem ser encaminhadas diretamente pelo canal oficial informado no rodapé da plataforma.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
