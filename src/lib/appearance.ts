// ==============================================================================
// STUDIO LEANDRO RANGEL — Preferências de aparência e efeitos visuais
// ==============================================================================

export type ThemeChoice = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "sr_theme_choice";
export const EFFECTS_STORAGE_KEY = "sr_effects_enabled";

/** Curva e durações compartilhadas pelos componentes de movimento */
export const MOTION = {
  ease: "cubic-bezier(0.22, 1, 0.36, 1)",
  revealMs: 500,
  stageMs: 220,
  themeSwitchMs: 180,
} as const;

/** Intensidade da atmosfera por tipo de rota */
export type AtmosphereIntensity = "landing" | "work" | "calm";

export function atmosphereIntensityFor(pathname: string): AtmosphereIntensity {
  if (pathname === "/" || pathname.startsWith("/demo")) return "landing";
  if (
    pathname.startsWith("/app") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/solicitar-acesso") ||
    pathname.startsWith("/conta") ||
    pathname.startsWith("/aguardando-aprovacao")
  ) {
    return "work";
  }
  return "calm"; // privacidade, termos e demais páginas de leitura
}

/** Quantidade de partículas por largura de viewport e intensidade */
export function particleCountFor(width: number, intensity: AtmosphereIntensity): number {
  if (intensity === "landing") {
    if (width < 640) return 7;
    if (width < 1024) return 14;
    return 24;
  }
  if (intensity === "work") {
    if (width < 640) return 3;
    if (width < 1024) return 6;
    return 9;
  }
  if (width < 640) return 4;
  if (width < 1024) return 8;
  return 12;
}

/** Lê a preferência de efeitos visuais salva (padrão: ativada) */
export function getSavedEffectsPreference(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const val = window.localStorage.getItem(EFFECTS_STORAGE_KEY);
    return val === null ? true : val === "true";
  } catch {
    return true;
  }
}

/** Escolha explícita salva; null quando o usuário nunca escolheu (vale a detecção do aparelho) */
export function readEffectsPreference(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const val = window.localStorage.getItem(EFFECTS_STORAGE_KEY);
    return val === null ? null : val === "true";
  } catch {
    return null;
  }
}

/** Salva a preferência de efeitos visuais; falhas de armazenamento são ignoradas */
export function saveEffectsPreference(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(EFFECTS_STORAGE_KEY, enabled ? "true" : "false");
  } catch {
    // modo privado / armazenamento bloqueado: a escolha vale só nesta aba
  }
}
