import DitherReveal from "@/components/effects/DitherReveal";
import { EDITORIAL_SCENES } from "@/lib/landing/editorial-media";

/**
 * Quarta cena editorial: o profissional registra o que vê enquanto o aluno eleva os
 * braços. Dá contexto à revisão de uma nova versão do treino e é distinta da cena
 * de avaliação do acordeão.
 */
export default function ReavaliacaoPhoto() {
  return (
    <div className="lr-fluted min-w-0">
      <figure className="lr-photo-card lr-reavaliacao-photo">
        <DitherReveal
          scene={EDITORIAL_SCENES.reavaliacao}
          sizes="(min-width: 1024px) 680px, (min-width: 768px) 56vw, 100vw"
          fill
        />
      </figure>
    </div>
  );
}
