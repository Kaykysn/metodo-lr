import React from "react";
import Link from "next/link";
import { PLANS } from "@/lib/subscription/catalog";
import PlanCheckoutDialog from "./PlanCheckoutDialog";

/**
 * Resumo dos planos na landing, sem valores: o preço aparece só no resumo aberto por
 * "Adquirir plano", lido da mesma tabela usada na cobrança. Comparação completa em /planos.
 */
export default function PlansSummary() {
  return (
    <section id="planos" className="lr-section lr-light scroll-mt-20" aria-labelledby="planos-title">
      <div className="lr-wrap lr-plans-grid">
        <div className="lr-plans-intro">
          <p className="lr-eyebrow"><span className="lr-rule" aria-hidden="true" /> Planos</p>
          <h2 id="planos-title" className="lr-display lr-display-lg">O método na<br /><em>sua rotina.</em></h2>
          <p className="lr-section-copy mt-6">
            30 dias grátis para experimentar. Depois, uma mensalidade por profissional, sem cobrança por aluno.
          </p>
          <Link href="/planos" className="lr-button lr-button--dark mt-7">
            Comparar planos
          </Link>
        </div>
        <ul className="lr-plan-list">
          {PLANS.map((p) => (
            <li key={p.id}>
              <div>
                <h3>{p.name}</h3>
                <span>
                  Até {p.activeTraineeLimit} alunos ativos. {p.forWhom}
                </span>
              </div>
              <PlanCheckoutDialog planId={p.id} planName={p.name} />
            </li>
          ))}
          <p>
            <ShieldNote />
            A aprovação é individual; a contagem dos 30 dias começa no primeiro acesso.
          </p>
        </ul>
      </div>
    </section>
  );
}

function ShieldNote() {
  return (
    <svg className="mt-[2px] h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
