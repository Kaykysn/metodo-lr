// ==============================================================================
// Adaptador Supabase. Usado apenas com NEXT_PUBLIC_SUPABASE_URL/ANON_KEY reais.
// A autorização final é do banco (RLS da migração 20261106); o cliente nunca envia
// owner_id/user_id como prova de permissão — o banco usa auth.uid().
// NÃO TESTADO contra um projeto real nesta entrega (sem credenciais no ambiente).
// ==============================================================================
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Actor, Assessment, ExecutionLog, Trainee, TrainingPlan, PlanVersion } from "@/lib/domain/types";
import { followUpProblem, type NoteInput, type Repository, type SaveReceipt, type SessionChangeInput, type SlotInput, type TeacherPlan, type TeacherPlanInput, type TeacherPixKey, type TeacherPixKeyInput, type StudentMonthlyPayment, type TeacherAvailability, type TeacherAvailabilityInput, type StudentSchedule, type StudentScheduleInput, type ScheduleOccurrence, type WeeklyReplacementBalance, type StudentExerciseFeedback, type StudentExerciseFeedbackInput, type TeacherNotification, type CancelOccurrenceResult } from "./repository";
import type { FollowUpData, FollowUpNote, SessionChange, WeeklySlot } from "@/lib/domain/schedule";
import { emptyBlocks } from "./seed";
import { migrateLegacyRegions } from "@/lib/domain/body-regions";

const receipt = (): SaveReceipt => ({ savedAt: new Date().toISOString(), target: "supabase" });

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

// Linhas do banco chegam sem tipo gerado; mapeadas explicitamente abaixo.
const toTrainee = (r: any): Trainee => ({
  id: r.id, ownerId: r.owner_id, code: r.code, displayName: r.display_name, birthYear: r.birth_year ?? undefined,
  goal: r.goal, experience: r.experience, createdAt: r.created_at, archivedAt: r.archived_at ?? null, isDemo: false,
});

function toAssessment(r: any): Assessment {
  // v1 (etapas 0–10) é lido sem perda: blocos vazios + `legacy` com o JSON original
  let blocks = r.blocks ?? emptyBlocks();
  if (!r.blocks && r.data?.bodyMap?.regions) {
    blocks = { ...blocks, complaint: { ...blocks.complaint, selectedRegions: migrateLegacyRegions(r.data.bodyMap.regions).ids } };
  }
  return {
    id: r.id, traineeId: r.trainee_id, ownerId: r.user_id, version: r.version ?? 1,
    status: r.status === "completed" ? "completed" : "draft", date: r.assessment_date, blocks,
    legacy: r.schema_version === 1 ? r.data : undefined, updatedAt: r.updated_at, isDemo: false,
  };
}

const toVersion = (r: any): PlanVersion => ({
  id: r.id, planId: r.plan_id, number: r.number, status: r.status, sessions: r.sessions,
  sourceAssessmentId: r.source_assessment_id, sourceAssessmentVersion: r.source_assessment_version,
  suggestionTrace: r.suggestion_trace, manualDraft: r.manual_draft, authorId: r.author_id, createdAt: r.created_at,
  approvedBy: r.approved_by ?? undefined, approvedAt: r.approved_at ?? undefined, publishedAt: r.published_at ?? undefined,
  changeNote: r.change_note,
});

export class SupabaseRepository implements Repository {
  readonly mode = "supabase" as const;
  constructor(private db: SupabaseClient) {}

