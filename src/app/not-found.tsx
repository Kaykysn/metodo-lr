import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Página não encontrada", robots: { index: false } };

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-theme-border bg-theme-primary p-8 text-center shadow-card">
        <p className="text-xs font-bold uppercase tracking-widest text-theme-muted">Erro 404</p>
        <h1 className="text-2xl font-bold text-theme-text">Página não encontrada</h1>
        <p className="text-sm leading-relaxed text-theme-muted">
          O endereço pode ter mudado ou o link está incompleto. Confira o endereço ou volte ao início.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className="rounded-xl bg-inverse px-5 py-2.5 text-sm font-bold text-inverse-fg transition-colors hover:bg-inverse-hover">
            Voltar ao início
          </Link>
          <Link href="/login" className="rounded-xl border border-theme-boundary/50 px-5 py-2.5 text-sm font-semibold text-theme-text transition-colors hover:bg-theme-secondary">
            Entrar
          </Link>
        </div>
      </div>
    </main>
  );
}
