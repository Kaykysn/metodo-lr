"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useData } from "./DataProvider";
import { ButtonLink, EmptyState, ErrorNote, Loading } from "@/components/ui/primitives";

const BLOCKED: Record<string, { title: string; text: string; href: string; cta: string }> = {
  pending: { title: "Seu acesso ainda está em análise", text: "A equipe avisa quando o pedido for aprovado. Os 30 dias só começam no primeiro acesso depois disso.", href: "/aguardando-aprovacao", cta: "Ver situação do pedido" },
  paused: { title: "Seu acesso está pausado", text: "O tempo restante ficou congelado. Fale com a equipe para retomar.", href: "/conta/acesso", cta: "Ver detalhes do acesso" },
  expired: { title: "Seu período de teste terminou", text: "Seus dados continuam guardados e nada foi apagado. Na página de plano e acesso você vê as datas e os planos; a contratação ainda não está aberta.", href: "/conta/acesso", cta: "Ver plano e acesso" },
  revoked: { title: "Acesso encerrado", text: "Este acesso foi encerrado pela administração. Fale com a equipe se achar que é um engano.", href: "/conta/acesso", cta: "Ver detalhes" },
  unknown_role: { title: "Perfil sem papel reconhecido", text: "Seu cadastro tem um papel que esta versão não reconhece, então o acesso fica bloqueado por segurança. Fale com a equipe para revisar o perfil.", href: "/conta/acesso", cta: "Ver detalhes" },
  no_profile: { title: "Perfil não encontrado", text: "Sua conta existe, mas o perfil ainda não foi criado. Tente sair e entrar de novo; se continuar, fale com a equipe.", href: "/login", cta: "Voltar ao login" },
};

/** Na demonstração deixa passar; com Supabase exige sessão ativa. */
export default function SessionGate({ children }: { children: React.ReactNode }) {
  const { mode, session, signOut } = useData();
  const router = useRouter();

  useEffect(() => {
    if (mode === "supabase" && session.status === "signed_out") router.replace("/login");
  }, [mode, session.status, router]);

  if (mode === "demo" || session.status === "active") return <>{children}</>;
  if (session.status === "loading" || session.status === "signed_out") return <Loading label="Verificando sua sessão…" />;
  if (session.status === "error") return <ErrorNote>Não foi possível verificar sua sessão: {session.message}</ErrorNote>;

  const b = BLOCKED[session.reason];
  return (
    <EmptyState
      title={b.title}
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <ButtonLink href={b.href}>{b.cta}</ButtonLink>
          <button type="button" onClick={signOut} className="min-h-[44px] rounded-control px-4 text-sm font-semibold hover:bg-theme-secondary">
            Sair
          </button>
        </div>
      }
    >
      {b.text}
    </EmptyState>
  );
}
