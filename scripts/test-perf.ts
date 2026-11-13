/* Testes da classificação de desempenho (modo leve x design completo).
   Executar: node scripts/run-ts.mjs scripts/test-perf.ts */
import assert from "node:assert/strict";
import { PERF_BOOT_SCRIPT, classifyDevice, isSlowFrameSample, SLOW_FRAME_MS } from "../src/lib/perf";

let n = 0;
const ok = (msg: string) => {
  n++;
  console.log(`✓ ${msg}`);
};

const strong = { saved: null, deviceMemory: 8, cores: 8, effectiveType: "4g" };
assert.deepEqual(classifyDevice(strong), { tier: "full", slowNet: false });
ok("Aparelho forte sem escolha salva recebe o design completo");

assert.equal(classifyDevice({ saved: null, deviceMemory: 2, cores: 8 }).tier, "lite");
assert.equal(classifyDevice({ saved: null, deviceMemory: 4, cores: 4 }).tier, "lite");
assert.equal(classifyDevice({ saved: null, cores: 2 }).tier, "lite");
ok("Pouca memória, 4 GB com 4 núcleos ou 2 núcleos levam ao modo leve");

assert.equal(classifyDevice({ saved: null, deviceMemory: 4, cores: 8 }).tier, "full");
assert.equal(classifyDevice({ saved: null, cores: 4 }).tier, "full");
ok("Sem sinal suficiente (ex.: Safari só com núcleos) fica no design completo e é medido depois");

assert.deepEqual(classifyDevice({ ...strong, saveData: true }), { tier: "lite", slowNet: true });
assert.deepEqual(classifyDevice({ ...strong, effectiveType: "3g" }), { tier: "full", slowNet: true });
assert.equal(classifyDevice({ ...strong, effectiveType: "slow-2g" }).slowNet, true);
ok("Economia de dados ativa o modo leve; rede lenta só desliga o vídeo");

assert.equal(classifyDevice({ ...strong, saved: "false" }).tier, "lite");
assert.deepEqual(classifyDevice({ saved: "true", deviceMemory: 1, cores: 2, saveData: true }), { tier: "full", slowNet: false });
ok("A escolha explícita em Efeitos visuais vence a detecção nos dois sentidos");

assert.equal(classifyDevice({ ...strong, slowFlag: true }).tier, "lite");
ok("Lentidão medida nesta sessão leva ao modo leve nas próximas páginas");

const fast = Array.from({ length: 49 }, () => 16.7);
const slow = Array.from({ length: 49 }, (_, i) => (i % 5 === 0 ? 16 : 40));
const spiky = fast.map((g, i) => (i % 6 === 0 ? 120 : g));
assert.equal(isSlowFrameSample(fast, SLOW_FRAME_MS), false);
assert.equal(isSlowFrameSample(slow, SLOW_FRAME_MS), true);
assert.equal(isSlowFrameSample(spiky, SLOW_FRAME_MS), false);
assert.equal(isSlowFrameSample([50, 50], SLOW_FRAME_MS), false);
ok("Medição usa a mediana: picos isolados não rebaixam; lentidão constante rebaixa");

// O script inline precisa ser JS válido e autocontido (é serializado com toString)
assert.doesNotThrow(() => new Function(PERF_BOOT_SCRIPT));
assert.ok(!/\bimport\b|\brequire\(/.test(PERF_BOOT_SCRIPT));
ok("Script do <head> é JavaScript válido e sem dependências");

console.log(`\n${n} testes de desempenho passaram.`);
