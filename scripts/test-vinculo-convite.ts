/* Integração das telas de agenda, Pix e área do aluno com o vínculo pelo convite.
   Executar: node scripts/run-ts.mjs scripts/test-vinculo-convite.ts */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const src = path.join(root, "src");
const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const files = walk(src).filter((f) => /\.(ts|tsx)$/.test(f));
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");
let n = 0;
const ok = (m: string) => {
  n++;
  console.log("✓", m);
};

// 1. O aluno não escolhe professor nem pede vínculo: o acesso vem só do convite do professor
assert.ok(!fs.existsSync(path.join(src, "app", "selecionar-professor")), "rota /selecionar-professor removida");
const removed = /selecionar-professor|request_student_link|decide_student_link|student_link_requests|professionals_directory|StudentLinkRequest|listLinkRequests/;
const leftovers = files.filter((f) => removed.test(fs.readFileSync(f, "utf8"))).map((f) => path.relative(root, f));
assert.deepEqual(leftovers, [], "nenhuma referência ao pedido de vínculo antigo");
ok("Sem pedido de vínculo nem diretório de profissionais: o vínculo vem só do convite");

// 2. O convite continua na ficha, só para o professor responsável
const ficha = read("src/app/(dados)/app/alunos/[id]/page.tsx");
assert.ok(ficha.includes("<PractitionerAccessPanel") && ficha.includes('can(actor.role, "plan.publish") && trainee.ownerId === actor.id'));
assert.ok(!/outro profissional|fora da sua responsabilidade/.test(ficha), "mensagem de não encontrado não sugere dono");
ok("Ficha do aluno mantém o painel de convite, restrito ao professor dono");

// 3. Login leva o aluno (practitioner) ao próprio treino; estudante de Educação Física não é aluno
const login = read("src/app/login/page.tsx");
assert.ok(login.includes("destinationFor(p?.role, next)"));
assert.ok(!/pe_student/.test(login), "login não trata o estudante de Educação Física como aluno");
ok("Login usa o papel do convite (practitioner) para levar o aluno à área dele");

// 4. Pix do professor e mensalidades não passam pela cobrança da plataforma (Asaas)
const pixFiles = files.filter((f) => /teacher_pix_keys|upsertTeacherPixKey|recordPayment/.test(fs.readFileSync(f, "utf8")));
assert.ok(pixFiles.length > 0);
for (const f of pixFiles) {
  const s = fs.readFileSync(f, "utf8");
  assert.ok(!/startCheckout|callFunction\(\s*"billing"|asaas/i.test(s), `${path.relative(root, f)} não chama a cobrança`);
}
// A cobrança da plataforma só sai com a contratação ligada no ambiente
const checkoutCallers = files.filter((f) => /startCheckout\(/.test(fs.readFileSync(f, "utf8")) && !f.endsWith(path.join("subscription", "checkout.ts")));
for (const f of checkoutCallers) {
  assert.ok(fs.readFileSync(f, "utf8").includes("BILLING_ENABLED"), `${path.relative(root, f)} confere BILLING_ENABLED antes do checkout`);
}
ok(`Pix e mensalidades ficam fora da cobrança; checkout só com BILLING_ENABLED (${checkoutCallers.length} telas)`);

// Assinatura agendada no teste (status "none", sem período pago) continua viva e cancelável,
// com a mesma regra da função billing do servidor (que impede abrir uma segunda cobrança)
const acesso = read("src/app/(dados)/conta/acesso/page.tsx");
const renewing = acesso.slice(acesso.indexOf("function renewing("), acesso.indexOf("}", acesso.indexOf("function renewing(")) + 1);
assert.ok(renewing.includes('sub.billingStatus !== "canceled"'), "renovação viva enquanto não cancelada");
assert.ok(!/billingStatus === "active"|paidThrough/.test(renewing), "não exige pagamento já feito: a agendada precisa poder ser cancelada");
ok("Assinatura agendada para o fim do teste continua cancelável antes da primeira cobrança");

// 5. Área do aluno sem professor aponta para o convite
const agenda = read("src/app/(dados)/aluno/agenda/page.tsx");
assert.ok(/convite/.test(agenda) && !/Escolher professor/.test(agenda));
ok("Agenda do aluno sem vínculo explica o convite");

console.log(`\n${n} testes do vínculo pelo convite passaram.`);
