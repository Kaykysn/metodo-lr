"use client";

import React, { useState, useId } from "react";
import { Check } from "lucide-react";

export interface BodyRegion {
  id: string;
  name: string;
  view: "anterior" | "posterior" | "both";
  category: "axial" | "superior" | "inferior";
}

export const BODY_REGIONS: BodyRegion[] = [
  { id: "cervical", name: "Coluna Cervical", view: "both", category: "axial" },
  { id: "thoracic", name: "Coluna Torácica", view: "both", category: "axial" },
  { id: "lumbar", name: "Coluna Lombar", view: "both", category: "axial" },
  { id: "sacroiliac", name: "Articulações Sacroilíacas", view: "posterior", category: "axial" },
  { id: "right_shoulder", name: "Ombro Direito", view: "both", category: "superior" },
  { id: "left_shoulder", name: "Ombro Esquerdo", view: "both", category: "superior" },
  { id: "right_elbow", name: "Cotovelo Direito", view: "both", category: "superior" },
  { id: "left_elbow", name: "Cotovelo Esquerdo", view: "both", category: "superior" },
  { id: "right_wrist", name: "Punho / Mão Direita", view: "both", category: "superior" },
  { id: "left_wrist", name: "Punho / Mão Esquerda", view: "both", category: "superior" },
  { id: "right_glute", name: "Glúteo Direito", view: "posterior", category: "inferior" },
  { id: "left_glute", name: "Glúteo Esquerdo", view: "posterior", category: "inferior" },
  { id: "right_anterior_thigh", name: "Coxa Anterior Direita", view: "anterior", category: "inferior" },
  { id: "left_anterior_thigh", name: "Coxa Anterior Esquerda", view: "anterior", category: "inferior" },
  { id: "right_posterior_thigh", name: "Coxa Posterior Direita", view: "posterior", category: "inferior" },
  { id: "left_posterior_thigh", name: "Coxa Posterior Esquerda", view: "posterior", category: "inferior" },
  { id: "right_knee", name: "Joelho Direito", view: "both", category: "inferior" },
  { id: "left_knee", name: "Joelho Esquerdo", view: "both", category: "inferior" },
  { id: "right_ankle", name: "Tornozelo / Pé Direito", view: "both", category: "inferior" },
  { id: "left_ankle", name: "Tornozelo / Pé Esquerdo", view: "both", category: "inferior" },
];

interface BodyMapProps {
  selectedRegions: string[];
  onChange?: (regions: string[]) => void;
  isReadOnly?: boolean;
}

type MapSpot = { id: string; x: number; y: number; r: number };

// Pontos clicáveis por vista (coordenadas do viewBox 200×360)
const MAP_SPOTS: Record<"posterior" | "anterior", MapSpot[]> = {
  posterior: [
    { id: "cervical", x: 100, y: 54, r: 7 },
    { id: "thoracic", x: 100, y: 95, r: 7 },
    { id: "lumbar", x: 100, y: 135, r: 8 },
    { id: "right_glute", x: 112, y: 165, r: 7 },
    { id: "left_glute", x: 88, y: 165, r: 7 },
    { id: "right_posterior_thigh", x: 114, y: 210, r: 6 },
    { id: "left_posterior_thigh", x: 86, y: 210, r: 6 },
  ],
  anterior: [
    { id: "right_shoulder", x: 130, y: 72, r: 7 },
    { id: "left_shoulder", x: 70, y: 72, r: 7 },
    { id: "right_anterior_thigh", x: 114, y: 210, r: 6 },
    { id: "left_anterior_thigh", x: 86, y: 210, r: 6 },
    { id: "right_knee", x: 116, y: 254, r: 6 },
    { id: "left_knee", x: 84, y: 254, r: 6 },
  ],
};

