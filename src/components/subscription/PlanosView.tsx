"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { useData } from "@/components/providers/DataProvider";
import { COMPARE_ROWS, FEATURE_LABEL, PLANS, formatPrice, getPlan, priceDifference, recommendPlan, type CatalogPlan, type PlanId } from "@/lib/subscription/catalog";
import { BILLING_UNAVAILABLE_MESSAGE } from "@/lib/subscription/billing";
import { isProfessionalRole } from "@/lib/subscription/entitlements";

export interface PlanosViewProps {
  prioritySupportReady: boolean;
  contactEmail: string | null;
}

const COMPLETO_SUPPORT = FEATURE_LABEL.priority_support;

export default function PlanosView({ prioritySupportReady, contactEmail }: PlanosViewProps) {
  const [selected, setSelected] = useState<PlanId | null>(null);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pt-14">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-[1.1]">Escolha o plano para sua rotina</h1>
        <p className="mt-3 text-lg text-theme-muted">Comece com 30 dias grátis. Depois, escolha como continuar.</p>
        <p className="mt-2 text-[15px] text-theme-muted">
          Preço mensal total por profissional, sem fidelidade, taxa de implantação ou cobrança por aluno. O aluno acompanhado não paga nada para ver o treino que você disponibilizou.
        </p>
      </header>

      <ol className="mt-10 grid gap-5 md:grid-cols-3" aria-label="Planos mensais">
        {PLANS.map((p) => (
          <li key={p.id} className="flex">
            <PlanCard plan={p} supportReady={prioritySupportReady} onSelect={() => setSelected(p.id)} selected={selected === p.id} />
          </li>
        ))}
      </ol>

      {selected && <Confirmation planId={selected} onClose={() => setSelected(null)} />}

      <Recommender />

      <Comparison supportReady={prioritySupportReady} />

      <PlanFaq contactEmail={contactEmail} supportReady={prioritySupportReady} />
    </div>
  );
}

