// ==============================================================================
// Limite de alunos ativos.
// Aluno ativo = registro único de pessoa acompanhada, não arquivado. Avaliações,
// sessões e versões não contam. Arquivar nunca apaga; reativar verifica o limite.
// A contagem no navegador é só experiência/demonstração; a proteção real fica no
// banco (trigger da migração 20261108).
// ==============================================================================
import type { Trainee } from "@/lib/domain/types";

export type UsageState = "ok" | "at_limit" | "over_limit" | "no_limit";

export interface TraineeUsage {
  active: number;
  archived: number;
  limit: number | null;
  state: UsageState;
}

export function isArchived(t: Pick<Trainee, "archivedAt">): boolean {
  return !!t.archivedAt;
}

export function traineeUsage(trainees: Pick<Trainee, "archivedAt">[], limit: number | null): TraineeUsage {
  const active = trainees.filter((t) => !isArchived(t)).length;
  const archived = trainees.length - active;
  if (limit === null) return { active, archived, limit, state: "no_limit" };
  const state: UsageState = active > limit ? "over_limit" : active === limit ? "at_limit" : "ok";
  return { active, archived, limit, state };
}

export function usageMessage(u: TraineeUsage): string {
  if (u.limit === null) return `${u.active} ${u.active === 1 ? "aluno ativo" : "alunos ativos"}`;
  return `Você está usando ${u.active} de ${u.limit} alunos ativos`;
}

/** Pode incluir ou reativar mais um aluno? */
export function checkActivation(u: TraineeUsage): { ok: true } | { ok: false; message: string } {
  if (u.limit === null || u.active < u.limit) return { ok: true };
  const extra = u.active - u.limit;
  const base = `${usageMessage(u)}.`;
  return {
    ok: false,
    message:
      extra > 0
        ? `${base} Seu plano atual permite ${u.limit}. Arquive ${extra + 1} ${extra + 1 === 1 ? "aluno" : "alunos"} ou compare os planos para incluir outro. Nenhum dado é apagado.`
        : `${base} Arquive um aluno que não está mais em acompanhamento ou compare os planos. Nenhum dado é apagado.`,
  };
}

/**
 * Mudança para um plano com limite menor. Exige que a pessoa escolha quem continua
 * ativo; nada é escolhido por ordem alfabética nem apagado.
 */
export function planDowngrade(activeIds: string[], newLimit: number, keepIds: string[] | null):
  | { ok: true; keep: string[]; archive: string[] }
  | { ok: false; reason: "needs_choice" | "too_many" | "unknown_id"; mustArchive: number } {
  const mustArchive = Math.max(0, activeIds.length - newLimit);
  if (mustArchive === 0) return { ok: true, keep: [...activeIds], archive: [] };
  if (!keepIds) return { ok: false, reason: "needs_choice", mustArchive };
  const unique = Array.from(new Set(keepIds));
  if (unique.some((id) => !activeIds.includes(id))) return { ok: false, reason: "unknown_id", mustArchive };
  if (unique.length > newLimit) return { ok: false, reason: "too_many", mustArchive };
  return { ok: true, keep: unique, archive: activeIds.filter((id) => !unique.includes(id)) };
}
