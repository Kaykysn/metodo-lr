import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "@/styles/globals.css";
import { AppearanceProvider } from "@/components/providers/AppearanceProvider";
import { PERF_BOOT_SCRIPT } from "@/lib/perf";
import AmbientBackground from "@/components/effects/AmbientBackground";
import ParticleField from "@/components/effects/ParticleField";
import ScrollEffects from "@/components/motion/ScrollEffects";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

// Manrope (OFL) hospedada localmente: src/fonts/OFL.txt
const geist = Geist({subsets:['latin'],variable:'--font-sans'});

/**
 * Endereço absoluto das imagens de compartilhamento. Na Vercel vem do domínio de produção
 * informado no build (acompanha o domínio próprio quando for ligado); fora dela, da URL do
 * site, ignorando localhost, que não serve para quem recebe o link.
 */
function siteOrigin(): URL {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return new URL(`https://${vercel}`);
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site && !/localhost|127\.0\.0\.1/.test(site)) return new URL(site);
  return new URL("https://metodolr.vercel.app");
}

const SITE_DESCRIPTION =
  "Plataforma para profissionais e estudantes de Educação Física organizarem avaliações, montarem treinos individualizados e acompanharem a evolução dos alunos.";

export const metadata: Metadata = {
  metadataBase: siteOrigin(),
  title: { default: "Leandro Rangel — Avaliação, treino e acompanhamento", template: "%s · Leandro Rangel" },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Leandro Rangel",
    title: "Leandro Rangel — Entenda o corpo. Evolua com precisão.",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Leandro Rangel — Entenda o corpo. Evolua com precisão.",
    description: SITE_DESCRIPTION,
  },
  icons: { icon: [{ url: "/brand/favicon.svg", type: "image/svg+xml" }, { url: "/brand/favicon-32.png", sizes: "32x32" }] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EFF4F4" },
    { media: "(prefers-color-scheme: dark)", color: "#081626" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <head>
        {/* Antes da pintura: marca "js" e classifica o aparelho (design completo ou leve) */}
        <script dangerouslySetInnerHTML={{ __html: PERF_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-screen flex flex-col bg-theme-page text-theme-text antialiased selection:bg-brand-200 selection:text-ink-950">
        <AppearanceProvider>
          <AmbientBackground />
          <ParticleField />
          <ScrollEffects />
          <div className="relative z-10 flex flex-col min-h-screen">{children}</div>
        </AppearanceProvider>
      </body>
    </html>
  );
}
