// ==============================================================================
// Ciclo de vida do treino: rascunho → aprovado → publicado → (substituído)
// Reavaliar não altera versões existentes: gera proposta de nova versão.
// ==============================================================================
import type { Actor, Assessment, PlanVersion, PrescribedExercise, TrainingPlan, TrainingSession, SuggestionTrace } from "./types";
import { can, PermissionError } from "./roles";
import type { SuggestionResult } from "./suggestion-rules";
import { EXERCISE_BY_ID, type ExerciseCard } from "./exercise-library";

let seq = 0;
export const newId = (p: string) => `${p}_${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function defaultPrescription(ex: ExerciseCard): PrescribedExercise {
  const timed = ex.loadKind === "time_or_distance";
  return {
    id: newId("px"),
    exerciseId: ex.id,
    exerciseName: ex.name,
    exerciseSource: ex.source ?? "lr",
    dose: timed ? { kind: "time", sets: 2, seconds: 30 } : { kind: "reps", sets: 2, repsMin: 8, repsMax: 12 },
    resistance:
      ex.loadKind === "external_kg"
        ? { kind: "external_kg", kg: null }
        : ex.loadKind === "band"
          ? { kind: "band", color: "", note: "" }
          : ex.loadKind === "pilates_springs"
            ? { kind: "pilates_springs", apparatus: ex.equipment[0] ?? "", springs: "", setup: "" }
            : { kind: "bodyweight" },
    effort: { scale: "none" },
    restSeconds: timed ? 45 : 90,
    rangeNote: "",
    regression: ex.regressions.map((id) => EXERCISE_BY_ID.get(id)?.name).filter(Boolean).join(", "),
    progression: ex.progressions.map((id) => EXERCISE_BY_ID.get(id)?.name).filter(Boolean).join(", "),
    cues: ex.execution,
    reviewCriteria: "",
    privateNote: "",
    ...(ex.detail?.prescriptionFields.includes("cadência") ? { tempo: "" } : {}),
    ...(ex.detail?.prescriptionFields.includes("tempo de sustentação") ? { holdSeconds: null } : {}),
    ...(ex.purposes.includes("reabilitacao") ? { rehab: emptyRehab() } : {}),
  };
}

export function emptyRehab() {
  return { phase: "", restrictions: "", symptomsDuring: "", symptomsAfter: "", toleratedRange: "", progressionCriterion: "" };
}

/**
 * Adiciona um exercício do catálogo a uma sessão do treino do aluno.
 * - Rascunho aberto: o exercício entra nele.
 * - Última versão aprovada ou publicada: cria nova versão em rascunho (a publicada não muda;
 *   o aluno só vê depois da aprovação).
 */
export function addExerciseToPlan(args: { plan: TrainingPlan; actor: Actor; sessionId: string; exercise: ExerciseCard }): { plan: TrainingPlan; newVersion: boolean } {
  const { actor, sessionId, exercise } = args;
  let plan = args.plan;
  let newVersion = false;
  if (latest(plan).status !== "draft") {
    plan = proposeNewVersion(plan, actor, `Inclusão de ${exercise.name} pela biblioteca`);
    newVersion = true;
  }
  const v = latest(plan);
  if (!v.sessions.some((s) => s.id === sessionId)) throw new Error("Sessão não encontrada neste treino.");
  const sessions = v.sessions.map((s) => (s.id === sessionId ? { ...s, items: [...s.items, defaultPrescription(exercise)] } : s));
  return { plan: updateDraft(plan, actor, sessions), newVersion };
}

export function latest(plan: TrainingPlan): PlanVersion {
  return plan.versions[plan.versions.length - 1];
}
export function published(plan: TrainingPlan): PlanVersion | undefined {
  return plan.versions.find((v) => v.status === "published");
}

/** Cria o primeiro rascunho a partir da avaliação, rastreando a sugestão usada. */
export function createDraftFromAssessment(args: {
  actor: Actor;
  assessment: Assessment;
  suggestion: SuggestionResult | null;
  title: string;
  frequencyPerWeek: number;
  weeks: number;
  startDate: string;
}): TrainingPlan {
  const { actor, assessment, suggestion } = args;
  if (!can(actor.role, "plan.draft")) throw new PermissionError("plan.draft", "Seu perfil não pode criar rascunhos de treino.");
  const usable = suggestion?.status === "ok";
  const ids = usable ? Array.from(new Set(suggestion!.groups.flatMap((g) => g.exerciseIds))) : [];
  const sessionA: TrainingSession = { id: newId("ss"), name: "A", items: ids.map((id) => defaultPrescription(EXERCISE_BY_ID.get(id)!)) };
  const trace: SuggestionTrace | null = usable
    ? {
        ruleIds: suggestion!.groups.map((g) => g.ruleId),
        ruleVersion: suggestion!.version,
        findingsUsed: suggestion!.groups.flatMap((g) => g.findingsUsed),
        generatedAt: new Date().toISOString(),
      }
    : null;
  const planId = newId("pl");
  return {
    id: planId,
    traineeId: assessment.traineeId,
    ownerId: assessment.ownerId,
    title: args.title,
    goal: assessment.blocks.essentials.goal,
    startDate: args.startDate,
    weeks: args.weeks,
    frequencyPerWeek: args.frequencyPerWeek,
    isDemo: assessment.isDemo,
    versions: [
      {
        id: newId("pv"),
        planId,
        number: 1,
        status: "draft",
        sessions: [sessionA],
        sourceAssessmentId: assessment.id,
        sourceAssessmentVersion: assessment.version,
        suggestionTrace: trace,
        manualDraft: !usable,
        authorId: actor.id,
        createdAt: new Date().toISOString(),
        changeNote: usable ? "Rascunho criado a partir das opções da avaliação" : "Rascunho manual (sem sugestão validada)",
      },
    ],
  };
}

function assertOwner(actor: Actor, plan: TrainingPlan) {
  const owner = actor.id === plan.ownerId || (actor.role === "teacher" && actor.id === plan.ownerId);
  if (!owner) throw new PermissionError("plan.approve", "Treino não encontrado.");
}

export function updateDraft(plan: TrainingPlan, actor: Actor, sessions: TrainingSession[], note?: string): TrainingPlan {
  if (!can(actor.role, "plan.draft")) throw new PermissionError("plan.draft", "Seu perfil não pode editar treinos.");
  if (actor.id !== plan.ownerId && actor.supervisorId !== plan.ownerId) throw new PermissionError("plan.draft", "Treino não encontrado.");
  const v = latest(plan);
  if (v.status !== "draft") throw new Error("Só rascunhos podem ser editados. Crie uma nova versão.");
  return { ...plan, versions: [...plan.versions.slice(0, -1), { ...v, sessions, changeNote: note ?? v.changeNote }] };
}

export function approve(plan: TrainingPlan, actor: Actor): TrainingPlan {
  if (!can(actor.role, "plan.approve")) throw new PermissionError("plan.approve", "Apenas o professor responsável aprova treinos. Estudantes enviam rascunhos para revisão.");
  assertOwner(actor, plan);
  const v = latest(plan);
  if (v.status !== "draft") throw new Error("Apenas rascunhos podem ser aprovados.");
  if (!v.sessions.some((s) => s.items.length)) throw new Error("Adicione ao menos um exercício antes de aprovar.");
  return { ...plan, versions: [...plan.versions.slice(0, -1), { ...v, status: "approved", approvedBy: actor.id, approvedAt: new Date().toISOString() }] };
}

export function publish(plan: TrainingPlan, actor: Actor): TrainingPlan {
  if (!can(actor.role, "plan.publish")) throw new PermissionError("plan.publish", "Seu perfil não pode disponibilizar treinos ao aluno.");
  assertOwner(actor, plan);
  const v = latest(plan);
  if (v.status !== "approved") throw new Error("Só uma versão aprovada pode ser disponibilizada.");
  const now = new Date().toISOString();
  return {
    ...plan,
    versions: plan.versions.map((x) =>
      x.id === v.id ? { ...x, status: "published", publishedAt: now } : x.status === "published" ? { ...x, status: "superseded" } : x
    ),
  };
}

/** Nova versão em rascunho a partir da última (ex.: após reavaliação). Não altera a publicada. */
export function proposeNewVersion(plan: TrainingPlan, actor: Actor, note: string, sourceAssessment?: Assessment): TrainingPlan {
  if (!can(actor.role, "plan.draft")) throw new PermissionError("plan.draft", "Seu perfil não pode criar versões.");
  const last = latest(plan);
  if (last.status === "draft") throw new Error("Já existe um rascunho aberto para este treino.");
  const clone: PlanVersion = {
    ...last,
    id: newId("pv"),
    number: last.number + 1,
    status: "draft",
    sessions: JSON.parse(JSON.stringify(last.sessions)),
    sourceAssessmentId: sourceAssessment?.id ?? last.sourceAssessmentId,
    sourceAssessmentVersion: sourceAssessment?.version ?? last.sourceAssessmentVersion,
    authorId: actor.id,
    createdAt: new Date().toISOString(),
    approvedBy: undefined,
    approvedAt: undefined,
    publishedAt: undefined,
    changeNote: note,
  };
  return { ...plan, versions: [...plan.versions, clone] };
}

/**
 * Reaproveita a estrutura de um treino como NOVO rascunho (versão 1) para um aluno,
 * ligado à avaliação desse aluno. Nada é aprovado automaticamente: a cópia passa
 * pelo fluxo normal de revisão. Notas privadas e critérios individualizados do
 * aluno de origem não são copiados.
 */
export function reuseAsDraft(args: {
  actor: Actor;
  source: TrainingPlan;
  targetAssessment: Assessment;
  title: string;
  startDate: string;
}): TrainingPlan {
  const { actor, source, targetAssessment } = args;
  if (!can(actor.role, "plan.draft")) throw new PermissionError("plan.draft", "Seu perfil não pode criar rascunhos de treino.");
  if (source.ownerId !== actor.id) throw new PermissionError("plan.draft", "Só é possível reaproveitar treinos que você criou.");
  if (targetAssessment.ownerId !== actor.id) throw new PermissionError("plan.draft", "Avaliação de destino não encontrada.");
  const base = published(source) ?? latest(source);
  const planId = newId("pl");
  const sessions: TrainingSession[] = base.sessions.map((s) => ({
    id: newId("ss"),
    name: s.name,
    items: s.items.map((it) => ({ ...JSON.parse(JSON.stringify(it)), id: newId("px"), privateNote: "", reviewCriteria: "" })),
  }));
  return {
    id: planId,
    traineeId: targetAssessment.traineeId,
    ownerId: targetAssessment.ownerId,
    title: args.title,
    goal: targetAssessment.blocks.essentials.goal,
    startDate: args.startDate,
    weeks: source.weeks,
    frequencyPerWeek: source.frequencyPerWeek,
    isDemo: targetAssessment.isDemo,
    versions: [
      {
        id: newId("pv"),
        planId,
        number: 1,
        status: "draft",
        sessions,
        sourceAssessmentId: targetAssessment.id,
        sourceAssessmentVersion: targetAssessment.version,
        suggestionTrace: null,
        manualDraft: true,
        authorId: actor.id,
        createdAt: new Date().toISOString(),
        changeNote: `Reaproveitado de “${source.title}” (v${base.number}); revisar dose e critérios para este aluno`,
      },
    ],
  };
}

/** O que o aluno pode ver: só a versão publicada, sem notas privadas. */
export function practitionerView(plan: TrainingPlan, actor: Actor): PlanVersion | null {
  if (!can(actor.role, "plan.readPublished")) return null;
  if (actor.role === "practitioner" && actor.traineeId !== plan.traineeId) return null;
  const pub = published(plan);
  if (!pub) return null;
  return { ...pub, suggestionTrace: null, sessions: pub.sessions.map((s) => ({ ...s, items: s.items.map((i) => ({ ...i, privateNote: "" })) })) };
}

/** Estimativa de duração (minutos): soma de séries × (tempo de execução estimado + descanso). */
export function estimateMinutes(session: TrainingSession): { minutes: number; basis: string } {
  let sec = 0;
  for (const it of session.items) {
    const sets = it.dose.sets;
    const work = it.dose.kind === "time" ? it.dose.seconds : it.dose.kind === "reps" ? it.dose.repsMax * 4 : 60;
    sec += sets * work + Math.max(0, sets - 1) * (it.restSeconds ?? 60) + 60; // +60 s de transição por exercício
  }
  return {
    minutes: Math.round(sec / 60),
    basis: "Estimativa: 4 s por repetição, descanso prescrito entre séries e 1 min de transição por exercício. Não inclui aquecimento.",
  };
}
