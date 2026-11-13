// Gera a identidade vetorial Leandro Rangel a partir de geometria própria + texto convertido em contornos.
// Uso: node scripts/build-logo.mjs
// Saídas: public/brand/*.svg|*.png, src/app/icon.png, src/app/apple-icon.png, src/lib/brand/logo-paths.ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";
import { Resvg } from "@resvg/resvg-js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fontDir = path.join(root, "scripts", "logo-src");
const out = (p) => path.join(root, p);
fs.mkdirSync(out("public/brand"), { recursive: true });
fs.mkdirSync(out("src/lib/brand"), { recursive: true });

const semi = opentype.loadSync(path.join(fontDir, "manrope-latin-500-normal.woff"));
const bold = opentype.loadSync(path.join(fontDir, "manrope-latin-700-normal.woff"));

// ---------------------------------------------------------------------------
// Monograma LR (viewBox 0 0 120 120). Haste do L = haste do R, como no original.
// ---------------------------------------------------------------------------
const FRAME = "M34 4H86A30 30 0 0 1 116 34V86A30 30 0 0 1 86 116H34A30 30 0 0 1 4 86V34A30 30 0 0 1 34 4ZM34 9.5A24.5 24.5 0 0 0 9.5 34V86A24.5 24.5 0 0 0 34 110.5H86A24.5 24.5 0 0 0 110.5 86V34A24.5 24.5 0 0 0 86 9.5Z";
const L = "M40 24V80H66V96H38A14 14 0 0 1 24 82V38A14 14 0 0 1 38 24Z";
const R_BOWL = "M46 24H82A14 14 0 0 1 96 38V50A14 14 0 0 1 82 64H40V51H46ZM60 37V51H81V37Z";
const R_LEG = "M60 64H76L98 92L92.4 98H86.7Z";
const GLYPH = [L, R_BOWL, R_LEG].join("");

// ---------------------------------------------------------------------------
// Texto em contornos
// ---------------------------------------------------------------------------
function textPath(font, text, size, tracking) {
  // tracking em fração do corpo (em)
  let x = 0;
  const parts = [];
  const glyphs = font.stringToGlyphs(text);
  glyphs.forEach((g, i) => {
    const p = g.getPath(x, 0, size);
    parts.push(p.toPathData(2));
    const adv = (g.advanceWidth / font.unitsPerEm) * size;
    const kern = i < glyphs.length - 1 ? (font.getKerningValue(g, glyphs[i + 1]) / font.unitsPerEm) * size : 0;
    x += adv + kern + (i < glyphs.length - 1 ? tracking * size : 0);
  });
  const bbox = font.getPath(text, 0, 0, size).getBoundingBox();
  return { d: parts.join(""), width: x, ascent: -bbox.y1, descent: bbox.y2 };
}

const NAME = textPath(semi, "LEANDRO RANGEL", 40, 0.06);
// Assinatura: três palavras + separadores verticais finos (o "|" da fonte parecia a letra I)
function tagline() {
  const size = 11, tr = 0.24, gap = 10, bar = 1.1;
  const cap = (bold.charToGlyph("M").getBoundingBox().y2 / bold.unitsPerEm) * size;
  const words = ["MUSCULAÇÃO", "PILATES", "REABILITAÇÃO"].map((w) => textPath(bold, w, size, tr));
  let x = 0;
  const items = [];
  words.forEach((w, i) => {
    items.push({ d: w.d, x });
    x += w.width;
    if (i < words.length - 1) {
      x += gap;
      items.push({ rect: { x, w: bar, y: -cap - 1, h: cap + 2 } });
      x += bar + gap;
    }
  });
  return { items, width: x };
}
const TAG = tagline();
// Renderiza a assinatura escalada a partir de (tx, ty) na linha de base
function tagBody(fill, tx, ty, s) {
  return TAG.items
    .map((it) =>
      it.d
        ? `<path fill="${fill}" transform="translate(${(tx + it.x * s).toFixed(2)} ${ty.toFixed(2)}) scale(${s})" d="${it.d}"/>`
        : `<rect fill="${fill}" x="${(tx + it.rect.x * s).toFixed(2)}" y="${(ty + it.rect.y * s).toFixed(2)}" width="${(it.rect.w * s).toFixed(2)}" height="${(it.rect.h * s).toFixed(2)}"/>`
    )
    .join("");
}
const NAME_CAP = (semi.charToGlyph("E").getBoundingBox().y2 / semi.unitsPerEm) * 40; // altura das maiúsculas

// ---------------------------------------------------------------------------
// Composições
// ---------------------------------------------------------------------------
function svg({ w, h, body, title }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w.toFixed(2)} ${h.toFixed(2)}" role="img" aria-labelledby="t"><title id="t">${title}</title>${body}</svg>\n`;
}
const g = (d, fill, tx = 0, ty = 0, s = 1) =>
  `<path fill="${fill}" fill-rule="evenodd" transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s})" d="${d}"/>`;

function symbol(fill, accent = fill) {
  return { w: 120, h: 120, body: g(FRAME, accent) + g(GLYPH, fill), title: "Leandro Rangel" };
}

