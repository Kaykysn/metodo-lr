"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { PLAN_BY_ID, formatPrice, type PlanId } from "@/lib/subscription/catalog";
import { BILLING_ENABLED, BILLING_UNAVAILABLE_MESSAGE } from "@/lib/subscription/billing";
import { startCheckout } from "@/lib/subscription/checkout";

/** Dados do plano como a cobrança os enxerga (tabela subscription_plans, versão vigente). */
interface PlanSummary {
  id: PlanId;
  name: string;
  priceCents: number;
  interval: string;
  activeTraineeLimit: number;
}

type LoadState = { status: "loading" } | { status: "ready"; plan: PlanSummary } | { status: "error"; message: string };

const INTERVAL_LABEL: Record<string, string> = { monthly: "Mensal, renova todo mês" };

const CONDITIONS = [
  "Conta nova tem 30 dias grátis para experimentar.",
  "A cobrança é mensal, no cartão de crédito, pela página de pagamento do Asaas.",
  "Com o teste em andamento, a primeira cobrança fica para o fim do teste.",
  "Se cancelar, o período já pago continua valendo até o fim.",
];

const LOAD_ERROR = "Não foi possível carregar o valor deste plano agora. Nenhuma cobrança foi feita. Tente de novo em instantes.";

/** Lê o plano da mesma fonte usada para cobrar; no modo demonstração usa o catálogo local. */
async function loadPlan(planId: PlanId): Promise<PlanSummary> {
  const db = getSupabaseBrowserClient();
  if (!isSupabaseConfigured || !db) {
    const p = PLAN_BY_ID.get(planId);
    if (!p) throw new Error("Plano indisponível.");
    return { id: p.id, name: p.name, priceCents: p.priceCents, interval: p.interval, activeTraineeLimit: p.activeTraineeLimit };
  }
  const { data, error } = await db
    .from("subscription_plans")
    .select("id, name, price_cents, billing_interval, active_trainee_limit")
    .eq("id", planId)
    .eq("is_current", true)
    .maybeSingle();
  const row = data as { id: string; name: string; price_cents: number; billing_interval: string; active_trainee_limit: number } | null;
  if (error || !row || row.id !== planId || !Number.isFinite(row.price_cents) || row.price_cents <= 0) throw new Error("Plano indisponível.");
  return { id: planId, name: row.name, priceCents: row.price_cents, interval: row.billing_interval, activeTraineeLimit: row.active_trainee_limit };
}

/**
 * Botão "Adquirir plano" da página inicial e o resumo que ele abre (preço, periodicidade e
 * condições). Só "Continuar para pagamento" pode iniciar o checkout; "Voltar" apenas fecha.
 */
