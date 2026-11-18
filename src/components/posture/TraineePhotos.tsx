"use client";

// Fotos na ficha do aluno, com as duas finalidades identificadas:
// "Evolução — antes e depois" (registros datados por vista e comparação de duas datas) e
// "Avaliação postural" (grade e observações por vista sobre as mesmas fotos, sem novo envio).
import React, { useState } from "react";
import PosturalEvolution from "./PosturalEvolution";
import type { Trainee } from "@/lib/domain/types";

const TABS = [
  { id: "evolucao", label: "Evolução — antes e depois" },
  { id: "postural", label: "Avaliação postural" },
] as const;

export default function TraineePhotos({ trainee }: { trainee: Trainee }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("evolucao");
  return (
    <section aria-label="Fotos do aluno" className="space-y-3">
      <div role="tablist" aria-label="Fotos" className="glass-soft inline-flex max-w-full flex-wrap gap-1 rounded-control border border-theme-border bg-theme-secondary p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            id={`fotos-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`fotos-painel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`min-h-[40px] rounded-lg px-4 text-sm font-semibold ${tab === t.id ? "bg-theme-raised shadow-subtle" : "text-theme-muted hover:text-theme-text"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`fotos-painel-${tab}`} aria-labelledby={`fotos-tab-${tab}`}>
        <PosturalEvolution key={`${trainee.id}-${tab}`} trainee={trainee} mode={tab} />
      </div>
    </section>
  );
}
