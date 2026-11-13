// ==============================================================================
// Afirmações rastreáveis: cada fonte fica ligada à afirmação específica que sustenta.
// Uma fonte de anatomia sustenta ações musculares; um estudo de hipertrofia sustenta
// a comparação que estudou; um ensaio clínico sustenta o programa e a população estudados.
// Nada aqui vira recomendação ao aluno sem revisão editorial do texto completo.
// ==============================================================================
import { EVIDENCE_BY_ID } from "./evidence";

export type EvidenceLabel = "Anatomia funcional" | "Estudo de hipertrofia" | "Ensaio clínico" | "Diretriz clínica" | "Validação de medida";

export type ClaimReviewStatus = "pendente de revisão editorial" | "revisado";
/** O que foi efetivamente lido antes de registrar a afirmação. */
export type ClaimReviewBasis = "metadados" | "resumo" | "texto completo";

export interface EvidenceClaim {
  id: string;
  sourceId: string;
  label: EvidenceLabel;
  /** Afirmação sustentada, escrita em linguagem própria. */
  claim: string;
  population: string;
  limitations: string;
  reviewStatus: ClaimReviewStatus;
  reviewBasis: ClaimReviewBasis;
  reviewedOn: string | null;
}

const PENDING = { reviewStatus: "pendente de revisão editorial" as const, reviewBasis: "metadados" as const, reviewedOn: null };

export const CLAIMS: EvidenceClaim[] = [
  {
    id: "anat-membro-inferior",
    sourceId: "openstax-ap2e-11-6",
    label: "Anatomia funcional",
    claim: "Nomes, inserções e ações dos músculos do quadril, da coxa e da perna citados nesta ficha.",
    population: "Não se aplica (anatomia descritiva)",
    limitations: "Ação anatômica não informa quanto cada músculo trabalha neste exercício nem prevê hipertrofia.",
    ...PENDING,
  },
  {
    id: "anat-membro-superior",
    sourceId: "openstax-ap2e-11-5",
    label: "Anatomia funcional",
    claim: "Nomes, inserções e ações dos músculos da cintura escapular, do braço e do antebraço citados nesta ficha.",
    population: "Não se aplica (anatomia descritiva)",
    limitations: "Ação anatômica não informa quanto cada músculo trabalha neste exercício nem prevê hipertrofia.",
    ...PENDING,
  },
  {
    id: "hip-thrust-vs-agachamento",
    sourceId: "plotkin-2023-hipthrust",
    label: "Estudo de hipertrofia",
    claim: "Na comparação estudada, treinar hip thrust e treinar agachamento livre produziram hipertrofia semelhante dos glúteos. Diferenças agudas de atividade elétrica (EMG) entre os exercícios não previram o crescimento muscular.",
    population: "A conferir no texto completo",
    limitations: "Vale para os dois exercícios e o protocolo estudados.",
    ...PENDING,
  },
  {
    id: "flexora-sentada-vs-deitada",
    sourceId: "maeo-2021-hamstrings",
    label: "Estudo de hipertrofia",
    claim: "Na comparação estudada, a flexora sentada (quadril flexionado, isquiotibiais mais alongados) produziu mais hipertrofia dos isquiotibiais que a flexora deitada.",
    population: "A conferir no texto completo",
    limitations: "Vale para as duas flexoras estudadas; mostra a importância da posição do quadril, não define dose.",
    ...PENDING,
  },
  {
    id: "triceps-acima-vs-neutro",
    sourceId: "maeo-2022-triceps",
    label: "Estudo de hipertrofia",
    claim: "Na comparação estudada, a extensão de cotovelo no cabo com o braço acima da cabeça produziu mais hipertrofia do tríceps que a mesma extensão com o braço em posição neutra.",
    population: "A conferir no texto completo",
    limitations: "Vale para as duas posições de extensão no cabo estudadas.",
    ...PENDING,
  },
  {
    id: "programa-quadril-dor-patelofemoral",
    sourceId: "ferber-2015-pfp",
    label: "Ensaio clínico",
    claim: "Em pessoas com dor patelofemoral, o programa de fortalecimento de quadril e core e o programa de fortalecimento de joelho melhoraram os desfechos estudados, com diferenças no momento e no padrão dos resultados.",
    population: "Pessoas com dor patelofemoral, conforme critérios do estudo",
    limitations: "Resultado do programa estudado, não deste exercício isolado. Aplicar só dentro da população e do protocolo estudados.",
    ...PENDING,
  },
  {
    id: "programa-manguito-grasp",
    sourceId: "hopewell-2021-grasp",
    label: "Ensaio clínico",
    claim: "Em adultos com distúrbios do manguito rotador, um programa de exercício progressivo foi comparado a uma sessão de orientação de boas práticas. Os resultados pedem decisões contextualizadas e cautela ao supor que programas mais complexos sejam superiores.",
    population: "Adultos com distúrbios do manguito rotador, conforme critérios do estudo",
    limitations: "Resultado do programa estudado, não deste exercício isolado.",
    ...PENDING,
  },
  {
    id: "medida-postural-foto-sapo",
    sourceId: "ferreira-2010-sapo",
    label: "Validação de medida",
    claim: "Medidas posturais por fotografia têm validade e confiabilidade que variam por variável, no software e nos procedimentos estudados.",
    population: "A conferir no texto completo",
    limitations: "A validação vale para o PAS/SAPO. O módulo de fotos deste app não foi validado e não deve herdar esses resultados.",
    ...PENDING,
  },
];

export const CLAIM_BY_ID = new Map(CLAIMS.map((c) => [c.id, c]));

export function claimSource(c: EvidenceClaim) {
  return EVIDENCE_BY_ID.get(c.sourceId);
}
