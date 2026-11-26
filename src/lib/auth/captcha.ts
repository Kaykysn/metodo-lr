// Verificação de segurança (CAPTCHA) exigida pelo Supabase Auth no login por senha e no
// "Esqueci minha senha". O segredo fica só no painel do Supabase (Authentication → Attack
// Protection); aqui entra apenas a chave pública do site, que é feita para ir ao navegador.
//   NEXT_PUBLIC_CAPTCHA_PROVIDER = "turnstile" (Cloudflare) ou "hcaptcha"
//   NEXT_PUBLIC_CAPTCHA_SITE_KEY = chave do site no mesmo serviço escolhido no painel

export type CaptchaProvider = "turnstile" | "hcaptcha";

export interface CaptchaConfig {
  provider: CaptchaProvider;
  siteKey: string;
}

export function readCaptchaConfig(provider: string | undefined, siteKey: string | undefined): CaptchaConfig | null {
  const p = provider?.trim().toLowerCase();
  const k = siteKey?.trim() ?? "";
  if ((p !== "turnstile" && p !== "hcaptcha") || k.length < 10) return null;
  return { provider: p, siteKey: k };
}

export const CAPTCHA = readCaptchaConfig(process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER, process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY);

export const CAPTCHA_SCRIPT: Record<CaptchaProvider, string> = {
  turnstile: "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
  hcaptcha: "https://js.hcaptcha.com/1/api.js?render=explicit&recaptchacompat=off&hl=pt",
};

/** O Auth recusou o pedido por falta de verificação válida (e não por senha errada). */
export function isCaptchaError(error: { code?: string; message?: string } | null | undefined): boolean {
  return !!error && (error.code === "captcha_failed" || /captcha/i.test(error.message ?? ""));
}

export const CAPTCHA_MESSAGES = {
  pending: "Conclua a verificação de segurança abaixo e tente de novo.",
  failed: "A verificação de segurança não foi aceita. Ela foi renovada: tente de novo.",
  missing: "A verificação de segurança do login não está disponível agora. Entre com o Google ou fale com a equipe.",
} as const;
