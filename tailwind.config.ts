import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        neon: "0 0 18px rgba(56,189,248,0.6), 0 0 40px rgba(168,85,247,0.35)"
      }
    }
  },
  plugins: []
} satisfies Config;
