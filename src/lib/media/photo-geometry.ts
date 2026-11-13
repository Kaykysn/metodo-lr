// ==============================================================================
// Mapeamento tela ↔ imagem e orientação EXIF (funções puras, testadas).
// A imagem é exibida "contida" (sem cortar), com zoom e deslocamento. As anotações
// ficam em coordenadas da imagem orientada; a tela só converte.
// ==============================================================================
import type { Pt } from "../domain/posture";

export interface Viewport {
  /** Tamanho do contêiner na tela (px CSS). */
  cw: number;
  ch: number;
  /** Tamanho intrínseco da imagem orientada. */
  w: number;
  h: number;
  /** Zoom ≥ 1 (1 = imagem inteira visível). */
  zoom: number;
  /** Centro da área visível, em px da imagem. */
  cx: number;
  cy: number;
}

/** Retângulo da imagem visível (viewBox), já limitado às bordas. */
export function viewBoxOf(v: Viewport): { x: number; y: number; w: number; h: number } {
  const vw = v.w / v.zoom;
  const vh = v.h / v.zoom;
  const x = Math.min(Math.max(v.cx - vw / 2, 0), v.w - vw);
  const y = Math.min(Math.max(v.cy - vh / 2, 0), v.h - vh);
  return { x, y, w: vw, h: vh };
}

/** Escala e margens de enquadramento (letterbox) do viewBox dentro do contêiner. */
function fit(v: Viewport) {
  const vb = viewBoxOf(v);
  const k = Math.min(v.cw / vb.w, v.ch / vb.h);
  return { vb, k, ox: (v.cw - vb.w * k) / 2, oy: (v.ch - vb.h * k) / 2 };
}

export function screenToImage(p: Pt, v: Viewport): Pt {
  const { vb, k, ox, oy } = fit(v);
  return { x: vb.x + (p.x - ox) / k, y: vb.y + (p.y - oy) / k };
}

export function imageToScreen(p: Pt, v: Viewport): Pt {
  const { vb, k, ox, oy } = fit(v);
  return { x: ox + (p.x - vb.x) * k, y: oy + (p.y - vb.y) * k };
}

/** Ponto da tela dentro da imagem? (fora = nas barras de enquadramento) */
export function insideImage(p: Pt, v: Viewport): boolean {
  const q = screenToImage(p, v);
  return q.x >= 0 && q.y >= 0 && q.x <= v.w && q.y <= v.h;
}

/** Zoom mantendo fixo o ponto sob o cursor. */
export function zoomAt(v: Viewport, screen: Pt, nextZoom: number): Viewport {
  const z = Math.min(8, Math.max(1, nextZoom));
  const before = screenToImage(screen, v);
  const tmp = { ...v, zoom: z };
  const after = screenToImage(screen, tmp);
  return { ...tmp, cx: v.cx + (before.x - after.x), cy: v.cy + (before.y - after.y) };
}

/** Arrasto: desloca a área visível por um delta da tela. */
export function panBy(v: Viewport, dScreen: Pt): Viewport {
  const { k } = fit(v);
  return { ...v, cx: v.cx - dScreen.x / k, cy: v.cy - dScreen.y / k };
}

export const toNorm = (p: Pt, w: number, h: number): Pt => ({ x: p.x / w, y: p.y / h });
export const fromNorm = (p: Pt, w: number, h: number): Pt => ({ x: p.x * w, y: p.y * h });

// ---------------------------------------------------------------------------
// Orientação EXIF (valores 1–8)
// Mapeia um ponto da imagem crua (como gravada pelo sensor) para a imagem orientada.
// ---------------------------------------------------------------------------
export function orientedSize(w: number, h: number, o: number): { w: number; h: number } {
  return o >= 5 && o <= 8 ? { w: h, h: w } : { w, h };
}

export function orientPoint(p: Pt, w: number, h: number, o: number): Pt {
  switch (o) {
    case 2: return { x: w - p.x, y: p.y }; // espelhada na horizontal
    case 3: return { x: w - p.x, y: h - p.y }; // 180°
    case 4: return { x: p.x, y: h - p.y }; // espelhada na vertical
    case 5: return { x: p.y, y: p.x }; // transposta
    case 6: return { x: h - p.y, y: p.x }; // 90° horário
    case 7: return { x: h - p.y, y: w - p.x }; // transversa
    case 8: return { x: p.y, y: w - p.x }; // 90° anti-horário
    default: return { ...p };
  }
}

/** Matriz de canvas (a, b, c, d, e, f) que desenha a imagem crua já orientada. */
export function orientationMatrix(o: number, w: number, h: number): [number, number, number, number, number, number] {
  switch (o) {
    case 2: return [-1, 0, 0, 1, w, 0];
    case 3: return [-1, 0, 0, -1, w, h];
    case 4: return [1, 0, 0, -1, 0, h];
    case 5: return [0, 1, 1, 0, 0, 0];
    case 6: return [0, 1, -1, 0, h, 0];
    case 7: return [0, -1, -1, 0, h, w];
    case 8: return [0, -1, 1, 0, 0, w];
    default: return [1, 0, 0, 1, 0, 0];
  }
}

export function applyMatrix(m: [number, number, number, number, number, number], p: Pt): Pt {
  const [a, b, c, d, e, f] = m;
  return { x: a * p.x + c * p.y + e, y: b * p.x + d * p.y + f };
}
