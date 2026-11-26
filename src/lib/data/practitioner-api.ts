// Acesso do aluno à própria ficha (modo real): Edge Function "practitioner-access".
// Quem pode convidar e para qual e-mail é decidido no servidor e no banco.
import { callFunction } from "@/lib/supabase/functions";
import type { MailOutcome, MailStatus } from "@/lib/data/admin-api";

/** none: sem acesso · invited: convite enviado, senha ainda não criada · active: aluno entra · blocked: acesso suspenso */
export type PractitionerStatus = "none" | "invited" | "active" | "blocked";

export interface PractitionerAccess {
  status: PractitionerStatus;
  email?: string | null;
  invited_at?: string | null;
  invite_count?: number;
  email_ok?: boolean | null;
  activated_at?: string | null;
  link_hours: number;
  mail: MailStatus;
}

export interface PractitionerInvite extends PractitionerAccess {
  /** invite: primeiro acesso · password: aluno que já tem senha recebe link para criar nova */
  kind: "invite" | "password";
  emailed: boolean;
  email_outcome: MailOutcome;
  /** Cópia do link só quando o e-mail não saiu; nunca para nova senha de aluno já ativado. */
  link: string | null;
  link_withheld?: boolean;
  validity: string;
}

export const loadPractitionerAccess = (trainee: string) =>
  callFunction<PractitionerAccess>("practitioner-access", `/${trainee}`);

export const invitePractitioner = (trainee: string, email: string) =>
  callFunction<PractitionerInvite>("practitioner-access", `/${trainee}/invite`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });

export const removePractitioner = (trainee: string) =>
  callFunction<PractitionerAccess>("practitioner-access", `/${trainee}/remove`, { method: "POST" });
