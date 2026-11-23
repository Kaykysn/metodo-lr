import React from "react";
import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import {
  EvolucaoSection,
  MapaSection,
  MateriaisSection,
  Percurso,
  ReavaliacaoSection,
  TreinoSection,
} from "@/components/landing/LandingSections";
import Faq from "@/components/landing/Faq";
import PlansSummary from "@/components/landing/PlansSummary";
import AccessSection from "@/components/landing/AccessSection";
import Footer from "@/components/landing/Footer";
import GoldRibbon from "@/components/landing/GoldRibbon";
import ProductPreview from "@/components/landing/ProductPreview";
import { buildDemoCase } from "@/lib/landing/demo-case";

export default function LandingPage() {
  // Caso fictício montado no servidor; a landing não depende de cadastro nem de sessão.
  const demo = buildDemoCase();

  return (
    <div className="lr-landing flex min-h-screen flex-1 flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <GoldRibbon />
        <section id="demonstracao" className="lr-section lr-light scroll-mt-20" aria-labelledby="demo-landing-titulo">
          <div className="lr-wrap">
            <p className="lr-eyebrow"><span className="lr-rule" aria-hidden="true" /> Na prática</p>
            <h2 id="demo-landing-titulo" className="lr-display lr-display-lg">A plataforma<br /><em>em ação.</em></h2>
            <p className="lr-section-copy mt-6">
              Um caso fictício com avaliação, versão de treino aprovada e o que o aluno registrou.
              Sem cadastro e sem dados reais.
            </p>
            <div className="mt-8">
              <ProductPreview demo={demo} />
            </div>
          </div>
        </section>
        <Percurso />
        <ReavaliacaoSection />
        <MapaSection />
        <TreinoSection />
        <EvolucaoSection />
        <MateriaisSection />
        <PlansSummary />
        <Faq />
        <AccessSection />
      </main>
      <Footer />
    </div>
  );
}
