import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "@/styles/globals.css";
import { AppearanceProvider } from "@/components/providers/AppearanceProvider";
import { PERF_BOOT_SCRIPT } from "@/lib/perf";
import AmbientBackground from "@/components/effects/AmbientBackground";
import ParticleField from "@/components/effects/ParticleField";
import ScrollEffects from "@/components/motion/ScrollEffects";

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

export const metadata: Metadata = {
  title: { default: "Leandro Rangel — Avaliação, treino e acompanhamento", template: "%s · Leandro Rangel" },
  description:
    "Plataforma para profissionais e estudantes de Educação Física organizarem avaliações, montarem treinos individualizados e acompanharem a evolução dos alunos.",
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
    <html lang="pt-BR" suppressHydrationWarning className={manrope.variable}>
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
