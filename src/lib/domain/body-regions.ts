// ==============================================================================
// Regiões corporais com lateralidade da PESSOA avaliada
// ==============================================================================
// Convenção: `side` é sempre o lado da pessoa. Na vista ANTERIOR (de frente), o lado
// direito da pessoa aparece à ESQUERDA de quem olha. Na vista POSTERIOR (de costas),
// aparece à DIREITA de quem olha. As coordenadas abaixo são normalizadas (0–1) no
// mesmo quadro (viewBox 0 0 400 1000) da ilustração, para nunca se deslocarem.

export type View = "anterior" | "posterior";
export type Side = "right" | "left" | "midline";

export interface RegionDef {
  /** ID persistente: base + lado (ex.: "knee:right"). */
  id: string;
  base: string;
  side: Side;
  label: string;
  group: "cabeça e coluna" | "tronco" | "membro superior" | "quadril" | "membro inferior";
  /** Ponto de marcação por vista (normalizado). Ausente = não visível nessa vista. */
  at: Partial<Record<View, { x: number; y: number; r: number }>>;
}

const SIDE_LABEL: Record<Side, string> = { right: "direito", left: "esquerdo", midline: "" };
const SIDE_LABEL_F: Record<Side, string> = { right: "direita", left: "esquerda", midline: "" };

/** x no quadro da imagem para um lado da pessoa, dado o x "do lado direito da pessoa" visto de frente. */
function mirror(xPersonRightAnterior: number, side: Side, view: View): number {
  // xPersonRightAnterior é a posição do lado DIREITO da pessoa na vista anterior (fica à esquerda: x < 0.5)
  if (side === "midline") return 0.5;
  const rightX = view === "anterior" ? xPersonRightAnterior : 1 - xPersonRightAnterior;
  return side === "right" ? rightX : 1 - rightX;
}

type Spec = {
  base: string;
  label: (side: Side) => string;
  group: RegionDef["group"];
  bilateral: boolean;
  /** x do lado direito da pessoa na vista anterior (0–0.5) ou 0.5 se linha média */
  x: number;
  y: number;
  r: number;
  views: View[];
};

const m = (name: string) => (s: Side) => (s === "midline" ? name : `${name} ${SIDE_LABEL[s]}`);
const f = (name: string) => (s: Side) => (s === "midline" ? name : `${name} ${SIDE_LABEL_F[s]}`);

const SPECS: Spec[] = [
  { base: "neck", label: () => "Pescoço / coluna cervical", group: "cabeça e coluna", bilateral: false, x: 0.5, y: 0.145, r: 0.028, views: ["anterior", "posterior"] },
  { base: "thoracic", label: () => "Coluna torácica", group: "cabeça e coluna", bilateral: false, x: 0.5, y: 0.27, r: 0.032, views: ["posterior"] },
  { base: "lumbar", label: () => "Coluna lombar", group: "cabeça e coluna", bilateral: false, x: 0.5, y: 0.4, r: 0.034, views: ["posterior"] },
  { base: "sacroiliac", label: f("Região sacroilíaca"), group: "quadril", bilateral: true, x: 0.455, y: 0.455, r: 0.022, views: ["posterior"] },
  { base: "chest", label: m("Peitoral"), group: "tronco", bilateral: true, x: 0.42, y: 0.235, r: 0.04, views: ["anterior"] },
  { base: "abdomen", label: () => "Abdômen", group: "tronco", bilateral: false, x: 0.5, y: 0.355, r: 0.045, views: ["anterior"] },
  { base: "shoulder", label: m("Ombro"), group: "membro superior", bilateral: true, x: 0.33, y: 0.2, r: 0.03, views: ["anterior", "posterior"] },
  { base: "arm", label: m("Braço"), group: "membro superior", bilateral: true, x: 0.29, y: 0.29, r: 0.028, views: ["anterior", "posterior"] },
  { base: "elbow", label: m("Cotovelo"), group: "membro superior", bilateral: true, x: 0.265, y: 0.36, r: 0.022, views: ["anterior", "posterior"] },
  { base: "forearm", label: m("Antebraço"), group: "membro superior", bilateral: true, x: 0.245, y: 0.42, r: 0.024, views: ["anterior", "posterior"] },
  { base: "wrist_hand", label: f("Punho / mão"), group: "membro superior", bilateral: true, x: 0.225, y: 0.5, r: 0.026, views: ["anterior", "posterior"] },
  { base: "hip_groin", label: f("Quadril / virilha"), group: "quadril", bilateral: true, x: 0.43, y: 0.47, r: 0.028, views: ["anterior"] },
  { base: "glute", label: m("Glúteo"), group: "quadril", bilateral: true, x: 0.42, y: 0.49, r: 0.04, views: ["posterior"] },
  { base: "anterior_thigh", label: f("Coxa anterior"), group: "membro inferior", bilateral: true, x: 0.415, y: 0.59, r: 0.038, views: ["anterior"] },
  { base: "posterior_thigh", label: f("Coxa posterior"), group: "membro inferior", bilateral: true, x: 0.415, y: 0.6, r: 0.038, views: ["posterior"] },
  { base: "knee", label: m("Joelho"), group: "membro inferior", bilateral: true, x: 0.415, y: 0.7, r: 0.026, views: ["anterior", "posterior"] },
  { base: "leg", label: f("Perna (canela)"), group: "membro inferior", bilateral: true, x: 0.42, y: 0.79, r: 0.026, views: ["anterior"] },
  { base: "calf", label: f("Panturrilha"), group: "membro inferior", bilateral: true, x: 0.42, y: 0.79, r: 0.03, views: ["posterior"] },
  { base: "ankle_foot", label: m("Tornozelo / pé"), group: "membro inferior", bilateral: true, x: 0.425, y: 0.93, r: 0.026, views: ["anterior", "posterior"] },
];

