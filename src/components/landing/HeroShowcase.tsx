"use client";

import React from "react";
import HeroXRay from "./HeroXRay";

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
export default function HeroShowcase() {
  return (
    <div className="tab-fade">
      <HeroXRay revealRadius={200} breathingEnabled showInteractiveHint />
    </div>
  );
}
