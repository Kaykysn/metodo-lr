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
    <section id="planos" data-scroll-sheet className="section-sheet section-sheet--alt scroll-mt-20">
      <div className="mx-auto grid max-w-[1180px] gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:px-8 lg:py-24">
        <div data-scroll-reveal="up" data-scroll-distance="22">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Planos</h2>
          <p className="mt-3 max-w-sm text-[16px] leading-relaxed text-theme-muted">
            30 dias grátis para experimentar. Depois, uma mensalidade por profissional, sem cobrança por aluno.
          </p>
          <Link href="/planos" className="mt-6 inline-flex min-h-[48px] items-center rounded-control border border-theme-boundary/60 px-5 font-semibold transition-colors hover:bg-theme-secondary">
            Comparar planos
          </Link>
        </div>
        <ul data-scroll-stagger="0.1" data-scroll-distance="20" className="glass-panel divide-y divide-theme-border px-5 sm:px-7">
          {PLANS.map((p) => (
            <li key={p.id} data-scroll-item className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <div>
                <p className="text-lg font-semibold">{p.name}</p>
                <p className="mt-1 text-[15px] text-theme-muted">
                  Até {p.activeTraineeLimit} alunos ativos. {p.forWhom}
                </p>
              </div>
              <PlanCheckoutDialog planId={p.id} planName={p.name} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
