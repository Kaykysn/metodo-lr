"use client";

import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useVisualEffects } from "@/components/providers/AppearanceProvider";
import { atmosphereIntensityFor, particleCountFor } from "@/lib/appearance";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
  depth: number;
  color: [number, number, number];
};

type Palette = {
  colors: Array<[number, number, number]>;
  dark: boolean;
};

const FALLBACK_COLORS: Array<[number, number, number]> = [
  [118, 215, 190],
  [59, 158, 144],
  [187, 160, 120],
];

function parseToken(value: string): [number, number, number] | null {
  const parts = value.trim().split(/[\s,]+/).map(Number);
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return null;
  return [parts[0], parts[1], parts[2]];
}

function readPalette(): Palette {
  if (typeof window === "undefined") {
    return { colors: FALLBACK_COLORS, dark: false };
  }

  const root = document.documentElement;
  const style = getComputedStyle(root);
  const colors: Array<[number, number, number]> = [];

  for (const token of ["--particle-1", "--particle-2", "--particle-3"]) {
    const parsed = parseToken(style.getPropertyValue(token));
    if (parsed) colors.push(parsed);
  }

  return {
    colors: colors.length ? colors : FALLBACK_COLORS,
    dark: root.classList.contains("dark"),
  };
}

function rgba(color: [number, number, number], alpha: number) {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha.toFixed(3)})`;
}

/**
 * Campo de partículas global (uma única instância, fixa atrás de todo o site).
 *
 * - Canvas 2D com movimento orgânico e conexões muito discretas.
 * - Quantidade definida pela rota e pela largura da tela (nunca centenas).
 * - Nada de re-render do React: o laço vive apenas no canvas.
 * - Pausa com a aba oculta, em movimento reduzido ou com efeitos desligados.
 * - Em telas pequenas usa menos pontos, menos conexões e metade do framerate.
 */
export default function ParticleField() {
  const pathname = usePathname() ?? "/";
  const { effectsActive, prefersReducedMotion } = useVisualEffects();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!effectsActive || prefersReducedMotion) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const intensity = atmosphereIntensityFor(pathname);
    const reducedNetwork = document.documentElement.classList.contains("slow-net");

    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles: Particle[] = [];
    let palette = readPalette();
    let raf = 0;
    let running = false;
    let lastFrame = 0;
    let lastPaint = 0;
    let resizeTimer = 0;

    const prefersCoarse = window.matchMedia("(pointer: coarse)").matches;
    const targetFrameMs = prefersCoarse ? 1000 / 30 : 1000 / 45;

    const resize = () => {
      const previousWidth = width;
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, prefersCoarse ? 1.35 : 1.75);

      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // No celular a barra de endereço muda só a altura ao rolar: manter as
      // partículas evita que o fundo "pule" a cada rolagem.
      if (particles.length && width === previousWidth) {
        lastPaint = 0;
        return;
      }

      const baseCount = particleCountFor(width, intensity);
      const areaFactor = Math.min(1.45, Math.max(0.7, width / 1440));
      const count = Math.max(5, Math.round(baseCount * areaFactor * (reducedNetwork ? 0.55 : 1)));

      particles = Array.from({ length: count }, () => {
        const depth = 0.45 + Math.random() * 0.75;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 8 * depth,
          vy: (Math.random() - 0.5) * 5 * depth,
          radius: (0.7 + Math.random() * 1.7) * depth,
          phase: Math.random() * Math.PI * 2,
          depth,
          color: palette.colors[Math.floor(Math.random() * palette.colors.length)],
        };
      });

      lastPaint = 0;
    };

    const paint = (now: number) => {
      const elapsed = lastFrame ? Math.min(64, now - lastFrame) : 16.7;
      lastFrame = now;
      const dt = elapsed / 1000;

      ctx.clearRect(0, 0, width, height);
      // Additive blending dá o brilho de "poeira luminosa" sem criar halos fortes.
      ctx.globalCompositeOperation = palette.dark ? "lighter" : "source-over";

      const lineDistance = width < 640 ? 0 : Math.min(150, 96 + width * 0.03);
      const baseAlpha = palette.dark ? 0.2 : 0.13;
      const lineAlpha = palette.dark ? 0.1 : 0.055;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.vx * dt + Math.sin(now * 0.00008 + p.phase) * dt * 3.2;
        p.y += p.vy * dt + Math.cos(now * 0.00006 + p.phase * 1.7) * dt * 2.1;

        if (p.x < -24) p.x = width + 24;
        else if (p.x > width + 24) p.x = -24;
        if (p.y < -24) p.y = height + 24;
        else if (p.y > height + 24) p.y = -24;

        const twinkle = 0.65 + Math.sin(now * 0.0009 + p.phase) * 0.35;
        const alpha = baseAlpha * p.depth * twinkle;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 3.4, 0, Math.PI * 2);
        ctx.fillStyle = rgba(p.color, alpha * 0.14);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = rgba(p.color, Math.min(0.72, alpha * 3.1));
        ctx.fill();

        if (!lineDistance) continue;

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const distance = Math.hypot(dx, dy);

          if (distance > lineDistance) continue;

          const strength = 1 - distance / lineDistance;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = rgba(
            palette.colors[(i + j) % palette.colors.length],
            lineAlpha * strength * Math.min(p.depth, q.depth)
          );
          ctx.lineWidth = 0.65;
          ctx.stroke();
        }
      }

      ctx.globalCompositeOperation = "source-over";
      lastPaint = now;
    };

    const loop = (now: number) => {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      if (now - lastPaint < targetFrameMs) return;
      paint(now);
    };

    const start = () => {
      if (running) return;
      if (document.hidden) return;
      running = true;
      lastFrame = 0;
      raf = requestAnimationFrame(loop);
    };

    const stop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const onVisibility = () => (document.hidden ? stop() : start());

    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        resize();
        stop();
        start();
      }, 180);
    };

    const themeObserver = new MutationObserver(() => {
      palette = readPalette();
      particles = particles.map((p) => ({
        ...p,
        color: palette.colors[Math.floor(Math.random() * palette.colors.length)],
      }));
    });

    resize();
    start();

    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onResize, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      stop();
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      themeObserver.disconnect();
      ctx.clearRect(0, 0, width, height);
    };
  }, [effectsActive, pathname, prefersReducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-decorative
      className="pointer-events-none fixed inset-0 z-0 h-full w-full select-none"
    />
  );
}
