// ==============================================================================
// Avaliação postural por fotos — modelo, geometria e comparabilidade.
// - Coordenadas de anotação são normalizadas (0–1) sobre a imagem JÁ orientada
//   (EXIF aplicado e espelhamento confirmado). Antes de qualquer cálculo elas voltam
//   para pixels com a largura e a altura reais, preservando a proporção.
// - Eixo y da imagem cresce para baixo.
// - Os números descrevem a foto e a marcação; não são diagnóstico nem têm faixa de
//   normalidade. Limiares clínicos exigiriam um método validado e nomeado.
// ==============================================================================

export type PhotoView = "frente" | "perfil" | "costas";
export type ProfileSide = "direito" | "esquerdo";
export const VIEW_LABEL: Record<PhotoView, string> = { frente: "Frente", perfil: "Perfil", costas: "Costas" };

export interface Pt {
  x: number;
  y: number;
}

export type Visibility = "visível" | "estimado" | "não visível";

export interface Landmark {
  id: string;
  /** Normalizado sobre a imagem orientada (0–1). */
  x: number;
  y: number;
  visibility: Visibility;
  note: string;
}

export interface RefLine {
  a: Pt;
  b: Pt;
}

export interface Calibration {
  a: Pt;
  b: Pt;
  /** Comprimento real entre a e b, no mesmo plano do corpo. */
  lengthCm: number;
}

export interface AngleTool {
  id: string;
  label: string;
  a: Pt;
  vertex: Pt;
  c: Pt;
}

export type VerticalRefSource = "fio de prumo fotografado" | "grade ajustada pelo avaliador";

export interface AnnotationData {
  landmarks: Landmark[];
  vertical: (RefLine & { source: VerticalRefSource }) | null;
  horizontal: RefLine | null;
  showMidline: boolean;
  calibration: Calibration | null;
  angles: AngleTool[];
  grid: { spacingPct: number; opacity: number; contrast: "claro" | "escuro"; visible: boolean };
  /** Avaliação da qualidade da foto e da comparabilidade. */
  quality: { framing: "corpo inteiro" | "cortada"; cameraLevel: "nivelada" | "inclinada" | "não verificado"; notes: string };
  /** Segmento entre dois marcos usado como denominador de distâncias (%), quando não há calibração. */
  referenceSegment?: { from: string; to: string } | null;
}

export interface ImageTransform {
  kind: "orientação EXIF aplicada" | "espelhamento horizontal";
  at: string;
  by: string;
  /** Efeito nas anotações existentes. */
  effect: string;
}

export interface PhotoAsset {
  id: string;
  setId: string;
  view: PhotoView;
  profileSide: ProfileSide | null;
  /** Dimensões da imagem orientada guardada. */
  width: number;
  height: number;
  mime: "image/jpeg" | "image/webp";
  bytes: number;
  storageKey: string;
  originalName: string;
  uploadedAt: string;
  uploadedBy: string;
  /** null = ainda não confirmado; false = sem espelhamento; true = estava espelhada e foi corrigida. */
  mirrorConfirmed: boolean | null;
  transforms: ImageTransform[];
  /** Foto substituída por esta (histórico). */
  replaces: string | null;
}

export interface PhotoSet {
  id: string;
  traineeId: string;
  ownerId: string;
  assessmentId: string | null;
  context: "avaliação" | "reavaliação";
  capturedOn: string;
  assessorId: string;
  assessorName: string;
  notes: string;
  consent: { documented: boolean; method: string; recordedAt: string | null };
  capture: { shoes: "com calçado" | "descalço" | "não informado"; distance: string; cameraHeight: string; lens: string; lighting: string; feet: string };
  photos: Partial<Record<PhotoView, PhotoAsset>>;
  createdAt: string;
  updatedAt: string;
}

export interface AnnotationVersion {
  id: string;
  photoId: string;
  version: number;
  basedOn: number | null;
  authorId: string;
  authorName: string;
  createdAt: string;
  protocol: string;
  data: AnnotationData;
}

export const LANDMARK_PROTOCOL = "marcos-v1 (2026-11-10)";