function PlanCard({ plan, supportReady, onSelect, selected }: { plan: CatalogPlan; supportReady: boolean; onSelect: () => void; selected: boolean }) {
  const featured = plan.id === "completo";
  const titleId = useId();
  const note =
    plan.id === "evolucao"
      ? `${formatPrice(priceDifference("essencial", "evolucao"))} a mais que o Essencial.`
      : plan.id === "completo" && supportReady
        ? `Por mais ${formatPrice(priceDifference("evolucao", "completo"))}/mês, tenha opções ligadas à avaliação, painel completo e suporte prioritário.`
        : null;
  return (
    <article
      aria-labelledby={titleId}
      className={`flex w-full flex-col rounded-panel border p-6 ${featured ? "border-theme-teal/60 bg-theme-teal-subtle/50 ring-1 ring-theme-teal/30" : "border-theme-border bg-theme-primary"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={titleId} className="text-xl font-bold">{plan.name}</h2>
        {featured && <span className="rounded-full bg-cta px-2.5 py-0.5 text-[13px] font-semibold text-cta-text">{supportReady ? "Todos os recursos + suporte" : "Todos os recursos"}</span>}
      </div>
      <p className="mt-1 text-[15px] text-theme-muted">{plan.forWhom}</p>
      <p className="mt-5 flex items-baseline gap-1">
        <span className="tabular text-[2.1rem] font-bold leading-none tracking-tight">{formatPrice(plan.priceCents)}</span>
        <span className="text-[15px] text-theme-muted">por mês</span>
      </p>
      {note && <p className="mt-2 text-sm text-theme-muted">{note}</p>}
      <ul className="mt-5 flex-1 space-y-2.5 text-[15px]">
        {plan.highlights.map((h) => {
          const pending = h.startsWith("Suporte") && !supportReady;
          return (
            <li key={h} className="flex gap-2.5">
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-theme-teal" aria-hidden="true" />
              <span>
                {h}
                {pending && <span className="text-theme-muted"> (em preparação)</span>}
              </span>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={`mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-control px-4 text-[15px] font-semibold transition-colors ${
          featured ? "bg-cta text-cta-text hover:bg-cta-hover" : "border border-theme-boundary/60 bg-theme-primary text-theme-text hover:bg-theme-secondary"
        }`}
      >
        Selecionar {plan.name}
      </button>
    </article>
  );
}

function Confirmation({ planId, onClose }: { planId: PlanId; onClose: () => void }) {
  const { mode, session, actor, recordPlanIntent, commercial } = useData();
  const plan = getPlan(planId);
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<{ status: "idle" | "saving" | "saved" | "error"; message?: string }>({ status: "idle" });
  useEffect(() => {
    setState({ status: "idle" });
    ref.current?.focus();
  }, [planId]);

  const signedIn = mode === "demo" || session.status === "active" || session.status === "blocked";
  const role = mode === "demo" ? actor.role : session.status === "active" || session.status === "blocked" ? session.actor?.role : undefined;
  const professional = !!role && isProfessionalRole(role);
  const current = commercial.intent?.planId;

  const save = async () => {
    setState({ status: "saving" });
    try {
      await recordPlanIntent(planId);
      setState({ status: "saved" });
    } catch (e) {
      setState({ status: "error", message: (e as Error).message });
    }
  };

  return (
    <section ref={ref} tabIndex={-1} aria-labelledby="confirmacao-plano" className="mt-6 rounded-panel border border-theme-boundary/60 bg-theme-raised p-6 outline-none focus-visible:ring-2 focus-visible:ring-theme-teal/40">
      <h2 id="confirmacao-plano" className="text-lg font-bold">Plano {plan.name}</h2>
      <dl className="mt-3 grid max-w-md grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-[15px]">
        <dt className="text-theme-muted">Mensalidade</dt>
        <dd className="tabular font-semibold">{formatPrice(plan.priceCents)} por mês</dd>
        <dt className="text-theme-muted">Alunos ativos</dt>
        <dd className="tabular font-semibold">até {plan.activeTraineeLimit}</dd>
      </dl>
      <p role="status" className="mt-4 rounded-control border border-status-caution-border bg-status-caution-bg p-3 text-[15px] font-semibold text-status-caution-fg">
        {BILLING_UNAVAILABLE_MESSAGE}
      </p>

      {signedIn && professional ? (
        <div className="mt-4 space-y-3 text-[15px]">
          <p className="text-theme-muted">
            Você pode guardar esta escolha para depois do teste. Ela não ativa plano, não cria assinatura e não autoriza cobrança; quando a contratação abrir, o preço e o início da cobrança serão mostrados antes de qualquer confirmação.
          </p>
          {state.status === "saved" ? (
            <p role="status" className="font-semibold">Escolha guardada: {plan.name}. Nenhuma cobrança foi feita.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={save} disabled={state.status === "saving" || current === planId} className="inline-flex min-h-[44px] items-center rounded-control bg-action px-4 text-sm font-semibold text-action-text hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60">
                {current === planId ? "Este já é o plano escolhido" : "Guardar como plano escolhido"}
              </button>
              <button type="button" onClick={onClose} className="inline-flex min-h-[44px] items-center rounded-control px-4 text-sm font-semibold hover:bg-theme-secondary">Fechar</button>
            </div>
          )}
          {state.status === "error" && <p role="alert" className="text-status-danger-fg">Não foi possível guardar a escolha: {state.message}</p>}
          {mode === "demo" && <p className="text-sm text-theme-muted">Demonstração: a escolha fica só neste navegador.</p>}
        </div>
      ) : signedIn ? (
        <p className="mt-4 text-[15px] text-theme-muted">Este perfil não contrata estes planos. O aluno praticante acessa o treino pelo professor, sem pagar assinatura própria.</p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/solicitar-acesso" className="inline-flex min-h-[44px] items-center rounded-control bg-cta px-4 text-sm font-semibold text-cta-text hover:bg-cta-hover">Solicitar acesso e usar 30 dias</Link>
          <Link href="/login" className="inline-flex min-h-[44px] items-center rounded-control border border-theme-boundary/60 px-4 text-sm font-semibold hover:bg-theme-secondary">Entrar</Link>
          <button type="button" onClick={onClose} className="inline-flex min-h-[44px] items-center rounded-control px-4 text-sm font-semibold hover:bg-theme-secondary">Fechar</button>
        </div>
      )}
    </section>
  );
}

function Recommender() {
  const [count, setCount] = useState("");
  const [reuse, setReuse] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const n = count.trim() === "" ? null : Math.max(0, Math.floor(Number(count)));
  const rec = n === null || Number.isNaN(n) ? null : recommendPlan({ activeTrainees: n, wantsReuse: reuse, wantsAdvanced: advanced });
  return (
    <section aria-labelledby="ajuda-escolha" className="mt-14 grid gap-6 border-t border-theme-border pt-10 lg:grid-cols-[0.8fr_1.2fr]">
      <div>
        <h2 id="ajuda-escolha" className="text-2xl font-bold tracking-tight">Na dúvida, responda duas perguntas</h2>
        <p className="mt-2 text-[15px] text-theme-muted">A sugestão segue só estes critérios. Você pode escolher qualquer plano que comporte seus alunos.</p>
      </div>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
        <div className="space-y-1.5">
          <label htmlFor="rec-alunos" className="block text-[15px] font-semibold">Quantos alunos você acompanha hoje?</label>
          <input id="rec-alunos" type="number" inputMode="numeric" min={0} value={count} onChange={(e) => setCount(e.target.value)} className="w-full min-h-[44px] rounded-control border border-theme-boundary/70 bg-theme-raised px-3 text-[15px] focus:border-theme-teal focus:outline-none focus:ring-2 focus:ring-theme-teal/25" />
        </div>
        <fieldset className="space-y-2">
          <legend className="text-[15px] font-semibold">O que você usaria?</legend>
          <label className="flex min-h-[40px] items-center gap-2.5 text-[15px]">
            <input type="checkbox" checked={reuse} onChange={(e) => setReuse(e.target.checked)} className="h-5 w-5 accent-[rgb(var(--accent-teal))]" />
            Reaproveitar treinos ou comparar avaliações
          </label>
          <label className="flex min-h-[40px] items-center gap-2.5 text-[15px]">
            <input type="checkbox" checked={advanced} onChange={(e) => setAdvanced(e.target.checked)} className="h-5 w-5 accent-[rgb(var(--accent-teal))]" />
            Opções ligadas à avaliação ou painel de volume e adesão
          </label>
        </fieldset>
        <p role="status" aria-live="polite" className="text-[15px] sm:col-span-2">
          {rec === null ? (
            <span className="text-theme-muted">Informe a quantidade de alunos para ver a sugestão.</span>
          ) : rec.planId ? (
            <>
              Sugestão: <strong>{getPlan(rec.planId).name}</strong> ({formatPrice(getPlan(rec.planId).priceCents)} por mês). {rec.reason}
            </>
          ) : (
            rec.reason
          )}
        </p>
      </form>
    </section>
  );
}

function Comparison({ supportReady }: { supportReady: boolean }) {
  return (
    <section aria-labelledby="comparativo" className="mt-14 border-t border-theme-border pt-10">
      <h2 id="comparativo" className="text-2xl font-bold tracking-tight">Comparar recursos</h2>
      <p className="mt-2 text-[15px] text-theme-muted">As diferenças vêm primeiro. Triagem, segurança e acesso ao próprio histórico estão em todos os planos.</p>
      <div className="mt-6 overflow-x-auto rounded-panel border border-theme-border bg-theme-primary">
        <table className="w-full min-w-[620px] text-left text-[15px]">
          <caption className="sr-only">Comparativo dos planos Essencial, Evolução e Completo</caption>
          <thead className="border-b border-theme-border">
            <tr>
              <th scope="col" className="w-[46%] px-4 py-3 text-sm font-semibold text-theme-muted">Recurso</th>
              {PLANS.map((p) => (
                <th key={p.id} scope="col" className="px-4 py-3 font-bold">{p.name}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-theme-border">
            {COMPARE_ROWS.map((row) => (
              <tr key={row.label}>
                <th scope="row" className="px-4 py-3 font-medium">{row.label}</th>
                {PLANS.map((p) => {
                  const v = row.values[p.id];
                  const pendingSupport = row.label === COMPLETO_SUPPORT && v === true && !supportReady;
                  return (
                    <td key={p.id} className="tabular px-4 py-3">
                      {typeof v === "string" ? (
                        v
                      ) : v ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Check className="h-4 w-4 text-theme-teal" aria-hidden="true" />
                          <span className={pendingSupport ? "text-sm text-theme-muted" : "sr-only"}>{pendingSupport ? "Em preparação" : "Incluído"}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center">
                          <Minus className="h-4 w-4 text-theme-subtle" aria-hidden="true" />
                          <span className="sr-only">Não incluído</span>
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-theme-muted">
        “Completo” é o conjunto de recursos desta tabela, não inclui cursos, mentorias ou recursos futuros. O suporte é de uso do sistema: não inclui atendimento clínico, prescrição, consultoria individual nem revisão de casos.
      </p>
    </section>
  );
}

function PlanFaq({ contactEmail, supportReady }: { contactEmail: string | null; supportReady: boolean }) {
  const faqs: { q: string; a: React.ReactNode }[] = [
    { q: "Como funcionam os 30 dias grátis?", a: "Começam no seu primeiro acesso depois da aprovação, não no cadastro. Durante o teste você usa os recursos de software do Completo, com até 100 alunos ativos. Não pedimos cartão, e escolher um plano não reinicia nem estende o teste." },
    { q: "O que conta como aluno ativo?", a: "Cada pessoa acompanhada que não está arquivada. Avaliações, sessões e versões de treino não contam. Arquivar não apaga nada e você pode reativar quando houver vaga no plano." },
    { q: "O que acontece com meu histórico se eu mudar de plano ou o teste acabar?", a: "Nada é apagado. Registros feitos no teste ou num plano maior continuam disponíveis para consulta; o que muda são as ações novas. O treino já disponibilizado continua visível para o aluno." },
    { q: "Preciso de mais de 100 alunos ativos.", a: contactEmail ? <>Nenhum plano atual atende esse volume. Escreva para <a className="font-semibold underline" href={`mailto:${contactEmail}`}>{contactEmail}</a> para conversar.</> : "Nenhum plano atual atende esse volume, e o canal comercial para esse caso ainda está sendo definido." },
    { q: "Como é o suporte?", a: supportReady ? "Todos os planos têm ajuda de uso e canal para problemas de acesso e cobrança. No Completo, o atendimento de uso do sistema é prioritário, por canal escrito, em dias úteis." : "Todos os planos têm ajuda de uso e canal para problemas de acesso e cobrança. O suporte prioritário do Completo ainda está em preparação e só será oferecido quando o canal estiver funcionando." },
    { q: "Já posso contratar?", a: "Ainda não. A contratação será aberta em breve; nenhuma cobrança é feita nesta página. Quando abrir, o valor, a recorrência e a data da primeira cobrança aparecerão antes de qualquer confirmação." },
  ];
  return (
    <section aria-labelledby="duvidas-planos" className="mt-14 grid gap-8 border-t border-theme-border pt-10 lg:grid-cols-[0.7fr_1.3fr]">
      <h2 id="duvidas-planos" className="text-2xl font-bold tracking-tight">Dúvidas sobre os planos</h2>
      <dl className="divide-y divide-theme-border border-y border-theme-border">
        {faqs.map((f) => (
          <div key={f.q} className="py-5">
            <dt className="text-[17px] font-semibold">{f.q}</dt>
            <dd className="mt-1.5 text-[16px] leading-relaxed text-theme-muted">{f.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
