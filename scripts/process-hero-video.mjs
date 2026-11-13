import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const publicMediaDir = path.join(rootDir, "public", "media");

if (!fs.existsSync(publicMediaDir)) {
  fs.mkdirSync(publicMediaDir, { recursive: true });
}

// Determine input video file
const argInput = process.argv[2];
let inputFile = argInput;

if (!inputFile) {
  // Procura um vídeo-fonte .mp4 na raiz
  const rootFiles = fs.readdirSync(rootDir);
  const candidate = rootFiles.find((f) => f.endsWith(".mp4") && f !== "hero-studio.mp4");

  if (candidate) {
    inputFile = path.join(rootDir, candidate);
  }
}

if (!inputFile || !fs.existsSync(inputFile)) {
  console.error("❌ Nenhum arquivo de vídeo encontrado. Uso: node scripts/process-hero-video.mjs <caminho-do-video.mp4>");
  process.exit(1);
}

const targetVideo = path.join(publicMediaDir, "hero-studio.mp4");
const targetPoster = path.join(publicMediaDir, "hero-poster.jpg");

console.log(`🎬 Processando vídeo de entrada: ${path.basename(inputFile)}`);

try {
  // 1. Reencode to 1080p Web-Optimized H.264 (silent, faststart, no audio track)
  console.log("⏳ Otimizando para web (H.264 1080p, sem áudio, +faststart)...");
  execSync(
    `ffmpeg -y -i "${inputFile}" -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x0C2446" -an -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -movflags +faststart "${targetVideo}"`,
    { stdio: "inherit" }
  );

  // 2. Extract sharp first frame for instant poster fallback
  console.log("📸 Extraindo poster do frame inicial (first paint)...");
  execSync(
    `ffmpeg -y -ss 00:00:00.000 -i "${targetVideo}" -vframes 1 -q:v 2 "${targetPoster}"`,
    { stdio: "inherit" }
  );

  const videoStats = fs.statSync(targetVideo);
  const posterStats = fs.statSync(targetPoster);

  console.log("\n✅ Vídeo do Hero e Poster prontos para o site!");
  console.log(`   - Vídeo: ${targetVideo} (${(videoStats.size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`   - Poster: ${targetPoster} (${(posterStats.size / 1024).toFixed(1)} KB)`);
} catch (err) {
  console.error("❌ Erro ao processar o vídeo com ffmpeg:", err);
  process.exit(1);
}
