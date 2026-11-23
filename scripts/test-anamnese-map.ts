import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { BODY_REGIONS } from "../src/components/assessment/BodyMap";
import { BODY_REGIONS_V2, REGION_BY_ID } from "../src/lib/domain/body-regions";
import { ANATOMY_ASSETS, ANATOMY_SHEET, ANATOMY_VIEWBOX } from "../src/lib/domain/anatomy-assets";

console.log("=== INICIANDO VERIFICAÇÃO DO MAPA CORPORAL DA ANAMNESE E HERO ===");

const root = process.cwd();

// 1. Verificação dos arquivos de imagem gerados
const origImg = path.join(root, "public", "images", "anatomia-corpo.png");
const antImg = path.join(root, "public", "images", "anatomia-anterior.png");
const postImg = path.join(root, "public", "images", "anatomia-posterior.png");

assert.ok(fs.existsSync(origImg), "public/images/anatomia-corpo.png deve existir");
assert.ok(fs.existsSync(antImg), "public/images/anatomia-anterior.png deve existir");
assert.ok(fs.existsSync(postImg), "public/images/anatomia-posterior.png deve existir");

const antSize = fs.statSync(antImg).size;
const postSize = fs.statSync(postImg).size;
assert.ok(antSize > 100000, `anatomia-anterior.png deve ser uma imagem de alta definição (tamanho: ${antSize} bytes)`);
assert.ok(postSize > 100000, `anatomia-posterior.png deve ser uma imagem de alta definição (tamanho: ${postSize} bytes)`);
console.log("✓ Arquivos de imagem anatomia-anterior.png e anatomia-posterior.png validados com sucesso.");

// 2. Verificação de ANATOMY_ASSETS e ANATOMY_VIEWBOX
assert.ok(ANATOMY_ASSETS.anterior !== null, "ANATOMY_ASSETS.anterior deve estar preenchido");
assert.ok(ANATOMY_ASSETS.posterior !== null, "ANATOMY_ASSETS.posterior deve estar preenchido");
assert.equal(ANATOMY_SHEET.src, "/images/anatomia-corpo.png");
assert.equal(ANATOMY_ASSETS.anterior?.src, ANATOMY_SHEET.src);
assert.equal(ANATOMY_ASSETS.posterior?.src, ANATOMY_SHEET.src);
assert.ok(ANATOMY_ASSETS.anterior?.sheet && ANATOMY_ASSETS.posterior?.sheet, "Cada vista deve recortar uma região da arte única");
assert.ok(ANATOMY_ASSETS.anterior!.sheet.x < ANATOMY_ASSETS.posterior!.sheet.x, "Vista anterior à esquerda, posterior à direita");
assert.equal(ANATOMY_VIEWBOX.w, 560);
assert.equal(ANATOMY_VIEWBOX.h, 1024);
console.log("✓ ANATOMY_ASSETS e ANATOMY_VIEWBOX perfeitamente configurados.");

// 3. Verificação de Integridade dos Pontos Anatômicos em BODY_REGIONS_V2
assert.ok(BODY_REGIONS_V2.length >= 30, "BODY_REGIONS_V2 deve manter todas as regiões anatômicas clínicas");
for (const r of BODY_REGIONS_V2) {
  assert.ok(r.id.length > 0, "ID da região não pode ser vazio");
  assert.ok(r.at.anterior || r.at.posterior, `Região ${r.id} deve ter ponto mapeado`);
  if (r.at.anterior) {
    assert.ok(r.at.anterior.x >= 0 && r.at.anterior.x <= 1, `at.anterior.x em ${r.id} deve estar normalizado entre 0 e 1`);
    assert.ok(r.at.anterior.y >= 0 && r.at.anterior.y <= 1, `at.anterior.y em ${r.id} deve estar normalizado entre 0 e 1`);
  }
  if (r.at.posterior) {
    assert.ok(r.at.posterior.x >= 0 && r.at.posterior.x <= 1, `at.posterior.x em ${r.id} deve estar normalizado entre 0 e 1`);
    assert.ok(r.at.posterior.y >= 0 && r.at.posterior.y <= 1, `at.posterior.y em ${r.id} deve estar normalizado entre 0 e 1`);
  }
}
console.log("✓ Coordenadas normalizadas de todas as regiões de BODY_REGIONS_V2 validadas.");

// 4. Verificação do BodyMap.tsx
const bodyMapSrc = fs.readFileSync(path.join(root, "src", "components", "assessment", "BodyMap.tsx"), "utf-8");
assert.ok(bodyMapSrc.includes("anatomia-corpo.png"), "BodyMap deve referenciar a arte oficial anatomia-corpo.png");
assert.ok(bodyMapSrc.includes("anatomyFigureProps"), "BodyMap deve recortar a vista a partir da arte única");
assert.ok(bodyMapSrc.includes("bg-[#111111]"), "BodyMap deve possuir o fundo preto de alto contraste da identidade dourada");
assert.ok(BODY_REGIONS.length === 20, "BODY_REGIONS deve preservar as 20 regiões corporais da anamnese");
console.log("✓ BodyMap.tsx integrado à ilustração com fundo preto e regiões preservadas.");

// 5. Verificação da Atualização de Textos e Elementos no Hero.tsx
const heroSrc = fs.readFileSync(path.join(root, "src", "components", "landing", "Hero.tsx"), "utf-8");
assert.ok(heroSrc.includes("Da avaliação"), "Hero deve conter o título 'Da avaliação'");
assert.ok(heroSrc.includes("ao treino."), "Hero deve conter o título 'ao treino.'");
assert.ok(heroSrc.includes("Avalie o movimento, publique o treino e acompanhe o que cada aluno fez."), "Hero deve conter a nova descrição");
assert.ok(!heroSrc.includes("Mova o cursor para revelar"), "Hero não deve conter a instrução da lente (movida para #mapa)");
const mapDemoSrc = fs.readFileSync(path.join(root, "src", "components", "landing", "BodyMapDemo.tsx"), "utf-8");
assert.ok(mapDemoSrc.includes("Mova o cursor sobre o corpo para revelar a musculatura."), "A instrução da lente (mouse) deve viver no mapa corporal");
assert.ok(mapDemoSrc.includes("Role a página: a lente percorre ombro, tórax e braço."), "A instrução da lente (toque) deve viver no mapa corporal");
assert.ok(heroSrc.includes("href=\"/solicitar-acesso\""), "Hero deve preservar o botão Solicitar acesso");
assert.ok(heroSrc.includes("href=\"#demonstracao\""), "Hero deve preservar o botão Ver demonstração");
assert.ok(heroSrc.includes("Avaliação física individualizada"), "Hero deve conter o elemento complementar 'Avaliação física individualizada'");
assert.ok(heroSrc.includes("Identificação anatômica"), "Hero deve conter o elemento complementar 'Identificação anatômica'");
assert.ok(heroSrc.includes("Planejamento de treinamento"), "Hero deve conter o elemento complementar 'Planejamento de treinamento'");
assert.ok(heroSrc.includes("Acompanhamento da evolução"), "Hero deve conter o elemento complementar 'Acompanhamento da evolução'");
console.log("✓ Atualização do Hero.tsx validada com todos os textos, botões e elementos complementares.");

console.log("\n=== TODAS AS 18 VALIDAÇÕES DA ETAPA 2 PASSARAM COM SUCESSO! ===");
