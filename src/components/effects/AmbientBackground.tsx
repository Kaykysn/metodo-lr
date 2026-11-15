"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useVisualEffects } from "@/components/providers/AppearanceProvider";

/**
 * Fundo ambiental adaptativo baseado na arte "Campo de luz azul-petróleo e jade":
 * - Modo Claro: névoa pálida com petróleo e jade diluídos na margem direita
 * - Modo Escuro: profundidade original da arte com azul-noite na base
 * - Malha técnica discreta (referência a biomecânica / leitura de movimento)
 * - Orbes de luz com deriva muito lenta, criando profundidade sem distrair
 * - Páginas de leitura: gradiente confinado às margens externas
 * - Respeita "Efeitos visuais" e prefers-reduced-motion
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
      {/* Malha técnica: dá leitura de prancheta/ biomecânica sem competir com o texto */}
      <div className="atmos-grid absolute -inset-24" />

      {/* Camada Modo Claro: névoa pálida com petróleo e jade diluídos na margem direita */}
      <div className="absolute inset-0 block dark:hidden">
        <div className="atmos-orb atmos-orb-a absolute -right-[10%] top-[12%] h-[65vh] w-[45vw] min-w-[340px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(59,158,144,0.07)_0%,rgba(4,99,95,0.045)_45%,transparent_70%)] blur-3xl" />
        <div className="atmos-orb atmos-orb-b absolute -right-[5%] top-[55%] h-[55vh] w-[35vw] min-w-[280px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(4,99,95,0.055)_0%,rgba(187,160,120,0.035)_50%,transparent_70%)] blur-3xl" />
        <div className="atmos-orb atmos-orb-c absolute -left-[12%] top-[68%] h-[48vh] w-[38vw] min-w-[300px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(59,158,144,0.05)_0%,transparent_68%)] blur-3xl" />
      </div>

      {/* Camada Modo Escuro: profundidade original da arte amostrada */}
      <div className="absolute inset-0 hidden dark:block">
        <div className="atmos-orb atmos-orb-a absolute -right-[12%] top-[8%] h-[70vh] w-[50vw] min-w-[400px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(59,158,144,0.16)_0%,rgba(4,99,95,0.12)_45%,transparent_70%)] blur-3xl" />
        <div className="atmos-orb atmos-orb-b absolute right-[15%] top-[45%] h-[60vh] w-[45vw] min-w-[360px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(4,99,95,0.18)_0%,rgba(2,18,38,0.2)_55%,transparent_75%)] blur-3xl" />
        <div className="atmos-orb atmos-orb-c absolute -right-[5%] bottom-[5%] h-[40vh] w-[30vw] min-w-[240px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(187,160,120,0.08)_0%,transparent_65%)] blur-3xl" />
        <div className="atmos-orb atmos-orb-d absolute -left-[10%] bottom-[18%] h-[46vh] w-[36vw] min-w-[280px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(118,215,190,0.07)_0%,transparent_68%)] blur-3xl" />
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
