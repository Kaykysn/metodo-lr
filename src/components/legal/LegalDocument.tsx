// Estrutura comum da Política de Privacidade e dos Termos de Uso: título, vigência, resumo,
// sumário com âncoras e seções numeradas, com texto em tamanho de leitura.
import React from "react";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { LEGAL } from "@/lib/legal";

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

export function ContactEmail() {
  return LEGAL.contactEmail ? (
    <a href={`mailto:${LEGAL.contactEmail}`} className="font-semibold text-theme-text underline underline-offset-2">
      {LEGAL.contactEmail}
    </a>
  ) : (
    <strong className="text-theme-text">o e-mail de contato indicado no rodapé do site</strong>
  );
}

export default function LegalDocument({
  eyebrow,
  title,
  summary,
  sections,
}: {
  eyebrow: string;
  title: string;
  summary: React.ReactNode;
  sections: LegalSection[];
}) {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <Header />

      <main className="mx-auto w-full max-w-container flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <article className="mx-auto max-w-3xl space-y-8">
          <header>
            <span className="text-xs font-bold uppercase tracking-wider text-theme-muted">{eyebrow}</span>
            <h1 className="mt-1 text-3xl font-extrabold text-theme-text">{title}</h1>
            <p className="mt-2 text-sm text-theme-muted">
              {LEGAL.platform} · Vigente desde {LEGAL.effectiveDate}
            </p>
          </header>

          <section aria-label="Resumo" className="rounded-2xl border border-theme-border bg-theme-secondary/70 p-6 text-[15px] leading-7 text-theme-text">
            {summary}
          </section>

          <nav aria-label="Sumário" className="rounded-2xl border border-theme-border bg-theme-primary p-6">
            <p className="mb-3 text-sm font-bold text-theme-text">Nesta página</p>
            <ol className="grid gap-1.5 text-sm sm:grid-cols-2">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-theme-muted underline-offset-2 hover:text-theme-text hover:underline">
                    {i + 1}. {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="space-y-8 rounded-2xl border border-theme-border bg-theme-primary p-6 shadow-card sm:p-8">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-24 space-y-3 text-[15px] leading-7 text-theme-text [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
                <h2 className="text-lg font-bold text-theme-text">
                  {i + 1}. {s.title}
                </h2>
                {s.body}
              </section>
            ))}
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
