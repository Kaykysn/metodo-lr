/* Testes do módulo de fotos e análise postural (geometria, lados, calibração, comparabilidade).
   Executar: node scripts/run-ts.mjs scripts/test-posture.ts */
import assert from "node:assert/strict";
import {
  buildTrend,
  compareRecords,
  computeMeasurements,
  emptyAnnotation,
  inclinationDeg,
  LANDMARK_PROTOCOL,
  mirrorAnnotation,
  normLineAngle,
  signedDistanceToLine,
  vertexAngleDeg,
  type AnnotationData,
  type Landmark,
  type MeasurementRecord,
} from "../src/lib/domain/posture";
import { applyMatrix, fromNorm, imageToScreen, insideImage, orientationMatrix, orientedSize, orientPoint, panBy, screenToImage, toNorm, zoomAt, type Viewport } from "../src/lib/media/photo-geometry";
import { readJpegOrientation, sniffImageType, validateBytes, validateDimensions } from "../src/lib/media/image-intake";

let n = 0;
const ok = (msg: string) => {
  n++;
  console.log(`✓ ${msg}`);
};
const near = (a: number | null, b: number, tol = 0.051) => assert.ok(a !== null && Math.abs(a - b) <= tol, `esperado ${b}, obtido ${a}`);
const L = (id: string, x: number, y: number): Landmark => ({ id, x, y, visibility: "visível", note: "" });
const data = (patch: Partial<AnnotationData>): AnnotationData => ({ ...emptyAnnotation(), ...patch });
const H0 = { a: { x: 0, y: 0.9 }, b: { x: 1, y: 0.9 } };
const V0 = { a: { x: 0.5, y: 0.05 }, b: { x: 0.5, y: 0.95 }, source: "fio de prumo fotografado" as const };

// ---- Geometria básica
assert.equal(normLineAngle(180), 0);
assert.equal(normLineAngle(-90), 90);
assert.equal(normLineAngle(135), -45);
near(vertexAngleDeg({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }), 90);
near(vertexAngleDeg({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: -1, y: 0 }), 180);
near(inclinationDeg({ x: 0, y: 0 }, { x: 100, y: -100 }), 45);
near(inclinationDeg({ x: 100, y: -100 }, { x: 0, y: 0 }), 45, 0.001);
assert.ok(signedDistanceToLine({ x: 10, y: 5 }, { x: 0, y: 10 }, { x: 0, y: 0 }) > 0, "à direita da tela é positivo");
assert.equal(signedDistanceToLine({ x: 10, y: 5 }, { x: 0, y: 10 }, { x: 0, y: 0 }), signedDistanceToLine({ x: 10, y: 5 }, { x: 0, y: 0 }, { x: 0, y: 10 }), "sinal não depende da ordem dos cliques");
ok("Ângulos ficam em faixas previsíveis e o sinal não depende da ordem dos cliques");

// ---- Frente: lado direito da pessoa à esquerda da tela
// Imagem 1000 × 2000: ombro direito em (300, 400), esquerdo em (700, 420) → direito 20 px mais alto.
const front = computeMeasurements({
  view: "frente", profileSide: null, width: 1000, height: 2000,
  data: data({ horizontal: H0, landmarks: [L("acromio-d", 0.3, 0.2), L("acromio-e", 0.7, 0.21)] }),
});
const fInc = front.find((m) => m.methodId === "frente-ombros-inclinacao")!;
const fDif = front.find((m) => m.methodId === "frente-ombros-diferenca")!;
near(fInc.value, 2.9); // atan(20/400) = 2,862°
near(fDif.value, 20);
assert.equal(fDif.unit, "px");
assert.match(fInc.reading, /direito mais alto/);
ok("Proporção real da imagem: 20 px em 400 px dão 2,9° (e não 1,4° das coordenadas normalizadas)");

