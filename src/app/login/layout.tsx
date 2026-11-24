import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Entre na sua conta de professor, estudante ou aluno.",
  alternates: { canonical: "/login" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
