"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronDown, Copy, PanelRightClose, PanelRightOpen, Plus, Repeat2, SlidersHorizontal, Trash2 } from "lucide-react";
import PickRow from "@/components/catalog/PickRow";
import type { Assessment, Dose, Effort, PrescribedExercise, RehabContext, Resistance, TrainingPlan, TrainingSession } from "@/lib/domain/types";
import { EXERCISE_BY_ID, MODALITIES, MUSCLE_OPTIONS, EQUIPMENT, PATTERNS, searchExercises, type Modality, type MovementPattern, type PurposeFilter } from "@/lib/domain/exercise-library";
import { PURPOSE_LABEL } from "@/lib/domain/exercise-catalog";
import { defaultPrescription, emptyRehab, estimateMinutes, latest, newId, updateDraft } from "@/lib/domain/plans";
import { useData } from "@/components/providers/DataProvider";
import { Badge, Button, ButtonLink, ErrorNote, Field, InfoNote, inputClass, Panel } from "@/components/ui/primitives";
import { clearTabDraft, fingerprint, readTabDraft, writeTabDraft } from "@/lib/tab-drafts";
import { NumberInput } from "@/components/assessment/flow/controls";
import { regionLabel } from "@/components/assessment/AnatomyMap";
import { evaluateTriage } from "@/lib/domain/triage";
import CatalogPicker from "@/components/catalog/CatalogPicker";
import AssessmentHints from "./AssessmentHints";
import { itemName, useCatalogHydration } from "@/lib/catalog/bridge";

function move<T>(arr: T[], i: number, d: -1 | 1) {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const c = [...arr];
  [c[i], c[j]] = [c[j], c[i]];
  return c;
}

const ta = `${inputClass} min-h-[72px] py-2`;

