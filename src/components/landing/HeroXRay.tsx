"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import clsx from "clsx";
import { useVisualEffects } from "@/components/providers/AppearanceProvider";

/** Arte oficial do Hero: o mesmo canvas 896x1114 nas duas versões. */
export const DEFAULT_BASE_IMAGE = "/media/hero-body-base.webp";
export const DEFAULT_XRAY_IMAGE = "/media/hero-body-xray.webp";

const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);

/** Trilha da varredura automática, em fração do wrapper (antebraço direito). */
const SWEEP_START = { x: 0.81, y: 0.62 };
const SWEEP_END = { x: 0.87, y: 0.86 };
/** Posição estática com movimento reduzido: meio do antebraço. */
const SWEEP_STATIC = { x: 0.84, y: 0.74 };
/** Ida e volta completa da varredura. */
const SWEEP_PERIOD_MS = 8000;
/** Suavização do cursor (lerp por quadro a 60 fps). */
const LERP = 0.15;
/** Folga mínima entre o anel da lente e a borda da viewport. */
const VIEWPORT_MARGIN = 24;

export interface HeroXRayProps {
  /** Imagem de superfície (transparente). */
  baseImage?: string;
  /** Imagem anatômica (transparente, mesmo canvas). */
  xrayImage?: string;
  /** Raio da lente. Mantido por compatibilidade; hoje o raio vem de --lens-r (cqw). */
  revealRadius?: number;
  /** Liga o pulso lento do anel (desligado com movimento reduzido). */
  breathingEnabled?: boolean;
  /** Classes extras no wrapper (posição/tamanho ficam no CSS). */
  className?: string;
  altBase?: string;
  /** Reserva de proporção para CLS zero. */
  aspectRatio?: string;
  /** Mantido por compatibilidade de API. */
  mobileScrollReveal?: boolean;
}

/**
 * HeroXRay — modelo em raio-X com lente que segue o cursor.
 *
 * Arquitetura (um único wrapper, cinco camadas absolutas no mesmo canvas):
 *   a) cópia borrada da base, para dissolver o corte da cintura;
 *   b) base nítida, com fade inferior;
 *   c) camada de raio-X mascarada pela lente circular ∩ fade inferior;
 *   d) anel luminoso centrado nas MESMAS coordenadas da lente;
 *   e) glow âmbar atrás do anel.
 *
 * As duas imagens usam `fill` no mesmo wrapper com a mesma proporção, o mesmo
 * `object-fit: contain` e o mesmo `object-position: center bottom`, portanto o
 * alinhamento anatômico é garantido pelo layout.
 *
 * Movimento: um único requestAnimationFrame escreve `--x`/`--y` (px relativos
 * ao wrapper) direto no DOM, sem re-render. Sem interação a lente varre o
 * antebraço direito em 8 s (ida e volta); com o mouse ela segue o cursor com
 * lerp 0.15 e volta à trilha ao sair. No toque, um tap fixa/desafixa a lente.
 * As coordenadas são presas à viewport para o anel nunca ser cortado.
 */
