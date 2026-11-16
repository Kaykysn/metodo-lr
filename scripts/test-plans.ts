/* Testes da etapa de planos (catálogo, acesso comercial, limites, intenção).
   Executar: node scripts/run-ts.mjs scripts/test-plans.ts
   São testes de funções e do repositório de demonstração; NÃO validam o banco. */
import assert from "node:assert/strict";
import { BASE_FEATURES, CATALOG_VERSION, COMPARE_ROWS, PLANS, TRIAL_FEATURES, formatPrice, getPlan, recommendPlan, cheapestPlanWith } from "../src/lib/subscription/catalog";
import { canPerform, hasFeature, resolveCommercialAccess, trialNotice, type SubscriptionRecord } from "../src/lib/subscription/entitlements";
import { checkActivation, planDowngrade, traineeUsage, usageMessage } from "../src/lib/subscription/limits";
import { commercialInputsFor, scenarioInputs } from "../src/lib/subscription/simulation";
import { BILLING_ENABLED, BILLING_UNAVAILABLE_MESSAGE, firstChargeDate, isAsaasCheckoutUrl, readSupportConfig } from "../src/lib/subscription/billing";
import { DemoSubscriptionStore } from "../src/lib/subscription/store";
import { DemoRepository } from "../src/lib/data/repository";
import { DEMO_ACTORS } from "../src/lib/data/seed";
import { reuseAsDraft, approve, latest } from "../src/lib/domain/plans";
import { compareAssessments } from "../src/lib/domain/assessment-compare";
import type { Actor, Assessment } from "../src/lib/domain/types";

