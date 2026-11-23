"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Columns2, Gauge, History, Keyboard, Layers, MousePointerClick, ShieldCheck } from "lucide-react";
import DitherReveal from "@/components/effects/DitherReveal";
import { EDITORIAL_SCENES } from "@/lib/landing/editorial-media";
import { EXERCISES } from "@/lib/domain/exercise-library";
import { EVIDENCE } from "@/lib/domain/evidence";
import BodyMapDemo from "./BodyMapDemo";
import ReavaliacaoPhoto from "./ReavaliacaoPhoto";

const STEPS = [
  { id: "avaliacao", title: "Avaliação", text: "Objetivo, rotina, triagem de segurança, queixa no mapa corporal e testes com unidade e data. Dado ausente fica marcado como ausente." },
  { id: "planejamento", title: "Planejamento", text: "Regras transparentes mostram opções compatíveis com o que foi registrado. Você monta as sessões, define a dose e aprova cada versão." },
  { id: "acompanhamento", title: "Acompanhamento", text: "O aluno vê só o treino aprovado e registra o que fez. Sintomas, carga e adesão aparecem em gráficos separados." },
] as const;

const STEP_SCENES: Record<"avaliacao" | "planejamento" | "acompanhamento", { caption: string }> = {
  avaliacao: { caption: "Observação do movimento" },
  planejamento: { caption: "Preparação da sessão" },
  acompanhamento: { caption: "Revisão da sessão com o aluno" },
};

type StepId = keyof typeof STEP_SCENES;
type SceneLayer = { key: number; id: StepId; phase: "in" | "out" };