// Esquerdo mais alto → valor negativo
const front2 = computeMeasurements({ view: "frente", profileSide: null, width: 1000, height: 2000, data: data({ horizontal: H0, landmarks: [L("acromio-d", 0.3, 0.21), L("acromio-e", 0.7, 0.2)] }) });
near(front2.find((m) => m.methodId === "frente-ombros-diferenca")!.value, -20);
assert.match(front2.find((m) => m.methodId === "frente-ombros-inclinacao")!.reading, /esquerdo mais alto/);
ok("Diferença vertical com sinal: positivo = direito mais alto, negativo = esquerdo");

// ---- Costas: lado direito da pessoa à direita da tela; mesma postura deve dar o mesmo resultado
const back = computeMeasurements({ view: "costas", profileSide: null, width: 1000, height: 2000, data: data({ horizontal: H0, landmarks: [L("acromio-costas-d", 0.7, 0.2), L("acromio-costas-e", 0.3, 0.21)] }) });
near(back.find((m) => m.methodId === "costas-ombros-diferenca")!.value, 20);
assert.match(back.find((m) => m.methodId === "costas-ombros-inclinacao")!.reading, /direito mais alto/);
ok("Lado anatômico correto na frente e nas costas");

// ---- Linha de base inclinada (câmera girada): ombros paralelos à base → 0°
const tilt = { a: { x: 0, y: 0.5 }, b: { x: 1, y: 0.5 - 0.05 } }; // sobe 100 px em 1000 px
const tilted = computeMeasurements({ view: "frente", profileSide: null, width: 1000, height: 2000, data: data({ horizontal: tilt, landmarks: [L("acromio-d", 0.3, 0.2), L("acromio-e", 0.7, 0.2 - 0.02)] }) });
near(tilted.find((m) => m.methodId === "frente-ombros-inclinacao")!.value, 0, 0.06);
ok("Inclinação medida em relação à linha de base escolhida, não ao quadro da foto");

// ---- Sem referência ou sem marco: valor ausente explícito
const noRef = computeMeasurements({ view: "frente", profileSide: null, width: 1000, height: 2000, data: data({ landmarks: [L("acromio-d", 0.3, 0.2), L("acromio-e", 0.7, 0.21)] }) });
assert.equal(noRef[0].value, null);
assert.match(noRef[0].missing!, /linha de base/);
const hidden = computeMeasurements({ view: "frente", profileSide: null, width: 1000, height: 2000, data: data({ horizontal: H0, landmarks: [L("acromio-d", 0.3, 0.2), { ...L("acromio-e", 0.7, 0.21), visibility: "não visível" }] }) });
assert.equal(hidden[0].value, null);
ok("Medidas sem referência ou com marco não visível aparecem como não medidas");

// ---- Calibração: unidade física só com calibração no mesmo plano
const calibrated = computeMeasurements({
  view: "frente", profileSide: null, width: 1000, height: 2000,
  data: data({ horizontal: H0, calibration: { a: { x: 0.1, y: 0.5 }, b: { x: 0.1, y: 0.55 }, lengthCm: 10 }, landmarks: [L("acromio-d", 0.3, 0.2), L("acromio-e", 0.7, 0.21)] }),
});
const cDif = calibrated.find((m) => m.methodId === "frente-ombros-diferenca")!;
assert.equal(cDif.unit, "cm");
near(cDif.value, 2); // 100 px = 10 cm → 20 px = 2 cm
const badCal = computeMeasurements({ view: "frente", profileSide: null, width: 1000, height: 2000, data: data({ horizontal: H0, calibration: { a: { x: 0.1, y: 0.5 }, b: { x: 0.1, y: 0.55 }, lengthCm: 0 }, landmarks: [L("acromio-d", 0.3, 0.2), L("acromio-e", 0.7, 0.21)] }) });
assert.equal(badCal.find((m) => m.methodId === "frente-ombros-diferenca")!.unit, "px");
ok("Centímetros exigem calibração válida; sem ela a medida fica em pixels");

