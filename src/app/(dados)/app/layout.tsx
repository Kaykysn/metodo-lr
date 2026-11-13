"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, ClipboardList, Dumbbell, LineChart, Library, BookOpen, UserCog, Menu, X, RotateCcw, LogOut } from "lucide-react";
import Logo from "@/components/brand/Logo";
import ThemeSelector from "@/components/appearance/ThemeSelector";
import { useData } from "@/components/providers/DataProvider";
import SessionGate from "@/components/providers/SessionGate";
import { DEMO_ACTORS } from "@/lib/data/seed";
import { ROLE_LABEL } from "@/lib/domain/roles";
import { DEMO_SCENARIOS, isDemoScenario } from "@/lib/subscription/simulation";
import { TrialBanner } from "@/components/subscription/PlanNotices";

const NAV = [
  { label: "Visão geral", href: "/app", icon: LayoutDashboard },
  { label: "Alunos", href: "/app/alunos", icon: Users },
  { label: "Avaliações", href: "/app/avaliacoes", icon: ClipboardList },
  { label: "Treinos", href: "/app/treinos", icon: Dumbbell },
  { label: "Evolução", href: "/app/evolucao", icon: LineChart },
  { label: "Biblioteca de exercícios", href: "/app/exercicios", icon: Library },
  { label: "Conteúdos e referências", href: "/app/conteudos", icon: BookOpen },
];

function isActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app";
  if (href === "/app/conteudos" && pathname.startsWith("/app/glossario")) return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <ul className="space-y-0.5">
      {NAV.map(({ label, href, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[44px] items-center gap-3 rounded-control px-3 text-[15px] font-medium transition-colors ${
                active ? "bg-theme-teal-subtle font-semibold text-theme-text" : "text-theme-muted hover:bg-theme-secondary hover:text-theme-text"
              }`}
            >
              <Icon className={`h-[18px] w-[18px] ${active ? "text-theme-teal" : ""}`} aria-hidden="true" />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SecondaryArea({ onNavigate }: { onNavigate?: () => void }) {
  const { actor, mode, setDemoActor, resetDemo, volatile, signOut, commercial, setDemoScenario } = useData();
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <div className="space-y-4 border-t border-theme-border pt-4">
      <Link href="/conta/acesso" onClick={onNavigate} className="flex min-h-[44px] items-center gap-3 rounded-control px-3 text-[15px] text-theme-muted hover:bg-theme-secondary hover:text-theme-text">
        <UserCog className="h-[18px] w-[18px]" aria-hidden="true" /> Plano e acesso
      </Link>
      <div className="px-3">
        <span className="mb-1.5 block text-sm text-theme-muted">Aparência</span>
        <ThemeSelector />
      </div>
      {mode === "supabase" && (
        <button type="button" onClick={signOut} className="flex min-h-[44px] w-full items-center gap-3 rounded-control px-3 text-[15px] text-theme-muted hover:bg-theme-secondary hover:text-theme-text">
          <LogOut className="h-[18px] w-[18px]" aria-hidden="true" /> Sair
        </button>
      )}
      {mode === "demo" && (
        <div className="mx-1 space-y-2 rounded-control border border-status-caution-border bg-status-caution-bg/60 p-3">
          <p className="text-sm font-semibold text-status-caution-fg">Modo demonstração</p>
          <p className="text-[13px] leading-snug text-theme-text">
            {volatile ? "Os dados ficam só nesta aba (armazenamento bloqueado)." : "Dados fictícios guardados só neste navegador."} Não use dados reais.
          </p>
          <label htmlFor="demo-actor" className="block text-[13px] font-semibold text-theme-text">Simular perfil</label>
          <select id="demo-actor" value={actor.id} onChange={(e) => setDemoActor(e.target.value)} className="w-full min-h-[40px] rounded-control border border-theme-boundary/70 bg-theme-raised px-2 text-sm">
            {DEMO_ACTORS.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <label htmlFor="demo-commercial" className="block text-[13px] font-semibold text-theme-text">Simular situação do plano</label>
          <select
            id="demo-commercial"
            value={commercial.scenario ?? "trial"}
            onChange={(e) => isDemoScenario(e.target.value) && setDemoScenario(e.target.value)}
            className="w-full min-h-[40px] rounded-control border border-theme-boundary/70 bg-theme-raised px-2 text-sm"
          >
            {DEMO_SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <p className="text-[13px] leading-snug text-theme-muted">Simulação: nenhuma cobrança existe nesta versão.</p>
          {confirmReset ? (
            <div className="flex gap-2">
              <button
                type="button"
                className="min-h-[40px] flex-1 rounded-control border border-status-danger-border bg-status-danger-bg text-sm font-semibold text-status-danger-fg"
                onClick={() => {
                  resetDemo();
                  setConfirmReset(false);
                }}
              >
                Apagar e recomeçar
              </button>
              <button type="button" className="min-h-[40px] rounded-control px-3 text-sm" onClick={() => setConfirmReset(false)}>Cancelar</button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmReset(true)} className="flex min-h-[40px] items-center gap-1.5 text-sm font-semibold text-theme-text underline-offset-2 hover:underline">
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Restaurar dados de demonstração
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/app";
  const { actor } = useData();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    drawerRef.current?.querySelector<HTMLElement>("a,button,select")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_1fr] print:block">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-control focus:bg-theme-raised focus:px-3 focus:py-2">
        Pular para o conteúdo
      </a>

      <aside className="sticky top-0 hidden h-screen print:!hidden flex-col gap-6 overflow-y-auto border-r border-theme-border bg-theme-primary px-3 py-5 lg:flex">
        <Link href="/app" className="px-3 text-theme-text" aria-label="Leandro Rangel — visão geral">
          <Logo variant="horizontal" size={34} frame="accent" />
        </Link>
        <nav aria-label="Área do professor" className="flex-1">
          <NavList pathname={pathname} />
        </nav>
        <SecondaryArea />
      </aside>

      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-theme-border bg-theme-primary/95 px-4 backdrop-blur lg:hidden print:hidden">
        <Link href="/app" className="text-theme-text" aria-label="Leandro Rangel — visão geral">
          <span className="sm:hidden"><Logo variant="symbol" size={34} frame="accent" /></span>
          <span className="hidden sm:inline"><Logo variant="horizontal" size={32} frame="accent" /></span>
        </Link>
        <button
          ref={btnRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="app-gaveta"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          className="inline-flex h-11 w-11 items-center justify-center rounded-control border border-theme-border text-theme-text"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {open && (
        <>
          <div className="fixed inset-0 top-16 z-40 bg-ink-950/40 motion-safe:animate-fadeIn lg:hidden" aria-hidden="true" onClick={() => setOpen(false)} />
          <div
            id="app-gaveta"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu da área do professor"
            className="fixed bottom-0 left-0 top-16 z-50 w-[min(320px,88vw)] overflow-y-auto border-r border-theme-border bg-theme-primary px-3 py-4 motion-safe:animate-drawerIn lg:hidden"
          >
            <nav aria-label="Área do professor (menu)">
              <NavList pathname={pathname} onNavigate={() => setOpen(false)} />
            </nav>
            <div className="mt-4">
              <SecondaryArea onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </>
      )}

      <div className="flex min-w-0 flex-col">
        <div className="border-b border-theme-border bg-theme-primary/70 px-4 py-2 text-sm text-theme-muted print:hidden sm:px-8">
          Você está como <strong className="font-semibold text-theme-text">{actor.name}</strong> — {ROLE_LABEL[actor.role]}
        </div>
        <TrialBanner />
        <main id="conteudo" className="mx-auto w-full max-w-[1240px] flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <SessionGate>{children}</SessionGate>
        </main>
      </div>
    </div>
  );
}
