"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MOTION } from "@/lib/appearance";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface RevealProps {
  children: React.ReactNode;
  variant?: "slideUp" | "fadeIn" | "scaleUp";
  delayMs?: number;
  durationMs?: number;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}

// Deslocamento curto (6 px; 4 px em telas estreitas): só esclarece a ordem de leitura
const HIDDEN: Record<NonNullable<RevealProps["variant"]>, React.CSSProperties> = {
  slideUp: { opacity: 0, transform: "translateY(var(--reveal-travel, 6px))" },
  scaleUp: { opacity: 0, transform: "scale(0.985)" },
  fadeIn: { opacity: 0 },
};

/**
 * Entrada única ao rolar.
 * O conteúdo é renderizado VISÍVEL no servidor (funciona sem JS); só elementos ainda
 * abaixo da dobra são escondidos no cliente e revelados uma vez. Troca de tema
 * ou outros re-renders não repetem a animação.
 */
export default function Reveal({
  children,
  variant = "slideUp",
  delayMs = 0,
  durationMs = 420,
  className = "",
  as: Component = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [phase, setPhase] = useState<"static" | "hidden" | "shown">("static");

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (document.documentElement.classList.contains("lite")) return; // modo leve: sem entradas
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return; // já visível

    setPhase("hidden");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPhase("shown");
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const style: React.CSSProperties | undefined =
    phase === "hidden"
      ? HIDDEN[variant]
      : phase === "shown"
        ? {
            opacity: 1,
            transform: "none",
            transition: `opacity ${durationMs}ms ${MOTION.ease} ${delayMs}ms, transform ${durationMs}ms ${MOTION.ease} ${delayMs}ms`,
          }
        : undefined;

  const Tag = Component as React.ElementType;
  return (
    <Tag ref={ref} style={style} className={`[--reveal-travel:4px] sm:[--reveal-travel:6px] ${className}`}>
      {children}
    </Tag>
  );
}
