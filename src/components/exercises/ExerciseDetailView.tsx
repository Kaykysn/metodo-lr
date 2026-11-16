"use client";

import React, { useMemo, useRef, useState } from "react";
import { BodyMapFigure, type RegionRole } from "@/components/assessment/AnatomyMap";
import { EXERCISE_BY_ID, type ExerciseCard } from "@/lib/domain/exercise-library";
import { LATERALITY_LABEL, PURPOSE_LABEL, ROLE_LABEL, type MuscleRole, type MuscleRoleKind } from "@/lib/domain/exercise-catalog";
import { expandMuscleRef, MUSCLE_GROUP_BY_ID, muscleRefName } from "@/lib/domain/muscles";
import { BODY_REGIONS_V2 } from "@/lib/domain/body-regions";
import { CLAIM_BY_ID, claimSource } from "@/lib/domain/evidence-claims";
import { EVIDENCE_BY_ID } from "@/lib/domain/evidence";
import { Badge } from "@/components/ui/primitives";

const TABS = [
  { id: "execucao", label: "Execução" },
  { id: "musculos", label: "Músculos envolvidos" },
  { id: "adaptacoes", label: "Adaptações" },
  { id: "referencias", label: "Referências" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const RANK: Record<MuscleRoleKind, number> = { primary: 3, secondary: 2, stabilizer: 1 };

/** Papel mais forte por região do mapa (os dois lados recebem o mesmo papel). */
export function regionRoles(muscles: MuscleRole[]): Record<string, RegionRole> {
  const out: Record<string, RegionRole> = {};
  for (const r of muscles) {
    for (const m of expandMuscleRef(r.ref)) {
      for (const base of m.regions) {
        for (const reg of BODY_REGIONS_V2.filter((x) => x.base === base)) {
          const cur = out[reg.id];
          if (!cur || RANK[r.role] > RANK[cur]) out[reg.id] = r.role;
        }
      }
    }
  }
  return out;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-theme-muted">{title}</h3>
      {children}
    </section>
  );
}

export default function ExerciseDetailView({ exercise, onSelect, actions }: { exercise: ExerciseCard; onSelect: (id: string) => void; actions?: React.ReactNode }) {
  const [tab, setTab] = useState<TabId>("execucao");
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const d = exercise.detail;

  const onKey = (e: React.KeyboardEvent, i: number) => {
    let n: number;
    if (e.key === "ArrowRight") n = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft") n = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = TABS.length - 1;
    else return;
    e.preventDefault();
    setTab(TABS[n].id);
    refs.current[n]?.focus();
  };

  return (
    <article aria-labelledby={`ex-${exercise.id}`} className="space-y-4">
      <header className="space-y-2">
        <h2 id={`ex-${exercise.id}`} className="text-2xl font-bold tracking-tight">{exercise.name}</h2>
        {exercise.synonyms.length + exercise.englishNames.length > 0 && (
          <p className="text-sm text-theme-muted">
            Também conhecido como {[...exercise.synonyms, ...exercise.englishNames].join(", ")}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {exercise.purposes.map((p) => <Badge key={p} tone="accent">{PURPOSE_LABEL[p]}</Badge>)}
          {exercise.laterality && <Badge>{LATERALITY_LABEL[exercise.laterality]}</Badge>}
          {exercise.difficulty && <Badge>Nível {exercise.difficulty}</Badge>}
          <Badge>{exercise.pattern}</Badge>
          <Badge tone="caution">{d ? d.reviewStatus : exercise.reviewStatus}</Badge>
        </div>
        <p className="text-[15px]">{exercise.objective}</p>
        {actions}
      </header>

      {!d ? (
        <LegacyBody exercise={exercise} onSelect={onSelect} />
      ) : (
        <>
          <div role="tablist" aria-label={`Ficha de ${exercise.name}`} className="glass-soft flex gap-1 overflow-x-auto rounded-control border border-theme-border bg-theme-secondary p-1">
            {TABS.map((t, i) => (
              <button
                key={t.id}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                id={`tab-${exercise.id}-${t.id}`}
                role="tab"
                type="button"
                aria-selected={tab === t.id}
                aria-controls={`panel-${exercise.id}-${t.id}`}
                tabIndex={tab === t.id ? 0 : -1}
                onClick={() => setTab(t.id)}
                onKeyDown={(e) => onKey(e, i)}
                className={`min-h-[44px] shrink-0 whitespace-nowrap rounded-lg px-3 text-sm font-semibold ${tab === t.id ? "bg-theme-raised text-theme-text shadow-subtle" : "text-theme-muted hover:text-theme-text"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div id={`panel-${exercise.id}-${tab}`} role="tabpanel" aria-labelledby={`tab-${exercise.id}-${tab}`} tabIndex={0} className="space-y-5">
            {tab === "execucao" && <Execucao exercise={exercise} />}
            {tab === "musculos" && <Musculos exercise={exercise} />}
            {tab === "adaptacoes" && <Adaptacoes exercise={exercise} onSelect={onSelect} />}
            {tab === "referencias" && <Referencias exercise={exercise} />}
          </div>
        </>
      )}
    </article>
  );
}

function Execucao({ exercise }: { exercise: ExerciseCard }) {
  const d = exercise.detail!;
  return (
    <>
      <Section title="Variação">
        <p className="text-[15px]">{d.variation}</p>
        <p className="text-sm text-theme-muted">Equipamento: {exercise.equipment.join(", ") || "nenhum"}</p>
      </Section>
      <Section title="Posição inicial">
        <p className="text-[15px]">{d.startingPosition}</p>
      </Section>
      <Section title="Movimento">
        <ol className="list-decimal space-y-1.5 pl-5 text-[15px]">
          {d.instructions.map((s) => <li key={s}>{s}</li>)}
        </ol>
      </Section>
      <Section title="Respiração">
        <p className="text-[15px]">{d.breathing}</p>
      </Section>
      <Section title="Ações articulares e padrão">
        <ul className="list-disc space-y-1 pl-5 text-[15px]">
          {d.jointActions.map((s) => <li key={s}>{s}</li>)}
        </ul>
        <p className="text-sm text-theme-muted">Padrão de movimento: {exercise.pattern}. Execução {exercise.laterality ? LATERALITY_LABEL[exercise.laterality].toLocaleLowerCase("pt-BR") : "não informada"}.</p>
      </Section>
      <Section title="Erros frequentes">
        <p className="text-[15px]">{exercise.commonErrors}</p>
      </Section>
      <Section title="Imagem e vídeo">
        <p className="text-[15px] text-theme-muted">Nenhuma imagem ou vídeo com direitos de uso verificados. Fonte e licença serão registradas aqui quando houver.</p>
      </Section>
    </>
  );
}

function Musculos({ exercise }: { exercise: ExerciseCard }) {
  const d = exercise.detail!;
  const roles = useMemo(() => regionRoles(d.muscles), [d.muscles]);
  const byRole = (k: MuscleRoleKind) => d.muscles.filter((m) => m.role === k);
  return (
    <>
      <p className="text-[15px]">
        Contribuições anatômicas típicas, em termos qualitativos. O papel de cada músculo muda com a posição das articulações, o apoio e a amplitude.
      </p>
      <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
        <div className="grid grid-cols-2 gap-2 sm:w-[300px]">
          {(["anterior", "posterior"] as const).map((v) => (
            <figure key={v}>
              <BodyMapFigure view={v} selected={[]} symptoms={[]} roles={roles} />
              <figcaption className="mt-1 text-center text-xs text-theme-muted">{v === "anterior" ? "Frente" : "Costas"}</figcaption>
            </figure>
          ))}
        </div>
        <div className="space-y-3">
          <ul aria-label="Legenda do mapa" className="space-y-1.5 text-sm">
            <li className="flex items-center gap-2"><span aria-hidden="true" className="inline-block h-4 w-4 rounded-full border-[3px] border-theme-teal bg-theme-teal/50" /> Principal</li>
            <li className="flex items-center gap-2"><span aria-hidden="true" className="inline-block h-4 w-4 rounded-full border-2 border-dashed border-theme-teal bg-theme-teal/15" /> Secundário</li>
            <li className="flex items-center gap-2"><span aria-hidden="true" className="inline-block h-4 w-4 rounded-full border-2 border-dotted border-theme-muted" /> Estabilizador</li>
          </ul>
          <p className="text-sm text-theme-muted">
            O mapa mostra regiões, não músculos isolados, e é um esquema vetorial provisório. A lista abaixo é a informação completa, incluindo os músculos profundos.
          </p>
        </div>
      </div>

      {(["primary", "secondary", "stabilizer"] as MuscleRoleKind[]).map((k) =>
        byRole(k).length ? (
          <Section key={k} title={k === "primary" ? "Principais" : k === "secondary" ? "Secundários" : "Estabilizadores"}>
            <ul className="space-y-2">
              {byRole(k).map((r) => <MuscleItem key={r.ref} role={r} />)}
            </ul>
          </Section>
        ) : null
      )}

      <Section title="Como a execução muda o papel dos músculos">
        <p className="text-[15px]">{d.roleVariation}</p>
      </Section>
      <p className="rounded-control border border-theme-border bg-theme-secondary px-3 py-2 text-sm text-theme-muted">
        Medidas de EMG mostram atividade elétrica nas condições de cada estudo. Afirmar que um exercício gera mais hipertrofia exige estudo de crescimento muscular, listado na aba Referências quando existir.
      </p>
    </>
  );
}

function MuscleItem({ role }: { role: MuscleRole }) {
  const group = MUSCLE_GROUP_BY_ID.get(role.ref);
  const members = expandMuscleRef(role.ref);
  return (
    <li className="rounded-control border border-theme-border p-3">
      <p className="font-semibold">
        {muscleRefName(role.ref)} <span className="text-sm font-normal text-theme-muted">· {ROLE_LABEL[role.role]}</span>
      </p>
      {role.note && <p className="mt-1 text-[15px]">{role.note}</p>}
      {group ? (
        <>
          {group.note && <p className="mt-1 text-sm text-theme-muted">{group.note}</p>}
          <ul className="mt-2 space-y-1 text-[15px]">
            {members.map((m) => (
              <li key={m.id}>
                <span className="font-medium">{m.name}</span>: {m.actions}
                {m.depth === "profundo" && <span className="text-sm text-theme-muted"> (músculo profundo, descrito só em texto)</span>}
              </li>
            ))}
          </ul>
        </>
      ) : (
        members.map((m) => (
          <p key={m.id} className="mt-1 text-[15px]">
            {m.actions}
            {m.depth === "profundo" && <span className="text-sm text-theme-muted"> Músculo profundo: não aparece no esquema superficial.</span>}
          </p>
        ))
      )}
    </li>
  );
}

function ExerciseLinks({ ids, onSelect }: { ids: string[]; onSelect: (id: string) => void }) {
  if (!ids.length) return <p className="text-[15px] text-theme-muted">Nenhuma cadastrada.</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {ids.map((id) => {
        const e = EXERCISE_BY_ID.get(id);
        return e ? (
          <li key={id}>
            <button type="button" onClick={() => onSelect(id)} className="min-h-[40px] rounded-control border border-theme-border px-3 text-sm font-semibold text-theme-teal hover:bg-theme-secondary">
              {e.name}
            </button>
          </li>
        ) : null;
      })}
    </ul>
  );
}

function Adaptacoes({ exercise, onSelect }: { exercise: ExerciseCard; onSelect: (id: string) => void }) {
  const d = exercise.detail!;
  return (
    <>
      <Section title="Ajustes comuns de execução">
        <ul className="list-disc space-y-1 pl-5 text-[15px]">
          {d.adjustments.map((s) => <li key={s}>{s}</li>)}
        </ul>
      </Section>
      <Section title="Regressões">
        <ExerciseLinks ids={exercise.regressions} onSelect={onSelect} />
      </Section>
      <Section title="Progressões">
        <ExerciseLinks ids={exercise.progressions} onSelect={onSelect} />
      </Section>
      {exercise.purposes.map((p) => (
        <Section key={p} title={`Notas profissionais: ${PURPOSE_LABEL[p]}`}>
          <p className="text-[15px]">{d.purposeNotes[p]}</p>
        </Section>
      ))}
      <Section title="Campos de prescrição editáveis">
        <p className="text-[15px]">{d.prescriptionFields.join(", ")}.</p>
        <p className="text-sm text-theme-muted">Os valores são definidos no treino de cada aluno.</p>
      </Section>
      <Section title="Sintomas e tolerância">
        <p className="text-[15px]">{d.toleranceNotes}</p>
      </Section>
    </>
  );
}

function Referencias({ exercise }: { exercise: ExerciseCard }) {
  const d = exercise.detail!;
  const legacyRefs = exercise.references.map((id) => EVIDENCE_BY_ID.get(id)).filter(Boolean);
  return (
    <>
      <ul className="space-y-3">
        {d.claims.map((id) => {
          const c = CLAIM_BY_ID.get(id);
          if (!c) return null;
          const s = claimSource(c);
          return (
            <li key={id} className="space-y-1.5 rounded-control border border-theme-border p-3">
              <div className="flex flex-wrap gap-1.5">
                <Badge tone="accent">{c.label}</Badge>
                <Badge tone={c.reviewStatus === "revisado" ? "success" : "caution"}>{c.reviewStatus}</Badge>
              </div>
              <p className="text-[15px]">{c.claim}</p>
              <p className="text-sm text-theme-muted">População: {c.population}. Limitações: {c.limitations}</p>
              <p className="text-sm text-theme-muted">
                Base da revisão: {c.reviewBasis === "metadados" ? "só metadados conferidos (resumo e texto completo ainda não lidos)" : c.reviewBasis}.
              </p>
              {s && (
                <p className="text-sm">
                  <a href={s.url} target="_blank" rel="noreferrer" className="font-semibold text-theme-teal underline">
                    {s.authors.split(",")[0]} ({s.year})
                  </a>{" "}
                  — {s.title}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {d.pendingReferences.length > 0 && (
        <Section title="Referências pendentes">
          <ul className="list-disc space-y-1 pl-5 text-[15px]">
            {d.pendingReferences.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </Section>
      )}
      {legacyRefs.length > 0 && (
        <Section title="Contexto geral do treino resistido">
          <p className="text-[15px]">{exercise.evidenceNote}</p>
        </Section>
      )}
    </>
  );
}

function LegacyBody({ exercise, onSelect }: { exercise: ExerciseCard; onSelect: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <p className="rounded-control border border-status-caution-border bg-status-caution-bg px-3 py-2 text-sm text-status-caution-fg">
        Ficha detalhada ainda não preenchida: músculos por papel, ajustes e referências específicas estão pendentes.
      </p>
      <Section title="Execução"><p className="text-[15px]">{exercise.execution}</p></Section>
      <Section title="Músculos (registro anterior)"><p className="text-[15px]">Principais: {exercise.primaryMuscles.join(", ")}{exercise.secondaryMuscles.length ? `. Secundários: ${exercise.secondaryMuscles.join(", ")}` : ""}</p></Section>
      <Section title="Erros frequentes"><p className="text-[15px]">{exercise.commonErrors}</p></Section>
      <Section title="Regressões"><ExerciseLinks ids={exercise.regressions} onSelect={onSelect} /></Section>
      <Section title="Progressões"><ExerciseLinks ids={exercise.progressions} onSelect={onSelect} /></Section>
      <Section title="Precauções"><p className="text-[15px]">{exercise.precautions}</p></Section>
      <Section title="Evidência"><p className="text-[15px]">{exercise.evidenceNote}</p></Section>
    </div>
  );
}
