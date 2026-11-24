import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Como o Método LR trata os dados de profissionais, estudantes e alunos.",
  alternates: { canonical: "/privacidade" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