function PrescriptionEditor({ item, onChange, assessment }: { item: PrescribedExercise; onChange: (p: PrescribedExercise) => void; assessment: Assessment | null }) {
  const ex = EXERCISE_BY_ID.get(item.exerciseId);
  const id = item.id;
  const setDose = (d: Partial<Dose>) => onChange({ ...item, dose: { ...item.dose, ...d } as Dose });
  const setRes = (r: Resistance) => onChange({ ...item, resistance: r });
  const setEffort = (e: Effort) => onChange({ ...item, effort: e });
  return (
    <div className="grid gap-4 pt-3 sm:grid-cols-2 lg:grid-cols-4">
      {assessment && ex && <AssessmentHints assessment={assessment} exercise={ex} item={item} onChange={onChange} />}
      <Field label="Tipo de dose" htmlFor={`dk-${id}`}>
        <select
          id={`dk-${id}`}
          className={inputClass}
          value={item.dose.kind}
          onChange={(e) => {
            const k = e.target.value as Dose["kind"];
            const sets = item.dose.sets;
            onChange({ ...item, dose: k === "reps" ? { kind: "reps", sets, repsMin: 8, repsMax: 12 } : k === "time" ? { kind: "time", sets, seconds: 30 } : { kind: "distance", sets, meters: 400 } });
          }}
        >
          <option value="reps">Repetições</option>
          <option value="time">Duração</option>
          <option value="distance">Distância</option>
        </select>
      </Field>
      <Field label="Séries" htmlFor={`s-${id}`}>
        <NumberInput id={`s-${id}`} min={1} max={20} value={item.dose.sets} onChange={(v) => setDose({ sets: v ?? 1 })} />
      </Field>
      {item.dose.kind === "reps" && (
        <>
          <Field label="Repetições (mín.)" htmlFor={`rmin-${id}`}>
            <NumberInput id={`rmin-${id}`} min={1} max={100} value={item.dose.repsMin} onChange={(v) => setDose({ repsMin: v ?? 1 })} />
          </Field>
          <Field label="Repetições (máx.)" htmlFor={`rmax-${id}`}>
            <NumberInput id={`rmax-${id}`} min={1} max={100} value={item.dose.repsMax} onChange={(v) => setDose({ repsMax: v ?? 1 })} />
          </Field>
        </>
      )}
      {item.dose.kind === "time" && (
        <Field label="Duração por série (s)" htmlFor={`sec-${id}`}>
          <NumberInput id={`sec-${id}`} min={5} max={3600} value={item.dose.seconds} onChange={(v) => setDose({ seconds: v ?? 30 })} />
        </Field>
      )}
      {item.dose.kind === "distance" && (
        <Field label="Distância (m)" htmlFor={`m-${id}`}>
          <NumberInput id={`m-${id}`} min={10} max={50000} value={item.dose.meters} onChange={(v) => setDose({ meters: v ?? 100 })} />
        </Field>
      )}

      {/* Resistência conforme o tipo do exercício — sem converter molas/elástico em kg */}
      {item.resistance.kind === "external_kg" && (
        <Field label="Carga (kg)" htmlFor={`kg-${id}`} hint="Vazio = a definir na primeira sessão.">
          <NumberInput id={`kg-${id}`} min={0} max={500} step={0.5} value={item.resistance.kg} onChange={(v) => setRes({ kind: "external_kg", kg: v })} />
        </Field>
      )}
      {item.resistance.kind === "band" && (
        <>
          <Field label="Elástico (cor/nível)" htmlFor={`bc-${id}`}>
            <input id={`bc-${id}`} className={inputClass} value={item.resistance.color} onChange={(e) => setRes({ ...(item.resistance as Extract<Resistance, { kind: "band" }>), color: e.target.value })} />
          </Field>
          <Field label="Ancoragem / observação" htmlFor={`bn-${id}`}>
            <input id={`bn-${id}`} className={inputClass} value={item.resistance.note} onChange={(e) => setRes({ ...(item.resistance as Extract<Resistance, { kind: "band" }>), note: e.target.value })} />
          </Field>
        </>
      )}
      {item.resistance.kind === "pilates_springs" && (
        <>
          <Field label="Aparelho" htmlFor={`pa-${id}`}>
            <input id={`pa-${id}`} className={inputClass} value={item.resistance.apparatus} onChange={(e) => setRes({ ...(item.resistance as Extract<Resistance, { kind: "pilates_springs" }>), apparatus: e.target.value })} />
          </Field>
          <Field label="Molas" htmlFor={`ps-${id}`} hint="ex.: 2 vermelhas + 1 azul">
            <input id={`ps-${id}`} className={inputClass} value={item.resistance.springs} onChange={(e) => setRes({ ...(item.resistance as Extract<Resistance, { kind: "pilates_springs" }>), springs: e.target.value })} />
          </Field>
          <Field label="Montagem" htmlFor={`pm-${id}`}>
            <input id={`pm-${id}`} className={inputClass} value={item.resistance.setup} onChange={(e) => setRes({ ...(item.resistance as Extract<Resistance, { kind: "pilates_springs" }>), setup: e.target.value })} />
          </Field>
        </>
      )}

      <Field label="Escala de esforço" htmlFor={`es-${id}`} hint="RPE: percepção de 0 a 10. RIR: repetições que ainda caberiam. São escalas diferentes.">
        <select id={`es-${id}`} className={inputClass} value={item.effort.scale} onChange={(e) => setEffort(e.target.value === "none" ? { scale: "none" } : ({ scale: e.target.value, target: null } as Effort))}>
          <option value="none">Não definir</option>
          <option value="rpe">RPE (0–10)</option>
          <option value="rir">RIR (repetições em reserva)</option>
        </select>
      </Field>
      {item.effort.scale !== "none" && (
        <Field label={item.effort.scale === "rpe" ? "RPE alvo" : "RIR alvo"} htmlFor={`et-${id}`}>
          <NumberInput id={`et-${id}`} min={0} max={10} step={0.5} value={item.effort.target} onChange={(v) => setEffort({ ...(item.effort as Extract<Effort, { target: number | null }>), target: v })} />
        </Field>
      )}
      <Field label="Descanso (s)" htmlFor={`rest-${id}`}>
        <NumberInput id={`rest-${id}`} min={0} max={600} value={item.restSeconds} onChange={(v) => onChange({ ...item, restSeconds: v })} />
      </Field>
      <Field label="Cadência" htmlFor={`tp-${id}`} hint="ex.: 3-1-1-0 (descida, pausa, subida, pausa)">
        <input id={`tp-${id}`} className={inputClass} value={item.tempo ?? ""} onChange={(e) => onChange({ ...item, tempo: e.target.value })} />
      </Field>
      <Field label="Sustentação (s)" htmlFor={`hd-${id}`} hint="Isometria ou pausa, quando houver.">
        <NumberInput id={`hd-${id}`} min={0} max={600} value={item.holdSeconds ?? null} onChange={(v) => onChange({ ...item, holdSeconds: v })} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Amplitude orientada" htmlFor={`rg-${id}`}>
          <input id={`rg-${id}`} className={inputClass} value={item.rangeNote} onChange={(e) => onChange({ ...item, rangeNote: e.target.value })} />
        </Field>
      </div>
      <div className="sm:col-span-2 lg:col-span-4">
        <Field label="Instruções de execução (visíveis ao aluno)" htmlFor={`cu-${id}`}>
          <textarea id={`cu-${id}`} className={ta} value={item.cues} onChange={(e) => onChange({ ...item, cues: e.target.value })} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Regressão" htmlFor={`re-${id}`}>
          <input id={`re-${id}`} className={inputClass} value={item.regression} onChange={(e) => onChange({ ...item, regression: e.target.value })} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Progressão" htmlFor={`pr-${id}`}>
          <input id={`pr-${id}`} className={inputClass} value={item.progression} onChange={(e) => onChange({ ...item, progression: e.target.value })} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Critérios individualizados de revisão" htmlFor={`rc-${id}`} hint="Definidos pelo professor para este aluno.">
          <textarea id={`rc-${id}`} className={ta} value={item.reviewCriteria} onChange={(e) => onChange({ ...item, reviewCriteria: e.target.value })} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Nota privada (não aparece ao aluno)" htmlFor={`pn-${id}`}>
          <textarea id={`pn-${id}`} className={ta} value={item.privateNote} onChange={(e) => onChange({ ...item, privateNote: e.target.value })} />
        </Field>
      </div>
      <RehabFields item={item} onChange={onChange} suggested={!!ex?.purposes.includes("reabilitacao")} />
      {ex && <p className="text-sm text-theme-muted sm:col-span-2 lg:col-span-4">{ex.precautions}</p>}
    </div>
  );
}

