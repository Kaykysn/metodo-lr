"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Aim, ScanSearch } from "./SceneIcons";
import { getImageProps } from "next/image";
import HeroXRay from "./HeroXRay";

type RegionKey = "ombro" | "braco" | "tronco";
type ViewKey = "anterior" | "posterior";
interface Region {
  x: number;
  y: number;
  title: string;
  description: string;
}

/**
 * Cada vista tem o próprio par de camadas (pele e anatomia) no canvas 896 × 1114, com fundo
 * transparente e o corpo na mesma posição nas duas camadas: a lente revela a anatomia exatamente
 * sob a pele em qualquer largura de tela. As coordenadas são normalizadas e foram medidas sobre a
 * camada anatômica de cada vista. A vista posterior usa imagens próprias (nuca, escápulas e coluna),
 * nunca a frontal espelhada.
 */
const VIEWS: Record<ViewKey, { base: string; xray: string; alt: string; regions: Record<RegionKey, Region>; path: { x: number; y: number }[] }> = {
  anterior: {
    base: "/media/hero-body-base.webp",
    xray: "/media/hero-body-xray.webp",
    alt: "Modelo masculino em vista frontal com camadas de pele e musculatura alinhadas",
    regions: {
      ombro: { x: 0.77, y: 0.47, title: "Ombro", description: "O deltoide recobre a parte externa do ombro." },
      braco: { x: 0.8, y: 0.61, title: "Braço", description: "Observe a musculatura na face anterior do braço, entre o ombro e o cotovelo." },
      tronco: { x: 0.5, y: 0.69, title: "Abdômen", description: "A lente destaca o reto do abdômen na parte anterior do tronco." },
    },
    // Trajeto da lente guiado pela rolagem no toque: ombro → tórax → braço.
    path: [{ x: 0.77, y: 0.47 }, { x: 0.5, y: 0.51 }, { x: 0.21, y: 0.61 }],
  },
  posterior: {
    base: "/media/hero-body-back-base.webp",
    xray: "/media/hero-body-back-xray.webp",
    alt: "Modelo masculino em vista posterior, com nuca, escápulas e coluna, em camadas de pele e anatomia alinhadas",
    regions: {
      ombro: { x: 0.74, y: 0.46, title: "Ombro", description: "Por trás, a escápula e o deltoide posterior formam o contorno do ombro." },
      braco: { x: 0.82, y: 0.58, title: "Braço", description: "O tríceps ocupa a face posterior do braço, entre o ombro e o cotovelo." },
      tronco: { x: 0.5, y: 0.74, title: "Lombar", description: "A lente mostra a coluna lombar e a musculatura que a acompanha." },
    },
    // Ombro → escápulas e coluna torácica → braço oposto.
    path: [{ x: 0.74, y: 0.46 }, { x: 0.5, y: 0.52 }, { x: 0.2, y: 0.6 }],
  },
};

const REGION_KEYS: RegionKey[] = ["ombro", "braco", "tronco"];
const IMAGE_SIZES = "(max-width: 1023px) 92vw, 46vw";