  async listTrainees(_actor: Actor) {
    return must(await this.db.from("trainees").select("*").order("created_at")).map(toTrainee);
  }
  async getTrainee(_actor: Actor, id: string) {
    const r = must(await this.db.from("trainees").select("*").eq("id", id).maybeSingle());
    return r ? toTrainee(r) : null;
  }
  async createTrainee(actor: Actor, input: Pick<Trainee, "displayName" | "goal" | "experience" | "birthYear">) {
    const code = `AL-${Math.random().toString().slice(2, 6)}`;
    const r = must(
      await this.db
        .from("trainees")
        .insert({ owner_id: actor.id, code, display_name: input.displayName, goal: input.goal, experience: input.experience, birth_year: input.birthYear ?? null, is_didactic: actor.role === "pe_student" })
        .select()
        .single()
    );
    return toTrainee(r);
  }
  async setTraineeArchived(_actor: Actor, id: string, archived: boolean) {
    // Limite de ativos e acesso operacional são verificados pelo trigger da migração 20261108
    const r = must(await this.db.from("trainees").update({ archived_at: archived ? new Date().toISOString() : null }).eq("id", id).select().single());
    return toTrainee(r);
  }
  async listAssessments(_actor: Actor, traineeId?: string) {
    let q = this.db.from("assessments").select("*").order("assessment_date", { ascending: false });
    if (traineeId) q = q.eq("trainee_id", traineeId);
    return must(await q).map(toAssessment);
  }
  async getAssessment(_actor: Actor, id: string) {
    const r = must(await this.db.from("assessments").select("*").eq("id", id).maybeSingle());
    return r ? toAssessment(r) : null;
  }
  async createAssessment(actor: Actor, traineeId: string) {
    const t = await this.getTrainee(actor, traineeId);
    if (!t) throw new Error("Aluno não encontrado.");
    const prev = await this.listAssessments(actor, traineeId);
    const blocks = { ...emptyBlocks(), essentials: { ...emptyBlocks().essentials, goal: t.goal, experience: t.experience } };
    const r = must(
      await this.db
        .from("assessments")
        .insert({ user_id: actor.id, trainee_id: traineeId, patient_code: t.code, complaint: "", version: prev.length + 1, schema_version: 2, blocks, status: "draft" })
        .select()
        .single()
    );
    return toAssessment(r);
  }
  async saveAssessment(_actor: Actor, a: Assessment) {
    must(await this.db.from("assessments").update({ blocks: a.blocks, status: a.status, schema_version: 2, updated_at: new Date().toISOString() }).eq("id", a.id).select("id").single());
    return receipt();
  }
  async listPlans(_actor: Actor, traineeId?: string) {
    let q = this.db.from("training_plans").select("*, plan_versions(*)");
    if (traineeId) q = q.eq("trainee_id", traineeId);
    return must(await q).map((r: any) => ({
      id: r.id, traineeId: r.trainee_id, ownerId: r.owner_id, title: r.title, goal: r.goal, startDate: r.start_date,
      weeks: r.weeks, frequencyPerWeek: r.frequency_per_week, isDemo: false,
      versions: (r.plan_versions ?? []).map(toVersion).sort((x: PlanVersion, y: PlanVersion) => x.number - y.number),
    })) as TrainingPlan[];
  }
  async getPlan(actor: Actor, id: string) {
    return (await this.listPlans(actor)).find((p) => p.id === id) ?? null;
  }
  async savePlan(actor: Actor, plan: TrainingPlan) {
    must(
      await this.db.from("training_plans").upsert({
        id: plan.id, trainee_id: plan.traineeId, owner_id: actor.id, title: plan.title, goal: plan.goal,
        start_date: plan.startDate, weeks: plan.weeks, frequency_per_week: plan.frequencyPerWeek,
      })
    );
    // INSERT de versão nova é sempre draft (RLS). Aprovar/publicar é UPDATE da linha
    // existente: um upsert aqui geraria INSERT ... ON CONFLICT e a política de INSERT
    // recusaria o status 'approved' antes do CONFLICT ("new row violates RLS").
    const existing = must(
      await this.db.from("plan_versions").select("id").eq("plan_id", plan.id)
    ) as { id: string }[];
    const existingIds = new Set(existing.map((r) => r.id));
    // Ordem importa por causa do índice "uma publicada por plano": substituídas antes da nova publicada
    const ordered = [...plan.versions].sort((a, b) => (a.status === "published" ? 1 : 0) - (b.status === "published" ? 1 : 0));
    for (const v of ordered) {
      const values = {
        status: v.status,
        sessions: v.sessions,
        source_assessment_id: v.sourceAssessmentId ?? null,
        source_assessment_version: v.sourceAssessmentVersion ?? null,
        suggestion_trace: v.suggestionTrace ?? null,
        manual_draft: v.manualDraft,
        published_at: v.publishedAt ?? null,
        change_note: v.changeNote,
      };
      if (existingIds.has(v.id)) {
        // UPDATE não informa id/plan_id/number/author_id: gatilho de imutabilidade e
        // approved_by/approved_at ficam a cargo do banco (trigger guard_plan_version).
        must(await this.db.from("plan_versions").update(values).eq("id", v.id).select("id").single());
      } else {
        must(
          await this.db.from("plan_versions").insert({
            id: v.id,
            plan_id: plan.id,
            number: v.number,
            author_id: v.authorId,
            ...values,
          }).select("id").single()
        );
      }
    }
    return receipt();
  }
  async listLogs(_actor: Actor, traineeId: string) {
    const rows = must(await this.db.from("execution_logs").select("*").eq("trainee_id", traineeId));
    return rows.map((r: any) => ({
      id: r.id, planVersionId: r.plan_version_id, traineeId: r.trainee_id, sessionId: r.session_id, prescribedId: r.prescribed_id,
      date: r.performed_date, setNumber: r.set_number, reps: r.reps, seconds: r.seconds, loadKg: r.load_kg, modality: r.modality,
      completed: r.completed, effortRpe: r.effort_rpe, symptomIntensity: r.symptom_intensity, note: r.note,
    })) as ExecutionLog[];
  }
  async addLogs(_actor: Actor, logs: ExecutionLog[]) {
    must(
      await this.db.from("execution_logs").insert(
        logs.map((l) => ({
          plan_version_id: l.planVersionId, trainee_id: l.traineeId, session_id: l.sessionId, prescribed_id: l.prescribedId,
          performed_date: l.date, set_number: l.setNumber, reps: l.reps, seconds: l.seconds, load_kg: l.loadKg,
          modality: l.modality, completed: l.completed, effort_rpe: l.effortRpe, symptom_intensity: l.symptomIntensity, note: l.note,
        }))
      )
    );
    return receipt();
  }

