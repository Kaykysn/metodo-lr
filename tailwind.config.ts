import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic Token Roles mapped to CSS Variables
        theme: {
          page: "rgb(var(--bg-page) / <alpha-value>)",
          primary: "rgb(var(--surface-primary) / <alpha-value>)",
          secondary: "rgb(var(--surface-secondary) / <alpha-value>)",
          raised: "rgb(var(--surface-raised) / <alpha-value>)",
          text: "rgb(var(--text-primary) / <alpha-value>)",
          muted: "rgb(var(--text-secondary) / <alpha-value>)",
          subtle: "rgb(var(--text-subtle) / <alpha-value>)",
          border: "rgb(var(--border-decorative) / <alpha-value>)",
          boundary: "rgb(var(--border-control) / <alpha-value>)",
          teal: "rgb(var(--accent-teal) / <alpha-value>)",
          "teal-subtle": "rgb(var(--accent-teal-subtle) / <alpha-value>)",
        },
        inverse: {
          DEFAULT: "rgb(var(--inverse-bg) / <alpha-value>)",
          hover: "rgb(var(--inverse-hover) / <alpha-value>)",
          fg: "rgb(var(--inverse-fg) / <alpha-value>)",
        },
        chart: {
          bar: "rgb(var(--chart-bar) / <alpha-value>)",
          active: "rgb(var(--chart-bar-active) / <alpha-value>)",
          grid: "rgb(var(--chart-grid) / <alpha-value>)",
          zero: "rgb(var(--chart-zero) / <alpha-value>)",
          plot: "rgb(var(--chart-plot) / <alpha-value>)",
        },
        // Ação principal das telas operacionais (jade)
        action: {
          DEFAULT: "rgb(var(--action-bg) / <alpha-value>)",
          text: "rgb(var(--action-text) / <alpha-value>)",
          hover: "rgb(var(--action-hover) / <alpha-value>)",
        },
        navy: "rgb(var(--brand-navy) / <alpha-value>)",
        // CTA principal (âmbar) — só a ação principal das páginas públicas
        cta: {
          DEFAULT: "rgb(var(--cta-bg) / <alpha-value>)",
          text: "rgb(var(--cta-text) / <alpha-value>)",
          hover: "rgb(var(--cta-hover) / <alpha-value>)",
        },
        // Azul-noite (neutros de marca)
        ink: {
          950: "#081626",
          900: "#0C2446",
          800: "#112638",
          700: "#1A3247",
          600: "#48616A",
          500: "#6F858C",
          300: "#A9BFC4",
          200: "#CFDDE0",
          100: "#E3ECED",
          50: "#EFF4F4",
        },
        // Jade (acento)
        brand: {
          700: "#0B4A45",
          600: "#0E5B55",
          500: "#116C65",
          400: "#2E8F84",
          300: "#76D7BE",
          200: "#A6E6D4",
          100: "#D3F2E9",
          50: "#EAF8F4",
        },
        symptom: "rgb(var(--symptom) / <alpha-value>)",
        // Semantic Status Feedback
        status: {
          success: {
            fg: "rgb(var(--status-success-fg) / <alpha-value>)",
            bg: "rgb(var(--status-success-bg) / <alpha-value>)",
            border: "rgb(var(--status-success-border) / <alpha-value>)",
          },
          caution: {
            fg: "rgb(var(--status-caution-fg) / <alpha-value>)",
            bg: "rgb(var(--status-caution-bg) / <alpha-value>)",
            border: "rgb(var(--status-caution-border) / <alpha-value>)",
          },
          danger: {
            fg: "rgb(var(--status-danger-fg) / <alpha-value>)",
            bg: "rgb(var(--status-danger-bg) / <alpha-value>)",
            border: "rgb(var(--status-danger-border) / <alpha-value>)",
          },
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "Oxygen",
          "Ubuntu",
          "Cantarell",
          "sans-serif",
        ],
      },
      maxWidth: {
        container: "1240px",
      },
      borderRadius: {
        card: "16px",
        control: "10px",
        panel: "16px",
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgba(12, 36, 70, 0.05), 0 1px 2px -1px rgba(12, 36, 70, 0.05)",
        card: "0 4px 20px -2px rgba(12, 36, 70, 0.06), 0 2px 6px -1px rgba(12, 36, 70, 0.04)",
        elevated: "0 10px 30px -5px rgba(12, 36, 70, 0.1), 0 4px 10px -2px rgba(12, 36, 70, 0.05)",
        "dark-subtle": "0 1px 3px 0 rgba(0, 0, 0, 0.3)",
        "dark-card": "0 4px 20px -2px rgba(0, 0, 0, 0.4), 0 2px 6px -1px rgba(0, 0, 0, 0.2)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleUp: {
          "0%": { opacity: "0", transform: "scale(0.985)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        heroIn: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        drawerIn: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 220ms cubic-bezier(0.22, 1, 0.36, 1) both",
        slideUp: "slideUp 500ms cubic-bezier(0.22, 1, 0.36, 1) both",
        scaleUp: "scaleUp 500ms cubic-bezier(0.22, 1, 0.36, 1) both",
        heroIn: "heroIn 560ms cubic-bezier(0.22, 1, 0.36, 1) both",
        drawerIn: "drawerIn 220ms cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
