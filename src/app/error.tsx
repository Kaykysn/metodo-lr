"use client";

// Falha inesperada ao montar uma página: mensagem em português e opção de tentar de novo.
// O detalhe técnico fica só no console do navegador, nunca na tela.
import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-theme-border bg-theme-primary p-8 text-center shadow-card">
        <h1 className="text-2xl font-bold text-theme-text">Não foi possível abrir esta página</h1>
        <p className="text-sm leading-relaxed text-theme-muted">
          Algo falhou do nosso lado. Tente de novo em instantes. Se continuar, volte ao início e entre outra vez.
        </p>
        {error.digest && <p className="text-xs text-theme-muted">Código para o suporte: {error.digest}</p>}
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={reset} className="rounded-xl bg-inverse px-5 py-2.5 text-sm font-bold text-inverse-fg transition-colors hover:bg-inverse-hover">
            Tentar de novo
          </button>
          <Link href="/" className="rounded-xl border border-theme-boundary/50 px-5 py-2.5 text-sm font-semibold text-theme-text transition-colors hover:bg-theme-secondary">
            Voltar ao início
          </Link>
        </div>
      </div>
    </main>
  );
}
