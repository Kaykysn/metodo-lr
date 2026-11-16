"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Menu, X } from "lucide-react";
import Logo from "@/components/brand/Logo";
import ThemeSelector from "@/components/appearance/ThemeSelector";

const NAV = [
  { label: "Como funciona", href: "/#percurso" },
  { label: "Mapa corporal", href: "/#mapa" },
  { label: "Treinos", href: "/#treinos" },
  { label: "Planos", href: "/planos" },
  { label: "Dúvidas", href: "/#duvidas" },
];

/**
 * Header da landing.
 *
 * Enquanto está sobre o Hero, usa a variante escura/translúcida nos dois temas
 * (o Hero é uma ilha escura). Ao ultrapassar o Hero, volta ao estilo do tema
 * atual com transição de 250 ms. A troca é feita por IntersectionObserver —
 * sem listener de scroll.
 */
export default function Header() {
  const [open, setOpen] = useState(false);
  const [overHero, setOverHero] = useState(true);
  const btn = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = document.getElementById("demonstracao");
    if (!hero || typeof IntersectionObserver === "undefined") {
      setOverHero(false);
      return;
    }
    // O topo da raiz é recuado pela altura do header: quando o Hero termina
    // (sai da área abaixo do header), o observador dispara e o header troca.
    // rootMargin exige unidade absoluta — usamos px, lidos do header real.
    const headerH = document.querySelector("header")?.offsetHeight || 64;
    const io = new IntersectionObserver(
      ([entry]) => setOverHero(entry.isIntersecting),
      { rootMargin: `-${headerH}px 0px 0px 0px`, threshold: 0 }
    );
    io.observe(hero);
    return () => io.disconnect();
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
    <header
      data-over-hero={overHero}
      className={clsx(
        "site-header sticky top-0 z-50",
        overHero ? "site-header-over-hero" : "glass-strong"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="Leandro Rangel — início"
          className={clsx("site-header-logo", overHero ? "text-white" : "text-theme-text")}
        >
          <span className="sm:hidden">
            <Logo variant="symbol" size={36} frame={overHero ? "current" : "accent"} />
          </span>
          <span className="hidden sm:inline">
            <Logo variant="horizontal" size={36} frame={overHero ? "current" : "accent"} />
          </span>
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-0.5 xl:flex">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className={clsx(
                "site-header-link whitespace-nowrap rounded-control px-2.5 py-2 text-[15px] font-medium transition-colors",
                overHero
                  ? "text-white/85 hover:bg-white/10 hover:text-white"
                  : "text-theme-muted hover:text-theme-text"
              )}
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 xl:flex">
          <div className="flex items-center gap-1 rounded-control border border-white/15 bg-white/5 p-0.5">
            <ThemeSelector compact tone={overHero ? "inverse" : "surface"} />
          </div>
          <Link
            href="/login"
            className={clsx(
              "inline-flex min-h-[44px] items-center whitespace-nowrap rounded-control px-3 text-[15px] font-semibold transition-colors",
              overHero ? "text-white/90 hover:bg-white/10 hover:text-white" : "text-theme-text hover:bg-theme-secondary"
            )}
          >
            Entrar
          </Link>
          <Link
            href="/solicitar-acesso"
            className={clsx(
              "site-header-cta inline-flex min-h-[44px] items-center whitespace-nowrap rounded-control border px-4 text-[15px] font-semibold transition-colors",
              overHero
                ? "border-[rgb(var(--hero-jade)/0.55)] bg-[rgb(var(--hero-jade)/0.12)] text-[rgb(var(--hero-text))] hover:bg-[rgb(var(--hero-jade)/0.2)]"
                : "border-theme-border bg-transparent text-theme-text hover:bg-theme-secondary"
            )}
          >
            Solicitar acesso
          </Link>
        </div>

        <button
          ref={btn}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="menu-site"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          className={clsx(
            "inline-flex h-11 w-11 items-center justify-center rounded-control border xl:hidden",
            overHero
              ? "border-white/20 text-white hover:bg-white/10"
              : "border-theme-border text-theme-text"
          )}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div
          id="menu-site"
          ref={drawer}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-theme-border bg-theme-primary px-4 pb-6 pt-2 motion-safe:animate-drawerIn xl:hidden"
        >
          <nav aria-label="Principal (menu)" className="flex flex-col">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="flex min-h-[48px] items-center border-b border-theme-border text-base font-medium"
              >
                {n.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ThemeSelector />
          </div>
          <div className="mt-4 grid gap-2">
            <Link
              href="/solicitar-acesso"
              className="inline-flex min-h-[48px] items-center justify-center rounded-control border border-theme-teal bg-transparent font-semibold text-theme-text"
            >
              Solicitar acesso
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-[48px] items-center justify-center rounded-control border border-theme-boundary/60 font-semibold"
            >
              Entrar
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
