"use client";

import Link from "next/link";
import React from "react";
import { BookOpen, Video, Lock, Clock, CheckCircle2 } from "lucide-react";

export default function ConteudosPage() {
  const lessons = [
    {
      title: "1. Neurobiologia da Dor: O Modelo Mecanístico da IASP",
      module: "Módulo I • Fundamentos de Dor",
      duration: "18 min",
      status: "published",
      desc: "Compreenda a distinção conceitual e prática entre os mecanismos nociceptivo, neuropático e nociplástico na clínica diária.",
    },
    {
      title: "2. Triagem de Segurança: Red Flags na Coluna Lombar",
      module: "Módulo I • Fundamentos de Dor",
      duration: "24 min",
      status: "published",
      desc: "Sinais que pedem avaliação médica antes do treino e como encaminhar. Conteúdo didático: não substitui protocolo institucional.",
    },
    {
      title: "3. Dosimetria de Sobrecarga: Volume Load na Reabilitação",
      module: "Módulo II • Movimento & Exercício",
      duration: "20 min",
      status: "published",
      desc: "Como calcular e prescrever progressões semanais de carga (kg) sem exacerbar a irritabilidade tecidual.",
    },
    {
      title: "4. Testes Neurodinâmicos: Interpretação Criteriosa",
      module: "Módulo II • Movimento & Exercício",
      duration: "15 min",
      status: "under_review",
      desc: "Diferenciação entre tensão neural fisiológica e mecanossensibilidade patológica durante SLR e Slump test.",
    },
    {
      title: "5. Comunicação Terapêutica e Desmistificação de Crenças",
      module: "Módulo III • Fatores Psicossociais",
      duration: "22 min",
      status: "unpublished",
      desc: "Estratégias para reduzir a cinesiofobia e a hipervigilância sem recorrer a termos de fragilidade anatômica.",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="pb-6 border-b border-theme-border">
        <h1 className="text-2xl font-bold tracking-tight text-theme-text sm:text-[1.75rem]">Conteúdos e referências</h1>
        <p className="mt-1 max-w-2xl text-[15px] text-theme-muted">
          Lições de apoio, a bibliografia usada pelo motor de regras e o glossário.
        </p>
        <nav aria-label="Seções de conteúdos" className="mt-4 flex flex-wrap gap-2">
          <Link href="/app/conteudos/referencias" className="inline-flex min-h-[44px] items-center rounded-control border border-theme-boundary/60 px-4 text-sm font-semibold hover:bg-theme-secondary">Bibliografia rastreável</Link>
          <Link href="/app/glossario" className="inline-flex min-h-[44px] items-center rounded-control border border-theme-boundary/60 px-4 text-sm font-semibold hover:bg-theme-secondary">Glossário</Link>
          <Link href="/app/conteudos/modulo-didatico" className="inline-flex min-h-[44px] items-center rounded-control border border-theme-boundary/60 px-4 text-sm font-semibold hover:bg-theme-secondary">Módulo didático de raciocínio (formato anterior)</Link>
        </nav>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {lessons.map((lesson) => (
          <div
            key={lesson.title}
            className="bg-theme-primary rounded-2xl p-6 border border-theme-border shadow-subtle flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-theme-text bg-theme-secondary px-2 py-0.5 rounded">
                  {lesson.module}
                </span>
                <span className="text-xs text-theme-muted flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {lesson.duration}
                </span>
              </div>

              <h3 className="text-base font-bold text-theme-text mb-2">
                {lesson.title}
              </h3>
              <p className="text-xs text-theme-muted leading-relaxed">
                {lesson.desc}
              </p>
            </div>

            <div className="pt-4 border-t border-theme-border flex items-center justify-between text-xs">
              {lesson.status === "published" ? (
                <span className="inline-flex items-center gap-1.5 font-bold text-status-success-fg">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Lição Disponível</span>
                </span>
              ) : lesson.status === "under_review" ? (
                <span className="inline-flex items-center gap-1.5 font-bold text-status-caution-fg">
                  <Clock className="w-4 h-4" />
                  <span>Em Revisão Docente</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-medium text-theme-subtle">
                  <Lock className="w-4 h-4" />
                  <span>Conteúdo Não Publicado</span>
                </span>
              )}

              <button
                type="button"
                disabled={lesson.status !== "published"}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                  lesson.status === "published"
                    ? "bg-inverse hover:bg-inverse-hover text-inverse-fg"
                    : "bg-theme-secondary text-theme-subtle cursor-not-allowed"
                }`}
              >
                {lesson.status === "published" ? "Assistir Aula" : "Aguardando"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
