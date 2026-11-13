"use client";

import React from "react";
import Link from "next/link";
import GuidedAssessmentWorkflow from "@/components/assessment/GuidedAssessmentWorkflow";
import { InfoNote } from "@/components/ui/primitives";

// Módulo didático preservado do formato anterior (etapas 0–10, conteúdo originalmente
// voltado à Educação Física). Fica na área de estudo: não é a avaliação do aluno nem gera treino.
export default function ModuloDidaticoPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-theme-muted"><Link href="/app/conteudos" className="hover:underline">Conteúdos e referências</Link></p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-[1.75rem]">Módulo didático de raciocínio clínico</h1>
      </header>
      <InfoNote tone="caution">
        Caso de estudo do formato anterior, com instrumentos e termos de raciocínio especializado. Serve para estudo; não diagnostica, não substitui a avaliação do aluno em &ldquo;Avaliações&rdquo; e nada aqui é salvo.
      </InfoNote>
      <GuidedAssessmentWorkflow isDemo />
    </div>
  );
}
