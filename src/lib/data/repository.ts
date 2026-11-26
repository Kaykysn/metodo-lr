// ==============================================================================
// Repositório com autorização aplicada em cada operação.
// - DemoRepository: dados fictícios no navegador (namespace próprio, reset explícito).
// - SupabaseRepository: usado quando há credenciais; RLS no banco é a barreira final.
// Nunca cai silenciosamente para a demonstração quando a produção falha.
// ==============================================================================
import type { Actor, Assessment, ExecutionLog, Trainee, TrainingPlan } from "@/lib/domain/types";
import { can, PermissionError } from "@/lib/domain/roles";
import { buildSeed, DEMO_ACTORS, emptyBlocks } from "./seed";
import { newId } from "@/lib/domain/plans";
import { checkActivation, traineeUsage } from "@/lib/subscription/limits";
import { isValidTime, type FollowUpData, type FollowUpNote, type SessionChange, type WeeklySlot } from "@/lib/domain/schedule";

export interface SaveReceipt {
  savedAt: string;
  target: "demo-browser" | "supabase";
}

export interface Repository {
  readonly mode: "demo" | "supabase";
  listTrainees(actor: Actor): Promise<Trainee[]>;
  getTrainee(actor: Actor, id: string): Promise<Trainee | null>;
  createTrainee(actor: Actor, input: Pick<Trainee, "displayName" | "goal" | "experience" | "birthYear">): Promise<Trainee>;
  /** Arquiva (true) ou reativa (false). Nunca apaga. Reativar verifica o limite. */
  setTraineeArchived(actor: Actor, id: string, archived: boolean): Promise<Trainee>;
  listAssessments(actor: Actor, traineeId?: string): Promise<Assessment[]>;
  getAssessment(actor: Actor, id: string): Promise<Assessment | null>;
  createAssessment(actor: Actor, traineeId: string): Promise<Assessment>;
  saveAssessment(actor: Actor, a: Assessment): Promise<SaveReceipt>;
  listPlans(actor: Actor, traineeId?: string): Promise<TrainingPlan[]>;
  getPlan(actor: Actor, id: string): Promise<TrainingPlan | null>;
  savePlan(actor: Actor, plan: TrainingPlan): Promise<SaveReceipt>;
  listLogs(actor: Actor, traineeId: string): Promise<ExecutionLog[]>;
  addLogs(actor: Actor, logs: ExecutionLog[]): Promise<SaveReceipt>;
  // Acompanhamento (horário, atendimentos e feedback). Não cria login nem convite para o aluno.
  getFollowUp(actor: Actor, traineeId: string): Promise<FollowUpData>;
  saveWeeklySlots(actor: Actor, traineeId: string, slots: SlotInput[]): Promise<SaveReceipt>;
  addSessionChange(actor: Actor, change: SessionChangeInput): Promise<SaveReceipt>;
  removeSessionChange(actor: Actor, traineeId: string, changeId: string): Promise<SaveReceipt>;
  saveFollowUpNote(actor: Actor, note: NoteInput): Promise<SaveReceipt>;
}

export type SlotInput = Pick<WeeklySlot, "weekday" | "startTime" | "durationMin">;
export type SessionChangeInput = Pick<SessionChange, "traineeId" | "kind" | "originalAt" | "scheduledAt" | "durationMin" | "note">;
export type NoteInput = Pick<FollowUpNote, "traineeId" | "occurredOn" | "sessionAt" | "studentReport" | "professionalNote"> & { id?: string };

