"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAsync, useData } from "@/components/providers/DataProvider";
import { Badge, Button, ButtonLink, EmptyState, ErrorNote, Field, InfoNote, Loading, Panel, Tabs, TabList, TabTrigger, TabContent, formatDateBR, formatCurrency, inputClass } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ui/PageHeader";
import { latest, published } from "@/lib/domain/plans";
import { can } from "@/lib/domain/roles";
import { canPerform, hasFeature } from "@/lib/subscription/entitlements";
import { ARCHIVED_MESSAGE } from "@/lib/data/repository";
import FollowUpPanel from "@/components/followup/FollowUpPanel";
import TraineePhotos from "@/components/posture/TraineePhotos";
import PractitionerAccessPanel from "@/components/trainee/PractitionerAccessPanel";
import { Calendar, CreditCard, FileText, Clock, AlertCircle, CheckCircle2, Eye, Plus, Edit, Trash2, Copy, Download, Bell, Mail, Phone, MapPin, User, DollarSign, PiggyBank, RefreshCw, ChevronDown, ChevronUp, AlertCircle as AlertCircleIcon } from "lucide-react";
import type { Trainee, TrainingPlan, TeacherPlan, StudentMonthlyPayment, StudentSchedule, ScheduleOccurrence, TeacherPixKey, StudentExerciseFeedback, PlanVersion, TeacherAvailability } from "@/lib/domain/types";
import { STUDIO_TZ, WEEKDAYS_SHORT, weekStartOf } from "@/lib/domain/schedule";

type PlanTab = "overview" | "schedule" | "payments" | "feedback";

