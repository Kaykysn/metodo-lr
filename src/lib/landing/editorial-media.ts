/**
 * Mapa único das seis cenas editoriais do Método LR.
 *
 * Cada cena tem cinco arquivos com o mesmo recorte (1672 × 941 px):
 * - `pb`: a base em preto e branco — é a imagem de conteúdo (alt);
 * - `foto`: a fotografia em cor, revelada pela lente (mouse) ou pela rolagem (toque);
 * - `pontos`: a mesma cena com trama de pontos, sobreposta à base;
 * - `vidro` / `vidroPb`: a cena refratada por vidro canelado, numa faixa da foto.
 *
 * As versões P&B saem de scripts/build-editorial-pb.mjs, a partir das fotos em cor.
 * O hero (homem em posição de largada) usa arquivos com nome próprio (hero-homem*),
 * para nenhum cache servir a foto anterior; a trama e o vidro dele também saem do script.
 *
 * Todas as camadas compartilham caixa, object-fit, object-position e o mesmo
 * contêiner de zoom, então nada se desloca quando a lente revela a cor.
 */
export type EditorialSceneId =
  | "hero"
  | "avaliacao"
  | "planejamento"
  | "acompanhamento"
  | "reavaliacao"
  | "prescricao";

export type EditorialScene = {
  id: EditorialSceneId;
  alt: string;
  /** Ponto focal compartilhado pelas camadas, em object-position CSS. */
  foco: string;
  largura: number;
  altura: number;
  /** Fotografia limpa em cor (revelada pela lente). */
  foto: string;
  /** Base em preto e branco, mesmo recorte da foto. */
  pb: string;
  /** Mesma cena com trama de pontos. */
  pontos: string;
  /** Mesma cena refratada pelo vidro canelado, em cor. */
  vidro: string;
  /** Vidro canelado em preto e branco, sobre a base P&B. */
  vidroPb: string;
};

const BASE = "/images/metodo-lr/";

type SceneInput = Pick<EditorialScene, "id" | "alt" | "foco"> & {
  /** Nome-base dos arquivos, quando difere do id. */
  arquivo?: string;
};

function scene({ id, alt, foco, arquivo = id }: SceneInput): EditorialScene {
  return {
    id,
    alt,
    foco,
    largura: 1672,
    altura: 941,
    foto: `${BASE}${arquivo}.webp`,
    pb: `${BASE}${arquivo}-pb.webp`,
    pontos: `${BASE}${arquivo}-pontos.webp`,
    vidro: `${BASE}${arquivo}-vidro.webp`,
    vidroPb: `${BASE}${arquivo}-vidro-pb.webp`,
  };
}

export const EDITORIAL_SCENES: Record<EditorialSceneId, EditorialScene> = {
  hero: scene({
    id: "hero",
    arquivo: "hero-homem",
    alt: "Atleta em posição de largada, apoiado nas mãos e olhando à frente",
    foco: "62% 30%",
  }),
  avaliacao: scene({
    id: "avaliacao",
    alt: "Professor observa uma aluna durante o agachamento",
    foco: "50% 48%",
  }),
  planejamento: scene({
    id: "planejamento",
    alt: "Profissional prepara o treino em um caderno no estúdio",
    foco: "50% 45%",
  }),
  acompanhamento: scene({
    id: "acompanhamento",
    alt: "Aluna e professora conversam sobre o treino com um tablet",
    foco: "50% 45%",
  }),
  reavaliacao: scene({
    id: "reavaliacao",
    alt: "Profissional registra a observação enquanto o aluno eleva os braços",
    foco: "50% 45%",
  }),
  prescricao: scene({ id: "prescricao", alt: "Detalhe de anilhas e barra no estúdio", foco: "52% 52%" }),
};

/** Proporção das cenas (todas 1672 × 941), usada para reservar espaço. */
export function editorialAspect(scene: EditorialScene): string {
  return `${scene.largura} / ${scene.altura}`;
}
