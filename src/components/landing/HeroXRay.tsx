"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useVisualEffects } from "@/components/providers/AppearanceProvider";
import { loadGsap } from "@/lib/motion/gsap";

/** Arte oficial do Hero: mesmo corpo, pose e enquadramento nas duas camadas. */
export const DEFAULT_BASE_IMAGE = "/media/hero-body-base.png";
export const DEFAULT_XRAY_IMAGE = "/media/hero-body-xray.png";

/** WebP otimizado (com transparência); o PNG continua como fallback do <picture>. */
function webpVariant(src: string): string | null {
  return /\.(png|jpe?g)(\?.*)?$/i.test(src) ? src.replace(/\.(png|jpe?g)(\?.*)?$/i, ".webp") : null;
}

const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);

export interface HeroXRayProps {
  /**
   * Imagem original do corpo humano (superfície / pele / postura).
   * Padrão: /media/hero-body-base.png (fundo transparente).
   */
  baseImage?: string;
  /**
   * Imagem anatômica (esqueleto, fáscias e músculos profundos) na mesma pose.
   * Padrão: /media/hero-body-xray.png (fundo transparente).
   */
  xrayImage?: string;
  /**
   * Raio da lanterna reveladora em pixels (escalado por breakpoint no CSS).
   * Padrão: 190 px.
   */
  revealRadius?: number;
  /**
   * Habilita ou desabilita a microanimação respiratória de 4,5 s (escala ~0,4%).
   * Padrão: true.
   */
  breathingEnabled?: boolean;
  /** Classes CSS adicionais aplicadas ao contêiner externo */
  className?: string;
  /** Descrição acessível da imagem base */
  altBase?: string;
  /** Descrição acessível da imagem de raio-x */
  altXRay?: string;
  /**
   * Proporção de aspecto para reserva prévia de dimensões (anti-CLS).
   * Padrão: "896 / 1114" — proporção nativa da arte.
   */
  aspectRatio?: string;
  /** Exibe legenda interativa de auxílio para o usuário */
  showInteractiveHint?: boolean;
  /**
   * No celular, revela a anatomia automaticamente conforme a rolagem.
   * No desktop o efeito continua sendo controlado pelo cursor.
   * Padrão: true.
   */
  mobileScrollReveal?: boolean;
}

/** Tempo (ms) que a lanterna permanece visível após soltar o dedo no celular. */
const TOUCH_LINGER_MS = 1600;

/**
 * HeroXRay — Raio-X anatômico interativo do Método LR.
 *
 * Arquitetura de camadas (todas com a MESMA caixa e o MESMO enquadramento):
 *
 *   1. Imagem base do corpo (object-contain, sem transformação própria).
 *   2. Imagem anatômica sobreposta, revelada por máscara (lanterna no desktop,
 *      varredura sincronizada com a rolagem no celular).
 *   3. Luzes atmosféricas (jade + realce quente) e sombra de contato.
 *
 * A respiração roda apenas no contêiner compartilhado (`.hero-xray-stage`), que
 * envolve as duas imagens: elas escalam juntas e a lanterna nunca desalinha.
 *
 * Performance:
 * - Coordenadas em refs + CSS variables (zero re-render por movimento).
 * - requestAnimationFrame com LERP independente de frame rate e auto-repouso.
 * - GSAP/ScrollTrigger carregados sob demanda apenas no celular.
 * - Imagens pré-carregadas e com reserva de proporção (sem CLS).
 * - Rolagem vertical do celular preservada; a varredura acompanha o scroll.
 */
