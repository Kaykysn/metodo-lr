"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useVisualEffects } from "@/components/providers/AppearanceProvider";

/**
 * Ondas de luz por camada: amplitude (% da tela), frequência por viewport rolada,
 * fase e quanto a velocidade da rolagem estica a camada. Fases diferentes fazem
 * os campos passarem uns pelos outros como ondas, em vez de andarem em bloco.
 */
const ONDAS = [
  { ax: 9, ay: 6, freq: 0.9, fase: 0, giro: 10, estica: 0.12 },
  { ax: 11, ay: 7, freq: 0.7, fase: 2.1, giro: -14, estica: 0.16 },
  { ax: 4, ay: 3, freq: 0.5, fase: 4.2, giro: 4, estica: 0.05 },
] as const;

/** Suavização da rolagem: o fundo chega um pouco depois da página, como água. */
const SEGUE = 0.085;

export default function LayeredBackdrop() {
  const pathname = usePathname() ?? "/";
  const { effectsActive } = useVisualEffects();
  const waves = useRef<HTMLDivElement>(null);
  const isInternal = pathname !== "/" && !pathname.startsWith("/demo");

  useEffect(() => {
    const root = waves.current;
    if (!root || !effectsActive) return;
    const layers = Array.from(root.querySelectorAll<HTMLElement>(".lr-onda"));

    let frame = 0;
    let atual = window.scrollY;
    let velocidade = 0;

    const draw = () => {
      frame = 0;
      const alvo = window.scrollY;
      const passo = (alvo - atual) * SEGUE;
      atual += passo;
      velocidade += (passo - velocidade) * 0.2;

      const vh = Math.max(window.innerHeight, 1);
      const fase = atual / vh;
      // Velocidade normalizada (−1..1): rolagem rápida estica e inclina as ondas.
      const v = Math.max(-1, Math.min(1, velocidade / (vh * 0.04)));

      layers.forEach((layer, i) => {
        const o = ONDAS[i] ?? ONDAS[0];
        const t = fase * o.freq * Math.PI + o.fase;
        const x = Math.sin(t) * o.ax;
        const y = Math.cos(t * 0.8) * o.ay - v * o.ay * 0.6;
        const giro = Math.sin(t * 0.6) * o.giro;
        const sy = 1 + Math.abs(v) * o.estica;
        const skew = v * o.estica * 18;
        layer.style.transform =
          `translate3d(${x.toFixed(2)}%, ${y.toFixed(2)}%, 0) rotate(${giro.toFixed(2)}deg) ` +
          `skewY(${skew.toFixed(2)}deg) scale(${(2 - sy).toFixed(3)}, ${sy.toFixed(3)})`;
      });

      // Continua até a onda assentar (a rolagem já parou e a camada alcançou).
      if (Math.abs(alvo - atual) > 0.5 || Math.abs(velocidade) > 0.05) {
        frame = requestAnimationFrame(draw);
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };

    // Aba oculta: os campos param de se mover até a pessoa voltar.
    const backdrop = root.parentElement;
    const onVisibility = () => backdrop?.classList.toggle("is-oculta", document.hidden);

    draw();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("visibilitychange", onVisibility);
      cancelAnimationFrame(frame);
      layers.forEach((layer) => layer.style.removeProperty("transform"));
      backdrop?.classList.remove("is-oculta");
    };
  }, [effectsActive, pathname]);

  return (
    <div aria-hidden="true" data-decorative
      className={`lr-backdrop${isInternal ? " is-internal" : ""}${effectsActive ? "" : " is-static"}`}>
      {/* Três campos de luz em ondas; cada onda acompanha a rolagem em fase própria. */}
      <div ref={waves} className="lr-waves">
        <div className="lr-onda"><div className="lr-campo lr-campo--a" /></div>
        <div className="lr-onda"><div className="lr-campo lr-campo--b" /></div>
        <div className="lr-onda"><div className="lr-campo lr-campo--c" /></div>
      </div>
      <div className="lr-grain" />
    </div>
  );
}