export default function BodyMap({ selectedRegions = [], onChange, isReadOnly = false }: BodyMapProps) {
  const [activeView, setActiveView] = useState<"posterior" | "anterior">("posterior");
  const gradientId = `body-gradient-${useId().replace(/:/g, "")}`;

  const toggleRegion = (regionId: string) => {
    if (isReadOnly || !onChange) return;
    if (selectedRegions.includes(regionId)) {
      onChange(selectedRegions.filter((id) => id !== regionId));
    } else {
      onChange([...selectedRegions, regionId]);
    }
  };

  const isSelected = (id: string) => selectedRegions.includes(id);

  return (
    <div className="bg-theme-primary border border-theme-border rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-theme-border">
        <div>
          <h3 className="text-base font-semibold text-theme-text">Mapa Anatômico de Localização dos Sintomas</h3>
          <p className="text-xs text-theme-muted mt-0.5">
            Clique nas regiões anatômicas para registrar as queixas relatadas pelo aluno.
          </p>
        </div>
        <div className="flex items-center gap-1 bg-theme-secondary p-1 rounded-xl self-start sm:self-auto" role="tablist" aria-label="Visualização anatômica">
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "posterior"}
            onClick={() => setActiveView("posterior")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeView === "posterior"
                ? "bg-inverse text-inverse-fg shadow-sm"
                : "text-theme-muted hover:text-theme-text"
            }`}
          >
            Vista Posterior (Costas)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "anterior"}
            onClick={() => setActiveView("anterior")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeView === "anterior"
                ? "bg-inverse text-inverse-fg shadow-sm"
                : "text-theme-muted hover:text-theme-text"
            }`}
          >
            Vista Anterior (Frente)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 items-center">
        {/* Silhueta Anatômica Editorial Vetorial */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-theme-secondary/70 rounded-xl border border-theme-border">
          <div className="relative w-56 h-[340px] flex items-center justify-center">
            {/* SVG Silhueta Anatômica Interativa com pontos clicáveis */}
            <svg
              viewBox="0 0 200 360"
              className="w-full h-full max-h-[340px] select-none"
              aria-label={`Silhueta humana anatômica - ${activeView === "posterior" ? "Vista Posterior" : "Vista Anterior"}`}
            >
              {/* Contorno do corpo estilizado — cores por token, ID único por instância */}
              <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: "rgb(var(--map-body-from))" }} />
                  <stop offset="100%" style={{ stopColor: "rgb(var(--map-body-to))" }} />
                </linearGradient>
              </defs>

              <g fill={`url(#${gradientId})`} style={{ stroke: "rgb(var(--map-body-stroke))" }} strokeWidth="1.5">
                <circle cx="100" cy="30" r="18" />
                <rect x="94" y="48" width="12" height="14" rx="2" />
                <path d="M 68 62 L 132 62 L 126 145 L 118 165 L 82 165 L 74 145 Z" />
                <path d="M 68 64 L 50 120 L 44 180 L 52 182 L 60 125 L 74 74 Z" />
                <path d="M 132 64 L 150 120 L 156 180 L 148 182 L 140 125 L 126 74 Z" />
                <path d="M 83 165 L 76 250 L 73 330 L 87 330 L 93 250 L 98 165 Z" />
                <path d="M 102 165 L 107 250 L 113 330 L 127 330 L 124 250 L 117 165 Z" />
              </g>

              {/* Regiões interativas: clique, toque, Enter ou Espaço */}
              {MAP_SPOTS[activeView].map((spot) => {
                const region = BODY_REGIONS.find((r) => r.id === spot.id);
                const name = region?.name ?? spot.id;
                const selected = isSelected(spot.id);
                const r = selected ? spot.r + 2.5 : spot.r;
                return (
                  <g
                    key={spot.id}
                    tabIndex={isReadOnly ? -1 : 0}
                    role="button"
                    aria-pressed={selected}
                    aria-disabled={isReadOnly || undefined}
                    aria-label={`${name}: ${selected ? "selecionada" : "não selecionada"}`}
                    onClick={() => toggleRegion(spot.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleRegion(spot.id);
                      }
                    }}
                    className={`body-map-spot ${isReadOnly ? "" : "cursor-pointer"}`}
                  >
                    {/* Área de toque ampliada e invisível */}
                    <circle cx={spot.x} cy={spot.y} r={Math.max(14, r + 6)} fill="transparent" />
                    <circle
                      className="body-map-focus"
                      cx={spot.x}
                      cy={spot.y}
                      r={r + 5}
                      fill="none"
                      strokeWidth="2"
                    />
                    {selected && (
                      <circle
                        key={`confirm-${spot.id}`}
                        className="body-map-confirm"
                        cx={spot.x}
                        cy={spot.y}
                        r={r + 3}
                        fill="none"
                        strokeWidth="2"
                      />
                    )}
                    <circle
                      cx={spot.x}
                      cy={spot.y}
                      r={r}
                      strokeWidth="2"
                      style={{
                        fill: selected ? "rgb(var(--map-dot-selected))" : "rgb(var(--map-dot))",
                        stroke: "rgb(var(--map-dot-ring))",
                        transition: "r 160ms ease, fill 160ms ease",
                      }}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
          <span className="text-[11px] text-theme-muted mt-2 text-center">
            {activeView === "posterior" ? "Visualizando face posterior (costas)" : "Visualizando face anterior (frente)"}
          </span>
        </div>

        {/* Seletor Textual Acessível e Áreas Selecionadas */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-theme-text">
              Regiões Marcadas ({selectedRegions.length})
            </span>
            {selectedRegions.length > 0 && !isReadOnly && (
              <button
                type="button"
                onClick={() => onChange && onChange([])}
                className="text-xs text-theme-text hover:text-status-danger-fg underline underline-offset-2"
              >
                Limpar seleção
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 min-h-[48px] p-3 bg-theme-secondary rounded-xl border border-theme-border">
            {selectedRegions.length === 0 ? (
              <span className="text-xs text-theme-muted self-center italic">
                Nenhuma região anatômica selecionada no momento.
              </span>
            ) : (
              selectedRegions.map((regId) => {
                const reg = BODY_REGIONS.find((r) => r.id === regId);
                return (
                  <span
                    key={regId}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-theme-primary border border-theme-teal/50 text-theme-text rounded-lg text-xs font-medium shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5 text-theme-teal" />
                    {reg ? reg.name : regId}
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => toggleRegion(regId)}
                        className="ml-1 -my-1 px-1 text-base leading-none text-theme-muted hover:text-status-danger-fg"
                        aria-label={`Remover ${reg ? reg.name : regId}`}
                      >
                        ×
                      </button>
                    )}
                  </span>
                );
              })
            )}
          </div>

          {/* Lista de botões por região anatômica */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-medium text-theme-muted block">
              Ou selecione diretamente pelos botões anatômicos rápidos:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {BODY_REGIONS.map((region) => {
                const checked = isSelected(region.id);
                return (
                  <button
                    key={region.id}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => toggleRegion(region.id)}
                    className={`text-left px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center justify-between ${
                      checked
                        ? "bg-theme-teal-subtle border-theme-teal text-theme-text font-semibold"
                        : "bg-theme-primary border-theme-border text-theme-text hover:border-theme-boundary"
                    }`}
                    aria-pressed={checked}
                  >
                    <span className="truncate">{region.name}</span>
                    {checked && <Check className="w-3.5 h-3.5 text-theme-teal flex-shrink-0 ml-1" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
