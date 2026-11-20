"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Play, ShieldCheck, X } from "lucide-react";
import HeroShowcase from "./HeroShowcase";
import HeroBackdrop from "./HeroBackdrop";
import HeroSocialProof from "./HeroSocialProof";

/** Benefícios do Método LR: mesma largura de coluna e marcador padronizado. */
const BENEFITS = [
  "Avaliação física individualizada",
  "Identificação anatômica",
  "Planejamento de treinamento",
  "Acompanhamento da evolução",
];

type InfoMotion = { kind: "drift" | "scale"; vars: Record<string, string> };

/** Movimento sutil por bloco: durações e atrasos distintos para os ciclos não coincidirem. */
const BADGE_MOTION: InfoMotion = {
  kind: "drift",
  vars: { "--dur": "11s", "--delay": "-3s", "--drift-x": "3px", "--drift-y": "-3px", "--glow-alpha": "0.16" },
};
const BENEFIT_MOTION: InfoMotion[] = [
  { kind: "scale", vars: { "--dur": "8s", "--delay": "-1.5s", "--glow-alpha": "0.1" } },
  { kind: "drift", vars: { "--dur": "12.5s", "--delay": "-7s", "--drift-x": "-3px", "--drift-y": "3px", "--glow-alpha": "0.12" } },
  { kind: "scale", vars: { "--dur": "9.5s", "--delay": "-5.2s", "--glow-alpha": "0.1" } },
  { kind: "scale", vars: { "--dur": "7.2s", "--delay": "-2.6s", "--glow-alpha": "0.1" } },
];

const motionClass = (m: InfoMotion) => (m.kind === "drift" ? "hero-info-drift" : "hero-info-scale");
const motionStyle = (m: InfoMotion) => m.vars as React.CSSProperties;

/**
 * Abertura cinematográfica em duas colunas:
 *
 * - O Hero é uma "ilha escura": `data-theme="dark"` reescopa os tokens
 *   semânticos dentro da seção, então ele fica idêntico nos temas Claro/Escuro.
 * - Fundo: vídeo azul (com poster e fallback) + duas camadas de ondas SVG.
 * - Texto e ações à esquerda; a figura anatômica em raio-X à direita.
 * - A base do hero dissolve na cor da próxima seção (--hero-next-bg).
 *
 * O conteúdo, os CTAs e os identificadores originais foram preservados.
 */
