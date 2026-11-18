// Regra de senha do Método LR. A mesma regra roda no servidor
// (backend/supabase/functions/_shared/password.ts, função account-password), que é quem decide;
// aqui ela só adianta os avisos ao lado do campo. A senha é enviada exatamente como digitada:
// a normalização serve só para comparar com o nome.

export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 72;
export const PASSWORD_SYMBOLS = ["!", "@", "#", "$"] as const;
const PARTICLES = new Set(["de", "da", "do", "dos", "das", "e"]);

export type PasswordProblem = "curta" | "longa" | "maiuscula" | "simbolo" | "nome";

export const PASSWORD_MESSAGES: Record<PasswordProblem, string> = {
  curta: `Use pelo menos ${PASSWORD_MIN} caracteres.`,
  longa: `Use no máximo ${PASSWORD_MAX} caracteres.`,
  maiuscula: "Inclua pelo menos uma letra maiúscula.",
  simbolo: "Inclua pelo menos um destes símbolos: ! @ # $",
  nome: "Não use seu nome nem seu sobrenome na senha.",
};

/** Requisitos mostrados junto ao campo, na ordem da tela. */
export const PASSWORD_REQUIREMENTS: { id: Exclude<PasswordProblem, "longa">; label: string }[] = [
  { id: "curta", label: `Pelo menos ${PASSWORD_MIN} caracteres` },
  { id: "maiuscula", label: "Uma letra maiúscula" },
  { id: "simbolo", label: "Um destes símbolos: ! @ # $" },
  { id: "nome", label: "Sem o seu nome ou sobrenome" },
];

export function foldText(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function nameParts(fullName: string): string[] {
  return Array.from(new Set(foldText(fullName).split(/[^a-z0-9]+/).filter((p) => p.length >= 3 && !PARTICLES.has(p))));
}

export function passwordProblems(password: string, fullName: string): PasswordProblem[] {
  const out: PasswordProblem[] = [];
  if (password.length < PASSWORD_MIN) out.push("curta");
  if (password.length > PASSWORD_MAX) out.push("longa");
  if (!/\p{Lu}/u.test(password)) out.push("maiuscula");
  if (!PASSWORD_SYMBOLS.some((c) => password.includes(c))) out.push("simbolo");
  const folded = foldText(password);
  if (nameParts(fullName).some((p) => folded.includes(p))) out.push("nome");
  return out;
}
