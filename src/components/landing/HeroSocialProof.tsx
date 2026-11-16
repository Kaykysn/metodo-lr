import React from "react";
import { BadgeCheck } from "lucide-react";
import { HERO_SOCIAL_PROOF } from "@/lib/landing-content";

/**
 * Prova de confiança do Hero.
 *
 * Só renderiza quando `HERO_SOCIAL_PROOF` tem itens reais. Sem dados, devolve
 * `null` (nenhuma linha vazia, nenhum número inventado).
 */
export default function HeroSocialProof() {
  const items = HERO_SOCIAL_PROOF.filter((item) => item.label.trim().length > 0);
  if (items.length === 0) return null;

  return (
    <ul className="hero-social-proof mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <BadgeCheck className="h-4 w-4 text-[rgb(var(--hero-jade))]" aria-hidden="true" />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
