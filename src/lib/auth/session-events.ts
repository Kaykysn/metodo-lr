// O que fazer com cada evento de autenticação do Supabase.
// Ao voltar para uma aba, o Supabase revalida a sessão e emite TOKEN_REFRESHED e SIGNED_IN da MESMA pessoa.
// Se isso recarregasse as telas, o que estava em edição voltaria ao estado salvo.

/** ignore: nada muda | session: relê só a sessão | reload: outra pessoa, relê sessão e todas as telas */
export type AuthReaction = "ignore" | "session" | "reload";

/**
 * @param known id da pessoa já conhecida (undefined enquanto não sabemos; null = sem sessão)
 * @param next id da pessoa no evento (null = sem sessão)
 */
export function reactToAuthEvent(event: string, known: string | null | undefined, next: string | null): AuthReaction {
  if (event === "INITIAL_SESSION") return "ignore"; // a carga inicial já leu a sessão
  const samePerson = known !== undefined && known === next;
  if (event === "TOKEN_REFRESHED" && samePerson) return "ignore";
  if (event === "SIGNED_IN" && samePerson) return "ignore";
  if (samePerson) return "session"; // ex.: USER_UPDATED, segundo fator confirmado
  return "reload"; // entrou, saiu ou trocou de conta
}