/** Mesmas regras dos CHECKs do banco (migração 20261118000100), com mensagens para a tela. */
export function followUpProblem(x: { slots?: SlotInput[]; change?: SessionChangeInput; note?: NoteInput }): string | null {
  if (x.slots) {
    const seen = new Set<string>();
    for (const s of x.slots) {
      if (!Number.isInteger(s.weekday) || s.weekday < 0 || s.weekday > 6) return "Dia da semana inválido.";
      if (!isValidTime(s.startTime)) return "Informe a hora no formato 00:00.";
      if (!Number.isInteger(s.durationMin) || s.durationMin < 10 || s.durationMin > 300) return "A duração vai de 10 a 300 minutos.";
      const k = `${s.weekday}-${s.startTime}`;
      if (seen.has(k)) return "Há dois horários iguais no mesmo dia.";
      seen.add(k);
    }
  }
  if (x.change) {
    const c = x.change;
    if (c.kind === "avulso" && (!c.scheduledAt || c.originalAt)) return "Informe a data e a hora do atendimento.";
    if (c.kind === "remarcacao" && (!c.scheduledAt || !c.originalAt)) return "Informe o novo horário.";
    if (c.kind === "cancelamento" && (!c.originalAt || c.scheduledAt)) return "Atendimento inválido.";
    if (c.scheduledAt && !Number.isFinite(Date.parse(c.scheduledAt))) return "Data ou hora inválida.";
    if (c.durationMin < 10 || c.durationMin > 300) return "A duração vai de 10 a 300 minutos.";
    if (c.note.length > 500) return "Observação longa demais (até 500 caracteres).";
  }
  if (x.note) {
    const n = x.note;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(n.occurredOn)) return "Informe a data.";
    if (!n.studentReport.trim() && !n.professionalNote.trim()) return "Escreva o relato do aluno ou a sua observação.";
    if (n.studentReport.length > 4000 || n.professionalNote.length > 4000) return "Texto longo demais (até 4.000 caracteres por campo).";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Política de acesso (espelha as policies RLS da migração 20261106)
// ---------------------------------------------------------------------------
export function canAccessTrainee(actor: Actor, t: Pick<Trainee, "id" | "ownerId">): boolean {
  switch (actor.role) {
    case "teacher":
    case "physiotherapist":
      return t.ownerId === actor.id;
    case "pe_student":
      return t.ownerId === actor.id; // casos didáticos próprios
    case "practitioner":
      return actor.traineeId === t.id; // apenas a si mesmo, e só dados permitidos
    default:
      return false; // admin e legados não leem dados de saúde por conveniência
  }
}

function deny(action: Parameters<typeof can>[1], msg: string): never {
  throw new PermissionError(action, msg);
}

export const ARCHIVED_MESSAGE = "Este aluno está arquivado. Reative-o para registrar avaliações, treinos ou execuções; o histórico continua disponível para consulta.";

/**
 * Regras comerciais aplicadas pela demonstração (no modo real quem decide é o banco).
 * canCreate devolve null quando pode criar, ou a explicação do bloqueio.
 */
export interface CommercialGuard {
  canCreate(): string | null;
  activeLimit(): number | null;
}

// ---------------------------------------------------------------------------
// Demonstração no navegador
// ---------------------------------------------------------------------------
const KEY = "lr_demo_v2";
type DemoState = ReturnType<typeof buildSeed> & { schedule?: WeeklySlot[]; sessionChanges?: SessionChange[]; followups?: FollowUpNote[] };

function storageAvailable(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    const k = "__lr_probe";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return window.localStorage;
  } catch {
    return null;
  }
}

export class DemoRepository implements Repository {
  readonly mode = "demo" as const;
  private memory: DemoState | null = null;
  /** Definido pelo DataProvider a partir da situação comercial simulada. */
  guard: CommercialGuard | null = null;

  private assertCanCreate(action: Parameters<typeof can>[1]) {
    const why = this.guard?.canCreate();
    if (why) deny(action, why);
  }
  private assertActivation(s: DemoState, ownerId: string) {
    const limit = this.guard?.activeLimit() ?? null;
    const check = checkActivation(traineeUsage(s.trainees.filter((t) => t.ownerId === ownerId), limit));
    if (!check.ok) deny("trainee.write", check.message);
  }
  private assertNotArchived(t: Trainee, action: Parameters<typeof can>[1]) {
    if (t.archivedAt) deny(action, ARCHIVED_MESSAGE);
  }

  constructor(private storage: Storage | null = storageAvailable()) {}

  /** true quando os dados só existem na memória desta aba (armazenamento bloqueado). */
  get volatile() {
    return this.storage === null;
  }

  private load(): DemoState {
    if (this.storage) {
      const raw = this.storage.getItem(KEY);
      if (raw) {
        try {
          return JSON.parse(raw) as DemoState;
        } catch {
          /* dado corrompido: recomeça a partir da semente, sem misturar */
        }
      }
      const seed = buildSeed();
      this.storage.setItem(KEY, JSON.stringify(seed));
      return seed;
    }
    this.memory = this.memory ?? buildSeed();
    return this.memory;
  }

