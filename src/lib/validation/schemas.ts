// ==============================================================================
// STUDIO LEANDRO RANGEL - Validation Schemas
// ==============================================================================
// Schemas Zod para validação server-side de todos os dados de entrada.

import { z } from "zod";

// Tipos de usuário válidos
const userRoleSchema = z.enum([
  "student",
  "postgraduate",
  "physiotherapist",
  "admin",
  "teacher",
  "pe_student",
  "practitioner",
]);

const accessStatusSchema = z.enum([
  "pending",
  "active",
  "paused",
  "expired",
  "revoked",
]);

// ============================================================================
// AUTH E PERFIL
// ============================================================================

export const emailSchema = z
  .string()
  .email("Email inválido")
  .min(3, "Email muito curto")
  .max(254, "Email muito longo")
  .toLowerCase()
  .trim();

export const passwordSchema = z
  .string()
  .min(8, "Senha deve ter no mínimo 8 caracteres")
  .max(128, "Senha muito longa");

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const resetPasswordSchema = z.object({
  email: emailSchema,
});

export const updatePasswordSchema = z.object({
  password: passwordSchema,
});

export const accessRequestSchema = z.object({
  fullName: z.string().trim().min(3, "Nome muito curto").max(100, "Nome muito longo"),
  email: emailSchema,
  role: z.enum(["teacher", "pe_student"]),
  institution: z.string().trim().min(2, "Instituição muito curta").max(200, "Instituição muito longa"),
  motivation: z.string().trim().max(1000, "Motivação muito longa").optional(),
  acceptedTerms: z.literal(true),
});

// ============================================================================
// ADMIN OPERATIONS
// ============================================================================

export const adminActionSchema = z.object({
  targetUserId: z.string().uuid("ID de usuário inválido"),
  notes: z.string().max(500, "Notas muito longas").optional(),
});

export const extendTrialSchema = z.object({
  targetUserId: z.string().uuid("ID de usuário inválido"),
  extensionDays: z.number().int().min(1).max(365, "Extensão máxima é 365 dias"),
  notes: z.string().max(500, "Notas muito longas").optional(),
});

// ============================================================================
// TRAINEES (ALUNOS)
// ============================================================================

export const traineeCodeSchema = z
  .string()
  .trim()
  .min(1, "Código é obrigatório")
  .max(50, "Código muito longo")
  .regex(/^[A-Z0-9\-_]+$/i, "Código deve conter apenas letras, números, hífen e underscore");

export const createTraineeSchema = z.object({
  code: traineeCodeSchema,
  display_name: z.string().trim().min(2, "Nome muito curto").max(100, "Nome muito longo"),
  birth_year: z
    .number()
    .int()
    .min(1900, "Ano inválido")
    .max(new Date().getFullYear(), "Ano não pode ser futuro")
    .optional()
    .nullable(),
  goal: z.string().max(500, "Objetivo muito longo").optional(),
  experience: z.enum(["iniciante", "intermediario", "avancado", "nao_informado"]).optional(),
  is_didactic: z.boolean().optional(),
});

export const updateTraineeSchema = z.object({
  display_name: z.string().trim().min(2, "Nome muito curto").max(100, "Nome muito longo").optional(),
  birth_year: z
    .number()
    .int()
    .min(1900, "Ano inválido")
    .max(new Date().getFullYear(), "Ano não pode ser futuro")
    .optional()
    .nullable(),
  goal: z.string().max(500, "Objetivo muito longo").optional(),
  experience: z.enum(["iniciante", "intermediario", "avancado", "nao_informado"]).optional(),
});

// ============================================================================
// ASSESSMENTS (AVALIAÇÕES)
// ============================================================================

export const patientCodeSchema = z
  .string()
  .trim()
  .min(1, "Código do paciente é obrigatório")
  .max(50, "Código muito longo")
  .regex(/^[A-Z0-9\-_]+$/i, "Código inválido");

export const patientInitialsSchema = z
  .string()
  .trim()
  .max(4, "Iniciais devem ter no máximo 4 caracteres")
  .regex(/^[A-Z\.]+$/i, "Iniciais devem conter apenas letras e pontos")
  .optional()
  .nullable();

