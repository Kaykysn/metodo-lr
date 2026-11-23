import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("=== INICIANDO VERIFICAÇÃO DO COMPONENTE HERO X-RAY ===");

const root = process.cwd();

// 1. Placeholders vetoriais (mantidos como fallback de documentação visual)
const basePath = path.join(root, "public", "media", "hero-xray-base-placeholder.svg");
const xrayPath = path.join(root, "public", "media", "hero-xray-anatomy-placeholder.svg");

assert.ok(fs.existsSync(basePath), "Placeholder da Imagem Base deve existir em public/media/");
assert.ok(fs.existsSync(xrayPath), "Placeholder da Imagem de Raio-X deve existir em public/media/");

const baseSvg = fs.readFileSync(basePath, "utf-8");
const xraySvg = fs.readFileSync(xrayPath, "utf-8");

assert.ok(baseSvg.includes('viewBox="0 0 800 1000"'), "Imagem base deve ter viewBox 0 0 800 1000");
assert.ok(xraySvg.includes('viewBox="0 0 800 1000"'), "Imagem raio-x deve ter viewBox 0 0 800 1000");
assert.ok(baseSvg.includes('x1="400"') && xraySvg.includes('x1="400"'), "Mesmo eixo sagital nas duas imagens");
console.log("✓ Placeholders SVG de base e raio-x verificados.");

// 2. Estilos do novo visual
const globalsCssPath = path.join(root, "src", "styles", "globals.css");
const globalsCss = fs.readFileSync(globalsCssPath, "utf-8");
/** Classe definida como seletor (.nome) ou como utilitário do Tailwind 4 (@utility nome). */
const hasClass = (name: string) => globalsCss.includes(`.${name}`) || globalsCss.includes(`@utility ${name}`);
const tokensCss = fs.readFileSync(path.join(root, "src", "styles", "tokens.css"), "utf-8");

// Fundo: vídeo azul (com poster) + ondas SVG de ponta a ponta
assert.ok(hasClass("hero-backdrop"), "globals.css deve conter o fundo .hero-backdrop");
assert.ok(hasClass("hero-video"), "O fundo deve ter a camada de vídeo (.hero-video)");
assert.ok(hasClass("hero-video-poster"), "O fundo deve ter o poster do primeiro quadro (.hero-video-poster)");
assert.ok(hasClass("hero-video-overlay"), "O vídeo deve ter véu de contraste (.hero-video-overlay)");
assert.ok(globalsCss.includes("var(--hero-video-overlay)"), "A opacidade do véu deve vir de --hero-video-overlay");
assert.ok(hasClass("hero-wave"), "Ondas SVG (.hero-wave) devem existir");
assert.ok(hasClass("hero-waves-back"), "Deve existir a camada de ondas de trás (.hero-waves-back)");
assert.ok(hasClass("hero-waves-front"), "Deve existir a camada de ondas da frente (.hero-waves-front)");
assert.ok(globalsCss.includes("mix-blend-mode: screen"), "Ondas/brilho devem usar mix-blend-mode: screen");
assert.ok(globalsCss.includes("radial-gradient"), "O fundo deve usar radial-gradient de petróleo");

// Ondas: presença, deriva lenta e desligamento em reduced-motion
assert.ok(globalsCss.includes("var(--hero-wave-opacity-back"), "A camada de trás deve usar --hero-wave-opacity-back");
assert.ok(globalsCss.includes("var(--hero-wave-opacity-front"), "A camada da frente deve usar --hero-wave-opacity-front");
assert.ok(globalsCss.includes("@keyframes hero-wave-drift"), "A deriva das ondas deve ter @keyframes próprio");
assert.ok(tokensCss.includes("--hero-wave-duration: 34s"), "A deriva das ondas deve levar 30–40s (--hero-wave-duration)");
assert.ok(
  hasClass("hero-waves") && globalsCss.includes("animation: none"),
  "Reduced-motion/modo leve deve desligar a deriva das ondas"
);

// Transição hero → próxima seção e indicador de rolagem
assert.ok(hasClass("hero-section-fade"), "Deve existir a faixa de transição (.hero-section-fade)");
assert.ok(globalsCss.includes("var(--hero-next-bg)"), "A faixa deve usar a cor da próxima seção (--hero-next-bg)");
assert.ok(tokensCss.includes("--hero-next-bg"), "O token --hero-next-bg deve existir");
{
  const sharedDark = tokensCss.slice(tokensCss.indexOf('[data-theme="dark"] {'));
  assert.ok(
    !sharedDark.includes("--hero-next-bg"),
    "O fade não deve seguir a ilha escura do hero, e sim o tema global da página"
  );
}
assert.ok(hasClass("hero-scroll-cue"), "Deve existir o indicador de rolagem (.hero-scroll-cue)");
assert.ok(globalsCss.includes("var(--hero-scroll-cue-opacity"), "A discrição do indicador vem de --hero-scroll-cue-opacity");

