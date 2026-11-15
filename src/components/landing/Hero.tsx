import React from "react";
import Link from "next/link";
import HeroShowcase from "./HeroShowcase";
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
          <span className="block text-[rgb(var(--hero-text))]">Entenda o corpo.</span>
          <span className="block text-[rgb(var(--hero-jade-pale))]">Evolua com precisão.</span>
        </h1>
        <p className="mt-5 max-w-[36rem] text-lg leading-relaxed text-[rgb(var(--hero-muted))]">
          Avalie, planeje e acompanhe cada etapa do desenvolvimento físico dos seus alunos.
        </p>

        {/* Elementos complementares do Método LR */}
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm font-medium text-[rgb(var(--hero-muted))]">
          <span className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--hero-jade))]" aria-hidden="true" />
            Avaliação física individualizada
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--hero-jade))]" aria-hidden="true" />
            Identificação anatômica
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--hero-jade))]" aria-hidden="true" />
            Planejamento de treinamento
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--hero-jade))]" aria-hidden="true" />
            Acompanhamento da evolução
          </span>
        </div>

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
          {/* Texto de apoio interativo da anatomia */}
          <div className="mb-3 flex items-center justify-between text-xs sm:text-sm text-[rgb(var(--hero-muted))]">
            <p className="inline-flex items-center gap-2 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[rgb(var(--hero-jade))] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[rgb(var(--hero-jade))]" />
              </span>
              Explore a anatomia. Mova o cursor para revelar.
            </p>
          </div>

          {/*
            HeroShowcase: Preserva a demonstração atual do produto por padrão
            e prepara a integração do Novo Hero com Raio-X Anatômico (HeroXRay).
          */}
          <HeroShowcase demo={buildDemoCase()} />
        </div>
      </div>
    </section>
  );
}