// ---- Frente e costas: deslocamento do ponto médio em relação à vertical
// Vertical em x = 500 px. Ponto médio dos ombros em x = 450 px (à esquerda da tela).
const midF = computeMeasurements({ view: "frente", profileSide: null, width: 1000, height: 2000, data: data({ vertical: V0, landmarks: [L("acromio-d", 0.3, 0.2), L("acromio-e", 0.6, 0.2)] }) });
const mf = midF.find((m) => m.methodId === "frente-deslocamento-ombros")!;
near(mf.value, 50); // frente: esquerda da tela = lado direito da pessoa → positivo
assert.match(mf.reading, /lado direito da pessoa/);
const midB = computeMeasurements({ view: "costas", profileSide: null, width: 1000, height: 2000, data: data({ vertical: V0, landmarks: [L("acromio-costas-d", 0.6, 0.2), L("acromio-costas-e", 0.3, 0.2)] }) });
near(midB.find((m) => m.methodId === "costas-deslocamento-ombros")!.value, -50); // costas: esquerda da tela = lado esquerdo
assert.equal(computeMeasurements({ view: "frente", profileSide: null, width: 1000, height: 2000, data: data({ landmarks: [L("acromio-d", 0.3, 0.2), L("acromio-e", 0.6, 0.2)] }) }).find((m) => m.methodId === "frente-deslocamento-ombros")!.value, null);
ok("Frente e costas: deslocamento do ponto médio com sinal pelo lado da pessoa");

// ---- Distância em % de um segmento de referência (denominador e pontos guardados)
const seg = computeMeasurements({
  view: "frente", profileSide: null, width: 1000, height: 2000,
  data: data({ horizontal: H0, referenceSegment: { from: "acromio-d", to: "acromio-e" }, landmarks: [L("acromio-d", 0.3, 0.2), L("acromio-e", 0.7, 0.21)] }),
});
const sd = seg.find((m) => m.methodId === "frente-ombros-diferenca")!;
assert.equal(sd.unit, "% do segmento de referência");
near(sd.value, 5, 0.1); // 20 px / 400,5 px = 5,0 %
assert.equal(sd.basis?.kind, "segmento");
near(sd.basis?.denominatorPx ?? null, 400.5);
assert.deepEqual(sd.basis?.refPoints, ["acromio-d", "acromio-e"]);
const segCal = computeMeasurements({
  view: "frente", profileSide: null, width: 1000, height: 2000,
  data: data({ horizontal: H0, referenceSegment: { from: "acromio-d", to: "acromio-e" }, calibration: { a: { x: 0.1, y: 0.5 }, b: { x: 0.1, y: 0.55 }, lengthCm: 10 }, landmarks: [L("acromio-d", 0.3, 0.2), L("acromio-e", 0.7, 0.21)] }),
});
assert.equal(segCal.find((m) => m.methodId === "frente-ombros-diferenca")!.unit, "cm", "calibração tem prioridade sobre o segmento");
ok("Distâncias em % do segmento de referência guardam denominador e pontos; calibração tem prioridade");

// ---- Perfil: anterior depende do lado fotografado
const prof = (side: "direito" | "esquerdo") =>
  computeMeasurements({ view: "perfil", profileSide: side, width: 1000, height: 2000, data: data({ vertical: V0, landmarks: [L("maleolo", 0.5, 0.9), L("trocanter", 0.55, 0.5)] }) });
const right = prof("direito");
const left = prof("esquerdo");
const segR = right.find((m) => m.methodId === "angulo-maleolo-trocanter")!;
const segL = left.find((m) => m.methodId === "angulo-maleolo-trocanter")!;
near(segR.value, 3.6); // atan(50/800) = 3,58°
near(segL.value, -3.6);
assert.match(segR.reading, /anterior/);
assert.match(segL.reading, /posterior/);
near(right.find((m) => m.methodId === "deslocamento-trocanter")!.value, 50);
near(left.find((m) => m.methodId === "deslocamento-trocanter")!.value, -50);
ok("Perfil direito: deslocamento para a direita da tela é anterior; no esquerdo, posterior");

