import { DataProvider } from "@/components/providers/DataProvider";

// Só as rotas que usam dados (app, aluno, conta, planos) carregam o repositório e o Supabase.
// A landing e as páginas de leitura ficam sem esse JavaScript.
export default function DadosLayout({ children }: { children: React.ReactNode }) {
  return <DataProvider>{children}</DataProvider>;
}