export interface LandmarkDef {
  id: string;
  label: string;
  definition: string;
  /** Lado anatômico da pessoa, quando é um par. */
  side?: "direito" | "esquerdo";
  /** Marco que exige identificação por palpação ou referência óssea pelo avaliador. */
  requiresPalpation?: boolean;
}

const pair = (base: string, label: string, definition: string, requiresPalpation?: boolean): LandmarkDef[] => [
  { id: `${base}-d`, label: `${label} direito`, definition, side: "direito", requiresPalpation },
  { id: `${base}-e`, label: `${label} esquerdo`, definition, side: "esquerdo", requiresPalpation },
];

export const LANDMARKS: Record<PhotoView, LandmarkDef[]> = {
  frente: [
    ...pair("acromio", "Acrômio", "Ponto mais lateral da borda do acrômio, no alto do ombro."),
    ...pair("eias", "EIAS", "Espinha ilíaca anterossuperior: saliência óssea na frente da pelve. Exige identificação pelo avaliador.", true),
    ...pair("joelho-frente", "Centro da patela", "Centro da patela visto de frente."),
    ...pair("tornozelo-frente", "Maléolo (vista frontal)", "Ponto médio entre os maléolos, na frente do tornozelo."),
  ],
  costas: [
    ...pair("acromio-costas", "Acrômio", "Ponto mais lateral da borda do acrômio, visto de costas."),
    ...pair("eips", "EIPS", "Espinha ilíaca posterossuperior: saliência óssea na parte de trás da pelve. Exige identificação pelo avaliador.", true),
    ...pair("joelho-costas", "Centro da fossa poplítea", "Ponto central da prega atrás do joelho."),
    ...pair("calcanhar", "Centro do calcanhar", "Ponto central do calcanhar visto de trás."),
  ],
  perfil: [
    { id: "trago", label: "Trago", definition: "Saliência de cartilagem à frente do canal da orelha." },
    { id: "acromio-perfil", label: "Acrômio", definition: "Ponto mais lateral do acrômio, visto de lado." },
    { id: "trocanter", label: "Trocânter maior", definition: "Saliência óssea lateral do fêmur, no quadril. Exige identificação pelo avaliador.", requiresPalpation: true },
    { id: "joelho-perfil", label: "Referência lateral do joelho", definition: "Ponto na linha articular lateral do joelho." },
    { id: "maleolo", label: "Maléolo lateral", definition: "Saliência óssea lateral do tornozelo." },
  ],
};

// ---------------------------------------------------------------------------
// Geometria (sempre em pixels da imagem orientada)
// ---------------------------------------------------------------------------
export function toPx(p: Pt, w: number, h: number): Pt {
  return { x: p.x * w, y: p.y * h };
}

/** Normaliza ângulos para (−90°, 90°] (direção de uma reta, sem sentido). */
export function normLineAngle(deg: number): number {
  let a = deg % 180;
  if (a <= -90) a += 180;
  if (a > 90) a -= 180;
  return a;
}

/** Ângulo da reta a→b em relação ao eixo x da imagem, em graus. Positivo = b mais alto que a na tela. */
export function lineAngle(a: Pt, b: Pt): number {
  return (Math.atan2(-(b.y - a.y), b.x - a.x) * 180) / Math.PI;
}

/** Inclinação de um segmento em relação a uma referência horizontal (ou ao eixo da imagem). */
export function inclinationDeg(a: Pt, b: Pt, ref?: { a: Pt; b: Pt }): number {
  const base = ref ? lineAngle(ref.a, ref.b) : 0;
  return normLineAngle(lineAngle(a, b) - base);
}

/** Ângulo no vértice entre os raios vertex→a e vertex→c, em [0°, 180°]. */
export function vertexAngleDeg(a: Pt, vertex: Pt, c: Pt): number {
  const v1 = { x: a.x - vertex.x, y: a.y - vertex.y };
  const v2 = { x: c.x - vertex.x, y: c.y - vertex.y };
  const n = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
  if (n === 0) return NaN;
  const cos = Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / n));
  return (Math.acos(cos) * 180) / Math.PI;
}

