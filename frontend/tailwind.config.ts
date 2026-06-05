import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config = {
  darkMode: ["class"],
  content: [
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        heading: ["var(--font-poppins)", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      colors: {
        canvas: "#010102",
        surface: {
          DEFAULT: "#0f1011",
          1: "#0f1011",
          2: "#141516",
          3: "#18191a",
          4: "#191a1b",
        },
        hairline: {
          DEFAULT: "#23252a",
          strong: "#34343a",
          tertiary: "#3e3e44",
        },
        ink: {
          DEFAULT: "#f7f8f8",
          muted: "#d0d6e0",
          subtle: "#8a8f98",
          tertiary: "#62666d",
        },
        accent: {
          DEFAULT: "#d4af37",
          hover: "#f3e5ab",
          focus: "#c5a059",
          muted: "#8a6d3b",
        },
        success: "#27a644",
        warning: "#d4a843",
        danger: "#d24a4a",

        /* Legacy shadcn mappings for compatibility if needed */
        background: "#010102",
        foreground: "#f7f8f8",
        primary: {
          DEFAULT: "#d4af37",
          foreground: "#111111",
        },
        border: "#23252a",
        card: {
          DEFAULT: "#0f1011",
          foreground: "#f7f8f8",
        },
        muted: {
          DEFAULT: "#141516",
          foreground: "#8a8f98",
        },
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideInRight: {
          from: { opacity: "0", transform: "translateX(12px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in-up": "fadeInUp 0.4s ease-out both",
        "fade-in": "fadeIn 0.3s ease-out both",
        "slide-in": "slideInRight 0.3s ease-out both",
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;

export default config;
