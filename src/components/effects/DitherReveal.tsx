"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import clsx from "clsx";
import { useVisualEffects } from "@/components/providers/AppearanceProvider";
import type { EditorialScene } from "@/lib/landing/editorial-media";

type Props = {
  scene: EditorialScene;
  sizes: string;
  priority?: boolean;
  fill?: boolean;
  className?: string;
  imageClassName?: string;
  variant?: "hero" | "card";
  /** Camadas que estão saindo devem voltar ao P&B imediatamente. */
  inactive?: boolean;
  onLoad?: () => void;
  onPhotoReady?: () => void;
};

const LENS_RADIUS = 125; // px — dentro da faixa 100–140 px pedida.
const REFRACTION_SLICES = [0, 1, 2, 3, 4];

/**
 * Par P&B ↔ cor com lente que segue o ponteiro.
 *
 * As duas fotos vêm do mesmo par e usam exatamente a mesma caixa, object-fit,
 * object-position e transform. Em repouso só a base P&B aparece; a cor entra
 * dentro de uma máscara radial suave e volta ao P&B quando o ponteiro sai.
 * No toque/teclado o botão "Ver em cor" oferece a revelação manual com
 * aria-pressed. Trocar de cena sempre restaura o estado P&B.
 */
export default function DitherReveal({
  scene,
  sizes,
  priority = false,
  fill = false,
  className,
  imageClassName,
  variant = "card",
  inactive = false,
  onLoad,
  onPhotoReady,
}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const { effectsActive, prefersReducedMotion } = useVisualEffects();
  const [fullColor, setFullColor] = useState(false);
  const lensAvailable = effectsActive && !prefersReducedMotion;

  const reset = useCallback(() => {
    const node = root.current;
    if (!node) return;
    node.classList.remove("is-ativa", "is-approx");
    node.style.setProperty("--mx", "-300px");
    node.style.setProperty("--my", "-300px");
  }, []);

  // Troca de cena: volta ao P&B antes de pintar o novo par.
  useEffect(() => {
    setFullColor(false);
    reset();
  }, [scene.id, reset]);

  useEffect(() => {
    if (!inactive) return;
    setFullColor(false);
    reset();
  }, [inactive, reset]);

  useEffect(() => {
    if (!lensAvailable || fullColor || inactive) return;
    const node = root.current;
    if (!node) return;
    const photo = node.querySelector<HTMLElement>(".lr-media-zoom");
    if (!photo) return;

    let frame = 0;
    let pointer: { x: number; y: number } | null = null;

    const draw = () => {
      frame = 0;
      if (!pointer) return;
      const rect = photo.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      node.style.setProperty("--mx", `${((pointer.x - rect.left) / rect.width) * 100}%`);
      node.style.setProperty("--my", `${((pointer.y - rect.top) / rect.height) * 100}%`);
    };
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === "touch" || document.hidden) return;
      if ((event.target as Element | null)?.closest("button")) return onLeave();
      pointer = { x: event.clientX, y: event.clientY };
      node.classList.add("is-ativa", "is-approx");
      if (!frame) frame = window.requestAnimationFrame(draw);
    };
    const onLeave = () => {
      pointer = null;
      node.classList.remove("is-ativa", "is-approx");
      node.style.setProperty("--mx", "-300px");
      node.style.setProperty("--my", "-300px");
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    };
    const onVisibility = () => {
      if (document.hidden) onLeave();
    };

    node.addEventListener("pointermove", onPointer);
    node.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      node.removeEventListener("pointermove", onPointer);
      node.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      if (frame) window.cancelAnimationFrame(frame);
      onLeave();
    };
  }, [lensAvailable, fullColor, inactive]);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    node.classList.toggle("is-full", fullColor);
    node.classList.toggle("is-approx", fullColor);
    if (fullColor) {
      node.classList.remove("is-ativa");
      node.style.setProperty("--mx", "-300px");
      node.style.setProperty("--my", "-300px");
    }
  }, [fullColor]);

  const layerClass = clsx("lr-media-layer", imageClassName);
  const layerStyle = {
    "--scene-foco": scene.foco,
    "--scene-foto": `url("${scene.foto}")`,
    "--scene-pb": `url("${scene.pb}")`,
  } as React.CSSProperties;
  const decorativeLoading = priority ? "eager" : "lazy";
  const toggleLabel = fullColor ? "Voltar ao P&B" : "Ver em cor";

  return (
    <div
      ref={root}
      data-scene-key={scene.id}
      data-click-pulse
      className={clsx(
        "lr-dither",
        `lr-dither--${variant}`,
        fill && "lr-dither--fill",
        className
      )}
      style={{ "--lens-r": `${LENS_RADIUS}px` } as React.CSSProperties}
    >
      <div className="lr-media-zoom" style={layerStyle}>
        <Image
          src={scene.pb}
          alt={scene.alt}
          fill
          sizes={sizes}
          priority={priority}
          onLoad={() => {
            onLoad?.();
            onPhotoReady?.();
          }}
          className={clsx("lr-media-base", layerClass)}
        />
        <Image
          src={scene.dither}
          alt=""
          fill
          sizes={sizes}
          loading={decorativeLoading}
          aria-hidden="true"
          data-decorative
          className={clsx("lr-media-dither", layerClass)}
        />
        <div className="lr-media-refraction" aria-hidden="true" data-decorative>
          {REFRACTION_SLICES.map((slice) => <span key={slice} />)}
        </div>
        <div className="lr-media-janela" aria-hidden="true" data-decorative>
          <Image
            src={scene.foto}
            alt=""
            fill
            sizes={sizes}
            loading={decorativeLoading}
            aria-hidden="true"
            data-decorative
            className={clsx("lr-media-clean", layerClass)}
          />
          <div className="lr-media-refraction">
            {REFRACTION_SLICES.map((slice) => <span key={slice} />)}
          </div>
        </div>
      </div>
      <button
        type="button"
        className="lr-color-toggle"
        aria-pressed={fullColor}
        onClick={() => setFullColor((v) => !v)}
      >
        {toggleLabel}
      </button>
    </div>
  );
}
