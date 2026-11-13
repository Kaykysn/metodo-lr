import React from "react";
import Link from "next/link";
import { EVIDENCE } from "@/lib/domain/evidence";
import { RULE_ENGINE_VERSION } from "@/lib/domain/suggestion-rules";

export const metadata = { title: "Bibliografia" };

export default function ReferenciasPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <header className="pb-2">
        <p className="text-sm text-theme-muted"><Link href="/app/conteudos" className="hover:underline">Conteúdos e referências</Link></p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-[1.75rem]">Bibliografia rastreável</h1>
        <p className="mt-1 text-[15px] text-theme-muted">
          Fontes usadas pelo motor de regras ({RULE_ENGINE_VERSION}) e pela biblioteca. Elas são um ponto de partida, não uma revisão completa de Pilates, tendinopatias, joelho, ombro, gestação ou pós-operatório. Nenhuma ficha recebe selo de “comprovado cientificamente”.
        </p>
      </header>
      <ol className="space-y-4">
        {EVIDENCE.map((e) => (
          <li key={e.id} className="rounded-panel border border-theme-border bg-theme-primary p-5">
            <p className="text-sm text-theme-muted">{e.type} · {e.year || "ano a confirmar"}</p>
            <h2 className="mt-0.5 font-semibold leading-snug">{e.title}</h2>
            <p className="mt-1 text-[15px]">{e.authors}</p>
            <dl className="mt-3 grid gap-x-4 gap-y-1.5 text-[15px] sm:grid-cols-[150px_1fr]">
              <dt className="text-theme-muted">População</dt><dd>{e.population}</dd>
              <dt className="text-theme-muted">Intervenção</dt><dd>{e.intervention}</dd>
              <dt className="text-theme-muted">Comparador</dt><dd>{e.comparator}</dd>
              <dt className="text-theme-muted">Desfecho</dt><dd>{e.outcome}</dd>
              <dt className="text-theme-muted">Limitações</dt><dd>{e.limitations}</dd>
              {e.doi && (<><dt className="text-theme-muted">DOI</dt><dd className="break-all">{e.doi}</dd></>)}
              <dt className="text-theme-muted">Link</dt><dd><a className="break-all text-theme-teal underline" href={e.url} target="_blank" rel="noreferrer">{e.url}</a></dd>
              <dt className="text-theme-muted">Verificação</dt>
              <dd className={e.verifiedOn ? "" : "font-semibold text-status-caution-fg"}>
                {e.verifiedOn ? `Conferida em ${e.verifiedOn.split("-").reverse().join("/")}. ` : "Não verificada. "}
                {e.verificationNote}
              </dd>
            </dl>
          </li>
        ))}
      </ol>
    </div>
  );
}
