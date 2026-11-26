"use client";

import React, { Suspense, useMemo, useState } from "react";
import PosturalEvolution from "@/components/posture/PosturalEvolution";
import { useSearchParams } from "next/navigation";
import { useAsync, useData } from "@/components/providers/DataProvider";
import { DemoBadge, EmptyState, ErrorNote, Field, InfoNote, Loading, Panel, inputClass } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ui/PageHeader";
import { Bars, Ratio, TimeLine, type Point } from "@/components/charts/Charts";
import { aggregateMonthlyVolume, formatKgPtBR, type ExerciseSetRecord } from "@/lib/volume";
import { EXERCISE_BY_ID } from "@/lib/domain/exercise-library";
import { itemName } from "@/lib/catalog/bridge";
import { published } from "@/lib/domain/plans";
import { regionLabel } from "@/components/assessment/AnatomyMap";
import { FeatureGate } from "@/components/subscription/PlanNotices";
import { hasFeature } from "@/lib/subscription/entitlements";

export default function EvolucaoPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Evolucao />
    </Suspense>
  );
}

function Evolucao() {
  const { repo, actor, revision, mode, commercial } = useData();
  const dashboardOn = hasFeature(commercial.access, "consolidated_dashboard");
  const params = useSearchParams();
  const trainees = useAsync(() => repo.listTrainees(actor), [repo, actor, revision]);
  const [traineeId, setTraineeId] = useState(params.get("aluno") ?? "");
  const tid = traineeId || trainees.data?.[0]?.id || "";
  const selectedTrainee = trainees.data?.find((t) => t.id === tid) ?? null;

  const data = useAsync(async () => {
    if (!tid) return null;
    const [assessments, plans, logs] = await Promise.all([repo.listAssessments(actor, tid), repo.listPlans(actor, tid), repo.listLogs(actor, tid)]);
    return { assessments, plans, logs };
  }, [repo, actor, tid, revision]);

  const months = useMemo(() => Array.from(new Set((data.data?.logs ?? []).map((l) => l.date.slice(0, 7)))).sort(), [data.data]);
  const [month, setMonth] = useState("");
  const m = month || months[months.length - 1] || "";
  const [exercise, setExercise] = useState("");

  if (trainees.status === "loading") return <Loading />;
  if (trainees.status === "error") return <ErrorNote>{trainees.error}</ErrorNote>;
  if (!trainees.data?.length) return <EmptyState title="Nenhum aluno para acompanhar">Cadastre um aluno e disponibilize um treino para ver a evolução.</EmptyState>;

  const d = data.data;
  // ---- Sintomas: avaliação (por região) + registros de sessão; escala fixa 0–10
  const painPoints: Point[] = [];
  d?.assessments.forEach((a) => a.blocks.complaint.symptoms.forEach((s) => s.intensity !== null && painPoints.push({ date: a.date, value: s.intensity, context: `Avaliação v${a.version} — ${regionLabel(s.regionId)}` })));
  const bySessionDay = new Map<string, number>();
  d?.logs.forEach((l) => l.symptomIntensity !== null && bySessionDay.set(l.date, Math.max(bySessionDay.get(l.date) ?? 0, l.symptomIntensity)));
  bySessionDay.forEach((v, date) => painPoints.push({ date, value: v, context: "Maior valor relatado na sessão" }));
  painPoints.sort((a, b) => a.date.localeCompare(b.date));

  // ---- Testes funcionais: um gráfico por teste/unidade (nunca misturar com dor ou kg)
  const tests = new Map<string, Point[]>();
  d?.assessments.forEach((a) => a.blocks.functional.tests.forEach((t) => t.value !== null && t.name && tests.set(`${t.name}|${t.unit}`, [...(tests.get(`${t.name}|${t.unit}`) ?? []), { date: t.date, value: t.value, context: `Avaliação v${a.version}` }])));

  // ---- Volume semanal (cálculo do domínio: só séries concluídas com carga externa)
  const records: ExerciseSetRecord[] = (d?.logs ?? []).map((l) => ({
    id: l.id, assessmentId: "", exerciseName: EXERCISE_BY_ID.get(l.prescribedId)?.name ?? l.prescribedId, date: l.date,
    setNumber: l.setNumber, reps: l.reps ?? 0, loadKg: l.loadKg ?? 0, isCompleted: l.completed, modality: l.modality,
  }));
  const vol = m ? aggregateMonthlyVolume(records, m) : null;

  // ---- Adesão: sessões com ao menos uma série concluída / sessões previstas no mês
  const plan = d?.plans.find((p) => published(p));
  const doneDays = new Set((d?.logs ?? []).filter((l) => l.completed && l.date.startsWith(m)).map((l) => l.date)).size;
  let planned = 0;
  if (plan && m) {
    const [y, mo] = m.split("-").map(Number);
    const first = new Date(Date.UTC(y, mo - 1, 1));
    const last = new Date(Date.UTC(y, mo, 0));
    const start = new Date(`${plan.startDate}T00:00:00Z`);
    const end = new Date(start.getTime() + plan.weeks * 7 * 864e5);
    const from = start > first ? start : first;
    const to = end < last ? end : last;
    const days = Math.max(0, Math.floor((to.getTime() - from.getTime()) / 864e5) + 1);
    planned = Math.round((days / 7) * plan.frequencyPerWeek);
  }

  // ---- Carga por exercício (só exercícios com kg)
  const kgExercises = Array.from(new Set((d?.logs ?? []).filter((l) => l.loadKg !== null).map((l) => l.prescribedId)));
  const pv = plan ? published(plan) : undefined;
  const exName = (pid: string) => {
    const item = pv?.sessions.flatMap((s) => s.items).find((i) => i.id === pid);
    return item ? itemName(item) : pid;
  };
  const ex = exercise || kgExercises[0] || "";
  const loadPoints: Point[] = [];
  if (ex) {
    const perDay = new Map<string, number>();
    (d?.logs ?? []).filter((l) => l.prescribedId === ex && l.completed && l.loadKg !== null).forEach((l) => perDay.set(l.date, Math.max(perDay.get(l.date) ?? 0, l.loadKg!)));
    perDay.forEach((v, date) => loadPoints.push({ date, value: v, context: "Maior carga concluída no dia" }));
    loadPoints.sort((a, b) => a.date.localeCompare(b.date));
  }
  const maxKg = Math.max(10, ...loadPoints.map((p) => p.value));

  return (
    <div className="space-y-6">
      <PageHeader title="Evolução" description="Sintomas, função, carga e adesão em gráficos separados, cada um com sua unidade." badge={mode === "demo" ? <DemoBadge /> : undefined} />
      <Panel className="grid gap-3 p-4 sm:grid-cols-3">
        <Field label="Aluno" htmlFor="ev-aluno">
          <select id="ev-aluno" className={inputClass} value={tid} onChange={(e) => { setTraineeId(e.target.value); setMonth(""); setExercise(""); }}>
            {trainees.data.map((t) => <option key={t.id} value={t.id}>{t.displayName} ({t.code})</option>)}
          </select>
        </Field>
        <Field label="Mês (volume e adesão)" htmlFor="ev-mes">
          <select id="ev-mes" className={inputClass} value={m} onChange={(e) => setMonth(e.target.value)} disabled={!months.length || !dashboardOn}>
            {!months.length && <option value="">Sem execuções registradas</option>}
            {months.map((x) => <option key={x} value={x}>{new Date(`${x}-15T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "America/Sao_Paulo" })}</option>)}
          </select>
        </Field>
        <Field label="Exercício (carga)" htmlFor="ev-ex">
          <select id="ev-ex" className={inputClass} value={ex} onChange={(e) => setExercise(e.target.value)} disabled={!kgExercises.length}>
            {!kgExercises.length && <option value="">Sem exercícios com carga em kg</option>}
            {kgExercises.map((x) => <option key={x} value={x}>{exName(x)}</option>)}
          </select>
        </Field>
      </Panel>

      {data.status === "loading" && <Loading />}
      {data.status === "error" && <ErrorNote>{data.error}</ErrorNote>}
      {d && (
        <div id="evolucao-graficos" className="grid scroll-mt-20 gap-6 lg:grid-cols-2">
          <Panel className="p-5"><TimeLine label="Intensidade dos sintomas relatados (0–10)" points={painPoints} yMin={0} yMax={10} unit="/10" /></Panel>
          <FeatureGate feature="consolidated_dashboard">
          <Panel className="p-5">
            <h2 className="mb-3 font-semibold">Sessões concluídas no mês</h2>
            {plan ? <Ratio done={doneDays} total={planned} label="sessões concluídas das previstas pelo treino disponível" /> : <p className="text-theme-muted">Nenhum treino disponibilizado: não há sessões previstas para comparar.</p>}
            <p className="mt-3 text-sm text-theme-muted">Denominador: frequência semanal do treino × dias do mês dentro do período do treino. Sessão concluída = dia com ao menos uma série marcada como feita.</p>
          </Panel>
          </FeatureGate>
          {dashboardOn && (
          <Panel className="p-5 lg:col-span-2">
            {vol ? (
              <>
                <Bars
                  label={`Volume de carga externa por semana — total do mês: ${formatKgPtBR(vol.totalVolumeKg)} kg`}
                  unit="kg"
                  bars={vol.weeks.map((w) => ({ label: `Sem. ${w.weekIndex}`, sub: `${w.startDate.slice(8)}–${w.endDate.slice(8)}${w.isPartial ? " parcial" : ""}`, value: w.completedSetsCount === 0 ? null : w.volumeKg, note: w.hasNonWeightActivities ? "inclui séries sem carga externa (não somam kg)" : "" }))}
                />
                <p className="mt-3 text-sm text-theme-muted">Volume = repetições concluídas × carga externa (kg), somando cada série realizada uma vez. Séries planejadas e não concluídas ficam de fora. Em exercícios unilaterais, cada lado registrado é uma série. Peso corporal, elásticos, molas e isometrias (tempo) não entram como kg. É o volume total, sem divisão por músculo. Mais volume não significa automaticamente melhor evolução.</p>
              </>
            ) : (
              <p className="text-theme-muted">Sem execuções registradas para calcular volume.</p>
            )}
          </Panel>
          )}
          <Panel className="p-5"><TimeLine label={`Carga — ${ex ? exName(ex) : "exercício"}`} points={loadPoints} yMin={0} yMax={Math.ceil(maxKg / 5) * 5} unit="kg" color="rgb(var(--chart-bar))" /></Panel>
          <Panel className="space-y-6 p-5">
            {tests.size === 0 ? (
              <p className="text-theme-muted">Nenhum teste funcional registrado nas avaliações.</p>
            ) : (
              Array.from(tests.entries()).map(([k, pts]) => {
                const [name, unit] = k.split("|");
                const max = Math.max(...pts.map((p) => p.value));
                return <TimeLine key={k} label={`${name} (${unit})`} points={pts.sort((a, b) => a.date.localeCompare(b.date))} yMin={0} yMax={Math.ceil(max * 1.25) || 1} unit={unit} color="rgb(var(--chart-bar))" height={180} />;
              })
            )}
          </Panel>
          <div className="lg:col-span-2"><InfoNote>Datas no fuso America/São Paulo. Semanas de segunda a domingo; semanas parciais são indicadas. Lacunas entre medições não são preenchidas.</InfoNote></div>
        </div>
      )}
      {selectedTrainee && <PosturalEvolution key={selectedTrainee.id} trainee={selectedTrainee} />}
    </div>
  );
}
