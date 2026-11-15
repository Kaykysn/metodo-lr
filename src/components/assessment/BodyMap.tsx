"use client";

import React, { useState, useId } from "react";
import { Check } from "lucide-react";
import { anatomyFigureProps } from "@/lib/domain/anatomy-assets";

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

// Pontos clicáveis anatômicos por vista adaptados à nova ilustração muscular (viewBox 560×1024)
const MAP_SPOTS: Record<"posterior" | "anterior", MapSpot[]> = {
  anterior: [
    { id: "cervical", x: 280, y: 154, r: 16 },
    { id: "right_shoulder", x: 176, y: 210, r: 18 },
    { id: "left_shoulder", x: 384, y: 210, r: 18 },
    { id: "right_elbow", x: 123, y: 363, r: 16 },
    { id: "left_elbow", x: 437, y: 363, r: 16 },
    { id: "right_wrist", x: 67, y: 527, r: 16 },
    { id: "left_wrist", x: 493, y: 527, r: 16 },
    { id: "right_anterior_thigh", x: 232, y: 604, r: 20 },
    { id: "left_anterior_thigh", x: 328, y: 604, r: 20 },
    { id: "right_knee", x: 230, y: 722, r: 16 },
    { id: "left_knee", x: 330, y: 722, r: 16 },
    { id: "right_ankle", x: 235, y: 952, r: 16 },
    { id: "left_ankle", x: 325, y: 952, r: 16 },
  ],
  posterior: [
    { id: "cervical", x: 280, y: 154, r: 16 },
    { id: "thoracic", x: 280, y: 276, r: 18 },
    { id: "lumbar", x: 280, y: 410, r: 18 },
    { id: "sacroiliac", x: 280, y: 466, r: 16 },
    { id: "left_shoulder", x: 176, y: 210, r: 18 },
    { id: "right_shoulder", x: 384, y: 210, r: 18 },
    { id: "left_elbow", x: 123, y: 363, r: 16 },
    { id: "right_elbow", x: 437, y: 363, r: 16 },
    { id: "left_wrist", x: 67, y: 527, r: 16 },
    { id: "right_wrist", x: 493, y: 527, r: 16 },
    { id: "left_glute", x: 235, y: 497, r: 20 },
    { id: "right_glute", x: 325, y: 497, r: 20 },
    { id: "left_posterior_thigh", x: 232, y: 614, r: 20 },
    { id: "right_posterior_thigh", x: 328, y: 614, r: 20 },
    { id: "left_knee", x: 230, y: 722, r: 16 },
    { id: "right_knee", x: 330, y: 722, r: 16 },
    { id: "left_ankle", x: 235, y: 952, r: 16 },
    { id: "right_ankle", x: 325, y: 952, r: 16 },
  ],
};

export default function BodyMap({ selectedRegions = [], onChange, isReadOnly = false }: BodyMapProps) {
  const [activeView, setActiveView] = useState<"posterior" | "anterior">("posterior");
  const gradientId = `body-gradient-${useId().replace(/:/g, "")}`;
  const art = anatomyFigureProps(activeView);

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
        <div className="glass-soft flex items-center gap-1 bg-theme-secondary p-1 rounded-xl self-start sm:self-auto" role="tablist" aria-label="Visualização anatômica">
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
        {/* Silhueta Anatômica Muscular Detalhada */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-3 sm:p-4 bg-[#021226] rounded-xl border border-theme-border shadow-inner">
          <div className="relative w-full max-w-[300px] aspect-[560/1024]">
            {/* SVG Silhueta Anatômica Interativa com pontos clicáveis sobrepostos.
                A arte oficial é public/images/anatomia-corpo.png (vista anterior à
                esquerda, posterior à direita); cada aba recorta a metade correta
                via viewBox, sem distorcer a proporção do corpo. */}
            <svg
              viewBox="0 0 560 1024"
              className="block h-full w-full select-none"
              aria-label={`Ilustração anatômica muscular - ${activeView === "posterior" ? "Vista Posterior" : "Vista Anterior"}`}
            >
              <svg
                x={art.x}
                y={art.y}
                width={art.width}
                height={art.height}
                viewBox={art.viewBox}
                preserveAspectRatio="xMidYMid meet"
                aria-hidden="true"
              >
                <image href={art.src} x={0} y={0} width={art.sheetWidth} height={art.sheetHeight} />
              </svg>

              {/* Indicadores de lateralidade da pessoa avaliada */}
              <g aria-hidden="true" style={{ fill: "#76D7BE", opacity: 0.85 }} fontSize={28} fontWeight={800}>
                <text x={26} y={52}>{activeView === "anterior" ? "D" : "E"}</text>
                <text x={560 - 46} y={52}>{activeView === "anterior" ? "E" : "D"}</text>
              </g>

              {/* Regiões interativas: clique, toque, Enter ou Espaço */}
              {MAP_SPOTS[activeView].map((spot) => {
                const region = BODY_REGIONS.find((r) => r.id === spot.id);
                const name = region?.name ?? spot.id;
                const selected = isSelected(spot.id);
                const r = selected ? spot.r + 3 : spot.r;
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
                    <circle cx={spot.x} cy={spot.y} r={Math.max(26, r + 8)} fill="transparent" />
                    <circle
                      className="body-map-focus"
                      cx={spot.x}
                      cy={spot.y}
                      r={r + 8}
                      fill="none"
                      stroke="#76D7BE"
                      strokeWidth="3"
                    />
                    {selected && (
                      <circle
                        key={`confirm-${spot.id}`}
                        className="body-map-confirm"
                        cx={spot.x}
                        cy={spot.y}
                        r={r + 6}
                        fill="none"
                        stroke="#76D7BE"
                        strokeWidth="3"
                      />
                    )}
                    {/* Ponto indicador de alta visibilidade */}
                    {selected ? (
                      <g>
                        <circle
                          cx={spot.x}
                          cy={spot.y}
                          r={r}
                          fill="rgba(118, 215, 190, 0.35)"
                          stroke="#76D7BE"
                          strokeWidth="3"
                          strokeDasharray="6 4"
                        />
                        <circle cx={spot.x} cy={spot.y} r={9} fill="#76D7BE" stroke="#021226" strokeWidth="2.5" />
                      </g>
                    ) : (
                      <g>
                        <circle cx={spot.x} cy={spot.y} r={r} fill="rgba(255, 255, 255, 0.45)" stroke="#021226" strokeWidth="2" />
                        <circle cx={spot.x} cy={spot.y} r={4} fill="#021226" />
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
          <span className="text-[11px] text-[#76D7BE] mt-2 text-center font-medium">
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
