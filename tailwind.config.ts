import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cosmos: {
          bg: "#f7f5fb",
          panel: "#ffffff",
          card: "#ffffff",
          surface: "#f3f1fb",
          border: "#e7e3f4",
          violet: "#7c3aed",
          indigo: "#6366f1",
          star: "#d97706",
          glow: "#7c3aed",
          gold: "#d97706",
          ink: "#171528",
          muted: "#6c6880",
        },
      },
      fontFamily: {
        display: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 6px 20px rgba(124,58,237,0.22)",
        card: "0 1px 3px rgba(23,21,40,0.06), 0 1px 2px rgba(23,21,40,0.04)",
      },
      keyframes: {
        twinkle: {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        twinkle: "twinkle 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
