// ==============================================================================
// STUDIO LEANDRO RANGEL - Volume de Carga (Training Volume Domain Logic)
// ==============================================================================
// Regra de Negócio:
// Volume de carga (kg) = Σ (repetições concluídas × carga externa em kg)
// Séries planejadas ou não concluídas (isCompleted = false) NÃO entram na soma.
// Atividades em peso corporal (bodyweight), elásticos (band) ou Pilates são tratadas
// como "Não se aplica" (N/A) para volume de sobrecarga externa, sem estimativas arbitrárias de kg.
// Semanas agrupadas de Segunda a Domingo no fuso horário America/Sao_Paulo.
// Contagem: cada série realizada entra uma vez no total. Exercício unilateral: cada lado
// registrado é uma série própria (repetições desse lado × carga externa desse lado).
// Isometrias (tempo) não viram kg. Não há atribuição por músculo: exercícios compostos
// envolvem vários músculos e qualquer divisão exigiria um método documentado.

export type ModalityType = "weight" | "bodyweight" | "band" | "pilates";

export interface ExerciseSetRecord {
  id: string;
  assessmentId: string;
  exerciseName: string;
  date: string; // ISO date YYYY-MM-DD
  setNumber: number;
  reps: number;
  loadKg: number; // Carga externa total normalizada em kg (ex: halteres de 10kg cada = 20kg no total)
  isCompleted: boolean;
  modality: ModalityType;
  notes?: string;
}

export interface WeeklyVolumeBucket {
  weekIndex: number; // 1, 2, 3, 4, 5
  weekLabel: string; // Ex: "Semana 1 (01/02 - 07/02)"
  startDate: string;
  endDate: string;
  isPartial: boolean;
  completedSetsCount: number;
  totalReps: number;
  volumeKg: number; // Soma calculada dinamicamente das repetições x carga
  hasNonWeightActivities: boolean;
  sets: ExerciseSetRecord[];
}

export interface MonthlyVolumeSummary {
  monthKey: string; // "2027-02"
  monthLabel: string; // "Fevereiro de 2027"
  totalVolumeKg: number; // Soma de todos os buckets daquele mês
  totalCompletedSets: number;
  totalReps: number;
  weeks: WeeklyVolumeBucket[];
  comparisonMonthKey?: string;
  growthPercentage?: number | null; // null se base não existir ou for zero
  hasZeroBaseline: boolean;
}

/**
 * Formata números no padrão brasileiro (pt-BR)
 */
