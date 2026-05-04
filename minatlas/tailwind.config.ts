import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg-primary)",
        foreground: "var(--text-primary)",
        map: "var(--bg-map)",
        frosted: "var(--bg-frosted)",
        accent: "var(--accent)",
        "accent-subtle": "var(--accent-subtle)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)",
        border: "var(--border)",
        "border-subtle": "var(--border-subtle)",
        "status-active": "var(--status-active)",
        "status-active-bg": "var(--status-active-bg)",
        muted: "var(--muted)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        ui: ["var(--font-ui)"],
        mono: ["var(--font-mono)"],
      },
      boxShadow: {
        float: "var(--shadow-float)",
        card: "var(--shadow-card)",
      },
      keyframes: {
        "detail-skeleton-sheen": {
          "0%": { transform: "translate3d(-100%, 0, 0)" },
          "100%": { transform: "translate3d(350%, 0, 0)" },
        },
      },
      animation: {
        "detail-skeleton-sheen": "detail-skeleton-sheen 2.1s cubic-bezier(0.4, 0, 0.2, 1) infinite",
      },
    },
  },
  plugins: [],
};
export default config;
