import { redirect } from "next/navigation";

// A demonstração agora é o próprio app em modo demonstração (dados fictícios no navegador,
// com aviso e reset explícitos). Rota preservada por compatibilidade.
export default function DemoPage() {
  redirect("/app");
}
