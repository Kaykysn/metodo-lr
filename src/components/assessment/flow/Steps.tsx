"use client";

import React from "react";
import { Trash2, Plus } from "lucide-react";
import type { AssessmentBlocks, FunctionalTest, SymptomEntry, SymptomQuality } from "@/lib/domain/types";
import { TRIAGE_QUESTIONS } from "@/lib/domain/triage";
import { Field, inputClass, InfoNote } from "@/components/ui/primitives";
import { AnswerControl, NumberInput } from "./controls";
import AnatomyMap, { regionLabel } from "../AnatomyMap";
import { newId } from "@/lib/domain/plans";

type Patch<K extends keyof AssessmentBlocks> = (p: Partial<AssessmentBlocks[K]>) => void;
const ta = `${inputClass} min-h-[88px] py-2`;

// ---------------------------------------------------------------------------
export function StepEssentials({ b, set, ro }: { b: AssessmentBlocks["essentials"]; set: Patch<"essentials">; ro: boolean }) {
  const EQUIP = ["halteres", "kettlebell", "elástico", "máquinas de academia", "polia", "barra", "banco", "step", "Reformer", "Chair", "bicicleta ergométrica"];
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="md:col-span-2">
        <Field label="Objetivo principal" htmlFor="goal" required hint="Nas palavras do aluno, se possível.">
          <input id="goal" className={inputClass} value={b.goal} disabled={ro} onChange={(e) => set({ goal: e.target.value })} />
        </Field>
      </div>
      <Field label="Experiência com treino" htmlFor="exp" required>
        <select id="exp" className={inputClass} value={b.experience} disabled={ro} onChange={(e) => set({ experience: e.target.value as typeof b.experience })}>
          <option value="nao_informado">Não informado</option>
          <option value="iniciante">Iniciante</option>
          <option value="intermediario">Intermediário</option>
          <option value="avancado">Avançado</option>
        </select>
      </Field>
      <Field label="Sessões possíveis por semana" htmlFor="avail" required>
        <NumberInput id="avail" min={1} max={14} value={b.weeklyAvailability} disabled={ro} onChange={(v) => set({ weeklyAvailability: v })} />
      </Field>
      <Field label="Duração disponível por sessão (min)" htmlFor="mins">
        <NumberInput id="mins" min={10} max={240} value={b.sessionMinutes} disabled={ro} onChange={(v) => set({ sessionMinutes: v })} />
      </Field>
      <fieldset className="md:col-span-2">
        <legend className="mb-2 text-sm font-semibold">Equipamentos disponíveis <span className="font-normal text-theme-muted">(opcional)</span></legend>
        <div className="flex flex-wrap gap-2">
          {EQUIP.map((e) => {
            const on = b.equipment.includes(e);
            return (
              <label key={e} className={`inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-full border px-3 text-sm ${on ? "border-theme-teal bg-theme-teal-subtle" : "border-theme-border bg-theme-raised text-theme-muted"}`}>
                <input type="checkbox" className="sr-only" checked={on} disabled={ro} onChange={() => set({ equipment: on ? b.equipment.filter((x) => x !== e) : [...b.equipment, e] })} />
                {e}
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="md:col-span-2">
        <Field label="Rotina e atividades atuais" htmlFor="routine" hint="Trabalho, deslocamentos, esportes e sono: o que ajudar a planejar.">
          <textarea id="routine" className={ta} value={b.routine} disabled={ro} onChange={(e) => set({ routine: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function StepSafety({ b, set, ro }: { b: AssessmentBlocks["safety"]; set: Patch<"safety">; ro: boolean }) {
  return (
    <div className="space-y-6">
      <InfoNote>
        Responda cada pergunta. “Sem resposta” não equivale a “Não”. Um “Sim” bloqueia sugestões automáticas e mostra a orientação adequada.
      </InfoNote>
      <div className="space-y-5">
        {TRIAGE_QUESTIONS.map((q) => (
          <div key={q.id} className="border-b border-theme-border pb-5 last:border-0">
            <AnswerControl id={`tq-${q.id}`} legend={q.text} help={q.help} value={b.answers[q.id]} disabled={ro} allowNA={false} onChange={(a) => set({ answers: { ...b.answers, [q.id]: a } })} />
            {(b.answers[q.id]?.state === "yes") && (
              <p role="alert" className={`mt-3 rounded-control border p-3 text-[15px] font-medium ${q.severity === "urgent" ? "border-status-danger-border bg-status-danger-bg text-status-danger-fg" : "border-status-caution-border bg-status-caution-bg text-status-caution-fg"}`}>
                {q.guidance}
              </p>
            )}
          </div>
        ))}
      </div>
      <AnswerControl id="pregnancy" legend="Gestação ou pós-parto recente?" value={b.pregnancy} disabled={ro} onChange={(a) => set({ pregnancy: a })} />
      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Histórico de saúde relevante" htmlFor="hist">
          <textarea id="hist" className={ta} value={b.history} disabled={ro} onChange={(e) => set({ history: e.target.value })} />
        </Field>
        <Field label="Medicamentos de uso contínuo" htmlFor="meds">
          <textarea id="meds" className={ta} value={b.medications} disabled={ro} onChange={(e) => set({ medications: e.target.value })} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Cirurgias e datas" htmlFor="surg" hint="Pós-operatório exige protocolo e liberação específicos.">
            <textarea id="surg" className={ta} value={b.surgeries} disabled={ro} onChange={(e) => set({ surgeries: e.target.value })} />
          </Field>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
const QUALITIES: { v: SymptomQuality; l: string }[] = [
  { v: "dor", l: "Dor" },
  { v: "rigidez", l: "Rigidez" },
  { v: "formigamento", l: "Formigamento" },
  { v: "queimacao", l: "Queimação" },
  { v: "fraqueza", l: "Fraqueza" },
  { v: "cansaco", l: "Cansaço" },
  { v: "outro", l: "Outro" },
];

function emptySymptom(regionId: string): SymptomEntry {
  return { regionId, intensity: null, quality: null, onset: "", frequency: "nao_informado", radiates: { state: "unanswered" }, aggravating: "", easing: "", note: "" };
}

export function StepComplaint({ b, set, ro }: { b: AssessmentBlocks["complaint"]; set: Patch<"complaint">; ro: boolean }) {
  const toggle = (id: string) => {
    const on = b.selectedRegions.includes(id);
    set({
      selectedRegions: on ? b.selectedRegions.filter((x) => x !== id) : [...b.selectedRegions, id],
      symptoms: on ? b.symptoms.filter((s) => s.regionId !== id) : [...b.symptoms, emptySymptom(id)],
    });
  };
  const upd = (id: string, p: Partial<SymptomEntry>) => set({ symptoms: b.symptoms.map((s) => (s.regionId === id ? { ...s, ...p } : s)) });

  return (
    <div className="space-y-6">
      <AnswerControl id="hasComplaint" legend="Há alguma queixa ou sintoma atual?" value={b.hasComplaint} disabled={ro} allowNA={false} onChange={(a) => set({ hasComplaint: a })} />
      <AnswerControl
        id="lbpRecovered"
        legend="Recuperou-se recentemente de um episódio de dor lombar sem causa específica?"
        help="Contexto usado apenas para apresentar a opção de caminhada progressiva com educação."
        value={b.lbpRecovered}
        disabled={ro}
        onChange={(a) => set({ lbpRecovered: a })}
      />
      <Field label="Resumo da queixa" htmlFor="summary">
        <textarea id="summary" className={ta} value={b.summary} disabled={ro} onChange={(e) => set({ summary: e.target.value })} />
      </Field>

      <section aria-labelledby="mapa-titulo" className="space-y-3">
        <h3 id="mapa-titulo" className="text-base font-bold">Mapa corporal</h3>
        <p className="text-sm text-theme-muted">
          Marque onde o aluno relata o sintoma. Selecionar uma região não significa lesão, e dor localizada não identifica sozinha tecido ou diagnóstico.
        </p>
        <AnatomyMap
          selected={b.selectedRegions}
          symptoms={b.symptoms}
          freeMarks={b.freeMarks}
          readOnly={ro}
          onToggleRegion={toggle}
          onAddFreeMark={(m) => set({ freeMarks: [...b.freeMarks, { ...m, id: newId("fm"), note: "" }] })}
        />
      </section>

      {b.symptoms.length > 0 && (
        <section aria-labelledby="sint-titulo" className="space-y-4">
          <h3 id="sint-titulo" className="text-base font-bold">Detalhes por região</h3>
          {b.symptoms.map((s) => (
            <article key={s.regionId} className="rounded-panel border border-theme-border bg-theme-raised p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h4 className="font-semibold">{regionLabel(s.regionId)}</h4>
                {!ro && (
                  <button type="button" onClick={() => toggle(s.regionId)} className="inline-flex min-h-[40px] items-center gap-1 text-sm text-theme-muted hover:text-status-danger-fg">
                    <Trash2 className="h-4 w-4" aria-hidden="true" /> Remover
                  </button>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Intensidade (0–10)" htmlFor={`int-${s.regionId}`} hint="Deixe vazio se não foi informada (vazio ≠ 0).">
                  <NumberInput id={`int-${s.regionId}`} min={0} max={10} value={s.intensity} disabled={ro} onChange={(v) => upd(s.regionId, { intensity: v })} />
                </Field>
                <Field label="Como descreve" htmlFor={`q-${s.regionId}`}>
                  <select id={`q-${s.regionId}`} className={inputClass} value={s.quality ?? ""} disabled={ro} onChange={(e) => upd(s.regionId, { quality: (e.target.value || null) as SymptomQuality | null })}>
                    <option value="">Não informado</option>
                    {QUALITIES.map((q) => <option key={q.v} value={q.v}>{q.l}</option>)}
                  </select>
                </Field>
                <Field label="Frequência" htmlFor={`f-${s.regionId}`}>
                  <select id={`f-${s.regionId}`} className={inputClass} value={s.frequency} disabled={ro} onChange={(e) => upd(s.regionId, { frequency: e.target.value as SymptomEntry["frequency"] })}>
                    <option value="nao_informado">Não informado</option>
                    <option value="constante">Constante</option>
                    <option value="intermitente">Intermitente</option>
                    <option value="aos_esforcos">Aos esforços</option>
                  </select>
                </Field>
                <Field label="Início / duração" htmlFor={`o-${s.regionId}`}>
                  <input id={`o-${s.regionId}`} className={inputClass} value={s.onset} disabled={ro} onChange={(e) => upd(s.regionId, { onset: e.target.value })} placeholder="ex.: há 3 semanas" />
                </Field>
                <Field label="O que piora" htmlFor={`ag-${s.regionId}`}>
                  <input id={`ag-${s.regionId}`} className={inputClass} value={s.aggravating} disabled={ro} onChange={(e) => upd(s.regionId, { aggravating: e.target.value })} />
                </Field>
                <Field label="O que alivia" htmlFor={`ea-${s.regionId}`}>
                  <input id={`ea-${s.regionId}`} className={inputClass} value={s.easing} disabled={ro} onChange={(e) => upd(s.regionId, { easing: e.target.value })} />
                </Field>
                <div className="md:col-span-3">
                  <AnswerControl id={`rad-${s.regionId}`} legend="O sintoma se espalha (irradia) para outra região?" value={s.radiates} disabled={ro} onChange={(a) => upd(s.regionId, { radiates: a })} />
                  {s.radiates.state === "yes" && (
                    <p role="alert" className="mt-2 rounded-control border border-status-caution-border bg-status-caution-bg p-3 text-[15px] text-status-caution-fg">
                      Sintoma irradiado: o sistema não gera treino automaticamente. Indique avaliação apropriada.
                    </p>
                  )}
                </div>
                <div className="md:col-span-3">
                  <Field label="Observação" htmlFor={`n-${s.regionId}`}>
                    <input id={`n-${s.regionId}`} className={inputClass} value={s.note} disabled={ro} onChange={(e) => upd(s.regionId, { note: e.target.value })} />
                  </Field>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {b.freeMarks.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-base font-bold">Marcações livres</h3>
          {b.freeMarks.map((m, i) => (
            <div key={m.id} className="flex items-center gap-2">
              <span className="w-6 text-center font-bold text-symptom">{i + 1}</span>
              <label className="sr-only" htmlFor={`fm-${m.id}`}>Descrição da marcação {i + 1}</label>
              <input id={`fm-${m.id}`} className={inputClass} placeholder="Descreva o ponto marcado" value={m.note} disabled={ro} onChange={(e) => set({ freeMarks: b.freeMarks.map((x) => (x.id === m.id ? { ...x, note: e.target.value } : x)) })} />
              {!ro && (
                <button type="button" aria-label={`Remover marcação ${i + 1}`} onClick={() => set({ freeMarks: b.freeMarks.filter((x) => x.id !== m.id) })} className="inline-flex h-11 w-11 items-center justify-center rounded-control border border-theme-border">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Sono" htmlFor="sleep">
          <input id="sleep" className={inputClass} value={b.sleep} disabled={ro} onChange={(e) => set({ sleep: e.target.value })} />
        </Field>
        <Field label="Atividades relevantes" htmlFor="acts">
          <input id="acts" className={inputClass} value={b.relevantActivities} disabled={ro} onChange={(e) => set({ relevantActivities: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function StepFunctional({ b, set, ro, date }: { b: AssessmentBlocks["functional"]; set: Patch<"functional">; ro: boolean; date: string }) {
  const add = () => set({ tests: [...b.tests, { id: newId("ft"), name: "", value: null, unit: "", date, note: "" }] });
  const upd = (id: string, p: Partial<FunctionalTest>) => set({ tests: b.tests.map((t) => (t.id === id ? { ...t, ...p } : t)) });
  return (
    <div className="space-y-6">
      <AnswerControl id="sts" legend="Dificuldade para sentar e levantar?" help="Observado ou relatado. Não é diagnóstico." value={b.sitToStandDifficulty} disabled={ro} onChange={(a) => set({ sitToStandDifficulty: a })} />
      <section className="space-y-3">
        <h3 className="text-base font-bold">Testes e medidas registrados</h3>
        <p className="text-sm text-theme-muted">Registre só o que foi medido, com unidade e data. Teste não realizado não entra como zero.</p>
        {b.tests.length === 0 && <p className="text-[15px] italic text-theme-subtle">Nenhum teste registrado.</p>}
        {b.tests.map((t) => (
          <div key={t.id} className="grid gap-3 rounded-panel border border-theme-border bg-theme-raised p-4 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-end">
            <Field label="Teste" htmlFor={`tn-${t.id}`} required>
              <input id={`tn-${t.id}`} className={inputClass} value={t.name} disabled={ro} onChange={(e) => upd(t.id, { name: e.target.value })} />
            </Field>
            <Field label="Resultado" htmlFor={`tv-${t.id}`} required>
              <NumberInput id={`tv-${t.id}`} value={t.value} step={0.1} disabled={ro} onChange={(v) => upd(t.id, { value: v })} />
            </Field>
            <Field label="Unidade" htmlFor={`tu-${t.id}`} required>
              <input id={`tu-${t.id}`} className={inputClass} value={t.unit} disabled={ro} onChange={(e) => upd(t.id, { unit: e.target.value })} placeholder="repetições, s, cm" />
            </Field>
            <Field label="Data" htmlFor={`td-${t.id}`} required>
              <input id={`td-${t.id}`} type="date" className={inputClass} value={t.date} disabled={ro} onChange={(e) => upd(t.id, { date: e.target.value })} />
            </Field>
            {!ro && (
              <button type="button" aria-label="Remover teste" onClick={() => set({ tests: b.tests.filter((x) => x.id !== t.id) })} className="inline-flex h-11 w-11 items-center justify-center rounded-control border border-theme-border">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {!ro && (
          <button type="button" onClick={add} className="inline-flex min-h-[44px] items-center gap-2 rounded-control border border-theme-boundary/60 px-4 text-sm font-semibold">
            <Plus className="h-4 w-4" aria-hidden="true" /> Adicionar teste
          </button>
        )}
      </section>
      <Field label="Observações da avaliação funcional" htmlFor="fobs">
        <textarea id="fobs" className={ta} value={b.observations} disabled={ro} onChange={(e) => set({ observations: e.target.value })} />
      </Field>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function StepSynthesis({ b, set, ro }: { b: AssessmentBlocks["synthesis"]; set: Patch<"synthesis">; ro: boolean }) {
  return (
    <div className="grid gap-6">
      <Field label="Metas definidas com o aluno" htmlFor="goals" hint="Uma por linha.">
        <textarea id="goals" className={ta} value={b.goals.join("\n")} disabled={ro} onChange={(e) => set({ goals: e.target.value.split("\n") })} />
      </Field>
      <Field label="Limitações relatadas" htmlFor="lims">
        <textarea id="lims" className={ta} value={b.limitations} disabled={ro} onChange={(e) => set({ limitations: e.target.value })} />
      </Field>
      <Field label="Próximos passos" htmlFor="next">
        <textarea id="next" className={ta} value={b.nextSteps} disabled={ro} onChange={(e) => set({ nextSteps: e.target.value })} />
      </Field>
      <Field label="Informações ainda pendentes" htmlFor="pend" hint="Uma por linha. Aparecem na revisão e no treino.">
        <textarea id="pend" className={ta} value={b.pending.join("\n")} disabled={ro} onChange={(e) => set({ pending: e.target.value.split("\n") })} />
      </Field>
    </div>
  );
}
