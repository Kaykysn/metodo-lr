"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ExternalLink, ImageOff, PlayCircle } from "lucide-react";
import type { CatalogMedia } from "@/lib/catalog/types";
import type { CatalogRepo } from "@/lib/catalog/repository";

/**
 * Ordem de exibição: escolha do professor → vídeo próprio → vídeo que este navegador reproduz →
 * imagem principal → demais imagens → vídeo em formato que o navegador não abre (HEVC).
 */
export function orderMedia(list: CatalogMedia[], chosen: string | null): CatalogMedia[] {
  const rank = (m: CatalogMedia) =>
    m.id === chosen ? 0 : m.media_type === "video" ? (m.source === "upload" ? 1 : playable(m) ? 2 : 5) : m.is_main_at_source ? 3 : 4;
  return [...list].filter((m) => m.is_active).sort((a, b) => rank(a) - rank(b));
}

/** HEVC (maioria dos vídeos do wger) não toca em boa parte dos navegadores. */
function playable(m: CatalogMedia): boolean {
  if (typeof document === "undefined") return true;
  const v = document.createElement("video");
  if (m.codec === "hevc") return !!(v.canPlayType('video/mp4; codecs="hvc1"') || v.canPlayType('video/mp4; codecs="hev1"'));
  if (m.mime === "video/quicktime") return !!(v.canPlayType("video/quicktime") || v.canPlayType("video/mp4"));
  return !m.mime || !!v.canPlayType(m.mime);
}

function MediaFrame({ repo, m, alt, fallbackPoster }: { repo: CatalogRepo; m: CatalogMedia; alt: string; fallbackPoster: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  const [poster, setPoster] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const canPlay = useMemo(() => m.media_type !== "video" || playable(m), [m]);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    setUrl(null);
    Promise.all([repo.mediaUrl(m), repo.thumbUrl(m)]).then(([u, t]) => {
      if (!alive) return;
      setUrl(u);
      setPoster(t);
    }).catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [repo, m]);

  if (failed) return <EmptyMedia text="Não foi possível carregar esta mídia agora." />;
  if (!url) return <div className="aspect-video w-full animate-pulse rounded-control bg-theme-secondary" aria-label="Carregando mídia" />;

  if (m.media_type === "video" && !canPlay) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-control border border-theme-border bg-theme-secondary/60 p-4 text-center">
        <PlayCircle className="h-8 w-8 text-theme-muted" aria-hidden="true" />
        <p className="max-w-sm text-sm text-theme-muted">Este vídeo está em um formato (HEVC) que o seu navegador não reproduz.</p>
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-theme-teal underline">
          Abrir o vídeo na fonte <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    );
  }
  if (m.media_type === "video") {
    return (
      // preload="none": nada é baixado até a pessoa apertar play
      <video
        key={url}
        className={`aspect-video w-full rounded-control object-contain ${!poster && fallbackPoster ? "bg-white" : "bg-black"}`}
        src={url}
        poster={poster ?? fallbackPoster ?? undefined}
        controls
        playsInline
        preload="none"
        aria-label={`Vídeo de execução: ${alt}`}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={`Demonstração: ${alt}`} loading="lazy" decoding="async" className="aspect-video w-full rounded-control bg-white object-contain" onError={() => setFailed(true)} />
  );
}

function EmptyMedia({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-control border border-dashed border-theme-border bg-theme-secondary/40 p-4 text-center">
      <ImageOff className="h-7 w-7 text-theme-muted" aria-hidden="true" />
      <p className="max-w-xs text-sm text-theme-muted">{text}</p>
      {action}
    </div>
  );
}

export function Attribution({ m }: { m: CatalogMedia }) {
  if (m.source === "upload") return <p className="text-xs text-theme-muted">Vídeo próprio{m.title ? `: ${m.title}` : ""}{m.visibility === "shared" ? " · compartilhado com os professores" : " · só você vê"}</p>;
  return (
    <p className="text-xs text-theme-muted">
      {m.attribution || "Fonte: wger.de"}
      {m.license_url && (
        <>
          {" · "}
          <a href={m.license_url} target="_blank" rel="noopener noreferrer license" className="underline">licença</a>
        </>
      )}
      {m.is_ai_generated && " · imagem gerada por IA, segundo a fonte"}
    </p>
  );
}

export default function ExerciseMediaView({ repo, media, chosen, name, emptyAction }: { repo: CatalogRepo; media: CatalogMedia[] | null; chosen: string | null; name: string; emptyAction?: React.ReactNode }) {
  const ordered = useMemo(() => (media ? orderMedia(media, chosen) : []), [media, chosen]);
  const [current, setCurrent] = useState(0);
  useEffect(() => setCurrent(0), [ordered]);

  if (!media) return <div className="aspect-video w-full animate-pulse rounded-control bg-theme-secondary" aria-label="Carregando demonstração" />;
  if (!ordered.length) return <EmptyMedia text="Sem imagem ou vídeo de demonstração para este exercício." action={emptyAction} />;
  const m = ordered[Math.min(current, ordered.length - 1)];
  // Vídeos do wger não têm miniatura: a imagem do mesmo exercício serve de capa
  const img = ordered.find((x) => x.media_type === "image" && x.source === "wger");
  const fallbackPoster = img ? img.thumbnail_url ?? img.source_url : null;
  return (
    <figure className="space-y-2">
      <MediaFrame repo={repo} m={m} alt={name} fallbackPoster={fallbackPoster} />
      <figcaption><Attribution m={m} /></figcaption>
      {ordered.length > 1 && (
        <div role="group" aria-label="Outras demonstrações" className="flex flex-wrap gap-2">
          {ordered.map((x, i) => (
            <button
              key={x.id}
              type="button"
              aria-pressed={i === current}
              onClick={() => setCurrent(i)}
              className={`min-h-[36px] rounded-control border px-3 text-xs font-semibold transition-colors ${i === current ? "border-theme-teal bg-theme-teal-subtle" : "border-theme-border text-theme-muted hover:text-theme-text"}`}
            >
              {x.media_type === "video" ? "Vídeo" : "Imagem"} {i + 1}
              {x.source === "upload" ? " (seu)" : ""}
              {x.id === chosen ? " · principal" : ""}
            </button>
          ))}
        </div>
      )}
    </figure>
  );
}
