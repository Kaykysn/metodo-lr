"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, Info, Loader2 } from "lucide-react";

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
type BtnSize = "sm" | "md" | "lg";
const BTN: Record<BtnVariant, string> = {
  primary: "bg-action text-action-text hover:bg-action-hover",
  secondary: "bg-theme-primary text-theme-text border border-theme-boundary/60 hover:bg-theme-secondary",
  ghost: "text-theme-text hover:bg-theme-secondary",
  danger: "bg-status-danger-bg text-status-danger-fg border border-status-danger-border hover:brightness-95",
};
const BTN_SIZE: Record<BtnSize, string> = {
  sm: "min-h-[36px] px-3 text-xs",
  md: "min-h-[44px] px-4 text-sm",
  lg: "min-h-[52px] px-6 text-base",
};
const BTN_BASE = "inline-flex items-center justify-center gap-2 rounded-control font-semibold transition-[background-color,transform,filter] duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50";

export function Button({ variant = "primary", size = "md", className = "", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize }) {
  return <button type="button" className={`${BTN_BASE} ${BTN[variant]} ${BTN_SIZE[size]} ${className}`} {...p} />;
}

export function ButtonLink({ variant = "primary", size = "md", className = "", ...p }: React.ComponentProps<typeof Link> & { variant?: BtnVariant; size?: BtnSize }) {
  return <Link className={`${BTN_BASE} ${BTN[variant]} ${BTN_SIZE[size]} ${className}`} {...p} />;
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
  className = "",
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
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
  "w-full min-h-[44px] rounded-control border border-theme-boundary/70 bg-theme-raised px-3 text-[15px] text-theme-text placeholder:text-theme-subtle focus:border-[var(--lr-gold-deep)] focus:outline-hidden focus:ring-2 focus:ring-[rgb(var(--accent-teal)/0.25)]";

export function Badge({ tone = "neutral", children, className = "" }: { tone?: "neutral" | "success" | "caution" | "danger" | "accent"; children: React.ReactNode; className?: string }) {
  const t = {
    neutral: "bg-theme-secondary text-theme-text border-theme-border",
    success: "bg-status-success-bg text-status-success-fg border-status-success-border",
    caution: "bg-status-caution-bg text-status-caution-fg border-status-caution-border",
    danger: "bg-status-danger-bg text-status-danger-fg border-status-danger-border",
    accent: "bg-theme-teal-subtle text-theme-teal border-theme-teal/30",
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[13px] font-semibold ${t} ${className}`}>{children}</span>;
}

export function DemoBadge() {
  return <Badge tone="caution">Dados fictícios de demonstração</Badge>;
}

export function EmptyState({ title, description, children, action }: { title: string; description?: React.ReactNode; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-panel border border-dashed border-theme-boundary/60 px-6 py-10 text-center">
      <p className="text-base font-semibold text-theme-text">{title}</p>
      {description && <div className="mx-auto mt-1 max-w-md text-[15px] text-theme-muted">{description}</div>}
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

export function ErrorNote({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div role="alert" className={`flex items-start gap-2 rounded-control border border-status-danger-border bg-status-danger-bg p-3 text-[15px] text-status-danger-fg ${className}`}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function InfoNote({ children, tone = "neutral", className = "" }: { children: React.ReactNode; tone?: "neutral" | "caution"; className?: string }) {
  const c = tone === "caution" ? "border-status-caution-border bg-status-caution-bg text-status-caution-fg" : "border-theme-border bg-theme-secondary/70 text-theme-text";
  return (
    <div className={`flex items-start gap-2 rounded-control border p-3 text-[15px] ${c} ${className}`}>
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

export function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function Card({ children, className = "", as: Tag = "article" }: { children: React.ReactNode; className?: string; as?: "article" | "div" | "section" }) {
  return <Tag className={`rounded-panel border border-theme-border bg-theme-primary ${className}`}>{children}</Tag>;
}

// Tabs component with Context
const TabsContext = React.createContext<{ value: string; onValueChange: (v: string) => void } | null>(null);

interface TabsProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs<T extends string>({ value, onValueChange, children, className = "" }: TabsProps<T>) {
  return (
    <TabsContext.Provider value={{ value, onValueChange: onValueChange as (v: string) => void }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabListProps {
  children: React.ReactNode;
  className?: string;
}

export function TabList({ children, className = "" }: TabListProps) {
  return <div role="tablist" className={`${className}`}>{children}</div>;
}

interface TabTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function TabTrigger({ value, children, className = "", disabled }: TabTriggerProps) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("TabTrigger must be used within Tabs");
  const isActive = ctx.value === value;
  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`panel-${value}`}
      id={`tab-${value}`}
      disabled={disabled}
      onClick={() => !disabled && ctx.onValueChange(value)}
      className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-4 text-sm font-semibold rounded-control transition-colors ${isActive ? "bg-theme-teal text-white" : "text-theme-muted hover:text-theme-text hover:bg-theme-secondary"} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

interface TabContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabContent({ value, children, className = "" }: TabContentProps) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("TabContent must be used within Tabs");
  if (ctx.value !== value) return null;
  return <div role="tabpanel" id={`panel-${value}`} className={className}>{children}</div>;
}
