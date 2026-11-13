import React from "react";
import { LOGO_FRAME, LOGO_GLYPH, LOGO_NAME, LOGO_TAG_ITEMS, LOGO_TAG_WIDTH } from "@/lib/brand/logo-paths";

type Variant = "symbol" | "horizontal" | "full";

interface LogoProps {
  variant?: Variant;
  /** Altura em px do símbolo (horizontal/symbol) ou da composição (full). */
  size?: number;
  /** Cor da moldura; padrão = currentColor. Use "accent" para o verde do tema. */
  frame?: "current" | "accent";
  /** Mostrar assinatura de serviços na versão horizontal (ocultar em telas pequenas). */
  withTagline?: boolean;
  className?: string;
  title?: string;
}

function Tag({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {LOGO_TAG_ITEMS.map((it, i) =>
        "d" in it && it.d ? (
          <path key={i} d={it.d} transform={`translate(${it.x} 0)`} />
        ) : "rect" in it && it.rect ? (
          <rect key={i} x={it.rect.x} y={it.rect.y} width={it.rect.w} height={it.rect.h} />
        ) : null
      )}
    </g>
  );
}

/** Logo vetorial (paths gerados por scripts/build-logo.mjs). Herda a cor do texto. */
export default function Logo({ variant = "horizontal", size = 36, frame = "current", withTagline = false, className = "", title = "Leandro Rangel" }: LogoProps) {
  const frameFill = frame === "accent" ? "rgb(var(--accent-teal))" : "currentColor";

  if (variant === "symbol") {
    return (
      <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={title} className={className} fill="currentColor">
        <path d={LOGO_FRAME} fill={frameFill} fillRule="evenodd" />
        <path d={LOGO_GLYPH} fillRule="evenodd" />
      </svg>
    );
  }

  if (variant === "full") {
    const w = LOGO_NAME.width;
    const symS = 0.9;
    const symW = 120 * symS;
    const nameY = symW + 26 + LOGO_NAME.capHeight;
    const tagY = nameY + 26;
    const h = tagY + 4;
    return (
      <svg viewBox={`0 0 ${w} ${h}`} height={size} role="img" aria-label={`${title} — Musculação, Pilates e Reabilitação`} className={className} fill="currentColor">
        <g transform={`translate(${(w - symW) / 2} 0) scale(${symS})`}>
          <path d={LOGO_FRAME} fill={frameFill} fillRule="evenodd" />
          <path d={LOGO_GLYPH} fillRule="evenodd" />
        </g>
        <path d={LOGO_NAME.d} transform={`translate(0 ${nameY})`} />
        <Tag x={0} y={tagY} s={w / LOGO_TAG_WIDTH} />
      </svg>
    );
  }

  // horizontal
  const nameScale = 0.62;
  const capH = LOGO_NAME.capHeight * nameScale;
  const nameY = withTagline ? 26 : 30 + capH / 2;
  const w = 60 + 18 + LOGO_NAME.width * nameScale;
  return (
    <svg viewBox={`0 0 ${w} 60`} height={size} role="img" aria-label={title} className={className} fill="currentColor">
      <g transform="scale(0.5)">
        <path d={LOGO_FRAME} fill={frameFill} fillRule="evenodd" />
        <path d={LOGO_GLYPH} fillRule="evenodd" />
      </g>
      <path d={LOGO_NAME.d} transform={`translate(78 ${nameY}) scale(${nameScale})`} />
      {withTagline && <Tag x={78} y={nameY + 16} s={(LOGO_NAME.width * nameScale) / LOGO_TAG_WIDTH} />}
    </svg>
  );
}
