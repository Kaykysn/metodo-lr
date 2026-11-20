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

export async function loadRequests(status: RequestStatus | "all" = "all"): Promise<AccessRequest[]> {
  const r = await callFunction<{ items: AccessRequest[] }>("admin-access", `/requests?status=${status}`);
  return r.items;
}

/** Aprova e gera o convite (ou gera um novo). O link volta só para o admin, para enviar por outro canal. */
export async function inviteRequest(id: string) {
  return callFunction<{ id: string; status: RequestStatus; emailed: boolean; link: string; validity: string }>("admin-access", `/requests/${id}/invite`, { method: "POST" });
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