// ---- Ângulo livre
const free = computeMeasurements({ view: "perfil", profileSide: "direito", width: 1000, height: 1000, data: data({ angles: [{ id: "a1", label: "joelho", a: { x: 0.5, y: 0.2 }, vertex: { x: 0.5, y: 0.5 }, c: { x: 0.8, y: 0.5 } }] }) });
near(free.find((m) => m.methodId === "angulo-livre-joelho")!.value, 90);
ok("Ângulo livre calculado nos pixels da imagem");

// ---- Espelhamento troca lados e preserva a medida da pessoa
const orig = data({ horizontal: H0, landmarks: [L("acromio-d", 0.3, 0.2), L("acromio-e", 0.7, 0.21)] });
const mirrored = mirrorAnnotation(orig);
assert.equal(mirrored.landmarks.find((l) => l.id === "acromio-e")!.x, 0.7);
near(computeMeasurements({ view: "frente", profileSide: null, width: 1000, height: 2000, data: mirrored }).find((m) => m.methodId === "frente-ombros-diferenca")!.value, -20);
ok("Espelhar a imagem espelha e troca os rótulos de lado das marcações");

// ---- Enquadramento, zoom e arrasto preservam o ponto
const v: Viewport = { cw: 800, ch: 600, w: 1000, h: 2000, zoom: 1, cx: 500, cy: 1000 };
const target = { x: 300, y: 400 };
const s1 = imageToScreen(target, v);
near(screenToImage(s1, v).x, 300, 1e-9);
near(screenToImage(s1, v).y, 400, 1e-9);
assert.ok(!insideImage({ x: 10, y: 300 }, v), "clique na barra de enquadramento fica fora da imagem");
const z = zoomAt(v, s1, 3);
const s2 = imageToScreen(target, z);
near(s2.x, s1.x, 1e-6);
near(s2.y, s1.y, 1e-6);
const p = panBy(z, { x: 40, y: -25 });
const s3 = imageToScreen(target, p);
near(s3.x - s2.x, 40, 1e-6);
near(s3.y - s2.y, -25, 1e-6);
const resized = { ...p, cw: 390, ch: 700 };
const back2 = screenToImage(imageToScreen(target, resized), resized);
near(back2.x, 300, 1e-9);
near(back2.y, 400, 1e-9);
const nrm = toNorm(target, 1000, 2000);
const scaledDown = fromNorm(nrm, 500, 1000);
assert.deepEqual(scaledDown, { x: 150, y: 200 });
ok("Enquadramento, zoom no cursor, arrasto, redimensionamento e redução de resolução mantêm o marco no lugar");

// ---- Orientação EXIF
for (let o = 1; o <= 8; o++) {
  const w = 400;
  const h = 300;
  const s = orientedSize(w, h, o);
  for (const pt of [{ x: 0, y: 0 }, { x: 399, y: 0 }, { x: 10, y: 250 }]) {
    const a = orientPoint(pt, w, h, o);
    const b = applyMatrix(orientationMatrix(o, w, h), pt);
    near(a.x, b.x, 1e-9);
    near(a.y, b.y, 1e-9);
    assert.ok(a.x >= 0 && a.x <= s.w && a.y >= 0 && a.y <= s.h, `orientação ${o} saiu da imagem`);
  }
}
assert.deepEqual(orientPoint({ x: 0, y: 0 }, 400, 300, 6), { x: 300, y: 0 }, "orientação 6: canto superior esquerdo cru vai para o canto superior direito");
ok("Orientações EXIF 1–8: a matriz de desenho e o mapeamento de pontos coincidem");

// JPEG mínimo com EXIF orientação 6 (little-endian)
const exif = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe1, 0x00, 0x22, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
  0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0xff, 0xda,
]);
assert.equal(readJpegOrientation(exif), 6);
assert.equal(readJpegOrientation(new Uint8Array([0xff, 0xd8, 0xff, 0xda])), 1);
ok("Leitura da orientação EXIF de um JPEG");

