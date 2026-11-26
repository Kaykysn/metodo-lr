// Content Security Policy montada a cada pedido pela borda (src/proxy.ts).
// Scripts: só os que levam o nonce do pedido ('strict-dynamic' estende a confiança aos scripts que
// eles carregam, como os pedaços do Next e o widget do Cloudflare). Nada de 'unsafe-inline' em
// script-src: um script injetado na página não tem o nonce e não roda.
// O Next lê o nonce do cabeçalho Content-Security-Policy do pedido e o aplica nos próprios scripts;
// por isso as páginas são renderizadas a cada pedido (o layout raiz lê os cabeçalhos).
// Estilos continuam com 'unsafe-inline' (atributos style do React e do Tailwind); estilo não executa código.

// Domínios da verificação de segurança (src/lib/auth/captcha.ts)
const CAPTCHA_ORIGINS: Record<string, string> = {
  turnstile: "https://challenges.cloudflare.com",
  hcaptcha: "https://hcaptcha.com https://*.hcaptcha.com",
};

export function captchaOriginsFor(provider: string | undefined): string {
  return CAPTCHA_ORIGINS[(provider || "turnstile").trim().toLowerCase()] ?? "";
}

/** Nonce aleatório de 128 bits em base64. */
export function newNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

export function buildCsp(nonce: string, opts: { dev: boolean; captchaOrigins: string }): string {
  const withCaptcha = (d: string) => (opts.captchaOrigins ? `${d} ${opts.captchaOrigins}` : d);
  return [
    "default-src 'self'",
    // unsafe-eval só no servidor de desenvolvimento (recarga do Next); nunca em produção.
    // 'self' e os domínios ficam como reserva para navegadores sem 'strict-dynamic'.
    withCaptcha(`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${opts.dev ? " 'unsafe-eval'" : ""}`),
    withCaptcha("style-src 'self' 'unsafe-inline'"),
    "img-src 'self' data: blob: https:", // blob: = fotos posturais locais (modo demonstração)
    "font-src 'self' data:",
    withCaptcha("connect-src 'self' https://*.supabase.co wss://*.supabase.co"),
    withCaptcha("frame-src 'self'"),
    "media-src 'self' blob: https://wger.de https://*.supabase.co", // vídeos do wger e vídeos próprios (link assinado)
    "object-src 'none'",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}
