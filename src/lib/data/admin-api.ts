// Tela de administração no modo real: Edge Function "admin-access".
// A verificação de administrador acontece no servidor e no banco (is_admin()).
import { callFunction } from "@/lib/supabase/functions";
import type { AccessAuditRecord, UserAccessProfile } from "@/lib/access-policy";

interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  institution: string | null;
  role: UserAccessProfile["role"];
  status: UserAccessProfile["status"];
  trial_started_at: string | null;
  trial_expires_at: string | null;
  created_at: string;
}

interface AuditRow {
  id: string;
  admin_id: string;
  target_user_id: string;
  action: AccessAuditRecord["action"];
  previous_status: AccessAuditRecord["previousStatus"];
  new_status: AccessAuditRecord["newStatus"];
  extension_days: number | null;
  notes: string | null;
  created_at: string;
}

export type AdminAction = "approve" | "pause" | "resume" | "extend" | "revoke";

export async function loadAccounts(): Promise<UserAccessProfile[]> {
  const r = await callFunction<{ items: ProfileRow[] }>("admin-access", "?status=all");
  return r.items.map((p) => ({
    id: p.id,
    email: p.email,
    fullName: p.full_name,
    institution: p.institution ?? undefined,
    role: p.role,
    status: p.status,
    trialStartedAt: p.trial_started_at,
    trialExpiresAt: p.trial_expires_at,
    pausedRemainingSeconds: 0,
    createdAt: p.created_at,
    updatedAt: p.created_at,
  }));
}

export async function loadAudit(accounts: UserAccessProfile[]): Promise<AccessAuditRecord[]> {
  const email = (id: string) => accounts.find((a) => a.id === id)?.email ?? `conta ${id.slice(0, 8)}`;
  const r = await callFunction<{ items: AuditRow[] }>("admin-access", "/audit");
  return r.items.map((a) => ({
    id: a.id,
    adminId: a.admin_id,
    adminEmail: email(a.admin_id),
    targetUserId: a.target_user_id,
    targetUserEmail: email(a.target_user_id),
    action: a.action,
    previousStatus: a.previous_status,
    newStatus: a.new_status,
    extensionDays: a.extension_days ?? undefined,
    notes: a.notes ?? "",
    createdAt: a.created_at,
  }));
}

// ---------- Pedidos de acesso (nome e e-mail) ----------
export type RequestStatus = "pendente" | "aprovado" | "convidado" | "ativado" | "recusado" | "conta_existente";
export interface AccessRequest {
  id: string;
  full_name: string;
  email: string;
  status: RequestStatus;
  request_count: number;
  created_at: string;
  last_requested_at: string;
  decided_at: string | null;
  invite_count: number;
  invite_sent_at: string | null;
  invite_channel: "email" | "link" | null;
  invite_email_ok: boolean | null;
  activated_at: string | null;
}

/** Situação do envio de e-mail no servidor: ready (entrega a qualquer e-mail), test_sender (remetente
 *  de teste do Resend, só entrega ao dono da conta) ou not_configured. */
export type MailStatus = "ready" | "test_sender" | "not_configured";
export type MailOutcome = "sent" | "not_configured" | "test_sender" | "failed";

export interface RequestQueue {
  items: AccessRequest[];
  /** Validade dos links, em horas (vem do servidor; versões antigas não mandam). */
  linkHours: number;
  mail: MailStatus | null;
}

export async function loadRequests(status: RequestStatus | "all" = "all"): Promise<RequestQueue> {
  const r = await callFunction<{ items: AccessRequest[]; link_hours?: number; mail?: MailStatus }>("admin-access", `/requests?status=${status}`);
  return { items: r.items, linkHours: r.link_hours ?? 1, mail: r.mail ?? null };
}

export interface InviteResult {
  id: string;
  status: RequestStatus;
  /** invite: primeiro acesso · password: conta já ativada recebe link para criar nova senha */
  kind?: "invite" | "password";
  emailed: boolean;
  email?: MailOutcome;
  /** Cópia do link só quando o e-mail não saiu (plano B por outro canal). */
  link: string | null;
  link_withheld?: boolean;
  validity: string;
  validity_hours?: number;
}

/** Aprova e envia o convite ao e-mail do pedido (ou reenvia). O link só volta se o e-mail não saiu. */
export async function inviteRequest(id: string) {
  return callFunction<InviteResult>("admin-access", `/requests/${id}/invite`, { method: "POST" });
}

export async function rejectRequest(id: string) {
  return callFunction<{ id: string; status: RequestStatus }>("admin-access", `/requests/${id}/reject`, { method: "POST" });
}

export async function runAdminAction(target: string, action: AdminAction, days?: number, note?: string) {
  return callFunction<{ id: string; status: string }>("admin-access", "", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ target, action, days, note }),
  });
}
