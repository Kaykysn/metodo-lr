import React from "react";
import Link from "next/link";
import Logo from "@/components/brand/Logo";

export default function Footer() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return (
    <footer className="border-t border-theme-border bg-theme-primary">
      <div className="mx-auto grid max-w-[1180px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div className="space-y-4 text-theme-text">
          <Logo variant="full" size={96} frame="accent" />
          <p className="max-w-sm text-sm text-theme-muted">Ferramenta de apoio ao planejamento. Não substitui avaliação individual nem julgamento profissional.</p>
        </div>
        <nav aria-label="Plataforma" className="space-y-2 text-[15px]">
          <p className="font-semibold">Plataforma</p>
          <Link href="/app" className="block text-theme-muted hover:text-theme-text">Demonstração</Link>
          <Link href="/planos" className="block text-theme-muted hover:text-theme-text">Planos</Link>
          <Link href="/solicitar-acesso" className="block text-theme-muted hover:text-theme-text">Solicitar acesso</Link>
          <Link href="/login" className="block text-theme-muted hover:text-theme-text">Entrar</Link>
        </nav>
        <nav aria-label="Informações" className="space-y-2 text-[15px]">
          <p className="font-semibold">Informações</p>
          <Link href="/privacidade" className="block text-theme-muted hover:text-theme-text">Privacidade</Link>
          <Link href="/termos" className="block text-theme-muted hover:text-theme-text">Termos de uso</Link>
          {email ? <a href={`mailto:${email}`} className="block text-theme-muted hover:text-theme-text">{email}</a> : <span className="block text-theme-muted">Contato: em configuração</span>}
        </nav>
      </div>
      <p className="mx-auto max-w-[1180px] border-t border-theme-border px-4 py-5 text-sm text-theme-muted sm:px-6 lg:px-8">© {new Date().getFullYear()} Leandro Rangel</p>
    </footer>
  );
}
