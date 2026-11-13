// ==============================================================================
// STUDIO LEANDRO RANGEL - Lógica e Políticas de Acesso (Trial de 30 Dias)
// ==============================================================================
// Regras Fundamentais:
// 1. Cada usuário aprovado recebe exatamente 30 dias gratuitos.
// 2. O site principal NUNCA é desligado com a expiração de um indivíduo.
// 3. trial_started_at e trial_expires_at iniciam atomicamente no PRIMEIRO ACESSO após aprovação.
// 4. Pausar: congela o tempo restante (paused_remaining_seconds).
// 5. Retomar: recalcula nova data de expiração = now() + paused_remaining_seconds.
// 6. Revogação: bloqueio imediato com registro de auditoria.
// 7. Todos os timestamps são tratados em UTC no servidor e exibidos em America/Sao_Paulo.

export type AccessStatus = "pending" | "active" | "paused" | "expired" | "revoked";
export type UserRole = "student" | "postgraduate" | "physiotherapist" | "admin";

export interface UserAccessProfile {
  id: string;
  email: string;
  fullName: string;
  institution?: string;
  role: UserRole;
  status: AccessStatus;
  trialStartedAt: string | null; // ISO UTC
  trialExpiresAt: string | null; // ISO UTC
  pausedRemainingSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface AccessAuditRecord {
  id: string;
  adminId: string;
  adminEmail: string;
  targetUserId: string;
  targetUserEmail: string;
  action: "approve" | "pause" | "resume" | "extend" | "revoke" | "role_change";
  previousStatus: AccessStatus;
  newStatus: AccessStatus;
  extensionDays?: number;
  notes: string;
  createdAt: string;
}

export interface TrialTimeRemaining {
  isExpired: boolean;
  isPaused: boolean;
  isPending: boolean;
  isRevoked: boolean;
  isActive: boolean;
  totalSecondsRemaining: number;
  daysRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
  formattedExpiresAt: string;
  formattedStartedAt: string;
  progressPercentage: number; // 0 to 100% de tempo consumido
}

const SAO_PAULO_TZ = "America/Sao_Paulo";
const TRIAL_DURATION_SECONDS = 30 * 24 * 60 * 60; // 30 dias

/**
 * Formata data no padrão brasileiro com fuso horário America/Sao_Paulo
 */
export function formatSaoPauloDate(isoDateString: string | null): string {
  if (!isoDateString) return "Não iniciado";
  try {
    const date = new Date(isoDateString);
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: SAO_PAULO_TZ,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "Data inválida";
  }
}

/**
 * Calcula o tempo restante e o estado do trial com base em timestamps UTC
 */
export function evaluateAccessEntitlement(
  profile: UserAccessProfile,
  currentTimeMs: number = Date.now()
): TrialTimeRemaining {
  if (profile.status === "pending") {
    return {
      isExpired: false,
      isPaused: false,
      isPending: true,
      isRevoked: false,
      isActive: false,
      totalSecondsRemaining: TRIAL_DURATION_SECONDS,
      daysRemaining: 30,
      hoursRemaining: 0,
      minutesRemaining: 0,
      formattedExpiresAt: "Aguardando aprovação e primeiro acesso",
      formattedStartedAt: "Pendente",
      progressPercentage: 0,
    };
  }

  if (profile.status === "revoked") {
    return {
      isExpired: false,
      isPaused: false,
      isPending: false,
      isRevoked: true,
      isActive: false,
      totalSecondsRemaining: 0,
      daysRemaining: 0,
      hoursRemaining: 0,
      minutesRemaining: 0,
      formattedExpiresAt: "Acesso revogado pela moderação",
      formattedStartedAt: formatSaoPauloDate(profile.trialStartedAt),
      progressPercentage: 100,
    };
  }

  if (profile.status === "paused") {
    const days = Math.floor(profile.pausedRemainingSeconds / (24 * 3600));
    const hours = Math.floor((profile.pausedRemainingSeconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((profile.pausedRemainingSeconds % 3600) / 60);

    return {
      isExpired: false,
      isPaused: true,
      isPending: false,
      isRevoked: false,
      isActive: false,
      totalSecondsRemaining: profile.pausedRemainingSeconds,
      daysRemaining: days,
      hoursRemaining: hours,
      minutesRemaining: minutes,
      formattedExpiresAt: "Pausado (tempo restante congelado)",
      formattedStartedAt: formatSaoPauloDate(profile.trialStartedAt),
      progressPercentage: Math.max(0, Math.min(100, ((TRIAL_DURATION_SECONDS - profile.pausedRemainingSeconds) / TRIAL_DURATION_SECONDS) * 100)),
    };
  }

  // Se o trial ainda não iniciou (aprovado mas ainda não entrou no primeiro acesso protegido):
  if (!profile.trialExpiresAt) {
    return {
      isExpired: false,
      isPaused: false,
      isPending: false,
      isRevoked: false,
      isActive: true,
      totalSecondsRemaining: TRIAL_DURATION_SECONDS,
      daysRemaining: 30,
      hoursRemaining: 0,
      minutesRemaining: 0,
      formattedExpiresAt: "Iniciará no primeiro acesso",
      formattedStartedAt: "Aprovado (não iniciado)",
      progressPercentage: 0,
    };
  }

  const expiresTimeMs = new Date(profile.trialExpiresAt).getTime();
  const startTimeMs = profile.trialStartedAt ? new Date(profile.trialStartedAt).getTime() : expiresTimeMs - TRIAL_DURATION_SECONDS * 1000;
  
  const diffMs = expiresTimeMs - currentTimeMs;

  if (diffMs <= 0) {
    return {
      isExpired: true,
      isPaused: false,
      isPending: false,
      isRevoked: false,
      isActive: false,
      totalSecondsRemaining: 0,
      daysRemaining: 0,
      hoursRemaining: 0,
      minutesRemaining: 0,
      formattedExpiresAt: formatSaoPauloDate(profile.trialExpiresAt),
      formattedStartedAt: formatSaoPauloDate(profile.trialStartedAt),
      progressPercentage: 100,
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / (24 * 3600));
  const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const totalTrialDurationMs = Math.max(1, expiresTimeMs - startTimeMs);
  const elapsedMs = currentTimeMs - startTimeMs;
  const progressPercentage = Math.min(100, Math.max(0, (elapsedMs / totalTrialDurationMs) * 100));

  return {
    isExpired: false,
    isPaused: false,
    isPending: false,
    isRevoked: false,
    isActive: true,
    totalSecondsRemaining: totalSeconds,
    daysRemaining: days,
    hoursRemaining: hours,
    minutesRemaining: minutes,
    formattedExpiresAt: formatSaoPauloDate(profile.trialExpiresAt),
    formattedStartedAt: formatSaoPauloDate(profile.trialStartedAt),
    progressPercentage: Math.round(progressPercentage),
  };
}

/**
 * Ativa atomicamente o trial no primeiro acesso autorizado do usuário
 */
export function activateTrialAtomically(profile: UserAccessProfile): UserAccessProfile {
  if (profile.status === "active" && !profile.trialStartedAt) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TRIAL_DURATION_SECONDS * 1000);
    return {
      ...profile,
      trialStartedAt: now.toISOString(),
      trialExpiresAt: expiresAt.toISOString(),
      updatedAt: now.toISOString(),
    };
  }
  return profile;
}

/**
 * Ações Administrativas de Transição de Estado com Proteção contra Erros
 */
export function adminApproveUser(profile: UserAccessProfile, adminEmail: string): { updatedProfile: UserAccessProfile; audit: AccessAuditRecord } {
  const previousStatus = profile.status;
  const now = new Date();
  // Quando aprovado, status se torna 'active'. trialStartedAt permanece null até o primeiro acesso real!
  const updatedProfile: UserAccessProfile = {
    ...profile,
    status: "active",
    updatedAt: now.toISOString(),
  };

  const audit: AccessAuditRecord = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    adminId: "admin-master",
    adminEmail,
    targetUserId: profile.id,
    targetUserEmail: profile.email,
    action: "approve",
    previousStatus,
    newStatus: "active",
    notes: "Aprovação concedida pelo administrador. Os 30 dias começarão no primeiro acesso.",
    createdAt: now.toISOString(),
  };

  return { updatedProfile, audit };
}

export function adminPauseUser(profile: UserAccessProfile, adminEmail: string): { updatedProfile: UserAccessProfile; audit: AccessAuditRecord } {
  if (profile.status !== "active") {
    throw new Error("Apenas acessos ativos podem ser pausados.");
  }

  const now = new Date();
  const evaluation = evaluateAccessEntitlement(profile, now.getTime());
  const remainingSeconds = evaluation.totalSecondsRemaining;

  const updatedProfile: UserAccessProfile = {
    ...profile,
    status: "paused",
    pausedRemainingSeconds: remainingSeconds,
    updatedAt: now.toISOString(),
  };

  const audit: AccessAuditRecord = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    adminId: "admin-master",
    adminEmail,
    targetUserId: profile.id,
    targetUserEmail: profile.email,
    action: "pause",
    previousStatus: "active",
    newStatus: "paused",
    notes: `Acesso congelado com ${Math.floor(remainingSeconds / 86400)} dias restantes preservados.`,
    createdAt: now.toISOString(),
  };

