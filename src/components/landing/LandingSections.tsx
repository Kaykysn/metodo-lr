import React from "react";
import Link from "next/link";
import { Columns2, Gauge, History, Keyboard, Layers, MousePointerClick, ShieldCheck } from "lucide-react";
import { EXERCISES } from "@/lib/domain/exercise-library";
import { EVIDENCE } from "@/lib/domain/evidence";
import FrostedGlassIcon from "@/components/ui/FrostedGlassIcon";
import SceneVideo from "./SceneVideo";

const STEPS = [
  { title: "Avaliação", text: "Objetivo, rotina, triagem de segurança, queixa no mapa corporal e testes com unidade e data. Dado ausente fica marcado como ausente." },
  { title: "Planejamento", text: "Regras transparentes mostram opções compatíveis com o que foi registrado. Você monta as sessões, define a dose e aprova cada versão." },
  { title: "Acompanhamento", text: "O aluno vê só o treino aprovado e registra o que fez. Sintomas, carga e adesão aparecem em gráficos separados." },
];

export function Percurso() {
  const [first, ...rest] = STEPS;
  return (
    <section id="percurso" className="scroll-mt-20">
      <div className="mx-auto max-w-[1180px] px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <h2 data-scroll-reveal="up" data-scroll-distance="22" className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Avaliação, planejamento e acompanhamento no mesmo lugar.</h2>
        <ol data-scroll-stagger="0.14" data-scroll-distance="26" className="mt-12 grid gap-10 md:grid-cols-2 md:gap-x-8 md:gap-y-12">
          {/* Passo 1 ao lado da cena: o professor observa o movimento durante a avaliação */}
          <li data-scroll-item className="grid gap-6 md:col-span-2 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center lg:gap-12">
            <div>
              <StepNumber n={1} />
              <h3 className="mt-4 text-xl font-semibold">{first.title}</h3>
              <p className="mt-2 max-w-md text-[15px] leading-relaxed text-theme-muted">{first.text}</p>
            </div>
            <SceneVideo />
          </li>
          {rest.map((s, i) => (
            <li key={s.title} data-scroll-item className="border-t border-theme-border pt-6">
              <StepNumber n={i + 2} />
              <h3 className="mt-4 text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-theme-muted">{s.text}</p>
            </li>
          ))}
        </ol>
        <p data-scroll-reveal="fade" data-scroll-delay="80" className="mt-10 max-w-2xl text-[15px] text-theme-muted">
          Reavaliar não sobrescreve o treino em uso: gera uma proposta de nova versão para você revisar.
        </p>
      </div>
    </section>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="tabular inline-flex h-10 w-10 items-center justify-center rounded-full border border-theme-teal bg-theme-page text-base font-bold text-theme-teal">{n}</span>
  );
}

/** Item com ícone em ladrilho de vidro (o traço fica nítido, acima do desfoque). */
function Feature({ icon, title, children }: { icon: React.ComponentProps<typeof FrostedGlassIcon>["icon"]; title: string; children?: React.ReactNode }) {
  return (
    <li data-scroll-item className="glass-card flex gap-4 p-5">
      <FrostedGlassIcon icon={icon} size="md" />
      <div className="min-w-0 pt-1">
        <p className="font-semibold">{title}</p>
        {children && <p className="mt-1 text-[15px] leading-relaxed text-theme-muted">{children}</p>}
      </div>
    </li>
  );
}

export function MapaSection() {
  return (
    <section id="mapa" className="glass-section scroll-mt-20">
      <div className="mx-auto grid max-w-[1180px] gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:px-8 lg:py-24">
        <div data-scroll-reveal="left" data-scroll-distance="26">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Um mapa corporal que respeita o lado da pessoa.</h2>
          <p className="mt-4 text-[17px] leading-relaxed text-theme-muted">
            De frente, o lado direito da pessoa aparece à sua esquerda; de costas, à direita. O mapa marca D e E com esse significado e registra região, intensidade de 0 a 10, como o aluno descreve o sintoma, irradiação e o que piora ou alivia.
          </p>
          <p className="mt-6 text-sm text-theme-muted">
            Veja uma região registrada na aba Avaliação do <a href="#demonstracao" className="font-semibold text-theme-teal underline">caso demonstrativo</a>.
          </p>
        </div>
        <ul data-scroll-stagger="0.1" data-scroll-distance="22" className="space-y-6 lg:pt-2">
          <Feature icon={MousePointerClick} title="Selecionar uma região não significa lesão." />
          <Feature icon={Gauge} title="Intensidade não informada não vira zero." />
          <Feature icon={Keyboard} title="Lista equivalente para teclado e leitor de tela." />
        </ul>
      </div>
    </section>
  );
}

