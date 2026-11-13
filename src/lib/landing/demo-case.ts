// ==============================================================================
// Dados do "Caso demonstrativo" da landing, montados no SERVIDOR.
// O navegador recebe só o que a prévia mostra (texto, séries, cargas, execuções),
// sem carregar o catálogo de exercícios nem a semente inteira.
// ==============================================================================
import { buildSeed } from "@/lib/data/seed";
import { EXERCISE_BY_ID } from "@/lib/domain/exercise-library";
import { REGION_BY_ID } from "@/lib/domain/body-regions";
import { resistanceText } from "@/components/training/format";
import type { Dose, SymptomEntry } from "@/lib/domain/types";
import type { ExerciseSetRecord } from "@/lib/volume";

export interface DemoCase {
  avaliacao: {
    code: string;
    date: string;
    regionLabel: string;
    summary: string;
    facts: [string, string][];
    selectedRegions: string[];
    symptoms: SymptomEntry[];
  } | null;
  treino: {
    code: string;
    title: string;
    session: string;
    rows: { id: string; name: string; sets: number; reps: string; load: string }[];
  } | null;
  evolucao: {
    code: string;
    months: string[];
    records: ExerciseSetRecord[];
  } | null;
}

function repsText(d: Dose) {
  if (d.kind === "reps") return d.repsMin === d.repsMax ? `${d.repsMin}` : `${d.repsMin}–${d.repsMax}`;
  if (d.kind === "time") return `${d.seconds} s`;
  return `${d.meters} m`;
}

export function buildDemoCase(): DemoCase {
  const seed = buildSeed();
  const code = (traineeId: string) => seed.trainees.find((t) => t.id === traineeId)?.code ?? "";

  const a = seed.assessments.find((x) => x.blocks.complaint.symptoms.length > 0);
  const s = a?.blocks.complaint.symptoms[0];
  const avaliacao =
    a && s
      ? {
          code: code(a.traineeId),
          date: a.date,
          regionLabel: REGION_BY_ID.get(s.regionId)?.label ?? s.regionId,
          summary: a.blocks.complaint.summary,
          facts: [
            ["Intensidade", s.intensity === null ? "não informada" : `${s.intensity} de 10`],
            ["Como descreve", s.quality || "não informado"],
            ["Início", s.onset || "não informado"],
            ["Frequência", s.frequency || "não informada"],
            ["Piora com", s.aggravating || "não informado"],
            ["Alivia com", s.easing || "não informado"],
          ] as [string, string][],
          selectedRegions: a.blocks.complaint.selectedRegions,
          symptoms: a.blocks.complaint.symptoms,
        }
      : null;

  const plan = seed.plans[0];
  const version = plan?.versions.find((v) => v.status === "published") ?? plan?.versions[0];
  const session = version?.sessions[0];
  const treino =
    plan && session && session.items.length
      ? {
          code: code(plan.traineeId),
          title: plan.title,
          session: session.name,
          rows: session.items.map((it) => ({ id: it.id, name: EXERCISE_BY_ID.get(it.exerciseId)?.name ?? it.exerciseId, sets: it.dose.sets, reps: repsText(it.dose), load: resistanceText(it.resistance) })),
        }
      : null;

  const evolucao = seed.logs.length
    ? {
        code: code(seed.logs[0].traineeId),
        months: Array.from(new Set(seed.logs.map((l) => l.date.slice(0, 7)))).sort(),
        records: seed.logs.map((l) => ({ id: l.id, assessmentId: "", exerciseName: l.prescribedId, date: l.date, setNumber: l.setNumber, reps: l.reps ?? 0, loadKg: l.loadKg ?? 0, isCompleted: l.completed, modality: l.modality })),
      }
    : null;

  return { avaliacao, treino, evolucao };
}
