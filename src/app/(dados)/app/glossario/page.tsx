"use client";

import React, { useState } from "react";
import { GLOSSARY_ITEMS } from "@/lib/assessment-fixtures";
import { Search, BookOpen, ShieldCheck } from "lucide-react";

export default function GlossarioPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredItems = GLOSSARY_ITEMS.filter((item) => {
    const matchesSearch =
      item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.definition.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.clinicalRelevance.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      <div className="pb-6 border-b border-theme-border">
        <span className="text-xs font-bold uppercase tracking-wider text-theme-text">
          Repositório Conceitual
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-theme-text mt-1">
          Glossário e Registro de Referências
        </h1>
        <p className="text-xs sm:text-sm text-theme-muted mt-0.5">
          Terminologia científica fundamentada em consensos da IASP, diretrizes clínicas e legislação brasileira (LGPD).
        </p>
      </div>

      {/* Aviso de Referências Candidatas */}
      <div className="p-4 bg-theme-secondary/70 border border-theme-border rounded-xl text-xs text-theme-text flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-theme-text shrink-0 mt-0.5" />
        <p className="text-theme-muted leading-relaxed">
          <strong>Sobre as referências:</strong> As referências científicas listadas representam literatura clássica candidata à verificação e estudo comparativo, e não garantia ou validação automática do software como dispositivo médico.
        </p>
      </div>

      {/* Controles de Busca e Filtro */}
      <div className="bg-theme-primary rounded-2xl p-5 border border-theme-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-theme-subtle absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar termo ou conceito..."
            className="w-full pl-9 pr-3 py-2 bg-theme-primary bg-theme-primary border border-theme-boundary/80 rounded-xl text-xs text-theme-text focus:outline-hidden focus:border-theme-teal focus:ring-2 focus:ring-theme-teal/25"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {["all", "Treinamento", "Metodologia", "Biomecânica", "Dor", "Legislação"].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedCategory === cat
                  ? "bg-inverse text-inverse-fg font-bold"
                  : "bg-theme-secondary text-theme-muted hover:text-theme-text"
              }`}
            >
              {cat === "all" ? "Todas as Categorias" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Termos */}
      <div className="space-y-4">
        {filteredItems.map((item) => (
          <div
            key={item.term}
            className="bg-theme-primary rounded-2xl p-6 border border-theme-border shadow-subtle space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-theme-text">{item.term}</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-theme-secondary text-theme-text px-2.5 py-0.5 rounded-full">
                {item.category}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-theme-text leading-relaxed sm:leading-5">
              {item.definition}
            </p>
            <div className="p-3 bg-theme-primary rounded-xl border border-theme-border text-xs text-theme-muted">
              <strong className="text-theme-text block mb-0.5 font-semibold">Na prática clínica:</strong>
              {item.clinicalRelevance}
            </div>
            <span className="text-[11px] text-theme-subtle block pt-1">
              <strong>Referência a conferir:</strong> {item.sourceCandidate}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