export default function AlunoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { repo, actor, revision, bump, commercial, mode } = useData();
  const [err, setErr] = useState<string | null>(null);
  const [activePlanTab, setActivePlanTab] = useState<PlanTab>("overview");
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showAvailabilityForm, setShowAvailabilityForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState<{ traineeId: string; mode: "create" | "edit"; schedule?: StudentSchedule } | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState<{ paymentId: string } | null>(null);
  const [showPixForm, setShowPixForm] = useState(false);
  const [showGeneratePayments, setShowGeneratePayments] = useState(false);
  const [generateCompetence, setGenerateCompetence] = useState("");
  const [generating, setGenerating] = useState(false);
  const [showFeedback, setShowFeedback] = useState<{ occurrenceId: string; sessionId: string; planVersion: PlanVersion } | null>(null);

  const data = useAsync(async () => {
    const trainee = await repo.getTrainee(actor, id!);
    if (!trainee) return null;
    const [assessments, plans, teacherPlans, monthlyPayments, studentSchedules, pixKey] = await Promise.all([
      repo.listAssessments(actor, id!),
      repo.listPlans(actor, id!),
      repo.listTeacherPlans(actor),
      repo.listStudentMonthlyPayments(actor, id!),
      repo.listStudentSchedules(actor, id!),
      repo.getTeacherPixKey(actor),
    ]);
    return { trainee, assessments, plans, teacherPlans, monthlyPayments, studentSchedules, pixKey };
  }, [repo, actor, id, revision]);

  // Próximas ocorrências - hooks must be called unconditionally
  const now = useMemo(() => new Date(), []);
  const allOccurrences = useMemo(() => {
    // placeholder - will be populated after data loads
    return [] as (ScheduleOccurrence & { schedule: StudentSchedule; availability: TeacherAvailability })[];
  }, []);

  // Buscar ocorrências separadamente
  const occurrencesData = useAsync(async () => {
    if (!data.data?.studentSchedules?.length) return [];
    const all = await Promise.all(
      data.data.studentSchedules.map((s) => repo.listScheduleOccurrences(actor, data.data!.trainee.id))
    );
    return all.flat();
  }, [repo, actor, data.data?.trainee.id, data.data?.studentSchedules]);

  const upcomingOccurrences = useMemo(() => {
    if (occurrencesData.status !== "ready") return [];
    return (occurrencesData.data ?? [])
      .filter((o) => o.status === "agendada" || o.status === "reposicao")
      .filter((o) => new Date(o.scheduledAt) >= now)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
      .slice(0, 5);
  }, [occurrencesData, now]);

  const pastOccurrences = useMemo(() => {
    if (occurrencesData.status !== "ready") return [];
    return (occurrencesData.data ?? [])
      .filter((o) => o.status === "realizada" || (o.status === "agendada" && new Date(o.scheduledAt) < now))
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
      .slice(0, 10);
  }, [occurrencesData, now]);

  if (data.status === "loading") return <Loading />;
  if (data.status === "error") return <ErrorNote>{data.error}</ErrorNote>;
  if (!data.data) return <EmptyState title="Aluno não encontrado" action={<ButtonLink href="/app/alunos" variant="secondary">Voltar para alunos</ButtonLink>}>Confira o endereço ou volte à lista.</EmptyState>;

  const { trainee, assessments, plans, teacherPlans, monthlyPayments, studentSchedules, pixKey } = data.data;
  const newAssessment = async () => {
    try {
      const a = await repo.createAssessment(actor, trainee.id);
      router.push(`/app/avaliacoes/${a.id}`);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const archived = !!trainee.archivedAt;
  const canCreate = (a: Parameters<typeof can>[1]) => !archived && canPerform(actor.role, commercial.access, a);
  const canCompare = hasFeature(commercial.access, "assessment_compare");
  const setArchived = async (v: boolean) => {
    setErr(null);
    try {
      await repo.setTraineeArchived(actor, trainee.id, v);
      bump();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  // Plano ativo do aluno
  const activePlan = trainee.teacherPlanId
    ? teacherPlans.find((p) => p.id === trainee.teacherPlanId)
    : null;

  const unpaidPayments = monthlyPayments.filter((p) => p.status === "pendente" || p.status === "parcial");
  const paidPayments = monthlyPayments.filter((p) => p.status === "pago");

  return (
    <div className="space-y-6">
      <PageHeader
        badge={archived ? <Badge>Arquivado</Badge> : undefined}
        eyebrow={<Link href="/app/alunos" className="hover:underline">Alunos</Link>}
        title={trainee.displayName}
        description={`${trainee.code} · ${trainee.goal || "objetivo não informado"}`}
        actions={
          <>
            {canCreate("assessment.write") && <Button onClick={newAssessment}>Nova avaliação</Button>}
            {canCreate("plan.draft") && <ButtonLink variant="secondary" href={`/app/treinos/novo?aluno=${trainee.id}`}>Novo treino</ButtonLink>}
            <ButtonLink variant="ghost" href={`/app/evolucao?aluno=${trainee.id}`}>Ver evolução</ButtonLink>
            {can(actor.role, "trainee.write") && (
              <Button variant="ghost" onClick={() => setArchived(!archived)}>{archived ? "Reativar aluno" : "Arquivar aluno"}</Button>
            )}
          </>
        }
      />
      {err && <ErrorNote>{err}</ErrorNote>}
      {archived && <InfoNote>{ARCHIVED_MESSAGE}</InfoNote>}

      {/* ABAS PRINCIPAIS */}
      <Tabs value={activePlanTab} onValueChange={setActivePlanTab} className="space-y-4">
        <TabList className="grid w-full grid-cols-4">
          <TabTrigger value="overview">
            <FileText className="w-4 h-4 mr-2" /> Treinos
          </TabTrigger>
          <TabTrigger value="schedule">
            <Calendar className="w-4 h-4 mr-2" /> Agenda
          </TabTrigger>
          <TabTrigger value="payments">
            <CreditCard className="w-4 h-4 mr-2" /> Mensalidades
          </TabTrigger>
          <TabTrigger value="feedback">
            <Clock className="w-4 h-4 mr-2" /> Feedback
          </TabTrigger>
        </TabList>

        {/* ABA: TREINOS */}
        <TabContent value="overview">
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel className="p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold">Avaliações</h2>
                {assessments.length >= 2 && canCompare && (
                  <Link href={`/app/avaliacoes/comparar?aluno=${trainee.id}`} className="text-sm font-semibold underline underline-offset-2">Comparar duas avaliações</Link>
                )}
              </div>
              {assessments.length === 0 ? (
                <p className="text-theme-muted">Nenhuma avaliação registrada.</p>
              ) : (
                <ul className="divide-y divide-theme-border">
                  {assessments.map((a) => (
                    <li key={a.id}>
                      <Link href={`/app/avaliacoes/${a.id}`} className="flex min-h-[48px] items-center justify-between py-2 hover:text-theme-teal">
                        <span>Versão {a.version} · {formatDateBR(a.date)}</span>
                        <Badge tone={a.status === "completed" ? "success" : "neutral"}>{a.status === "completed" ? "Concluída" : "Rascunho"}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel className="p-5">
              <h2 className="mb-3 text-lg font-bold">Treinos</h2>
              {plans.length === 0 ? (
                <p className="text-theme-muted">Nenhum treino criado.</p>
              ) : (
                <ul className="divide-y divide-theme-border">
                  {plans.map((p) => (
                    <li key={p.id}>
                      <Link href={`/app/treinos/${p.id}`} className="flex min-h-[48px] items-center justify-between gap-2 py-2 hover:text-theme-teal">
                        <span className="font-medium">{p.title}</span>
                        <span className="flex gap-1.5">
                          {published(p) && <Badge tone="success">Disponível v{published(p)!.number}</Badge>}
                          {latest(p).status === "draft" && <Badge tone="caution">Rascunho v{latest(p).number}</Badge>}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {/* Plano do professor vinculado ao aluno */}
              {activePlan && (
                <div className="mt-6 p-4 rounded-panel border border-theme-border bg-theme-primary">
                  <h3 className="font-semibold mb-2">Plano ativo do aluno</h3>
                  <dl className="grid gap-2 sm:grid-cols-2 text-sm">
                    <div><dt className="text-theme-muted">Plano</dt><dd className="font-medium">{activePlan.name}</dd></div>
                    <div><dt className="text-theme-muted">Valor</dt><dd className="font-medium">{formatCurrency(activePlan.monthlyValueCents)}</dd></div>
                    <div><dt className="text-theme-muted">Frequência</dt><dd className="font-medium">{activePlan.weeklyFrequency}x/semana</dd></div>
                    <div><dt className="text-theme-muted">Vencimento</dt><dd className="font-medium">{trainee.paymentDueDay ? `Dia ${trainee.paymentDueDay}` : "Não definido"}</dd></div>
                    <div><dt className="text-theme-muted">Competência</dt><dd className="font-medium">{trainee.currentCompetence ? formatDateBR(trainee.currentCompetence) : "Não definida"}</dd></div>
                  </dl>
                  {canCreate("trainee.write") && (
                    <div className="mt-3 flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setShowPlanForm(true)}>Editar plano do aluno</Button>
                    </div>
                  )}
                </div>
              )}
            </Panel>
          </div>

          {/* Só o professor responsável dá acesso ao aluno (estudante trabalha com casos didáticos) */}
          {can(actor.role, "plan.publish") && trainee.ownerId === actor.id && (
            <PractitionerAccessPanel traineeId={trainee.id} demo={mode !== "supabase"} archived={archived} />
          )}
          {can(actor.role, "trainee.read") && <FollowUpPanel trainee={trainee} canWrite={canCreate("trainee.write")} />}
          {can(actor.role, "trainee.read") && <TraineePhotos trainee={trainee} />}
        </TabContent>

        {/* ABA: AGENDA */}
        <TabContent value="schedule">
          <div className="space-y-6">
            {/* Disponibilidade do professor */}
            <Panel className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Disponibilidade do professor</h2>
                {canCreate("trainee.write") && (
                  <Button onClick={() => setShowAvailabilityForm(true)}><Plus className="w-4 h-4 mr-2" /> Adicionar horário</Button>
                )}
              </div>
              {showAvailabilityForm && (
                <AvailabilityForm onClose={() => setShowAvailabilityForm(false)} onSaved={() => { setShowAvailabilityForm(false); bump(); }} />
              )}
              <AvailabilityList actor={actor} repo={repo} />
            </Panel>

            {/* Agendamentos fixos do aluno */}
            <Panel className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Horário fixo do aluno</h2>
                {canCreate("trainee.write") && activePlan && (
                  <Button onClick={() => setShowScheduleForm({ traineeId: trainee.id, mode: "create" })}><Plus className="w-4 h-4 mr-2" /> Definir horário</Button>
                )}
              </div>
              {showScheduleForm && (
                <ScheduleForm
                  mode={showScheduleForm.mode}
                  traineeId={showScheduleForm.traineeId}
                  schedule={showScheduleForm.schedule}
                  teacherPlans={teacherPlans}
                  activePlanId={activePlan?.id}
                  onClose={() => setShowScheduleForm(null)}
                  onSaved={() => { setShowScheduleForm(null); bump(); }}
                />
              )}
              <StudentScheduleList
                schedules={studentSchedules}
                occurrences={occurrencesData.data ?? []}
                canWrite={canCreate("trainee.write")}
                onEdit={(s: StudentSchedule) => setShowScheduleForm({ traineeId: trainee.id, mode: "edit", schedule: s })}
                onDelete={async (id: string) => { await repo.deleteStudentSchedule(actor, id); bump(); }}
              />
            </Panel>

            {/* Próximas aulas */}
            <Panel className="p-5">
              <h2 className="mb-3 text-lg font-bold">Próximas aulas</h2>
              {upcomingOccurrences.length === 0 ? (
                <p className="text-theme-muted">Nenhuma aula agendada.</p>
              ) : (
                <ul className="divide-y divide-theme-border">
                  {upcomingOccurrences.map((o) => (
                    <li key={o.id} className="flex min-h-[56px] items-center justify-between gap-2 py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-theme-teal/10 flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-theme-teal" />
                        </div>
                        <div>
                          <p className="font-medium">{new Date(o.scheduledAt).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: STUDIO_TZ })}</p>
                          <p className="text-sm text-theme-muted">{o.gymName || "Academia não informada"} · {o.durationMin} min</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={o.status === "reposicao" ? "caution" : "success"}>{o.status === "reposicao" ? "Reposição" : "Agendada"}</Badge>
                        {canCreate("trainee.write") && o.status === "agendada" && (
                          <Button variant="ghost" size="sm" onClick={() => handleCancelOccurrence(o.id)}>
                            <AlertCircle className="w-4 h-4 mr-1.5" /> Cancelar
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </TabContent>

        {/* ABA: MENSALIDADES */}
        <TabContent value="payments">
          <div className="space-y-6">
            {/* Chave Pix do professor */}
            <Panel className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Chave Pix para pagamento</h2>
                {canCreate("trainee.write") && (
                  <Button variant="secondary" onClick={() => setShowPixForm(true)}>
                    <Edit className="w-4 h-4 mr-2" /> {pixKey ? "Editar" : "Cadastrar"}
                  </Button>
                )}
              </div>
              {showPixForm && (
                <PixKeyForm
                  initial={pixKey}
                  onClose={() => setShowPixForm(false)}
                  onSaved={() => { setShowPixForm(false); bump(); }}
                />
              )}
              {pixKey ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3 p-4 rounded-panel border border-theme-border bg-theme-primary">
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-sm text-theme-muted">Chave ({pixKey.pixKeyType})</p>
                      <p className="font-mono font-semibold break-all">{pixKey.pixKey}</p>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-sm text-theme-muted">Recebedor</p>
                      <p className="font-medium">{pixKey.holderName}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(pixKey.pixKey)}>
                      <Copy className="w-4 h-4 mr-1.5" /> Copiar chave
                    </Button>
                  </div>
                  <p className="text-sm text-theme-muted">Compartilhe esta chave com o aluno para pagamento da mensalidade. A baixa é feita manualmente pelo professor após conferir o extrato.</p>
                </div>
              ) : (
                <div className="p-4 rounded-panel border border-status-caution-border bg-status-caution-bg text-status-caution-fg text-sm">
                  <AlertCircle className="w-5 h-5 mr-2 inline-block align-middle" />
                  Chave Pix ainda não cadastrada. O professor deve cadastrar a chave para que o aluno possa pagar.
                </div>
              )}
            </Panel>

            {/* Gerar mensalidades */}
            <Panel className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Gerar mensalidades</h2>
                {canCreate("trainee.write") && activePlan && (
                  <Button variant="secondary" onClick={() => setShowGeneratePayments(true)}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Gerar competência
                  </Button>
                )}
              </div>
              {showGeneratePayments && (
                <div className="p-4 rounded-panel border border-theme-border bg-theme-primary space-y-3">
                  <Field label="Competência (mês de referência)" htmlFor="comp">
                    <input id="comp" type="month" className={inputClass} value={generateCompetence} onChange={(e) => setGenerateCompetence(e.target.value)} required />
                  </Field>
                  <div className="flex gap-2">
                    <Button onClick={async () => { setGenerating(true); try { await repo.generateMonthlyPayments(actor, generateCompetence + "-01"); bump(); setShowGeneratePayments(false); } catch (e) { setErr((e as Error).message); } finally { setGenerating(false); } }} disabled={generating || !generateCompetence}>
                      {generating ? "Gerando…" : "Gerar"}
                    </Button>
                    <Button variant="ghost" onClick={() => setShowGeneratePayments(false)}>Cancelar</Button>
                  </div>
                </div>
              )}
            </Panel>

            {/* Mensalidades pendentes */}
            <Panel className="p-5">
              <h2 className="mb-3 text-lg font-bold">Mensalidades pendentes ({unpaidPayments.length})</h2>
              {unpaidPayments.length === 0 ? (
                <p className="text-theme-muted">Nenhuma mensalidade pendente.</p>
              ) : (
                <ul className="divide-y divide-theme-border">
                  {unpaidPayments.map((p) => (
                    <li key={p.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-status-caution-bg flex items-center justify-center">
                          <PiggyBank className="w-5 h-5 text-status-caution-fg" />
                        </div>
                        <div>
                          <p className="font-medium">Competência: {formatDateBR(p.competence)}</p>
                          <p className="text-sm text-theme-muted">Vencimento: {formatDateBR(p.dueDate)} · Valor: {formatCurrency(p.valueCents)}</p>
                          {p.status === "parcial" && <Badge tone="caution">Parcial: {formatCurrency(p.paidValueCents || 0)}</Badge>}
                        </div>
                      </div>
                      <div className="flex gap-2 sm:ml-auto">
                        <Button variant="secondary" size="sm" onClick={() => setShowPaymentForm({ paymentId: p.id })}>
                          <DollarSign className="w-4 h-4 mr-1.5" /> Registrar pagamento
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {/* Histórico de pagamentos */}
            <Panel className="p-5">
              <h2 className="mb-3 text-lg font-bold">Histórico de pagamentos ({paidPayments.length})</h2>
              {paidPayments.length === 0 ? (
                <p className="text-theme-muted">Nenhum pagamento registrado.</p>
              ) : (
                <ul className="divide-y divide-theme-border">
                  {paidPayments.map((p) => (
                    <li key={p.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-status-success-bg flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-status-success-fg" />
                        </div>
                        <div>
                          <p className="font-medium">Competência: {formatDateBR(p.competence)}</p>
                          <p className="text-sm text-theme-muted">Pago em: {p.paidAt ? formatDateBR(p.paidAt) : "—"} · Valor: {formatCurrency(p.paidValueCents || 0)} · {p.paymentMethod}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {showPaymentForm && (
              <PaymentForm
                payment={monthlyPayments.find((p) => p.id === showPaymentForm!.paymentId)!}
                onClose={() => setShowPaymentForm(null)}
                onSaved={() => { setShowPaymentForm(null); bump(); }}
              />
            )}
          </div>
        </TabContent>

        {/* ABA: FEEDBACK */}
        <TabContent value="feedback">
          <div className="space-y-6">
            <Panel className="p-5">
              <h2 className="mb-3 text-lg font-bold">Feedback das aulas realizadas</h2>
              {pastOccurrences.length === 0 ? (
                <p className="text-theme-muted">Nenhuma aula realizada ainda.</p>
              ) : (
                <ul className="divide-y divide-theme-border">
                  {pastOccurrences.map((o) => (
                    <li key={o.id} className="py-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-theme-secondary flex items-center justify-center">
                            <Clock className="w-5 h-5 text-theme-muted" />
                          </div>
                          <div>
                            <p className="font-medium">{new Date(o.scheduledAt).toLocaleString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: STUDIO_TZ })}</p>
                            <p className="text-sm text-theme-muted">{o.gymName || "Academia não informada"} · {o.durationMin} min</p>
                          </div>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => handleOpenFeedback(o)}>
                          <Eye className="w-4 h-4 mr-1.5" /> Ver/Editar feedback
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {showFeedback && (
              <FeedbackForm
                occurrenceId={showFeedback.occurrenceId}
                sessionId={showFeedback.sessionId}
                planVersion={showFeedback.planVersion}
                onClose={() => setShowFeedback(null)}
                onSaved={() => { setShowFeedback(null); bump(); }}
              />
            )}
          </div>
        </TabContent>
      </Tabs>
    </div>
  );

  function handleCancelOccurrence(occurrenceId: string) {
    if (!confirm("Cancelar esta aula? O aluno não perde a aula: ela fica disponível para reposição.")) return;
    repo.cancelOccurrence(actor, occurrenceId, "Cancelado pelo professor").then(() => bump()).catch((e) => setErr(e.message));
  }

  function handleOpenFeedback(occurrence: ScheduleOccurrence) {
    // Buscar a versão do treino publicada para o aluno
    const plan = plans.find((p) => p.traineeId === trainee.id);
    const publishedVersion = plan?.versions.find((v) => v.status === "published");
    if (!publishedVersion) {
      setErr("Não há treino publicado para este aluno.");
      return;
    }
    // Para simplificar, usa a primeira sessão do treino
    const session = publishedVersion.sessions[0];
    if (!session) {
      setErr("Treino sem sessões definidas.");
      return;
    }
    setShowFeedback({ occurrenceId: occurrence.id, sessionId: session.id, planVersion: publishedVersion });
  }
}

// Componentes auxiliares

function AvailabilityList({ actor, repo }: { actor: any; repo: any }) {
  const data = useAsync<TeacherAvailability[]>(() => repo.listTeacherAvailability(actor), [repo, actor]);
  if (data.status === "loading") return <Loading />;
  if (data.status === "error") return <ErrorNote>{data.error}</ErrorNote>;
  const items = data.data ?? [];
  if (items.length === 0) return <p className="text-theme-muted">Nenhum horário de disponibilidade cadastrado.</p>;
  return (
    <ul className="divide-y divide-theme-border">
      {items.map((a: TeacherAvailability) => (
        <li key={a.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2">
          <div className="flex items-center gap-3">
            <Badge tone={a.isActive ? "success" : "neutral"}>{WEEKDAYS_SHORT[a.weekday]}</Badge>
            <span className="font-mono font-medium">{a.startTime}</span>
            <span className="text-sm text-theme-muted">· {a.durationMin} min · {a.capacity} vaga{a.capacity > 1 ? "s" : ""}</span>
            {a.gymName && <span className="text-sm text-theme-muted">· {a.gymName}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function AvailabilityForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { repo, actor } = useData();
  const [form, setForm] = useState({ weekday: 1, startTime: "07:00", durationMin: 60, capacity: 1, gymName: "", isActive: true });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await repo.createTeacherAvailability(actor, form);
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 p-4 rounded-panel border border-theme-border bg-theme-primary grid gap-4 md:grid-cols-4" noValidate>
      <Field label="Dia da semana" htmlFor="av-weekday">
        <select id="av-weekday" className={inputClass} value={form.weekday} onChange={(e) => setForm({ ...form, weekday: Number(e.target.value) })}>
          {WEEKDAYS_SHORT.map((d, i) => <option key={i} value={i}>{d}</option>)}
        </select>
      </Field>
      <Field label="Início" htmlFor="av-start">
        <input id="av-start" type="time" className={inputClass} value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
      </Field>
      <Field label="Duração (min)" htmlFor="av-dur">
        <input id="av-dur" type="number" className={inputClass} min="10" max="300" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })} />
      </Field>
      <Field label="Vagas" htmlFor="av-cap">
        <input id="av-cap" type="number" className={inputClass} min="1" max="50" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
      </Field>
      <Field label="Academia (opcional)" htmlFor="av-gym" className="md:col-span-2">
        <input id="av-gym" className={inputClass} value={form.gymName} onChange={(e) => setForm({ ...form, gymName: e.target.value })} />
      </Field>
      <Field label="Ativo" htmlFor="av-active" className="flex items-center gap-2">
        <input id="av-active" type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
      </Field>
      <div className="flex gap-2 md:col-span-4">
        <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
        <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
      </div>
      {err && <ErrorNote className="md:col-span-4">{err}</ErrorNote>}
    </form>
  );
}

function StudentScheduleList({ schedules, occurrences, canWrite, onEdit, onDelete }: any) {
  if (schedules.length === 0) return <p className="text-theme-muted">Nenhum horário fixo definido para este aluno.</p>;
  return (
    <ul className="divide-y divide-theme-border">
      {schedules.map((s: any) => (
        <li key={s.id} className="py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-3">
              <Badge tone={s.status === "ativo" ? "success" : "neutral"}>{WEEKDAYS_SHORT[s.weekday]}</Badge>
              <span className="font-mono font-medium">{s.startTime}</span>
              <span className="text-sm text-theme-muted">· {s.durationMin} min</span>
              {s.gymName && <span className="text-sm text-theme-muted">· {s.gymName}</span>}
            </div>
            {canWrite && (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => onEdit(s)}><Edit className="w-4 h-4" /></Button>
                <Button variant="danger" size="sm" onClick={() => onDelete(s.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            )}
          </div>
          {/* Ocorrências desta semana */}
          <div className="mt-2 ml-10 border-l border-theme-border pl-3 space-y-1">
            {occurrences.filter((o: any) => o.studentScheduleId === s.id).slice(0, 3).map((o: any) => (
              <div key={o.id} className="text-sm text-theme-muted flex items-center gap-2">
                <span className="w-36">{new Date(o.scheduledAt).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}</span>
                <Badge tone={o.status === "realizada" ? "success" : o.status === "cancelada" ? "danger" : o.status === "perdida" ? "danger" : o.status === "reposicao" ? "caution" : "neutral"}>{o.status}</Badge>
              </div>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

function ScheduleForm({ mode, traineeId, schedule, teacherPlans, activePlanId, onClose, onSaved }: any) {
  const { repo, actor } = useData();
  const [form, setForm] = useState({
    teacherPlanId: schedule?.teacherPlanId || activePlanId || "",
    teacherAvailabilityId: schedule?.teacherAvailabilityId || "",
    weekday: schedule?.weekday ?? 1,
    startTime: schedule?.startTime || "07:00",
    durationMin: schedule?.durationMin || 60,
    gymName: schedule?.gymName || "",
    status: schedule?.status || "ativo",
    weekStart: schedule?.weekStart || weekStartOf(new Date()),
  });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const availData = useAsync(() => repo.listTeacherAvailability(actor), [repo, actor]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.teacherPlanId || !form.teacherAvailabilityId) return setErr("Selecione o plano e o horário.");
    setSaving(true);
    try {
      if (mode === "create") {
        await repo.createStudentSchedule(actor, { ...form, traineeId } as any);
      } else {
        await repo.updateStudentSchedule(actor, schedule!.id, form);
      }
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const availabilities = availData.data ?? [];

  return (
    <form onSubmit={submit} className="mt-4 p-4 rounded-panel border border-theme-border bg-theme-primary grid gap-4 md:grid-cols-3" noValidate>
      <Field label="Plano do professor" htmlFor="sch-plan">
        <select id="sch-plan" className={inputClass} value={form.teacherPlanId} onChange={(e) => setForm({ ...form, teacherPlanId: e.target.value })}>
          <option value="">Selecione</option>
          {teacherPlans.filter((p: any) => p.isActive).map((p: any) => <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.monthlyValueCents)}/{p.weeklyFrequency}x sem)</option>)}
        </select>
      </Field>
      <Field label="Horário disponível" htmlFor="sch-avail">
        <select id="sch-avail" className={inputClass} value={form.teacherAvailabilityId} onChange={(e) => setForm({ ...form, teacherAvailabilityId: e.target.value })}>
          <option value="">Selecione</option>
          {availabilities.filter((a: any) => a.isActive).map((a: any) => <option key={a.id} value={a.id}>{WEEKDAYS_SHORT[a.weekday]} {a.startTime} ({a.durationMin} min, {a.capacity} vaga{a.capacity > 1 ? "s" : ""}){a.gymName ? ` · ${a.gymName}` : ""}</option>)}
        </select>
      </Field>
      <Field label="Dia da semana" htmlFor="sch-wd">
        <select id="sch-wd" className={inputClass} value={form.weekday} onChange={(e) => setForm({ ...form, weekday: Number(e.target.value) })}>
          {WEEKDAYS_SHORT.map((d, i) => <option key={i} value={i}>{d}</option>)}
        </select>
      </Field>
      <Field label="Início" htmlFor="sch-start">
        <input id="sch-start" type="time" className={inputClass} value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
      </Field>
      <Field label="Duração (min)" htmlFor="sch-dur">
        <input id="sch-dur" type="number" className={inputClass} min="10" max="300" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })} />
      </Field>
      <Field label="Academia" htmlFor="sch-gym">
        <input id="sch-gym" className={inputClass} value={form.gymName} onChange={(e) => setForm({ ...form, gymName: e.target.value })} />
      </Field>
      <Field label="Status" htmlFor="sch-status">
        <select id="sch-status" className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="ativo">Ativo</option>
          <option value="pausado">Pausado</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </Field>
      <Field label="Início da vigência (segunda-feira)" htmlFor="sch-week">
        <input id="sch-week" type="date" className={inputClass} value={form.weekStart} onChange={(e) => setForm({ ...form, weekStart: e.target.value })} />
      </Field>
      <div className="flex gap-2 md:col-span-3">
        <Button type="submit" disabled={saving}>{saving ? "Salvando…" : mode === "create" ? "Criar" : "Atualizar"}</Button>
        <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
      </div>
      {err && <ErrorNote className="md:col-span-3">{err}</ErrorNote>}
    </form>
  );
}

function PixKeyForm({ initial, onClose, onSaved }: { initial: any; onClose: () => void; onSaved: () => void }) {
  const { repo, actor } = useData();
  const [form, setForm] = useState({
    pixKey: initial?.pixKey || "",
    pixKeyType: initial?.pixKeyType || "cpf",
    holderName: initial?.holderName || "",
    holderDocument: initial?.holderDocument || "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pixKey.trim() || !form.holderName.trim()) return setErr("Preencha a chave Pix e o nome do recebedor.");
    setSaving(true);
    try {
      await repo.upsertTeacherPixKey(actor, form);
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 p-4 rounded-panel border border-theme-border bg-theme-primary grid gap-4 md:grid-cols-2" noValidate>
      <Field label="Tipo de chave" htmlFor="pix-type">
        <select id="pix-type" className={inputClass} value={form.pixKeyType} onChange={(e) => setForm({ ...form, pixKeyType: e.target.value })}>
          <option value="cpf">CPF</option>
          <option value="cnpj">CNPJ</option>
          <option value="email">E-mail</option>
          <option value="phone">Telefone</option>
          <option value="evp">EVP (chave aleatória)</option>
          <option value="aleatoria">Chave aleatória</option>
        </select>
      </Field>
      <Field label="Chave Pix" htmlFor="pix-key">
        <input id="pix-key" className={inputClass} value={form.pixKey} onChange={(e) => setForm({ ...form, pixKey: e.target.value })} placeholder="Ex: 123.456.789-00 ou email@dominio.com" />
      </Field>
      <Field label="Nome do recebedor" htmlFor="pix-holder" className="md:col-span-2">
        <input id="pix-holder" className={inputClass} value={form.holderName} onChange={(e) => setForm({ ...form, holderName: e.target.value })} />
      </Field>
      <Field label="CPF/CNPJ do recebedor (opcional)" htmlFor="pix-doc" className="md:col-span-2">
        <input id="pix-doc" className={inputClass} value={form.holderDocument} onChange={(e) => setForm({ ...form, holderDocument: e.target.value })} placeholder="Apenas números" />
      </Field>
      <div className="flex gap-2 md:col-span-2">
        <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
        <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
      </div>
      {err && <ErrorNote className="md:col-span-2">{err}</ErrorNote>}
    </form>
  );
}

function PaymentForm({ payment, onClose, onSaved }: { payment: any; onClose: () => void; onSaved: () => void }) {
  const { repo, actor } = useData();
  const [form, setForm] = useState({ paidValueCents: payment.valueCents, method: "pix", note: "" });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.paidValueCents || form.paidValueCents <= 0) return setErr("Informe o valor pago.");
    if (form.paidValueCents > payment.valueCents) return setErr("Valor pago não pode exceder o valor da mensalidade.");
    setSaving(true);
    try {
      await repo.recordPayment(actor, payment.id, form.paidValueCents, form.method, form.note);
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <form onSubmit={submit} className="w-full max-w-md rounded-panel border border-theme-border bg-theme-primary p-6" noValidate>
        <h2 className="mb-4 text-lg font-bold">Registrar pagamento</h2>
        <p className="mb-4 text-sm text-theme-muted">Mensalidade de {formatDateBR(payment.competence)} · Vencimento: {formatDateBR(payment.dueDate)} · Total: {formatCurrency(payment.valueCents)}</p>
        <Field label="Valor pago" htmlFor="pay-value">
          <input id="pay-value" type="number" className={inputClass} min="1" max={payment.valueCents} step="1" value={form.paidValueCents} onChange={(e) => setForm({ ...form, paidValueCents: Number(e.target.value) })} />
        </Field>
        <Field label="Método" htmlFor="pay-method">
          <select id="pay-method" className={inputClass} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
            <option value="pix">Pix</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="transferencia">Transferência</option>
            <option value="outro">Outro</option>
          </select>
        </Field>
        <Field label="Observação (opcional)" htmlFor="pay-note">
          <textarea id="pay-note" className={inputClass} rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </Field>
        <div className="flex gap-2 mt-4">
          <Button type="submit" disabled={saving} className="flex-1">{saving ? "Salvando…" : "Confirmar pagamento"}</Button>
          <Button variant="ghost" type="button" onClick={onClose} className="flex-1">Cancelar</Button>
        </div>
        {err && <ErrorNote>{err}</ErrorNote>}
      </form>
    </div>
  );
}

function FeedbackForm({ occurrenceId, sessionId, planVersion, onClose, onSaved }: { occurrenceId: string; sessionId: string; planVersion: any; onClose: () => void; onSaved: () => void }) {
  const { repo, actor } = useData();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    repo.listStudentExerciseFeedback(actor, occurrenceId).then((data) => { setFeedbacks(data); setLoading(false); }).catch(() => setLoading(false));
  }, [repo, actor, occurrenceId]);

  const session = planVersion.sessions.find((s: any) => s.id === sessionId);
  if (!session) return null;

  const handleSave = async (exercise: any, performed: any) => {
    setSaving(true);
    try {
      await repo.upsertStudentExerciseFeedback(actor, {
        occurrenceId,
        planVersionId: planVersion.id,
        traineeId: actor.traineeId!, // será validado pelo RLS
        sessionId,
        prescribedId: exercise.id,
        exerciseName: exercise.exerciseName || exercise.exerciseId,
        prescribedDose: exercise.dose,
        prescribedResistance: exercise.resistance,
        prescribedEffort: exercise.effort,
        performedDose: performed.dose,
        performedResistance: performed.resistance,
        performedEffort: performed.effort,
        discomfortLevel: performed.discomfortLevel,
        discomfortNote: performed.discomfortNote,
        studentReport: performed.studentReport,
      });
      onSaved();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading label="Carregando feedback…" />;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto max-h-screen">
      <div className="w-full max-w-3xl rounded-panel border border-theme-border bg-theme-primary p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Feedback da aula</h2>
          <Button variant="ghost" onClick={onClose}><ChevronDown className="w-5 h-5" /></Button>
        </div>
        <p className="mb-4 text-sm text-theme-muted">Sessão: {session.name} · {new Date().toLocaleDateString("pt-BR")}</p>
        <div className="space-y-4">
          {session.items.map((exercise: any) => {
            const existing = feedbacks.find((f) => f.prescribedId === exercise.id);
            return (
              <FeedbackExerciseCard
                key={exercise.id}
                exercise={exercise}
                existing={existing}
                onSave={(performed) => handleSave(exercise, performed)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FeedbackExerciseCard({ exercise, existing, onSave }: { exercise: any; existing: any; onSave: (performed: any) => void }) {
  const [editing, setEditing] = useState(!!existing);
  const [performed, setPerformed] = useState({
    dose: existing?.performedDose || { kind: "reps", sets: exercise.dose.sets || 3, repsMin: exercise.dose.repsMin || 8, repsMax: exercise.dose.repsMax || 12 },
    resistance: existing?.performedResistance || exercise.resistance,
    effort: existing?.performedEffort || { scale: "rpe", target: 7 },
    discomfortLevel: existing?.discomfortLevel ?? null,
    discomfortNote: existing?.discomfortNote || "",
    studentReport: existing?.studentReport || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(performed);
    setEditing(false);
  };

  if (!editing && !existing) {
    return (
      <Panel className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{exercise.exerciseName || exercise.exerciseId}</p>
            <p className="text-sm text-theme-muted">{exercise.dose.kind === "reps" ? `${exercise.dose.sets}x ${exercise.dose.repsMin}-${exercise.dose.repsMax}` : `${exercise.dose.sets}x ${exercise.dose.seconds}s`} · {exercise.resistance.kind === "external_kg" ? exercise.resistance.kg + " kg" : exercise.resistance.kind}</p>
          </div>
          <Button size="sm" onClick={() => setEditing(true)}><Plus className="w-4 h-4 mr-1.5" /> Registrar</Button>
        </div>
      </Panel>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-panel border border-theme-border bg-theme-primary p-4 space-y-4" noValidate>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">{exercise.exerciseName || exercise.exerciseId}</p>
          <p className="text-sm text-theme-muted">Prescrito: {exercise.dose.kind === "reps" ? `${exercise.dose.sets}x ${exercise.dose.repsMin}-${exercise.dose.repsMax}` : `${exercise.dose.sets}x ${exercise.dose.seconds}s`} · {exercise.resistance.kind === "external_kg" ? exercise.resistance.kg + " kg" : exercise.resistance.kind}</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}><ChevronUp className="w-4 h-4" /></Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Carga realizada (kg)" htmlFor={`fb-kg-${exercise.id}`}>
          <input id={`fb-kg-${exercise.id}`} type="number" step="0.5" min="0" className={inputClass} value={performed.resistance.kind === "external_kg" ? performed.resistance.kg || "" : ""} onChange={(e) => setPerformed({ ...performed, resistance: { ...performed.resistance, kind: "external_kg", kg: Number(e.target.value) || null } })} />
        </Field>
        <Field label="RPE (0-10)" htmlFor={`fb-rpe-${exercise.id}`}>
          <input id={`fb-rpe-${exercise.id}`} type="number" min="0" max="10" className={inputClass} value={performed.effort.target || ""} onChange={(e) => setPerformed({ ...performed, effort: { ...performed.effort, target: Number(e.target.value) || null } })} />
        </Field>
      </div>

      <Field label="Desconforto (0-10)" htmlFor={`fb-disc-${exercise.id}`}>
        <input id={`fb-disc-${exercise.id}`} type="number" min="0" max="10" className={inputClass} value={performed.discomfortLevel ?? ""} onChange={(e) => setPerformed({ ...performed, discomfortLevel: e.target.value ? Number(e.target.value) : null })} />
      </Field>

      <Field label="Nota de desconforto" htmlFor={`fb-disc-note-${exercise.id}`}>
        <textarea id={`fb-disc-note-${exercise.id}`} className={inputClass} rows={2} value={performed.discomfortNote} onChange={(e) => setPerformed({ ...performed, discomfortNote: e.target.value })} placeholder="Onde sentiu, tipo de sensação..." />
      </Field>

      <Field label="Relato do aluno" htmlFor={`fb-report-${exercise.id}`}>
        <textarea id={`fb-report-${exercise.id}`} className={inputClass} rows={3} value={performed.studentReport} onChange={(e) => setPerformed({ ...performed, studentReport: e.target.value })} placeholder="Como foi a execução, sensações, observações..." />
      </Field>

      <div className="flex gap-2">
        <Button type="submit">Salvar</Button>
        <Button variant="ghost" type="button" onClick={() => setEditing(false)}>Cancelar</Button>
      </div>
    </form>
  );
}