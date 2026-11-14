"use client";

import React from "react";
import type { Assessment, PrescribedExercise } from "@/lib/domain/types";
import type { ExerciseCard } from "@/lib/domain/exercise-library";
import { REGION_BY_ID } from "@/lib/domain/body-regions";
import { regionLabel } from "@/components/assessment/AnatomyMap";
import { evaluateTriage } from "@/lib/domain/triage";

// Regiões vizinhas: um sintoma no joelho importa para exercícios de coxa e perna, e assim por diante.
// Heurística editorial do app para chamar a atenção do professor; não é relação clínica.
const NEAR: Record<string, string[]> = {
  knee: ["anterior_thigh", "posterior_thigh", "leg", "calf"],
  shoulder: ["arm", "chest", "thoracic"],
  elbow: ["arm", "forearm"],
  wrist_hand: ["forearm"],
  lumbar: ["glute", "posterior_thigh", "abdomen", "hip_groin", "thoracic"],
  hip_groin: ["glute", "anterior_thigh", "posterior_thigh"],
  ankle_foot: ["calf", "leg"],
  neck: ["thoracic", "shoulder"],
};

export function relatedSymptoms(a: Assessment, ex: Pick<ExerciseCard, "regions">) {
  return a.blocks.complaint.symptoms.filter((s) => {
    const base = REGION_BY_ID.get(s.regionId)?.base ?? s.regionId.split(":")[0];
    return ex.regions.includes(base) || (NEAR[base] ?? []).some((r) => ex.regions.includes(r));
  });
}

/**
 * Pontos da avaliação que o professor pode querer considerar ao prescrever este exercício.
 * Só mostra o que foi registrado; não sugere diagnóstico, não bloqueia e não altera a prescrição
 * sozinho. "Anotar" copia o texto para a nota privada, onde o professor edita como quiser.
 */
export default function AssessmentHints({ assessment, exercise, item, onChange }: { assessment: Assessment; exercise: ExerciseCard; item: PrescribedExercise; onChange: (p: PrescribedExercise) => void }) {
  const b = assessment.blocks;
  const related = relatedSymptoms(assessment, exercise);
  const triage = evaluateTriage(b.safety);
  const limitation = b.synthesis.limitations.trim();
  const goals = b.synthesis.goals.filter((g) => g.trim());
  if (!related.length && !limitation && !goals.length && triage.status !== "urgent" && triage.status !== "refer") return null;

  const lines = related.map(
    (s) => `${regionLabel(s.regionId)}: sintoma registrado${s.intensity === null ? "" : ` (${s.intensity}/10)`}${s.radiates.state === "yes" ? ", com irradiação" : ""}${s.aggravating ? `; piora com ${s.aggravating}` : ""}`
  );
  const note = `Avaliação v${assessment.version}: ${lines.join("; ")}${limitation ? `. Limitações relatadas: ${limitation}` : ""}`;

  return (
    <aside aria-label="Pontos da avaliação" className="space-y-2 rounded-control border border-status-caution-border bg-status-caution-bg/60 p-3 text-sm sm:col-span-2 lg:col-span-4">
      <p className="font-semibold">Pontos da avaliação a considerar</p>
      {(triage.status === "urgent" || triage.status === "refer") && <p className="font-semibold text-status-danger-fg">{triage.note}</p>}
      {related.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5">
          {lines.map((l) => <li key={l}>{l}</li>)}
        </ul>
      )}
      {related.length > 0 && <p className="text-theme-muted">Esta ficha envolve músculos dessa região ou de uma região vizinha. Vale observar a resposta durante e após o exercício e ajustar amplitude, carga ou a escolha, conforme a sua avaliação.</p>}
      {limitation && <p><span className="font-semibold">Limitações relatadas:</span> {limitation}</p>}
      {goals.length > 0 && <p><span className="font-semibold">Metas:</span> {goals.join("; ")}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-theme-muted">Apoio à decisão a partir do que foi registrado. Não é diagnóstico nem recomendação definitiva.</p>
        {(related.length > 0 || limitation) && !item.privateNote.includes(note) && (
          <button type="button" className="min-h-[36px] font-semibold text-theme-teal underline" onClick={() => onChange({ ...item, privateNote: item.privateNote ? `${item.privateNote}\n${note}` : note })}>
            Anotar na nota privada
          </button>
        )}
      </div>
    </aside>
  );
}
