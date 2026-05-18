import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-arabic)"],
        arabic: ["var(--font-arabic)"],
        english: ["var(--font-english)"],
      },
      fontSize: {
        "ui-badge": ["13px", { lineHeight: "1.4", fontWeight: "600" }],
        "ui-meta": ["14px", { lineHeight: "1.7", fontWeight: "500" }],
        "ui-button": ["15px", { lineHeight: "1.45", fontWeight: "600" }],
        "ui-relationship": ["15px", { lineHeight: "1.7", fontWeight: "500" }],
        "ui-body": ["16px", { lineHeight: "1.8", fontWeight: "400" }],
        "ui-sidebar": ["17px", { lineHeight: "1.6", fontWeight: "600" }],
        "ui-card": ["20px", { lineHeight: "1.5", fontWeight: "600" }],
        "ui-section": ["24px", { lineHeight: "1.5", fontWeight: "600" }],
        "ui-page": ["36px", { lineHeight: "1.4", fontWeight: "700" }],
        "ui-xs": ["14px", { lineHeight: "1.7" }],
        "ui-sm": ["16px", { lineHeight: "1.8" }],
        "ui-base": ["16px", { lineHeight: "1.8" }],
        "ui-lg": ["20px", { lineHeight: "1.5" }],
        "ui-xl": ["24px", { lineHeight: "1.5" }],
        "ui-2xl": ["36px", { lineHeight: "1.4" }],
      },
      colors: {
        ink: "#18202b",
        line: "#d8dee8",
        mist: "#f4f7fb",
        teal: "#0f766e",
        emeraldDeep: "#063f3b",
        emeraldNight: "#062b28",
        gold: "#b7791f",
        rose: "#be123c"
      },
      boxShadow: {
        executive: "0 18px 45px rgba(15, 23, 42, 0.08)",
        soft: "0 10px 30px rgba(15, 23, 42, 0.06)"
      }
    }
  },
  plugins: []
};

export default config;