  private commit(state: DemoState): SaveReceipt {
    if (this.storage) {
      const text = JSON.stringify(state);
      this.storage.setItem(KEY, text);
      // confirma a escrita relendo o destino antes de dizer "salvo"
      if (this.storage.getItem(KEY) !== text) throw new Error("Não foi possível confirmar a gravação neste navegador.");
    } else {
      this.memory = state;
    }
    return { savedAt: new Date().toISOString(), target: "demo-browser" };
  }

  reset() {
    this.storage?.removeItem(KEY);
    this.memory = null;
  }

  async listTrainees(actor: Actor) {
    return this.load().trainees.filter((t) => canAccessTrainee(actor, t) && actor.role !== "practitioner");
  }
  async getTrainee(actor: Actor, id: string) {
    const t = this.load().trainees.find((x) => x.id === id) ?? null;
    return t && canAccessTrainee(actor, t) ? t : null;
  }
  async createTrainee(actor: Actor, input: Pick<Trainee, "displayName" | "goal" | "experience" | "birthYear">) {
    if (!can(actor.role, "trainee.write")) deny("trainee.write", "Seu perfil não pode cadastrar alunos.");
    this.assertCanCreate("trainee.write");
    const s = this.load();
    this.assertActivation(s, actor.id);
    const n = s.trainees.length + 1;
    const t: Trainee = {
      id: newId("tr"),
      ownerId: actor.id,
      code: actor.role === "pe_student" ? `CASO-${String(n).padStart(2, "0")}` : `AL-${String(1000 + n).slice(-4)}`,
      createdAt: new Date().toISOString(),
      isDemo: true,
      ...input,
    };
    s.trainees.push(t);
    this.commit(s);
    return t;
  }
  async setTraineeArchived(actor: Actor, id: string, archived: boolean) {
    if (!can(actor.role, "trainee.write")) deny("trainee.write", "Seu perfil não pode alterar alunos.");
    const s = this.load();
    const t = s.trainees.find((x) => x.id === id);
    if (!t || !canAccessTrainee(actor, t)) deny("trainee.write", "Aluno não encontrado.");
    if (!archived && t.archivedAt) {
      this.assertCanCreate("trainee.write");
      this.assertActivation(s, t.ownerId);
    }
    t.archivedAt = archived ? t.archivedAt ?? new Date().toISOString() : null;
    this.commit(s);
    return t;
  }

  async listAssessments(actor: Actor, traineeId?: string) {
    if (!can(actor.role, "assessment.read")) return [];
    const s = this.load();
    const allowed = new Set(s.trainees.filter((t) => canAccessTrainee(actor, t)).map((t) => t.id));
    return s.assessments.filter((a) => allowed.has(a.traineeId) && (!traineeId || a.traineeId === traineeId));
  }
  async getAssessment(actor: Actor, id: string) {
    const list = await this.listAssessments(actor);
    return list.find((a) => a.id === id) ?? null;
  }
  async createAssessment(actor: Actor, traineeId: string) {
    if (!can(actor.role, "assessment.write")) deny("assessment.write", "Seu perfil não pode criar avaliações.");
    this.assertCanCreate("assessment.write");
    const t = await this.getTrainee(actor, traineeId);
    if (!t) deny("assessment.write", "Aluno não encontrado.");
    this.assertNotArchived(t, "assessment.write");
    const s = this.load();
    const prev = s.assessments.filter((a) => a.traineeId === traineeId);
    const a: Assessment = {
      id: newId("av"),
      traineeId,
      ownerId: t.ownerId,
      version: prev.length + 1,
      status: "draft",
      date: new Date().toISOString().slice(0, 10),
      blocks: { ...emptyBlocks(), essentials: { ...emptyBlocks().essentials, goal: t.goal, experience: t.experience } },
      updatedAt: new Date().toISOString(),
      isDemo: true,
    };
    s.assessments.push(a);
    this.commit(s);
    return a;
  }
  async saveAssessment(actor: Actor, a: Assessment) {
    if (!can(actor.role, "assessment.write")) deny("assessment.write", "Seu perfil não pode editar avaliações.");
    const s = this.load();
    const t = s.trainees.find((x) => x.id === a.traineeId);
    if (!t || !canAccessTrainee(actor, t)) deny("assessment.write", "Avaliação não encontrada.");
    this.assertNotArchived(t, "assessment.write");
    const i = s.assessments.findIndex((x) => x.id === a.id);
    if (i < 0) deny("assessment.write", "Avaliação inexistente.");
    // ownerId/traineeId vêm do registro salvo, nunca do cliente
    s.assessments[i] = { ...a, ownerId: s.assessments[i].ownerId, traineeId: s.assessments[i].traineeId, updatedAt: new Date().toISOString() };
    return this.commit(s);
  }

