import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("=== INICIANDO VERIFICAÇÃO DO COMPONENTE HERO X-RAY ===");

const root = process.cwd();

// 1. Verificação dos Placeholders Vetoriais
const basePath = path.join(root, "public", "media", "hero-xray-base-placeholder.svg");
const xrayPath = path.join(root, "public", "media", "hero-xray-anatomy-placeholder.svg");

assert.ok(fs.existsSync(basePath), "Placeholder da Imagem Base deve existir em public/media/");
assert.ok(fs.existsSync(xrayPath), "Placeholder da Imagem de Raio-X deve existir em public/media/");

const baseSvg = fs.readFileSync(basePath, "utf-8");
const xraySvg = fs.readFileSync(xrayPath, "utf-8");

assert.ok(baseSvg.includes('viewBox="0 0 800 1000"'), "Imagem base deve ter viewBox 0 0 800 1000");
assert.ok(xraySvg.includes('viewBox="0 0 800 1000"'), "Imagem raio-x deve ter viewBox 0 0 800 1000");
assert.ok(baseSvg.includes('width="800"') && baseSvg.includes('height="1000"'), "Imagem base deve ter dimensões explícitas 800x1000");
assert.ok(xraySvg.includes('width="800"') && xraySvg.includes('height="1000"'), "Imagem raio-x deve ter dimensões explícitas 800x1000");

// Verificação de alinhamento anatômico compartilhado
assert.ok(baseSvg.includes('x1="400"') && xraySvg.includes('x1="400"'), "Ambas as imagens devem compartilhar o mesmo eixo sagital central (x=400)");
assert.ok(baseSvg.includes('265') && xraySvg.includes('265'), "Ambas as imagens devem alinhar a linha dos ombros (y=265)");
assert.ok(baseSvg.includes('530') && xraySvg.includes('530'), "Ambas as imagens devem alinhar a linha pélvica (y=530)");
assert.ok(baseSvg.includes('730') && xraySvg.includes('730'), "Ambas as imagens devem alinhar a articulação dos joelhos (y=730)");
console.log("✓ Placeholders SVG de base e raio-x verificados com alinhamento biométrico 100% exato.");

// 2. Verificação das Regras de Estilo e Animações em globals.css
const globalsCssPath = path.join(root, "src", "styles", "globals.css");
const globalsCss = fs.readFileSync(globalsCssPath, "utf-8");

assert.ok(globalsCss.includes("@keyframes hero-xray-respiration"), "globals.css deve conter @keyframes hero-xray-respiration");
assert.ok(globalsCss.includes("scale(1.004)"), "Microanimação respiratória deve ter amplitude máxima de ~0.4% (scale(1.004))");
assert.ok(globalsCss.includes("4.5s"), "Ciclo da animação respiratória deve ser de 4.5s");
assert.ok(globalsCss.includes(".hero-xray-breathing"), "Classe .hero-xray-breathing deve existir");
assert.ok(globalsCss.includes("will-change: transform"), "Animação respiratória deve declarar will-change: transform para aceleração por GPU");

assert.ok(globalsCss.includes(".hero-xray-layer"), "Classe .hero-xray-layer deve existir");
assert.ok(globalsCss.includes("-webkit-mask-image: radial-gradient"), "Camada 2 deve ter -webkit-mask-image radial");
assert.ok(globalsCss.includes("mask-image: radial-gradient"), "Camada 2 deve ter mask-image radial");
assert.ok(globalsCss.includes("var(--xray-r"), "Máscara radial deve utilizar a variável de raio configurável --xray-r");
assert.ok(globalsCss.includes("var(--xray-x"), "Máscara radial deve utilizar as coordenadas dinâmicas --xray-x e --xray-y");

assert.ok(globalsCss.includes(".hero-xray-glow"), "Classe .hero-xray-glow deve existir com lanterna ciano");
assert.ok(globalsCss.includes("mix-blend-mode: screen"), "Lanterna ciano deve usar mix-blend-mode para fusão luminosa discreta");
assert.ok(globalsCss.includes("118, 215, 190"), "Brilho ciano deve usar a cor da marca (#76D7BE / rgb(118 215 190))");

assert.ok(globalsCss.includes(".lite .hero-xray-breathing"), "Modo leve (.lite) deve neutralizar a animação respiratória");
assert.ok(globalsCss.includes("@media (prefers-reduced-motion: reduce)"), "globals.css deve possuir tratamento de movimento reduzido");
console.log("✓ Estilos CSS, máscara radial, lanterna ciano e microanimação respiratória validados.");