// ---- Validação do conteúdo
assert.equal(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
assert.equal(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "image/png");
assert.equal(sniffImageType(new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63])), "image/heic");
const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0, 0, 0, 0, 0, 0, 0]);
assert.equal(sniffImageType(exe), "unknown");
const r = validateBytes(exe, 1000);
assert.ok("code" in r && r.code === "tipo", "executável renomeado para .jpg é recusado");
const big = validateBytes(new Uint8Array([0xff, 0xd8, 0xff]), 30 * 1024 * 1024);
assert.ok("code" in big && big.code === "tamanho");
assert.equal(validateDimensions(300, 900)?.code, "dimensao");
assert.equal(validateDimensions(1080, 1920), null);
ok("Conteúdo verificado pelos bytes (executável renomeado é recusado), tamanho e dimensões");

// ---- Comparabilidade entre datas
const rec = (patch: Partial<MeasurementRecord>): MeasurementRecord => ({
  methodId: "frente-ombros-inclinacao", value: 2, unit: "°", view: "frente", profileSide: null, protocol: LANDMARK_PROTOCOL, calibrated: false, verticalSource: null, mirrorConfirmed: false, ...patch,
});
const same = compareRecords(rec({ value: 3.2 }), rec({ value: 1.1 }));
assert.equal(same.comparable, true);
near(same.diff, -2.1);
assert.equal(compareRecords(rec({}), rec({ view: "costas" })).comparable, false);
assert.equal(compareRecords(rec({ view: "perfil", profileSide: "direito" }), rec({ view: "perfil", profileSide: "esquerdo" })).comparable, false);
assert.equal(compareRecords(rec({}), rec({ protocol: "outro" })).comparable, false);
assert.equal(compareRecords(rec({ unit: "px" }), rec({ unit: "cm", calibrated: true })).comparable, false);
assert.equal(compareRecords(rec({}), rec({ mirrorConfirmed: null })).comparable, false);
assert.equal(compareRecords(rec({ unit: "% do segmento de referência", referenceSegment: "acromio-d–acromio-e" }), rec({ unit: "% do segmento de referência", referenceSegment: "eias-d–eias-e" })).comparable, false, "segmentos de referência diferentes");
// Ângulos não dependem de calibração; inclinação dos ombros não depende da vertical
assert.equal(compareRecords(rec({ calibrated: false }), rec({ calibrated: true })).comparable, true, "ângulo com e sem calibração continua comparável");
assert.equal(compareRecords(rec({ verticalSource: null }), rec({ verticalSource: "fio de prumo fotografado" })).comparable, true, "inclinação não usa a vertical");
assert.equal(compareRecords(rec({ methodId: "frente-deslocamento-ombros", unit: "px", verticalSource: "grade ajustada pelo avaliador" }), rec({ methodId: "frente-deslocamento-ombros", unit: "px", verticalSource: "fio de prumo fotografado" })).comparable, false, "deslocamento depende do tipo de vertical");
assert.equal(compareRecords(rec({ methodId: "frente-ombros-diferenca", unit: "px", calibrated: false }), rec({ methodId: "frente-ombros-diferenca", unit: "px", calibrated: true })).comparable, false, "distância depende da calibração");
const tr = buildTrend([
  { ...rec({ value: 3.8 }), date: "2027-01-28" },
  { ...rec({ value: 2.1, calibrated: true, unit: "cm" }), date: "2027-02-20" },
  { ...rec({ value: 1.0 }), date: "2027-03-10" },
  { ...rec({ value: 0.6, protocol: "outro" }), date: "2027-04-02" },
]);
assert.deepEqual(tr.points.map((p) => p.date), ["2027-01-28", "2027-03-10"], "tendência só com datas compatíveis");
assert.deepEqual(tr.excluded.map((x) => x.date), ["2027-02-20", "2027-04-02"]);
assert.equal(tr.unit, "°");
const missing = compareRecords(rec({}), rec({ value: null }));
assert.equal(missing.diff, null);
ok("Comparações sinalizam vista, perfil, protocolo, calibração e orientação incompatíveis");

console.log(`\n${n} testes de avaliação postural passaram.`);
