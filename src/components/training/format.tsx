import React from "react";
import type { Dose, Effort, PrescribedExercise, Resistance, TrainingSession } from "@/lib/domain/types";
import { EXERCISE_BY_ID } from "@/lib/domain/exercise-library";
import { itemName } from "@/lib/catalog/bridge";

export function doseText(d: Dose) {
  if (d.kind === "reps") return `${d.sets} × ${d.repsMin === d.repsMax ? d.repsMin : `${d.repsMin}–${d.repsMax}`} repetições`;
  if (d.kind === "time") return `${d.sets} × ${d.seconds} s`;
  return `${d.sets} × ${d.meters} m`;
}

export function resistanceText(r: Resistance) {
  switch (r.kind) {
    case "external_kg":
      return r.kg === null ? "carga a definir" : `${r.kg.toLocaleString("pt-BR")} kg`;
    case "bodyweight":
      return "peso corporal";
    case "band":
      return `elástico ${r.color || "(cor a definir)"}${r.note ? ` — ${r.note}` : ""}`;
    case "pilates_springs":
      return `${r.apparatus || "aparelho"}: molas ${r.springs || "a definir"}${r.setup ? `, ${r.setup}` : ""}`;
    case "machine_setting":
      return `ajuste: ${r.setting}`;
  }
}

export function effortText(e: Effort) {
  if (e.scale === "rpe") return e.target === null ? "" : `esforço percebido ${e.target}/10`;
  if (e.scale === "rir") return e.target === null ? "" : `${e.target} repetições em reserva`;
  return "";
}

/** Séries semanais por grupo muscular. Convenção: cada série conta 1 para CADA músculo principal da ficha;
 *  músculos secundários não contam. Multiplica pela frequência informada de cada sessão. */
export function weeklySetsByMuscle(sessions: TrainingSession[], timesPerWeek: Record<string, number>) {
  const m = new Map<string, number>();
  for (const s of sessions) {
    const f = timesPerWeek[s.id] ?? 1;
    for (const it of s.items) {
      const ex = EXERCISE_BY_ID.get(it.exerciseId);
      if (!ex) continue;
      for (const mu of ex.primaryMuscles) m.set(mu, (m.get(mu) ?? 0) + it.dose.sets * f);
    }
  }
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
}

export function ItemSummary({ item, showPrivate = false }: { item: PrescribedExercise; showPrivate?: boolean }) {
  const effort = effortText(item.effort);
  return (
    <div className="space-y-1">
      <p className="font-semibold">{itemName(item)}</p>
      <p className="tabular text-[15px]">
        {doseText(item.dose)} · {resistanceText(item.resistance)}
        {effort && ` · ${effort}`}
        {item.restSeconds !== null && ` · descanso ${item.restSeconds} s`}
      </p>
      {item.cues && <p className="text-sm text-theme-muted">{item.cues}</p>}
      {item.rangeNote && <p className="text-sm text-theme-muted">Amplitude: {item.rangeNote}</p>}
      {showPrivate && item.privateNote && <p className="text-sm italic text-theme-muted">Nota privada: {item.privateNote}</p>}
    </div>
  );
}
