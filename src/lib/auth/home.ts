// Página inicial de cada papel depois do login: o aluno vai para o próprio treino, os demais para
// a área profissional. Vale para senha, Google e o primeiro acesso pelo convite.

export function homeFor(role: string | null | undefined): "/aluno" | "/app" {
  return role === "practitioner" ? "/aluno" : "/app";
}

/** Destino pedido (já validado por safeNext) só quando combina com o papel: o aluno não vai para a
 *  área profissional, e o profissional não cai na tela do aluno. /conta vale para todos. */
export function destinationFor(role: string | null | undefined, next: string | null): string {
  const home = homeFor(role);
  if (!next) return home;
  if (next === "/conta" || next.startsWith("/conta/")) return next;
  if (home === "/aluno") return next === "/aluno" || next.startsWith("/aluno/") ? next : home;
  return next === "/aluno" || next.startsWith("/aluno/") ? home : next;
}
