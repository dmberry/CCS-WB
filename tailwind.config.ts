import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Editorial color palette
        ink: {
          DEFAULT: "#1a1a1a",
          50: "#f7f7f7",
          100: "#e3e3e3",
          200: "#c8c8c8",
          300: "#a4a4a4",
          400: "#818181",
          500: "#666666",
          600: "#515151",
          700: "#434343",
          800: "#383838",
          900: "#1a1a1a",
        },
        charcoal: {
          DEFAULT: "#2d2d2d",
          light: "#3d3d3d",
        },
        slate: {
          DEFAULT: "#4a4a4a",
          light: "#6b6b6b",
          muted: "#8a8a8a",
        },
        ivory: {
          DEFAULT: "#faf8f5",
          warm: "#f8f6f1",
        },
        cream: {
          DEFAULT: "#f5f2eb",
          warm: "#f0ebe0",
        },
        parchment: {
          DEFAULT: "#ede8dc",
          dark: "#e5dfd0",
        },
        burgundy: {
          DEFAULT: "#7c2d36",
          50: "#fdf2f4",
          100: "#fce4e8",
          200: "#facdd5",
          300: "#f5a3b3",
          400: "#ed6f89",
          500: "#e14565",
          600: "#cd2650",
          700: "#ac1d42",
          800: "#7c2d36",
          900: "#6b2832",
          950: "#3c1118",
        },
        gold: {
          DEFAULT: "#b8860b",
          light: "#d4a017",
          muted: "#c9a227",
        },
        // Semantic colors mapped to editorial palette
        primary: {
          DEFAULT: "#7c2d36",
          foreground: "#faf8f5",
        },
        secondary: {
          DEFAULT: "#b8860b",
          foreground: "#1a1a1a",
        },
        background: "#faf8f5",
        foreground: "#1a1a1a",
        success: {
          50: "#f0fdf4",
          100: "#dcfce7",
          500: "#22c55e",
          600: "#16a34a",
          DEFAULT: "#22c55e",
        },
        warning: {
          50: "#fff7ed",
          100: "#ffedd5",
          500: "#f97316",
          600: "#ea580c",
          DEFAULT: "#f97316",
        },
        error: {
          50: "#fef2f2",
          100: "#fee2e2",
          500: "#ef4444",
          600: "#dc2626",
          DEFAULT: "#ef4444",
        },
        muted: {
          DEFAULT: "#f5f2eb",
          foreground: "#6b6b6b",
        },
        card: {
          DEFAULT: "#ffffff",
          foreground: "#1a1a1a",
        },
        border: "#e5dfd0",
        input: "#e5dfd0",
        ring: "#7c2d36",
      },
      fontFamily: {
        display: ["var(--font-libre-baskerville)", "Georgia", "serif"],
        body: ["var(--font-source-serif)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Consolas", "monospace"],
      },
      fontSize: {
        // Editorial type scale based on 1.333 (Perfect Fourth)
        "display-2xl": ["3.157rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-xl": ["2.369rem", { lineHeight: "1.15", letterSpacing: "-0.01em" }],
        "display-lg": ["1.777rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        "display-md": ["1.333rem", { lineHeight: "1.3", letterSpacing: "0" }],
        "body-lg": ["1.125rem", { lineHeight: "1.7" }],
        "body-md": ["1rem", { lineHeight: "1.75" }],
        "body-sm": ["0.875rem", { lineHeight: "1.6" }],
        caption: ["0.75rem", { lineHeight: "1.5", letterSpacing: "0.02em" }],
      },
      borderRadius: {
        lg: "0.25rem",
        md: "0.1875rem",
        sm: "0.125rem",
        none: "0",
      },
      boxShadow: {
        editorial: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
        "editorial-md": "0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05)",
        "editorial-lg": "0 10px 15px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.04)",
        "editorial-inner": "inset 0 1px 2px rgba(0,0,0,0.06)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "pulse-subtle": "pulseSubtle 2s infinite",
        "reveal": "reveal 0.6s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        reveal: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
        "112": "28rem",
        "128": "32rem",
      },
    },
  },
  plugins: [],
};

export default config;