  // ---------- Acompanhamento (RLS: só o profissional responsável pelo aluno) ----------
  async getFollowUp(_actor: Actor, traineeId: string): Promise<FollowUpData> {
    const [slots, changes, notes] = await Promise.all([
      this.db.from("trainee_schedule").select("*").eq("trainee_id", traineeId).order("weekday").order("start_time"),
      this.db.from("trainee_sessions").select("*").eq("trainee_id", traineeId),
      this.db.from("trainee_feedback").select("*").eq("trainee_id", traineeId).order("occurred_on", { ascending: false }).order("created_at", { ascending: false }),
    ]);
    return {
      slots: must(slots).map((r: any): WeeklySlot => ({ id: r.id, traineeId: r.trainee_id, weekday: r.weekday, startTime: String(r.start_time).slice(0, 5), durationMin: r.duration_min })),
      changes: must(changes).map((r: any): SessionChange => ({ id: r.id, traineeId: r.trainee_id, kind: r.kind, originalAt: r.original_at, scheduledAt: r.scheduled_at, durationMin: r.duration_min, note: r.note, createdAt: r.created_at })),
      notes: must(notes).map((r: any): FollowUpNote => ({
        id: r.id, traineeId: r.trainee_id, occurredOn: r.occurred_on, sessionAt: r.session_at, studentReport: r.student_report, professionalNote: r.professional_note,
        authorId: r.author_id, authorName: r.author_name, createdAt: r.created_at, updatedAt: r.updated_at,
      })),
    };
  }
  async saveWeeklySlots(actor: Actor, traineeId: string, slots: SlotInput[]) {
    const why = followUpProblem({ slots });
    if (why) throw new Error(why);
    // Grava os horários novos primeiro (upsert) e só depois remove os que saíram: se algo falhar no meio, nada some
    if (slots.length) {
      must(await this.db.from("trainee_schedule").upsert(
        slots.map((x) => ({ trainee_id: traineeId, owner_id: actor.id, weekday: x.weekday, start_time: x.startTime, duration_min: x.durationMin })),
        { onConflict: "trainee_id,weekday,start_time" }
      ));
    }
    const current = must(await this.db.from("trainee_schedule").select("id, weekday, start_time").eq("trainee_id", traineeId)) as { id: string; weekday: number; start_time: string }[];
    const wanted = new Set(slots.map((x) => `${x.weekday}-${x.startTime}`));
    const gone = current.filter((r) => !wanted.has(`${r.weekday}-${String(r.start_time).slice(0, 5)}`)).map((r) => r.id);
    if (gone.length) must(await this.db.from("trainee_schedule").delete().in("id", gone));
    return receipt();
  }
  async addSessionChange(actor: Actor, c: SessionChangeInput) {
    const why = followUpProblem({ change: c });
    if (why) throw new Error(why);
    const res = await this.db.from("trainee_sessions").insert({
      trainee_id: c.traineeId, owner_id: actor.id, kind: c.kind, original_at: c.originalAt, scheduled_at: c.scheduledAt, duration_min: c.durationMin, note: c.note,
    });
    if (res.error?.code === "23505") throw new Error("Este atendimento já foi remarcado ou cancelado. Desfaça a alteração anterior primeiro.");
    must(res);
    return receipt();
  }
  async removeSessionChange(_actor: Actor, traineeId: string, changeId: string) {
    must(await this.db.from("trainee_sessions").delete().eq("id", changeId).eq("trainee_id", traineeId));
    return receipt();
  }
  async saveFollowUpNote(actor: Actor, n: NoteInput) {
    const why = followUpProblem({ note: n });
    if (why) throw new Error(why);
    const row = { occurred_on: n.occurredOn, session_at: n.sessionAt, student_report: n.studentReport, professional_note: n.professionalNote };
    if (n.id) must(await this.db.from("trainee_feedback").update(row).eq("id", n.id).eq("trainee_id", n.traineeId));
    // Autor e nome do autor são definidos pelo banco a partir da sessão
    else must(await this.db.from("trainee_feedback").insert({ ...row, trainee_id: n.traineeId, owner_id: actor.id }));
    return receipt();
  }

