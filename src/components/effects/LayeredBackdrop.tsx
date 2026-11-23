"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useVisualEffects } from "@/components/providers/AppearanceProvider";

export default function LayeredBackdrop() {
  const pathname = usePathname() ?? "/";
  const { effectsActive } = useVisualEffects();
  const waves = useRef<HTMLDivElement>(null);
  const isInternal = pathname !== "/" && !pathname.startsWith("/demo");

  useEffect(() => {
    const layer = waves.current;
    if (!layer || !effectsActive) return;

    let frame = 0;
    const draw = () => {
      frame = 0;
      const phase = window.scrollY / Math.max(window.innerHeight, 1);
      const x = Math.sin(phase * 0.85) * 11;
      const y = (Math.cos(phase * 1.1) - 1) * 5;
      const angle = Math.sin(phase * 0.64) * 16;
      layer.style.transform = `translate3d(${x}%, ${y}%, 0) rotate(${angle}deg)`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };

    draw();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
      layer.style.removeProperty("transform");
    };
  }, [effectsActive, pathname]);

  return (
    <div aria-hidden="true" data-decorative
      className={`lr-backdrop${isInternal ? " is-internal" : ""}${effectsActive ? "" : " is-static"}`}>
      <div ref={waves} className="lr-waves">
        <div className="lr-wave lr-wave--smoke" />
        <div className="lr-wave lr-ribbed-sheen" />
      </div>
      <div className="lr-grain" />
    </div>
  );
}