const REHAB_FIELDS: { key: keyof RehabContext; label: string; hint?: string }[] = [
  { key: "phase", label: "Fase do retorno ao exercício" },
  { key: "restrictions", label: "Restrições profissionais relevantes", hint: "Ex.: orientações de quem acompanha o caso." },
  { key: "toleratedRange", label: "Amplitude tolerada" },
  { key: "symptomsDuring", label: "Sintomas durante o exercício" },
  { key: "symptomsAfter", label: "Sintomas depois (até 24 h)" },
  { key: "progressionCriterion", label: "Critério para progredir" },
];

/** Contexto de retorno ao exercício. Aberto por padrão nas fichas com esse propósito; opcional nas demais. */
function RehabFields({ item, onChange, suggested }: { item: PrescribedExercise; onChange: (p: PrescribedExercise) => void; suggested: boolean }) {
  const r = item.rehab;
  if (!r) {
    return (
      <div className="sm:col-span-2 lg:col-span-4">
        <button type="button" onClick={() => onChange({ ...item, rehab: emptyRehab() })} className="text-sm font-semibold text-theme-teal underline">
          Adicionar contexto de retorno ao exercício
        </button>
      </div>
    );
  }
  return (
    <fieldset className="grid gap-4 rounded-control border border-theme-border p-3 sm:col-span-2 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-3">
      <legend className="px-1 text-sm font-semibold">Retorno ao exercício{suggested ? "" : " (opcional)"}</legend>
      {REHAB_FIELDS.map((f) => (
        <Field key={f.key} label={f.label} htmlFor={`rh-${f.key}-${item.id}`} hint={f.hint}>
          <input id={`rh-${f.key}-${item.id}`} className={inputClass} value={r[f.key]} onChange={(e) => onChange({ ...item, rehab: { ...r, [f.key]: e.target.value } })} />
        </Field>
      ))}
      {!suggested && (
        <button type="button" onClick={() => onChange({ ...item, rehab: undefined })} className="justify-self-start text-sm text-theme-muted underline">
          Remover este contexto
        </button>
      )}
    </fieldset>
  );
}

