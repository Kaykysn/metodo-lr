"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Pencil, Star, Video } from "lucide-react";
import { BodyMapFigure, type RegionRole } from "@/components/assessment/AnatomyMap";
import { Badge, Button, ErrorNote } from "@/components/ui/primitives";
import AddToPlan from "@/components/exercises/AddToPlan";
import { BODY_REGIONS_V2 } from "@/lib/domain/body-regions";
import { PURPOSE_LABEL } from "@/lib/domain/exercise-catalog";
import type { Actor } from "@/lib/domain/types";
import { registerCatalogExercise } from "@/lib/catalog/bridge";
import { APPARATUS_LABEL, categoryPt, equipmentPt, MUSCLE_BY_WGER_ID, musclePt } from "@/lib/catalog/labels";
import type { CatalogRepo } from "@/lib/catalog/repository";
import type { CatalogEditorial, CatalogExercise, CatalogMedia } from "@/lib/catalog/types";
import ExerciseMediaView, { orderMedia } from "./ExerciseMediaView";
import VideoUpload from "./VideoUpload";
import CustomExerciseForm from "./CustomExerciseForm";
import EditorialForm from "./EditorialForm";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 border-t border-theme-border pt-4">
      <h3 className="font-bold">{title}</h3>
      {children}
    </section>
  );
}

function regionRolesOf(e: CatalogExercise): Record<string, RegionRole> {
  const out: Record<string, RegionRole> = {};
  const mark = (ids: number[], role: RegionRole) => {
    for (const id of ids)
      for (const base of MUSCLE_BY_WGER_ID.get(id)?.regions ?? [])
        for (const reg of BODY_REGIONS_V2.filter((x) => x.base === base)) if (!out[reg.id] || role === "primary") out[reg.id] = role;
  };
  mark(e.secondary_muscles.map((m) => m.id), "secondary");
  mark(e.primary_muscles.map((m) => m.id), "primary");
  return out;
}

