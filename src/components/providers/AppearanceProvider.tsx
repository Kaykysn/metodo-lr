"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import {
  EFFECTS_STORAGE_KEY,
  THEME_STORAGE_KEY,
  readEffectsPreference,
  saveEffectsPreference,
} from "@/lib/appearance";
import { PERF_EVENT, isLiteNow } from "@/lib/perf";

interface EffectsContextType {
  /** Preferência do usuário (independe de movimento reduzido) */
  effectsEnabled: boolean;
  /** Movimento reduzido do sistema: restrição mais forte que a preferência */
  prefersReducedMotion: boolean;
  /** Efeitos realmente ativos = preferência ligada e sem movimento reduzido */
  effectsActive: boolean;
  /** Vídeo do hero permitido: efeitos ligados e sem rede lenta/economia de dados */
  videoAllowed: boolean;
  setEffectsEnabled: (enabled: boolean) => void;
  toggleEffects: () => void;
}

const EffectsContext = createContext<EffectsContextType>({
  effectsEnabled: true,
  prefersReducedMotion: false,
  effectsActive: false,
  videoAllowed: false,
  setEffectsEnabled: () => {},
  toggleEffects: () => {},
});

export function useVisualEffects() {
  return useContext(EffectsContext);
}

/** nonce: o do pedido (src/proxy.ts), para o script do tema rodar sob a CSP. */
export function AppearanceProvider({ children, nonce }: { children: React.ReactNode; nonce?: string }) {
  const defaultTheme = usePathname() === "/" ? "dark" : "system";
  const [effectsEnabled, setEffectsEnabledState] = useState<boolean>(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);
  const [slowNet, setSlowNet] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Escolha salva vale; sem escolha, segue a classificação feita antes da pintura
    const saved = readEffectsPreference();
    setEffectsEnabledState(saved ?? !isLiteNow());
    setSlowNet(document.documentElement.classList.contains("slow-net"));
    setMounted(true);

    // A medição de quadros rebaixou o aparelho (só quando não há escolha salva)
    const onPerf = () => {
      if (readEffectsPreference() === null) setEffectsEnabledState(false);
    };
    window.addEventListener(PERF_EVENT, onPerf);

    // Sincroniza a preferência entre abas
    const onStorage = (e: StorageEvent) => {
      if (e.key === EFFECTS_STORAGE_KEY) setEffectsEnabledState(e.newValue !== "false");
    };
    window.addEventListener("storage", onStorage);

    // Movimento reduzido, inclusive se mudar com a página aberta
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const onMotion = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", onMotion);

    return () => {
      window.removeEventListener(PERF_EVENT, onPerf);
      window.removeEventListener("storage", onStorage);
      mq.removeEventListener("change", onMotion);
    };
  }, []);

  // A classe "lite" no <html> acompanha a preferência (vidro, vídeo e entradas via CSS)
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("lite", !effectsEnabled);
  }, [effectsEnabled, mounted]);

  const setEffectsEnabled = useCallback((enabled: boolean) => {
    setEffectsEnabledState(enabled);
    saveEffectsPreference(enabled);
    if (enabled) setSlowNet(false); // ligar explicitamente libera o vídeo
  }, []);

  const toggleEffects = useCallback(() => {
    setEffectsEnabledState((prev) => {
      saveEffectsPreference(!prev);
      if (!prev) setSlowNet(false);
      return !prev;
    });
  }, []);

  const value = useMemo<EffectsContextType>(
    () => ({
      effectsEnabled,
      prefersReducedMotion,
      // Nada anima antes da hidratação: o primeiro paint não depende do motor
      effectsActive: mounted && effectsEnabled && !prefersReducedMotion,
      videoAllowed: mounted && effectsEnabled && !slowNet,
      setEffectsEnabled,
      toggleEffects,
    }),
    [effectsEnabled, prefersReducedMotion, mounted, slowNet, setEffectsEnabled, toggleEffects]
  );

  return (
    <NextThemesProvider
      attribute="class"
      key={defaultTheme}
      defaultTheme={defaultTheme}
      enableSystem
      disableTransitionOnChange
      storageKey={THEME_STORAGE_KEY}
      nonce={nonce}
    >
      <EffectsContext.Provider value={value}>{children}</EffectsContext.Provider>
    </NextThemesProvider>
  );
}
