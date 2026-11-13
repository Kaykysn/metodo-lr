// ==============================================================================
// Sessão real (Supabase): identidade vem do auth.uid() e do perfil no banco.
// O cliente nunca escolhe o próprio papel; ele só lê o que o banco devolve.
// ==============================================================================
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Actor } from "@/lib/domain/types";
import type { Role } from "@/lib/domain/roles";
import { evaluateAccessEntitlement, type TrialTimeRemaining, type UserAccessProfile } from "@/lib/access-policy";
import type { AdminStatus, TrialWindow } from "@/lib/subscription/entitlements";

/** Dados de conta que a tela de plano/acesso precisa (sem dados de saúde). */
export interface AccountInfo {
  email: string;
  fullName: string;
  adminStatus: AdminStatus;
  trial: TrialWindow;
}

export type SessionState =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "error"; message: string }
  | { status: "blocked"; reason: "pending" | "paused" | "expired" | "revoked" | "no_profile" | "unknown_role"; actor?: Actor; entitlement?: TrialTimeRemaining; account?: AccountInfo }
  | { status: "active"; actor: Actor; entitlement: TrialTimeRemaining | null; account?: AccountInfo };

const ROLES: Role[] = ["teacher", "pe_student", "practitioner", "admin", "student", "postgraduate", "physiotherapist"];

function toAccessProfile(r: any): UserAccessProfile {
  return {
    id: r.id,
    email: r.email,
    fullName: r.full_name,
    institution: r.institution ?? undefined,
    role: r.role,
    status: r.status,
    trialStartedAt: r.trial_started_at,
    trialExpiresAt: r.trial_expires_at,
    pausedRemainingSeconds: r.paused_remaining_seconds ?? 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  } as UserAccessProfile;
}

export async function loadSession(db: SupabaseClient): Promise<SessionState> {
  const { data: auth, error: authErr } = await db.auth.getUser();
  if (authErr || !auth.user) return { status: "signed_out" };

  let { data: profile, error } = await db.from("profiles").select("*").eq("id", auth.user.id).maybeSingle();
  if (error) return { status: "error", message: error.message };
  if (!profile) return { status: "blocked", reason: "no_profile" };

  // Primeiro acesso após aprovação: o banco inicia os 30 dias (só para o próprio usuário)
  if (profile.status === "active" && !profile.trial_started_at && profile.role !== "admin") {
    const { data, error: rpcErr } = await db.rpc("activate_my_trial");
    if (rpcErr) return { status: "error", message: rpcErr.message };
    profile = data ?? profile;
  }

  const adminStatus: AdminStatus = profile.status === "expired" ? "active" : profile.status;
  const account: AccountInfo = {
    email: profile.email ?? "",
    fullName: profile.full_name ?? "",
    adminStatus,
    trial: { startedAt: profile.trial_started_at ?? null, expiresAt: profile.trial_expires_at ?? null },
  };
  // Papel desconhecido continua bloqueado (não vira professor nem administração)
  if (!ROLES.includes(profile.role)) return { status: "blocked", reason: "unknown_role", account };
  const role: Role = profile.role;
  const actor: Actor = { id: profile.id, name: profile.full_name, role, supervisorId: profile.supervisor_id ?? undefined };

  if (role === "practitioner") {
    const { data: t } = await db.from("trainees").select("id").eq("practitioner_user_id", profile.id).maybeSingle();
    actor.traineeId = t?.id;
  }

  // Administração não depende do teste de 30 dias
  if (role === "admin") return profile.status === "active" ? { status: "active", actor, entitlement: null, account } : { status: "blocked", reason: profile.status, actor, account };

  // Controle de acesso vigente preservado: teste vencido continua bloqueando a área
  // interna até a cobrança e as regras de servidor existirem (INTEGRACAO_PAGAMENTOS_LOGIN.md).
  const entitlement = evaluateAccessEntitlement(toAccessProfile(profile));
  if (entitlement.isActive) return { status: "active", actor, entitlement, account };
  const reason = entitlement.isPending ? "pending" : entitlement.isPaused ? "paused" : entitlement.isRevoked ? "revoked" : "expired";
  return { status: "blocked", reason, actor, entitlement, account };
}