export function formatKgPtBR(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Calcula o volume de uma série individual
 */
export function calculateSetVolume(set: ExerciseSetRecord): number {
  if (!set.isCompleted) return 0;
  if (set.modality !== "weight") return 0;
  return set.reps * set.loadKg;
}

/**
 * Agrupa os registros em semanas de Segunda a Domingo dentro do mês selecionado
 * e calcula os totais reais dinamicamente.
 */
export function aggregateMonthlyVolume(
  sets: ExerciseSetRecord[],
  yearMonth: string, // "2027-02"
  comparisonSets?: ExerciseSetRecord[],
  comparisonMonth?: string
): MonthlyVolumeSummary {
  const [yearStr, monthStr] = yearMonth.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-indexed

  // Filtra apenas séries do mês selecionado
  const monthSets = sets.filter((s) => {
    return s.date.startsWith(yearMonth);
  });

  // Dias no mês
  const daysInMonth = new Date(year, month, 0).getDate();

  // Determina semanas (Segunda a Domingo)
  const weeks: WeeklyVolumeBucket[] = [];
  let currentDay = 1;
  let weekIndex = 1;

  while (currentDay <= daysInMonth) {
    const startDateObj = new Date(year, month - 1, currentDay);
    // getDay(): 0 é Domingo, 1 é Segunda, ... 6 é Sábado
    const dayOfWeek = startDateObj.getDay(); 
    // Dias até o próximo domingo (domingo = 0)
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const endDay = Math.min(daysInMonth, currentDay + daysUntilSunday);

    const startIso = `${yearStr}-${monthStr.padStart(2, "0")}-${String(currentDay).padStart(2, "0")}`;
    const endIso = `${yearStr}-${monthStr.padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;

    const isPartial = (currentDay === 1 && dayOfWeek !== 1) || (endDay === daysInMonth && new Date(year, month - 1, endDay).getDay() !== 0);

    const startFormatted = `${String(currentDay).padStart(2, "0")}/${monthStr.padStart(2, "0")}`;
    const endFormatted = `${String(endDay).padStart(2, "0")}/${monthStr.padStart(2, "0")}`;

    const weekSets = monthSets.filter((s) => s.date >= startIso && s.date <= endIso);
    
    let weekVolume = 0;
    let completedSetsCount = 0;
    let totalReps = 0;
    let hasNonWeightActivities = false;

    for (const set of weekSets) {
      if (set.modality !== "weight") {
        hasNonWeightActivities = true;
      }
      if (set.isCompleted) {
        completedSetsCount++;
        totalReps += set.reps;
        weekVolume += calculateSetVolume(set);
      }
    }

    weeks.push({
      weekIndex,
      weekLabel: `Semana ${weekIndex} (${startFormatted} - ${endFormatted})${isPartial ? " [parcial]" : ""}`,
      startDate: startIso,
      endDate: endIso,
      isPartial,
      completedSetsCount,
      totalReps,
      volumeKg: weekVolume,
      hasNonWeightActivities,
      sets: weekSets,
    });

    currentDay = endDay + 1;
    weekIndex++;
  }

  // Total do mês é a soma dos buckets calculados
  const totalVolumeKg = weeks.reduce((acc, w) => acc + w.volumeKg, 0);
  const totalCompletedSets = weeks.reduce((acc, w) => acc + w.completedSetsCount, 0);
  const totalReps = weeks.reduce((acc, w) => acc + w.totalReps, 0);

  // Mês em português
  const monthDate = new Date(year, month - 1, 1);
  const monthName = monthDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  // Cálculo de crescimento com verificação de divisão por zero
  let growthPercentage: number | null = null;
  let hasZeroBaseline = false;

  if (comparisonMonth && comparisonSets) {
    const compSummary = aggregateMonthlyVolume(comparisonSets, comparisonMonth);
    if (compSummary.totalVolumeKg === 0) {
      hasZeroBaseline = true;
      growthPercentage = null;
    } else {
      growthPercentage = ((totalVolumeKg - compSummary.totalVolumeKg) / compSummary.totalVolumeKg) * 100;
    }
  }

  return {
    monthKey: yearMonth,
    monthLabel: capitalizedMonth,
    totalVolumeKg,
    totalCompletedSets,
    totalReps,
    weeks,
    comparisonMonthKey: comparisonMonth,
    growthPercentage,
    hasZeroBaseline,
  };
}

// ==============================================================================
// DADOS FICTÍCIOS DE DEMONSTRAÇÃO (REPRODUCÍVEIS PARA FEVEREIRO DE 2027)
// ==============================================================================
// Em Fevereiro de 2027:
// Dia 01/02/2027 é uma Segunda-feira e 28/02/2027 é um Domingo.
// Exatamente 4 semanas completas:
// Semana 1 (01 a 07/02): meta dinâmica = 1.200 kg
// Semana 2 (08 a 14/02): meta dinâmica = 1.400 kg
// Semana 3 (15 a 21/02): meta dinâmica = 1.300 kg
// Semana 4 (22 a 28/02): meta dinâmica = 1.600 kg
// Total dinâmico exato = 5.500 kg!

export const FIXTURE_EXERCISE_SETS_FEB_2027: ExerciseSetRecord[] = [
  // --- SEMANA 1 (01/02 - 07/02/2027) -> Alvo: 1.200 kg ---
  // Treino A (02/02/2027): Agachamento Caixa 3x10 @ 25kg = 750 kg
  { id: "s-01", assessmentId: "demo-tre-5831", exerciseName: "Agachamento Caixa", date: "2027-02-02", setNumber: 1, reps: 10, loadKg: 25, isCompleted: true, modality: "weight" },
  { id: "s-02", assessmentId: "demo-tre-5831", exerciseName: "Agachamento Caixa", date: "2027-02-02", setNumber: 2, reps: 10, loadKg: 25, isCompleted: true, modality: "weight" },
  { id: "s-03", assessmentId: "demo-tre-5831", exerciseName: "Agachamento Caixa", date: "2027-02-02", setNumber: 3, reps: 10, loadKg: 25, isCompleted: true, modality: "weight" },
  // Treino A: Elevação Pélvica com Elástico (N/A kg)
  { id: "s-04", assessmentId: "demo-tre-5831", exerciseName: "Ponte Glútea com Elástico", date: "2027-02-02", setNumber: 1, reps: 15, loadKg: 0, isCompleted: true, modality: "band" },
  // Treino B (05/02/2027): Leg Press Horizontal 3x10 @ 15kg = 450 kg (Soma semana 1: 750 + 450 = 1.200 kg)
  { id: "s-05", assessmentId: "demo-tre-5831", exerciseName: "Leg Press Horizontal", date: "2027-02-05", setNumber: 1, reps: 10, loadKg: 15, isCompleted: true, modality: "weight" },
  { id: "s-06", assessmentId: "demo-tre-5831", exerciseName: "Leg Press Horizontal", date: "2027-02-05", setNumber: 2, reps: 10, loadKg: 15, isCompleted: true, modality: "weight" },
  { id: "s-07", assessmentId: "demo-tre-5831", exerciseName: "Leg Press Horizontal", date: "2027-02-05", setNumber: 3, reps: 10, loadKg: 15, isCompleted: true, modality: "weight" },
  // Série pulada (não conta no volume):
  { id: "s-08", assessmentId: "demo-tre-5831", exerciseName: "Leg Press Horizontal", date: "2027-02-05", setNumber: 4, reps: 10, loadKg: 15, isCompleted: false, modality: "weight", notes: "Série omitida por controle de fadiga" },

  // --- SEMANA 2 (08/02 - 14/02/2027) -> Alvo: 1.400 kg ---
  // Treino A (09/02/2027): Agachamento Caixa 3x10 @ 30kg = 900 kg
  { id: "s-09", assessmentId: "demo-tre-5831", exerciseName: "Agachamento Caixa", date: "2027-02-09", setNumber: 1, reps: 10, loadKg: 30, isCompleted: true, modality: "weight" },
  { id: "s-10", assessmentId: "demo-tre-5831", exerciseName: "Agachamento Caixa", date: "2027-02-09", setNumber: 2, reps: 10, loadKg: 30, isCompleted: true, modality: "weight" },
  { id: "s-11", assessmentId: "demo-tre-5831", exerciseName: "Agachamento Caixa", date: "2027-02-09", setNumber: 3, reps: 10, loadKg: 30, isCompleted: true, modality: "weight" },
  // Treino B (12/02/2027): Supino com Halteres 2x (par de 10kg = 20kg carga total) = 10 e 15 reps -> 10x20 + 15x20 = 200 + 300 = 500 kg (Soma: 900 + 500 = 1.400 kg)
  { id: "s-12", assessmentId: "demo-tre-5831", exerciseName: "Supino Halteres (Total)", date: "2027-02-12", setNumber: 1, reps: 10, loadKg: 20, isCompleted: true, modality: "weight" },
  { id: "s-13", assessmentId: "demo-tre-5831", exerciseName: "Supino Halteres (Total)", date: "2027-02-12", setNumber: 2, reps: 15, loadKg: 20, isCompleted: true, modality: "weight" },

  // --- SEMANA 3 (15/02 - 21/02/2027) -> Alvo: 1.300 kg ---
  // Treino A (16/02/2027): Levantamento Terra Romeno 3x10 @ 30kg = 900 kg
  { id: "s-14", assessmentId: "demo-tre-5831", exerciseName: "Terra Romeno", date: "2027-02-16", setNumber: 1, reps: 10, loadKg: 30, isCompleted: true, modality: "weight" },
  { id: "s-15", assessmentId: "demo-tre-5831", exerciseName: "Terra Romeno", date: "2027-02-16", setNumber: 2, reps: 10, loadKg: 30, isCompleted: true, modality: "weight" },
  { id: "s-16", assessmentId: "demo-tre-5831", exerciseName: "Terra Romeno", date: "2027-02-16", setNumber: 3, reps: 10, loadKg: 30, isCompleted: true, modality: "weight" },
  // Treino B (19/02/2027): Remada Curvada 2x10 @ 20kg = 400 kg (Soma: 900 + 400 = 1.300 kg)
  { id: "s-17", assessmentId: "demo-tre-5831", exerciseName: "Remada Curvada", date: "2027-02-19", setNumber: 1, reps: 10, loadKg: 20, isCompleted: true, modality: "weight" },
  { id: "s-18", assessmentId: "demo-tre-5831", exerciseName: "Remada Curvada", date: "2027-02-19", setNumber: 2, reps: 10, loadKg: 20, isCompleted: true, modality: "weight" },
  // Treino B: Prancha Abdominal (peso corporal - N/A)
  { id: "s-19", assessmentId: "demo-tre-5831", exerciseName: "Prancha Frontal", date: "2027-02-19", setNumber: 1, reps: 1, loadKg: 0, isCompleted: true, modality: "bodyweight" },

  // --- SEMANA 4 (22/02 - 28/02/2027) -> Alvo: 1.600 kg ---
  // Treino A (23/02/2027): Agachamento Caixa 4x10 @ 25kg = 1.000 kg
  { id: "s-20", assessmentId: "demo-tre-5831", exerciseName: "Agachamento Caixa", date: "2027-02-23", setNumber: 1, reps: 10, loadKg: 25, isCompleted: true, modality: "weight" },
  { id: "s-21", assessmentId: "demo-tre-5831", exerciseName: "Agachamento Caixa", date: "2027-02-23", setNumber: 2, reps: 10, loadKg: 25, isCompleted: true, modality: "weight" },
  { id: "s-22", assessmentId: "demo-tre-5831", exerciseName: "Agachamento Caixa", date: "2027-02-23", setNumber: 3, reps: 10, loadKg: 25, isCompleted: true, modality: "weight" },
  { id: "s-23", assessmentId: "demo-tre-5831", exerciseName: "Agachamento Caixa", date: "2027-02-23", setNumber: 4, reps: 10, loadKg: 25, isCompleted: true, modality: "weight" },
  // Treino B (26/02/2027): Leg Press 3x10 @ 20kg = 600 kg (Soma: 1.000 + 600 = 1.600 kg)
  { id: "s-24", assessmentId: "demo-tre-5831", exerciseName: "Leg Press Horizontal", date: "2027-02-26", setNumber: 1, reps: 10, loadKg: 20, isCompleted: true, modality: "weight" },
  { id: "s-25", assessmentId: "demo-tre-5831", exerciseName: "Leg Press Horizontal", date: "2027-02-26", setNumber: 2, reps: 10, loadKg: 20, isCompleted: true, modality: "weight" },
  { id: "s-26", assessmentId: "demo-tre-5831", exerciseName: "Leg Press Horizontal", date: "2027-02-26", setNumber: 3, reps: 10, loadKg: 20, isCompleted: true, modality: "weight" },
];

// Dados adicionais para teste de filtro: Março de 2027
export const FIXTURE_EXERCISE_SETS_MAR_2027: ExerciseSetRecord[] = [
  { id: "m-01", assessmentId: "demo-tre-5831", exerciseName: "Agachamento Caixa", date: "2027-03-02", setNumber: 1, reps: 10, loadKg: 30, isCompleted: true, modality: "weight" },
  { id: "m-02", assessmentId: "demo-tre-5831", exerciseName: "Agachamento Caixa", date: "2027-03-02", setNumber: 2, reps: 10, loadKg: 30, isCompleted: true, modality: "weight" },
  { id: "m-03", assessmentId: "demo-tre-5831", exerciseName: "Agachamento Caixa", date: "2027-03-02", setNumber: 3, reps: 10, loadKg: 30, isCompleted: true, modality: "weight" },
  { id: "m-04", assessmentId: "demo-tre-5831", exerciseName: "Leg Press Horizontal", date: "2027-03-05", setNumber: 1, reps: 12, loadKg: 25, isCompleted: true, modality: "weight" },
  { id: "m-05", assessmentId: "demo-tre-5831", exerciseName: "Leg Press Horizontal", date: "2027-03-05", setNumber: 2, reps: 12, loadKg: 25, isCompleted: true, modality: "weight" },
];

export const ALL_FIXTURE_SETS = [
  ...FIXTURE_EXERCISE_SETS_FEB_2027,
  ...FIXTURE_EXERCISE_SETS_MAR_2027,
];
