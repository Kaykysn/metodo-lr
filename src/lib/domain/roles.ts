// ==============================================================================
// Papéis e permissões (fonte única para UI, repositório e testes)
// ==============================================================================
// "Estudante" aprende na plataforma. "Aluno" é a pessoa acompanhada no treino.
// O papel legado `student` NÃO é convertido automaticamente: ver migração 20261106.

export type Role =
  | "teacher" // professor(a) / profissional de Educação Física
  | "pe_student" // estudante de Educação Física (casos didáticos, rascunhos supervisionados)
  | "practitioner" // aluno praticante (vê só o treino aprovado e registra execução)
  | "admin" // gerencia acesso; NÃO lê dados de saúde por conveniência
  // legados, mantidos para compatibilidade com perfis existentes
  | "student"
  | "postgraduate"
  | "physiotherapist";

export const ROLE_LABEL: Record<Role, string> = {
  teacher: "Professor(a)",
  pe_student: "Estudante de Educação Física",
  practitioner: "Aluno(a) praticante",
  admin: "Administração",
  student: "Estudante (cadastro anterior — revisar papel)",
  postgraduate: "Pós-graduação (cadastro anterior — revisar papel)",
  physiotherapist: "Fisioterapeuta (cadastro anterior)",
};

export type Action =
  | "trainee.read"
  | "trainee.write"
  | "assessment.read"
  | "assessment.write"
  | "plan.draft"
  | "plan.approve"
  | "plan.publish"
  | "plan.readPublished"
  | "execution.log"
  | "access.manage";

const MATRIX: Record<Role, Action[]> = {
  teacher: [
    "trainee.read",
    "trainee.write",
    "assessment.read",
    "assessment.write",
    "plan.draft",
    "plan.approve",
    "plan.publish",
    "plan.readPublished",
  ],
  // Estudante: trabalha em casos didáticos e rascunhos; não aprova nem publica.
  pe_student: ["trainee.read", "trainee.write", "assessment.read", "assessment.write", "plan.draft"],
  practitioner: ["plan.readPublished", "execution.log"],
  admin: ["access.manage"],
  // Legados: mantêm o que já faziam (avaliações próprias) sem ganhar publicação de treino.
  student: ["assessment.read", "assessment.write"],
  postgraduate: ["assessment.read", "assessment.write"],
  physiotherapist: ["trainee.read", "trainee.write", "assessment.read", "assessment.write", "plan.draft", "plan.approve", "plan.publish", "plan.readPublished"],
};

export function can(role: Role, action: Action): boolean {
  return MATRIX[role]?.includes(action) ?? false;
}

export class PermissionError extends Error {
  constructor(public action: Action, public reason: string) {
    super(reason);
    this.name = "PermissionError";
  }
}
