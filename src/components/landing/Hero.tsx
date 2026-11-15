import React from "react";
import Link from "next/link";
import HeroShowcase from "./HeroShowcase";
import HeroBackdrop from "./HeroBackdrop";

/**
 * Abertura cinematográfica em duas colunas:
 *
 * - Fundo (Camada 3): vídeo local em loop com véu de contraste; o mesh estático
 *   permanece como primeiro quadro e fallback.
 * - Texto e ações à esquerda; a figura anatômica em raio-X, grande e integrada
 *   ao fundo, à direita (sem moldura de painel).
 * - No celular, a leitura segue na vertical e a anatomia é revelada pela rolagem.
 *
 * Todo o conteúdo, os CTAs e os identificadores originais da seção foram
 * preservados; apenas a apresentação foi reorganizada.
 */
export default function Hero() {
  return (
    <section
      id="demonstracao"
      aria-labelledby="hero-titulo"
      className="relative isolate scroll-mt-16 overflow-hidden bg-[rgb(var(--hero-bg))] text-[rgb(var(--hero-text))]"
    >
      <HeroBackdrop />

      {/* Borda inferior: o fundo se dissolve na superfície da página */}
      <div
        aria-hidden="true"
        data-decorative
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-40 bg-gradient-to-b from-transparent to-[rgb(var(--bg-page))] sm:h-56"
      />

      <div className="relative mx-auto grid max-w-[1240px] items-center gap-8 px-4 pb-12 pt-10 sm:px-6 sm:pt-12 lg:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)] lg:gap-4 lg:px-8 lg:pb-16 lg:pt-12">
        <div className="min-w-0">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--hero-jade))] backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--hero-jade))]" aria-hidden="true" />
            Biomecânica aplicada
          </p>

          <h1
            id="hero-titulo"
            className="text-[clamp(2.35rem,4vw+0.6rem,4.125rem)] font-extrabold leading-[1.04] tracking-[-0.03em]"
          >
            <span className="block text-[rgb(var(--hero-text))]">Entenda o corpo.</span>
            <span className="block text-[rgb(var(--hero-jade-pale))]">Evolua com precisão.</span>
          </h1>

          <p className="mt-5 max-w-[36rem] text-base leading-relaxed text-[rgb(var(--hero-muted))] sm:text-lg">
            Avalie, planeje e acompanhe cada etapa do desenvolvimento físico dos seus alunos.
          </p>

          {/* Elementos complementares do Método LR */}
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-[rgb(var(--hero-muted))] sm:text-sm">
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
        </div>

        <div className="relative mx-auto w-full min-w-0 max-w-[680px] lg:mx-0 lg:max-w-none lg:justify-self-end">
          {/* Texto de apoio: instrução muda conforme o dispositivo */}
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-[rgb(var(--hero-muted))] sm:text-xs">
            <p className="inline-flex items-center gap-2 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[rgb(var(--hero-jade))] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[rgb(var(--hero-jade))]" />
              </span>
              <span className="hidden sm:inline">Explore a anatomia. Mova o cursor para revelar.</span>
              <span className="sm:hidden">A anatomia é revelada conforme você rola.</span>
            </p>
            <span className="hidden text-[10px] uppercase tracking-[0.14em] text-[rgb(var(--hero-muted))]/70 sm:inline">
              Raio-X interativo
            </span>
          </div>

          <div className="hero-visual-enter">
            <HeroShowcase />
          </div>
        </div>
      </div>
    </section>
  );
}
