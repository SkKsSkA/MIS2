import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: "#2D1B7A", // фон страниц
        ink: "#1B1340", // контуры и тёмный текст
        sun: "#FFD43B",
        coral: "#FF5A3C",
        violet: "#B9A4FF",
        mint: "#5EE6B8",
        pink: "#FF9BD2",
        sky: "#7CC8FF",
      },
      fontFamily: {
        sans: ["Onest", "system-ui", "sans-serif"],
        display: ["Unbounded", "Onest", "sans-serif"],
      },
      boxShadow: {
        pop: "5px 5px 0 #120B35",
        "pop-sm": "3px 3px 0 #120B35",
        "pop-lg": "8px 8px 0 #120B35",
      },
    },
  },
  plugins: [],
};

export default config;
