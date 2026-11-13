"use client";

import React from "react";
import type { Answer } from "@/lib/domain/types";

const OPTIONS: { state: Answer["state"]; label: string }[] = [
  { state: "yes", label: "Sim" },
  { state: "no", label: "Não" },
  { state: "not_assessed", label: "Não avaliado" },
  { state: "not_applicable", label: "Não se aplica" },
];

/** Resposta com quatro estados explícitos. "Sem resposta" é diferente de "Não". */
export function AnswerControl({
  id,
  legend,
  help,
  value,
  onChange,
  disabled,
  allowNA = true,
}: {
  id: string;
  legend: string;
  help?: string;
  value: Answer | undefined;
  onChange: (a: Answer) => void;
  disabled?: boolean;
  allowNA?: boolean;
}) {
  const current = value?.state ?? "unanswered";
  return (
    <fieldset className="space-y-2" aria-describedby={help ? `${id}-help` : undefined}>
      <legend className="text-[15px] font-semibold text-theme-text">{legend}</legend>
      {help && (
        <p id={`${id}-help`} className="text-sm text-theme-muted">
          {help}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {OPTIONS.filter((o) => allowNA || o.state !== "not_applicable").map((o) => {
          const checked = current === o.state;
          return (
            <label
              key={o.state}
              className={`inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-control border px-3 text-sm font-medium transition-colors ${
                checked ? "border-theme-teal bg-theme-teal-subtle text-theme-text" : "border-theme-border bg-theme-raised text-theme-muted hover:text-theme-text"
              } ${disabled ? "pointer-events-none opacity-60" : ""}`}
            >
              <input
                type="radio"
                className="sr-only"
                name={id}
                checked={checked}
                disabled={disabled}
                onChange={() => onChange({ state: o.state } as Answer)}
              />
              <span aria-hidden="true" className={`h-3 w-3 rounded-full border-2 ${checked ? "border-theme-teal bg-theme-teal" : "border-theme-boundary"}`} />
              {o.label}
            </label>
          );
        })}
        {current === "unanswered" && <span className="self-center text-sm italic text-theme-subtle">Sem resposta</span>}
      </div>
    </fieldset>
  );
}

export function answerText(a: Answer | undefined): string {
  switch (a?.state) {
    case "yes":
      return "Sim";
    case "value":
      return String(a.value);
    case "no":
      return "Não";
    case "not_assessed":
      return "Não avaliado";
    case "not_applicable":
      return "Não se aplica";
    default:
      return "Sem resposta";
  }
}

export function NumberInput({
  id,
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled,
  className = "",
  ...rest
}: {
  id: string;
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <input
      id={id}
      type="number"
      inputMode="decimal"
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      value={value ?? ""}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "") return onChange(null); // vazio = não informado, nunca 0
        const n = Number(raw);
        if (Number.isFinite(n)) onChange(max !== undefined ? Math.min(max, Math.max(min ?? -Infinity, n)) : n);
      }}
      className={`tabular w-full min-h-[44px] rounded-control border border-theme-boundary/70 bg-theme-raised px-3 text-[15px] focus:border-theme-teal focus:outline-none focus:ring-2 focus:ring-theme-teal/25 ${className}`}
      {...rest}
    />
  );
}
