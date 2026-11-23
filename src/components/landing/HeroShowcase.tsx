"use client";

import React from "react";
import clsx from "clsx";
import HeroXRay from "./HeroXRay";

export interface HeroShowcaseProps {
  /** Classes extras repassadas ao wrapper do modelo. */
  className?: string;
}

/**
 * Visual principal do Hero: o modelo em raio-X com a lente que segue o cursor.
 *
 * O componente permanece isolado para que o Hero continue declarativo e para
 * permitir reaproveitar a experiência em outras páginas sem duplicar lógica.
 */
export default function HeroShowcase({ className }: HeroShowcaseProps) {
  // Usa EXPLICITAMENTE o modelo original (camadas de pele e musculatura no mesmo canvas 896x1114).
  // O wrapper .hero-model continua no Hero.tsx, na posição definida pelo CSS base.
  return (
    <HeroXRay
      className={clsx(className)}
      baseImage="/media/hero-body-base.webp"
      xrayImage="/media/hero-body-xray.webp"
      altBase="Modelo masculino em vista frontal com camadas de pele e musculatura alinhadas"
      aspectRatio="896 / 1114"
    />
  );
}
