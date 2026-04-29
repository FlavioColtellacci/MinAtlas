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
    },
  },
  plugins: [],
};
export default config;
