import React from "react";
import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import { EvolucaoSection, MapaSection, MateriaisSection, Percurso, TreinoSection } from "@/components/landing/LandingSections";
import Faq from "@/components/landing/Faq";
import PlansSummary from "@/components/landing/PlansSummary";
import AccessSection from "@/components/landing/AccessSection";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <Percurso />
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


