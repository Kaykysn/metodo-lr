/**
 * Mapa único das seis cenas editoriais do Método LR.
 *
 * Origem: lr-preto-dourado/fotos. Cada cena tem um par com dimensões e recorte
 * idênticos: `pb` (base em preto e branco) e `foto` (original em cor). As duas
 * camadas usam o mesmo `foco`/object-position e a mesma caixa, para que pele,
 * olhos, mãos e equipamentos não se deslocem durante a revelação.
 *
 * Os arquivos são copiados para public/images/lr-pb por
 * scripts/prepare-lr-pb-fotos.py, que também gera as máscaras de pontilhado a
 * partir da luminosidade da foto P&B. Nenhum original é editado.
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
  /** Ponto focal compartilhado pelas duas camadas, em object-position CSS. */
  foco: string;
  largura: number;
  altura: number;
  /** Foto original em cor. */
  foto: string;
  /** Base em preto e branco, mesma dimensão e recorte da foto em cor. */
  pb: string;
  /** Pontilhado sutil derivado da luminosidade da base P&B. */
  dither: string;
};

const BASE = "/images/lr-pb/";

type SceneInput = {
  arquivo?: string;
  id: EditorialSceneId;
  alt: string;
  foco: string;
  largura: number;
  altura: number;
};

function scene({ id, arquivo = id, alt, foco, largura, altura }: SceneInput): EditorialScene {
  return {
    id,
    alt,
    foco,
    largura,
    altura,
    foto: `${BASE}${arquivo}.webp`,
    pb: `${BASE}${arquivo}-pb.webp`,
    dither: `${BASE}${arquivo}-dither.webp`,
  };
}

export const EDITORIAL_SCENES: Record<EditorialSceneId, EditorialScene> = {
  hero: scene({
    id: "hero",
    alt: "Atleta se prepara para a largada",
    foco: "77% 50%",
    largura: 1672,
    altura: 941,
  }),
  avaliacao: scene({
    id: "avaliacao",
    alt: "Profissional observa o agachamento de uma aluna",
    foco: "50% 50%",
    largura: 1536,
    altura: 1024,
  }),
  planejamento: scene({
    id: "planejamento",
    alt: "Professor planeja a sessão no estúdio",
    foco: "50% 50%",
    largura: 1536,
    altura: 1024,
  }),
  acompanhamento: scene({
    id: "acompanhamento",
    alt: "Aluna realiza uma remada com elástico",
    foco: "50% 50%",
    largura: 1536,
    altura: 1024,
  }),
  reavaliacao: scene({
    id: "reavaliacao",
    arquivo: "reavaliacao-mobilidade",
    alt: "Profissional observa o aluno testar a mobilidade do tornozelo com o joelho junto à parede",
    foco: "50% 50%",
    largura: 1536,
    altura: 1024,
  }),
  prescricao: scene({
    id: "prescricao",
    alt: "Professora demonstra uma rosca com halter",
    foco: "50% 50%",
    largura: 1536,
    altura: 1024,
  }),
};

/** Proporção das cenas 16:9 (hero) e 3:2 (demais), usada pelos contêineres. */
export function editorialAspect(scene: EditorialScene): string {
  return `${scene.largura} / ${scene.altura}`;
}
