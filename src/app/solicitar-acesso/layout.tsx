import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Solicitar acesso",
  description: "Peça acesso à plataforma para profissionais e estudantes de Educação Física.",
  alternates: { canonical: "/solicitar-acesso" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
