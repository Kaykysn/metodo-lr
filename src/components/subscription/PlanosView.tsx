"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { useData } from "@/components/providers/DataProvider";
import { COMPARE_ROWS, FEATURE_LABEL, PLANS, formatPrice, getPlan, isPlanId, priceDifference, recommendPlan, type CatalogPlan, type PlanId } from "@/lib/subscription/catalog";
import { BILLING_ENABLED, BILLING_UNAVAILABLE_MESSAGE, firstChargeDate } from "@/lib/subscription/billing";
import { startCheckout } from "@/lib/subscription/checkout";
import { formatSaoPauloDate } from "@/lib/access-policy";
import { isProfessionalRole } from "@/lib/subscription/entitlements";

export interface PlanosViewProps {
  prioritySupportReady: boolean;
  contactEmail: string | null;
}

const COMPLETO_SUPPORT = FEATURE_LABEL.priority_support;

export default function PlanosView({ prioritySupportReady, contactEmail }: PlanosViewProps) {
  const [selected, setSelected] = useState<PlanId | null>(null);
  const [returned, setReturned] = useState<"cancelada" | "expirada" | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    // Vindo do resumo da página inicial (?plano=): abre a confirmação daquele plano
    const plano = q.get("plano");
    if (isPlanId(plano)) setSelected(plano);
    // Volta do checkout sem pagar: avisa e limpa o endereço
    const v = q.get("assinatura");
    if (v === "cancelada" || v === "expirada") {
      setReturned(v);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  return (
    <div className="mx-auto w-full max-w-container px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pt-14">
      <header data-scroll-reveal="up" data-scroll-distance="18" className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-[1.1]">Escolha o plano para sua rotina</h1>
        <p className="mt-3 text-lg text-theme-muted">Comece com 30 dias grátis. Depois, escolha como continuar.</p>
        <p className="mt-2 text-[15px] text-theme-muted">
          Preço mensal total por profissional, sem fidelidade, taxa de implantação ou cobrança por aluno. O aluno acompanhado não paga nada para ver o treino que você disponibilizou.
        </p>
      </header>

      {returned && (
        <p role="status" className="mt-6 max-w-2xl rounded-control border border-status-caution-border bg-status-caution-bg p-3 text-[15px] text-status-caution-fg">
          {returned === "cancelada" ? "Pagamento não concluído. Nenhuma cobrança foi feita; você pode tentar de novo quando quiser." : "A página de pagamento expirou antes da conclusão. Nenhuma cobrança foi feita; escolha o plano para abrir uma nova."}
        </p>
      )}

      <ol data-scroll-stagger="0.1" data-scroll-distance="22" className="mt-10 grid gap-5 md:grid-cols-3" aria-label="Planos mensais">
        {PLANS.map((p) => (
          <li key={p.id} data-scroll-item className="flex">
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
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-theme-teal" aria-hidden="true" />
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
  const live = BILLING_ENABLED && mode === "supabase";
  // Pendente, pausado ou encerrado pela administração não contrata (o servidor também recusa)
  const canSubscribe = session.status === "active" || (session.status === "blocked" && session.reason === "expired");
  const access = commercial.access;
  const sub = commercial.subscription;
  // Mesma regra do servidor: assinatura viva (paga, em atraso ou agendada) não abre outra
  const subscribed = !!sub?.providerSubscriptionId && !sub.cancelAtPeriodEnd && sub.billingStatus !== "canceled";
  const [pay, setPay] = useState<{ status: "idle" | "opening" | "error"; message?: string }>({ status: "idle" });
  useEffect(() => setPay({ status: "idle" }), [planId]);

  const goToPayment = async () => {
    setPay({ status: "opening" });
    try {
      window.location.assign(await startCheckout(planId));
    } catch (e) {
      setPay({ status: "error", message: (e as Error).message });
    }
  };

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
    <section ref={ref} tabIndex={-1} aria-labelledby="confirmacao-plano" className="mt-6 rounded-panel border border-theme-boundary/60 bg-theme-raised p-6 outline-hidden focus-visible:ring-2 focus-visible:ring-theme-teal/40">
      <h2 id="confirmacao-plano" className="text-lg font-bold">Plano {plan.name}</h2>
      <dl className="mt-3 grid max-w-md grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-[15px]">
        <dt className="text-theme-muted">Mensalidade</dt>
        <dd className="tabular font-semibold">{formatPrice(plan.priceCents)} por mês</dd>
        <dt className="text-theme-muted">Alunos ativos</dt>
        <dd className="tabular font-semibold">até {plan.activeTraineeLimit}</dd>
      </dl>
      {live && signedIn && professional ? (
        !canSubscribe ? (
          <p className="mt-4 text-[15px] text-theme-muted">A contratação fica disponível quando o seu cadastro estiver aprovado e ativo. Veja a situação em <Link href="/conta/acesso" className="font-semibold underline">Plano e acesso</Link>.</p>
        ) : subscribed ? (
          <p className="mt-4 text-[15px]">
            {access?.paidPlanId ? `Você já tem o plano ${getPlan(access.paidPlanId).name}${access.paidThrough ? `, pago até ${formatSaoPauloDate(access.paidThrough)}` : ""}.` : "Você já tem uma assinatura agendada."} Para trocar de plano, fale com o suporte. Detalhes em{" "}
            <Link href="/conta/acesso" className="font-semibold underline">Plano e acesso</Link>.
          </p>
        ) : (
          <div className="mt-4 space-y-3 text-[15px]">
            <dl className="grid max-w-md grid-cols-[auto_1fr] gap-x-6 gap-y-1.5">
              <dt className="text-theme-muted">Primeira cobrança</dt>
              <dd className="tabular font-semibold">
                {formatSaoPauloDate(firstChargeDate(access?.trialEndsAt ?? null, Date.now()).toISOString())}
                {access?.phase === "trial" ? " (fim do teste)" : " (hoje)"}
              </dd>
              <dt className="text-theme-muted">Pagamento</dt>
              <dd className="font-semibold">Cartão de crédito, renovação mensal</dd>
            </dl>
            <p className="text-theme-muted">
              Você vai para a página de pagamento do Asaas para informar o cartão; esta plataforma não vê nem guarda os dados dele. O plano passa a valer quando o Asaas confirmar o pagamento. Dá para cancelar a renovação a qualquer momento em Plano e acesso, e o período já pago continua valendo.
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={goToPayment} disabled={pay.status === "opening"} className="inline-flex min-h-[44px] items-center rounded-control bg-cta px-4 text-sm font-semibold text-cta-text hover:bg-cta-hover disabled:cursor-wait disabled:opacity-60">
                {pay.status === "opening" ? "Abrindo o pagamento…" : `Assinar o ${plan.name} por ${formatPrice(plan.priceCents)}/mês`}
              </button>
              <button type="button" onClick={onClose} className="inline-flex min-h-[44px] items-center rounded-control px-4 text-sm font-semibold hover:bg-theme-secondary">Fechar</button>
            </div>
            {pay.status === "error" && <p role="alert" className="text-status-danger-fg">{pay.message}</p>}
          </div>
        )
      ) : (
        <>
          {!live && (
            <p role="status" className="mt-4 rounded-control border border-status-caution-border bg-status-caution-bg p-3 text-[15px] font-semibold text-status-caution-fg">
              {BILLING_UNAVAILABLE_MESSAGE}
            </p>
          )}

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
        </>
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
      <div data-scroll-reveal="left" data-scroll-distance="22">
        <h2 id="ajuda-escolha" className="text-2xl font-bold tracking-tight">Na dúvida, responda duas perguntas</h2>
        <p className="mt-2 text-[15px] text-theme-muted">A sugestão segue só estes critérios. Você pode escolher qualquer plano que comporte seus alunos.</p>
      </div>
      <form data-scroll-reveal="right" data-scroll-distance="22" className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
        <div className="space-y-1.5">
          <label htmlFor="rec-alunos" className="block text-[15px] font-semibold">Quantos alunos você acompanha hoje?</label>
          <input id="rec-alunos" type="number" inputMode="numeric" min={0} value={count} onChange={(e) => setCount(e.target.value)} className="w-full min-h-[44px] rounded-control border border-theme-boundary/70 bg-theme-raised px-3 text-[15px] focus:border-theme-teal focus:outline-hidden focus:ring-2 focus:ring-theme-teal/25" />
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
      <h2 data-scroll-reveal="up" data-scroll-distance="18" id="comparativo" className="text-2xl font-bold tracking-tight">Comparar recursos</h2>
      <p data-scroll-reveal="fade" className="mt-2 text-[15px] text-theme-muted">As diferenças vêm primeiro. Triagem, segurança e acesso ao próprio histórico estão em todos os planos.</p>
      <div data-scroll-reveal="up" data-scroll-distance="20" data-scroll-delay="60" className="mt-6 overflow-x-auto rounded-panel border border-theme-border bg-theme-primary">
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
    BILLING_ENABLED
      ? { q: "Como funciona a contratação?", a: "Escolha o plano e confirme na página de pagamento do Asaas, com cartão de crédito. A mensalidade renova todo mês até você cancelar. Se ainda estiver no teste, a primeira cobrança fica para o fim dele. Cancelar interrompe a renovação e mantém o período já pago." }
      : { q: "Já posso contratar?", a: "Ainda não. A contratação será aberta em breve; nenhuma cobrança é feita nesta página. Quando abrir, o valor, a recorrência e a data da primeira cobrança aparecerão antes de qualquer confirmação." },
  ];
  return (
    <section aria-labelledby="duvidas-planos" className="mt-14 grid gap-8 border-t border-theme-border pt-10 lg:grid-cols-[0.7fr_1.3fr]">
      <h2 data-scroll-reveal="up" data-scroll-distance="18" id="duvidas-planos" className="text-2xl font-bold tracking-tight">Dúvidas sobre os planos</h2>
      <dl data-scroll-stagger="0.07" data-scroll-distance="16" className="divide-y divide-theme-border border-y border-theme-border">
        {faqs.map((f) => (
          <div key={f.q} data-scroll-item className="py-5">
            <dt className="text-[17px] font-semibold">{f.q}</dt>
            <dd className="mt-1.5 text-[16px] leading-relaxed text-theme-muted">{f.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
