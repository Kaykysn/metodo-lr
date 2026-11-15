"use client";

import React, { useEffect, useState } from "react";
import ProductPreview from "./ProductPreview";
import HeroXRay from "./HeroXRay";
import type { DemoCase } from "@/lib/landing/demo-case";
import { Sparkles, LayoutTemplate } from "lucide-react";

export interface HeroShowcaseProps {
  demo: DemoCase;
  /**
   * Modo inicial de exibição:
   * - "app": Demonstração das abas do produto (Avaliação, Treino, Evolução).
   * - "xray": Novo Hero com Raio-X Anatômico interativo.
   * Padrão: "app" para preservar integralmente a experiência atual do Hero.
   */
  initialMode?: "app" | "xray";
}

/**
 * HeroShowcase: Contêiner integrador do Hero principal.
 *
 * Preserva integralmente o Hero atual (ProductPreview) enquanto permite
 * testar e alternar para a mecânica do Novo Hero (HeroXRay) em tempo real,
 * preparando a transição suave quando as artes definitivas forem entregues.
 */
export default function HeroShowcase({ demo, initialMode = "app" }: HeroShowcaseProps) {
  const [mode, setMode] = useState<"app" | "xray">(initialMode);

  // Permite ativar a prévia do Raio-X diretamente via URL (?hero=xray ou #raio-x)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("hero") === "xray" || window.location.hash === "#raio-x") {
        setMode("xray");
      }
    }
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {/* Seletor de Modo do Hero: Permite validação e teste imediato sem desestruturar o site */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div
          role="tablist"
          aria-label="Alternar visualização do Hero"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 p-1 backdrop-blur-md"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "app"}
            onClick={() => setMode("app")}
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#76D7BE] ${
              mode === "app"
                ? "bg-[#76D7BE] text-[#021226] shadow-sm"
                : "text-[rgb(var(--hero-muted))] hover:text-white"
            }`}
          >
            <LayoutTemplate className="h-3.5 w-3.5" />
            <span>Demonstração do App (Atual)</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === "xray"}
            onClick={() => setMode("xray")}
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#76D7BE] ${
              mode === "xray"
                ? "bg-[#76D7BE] text-[#021226] shadow-sm"
                : "text-[rgb(var(--hero-muted))] hover:text-white"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Novo Hero: Raio-X Anatômico (Prévia)</span>
          </button>
        </div>

        {mode === "xray" && (
          <span className="text-xs text-[#76D7BE] font-medium tracking-wide">
            Efeito interativo ativo · Placeholders temporários
          </span>
        )}
      </div>

      {/* Conteúdo Renderizado com Transição Suave */}
      {mode === "app" ? (
        <ProductPreview demo={demo} />
      ) : (
        <div className="tab-fade">
          <HeroXRay
            revealRadius={160}
            breathingEnabled={true}
            showInteractiveHint={true}
          />
        </div>
      )}
    </div>
  );
}
