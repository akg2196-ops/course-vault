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
      fontFamily: {
        sans: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
      colors: {
        notion: {
          bg: "#191919",
          "bg-secondary": "#1f1f1f",
          "bg-tertiary": "#2e2e2e",
          border: "#373737",
          "border-hover": "#474747",
          text: "#ffffff",
          "text-secondary": "#b3b3b3",
          "text-tertiary": "#808080",
          accent: "#2383e2",
          "accent-hover": "#0d6bcc",
          hover: "#2e2e2e",
          "hover-secondary": "#373737",
        },
      },
      borderRadius: {
        notion: "3px",
        "notion-lg": "6px",
      },
    },
  },
  plugins: [],
};

export default config;
