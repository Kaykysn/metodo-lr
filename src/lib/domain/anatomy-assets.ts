// ==============================================================================
// Ponto de integração das ilustrações anatômicas.
// Arte oficial: public/images/anatomia-corpo.png (1536 x 1024 px, com transparência).
// O arquivo traz as duas vistas lado a lado na mesma escala:
//   - figura da ESQUERDA  = vista anterior (frente)
//   - figura da DIREITA   = vista posterior (costas)
// Em vez de duplicar o arquivo em dois recortes, o mapa desenha a mesma arte
// recortando a metade correspondente por viewBox (SVG), sem redimensionar o
// desenho de forma independente: a proporção do corpo nunca é distorcida.
//
// Cada vista é encaixada na "caixa de conteúdo" do quadro 560 x 1024 usado pelos
// pontos anatômicos normalizados (x/y 0–1 em body-regions.ts). Assim os pontos
// continuam exatamente sobre os mesmos acidentes anatômicos de antes.
// ==============================================================================

export interface AnatomyViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AnatomyAsset {
  src: string; // ex.: "/images/anatomia-corpo.png"
  width: number; // dimensões intrínsecas do recorte (reserva de espaço)
  height: number;
  /** Região da arte que contém esta vista (coordenadas em px do arquivo). */
  sheet: AnatomyViewBox;
  /** Origem e licença do material (obrigatório para arte externa). */
  credit: string;
  /** Revisão anatômica humana registrada. */
  reviewedBy: string | null;
}

/** Arte única compartilhada pelas duas vistas. */
export const ANATOMY_SHEET = {
  src: "/images/anatomia-corpo.png",
  width: 1536,
  height: 1024,
} as const;

/** Quadro lógico em que os pontos das regiões são definidos (ver body-regions.ts). */
export const ANATOMY_VIEWBOX = { w: 560, h: 1024 } as const;

/**
 * Caixa em que o desenho do corpo é encaixado dentro do quadro 560 x 1024.
 * Mantém a margem original da arte (a figura não encosta nas bordas) e é o
 * referencial dos pontos anatômicos.
 */
export const ANATOMY_CONTENT_BOX: AnatomyViewBox = { x: 16, y: 6, w: 520, h: 998 };

export const ANATOMY_ASSETS: Record<"anterior" | "posterior", AnatomyAsset | null> = {
  anterior: {
    src: ANATOMY_SHEET.src,
    width: 523,
    height: 996,
    sheet: { x: 216, y: 8, w: 523, h: 996 },
    credit: "Ilustração anatômica muscular - Método LR",
    reviewedBy: "Leandro Rangel",
  },
  posterior: {
    src: ANATOMY_SHEET.src,
    width: 528,
    height: 996,
    sheet: { x: 784, y: 8, w: 528, h: 996 },
    credit: "Ilustração anatômica muscular - Método LR",
    reviewedBy: "Leandro Rangel",
  },
};

/**
 * Props SVG para desenhar uma vista da arte única dentro do quadro 0 0 560 1024.
 * O <image> cobre o arquivo inteiro e o viewBox do <svg> aninhado recorta a
 * metade desejada — sem transformações independentes por camada.
 */
export function anatomyFigureProps(view: "anterior" | "posterior") {
  const asset = ANATOMY_ASSETS[view];
  const box = asset?.sheet ?? { x: 0, y: 0, w: ANATOMY_SHEET.width, h: ANATOMY_SHEET.height };
  return {
    src: ANATOMY_SHEET.src,
    sheetWidth: ANATOMY_SHEET.width,
    sheetHeight: ANATOMY_SHEET.height,
    x: ANATOMY_CONTENT_BOX.x,
    y: ANATOMY_CONTENT_BOX.y,
    width: ANATOMY_CONTENT_BOX.w,
    height: ANATOMY_CONTENT_BOX.h,
    viewBox: `${box.x} ${box.y} ${box.w} ${box.h}`,
  };
}
