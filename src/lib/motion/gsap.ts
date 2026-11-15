"use client";

import type { gsap as GsapType } from "gsap";
import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";

type MotionBundle = {
  gsap: typeof GsapType;
  ScrollTrigger: typeof ScrollTriggerType;
};

let bundle: Promise<MotionBundle> | null = null;

/**
 * Carrega GSAP + ScrollTrigger só no navegador, uma única vez por sessão.
 *
 * O import dinâmico evita que o ScrollTrigger toque em `window` durante o
 * render no servidor e mantém o custo fora do primeiro carregamento.
 */
export function loadGsap(): Promise<MotionBundle> {
  if (!bundle) {
    bundle = Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([gsapModule, triggerModule]) => {
      const gsap = gsapModule.gsap;
      const ScrollTrigger = triggerModule.ScrollTrigger;

      gsap.registerPlugin(ScrollTrigger);
      // Evita saltos quando a barra do navegador móvel aparece/desaparece.
      ScrollTrigger.config({ ignoreMobileResize: true });

      return { gsap, ScrollTrigger };
    });
  }

  return bundle;
}
