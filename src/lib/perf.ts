// ==============================================================================
// Nível de desempenho do aparelho
// "full": design completo (vidro, vídeo, entradas). "lite": mesma identidade, sem desfoque,
// sem vídeo e sem animações de entrada, para PCs e celulares mais fracos.
// Transparência reduzida (preferência do sistema) só troca o vidro por superfície sólida, via CSS.
// A classificação roda num script inline antes da primeira pintura (sem salto visual).
// As funções abaixo são serializadas com toString(): mantenha-as autocontidas e em ES5.
// ==============================================================================

export type PerfTier = "full" | "lite";

export interface DeviceSignals {
  /** Escolha explícita salva em "Efeitos visuais": "true" | "false" | null */
  saved: string | null;
  saveData?: boolean;
  /** navigator.connection.effectiveType: "slow-2g" | "2g" | "3g" | "4g" */
  effectiveType?: string;
  /** navigator.deviceMemory em GB (Chromium; limitado a 8) */
  deviceMemory?: number;
  /** navigator.hardwareConcurrency */
  cores?: number;
  /** A medição de quadros desta sessão já mostrou lentidão */
  slowFlag?: boolean;
}

export interface DeviceClass {
  tier: PerfTier;
  /** Rede lenta ou economia de dados: sem vídeo mesmo com design completo */
  slowNet: boolean;
}

export function classifyDevice(s: DeviceSignals): DeviceClass {
  var explicitOn = s.saved === "true";
  var slowNet = !explicitOn && (s.saveData === true || /2g|3g/.test(s.effectiveType || ""));
  if (s.saved === "false") return { tier: "lite", slowNet: slowNet };
  if (explicitOn) return { tier: "full", slowNet: false };
  var mem = s.deviceMemory || 0;
  var cores = s.cores || 0;
  var weak =
    (mem > 0 && mem < 4) ||
    (cores > 0 && cores <= 2) ||
    (mem > 0 && mem <= 4 && cores > 0 && cores <= 4) ||
    s.saveData === true ||
    s.slowFlag === true;
  return { tier: weak ? "lite" : "full", slowNet: slowNet };
}

/** Mediana do intervalo entre quadros acima disso (ms) = aparelho não sustenta ~33 qps */
export var SLOW_FRAME_MS = 30;

export function isSlowFrameSample(gaps: number[], limit: number): boolean {
  if (gaps.length < 10) return false;
  var sorted = gaps.slice().sort(function (a, b) {
    return a - b;
  });
  return sorted[sorted.length >> 1] > limit;
}

function perfBootstrap(classify: typeof classifyDevice, slowSample: typeof isSlowFrameSample, limit: number) {
  var d = document.documentElement;
  d.classList.add("js");
  try {
    var n: any = navigator;
    var c: any = n.connection || {};
    var saved: string | null = null;
    var slow = false;
    try {
      saved = localStorage.getItem("sr_effects_enabled");
    } catch (e) {}
    try {
      slow = sessionStorage.getItem("lr_perf_slow") === "1";
    } catch (e) {}
    var r = classify({
      saved: saved,
      saveData: c.saveData,
      effectiveType: c.effectiveType,
      deviceMemory: n.deviceMemory,
      cores: n.hardwareConcurrency,
      slowFlag: slow,
    });
    if (r.tier === "lite") d.classList.add("lite");
    if (r.slowNet) d.classList.add("slow-net");
    if (r.tier === "lite" || saved !== null) return;

    // Aparelhos sem sinais (ex.: Safari) são medidos uma vez depois do carregamento
    window.addEventListener("load", function () {
      window.setTimeout(function () {
        if (document.hidden) return;
        var hidden = false;
        var onVis = function () {
          hidden = true;
        };
        document.addEventListener("visibilitychange", onVis);
        var gaps: number[] = [];
        var last = 0;
        var count = 0;
        var step = function (t: number) {
          if (last) gaps.push(t - last);
          last = t;
          if (++count < 50) {
            window.requestAnimationFrame(step);
            return;
          }
          document.removeEventListener("visibilitychange", onVis);
          if (hidden || d.classList.contains("lite") || !slowSample(gaps, limit)) return;
          d.classList.add("lite");
          try {
            sessionStorage.setItem("lr_perf_slow", "1");
          } catch (e) {}
          window.dispatchEvent(new Event("lr-perf"));
        };
        window.requestAnimationFrame(step);
      }, 1500);
    });
  } catch (e) {}
}

/** Script inline do <head>: marca "js", classifica o aparelho e agenda a medição de quadros. */
export const PERF_BOOT_SCRIPT = `(${perfBootstrap.toString()})(${classifyDevice.toString()},${isSlowFrameSample.toString()},${SLOW_FRAME_MS});`;

/** Evento disparado quando a medição rebaixa o aparelho para "lite" */
export const PERF_EVENT = "lr-perf";
export const PERF_SLOW_KEY = "lr_perf_slow";

export function isLiteNow(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("lite");
}
