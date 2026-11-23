"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useVisualEffects } from "@/components/providers/AppearanceProvider";

/**
 * HeroBackdrop — fundo contínuo do Hero.
 *
 * Camadas, de trás para frente:
 *   1. poster (primeiro quadro) — sempre presente, evita flash e cobre o caso
 *      sem vídeo (mobile, reduced-motion, save-data);
 *   2. vídeo azul (WebM VP9 + MP4 H.264), mudo, em loop, pausado fora da tela;
 *   3. véu escuro com opacidade controlada por --hero-video-overlay;
 *   4. radiais de petróleo;
 *   5. duas famílias de ondas SVG (uma mais larga atrás do modelo e outra mais
 *      sutil), com deriva lenta de 34 s.
 *
 * Nada aqui recebe máscara lateral: as ondas atravessam a largura inteira, sem
 * emenda ou borda vertical. As partículas só existem a partir de 768 px.
 */

/** Posições fixas: 18 pontos minúsculos distribuídos pelo hero. */
const PARTICLES = [
  { left: "6%", top: "18%", size: 2, dur: 17, delay: 0 },
  { left: "12%", top: "62%", size: 1, dur: 21, delay: 2 },
  { left: "18%", top: "36%", size: 2, dur: 19, delay: 4 },
  { left: "24%", top: "78%", size: 1, dur: 23, delay: 1 },
  { left: "31%", top: "12%", size: 1, dur: 18, delay: 3 },
  { left: "37%", top: "54%", size: 2, dur: 20, delay: 5 },
  { left: "44%", top: "84%", size: 1, dur: 22, delay: 2 },
  { left: "49%", top: "28%", size: 2, dur: 16, delay: 6 },
  { left: "55%", top: "68%", size: 1, dur: 24, delay: 0 },
  { left: "61%", top: "44%", size: 1, dur: 19, delay: 3 },
  { left: "67%", top: "16%", size: 2, dur: 21, delay: 1 },
  { left: "72%", top: "74%", size: 1, dur: 18, delay: 4 },
  { left: "78%", top: "38%", size: 2, dur: 22, delay: 2 },
  { left: "83%", top: "58%", size: 1, dur: 20, delay: 5 },
  { left: "88%", top: "22%", size: 1, dur: 17, delay: 3 },
  { left: "92%", top: "70%", size: 2, dur: 23, delay: 1 },
  { left: "96%", top: "44%", size: 1, dur: 19, delay: 4 },
  { left: "42%", top: "8%", size: 1, dur: 25, delay: 2 },
];

export default function HeroBackdrop() {
  const { videoAllowed, prefersReducedMotion } = useVisualEffects();
  const root = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [mountVideo, setMountVideo] = useState(false);
  const [showParticles, setShowParticles] = useState(false);

  // Decide uma única vez, no cliente: só monta o vídeo quando ele é permitido.
  useEffect(() => {
    const small = window.matchMedia("(max-width: 767px)").matches;
    const saveData = Boolean(
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
    );
    setShowParticles(!small);
    setMountVideo(!small && !prefersReducedMotion && videoAllowed && !saveData);
  }, [prefersReducedMotion, videoAllowed]);

  // Pausa quando o hero sai da tela e retoma ao voltar.
  useEffect(() => {
    if (!mountVideo) return;
    const node = video.current;
    const host = root.current;
    if (!node || !host || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          node.pause();
        } else if (!prefersReducedMotion) {
          void node.play().catch(() => {});
        }
      },
      { threshold: 0.05 }
    );
    io.observe(host);
    return () => io.disconnect();
  }, [mountVideo, prefersReducedMotion]);

  return (
    <div
      ref={root}
      aria-hidden="true"
      data-decorative
      className="hero-backdrop pointer-events-none absolute inset-0 z-0 select-none overflow-hidden"
    >
      {/* 1. Poster: primeiro quadro; fallback permanente em mobile/reduced-motion. */}
      <Image
        src="/media/hero-background-poster.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="hero-video-poster"
      />

      {/* 2. Vídeo azul: só é montado quando permitido (>=768px, sem save-data). */}
      {mountVideo && (
        <video
          ref={video}
          className="hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/media/hero-background-poster.jpg"
          aria-hidden="true"
          tabIndex={-1}
          disablePictureInPicture
        >
          <source src="/videos/hero-background.webm" type="video/webm" />
          <source src="/videos/hero-background.mp4" type="video/mp4" />
        </video>
      )}

      {/* 3. Véu de contraste: garante texto ≥4.5:1 sobre qualquer quadro. */}
      <div className="hero-video-overlay" />

      {/* 5. Ondas: camada de trás (mais larga) e camada da frente (mais sutil). */}
      <svg
        className="hero-waves hero-waves-back"
        viewBox="0 0 1600 900"
        preserveAspectRatio="none"
        focusable="false"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="hero-wave-a" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#846321" stopOpacity="0.18" />
            <stop offset="45%" stopColor="#D5AE62" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#846321" stopOpacity="0.18" />
          </linearGradient>
          <linearGradient id="hero-wave-b" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#b78f45" stopOpacity="0.12" />
            <stop offset="52%" stopColor="#EBC886" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#b78f45" stopOpacity="0.12" />
          </linearGradient>
        </defs>
        <path
          className="hero-wave hero-wave-a"
          stroke="url(#hero-wave-a)"
          d="M -80 690 C 260 560 520 800 880 640 S 1380 380 1680 500"
        />
        <path
          className="hero-wave hero-wave-b"
          stroke="url(#hero-wave-b)"
          d="M -80 500 C 300 380 600 620 980 450 S 1400 240 1680 340"
        />
      </svg>

      <svg
        className="hero-waves hero-waves-front"
        viewBox="0 0 1600 900"
        preserveAspectRatio="none"
        focusable="false"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="hero-wave-front" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#D5AE62" stopOpacity="0.04" />
            <stop offset="50%" stopColor="#EBC886" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#D5AE62" stopOpacity="0.22" />
          </linearGradient>
        </defs>
        <path
          className="hero-wave hero-wave-c"
          stroke="url(#hero-wave-front)"
          d="M -80 840 C 340 740 700 940 1080 790 S 1440 640 1680 720"
        />
        <path
          className="hero-wave hero-wave-d"
          stroke="url(#hero-wave-front)"
          d="M -80 300 C 300 220 560 420 940 300 S 1380 140 1680 240"
        />
      </svg>

      {/* Partículas: decorativas, só no desktop. */}
      {showParticles && (
        <div className="absolute inset-0 hero-particles">
          {PARTICLES.map((p, i) => (
            <span
              key={i}
              className="hero-particle"
              style={
                {
                  left: p.left,
                  top: p.top,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  "--dur": `${p.dur}s`,
                  "--delay": `${p.delay}s`,
                  opacity: 0.35,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
