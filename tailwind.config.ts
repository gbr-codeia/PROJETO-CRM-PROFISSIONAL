import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

/**
 * EDITFLOW CRM — dark, premium, turquoise-accented UI.
 * Reference: dark analytics dashboard with subtle green/teal glow.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/features/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#101010",
        surface: {
          DEFAULT: "#161616",
          raised: "#1b1b1b",
          overlay: "#1f1f1f",
          input: "#1a1a1a",
        },
        line: {
          DEFAULT: "#262626",
          soft: "#1e1e1e",
          accent: "rgba(30, 217, 182, 0.22)",
        },
        content: {
          DEFAULT: "#ededed",
          muted: "#9a9a9a",
          subtle: "#6a6a6a",
        },
        primary: {
          DEFAULT: "#1ED9B6",
          hover: "#33e3c4",
          foreground: "#03120f",
          muted: "rgba(30, 217, 182, 0.12)",
        },
        success: "#1ED9B6",
        warning: "#f5b544",
        danger: "#f0685f",
        info: "#5aa8f5",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(30,217,182,0.35), 0 12px 40px -18px rgba(30,217,182,0.35)",
        "glow-sm": "0 0 0 1px rgba(30,217,182,0.28), 0 8px 24px -14px rgba(30,217,182,0.30)",
        card: "0 1px 0 0 rgba(255,255,255,0.02) inset, 0 20px 40px -28px rgba(0,0,0,0.7)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.35s ease-out both",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