export default function Hero() {
  const [demoOpen, setDemoOpen] = useState(false);
  const demoBtn = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);

  // Modal de demonstração: Esc fecha, Tab fica preso no diálogo e o foco volta.
  useEffect(() => {
    if (!demoOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const trigger = demoBtn.current;
    const node = dialog.current;
    const focusables = () =>
      Array.from(
        node?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((el) => el.offsetParent !== null);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setDemoOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Foca o primeiro controle do diálogo depois da montagem.
    window.setTimeout(() => focusables()[0]?.focus(), 0);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      (previouslyFocused ?? trigger)?.focus();
    };
  }, [demoOpen]);

  return (
    <section
      id="demonstracao"
      aria-labelledby="hero-titulo"
      data-theme="dark"
      className="hero hero-shell relative isolate flex flex-col overflow-hidden bg-[rgb(var(--hero-bg))] text-[rgb(var(--hero-text))]"
    >
      <HeroBackdrop />

      {/* Wrapper único do modelo: todas as camadas (base, raio-X, anel, glow)
          vivem dentro dele, no mesmo canvas e com as mesmas máscaras. */}
      <div className="hero-model">
        <HeroShowcase />
        {/* Dica de interação: acima do indicador de rolagem, fora do fade. */}
        <p className="hero-xray-hint">
          <span className="hero-hint-pointer">Explore a anatomia. Mova o cursor para revelar.</span>
          <span className="hero-hint-touch">Toque para revelar.</span>
        </p>
      </div>

      {/* Véu de contraste sobre o modelo no celular (o texto passa por cima). */}
      <div aria-hidden="true" data-decorative className="hero-model-scrim lg:hidden" />

      {/* Faixa de transição: termina na cor da próxima seção em cada tema. */}
      <div aria-hidden="true" data-decorative className="hero-section-fade" />

      {/* Coluna de texto: mesma margem esquerda do logo no header */}
      <div className="hero-inner relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center px-4 sm:px-6 lg:px-8">
        <div className="hero-copy w-full py-12 sm:py-16 lg:max-w-xl lg:py-20">
          <p
            className={`${motionClass(BADGE_MOTION)} inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--hero-jade))] backdrop-blur-md mt-4 -mb-4`}
            style={motionStyle(BADGE_MOTION)}
          >
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
            {BENEFITS.map((benefit, i) => (
              <li
                key={benefit}
                className={`${motionClass(BENEFIT_MOTION[i])} flex items-start gap-2.5 justify-self-start text-[15px] leading-snug text-[rgb(var(--hero-muted))]`}
                style={motionStyle(BENEFIT_MOTION[i])}
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
              className="hero-cta-primary inline-flex h-[52px] shrink-0 items-center justify-center whitespace-nowrap rounded-control px-7 text-base font-semibold transition-all duration-200 hover:-translate-y-0.5"
            >
              Solicitar acesso
            </Link>
            <button
              ref={demoBtn}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={demoOpen}
              onClick={() => setDemoOpen(true)}
              className="hero-cta-ghost inline-flex h-[52px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control px-7 text-base font-semibold transition-all duration-200 hover:-translate-y-0.5"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              Ver demonstração
            </button>
          </div>

          {/* Nota: abaixo dos botões, não ao lado */}
          <p className="mt-4 flex max-w-[60ch] items-start gap-2 text-[13px] leading-relaxed text-[rgb(var(--hero-muted))]/75 sm:text-sm sm:leading-5">
            <ShieldCheck className="mt-[2px] h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Para profissionais e estudantes de Educação Física. Acesso após aprovação; os 30 dias
              começam no primeiro acesso.
            </span>
          </p>

          {/* Prova de confiança: só aparece quando há dados reais configurados. */}
          <HeroSocialProof />
        </div>
      </div>

      {/* Indicador de rolagem: discreto, centralizado e longe da pílula do raio-X. */}
      <a href="#percurso" className="hero-scroll-cue">
        <span>Como funciona</span>
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </a>

      {/* Modal de demonstração: acessível, com focus trap, Esc e retorno de foco. */}
      {demoOpen && (
        <div
          className="hero-demo-overlay fixed inset-0 z-100 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDemoOpen(false);
          }}
        >
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="hero-demo-titulo"
            className="hero-demo-dialog relative w-full max-w-3xl overflow-hidden rounded-[20px] border border-white/15 bg-[rgb(var(--hero-bg))] text-[rgb(var(--hero-text))] shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
              <h2 id="hero-demo-titulo" className="text-lg font-semibold">
                Demonstração
              </h2>
              <button
                type="button"
                onClick={() => setDemoOpen(false)}
                aria-label="Fechar demonstração"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition-colors hover:bg-white/15"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-3 sm:p-4">
              {/* TODO: trocar por um vídeo/GIF da interface quando houver material oficial.
                  Enquanto isso, a cena do estúdio (já usada em "Como funciona"). */}
              <video
                className="aspect-video w-full rounded-[14px] bg-black object-cover"
                controls
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                poster="/media/hero-poster.jpg"
              >
                <source src="/media/hero-studio.mp4" type="video/mp4" />
              </video>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-[rgb(var(--hero-muted))]">
                  Avaliação, planejamento e acompanhamento no mesmo fluxo.
                </p>
                <Link
                  href="/app"
                  className="hero-cta-ghost inline-flex min-h-[44px] items-center justify-center rounded-control px-4 text-sm font-semibold"
                >
                  Abrir demonstração completa
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