export function TreinoSection() {
  return (
    <section id="treinos" className="scroll-mt-20">
      <div className="mx-auto grid max-w-[1180px] gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-8 lg:py-24">
        <div data-scroll-reveal="left" data-scroll-distance="28">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Monte o treino com a avaliação ao lado.</h2>
          <p className="mt-4 text-[17px] leading-relaxed text-theme-muted">
            Biblioteca com {EXERCISES.length} exercícios filtráveis por padrão de movimento, músculo, equipamento e modalidade. Sessões A, B e C, séries, repetições ou duração, carga, descanso, RPE ou RIR, regressão e progressão.
          </p>
        </div>
        <ul data-scroll-stagger="0.1" data-scroll-distance="24" className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
          <Feature icon={Layers} title="Elásticos e Pilates sem conversões inventadas">Molas, aparelho e montagem ficam registrados como são, sem conversão para kg.</Feature>
          <Feature icon={ShieldCheck} title="Aprovação antes do aluno ver">Estudantes preparam rascunhos; o professor responsável aprova e disponibiliza.</Feature>
          <Feature icon={Columns2} title="Planejado e executado separados">Esforço e dor também são registrados em campos diferentes.</Feature>
          <Feature icon={History} title="Histórico de versões">Autor, data, avaliação de origem e regras usadas em cada versão.</Feature>
        </ul>
      </div>
    </section>
  );
}

/** Evolução: o gráfico vive na aba Evolução do caso demonstrativo (abertura); aqui fica a explicação. */
export function EvolucaoSection() {
  return (
    <section id="evolucao" className="relative isolate scroll-mt-20 overflow-hidden">
      <div aria-hidden="true" data-decorative className="glow-jade pointer-events-none absolute right-[-10%] top-0 -z-10 h-full w-[55%]" />
      <div className="mx-auto max-w-[1180px] px-4 pb-20 sm:px-6 lg:px-8 lg:pb-24">
        <div data-scroll-stagger="0.12" data-scroll-distance="20" className="max-w-2xl border-t border-theme-border pt-16 lg:pt-20">
          <h2 data-scroll-item className="text-3xl font-bold tracking-tight sm:text-4xl">Dor, função, carga e adesão em gráficos separados.</h2>
          <p data-scroll-item className="mt-4 text-[17px] leading-relaxed text-theme-muted">
            Dor em escala fixa de 0 a 10, medidas funcionais com a própria unidade, volume de carga externa por semana e sessões concluídas com o denominador à vista. Semana sem registro não aparece como zero.
          </p>
          <p data-scroll-item className="mt-4 text-sm text-theme-muted">
            Volume = repetições concluídas × carga externa (kg); peso corporal e elásticos não somam kg. O volume semanal do caso fictício está na aba Evolução do <a href="#demonstracao" className="font-semibold text-theme-teal underline">caso demonstrativo</a>.
          </p>
        </div>
      </div>
    </section>
  );
}

export function MateriaisSection() {
  return (
    <section className="glass-section">
      <div className="mx-auto grid max-w-[1180px] gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8 lg:py-24">
        <div data-scroll-reveal="left" data-scroll-distance="24">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Cada sugestão mostra de onde vem.</h2>
          <p className="mt-4 text-[17px] leading-relaxed text-theme-muted">
            Cada sugestão guarda os achados usados, os critérios, as limitações e a referência. Onde não há fonte específica, a ficha diz isso.
          </p>
        </div>
        <ul data-scroll-reveal="right" data-scroll-distance="24" className="glass-panel divide-y divide-theme-border px-5">
          {EVIDENCE.filter((e) => e.verifiedOn).map((e) => (
            <li key={e.id} className="py-4">
              <p className="text-sm text-theme-muted">{e.authors.split(",")[0].replace(" (ACSM)", "")} · {e.year} · {e.type}</p>
              <p className="mt-0.5 font-medium leading-snug">{e.title}</p>
            </li>
          ))}
        </ul>
        <p data-scroll-reveal="fade" className="text-sm text-theme-muted lg:col-span-2">
          Ponto de partida, não revisão completa. <Link href="/login" className="font-semibold text-theme-teal underline">Bibliografia completa na área interna</Link>.
        </p>
      </div>
    </section>
  );
}
