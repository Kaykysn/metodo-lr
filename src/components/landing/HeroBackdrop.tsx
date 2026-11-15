"use client";

import React, { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useVisualEffects } from "@/components/providers/AppearanceProvider";

/** Camada 3 do Hero: vídeo de fundo cinematográfico, com fallback estático. */
const VIDEO = "/videos/hero-background.mp4";
const VIDEO_SMALL = "/videos/hero-background-960.mp4";
const POSTER = "/media/hero-background-poster.jpg";

/**
 * HeroBackdrop — plano de fundo do Hero em três estados:
 *
 * 1. Mesh estático (sempre presente): é o primeiro quadro, o fallback se o vídeo
 *    falhar e a imagem exibida com movimento reduzido/efeitos desligados.
 * 2. Vídeo local (autoplay, mudo, em loop, playsInline): só é montado depois da
 *    primeira pintura e quando o aparelho/rede permitem (useVisualEffects), para
 *    não competir com o LCP.
 * 3. Véu de contraste: garante legibilidade dos textos sobre qualquer quadro.
 *
 * O vídeo pausa ao sair da tela e com a aba oculta; todos os listeners são
 * removidos na desmontagem.
 */
export default function HeroBackdrop() {
  const { effectsActive, videoAllowed } = useVisualEffects();

  const [mounted, setMounted] = useState(false);
  const [src, setSrc] = useState(VIDEO);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Monta o vídeo só após a primeira pintura e escolhe a variante de celular.
  useEffect(() => {
    setSrc(window.matchMedia("(max-width: 767px)").matches ? VIDEO_SMALL : VIDEO);
    const id = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  const active = mounted && videoAllowed && effectsActive && !failed;

  // Reprodução: tenta tocar, pausa fora da tela e com a aba oculta.
  useEffect(() => {
    if (!active) return;
    const video = videoRef.current;
    const wrap = wrapRef.current;
    if (!video) return;

    let inView = true;

    const play = () => {
      const p = video.play();
      if (p) p.catch(() => {
        /* Autoplay bloqueado (ex.: economia de energia): mantém o pôster. */
      });
    };

    const sync = () => {
      if (inView && !document.hidden) play();
      else video.pause();
    };

    let io: IntersectionObserver | null = null;
    if (wrap && "IntersectionObserver" in window) {
      io = new IntersectionObserver(
        ([entry]) => {
          inView = entry.isIntersecting;
          sync();
        },
        { threshold: 0.01 }
      );
      io.observe(wrap);
    }

    const onVisibility = () => sync();
    document.addEventListener("visibilitychange", onVisibility);
    play();

    return () => {
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      video.pause();
    };
  }, [active]);

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      data-decorative
      className="pointer-events-none absolute inset-0 -z-20 select-none overflow-hidden"
    >
      {/* Fallback estático: primeiro quadro e rede de segurança do vídeo. */}
      <picture className="absolute inset-0">
        <source type="image/webp" srcSet="/media/mesh-hero-960.webp 960w, /media/mesh-hero.webp 1672w" sizes="100vw" />
        <img
          src="/media/mesh-hero.jpg"
          alt=""
          fetchPriority="high"
          decoding="async"
          className="h-full w-full object-cover object-[70%_0%]"
        />
      </picture>

      {active && (
        <video
          ref={videoRef}
          className={clsx(
            "hero-video-media absolute inset-0 h-full w-full object-cover object-center",
            ready && "is-ready"
          )}
          src={src}
          poster={POSTER}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          tabIndex={-1}
          disablePictureInPicture
          onCanPlay={() => setReady(true)}
          onError={() => setFailed(true)}
        />
      )}

      {/* Véu de contraste sobre o vídeo/mesh */}
      <div className="hero-video-scrim absolute inset-0" />
    </div>
  );
}
