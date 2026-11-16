/**
 * Conteúdo editável da landing que depende de dados reais.
 *
 * Prova de confiança do Hero: deixe a lista vazia enquanto não houver números,
 * depoimentos ou instituições verificadas. Com a lista vazia o componente não
 * renderiza nada — nada de números inventados.
 */
export interface HeroSocialProofItem {
  /** Texto curto, ex.: "+320 avaliações realizadas". */
  label: string;
}

export const HERO_SOCIAL_PROOF: HeroSocialProofItem[] = [];