  async listPlans(actor: Actor, traineeId?: string) {
    const s = this.load();
    return s.plans.filter((p) => {
      const t = s.trainees.find((x) => x.id === p.traineeId);
      if (!t || !canAccessTrainee(actor, t)) return false;
      if (actor.role === "practitioner" && !p.versions.some((v) => v.status === "published")) return false;
      return !traineeId || p.traineeId === traineeId;
    });
  }
  async getPlan(actor: Actor, id: string) {
    return (await this.listPlans(actor)).find((p) => p.id === id) ?? null;
  }
  async savePlan(actor: Actor, plan: TrainingPlan) {
    if (!can(actor.role, "plan.draft")) deny("plan.draft", "Seu perfil não pode salvar treinos.");
    const s = this.load();
    const t = s.trainees.find((x) => x.id === plan.traineeId);
    if (!t || !canAccessTrainee(actor, t)) deny("plan.draft", "Aluno não encontrado.");
    this.assertNotArchived(t, "plan.draft");
    const i = s.plans.findIndex((p) => p.id === plan.id);
    const prev = i >= 0 ? s.plans[i] : null;
    // Criar treino, nova versão, aprovar ou publicar exige acesso operacional;
    // editar um rascunho já existente continua possível (não perde trabalho).
    const statusChanged = !!prev && plan.versions.some((v) => prev.versions.find((o) => o.id === v.id)?.status !== v.status);
    if (!prev || plan.versions.length > prev.versions.length || statusChanged) this.assertCanCreate("plan.draft");
    // Versões aprovadas/publicadas são imutáveis (exceto mudança de status permitida)
    if (prev) {
      for (const pv of prev.versions) {
        const nv = plan.versions.find((v) => v.id === pv.id);
        if (!nv) deny("plan.draft", "Não é permitido apagar versões do histórico.");
        if (pv.status !== "draft" && JSON.stringify(pv.sessions) !== JSON.stringify(nv.sessions)) deny("plan.draft", "Versões aprovadas não podem ser editadas. Crie uma nova versão.");
      }
      const approvedNow = plan.versions.some((v) => {
        const old = prev.versions.find((o) => o.id === v.id);
        return v.status !== "draft" && (!old || old.status === "draft") && v.status !== "superseded";
      });
      if (approvedNow && !can(actor.role, "plan.approve")) deny("plan.approve", "Apenas o professor responsável aprova e publica treinos.");
    } else if (plan.versions.some((v) => v.status !== "draft") && !can(actor.role, "plan.approve")) {
      deny("plan.approve", "Apenas o professor responsável aprova e publica treinos.");
    }
    const stored = { ...plan, ownerId: prev?.ownerId ?? t.ownerId };
    if (i >= 0) s.plans[i] = stored;
    else s.plans.push(stored);
    return this.commit(s);
  }

  async listLogs(actor: Actor, traineeId: string) {
    const s = this.load();
    const t = s.trainees.find((x) => x.id === traineeId);
    if (!t || !canAccessTrainee(actor, t)) return [];
    return s.logs.filter((l) => l.traineeId === traineeId);
  }
  async addLogs(actor: Actor, logs: ExecutionLog[]) {
    // Novos registros dependem do acesso operacional do profissional responsável
    const why = this.guard?.canCreate();
    if (why) deny("execution.log", "O acesso do seu professor está em modo de consulta. Você continua vendo o último treino disponibilizado.");
    const s = this.load();
    for (const l of logs) {
      const t = s.trainees.find((x) => x.id === l.traineeId);
      if (!t || !canAccessTrainee(actor, t)) deny("execution.log", "Registro não encontrado.");
      this.assertNotArchived(t, "execution.log");
      const plan = s.plans.find((p) => p.versions.some((v) => v.id === l.planVersionId));
      const v = plan?.versions.find((x) => x.id === l.planVersionId);
      if (!v || v.status !== "published") deny("execution.log", "Só é possível registrar execução de um treino disponibilizado.");
    }
    s.logs.push(...logs);
    return this.commit(s);
  }