export const createAssessmentSchema = z.object({
  trainee_id: z.string().uuid("ID de aluno inválido").optional().nullable(),
  patient_code: patientCodeSchema,
  patient_initials: patientInitialsSchema,
  complaint: z.string().trim().min(3, "Queixa muito curta").max(1000, "Queixa muito longa"),
  assessment_date: z.string().date("Data inválida").optional(),
  pain_region: z.string().max(200, "Região muito longa").optional().nullable(),
  current_stage: z.number().int().min(0).max(10).optional(),
  status: z.enum(["draft", "completed"]).optional(),
  data: z.record(z.string(), z.any()).optional(),
});

export const updateAssessmentSchema = z.object({
  patient_code: patientCodeSchema.optional(),
  patient_initials: patientInitialsSchema,
  complaint: z.string().trim().min(3, "Queixa muito curta").max(1000, "Queixa muito longa").optional(),
  pain_region: z.string().max(200, "Região muito longa").optional().nullable(),
  current_stage: z.number().int().min(0).max(10).optional(),
  status: z.enum(["draft", "completed"]).optional(),
  data: z.record(z.string(), z.any()).optional(),
  blocks: z.record(z.string(), z.any()).optional().nullable(),
});

// ============================================================================
// BODY MAP (MAPA CORPORAL)
// ============================================================================

export const bodyMapEntrySchema = z.object({
  assessment_id: z.string().uuid("ID de avaliação inválido"),
  region_id: z.string().min(1).max(50, "ID de região muito longo"),
  intensity: z.number().int().min(0).max(10).optional().nullable(),
  quality: z.string().max(200).optional().nullable(),
  onset: z.string().max(200).optional().nullable(),
  frequency: z.string().max(200).optional().nullable(),
  radiates: z.string().max(200).optional().nullable(),
  aggravating: z.string().max(500).optional().nullable(),
  easing: z.string().max(500).optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
  free_x: z.number().min(0).max(1).optional().nullable(),
  free_y: z.number().min(0).max(1).optional().nullable(),
  view: z.enum(["anterior", "posterior"]).optional().nullable(),
});

// ============================================================================
// EXERCISE SETS (SÉRIES DE EXERCÍCIO)
// ============================================================================

export const exerciseSetSchema = z.object({
  assessment_id: z.string().uuid("ID de avaliação inválido"),
  exercise_name: z.string().trim().min(1, "Nome do exercício é obrigatório").max(200, "Nome muito longo"),
  performed_date: z.string().date("Data inválida"),
  set_number: z.number().int().min(1, "Número da série deve ser positivo"),
  reps: z.number().int().min(0, "Repetições não podem ser negativas"),
  load_kg: z.number().min(0, "Carga não pode ser negativa").max(999.99, "Carga muito alta"),
  is_completed: z.boolean().optional(),
  modality: z.enum(["weight", "bodyweight", "band", "pilates"]).optional(),
  notes: z.string().max(500, "Notas muito longas").optional().nullable(),
});

// ============================================================================
// PLANS (PLANOS DE ASSINATURA)
// ============================================================================

export const planIdSchema = z.enum(["essencial", "evolucao", "completo"]);

export const selectPlanIntentSchema = z.object({
  planId: planIdSchema,
});

// ============================================================================
// HELPERS
// ============================================================================

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Valida dados contra um schema Zod e retorna resultado tipado.
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Formata erros de forma amigável
  const issues = (result.error as any).issues || (result.error as any).errors || [];
  const firstError = issues[0];
  const errorMessage = firstError
    ? `${firstError.path.join(".")}: ${firstError.message}`
    : "Dados inválidos";

  return { success: false, error: errorMessage };
}

/**
 * Sanitiza string removendo caracteres perigosos mas preservando acentos.
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove < e > (proteção básica XSS)
    .slice(0, maxLength);
}

/**
 * Valida UUID.
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Valida que valor é um inteiro positivo.
 */
export function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

/**
 * Valida que valor está dentro de um range.
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}
