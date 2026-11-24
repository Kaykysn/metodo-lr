// Dados de quem responde pela plataforma, usados na Política de Privacidade e nos Termos de Uso.
// Ao mudar qualquer um deles, atualize também a data de vigência.

export const LEGAL = {
  platform: "Método LR",
  /** Nome completo da pessoa ou razão social da empresa responsável pela plataforma. */
  controller: "Carlos Leandro Pessanha Rangel",
  /** CNPJ, quando houver (ex.: "CNPJ 00.000.000/0001-00"). Sem empresa, fica null. */
  controllerDocument: "CNPJ 15.841.300/0001-70" as string | null,
  /** Endereço físico (Decreto 7.962/2013, art. 2º). */
  address: "Rua Padre Romeu Pedruzzi, 75, Dom Bosco, Campos dos Goytacazes/RJ, CEP 28030-140",
  /** Encarregado pelo tratamento de dados pessoais (LGPD, art. 41). */
  dpo: "Carlos Leandro Pessanha Rangel",
  /** Data a partir da qual o texto vale. */
  effectiveDate: "24 de novembro de 2026",
  /** Canal único para dúvidas, pedidos do titular e encerramento de conta. */
  /** A variável NEXT_PUBLIC_CONTACT_EMAIL da hospedagem, se existir, tem prioridade. */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "metodolr.admin@gmail.com",
} as const;

export function controllerLabel(): string {
  return LEGAL.controllerDocument ? `${LEGAL.controller} (${LEGAL.controllerDocument})` : LEGAL.controller;
}
