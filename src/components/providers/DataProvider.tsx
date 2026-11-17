"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Actor } from "@/lib/domain/types";
import { DemoRepository, type Repository } from "@/lib/data/repository";
import { DEMO_ACTORS } from "@/lib/data/seed";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { SupabaseRepository } from "@/lib/data/supabase-repository";
import { loadSession, type SessionState } from "@/lib/data/session";
import { clearAllTabDrafts } from "@/lib/tab-drafts";
import { reactToAuthEvent } from "@/lib/auth/session-events";
import { DemoSubscriptionStore, SupabaseSubscriptionStore, type SubscriptionSnapshot, type SubscriptionStore } from "@/lib/subscription/store";
import { resolveCommercialAccess, type AdminStatus, type CommercialAccess, type PlanIntent, type SubscriptionRecord, type TrialWindow } from "@/lib/subscription/entitlements";
import { commercialInputsFor, isDemoScenario, type DemoScenario } from "@/lib/subscription/simulation";
import type { PlanId } from "@/lib/subscription/catalog";

export interface CommercialState {
  /** null enquanto carrega ou quando não há sessão. */
  access: CommercialAccess | null;
  intent: PlanIntent | null;
  /** Assinatura lida do banco (ou simulada na demonstração). Só leitura. */
  subscription: SubscriptionRecord | null;
  /** Situação comercial simulada (só demonstração). */
  simulated: boolean;
  scenario: DemoScenario | null;
  /** Tabelas de assinatura ainda não existem no banco. */
  unavailable: boolean;
  /** Dados de conta (modo real). */
  account: { email: string; fullName: string; adminStatus: AdminStatus; trial: TrialWindow } | null;
}

