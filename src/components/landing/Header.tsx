"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Menu, X } from "lucide-react";
import MethodBrand from "@/components/brand/MethodBrand";
import ThemeSelector from "@/components/appearance/ThemeSelector";

const NAV = [
  { label: "Como funciona", href: "/#percurso" },
  { label: "Mapa corporal", href: "/#mapa" },
  { label: "Treinos", href: "/#treinos" },
  { label: "Planos", href: "/planos" },
  { label: "Dúvidas", href: "/#duvidas" },
];

/** Cabeçalho preto da landing, com monograma dourado e navegação preservada. */
export default function Header() {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    drawer.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    const onResize = () => window.innerWidth >= 791 && setOpen(false);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <header className="lr-header site-header">
      <div className="lr-wrap lr-header-inner">
        <Link href="/" aria-label="Método LR — início" className="lr-brand-link">
          <MethodBrand size={51} />
        </Link>

        <nav aria-label="Principal" className="lr-nav">
          {NAV.map((n) => (
            <a key={n.href} href={n.href}>
              {n.label}
            </a>
          ))}
        </nav>

        <div className="lr-header-actions">
          <ThemeSelector compact tone="inverse" className="lr-theme" />
          <Link href="/login" className="lr-login">
            Entrar
          </Link>
          <Link href="/solicitar-acesso" className="lr-button lr-button--gold lr-button--small">
            Solicitar acesso
          </Link>
          <button
            ref={btn}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="menu-site"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            className="lr-menu-toggle"
          >
            <i aria-hidden="true" />
            <i aria-hidden="true" />
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="menu-site"
          ref={drawer}
          aria-label="Navegação móvel"
          className="lr-mobile-nav"
        >
          {NAV.map((n) => (
            <a key={n.href} href={n.href} onClick={() => setOpen(false)}>
              {n.label}
            </a>
          ))}
          <a href="/login" onClick={() => setOpen(false)}>
            Entrar na plataforma
          </a>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ThemeSelector tone="inverse" />
          </div>
          <div className="mt-4">
            <Link
              href="/solicitar-acesso"
              onClick={() => setOpen(false)}
              className="lr-button lr-button--gold w-full"
            >
              Solicitar acesso
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
