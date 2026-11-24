import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: "Regras de uso da plataforma Método LR.",
  alternates: { canonical: "/termos" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
