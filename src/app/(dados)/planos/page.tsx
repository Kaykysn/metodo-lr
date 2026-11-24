import type { Metadata } from "next";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import PlanosView from "@/components/subscription/PlanosView";
import { readSupportConfig } from "@/lib/subscription/billing";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Planos",
  alternates: { canonical: "/planos" },
  description: "Três planos mensais para profissionais de Educação Física: Essencial, Evolução e Completo. Comece com 30 dias grátis.",
};

// Lido no servidor a cada requisição: o canal de suporte não vai para o cliente
// a menos que esteja configurado de verdade.
export const dynamic = "force-dynamic";

export default function PlanosPage() {
  const support = readSupportConfig(process.env);
  const contactEmail = LEGAL.contactEmail;
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <Header />
      <main id="conteudo" className="flex-1">
        <PlanosView prioritySupportReady={support.prioritySupportReady} contactEmail={contactEmail} />
      </main>
      <Footer />
    </div>
  );
}
