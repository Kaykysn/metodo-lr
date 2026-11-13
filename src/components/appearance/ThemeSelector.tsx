"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { MOTION, type ThemeChoice } from "@/lib/appearance";

interface ThemeSelectorProps {
  compact?: boolean;
  /** "surface" para fundos do tema; "inverse" para regiões escuras fixas (header, sidebar) */
  tone?: "surface" | "inverse";
  className?: string;
}

const OPTIONS: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

/** Aplica uma transição breve de cor só após escolha explícita */
function withThemeTransition(apply: () => void) {
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce) root.classList.add("theme-switching");
  apply();
  window.setTimeout(() => root.classList.remove("theme-switching"), MOTION.themeSwitchMs + 40);
}

export default function ThemeSelector({ compact = false, tone = "surface", className = "" }: ThemeSelectorProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = mounted ? theme ?? "system" : null;
  const inverse = tone === "inverse";

  const shell = inverse ? "bg-white/5 border-white/15" : "bg-theme-secondary border-theme-border";

  return (
    <div
      role="radiogroup"
      aria-label="Aparência"
      className={`inline-flex items-center gap-0.5 rounded-xl border p-1 ${shell} ${className}`}
      onKeyDown={(e) => {
        if (!mounted || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
        e.preventDefault();
        const idx = OPTIONS.findIndex((o) => o.value === current);
        const next = OPTIONS[(idx + (e.key === "ArrowRight" ? 1 : OPTIONS.length - 1)) % OPTIONS.length];
        withThemeTransition(() => setTheme(next.value));
        e.currentTarget.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)?.focus();
      }}
    >
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const selected = current === opt.value;
        const idle = inverse
          ? "text-slate-300 hover:text-white hover:bg-white/10"
          : "text-theme-muted hover:text-theme-text hover:bg-theme-primary/60";
        const active = inverse ? "bg-white/15 text-white" : "bg-theme-primary text-theme-text shadow-subtle";
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            data-value={opt.value}
            aria-checked={selected}
            aria-label={compact ? opt.label : undefined}
            tabIndex={selected || (current === null && opt.value === "system") ? 0 : -1}
            title={opt.label}
            disabled={!mounted}
            onClick={() => withThemeTransition(() => setTheme(opt.value))}
            className={`inline-flex min-h-[32px] items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors disabled:cursor-default ${
              selected ? active : idle
            }`}
          >
            <Icon
              className={`h-4 w-4 ${selected ? (inverse ? "text-brand-300" : "text-theme-teal") : ""}`}
              aria-hidden="true"
            />
            {!compact && <span>{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
