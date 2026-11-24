import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "@/styles/globals.css";
import { AppearanceProvider } from "@/components/providers/AppearanceProvider";
import { PERF_BOOT_SCRIPT } from "@/lib/perf";
import AmbientBackground from "@/components/effects/AmbientBackground";
import ParticleField from "@/components/effects/ParticleField";
import LayeredBackdrop from "@/components/effects/LayeredBackdrop";
import ClickEffects from "@/components/effects/ClickEffects";
import ScrollEffects from "@/components/motion/ScrollEffects";
import { siteOrigin } from "@/lib/site/origin";

// Manrope (OFL) hospedada localmente: src/fonts/OFL.txt
const manrope = localFont({
  src: [
    { path: "../fonts/manrope-latin-wght-normal.woff2", weight: "200 800", style: "normal" },
    { path: "../fonts/manrope-latin-ext-wght-normal.woff2", weight: "200 800", style: "normal" },
  ],
  variable: "--font-sans",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "Roboto", "Arial", "sans-serif"],
});

// Barlow Condensed ExtraBold (normal e itálica) usada nos títulos editoriais.
// Licença preservada em src/fonts/Barlow-OFL.txt.
const barlow = localFont({
  src: [
    { path: "../fonts/barlow-condensed-extrabold.ttf", weight: "800", style: "normal" },
    { path: "../fonts/barlow-condensed-extrabold-italic.ttf", weight: "800", style: "italic" },
  ],
  variable: "--font-display",
  display: "swap",
  fallback: ["Arial Narrow", "Impact", "sans-serif"],
});

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
    { media: "(prefers-color-scheme: light)", color: "#111111" },
    { media: "(prefers-color-scheme: dark)", color: "#111111" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${manrope.variable} ${barlow.variable}`}>
      <head>
        {/* Antes da pintura: marca "js" e classifica o aparelho (design completo ou leve) */}
        <script dangerouslySetInnerHTML={{ __html: PERF_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-screen flex flex-col bg-theme-page text-theme-text antialiased selection:bg-brand-200 selection:text-ink-950">
        <AppearanceProvider>
          <AmbientBackground />
          <ParticleField />
          <LayeredBackdrop />
          <ClickEffects />
          <ScrollEffects />
          <div className="relative z-10 flex flex-col min-h-screen">{children}</div>
        </AppearanceProvider>
      </body>
    </html>
  );
}