// Horizontal: símbolo 48px + nome alinhado opticamente pelo centro da altura das maiúsculas
function horizontal(fill, accent = fill, withTag = false) {
  const s = 0.5; // símbolo 60px
  const symW = 120 * s;
  const gap = 18;
  const nameScale = 0.62;
  const capH = NAME_CAP * nameScale;
  const h = 60;
  const nameY = withTag ? h / 2 - 4 : h / 2 + capH / 2;
  let body = g(FRAME, accent, 0, 0, s) + g(GLYPH, fill, 0, 0, s);
  body += g(NAME.d, fill, symW + gap, nameY, nameScale);
  let w = symW + gap + NAME.width * nameScale;
  if (withTag) {
    const tagScale = (NAME.width * nameScale) / TAG.width;
    body += tagBody(fill, symW + gap, nameY + 16, tagScale);
  }
  return { w, h, body, title: "Leandro Rangel" };
}

// Completa: símbolo acima, nome e assinatura centralizados
function full(fill, accent = fill) {
  const nameW = NAME.width;
  const w = nameW;
  const symS = 0.9;
  const symW = 120 * symS;
  const tagScale = nameW / TAG.width;
  const nameY = symW + 26 + NAME_CAP;
  const tagY = nameY + 26;
  let body = g(FRAME, accent, (w - symW) / 2, 0, symS) + g(GLYPH, fill, (w - symW) / 2, 0, symS);
  body += g(NAME.d, fill, 0, nameY, 1);
  body += tagBody(fill, 0, tagY, tagScale);
  return { w, h: tagY + 4, body, title: "Leandro Rangel — Musculação, Pilates e Reabilitação" };
}

const COLORS = { grafite: "#17231F", branco: "#FAFBFA", verde: "#27634F" };
const files = {
  "simbolo-grafite": symbol(COLORS.grafite),
  "simbolo-branco": symbol(COLORS.branco),
  "simbolo-verde": symbol(COLORS.grafite, COLORS.verde),
  "horizontal-grafite": horizontal(COLORS.grafite),
  "horizontal-branco": horizontal(COLORS.branco),
  "horizontal-verde": horizontal(COLORS.grafite, COLORS.verde),
  "horizontal-assinatura-grafite": horizontal(COLORS.grafite, COLORS.grafite, true),
  "horizontal-assinatura-branco": horizontal(COLORS.branco, COLORS.branco, true),
  "completa-grafite": full(COLORS.grafite),
  "completa-branco": full(COLORS.branco),
  "completa-verde": full(COLORS.grafite, COLORS.verde),
};

function png(svgText, width, file, background) {
  const r = new Resvg(svgText, { fitTo: { mode: "width", value: width }, background });
  fs.writeFileSync(file, r.render().asPng());
}

for (const [name, spec] of Object.entries(files)) {
  const text = svg(spec);
  fs.writeFileSync(out(`public/brand/${name}.svg`), text);
  png(text, name.startsWith("simbolo") ? 512 : 1600, out(`public/brand/${name}.png`));
}

// Ícones de aplicação: símbolo branco sobre grafite, com respiro
function appIcon(size, file, padding = 0.16) {
  const inner = 120;
  const total = inner / (1 - padding * 2);
  const off = (total - inner) / 2;
  const body = `<rect width="${total}" height="${total}" rx="${total * 0.22}" fill="${COLORS.grafite}"/>` + g(FRAME, "#92CBB0", off, off) + g(GLYPH, COLORS.branco, off, off);
  png(svg({ w: total, h: total, body, title: "Leandro Rangel" }), size, file);
}
appIcon(512, out("src/app/icon.png"));
appIcon(180, out("src/app/apple-icon.png"));
appIcon(192, out("public/brand/app-icon-192.png"));
appIcon(512, out("public/brand/app-icon-512.png"));
// favicon pequeno: sem moldura fina (ilegível em 16–32px), só o monograma sobre grafite
const fav = `<rect width="120" height="120" rx="26" fill="${COLORS.grafite}"/>` + g(GLYPH, COLORS.branco, 6, 6, 0.9);
png(svg({ w: 120, h: 120, body: fav, title: "Leandro Rangel" }), 32, out("public/brand/favicon-32.png"));
fs.writeFileSync(out("public/brand/favicon.svg"), svg({ w: 120, h: 120, body: fav, title: "Leandro Rangel" }));

// Dados de caminho para o componente React (usa currentColor)
const ts = `// Gerado por scripts/build-logo.mjs — não editar à mão.
export const LOGO_FRAME = ${JSON.stringify(FRAME)};
export const LOGO_GLYPH = ${JSON.stringify(GLYPH)};
export const LOGO_NAME = { d: ${JSON.stringify(NAME.d)}, width: ${NAME.width.toFixed(2)}, capHeight: ${NAME_CAP.toFixed(2)} };
export const LOGO_TAG_ITEMS = ${JSON.stringify(TAG.items)};
export const LOGO_TAG_WIDTH = ${TAG.width.toFixed(2)};
`;
fs.writeFileSync(out("src/lib/brand/logo-paths.ts"), ts);
console.log("Logo gerada:", Object.keys(files).length, "variantes + ícones");
