"use client";

import React from "react";
import Link from "next/link";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { useAsync, useData } from "@/components/providers/DataProvider";
import { Badge, ButtonLink, Loading, Panel } from "@/components/ui/primitives";
import { formatSaoPauloDate } from "@/lib/access-policy";
import { ROLE_LABEL } from "@/lib/domain/roles";
import { FEATURE_LABEL, PLANS, formatPrice, getPlan } from "@/lib/subscription/catalog";
import { PHASE_LABEL, isProfessionalRole, trialNotice, type AdminStatus } from "@/lib/subscription/entitlements";
import { traineeUsage, usageMessage } from "@/lib/subscription/limits";
import { BILLING_UNAVAILABLE_MESSAGE } from "@/lib/subscription/billing";

const ADMIN_LABEL: Record<AdminStatus, string> = {
  pending: "Pedido em análise",
  active: "Aprovado",
  paused: "Pausado pela administração",
  revoked: "Encerrado pela administração",
};

// Página de plano e acesso: fica FORA da área protegida (/app) para continuar
// acessível com o teste vencido, sem redirecionamento circular.
export default function ContaAcessoPage() {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <Header />
      <main id="conteudo" className="mx-auto w-full max-w-[860px] flex-1 px-4 py-10 sm:px-6 lg:py-14">
        <h1 className="text-3xl font-bold tracking-tight">Plano e acesso</h1>
        <p className="mt-2 text-[15px] text-theme-muted">Datas no horário de Brasília (America/São Paulo).</p>
        <div className="mt-8">
          <Conteudo />
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[220px_1fr] sm:gap-4">
      <dt className="text-[15px] text-theme-muted">{label}</dt>
      <dd className="text-[15px]">{children}</dd>
    </div>
  );
}