// Um único wrapper de modelo, container de tamanho para os cqw da lente
assert.ok(hasClass("hero-model"), "Deve existir um único wrapper .hero-model");
assert.ok(!globalsCss.includes("right: -8vw"), "O wrapper não deve usar right: -8vw");
assert.ok(
  globalsCss.indexOf(".hero-model .hero-xray-base") > globalsCss.indexOf("@media (max-width: 1023px)"),
  "No celular a opacidade deve recair nas camadas base/blur, preservando a lente"
);assert.ok(globalsCss.includes("container-type: size"), "O wrapper deve ser container-type: size");
assert.ok(globalsCss.includes("aspect-ratio: 896 / 1114"), "O wrapper deve reservar a proporção 896/1114");
assert.ok(globalsCss.includes("clamp(24px, 6vw, 120px)"), "O wrapper deve respeitar a folga lateral mínima");

// Camadas: cópia borrada, base, raio-X, anel, glow
assert.ok(hasClass("hero-xray-blur"), "Cópia borrada (.hero-xray-blur) deve existir");
assert.ok(globalsCss.includes("blur(var(--hero-blur"), "A cópia borrada deve usar --hero-blur");
assert.ok(hasClass("hero-xray-base"), "Base nítida (.hero-xray-base) deve existir");
assert.ok(hasClass("hero-xray-layer"), "Camada de raio-X (.hero-xray-layer) deve existir");
assert.ok(globalsCss.includes("var(--lens-r"), "A lente deve usar --lens-r");
assert.ok(globalsCss.includes("var(--x)") && globalsCss.includes("var(--y)"), "A lente deve usar --x/--y");
assert.ok(globalsCss.includes("-webkit-mask-image: radial-gradient"), "A lente deve ter máscara radial (webkit)");
assert.ok(globalsCss.includes("mask-image: radial-gradient"), "A lente deve ter máscara radial");
assert.ok(globalsCss.includes("mask-composite: intersect"), "Lente ∩ fade deve usar mask-composite: intersect");
assert.ok(globalsCss.includes("source-in"), "Fallback -webkit-mask-composite: source-in obrigatório");
assert.ok(globalsCss.includes("--hero-fade-start"), "O fade inferior deve ser controlado por --hero-fade-start");
assert.ok(hasClass("hero-xray-ring"), "Anel luminoso (.hero-xray-ring) deve existir");
assert.ok(globalsCss.includes("rgb(255 170 80"), "O anel deve usar a borda âmbar especificada");
assert.ok(globalsCss.includes("box-shadow"), "O anel deve ter glow via box-shadow");
assert.ok(hasClass("hero-xray-ember"), "Glow âmbar (.hero-xray-ember) deve existir");
assert.ok(globalsCss.includes("rgb(255 150 50"), "O glow âmbar deve usar rgb(255 150 50)");