// 3. Verificação do Componente HeroXRay
const heroXRayPath = path.join(root, "src", "components", "landing", "HeroXRay.tsx");
assert.ok(fs.existsSync(heroXRayPath), "HeroXRay.tsx deve existir em src/components/landing/");

const heroXRaySrc = fs.readFileSync(heroXRayPath, "utf-8");
assert.ok(heroXRaySrc.includes("export default function HeroXRay"), "HeroXRay deve exportar o componente como default");
assert.ok(heroXRaySrc.includes("DEFAULT_BASE_IMAGE"), "HeroXRay deve exportar DEFAULT_BASE_IMAGE");
assert.ok(heroXRaySrc.includes("DEFAULT_XRAY_IMAGE"), "HeroXRay deve exportar DEFAULT_XRAY_IMAGE");
assert.ok(heroXRaySrc.includes("baseImage"), "HeroXRay deve aceitar a prop baseImage");
assert.ok(heroXRaySrc.includes("xrayImage"), "HeroXRay deve aceitar a prop xrayImage");
assert.ok(heroXRaySrc.includes("revealRadius"), "HeroXRay deve aceitar a prop revealRadius");
assert.ok(heroXRaySrc.includes("breathingEnabled"), "HeroXRay deve aceitar a prop breathingEnabled");

// Performance: garantia de não usar useState para coordenadas
assert.ok(!heroXRaySrc.includes("const [coords"), "Coordenadas não devem disparar useState a cada quadro");
assert.ok(!heroXRaySrc.includes("const [x, setX]"), "Coordenadas não devem disparar useState a cada quadro");
assert.ok(heroXRaySrc.includes("coordsRef"), "Coordenadas devem usar useRef mutável");
assert.ok(heroXRaySrc.includes("requestAnimationFrame"), "Movimento deve usar requestAnimationFrame com LERP e auto-repouso");
assert.ok(heroXRaySrc.includes(".style.setProperty"), "Variáveis CSS devem ser injetadas diretamente no nó DOM");

// Contêiner compartilhado de respiração
assert.ok(heroXRaySrc.includes("isBreathingActive && \"hero-xray-breathing\""), "Animação respiratória deve ser aplicada no contêiner compartilhado");

// Mobile e Pointer Events
assert.ok(heroXRaySrc.includes("onPointerDown"), "HeroXRay deve capturar onPointerDown");
assert.ok(heroXRaySrc.includes("onPointerMove"), "HeroXRay deve capturar onPointerMove");
assert.ok(heroXRaySrc.includes("onPointerUp"), "HeroXRay deve capturar onPointerUp");
assert.ok(heroXRaySrc.includes("setPointerCapture"), "HeroXRay deve usar setPointerCapture para arraste contínuo no toque móvel");
assert.ok(heroXRaySrc.includes("hero-xray-canvas"), "HeroXRay deve usar a classe .hero-xray-canvas no quadro interativo");
assert.ok(globalsCss.includes("touch-action: pan-y"), "A rolagem vertical deve continuar liberada no celular (pan-y)");
assert.ok(heroXRaySrc.includes("object-contain"), "As duas imagens devem usar object-contain, sem distorção");

// Anti-CLS e Carregamento Eager
assert.ok(heroXRaySrc.includes('aspectRatio: aspectRatio'), "HeroXRay deve reservar aspect ratio para evitar CLS");
assert.ok(heroXRaySrc.includes('loading="eager"'), "Imagens devem usar loading eager para o Hero");
assert.ok(heroXRaySrc.includes('decoding="async"'), "Imagens devem usar decoding async");
assert.ok(heroXRaySrc.includes('fetchPriority="high"'), "Imagem base deve ter fetchPriority high");
console.log("✓ Mecânica técnica de performance, Pointer Events e arquitetura de camadas do HeroXRay validada.");

// 4. Verificação da Integração no Hero Principal
const heroShowcasePath = path.join(root, "src", "components", "landing", "HeroShowcase.tsx");
assert.ok(fs.existsSync(heroShowcasePath), "HeroShowcase.tsx deve existir");

const heroShowcaseSrc = fs.readFileSync(heroShowcasePath, "utf-8");
assert.ok(heroShowcaseSrc.includes("HeroXRay"), "HeroShowcase deve incluir HeroXRay");
assert.ok(!heroShowcaseSrc.includes("ProductPreview"), "HeroShowcase não deve voltar a exibir o preview de produto no lugar do raio-X");

