// Página inicial de cada papel depois do login: o aluno vai para o próprio treino, os demais para
// a área profissional. Vale para senha, Google e o primeiro acesso pelo convite.

/** E-mail levado do primeiro acesso ao login (sessionStorage: some ao fechar a aba, não vai na URL). */
export const LOGIN_EMAIL_KEY = "lr_login_email";

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