  return { updatedProfile, audit };
}

export function adminResumeUser(profile: UserAccessProfile, adminEmail: string): { updatedProfile: UserAccessProfile; audit: AccessAuditRecord } {
  if (profile.status !== "paused") {
    throw new Error("Apenas acessos pausados podem ser retomados.");
  }

  const now = new Date();
  const secondsToRestore = profile.pausedRemainingSeconds > 0 ? profile.pausedRemainingSeconds : TRIAL_DURATION_SECONDS;
  const newExpiresAt = new Date(now.getTime() + secondsToRestore * 1000);

  const updatedProfile: UserAccessProfile = {
    ...profile,
    status: "active",
    trialExpiresAt: newExpiresAt.toISOString(),
    pausedRemainingSeconds: 0,
    updatedAt: now.toISOString(),
  };

  const audit: AccessAuditRecord = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    adminId: "admin-master",
    adminEmail,
    targetUserId: profile.id,
    targetUserEmail: profile.email,
    action: "resume",
    previousStatus: "paused",
    newStatus: "active",
    notes: `Acesso reativado a partir do saldo restante. Nova expiração calculada.`,
    createdAt: now.toISOString(),
  };

  return { updatedProfile, audit };
}

export function adminExtendUser(profile: UserAccessProfile, additionalDays: number, adminEmail: string): { updatedProfile: UserAccessProfile; audit: AccessAuditRecord } {
  const previousStatus = profile.status;
  const now = new Date();
  const currentExpiryMs = profile.trialExpiresAt ? new Date(profile.trialExpiresAt).getTime() : now.getTime();
  const baseMs = Math.max(currentExpiryMs, now.getTime());
  const newExpiry = new Date(baseMs + additionalDays * 24 * 3600 * 1000);

  const updatedProfile: UserAccessProfile = {
    ...profile,
    status: "active",
    trialExpiresAt: newExpiry.toISOString(),
    updatedAt: now.toISOString(),
  };

  const audit: AccessAuditRecord = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    adminId: "admin-master",
    adminEmail,
    targetUserId: profile.id,
    targetUserEmail: profile.email,
    action: "extend",
    previousStatus,
    newStatus: "active",
    extensionDays: additionalDays,
    notes: `Prazo estendido em +${additionalDays} dias pelo administrador.`,
    createdAt: now.toISOString(),
  };

  return { updatedProfile, audit };
}

export function adminRevokeUser(profile: UserAccessProfile, reason: string, adminEmail: string): { updatedProfile: UserAccessProfile; audit: AccessAuditRecord } {
  const previousStatus = profile.status;
  const now = new Date();

  const updatedProfile: UserAccessProfile = {
    ...profile,
    status: "revoked",
    updatedAt: now.toISOString(),
  };

  const audit: AccessAuditRecord = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    adminId: "admin-master",
    adminEmail,
    targetUserId: profile.id,
    targetUserEmail: profile.email,
    action: "revoke",
    previousStatus,
    newStatus: "revoked",
    notes: `Acesso revogado: ${reason}`,
    createdAt: now.toISOString(),
  };

  return { updatedProfile, audit };
}