export default function CatalogDetail({ repo, actor, exercise, favorite, onToggleFavorite, onChanged }: {
  repo: CatalogRepo;
  actor: Actor;
  exercise: CatalogExercise;
  favorite: boolean;
  onToggleFavorite: () => void;
  onChanged: (e: CatalogExercise) => void;
}) {
  const [media, setMedia] = useState<CatalogMedia[] | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [editorial, setEditorial] = useState<CatalogEditorial | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [panel, setPanel] = useState<"none" | "upload" | "edit">("none");
  const [replacing, setReplacing] = useState<CatalogMedia | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = actor.role === "admin";
  const mine = exercise.source === "custom" && !!uid && exercise.owner_id === uid;

  const load = useCallback(() => {
    setError(null);
    Promise.all([repo.media(exercise.id), repo.mainChoice(exercise.id), repo.editorial(exercise.id), repo.currentUserId()])
      .then(([m, c, ed, u]) => {
        setMedia(m);
        setChosen(c);
        setEditorial(ed);
        setUid(u);
      })
      .catch(() => {
        setMedia([]);
        setError("Não foi possível carregar as demonstrações deste exercício.");
      });
  }, [repo, exercise.id]);
  useEffect(() => {
    setMedia(null);
    setPanel("none");
    load();
  }, [load]);

  const card = useMemo(() => registerCatalogExercise(exercise, editorial), [exercise, editorial]);
  const roles = useMemo(() => regionRolesOf(exercise), [exercise]);
  const myMedia = (media ?? []).filter((m) => m.source === "upload" && m.owner_id === uid);
  const ordered = media ? orderMedia(media, chosen) : [];
  const text = editorial?.description_pt || exercise.description_pt || exercise.instructions;
  const english = !text && exercise.description_en;

  const act = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível concluir.");
    }
  };

  if (panel === "edit" && mine) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Editar exercício</h2>
        <CustomExerciseForm repo={repo} initial={exercise} onCancel={() => setPanel("none")} onSaved={(e) => { setPanel("none"); onChanged(e); }} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-bold leading-tight">{card.name}</h2>
            {exercise.name_en && exercise.name_en !== card.name && <p className="text-sm text-theme-muted">{exercise.name_en}</p>}
          </div>
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-pressed={favorite}
            aria-label={favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-theme-border hover:bg-theme-secondary"
          >
            <Star className={`h-5 w-5 ${favorite ? "fill-current text-status-caution-fg" : "text-theme-muted"}`} aria-hidden="true" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={exercise.source === "wger" ? "neutral" : "accent"}>{exercise.source === "wger" ? "Catálogo wger" : exercise.visibility === "shared" ? "Compartilhado" : "Exercício próprio"}</Badge>
          {exercise.category && <Badge>{categoryPt(exercise.category)}</Badge>}
          {exercise.apparatus !== "indefinido" && <Badge>{APPARATUS_LABEL[exercise.apparatus]}</Badge>}
          {editorial?.purposes.map((p) => <Badge key={p} tone="accent">{PURPOSE_LABEL[p]}</Badge>)}
          {!exercise.is_active && <Badge tone="caution">{exercise.source === "wger" ? "Saiu da fonte" : "Arquivado"}</Badge>}
        </div>
      </header>

      <ExerciseMediaView
        repo={repo}
        media={media}
        chosen={chosen}
        name={card.name}
        emptyAction={panel === "none" ? <Button variant="secondary" onClick={() => setPanel("upload")}><Video className="h-4 w-4" aria-hidden="true" /> Adicionar meu vídeo</Button> : undefined}
      />
      {error && <ErrorNote>{error}</ErrorNote>}

      {panel === "upload" ? (
        <VideoUpload
          repo={repo}
          exerciseId={exercise.id}
          exerciseName={card.name}
          replacing={replacing}
          onCancel={() => { setPanel("none"); setReplacing(null); }}
          onDone={() => { setPanel("none"); setReplacing(null); load(); }}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          {ordered.length > 0 && <Button variant="secondary" onClick={() => setPanel("upload")}><Video className="h-4 w-4" aria-hidden="true" /> Adicionar meu vídeo</Button>}
          <AddToPlan exercise={card} />
        </div>
      )}

      {ordered.length > 1 && (
        <Section title="Demonstração principal">
          <p className="text-sm text-theme-muted">Escolha o que aparece primeiro para você nesta ficha.</p>
          <ul className="space-y-1.5">
            {ordered.map((m, i) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>{m.media_type === "video" ? "Vídeo" : "Imagem"} {i + 1}{m.source === "upload" ? ` (seu${m.title ? `: ${m.title}` : ""})` : " (wger)"}</span>
                {m.id === chosen ? (
                  <span className="font-semibold text-theme-teal">Principal</span>
                ) : (
                  <button type="button" className="min-h-[36px] font-semibold text-theme-teal underline" onClick={() => act(() => repo.setMainChoice(exercise.id, m.id))}>Usar como principal</button>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {myMedia.length > 0 && (
        <Section title="Meus vídeos neste exercício">
          <ul className="space-y-3">
            {myMedia.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-theme-border p-3 text-sm">
                <span className="min-w-0">
                  <strong>{m.title || "Vídeo sem título"}</strong>
                  <span className="block text-theme-muted">
                    {m.size_bytes ? `${(m.size_bytes / 1048576).toFixed(1)} MB · ` : ""}
                    {m.visibility === "shared" ? "compartilhado com os professores" : m.share_requested ? "compartilhamento pedido ao administrador" : "só você vê"}
                  </span>
                </span>
                <span className="flex flex-wrap gap-1">
                  {m.visibility === "private" && (
                    <Button variant="ghost" onClick={() => act(() => repo.requestShare("media", m.id, !m.share_requested))}>{m.share_requested ? "Cancelar pedido" : "Pedir compartilhamento"}</Button>
                  )}
                  <Button variant="ghost" onClick={() => { setReplacing(m); setPanel("upload"); }}>Substituir</Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (window.confirm(`Excluir o vídeo "${m.title || "sem título"}"? O arquivo é apagado e não dá para desfazer.`)) act(() => repo.deleteMedia(m));
                    }}
                  >
                    Excluir
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Músculos envolvidos">
        <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
          <div className="grid grid-cols-2 gap-2 sm:w-[240px]">
            {(["anterior", "posterior"] as const).map((v) => (
              <figure key={v}>
                <BodyMapFigure view={v} selected={[]} symptoms={[]} roles={roles} />
                <figcaption className="mt-1 text-center text-xs text-theme-muted">{v === "anterior" ? "Frente" : "Costas"}</figcaption>
              </figure>
            ))}
          </div>
          <div className="space-y-3 text-[15px]">
            <div>
              <p className="text-sm font-semibold">Principais{exercise.source === "wger" ? " (cadastro da fonte)" : ""}</p>
              <p>{exercise.primary_muscles.length ? exercise.primary_muscles.map((m) => musclePt(m.id, m.name)).join(", ") : "Não informados"}</p>
            </div>
            <div>
              <p className="text-sm font-semibold">Secundários{exercise.source === "wger" ? " (cadastro da fonte)" : ""}</p>
              <p>{exercise.secondary_muscles.length ? exercise.secondary_muscles.map((m) => musclePt(m.id, m.name)).join(", ") : "Não informados"}</p>
            </div>
            {editorial && (editorial.agonists.length > 0 || editorial.synergists.length > 0 || editorial.stabilizers.length > 0) ? (
              <dl className="grid gap-1 rounded-control bg-theme-secondary/60 p-3 text-sm sm:grid-cols-[130px_1fr]">
                <dt className="font-semibold">Agonistas</dt><dd>{editorial.agonists.join(", ") || "—"}</dd>
                <dt className="font-semibold">Sinergistas</dt><dd>{editorial.synergists.join(", ") || "—"}</dd>
                <dt className="font-semibold">Estabilizadores</dt><dd>{editorial.stabilizers.join(", ") || "—"}</dd>
                <dd className="text-xs text-theme-muted sm:col-span-2">Classificação revisada pela equipe do app.</dd>
              </dl>
            ) : (
              <p className="text-sm text-theme-muted">
                {exercise.source === "wger"
                  ? "A fonte registra músculos principais e secundários. Isso não equivale a uma análise biomecânica (agonistas, sinergistas e estabilizadores), que ainda não foi revisada para esta ficha."
                  : "Músculos informados no cadastro."}{" "}
                O mapa mostra regiões, não músculos isolados.
              </p>
            )}
          </div>
        </div>
      </Section>

      <Section title="Equipamento">
        <p className="text-[15px]">{exercise.equipment.length ? exercise.equipment.map(equipmentPt).join(", ") : "Não informado"}</p>
      </Section>

      <Section title="Execução">
        {text ? (
          <p className="whitespace-pre-line text-[15px]">{text}</p>
        ) : english ? (
          <>
            <p className="text-sm text-theme-muted">Texto original em inglês. A tradução revisada para o português ainda não foi feita.</p>
            <p lang="en" className="whitespace-pre-line text-[15px]">{exercise.description_en}</p>
          </>
        ) : (
          <p className="text-[15px] text-theme-muted">A fonte não traz instruções para este exercício.</p>
        )}
        {exercise.source === "custom" && exercise.instructions && text !== exercise.instructions && <p className="whitespace-pre-line text-[15px]">{exercise.instructions}</p>}
      </Section>

      {(editorial?.technical_notes || editorial?.caution_notes) && (
        <Section title="Observações técnicas">
          {editorial.technical_notes && <p className="whitespace-pre-line text-[15px]">{editorial.technical_notes}</p>}
          {editorial.caution_notes && <p className="whitespace-pre-line text-[15px] text-theme-muted">{editorial.caution_notes}</p>}
        </Section>
      )}
      <p className="text-sm text-theme-muted">A escolha, a dose e a progressão dependem da avaliação, da tolerância e dos objetivos de cada aluno. Esta ficha não indica nem contraindica o exercício para nenhuma condição.</p>

      <Section title="Fonte e licença">
        {exercise.source === "wger" ? (
          <p className="text-sm text-theme-muted">
            Dados do exercício: <a href="https://wger.de/" target="_blank" rel="noopener noreferrer" className="underline">wger.de</a>
            {exercise.license && <>, licença {exercise.license_url ? <a href={exercise.license_url} target="_blank" rel="noopener noreferrer license" className="underline">{exercise.license}</a> : exercise.license}</>}
            {exercise.authors.length > 0 && <>. Autoria: {exercise.authors.join(", ")}</>}.
            {!exercise.is_active && " Este exercício saiu da fonte; a ficha fica guardada para os treinos que o usam."}
          </p>
        ) : (
          <p className="text-sm text-theme-muted">{mine ? "Cadastrado por você." : "Cadastrado por um professor e disponibilizado pelo administrador."}</p>
        )}
      </Section>

      {mine && (
        <div className="flex flex-wrap gap-2 border-t border-theme-border pt-4">
          <Button variant="secondary" onClick={() => setPanel("edit")}><Pencil className="h-4 w-4" aria-hidden="true" /> Editar</Button>
          {exercise.visibility === "private" && (
            <Button variant="ghost" onClick={() => act(async () => { await repo.requestShare("exercise", exercise.id, !exercise.share_requested); onChanged({ ...exercise, share_requested: !exercise.share_requested }); })}>
              {exercise.share_requested ? "Cancelar pedido de compartilhamento" : "Pedir para compartilhar com todos"}
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => {
              const next = !exercise.is_active;
              if (next || window.confirm("Arquivar este exercício? Ele some da biblioteca, mas continua nos treinos que já o usam. Dá para reativar depois.")) {
                act(async () => { await repo.setCustomActive(exercise.id, next); onChanged({ ...exercise, is_active: next }); });
              }
            }}
          >
            <Archive className="h-4 w-4" aria-hidden="true" /> {exercise.is_active ? "Arquivar" : "Reativar"}
          </Button>
        </div>
      )}

      {isAdmin && repo.mode === "supabase" && (
        <details className="border-t border-theme-border pt-4">
          <summary className="min-h-[44px] cursor-pointer font-semibold text-theme-teal">Revisão editorial</summary>
          <div className="mt-3">
            <EditorialForm key={exercise.id} repo={repo} exerciseId={exercise.id} initial={editorial} onSaved={setEditorial} />
          </div>
        </details>
      )}
    </div>
  );
}