/**
 * Distância perpendicular com sinal de p até a reta a→b.
 * Positivo = p fica à direita da tela em relação à reta, quando a reta aponta para cima.
 */
export function signedDistanceToLine(p: Pt, a: Pt, b: Pt): number {
  // Orienta a reta "para cima" na tela (y diminuindo) para que o sinal não dependa da ordem dos cliques.
  const u = b.y - a.y <= 0 ? { x: b.x - a.x, y: b.y - a.y } : { x: a.x - b.x, y: a.y - b.y };
  const len = Math.hypot(u.x, u.y);
  if (len === 0) return NaN;
  return (u.x * (p.y - a.y) - u.y * (p.x - a.x)) / len;
}

/** Distância entre dois pontos em px. */
export function dist(a: Pt, b: Pt): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

// ---------------------------------------------------------------------------
// Lado anatômico ↔ lado da tela
// Frente: o lado direito da pessoa aparece à ESQUERDA da tela.
// Costas: o lado direito da pessoa aparece à DIREITA da tela.
// Perfil direito: a frente da pessoa aponta para a DIREITA da tela; perfil esquerdo, para a esquerda.
// (Vale para a imagem já confirmada como não espelhada.)
// ---------------------------------------------------------------------------
export function personRightOnScreen(view: "frente" | "costas"): "esquerda" | "direita" {
  return view === "frente" ? "esquerda" : "direita";
}

export function anteriorOnScreen(side: ProfileSide): "direita" | "esquerda" {
  return side === "direito" ? "direita" : "esquerda";
}

// ---------------------------------------------------------------------------
// Medidas
// ---------------------------------------------------------------------------
export type MeasureUnit = "°" | "px" | "% do segmento de referência" | "cm";

export interface Measurement {
  /** Identificador estável do método (define o que é comparável no tempo). */
  methodId: string;
  label: string;
  value: number | null;
  unit: MeasureUnit;
  /** Texto curto exibido junto do segmento. */
  short: string;
  /** Frase neutra: qual lado está mais alto, para onde desloca. */
  reading: string;
  definition: string;
  /** Pontos usados (para desenhar o rótulo). */
  anchor: Pt | null;
  missing: string | null;
  /** Base da escala de distâncias: "px", "cm" (calibração) ou "% de A–B" com o denominador em px. */
  basis?: { kind: "px" | "cm" | "segmento"; denominatorPx?: number; refPoints?: [string, string] };
}

export interface MeasureContext {
  view: PhotoView;
  profileSide: ProfileSide | null;
  width: number;
  height: number;
  data: AnnotationData;
}