  // ---------- Planos do professor ----------
  async listTeacherPlans(_actor: Actor): Promise<TeacherPlan[]> {
    const { data, error } = await this.db
      .from("teacher_plans")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      id: r.id,
      ownerId: r.owner_id,
      name: r.name,
      monthlyValueCents: r.monthly_value_cents,
      weeklyFrequency: r.weekly_frequency,
      isActive: r.is_active,
      archivedAt: r.archived_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async createTeacherPlan(_actor: Actor, input: TeacherPlanInput): Promise<TeacherPlan> {
    const { data, error } = await this.db
      .from("teacher_plans")
      .insert({
        owner_id: (await this.db.auth.getUser()).data.user?.id,
        name: input.name,
        monthly_value_cents: input.monthlyValueCents,
        weekly_frequency: input.weeklyFrequency,
        is_active: input.isActive ?? true,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return {
      id: data.id,
      ownerId: data.owner_id,
      name: data.name,
      monthlyValueCents: data.monthly_value_cents,
      weeklyFrequency: data.weekly_frequency,
      isActive: data.is_active,
      archivedAt: data.archived_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async updateTeacherPlan(_actor: Actor, id: string, input: Partial<TeacherPlanInput>): Promise<TeacherPlan> {
    const update: any = {};
    if (input.name !== undefined) update.name = input.name;
    if (input.monthlyValueCents !== undefined) update.monthly_value_cents = input.monthlyValueCents;
    if (input.weeklyFrequency !== undefined) update.weekly_frequency = input.weeklyFrequency;
    if (input.isActive !== undefined) update.is_active = input.isActive;
    update.updated_at = new Date().toISOString();

    const { data, error } = await this.db
      .from("teacher_plans")
      .update(update)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return {
      id: data.id,
      ownerId: data.owner_id,
      name: data.name,
      monthlyValueCents: data.monthly_value_cents,
      weeklyFrequency: data.weekly_frequency,
      isActive: data.is_active,
      archivedAt: data.archived_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async archiveTeacherPlan(_actor: Actor, id: string): Promise<TeacherPlan> {
    return this.updateTeacherPlan(_actor, id, { isActive: false });
  }

  // ---------- Chave Pix do professor ----------
  async getTeacherPixKey(_actor: Actor): Promise<TeacherPixKey | null> {
    const { data, error } = await this.db
      .from("teacher_pix_keys")
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return {
      ownerId: data.owner_id,
      pixKey: data.pix_key,
      pixKeyType: data.pix_key_type,
      holderName: data.holder_name,
      holderDocument: data.holder_document,
      updatedAt: data.updated_at,
      updatedBy: data.updated_by,
    };
  }

  async upsertTeacherPixKey(_actor: Actor, input: TeacherPixKeyInput): Promise<TeacherPixKey> {
    const user = (await this.db.auth.getUser()).data.user;
    if (!user) throw new Error("Autenticação necessária.");
    const { data, error } = await this.db
      .from("teacher_pix_keys")
      .upsert({
        owner_id: user.id,
        pix_key: input.pixKey,
        pix_key_type: input.pixKeyType,
        holder_name: input.holderName,
        holder_document: input.holderDocument ?? null,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return {
      ownerId: data.owner_id,
      pixKey: data.pix_key,
      pixKeyType: data.pix_key_type,
      holderName: data.holder_name,
      holderDocument: data.holder_document,
      updatedAt: data.updated_at,
      updatedBy: data.updated_by,
    };
  }

  // ---------- Mensalidades do aluno ----------
  async listStudentMonthlyPayments(_actor: Actor, traineeId?: string): Promise<StudentMonthlyPayment[]> {
    let q = this.db.from("student_monthly_payments").select("*").order("competence", { ascending: false });
    if (traineeId) q = q.eq("trainee_id", traineeId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      id: r.id,
      traineeId: r.trainee_id,
      ownerId: r.owner_id,
      teacherPlanId: r.teacher_plan_id,
      competence: r.competence,
      dueDate: r.due_date,
      valueCents: r.value_cents,
      status: r.status,
      paidAt: r.paid_at,
      paidValueCents: r.paid_value_cents,
      paymentMethod: r.payment_method,
      notedBy: r.noted_by,
      note: r.note,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async generateMonthlyPayments(_actor: Actor, competence: string): Promise<number> {
    const { data, error } = await this.db.rpc("generate_monthly_payments", { p_competence: competence });
    if (error) throw new Error(error.message);
    return data as number;
  }

  async recordPayment(_actor: Actor, paymentId: string, paidValueCents: number, method: string, note?: string): Promise<StudentMonthlyPayment> {
    const { data, error } = await this.db.rpc("record_payment", { p_payment_id: paymentId, p_paid_value_cents: paidValueCents, p_method: method, p_note: note ?? null });
    if (error) throw new Error(error.message);
    return data as StudentMonthlyPayment;
  }

  // ---------- Disponibilidade do professor ----------
  async listTeacherAvailability(_actor: Actor): Promise<TeacherAvailability[]> {
    const { data, error } = await this.db
      .from("teacher_availability")
      .select("*")
      .order("weekday")
      .order("start_time");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      id: r.id,
      ownerId: r.owner_id,
      weekday: r.weekday,
      startTime: String(r.start_time).slice(0, 5),
      durationMin: r.duration_min,
      capacity: r.capacity,
      gymName: r.gym_name,
      isActive: r.is_active,
      createdAt: r.created_at,
    }));
  }

  async createTeacherAvailability(_actor: Actor, input: TeacherAvailabilityInput): Promise<TeacherAvailability> {
    const user = (await this.db.auth.getUser()).data.user;
    if (!user) throw new Error("Autenticação necessária.");
    const { data, error } = await this.db
      .from("teacher_availability")
      .insert({
        owner_id: user.id,
        weekday: input.weekday,
        start_time: input.startTime,
        duration_min: input.durationMin,
        capacity: input.capacity ?? 1,
        gym_name: input.gymName ?? null,
        is_active: input.isActive ?? true,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return {
      id: data.id,
      ownerId: data.owner_id,
      weekday: data.weekday,
      startTime: String(data.start_time).slice(0, 5),
      durationMin: data.duration_min,
      capacity: data.capacity,
      gymName: data.gym_name,
      isActive: data.is_active,
      createdAt: data.created_at,
    };
  }

  async updateTeacherAvailability(_actor: Actor, id: string, input: Partial<TeacherAvailabilityInput>): Promise<TeacherAvailability> {
    const update: any = {};
    if (input.weekday !== undefined) update.weekday = input.weekday;
    if (input.startTime !== undefined) update.start_time = input.startTime;
    if (input.durationMin !== undefined) update.duration_min = input.durationMin;
    if (input.capacity !== undefined) update.capacity = input.capacity;
    if (input.gymName !== undefined) update.gym_name = input.gymName;
    if (input.isActive !== undefined) update.is_active = input.isActive;

    const { data, error } = await this.db
      .from("teacher_availability")
      .update(update)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return {
      id: data.id,
      ownerId: data.owner_id,
      weekday: data.weekday,
      startTime: String(data.start_time).slice(0, 5),
      durationMin: data.duration_min,
      capacity: data.capacity,
      gymName: data.gym_name,
      isActive: data.is_active,
      createdAt: data.created_at,
    };
  }

  async deleteTeacherAvailability(_actor: Actor, id: string): Promise<void> {
    const { error } = await this.db.from("teacher_availability").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  // ---------- Agendamento fixo do aluno ----------
  async listStudentSchedules(_actor: Actor, traineeId?: string): Promise<StudentSchedule[]> {
    let q = this.db.from("student_schedules").select("*").order("created_at", { ascending: false });
    if (traineeId) q = q.eq("trainee_id", traineeId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      id: r.id,
      traineeId: r.trainee_id,
      ownerId: r.owner_id,
      teacherPlanId: r.teacher_plan_id,
      teacherAvailabilityId: r.teacher_availability_id,
      weekday: r.weekday,
      startTime: String(r.start_time).slice(0, 5),
      durationMin: r.duration_min,
      gymName: r.gym_name,
      status: r.status,
      weekStart: r.week_start,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async createStudentSchedule(_actor: Actor, input: StudentScheduleInput): Promise<StudentSchedule> {
    const user = (await this.db.auth.getUser()).data.user;
    if (!user) throw new Error("Autenticação necessária.");
    const { data, error } = await this.db
      .from("student_schedules")
      .insert({
        trainee_id: input.traineeId,
        owner_id: user.id,
        teacher_plan_id: input.teacherPlanId,
        teacher_availability_id: input.teacherAvailabilityId,
        weekday: input.weekday,
        start_time: input.startTime,
        duration_min: input.durationMin,
        gym_name: input.gymName ?? null,
        status: input.status ?? "ativo",
        week_start: input.weekStart,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return {
      id: data.id,
      traineeId: data.trainee_id,
      ownerId: data.owner_id,
      teacherPlanId: data.teacher_plan_id,
      teacherAvailabilityId: data.teacher_availability_id,
      weekday: data.weekday,
      startTime: String(data.start_time).slice(0, 5),
      durationMin: data.duration_min,
      gymName: data.gym_name,
      status: data.status,
      weekStart: data.week_start,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async updateStudentSchedule(_actor: Actor, id: string, input: Partial<StudentScheduleInput>): Promise<StudentSchedule> {
    const update: any = {};
    if (input.teacherPlanId !== undefined) update.teacher_plan_id = input.teacherPlanId;
    if (input.teacherAvailabilityId !== undefined) update.teacher_availability_id = input.teacherAvailabilityId;
    if (input.weekday !== undefined) update.weekday = input.weekday;
    if (input.startTime !== undefined) update.start_time = input.startTime;
    if (input.durationMin !== undefined) update.duration_min = input.durationMin;
    if (input.gymName !== undefined) update.gym_name = input.gymName;
    if (input.status !== undefined) update.status = input.status;
    if (input.weekStart !== undefined) update.week_start = input.weekStart;
    update.updated_at = new Date().toISOString();

    const { data, error } = await this.db
      .from("student_schedules")
      .update(update)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return {
      id: data.id,
      traineeId: data.trainee_id,
      ownerId: data.owner_id,
      teacherPlanId: data.teacher_plan_id,
      teacherAvailabilityId: data.teacher_availability_id,
      weekday: data.weekday,
      startTime: String(data.start_time).slice(0, 5),
      durationMin: data.duration_min,
      gymName: data.gym_name,
      status: data.status,
      weekStart: data.week_start,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async deleteStudentSchedule(_actor: Actor, id: string): Promise<void> {
    const { error } = await this.db.from("student_schedules").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  // ---------- Ocorrências semanais ----------
  async listScheduleOccurrences(_actor: Actor, traineeId?: string, weekStart?: string): Promise<ScheduleOccurrence[]> {
    let q = this.db.from("schedule_occurrences").select("*").order("week_start", { ascending: false }).order("scheduled_at");
    if (traineeId) q = q.eq("trainee_id", traineeId);
    if (weekStart) q = q.eq("week_start", weekStart);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      id: r.id,
      studentScheduleId: r.student_schedule_id,
      traineeId: r.trainee_id,
      ownerId: r.owner_id,
      weekStart: r.week_start,
      scheduledAt: r.scheduled_at,
      durationMin: r.duration_min,
      gymName: r.gym_name,
      status: r.status,
      originalScheduledAt: r.original_scheduled_at,
      changeReason: r.change_reason,
      changedBy: r.changed_by,
      changedAt: r.changed_at,
      createdAt: r.created_at,
    }));
  }

  async cancelOccurrence(_actor: Actor, occurrenceId: string, reason?: string): Promise<CancelOccurrenceResult> {
    // Os minutos de antecedência são calculados no servidor; o navegador não informa.
    const { data, error } = await this.db.rpc("cancel_occurrence", { p_occurrence_id: occurrenceId, p_reason: reason ?? null });
    if (error) throw new Error(error.message);
    const r = (data ?? {}) as any;
    return { status: r.status, message: r.message, weekStart: r.week_start, minutesBefore: r.minutes_before, balance: r.balance };
  }

  async chooseStudentSchedule(_actor: Actor, input: { traineeId: string; availabilityId: string; gymName?: string; scheduleId?: string }): Promise<StudentSchedule> {
    const { data, error } = await this.db.rpc("student_choose_schedule", {
      p_trainee_id: input.traineeId,
      p_availability_id: input.availabilityId,
      p_gym_name: input.gymName?.trim() || null,
      p_schedule_id: input.scheduleId ?? null,
    });
    if (error) throw new Error(error.message);
    const r = data as any;
    return {
      id: r.id, traineeId: r.trainee_id, ownerId: r.owner_id, teacherPlanId: r.teacher_plan_id,
      teacherAvailabilityId: r.teacher_availability_id, weekday: r.weekday, startTime: String(r.start_time).slice(0, 5),
      durationMin: r.duration_min, gymName: r.gym_name, status: r.status, weekStart: r.week_start,
      createdAt: r.created_at, updatedAt: r.updated_at,
    } as StudentSchedule;
  }

  async rescheduleOccurrence(_actor: Actor, occurrenceId: string, newAvailabilityId: string, newGymName?: string, isReplacement?: boolean) {
    const { data, error } = await this.db.rpc("reschedule_occurrence", {
      p_occurrence_id: occurrenceId,
      p_new_availability_id: newAvailabilityId,
      p_new_gym_name: newGymName ?? null,
      p_is_replacement: isReplacement ?? false,
    });
    if (error) throw new Error(error.message);
    const r = (data ?? {}) as any;
    return { status: r.status, newOccurrenceId: r.new_occurrence_id, message: r.message };
  }

  async generateWeeklyOccurrences(_actor: Actor, weekStart: string): Promise<number> {
    const { data, error } = await this.db.rpc("generate_weekly_occurrences", { p_week_start: weekStart });
    if (error) throw new Error(error.message);
    return data as number;
  }

  async initWeeklyReplacementBalance(_actor: Actor, traineeId: string, weekStart: string): Promise<WeeklyReplacementBalance> {
    const { data, error } = await this.db.rpc("init_weekly_replacement_balance", { p_trainee_id: traineeId, p_week_start: weekStart });
    if (error) throw new Error(error.message);
    return data as WeeklyReplacementBalance;
  }

  // ---------- Feedback do aluno ----------
  async listStudentExerciseFeedback(_actor: Actor, occurrenceId: string): Promise<StudentExerciseFeedback[]> {
    const { data, error } = await this.db
      .from("student_exercise_feedback")
      .select("*")
      .eq("occurrence_id", occurrenceId)
      .order("created_at");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      id: r.id,
      occurrenceId: r.occurrence_id,
      planVersionId: r.plan_version_id,
      traineeId: r.trainee_id,
      ownerId: r.owner_id,
      sessionId: r.session_id,
      prescribedId: r.prescribed_id,
      exerciseName: r.exercise_name,
      prescribedDose: r.prescribed_dose,
      prescribedResistance: r.prescribed_resistance,
      prescribedEffort: r.prescribed_effort,
      performedDose: r.performed_dose,
      performedResistance: r.performed_resistance,
      performedEffort: r.performed_effort,
      discomfortLevel: r.discomfort_level,
      discomfortNote: r.discomfort_note,
      studentReport: r.student_report,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async upsertStudentExerciseFeedback(_actor: Actor, input: StudentExerciseFeedbackInput): Promise<StudentExerciseFeedback> {
    const user = (await this.db.auth.getUser()).data.user;
    if (!user) throw new Error("Autenticação necessária.");
    const { data, error } = await this.db
      .from("student_exercise_feedback")
      .upsert({
        occurrence_id: input.occurrenceId,
        plan_version_id: input.planVersionId,
        trainee_id: input.traineeId,
        owner_id: user.id, // será validado pelo RLS
        session_id: input.sessionId,
        prescribed_id: input.prescribedId,
        exercise_name: input.exerciseName,
        prescribed_dose: input.prescribedDose,
        prescribed_resistance: input.prescribedResistance,
        prescribed_effort: input.prescribedEffort ?? null,
        performed_dose: input.performedDose ?? null,
        performed_resistance: input.performedResistance ?? null,
        performed_effort: input.performedEffort ?? null,
        discomfort_level: input.discomfortLevel ?? null,
        discomfort_note: input.discomfortNote ?? null,
        student_report: input.studentReport ?? null,
      }, { onConflict: "occurrence_id,prescribed_id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return {
      id: data.id,
      occurrenceId: data.occurrence_id,
      planVersionId: data.plan_version_id,
      traineeId: data.trainee_id,
      ownerId: data.owner_id,
      sessionId: data.session_id,
      prescribedId: data.prescribed_id,
      exerciseName: data.exercise_name,
      prescribedDose: data.prescribed_dose,
      prescribedResistance: data.prescribed_resistance,
      prescribedEffort: data.prescribed_effort,
      performedDose: data.performed_dose,
      performedResistance: data.performed_resistance,
      performedEffort: data.performed_effort,
      discomfortLevel: data.discomfort_level,
      discomfortNote: data.discomfort_note,
      studentReport: data.student_report,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  // ---------- Notificações do professor ----------
  async listTeacherNotifications(_actor: Actor, unreadOnly?: boolean): Promise<TeacherNotification[]> {
    let q = this.db
      .from("teacher_notifications")
      .select("*")
      .order("created_at", { ascending: false });
    if (unreadOnly) q = q.is("read_at", null);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      id: r.id,
      ownerId: r.owner_id,
      traineeId: r.trainee_id,
      studentUserId: r.student_user_id,
      type: r.type,
      title: r.title,
      summary: r.summary,
      referenceId: r.reference_id,
      referenceType: r.reference_type,
      readAt: r.read_at,
      createdAt: r.created_at,
    }));
  }

  async markNotificationRead(_actor: Actor, notificationId: string): Promise<void> {
    const { error } = await this.db
      .from("teacher_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId);
    if (error) throw new Error(error.message);
  }

  // ---------- Meus professores (para aluno) ----------
  async listMyTeachers(_actor: Actor): Promise<{ id: string; teacherUserId: string; traineeId: string; fullName: string; institution: string | null }[]> {
    const { data, error } = await this.db
      .from("my_teachers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      id: r.id,
      teacherUserId: r.teacher_user_id,
      traineeId: r.trainee_id,
      fullName: r.teacher_full_name ?? "",
      institution: r.institution ?? null,
    }));
  }
}
