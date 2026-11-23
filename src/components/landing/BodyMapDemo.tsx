"use client";

import React, { useCallback, useRef, useState } from "react";
import clsx from "clsx";
import { Aim, ScanSearch } from "./SceneIcons";
import HeroXRay from "./HeroXRay";

/**
 * Coordenadas normalizadas no canvas 896 × 1114 do modelo original.
 * A pele e a camada anatômica usam o mesmo par de arquivos e o mesmo wrapper,
 * portanto o ombro revelado pela lente coincide com o ombro da pele em qualquer
 * largura de tela.
 */
const REGIONS = {
  ombro: {
    x: 0.63,
    y: 0.29,
    title: "Ombro",
    description: "O deltoide recobre a parte externa do ombro.",
  },
  braco: {
    x: 0.72,
    y: 0.44,
    title: "Braço",
    description: "Observe a musculatura na face anterior do braço, entre o ombro e o cotovelo.",
  },
  abdomen: {
    x: 0.5,
    y: 0.54,
    title: "Abdômen",
    description: "A lente destaca o reto do abdômen na parte anterior do tronco.",
  },
} as const;

type RegionKey = keyof typeof REGIONS;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Demonstração visual: modelo original do hero com lente dourada sobre a anatomia. */
export default function BodyMapDemo() {
  const model = useRef<HTMLDivElement>(null);
  const [region, setRegion] = useState<RegionKey>("ombro");
  const [view, setView] = useState<"anterior" | "posterior">("anterior");
  const [point, setPoint] = useState<{ x: number; y: number }>({
    x: REGIONS.ombro.x,
    y: REGIONS.ombro.y,
  });
  const [customLabel, setCustomLabel] = useState<string | null>(null);

  const selectRegion = useCallback((key: RegionKey) => {
    setRegion(key);
    setPoint({ x: REGIONS[key].x, y: REGIONS[key].y });
    setCustomLabel(null);
  }, []);

  /** Toque: seleciona a região sob o dedo sem impedir a rolagem vertical. */
  const pointFromTouch = useCallback((clientX: number, clientY: number) => {
    const box = model.current?.getBoundingClientRect();
    if (!box || box.width === 0 || box.height === 0) return;
    setPoint({
      x: clamp01((clientX - box.left) / box.width),
      y: clamp01((clientY - box.top) / box.height),
    });
    setCustomLabel("Ponto escolhido na imagem");
  }, []);

  /** Setas movem a lente; a lista de regiões continua equivalente para leitores de tela. */
  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = 0.03;
    let dx = 0;
    let dy = 0;
    if (e.key === "ArrowLeft") dx = -step;
    else if (e.key === "ArrowRight") dx = step;
    else if (e.key === "ArrowUp") dy = -step;
    else if (e.key === "ArrowDown") dy = step;
    else return;
    e.preventDefault();
    setPoint((p) => ({ x: clamp01(p.x + dx), y: clamp01(p.y + dy) }));
    setCustomLabel("Ponto ajustado pelo teclado");
  }, []);

  return (
    <div className="lr-scan" aria-label="Demonstração visual das camadas anatômicas">
      <div className="lr-scan-header">
        <span><i aria-hidden="true" /> VISOR ANATÔMICO</span>
        <Aim />
      </div>
      <div className="lr-fluted lr-fluted--scan min-w-0">
      <div
        ref={model}
        className="lr-model"
        tabIndex={0}
        role="group"
        aria-label="Modelo anatômico. Use as setas para mover a lente ou toque em uma região."
        onKeyDown={onKeyDown}
        onPointerDown={(e) => {
          if (e.pointerType === "touch") pointFromTouch(e.clientX, e.clientY);
        }}
      >
        <div className={clsx("lr-model-view", view === "posterior" && "is-flipped")}>
          <HeroXRay
            baseImage="/media/hero-body-base.webp"
            xrayImage="/media/hero-body-xray.webp"
            altBase="Modelo masculino em vista frontal com camadas de pele e musculatura alinhadas"
            aspectRatio="896 / 1114"
            focusPoint={point}
            autoSweep={false}
            priority={false}
            breathingEnabled={false}
            skinClassName="lr-skin-grayscale"
          />
        </div>
        <span className="lr-ruler lr-ruler-left" aria-hidden="true" />
        <span className="lr-ruler lr-ruler-right" aria-hidden="true" />
      </div>
      </div>
      <p className="lr-map-hint">
        Mova o cursor ou toque na imagem para revelar a anatomia. Navegue pelas regiões com as setas.
      </p>
      <div className="lr-scan-footer">
        <span>Vista {view === "anterior" ? "anterior" : "posterior"} · D/E</span>
        <span>Pele <i aria-hidden="true" /> Músculos</span>
      </div>
      <div className="lr-scan-controls">
        <div className="lr-regions" role="group" aria-label="Região da lente">
          {(Object.keys(REGIONS) as RegionKey[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={region === key && !customLabel}
              onClick={() => selectRegion(key)}
            >
              {REGIONS[key].title}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setView((v) => (v === "anterior" ? "posterior" : "anterior"))}
          className="lr-view-button"
        >
          <ScanSearch />
          {view === "anterior" ? "Ver costas" : "Ver frente"}
        </button>
      </div>
      <p className="lr-scan-description" aria-live="polite">
        <strong>{customLabel ?? REGIONS[region].title}</strong>
        {customLabel ? " — anatomia revelada no ponto selecionado." : ` — ${REGIONS[region].description}`}
      </p>
    </div>
  );
}