  // ---------- Acompanhamento ----------
  private followUpTrainee(s: DemoState, actor: Actor, traineeId: string, write: boolean) {
    const t = s.trainees.find((x) => x.id === traineeId);
    if (!t || !canAccessTrainee(actor, t) || !can(actor.role, write ? "trainee.write" : "trainee.read")) deny("trainee.read", "Aluno não encontrado.");
    if (write) {
      this.assertNotArchived(t, "trainee.write");
      this.assertCanCreate("trainee.write");
    }
    return t;
  }
  async getFollowUp(actor: Actor, traineeId: string): Promise<FollowUpData> {
    const s = this.load();
    const t = s.trainees.find((x) => x.id === traineeId);
    if (!t || !canAccessTrainee(actor, t) || !can(actor.role, "trainee.read")) return { slots: [], changes: [], notes: [] };
    return {
      slots: (s.schedule ?? []).filter((x) => x.traineeId === traineeId),
      changes: (s.sessionChanges ?? []).filter((x) => x.traineeId === traineeId),
      notes: (s.followups ?? []).filter((x) => x.traineeId === traineeId),
    };
  }
  async saveWeeklySlots(actor: Actor, traineeId: string, slots: SlotInput[]) {
    const s = this.load();
    this.followUpTrainee(s, actor, traineeId, true);
    const why = followUpProblem({ slots });
    if (why) throw new Error(why);
    const keep = (s.schedule ?? []).filter((x) => x.traineeId !== traineeId);
    s.schedule = [...keep, ...slots.map((x) => ({ ...x, id: newId("hr"), traineeId }))];
    return this.commit(s);
  }
  async addSessionChange(actor: Actor, change: SessionChangeInput) {
    const s = this.load();
    this.followUpTrainee(s, actor, change.traineeId, true);
    const why = followUpProblem({ change });
    if (why) throw new Error(why);
    const list = s.sessionChanges ?? [];
    if (change.originalAt && list.some((x) => x.traineeId === change.traineeId && x.originalAt && Date.parse(x.originalAt) === Date.parse(change.originalAt!))) {
      throw new Error("Este atendimento já foi remarcado ou cancelado. Desfaça a alteração anterior primeiro.");
    }
    s.sessionChanges = [...list, { ...change, id: newId("at"), createdAt: new Date().toISOString() }];
    return this.commit(s);
  }
  async removeSessionChange(actor: Actor, traineeId: string, changeId: string) {
    const s = this.load();
    this.followUpTrainee(s, actor, traineeId, true);
    s.sessionChanges = (s.sessionChanges ?? []).filter((x) => !(x.id === changeId && x.traineeId === traineeId));
    return this.commit(s);
  }
  async saveFollowUpNote(actor: Actor, note: NoteInput) {
    const s = this.load();
    this.followUpTrainee(s, actor, note.traineeId, true);
    const why = followUpProblem({ note });
    if (why) throw new Error(why);
    const list = s.followups ?? [];
    const now = new Date().toISOString();
    const existing = note.id ? list.find((x) => x.id === note.id && x.traineeId === note.traineeId) : undefined;
    if (existing) {
      Object.assign(existing, { occurredOn: note.occurredOn, sessionAt: note.sessionAt, studentReport: note.studentReport, professionalNote: note.professionalNote, updatedAt: now });
    } else {
      list.push({ id: newId("fb"), traineeId: note.traineeId, occurredOn: note.occurredOn, sessionAt: note.sessionAt, studentReport: note.studentReport, professionalNote: note.professionalNote, authorId: actor.id, authorName: actor.name, createdAt: now, updatedAt: now });
    }
    s.followups = list;
    return this.commit(s);
  }

  // Identidade simulada (só na demonstração)
  static actors = DEMO_ACTORS;
}