export function Percurso() {
  const [step, setStep] = useState<StepId>("avaliacao");
  const [layers, setLayers] = useState<SceneLayer[]>([{ key: 0, id: "avaliacao", phase: "in" }]);
  const [ready, setReady] = useState<Record<number, boolean>>({ 0: true });
  const nextKey = useRef(0);

  useEffect(() => {
    const sync = () => {
      const map: Record<string, StepId> = {
        "#percurso": "avaliacao",
        "#avaliacao": "avaliacao",
        "#treinos": "planejamento",
        "#evolucao": "acompanhamento",
      };
      if (map[window.location.hash]) setStep(map[window.location.hash]);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  // Cada seleção empilha uma camada de entrada e marca as anteriores como saída.
  // Cliques rápidos nunca revertem: a última seleção é sempre a camada "in".
  useEffect(() => {
    setLayers((current) => {
      const top = current[current.length - 1];
      if (top && top.phase === "in" && top.id === step) return current;
      const key = ++nextKey.current;
      return [
        ...current.map((layer) => ({ ...layer, phase: "out" as const })),
        { key, id: step, phase: "in" as const },
      ];
    });
  }, [step]);

  const markReady = useCallback((key: number) => {
    setReady((current) => (current[key] ? current : { ...current, [key]: true }));
  }, []);

  // A foto anterior só sai depois que a nova terminou de carregar e o crossfade rodou.
  useEffect(() => {
    const incoming = layers.find((layer) => layer.phase === "in");
    if (layers.length < 2 || !incoming || !ready[incoming.key]) return;
    const timer = window.setTimeout(() => {
      setLayers((current) => current.filter((layer) => layer.phase === "in"));
    }, 260);
    return () => window.clearTimeout(timer);
  }, [layers, ready]);

  const active = [...layers].reverse().find((layer) => layer.phase === "in") ?? layers[layers.length - 1];
  const scene = STEP_SCENES[active?.id ?? "avaliacao"];

  return (
    <section id="percurso" className="lr-section lr-light scroll-mt-20" aria-labelledby="percurso-title">
      <div className="lr-wrap">
        <div className="lr-intro-row">
          <div>
            <p className="lr-eyebrow"><span className="lr-rule" aria-hidden="true" /> Como funciona</p>
            <h2 id="percurso-title" className="lr-display lr-display-lg">Da avaliação<br /><em>ao treino.</em></h2>
          </div>
          <p className="lr-intro-text">Avaliação, planejamento e acompanhamento no mesmo lugar.</p>
        </div>

        <div className="lr-method-grid">
          <div className="lr-steps" aria-label="Etapas do método">
            {STEPS.map((s, i) => (
              <div key={s.id} id={s.id} className={`lr-step ${step === s.id ? "is-active" : ""}`}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={step === s.id}
                    aria-disabled={step === s.id}
                    aria-controls={`step-${s.id}`}
                    onClick={() => setStep(s.id)}
                  >
                    <span className="lr-step-num">0{i + 1}</span>
                    {s.title}
                    <span className="lr-step-ind" aria-hidden="true" />
                  </button>
                </h3>
                <div id={`step-${s.id}`} className="lr-step-detail" hidden={step !== s.id}>
                  <p>{s.text}</p>
                  {s.id === "avaliacao" && <a className="lr-text-link" href="#mapa">Experimentar o mapa corporal</a>}
                  {s.id !== "avaliacao" && <a className="lr-text-link" href="#demonstracao">Abrir o caso demonstrativo</a>}
                </div>
              </div>
            ))}
          </div>

          <div className="lr-fluted min-w-0">
            <figure className="lr-step-photo">
              {layers.map((layer) => {
                const isReady = Boolean(ready[layer.key]);
                return (
                  <div
                    key={layer.key}
                    data-key={layer.key}
                    data-scene={layer.id}
                    inert={layer.phase === "out"}
                    aria-hidden={layer.phase === "out"}
                    className={clsx("lr-scene-layer", layer.phase, isReady && "is-ready")}
                  >
                    <DitherReveal
                      scene={EDITORIAL_SCENES[layer.id]}
                      sizes="(min-width: 1024px) 720px, (min-width: 768px) 50vw, 100vw"
                      fill
                      inactive={layer.phase === "out"}
                      onPhotoReady={() => markReady(layer.key)}
                    />
                  </div>
                );
              })}
              <figcaption><span className="lr-photo-frame" aria-hidden="true" />{scene.caption}</figcaption>
            </figure>
          </div>
        </div>

      </div>
    </section>
  );
}

/** Bloco próprio de Reavaliação — separado das três etapas do percurso. */
export function ReavaliacaoSection() {
  return (
    <section id="reavaliacao" className="lr-section lr-light scroll-mt-20" aria-labelledby="reavaliacao-titulo">
      <div className="lr-wrap grid gap-8 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:items-center lg:gap-12">
        <ReavaliacaoPhoto />
        <div>
          <p className="lr-eyebrow"><span className="lr-rule" aria-hidden="true" /> Reavaliação</p>
          <h2 id="reavaliacao-titulo" className="lr-display lr-display-lg">O que mudou<br /><em>desde a última avaliação.</em></h2>
          <p className="lr-section-copy mt-6">
            Reavaliar não sobrescreve o treino em uso: gera uma proposta de nova versão para você revisar.
          </p>
        </div>
      </div>
    </section>
  );
}

function Feature({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean; strokeWidth?: number }>; title: string; children?: React.ReactNode }) {
  return (
    <li className="flex gap-4 border-t border-[var(--lr-line)] py-5">
      <span className="mt-1 text-[var(--lr-gold-deep)]"><Icon className="h-5 w-5" strokeWidth={1.6} aria-hidden={true} /></span>
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        {children && <p className="mt-1 text-[15px] leading-relaxed text-theme-muted">{children}</p>}
      </div>
    </li>
  );
}

export function MapaSection() {
  return (
    <section id="mapa" className="lr-section lr-map scroll-mt-20" aria-labelledby="mapa-title">
      <div className="lr-wrap lr-map-layout">
        <div>
          <p className="lr-eyebrow"><span className="lr-rule" aria-hidden="true" /> Mapa corporal interativo</p>
          <h2 id="mapa-title" className="lr-display lr-display-lg">Por baixo<br /><em>da pele.</em></h2>
          <p className="lr-section-copy lr-map-copy">
            De frente, o lado direito da pessoa aparece à sua esquerda; de costas, à direita. O mapa marca D e E com esse significado e registra região, intensidade de 0 a 10, como o aluno descreve o sintoma, irradiação e o que piora ou alivia.
          </p>
          <p className="lr-map-copy mt-6 text-sm">
            Veja uma região registrada na aba Avaliação do <a href="#demonstracao" className="font-semibold text-[var(--lr-gold-deep)] underline underline-offset-4">caso demonstrativo</a>.
          </p>
          <ul className="mt-8">
            <Feature icon={MousePointerClick} title="Selecionar uma região não significa lesão." />
            <Feature icon={Gauge} title="Intensidade não informada não vira zero." />
            <Feature icon={Keyboard} title="Lista equivalente para teclado e leitor de tela." />
          </ul>
        </div>
        <BodyMapDemo />
      </div>
    </section>
  );
}

export function TreinoSection() {
  return (
    <section id="treinos" className="lr-section lr-light scroll-mt-20" aria-labelledby="treinos-title">
      <div className="lr-wrap grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          <p className="lr-eyebrow"><span className="lr-rule" aria-hidden="true" /> Prescrição</p>
          <h2 id="treinos-title" className="lr-display lr-display-lg">Monte o treino<br /><em>com a avaliação ao lado.</em></h2>
          <p className="lr-section-copy mt-6">
            Biblioteca com {EXERCISES.length} exercícios filtráveis por padrão de movimento, músculo, equipamento e modalidade. Sessões A, B e C, séries, repetições ou duração, carga, descanso, RPE ou RIR, regressão e progressão.
          </p>
          <div className="lr-fluted mt-8 min-w-0">
            <figure className="relative aspect-[3/2] overflow-hidden bg-[#343434]">
              <DitherReveal
                scene={EDITORIAL_SCENES.prescricao}
                sizes="(min-width: 1024px) 560px, 100vw"
                fill
              />
              <figcaption className="pointer-events-none absolute bottom-3 left-3 bg-[rgba(17,17,17,.86)] px-3 py-1.5 text-xs font-semibold text-white">
                <span className="mr-2 inline-block h-2 w-2 border-2 border-[var(--lr-gold)]" aria-hidden="true" />
                Cena de treino
              </figcaption>
            </figure>
          </div>
        </div>
        <ul className="grid content-start gap-x-8 sm:grid-cols-2">
          <Feature icon={Layers} title="Elásticos e Pilates sem conversões inventadas">Molas, aparelho e montagem ficam registrados como são, sem conversão para kg.</Feature>
          <Feature icon={ShieldCheck} title="Aprovação antes do aluno ver">Estudantes preparam rascunhos; o professor responsável aprova e disponibiliza.</Feature>
          <Feature icon={Columns2} title="Planejado e executado separados">Esforço e dor também são registrados em campos diferentes.</Feature>
          <Feature icon={History} title="Histórico de versões">Autor, data, avaliação de origem e regras usadas em cada versão.</Feature>
        </ul>
      </div>
    </section>
  );
}

export function EvolucaoSection() {
  return (
    <section id="evolucao" className="lr-section lr-light scroll-mt-20" aria-labelledby="evolucao-title">
      <div className="lr-wrap max-w-[1180px]">
        <p className="lr-eyebrow"><span className="lr-rule" aria-hidden="true" /> Evolução</p>
        <h2 id="evolucao-title" className="lr-display lr-display-lg max-w-2xl">Dor, função, carga e adesão<br /><em>em gráficos separados.</em></h2>
        <p className="lr-section-copy mt-6">
          Dor em escala fixa de 0 a 10, medidas funcionais com a própria unidade, volume de carga externa por semana e sessões concluídas com o denominador à vista. Semana sem registro não aparece como zero.
        </p>
        <p className="mt-4 text-sm text-theme-muted">
          Volume = repetições concluídas × carga externa (kg); peso corporal e elásticos não somam kg. O volume semanal do caso fictício está na aba Evolução do <a href="#demonstracao" className="font-semibold text-[var(--lr-gold-deep)] underline underline-offset-4">caso demonstrativo</a>.
        </p>
      </div>
    </section>
  );
}

export function MateriaisSection() {
  return (
    <section className="lr-section lr-light" aria-labelledby="materiais-title">
      <div className="lr-wrap grid gap-10 lg:grid-cols-2">
        <div>
          <p className="lr-eyebrow"><span className="lr-rule" aria-hidden="true" /> Evidências</p>
          <h2 id="materiais-title" className="lr-display lr-display-lg">Cada sugestão<br /><em>mostra de onde vem.</em></h2>
          <p className="lr-section-copy mt-6">
            Cada sugestão guarda os achados usados, os critérios, as limitações e a referência. Onde não há fonte específica, a ficha diz isso.
          </p>
        </div>
        <details>
          <summary className="cursor-pointer py-3 font-semibold">Referências do método</summary>
          <ul className="border-t border-[var(--lr-line)]">
            {EVIDENCE.filter((e) => e.verifiedOn).map((e) => (
              <li key={e.id} className="border-b border-[var(--lr-line)] py-4">
                <p className="text-sm text-theme-muted">{e.authors.split(",")[0].replace(" (ACSM)", "")} · {e.year} · {e.type}</p>
                <p className="mt-0.5 font-medium leading-snug">{e.title}</p>
              </li>
            ))}
          </ul>
        </details>
        <p className="text-sm text-theme-muted lg:col-span-2">
          Ponto de partida, não revisão completa. <Link href="/login" className="font-semibold text-[var(--lr-gold-deep)] underline underline-offset-4">Bibliografia completa na área interna</Link>.
        </p>
      </div>
    </section>
  );
}
