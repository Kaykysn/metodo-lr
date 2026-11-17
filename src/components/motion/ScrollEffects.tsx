"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useVisualEffects } from "@/components/providers/AppearanceProvider";
import { loadGsap } from "@/lib/motion/gsap";

type RevealKind = "up" | "down" | "left" | "right" | "fade" | "scale" | "clip" | "none";

function revealFrom(kind: RevealKind, distance: number) {
  switch (kind) {
    case "down":
      return { opacity: 0, y: -distance };
    case "left":
      return { opacity: 0, x: -distance };
    case "right":
      return { opacity: 0, x: distance };
    case "fade":
      return { opacity: 0 };
    case "scale":
      return { opacity: 0, scale: 0.965 };
    case "clip":
      return { opacity: 0, clipPath: "inset(0 0 100% 0)" };
    case "none":
      return null;
    default:
      return { opacity: 0, y: distance };
  }
}

/**
 * Camada global de animações de rolagem.
 *
 * Marcações usadas no conteúdo (sem acoplar lógica aos componentes):
 * - data-scroll-reveal="up|down|left|right|fade|scale|clip"
 * - data-scroll-delay="120" (ms) e data-scroll-distance="28" (px)
 * - data-scroll-stagger="0.08" no contêiner + data-scroll-item nos filhos
 * - data-scroll-line → linha divisória que cresce no eixo X
 * - data-scroll-parallax="10" → deslocamento discreto (somente desktop)
 * - data-scroll-sheet (com a classe .section-sheet) → seção que sobe por cima da anterior e abre até a largura toda
 *
 * A entrada é única (`once`): nada desaparece quando a pessoa volta a rolar.
 * Todo o contexto e os listeners são revertidos no unmount/troca de rota.
 */
export default function ScrollEffects() {
  const pathname = usePathname() ?? "/";
  const { effectsActive } = useVisualEffects();

  useEffect(() => {
    if (!effectsActive || typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    let cleanup: (() => void) | null = null;
    let startTimer = 0;
    let refreshTimer = 0;

    const start = async () => {
      // Páginas sem marcações não baixam GSAP/ScrollTrigger.
      const hasMarkers = document.querySelector(
        "[data-scroll-reveal],[data-scroll-stagger],[data-scroll-line],[data-scroll-parallax],[data-scroll-sheet]"
      );
      if (!hasMarkers) return;

      const { gsap, ScrollTrigger } = await loadGsap();
      if (cancelled) return;

      const context = gsap.context(() => {
        const allReveals = Array.from(document.querySelectorAll<HTMLElement>("[data-scroll-reveal]"));
        const staggerGroups = new Set(
          Array.from(document.querySelectorAll<HTMLElement>("[data-scroll-stagger]")).map((group) => group)
        );

        allReveals.forEach((el) => {
          if (el.closest("[data-scroll-stagger]") && !staggerGroups.has(el)) return;

          const kind = (el.dataset.scrollReveal as RevealKind) || "up";
          const distance = Number.parseFloat(el.dataset.scrollDistance || "26");
          const delay = Number.parseFloat(el.dataset.scrollDelay || "0") / 1000;
          const from = revealFrom(kind, Number.isFinite(distance) ? distance : 26);

          if (!from) return;

          const bounds = el.getBoundingClientRect();
          const belowFold = bounds.top > window.innerHeight * 0.9;

          gsap.from(el, {
            ...from,
            duration: 0.78,
            delay,
            ease: "power3.out",
            clearProps: "transform,opacity,clipPath",
            ...(belowFold
              ? {
                  scrollTrigger: {
                    trigger: el,
                    start: "top 88%",
                    once: true,
                    invalidateOnRefresh: true,
                  },
                }
              : {}),
          });
        });

        staggerGroups.forEach((group) => {
          const items = Array.from(group.querySelectorAll<HTMLElement>("[data-scroll-item]"));
          if (!items.length) return;

          const stagger = Number.parseFloat(group.dataset.scrollStagger || "0.08");
          const distance = Number.parseFloat(group.dataset.scrollDistance || "24");
          const bounds = group.getBoundingClientRect();
          const belowFold = bounds.top > window.innerHeight * 0.9;

          gsap.from(items, {
            opacity: 0,
            y: Number.isFinite(distance) ? distance : 24,
            duration: 0.72,
            ease: "power3.out",
            stagger: Number.isFinite(stagger) ? stagger : 0.08,
            clearProps: "transform,opacity",
            ...(belowFold
              ? {
                  scrollTrigger: {
                    trigger: group,
                    start: "top 86%",
                    once: true,
                    invalidateOnRefresh: true,
                  },
                }
              : {}),
          });
        });

        document.querySelectorAll<HTMLElement>("[data-scroll-line]").forEach((line) => {
          gsap.from(line, {
            scaleX: 0,
            transformOrigin: "left center",
            duration: 0.9,
            ease: "power3.inOut",
            scrollTrigger: {
              trigger: line,
              start: "top 92%",
              once: true,
            },
          });
        });

        // Folhas de seção: entram um pouco mais estreitas e abrem até a largura toda enquanto
        // cobrem a seção de cima (acompanha a rolagem, nos dois sentidos).
        const sheetInset = window.matchMedia("(min-width: 768px)").matches ? 4 : 2.5;
        document.querySelectorAll<HTMLElement>("[data-scroll-sheet]").forEach((sheet) => {
          const r = getComputedStyle(sheet).getPropertyValue("--sheet-radius").trim() || "40px";
          const shape = (inset: number) => `inset(0% ${inset}% 0% ${inset}% round ${r} ${r} 0px 0px)`;
          gsap.fromTo(
            sheet,
            { clipPath: shape(sheetInset) },
            {
              clipPath: shape(0),
              ease: "none",
              scrollTrigger: {
                trigger: sheet,
                start: "top bottom",
                end: "top 30%",
                scrub: 0.6,
                invalidateOnRefresh: true,
              },
            }
          );
        });

        // Parallax só em telas grandes, com deslocamento pequeno.
        if (window.matchMedia("(min-width: 1024px)").matches) {
          document.querySelectorAll<HTMLElement>("[data-scroll-parallax]").forEach((el) => {
            const raw = Number.parseFloat(el.dataset.scrollParallax || "8");
            const amount = Math.min(18, Math.max(2, Number.isFinite(raw) ? raw : 8));

            gsap.fromTo(
              el,
              { yPercent: -amount },
              {
                yPercent: amount,
                ease: "none",
                scrollTrigger: {
                  trigger: el,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 0.8,
                  invalidateOnRefresh: true,
                },
              }
            );
          });
        }
      }, document.body);

      cleanup = () => context.revert();

      const refresh = () => ScrollTrigger.refresh();
      refreshTimer = window.setTimeout(refresh, 220);

      if (document.readyState === "complete") refresh();
      else window.addEventListener("load", refresh, { once: true });

      const onOrientation = () => {
        window.clearTimeout(refreshTimer);
        refreshTimer = window.setTimeout(refresh, 260);
      };
      window.addEventListener("orientationchange", onOrientation, { passive: true });

      const previousCleanup = cleanup;
      cleanup = () => {
        previousCleanup();
        window.clearTimeout(refreshTimer);
        window.clearTimeout(startTimer);
        window.removeEventListener("load", refresh);
        window.removeEventListener("orientationchange", onOrientation);
      };
    };

    // Espera o novo conteúdo da rota montar antes de medir posições.
    startTimer = window.setTimeout(start, 70);

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      cleanup?.();
    };
  }, [effectsActive, pathname]);

  return null;
}
