import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#070A10",
        card: "rgba(255,255,255,0.04)",
        line: "rgba(255,255,255,0.10)",
        text: "rgba(255,255,255,0.92)",
        muted: "rgba(255,255,255,0.62)"
      }
    },
  },
  plugins: [],
} satisfies Config;
