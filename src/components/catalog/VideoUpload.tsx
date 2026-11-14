"use client";

import React, { useId, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button, ErrorNote, Field, inputClass } from "@/components/ui/primitives";
import { checkVideoFile, type CatalogRepo } from "@/lib/catalog/repository";
import type { CatalogMedia } from "@/lib/catalog/types";

/** Miniatura a partir de um quadro do vídeo (quando o navegador consegue decodificar). */
export async function videoThumbnail(file: File, atSeconds = 1): Promise<Blob | null> {
  const url = URL.createObjectURL(file);
  try {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "metadata";
    v.src = url;
    await new Promise<void>((ok, fail) => {
      v.onloadeddata = () => ok();
      v.onerror = () => fail(new Error("decode"));
      setTimeout(() => fail(new Error("timeout")), 8000);
    });
    v.currentTime = Math.min(atSeconds, Math.max(0, (v.duration || 1) / 3));
    await new Promise<void>((ok) => {
      v.onseeked = () => ok();
      setTimeout(ok, 3000);
    });
    const w = Math.min(640, v.videoWidth || 640);
    const h = Math.round((w / (v.videoWidth || 16)) * (v.videoHeight || 9));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    c.getContext("2d")?.drawImage(v, 0, 0, w, h);
    return await new Promise((ok) => c.toBlob((b) => ok(b), "image/jpeg", 0.8));
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function VideoUpload({ repo, exerciseId, exerciseName, onDone, onCancel, replacing }: {
  repo: CatalogRepo;
  exerciseId: string;
  exerciseName: string;
  onDone: (m: CatalogMedia) => void;
  onCancel: () => void;
  replacing?: CatalogMedia | null;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState(replacing?.title ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const choose = (f: File | null) => {
    setError(null);
    setFile(null);
    if (!f) return;
    const problem = checkVideoFile(f);
    if (problem) setError(problem);
    else setFile(f);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setError(null);
    try {
      setBusy("Gerando miniatura…");
      const thumb = await videoThumbnail(file);
      setBusy(`Enviando ${(file.size / 1048576).toFixed(1)} MB…`);
      const m = await repo.uploadVideo(exerciseId, file, thumb, title);
      // Substituição: o vídeo novo entra antes; o antigo só sai depois que o novo foi salvo
      if (replacing) await repo.deleteMedia(replacing).catch(() => {});
      onDone(m);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o vídeo.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <form onSubmit={send} className="space-y-3 rounded-panel border border-theme-border bg-theme-secondary/60 p-4" aria-label={`${replacing ? "Substituir" : "Adicionar"} vídeo de ${exerciseName}`}>
      <p className="font-semibold">{replacing ? "Substituir meu vídeo" : "Adicionar meu vídeo"}</p>
      <div
        className="flex flex-col items-center justify-center gap-2 rounded-control border border-dashed border-theme-boundary/70 bg-theme-primary p-5 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          choose(e.dataTransfer.files?.[0] ?? null);
        }}
      >
        <Upload className="h-6 w-6 text-theme-muted" aria-hidden="true" />
        <label htmlFor={`${id}-f`} className="cursor-pointer text-sm font-semibold text-theme-teal underline">
          {file ? file.name : "Escolher vídeo do computador ou do celular"}
        </label>
        <input
          ref={input}
          id={`${id}-f`}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,.mov,.mp4,.webm"
          className="sr-only"
          onChange={(e) => choose(e.target.files?.[0] ?? null)}
        />
        <p className="text-xs text-theme-muted">MP4, MOV ou WebM, até 50 MB. Prefira vídeos curtos (10 a 30 s) mostrando a execução completa.</p>
      </div>
      <Field label="Título (opcional)" htmlFor={`${id}-t`}>
        <input id={`${id}-t`} className={inputClass} maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex.: vista lateral, execução lenta" />
      </Field>
      <p className="text-xs text-theme-muted">
        O vídeo fica privado: só você vê. Vídeos gravados no celular podem guardar a localização da gravação nos metadados; se isso importar, exporte uma cópia sem localização antes de enviar.
        Não envie vídeos de alunos sem a autorização deles.
      </p>
      {error && <ErrorNote>{error}</ErrorNote>}
      {busy && <p role="status" className="text-sm text-theme-muted">{busy}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!file || !!busy}>{replacing ? "Substituir vídeo" : "Enviar vídeo"}</Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={!!busy}>Cancelar</Button>
      </div>
    </form>
  );
}
