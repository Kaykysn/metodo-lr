// ==============================================================================
// Recebimento de fotos: validação do conteúdo real (não só da extensão), decodificação,
// orientação EXIF e geração de um derivado sem metadados (sem localização).
// O original não é guardado: só o derivado reprocessado. Ver política de retenção.
// ==============================================================================
import { orientationMatrix, orientedSize } from "./photo-geometry";

export const MAX_INPUT_BYTES = 25 * 1024 * 1024;
export const MIN_SHORT_SIDE = 480;
export const MAX_LONG_SIDE = 2048;
/** Qualidade do WebP gravado (0–1). Detalhe postural visível com arquivos de algumas centenas de KB. */
export const WEBP_QUALITY = 0.85;
export const RETENTION_POLICY =
  "O arquivo original não é guardado. O app guarda só uma versão reprocessada (WebP, até 2.048 px no lado maior, sem ampliar fotos menores), sem metadados de câmera ou de localização. Ela fica até ser excluída pelo profissional ou até o aluno ser removido conforme a política de privacidade.";

export type SniffedType = "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "image/gif" | "unknown";

/** Identifica o formato pelos primeiros bytes. */
export function sniffImageType(b: Uint8Array): SniffedType {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  if (b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "image/gif";
  if (b.length >= 12 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
    if (["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].includes(brand)) return "image/heic";
  }
  return "unknown";
}

/** Lê a orientação EXIF (1–8) de um JPEG. 1 quando ausente ou ilegível. */
export function readJpegOrientation(b: Uint8Array): number {
  if (sniffImageType(b) !== "image/jpeg") return 1;
  let i = 2;
  while (i + 4 < b.length) {
    if (b[i] !== 0xff) return 1;
    const marker = b[i + 1];
    const len = (b[i + 2] << 8) | b[i + 3];
    if (marker === 0xe1 && String.fromCharCode(b[i + 4], b[i + 5], b[i + 6], b[i + 7]) === "Exif") {
      const t = i + 10; // início do cabeçalho TIFF
      const little = b[t] === 0x49;
      const u16 = (o: number) => (little ? b[o] | (b[o + 1] << 8) : (b[o] << 8) | b[o + 1]);
      const u32 = (o: number) => (little ? (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0 : ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0);
      const ifd = t + u32(t + 4);
      const n = u16(ifd);
      for (let k = 0; k < n; k++) {
        const e = ifd + 2 + k * 12;
        if (e + 10 > b.length) break;
        if (u16(e) === 0x0112) {
          const v = u16(e + 8);
          return v >= 1 && v <= 8 ? v : 1;
        }
      }
      return 1;
    }
    if (marker === 0xda) return 1; // início dos dados da imagem
    i += 2 + len;
  }
  return 1;
}

export type IntakeError =
  | { code: "tipo"; message: string }
  | { code: "heic"; message: string }
  | { code: "tamanho"; message: string }
  | { code: "dimensao"; message: string }
  | { code: "decodificacao"; message: string };

export const HEIC_HELP =
  "Fotos HEIC (padrão do iPhone) não abrem em todos os navegadores. No iPhone, use Ajustes › Câmera › Formatos › Mais compatível, ou exporte a foto como JPEG antes de enviar.";

/** Validação que não depende do navegador (usada também no servidor). */
export function validateBytes(bytes: Uint8Array, size: number): { type: SniffedType } | IntakeError {
  if (size > MAX_INPUT_BYTES) return { code: "tamanho", message: `Arquivo maior que ${MAX_INPUT_BYTES / 1024 / 1024} MB. Envie uma foto menor.` };
  const type = sniffImageType(bytes);
  if (type === "unknown" || type === "image/gif") return { code: "tipo", message: "O arquivo não é uma foto JPEG, PNG, WebP ou HEIC." };
  return { type };
}

export function validateDimensions(w: number, h: number): IntakeError | null {
  if (Math.min(w, h) < MIN_SHORT_SIDE) return { code: "dimensao", message: `A foto é pequena demais (${w} × ${h} px). Use pelo menos ${MIN_SHORT_SIDE} px no lado menor.` };
  return null;
}

export interface ProcessedPhoto {
  blob: Blob;
  width: number;
  height: number;
  mime: "image/webp" | "image/jpeg";
  orientation: number;
  orientationApplied: "navegador" | "app" | "não necessária";
}

/**
 * Decodifica, aplica a orientação EXIF e regrava como WebP sem metadados (JPEG só onde o navegador
 * não sabe gravar WebP; o servidor confere os bytes e aceita os dois).
 * Navegadores atuais aplicam a orientação ao decodificar; quando a rotação de 90° não
 * aparece nas dimensões, o app aplica a matriz por conta própria.
 */
export async function processPhoto(file: File, onStep?: (s: string) => void): Promise<ProcessedPhoto | IntakeError> {
  onStep?.("Lendo o arquivo");
  const head = new Uint8Array(await file.slice(0, 256 * 1024).arrayBuffer());
  const v = validateBytes(head, file.size);
  if ("code" in v) return v;
  const orientation = v.type === "image/jpeg" ? readJpegOrientation(head) : 1;

  onStep?.("Decodificando a imagem");
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    if (v.type === "image/heic") return { code: "heic", message: HEIC_HELP };
    return { code: "decodificacao", message: "Não foi possível abrir esta imagem. Ela pode estar corrompida." };
  }

  // Dimensões cruas: as orientações 5–8 trocam largura e altura.
  let applied: ProcessedPhoto["orientationApplied"] = orientation === 1 ? "não necessária" : "navegador";
  let srcW = bmp.width;
  let srcH = bmp.height;
  const expectSwap = orientation >= 5 && orientation <= 8;
  // Se o navegador não girou (dimensões iguais às cruas esperadas), o app aplica.
  const rawProbe = await probeJpegSize(file, v.type);
  if (expectSwap && rawProbe && rawProbe.w === bmp.width && rawProbe.h === bmp.height) applied = "app";
  const out = applied === "app" ? orientedSize(srcW, srcH, orientation) : { w: srcW, h: srcH };

  const dimErr = validateDimensions(out.w, out.h);
  if (dimErr) {
    bmp.close();
    return dimErr;
  }

  onStep?.("Corrigindo a orientação");
  const scale = Math.min(1, MAX_LONG_SIDE / Math.max(out.w, out.h));
  const W = Math.round(out.w * scale);
  const H = Math.round(out.h * scale);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bmp.close();
    return { code: "decodificacao", message: "Este navegador não conseguiu processar a imagem." };
  }
  ctx.scale(scale, scale);
  if (applied === "app") ctx.transform(...orientationMatrix(orientation, srcW, srcH));
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  srcW = W;
  srcH = H;

  onStep?.("Convertendo para WebP");
  // Regravar no canvas descarta EXIF, GPS e demais metadados.
  const encoded = await encodeCanvas(canvas);
  if (!encoded) return { code: "decodificacao", message: "Não foi possível gerar a versão processada da foto." };
  return { blob: encoded.blob, width: srcW, height: srcH, mime: encoded.mime, orientation, orientationApplied: applied };
}

/**
 * WebP de verdade: confere os bytes gerados (alguns navegadores, como o Safari, devolvem PNG
 * quando não sabem gravar WebP). Sem WebP disponível, grava JPEG, que o servidor também aceita.
 */
export async function encodeCanvas(canvas: HTMLCanvasElement): Promise<{ blob: Blob; mime: "image/webp" | "image/jpeg" } | null> {
  const toBlob = (type: string, q: number) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, q));
  const webp = await toBlob("image/webp", WEBP_QUALITY);
  if (webp && webp.type === "image/webp" && sniffImageType(new Uint8Array(await webp.slice(0, 16).arrayBuffer())) === "image/webp") {
    return { blob: webp, mime: "image/webp" };
  }
  const jpeg = await toBlob("image/jpeg", 0.9);
  return jpeg ? { blob: jpeg, mime: "image/jpeg" } : null;
}

async function probeJpegSize(file: File, type: SniffedType): Promise<{ w: number; h: number } | null> {
  if (type !== "image/jpeg") return null;
  return readJpegSize(new Uint8Array(await file.slice(0, 512 * 1024).arrayBuffer()));
}

/** Lê largura e altura do quadro SOF de um JPEG (dimensões cruas, antes do EXIF). */
export function readJpegSize(b: Uint8Array): { w: number; h: number } | null {
  if (sniffImageType(b) !== "image/jpeg") return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const m = b[i + 1];
    const len = (b[i + 2] << 8) | b[i + 3];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { h: (b[i + 5] << 8) | b[i + 6], w: (b[i + 7] << 8) | b[i + 8] };
    }
    i += 2 + len;
  }
  return null;
}
