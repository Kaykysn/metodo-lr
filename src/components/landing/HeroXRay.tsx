"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useVisualEffects } from "@/components/providers/AppearanceProvider";

/** Imagens placeholder padrão para visualização imediata da mecânica */
export const DEFAULT_BASE_IMAGE = "/media/hero-xray-base-placeholder.svg";
export const DEFAULT_XRAY_IMAGE = "/media/hero-xray-anatomy-placeholder.svg";

export interface HeroXRayProps {
  /**
   * Imagem original do corpo humano (superfície / pele / postura).
   * Padrão: placeholder SVG com silhueta e pontos posturais.
   */
  baseImage?: string;
  /**
   * Imagem anatômica (esqueleto, fáscias e músculos profundos).
   * Padrão: placeholder SVG anatômico com brilho fluoroscópico ciano.
   */
  xrayImage?: string;
  /**
   * Raio da lanterna reveladora em pixels.
   * Padrão: 160 px.
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
   * Padrão: "4/5" (800 x 1000 px).
   */
  aspectRatio?: string;
  /** Exibe legenda interativa de auxílio para o usuário */
  showInteractiveHint?: boolean;
}

/**
 * Componente HeroXRay — Mecânica interativa de Raio-X do Método LR.
 *
 * Características de Alta Performance:
 * - Duas camadas de imagem perfeitamente sobrepostas sem desalinhamento.
 * - Máscara radial CSS pura (sem imagens externas de círculo) com bordas suavizadas.
 * - Lanterna com brilho ciano discreto (mix-blend screen) e anel de foco óptico.
 * - Coordenadas relativas atualizadas diretamente via CSS Variables no elemento DOM,
 *   garantindo 0 re-renderizações do React durante o movimento.
 * - requestAnimationFrame com interpolação LERP (linear interpolation) para movimento
 *   orgânico e suspensão automática de ciclo quando em repouso (0% CPU idle).
 * - Suporte unificado a Pointer Events: mouse em desktop, toque e arraste em mobile.
 * - touch-action: none restrito ao canvas de exame anatômico (não interfere na rolagem da página fora dele).
 * - Microanimação respiratória sutil (ciclo 4,5 s, escala máx 0,4%) aplicada exclusivamente
 *   ao contêiner compartilhado, mantendo sincronia anatômica estrita entre as camadas.
 * - Respeito automático a prefers-reduced-motion e modo de baixo consumo (lite).
 */
