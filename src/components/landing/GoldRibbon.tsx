import React from "react";

/** Faixa dourada da referência: conecta os recursos reais da plataforma. */
export default function GoldRibbon() {
  const items = [
    { href: "#percurso", label: "Avaliação física" },
    { href: "#mapa", label: "Mapa corporal" },
    { href: "#treinos", label: "Prescrição de treino" },
    { href: "#evolucao", label: "Acompanhamento" },
  ];
  return (
    <nav aria-label="Explorar recursos da plataforma" className="lr-ribbon">
      <div className="lr-wrap lr-ribbon-inner">
        {items.map((item, i) => (
          <React.Fragment key={item.href}>
            <a href={item.href}>{item.label}</a>
            {i < items.length - 1 && (
              <svg aria-hidden="true" viewBox="0 0 32 32" focusable="false">
                <path d="M14 0h4v11l8-8 3 3-8 8h11v4H21l8 8-3 3-8-8v11h-4V21l-8 8-3-3 8-8H0v-4h11L3 6l3-3 8 8z" />
              </svg>
            )}
          </React.Fragment>
        ))}
      </div>
    </nav>
  );
}
