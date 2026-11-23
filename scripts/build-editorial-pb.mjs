// Gera as camadas preto e branco do banco editorial (public/images/metodo-lr).
//
// Para cada cena:
//   <id>-pb.webp        base em preto e branco, mesmo recorte da foto em cor;
//   <id>-vidro-pb.webp  faixa de vidro canelado em preto e branco.
// A foto em cor (<id>.webp) continua sendo revelada pela lente.
//
// Com --camadas <id>, também recria <id>-pontos.webp e <id>-vidro.webp a partir da
// foto em cor (usado quando uma cena nova entra sem as camadas do banco).
// Com --fonte <arquivo> <id>, primeiro converte a fonte em <id>.webp (1672 × 941).
//
// Uso:
//   node scripts/build-editorial-pb.mjs
//   node scripts/build-editorial-pb.mjs --fonte caminho/foto.png hero-homem --camadas hero-homem
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const DIR = path.join(import.meta.dirname, "..", "public", "images", "metodo-lr");
// Nomes-base dos arquivos (o hero usa hero-homem; veja src/lib/landing/editorial-media.ts).
const SCENES = ["hero-homem", "avaliacao", "planejamento", "acompanhamento", "reavaliacao", "prescricao"];
const W = 1672;
const H = 941;
const WEBP = { quality: 86, effort: 5 };

const args = process.argv.slice(2);
const fonteIdx = args.indexOf("--fonte");
const camadasIdx = args.indexOf("--camadas");

/** Luminância perceptual com leve curva de contraste (P&B editorial, pretos densos). */
function toGray(data, channels) {
  const out = Buffer.alloc((data.length / channels) * 3);
  for (let i = 0, o = 0; i < data.length; i += channels, o += 3) {
    const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    const n = l / 255;
    const c = n < 0.5 ? 2 * n * n : 1 - 2 * (1 - n) * (1 - n); // curva em S
    const v = Math.round(255 * (0.72 * n + 0.28 * c));
    out[o] = out[o + 1] = out[o + 2] = v;
  }
  return out;
}

async function rgb(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== W || info.height !== H) throw new Error(`${file}: esperado ${W}×${H}, veio ${info.width}×${info.height}`);
  return data;
}

const save = (buf, name) =>
  sharp(buf, { raw: { width: W, height: H, channels: 3 } }).webp(WEBP).toFile(path.join(DIR, name));

/** Retícula ordenada monocromática, como as camadas -pontos do banco. */
function halftone(src) {
  const out = Buffer.alloc(src.length);
  const P = 4; // período da retícula, em px
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3;
      const l = (0.2126 * src[i] + 0.7152 * src[i + 1] + 0.0722 * src[i + 2]) / 255;
      const dx = (x % P) - (P - 1) / 2;
      const dy = (y % P) - (P - 1) / 2;
      const r = Math.sqrt(dx * dx + dy * dy) / (P / 2); // 0 no centro do ponto
      const dot = r < 0.35 + l * 0.75; // pontos maiores nas luzes
      const v = Math.round(255 * Math.min(1, dot ? l * 1.15 + 0.02 : l * 0.12));
      out[i] = out[i + 1] = out[i + 2] = v;
    }
  }
  return out;
}

/** Vidro canelado: cada canelura amplia e desloca a faixa por trás, com borda clara. */
function fluted(src) {
  const out = Buffer.alloc(src.length);
  const RIB = 24;
  for (let x = 0; x < W; x++) {
    const start = Math.floor(x / RIB) * RIB;
    const t = (x - start) / RIB; // 0..1 dentro da canelura
    const sx = Math.min(W - 1, Math.max(0, Math.round(start + RIB * 0.5 + (t - 0.5) * RIB * 0.55 - RIB * 0.35)));
    const light = 1 + 0.22 * Math.exp(-((t - 0.08) ** 2) / 0.004) - 0.16 * Math.exp(-((t - 0.97) ** 2) / 0.003);
    for (let y = 0; y < H; y++) {
      const o = (y * W + x) * 3;
      const s = (y * W + sx) * 3;
      for (let c = 0; c < 3; c++) out[o + c] = Math.min(255, Math.round(src[s + c] * light));
    }
  }
  return out;
}

if (fonteIdx !== -1) {
  const [file, id] = args.slice(fonteIdx + 1, fonteIdx + 3);
  await sharp(file).resize(W, H, { fit: "cover", position: "centre" }).webp({ quality: 88, effort: 5 }).toFile(path.join(DIR, `${id}.webp`));
  console.log(`✓ ${id}.webp a partir de ${path.basename(file)}`);
}

if (camadasIdx !== -1) {
  const id = args[camadasIdx + 1];
  const src = await rgb(path.join(DIR, `${id}.webp`));
  await save(halftone(src), `${id}-pontos.webp`);
  await save(fluted(src), `${id}-vidro.webp`);
  console.log(`✓ ${id}-pontos.webp e ${id}-vidro.webp`);
}

for (const id of SCENES) {
  const foto = path.join(DIR, `${id}.webp`);
  const vidro = path.join(DIR, `${id}-vidro.webp`);
  if (!fs.existsSync(foto) || !fs.existsSync(vidro)) throw new Error(`Cena incompleta: ${id}`);
  await save(toGray(await rgb(foto), 3), `${id}-pb.webp`);
  await save(toGray(await rgb(vidro), 3), `${id}-vidro-pb.webp`);
  console.log(`✓ ${id}-pb.webp e ${id}-vidro-pb.webp`);
}
