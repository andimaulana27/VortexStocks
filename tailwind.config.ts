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
        // Palet warna custom sesuai desain UI Anda
        background: "var(--background)",
        foreground: "var(--foreground)",
        panel: "var(--panel-bg)",
        borderCus: "var(--border-color)",
        bullish: "var(--bullish)",
        bearish: "var(--bearish)",
      },
    },
  },
  plugins: [],
};

export default config;