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
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#4F46E5",
          hover: "#4338CA",
          subtle: "#EEF2FF",
          fixed: "#E2DFFF",
          container: "#4F46E5",
        },
        success: { DEFAULT: "#10B981", bg: "#ECFDF5" },
        warning: { DEFAULT: "#F59E0B", bg: "#FFFBEB" },
        danger: { DEFAULT: "#EF4444", bg: "#FEF2F2" },
        info: { DEFAULT: "#3B82F6", bg: "#EFF6FF" },
        surface: {
          page: "#F5F6FA",
          card: "#FFFFFF",
          sidebar: "#FFFFFF",
          DEFAULT: "#FCF8FF",
          container: "#F0ECF9",
          "container-low": "#F5F2FF",
        },
        border: { DEFAULT: "#E5E7EB", subtle: "#F3F4F6", variant: "#C7C4D8" },
        text: {
          primary: "#111827",
          secondary: "#6B7280",
          muted: "#9CA3AF",
          onSurface: "#1B1B24",
          onSurfaceVariant: "#464555",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "page-title": ["28px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }],
        "section-header": ["18px", { lineHeight: "1.4", fontWeight: "600" }],
        "card-title": ["15px", { lineHeight: "1.5", fontWeight: "600" }],
        body: ["14px", { lineHeight: "1.6", fontWeight: "400" }],
        "label-eyebrow": ["11px", { lineHeight: "1", letterSpacing: "0.06em", fontWeight: "600" }],
        "small-ui": ["12px", { lineHeight: "1", fontWeight: "500" }],
      },
      spacing: {
        sidebar: "240px",
        topbar: "56px",
      },
      maxWidth: {
        content: "1280px",
      },
      borderRadius: {
        card: "12px",
        modal: "16px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0, 0, 0, 0.04)",
        elevated: "0 8px 32px rgba(0, 0, 0, 0.10)",
      },
    },
  },
  plugins: [],
};
export default config;
