"use client";

import React, { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  { q: "Para quem é a plataforma?", a: "Para profissionais e estudantes de Educação Física que avaliam, planejam e acompanham treinos. O aluno acompanhado pode ter um acesso próprio, só para ver o treino aprovado e registrar o que fez." },
  { q: "Quando começam os 30 dias de teste?", a: "No seu primeiro acesso à área interna, depois que a equipe aprovar sua solicitação. O cadastro em si não consome dias." },
  { q: "O sistema monta o treino sozinho?", a: "Não. Ele mostra opções compatíveis com o que foi registrado, com os critérios e a fonte de cada uma. Você escolhe os exercícios, define a dose e aprova a versão." },
  { q: "A plataforma faz diagnóstico?", a: "Não. O mapa registra onde o aluno relata sintomas; isso não identifica tecido, lesão ou causa. Sinais de alerta levam a orientação de avaliação médica, e ausência de alerta não certifica segurança." },
  { q: "Estudantes podem publicar treinos?", a: "Estudantes trabalham em casos didáticos e preparam rascunhos. Aprovar e disponibilizar um treino ao aluno é papel do professor responsável." },
  { q: "Onde ficam os dados da demonstração?", a: "Só no seu navegador, com dados fictícios e um botão para restaurar tudo. Não use dados reais de alunos na demonstração." },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();
  return (
    <section id="duvidas" className="scroll-mt-20 border-t border-theme-border">
      <div className="mx-auto grid max-w-[1180px] gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:px-8 lg:py-24">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Perguntas frequentes</h2>
        <div className="divide-y divide-theme-border border-y border-theme-border">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            const pid = `${base}-p${i}`;
            return (
              <div key={f.q}>
                <h3>
                  <button type="button" aria-expanded={isOpen} aria-controls={pid} id={`${pid}-b`} onClick={() => setOpen(isOpen ? null : i)} className="flex min-h-[60px] w-full items-center justify-between gap-4 py-4 text-left text-[17px] font-semibold">
                    {f.q}
                    <ChevronDown aria-hidden="true" className={`h-5 w-5 flex-shrink-0 text-theme-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                </h3>
                <div id={pid} role="region" aria-labelledby={`${pid}-b`} className={`grid transition-[grid-template-rows,opacity,visibility] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${isOpen ? "visible grid-rows-[1fr] opacity-100" : "invisible grid-rows-[0fr] opacity-0"}`}>
                  <div className="overflow-hidden">
                    <p className="pb-5 text-[16px] leading-relaxed text-theme-muted">{f.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