const round1 = (v: number) => Math.round(v * 10) / 10;
const fmt = (v: number, unit: MeasureUnit) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: unit === "°" ? 1 : 0 })}${unit === "°" ? "°" : unit === "px" ? " px" : unit === "cm" ? " cm" : "%"}`;

function lm(ctx: MeasureContext, id: string): Pt | null {
  const l = ctx.data.landmarks.find((x) => x.id === id);
  if (!l || l.visibility === "não visível") return null;
  return toPx(l, ctx.width, ctx.height);
}

function refH(ctx: MeasureContext) {
  return ctx.data.horizontal ? { a: toPx(ctx.data.horizontal.a, ctx.width, ctx.height), b: toPx(ctx.data.horizontal.b, ctx.width, ctx.height) } : null;
}

function refV(ctx: MeasureContext) {
  return ctx.data.vertical ? { a: toPx(ctx.data.vertical.a, ctx.width, ctx.height), b: toPx(ctx.data.vertical.b, ctx.width, ctx.height) } : null;
}

/** cm por pixel, quando há calibração válida. */
export function cmPerPx(ctx: MeasureContext): number | null {
  const c = ctx.data.calibration;
  if (!c || !(c.lengthCm > 0)) return null;
  const d = dist(toPx(c.a, ctx.width, ctx.height), toPx(c.b, ctx.width, ctx.height));
  return d > 0 ? c.lengthCm / d : null;
}

/** Converte uma distância em px para a escala disponível: cm com calibração; % do segmento de referência; ou px. */
export function scaleDistance(ctx: MeasureContext, px: number): { value: number; unit: MeasureUnit; note: string; basis: NonNullable<Measurement["basis"]> } {
  const cmpp = cmPerPx(ctx);
  if (cmpp) return { value: px * cmpp, unit: "cm", note: "Em cm pela calibração registrada.", basis: { kind: "cm" } };
  const seg = ctx.data.referenceSegment;
  if (seg) {
    const a = lm(ctx, seg.from);
    const b = lm(ctx, seg.to);
    const den = a && b ? dist(a, b) : 0;
    if (den > 0) {
      const name = (id: string) => LANDMARKS[ctx.view].find((l) => l.id === id)?.label ?? id;
      return {
        value: (px / den) * 100,
        unit: "% do segmento de referência",
        note: `Em % do segmento ${name(seg.from)}–${name(seg.to)} (${round1(den)} px nesta foto).`,
        basis: { kind: "segmento", denominatorPx: round1(den), refPoints: [seg.from, seg.to] },
      };
    }
  }
  return { value: px, unit: "px", note: "Em pixels: sem calibração nem segmento de referência, não há unidade física.", basis: { kind: "px" } };
}

/**
 * Inclinação de uma linha entre um par (direito/esquerdo) e diferença vertical com sinal.
 * Sinal da diferença: positivo = lado DIREITO da pessoa mais alto na foto.
 */
function pairLine(ctx: MeasureContext, methodBase: string, label: string, rightId: string, leftId: string): Measurement[] {
  const r = lm(ctx, rightId);
  const l = lm(ctx, leftId);
  const H = refH(ctx);
  const definition = `${label}: reta entre os marcos direito e esquerdo. Inclinação medida em relação à linha de base horizontal escolhida; diferença vertical medida perpendicularmente a essa linha.`;
  if (!r || !l) {
    const missing = "Marque os dois lados (ou indique se algum não está visível).";
    return [
      { methodId: `${methodBase}-inclinacao`, label: `Inclinação: ${label.toLocaleLowerCase("pt-BR")}`, value: null, unit: "°", short: "—", reading: "Não medido", definition, anchor: null, missing },
      { methodId: `${methodBase}-diferenca`, label: `Diferença vertical: ${label.toLocaleLowerCase("pt-BR")}`, value: null, unit: "px", short: "—", reading: "Não medido", definition, anchor: null, missing },
    ];
  }
  if (!H) {
    const missing = "Escolha a linha de base horizontal antes de medir inclinações.";
    return [
      { methodId: `${methodBase}-inclinacao`, label: `Inclinação: ${label.toLocaleLowerCase("pt-BR")}`, value: null, unit: "°", short: "—", reading: "Não medido", definition, anchor: null, missing },
      { methodId: `${methodBase}-diferenca`, label: `Diferença vertical: ${label.toLocaleLowerCase("pt-BR")}`, value: null, unit: "px", short: "—", reading: "Não medido", definition, anchor: null, missing },
    ];
  }
  // Componente da diferença perpendicular à linha de base (y cresce para baixo).
  // Direção da base apontando para a direita da tela; "para cima" é a perpendicular que reduz y.
  const baseAng = (normLineAngle(lineAngle(H.a, H.b)) * Math.PI) / 180;
  const up = { x: -Math.sin(baseAng), y: -Math.cos(baseAng) };
  const proj = (p: Pt) => p.x * up.x + p.y * up.y;
  const diffPx = proj(r) - proj(l); // >0: direito mais alto
  // Inclinação sempre medida do lado de menor x para o de maior x na tela, depois expressa pelo lado mais alto.
  const [p1, p2] = r.x <= l.x ? [r, l] : [l, r];
  const inc = Math.abs(inclinationDeg(p1, p2, H));
  const higher = Math.abs(diffPx) < 0.5 ? null : diffPx > 0 ? "direito" : "esquerdo";
  const anchor = { x: (r.x + l.x) / 2, y: (r.y + l.y) / 2 };
  const sc = scaleDistance(ctx, Math.abs(diffPx));
  const diffValue = sc.value;
  const diffUnit: MeasureUnit = sc.unit;
  return [
    {
      methodId: `${methodBase}-inclinacao`,
      label: `Inclinação: ${label.toLocaleLowerCase("pt-BR")}`,
      value: round1(higher === "esquerdo" ? -inc : inc),
      unit: "°",
      short: fmt(round1(inc), "°"),
      reading: higher ? `Lado ${higher} mais alto na foto` : "Sem diferença observada na marcação",
      definition: `${definition} Valor positivo = lado direito da pessoa mais alto; negativo = lado esquerdo.`,
      anchor,
      missing: null,
    },
    {
      methodId: `${methodBase}-diferenca`,
      label: `Diferença vertical: ${label.toLocaleLowerCase("pt-BR")}`,
      value: round1(higher === "esquerdo" ? -diffValue : diffValue),
      unit: diffUnit,
      short: fmt(round1(diffValue), diffUnit),
      reading: higher ? `Lado ${higher} mais alto na foto` : "Sem diferença observada na marcação",
      definition: `${definition} Valor positivo = lado direito mais alto. ${sc.note}`,
      anchor,
      missing: null,
      basis: sc.basis,
    },
  ];
}

/** Deslocamento horizontal de um marco em relação à vertical de referência. */
function horizontalOffset(ctx: MeasureContext, id: string, label: string): Measurement {
  return offsetOf(ctx, lm(ctx, id), `deslocamento-${id}`, label, "Marco não marcado ou não visível.");
}

/** Deslocamento do ponto médio de um par (ex.: ombros) em relação à vertical de referência. */
function midpointOffset(ctx: MeasureContext, rightId: string, leftId: string, methodId: string, label: string): Measurement {
  const r = lm(ctx, rightId);
  const l = lm(ctx, leftId);
  const mid = r && l ? { x: (r.x + l.x) / 2, y: (r.y + l.y) / 2 } : null;
  return offsetOf(ctx, mid, methodId, label, "Marque os dois lados do par.");
}

function offsetOf(ctx: MeasureContext, p: Pt | null, methodId: string, label: string, missingPoint: string): Measurement {
  const V = refV(ctx);
  const base = { methodId, label: `Deslocamento horizontal: ${label}`, unit: "px" as MeasureUnit, definition: "", anchor: null as Pt | null };
  if (!V) return { ...base, value: null, short: "—", reading: "Não medido", definition: "Distância perpendicular do marco até a vertical de referência.", missing: "Escolha a vertical de referência." };
  if (!p) return { ...base, value: null, short: "—", reading: "Não medido", definition: "Distância perpendicular do marco até a vertical de referência.", missing: missingPoint };
  const d = signedDistanceToLine(p, V.a, V.b); // >0 = à direita da tela
  let towards: string;
  let sign = 1;
  if (ctx.view === "perfil" && ctx.profileSide) {
    const anteriorRight = anteriorOnScreen(ctx.profileSide) === "direita";
    sign = (d > 0) === anteriorRight ? 1 : -1;
    towards = sign > 0 ? "anterior" : "posterior";
  } else if (ctx.view !== "perfil") {
    const rightIsScreenRight = personRightOnScreen(ctx.view) === "direita";
    sign = (d > 0) === rightIsScreenRight ? 1 : -1;
    towards = sign > 0 ? "lado direito da pessoa" : "lado esquerdo da pessoa";
  } else {
    towards = "direção indefinida (lado do perfil não informado)";
  }
  const sc = scaleDistance(ctx, Math.abs(d));
  return {
    ...base,
    unit: sc.unit,
    value: round1(sign * sc.value),
    short: fmt(round1(sc.value), sc.unit),
    reading: Math.abs(d) < 0.5 ? "Sobre a vertical de referência" : `Deslocado para ${towards}`,
    definition: `Distância perpendicular até a vertical de referência. ${ctx.view === "perfil" ? "Positivo = anterior." : "Positivo = para o lado direito da pessoa."} ${sc.note}`,
    anchor: p,
    missing: null,
    basis: sc.basis,
  };
}

/** Ângulo de um segmento do perfil em relação à vertical de referência. Positivo = ponto superior anterior ao inferior. */
function lateralSegmentAngle(ctx: MeasureContext, upperId: string, lowerId: string, label: string): Measurement {
  const up = lm(ctx, upperId);
  const lo = lm(ctx, lowerId);
  const V = refV(ctx);
  const methodId = `angulo-${lowerId}-${upperId}`;
  const definition = `Ângulo entre o segmento ${label} e a vertical de referência, com vértice no ponto inferior. Positivo = ponto superior à frente (anterior) do inferior.`;
  if (!ctx.profileSide) return { methodId, label: `Ângulo ${label}`, value: null, unit: "°", short: "—", reading: "Não medido", definition, anchor: null, missing: "Informe se o perfil é direito ou esquerdo." };
  if (!V) return { methodId, label: `Ângulo ${label}`, value: null, unit: "°", short: "—", reading: "Não medido", definition, anchor: null, missing: "Escolha a vertical de referência." };
  if (!up || !lo) return { methodId, label: `Ângulo ${label}`, value: null, unit: "°", short: "—", reading: "Não medido", definition, anchor: null, missing: "Marque os dois pontos do segmento." };
  // Direção "para cima" da vertical de referência
  const vUp = V.a.y < V.b.y ? { x: V.a.x - V.b.x, y: V.a.y - V.b.y } : { x: V.b.x - V.a.x, y: V.b.y - V.a.y };
  const seg = { x: up.x - lo.x, y: up.y - lo.y };
  const ang = (Math.atan2(vUp.x * seg.y - vUp.y * seg.x, vUp.x * seg.x + vUp.y * seg.y) * 180) / Math.PI; // >0: seg girado no sentido horário na tela = para a direita
  const towardScreenRight = ang > 0;
  const anteriorRight = anteriorOnScreen(ctx.profileSide) === "direita";
  const signed = Math.abs(ang) * (towardScreenRight === anteriorRight ? 1 : -1);
  return {
    methodId,
    label: `Ângulo ${label}`,
    value: round1(signed),
    unit: "°",
    short: fmt(round1(Math.abs(signed)), "°"),
    reading: Math.abs(signed) < 0.05 ? "Alinhado à vertical de referência" : signed > 0 ? "Ponto superior anterior ao inferior" : "Ponto superior posterior ao inferior",
    definition,
    anchor: { x: (up.x + lo.x) / 2, y: (up.y + lo.y) / 2 },
    missing: null,
  };
}

export function computeMeasurements(ctx: MeasureContext): Measurement[] {
  const out: Measurement[] = [];
  if (ctx.view === "frente") {
    out.push(...pairLine(ctx, "frente-ombros", "Linha dos ombros", "acromio-d", "acromio-e"));
    out.push(...pairLine(ctx, "frente-pelve", "Linha da pelve (EIAS)", "eias-d", "eias-e"));
    out.push(midpointOffset(ctx, "acromio-d", "acromio-e", "frente-deslocamento-ombros", "ponto médio dos ombros"));
    out.push(midpointOffset(ctx, "eias-d", "eias-e", "frente-deslocamento-pelve", "ponto médio da pelve (EIAS)"));
  } else if (ctx.view === "costas") {
    out.push(...pairLine(ctx, "costas-ombros", "Linha dos ombros", "acromio-costas-d", "acromio-costas-e"));
    out.push(...pairLine(ctx, "costas-pelve", "Linha da pelve (EIPS)", "eips-d", "eips-e"));
    out.push(midpointOffset(ctx, "acromio-costas-d", "acromio-costas-e", "costas-deslocamento-ombros", "ponto médio dos ombros"));
    out.push(midpointOffset(ctx, "eips-d", "eips-e", "costas-deslocamento-pelve", "ponto médio da pelve (EIPS)"));
  } else {
    out.push(lateralSegmentAngle(ctx, "trago", "acromio-perfil", "acrômio → trago"));
    out.push(lateralSegmentAngle(ctx, "acromio-perfil", "trocanter", "trocânter → acrômio"));
    out.push(lateralSegmentAngle(ctx, "trocanter", "maleolo", "maléolo → trocânter"));
    for (const id of ["trago", "acromio-perfil", "trocanter", "joelho-perfil"]) {
      const def = LANDMARKS.perfil.find((d) => d.id === id)!;
      out.push(horizontalOffset(ctx, id, def.label));
    }
  }
  // Ângulos livres do avaliador
  for (const a of ctx.data.angles) {
    const v = vertexAngleDeg(toPx(a.a, ctx.width, ctx.height), toPx(a.vertex, ctx.width, ctx.height), toPx(a.c, ctx.width, ctx.height));
    out.push({
      methodId: `angulo-livre-${a.label}`,
      label: `Ângulo livre: ${a.label}`,
      value: Number.isFinite(v) ? round1(v) : null,
      unit: "°",
      short: Number.isFinite(v) ? fmt(round1(v), "°") : "—",
      reading: "Ângulo no vértice marcado (0° a 180°)",
      definition: "Ângulo entre os dois segmentos que partem do vértice, definido pelo avaliador.",
      anchor: toPx(a.vertex, ctx.width, ctx.height),
      missing: Number.isFinite(v) ? null : "Pontos coincidentes.",
    });
  }
  return out;
}

/** Distância entre dois marcos como % de um segmento de referência (guarda o denominador). */
export function percentOfReference(ctx: MeasureContext, p: [string, string], ref: [string, string]): { value: number | null; denominatorPx: number | null; refPoints: [string, string] } {
  const a = lm(ctx, p[0]);
  const b = lm(ctx, p[1]);
  const ra = lm(ctx, ref[0]);
  const rb = lm(ctx, ref[1]);
  if (!a || !b || !ra || !rb) return { value: null, denominatorPx: null, refPoints: ref };
  const den = dist(ra, rb);
  if (den === 0) return { value: null, denominatorPx: 0, refPoints: ref };
  return { value: round1((dist(a, b) / den) * 100), denominatorPx: round1(den), refPoints: ref };
}

// ---------------------------------------------------------------------------
// Comparabilidade entre datas
// ---------------------------------------------------------------------------
export interface MeasurementRecord {
  methodId: string;
  value: number | null;
  unit: MeasureUnit;
  view: PhotoView;
  profileSide: ProfileSide | null;
  protocol: string;
  calibrated: boolean;
  verticalSource: VerticalRefSource | null;
  mirrorConfirmed: boolean | null;
  /** Segmento de referência usado (quando a unidade é %): "de–até". */
  referenceSegment?: string | null;
}

export interface Comparison {
  methodId: string;
  baseline: number | null;
  current: number | null;
  diff: number | null;
  unit: MeasureUnit;
  comparable: boolean;
  reasons: string[];
}

/** Medidas que dependem da vertical de referência (deslocamentos e ângulos do perfil). */
export function usesVertical(methodId: string): boolean {
  return methodId.includes("deslocamento") || (methodId.startsWith("angulo-") && !methodId.startsWith("angulo-livre"));
}

/** Medidas de distância (a calibração e o segmento de referência mudam a escala). Ângulos não dependem deles. */
export function isDistance(unit: MeasureUnit): boolean {
  return unit !== "°";
}

export function compareRecords(base: MeasurementRecord, cur: MeasurementRecord): Comparison {
  const reasons: string[] = [];
  if (base.methodId !== cur.methodId) reasons.push("Métodos de medida diferentes");
  if (base.view !== cur.view) reasons.push("Vistas diferentes");
  if (base.view === "perfil" && base.profileSide !== cur.profileSide) reasons.push("Perfis de lados diferentes");
  if (base.protocol !== cur.protocol) reasons.push("Protocolos de marcação diferentes");
  if (base.unit !== cur.unit) reasons.push("Unidades diferentes (cm, % do segmento de referência ou px)");
  if (isDistance(base.unit) && base.calibrated !== cur.calibrated) reasons.push("Calibração diferente entre as fotos");
  if (usesVertical(base.methodId) && base.verticalSource !== cur.verticalSource) reasons.push("Referências verticais de tipos diferentes");
  if (base.mirrorConfirmed === null || cur.mirrorConfirmed === null) reasons.push("Orientação (espelhamento) não confirmada em alguma das fotos");
  if (isDistance(base.unit) && (base.referenceSegment ?? null) !== (cur.referenceSegment ?? null)) reasons.push("Segmentos de referência diferentes");
  if (base.value === null || cur.value === null) reasons.push("Valor ausente em uma das datas");
  const comparable = reasons.length === 0;
  return {
    methodId: base.methodId,
    baseline: base.value,
    current: cur.value,
    diff: comparable ? round1((cur.value as number) - (base.value as number)) : null,
    unit: cur.unit,
    comparable,
    reasons,
  };
}

/**
 * Tendência de uma medida ao longo de várias datas. A referência de definição é a primeira
 * data com valor; só entram as datas comparáveis a ela (mesmo método, vista, lado, protocolo,
 * calibração, referência vertical e segmento). As demais ficam listadas com o motivo.
 */
export function buildTrend(records: (MeasurementRecord & { date: string })[]): {
  points: { date: string; value: number }[];
  excluded: { date: string; reasons: string[] }[];
  unit: MeasureUnit | null;
} {
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const ref = sorted.find((r) => r.value !== null);
  if (!ref) return { points: [], excluded: sorted.map((r) => ({ date: r.date, reasons: ["Valor ausente"] })), unit: null };
  const points: { date: string; value: number }[] = [];
  const excluded: { date: string; reasons: string[] }[] = [];
  for (const r of sorted) {
    const c = r === ref ? null : compareRecords(ref, r);
    if (r === ref) points.push({ date: r.date, value: r.value as number });
    else if (c && c.comparable) points.push({ date: r.date, value: r.value as number });
    else excluded.push({ date: r.date, reasons: c?.reasons ?? ["Valor ausente"] });
  }
  return { points, excluded, unit: ref.unit };
}

/** Medidas com o mesmo ponto de ancoragem recebem índices 0, 1, 2… para empilhar os rótulos sem sobrepor. */
export function stackLabels(ms: Measurement[]): { m: Measurement; row: number }[] {
  const seen = new Map<string, number>();
  return ms
    .filter((m) => m.anchor && m.value !== null)
    .map((m) => {
      const k = `${Math.round(m.anchor!.x)}:${Math.round(m.anchor!.y)}`;
      const row = seen.get(k) ?? 0;
      seen.set(k, row + 1);
      return { m, row };
    });
}

export const POSTURE_NOTE = "As medidas dependem da padronização da foto e da marcação dos pontos. Interprete junto à avaliação funcional.";

export function emptyAnnotation(): AnnotationData {
  return {
    landmarks: [],
    vertical: null,
    horizontal: null,
    showMidline: false,
    calibration: null,
    angles: [],
    grid: { spacingPct: 5, opacity: 0.35, contrast: "claro", visible: true },
    quality: { framing: "corpo inteiro", cameraLevel: "não verificado", notes: "" },
  };
}

/** Espelhar a imagem: as anotações existentes são espelhadas junto (x → 1 − x). */
export function mirrorAnnotation(d: AnnotationData): AnnotationData {
  const m = (p: Pt): Pt => ({ x: 1 - p.x, y: p.y });
  const swap = (id: string) => (id.endsWith("-d") ? id.slice(0, -2) + "-e" : id.endsWith("-e") ? id.slice(0, -2) + "-d" : id);
  return {
    ...d,
    // Ao espelhar, o ponto marcado como "direito" passa a ficar onde o esquerdo estaria: os rótulos trocam.
    landmarks: d.landmarks.map((l) => ({ ...l, id: swap(l.id), x: 1 - l.x })),
    vertical: d.vertical ? { ...d.vertical, a: m(d.vertical.a), b: m(d.vertical.b) } : null,
    horizontal: d.horizontal ? { a: m(d.horizontal.a), b: m(d.horizontal.b) } : null,
    calibration: d.calibration ? { ...d.calibration, a: m(d.calibration.a), b: m(d.calibration.b) } : null,
    angles: d.angles.map((a) => ({ ...a, a: m(a.a), vertex: m(a.vertex), c: m(a.c) })),
    referenceSegment: d.referenceSegment ? { from: swap(d.referenceSegment.from), to: swap(d.referenceSegment.to) } : null,
  };
}
