"use client";

import React, { useRef, useState } from "react";
import { useStageTransition } from "@/components/motion/StageTransition";
import Link from "next/link";
import {
  STAGES_LIST,
  AssessmentRecord,
  DEMO_ASSESSMENT_FIXTURE,
  TOOLS_CATALOG,
  GLOSSARY_ITEMS,
} from "@/lib/assessment-fixtures";
import BodyMap from "./BodyMap";
import {
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  HelpCircle,
  Video,
  Save,
  CheckCircle2,
  FileText,
  Activity,
  Layers,
  BookOpen,
  Calendar,
  AlertTriangle,
  Search,
  Lock,
} from "lucide-react";

interface GuidedAssessmentWorkflowProps {
  initialAssessment?: AssessmentRecord;
  isDemo?: boolean;
  onSave?: (assessment: AssessmentRecord) => void;
}

export default function GuidedAssessmentWorkflow({
  initialAssessment = DEMO_ASSESSMENT_FIXTURE,
  isDemo = true,
  onSave,
}: GuidedAssessmentWorkflowProps) {
  const [assessment, setAssessment] = useState<AssessmentRecord>(initialAssessment);
  const [currentStageIndex, setCurrentStageIndex] = useState<number>(initialAssessment.currentStage || 0);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [glossarySearch, setGlossarySearch] = useState<string>("");

  const currentStageDef = STAGES_LIST[currentStageIndex] || STAGES_LIST[0];

  const stagePanelRef = useStageTransition<HTMLDivElement>(currentStageIndex);
  const stageHeadingRef = useRef<HTMLHeadingElement | null>(null);

  // Troca de etapa: rola ao topo do fluxo (respeitando movimento reduzido) e leva o foco ao título
  const goToStage = (idx: number) => {
    setCurrentStageIndex(idx);
    setSaveStatus("idle");
    requestAnimationFrame(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      stageHeadingRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      stageHeadingRef.current?.focus({ preventScroll: true });
    });
  };

  const handleNext = () => {
    if (currentStageIndex < STAGES_LIST.length - 1) goToStage(currentStageIndex + 1);
  };

  const handlePrev = () => {
    if (currentStageIndex > 0) goToStage(currentStageIndex - 1);
  };

  // Sem atraso artificial: os dados ficam no estado da página (não há envio a servidor aqui)
  const handleTriggerSave = () => {
    if (onSave) onSave(assessment);
    setSaveStatus("saved");
  };

  // Rótulo honesto sobre onde os dados estão
  const saveLabel = () => {
    if (saveStatus === "saved") {
      return isDemo
        ? "Etapa guardada nesta demonstração (não vai para a nuvem)"
        : "Etapa guardada nesta sessão do navegador (sem envio ao servidor)";
    }
    return isDemo ? "Demonstração: nada é enviado à nuvem" : "Alterações ainda não guardadas";
  };

  return (
    <div className="space-y-6">
      {/* Barra de Progresso e Navegação Superior */}
      <div className="bg-theme-primary rounded-2xl border border-theme-border p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-theme-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-theme-secondary text-theme-text">
                {assessment.patientCode}
              </span>
              <span className="text-xs text-theme-muted">
                Iniciais: <strong>{assessment.patientInitials}</strong> • {assessment.painRegion}
              </span>
            </div>
            <h2
              ref={stageHeadingRef}
              tabIndex={-1}
              className="text-lg sm:text-xl font-bold text-theme-text mt-1 scroll-mt-24 focus:outline-none"
            >
              {currentStageDef.title}
            </h2>
          </div>

          {/* Indicador Honesto de Salvamento */}
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <div className="flex items-center gap-1.5 text-xs text-theme-muted" role="status" aria-live="polite">
              {saveStatus === "saved" ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-status-success-fg" aria-hidden="true" />
              ) : (
                <Save className="w-3.5 h-3.5 text-theme-subtle" aria-hidden="true" />
              )}
              <span>{saveLabel()}</span>
            </div>
            <button
              type="button"
              onClick={handleTriggerSave}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-inverse hover:bg-inverse-hover text-inverse-fg transition-colors"
            >
              Salvar etapa
            </button>
          </div>
        </div>

        {/* Régua de Progresso das 11 Etapas */}
        <div className="pt-4">
          <div className="flex items-center justify-between text-xs text-theme-muted mb-2">
            <span>Progresso Clínico: Etapa {currentStageIndex + 1} de {STAGES_LIST.length}</span>
            <span>{Math.round(((currentStageIndex + 1) / STAGES_LIST.length) * 100)}% concluído</span>
          </div>
          <div className="w-full bg-theme-secondary h-2 rounded-full overflow-hidden">
            <div
              className="bg-brand-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${((currentStageIndex + 1) / STAGES_LIST.length) * 100}%` }}
            />
          </div>

          {/* Abas Rápidas de Seleção de Etapa */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-3 pb-1">
            {STAGES_LIST.map((stage, idx) => (
              <button
                key={stage.id}
                type="button"
                onClick={() => goToStage(idx)}
                aria-current={idx === currentStageIndex ? "step" : undefined}
                className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  idx === currentStageIndex
                    ? "bg-inverse text-inverse-fg font-bold"
                    : idx < currentStageIndex
                    ? "bg-status-success-bg text-status-success-fg border border-status-success-border"
                    : "bg-theme-secondary text-theme-muted hover:text-theme-text"
                }`}
              >
                {stage.id}. {stage.title.split(". ")[1] || stage.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerta Persistente se Sinais de Alerta forem detectados */}
      {assessment.redFlags.overallStatus === "alert_present" && (
        <div
          role="alert"
          className="bg-status-danger-bg border border-status-danger-border p-4 rounded-xl flex items-start gap-3 text-sm text-status-danger-fg shadow-sm"
        >
          <ShieldAlert className="w-5 h-5 text-status-danger-fg flex-shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold">Atenção Clínica Prioritária: Suspeita de Red Flag</strong>
            <p className="text-xs text-status-danger-fg mt-0.5">
              Há indícios que demandam investigação médica e interrupção de manobras de sobrecarga física até liberação formal.
            </p>
          </div>
        </div>
      )}

      {/* Conteúdo Dinâmico da Etapa Atual (transição sem remontar o formulário) */}
      <div ref={stagePanelRef} className="bg-theme-primary rounded-2xl border border-theme-border p-6 sm:p-8 shadow-sm">
        {/* ============================================================================== */}
        {/* ETAPA 0: INÍCIO E CONTEXTO */}
        {/* ============================================================================== */}
        {currentStageIndex === 0 && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-theme-secondary/70 border border-theme-border flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-theme-text flex-shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-theme-text">
                <strong>Orientações Pedagógicas de Uso:</strong>
                <p className="mt-1 text-theme-muted">
                  Esta plataforma não diagnostica patologias nosológicas nem prescreve tratamentos automatizados. O objetivo é exercitar o raciocínio clínico da triagem de segurança à prescrição de movimento.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 rounded-xl bg-theme-primary border border-theme-border space-y-3">
                <h4 className="text-sm font-bold text-theme-text">Resumo da Avaliação Atual</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-theme-border">
                    <span className="text-theme-muted">Identificador:</span>
                    <span className="font-mono font-bold text-theme-text">{assessment.patientCode}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-theme-border">
                    <span className="text-theme-muted">Iniciais:</span>
                    <span className="font-semibold text-theme-text">{assessment.patientInitials}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-theme-border">
                    <span className="text-theme-muted">Data da Avaliação:</span>
                    <span className="font-semibold text-theme-text">{assessment.assessmentDate}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-theme-border">
                    <span className="text-theme-muted">Região Principal:</span>
                    <span className="font-semibold text-theme-text">{assessment.painRegion}</span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-theme-primary border border-theme-border space-y-3">
                <h4 className="text-sm font-bold text-theme-text">Slot de Vídeo / Aula Introdutória</h4>
                <div className="aspect-video bg-ink-950/90 rounded-lg flex flex-col items-center justify-center p-4 text-center text-slate-300 border border-slate-800">
                  <Video className="w-8 h-8 text-slate-400 mb-2" />
                  <span className="text-xs font-semibold text-slate-200">
                    Vídeo didático em processo de curadoria editorial
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1">
                    Espaço reservado para introdução metodológica do Studio Leandro Rangel.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================================== */}
        {/* ETAPA 1: DADOS DO ALUNO */}
        {/* ============================================================================== */}
        {currentStageIndex === 1 && (
          <div className="space-y-6">
            <div className="p-3 bg-status-caution-bg border border-status-caution-border rounded-xl text-xs text-status-caution-fg">
              <strong>Privacidade e LGPD:</strong> Não coletamos nome civil completo, CPF ou contatos pessoais no V1. Utilize identificadores pseudonimizados.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-1.5">
                  Código Gerado (Pseudônimo)
                </label>
                <input
                  type="text"
                  value={assessment.patientCode}
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl bg-theme-secondary border border-theme-border text-sm font-mono text-theme-muted cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-1.5">
                  Iniciais Opcionais
                </label>
                <input
                  type="text"
                  value={assessment.patientInitials}
                  maxLength={5}
                  onChange={(e) => setAssessment({ ...assessment, patientInitials: e.target.value })}
                  placeholder="Ex: M.R."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-theme-primary bg-theme-primary border border-theme-boundary/80 text-sm text-theme-text focus:outline-none focus:border-theme-teal focus:ring-2 focus:ring-theme-teal/25"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-1.5">
                  Idade (anos)
                </label>
                <input
                  type="number"
                  value={assessment.age}
                  min={1}
                  max={120}
                  onChange={(e) => setAssessment({ ...assessment, age: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-theme-primary bg-theme-primary border border-theme-boundary/80 text-sm text-theme-text focus:outline-none focus:border-theme-teal focus:ring-2 focus:ring-theme-teal/25"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-1.5">
                  Região Anatômica de Referência
                </label>
                <input
                  type="text"
                  value={assessment.painRegion}
                  onChange={(e) => setAssessment({ ...assessment, painRegion: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-theme-primary bg-theme-primary border border-theme-boundary/80 text-sm text-theme-text focus:outline-none focus:border-theme-teal focus:ring-2 focus:ring-theme-teal/25"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-1.5">
                  Nível de Atividade Física e Rotina Ocupacional
                </label>
                <input
                  type="text"
                  value={assessment.activityLevel}
                  onChange={(e) => setAssessment({ ...assessment, activityLevel: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-theme-primary bg-theme-primary border border-theme-boundary/80 text-sm text-theme-text focus:outline-none focus:border-theme-teal focus:ring-2 focus:ring-theme-teal/25"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-1.5">
                  Queixa Principal Relatada pelo Aluno
                </label>
                <textarea
                  rows={3}
                  value={assessment.complaint}
                  onChange={(e) => setAssessment({ ...assessment, complaint: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-theme-primary bg-theme-primary border border-theme-boundary/80 text-sm text-theme-text focus:outline-none focus:border-theme-teal focus:ring-2 focus:ring-theme-teal/25"
                />
              </div>
            </div>
          </div>
        )}

        {/* ============================================================================== */}
        {/* ETAPA 2: SINAIS DE ALERTA (RED FLAGS) */}
        {/* ============================================================================== */}
        {currentStageIndex === 2 && (
          <div className="space-y-6">
            <div className="p-4 bg-theme-secondary border border-theme-border rounded-xl text-xs text-theme-muted leading-relaxed">
              <strong>Atenção Metodológica:</strong> O Studio Leandro Rangel não inventa algoritmos de pontuação de risco. A triagem abaixo organiza a checagem manual de condições graves recomendadas em diretrizes internacionais.
            </div>

            <div className="space-y-4">
              {/* Cauda Equina */}
              <div className="p-4 rounded-xl border border-theme-border bg-theme-primary flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-theme-text block">
                    1. Síndrome da Cauda Equina
                  </span>
                  <p className="text-xs text-theme-muted">
                    Anestesia em sela, retenção/incontinência urinária súbita, perda de tônus esfincteriano anal ou fraqueza motora progressiva bilateral.
                  </p>
                  <input
                    type="text"
                    value={assessment.redFlags.caudaEquina.note}
                    onChange={(e) =>
                      setAssessment({
                        ...assessment,
                        redFlags: {
                          ...assessment.redFlags,
                          caudaEquina: { ...assessment.redFlags.caudaEquina, note: e.target.value },
                        },
                      })
                    }
                    placeholder="Anotações clínicas da checagem..."
                    className="w-full mt-2 px-3 py-1.5 bg-theme-primary border border-theme-border rounded-lg text-xs"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer self-start sm:self-center">
                  <input
                    type="checkbox"
                    checked={assessment.redFlags.caudaEquina.checked}
                    onChange={(e) =>
                      setAssessment({
                        ...assessment,
                        redFlags: {
                          ...assessment.redFlags,
                          caudaEquina: { ...assessment.redFlags.caudaEquina, checked: e.target.checked },
                          overallStatus: e.target.checked ? "alert_present" : "clear",
                        },
                      })
                    }
                    className="w-4 h-4 text-status-danger-fg rounded border-theme-boundary/50"
                  />
                  <span className="text-xs font-bold text-theme-text">Sintoma Presente</span>
                </label>
              </div>

              {/* Fratura */}
              <div className="p-4 rounded-xl border border-theme-border bg-theme-primary flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-theme-text block">
                    2. Fratura Estrutural
                  </span>
                  <p className="text-xs text-theme-muted">
                    Histórico de trauma de impacto recente, osteoporose conhecida ou uso contínuo prolongado de corticoterapia sistêmica.
                  </p>
                  <input
                    type="text"
                    value={assessment.redFlags.fracture.note}
                    onChange={(e) =>
                      setAssessment({
                        ...assessment,
                        redFlags: {
                          ...assessment.redFlags,
                          fracture: { ...assessment.redFlags.fracture, note: e.target.value },
                        },
                      })
                    }
                    placeholder="Anotações clínicas da checagem..."
                    className="w-full mt-2 px-3 py-1.5 bg-theme-primary border border-theme-border rounded-lg text-xs"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer self-start sm:self-center">
                  <input
                    type="checkbox"
                    checked={assessment.redFlags.fracture.checked}
                    onChange={(e) =>
                      setAssessment({
                        ...assessment,
                        redFlags: {
                          ...assessment.redFlags,
                          fracture: { ...assessment.redFlags.fracture, checked: e.target.checked },
                          overallStatus: e.target.checked ? "alert_present" : "clear",
                        },
                      })
                    }
                    className="w-4 h-4 text-status-danger-fg rounded border-theme-boundary/50"
                  />
                  <span className="text-xs font-bold text-theme-text">Sintoma Presente</span>
                </label>
              </div>

              {/* Neoplasia */}
              <div className="p-4 rounded-xl border border-theme-border bg-theme-primary flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-theme-text block">
                    3. Neoplasia / Malignidade
                  </span>
                  <p className="text-xs text-theme-muted">
                    Histórico pregresso de câncer, perda ponderal involuntária inexplicada, dor noturna incessante e refratária a mudanças posturais.
                  </p>
                  <input
                    type="text"
                    value={assessment.redFlags.malignancy.note}
                    onChange={(e) =>
                      setAssessment({
                        ...assessment,
                        redFlags: {
                          ...assessment.redFlags,
                          malignancy: { ...assessment.redFlags.malignancy, note: e.target.value },
                        },
                      })
                    }
                    placeholder="Anotações clínicas da checagem..."
                    className="w-full mt-2 px-3 py-1.5 bg-theme-primary border border-theme-border rounded-lg text-xs"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer self-start sm:self-center">
                  <input
                    type="checkbox"
                    checked={assessment.redFlags.malignancy.checked}
                    onChange={(e) =>
                      setAssessment({
                        ...assessment,
                        redFlags: {
                          ...assessment.redFlags,
                          malignancy: { ...assessment.redFlags.malignancy, checked: e.target.checked },
                          overallStatus: e.target.checked ? "alert_present" : "clear",
                        },
                      })
                    }
                    className="w-4 h-4 text-status-danger-fg rounded border-theme-boundary/50"
                  />
                  <span className="text-xs font-bold text-theme-text">Sintoma Presente</span>
                </label>
              </div>

              {/* Infecção */}
              <div className="p-4 rounded-xl border border-theme-border bg-theme-primary flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-theme-text block">
                    4. Infecção Grave (Espondilodiscite)
                  </span>
                  <p className="text-xs text-theme-muted">
                    Febre inexplicada, calafrios, procedimento cirúrgico ou infiltração lombar recente, imunossupressão ou uso de drogas intravenosas.
                  </p>
                  <input
                    type="text"
                    value={assessment.redFlags.infection.note}
                    onChange={(e) =>
                      setAssessment({
                        ...assessment,
                        redFlags: {
                          ...assessment.redFlags,
                          infection: { ...assessment.redFlags.infection, note: e.target.value },
                        },
                      })
                    }
                    placeholder="Anotações clínicas da checagem..."
                    className="w-full mt-2 px-3 py-1.5 bg-theme-primary border border-theme-border rounded-lg text-xs"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer self-start sm:self-center">
                  <input
                    type="checkbox"
                    checked={assessment.redFlags.infection.checked}
                    onChange={(e) =>
                      setAssessment({
                        ...assessment,
                        redFlags: {
                          ...assessment.redFlags,
                          infection: { ...assessment.redFlags.infection, checked: e.target.checked },
                          overallStatus: e.target.checked ? "alert_present" : "clear",
                        },
                      })
                    }
                    className="w-4 h-4 text-status-danger-fg rounded border-theme-boundary/50"
                  />
                  <span className="text-xs font-bold text-theme-text">Sintoma Presente</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================================== */}
        {/* ETAPA 3: ANAMNESE SINSS & MAPA DA DOR */}
        {/* ============================================================================== */}
        {currentStageIndex === 3 && (
          <div className="space-y-8">
            {/* Mapa Anatômico Integrado */}
            <div>
              <span className="text-xs font-bold text-theme-text uppercase tracking-wider mb-2 block">
                Localização Anatômica da Dor
              </span>
              <BodyMap
                selectedRegions={assessment.sinss.selectedBodyRegions}
                onChange={(regs) =>
                  setAssessment({
                    ...assessment,
                    sinss: { ...assessment.sinss, selectedBodyRegions: regs },
                  })
                }
              />
            </div>

            {/* Campos Estruturados SINSS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t border-theme-border">
              <div>
                <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-1.5">
                  S - Gravidade (Severity)
                </label>
                <select
                  value={assessment.sinss.severity}
                  onChange={(e: any) =>
                    setAssessment({
                      ...assessment,
                      sinss: { ...assessment.sinss, severity: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-theme-primary bg-theme-primary border border-theme-boundary/80 text-xs text-theme-text focus:outline-none focus:border-theme-teal focus:ring-2 focus:ring-theme-teal/25"
                >
                  <option value="Leve (EVA 1-3)">Leve (EVA 1-3)</option>
                  <option value="Moderada (EVA 4-6)">Moderada (EVA 4-6)</option>
                  <option value="Acentuada (EVA 7-10)">Acentuada (EVA 7-10)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-1.5">
                  I - Irritabilidade (Irritability)
                </label>
                <select
                  value={assessment.sinss.irritability}
                  onChange={(e: any) =>
                    setAssessment({
                      ...assessment,
                      sinss: { ...assessment.sinss, irritability: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-theme-primary bg-theme-primary border border-theme-boundary/80 text-xs text-theme-text focus:outline-none focus:border-theme-teal focus:ring-2 focus:ring-theme-teal/25"
                >
                  <option value="Baixa (demora a piorar, alivia rápido)">Baixa (alívio rápido)</option>
                  <option value="Moderada">Moderada</option>
                  <option value="Alta (piora imediata, alívio lento)">Alta (alívio lento)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-1.5">
                  S - Estágio Temporal (Stage)
                </label>
                <select
                  value={assessment.sinss.stage}
                  onChange={(e: any) =>
                    setAssessment({
                      ...assessment,
                      sinss: { ...assessment.sinss, stage: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-theme-primary bg-theme-primary border border-theme-boundary/80 text-xs text-theme-text focus:outline-none focus:border-theme-teal focus:ring-2 focus:ring-theme-teal/25"
                >
                  <option value="Agudo (< 6 sem)">Agudo (&lt; 6 semanas)</option>
                  <option value="Subagudo (6 a 12 sem)">Subagudo (6 a 12 semanas)</option>
                  <option value="Crônico (> 12 sem)">Crônico (&gt; 12 semanas)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-1.5">
                  S - Estabilidade (Stability)
                </label>
                <select
                  value={assessment.sinss.stability}
                  onChange={(e: any) =>
                    setAssessment({
                      ...assessment,
                      sinss: { ...assessment.sinss, stability: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-theme-primary bg-theme-primary border border-theme-boundary/80 text-xs text-theme-text focus:outline-none focus:border-theme-teal focus:ring-2 focus:ring-theme-teal/25"
                >
                  <option value="Melhorando">Melhorando</option>
                  <option value="Estável">Estável</option>
                  <option value="Piorando">Piorando</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-1.5">
                  N - Natureza dos Sintomas (Nature)
                </label>
                <input
                  type="text"
                  value={assessment.sinss.nature}
                  onChange={(e) =>
                    setAssessment({
                      ...assessment,
                      sinss: { ...assessment.sinss, nature: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-theme-primary bg-theme-primary border border-theme-boundary/80 text-xs text-theme-text focus:outline-none focus:border-theme-teal focus:ring-2 focus:ring-theme-teal/25"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-1.5">
                  Padrão Diário e Fatores de Agravo / Alívio
                </label>
                <textarea
                  rows={2}
                  value={assessment.sinss.dailyPattern}
                  onChange={(e) =>
                    setAssessment({
                      ...assessment,
                      sinss: { ...assessment.sinss, dailyPattern: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-theme-primary bg-theme-primary border border-theme-boundary/80 text-xs text-theme-text focus:outline-none focus:border-theme-teal focus:ring-2 focus:ring-theme-teal/25"
                />
              </div>
            </div>
          </div>
        )}

        {/* ============================================================================== */}
        {/* ETAPA 4: HIPÓTESES DE MECANISMO DA DOR */}
        {/* ============================================================================== */}
        {currentStageIndex === 4 && (
          <div className="space-y-6">
            <div className="p-3 bg-theme-secondary border border-theme-border rounded-xl text-xs text-theme-text">
              <strong>Abordagem Educacional:</strong> A classificação mecanística permite orientar a terapêutica de forma mais assertiva. Sem pontuações automáticas de probabilidade em V1.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Nociceptivo */}
              <div className="p-5 rounded-xl border border-theme-border bg-theme-primary space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-theme-text block">
                  1. Componente Nociceptivo
                </span>
                <p className="text-xs text-theme-muted leading-relaxed">
                  Dor proporcionada à sobrecarga mecânica ou inflamação tecidual local identificável.
                </p>
                <select
                  value={assessment.mechanisms.nociceptiveRating}
                  onChange={(e: any) =>
                    setAssessment({
                      ...assessment,
                      mechanisms: { ...assessment.mechanisms, nociceptiveRating: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-theme-primary border border-theme-boundary/50 text-xs font-semibold text-theme-text"
                >
                  <option value="provável">Classificação: Provável</option>
                  <option value="possível">Classificação: Possível</option>
                  <option value="improvável">Classificação: Improvável</option>
                </select>
              </div>

              {/* Neuropático */}
              <div className="p-5 rounded-xl border border-theme-border bg-theme-primary space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-theme-text block">
                  2. Componente Neuropático
                </span>
                <p className="text-xs text-theme-muted leading-relaxed">
                  Dor com distribuição neuroanatômica plausível (dermátomo), queimação, choques ou déficit somatossensorial.
                </p>
                <select
                  value={assessment.mechanisms.neuropathicRating}
                  onChange={(e: any) =>
                    setAssessment({
                      ...assessment,
                      mechanisms: { ...assessment.mechanisms, neuropathicRating: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-theme-primary border border-theme-boundary/50 text-xs font-semibold text-theme-text"
                >
                  <option value="provável">Classificação: Provável</option>
                  <option value="possível">Classificação: Possível</option>
                  <option value="improvável">Classificação: Improvável</option>
                </select>
              </div>

              {/* Nociplástico */}
              <div className="p-5 rounded-xl border border-theme-border bg-theme-primary space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-theme-text block">
                  3. Componente Nociplástico
                </span>
                <p className="text-xs text-theme-muted leading-relaxed">
                  Processamento central amplificado, dor desproporcional ou difusa com hipersensibilidade e fadiga.
                </p>
                <select
                  value={assessment.mechanisms.nociplasticRating}
                  onChange={(e: any) =>
                    setAssessment({
                      ...assessment,
                      mechanisms: { ...assessment.mechanisms, nociplasticRating: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-theme-primary border border-theme-boundary/50 text-xs font-semibold text-theme-text"
                >
                  <option value="provável">Classificação: Provável</option>
                  <option value="possível">Classificação: Possível</option>
                  <option value="improvável">Classificação: Improvável</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-1.5">
                Justificativa Clínica Integrada (Prosa Livre)
              </label>
              <textarea
                rows={3}
                value={assessment.mechanisms.clinicalRationale}
                onChange={(e) =>
                  setAssessment({
                    ...assessment,
                    mechanisms: { ...assessment.mechanisms, clinicalRationale: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-theme-primary bg-theme-primary border border-theme-boundary/80 text-xs text-theme-text focus:outline-none focus:border-theme-teal focus:ring-2 focus:ring-theme-teal/25"
              />
            </div>
          </div>
        )}

        {/* ============================================================================== */}
        {/* ETAPA 5: FERRAMENTAS DE AVALIAÇÃO (CATÁLOGO CONCEITUAL) */}
        {/* ============================================================================== */}
        {currentStageIndex === 5 && (
          <div className="space-y-6">
            <div className="p-3 bg-status-caution-bg border border-status-caution-border rounded-xl text-xs text-status-caution-fg">
              <strong>Proteção de Direitos Autorais e Licenciamento:</strong> As fichas abaixo apresentam a fundamentação metodológica e referências validadas no Brasil. Não reproduzimos itens proprietários protegidos.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TOOLS_CATALOG.map((tool) => {
                const isSelected = assessment.selectedTools.includes(tool.id);
                return (
                  <div
                    key={tool.id}
                    className={`p-5 rounded-xl border transition-all ${
                      isSelected
                        ? "bg-theme-secondary/60 border-theme-boundary/60 shadow-sm"
                        : "bg-theme-primary border-theme-border hover:border-theme-boundary/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-inverse text-inverse-fg">
                          {tool.acronym}
                        </span>
                        <h4 className="text-sm font-bold text-theme-text mt-1">
                          {tool.name}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = isSelected
                            ? assessment.selectedTools.filter((t) => t !== tool.id)
                            : [...assessment.selectedTools, tool.id];
                          setAssessment({ ...assessment, selectedTools: updated });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          isSelected
                            ? "bg-emerald-600 text-white"
                            : "bg-theme-primary border border-theme-boundary/50 text-theme-text hover:bg-theme-secondary"
                        }`}
                      >
                        {isSelected ? "Selecionada" : "+ Selecionar"}
                      </button>
                    </div>

                    <p className="text-xs text-theme-muted leading-relaxed mb-3">
                      {tool.purpose}
                    </p>

                    <div className="text-[11px] space-y-1 text-theme-muted pt-2 border-t border-theme-border/60">
                      <div>
                        <strong>Referência pt-BR:</strong> {tool.versionReference}
                      </div>
                      <div>
                        <strong>Interpretação:</strong> {tool.clinicalInterpretationNote}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================================== */}
        {/* ETAPA 6: EXAME FÍSICO ESTRUTURADO */}
        {/* ============================================================================== */}
        {currentStageIndex === 6 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-4 rounded-xl bg-theme-primary border border-theme-border space-y-2">
                <span className="text-xs font-bold text-theme-text uppercase tracking-wider block">
                  Sensibilidade Cutânea Dermatomérica
                </span>
                <textarea
                  rows={2}
                  value={assessment.physicalExam.sensationNotes}
                  onChange={(e) =>
                    setAssessment({
                      ...assessment,
                      physicalExam: { ...assessment.physicalExam, sensationNotes: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-theme-primary border border-theme-border rounded-lg text-xs"
                />
              </div>

              <div className="p-4 rounded-xl bg-theme-primary border border-theme-border space-y-2">
                <span className="text-xs font-bold text-theme-text uppercase tracking-wider block">
                  Reflexos Tendinosos Profundos
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[11px] text-theme-muted block">Patelar (L4):</label>
                    <input
                      type="text"
                      value={assessment.physicalExam.reflexes.patellar}
                      onChange={(e) =>
                        setAssessment({
                          ...assessment,
                          physicalExam: {
                            ...assessment.physicalExam,
                            reflexes: { ...assessment.physicalExam.reflexes, patellar: e.target.value },
                          },
                        })
                      }
                      className="w-full px-2 py-1 bg-theme-primary border border-theme-border rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-theme-muted block">Aquileu (S1):</label>
                    <input
                      type="text"
                      value={assessment.physicalExam.reflexes.achilles}
                      onChange={(e) =>
                        setAssessment({
                          ...assessment,
                          physicalExam: {
                            ...assessment.physicalExam,
                            reflexes: { ...assessment.physicalExam.reflexes, achilles: e.target.value },
                          },
                        })
                      }
                      className="w-full px-2 py-1 bg-theme-primary border border-theme-border rounded text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-theme-primary border border-theme-border space-y-2 sm:col-span-2">
                <span className="text-xs font-bold text-theme-text uppercase tracking-wider block">
                  Testes Neurodinâmicos Padronizados
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-theme-text block">
                      Elevação da Perna Reta (SLR):
                    </label>
                    <input
                      type="text"
                      value={assessment.physicalExam.neurodynamicTests.slr}
                      onChange={(e) =>
                        setAssessment({
                          ...assessment,
                          physicalExam: {
                            ...assessment.physicalExam,
                            neurodynamicTests: {
                              ...assessment.physicalExam.neurodynamicTests,
                              slr: e.target.value,
                            },
                          },
                        })
                      }
                      className="w-full mt-1 px-3 py-1.5 bg-theme-primary border border-theme-border rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-theme-text block">
                      Slump Test:
                    </label>
                    <input
                      type="text"
                      value={assessment.physicalExam.neurodynamicTests.slump}
                      onChange={(e) =>
                        setAssessment({
                          ...assessment,
                          physicalExam: {
                            ...assessment.physicalExam,
                            neurodynamicTests: {
                              ...assessment.physicalExam.neurodynamicTests,
                              slump: e.target.value,
                            },
                          },
                        })
                      }
                      className="w-full mt-1 px-3 py-1.5 bg-theme-primary border border-theme-border rounded text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================================== */}
        {/* ETAPA 7: FATORES PSICOSSOCIAIS */}
        {/* ============================================================================== */}
        {currentStageIndex === 7 && (
          <div className="space-y-6">
            <div className="p-3 bg-theme-secondary border border-theme-border rounded-xl text-xs text-theme-text">
              <strong>Abordagem Ética:</strong> A identificação de fatores psicossociais serve para personalizar a comunicação e o ritmo de progressão, jamais para rotular ou responsabilizar o aluno.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-1.5">
                  Qualidade do Sono Relatada
                </label>
                <select
                  value={assessment.psychosocial.sleepQuality}
                  onChange={(e: any) =>
                    setAssessment({
                      ...assessment,
                      psychosocial: { ...assessment.psychosocial, sleepQuality: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-theme-primary border border-theme-boundary/50 text-xs text-theme-text"
                >
                  <option value="Boa">Boa (sono reparador, sem interrupções frequentes)</option>
                  <option value="Moderada">Moderada (acordares ocasionais pela dor)</option>
                  <option value="Prejudicada">Prejudicada (insônia grave ou dor noturna)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-1.5">
                  Nível de Estresse Percebido
                </label>
                <select
                  value={assessment.psychosocial.stressLevel}
                  onChange={(e: any) =>
                    setAssessment({
                      ...assessment,
                      psychosocial: { ...assessment.psychosocial, stressLevel: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-theme-primary border border-theme-boundary/50 text-xs text-theme-text"
                >
                  <option value="Baixo">Baixo</option>
                  <option value="Moderado">Moderado</option>
                  <option value="Elevado">Elevado</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-1.5">
                  Crenças e Indicadores de Medo-Evitação
                </label>
                <textarea
                  rows={2}
                  value={assessment.psychosocial.fearAvoidanceIndicators}
                  onChange={(e) =>
                    setAssessment({
                      ...assessment,
                      psychosocial: { ...assessment.psychosocial, fearAvoidanceIndicators: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-theme-primary border border-theme-boundary/50 text-xs text-theme-text"
                />
              </div>
            </div>
          </div>
        )}

        {/* ============================================================================== */}
        {/* ETAPA 8: PLANO DE ACOMPANHAMENTO */}
        {/* ============================================================================== */}
        {currentStageIndex === 8 && (
          <div className="space-y-6">
            <div>
              <span className="text-xs font-bold text-theme-text uppercase tracking-wider mb-2 block">
                Até 3 Metas de Atividade Significativas
              </span>
              <div className="space-y-2">
                {assessment.carePlan.goals.map((goal, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-inverse text-inverse-fg text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={goal || ""}
                      onChange={(e) => {
                        const newGoals = [...assessment.carePlan.goals] as [string, string?, string?];
                        newGoals[idx] = e.target.value;
                        setAssessment({
                          ...assessment,
                          carePlan: { ...assessment.carePlan, goals: newGoals },
                        });
                      }}
                      placeholder={`Meta ${idx + 1}...`}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-theme-boundary/50 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-1.5">
                Justificativa Profissional da Conduta
              </label>
              <textarea
                rows={2}
                value={assessment.carePlan.rationale}
                onChange={(e) =>
                  setAssessment({
                    ...assessment,
                    carePlan: { ...assessment.carePlan, rationale: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2 rounded-xl bg-theme-primary border border-theme-boundary/50 text-xs text-theme-text"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-1.5">
                Data Prevista para Reavaliação Formal
              </label>
              <input
                type="date"
                value={assessment.carePlan.nextReassessmentDate}
                onChange={(e) =>
                  setAssessment({
                    ...assessment,
                    carePlan: { ...assessment.carePlan, nextReassessmentDate: e.target.value },
                  })
                }
                className="px-3.5 py-2 rounded-xl bg-theme-primary border border-theme-boundary/50 text-xs font-semibold text-theme-text"
              />
            </div>
          </div>
        )}

        {/* ============================================================================== */}
        {/* ETAPA 9: EVOLUÇÃO E VOLUME */}
        {/* ============================================================================== */}
        {currentStageIndex === 9 && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-theme-primary border border-theme-border">
              <span className="text-xs font-bold text-theme-text uppercase tracking-wider block mb-1">
                Linha do Tempo e Notas da Reavaliação
              </span>
              <p className="text-xs text-theme-muted mb-3">
                Acompanhe as anotações longitudinais e a resposta tecidual às sobrecargas propostas.
              </p>
              <textarea
                rows={3}
                value={assessment.evolutionNotes}
                onChange={(e) => setAssessment({ ...assessment, evolutionNotes: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-theme-primary border border-theme-boundary/50 text-xs text-theme-text"
              />
            </div>

            <div className="p-4 rounded-xl bg-theme-secondary border border-theme-border text-xs text-theme-text flex items-center justify-between">
              <span>
                Para visualizar a agregação gráfica detalhada e alternar os meses de sobrecarga (Fev / Mar 2027), acesse a seção de evolução do painel.
              </span>
              <Link
                href="/app/evolucao"
                className="px-3 py-1.5 bg-inverse text-inverse-fg rounded-lg font-bold hover:bg-inverse-hover transition-colors whitespace-nowrap ml-4"
              >
                Abrir Gráficos de Volume
              </Link>
            </div>
          </div>
        )}

        {/* ============================================================================== */}
        {/* ETAPA 10: GLOSSÁRIO E REFERÊNCIAS */}
        {/* ============================================================================== */}
        {currentStageIndex === 10 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-base font-bold text-theme-text">
                  Repositório de Terminologia e Evidências
                </h4>
                <p className="text-xs text-theme-muted">
                  Definições alinhadas com consensos internacionais (IASP) e normas vigentes.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-theme-subtle absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={glossarySearch}
                  onChange={(e) => setGlossarySearch(e.target.value)}
                  placeholder="Filtrar termo..."
                  className="w-full pl-9 pr-3 py-1.5 bg-theme-secondary border border-theme-border rounded-xl text-xs text-theme-text"
                />
              </div>
            </div>

            <div className="space-y-3">
              {GLOSSARY_ITEMS.filter(
                (item) =>
                  item.term.toLowerCase().includes(glossarySearch.toLowerCase()) ||
                  item.definition.toLowerCase().includes(glossarySearch.toLowerCase())
              ).map((item) => (
                <div key={item.term} className="p-4 rounded-xl bg-theme-primary border border-theme-border space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-theme-text">{item.term}</span>
                    <span className="text-[10px] font-semibold bg-theme-secondary text-theme-text px-2 py-0.5 rounded">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-xs text-theme-text leading-relaxed">{item.definition}</p>
                  <p className="text-xs text-theme-muted italic">Relevância: {item.clinicalRelevance}</p>
                  <span className="text-[11px] text-theme-subtle block pt-1">
                    Candidata à verificação: {item.sourceCandidate}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navegação Inferior (Anterior / Próximo) */}
        <div className="mt-8 pt-6 border-t border-theme-border flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStageIndex === 0}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
              currentStageIndex === 0
                ? "border-theme-border text-theme-subtle cursor-not-allowed bg-theme-secondary"
                : "border-theme-boundary/50 text-theme-text hover:bg-theme-secondary"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Etapa Anterior</span>
          </button>

          <span className="text-xs text-theme-muted hidden sm:inline">
            Etapa {currentStageIndex + 1} de {STAGES_LIST.length}
          </span>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentStageIndex === STAGES_LIST.length - 1}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              currentStageIndex === STAGES_LIST.length - 1
                ? "bg-theme-border text-theme-subtle cursor-not-allowed"
                : "bg-inverse hover:bg-inverse-hover text-inverse-fg shadow-sm"
            }`}
          >
            <span>Próxima Etapa</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
