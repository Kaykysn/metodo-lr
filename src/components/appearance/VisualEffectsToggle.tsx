"use client";

import React, { useEffect, useState } from "react";
import { useVisualEffects } from "@/components/providers/AppearanceProvider";

interface VisualEffectsToggleProps {
  compact?: boolean;
  tone?: "surface" | "inverse";
  className?: string;
}

/**
 * Interruptor "Efeitos visuais": vídeo do hero, vidro, entradas e curvas decorativas.
 * Desligado = modo leve. Em aparelhos fracos começa desligado até o usuário escolher.
 */
export default function VisualEffectsToggle({ compact = false, tone = "surface", className = "" }: VisualEffectsToggleProps) {
  const { effectsEnabled, prefersReducedMotion, toggleEffects } = useVisualEffects();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const on = mounted ? effectsEnabled : true;
  const inverse = tone === "inverse";
  const hint = prefersReducedMotion
    ? "Movimento reduzido está ativo no sistema; o vídeo e as entradas ficam desligados."
    : on
      ? "Desativar vídeo, vidro e animações (modo leve)"
      : "Ativar vídeo, vidro e animações";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={!mounted}
      onClick={toggleEffects}
      title={hint}
      className={`inline-flex min-h-[40px] items-center gap-2 rounded-xl border px-2.5 text-xs font-semibold transition-colors disabled:cursor-default ${
        inverse
          ? "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
          : "border-theme-border bg-theme-secondary text-theme-text hover:bg-theme-primary"
      } ${className}`}
    >
      <span className={compact ? "sr-only" : ""}>Efeitos visuais</span>
      <span
        aria-hidden="true"
        className={`relative inline-flex h-4 w-7 flex-shrink-0 items-center rounded-full transition-colors ${
          on ? (inverse ? "bg-brand-500" : "bg-theme-teal") : inverse ? "bg-white/25" : "bg-theme-boundary/60"
        }`}
      >
        <span
          className={`absolute h-3 w-3 rounded-full bg-white shadow transition-transform ${on ? "translate-x-3.5" : "translate-x-0.5"}`}
        />
      </span>
    </button>
  );
}
