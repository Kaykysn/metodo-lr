"use client";

import React, { useEffect, useRef, useState } from "react";
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
  /** Camada que está saindo (troca do acordeão): fecha a lente e para de ouvir o ponteiro. */
  inactive?: boolean;
  onLoad?: () => void;
  onPhotoReady?: () => void;
};

/** Raio da lente no mouse, em px (banco: ~125 px). */
const LENS_RADIUS = 125;
/** Suavização da janela guiada pela rolagem no toque (equivale a um scrub curto). */
const SCROLL_LERP = 0.14;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Fotografia editorial em preto e branco que revela a cor, como o raio-X do mapa.
 * Quatro planos dividem o mesmo contêiner de zoom, recorte, object-fit e
 * object-position:
 *
 *   1. base em preto e branco (imagem de conteúdo, com alt);
 *   2. trama de pontos, mesclada por luminosidade;
 *   3. vidro canelado P&B: a versão refratada da cena, numa faixa da foto;
 *   4. janela: a foto em cor, limpa, mascarada por um círculo (~125 px), acima
 *      do vidro — dentro da lente a cena aparece inteira em cor.
 *
 * Mouse: a janela acompanha o ponteiro; enquanto ele está sobre a foto, um único
 * requestAnimationFrame recalcula a posição em relação ao retângulo atual da camada
 * ampliada, então a lente continua sob o cursor durante o zoom e a rolagem.
 * Toque: a janela atravessa a imagem conforme a rolagem, sem capturar o gesto.
 * Movimento reduzido: só a foto limpa em cor, sem zoom, trama, vidro ou lente
 * (sem lente, a base P&B esconderia a cor de vez).
 * As camadas decorativas só entram depois que a foto base carregou.
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
  const zoom = useRef<HTMLDivElement>(null);
  const { effectsActive, prefersReducedMotion } = useVisualEffects();
  const [baseReady, setBaseReady] = useState(false);
  const layered = !prefersReducedMotion;

  // A foto pode ter carregado antes da hidratação (cache): confere no próprio elemento.
  useEffect(() => {
    const img = root.current?.querySelector<HTMLImageElement>("img.lr-media-base");
    if (img?.complete && img.naturalWidth > 0) {
      setBaseReady(true);
      onPhotoReady?.();
    }
    // Só a troca de cena importa aqui; onPhotoReady muda a cada render do pai.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.id]);

  // Zoom contínuo pausa fora da tela.
  // Estados imperativos (data-fora, data-ativa) ficam em atributos, não em classes:
  // o React reescreve `className` quando a foto carrega e apagaria uma classe
  // adicionada à mão, deixando a janela da rolagem invisível até a foto sair da tela.
  useEffect(() => {
    const node = root.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => node.toggleAttribute("data-fora", !entry.isIntersecting));
    io.observe(node);
    return () => io.disconnect();
  }, []);

  // Lente no mouse.
  useEffect(() => {
    const node = root.current;
    const layer = zoom.current;
    if (!node || !layer || !layered || inactive) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");

    let frame = 0;
    let pointer: { x: number; y: number } | null = null;

    const draw = () => {
      frame = 0;
      if (!pointer) return;
      const rect = layer.getBoundingClientRect();
      if (rect.width && rect.height) {
        node.style.setProperty("--mx", `${(((pointer.x - rect.left) / rect.width) * 100).toFixed(2)}%`);
        node.style.setProperty("--my", `${(((pointer.y - rect.top) / rect.height) * 100).toFixed(2)}%`);
      }
      // Enquanto o ponteiro está sobre a foto, o mesmo quadro acompanha o zoom.
      frame = window.requestAnimationFrame(draw);
    };
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === "touch" || !fine.matches) return;
      pointer = { x: event.clientX, y: event.clientY };
      node.toggleAttribute("data-ativa", true);
      if (!frame) frame = window.requestAnimationFrame(draw);
    };
    const close = () => {
      pointer = null;
      node.removeAttribute("data-ativa");
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    };
    const onVisibility = () => {
      if (document.hidden) close();
    };

    node.addEventListener("pointerenter", onPointer);
    node.addEventListener("pointermove", onPointer);
    node.addEventListener("pointerleave", close);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      node.removeEventListener("pointerenter", onPointer);
      node.removeEventListener("pointermove", onPointer);
      node.removeEventListener("pointerleave", close);
      document.removeEventListener("visibilitychange", onVisibility);
      close();
    };
  }, [layered, inactive]);

  // Toque: a rolagem conduz a janela pela foto (da esquerda para a direita).
  useEffect(() => {
    const node = root.current;
    if (!node || !layered || inactive || !effectsActive) return;
    if (!window.matchMedia("(hover: none)").matches) return;

    let frame = 0;
    let visible = false;
    const pos = { x: 0.15, y: 0.56, init: false };

    const target = () => {
      const rect = node.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const p = clamp01((vh - rect.top) / (vh + rect.height));
      return { x: 0.12 + p * 0.78, y: 0.58 - p * 0.14 };
    };
    const write = () => {
      node.style.setProperty("--mx", `${(pos.x * 100).toFixed(2)}%`);
      node.style.setProperty("--my", `${(pos.y * 100).toFixed(2)}%`);
    };
    const tick = () => {
      frame = 0;
      const t = target();
      if (!pos.init) {
        pos.x = t.x;
        pos.y = t.y;
        pos.init = true;
      } else {
        pos.x += (t.x - pos.x) * SCROLL_LERP;
        pos.y += (t.y - pos.y) * SCROLL_LERP;
      }
      write();
      if (visible && (Math.abs(t.x - pos.x) > 0.001 || Math.abs(t.y - pos.y) > 0.001)) {
        frame = window.requestAnimationFrame(tick);
      }
    };
    const schedule = () => {
      if (visible && !frame) frame = window.requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      node.toggleAttribute("data-ativa", visible);
      schedule();
    });
    io.observe(node);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
      node.removeAttribute("data-ativa");
    };
  }, [layered, inactive, effectsActive]);

  const layerClass = clsx("lr-media-layer", imageClassName);
  const decorLoading = priority ? "eager" : "lazy";

  return (
    <div
      ref={root}
      data-scene-key={scene.id}
      className={clsx(
        "lr-dither",
        `lr-dither--${variant}`,
        fill && "lr-dither--fill",
        layered && baseReady && "is-decorada",
        !effectsActive && "is-estatica",
        className
      )}
      style={{ "--lens-r": `${LENS_RADIUS}px`, "--scene-foco": scene.foco } as React.CSSProperties}
    >
      <div ref={zoom} className="lr-media-zoom">
        <Image
          src={layered ? scene.pb : scene.foto}
          alt={scene.alt}
          fill
          sizes={sizes}
          priority={priority}
          quality={90}
          onLoad={() => {
            setBaseReady(true);
            onLoad?.();
            onPhotoReady?.();
          }}
          className={clsx("lr-media-base", layerClass)}
        />
        {layered && baseReady && (
          <>
            <Image
              src={scene.pontos}
              alt=""
              fill
              sizes={sizes}
              quality={90}
              loading={decorLoading}
              aria-hidden="true"
              data-decorative
              className={clsx("lr-media-pontos", layerClass)}
            />
            <Image
              src={scene.vidroPb}
              alt=""
              fill
              sizes={sizes}
              quality={90}
              loading={decorLoading}
              aria-hidden="true"
              data-decorative
              className={clsx("lr-media-vidro", layerClass)}
            />
            <div className="lr-media-janela" aria-hidden="true" data-decorative>
              <Image
                src={scene.foto}
                alt=""
                fill
                sizes={sizes}
                quality={90}
                loading={decorLoading}
                aria-hidden="true"
                className={clsx("lr-media-clean", layerClass)}
              />
            </div>
          </>
        )}
      </div>
      {layered && baseReady && <span className="lr-media-brilho" aria-hidden="true" data-decorative />}
    </div>
  );
}
