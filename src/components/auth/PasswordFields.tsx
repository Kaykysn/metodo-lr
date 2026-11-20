"use client";

// Campos "Criar senha" e "Confirmar senha" com os requisitos ao lado (regra do Método LR).
// Usado na ativação pelo convite e na redefinição. O servidor aplica a mesma regra.
import React, { useId } from "react";
import { Check, Circle, Lock } from "lucide-react";
import { PASSWORD_REQUIREMENTS, passwordProblems } from "@/lib/auth/password-rule";

const inputClass =
  "w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-theme-primary border border-theme-boundary/80 text-sm text-theme-text focus:outline-hidden focus:border-theme-teal focus:ring-2 focus:ring-theme-teal/25";

export function passwordReady(password: string, confirm: string, fullName: string) {
  return passwordProblems(password, fullName).length === 0 && password === confirm;
}

export default function PasswordFields({
  password,
  confirm,
  onPassword,
  onConfirm,
  fullName,
  labels = { password: "Criar senha", confirm: "Confirmar senha" },
}: {
  password: string;
  confirm: string;
  onPassword: (v: string) => void;
  onConfirm: (v: string) => void;
  fullName: string;
  labels?: { password: string; confirm: string };
}) {
  const id = useId();
  const problems = passwordProblems(password, fullName);
  const typed = password.length > 0;
  const mismatch = confirm.length > 0 && confirm !== password;

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={`${id}-pw`} className="block text-xs font-bold text-theme-text mb-1">{labels.password}</label>
        <div className="relative">
          <Lock className="w-4 h-4 text-theme-subtle absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
          <input id={`${id}-pw`} type="password" autoComplete="new-password" required value={password} onChange={(e) => onPassword(e.target.value)} aria-describedby={`${id}-req`} className={inputClass} />
        </div>
        <ul id={`${id}-req`} aria-label="Requisitos da senha" className="mt-2 grid gap-1 text-[12px] sm:grid-cols-2">
          {PASSWORD_REQUIREMENTS.map((r) => {
            const met = typed && !problems.includes(r.id);
            return (
              <li key={r.id} className={`flex items-center gap-1.5 ${met ? "text-status-success-fg" : "text-theme-muted"}`}>
                {met ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <Circle className="h-3 w-3 shrink-0" aria-hidden />}
                <span>{r.label}</span>
                <span className="sr-only">{met ? "(atendido)" : "(pendente)"}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <div>
        <label htmlFor={`${id}-cf`} className="block text-xs font-bold text-theme-text mb-1">{labels.confirm}</label>
        <div className="relative">
          <Lock className="w-4 h-4 text-theme-subtle absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
          <input id={`${id}-cf`} type="password" autoComplete="new-password" required value={confirm} onChange={(e) => onConfirm(e.target.value)} aria-invalid={mismatch} aria-describedby={mismatch ? `${id}-cf-err` : undefined} className={inputClass} />
        </div>
        {mismatch && <p id={`${id}-cf-err`} className="mt-1 text-[12px] text-status-danger-fg">As duas senhas não são iguais.</p>}
      </div>
    </div>
  );
}