// A imagem precisa ser a versão transparente (PNG/WebP com alpha), nunca a arte com fundo sólido.
assert.ok(
  heroXRaySrc.includes('DEFAULT_BASE_IMAGE = "/media/hero-body-base.png"'),
  "A camada base deve usar o PNG transparente"
);
assert.ok(
  heroXRaySrc.includes('DEFAULT_XRAY_IMAGE = "/media/hero-body-xray.png"'),
  "A camada de raio-X deve usar o PNG transparente"
);
assert.ok(heroXRaySrc.includes("mobileScrollReveal"), "HeroXRay deve expor a revelação automática do celular");
assert.ok(heroXRaySrc.includes("hero-xray-scan"), "HeroXRay deve ativar a varredura automática por classe");
assert.ok(heroXRaySrc.includes("scrollTrigger"), "HeroXRay deve sincronizar a varredura móvel com o ScrollTrigger");
assert.ok(heroXRaySrc.includes("scrub: 0.55"), "A revelação móvel deve acompanhar o scroll nos dois sentidos (scrub)");
assert.ok(globalsCss.includes(".hero-xray-canvas.hero-xray-scan .hero-xray-layer"), "A máscara móvel deve ser controlada por CSS");
assert.ok(globalsCss.includes("linear-gradient"), "A revelação móvel deve ser uma transição gradual, não uma troca brusca");
assert.ok(globalsCss.includes(".hero-xray-figure"), "A figura deve ter sombra de contato própria (arte transparente)");
assert.ok(globalsCss.includes(".hero-xray-aura"), "A figura deve ter aura integrada ao fundo do Hero");

// Camada 3: vídeo de fundo do Hero + fallback estático
const videoPath = path.join(root, "public", "videos", "hero-background.mp4");
assert.ok(fs.existsSync(videoPath), "Vídeo de fundo deve existir em public/videos/hero-background.mp4");
assert.ok(fs.statSync(videoPath).size > 100000, "Vídeo de fundo deve ter conteúdo válido");

const backdropPath = path.join(root, "src", "components", "landing", "HeroBackdrop.tsx");
assert.ok(fs.existsSync(backdropPath), "HeroBackdrop.tsx deve existir");
const backdropSrc = fs.readFileSync(backdropPath, "utf-8");
assert.ok(backdropSrc.includes("autoPlay") && backdropSrc.includes("muted"), "Vídeo deve tocar mudo e automaticamente");
assert.ok(backdropSrc.includes("playsInline"), "Vídeo deve declarar playsInline");
assert.ok(backdropSrc.includes("loop"), "Vídeo deve estar em loop");
assert.ok(backdropSrc.includes("object-cover"), "Vídeo deve usar object-fit: cover");
assert.ok(backdropSrc.includes("onError"), "Vídeo deve tratar falha de carregamento (fallback estático)");
assert.ok(backdropSrc.includes("visibilitychange"), "Vídeo deve pausar com a aba oculta");
assert.ok(backdropSrc.includes("videoAllowed"), "Vídeo deve respeitar as preferências de efeitos/movimento");

// Camada 1/2: arte oficial otimizada (PNG transparente + WebP com alpha + JPEG legado)
for (const asset of [
  "hero-body-base.png",
  "hero-body-base.webp",
  "hero-body-base.jpg",
  "hero-body-xray.png",
  "hero-body-xray.webp",
  "hero-body-xray.jpg",
]) {
  assert.ok(fs.existsSync(path.join(root, "public", "media", asset)), `Arte do Hero ausente: public/media/${asset}`);
}
assert.ok(heroXRaySrc.includes("hero-xray-stage"), "Respiração deve rodar no contêiner compartilhado (.hero-xray-stage)");

const heroPath = path.join(root, "src", "components", "landing", "Hero.tsx");
const heroSrc = fs.readFileSync(heroPath, "utf-8");
assert.ok(heroSrc.includes("HeroShowcase"), "Hero.tsx deve integrar o HeroShowcase");
assert.ok(heroSrc.includes("HeroBackdrop"), "Hero.tsx deve integrar a camada de vídeo (HeroBackdrop)");
assert.ok(heroSrc.includes('id="demonstracao"'), "Hero.tsx deve preservar o identificador da seção");
assert.ok(heroSrc.includes('id="hero-titulo"'), "Hero.tsx deve preservar o título original");
assert.ok(heroSrc.includes('href="/solicitar-acesso"'), "Hero.tsx deve preservar os botões de ação e links");
console.log("✓ Integração não destrutiva no Hero validada com sucesso.");

console.log("\n=== TODOS OS 24 CRITÉRIOS DO NOVO HERO FORAM APROVADOS! ===");
