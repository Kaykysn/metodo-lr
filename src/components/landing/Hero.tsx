"use client";

import React from "react";
import Link from "next/link";
import { Play, ShieldCheck } from "lucide-react";
import DitherReveal from "@/components/effects/DitherReveal";
import { EDITORIAL_SCENES } from "@/lib/landing/editorial-media";
import HeroSocialProof from "./HeroSocialProof";

/** Benefícios verificáveis, mantidos do conteúdo original da landing. */
const BENEFITS = [
  "Avaliação física individualizada",
  "Identificação anatômica",
  "Planejamento de treinamento",
  "Acompanhamento da evolução",
];

/**
 * Abertura panorâmica (composição do Averio): a atleta à direita, com rosto e
 * linha do ombro livres; o título à esquerda, perto da base da imagem. A faixa de
 * vidro canelado da própria foto marca a passagem entre o texto e a fotografia.
 * Abaixo de 768 px a foto fica acima do texto, sem recortar rosto e ombro.
 */
export default function Hero() {
  return (
    <section id="inicio" aria-labelledby="hero-titulo" data-theme="dark" className="lr-hero">
      <div className="lr-hero-art">
        <DitherReveal
          scene={EDITORIAL_SCENES.hero}
          variant="hero"
          sizes="(max-width: 1100px) 100vw, 86vw"
          priority
          fill
        />
      </div>

      <div className="lr-wrap lr-hero-inner">
        <div className="lr-hero-copy">
          <p className="lr-eyebrow lr-hero-kicker">
            <span className="lr-slashes" aria-hidden="true" />
            Biomecânica aplicada
          </p>
          <h1 id="hero-titulo" className="lr-hero-title">
            <span>Da avaliação</span>
            <span>ao treino.</span>
          </h1>
          <p className="lr-hero-description">
            Avalie o movimento, publique o treino e acompanhe o que cada aluno fez.
          </p>
          <ul className="lr-hero-benefits">
            {BENEFITS.map((benefit) => (
              <li key={benefit}>
                <span aria-hidden="true" />
                {benefit}
              </li>
            ))}
          </ul>
          <div className="lr-hero-actions">
            <Link href="/solicitar-acesso" className="lr-button lr-button--gold">
              Solicitar acesso
            </Link>
            <a href="#demonstracao" className="lr-button lr-button--ghost">
              <Play className="h-4 w-4" strokeWidth={2.3} aria-hidden="true" />
              Ver demonstração
            </a>
          </div>
          <a href="#percurso" className="lr-text-link hero-method-link" style={{ color: "var(--lr-gold)" }}>
            Conhecer o método
          </a>
          <p className="lr-hero-note">
            <ShieldCheck className="mt-[2px] h-4 w-4 shrink-0" strokeWidth={1.6} aria-hidden="true" />
            <span>
              Para profissionais e estudantes de Educação Física. Acesso após aprovação; os 30 dias
              começam no primeiro acesso.
            </span>
          </p>
          <HeroSocialProof />
        </div>
      </div>
    </section>
  );
}
