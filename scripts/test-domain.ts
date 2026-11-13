import {
  aggregateMonthlyVolume,
  FIXTURE_EXERCISE_SETS_FEB_2027,
  ALL_FIXTURE_SETS,
} from "../src/lib/volume";
import {
  evaluateAccessEntitlement,
  activateTrialAtomically,
  adminApproveUser,
  adminPauseUser,
  adminResumeUser,
  adminExtendUser,
  adminRevokeUser,
  UserAccessProfile,
} from "../src/lib/access-policy";

function runDomainVerification() {
  console.log("=== INICIANDO VERIFICAÇÃO DO DOMÍNIO ===");

  // 1. Verificação do Volume de Carga em Fevereiro de 2027
  const summaryFeb = aggregateMonthlyVolume(FIXTURE_EXERCISE_SETS_FEB_2027, "2027-02");
  console.log(`Mês: ${summaryFeb.monthLabel}`);
  console.log(`Total do Mês: ${summaryFeb.totalVolumeKg} kg`);

  if (summaryFeb.totalVolumeKg !== 5500) {
    throw new Error(`Total de Fevereiro 2027 esperado 5500 kg, obtido: ${summaryFeb.totalVolumeKg}`);
  }

  const expectedWeeks = [1200, 1400, 1300, 1600];
  summaryFeb.weeks.forEach((w, idx) => {
    console.log(`  ${w.weekLabel}: ${w.volumeKg} kg (Esperado: ${expectedWeeks[idx]} kg)`);
    if (w.volumeKg !== expectedWeeks[idx]) {
      throw new Error(`Semana ${idx + 1} esperada ${expectedWeeks[idx]} kg, obtido: ${w.volumeKg}`);
    }
  });

  // Verifica se o total do mês bate rigorosamente com a soma das semanas
  const sumOfWeeks = summaryFeb.weeks.reduce((acc, w) => acc + w.volumeKg, 0);
  if (sumOfWeeks !== summaryFeb.totalVolumeKg) {
    throw new Error(`Inconsistência entre soma das semanas (${sumOfWeeks}) e total do mês (${summaryFeb.totalVolumeKg})`);
  }
  console.log("✓ Cálculo do Volume de Carga (Fev/2027) validado com 100% de exatidão.");

  // 2. Verificação de Proteção contra Divisão por Zero em Comparação de Mês
  const summaryWithZero = aggregateMonthlyVolume([], "2027-02", [], "2027-01");
  if (summaryWithZero.hasZeroBaseline !== true || summaryWithZero.growthPercentage !== null) {
    throw new Error("Falha na proteção contra divisão por zero de base comparativa vazia");
  }
  console.log("✓ Proteção contra divisão por zero em variações percentuais validada.");

  // 3. Verificação do Ciclo de Vida do Acesso (30 Dias)
  const newUser: UserAccessProfile = {
    id: "test-user-1",
    email: "estudante@exemplo.com.br",
    fullName: "Aluno Teste",
    role: "student",
    status: "pending",
    trialStartedAt: null,
    trialExpiresAt: null,
    pausedRemainingSeconds: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Avaliação pendente
  const evalPending = evaluateAccessEntitlement(newUser);
  if (!evalPending.isPending || evalPending.isActive) {
    throw new Error("Usuário pendente não deve estar com trial ativo");
  }
  console.log("✓ Usuário pendente mantém status seguro sem consumir dias.");

  // Aprovação do usuário pelo admin
  const { updatedProfile: approvedUser } = adminApproveUser(newUser, "admin@studio.com");
  if (approvedUser.status !== "active" || approvedUser.trialStartedAt !== null) {
    throw new Error("Usuário aprovado deve aguardar primeiro acesso para iniciar contagem");
  }
  console.log("✓ Aprovação não inicia contagem antes do 1º acesso real.");

  // Primeiro acesso atômico
  const activatedUser = activateTrialAtomically(approvedUser);
  if (!activatedUser.trialStartedAt || !activatedUser.trialExpiresAt) {
    throw new Error("Ativação atômica no 1º acesso falhou em registrar datas UTC");
  }
  const evalActive = evaluateAccessEntitlement(activatedUser);
  if (!evalActive.isActive || evalActive.daysRemaining < 29 || evalActive.daysRemaining > 30) {
    throw new Error(`Dias restantes no início deveriam ser ~30, obtido: ${evalActive.daysRemaining}`);
  }
  console.log(`✓ Ativação atômica iniciada com ${evalActive.daysRemaining} dias restantes.`);

  // Pausar acesso
  const { updatedProfile: pausedUser } = adminPauseUser(activatedUser, "admin@studio.com");
  if (pausedUser.status !== "paused" || pausedUser.pausedRemainingSeconds <= 0) {
    throw new Error("Pausa não congelou os segundos restantes com segurança");
  }
  console.log(`✓ Acesso pausado com ${pausedUser.pausedRemainingSeconds} segundos congelados.`);

  // Retomar acesso
  const { updatedProfile: resumedUser } = adminResumeUser(pausedUser, "admin@studio.com");
  if (resumedUser.status !== "active" || resumedUser.pausedRemainingSeconds !== 0) {
    throw new Error("Retomada não redefiniu status ou não limpou saldo congelado");
  }
  console.log("✓ Retomada de acesso recalculou nova expiração com integridade.");

  // Estender prazo
  const { updatedProfile: extendedUser } = adminExtendUser(resumedUser, 15, "admin@studio.com");
  const evalExtended = evaluateAccessEntitlement(extendedUser);
  if (evalExtended.daysRemaining < 43) {
    throw new Error("Extensão de +15 dias não aumentou o saldo esperado");
  }
  console.log(`✓ Extensão de +15 dias aplicada. Novo saldo: ${evalExtended.daysRemaining} dias.`);

  // Revogar acesso
  const { updatedProfile: revokedUser } = adminRevokeUser(extendedUser, "Teste de revogação", "admin@studio.com");
  const evalRevoked = evaluateAccessEntitlement(revokedUser);
  if (!evalRevoked.isRevoked || evalRevoked.isActive) {
    throw new Error("Revogação deve bloquear o acesso imediatamente");
  }
  console.log("✓ Revogação de acesso bloqueou credencial imediatamente.");

  console.log("\n=== TODAS AS REGRAS DE DOMÍNIO FORAM VALIDADAS COM SUCESSO! ===");
}

runDomainVerification();
