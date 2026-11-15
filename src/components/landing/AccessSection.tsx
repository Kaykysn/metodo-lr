import React from "react";
import Link from "next/link";

const STEPS = [
  { t: "Solicite", d: "Informe sua formação ou atuação em Educação Física." },
  { t: "Aguarde a análise", d: "Cada pedido é avaliado individualmente pela equipe." },
  { t: "Use por 30 dias", d: "A contagem começa no primeiro acesso depois da aprovação." },
  { t: "Seus dados ficam", d: "Ao fim do período, nada é apagado. Depois, você escolhe um dos planos." },
];

export default function AccessSection() {
  return (
    <section className="border-t border-theme-border">
      <div className="mx-auto max-w-[1180px] px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div
          data-scroll-reveal="scale"
          data-scroll-distance="18"
          className="glass-cta px-6 py-12 text-ink-50 sm:px-12"
        >
          <h2 className="max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">Acesso individual, com aprovação.</h2>
          <ol data-scroll-stagger="0.1" data-scroll-distance="18" className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.t} data-scroll-item>
                <span className="tabular text-sm font-semibold text-brand-300">{i + 1}</span>
                <p className="mt-1 text-lg font-semibold">{s.t}</p>
                <p className="mt-1 text-[15px] leading-relaxed text-ink-300">{s.d}</p>
              </li>
            ))}
          </ol>
          <div data-scroll-stagger="0.12" data-scroll-distance="14" className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link data-scroll-item href="/solicitar-acesso" className="inline-flex min-h-[50px] items-center justify-center rounded-control bg-brand-300 px-6 font-semibold text-ink-950 transition-colors hover:bg-brand-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-200">Solicitar acesso</Link>
            <Link data-scroll-item href="/app" className="inline-flex min-h-[50px] items-center justify-center rounded-control border border-white/25 px-6 font-semibold text-ink-50 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Ver demonstração</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