// Sinal de interatividade: cursor de lente + ponto pulsante que some após a 1ª interação
assert.ok(globalsCss.includes("cursor: crosshair"), "O modelo deve trocar o cursor para lente (crosshair)");
assert.ok(hasClass("hero-xray-ping"), "Deve existir o ponto pulsante (.hero-xray-ping)");
assert.ok(globalsCss.includes("@keyframes hero-xray-ping"), "O ponto pulsante deve ter anel que expande (@keyframes hero-xray-ping)");
assert.ok(
  globalsCss.includes(".hero-xray-ping.is-hidden") || /@utility hero-xray-ping \{[\s\S]*?&\.is-hidden \{\s*display: none;/.test(globalsCss),
  "O ponto pulsante deve sumir após a interação"
);
assert.ok(hasClass("hero-hint-touch"), "A dica deve ter variante de toque (.hero-hint-touch)");
assert.ok(globalsCss.includes("(pointer: coarse)"), "A troca de dica no toque deve usar (pointer: coarse)");

// Respiração e acessibilidade (mantidas)
assert.ok(globalsCss.includes("@keyframes hero-xray-respiration"), "globals.css deve conter @keyframes hero-xray-respiration");
assert.ok(globalsCss.includes("scale(1.004)"), "Respiração deve ter amplitude máxima ~0,4%");
assert.ok(globalsCss.includes("4.5s"), "Ciclo da respiração deve ser 4.5s");
assert.ok(hasClass("hero-xray-breathing"), "Classe .hero-xray-breathing deve existir");
assert.ok(globalsCss.includes("will-change: transform"), "Respiração deve declarar will-change: transform");
assert.ok(globalsCss.includes(".lite .hero-xray-breathing"), "Modo leve deve neutralizar a respiração");
assert.ok(globalsCss.includes("@media (prefers-reduced-motion: reduce)"), "Deve tratar movimento reduzido");
assert.ok(globalsCss.includes("touch-action: pan-y"), "Rolagem vertical deve continuar liberada (pan-y)");

assert.ok(tokensCss.includes("--hero-blur: 18px"), "Token --hero-blur deve valer 18px");
assert.ok(tokensCss.includes("--hero-fade-start: 72%"), "Token --hero-fade-start deve valer 72%");
console.log("✓ Fundo contínuo, wrapper único, camadas, lente, anel e fade validados.");

// 3. Componente HeroXRay
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

assert.ok(!heroXRaySrc.includes("const [coords"), "Coordenadas não devem disparar useState a cada quadro");
assert.ok(heroXRaySrc.includes("coordsRef"), "Coordenadas devem usar useRef mutável");
assert.ok(heroXRaySrc.includes("requestAnimationFrame"), "Movimento deve usar requestAnimationFrame");
assert.ok(heroXRaySrc.includes(".style.setProperty"), "Variáveis CSS devem ser escritas direto no DOM");
assert.ok(heroXRaySrc.includes('setProperty("--x"'), "O componente deve atualizar --x");
assert.ok(heroXRaySrc.includes('setProperty("--y"'), "O componente deve atualizar --y");

assert.ok(heroXRaySrc.includes("isBreathingActive && \"hero-xray-breathing\""), "Respiração no palco compartilhado");
assert.ok(heroXRaySrc.includes("onPointerDown"), "HeroXRay deve capturar onPointerDown");
assert.ok(heroXRaySrc.includes("onPointerMove"), "HeroXRay deve capturar onPointerMove");
assert.ok(heroXRaySrc.includes("onPointerUp"), "HeroXRay deve capturar onPointerUp");
assert.ok(heroXRaySrc.includes("setPointerCapture"), "HeroXRay deve usar setPointerCapture");

// Alinhamento garantido: fill no mesmo wrapper + mesmo object-fit
assert.ok(heroXRaySrc.includes("hero-xray-canvas"), "HeroXRay deve usar .hero-xray-canvas no wrapper");
assert.ok(heroXRaySrc.includes("fill"), "As imagens devem usar fill dentro do wrapper");
assert.ok(heroXRaySrc.includes("object-contain"), "As imagens devem usar object-contain");
assert.ok(heroXRaySrc.includes("aspectRatio: aspectRatio"), "HeroXRay deve reservar aspect ratio (CLS zero)");

// Imagens: priority só na base; raio-X decorativo carrega logo depois (eager)
assert.ok(heroXRaySrc.includes("priority"), "A base deve usar priority do next/image (LCP)");
assert.ok(heroXRaySrc.includes('loading="eager"'), "A camada raio-X deve usar loading eager, sem priority");
assert.ok(
  !/hero-xray-layer[\s\S]{0,400}?priority/.test(heroXRaySrc),
  "A camada decorativa do raio-X não deve ter priority"
);
assert.ok(heroXRaySrc.includes('alt={altBase}'), "A imagem base deve usar alt descritivo");
assert.ok(heroXRaySrc.includes("destaque anatômico dos músculos e ossos"), "O alt descritivo padrão deve descrever a arte");
assert.ok(heroXRaySrc.includes('alt=""'), "As camadas decorativas devem usar alt vazio");

// Varredura automática, toque (fixo/automático) e movimento reduzido
assert.ok(heroXRaySrc.includes("SWEEP_START"), "Deve existir a trilha inicial da varredura");
assert.ok(heroXRaySrc.includes("SWEEP_END"), "Deve existir a trilha final da varredura");
assert.ok(heroXRaySrc.includes("SWEEP_PERIOD_MS"), "A varredura deve ter período próprio (8s)");
assert.ok(heroXRaySrc.includes("SWEEP_STATIC"), "Movimento reduzido deve ter posição estática");
assert.ok(heroXRaySrc.includes("prefersReducedMotion"), "Deve respeitar prefers-reduced-motion");
assert.ok(heroXRaySrc.includes('"fixed"'), "O toque deve fixar a lente (modo fixed)");
assert.ok(heroXRaySrc.includes("pointerType"), "O toque deve ser detectado por pointerType");
assert.ok(heroXRaySrc.includes("VIEWPORT_MARGIN = 24"), "O anel deve manter ≥24px de folga da viewport");
assert.ok(heroXRaySrc.includes("clampToViewport"), "O anel deve ser preso à viewport (clampToViewport)");
assert.ok(heroXRaySrc.includes("hero-xray-ping"), "Deve existir o ponto pulsante no componente");
assert.ok(heroXRaySrc.includes("hasInteracted"), "O ponto pulsante deve sumir após a primeira interação");
console.log("✓ Mecânica do HeroXRay (lente, coordenadas, varredura e reduced motion) validada.");

// 4. Integração no Hero
const heroShowcasePath = path.join(root, "src", "components", "landing", "HeroShowcase.tsx");
const heroShowcaseSrc = fs.readFileSync(heroShowcasePath, "utf-8");
assert.ok(heroShowcaseSrc.includes("HeroXRay"), "HeroShowcase deve incluir HeroXRay");
assert.ok(!heroShowcaseSrc.includes("ProductPreview"), "HeroShowcase não deve exibir preview de produto");

const backdropPath = path.join(root, "src", "components", "landing", "HeroBackdrop.tsx");
assert.ok(fs.existsSync(backdropPath), "HeroBackdrop.tsx deve existir");
const backdropSrc = fs.readFileSync(backdropPath, "utf-8");
assert.ok(backdropSrc.includes("hero-waves-back"), "O fundo deve desenhar a camada de ondas de trás");
assert.ok(backdropSrc.includes("hero-waves-front"), "O fundo deve desenhar a camada de ondas da frente");
assert.ok(!backdropSrc.includes("mesh-hero"), "A antiga imagem de fundo com ondas embutidas deve sair do hero");

// Vídeo: gated (>=768px, sem reduced-motion/saveData), com poster e fontes WebM+MP4
assert.ok(backdropSrc.includes("<video"), "O fundo deve usar vídeo (quando permitido)");
assert.ok(backdropSrc.includes("autoPlay"), "O vídeo deve ter autoplay");
assert.ok(backdropSrc.includes("muted"), "O vídeo deve ser mudo");
assert.ok(backdropSrc.includes("playsInline"), "O vídeo deve usar playsInline");
assert.ok(backdropSrc.includes('preload="metadata"'), "O vídeo deve usar preload=metadata");
assert.ok(backdropSrc.includes('poster="/media/hero-background-poster.jpg"'), "O vídeo deve ter poster do primeiro quadro");
assert.ok(backdropSrc.includes('type="video/webm"'), "O vídeo deve ter fonte WebM");
assert.ok(backdropSrc.includes('type="video/mp4"'), "O vídeo deve ter fonte MP4 (H.264)");
assert.ok(backdropSrc.includes("mountVideo"), "O vídeo deve ser montado só quando permitido (sem hydration mismatch)");
assert.ok(backdropSrc.includes("prefersReducedMotion"), "O vídeo não deve montar com prefers-reduced-motion");
assert.ok(backdropSrc.includes("saveData"), "O vídeo não deve montar com navigator.connection.saveData");
assert.ok(backdropSrc.includes("max-width: 767px"), "O vídeo não deve montar abaixo de 768px");
assert.ok(backdropSrc.includes("IntersectionObserver"), "O vídeo deve pausar fora da viewport (IntersectionObserver)");
assert.ok(backdropSrc.includes("hero-video-overlay"), "O fundo deve aplicar o véu de contraste sobre o vídeo");
assert.ok(backdropSrc.includes('aria-hidden="true"'), "As camadas decorativas do fundo devem ser aria-hidden");
assert.ok(backdropSrc.includes('alt=""'), "O poster decorativo deve usar alt vazio");

// Arquivos de vídeo e poster presentes e dentro do alvo de peso
for (const asset of [
  ["public", "videos", "hero-background.webm"],
  ["public", "videos", "hero-background.mp4"],
  ["public", "media", "hero-background-poster.jpg"],
]) {
  const p = path.join(root, ...asset);
  assert.ok(fs.existsSync(p), `Ativo do vídeo ausente: ${asset.join("/")}`);
}
const webmSize = fs.statSync(path.join(root, "public", "videos", "hero-background.webm")).size;
const mp4Size = fs.statSync(path.join(root, "public", "videos", "hero-background.mp4")).size;
assert.ok(webmSize < 4 * 1024 * 1024, "O WebM do hero deve ficar abaixo de 4 MB");
assert.ok(mp4Size < 4 * 1024 * 1024, "O MP4 do hero deve ficar abaixo de 4 MB");

const heroPath = path.join(root, "src", "components", "landing", "Hero.tsx");
const heroSrc = fs.readFileSync(heroPath, "utf-8");
assert.ok(!heroSrc.includes("HeroShowcase"), "Hero.tsx não deve integrar o HeroShowcase");
assert.ok(heroSrc.includes("lr-hero-art"), "Hero.tsx deve integrar a arte editorial da referência");
assert.ok(heroSrc.includes("EDITORIAL_SCENES.hero"), "Hero.tsx deve usar a cena hero do mapa editorial");
assert.ok(heroSrc.includes('from "@/lib/landing/editorial-media"'), "Hero.tsx deve importar o mapa editorial único");
assert.ok(!heroSrc.includes("hero-model"), "Hero.tsx não deve renderizar o modelo sobreposto");
assert.ok(!heroSrc.includes("HeroShowcase"), "Hero.tsx não deve importar o raio-X");
assert.ok(!heroSrc.includes("lr-anatomy-marker"), "Hero.tsx não deve renderizar o marcador Deltoide fora do ombro do atleta");
assert.ok(!heroSrc.includes("Mova o cursor para revelar"), "Hero.tsx não deve mostrar a instrução da lente");
assert.ok(!heroSrc.includes("mesh-hero"), "Hero.tsx não deve referenciar a arte antiga");
assert.ok(heroSrc.includes('id="inicio"'), "Hero.tsx deve preservar o identificador da seção");
assert.ok(heroSrc.includes('id="hero-titulo"'), "Hero.tsx deve preservar o título original");
assert.ok(heroSrc.includes('href="/solicitar-acesso"'), "Hero.tsx deve preservar os botões de ação e links");
assert.ok(heroSrc.includes('href="#demonstracao"'), "Hero.tsx deve preservar o link de demonstração");

// Arte oficial em WebP (via next/image), mesmo canvas nas duas versões
for (const asset of [
  "hero-body-base.webp",
  "hero-body-xray.webp",
]) {
  const p = path.join(root, "public", "media", asset);
  assert.ok(fs.existsSync(p), `Arte do Hero ausente: public/media/${asset}`);
  const stat = fs.statSync(p);
  assert.ok(stat.size > 40000, `Arte do Hero suspeita (arquivo muito pequeno): ${asset}`);
}
const showcaseSrc = fs.readFileSync(heroShowcasePath, "utf-8");
assert.ok(heroXRaySrc.includes("hero-body-base.webp"), "A base deve usar o asset WebP");
assert.ok(heroXRaySrc.includes("hero-body-xray.webp"), "O raio-X deve usar o asset WebP");
assert.ok(showcaseSrc.includes("/media/hero-body-base.webp"), "O modelo original de pele deve ser passado explicitamente");
assert.ok(showcaseSrc.includes("/media/hero-body-xray.webp"), "O modelo original de musculatura deve ser passado explicitamente");

// Ilha escura: o hero é idêntico nos dois temas
assert.ok(heroSrc.includes('data-theme="dark"'), "O hero deve ser uma ilha escura (data-theme=dark)");

// A demonstração pública é uma seção da própria landing.
const landingSrc = fs.readFileSync(path.join(root, "src/app/page.tsx"), "utf-8");
assert.ok(landingSrc.includes('id="demonstracao"'));
assert.ok(landingSrc.includes("<ProductPreview demo={demo}"));
assert.ok(heroSrc.includes("Ver demonstração"));
assert.ok(heroSrc.includes('href="#percurso"'));

// Prova de confiança opcional, alimentada por configuração
assert.ok(heroSrc.includes("HeroSocialProof"), "Hero.tsx deve incluir a prova de confiança opcional");
const socialPath = path.join(root, "src", "components", "landing", "HeroSocialProof.tsx");
assert.ok(fs.existsSync(socialPath), "HeroSocialProof.tsx deve existir");
const socialSrc = fs.readFileSync(socialPath, "utf-8");
assert.ok(socialSrc.includes("return null"), "Sem dados reais a prova de confiança não deve renderizar nada");
assert.ok(socialSrc.includes("HERO_SOCIAL_PROOF"), "A prova de confiança deve vir de constantes de configuração");

// Header: identidade preta/dourada, com navegação e seletor de tema preservados
const headerPath = path.join(root, "src", "components", "landing", "Header.tsx");
const headerSrc = fs.readFileSync(headerPath, "utf-8");
assert.ok(headerSrc.includes("lr-header"), "O header deve usar a identidade preta .lr-header");
assert.ok(headerSrc.includes("MethodBrand"), "O header deve usar o monograma oficial dourado");
assert.ok(headerSrc.includes("lr-button--gold"), "O CTA do header deve ser dourado");
assert.ok(headerSrc.includes("ThemeSelector"), "O header deve manter o seletor de tema");
assert.ok(!headerSrc.includes("VisualEffectsToggle"), "O header deve ter apenas UM controle de tema (sem toggle extra)");

// Modelo anatômico transferido para "Por baixo da pele" (#mapa)
const bodyMapDemoPath = path.join(root, "src", "components", "landing", "BodyMapDemo.tsx");
const bodyMapDemoSrc = fs.readFileSync(bodyMapDemoPath, "utf-8");
assert.ok(bodyMapDemoSrc.includes("HeroXRay"), "O visor do mapa deve reaproveitar a lógica da lente do HeroXRay");
assert.ok(bodyMapDemoSrc.includes("/media/hero-body-base.webp"), "A pele no mapa deve usar o modelo do hero");
assert.ok(bodyMapDemoSrc.includes("/media/hero-body-xray.webp"), "A anatomia no mapa deve usar a camada laranja do hero");
assert.ok(bodyMapDemoSrc.includes("lr-skin-grayscale"), "Somente a pele recebe grayscale; a anatomia preserva o laranja");
assert.ok(bodyMapDemoSrc.includes("autoSweep={false}"), "No mapa a lente é controlada pelo ponteiro, teclado e regiões");
assert.ok(bodyMapDemoSrc.includes("aspectRatio=\"896 / 1114\""), "As duas camadas compartilham a mesma proporção no mapa");
const mapCss = fs.readFileSync(path.join(root, "src", "styles", "metodo-lr.css"), "utf-8");
assert.ok(mapCss.includes(".lr-skin-grayscale img {"), "O CSS deve aplicar grayscale apenas à pele");
assert.ok(mapCss.includes("touch-action: pan-y"), "O visor deve manter touch-action: pan-y");
assert.ok(mapCss.includes(".lr-map-copy {"), "O parágrafo do mapa deve usar cinza-claro legível");
console.log("✓ Modelo anatômico e lente transferidos para a seção #mapa.");

// Reavaliação: foto local no lugar do player
const sectionsSrc = fs.readFileSync(path.join(root, "src", "components", "landing", "LandingSections.tsx"), "utf-8");
assert.ok(sectionsSrc.includes("ReavaliacaoPhoto"), "A seção de percurso deve usar a foto de reavaliação");
assert.ok(!sectionsSrc.includes("SceneVideo"), "O player de vídeo deve sair da seção de percurso");
assert.ok(sectionsSrc.includes("Reavaliar não sobrescreve o treino em uso"), "O texto sobre reavaliação deve ser preservado");
const photoPath = path.join(root, "src", "components", "landing", "ReavaliacaoPhoto.tsx");
const photoSrc = fs.readFileSync(photoPath, "utf-8");
assert.ok(photoSrc.includes("EDITORIAL_SCENES.reavaliacao"), "A cena reavaliacao deve vir do mapa editorial");
assert.ok(photoSrc.includes('from "@/lib/landing/editorial-media"'), "A reavaliação deve usar o mapa editorial único");
assert.ok(photoSrc.includes("aspect-[3/2]"), "A foto deve preservar a proporção original 3:2");
for (const suffix of ["", "-pb", "-dither"]) {
  assert.ok(fs.existsSync(path.join(root, "public/images/lr-pb", `reavaliacao-mobilidade${suffix}.webp`)));
}
console.log("✓ Reavaliação exibida como fotografia local, sem player.");
console.log("✓ Integração não destrutiva no Hero validada com sucesso.");

console.log("\n=== TODOS OS CRITÉRIOS DO NOVO HERO FORAM APROVADOS! ===");
