"use client";

import React, { useId, useState } from "react";

const FAQS = [
  { q: "Para quem é a plataforma?", a: "Para profissionais e estudantes de Educação Física que avaliam, planejam e acompanham treinos. O aluno acompanhado pode ter um acesso próprio, só para ver o treino aprovado e registrar o que fez." },
  { q: "Quando começam os 30 dias de teste?", a: "No seu primeiro acesso à área interna, depois que a equipe aprovar sua solicitação. O cadastro em si não consome dias." },
  { q: "O sistema monta o treino sozinho?", a: "Não. Ele mostra opções compatíveis com o que foi registrado, com os critérios e a fonte de cada uma. Você escolhe os exercícios, define a dose e aprova a versão." },
  { q: "A plataforma faz diagnóstico?", a: "Não. O mapa registra onde o aluno relata sintomas; isso não identifica tecido, lesão ou causa. Sinais de alerta levam a orientação de avaliação médica, e ausência de alerta não certifica segurança." },
  { q: "Estudantes podem publicar treinos?", a: "Estudantes trabalham em casos didáticos e preparam rascunhos. Aprovar e disponibilizar um treino ao aluno é papel do professor responsável." },
  { q: "Onde ficam os dados da demonstração?", a: "Só no seu navegador, com dados fictícios e um botão para restaurar tudo. Não use dados reais de alunos na demonstração." },
];

/** FAQ em acordeão, com a linguagem visual editorial da referência. */
export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();
  return (
    <section id="duvidas" className="lr-section lr-light scroll-mt-20" aria-labelledby="faq-title">
      <div className="lr-wrap lr-faq">
        <div>
          <p className="lr-eyebrow"><span className="lr-rule" aria-hidden="true" /> Dúvidas frequentes</p>
          <h2 id="faq-title" className="lr-display lr-display-lg">Perguntas<br /><em>frequentes.</em></h2>
        </div>
        <div>
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            const pid = `${base}-p${i}`;
            return (
              <details key={f.q} open={isOpen} onToggle={(e) => {
                if (e.currentTarget.open) setOpen(i);
              }}>
                <summary
                  aria-controls={pid}
                  id={`${pid}-b`}
                  onClick={(e) => {
                    e.preventDefault();
                    setOpen(isOpen ? null : i);
                  }}
                >
                  {f.q}
                </summary>
                <p id={pid} role="region" aria-labelledby={`${pid}-b`}>{f.a}</p>
              </details>
            );
          })}
        </div>
      </div>
    </section>
  );
}
