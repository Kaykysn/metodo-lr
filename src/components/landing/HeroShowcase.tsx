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
  return <HeroXRay className={clsx(className)} />;
}