function build(): RegionDef[] {
  const out: RegionDef[] = [];
  for (const s of SPECS) {
    const sides: Side[] = s.bilateral ? ["right", "left"] : ["midline"];
    for (const side of sides) {
      const at: RegionDef["at"] = {};
      for (const v of s.views) at[v] = { x: mirror(s.x, side, v), y: s.y, r: s.r };
      out.push({ id: side === "midline" ? s.base : `${s.base}:${side}`, base: s.base, side, label: s.label(side), group: s.group, at });
    }
  }
  return out;
}

export const BODY_REGIONS_V2: RegionDef[] = build();
export const REGION_BY_ID = new Map(BODY_REGIONS_V2.map((r) => [r.id, r]));

/** IDs do mapa anterior (v1) → IDs atuais. Migração explícita, sem perda. */
export const LEGACY_REGION_MAP: Record<string, string> = {
  cervical: "neck",
  thoracic: "thoracic",
  lumbar: "lumbar",
  sacroiliac: "sacroiliac:right", // v1 não distinguia lado: ver migrateLegacyRegions
  right_shoulder: "shoulder:right",
  left_shoulder: "shoulder:left",
  right_elbow: "elbow:right",
  left_elbow: "elbow:left",
  right_wrist: "wrist_hand:right",
  left_wrist: "wrist_hand:left",
  right_glute: "glute:right",
  left_glute: "glute:left",
  right_anterior_thigh: "anterior_thigh:right",
  left_anterior_thigh: "anterior_thigh:left",
  right_posterior_thigh: "posterior_thigh:right",
  left_posterior_thigh: "posterior_thigh:left",
  right_knee: "knee:right",
  left_knee: "knee:left",
  right_ankle: "ankle_foot:right",
  left_ankle: "ankle_foot:left",
};

/**
 * Converte IDs v1. "sacroiliac" sem lado vira as duas sacroilíacas, para não
 * escolher um lado arbitrariamente. IDs desconhecidos são devolvidos em `unknown`.
 */
export function migrateLegacyRegions(ids: string[]): { ids: string[]; unknown: string[] } {
  const res = new Set<string>();
  const unknown: string[] = [];
  for (const id of ids) {
    if (REGION_BY_ID.has(id)) res.add(id);
    else if (id === "sacroiliac") {
      res.add("sacroiliac:right");
      res.add("sacroiliac:left");
    } else if (LEGACY_REGION_MAP[id]) res.add(LEGACY_REGION_MAP[id]);
    else unknown.push(id);
  }
  return { ids: Array.from(res), unknown };
}

/** Rótulo curto D/E com o significado da pessoa avaliada. */
export function sideTag(side: Side): string {
  return side === "right" ? "D" : side === "left" ? "E" : "";
}

/** Em qual lado da TELA aparece o lado da pessoa, em cada vista. */
export function screenSide(side: Side, view: View): "left" | "right" | "center" {
  if (side === "midline") return "center";
  if (view === "anterior") return side === "right" ? "left" : "right";
  return side === "right" ? "right" : "left";
}
