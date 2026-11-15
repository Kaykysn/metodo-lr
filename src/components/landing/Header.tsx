"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import Logo from "@/components/brand/Logo";
import ThemeSelector from "@/components/appearance/ThemeSelector";
import VisualEffectsToggle from "@/components/appearance/VisualEffectsToggle";

const NAV = [
  { label: "Como funciona", href: "/#percurso" },
  { label: "Mapa corporal", href: "/#mapa" },
  { label: "Treinos", href: "/#treinos" },
  { label: "Planos", href: "/planos" },
  { label: "Dúvidas", href: "/#duvidas" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    if (!open) return;
    drawer.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    const onResize = () => window.innerWidth >= 1280 && setOpen(false);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <header data-scrolled={scrolled || open} className="glass-strong sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Leandro Rangel — início" className="text-theme-text">
          <span className="sm:hidden"><Logo variant="symbol" size={36} frame="accent" /></span>
          <span className="hidden sm:inline"><Logo variant="horizontal" size={36} frame="accent" /></span>
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-0.5 xl:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="whitespace-nowrap rounded-control px-2.5 py-2 text-[15px] font-medium text-theme-muted transition-colors hover:text-theme-text">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 xl:flex">
          <div className="flex items-center gap-1 rounded-control border border-theme-border bg-theme-secondary/60 p-0.5">
            <ThemeSelector compact />
            <VisualEffectsToggle compact />
          </div>
          <Link href="/login" className="inline-flex min-h-[44px] items-center whitespace-nowrap rounded-control px-3 text-[15px] font-semibold text-theme-text hover:bg-theme-secondary">Entrar</Link>
          <Link href="/solicitar-acesso" className="inline-flex min-h-[44px] items-center whitespace-nowrap rounded-control bg-action px-4 text-[15px] font-semibold text-action-text transition-colors hover:bg-action-hover">Solicitar acesso</Link>
        </div>
        <button ref={btn} type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="menu-site" aria-label={open ? "Fechar menu" : "Abrir menu"} className="inline-flex h-11 w-11 items-center justify-center rounded-control border border-theme-border text-theme-text xl:hidden">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div id="menu-site" ref={drawer} role="dialog" aria-modal="true" aria-label="Menu" className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-theme-border bg-theme-primary px-4 pb-6 pt-2 motion-safe:animate-drawerIn xl:hidden">
          <nav aria-label="Principal (menu)" className="flex flex-col">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="flex min-h-[48px] items-center border-b border-theme-border text-base font-medium">
                {n.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ThemeSelector />
            <VisualEffectsToggle />
          </div>
          <div className="mt-4 grid gap-2">
            <Link href="/solicitar-acesso" className="inline-flex min-h-[48px] items-center justify-center rounded-control bg-action font-semibold text-action-text">Solicitar acesso</Link>
            <Link href="/login" className="inline-flex min-h-[48px] items-center justify-center rounded-control border border-theme-boundary/60 font-semibold">Entrar</Link>
          </div>
        </div>
      )}
    </header>
  );
}
