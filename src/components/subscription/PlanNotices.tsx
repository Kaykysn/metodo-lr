"use client";

import React from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { useData } from "@/components/providers/DataProvider";
import { cheapestPlanWith, FEATURE_LABEL, type Feature } from "@/lib/subscription/catalog";
import { hasFeature, trialNotice } from "@/lib/subscription/entitlements";
import { formatSaoPauloDate } from "@/lib/access-policy";

/** Mostra o conteúdo quando o recurso está no plano; senão, explica onde ele está. */
export function FeatureGate({ feature, children, compact = false }: { feature: Feature; children: React.ReactNode; compact?: boolean }) {
  const { commercial } = useData();
  if (!commercial.access) return null; // carregando: não pisca o aviso
  if (hasFeature(commercial.access, feature)) return <>{children}</>;
  return <FeatureLock feature={feature} compact={compact} />;
}

export function FeatureLock({ feature, compact = false }: { feature: Feature; compact?: boolean }) {
  const plan = cheapestPlanWith(feature);
  const from = plan.id === "completo" ? "no plano Completo" : `a partir do plano ${plan.name}`;
  return (
    <div className={`flex items-start gap-3 rounded-panel border border-dashed border-theme-boundary/60 ${compact ? "p-3" : "p-5"}`}>
      <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-theme-muted" aria-hidden="true" />
      <div className="text-[15px]">
        <p className="font-semibold text-theme-text">{FEATURE_LABEL[feature]}: disponível {from}.</p>
        <p className="mt-0.5 text-theme-muted">
          Seus registros continuam disponíveis para consulta.{" "}
          <Link href="/planos" className="font-semibold text-theme-text underline underline-offset-2">Comparar planos</Link>
        </p>
      </div>
    </div>
  );
}

/** Aviso discreto de 7 e 3 dias, e de teste encerrado (consulta). */
export function TrialBanner() {
  const { commercial } = useData();
  const n = trialNotice(commercial.access, Date.now());
  if (!n) return null;
  const sim = commercial.simulated ? " (simulação da demonstração)" : "";
  const text =
    n.level === "ended"
      ? `Seu teste de 30 dias terminou${sim}. Você consulta seus registros, mas não cria alunos, avaliações ou treinos novos.`
      : `Seu teste termina em ${n.daysLeft} ${n.daysLeft === 1 ? "dia" : "dias"}, em ${formatSaoPauloDate(n.endsAt)}${sim}.`;
  const tone = n.level === "week" ? "border-theme-border bg-theme-secondary/70 text-theme-text" : "border-status-caution-border bg-status-caution-bg text-status-caution-fg";
  return (
    <div role="status" className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b px-4 py-2 text-sm print:hidden sm:px-8 ${tone}`}>
      <span>{text}</span>
      <Link href="/conta/acesso" className="font-semibold underline underline-offset-2">Plano e acesso</Link>
    </div>
  );
}

/** Mensagem curta para botões de criação desativados pelo acesso comercial. */
export function useCreateBlock(): string | null {
  const { commercial } = useData();
  const a = commercial.access;
  if (!a || a.phase === "not_applicable") return null;
  return a.canCreate ? null : "Teste encerrado: modo de consulta. Veja Plano e acesso.";
}
