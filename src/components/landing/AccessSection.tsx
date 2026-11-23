import React from "react";
import Link from "next/link";

const STEPS = [
  { t: "Solicite", d: "Informe sua formação ou atuação em Educação Física." },
  { t: "Aguarde a análise", d: "Cada pedido é avaliado individualmente pela equipe." },
  { t: "Use por 30 dias", d: "A contagem começa no primeiro acesso depois da aprovação." },
  { t: "Seus dados ficam", d: "Ao fim do período, nada é apagado. Depois, você escolhe um dos planos." },
];

/** CTA final dourado: mesmo conteúdo e destinos da aplicação original. */
export default function AccessSection() {
  return (
    <section className="lr-access" aria-labelledby="acesso-title">
      <div className="lr-wrap lr-access-inner">
        <div>
          <p className="lr-eyebrow"><span className="lr-rule" aria-hidden="true" /> Acesso individual</p>
          <h2 id="acesso-title" className="lr-display">Comece com<br /><em>seu próximo aluno.</em></h2>
        </div>
        <div>
          <p>Acesso individual, com aprovação.</p>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2">
            {STEPS.map((s, i) => (
              <li key={s.t} className="border-t border-[rgba(17,17,17,.35)] pt-3">
                <span className="tabular text-sm font-semibold">0{i + 1}</span>
                <p className="mt-1 text-lg font-semibold">{s.t}</p>
                <p className="mt-1 text-[15px] leading-relaxed">{s.d}</p>
              </li>
            ))}
          </ol>
          <div className="mt-9 flex min-w-0 flex-col flex-wrap gap-3 sm:flex-row">
            <Link href="/solicitar-acesso" className="lr-button lr-button--dark min-w-0">Solicitar acesso</Link>
            <Link href="/#demonstracao" className="lr-button lr-button--ghost min-w-0">Ver demonstração</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
