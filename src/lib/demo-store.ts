// ==============================================================================
// STUDIO LEANDRO RANGEL - Gerenciador de Estado em Memória da Demonstração
// ==============================================================================
// 1. Opera estritamente isolado da produção.
// 2. Não grava nem consulta registros de alunos reais.
// 3. Permite reset instantâneo aos dados padrão de fábrica.
// 4. Simulador de estados de acesso permite alternar entre:
//    - Ativo (30 dias restantes)
//    - Aguardando Aprovação
//    - Acesso Expirado
//    - Acesso Pausado
//    - Administrador (com console de liberação)

import { AssessmentRecord, DEMO_ASSESSMENT_FIXTURE } from "./assessment-fixtures";
import { FIXTURE_EXERCISE_SETS_FEB_2027, ExerciseSetRecord } from "./volume";
import { UserAccessProfile, AccessAuditRecord } from "./access-policy";

export type DemoSimulatedState = "active_full" | "active_few_days" | "pending" | "paused" | "expired" | "admin";

export const INITIAL_DEMO_USERS: UserAccessProfile[] = [
  {
    id: "usr-01",
    email: "carla.educacaofisica@exemplo.com.br",
    fullName: "Dra. Carla Medeiros",
    institution: "Hospital das Clínicas / Pós-graduação",
    role: "physiotherapist",
    status: "active",
    trialStartedAt: new Date(Date.now() - 5 * 86400 * 1000).toISOString(),
    trialExpiresAt: new Date(Date.now() + 25 * 86400 * 1000).toISOString(),
    pausedRemainingSeconds: 0,
    createdAt: new Date(Date.now() - 6 * 86400 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 86400 * 1000).toISOString(),
  },
  {
    id: "usr-02",
    email: "rodrigo.pos@exemplo.com.br",
    fullName: "Rodrigo Silveira",
    institution: "Universidade Federal de Educação Física",
    role: "postgraduate",
    status: "pending",
    trialStartedAt: null,
    trialExpiresAt: null,
    pausedRemainingSeconds: 0,
    createdAt: new Date(Date.now() - 1 * 86400 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400 * 1000).toISOString(),
  },
  {
    id: "usr-03",
    email: "mariana.aluna@exemplo.com.br",
    fullName: "Mariana Costa",
    institution: "Estudante 8º Período",
    role: "student",
    status: "paused",
    trialStartedAt: new Date(Date.now() - 10 * 86400 * 1000).toISOString(),
    trialExpiresAt: new Date(Date.now() + 20 * 86400 * 1000).toISOString(),
    pausedRemainingSeconds: 20 * 86400, // 20 dias congelados
    createdAt: new Date(Date.now() - 12 * 86400 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400 * 1000).toISOString(),
  },
  {
    id: "usr-04",
    email: "fernando.fisio@exemplo.com.br",
    fullName: "Fernando Santos",
    institution: "Clínica Movimento & Coluna",
    role: "physiotherapist",
    status: "expired",
    trialStartedAt: new Date(Date.now() - 35 * 86400 * 1000).toISOString(),
    trialExpiresAt: new Date(Date.now() - 5 * 86400 * 1000).toISOString(),
    pausedRemainingSeconds: 0,
    createdAt: new Date(Date.now() - 36 * 86400 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 86400 * 1000).toISOString(),
  },
  {
    id: "usr-admin",
    email: "admin@studioleandrorangel.com.br",
    fullName: "Leandro Rangel (Admin)",
    institution: "Studio Leandro Rangel Ensino",
    role: "admin",
    status: "active",
    trialStartedAt: new Date(Date.now() - 60 * 86400 * 1000).toISOString(),
    trialExpiresAt: new Date(Date.now() + 365 * 86400 * 1000).toISOString(),
    pausedRemainingSeconds: 0,
    createdAt: new Date(Date.now() - 60 * 86400 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 60 * 86400 * 1000).toISOString(),
  },
];

export const INITIAL_DEMO_AUDIT_LOGS: AccessAuditRecord[] = [
  {
    id: "aud-01",
    adminId: "usr-admin",
    adminEmail: "admin@studioleandrorangel.com.br",
    targetUserId: "usr-01",
    targetUserEmail: "carla.educacaofisica@exemplo.com.br",
    action: "approve",
    previousStatus: "pending",
    newStatus: "active",
    notes: "Acesso de 30 dias liberado para profissional de pós-graduação.",
    createdAt: new Date(Date.now() - 5 * 86400 * 1000).toISOString(),
  },
  {
    id: "aud-02",
    adminId: "usr-admin",
    adminEmail: "admin@studioleandrorangel.com.br",
    targetUserId: "usr-03",
    targetUserEmail: "mariana.aluna@exemplo.com.br",
    action: "pause",
    previousStatus: "active",
    newStatus: "paused",
    notes: "Pausa solicitada pela usuária durante período de viagens de congresso.",
    createdAt: new Date(Date.now() - 2 * 86400 * 1000).toISOString(),
  },
];
