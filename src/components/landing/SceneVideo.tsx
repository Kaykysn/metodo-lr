"use client";

import React, { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

const POSTER_JPG = "/media/hero-poster.jpg";
const POSTER_WEBP = "/media/hero-poster-640.webp 640w, /media/hero-poster-1280.webp 1280w";
const VIDEO = "/media/hero-studio.mp4"; // 1280×720, ~240 KB
const VIDEO_SMALL = "/media/hero-studio-960.mp4"; // 960×540, ~80 KB

/**
 * Cena do estúdio na seção "Como funciona". Começa no pôster; o vídeo só é baixado quando a
 * pessoa pede ("Reproduzir cena"), então não pesa na abertura nem toca sozinho. Pausa ao sair da tela.
 * A moldura usa as cores das bordas do pôster (azul-noite à esquerda, cinza do estúdio à direita).
 */
export default function SceneVideo() {
  const figure = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [src, setSrc] = useState(VIDEO);

  useEffect(() => {
    setSrc(window.matchMedia("(max-width: 767px)").matches ? VIDEO_SMALL : VIDEO);
  }, []);

  useEffect(() => {
    if (active) video.current?.play().catch(() => setPlaying(false));
  }, [active]);

  useEffect(() => {
    const el = figure.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) video.current?.pause();
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const toggle = () => {
    if (!active) {
      setActive(true);
      return;
    }
    const v = video.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => setPlaying(false));
    else v.pause();
  };

  return (
    <figure ref={figure} className="scene-frame rounded-[20px] p-1.5">
      <div className="relative aspect-video overflow-hidden rounded-[15px]">
        <picture>
          <source type="image/webp" srcSet={POSTER_WEBP} sizes="(min-width: 1024px) 560px, 100vw" />
          <img src={POSTER_JPG} alt="" width={1280} height={720} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        </picture>
        {active && (
          <video
            ref={video}
            className="absolute inset-0 h-full w-full object-cover"
            src={src}
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
            tabIndex={-1}
            disablePictureInPicture
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
        )}
        {/* Reflexo jade num canto: camada separada e recortada; a cena fica nítida */}
        <div aria-hidden="true" data-decorative className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
          <div className="hero-video-glow absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgb(var(--hero-jade)/0.05)_0%,rgb(var(--hero-jade)/0.03)_45%,transparent_72%)]" />
        </div>
        {/* .glass-tile fixa position: relative; o posicionamento fica no contêiner */}
        <div className="absolute bottom-3 left-3 z-20">
          <button
            type="button"
            onClick={toggle}
            style={{ borderRadius: 9999 }}
            className="glass-tile glass-tile-hero inline-flex min-h-[44px] items-center gap-2 px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {playing ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
            {playing ? "Pausar cena" : "Reproduzir cena"}
          </button>
        </div>
      </div>
      <figcaption className="sr-only">Professora acompanha a postura de um aluno no estúdio.</figcaption>
    </figure>
  );
}
