import React from "react";

/**
 * Monograma oficial da referência dourada (assets/mark.svg) com a assinatura
 * "MÉTODO LR / LEANDRO RANGEL". A geometria do símbolo é a original; apenas a
 * cor é herdada do sistema visual (dourado sobre fundo escuro).
 */
export default function MethodBrand({
  size = 51,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span className={`lr-brand ${className}`}>
      <svg
        viewBox="0 0 62 40"
        width={size}
        height={(size * 40) / 62}
        aria-hidden="true"
        focusable="false"
      >
        <path
          fill="currentColor"
          d="M8 3h10l-6 24h15l-2 9H0zm17 0h26c7 0 11 4 9 11-1 6-5 10-12 11l10 11H44L29 19l2-3h14c3 0 5-1 5-3 1-2-1-3-4-3H23z"
        />
      </svg>
      <span className="lr-brand-name">
        MÉTODO LR
        <small>LEANDRO RANGEL</small>
      </span>
    </span>
  );
}