/** Baixa as camadas da outra vista no mesmo tamanho que o next/image vai pedir: a troca não pisca. */
function preloadView(v: ViewKey) {
  for (const src of [VIEWS[v].base, VIEWS[v].xray]) {
    const { props } = getImageProps({ src, alt: "", fill: true, sizes: IMAGE_SIZES });
    const img = new window.Image();
    img.sizes = IMAGE_SIZES;
    if (props.srcSet) img.srcset = props.srcSet;
    img.src = props.src;
  }
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Demonstração visual: pele em preto e branco; a musculatura laranja só aparece na lente. */
export default function BodyMapDemo() {
  const model = useRef<HTMLDivElement>(null);
  const [region, setRegion] = useState<RegionKey>("ombro");
  const [view, setView] = useState<ViewKey>("anterior");
  const current = VIEWS[view];
  const regions = current.regions;
  const [point, setPoint] = useState<{ x: number; y: number }>({
    x: VIEWS.anterior.regions.ombro.x,
    y: VIEWS.anterior.regions.ombro.y,
  });
  const [customLabel, setCustomLabel] = useState<string | null>(null);
  /** Escolha explícita (região, toque ou teclado): a rolagem deixa de conduzir a lente. */
  const [pinned, setPinned] = useState(false);
  /** Tela de toque: sem escolha explícita, a rolagem conduz a lente pelo trajeto. */
  const [touchScreen, setTouchScreen] = useState(false);
  const guided = touchScreen && !pinned;

  useEffect(() => {
    const media = window.matchMedia("(hover: none)");
    const sync = () => setTouchScreen(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  // Ao sair inteiro da tela, a rolagem volta a conduzir a lente na próxima passagem.
  useEffect(() => {
    const el = model.current;
    if (!el || !pinned || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) setPinned(false);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [pinned]);

  const selectRegion = useCallback((key: RegionKey) => {
    setRegion(key);
    setPoint({ x: regions[key].x, y: regions[key].y });
    setCustomLabel(null);
    setPinned(true);
  }, [regions]);

  /**
   * Troca de vista: as duas camadas (pele e anatomia) passam juntas para a outra vista. A região
   * escolhida continua a mesma e a lente vai para a posição dela na nova imagem; um ponto livre
   * (toque ou teclado) fica onde está.
   */
  const changeView = useCallback(
    (next: ViewKey) => {
      setView(next);
      if (!customLabel) setPoint({ x: VIEWS[next].regions[region].x, y: VIEWS[next].regions[region].y });
    },
    [customLabel, region]
  );

  // Depois da primeira pintura, deixa a vista posterior em cache para a troca ser imediata.
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const id = idle(() => preloadView("posterior"));
    return () => cancel(id);
  }, []);

  /** Toque: fixa a lente no ponto tocado sem impedir a rolagem vertical. */
  const pointFromTouch = useCallback((clientX: number, clientY: number) => {
    const box = model.current?.getBoundingClientRect();
    if (!box || box.width === 0 || box.height === 0) return;
    setPoint({
      x: clamp01((clientX - box.left) / box.width),
      y: clamp01((clientY - box.top) / box.height),
    });
    setCustomLabel("Ponto escolhido na imagem");
    setPinned(true);
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
    setPinned(true);
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
        <div className="lr-model-view" data-view={view}>
          <HeroXRay
            baseImage={current.base}
            xrayImage={current.xray}
            altBase={current.alt}
            aspectRatio="896 / 1114"
            focusPoint={point}
            autoSweep={false}
            priority={false}
            breathingEnabled={false}
            skinClassName="lr-skin-grayscale"
            keepInViewport={false}
            scrollPath={pinned ? undefined : current.path}
          />
        </div>
        <span className="lr-ruler lr-ruler-left" aria-hidden="true" />
        <span className="lr-ruler lr-ruler-right" aria-hidden="true" />
      </div>
      </div>
      <p className="lr-map-hint">
        <span className="lr-hint-pointer">
          Mova o cursor sobre o corpo para revelar a musculatura. Navegue pelas regiões com as setas.
        </span>
        <span className="lr-hint-touch">
          Role a página: a lente percorre ombro, tórax e braço. Toque no corpo para fixar um ponto.
        </span>
      </p>
      <div className="lr-scan-footer">
        <span>Vista {view === "anterior" ? "anterior" : "posterior"} · D/E</span>
        <span>Pele <i aria-hidden="true" /> Músculos</span>
      </div>
      <div className="lr-scan-controls">
        <div className="lr-regions" role="group" aria-label="Região da lente">
          {REGION_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={!guided && region === key && !customLabel}
              onClick={() => selectRegion(key)}
            >
              {regions[key].title}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => changeView(view === "anterior" ? "posterior" : "anterior")}
          onPointerEnter={() => preloadView(view === "anterior" ? "posterior" : "anterior")}
          className="lr-view-button"
          aria-label={view === "anterior" ? "Ver costas (vista atual: frente)" : "Ver frente (vista atual: costas)"}
        >
          <ScanSearch />
          {view === "anterior" ? "Ver costas" : "Ver frente"}
        </button>
      </div>
      <p className="lr-scan-description" aria-live="polite">
        {guided ? (
          <>
            <strong>Trajeto</strong> — a lente acompanha a rolagem pelo ombro, tórax e braço.
          </>
        ) : (
          <>
            <strong>{customLabel ?? regions[region].title}</strong>
            {customLabel ? " — anatomia revelada no ponto selecionado." : ` — ${regions[region].description}`}
          </>
        )}
      </p>
    </div>
  );
}
