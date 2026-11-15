"use client";

import React from "react";
import clsx from "clsx";
import HeroXRay from "./HeroXRay";

export interface HeroShowcaseProps {
  /** Permite que o Hero faça a arte preencher a camada visual inteira. */
  className?: string;
}

/**
 * Visual principal do Hero: a anatomia em raio-X, grande e integrada ao fundo.
 *
 * A experiência é a mesma em todos os tamanhos de tela:
 * - desktop: lanterna radial controlada pelo cursor;
 * - celular: varredura automática sincronizada com a rolagem.
 *
 * O componente continua isolado para que o Hero permaneça declarativo e para
 * permitir reaproveitar a experiência em outras páginas sem duplicar lógica.
 */
export default function HeroShowcase({ className }: HeroShowcaseProps) {
  return (
    <div className={clsx("h-full", className)}>
      <HeroXRay className="h-full" revealRadius={200} breathingEnabled showInteractiveHint />
    </div>
  );
}