export default function HeroXRay({
  baseImage = DEFAULT_BASE_IMAGE,
  xrayImage = DEFAULT_XRAY_IMAGE,
  revealRadius = 160,
  breathingEnabled = true,
  className = "",
  altBase = "Postura e superfície corporal do aluno - Método LR",
  altXRay = "Estrutura anatômica profunda e esqueleto revelados por raio-x - Método LR",
  aspectRatio = "4/5",
  showInteractiveHint = true,
}: HeroXRayProps) {
  // Contexto de performance e acessibilidade do site
  const { prefersReducedMotion, effectsActive } = useVisualEffects();

  // Referência do contêiner compartilhado que recebe as variáveis CSS e escala respiratória
  const containerRef = useRef<HTMLDivElement>(null);

  // Armazenamento mutável de coordenadas para evitar qualquer ciclo de renderização no React a cada quadro
  const coordsRef = useRef({
    currentX: 0,
    currentY: 0,
    targetX: 0,
    targetY: 0,
    active: false,
  });

  const rafId = useRef<number | null>(null);
  const isPointerDownRef = useRef(false);

  // Estado cosmético para feedback da dica inicial (apenas quando o usuário interage pela 1ª vez)
  const [hasInteracted, setHasInteracted] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);

  // Pré-carregamento e decodificação assíncrona prévia na GPU de ambas as imagens
  useEffect(() => {
    let active = true;
    const preload = async () => {
      try {
        const p1 = new Promise<void>((resolve) => {
          const img = new Image();
          img.src = baseImage;
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
        const p2 = new Promise<void>((resolve) => {
          const img = new Image();
          img.src = xrayImage;
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
        await Promise.all([p1, p2]);
        if (active) setImagesReady(true);
      } catch {
        if (active) setImagesReady(true);
      }
    };
    preload();
    return () => {
      active = false;
    };
  }, [baseImage, xrayImage]);

  // Atualiza as propriedades CSS diretamente no nó DOM do contêiner
  const updateDomVars = useCallback((x: number, y: number, opacity?: number) => {
    const el = containerRef.current;
    if (!el) return;
    el.style.setProperty("--xray-x", `${x.toFixed(1)}px`);
    el.style.setProperty("--xray-y", `${y.toFixed(1)}px`);
    if (typeof opacity === "number") {
      el.style.setProperty("--xray-opacity", opacity ? "1" : "0");
    }
  }, []);

  // Loop suave com requestAnimationFrame (LERP + auto-repouso)
  const startRaf = useCallback(() => {
    if (rafId.current !== null) return;

    const tick = () => {
      const coords = coordsRef.current;
      const el = containerRef.current;

      if (!el) {
        rafId.current = null;
        return;
      }

      const dx = coords.targetX - coords.currentX;
      const dy = coords.targetY - coords.currentY;

      // Se movimento reduzido estiver ativo, não faz interpolação
      if (prefersReducedMotion) {
        coords.currentX = coords.targetX;
        coords.currentY = coords.targetY;
        updateDomVars(coords.currentX, coords.currentY);
        rafId.current = null;
        return;
      }

      // Fator de suavização orgânica (LERP)
      const factor = 0.22;
      coords.currentX += dx * factor;
      coords.currentY += dy * factor;

      updateDomVars(coords.currentX, coords.currentY);

      // Critério de repouso: se o ponteiro parou ou saiu e a distância é sub-pixel (<0.08px)
      const isSettled = Math.abs(dx) < 0.08 && Math.abs(dy) < 0.08;
      if (!coords.active && isSettled) {
        rafId.current = null;
        return;
      }

      if (coords.active && isSettled) {
        // Pausa temporária enquanto o cursor fica estático, economizando 100% da CPU
        rafId.current = null;
        return;
      }

      rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);
  }, [prefersReducedMotion, updateDomVars]);

  // Interrupção do rAF ao desmontar
  useEffect(() => {
    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  // Cálculo das coordenadas relativas ao retângulo visual do contêiner
  const computeRelativeCoords = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    // Clamping para manter a lanterna dentro dos limites visuais do contêiner
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
    return { x, y };
  }, []);

  // --- Handlers de Pointer Events (Desktop Mouse + Mobile Touch Unificados) ---

  const handlePointerEnter = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "touch") return; // Touch inicia no pointerdown
      const { x, y } = computeRelativeCoords(e.clientX, e.clientY);
      const coords = coordsRef.current;
      coords.currentX = x;
      coords.currentY = y;
      coords.targetX = x;
      coords.targetY = y;
      coords.active = true;

      updateDomVars(x, y, 1);
      startRaf();
      if (!hasInteracted) setHasInteracted(true);
    },
    [computeRelativeCoords, hasInteracted, startRaf, updateDomVars]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const { x, y } = computeRelativeCoords(e.clientX, e.clientY);
      const coords = coordsRef.current;
      coords.targetX = x;
      coords.targetY = y;

      // Se o rAF estiver pausado por inatividade e o cursor se moveu, reinicia o loop
      if (coords.active) {
        startRaf();
      }

      if (!hasInteracted) setHasInteracted(true);
    },
    [computeRelativeCoords, hasInteracted, startRaf]
  );

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Se estiver capturando toque (drag no celular), não esconde ao cruzar a borda
      if (isPointerDownRef.current && e.pointerType === "touch") return;

      const coords = coordsRef.current;
      coords.active = false;
      const el = containerRef.current;
      if (el) {
        el.style.setProperty("--xray-opacity", "0");
      }
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      isPointerDownRef.current = true;
      const { x, y } = computeRelativeCoords(e.clientX, e.clientY);
      const coords = coordsRef.current;
      coords.currentX = x;
      coords.currentY = y;
      coords.targetX = x;
      coords.targetY = y;
      coords.active = true;

      // Em dispositivos móveis, captura o ponteiro para arrastar sem desengajar
      if (e.pointerType === "touch") {
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          // Fallback silencioso caso não suportado
        }
      }

      updateDomVars(x, y, 1);
      startRaf();
      if (!hasInteracted) setHasInteracted(true);
    },
    [computeRelativeCoords, hasInteracted, startRaf, updateDomVars]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      isPointerDownRef.current = false;
      if (e.pointerType === "touch") {
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          // Fallback silencioso
        }
        // No celular, ao levantar o dedo, a lanterna desaparece suavemente
        const coords = coordsRef.current;
        coords.active = false;
        const el = containerRef.current;
        if (el) {
          el.style.setProperty("--xray-opacity", "0");
        }
      }
    },
    []
  );

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      isPointerDownRef.current = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Fallback silencioso
      }
      const coords = coordsRef.current;
      coords.active = false;
      const el = containerRef.current;
      if (el) {
        el.style.setProperty("--xray-opacity", "0");
      }
    },
    []
  );

  // Acessibilidade por Teclado: Setas posicionam a lanterna em pontos clínicos
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const step = 30;
      const coords = coordsRef.current;

      let nextX = coords.targetX || rect.width / 2;
      let nextY = coords.targetY || rect.height / 2;

      if (e.key === "ArrowUp") nextY = Math.max(0, nextY - step);
      else if (e.key === "ArrowDown") nextY = Math.min(rect.height, nextY + step);
      else if (e.key === "ArrowLeft") nextX = Math.max(0, nextX - step);
      else if (e.key === "ArrowRight") nextX = Math.min(rect.width, nextX + step);
      else if (e.key === "Escape") {
        coords.active = false;
        el.style.setProperty("--xray-opacity", "0");
        return;
      } else {
        return;
      }

      e.preventDefault();
      coords.targetX = nextX;
      coords.targetY = nextY;
      coords.currentX = nextX;
      coords.currentY = nextY;
      coords.active = true;

      updateDomVars(nextX, nextY, 1);
      if (!hasInteracted) setHasInteracted(true);
    },
    [hasInteracted, updateDomVars]
  );

  // A respiração ocorre apenas se habilitada, sem preferência por redução de movimento e com efeitos ativos
  const isBreathingActive = breathingEnabled && !prefersReducedMotion && effectsActive;

  return (
    <div className={clsx("relative w-full max-w-[560px] mx-auto select-none", className)}>
      {/* Moldura de Vidro Fosco (Preview Rim) sintonizada com os tokens do Hero */}
      <div className="preview-rim rounded-[24px] p-2 sm:p-2.5 bg-white/5 border border-white/15 shadow-2xl backdrop-blur-md transition-all">
        {/*
          CONTÊINER COMPARTILHADO DAS DUAS CAMADAS
          - A microanimação respiratória de 4,5 s roda EXCLUSIVAMENTE neste elemento contêiner.
          - As duas camadas (base e raio-x) são filhas absolutas diretas, garantindo que
            ambas escalem juntas sem desfasamento ou desalinhamento anatômico.
          - touch-action: none garante arraste suave no celular sem arrastar a tela.
        */}
        <div
          ref={containerRef}
          role="region"
          aria-label="Painel de Raio-X Anatômico Interativo do Método LR"
          tabIndex={0}
          onKeyDown={handleKeyDown}
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
              aspectRatio: aspectRatio,
            } as React.CSSProperties
          }
          className={clsx(
            "relative overflow-hidden rounded-[18px] bg-[#011228] cursor-crosshair focus:outline-none focus-visible:ring-2 focus-visible:ring-[#76D7BE] touch-none",
            isBreathingActive && "hero-xray-breathing"
          )}
        >
          {/* Skeleton de carregamento preliminar enquanto os vetores/imagens decodificam */}
          {!imagesReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#011228] z-30">
              <div className="flex flex-col items-center gap-2">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-t-[#76D7BE] border-white/10" />
                <span className="text-xs font-medium text-slate-400">Carregando camadas anatômicas...</span>
              </div>
            </div>
          )}

          {/* CAMADA 1: Imagem original do corpo humano (Superfície / Postura) */}
          <div className="absolute inset-0 select-none pointer-events-none z-10">
            <img
              src={baseImage}
              alt={altBase}
              width={800}
              height={1000}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className="h-full w-full object-cover object-center select-none pointer-events-none"
            />
          </div>

          {/*
            CAMADA 2: Imagem anatômica profunda perfeitamente sobreposta
            - Inicialmente oculta através da máscara CSS radial (--xray-opacity: 0).
            - Revelada dinamicamente pelas coordenadas (--xray-x, --xray-y) e raio (--xray-r).
          */}
          <div
            className="hero-xray-layer absolute inset-0 select-none pointer-events-none z-20"
            aria-hidden="true"
          >
            <img
              src={xrayImage}
              alt={altXRay}
              width={800}
              height={1000}
              loading="eager"
              decoding="async"
              className="h-full w-full object-cover object-center select-none pointer-events-none"
            />
          </div>

          {/* LANTERNA CIANO DISCRETA COM BRILHO SUAVIZADO E ANEL DE FOCO ÓPTICO */}
          <div
            className="hero-xray-glow absolute inset-0 select-none pointer-events-none z-20"
            aria-hidden="true"
          />

          {/* Dica de interação interativa discreta sobre o rodapé da imagem */}
          {showInteractiveHint && (
            <div
              className={clsx(
                "absolute bottom-3 inset-x-0 flex justify-center z-20 pointer-events-none transition-opacity duration-500",
                hasInteracted ? "opacity-0" : "opacity-95"
              )}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#021226]/80 px-3.5 py-1.5 text-[11px] font-semibold text-[#a9bfc4] shadow-lg backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#76D7BE] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#76D7BE]" />
                </span>
                Explore a anatomia. Mova o cursor para revelar.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