export default function HeroXRay({
  baseImage = DEFAULT_BASE_IMAGE,
  xrayImage = DEFAULT_XRAY_IMAGE,
  revealRadius = 190,
  breathingEnabled = true,
  className = "",
  altBase = "Modelo masculino em vista frontal com destaque anatômico dos músculos e ossos",
  aspectRatio = "896 / 1114",
}: HeroXRayProps) {
  const { prefersReducedMotion, effectsActive } = useVisualEffects();

  const containerRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);
  const lensRadiusRef = useRef(0);

  const [hasInteracted, setHasInteracted] = useState(false);

  /** Coordenadas em px relativas ao wrapper. */
  const coordsRef = useRef({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    mode: "auto" as "auto" | "cursor" | "fixed",
    initialized: false,
  });

  const writeVars = useCallback((x: number, y: number) => {
    const el = containerRef.current;
    if (!el) return;
    const px = `${x.toFixed(1)}px`;
    const py = `${y.toFixed(1)}px`;
    // --x/--y são a fonte de verdade; --xray-* mantém compatibilidade com o CSS.
    el.style.setProperty("--x", px);
    el.style.setProperty("--y", py);
    el.style.setProperty("--xray-x", px);
    el.style.setProperty("--xray-y", py);
  }, []);

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return null;
    return el.getBoundingClientRect();
  }, []);

  /** Raio real da lente (resolvido do CSS/cqw), usado para prender o anel na viewport. */
  const syncLensRadius = useCallback(() => {
    const ring = ringRef.current;
    if (!ring) return;
    const width = ring.getBoundingClientRect().width;
    if (width > 0) lensRadiusRef.current = width / 2;
  }, []);

  /**
   * Mantém o anel inteiro dentro da viewport (≥24px de folga). O raio vem de
   * --lens-r: 20cqw, ou seja, 20% da largura do wrapper.
   */
  const clampToViewport = useCallback((x: number, y: number) => {
    const el = containerRef.current;
    if (!el) return { x, y };
    const box = el.getBoundingClientRect();
    const radius = lensRadiusRef.current || el.clientWidth * 0.2;

    const vw = Math.min(
      window.innerWidth,
      document.documentElement.clientWidth || window.innerWidth,
      window.visualViewport?.width || window.innerWidth
    );
    const vh = Math.min(
      window.innerHeight,
      document.documentElement.clientHeight || window.innerHeight,
      window.visualViewport?.height || window.innerHeight
    );

    // Limites do centro para que o círculo não encoste nas bordas da viewport.
    const minX = VIEWPORT_MARGIN + radius - box.left;
    const maxX = vw - VIEWPORT_MARGIN - radius - box.left;
    const minY = VIEWPORT_MARGIN + radius - box.top;
    const maxY = vh - VIEWPORT_MARGIN - radius - box.top;

    return {
      x: clamp(x, Math.max(radius * 0.15, minX), Math.max(radius, maxX)),
      y: clamp(y, Math.max(radius * 0.15, minY), Math.max(radius, maxY)),
    };
  }, []);

  // Loop único: varredura automática + perseguição do cursor com lerp.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const rect = measure();
    if (!rect) return;

    syncLensRadius();

    const c = coordsRef.current;
    const staticPoint = clampToViewport(rect.width * SWEEP_STATIC.x, rect.height * SWEEP_STATIC.y);
    c.x = staticPoint.x;
    c.y = staticPoint.y;
    c.targetX = c.x;
    c.targetY = c.y;
    writeVars(c.x, c.y);

    // Movimento reduzido: lente estática no antebraço, sem varredura nem pulso.
    if (prefersReducedMotion) {
      writeVars(c.targetX, c.targetY);
      return;
    }

    const tick = (now: number) => {
      const node = containerRef.current;
      if (!node) {
        rafRef.current = null;
        return;
      }
      const box = node.getBoundingClientRect();
      const state = coordsRef.current;
      const elapsed = lastFrameRef.current ? Math.min(64, now - lastFrameRef.current) : 16.7;
      lastFrameRef.current = now;

      if (state.mode === "auto") {
        // ida e volta com ease-in-out (cosseno): 0 -> 1 -> 0
        const phase = 0.5 - 0.5 * Math.cos((now / SWEEP_PERIOD_MS) * Math.PI * 2);
        state.targetX = (SWEEP_START.x + (SWEEP_END.x - SWEEP_START.x) * phase) * box.width;
        state.targetY = (SWEEP_START.y + (SWEEP_END.y - SWEEP_START.y) * phase) * box.height;
      }

      if (state.mode !== "fixed") {
        const safeTarget = clampToViewport(state.targetX, state.targetY);
        state.targetX = safeTarget.x;
        state.targetY = safeTarget.y;
      }

      const k = 1 - Math.pow(1 - LERP, elapsed / 16.7);
      state.x += (state.targetX - state.x) * k;
      state.y += (state.targetY - state.y) * k;

      const safe = clampToViewport(state.x, state.y);
      state.x = safe.x;
      state.y = safe.y;
      writeVars(state.x, state.y);

      rafRef.current = requestAnimationFrame(tick);
    };

    lastFrameRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastFrameRef.current = 0;
    };
  }, [clampToViewport, measure, prefersReducedMotion, syncLensRadius, writeVars, effectsActive]);

  // Reancora a lente se o wrapper mudar de tamanho.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      syncLensRadius();
      const c = coordsRef.current;
      if (c.mode === "auto") return;
      const safe = clampToViewport(c.targetX, c.targetY);
      c.targetX = safe.x;
      c.targetY = safe.y;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [clampToViewport, syncLensRadius]);

  const pointFromEvent = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      x: clamp(e.clientX - rect.left, 0, rect.width),
      y: clamp(e.clientY - rect.top, 0, rect.height),
    };
  }, []);

  // A lente também acompanha o ponteiro globalmente. Isso garante que o efeito
  // funcione quando o mouse entra no modelo por qualquer caminho e evita que
  // um `mousemove` sintético (testes/automação) fique sem resposta.
  useEffect(() => {
    if (prefersReducedMotion) return;
    const handleMove = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      if (coordsRef.current.mode === "fixed") return;
      const rect = el.getBoundingClientRect();
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (!inside) {
        if (pointerIdRef.current === null) {
          coordsRef.current.mode = "auto";
        }
        return;
      }
      coordsRef.current.mode = "cursor";
      coordsRef.current.targetX = clamp(e.clientX - rect.left, 0, rect.width);
      coordsRef.current.targetY = clamp(e.clientY - rect.top, 0, rect.height);
    };
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, [prefersReducedMotion]);

  const handlePointerEnter = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (prefersReducedMotion) return;
      if (e.pointerType === "touch") return;
      setHasInteracted(true);
      const point = pointFromEvent(e);
      if (!point) return;
      coordsRef.current.mode = "cursor";
      coordsRef.current.targetX = point.x;
      coordsRef.current.targetY = point.y;
    },
    [pointFromEvent, prefersReducedMotion]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (prefersReducedMotion || e.pointerType === "touch") return;
      const point = pointFromEvent(e);
      if (!point) return;
      if (coordsRef.current.mode !== "fixed") {
        coordsRef.current.mode = "cursor";
        coordsRef.current.targetX = point.x;
        coordsRef.current.targetY = point.y;
      }
    },
    [pointFromEvent, prefersReducedMotion]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      setHasInteracted(true);
      const point = pointFromEvent(e);
      if (!point) return;

      // Toque: fixa a lente no ponto; um segundo toque retoma a varredura.
      if (e.pointerType === "touch") {
        const c = coordsRef.current;
        if (c.mode === "fixed") {
          c.mode = "auto";
        } else {
          c.mode = "fixed";
          c.targetX = point.x;
          c.targetY = point.y;
        }
        return;
      }

      if (prefersReducedMotion) return;
      // Captura o ponteiro para o arraste continuar mesmo saindo do modelo.
      e.currentTarget.setPointerCapture(e.pointerId);
      pointerIdRef.current = e.pointerId;
      coordsRef.current.mode = "cursor";
      coordsRef.current.targetX = point.x;
      coordsRef.current.targetY = point.y;
    },
    [pointFromEvent, prefersReducedMotion]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== null && e.currentTarget.hasPointerCapture(pointerIdRef.current)) {
      e.currentTarget.releasePointerCapture(pointerIdRef.current);
    }
    pointerIdRef.current = null;
  }, []);

  // Ao sair do modelo, a lente volta suavemente para a trilha automática.
  const handlePointerLeave = useCallback(() => {
    if (pointerIdRef.current !== null) return;
    if (coordsRef.current.mode === "fixed") return;
    coordsRef.current.mode = "auto";
  }, []);

  const isBreathingActive = breathingEnabled && effectsActive && !prefersReducedMotion;

  return (
    <div
      ref={containerRef}
      style={
        {
          aspectRatio: aspectRatio,
          "--reveal-r": `${revealRadius}px`,
        } as React.CSSProperties
      }
      className={clsx("hero-xray-canvas", className)}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      <div className="hero-xray-stage">
        {/* Aura fria: integra o recorte ao fundo, sem desenhar caixa. */}
        <div
          className={clsx("hero-xray-aura", isBreathingActive && "hero-xray-breathing")}
          aria-hidden="true"
          data-decorative
        />

        {/* (a) cópia borrada da base: dissolve o corte da cintura. */}
        <div className="hero-xray-blur" aria-hidden="true" data-decorative>
          <Image
            src={baseImage}
            alt=""
            fill
            sizes="(max-width: 1023px) 92vw, 46vw"
            className="hero-xray-img object-contain"
          />
        </div>

        {/* (b) base nítida: única imagem com priority (LCP). */}
        <div className="hero-xray-base">
          <Image
            src={baseImage}
            alt={altBase}
            fill
            priority
            sizes="(max-width: 1023px) 92vw, 46vw"
            className="hero-xray-img object-contain"
          />
        </div>

        {/* (c) raio-X: decorativo, carrega logo após o LCP. */}
        <div className="hero-xray-layer" aria-hidden="true" data-decorative>
          <Image
            src={xrayImage}
            alt=""
            fill
            loading="eager"
            sizes="(max-width: 1023px) 92vw, 46vw"
            className="hero-xray-img object-contain"
          />
        </div>

        {/* (d) anel: mesmas coordenadas da lente. */}
        <div ref={ringRef} className="hero-xray-ring" aria-hidden="true" data-decorative />

        {/* (e) glow âmbar atrás do anel. */}
        <div className="hero-xray-ember" aria-hidden="true" data-decorative />

        {/* Primeiro contato: ponto pulsante no centro da lente automática. */}
        <span
          className={clsx(
            "hero-xray-ping",
            (hasInteracted || prefersReducedMotion) && "is-hidden"
          )}
          aria-hidden="true"
          data-decorative
        />
      </div>
    </div>
  );
}
