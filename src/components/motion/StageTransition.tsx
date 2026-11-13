"use client";

import React, { useEffect, useRef } from "react";
import { MOTION } from "@/lib/appearance";

interface StageTransitionProps {
  stageKey: string | number;
  children: React.ReactNode;
  className?: string;
}

/** Anima um elemento existente quando `stageKey` muda (sem remontar nada). */
export function useStageTransition<T extends HTMLElement>(stageKey: string | number) {
  const ref = useRef<T | null>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const el = ref.current;
    if (!el || typeof el.animate !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const anim = el.animate(
      [
        { opacity: 0.35, transform: "translateY(8px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: MOTION.stageMs, easing: MOTION.ease }
    );
    return () => anim.cancel();
  }, [stageKey]);
  return ref;
}

/**
 * Transição curta entre etapas SEM remontar o conteúdo:
 * campos preenchidos, foco e seleção continuam intactos.
 */
export default function StageTransition({ stageKey, children, className = "" }: StageTransitionProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const el = ref.current;
    if (!el || typeof el.animate !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const anim = el.animate(
      [
        { opacity: 0.35, transform: "translateY(8px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: MOTION.stageMs, easing: MOTION.ease }
    );
    return () => anim.cancel();
  }, [stageKey]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