export default function HeroXRay({
  baseImage = DEFAULT_BASE_IMAGE,
  xrayImage = DEFAULT_XRAY_IMAGE,
  revealRadius = 190,
  breathingEnabled = true,
  className = "",
  altBase = "Superfície corporal do aluno - Método LR",
  altXRay = "Estrutura anatômica profunda e esqueleto revelados por raio-x - Método LR",
  aspectRatio = "896 / 1114",
  showInteractiveHint = true,
  mobileScrollReveal = true,
}: HeroXRayProps) {
  const { prefersReducedMotion, effectsActive } = useVisualEffects();

  const containerRef = useRef<HTMLDivElement>(null);

  const coordsRef = useRef({
    currentX: 0,
    currentY: 0,
    targetX: 0,
    targetY: 0,
    active: false,
  });

  const rafId = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const pointerDownRef = useRef(false);
  const hideTimerRef = useRef<number | null>(null);
  const scanModeRef = useRef(false);

  /** Direção do gesto no toque: vertical rola a página, horizontal revela. */
  const gestureRef = useRef({
    startX: 0,
    startY: 0,
    decided: false,
    reveal: false,
  });

  const [hasInteracted, setHasInteracted] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);
  const [scanMode, setScanMode] = useState(false);

  const baseWebp = webpVariant(baseImage);
  const xrayWebp = webpVariant(xrayImage);

  // Em telas de toque o efeito é automático; no desktop segue o cursor.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const apply = () => {
      const next = mobileScrollReveal && mq.matches;
      scanModeRef.current = next;
      setScanMode(next);
    };

    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [mobileScrollReveal]);

  // Pré-carregamento das duas camadas; o esqueleto tem prazo máximo próprio.
  useEffect(() => {
    let active = true;
    const preload = (src: string | null) =>
      new Promise<void>((resolve) => {
        if (!src) return resolve();
        const img = new Image();
        img.decoding = "async";
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = src;
      });

    Promise.all([preload(baseImage), preload(xrayImage)]).then(() => {
      if (active) setImagesReady(true);
    });

    return () => {
      active = false;
    };
  }, [baseImage, xrayImage]);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  // Interpolação suave, com passo proporcional ao tempo real do quadro.
  const startRaf = useCallback(() => {
    if (rafId.current !== null) return;

    const tick = (now: number) => {
      const coords = coordsRef.current;
      const el = containerRef.current;

      if (!el) {
        rafId.current = null;
        return;
      }

      const elapsed = lastFrameRef.current ? Math.min(64, now - lastFrameRef.current) : 16.7;
      lastFrameRef.current = now;

      // 0.22 a 60 fps ≈ 1 - 0.78^(dt/16.7): mesma sensação em 120 Hz ou 30 Hz.
      const factor = prefersReducedMotion ? 1 : 1 - Math.pow(0.78, elapsed / 16.7);

      const dx = coords.targetX - coords.currentX;
      const dy = coords.targetY - coords.currentY;

      coords.currentX += dx * factor;
      coords.currentY += dy * factor;

      if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) {
        coords.currentX = coords.targetX;
        coords.currentY = coords.targetY;
      }

      el.style.setProperty("--xray-x", `${coords.currentX.toFixed(1)}px`);
      el.style.setProperty("--xray-y", `${coords.currentY.toFixed(1)}px`);

      const settled =
        Math.abs(coords.targetX - coords.currentX) < 0.05 &&
        Math.abs(coords.targetY - coords.currentY) < 0.05;

      if (settled) {
        // Repouso: encerra o ciclo e economiza CPU até o próximo movimento.
        rafId.current = null;
        lastFrameRef.current = 0;
        return;
      }

      rafId.current = requestAnimationFrame(tick);
    };

    lastFrameRef.current = 0;
    rafId.current = requestAnimationFrame(tick);
  }, [prefersReducedMotion]);

  const showLens = useCallback(
    (x: number, y: number, snap = false) => {
      if (scanModeRef.current) return;

      const coords = coordsRef.current;
      const el = containerRef.current;
      const entering = snap && !coords.active;

      // Entrada no painel/toque: a lanterna já nasce sob o cursor (sem varredura).
      if (entering) {
        coords.currentX = x;
        coords.currentY = y;
      }
      coords.targetX = x;
      coords.targetY = y;
      coords.active = true;

      if (!el) return;

      if (entering) {
        el.style.setProperty("--xray-x", `${x.toFixed(1)}px`);
        el.style.setProperty("--xray-y", `${y.toFixed(1)}px`);
      }

      el.style.setProperty("--xray-opacity", "1");

      if (snap && prefersReducedMotion) {
        coords.currentX = x;
        coords.currentY = y;
        el.style.setProperty("--xray-x", `${x.toFixed(1)}px`);
        el.style.setProperty("--xray-y", `${y.toFixed(1)}px`);
      }

      startRaf();
      if (!hasInteracted) setHasInteracted(true);
    },
    [hasInteracted, prefersReducedMotion, startRaf]
  );

  const hideLens = useCallback(() => {
    clearHideTimer();
    coordsRef.current.active = false;
    containerRef.current?.style.setProperty("--xray-opacity", "0");
  }, [clearHideTimer]);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(hideLens, TOUCH_LINGER_MS);
  }, [clearHideTimer, hideLens]);

  // Cancelamentos e timer de permanência no celular.
  useEffect(
    () => () => {
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
      if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
    },
    []
  );

  // No toque (desktop estreito): bloqueia apenas o gesto horizontal.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || scanMode) return;
    const onTouchMove = (e: TouchEvent) => {
      if (gestureRef.current.reveal && e.cancelable) e.preventDefault();
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, [scanMode]);

  // Varredura automática no celular: a máscara acompanha a posição do scroll.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !scanMode) return;

    // Movimento reduzido: anatomia visível, sem animação.
    if (prefersReducedMotion) {
      el.classList.add("hero-xray-scan");
      el.style.setProperty("--xray-scan", "106%");
      el.style.setProperty("--xray-scan-opacity", "1");
      el.style.setProperty("--xray-scan-line", "0");
      return () => {
        el.classList.remove("hero-xray-scan");
        el.style.removeProperty("--xray-scan");
        el.style.removeProperty("--xray-scan-opacity");
        el.style.removeProperty("--xray-scan-line");
      };
    }

    // Efeitos desligados: mantém apenas a superfície, sem varredura.
    if (!effectsActive) {
      el.classList.add("hero-xray-scan");
      el.style.setProperty("--xray-scan", "-8%");
      el.style.setProperty("--xray-scan-opacity", "0");
      el.style.setProperty("--xray-scan-line", "0");
      return () => {
        el.classList.remove("hero-xray-scan");
        el.style.removeProperty("--xray-scan");
        el.style.removeProperty("--xray-scan-opacity");
        el.style.removeProperty("--xray-scan-line");
      };
    }

    let cancelled = false;
    let cleanup = () => {};

    (async () => {
      const { gsap, ScrollTrigger } = await loadGsap();
      if (cancelled) return;

      el.classList.add("hero-xray-scan");
      const proxy = { scan: 0 };

      const apply = () => {
        // A linha começa acima da moldura e termina abaixo dela; a máscara
        // acompanha exatamente o mesmo ponto, sem salto no início/fim.
        const position = proxy.scan * 114 - 8;
        el.style.setProperty("--xray-scan", `${position.toFixed(2)}%`);
        el.style.setProperty("--xray-scan-opacity", proxy.scan > 0.004 ? "1" : "0");
        const lineVisible = position > 1 && position < 99 ? "1" : "0";
        el.style.setProperty("--xray-scan-line", lineVisible);
      };

      apply();

      const tween = gsap.fromTo(
        proxy,
        { scan: 0 },
        {
          scan: 1,
          ease: "none",
          onUpdate: apply,
          scrollTrigger: {
            trigger: el,
            start: "top 94%",
            end: "bottom 38%",
            scrub: 0.55,
            invalidateOnRefresh: true,
          },
        }
      );

      ScrollTrigger.refresh();

      cleanup = () => {
        tween.scrollTrigger?.kill();
        tween.kill();
        el.classList.remove("hero-xray-scan");
        el.style.removeProperty("--xray-scan");
        el.style.removeProperty("--xray-scan-opacity");
        el.style.removeProperty("--xray-scan-line");
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [scanMode, effectsActive, prefersReducedMotion]);

  /**
   * Coordenadas locais ao quadro da imagem (não à viewport).
   * A divisão por `offsetWidth`/`offsetHeight` compensa a escala da respiração,
   * mantendo o centro da lanterna exatamente sob o cursor.
   */
  const computeRelativeCoords = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const scaleX = el.offsetWidth ? rect.width / el.offsetWidth : 1;
    const scaleY = el.offsetHeight ? rect.height / el.offsetHeight : 1;
    return {
      x: clamp((clientX - rect.left) / (scaleX || 1), 0, el.offsetWidth),
      y: clamp((clientY - rect.top) / (scaleY || 1), 0, el.offsetHeight),
    };
  }, []);

  // --- Pointer Events: mouse no desktop, toque/arraste no celular ---

  const handlePointerEnter = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (scanModeRef.current || e.pointerType === "touch") return;
      const { x, y } = computeRelativeCoords(e.clientX, e.clientY);
      showLens(x, y, true);
    },
    [computeRelativeCoords, showLens]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (scanModeRef.current) return;

      if (e.pointerType === "touch") {
        const g = gestureRef.current;
        if (!pointerDownRef.current) return;

        if (!g.decided) {
          const dx = Math.abs(e.clientX - g.startX);
          const dy = Math.abs(e.clientY - g.startY);
          if (dx < 6 && dy < 6) return;
          g.decided = true;
          g.reveal = dx >= dy;
          if (!g.reveal) {
            // Gesto vertical: deixa a página rolar.
            hideLens();
            return;
          }
        }
        if (!g.reveal) return;
      }

      const { x, y } = computeRelativeCoords(e.clientX, e.clientY);
      coordsRef.current.targetX = x;
      coordsRef.current.targetY = y;
      if (coordsRef.current.active) startRaf();
      else showLens(x, y, true);
    },
    [computeRelativeCoords, hideLens, showLens, startRaf]
  );

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (pointerDownRef.current && e.pointerType === "touch") return;
      hideLens();
    },
    [hideLens]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (scanModeRef.current) return;
      clearHideTimer();
      pointerDownRef.current = true;

      gestureRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        decided: e.pointerType !== "touch",
        reveal: e.pointerType !== "touch",
      };

      if (e.pointerType === "touch") {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* Fallback silencioso */
        }
      }

      const { x, y } = computeRelativeCoords(e.clientX, e.clientY);
      showLens(x, y, true);
    },
    [clearHideTimer, computeRelativeCoords, showLens]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      pointerDownRef.current = false;
      if (scanModeRef.current || e.pointerType !== "touch") return;

      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* Fallback silencioso */
      }

      // Mantém a anatomia visível por um instante após soltar o dedo.
      if (gestureRef.current.reveal) scheduleHide();
      else hideLens();
    },
    [hideLens, scheduleHide]
  );

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      pointerDownRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* Fallback silencioso */
      }
      hideLens();
    },
    [hideLens]
  );

  // Teclado: setas posicionam a lanterna; foco revela o tórax; Esc fecha.
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const el = containerRef.current;
      if (!el || scanModeRef.current) return;
      const step = 30;
      const coords = coordsRef.current;

      let nextX = coords.targetX || el.offsetWidth / 2;
      let nextY = coords.targetY || el.offsetHeight * 0.42;

      if (e.key === "ArrowUp") nextY = Math.max(0, nextY - step);
      else if (e.key === "ArrowDown") nextY = Math.min(el.offsetHeight, nextY + step);
      else if (e.key === "ArrowLeft") nextX = Math.max(0, nextX - step);
      else if (e.key === "ArrowRight") nextX = Math.min(el.offsetWidth, nextX + step);
      else if (e.key === "Escape") {
        hideLens();
        return;
      } else {
        return;
      }

      e.preventDefault();
      showLens(nextX, nextY, true);
    },
    [hideLens, showLens]
  );

  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      // Só revela no foco por teclado; clique/toque usam as coordenadas do ponteiro.
      if (scanModeRef.current || !e.currentTarget.matches(":focus-visible")) return;
      const el = containerRef.current;
      if (!el || coordsRef.current.active) return;
      showLens(el.offsetWidth / 2, el.offsetHeight * 0.42, true);
    },
    [showLens]
  );

  const isBreathingActive = breathingEnabled && !prefersReducedMotion && effectsActive;

  return (
    <div className={clsx("relative w-full select-none", className)}>
      <div
        ref={containerRef}
        role="region"
        aria-label={
          scanMode
            ? "Raio-X anatômico do Método LR: a anatomia é revelada conforme a rolagem da página"
            : "Painel de Raio-X Anatômico Interativo do Método LR"
        }
        aria-roledescription="imagem interativa"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={hideLens}
        onPointerEnter={handlePointerEnter}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={
          {
            "--xray-r": `${revealRadius}px`,
            "--xray-x": "-9999px",
            "--xray-y": "-9999px",
            "--xray-opacity": "0",
            "--xray-scan": "-8%",
            "--xray-scan-opacity": "0",
            "--xray-scan-line": "0",
            aspectRatio: aspectRatio,
          } as React.CSSProperties
        }
        className={clsx(
          "hero-xray-canvas relative mx-auto w-full cursor-crosshair outline-none",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#76D7BE]",
          scanMode && "hero-xray-scan"
        )}
      >
        {/* Aura suave atrás da figura: profundidade sem criar uma caixa visível */}
        <div className="hero-xray-aura pointer-events-none absolute inset-0 z-0" aria-hidden="true" data-decorative />

        {/*
          CONTÊINER COMPARTILHADO (respiração):
          as duas camadas são filhas diretas deste elemento, portanto escalam
          juntas — a lanterna acompanha o corpo sem desalinhamento.
        */}
        <div className={clsx("hero-xray-stage absolute inset-0 z-10", isBreathingActive && "hero-xray-breathing")}>
          <div className="hero-xray-figure absolute inset-0">
            {/* CAMADA 1 — corpo (superfície) */}
            <picture className="absolute inset-0 z-10 block">
              {baseWebp && <source type="image/webp" srcSet={baseWebp} />}
              <img
                src={baseImage}
                alt={altBase}
                width={896}
                height={1114}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                draggable={false}
                className="h-full w-full select-none object-contain object-center pointer-events-none"
              />
            </picture>

            {/* CAMADA 2 — anatomia, revelada pela máscara */}
            <div className="hero-xray-layer absolute inset-0 z-20 select-none pointer-events-none" aria-hidden="true">
              <picture className="absolute inset-0 block">
                {xrayWebp && <source type="image/webp" srcSet={xrayWebp} />}
                <img
                  src={xrayImage}
                  alt=""
                  width={896}
                  height={1114}
                  loading="eager"
                  decoding="async"
                  draggable={false}
                  className="h-full w-full select-none object-contain object-center pointer-events-none"
                />
              </picture>
            </div>
          </div>

          {/* Lanterna: halo jade + aro óptico + borda quente discreta */}
          <div className="hero-xray-glow absolute inset-0 z-30" aria-hidden="true" data-decorative />

          {/* Linha de varredura do celular: traço luminoso no limite da revelação */}
          <div className="hero-xray-scanline absolute inset-x-0 z-30" aria-hidden="true" data-decorative />
        </div>

        {/* Esqueleto de carregamento com prazo próprio (não bloqueia sem JS) */}
        {!imagesReady && (
          <div
            aria-hidden="true"
            className="hero-xray-skeleton pointer-events-none absolute inset-0 z-50 flex items-center justify-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#011228]/55 px-4 py-2 text-xs font-medium text-[#a9bfc4] backdrop-blur-md">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-t-[#76D7BE] border-white/10" />
              Carregando anatomia...
            </span>
          </div>
        )}

        {/* Dica discreta de interação (o celular já revela sozinho) */}
        {showInteractiveHint && !scanMode && (
          <div
            className={clsx(
              "pointer-events-none absolute inset-x-0 bottom-2 z-50 flex justify-center transition-opacity duration-500",
              hasInteracted ? "opacity-0" : "opacity-95"
            )}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#021226]/70 px-3.5 py-1.5 text-[11px] font-semibold text-[#a9bfc4] shadow-lg backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#76D7BE] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#76D7BE]" />
              </span>
              Passe o cursor para revelar a anatomia
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
