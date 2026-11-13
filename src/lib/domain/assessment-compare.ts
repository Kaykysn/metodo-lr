// ==============================================================================
// Comparação de duas avaliações do mesmo aluno, lado a lado.
// Regras: cada medida é comparada só com a mesma medida na mesma unidade;
// ausência fica visível ("não registrado" ≠ "não informado" ≠ zero);
// data e versão acompanham cada coluna. Não calcula "melhora" automática.
// ==============================================================================
import type { Assessment } from "./types";
import { evaluateTriage } from "./triage";

export interface CompareLine {
  section: "Contexto" | "Triagem" | "Sintomas" | "Medidas" | "Metas";
  label: string;
  a: string;
  b: string;
  /** Valores diferentes entre as colunas (só sinaliza; não julga). */
  changed: boolean;
}

const TRIAGE_TEXT = {
  incomplete: "Incompleta",
  urgent: "Sinal de urgência registrado",
  refer: "Encaminhamento indicado",
  none_reported: "Nenhum sinal relatado",
} as const;

const NOT_RECORDED = "não registrado nesta avaliação";
const num = (v: number) => v.toLocaleString("pt-BR");

export function compareAssessments(a: Assessment, b: Assessment, regionLabel: (id: string) => string = (id) => id): CompareLine[] {
  if (a.traineeId !== b.traineeId) throw new Error("Só é possível comparar avaliações do mesmo aluno.");
  const lines: CompareLine[] = [];
  const push = (section: CompareLine["section"], label: string, va: string, vb: string) => lines.push({ section, label, a: va, b: vb, changed: va !== vb });

  const ea = a.blocks.essentials;
  const eb = b.blocks.essentials;
  push("Contexto", "Objetivo", ea.goal || "não informado", eb.goal || "não informado");
  push("Contexto", "Disponibilidade", ea.weeklyAvailability === null ? "não informada" : `${ea.weeklyAvailability}x por semana`, eb.weeklyAvailability === null ? "não informada" : `${eb.weeklyAvailability}x por semana`);
  push("Contexto", "Tempo por sessão", ea.sessionMinutes === null ? "não informado" : `${ea.sessionMinutes} min`, eb.sessionMinutes === null ? "não informado" : `${eb.sessionMinutes} min`);

  const ta = evaluateTriage(a.blocks.safety);
  const tb = evaluateTriage(b.blocks.safety);
  push("Triagem", "Resultado da triagem", TRIAGE_TEXT[ta.status], TRIAGE_TEXT[tb.status]);

  // Sintomas por região (lado da pessoa). Intensidade nula = não informada, nunca zero.
  const symA = new Map(a.blocks.complaint.symptoms.map((s) => [s.regionId, s]));
  const symB = new Map(b.blocks.complaint.symptoms.map((s) => [s.regionId, s]));
  const regions = Array.from(new Set(Array.from(symA.keys()).concat(Array.from(symB.keys())))).sort();
  const symText = (s: (typeof a.blocks.complaint.symptoms)[number] | undefined) => (!s ? NOT_RECORDED : s.intensity === null ? "intensidade não informada" : `${s.intensity}/10`);
  if (!regions.length) push("Sintomas", "Regiões com sintoma", "nenhuma marcada", "nenhuma marcada");
  for (const r of regions) push("Sintomas", regionLabel(r), symText(symA.get(r)), symText(symB.get(r)));

  // Medidas: chave = nome + unidade. Mesmo nome com unidades diferentes vira linhas separadas.
  type T = (typeof a.blocks.functional.tests)[number];
  const key = (t: T) => `${t.name.trim().toLowerCase()}|${t.unit.trim().toLowerCase()}`;
  const testsA = new Map(a.blocks.functional.tests.filter((t) => t.name.trim()).map((t) => [key(t), t]));
  const testsB = new Map(b.blocks.functional.tests.filter((t) => t.name.trim()).map((t) => [key(t), t]));
  const keys = Array.from(new Set(Array.from(testsA.keys()).concat(Array.from(testsB.keys())))).sort();
  const testText = (t: T | undefined) => (!t ? NOT_RECORDED : t.value === null ? `sem resultado (${fmtDate(t.date)})` : `${num(t.value)} ${t.unit} (${fmtDate(t.date)})`);
  if (!keys.length) push("Medidas", "Testes funcionais", "nenhum registrado", "nenhum registrado");
  for (const k of keys) {
    const ref = testsA.get(k) ?? testsB.get(k)!;
    push("Medidas", `${ref.name.trim()} (${ref.unit.trim() || "sem unidade"})`, testText(testsA.get(k)), testText(testsB.get(k)));
  }

  const goals = (x: Assessment) => x.blocks.synthesis.goals.filter((g) => g.trim()).join("; ") || "nenhuma definida";
  push("Metas", "Metas", goals(a), goals(b));
  return lines;
}

function fmtDate(iso: string) {
  if (!iso) return "sem data";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