const PURPOSE_SHORT: Record<Exclude<PurposeFilter, "">, string> = { hipertrofia: "Hipertrofia", reabilitacao: "Reabilitação" };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Library({ onPick, replacing, inSession }: { onPick: (id: string) => void; replacing: boolean; inSession: Set<string> }) {
  const empty = { text: "", pattern: "" as MovementPattern | "", muscle: "", equipment: "", modality: "" as Modality | "", purpose: "" as PurposeFilter };
  const [q, setQ] = useState(empty);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const results = useMemo(() => searchExercises(q), [q]);
  const activeFilters = [q.pattern, q.modality, q.muscle, q.equipment].filter(Boolean).length;
  // Sem busca por texto, agrupa por padrão de movimento (ordem da curadoria); com busca, lista direta por relevância
  const groups = useMemo(() => {
    if (q.text.trim()) return [{ key: "", items: results }];
    const by = new Map<string, typeof results>();
    for (const e of results) by.set(e.pattern, [...(by.get(e.pattern) ?? []), e]);
    return PATTERNS.filter((p) => by.has(p)).map((p) => ({ key: p, items: by.get(p)! }));
  }, [results, q.text]);

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Propósito" className="grid grid-cols-3 gap-1 rounded-control border border-theme-border bg-theme-secondary p-1">
        {(["", "hipertrofia", "reabilitacao"] as PurposeFilter[]).map((p) => (
          <button
            key={p || "todos"}
            type="button"
            role="radio"
            aria-checked={q.purpose === p}
            title={p ? PURPOSE_LABEL[p] : "Todos os propósitos"}
            onClick={() => setQ({ ...q, purpose: p })}
            className={`min-h-[36px] rounded-lg px-1 text-[13px] font-semibold transition-colors ${q.purpose === p ? "bg-theme-raised text-theme-text shadow-subtle" : "text-theme-muted hover:text-theme-text"}`}
          >
            {p ? PURPOSE_SHORT[p] : "Todos"}
          </button>
        ))}
      </div>
      <div>
        <label className="sr-only" htmlFor="lib-q">Buscar exercício</label>
        <input id="lib-q" type="search" className={inputClass} value={q.text} onChange={(e) => setQ({ ...q, text: e.target.value })} placeholder="Buscar por nome ou músculo" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <button type="button" aria-expanded={filtersOpen} aria-controls="lib-filtros" onClick={() => setFiltersOpen((o) => !o)} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-control px-2 text-sm font-semibold hover:bg-theme-secondary">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Filtros{activeFilters > 0 && <span className="tabular rounded-full bg-theme-teal-subtle px-1.5 text-[12px] text-theme-text">{activeFilters}</span>}
          <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
        {(activeFilters > 0 || q.text || q.purpose) && (
          <button type="button" onClick={() => setQ(empty)} className="min-h-[36px] px-2 text-sm text-theme-muted underline hover:text-theme-text">Limpar</button>
        )}
      </div>
      {filtersOpen && (
        <div id="lib-filtros" className="grid gap-2">
          <Field label="Padrão de movimento" htmlFor="lib-p">
            <select id="lib-p" className={inputClass} value={q.pattern} onChange={(e) => setQ({ ...q, pattern: e.target.value as MovementPattern | "" })}>
              <option value="">Todos</option>
              {PATTERNS.map((p) => <option key={p} value={p}>{cap(p)}</option>)}
            </select>
          </Field>
          <Field label="Músculo" htmlFor="lib-g">
            <select id="lib-g" className={inputClass} value={q.muscle} onChange={(e) => setQ({ ...q, muscle: e.target.value })}>
              <option value="">Todos</option>
              {MUSCLE_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </Field>
          <Field label="Modalidade" htmlFor="lib-m">
            <select id="lib-m" className={inputClass} value={q.modality} onChange={(e) => setQ({ ...q, modality: e.target.value as Modality | "" })}>
              <option value="">Todas</option>
              {MODALITIES.map((p) => <option key={p} value={p}>{cap(p)}</option>)}
            </select>
          </Field>
          <Field label="Equipamento" htmlFor="lib-e">
            <select id="lib-e" className={inputClass} value={q.equipment} onChange={(e) => setQ({ ...q, equipment: e.target.value })}>
              <option value="">Todos</option>
              {EQUIPMENT.map((p) => <option key={p} value={p}>{cap(p)}</option>)}
            </select>
          </Field>
        </div>
      )}
      <p className="text-sm text-theme-muted" aria-live="polite">{results.length} exercício{results.length === 1 ? "" : "s"}</p>
      {results.length === 0 ? (
        <p className="rounded-control border border-dashed border-theme-border px-3 py-6 text-center text-sm text-theme-muted">Nenhum exercício com esses filtros.</p>
      ) : (
        <div className="max-h-[60vh] overflow-y-auto overscroll-contain rounded-control border border-theme-border">
          {groups.map((g) => (
            <section key={g.key || "busca"} aria-label={g.key ? cap(g.key) : "Resultados"}>
              {g.key && (
                <h3 className="sticky top-0 z-10 flex items-center justify-between border-b border-theme-border bg-theme-raised/95 px-3 py-1.5 text-[12px] font-bold uppercase tracking-wide text-theme-muted backdrop-blur">
                  {g.key}
                  <span className="tabular font-semibold">{g.items.length}</span>
                </h3>
              )}
              <ul className="divide-y divide-theme-border">
                {g.items.map((e) => (
                  <PickRow key={e.id} name={e.name} meta={e.primaryMuscles.join(", ")} onPick={() => onPick(e.id)} replacing={replacing} inSession={inSession.has(e.id)} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PlanEditor({ initial, assessment }: { initial: TrainingPlan; assessment: Assessment | null }) {
  const { repo, actor } = useData();
  const [plan, setPlan] = useState(initial);
  const v = latest(plan);
  // Rascunho da aba: se a página recarregou com alterações não salvas, elas voltam
  const draftKey = `treino:${initial.id}:${latest(initial).id}`;
  const [draftBase, setDraftBase] = useState(() => fingerprint(latest(initial).sessions));
  const [recovered] = useState(() => readTabDraft<TrainingSession[]>(draftKey, draftBase));
  const [sessions, setSessions] = useState<TrainingSession[]>(recovered ?? v.sessions);
  const [active, setActive] = useState(v.sessions[0]?.id ?? "");
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [replacing, setReplacing] = useState<string | null>(null);
  const [aside, setAside] = useState(true);
  const [status, setStatus] = useState<{ kind: "idle" | "dirty" | "saved" | "error"; msg?: string }>(recovered ? { kind: "dirty" } : { kind: "idle" });
  const [showRecovered, setShowRecovered] = useState(!!recovered);

  // Avisa antes de fechar ou recarregar com alterações não salvas
  useEffect(() => {
    if (status.kind !== "dirty") return;
    const onLeave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [status.kind]);
  const [mobileTab, setMobileTab] = useState<"sessao" | "biblioteca">("sessao");
  // Arrastar é só atalho: subir/descer por botões continua disponível (teclado e toque)
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const [libSource, setLibSource] = useState<"curadoria" | "catalogo">("curadoria");
  useCatalogHydration(sessions.flatMap((x) => x.items.map((i) => i.exerciseId)));

  const s = sessions.find((x) => x.id === active) ?? sessions[0];
  const mutate = (next: TrainingSession[]) => {
    setSessions(next);
    setStatus({ kind: "dirty" });
    writeTabDraft(draftKey, draftBase, next);
  };
  const discardRecovered = () => {
    clearTabDraft(draftKey);
    setSessions(v.sessions);
    setActive(v.sessions[0]?.id ?? "");
    setStatus({ kind: "idle" });
    setShowRecovered(false);
  };
  const setSession = (patch: Partial<TrainingSession>) => mutate(sessions.map((x) => (x.id === s.id ? { ...x, ...patch } : x)));

  const pick = (exerciseId: string) => {
    const ex = EXERCISE_BY_ID.get(exerciseId);
    if (!ex) return;
    if (replacing) {
      setSession({ items: s.items.map((it) => (it.id === replacing ? { ...defaultPrescription(ex), id: it.id } : it)) });
      setReplacing(null);
    } else {
      const item = defaultPrescription(ex);
      setSession({ items: [...s.items, item] });
      setOpenItem(item.id);
    }
    setMobileTab("sessao");
  };

  const save = async () => {
    try {
      const next = updateDraft(plan, actor, sessions);
      const r = await repo.savePlan(actor, next);
      setPlan(next);
      // Salvo no servidor: o rascunho da aba passa a ter como origem o que acabou de ser salvo
      clearTabDraft(draftKey);
      setDraftBase(fingerprint(sessions));
      setShowRecovered(false);
      setStatus({ kind: "saved", msg: new Date(r.savedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) + (r.target === "supabase" ? " no servidor" : " neste navegador (demonstração)") });
    } catch (e) {
      setStatus({ kind: "error", msg: (e as Error).message });
    }
  };

  const inSession = useMemo(() => new Set(s?.items.map((i) => i.exerciseId) ?? []), [s]);
  const est = s ? estimateMinutes(s) : null;
  const triage = assessment ? evaluateTriage(assessment.blocks.safety) : null;

  if (v.status !== "draft") {
    return (
      <Panel className="p-6">
        <p className="font-semibold">A versão {v.number} já foi {v.status === "published" ? "disponibilizada" : "aprovada"} e não pode ser editada.</p>
        <p className="mt-1 text-theme-muted">Para mudar o treino, crie uma nova versão na página do treino.</p>
        <ButtonLink className="mt-4" href={`/app/treinos/${plan.id}`} variant="secondary">Voltar ao treino</ButtonLink>
      </Panel>
    );
  }

  const library = (
    <Panel as="aside" className="p-4">
      <h2 className="mb-3 font-bold">{replacing ? "Escolha o substituto" : "Biblioteca"}</h2>
      {replacing && (
        <button type="button" className="mb-3 text-sm font-semibold underline" onClick={() => setReplacing(null)}>Cancelar substituição</button>
      )}
      <div role="tablist" aria-label="Origem dos exercícios" className="glass-soft mb-3 grid grid-cols-2 gap-1 rounded-control border border-theme-border bg-theme-secondary p-1">
        {([["curadoria", "Curadoria"], ["catalogo", "Catálogo ampliado"]] as const).map(([k, l]) => (
          <button key={k} role="tab" type="button" aria-selected={libSource === k} onClick={() => setLibSource(k)} className={`min-h-[36px] rounded-lg px-2 text-sm font-semibold ${libSource === k ? "bg-theme-raised shadow-subtle" : "text-theme-muted"}`}>
            {l}
          </button>
        ))}
      </div>
      {libSource === "curadoria" ? <Library onPick={pick} replacing={!!replacing} inSession={inSession} /> : <CatalogPicker onPick={pick} replacing={!!replacing} inSession={inSession} />}
    </Panel>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="caution">Rascunho v{v.number}</Badge>
          {v.manualDraft && <Badge>Rascunho manual: não é sugestão individualizada validada</Badge>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span role="status" aria-live="polite" className="text-sm">
            {status.kind === "dirty" && <span className="text-theme-muted">Alterações não salvas</span>}
            {status.kind === "saved" && <span className="text-status-success-fg">Salvo às {status.msg}</span>}
            {status.kind === "error" && <span className="text-status-danger-fg">Não salvo: {status.msg}</span>}
          </span>
          <Button onClick={save} disabled={status.kind !== "dirty"}>Salvar rascunho</Button>
          <ButtonLink variant="secondary" href={`/app/treinos/${plan.id}`}>Revisar e aprovar</ButtonLink>
        </div>
      </div>

      {showRecovered && (
        <InfoNote>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>Recuperamos as alterações que você ainda não tinha salvado nesta aba.</span>
            <button type="button" onClick={discardRecovered} className="font-semibold underline">Descartar e voltar ao salvo</button>
          </span>
        </InfoNote>
      )}

      {/* Mobile: alterna entre sessão e biblioteca */}
      <div role="tablist" aria-label="Área de edição" className="glass-soft inline-flex rounded-control border border-theme-border bg-theme-secondary p-1 md:hidden">
        {(["sessao", "biblioteca"] as const).map((t) => (
          <button key={t} role="tab" type="button" aria-selected={mobileTab === t} onClick={() => setMobileTab(t)} className={`min-h-[40px] rounded-lg px-4 text-sm font-semibold ${mobileTab === t ? "bg-theme-raised shadow-subtle" : "text-theme-muted"}`}>
            {t === "sessao" ? "Sessão" : "Biblioteca"}
          </button>
        ))}
      </div>

      <div className={`grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] ${aside ? "xl:grid-cols-[340px_minmax(0,1fr)_260px]" : "xl:grid-cols-[360px_minmax(0,1fr)]"}`}>
        <div className={mobileTab === "biblioteca" ? "block" : "hidden md:block"}>{library}</div>

        <section className={`min-w-0 space-y-4 ${mobileTab === "sessao" ? "block" : "hidden md:block"}`} aria-label="Sessões do treino">
          <div className="flex flex-wrap items-center gap-2">
            <div role="tablist" aria-label="Sessões" className="flex flex-wrap gap-1">
              {sessions.map((x) => (
                <button key={x.id} role="tab" type="button" aria-selected={x.id === s.id} onClick={() => setActive(x.id)} className={`min-h-[40px] rounded-control border px-3 text-sm font-semibold ${x.id === s.id ? "border-theme-teal bg-theme-teal-subtle" : "border-theme-border"}`}>
                  Sessão {x.name}
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                const n: TrainingSession = { id: newId("ss"), name: String.fromCharCode(65 + sessions.length), items: [] };
                mutate([...sessions, n]);
                setActive(n.id);
              }}
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Nova sessão
            </Button>
          </div>

          {s && (
            <Panel className="p-4 sm:p-5">
              <div className="flex flex-wrap items-end gap-2 border-b border-theme-border pb-4">
                <div className="w-40">
                  <Field label="Nome da sessão" htmlFor="sn">
                    <input id="sn" className={inputClass} value={s.name} onChange={(e) => setSession({ name: e.target.value })} />
                  </Field>
                </div>
                <Button variant="ghost" onClick={() => { const c = { ...JSON.parse(JSON.stringify(s)), id: newId("ss"), name: `${s.name} (cópia)` } as TrainingSession; c.items = c.items.map((i) => ({ ...i, id: newId("px") })); mutate([...sessions, c]); setActive(c.id); }}>
                  <Copy className="h-4 w-4" aria-hidden="true" /> Duplicar
                </Button>
                <Button variant="ghost" aria-label="Mover sessão para a esquerda" onClick={() => mutate(move(sessions, sessions.indexOf(s), -1))}><ArrowUp className="h-4 w-4 -rotate-90" /></Button>
                <Button variant="ghost" aria-label="Mover sessão para a direita" onClick={() => mutate(move(sessions, sessions.indexOf(s), 1))}><ArrowDown className="h-4 w-4 -rotate-90" /></Button>
                {sessions.length > 1 && (
                  <Button variant="ghost" onClick={() => { const rest = sessions.filter((x) => x.id !== s.id); mutate(rest); setActive(rest[0].id); }}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" /> Remover sessão
                  </Button>
                )}
              </div>

              {s.items.length === 0 ? (
                <p className="py-8 text-center text-theme-muted">Sessão vazia. Adicione exercícios pela biblioteca.</p>
              ) : (
                <ol className="divide-y divide-theme-border">
                  {s.items.map((it, i) => {
                    const name = itemName(it);
                    const open = openItem === it.id;
                    return (
                      <li
                        key={it.id}
                        draggable
                        onDragStart={(e) => {
                          setDragFrom(i);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragOver={(e) => {
                          if (dragFrom === null) return;
                          e.preventDefault();
                          setDragOver(i);
                        }}
                        onDragEnd={() => {
                          setDragFrom(null);
                          setDragOver(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragFrom !== null && dragFrom !== i) {
                            const items = [...s.items];
                            const [moved] = items.splice(dragFrom, 1);
                            items.splice(i, 0, moved);
                            setSession({ items });
                          }
                          setDragFrom(null);
                          setDragOver(null);
                        }}
                        className={`py-3 transition-colors ${dragOver === i && dragFrom !== i ? "bg-theme-teal-subtle/60" : ""} ${dragFrom === i ? "opacity-50" : ""}`}
                      >
                        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                          <span className="tabular w-6 cursor-grab text-sm font-bold text-theme-muted" title="Arraste para reordenar ou use as setas">{i + 1}</span>
                          <button type="button" aria-expanded={open} onClick={() => setOpenItem(open ? null : it.id)} className="min-h-[44px] min-w-0 flex-1 py-1 text-left">
                            <span className="block font-semibold leading-snug">{name}</span>
                            <span className="tabular block whitespace-nowrap text-sm text-theme-muted">
                              {it.dose.kind === "reps" ? `${it.dose.sets} × ${it.dose.repsMin}–${it.dose.repsMax}` : it.dose.kind === "time" ? `${it.dose.sets} × ${it.dose.seconds} s` : `${it.dose.sets} × ${it.dose.meters} m`}
                            </span>
                          </button>
                          <div className="flex gap-1">
                            <button type="button" aria-label={`Subir ${name}`} disabled={i === 0} onClick={() => setSession({ items: move(s.items, i, -1) })} className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-theme-border disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                            <button type="button" aria-label={`Descer ${name}`} disabled={i === s.items.length - 1} onClick={() => setSession({ items: move(s.items, i, 1) })} className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-theme-border disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                            <button type="button" aria-label={`Substituir ${name}`} onClick={() => { setReplacing(it.id); setMobileTab("biblioteca"); }} className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-theme-border"><Repeat2 className="h-4 w-4" /></button>
                            <button type="button" aria-label={`Remover ${name}`} onClick={() => {
                              if (window.confirm(`Remover ${name} desta sessão? A remoção só vale depois de salvar o rascunho; versões aprovadas continuam no histórico.`)) setSession({ items: s.items.filter((x) => x.id !== it.id) });
                            }} className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-theme-border hover:text-status-danger-fg"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </div>
                        {replacing === it.id && <p className="ml-8 mt-1 text-sm text-theme-teal">Escolha o substituto na biblioteca.</p>}
                        {open && <PrescriptionEditor item={it} assessment={assessment} onChange={(p) => setSession({ items: s.items.map((x) => (x.id === it.id ? p : x)) })} />}
                      </li>
                    );
                  })}
                </ol>
              )}
              {est && s.items.length > 0 && (
                <p className="mt-3 border-t border-theme-border pt-3 text-sm text-theme-muted">
                  <strong className="tabular text-theme-text">≈ {est.minutes} min</strong> — {est.basis}
                </p>
              )}
            </Panel>
          )}
        </section>

        {/* Resumo da avaliação (recolhível no desktop amplo) */}
        <div className="hidden xl:block">
          {aside ? (
            <Panel as="aside" className="space-y-3 p-4 text-[15px]">
              <div className="flex items-center justify-between">
                <h2 className="font-bold">Avaliação de origem</h2>
                <button type="button" aria-label="Recolher resumo" onClick={() => setAside(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-control hover:bg-theme-secondary"><PanelRightClose className="h-4 w-4" /></button>
              </div>
              {assessment ? (
                <>
                  <p>{assessment.blocks.essentials.goal || "Objetivo não informado"}</p>
                  <p className="text-sm text-theme-muted">Triagem: {triage?.note}</p>
                  <div>
                    <p className="text-sm font-semibold">Sintomas</p>
                    {assessment.blocks.complaint.symptoms.length ? (
                      <ul className="text-sm">{assessment.blocks.complaint.symptoms.map((x) => <li key={x.regionId}>{regionLabel(x.regionId)}: {x.intensity === null ? "não informado" : `${x.intensity}/10`}</li>)}</ul>
                    ) : (
                      <p className="text-sm text-theme-muted">Nenhum registrado.</p>
                    )}
                  </div>
                  {assessment.blocks.synthesis.pending.filter((p) => p.trim()).length > 0 && (
                    <div>
                      <p className="text-sm font-semibold">Pendências</p>
                      <ul className="list-disc pl-4 text-sm">{assessment.blocks.synthesis.pending.filter((p) => p.trim()).map((p) => <li key={p}>{p}</li>)}</ul>
                    </div>
                  )}
                  <Link href={`/app/avaliacoes/${assessment.id}`} className="text-sm font-semibold text-theme-teal underline">Abrir avaliação v{assessment.version}</Link>
                </>
              ) : (
                <p className="text-theme-muted">Sem avaliação vinculada.</p>
              )}
            </Panel>
          ) : (
            <button type="button" aria-label="Mostrar resumo da avaliação" onClick={() => setAside(true)} className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-theme-border"><PanelRightOpen className="h-4 w-4" /></button>
          )}
        </div>
      </div>
      {status.kind === "error" && <ErrorNote>{status.msg}</ErrorNote>}
    </div>
  );
}
