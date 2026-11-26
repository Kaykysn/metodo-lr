"use client";

// Widget de verificação (Cloudflare Turnstile ou hCaptcha), carregado só onde é usado.
// Cada token vale para um pedido: depois de cada tentativa o formulário chama reset().
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { CAPTCHA, CAPTCHA_SCRIPT, type CaptchaProvider } from "@/lib/auth/captcha";

interface Widget {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove?: (id: string) => void;
}

declare global {
  interface Window {
    turnstile?: Widget;
    hcaptcha?: Widget;
  }
}

const loading = new Map<CaptchaProvider, Promise<Widget>>();

function loadWidget(provider: CaptchaProvider): Promise<Widget> {
  const ready = () => (provider === "turnstile" ? window.turnstile : window.hcaptcha);
  const existing = ready();
  if (existing) return Promise.resolve(existing);
  let p = loading.get(provider);
  if (!p) {
    p = new Promise<Widget>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = CAPTCHA_SCRIPT[provider];
      s.async = true;
      s.defer = true;
      s.onload = () => {
        // O hCaptcha expõe a API logo depois do onload; espera curta até ela existir
        let tries = 0;
        const check = () => {
          const w = ready();
          if (w) resolve(w);
          else if (++tries > 50) reject(new Error("captcha"));
          else setTimeout(check, 100);
        };
        check();
      };
      s.onerror = () => {
        loading.delete(provider);
        reject(new Error("captcha"));
      };
      document.head.appendChild(s);
    });
    loading.set(provider, p);
  }
  return p;
}

export interface CaptchaHandle {
  reset: () => void;
}

const Captcha = forwardRef<CaptchaHandle, { onToken: (token: string | null) => void; onUnavailable?: () => void }>(function Captcha(
  { onToken, onUnavailable },
  ref
) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<{ api: Widget; id: string } | null>(null);
  const cb = useRef({ onToken, onUnavailable });
  useEffect(() => {
    cb.current = { onToken, onUnavailable };
  });

  useImperativeHandle(ref, () => ({
    reset: () => {
      cb.current.onToken(null);
      if (widget.current) widget.current.api.reset(widget.current.id);
    },
  }));

  useEffect(() => {
    if (!CAPTCHA || !box.current) return;
    let cancelled = false;
    const el = box.current;
    loadWidget(CAPTCHA.provider)
      .then((api) => {
        if (cancelled || !CAPTCHA) return;
        const id = api.render(el, {
          sitekey: CAPTCHA.siteKey,
          callback: (t: string) => cb.current.onToken(t),
          "expired-callback": () => cb.current.onToken(null),
          "error-callback": () => cb.current.onToken(null),
          ...(CAPTCHA.provider === "turnstile" ? { language: "pt-br", theme: "auto", size: "flexible" } : { hl: "pt" }),
        });
        widget.current = { api, id };
      })
      .catch(() => cb.current.onUnavailable?.());
    return () => {
      cancelled = true;
      const w = widget.current;
      widget.current = null;
      if (w?.api.remove) w.api.remove(w.id);
      el.replaceChildren();
    };
  }, []);

  if (!CAPTCHA) return null;
  return <div ref={box} className="flex min-h-[65px] justify-center" aria-label="Verificação de segurança" />;
});

export default Captcha;