interface DataContextValue {
  repo: Repository;
  actor: Actor;
  mode: "demo" | "supabase";
  /** Sessão real (modo supabase). Na demonstração é sempre "active". */
  session: SessionState;
  /** Demonstração com armazenamento bloqueado: dados só nesta aba. */
  volatile: boolean;
  setDemoActor: (id: string) => void;
  resetDemo: () => void;
  signOut: () => Promise<void>;
  commercial: CommercialState;
  setDemoScenario: (s: DemoScenario) => void;
  /** Registra só a INTENÇÃO de plano. Não cria assinatura nem cobrança. */
  recordPlanIntent: (planId: PlanId) => Promise<PlanIntent>;
  /** Incrementa a cada mudança de identidade/reset para as telas recarregarem. */
  revision: number;
  bump: () => void;
  /** Relê sessão e assinatura do banco (ex.: depois de voltar do checkout). */
  reloadSession: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

/** Mesma sessão com outro objeto: mantém a referência antiga para as telas não recarregarem. */
function sameSession(a: SessionState, b: SessionState) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}
const ACTOR_KEY = "lr_demo_actor";
const SCENARIO_KEY = "lr_demo_commercial";
// Ator sem permissões, usado enquanto a sessão real não carrega ou está bloqueada
const NOBODY: Actor = { id: "anon", name: "Visitante", role: "student" };

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [db] = useState(() => (isSupabaseConfigured ? getSupabaseBrowserClient() : null));
  const [repo] = useState<Repository>(() => (db ? new SupabaseRepository(db) : new DemoRepository()));
  const [actorId, setActorId] = useState<string>("prof_a");
  const [revision, setRevision] = useState(0);
  const [session, setSession] = useState<SessionState>(db ? { status: "loading" } : { status: "active", actor: DEMO_ACTORS[0], entitlement: null });
  // O servidor não tem armazenamento do navegador: só avaliamos "volátil" após montar.
  const [mounted, setMounted] = useState(false);
  const [store] = useState<SubscriptionStore>(() => {
    if (db) return new SupabaseSubscriptionStore(db);
    let storage: Storage | null = null;
    try {
      storage = typeof window !== "undefined" ? window.localStorage : null;
    } catch {
      storage = null;
    }
    return new DemoSubscriptionStore(storage);
  });
  const [scenario, setScenario] = useState<DemoScenario>("trial");
  const [snapshot, setSnapshot] = useState<SubscriptionSnapshot>({ subscription: null, intent: null, unavailable: false });

  useEffect(() => {
    setMounted(true);
    if (db) return;
    try {
      const saved = window.localStorage.getItem(ACTOR_KEY);
      if (saved && DEMO_ACTORS.some((a) => a.id === saved)) setActorId(saved);
      const sc = window.localStorage.getItem(SCENARIO_KEY);
      if (isDemoScenario(sc)) setScenario(sc);
    } catch {
      /* sem armazenamento: identidade padrão */
    }
  }, [db]);

  // Sessão real: carrega no início e quando a PESSOA muda (entrou, saiu, trocou de conta).
  // Ao voltar para a aba, o Supabase revalida a sessão e emite TOKEN_REFRESHED/SIGNED_IN da mesma pessoa:
  // isso não pode recarregar as telas, senão o que está em edição volta ao estado salvo.
  useEffect(() => {
    if (!db) return;
    let alive = true;
    let userId: string | null | undefined; // undefined: ainda não sabemos quem é
    const refresh = () =>
      loadSession(db)
        .then((s) => alive && setSession((prev) => (sameSession(prev, s) ? prev : s)))
        .catch((e: Error) => alive && setSession({ status: "error", message: e.message }));
    refresh();
    const { data } = db.auth.onAuthStateChange((event, s) => {
      const next = s?.user?.id ?? null;
      const reaction = reactToAuthEvent(event, userId, next);
      userId = next;
      if (reaction === "ignore") return;
      // Fora do callback: o Supabase recomenda não chamar o cliente dentro dele
      window.setTimeout(() => {
        refresh();
        if (reaction === "reload") setRevision((r) => r + 1);
      }, 0);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, [db]);

  const setDemoActor = useCallback(
    (id: string) => {
      if (db) return; // identidade simulada só existe na demonstração
      setActorId(id);
      try {
        window.localStorage.setItem(ACTOR_KEY, id);
      } catch {
        /* ignora */
      }
      setRevision((r) => r + 1);
    },
    [db]
  );

  const resetDemo = useCallback(() => {
    if (repo instanceof DemoRepository) repo.reset();
    if (store instanceof DemoSubscriptionStore) store.reset();
    setRevision((r) => r + 1);
  }, [repo, store]);

  const setDemoScenario = useCallback(
    (s: DemoScenario) => {
      if (db) return; // simulação comercial só existe na demonstração
      setScenario(s);
      try {
        window.localStorage.setItem(SCENARIO_KEY, s);
      } catch {
        /* ignora */
      }
      setRevision((r) => r + 1);
    },
    [db]
  );

  const signOut = useCallback(async () => {
    clearAllTabDrafts(); // rascunhos desta aba não sobrevivem ao fim da sessão
    if (db) await db.auth.signOut();
    // Navegação completa de propósito: apaga da memória os dados de alunos da sessão encerrada.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  }, [db]);

  const bump = useCallback(() => setRevision((r) => r + 1), []);

  const reloadSession = useCallback(async () => {
    if (!db) return;
    try {
      setSession(await loadSession(db));
    } catch (e) {
      setSession({ status: "error", message: (e as Error).message });
    }
    setRevision((r) => r + 1);
  }, [db]);

  const actor: Actor = db
    ? session.status === "active"
      ? session.actor
      : NOBODY
    : DEMO_ACTORS.find((a) => a.id === actorId) ?? DEMO_ACTORS[0];

  // Assinatura/intenção: lida do armazenamento adequado ao modo
  const sessionActor = session.status === "active" || session.status === "blocked" ? session.actor : undefined;
  const subjectId = db ? sessionActor?.id : actor.id;
  useEffect(() => {
    if (!mounted || !subjectId) return;
    let alive = true;
    store.read(subjectId).then((snap) => alive && setSnapshot(snap)).catch(() => alive && setSnapshot({ subscription: null, intent: null, unavailable: true }));
    return () => {
      alive = false;
    };
  }, [store, subjectId, mounted, revision]);

  const account = session.status === "active" || session.status === "blocked" ? session.account ?? null : null;
  const commercial = useMemo<CommercialState>(() => {
    const empty: CommercialState = { access: null, intent: null, subscription: null, simulated: false, scenario: db ? null : scenario, unavailable: snapshot.unavailable, account };
    if (!mounted) return empty;
    const now = Date.now();
    if (!db) {
      const inp = commercialInputsFor({ mode: "demo", scenario, real: { trial: { startedAt: null, expiresAt: null }, subscription: null }, nowMs: now });
      const access = resolveCommercialAccess({ role: actor.role, adminStatus: "active", trial: inp.trial, subscription: inp.subscription, nowMs: now });
      return { ...empty, access, intent: snapshot.intent, subscription: inp.subscription, simulated: true };
    }
    if (!account || !sessionActor) return empty;
    const access = resolveCommercialAccess({ role: sessionActor.role, adminStatus: account.adminStatus, trial: account.trial, subscription: snapshot.subscription, nowMs: now });
    return { ...empty, access, intent: snapshot.intent, subscription: snapshot.subscription };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, mounted, scenario, actor.role, account, sessionActor, snapshot, revision]);

  // A demonstração aplica as regras comerciais do profissional responsável (simuladas)
  useEffect(() => {
    if (!(repo instanceof DemoRepository)) return;
    const now = Date.now();
    const inp = commercialInputsFor({ mode: "demo", scenario, real: { trial: { startedAt: null, expiresAt: null }, subscription: null }, nowMs: now });
    const pro = resolveCommercialAccess({ role: "teacher", adminStatus: "active", trial: inp.trial, subscription: inp.subscription, nowMs: now });
    repo.guard = {
      canCreate: () => (pro.canCreate ? null : "Teste encerrado (simulação): o acesso está em modo de consulta. Nada foi apagado; veja os planos em Conta e acesso."),
      activeLimit: () => pro.traineeLimit,
    };
  }, [repo, scenario]);

  const recordPlanIntent = useCallback(
    async (planId: PlanId) => {
      const who = db ? sessionActor?.id : actor.id;
      if (!who) throw new Error("Entre na sua conta para guardar a escolha de plano.");
      const intent = await store.recordIntent(who, planId);
      setSnapshot((s) => ({ ...s, intent }));
      return intent;
    },
    [db, sessionActor, actor.id, store]
  );

  const value = useMemo<DataContextValue>(
    () => ({
      repo,
      actor,
      mode: repo.mode,
      session,
      volatile: mounted && repo instanceof DemoRepository ? repo.volatile : false,
      setDemoActor,
      resetDemo,
      signOut,
      commercial,
      setDemoScenario,
      recordPlanIntent,
      revision,
      bump,
      reloadSession,
    }),
    [repo, actor, session, setDemoActor, resetDemo, signOut, commercial, setDemoScenario, recordPlanIntent, revision, bump, reloadSession, mounted]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData fora de DataProvider");
  return ctx;
}

/** Carrega dados assíncronos com estados verdadeiros: carregando, erro, pronto. */
export function useAsync<T>(fn: () => Promise<T>, deps: React.DependencyList) {
  const [state, setState] = useState<{ status: "loading" | "ready" | "error"; data?: T; error?: string }>({ status: "loading" });
  useEffect(() => {
    let alive = true;
    setState((s) => ({ status: "loading", data: s.data }));
    fn()
      .then((data) => alive && setState({ status: "ready", data }))
      .catch((e: Error) => alive && setState({ status: "error", error: e.message }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}
