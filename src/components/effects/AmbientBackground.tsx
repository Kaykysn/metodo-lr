"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useVisualEffects } from "@/components/providers/AppearanceProvider";

/**
 * Fundo ambiental adaptativo baseado na arte "Campo de luz azul-petróleo e jade":
 * - Modo Claro: Fundo névoa pálida com tons diluídos de petróleo e jade próximos à margem direita
 * - Modo Escuro: Profundidade original da arte com azul-noite na base e gradientes suaves de petróleo e jade
 * - Páginas de leitura (privacidade, termos, glossário): Gradiente confinado ao cabeçalho e margens externas
 * - Respeita a preferência de "Efeitos visuais" do usuário
 * - Totalmente estático, sem oscilações nem animações contínuas
 */
export default function AmbientBackground() {
  const pathname = usePathname() ?? "/";
  const { effectsEnabled } = useVisualEffects();
  const isLanding = pathname === "/";
  const isReading = pathname.startsWith("/privacidade") || pathname.startsWith("/termos") || pathname.startsWith("/app/glossario");

  if (!effectsEnabled) {
    return null;
  }

  return (
    <div aria-hidden="true" data-decorative className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Camada Modo Claro: névoa pálida com petróleo e jade diluídos na margem direita */}
      <div className="absolute inset-0 block dark:hidden">
        {/* Jade e petróleo diluídos na borda direita */}
        <div className="absolute -right-[10%] top-[12%] h-[65vh] w-[45vw] min-w-[340px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(59,158,144,0.06)_0%,rgba(4,99,95,0.04)_45%,transparent_70%)] blur-3xl" />
        <div className="absolute -right-[5%] top-[55%] h-[55vh] w-[35vw] min-w-[280px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(4,99,95,0.05)_0%,rgba(187,160,120,0.03)_50%,transparent_70%)] blur-3xl" />
      </div>

      {/* Camada Modo Escuro: profundidade original da arte amostrada */}
      <div className="absolute inset-0 hidden dark:block">
        {/* Realce jade suave no quadrante superior direito */}
        <div className="absolute -right-[12%] top-[8%] h-[70vh] w-[50vw] min-w-[400px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(59,158,144,0.16)_0%,rgba(4,99,95,0.12)_45%,transparent_70%)] blur-3xl" />
        {/* Fluxo petróleo central */}
        <div className="absolute right-[15%] top-[45%] h-[60vh] w-[45vw] min-w-[360px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(4,99,95,0.18)_0%,rgba(2,18,38,0.2)_55%,transparent_75%)] blur-3xl" />
        {/* Reflexo quente sutil no canto inferior direito */}
        <div className="absolute -right-[5%] bottom-[5%] h-[40vh] w-[30vw] min-w-[240px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(187,160,120,0.06)_0%,transparent_65%)] blur-3xl" />
      </div>

      {/* Páginas de leitura: restringe o gradiente às margens externas */}
      {isReading && (
        <div className="absolute inset-0 bg-[radial-gradient(52rem_34rem_at_90%_-4%,rgb(var(--glow-a)/0.18),transparent_60%)]" />
      )}

      {/* Landing page: curvas estáticas discretas abaixo do hero */}
      {isLanding && (
        <svg
          className="absolute -right-24 top-[115vh] h-[120vh] w-[70vw] min-w-[560px] text-theme-teal"
          viewBox="0 0 800 1200"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          <path d="M760 40C520 180 640 420 420 520S120 760 300 980 700 1080 620 1180" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1.2" />
          <path d="M800 140C600 260 700 460 500 560S220 800 380 1000" stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" strokeDasharray="2 9" strokeLinecap="round" />
        </svg>
      )}
    </div>
  );
}
