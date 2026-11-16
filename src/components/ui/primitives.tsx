"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, Info, Loader2 } from "lucide-react";

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
const BTN: Record<BtnVariant, string> = {
  primary: "bg-action text-action-text hover:bg-action-hover",
  secondary: "bg-theme-primary text-theme-text border border-theme-boundary/60 hover:bg-theme-secondary",
  ghost: "text-theme-text hover:bg-theme-secondary",
  danger: "bg-status-danger-bg text-status-danger-fg border border-status-danger-border hover:brightness-95",
};
const BTN_BASE =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-control px-4 text-sm font-semibold transition-[background-color,transform,filter] duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50";

export function Button({ variant = "primary", className = "", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  return <button type="button" className={`${BTN_BASE} ${BTN[variant]} ${className}`} {...p} />;
}

export function ButtonLink({ variant = "primary", className = "", ...p }: React.ComponentProps<typeof Link> & { variant?: BtnVariant }) {
  return <Link className={`${BTN_BASE} ${BTN[variant]} ${className}`} {...p} />;
}

export function PageHeader({ title, description, actions, eyebrow, badge }: { title: string; description?: React.ReactNode; actions?: React.ReactNode; eyebrow?: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <nav aria-label="Você está em" className="mb-1 text-sm text-theme-muted">
            {eyebrow}
          </nav>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-theme-text sm:text-[1.75rem]">{title}</h1>
          {badge}
        </div>
        {description && <p className="mt-1 max-w-2xl text-[15px] text-theme-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({ children, className = "", as: Tag = "section" }: { children: React.ReactNode; className?: string; as?: "section" | "div" | "article" | "aside" }) {
  return <Tag className={`rounded-panel border border-theme-border bg-theme-primary ${className}`}>{children}</Tag>;
}

export function Field({
  label,
  hint,
  error,
  required,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-theme-text">
        {label}
        {required && <span className="ml-1 text-status-danger-fg">*<span className="sr-only"> (obrigatório)</span></span>}
      </label>
      {children}
      {hint && !error && <p id={`${htmlFor}-hint`} className="text-sm text-theme-muted">{hint}</p>}
      {error && (
        <p id={`${htmlFor}-error`} className="flex items-center gap-1.5 text-sm font-medium text-status-danger-fg">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

export function RequiredLegend() {
  return (
    <p className="text-sm text-theme-muted">
      Campos com <span className="text-status-danger-fg">*</span> são obrigatórios.
    </p>
  );
}

export const inputClass =
  "w-full min-h-[44px] rounded-control border border-theme-boundary/70 bg-theme-raised px-3 text-[15px] text-theme-text placeholder:text-theme-subtle focus:border-theme-teal focus:outline-hidden focus:ring-2 focus:ring-theme-teal/25";

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "success" | "caution" | "danger" | "accent"; children: React.ReactNode }) {
  const t = {
    neutral: "bg-theme-secondary text-theme-text border-theme-border",
    success: "bg-status-success-bg text-status-success-fg border-status-success-border",
    caution: "bg-status-caution-bg text-status-caution-fg border-status-caution-border",
    danger: "bg-status-danger-bg text-status-danger-fg border-status-danger-border",
    accent: "bg-theme-teal-subtle text-theme-teal border-theme-teal/30",
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[13px] font-semibold ${t}`}>{children}</span>;
}

export function DemoBadge() {
  return <Badge tone="caution">Dados fictícios de demonstração</Badge>;
}

export function EmptyState({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-panel border border-dashed border-theme-boundary/60 px-6 py-10 text-center">
      <p className="text-base font-semibold text-theme-text">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-md text-[15px] text-theme-muted">{children}</div>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Loading({ label = "Carregando…" }: { label?: string }) {
  return (
    <p role="status" className="flex items-center gap-2 py-8 text-[15px] text-theme-muted">
      <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      {label}
    </p>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-control border border-status-danger-border bg-status-danger-bg p-3 text-[15px] text-status-danger-fg">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function InfoNote({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "caution" }) {
  const c = tone === "caution" ? "border-status-caution-border bg-status-caution-bg text-status-caution-fg" : "border-theme-border bg-theme-secondary/70 text-theme-text";
  return (
    <div className={`flex items-start gap-2 rounded-control border p-3 text-[15px] ${c}`}>
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function formatDateBR(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
