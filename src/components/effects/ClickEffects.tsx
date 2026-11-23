"use client";

import React, { useEffect, useRef } from "react";
import { useVisualEffects } from "@/components/providers/AppearanceProvider";

const INTERACTIVE = 'a[href], button:not([disabled]), [role="button"], input, select, textarea, [data-click-pulse]';

/** Pulso dourado curto no ponto do clique. Uma única instância vive no layout. */
export default function ClickEffects() {
  const { effectsActive } = useVisualEffects();
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!effectsActive) return;
    const node = layer.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timers = new Set<number>();
    const onClick = (event: MouseEvent) => {
      if (event.detail === 0 || event.button !== 0) return;
      const target = event.target as Element | null;
      if (!target || !target.closest(INTERACTIVE)) return;

      const pulse = document.createElement("span");
      pulse.className = "lr-click-pulse";
      pulse.style.left = `${event.clientX}px`;
      pulse.style.top = `${event.clientY}px`;
      node.appendChild(pulse);
      const timer = window.setTimeout(() => {
        pulse.remove();
        timers.delete(timer);
      }, 440);
      timers.add(timer);
    };

    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
      node.replaceChildren();
    };
  }, [effectsActive]);

  return <div ref={layer} aria-hidden="true" data-decorative className="lr-click-layer" />;
}
