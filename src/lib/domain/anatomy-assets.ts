// ==============================================================================
// Ponto de integração das ilustrações anatômicas realistas.
// Quando houver arte revisada (vista anterior e posterior com mesma escala/pose),
// coloque os arquivos em public/anatomy/ e preencha abaixo. A imagem é desenhada
// dentro do MESMO viewBox (0 0 400 1000) da camada interativa, com
// preserveAspectRatio="xMidYMid meet": as margens do "contain" são calculadas pelo
// próprio SVG e os pontos não se deslocam em zoom ou redimensionamento.
// Enquanto `null`, a interface usa o esquema vetorial provisório (rotulado na tela).
// ==============================================================================

export interface AnatomyAsset {
  src: string; // ex.: "/anatomy/anterior.webp"
  width: number; // dimensões intrínsecas (reserva de espaço)
  height: number;
  /** Origem e licença do material (obrigatório para arte externa). */
  credit: string;
  /** Revisão anatômica humana registrada. */
  reviewedBy: string | null;
}

export const ANATOMY_ASSETS: Record<"anterior" | "posterior", AnatomyAsset | null> = {
  anterior: null,
  posterior: null,
};

export const ANATOMY_VIEWBOX = { w: 400, h: 1000 };
