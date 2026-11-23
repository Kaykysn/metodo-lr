import React from "react";
import Link from "next/link";
import MethodBrand from "@/components/brand/MethodBrand";

/** Rodapé preto da referência, com monograma dourado e links preservados. */
export default function Footer() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return (
    <footer className="lr-foot">
      <div className="lr-wrap lr-foot-inner">
        <Link href="/" aria-label="Método LR — início" className="shrink-0">
          <MethodBrand size={44} />
        </Link>
        <p className="max-w-sm text-sm leading-relaxed text-[#c1c1c1]">
          Ferramenta de apoio ao planejamento. Não substitui avaliação individual nem julgamento profissional.
        </p>
        <nav aria-label="Plataforma" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="#demonstracao" className="lr-foot-link">Demonstração</Link>
          <Link href="/planos" className="lr-foot-link">Planos</Link>
          <Link href="/solicitar-acesso" className="lr-foot-link">Solicitar acesso</Link>
          <Link href="/login" className="lr-foot-link">Entrar</Link>
        </nav>
        <nav aria-label="Informações" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/privacidade" className="lr-foot-link">Privacidade</Link>
          <Link href="/termos" className="lr-foot-link">Termos de uso</Link>
          {email ? (
            <a href={`mailto:${email}`} className="lr-foot-link">{email}</a>
          ) : (
            <span className="lr-foot-link">Contato: em configuração</span>
          )}
        </nav>
      </div>
      <div className="lr-wrap mt-6 border-t border-[#3a3a3a] pt-5 text-sm text-[#969696]">
        © {new Date().getFullYear()} Leandro Rangel
      </div>
    </footer>
  );
}
