// ==============================================================================
// Ponto de integração das ilustrações anatômicas realistas.
// Arquivos em public/images/ (e espelhados em public/anatomy/):
// anatomia-anterior.png e anatomia-posterior.png (560 x 1024 px com transparência).
// A imagem é desenhada dentro do viewBox (0 0 560 1024) da camada interativa, com
// preserveAspectRatio="xMidYMid meet": as margens do "contain" são calculadas pelo
// próprio SVG e os pontos anatômicos se mantêm perfeitamente sobrepostos.
// ==============================================================================

export interface AnatomyAsset {
  src: string; // ex.: "/images/anatomia-anterior.png"
  width: number; // dimensões intrínsecas (reserva de espaço)
  height: number;
  /** Origem e licença do material (obrigatório para arte externa). */
  credit: string;
  /** Revisão anatômica humana registrada. */
  reviewedBy: string | null;
}

export const ANATOMY_ASSETS: Record<"anterior" | "posterior", AnatomyAsset | null> = {
  anterior: {
    src: "/images/anatomia-anterior.png",
    width: 560,
    height: 1024,
    credit: "Ilustração anatômica muscular - Método LR",
    reviewedBy: "Leandro Rangel",
  },
  posterior: {
    src: "/images/anatomia-posterior.png",
    width: 560,
    height: 1024,
    credit: "Ilustração anatômica muscular - Método LR",
    reviewedBy: "Leandro Rangel",
  },
};

export const ANATOMY_VIEWBOX = { w: 560, h: 1024 };
