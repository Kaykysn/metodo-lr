import React from "react";
import Link from "next/link";
import { Play, ShieldCheck } from "lucide-react";
import HeroShowcase from "./HeroShowcase";
import HeroBackdrop from "./HeroBackdrop";

/** Benefícios do Método LR: mesma largura de coluna e marcador padronizado. */
const BENEFITS = [
  "Avaliação física individualizada",
  "Identificação anatômica",
  "Planejamento de treinamento",
  "Acompanhamento da evolução",
];

/**
 * Abertura cinematográfica em duas colunas:
 *
 * - Fundo (Camada 3): vídeo local em loop com véu de contraste; o mesh estático
 *   permanece como primeiro quadro e fallback.
 * - Texto e ações à esquerda; a figura anatômica em raio-X, grande e integrada
 *   ao fundo, à direita (sem moldura de painel). No celular a arte vira o
 *   próprio fundo da leitura, revelada pela rolagem.
 *
 * Todo o conteúdo, os CTAs e os identificadores originais da seção foram
 * preservados; apenas a apresentação foi reorganizada.
 */
export default function Hero() {
  return (
    <section
      id="demonstracao"
      aria-labelledby="hero-titulo"
      className="hero relative isolate flex min-h-[calc(100svh-var(--header-h))] flex-col justify-center overflow-hidden bg-[rgb(var(--hero-bg))] text-[rgb(var(--hero-text))]"
    >
      <HeroBackdrop />

      {/* Camada visual: fundo da leitura no celular, coluna direita no desktop */}
      <div className="hero-visual-layer pointer-events-none absolute inset-0 z-0 lg:left-[48%] lg:right-0 lg:pointer-events-auto">
        <div className="hero-visual-inner absolute inset-0">
          <HeroShowcase />
        </div>

        {/* Camada âmbar fora do container mascarado: garante que o brilho do
            raio-X continue visível no celular, onde a arte é reduzida a 42%. */}
        <div
          aria-hidden="true"
          data-decorative
          className="hero-xray-ember-mobile pointer-events-none absolute inset-0"
        />

        {/* Véu de contraste sobre a arte (apenas no celular) */}
        <div
          aria-hidden="true"
          data-decorative
          className="hero-visual-scrim pointer-events-none absolute inset-0 z-20 lg:hidden"
        />

        {/* Texto de apoio do raio-X: não compete com a hierarquia do título */}
        <p className="pointer-events-none absolute inset-x-0 bottom-3 z-30 hidden justify-center text-[11px] font-medium text-[rgb(var(--hero-muted))] lg:flex">
          Explore a anatomia. Mova o cursor para revelar.
        </p>
      </div>

      {/* Coluna de texto: mesma margem esquerda do logo no header */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-20 pt-10 sm:px-6 sm:pb-24 lg:grid lg:grid-cols-12 lg:px-8 lg:pb-24 lg:pt-16">
        <div className="hero-copy w-full lg:col-span-6 lg:max-w-[36rem]">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--hero-jade))] backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--hero-jade))]" aria-hidden="true" />
            Biomecânica aplicada
          </p>

          <h1
            id="hero-titulo"
            className="mt-4 text-balance text-[clamp(2.35rem,4vw,3.4rem)] font-extrabold leading-[1.05] tracking-[-0.02em]"
          >
            <span className="block">Entenda o corpo.</span>
            <span className="block text-[rgb(var(--hero-jade-pale))]">Evolua com precisão.</span>
          </h1>

          <p className="mt-5 max-w-[52ch] text-[17px] leading-relaxed text-[rgb(var(--hero-muted))] sm:text-[19px]">
            Avalie, planeje e acompanhe cada etapa do desenvolvimento físico dos seus alunos.
          </p>

          {/* Benefícios: 2x2 com colunas iguais; 1 coluna no celular */}
          <ul className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            {BENEFITS.map((benefit) => (
              <li
                key={benefit}
                className="flex items-start gap-2.5 text-[15px] leading-snug text-[rgb(var(--hero-muted))]"
              >
                <span
                  className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[rgb(var(--hero-jade))]"
                  aria-hidden="true"
                />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>

          {/* CTAs em uma linha no desktop, largura total no celular */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-nowrap">
            <Link
              href="/solicitar-acesso"
              className="hero-cta-primary inline-flex h-[52px] shrink-0 items-center justify-center whitespace-nowrap rounded-control px-7 text-base font-semibold transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Solicitar acesso
            </Link>
            <Link
              href="/app"
              className="hero-cta-ghost inline-flex h-[52px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control px-7 text-base font-semibold transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              Ver demonstração
            </Link>
          </div>

          {/* Nota: abaixo dos botões, não ao lado */}
          <p className="mt-4 flex max-w-[60ch] items-start gap-2 text-[13px] leading-relaxed text-[rgb(var(--hero-muted))]/75 sm:text-sm">
            <ShieldCheck className="mt-[2px] h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Para profissionais e estudantes de Educação Física. Acesso após aprovação; os 30 dias
              começam no primeiro acesso.
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
