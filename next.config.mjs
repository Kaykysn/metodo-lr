import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from "next/constants.js";

// Mesmas regras de src/lib/app-mode.ts (o config do Next não importa TypeScript).
// O build de produção falha se o modo não for explícito ou se o modo real estiver incompleto.
function isSecretKey(key) {
  if (/^sb_secret_/i.test(key)) return true;
  const parts = key.split(".");
  if (parts.length !== 3) return false;
  try {
    return JSON.parse(Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")).role === "service_role";
  } catch {
    return false;
  }
}

export function appModeProblems(env = process.env) {
  const problems = [];
  if (Object.keys(env).some((k) => k.startsWith("NEXT_PUBLIC_") && /SERVICE|SECRET/i.test(k))) {
    problems.push("Há variável NEXT_PUBLIC_ com SERVICE/SECRET no nome: ela iria para o navegador. Remova.");
  }
  // Chave pública: publishable (nova) ou anon (antiga). Chave secreta nunca vai para o navegador.
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (isSecretKey(key)) problems.push("A chave pública do Supabase é uma chave SECRETA (sb_secret_/service_role). Use a publishable (sb_publishable_) ou a anon.");
  const mode = env.NEXT_PUBLIC_APP_MODE;
  if (mode !== "demo" && mode !== "supabase") return [...problems, 'NEXT_PUBLIC_APP_MODE deve ser "demo" ou "supabase".'];
  if (mode === "demo") return problems;
  const placeholder = /seu-projeto|sua-chave|example|exemplo/i;
  const url = (env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const urlOk = /^https:\/\/[a-z0-9.-]+$/i.test(url) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(url);
  if (!url || placeholder.test(url) || !urlOk) problems.push("NEXT_PUBLIC_SUPABASE_URL ausente ou inválida (esperado https://<projeto>.supabase.co).");
  if (!key || placeholder.test(key) || key.length < 20) problems.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ausente ou inválida.");
  return problems;
}

const isDev = (phase) => phase === PHASE_DEVELOPMENT_SERVER;

/** @type {(phase: string) => import('next').NextConfig} */
const config = (phase) => {
  const problems = appModeProblems();
  if (phase === PHASE_PRODUCTION_BUILD && problems.length) {
    throw new Error(`Configuração de ambiente inválida para o build:\n- ${problems.join("\n- ")}\nVeja .env.example.`);
  }
  if (isDev(phase) && problems.length) {
    console.warn(`[config] ${problems.join(" ")} Rodando em modo demonstração.`);
  }
  return nextConfig(phase);
};

export default config;

/** @type {(phase: string) => import('next').NextConfig} */
const nextConfig = (phase) => ({
  reactStrictMode: true,

  // Fotografias editoriais (1672 × 941) saem em 90 para manter definição de pele e tecido;
  // o restante usa o padrão 75.
  images: {
    qualities: [75, 90],
  },

  // Headers de segurança (Nível C)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Previne MIME sniffing
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Previne clickjacking (permite iframe do mesmo domínio)
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          // Política de referrer (não vaza URLs completas para terceiros)
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Permissions Policy (desabilita features não usadas)
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // Content Security Policy (configuração inicial - ajustar conforme necessário)
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // unsafe-eval só no servidor de desenvolvimento (recarga do Next); nunca em produção
              `script-src 'self' 'unsafe-inline'${isDev(phase) ? " 'unsafe-eval'" : ""}`,
              "style-src 'self' 'unsafe-inline'", // unsafe-inline necessário para Tailwind
              "img-src 'self' data: blob: https:", // blob: = fotos posturais locais (modo demonstração)
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
              "media-src 'self' blob: https://wger.de https://*.supabase.co", // vídeos do wger (exibidos da fonte) e vídeos próprios (link assinado)
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },

  // Erros de tipo barram o build (o projeto passa em "npm run typecheck").
  typescript: {
    ignoreBuildErrors: false,
  },
  // Lint: "npm run lint" (o Next 16 não roda mais o ESLint no build).
  // HSTS será configurado no nível do hosting (Vercel/Netlify)
  // para evitar problemas em localhost
});
