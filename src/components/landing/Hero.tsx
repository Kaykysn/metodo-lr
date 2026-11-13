import React from "react";
import Link from "next/link";
import ProductPreview from "./ProductPreview";
import { buildDemoCase } from "@/lib/landing/demo-case";

/**
 * Abertura em uma coluna sobre o mesh "Campo de luz azul-petróleo e jade":
 * título no alto à esquerda, ações, e a prévia do produto em toda a largura.
 * O mesh é contínuo e estático; azul-noite atrás do texto, jade aberto à direita,
 * borda inferior fundindo na cor da página. Texto e ações aparecem prontos no primeiro quadro.
 */
export default function Hero() {
  return (
    <section id="demonstracao" aria-labelledby="hero-titulo" className="relative isolate scroll-mt-16 overflow-hidden bg-[rgb(var(--hero-bg))] text-[rgb(var(--hero-text))]">
      <picture className="pointer-events-none absolute inset-0 -z-20 select-none">
        <source type="image/webp" srcSet="/media/mesh-hero-960.webp 960w, /media/mesh-hero.webp 1672w" sizes="100vw" />
        <img src="/media/mesh-hero.jpg" alt="" fetchPriority="high" decoding="async" className="h-full w-full object-cover object-[70%_0%]" />
      </picture>
      {/* Azul-noite atrás do texto: forte no celular (texto em toda a largura), restrito ao canto no desktop */}
      <div aria-hidden="true" data-decorative className="hero-scrim pointer-events-none absolute inset-0 -z-10" />
      {/* Borda inferior do mesh se dissolve na superfície da página */}
      <div aria-hidden="true" data-decorative className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-b from-transparent to-[rgb(var(--bg-page))]" />

      <div className="mx-auto max-w-[1180px] px-4 pb-14 pt-9 sm:px-6 sm:pt-12 lg:px-8 lg:pb-20 lg:pt-12">
        <h1 id="hero-titulo" className="text-[clamp(2.4rem,4.2vw+0.6rem,4.125rem)] font-extrabold leading-[1.04] tracking-[-0.03em]">
          <span className="block text-[rgb(var(--hero-text))]">Avalie com clareza.</span>
          <span className="block text-[rgb(var(--hero-jade-pale))]">Planeje com critério.</span>
        </h1>
        <p className="mt-5 max-w-[36rem] text-lg leading-relaxed text-[rgb(var(--hero-muted))]">
          Organize avaliações, monte treinos individualizados e acompanhe a evolução dos seus alunos.
        </p>

        <div className="mt-7 flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-8">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/solicitar-acesso"
              className="inline-flex min-h-[50px] items-center justify-center rounded-control bg-cta px-6 text-base font-semibold text-cta-text transition-colors duration-200 hover:bg-cta-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Solicitar acesso
            </Link>
            <Link
              href="/app"
              className="glass-tile glass-tile-hero inline-flex min-h-[50px] items-center justify-center px-6 text-base font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Ver demonstração
            </Link>
          </div>
          <div className="text-sm leading-relaxed text-[rgb(var(--hero-muted))]">
            <p>Para profissionais e estudantes de Educação Física</p>
            <p>Acesso após aprovação; os 30 dias começam no primeiro acesso.</p>
          </div>
        </div>

        <div className="mt-10 lg:mt-12">
          <ProductPreview demo={buildDemoCase()} />
        </div>
      </div>
    </section>
  );
}
