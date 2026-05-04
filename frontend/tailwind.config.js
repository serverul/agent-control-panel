/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0d0f12",
          secondary: "#141720",
          tertiary: "#1a1e2a",
          glass: "rgba(26, 30, 42, 0.6)",
        },
        border: {
          default: "rgba(255, 255, 255, 0.06)",
          hover: "rgba(255, 255, 255, 0.12)",
        },
        accent: {
          primary: "#6366f1",
          secondary: "#818cf8",
          glow: "rgba(99, 102, 241, 0.15)",
        },
        text: {
          primary: "#e2e8f0",
          secondary: "#94a3b8",
          muted: "#64748b",
        },
        status: {
          active: "#22c55e",
          idle: "#eab308",
          error: "#ef4444",
          offline: "#64748b",
        },
      },
      backdropBlur: {
        glass: "16px",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0, 0, 0, 0.3)",
        glow: "0 0 20px rgba(99, 102, 241, 0.2)",
      },
    },
  },
  plugins: [],
};
