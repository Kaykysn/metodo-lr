"use client";

import React from "react";
import { Check, Plus, Repeat2 } from "lucide-react";

/** Linha de exercício na biblioteca da montagem de treino: nome inteiro (até duas linhas), resumo curto e um botão compacto. */
export default function PickRow({
  name,
  meta,
  onPick,
  replacing,
  inSession,
}: {
  name: string;
  meta: string;
  onPick: () => void;
  replacing: boolean;
  inSession: boolean;
}) {
  const action = replacing ? "Usar" : "Adicionar";
  return (
    <li className="group flex items-start gap-3 px-3 py-2.5 transition-colors hover:bg-theme-secondary/60">
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[15px] font-medium leading-snug" title={name}>
          {name}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] leading-snug text-theme-muted">
          {meta && <span className="line-clamp-1">{meta}</span>}
          {inSession && (
            <span className="inline-flex items-center gap-1 font-semibold text-theme-teal">
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> Na sessão
            </span>
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={onPick}
        aria-label={`${action} ${name}`}
        title={`${action} ${name}`}
        className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-theme-boundary/60 text-theme-text transition-colors hover:border-theme-teal hover:bg-theme-teal-subtle"
      >
        {replacing ? <Repeat2 className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
      </button>
    </li>
  );
}