class MemStorage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  key(i: number) { return Array.from(this.m.keys())[i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
}

const DAY = 864e5;
const NOW = Date.parse("2026-11-20T15:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString();
const trialRunning = { startedAt: iso(NOW - 5 * DAY), expiresAt: iso(NOW + 25 * DAY) };
const trialOver = { startedAt: iso(NOW - 40 * DAY), expiresAt: iso(NOW - 10 * DAY) };
const paid = (planId: "essencial" | "evolucao" | "completo", over: Partial<SubscriptionRecord> = {}): SubscriptionRecord => ({
  planId, catalogVersion: CATALOG_VERSION, billingStatus: "active", currentPeriodStart: iso(NOW - 5 * DAY), paidThrough: iso(NOW + 25 * DAY),
  cancelAtPeriodEnd: false, pendingPlanId: null, provider: null, providerSubscriptionId: null, ...over,
});
const prof = DEMO_ACTORS.find((a) => a.id === "prof_a")!;
const student = DEMO_ACTORS.find((a) => a.id === "est_1")!;
const practitioner = DEMO_ACTORS.find((a) => a.id === "aluno_142")!;

(async () => {
  let n = 0;
  const ok = (m: string) => { n++; console.log("✓", m); };

  // ---------------------------------------------------------------- catálogo
  assert.deepEqual(PLANS.map((p) => [p.id, p.priceCents, p.currency, p.interval, p.activeTraineeLimit]), [
    ["essencial", 2990, "BRL", "monthly", 10],
    ["evolucao", 3990, "BRL", "monthly", 20],
    ["completo", 5990, "BRL", "monthly", 100],
  ]);
  assert.deepEqual(PLANS.map((p) => p.name), ["Essencial", "Evolução", "Completo"]);
  assert.equal(formatPrice(2990).replace(/\s/g, " "), "R$ 29,90");
  assert.equal(COMPARE_ROWS[0].values.completo, formatPrice(5990));
  assert.equal(COMPARE_ROWS[1].values.essencial, "Até 10");
  assert.ok(!JSON.stringify(PLANS).toLowerCase().includes("ilimitad"), "100 não é ilimitado");
  assert.match(CATALOG_VERSION, /^\d{4}-\d{2}-\d{2}\.\d+$/);
  ok("Catálogo: 2990/3990/5990 BRL mensais, limites 10/20/100, versão registrada");

  for (const p of PLANS) for (const f of BASE_FEATURES) assert.ok(p.features.includes(f), `${p.id} sem ${f}`);
  assert.ok(!getPlan("essencial").features.includes("plan_reuse"));
  assert.ok(getPlan("evolucao").features.includes("plan_reuse") && getPlan("evolucao").features.includes("assessment_compare"));
  assert.ok(!getPlan("evolucao").features.includes("rule_suggestions"));
  assert.ok(getPlan("completo").features.includes("rule_suggestions") && getPlan("completo").features.includes("consolidated_dashboard"));
  assert.equal(cheapestPlanWith("assessment_compare").id, "evolucao");
  assert.ok(BASE_FEATURES.includes("triage") && BASE_FEATURES.includes("body_map"), "segurança e mapa não são premium");
  ok("Recursos básicos (triagem, mapa, histórico) nos três planos; adicionais corretos");

  // ---------------------------------------------------------------- papéis ∩ plano
  const completoPago = resolveCommercialAccess({ role: "pe_student", adminStatus: "active", trial: trialOver, subscription: paid("completo"), nowMs: NOW });
  assert.equal(completoPago.phase, "paid");
  assert.equal(canPerform("pe_student", completoPago, "plan.approve"), false);
  assert.equal(canPerform("pe_student", completoPago, "plan.publish"), false);
  assert.equal(canPerform("pe_student", completoPago, "plan.draft"), true);
  const admin = resolveCommercialAccess({ role: "admin", adminStatus: "active", trial: trialOver, subscription: paid("completo"), nowMs: NOW });
  assert.equal(admin.phase, "not_applicable");
  assert.equal(canPerform("admin", admin, "trainee.read"), false);
  ok("Completo não dá aprovação a estudante nem dados de saúde à administração");

  const repoX = new DemoRepository(new MemStorage() as unknown as Storage);
  const profB = DEMO_ACTORS.find((a) => a.id === "prof_b")!;
  repoX.guard = { canCreate: () => null, activeLimit: () => 100 };
  assert.equal((await repoX.listTrainees(profB)).some((t) => t.ownerId === "prof_a"), false);
  await assert.rejects(() => repoX.setTraineeArchived(profB, "tr_0142", true));
  ok("Plano não abre dados de outro profissional (nem para arquivar)");

  // ---------------------------------------------------------------- teste e intenção
  const inTrial = resolveCommercialAccess({ role: "teacher", adminStatus: "active", trial: trialRunning, subscription: null, nowMs: NOW });
  assert.equal(inTrial.phase, "trial");
  assert.equal(inTrial.effectivePlanId, "completo");
  assert.equal(inTrial.traineeLimit, 100);
  assert.ok(hasFeature(inTrial, "rule_suggestions"));
  assert.ok(!hasFeature(inTrial, "priority_support"), "teste não promete suporte prioritário");
  assert.deepEqual(TRIAL_FEATURES.includes("priority_support"), false);
  const notStarted = resolveCommercialAccess({ role: "teacher", adminStatus: "active", trial: { startedAt: null, expiresAt: null }, subscription: null, nowMs: NOW });
  assert.equal(notStarted.phase, "trial_not_started");
  ok("Teste: recursos de software do Completo, até 100 ativos, sem suporte prioritário");

  const store = new DemoSubscriptionStore(new MemStorage() as unknown as Storage);
  await store.recordIntent("prof_a", "completo");
  const snap = await store.read("prof_a");
  assert.equal(snap.intent?.planId, "completo");
  assert.equal(snap.intent?.catalogVersion, CATALOG_VERSION);
  assert.equal(snap.subscription, null, "intenção não cria assinatura");
  const afterIntent = resolveCommercialAccess({ role: "teacher", adminStatus: "active", trial: trialRunning, subscription: snap.subscription, nowMs: NOW });
  assert.equal(afterIntent.trialEndsAt, trialRunning.expiresAt, "selecionar plano não reinicia o teste");
  const expiredWithIntent = resolveCommercialAccess({ role: "teacher", adminStatus: "active", trial: trialOver, subscription: snap.subscription, nowMs: NOW });
  assert.equal(expiredWithIntent.phase, "expired");
  assert.equal(expiredWithIntent.canCreate, false);
  await assert.rejects(() => store.recordIntent("prof_a", "premium" as never));
  ok("Intenção de plano não vira assinatura, não reinicia o teste e só aceita IDs do catálogo");

  const unpaidRecord = resolveCommercialAccess({ role: "teacher", adminStatus: "active", trial: trialOver, subscription: paid("completo", { billingStatus: "none" }), nowMs: NOW });
  assert.equal(unpaidRecord.phase, "expired", "registro sem pagamento confirmado não concede acesso");
  ok("Assinatura sem status de pagamento não concede acesso");

  // ---------------------------------------------------------------- contratação
  assert.equal(BILLING_ENABLED, process.env.NEXT_PUBLIC_BILLING_ENABLED === "true", "só liga com a variável explícita");
  assert.equal(BILLING_UNAVAILABLE_MESSAGE, "As assinaturas estarão disponíveis em breve. Nenhuma cobrança foi feita.");
  ok("Contratação desligada por padrão, com mensagem honesta");

  assert.equal(firstChargeDate(iso(NOW + 10 * DAY), NOW).getTime(), NOW + 10 * DAY, "teste em andamento: cobra no fim");
  assert.equal(firstChargeDate(iso(NOW - DAY), NOW).getTime(), NOW, "teste vencido: cobra hoje");
  assert.equal(firstChargeDate(null, NOW).getTime(), NOW);
  ok("Primeira cobrança não consome dias do teste");

  assert.ok(isAsaasCheckoutUrl("https://sandbox.asaas.com/checkoutSession/show?id=x"));
  assert.ok(isAsaasCheckoutUrl("https://asaas.com/c/x"));
  assert.ok(!isAsaasCheckoutUrl("http://asaas.com/c/x"));
  assert.ok(!isAsaasCheckoutUrl("https://asaas.com.exemplo.invalid/c/x"));
  assert.ok(!isAsaasCheckoutUrl("javascript:alert(1)"));
  ok("Redirecionamento só para página https do Asaas");

  // ---------------------------------------------------------------- fixtures fora da demo
  const realInputs = { trial: trialOver, subscription: null };
  const prodSim = commercialInputsFor({ mode: "supabase", scenario: "paid_completo", real: realInputs, nowMs: NOW });
  assert.equal(prodSim.simulated, false);
  assert.equal(prodSim.subscription, null);
  const prodAccess = resolveCommercialAccess({ role: "teacher", adminStatus: "active", ...prodSim, nowMs: NOW });
  assert.equal(prodAccess.phase, "expired");
  const demoSim = commercialInputsFor({ mode: "demo", scenario: "paid_completo", real: realInputs, nowMs: NOW });
  assert.equal(demoSim.simulated, true);
  assert.equal(demoSim.subscription?.providerSubscriptionId, null, "simulação sem ID externo fictício");
  ok("Fixtures comerciais são ignoradas fora da demonstração");

  // ---------------------------------------------------------------- limites
  const ten = Array.from({ length: 10 }, () => ({ archivedAt: null }));
  const u10 = traineeUsage(ten, 10);
  assert.equal(u10.state, "at_limit");
  assert.equal(usageMessage(u10), "Você está usando 10 de 10 alunos ativos");
  assert.equal(checkActivation(u10).ok, false);
  assert.equal(checkActivation(traineeUsage([...ten.slice(1), { archivedAt: iso(NOW) }], 10)).ok, true, "arquivado não conta");
  const over = traineeUsage(Array.from({ length: 12 }, () => ({ archivedAt: null })), 10);
  assert.equal(over.state, "over_limit");
  assert.equal(checkActivation(over).ok, false);
  ok("Limite: 10 de 10 bloqueia inclusão; arquivado não conta; excesso fica over_limit");

  const ids = Array.from({ length: 12 }, (_, i) => `t${i}`);
  const noChoice = planDowngrade(ids, 10, null);
  assert.equal(noChoice.ok, false);
  assert.equal(!noChoice.ok && noChoice.reason, "needs_choice");
  assert.equal(!noChoice.ok && noChoice.mustArchive, 2);
  assert.equal(planDowngrade(ids, 10, ids.slice(0, 11)).ok, false, "escolha acima do limite é recusada");
  const chosen = planDowngrade(ids, 10, ids.slice(2));
  assert.ok(chosen.ok && chosen.archive.join() === "t0,t1");
  assert.ok(planDowngrade(ids, 20, null).ok, "sem excesso, nada a escolher");
  ok("Downgrade exige escolha explícita de quem continua ativo; nada é escolhido sozinho");

  // repositório da demonstração com limite simulado
  const repo = new DemoRepository(new MemStorage() as unknown as Storage);
  let limit = 3;
  repo.guard = { canCreate: () => null, activeLimit: () => limit };
  await repo.createTrainee(prof, { displayName: "C", goal: "", experience: "nao_informado" }); // prof_a tinha 2
  await assert.rejects(() => repo.createTrainee(prof, { displayName: "D", goal: "", experience: "nao_informado" }), /3 de 3/);
  await repo.setTraineeArchived(prof, "tr_0157", true);
  const created = await repo.createTrainee(prof, { displayName: "D", goal: "", experience: "nao_informado" });
  await assert.rejects(() => repo.setTraineeArchived(prof, "tr_0157", false), /3 de 3/, "reativar verifica limite");
  await repo.setTraineeArchived(prof, created.id, true);
  await repo.setTraineeArchived(prof, "tr_0157", false);
  limit = 1; // simula mudança para plano menor
  const all = await repo.listTrainees(prof);
  assert.equal(traineeUsage(all, limit).state, "over_limit");
  assert.equal(all.length, 4, "nada foi apagado no excesso");
  await assert.rejects(() => repo.createTrainee(prof, { displayName: "E", goal: "", experience: "nao_informado" }));
  ok("Demonstração: criar, arquivar, reativar e excesso após mudança de plano");

  // aluno arquivado: histórico consultável, sem novos registros
  await repo.setTraineeArchived(prof, "tr_0142", true);
  assert.ok((await repo.listAssessments(prof, "tr_0142")).length > 0, "avaliações continuam consultáveis");
  assert.ok((await repo.listPlans(prof, "tr_0142")).length > 0, "treinos continuam consultáveis");
  await assert.rejects(() => repo.createAssessment(prof, "tr_0142"), /arquivado/);
  assert.ok((await repo.listPlans(practitioner, "tr_0142")).length > 0, "aluno arquivado ainda vê o último treino disponibilizado");
  ok("Aluno arquivado: histórico e último treino visíveis, sem novas avaliações");

  // ---------------------------------------------------------------- vencido e pago
  const exp = resolveCommercialAccess({ role: "teacher", adminStatus: "active", trial: trialOver, subscription: null, nowMs: NOW });
  assert.equal(canPerform("teacher", exp, "trainee.read"), true);
  assert.equal(canPerform("teacher", exp, "assessment.read"), true);
  assert.equal(canPerform("teacher", exp, "trainee.write"), false);
  assert.equal(canPerform("teacher", exp, "plan.publish"), false);
  const repoExp = new DemoRepository(new MemStorage() as unknown as Storage);
  repoExp.guard = { canCreate: () => "consulta", activeLimit: () => null };
  assert.ok((await repoExp.listAssessments(prof)).length > 0, "vencimento não esconde histórico");
  assert.ok((await repoExp.listPlans(prof)).length > 0);
  await assert.rejects(() => repoExp.createTrainee(prof, { displayName: "X", goal: "", experience: "nao_informado" }));
  await assert.rejects(() => repoExp.createAssessment(prof, "tr_0142"));
  ok("Teste vencido: consulta e impressão do histórico, sem novas criações");

  const paidEvo = resolveCommercialAccess({ role: "teacher", adminStatus: "active", trial: trialOver, subscription: paid("evolucao"), nowMs: NOW });
  assert.equal(paidEvo.phase, "paid");
  assert.equal(paidEvo.traineeLimit, 20);
  assert.ok(hasFeature(paidEvo, "plan_reuse") && !hasFeature(paidEvo, "rule_suggestions"));
  assert.equal(canPerform("teacher", paidEvo, "plan.publish"), true);
  const pastDue = resolveCommercialAccess({ role: "teacher", adminStatus: "active", trial: trialOver, subscription: paid("essencial", { billingStatus: "past_due" }), nowMs: NOW });
  assert.equal(pastDue.phase, "paid", "falha de cobrança não apaga período já quitado");
  const canceledEnded = resolveCommercialAccess({ role: "teacher", adminStatus: "active", trial: trialOver, subscription: paid("essencial", { billingStatus: "canceled", paidThrough: iso(NOW - DAY) }), nowMs: NOW });
  assert.equal(canceledEnded.phase, "expired");
  const revokedPaid = resolveCommercialAccess({ role: "teacher", adminStatus: "revoked", trial: trialOver, subscription: paid("completo"), nowMs: NOW });
  assert.equal(revokedPaid.phase, "blocked");
  assert.equal(canPerform("teacher", revokedPaid, "trainee.write"), false);
  const sim = scenarioInputs("paid_essencial", NOW);
  assert.equal(resolveCommercialAccess({ role: "teacher", adminStatus: "active", ...sim, nowMs: NOW }).traineeLimit, 10);
  ok("Pago com teste vencido libera o plano; revogação continua valendo; cancelado mantém só o período pago");

  // ---------------------------------------------------------------- praticante
  const pr = resolveCommercialAccess({ role: "practitioner", adminStatus: "active", trial: trialOver, subscription: null, nowMs: NOW });
  assert.equal(pr.phase, "not_applicable");
  assert.equal(pr.traineeLimit, null);
  assert.equal(trialNotice(pr, NOW), null, "praticante não recebe aviso de cobrança do professor");
  ok("Praticante: fora dos planos profissionais, sem aviso de teste");

  // ---------------------------------------------------------------- suporte
  assert.equal(readSupportConfig({}).prioritySupportReady, false);
  assert.equal(readSupportConfig({ PRIORITY_SUPPORT_CHANNEL_URL: "javascript:alert(1)", PRIORITY_SUPPORT_HOURS: "x" }).prioritySupportReady, false);
  assert.equal(readSupportConfig({ PRIORITY_SUPPORT_CHANNEL_URL: "https://exemplo.invalid/suporte" }).prioritySupportReady, false, "sem horário não é pronto");
  assert.equal(readSupportConfig({ PRIORITY_SUPPORT_CHANNEL_URL: "mailto:suporte@exemplo.invalid", PRIORITY_SUPPORT_HOURS: "dias úteis" }).prioritySupportReady, true);
  ok("Suporte prioritário só aparece como pronto com canal e horário configurados");

  // ---------------------------------------------------------------- avisos
  const at = (days: number) => resolveCommercialAccess({ role: "teacher", adminStatus: "active", trial: { startedAt: iso(NOW - DAY), expiresAt: iso(NOW + days * DAY) }, subscription: null, nowMs: NOW });
  assert.equal(trialNotice(at(10), NOW), null);
  assert.equal(trialNotice(at(7), NOW)?.level, "week");
  assert.equal(trialNotice(at(3), NOW)?.level, "days");
  assert.equal(trialNotice(at(0.2), NOW)?.daysLeft, 1);
  assert.equal(trialNotice(exp, NOW)?.level, "ended");
  assert.equal(trialNotice(paidEvo, NOW), null);
  ok("Avisos aos 7 e 3 dias e no vencimento; nenhum com plano pago");

  // ---------------------------------------------------------------- recomendação
  assert.equal(recommendPlan({ activeTrainees: 8, wantsReuse: false, wantsAdvanced: false }).planId, "essencial");
  assert.equal(recommendPlan({ activeTrainees: 15, wantsReuse: false, wantsAdvanced: false }).planId, "evolucao");
  assert.equal(recommendPlan({ activeTrainees: 5, wantsReuse: true, wantsAdvanced: false }).planId, "evolucao");
  assert.equal(recommendPlan({ activeTrainees: 25, wantsReuse: false, wantsAdvanced: false }).planId, "completo");
  assert.equal(recommendPlan({ activeTrainees: 140, wantsReuse: false, wantsAdvanced: false }).planId, null);
  ok("Recomendação segue critérios objetivos e não inventa plano acima de 100");

  // ---------------------------------------------------------------- comparação
  const repo2 = new DemoRepository(new MemStorage() as unknown as Storage);
  repo2.guard = { canCreate: () => null, activeLimit: () => 100 };
  const [a1] = await repo2.listAssessments(prof, "tr_0157");
  const base: Assessment = JSON.parse(JSON.stringify(a1));
  const b1: Assessment = JSON.parse(JSON.stringify(a1));
  b1.id = "av_x"; b1.version = a1.version + 1; b1.date = "2027-03-01";
  base.blocks.functional.tests = [{ id: "f1", name: "Sentar e levantar", value: 10, unit: "repetições", date: "2027-01-01", note: "" }];
  b1.blocks.functional.tests = [{ id: "f2", name: "Sentar e levantar", value: 30, unit: "s", date: "2027-03-01", note: "" }];
  base.blocks.complaint.symptoms = [{ regionId: "knee:right", intensity: null, quality: "dor", onset: "", frequency: "nao_informado", radiates: { state: "no" }, aggravating: "", easing: "", note: "" }];
  b1.blocks.complaint.symptoms = [];
  const lines = compareAssessments(base, b1);
  const tests = lines.filter((l) => l.section === "Medidas");
  assert.equal(tests.length, 2, "mesma medida com unidades diferentes não vira uma linha só");
  assert.ok(tests.every((l) => l.a.includes("não registrado") || l.b.includes("não registrado")));
  const knee = lines.find((l) => l.label === "knee:right")!;
  assert.equal(knee.a, "intensidade não informada");
  assert.equal(knee.b, "não registrado nesta avaliação");
  assert.throws(() => compareAssessments(base, { ...b1, traineeId: "outro" }));
  ok("Comparação: unidade preservada, ausência ≠ zero ≠ não informado, mesmo aluno");

  // ---------------------------------------------------------------- reaproveitar
  const repo3 = new DemoRepository(new MemStorage() as unknown as Storage);
  repo3.guard = { canCreate: () => null, activeLimit: () => 100 };
  const src = (await repo3.listPlans(prof)).find((p) => p.versions.some((v) => v.status === "published"))!;
  const target = (await repo3.listAssessments(prof)).find((a) => a.traineeId !== src.traineeId)!;
  src.versions.forEach((v) => v.sessions.forEach((s) => s.items.forEach((i) => (i.privateNote = "nota sobre o aluno de origem"))));
  const copy = reuseAsDraft({ actor: prof, source: src, targetAssessment: target, title: "Cópia", startDate: "2027-03-01" });
  assert.equal(copy.versions.length, 1);
  assert.equal(latest(copy).status, "draft", "cópia não é aprovada automaticamente");
  assert.equal(copy.traineeId, target.traineeId);
  assert.ok(copy.versions[0].sessions.every((s) => s.items.every((i) => i.privateNote === "")), "nota privada não é copiada");
  assert.notEqual(copy.versions[0].sessions[0].id, src.versions[0].sessions[0].id);
  await repo3.savePlan(prof, copy);
  assert.throws(() => reuseAsDraft({ actor: profB as Actor, source: src, targetAssessment: target, title: "x", startDate: "2027-03-01" }));
  const stuCopy = reuseAsDraft({ actor: { ...student, id: target.ownerId }, source: { ...src, ownerId: target.ownerId }, targetAssessment: target, title: "y", startDate: "2027-03-01" });
  assert.throws(() => approve(stuCopy, student), /professor/);
  ok("Reaproveitar: novo rascunho para outro aluno, sem nota privada, sem aprovação automática");

  console.log(`\n${n} testes de planos passaram.`);
})().catch((e) => {
  console.error("✗ FALHA:", e);
  process.exit(1);
});
