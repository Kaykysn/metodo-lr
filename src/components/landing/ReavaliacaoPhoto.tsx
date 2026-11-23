import DitherReveal from "@/components/effects/DitherReveal";
import { EDITORIAL_SCENES } from "@/lib/landing/editorial-media";

/**
 * Quarta cena editorial: reavaliação com nova versão do treino.
 * Usa o mesmo componente compartilhado de fotografia e o mapa único do manifesto.
 */
export default function ReavaliacaoPhoto() {
  return (
    <div className="lr-fluted min-w-0">
      <figure className="lr-reavaliacao-photo">
        <div className="relative aspect-[3/2] min-w-0 overflow-hidden bg-[#1b1b1b]">
          <DitherReveal
            scene={EDITORIAL_SCENES.reavaliacao}
            sizes="(min-width: 1024px) 620px, (min-width: 768px) 50vw, 100vw"
            fill
          />
        </div>
      </figure>
    </div>
  );
}