function Conteudo() {
  const { mode, session, actor, commercial, repo, revision, signOut } = useData();
  const a = commercial.access;
  // No modo real, o ator do contexto é "ninguém" fora de uma sessão ativa: usa o da sessão
  const who = mode === "demo" ? actor : session.status === "active" || session.status === "blocked" ? session.actor ?? null : null;
  const isPro = !!who && isProfessionalRole(who.role) && (mode === "demo" || session.status === "active");
  const trainees = useAsync(() => (isPro ? repo.listTrainees(actor) : Promise.resolve([])), [repo, actor, revision, isPro]);

  if (mode === "supabase" && session.status === "loading") return <Loading label="Verificando sua conta…" />;
  if (mode === "supabase" && (session.status === "signed_out" || session.status === "error")) {
    return (
      <Panel className="space-y-4 p-6">
        <p className="text-[15px]">{session.status === "error" ? `Não foi possível ler sua conta: ${session.message}` : "Entre para ver as datas do seu acesso e o plano escolhido."}</p>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/login">Entrar</ButtonLink>
          <ButtonLink href="/planos" variant="secondary">Ver planos</ButtonLink>
        </div>
      </Panel>
    );
  }
  if (mode === "supabase" && session.status === "blocked" && !who) {
    return (
      <Panel className="space-y-4 p-6">
        <p className="text-[15px]">
          {session.reason === "unknown_role" ? "Seu perfil tem um papel que esta versão não reconhece. O acesso fica bloqueado até a equipe revisar o cadastro." : "Seu perfil ainda não foi encontrado. Saia e entre de novo; se continuar, fale com a equipe."}
        </p>
        <ButtonLink href="/planos" variant="secondary">Ver planos</ButtonLink>
      </Panel>
    );
  }
  if (!a || !who) return <Loading />;

  const account = commercial.account;
  const name = mode === "demo" ? who.name : account?.fullName || who.name;
  const notice = trialNotice(a, Date.now());
  const usage = traineeUsage(trainees.data ?? [], a.traineeLimit);
  const blockedReason = session.status === "blocked" ? session.reason : null;

  return (
    <div className="space-y-6">
      {commercial.simulated && (
        <p className="rounded-control border border-status-caution-border bg-status-caution-bg p-3 text-[15px] text-status-caution-fg">
          Demonstração: as datas e a situação do plano abaixo são simuladas. Mude a simulação no menu da área do professor.
        </p>
      )}

      <Panel className="p-6">
        <h2 className="text-lg font-bold">Conta</h2>
        <dl className="mt-2 divide-y divide-theme-border">
          <Row label="Nome">{name}</Row>
          {account?.email && <Row label="E-mail">{account.email}</Row>}
          <Row label="Papel">{ROLE_LABEL[who.role] ?? "Não reconhecido"}</Row>
          <Row label="Situação do cadastro">{mode === "demo" ? "Aprovado (demonstração)" : account ? ADMIN_LABEL[account.adminStatus] : "—"}</Row>
        </dl>
      </Panel>

      {a.phase === "not_applicable" ? (
        <Panel className="p-6">
          <h2 className="text-lg font-bold">Plano</h2>
          <p className="mt-2 text-[15px] text-theme-muted">
            {who.role === "practitioner"
              ? "Seu acesso vem do seu professor. Você não precisa contratar plano para ver o treino disponibilizado nem para registrar o que fez."
              : "A administração não depende de plano de assinatura e não recebe acesso a dados de saúde por causa de um plano."}
          </p>
        </Panel>
      ) : (
        <>
          <Panel className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold">Teste de 30 dias</h2>
              <Badge tone={a.phase === "expired" ? "caution" : a.phase === "blocked" ? "danger" : "accent"}>{PHASE_LABEL[a.phase]}</Badge>
            </div>
            <dl className="mt-2 divide-y divide-theme-border">
              <Row label="Início">{a.trialStartedAt ? formatSaoPauloDate(a.trialStartedAt) : "No primeiro acesso à área interna"}</Row>
              <Row label="Término">{a.trialEndsAt ? formatSaoPauloDate(a.trialEndsAt) : "Definido no primeiro acesso"}</Row>
              {notice && notice.level !== "ended" && <Row label="Faltam">{notice.daysLeft} {notice.daysLeft === 1 ? "dia" : "dias"}</Row>}
            </dl>
            {a.phase === "expired" && (
              <p className="mt-3 text-[15px]">Seus registros continuam guardados e nada foi apagado. Sem um plano pago, a conta fica em consulta: sem novos alunos, avaliações, treinos ou publicações.</p>
            )}
            {blockedReason === "expired" && (
              <p className="mt-3 text-[15px] text-theme-muted">Enquanto a contratação não abre, a área interna segue o controle de acesso atual. Fale com a equipe se precisar de renovação.</p>
            )}
          </Panel>

          <Panel className="p-6">
            <h2 className="text-lg font-bold">Plano</h2>
            <dl className="mt-2 divide-y divide-theme-border">
              <Row label="Plano pago vigente">
                {a.paidPlanId ? (
                  <>
                    {getPlan(a.paidPlanId).name} · {formatPrice(getPlan(a.paidPlanId).priceCents)} por mês
                    {a.paidThrough && <span className="block text-theme-muted">Período pago até {formatSaoPauloDate(a.paidThrough)}{commercial.simulated ? " (simulação)" : ""}</span>}
                  </>
                ) : (
                  <span>Nenhum. A contratação ainda não está aberta.</span>
                )}
              </Row>
              <Row label="Escolhido para depois do teste">
                {commercial.intent ? (
                  <>
                    {getPlan(commercial.intent.planId).name}
                    <span className="block text-theme-muted">Só uma escolha: não ativa plano nem autoriza cobrança.</span>
                  </>
                ) : (
                  <span className="text-theme-muted">Nenhum plano escolhido</span>
                )}
              </Row>
              <Row label="Recursos valendo agora">
                {a.phase === "trial" || a.phase === "trial_not_started"
                  ? "Recursos de software do Completo (teste), até 100 alunos ativos"
                  : a.effectivePlanId
                    ? `Plano ${getPlan(a.effectivePlanId).name}`
                    : a.phase === "expired"
                      ? "Consulta dos próprios registros"
                      : "—"}
              </Row>
              {isPro && a.traineeLimit !== null && trainees.status === "ready" && <Row label="Uso">{usageMessage(usage)}</Row>}
            </dl>
            <p className="mt-4 text-[15px] font-semibold">{BILLING_UNAVAILABLE_MESSAGE}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <ButtonLink href="/planos">Comparar planos</ButtonLink>
              {a.canCreate && <ButtonLink href="/app" variant="secondary">Ir para a área do professor</ButtonLink>}
              {a.phase === "expired" && mode === "demo" && <ButtonLink href="/app" variant="secondary">Consultar registros</ButtonLink>}
            </div>
          </Panel>

          <details className="rounded-panel border border-theme-border bg-theme-primary p-5">
            <summary className="cursor-pointer text-[15px] font-semibold">O que muda entre os planos</summary>
            <ul className="mt-3 space-y-1.5 text-[15px]">
              {PLANS.map((p) => (
                <li key={p.id}>
                  <strong>{p.name}</strong> ({formatPrice(p.priceCents)}): até {p.activeTraineeLimit} alunos ativos
                  {p.features.includes("rule_suggestions") ? `, ${FEATURE_LABEL.rule_suggestions.toLowerCase()}` : p.features.includes("plan_reuse") ? ", reaproveitar treinos e comparar avaliações" : ""}.
                </li>
              ))}
            </ul>
          </details>
        </>
      )}

      {mode === "supabase" && (
        <button type="button" onClick={signOut} className="min-h-[44px] rounded-control px-4 text-sm font-semibold hover:bg-theme-secondary">
          Sair
        </button>
      )}
      <p className="text-sm text-theme-muted">
        Dúvidas sobre acesso ou cobrança? <Link href="/planos" className="underline">Veja as perguntas frequentes dos planos</Link>.
      </p>
    </div>
  );
}