export default function PlanCheckoutDialog({ planId, planName }: { planId: PlanId; planName: string }) {
  const [open, setOpen] = useState(false);
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [going, setGoing] = useState(false);
  const [goError, setGoError] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  // Fechar durante uma ida ao servidor cancela o redirecionamento.
  const active = useRef(false);
  const titleId = `plano-resumo-${planId}`;
  const descId = `plano-resumo-${planId}-desc`;

  const close = () => {
    active.current = false;
    setOpen(false);
  };

  // Carrega o plano sempre que o resumo abre (nunca reaproveita um valor antigo).
  useEffect(() => {
    if (!open) return;
    active.current = true;
    let current = true;
    setLoad({ status: "loading" });
    setGoing(false);
    setGoError(null);
    loadPlan(planId)
      .then((plan) => current && setLoad({ status: "ready", plan }))
      .catch(() => current && setLoad({ status: "error", message: LOAD_ERROR }));
    return () => {
      current = false;
    };
  }, [open, planId]);

  // Esc fecha, Tab fica preso no diálogo, a rolagem da página trava e o foco volta ao botão.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const opener = trigger.current;
    const node = dialog.current;
    const focusables = () =>
      Array.from(node?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []).filter(
        (el) => el.offsetParent !== null
      );

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        active.current = false;
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !node?.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !node?.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => focusables()[0]?.focus(), 0);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      (opener ?? previouslyFocused)?.focus();
    };
  }, [open]);

  const continueToPayment = async () => {
    if (load.status !== "ready" || going) return;
    setGoing(true);
    setGoError(null);
    const planos = `/planos?plano=${planId}`;
    const go = (url: string) => {
      if (active.current) window.location.assign(url);
    };
    const db = getSupabaseBrowserClient();
    // Demonstração: não há conta real; a página de planos mostra a confirmação daquele plano.
    if (!db) return go(planos);
    try {
      const { data, error } = await db.auth.getUser();
      const user = error ? null : data.user;
      if (!user) return go(`/login?redirect=${encodeURIComponent(planos)}`);
      if (!BILLING_ENABLED) return go(planos);
      const { data: profile } = await db.from("profiles").select("status, role").eq("id", user.id).maybeSingle();
      const p = profile as { status?: string; role?: string } | null;
      const canCheckout = !!p && (p.status === "active" || p.status === "expired") && p.role !== "admin" && p.role !== "practitioner";
      if (!canCheckout) return go(planos);
      const url = await startCheckout(planId);
      go(url);
    } catch (e) {
      if (!active.current) return;
      setGoError((e as Error).message || "Não foi possível abrir o pagamento agora. Nenhuma cobrança foi feita.");
      setGoing(false);
    }
  };

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-control bg-cta px-4 text-[15px] font-semibold text-cta-text transition-colors hover:bg-cta-hover"
      >
        Adquirir plano<span className="sr-only"> {planName}</span>
      </button>

      {/* Portal no body: as seções da página criam contexto de empilhamento próprio e
          cobririam o diálogo se ele ficasse dentro delas. */}
      {open && createPortal(
        <div
          className="fixed inset-0 z-100 flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            aria-busy={load.status === "loading"}
            className="relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-panel border border-theme-border bg-theme-raised text-theme-text shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4 border-b border-theme-border px-5 py-4 sm:px-6">
              <h2 id={titleId} className="text-lg font-bold">
                Plano {load.status === "ready" ? load.plan.name : planName}
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Fechar resumo do plano"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-theme-border transition-colors hover:bg-theme-secondary"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div id={descId} className="space-y-5 px-5 py-5 sm:px-6">
              {load.status === "loading" && (
                <p role="status" className="text-[15px] text-theme-muted">
                  Carregando o valor do plano…
                </p>
              )}

              {load.status === "error" && (
                <p role="alert" className="rounded-control border border-status-danger-border bg-status-danger-bg p-3 text-[15px] text-status-danger-fg">
                  {load.message}
                </p>
              )}

              {load.status === "ready" && (
                <>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[15px]">
                    <dt className="text-theme-muted">Valor</dt>
                    <dd className="tabular font-semibold">{formatPrice(load.plan.priceCents)} por mês</dd>
                    <dt className="text-theme-muted">Periodicidade</dt>
                    <dd className="font-semibold">{INTERVAL_LABEL[load.plan.interval] ?? load.plan.interval}</dd>
                    <dt className="text-theme-muted">Alunos ativos</dt>
                    <dd className="tabular font-semibold">até {load.plan.activeTraineeLimit}</dd>
                  </dl>
                  <div>
                    <h3 className="text-[15px] font-semibold">Condições</h3>
                    <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] text-theme-muted">
                      {CONDITIONS.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </div>
                  {!BILLING_ENABLED && <p className="rounded-control border border-status-caution-border bg-status-caution-bg p-3 text-sm text-status-caution-fg">{BILLING_UNAVAILABLE_MESSAGE}</p>}
                </>
              )}

              {goError && (
                <p role="alert" className="text-[15px] text-status-danger-fg">
                  {goError}
                </p>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-theme-border px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={close}
                className="inline-flex min-h-[44px] items-center justify-center rounded-control border border-theme-boundary/60 px-4 text-[15px] font-semibold transition-colors hover:bg-theme-secondary"
              >
                Voltar
              </button>
              {load.status === "ready" && (
                <button
                  type="button"
                  onClick={continueToPayment}
                  disabled={going}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-control bg-cta px-4 text-[15px] font-semibold text-cta-text transition-colors hover:bg-cta-hover disabled:cursor-wait disabled:opacity-60"
                >
                  {going ? "Abrindo…" : "Continuar para pagamento"}
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
