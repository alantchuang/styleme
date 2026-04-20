import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Aura Elan — Material Design 3 light token set
        "primary":                    "#645783",
        "on-primary":                 "#ffffff",
        "primary-container":          "#eadeff",
        "on-primary-container":       "#6b5e8a",
        "primary-fixed":              "#e9ddff",
        "primary-fixed-dim":          "#cfbff1",
        "on-primary-fixed":           "#20143c",
        "on-primary-fixed-variant":   "#4c406a",
        "inverse-primary":            "#cfbff1",

        "secondary":                  "#72575f",
        "on-secondary":               "#ffffff",
        "secondary-container":        "#fed9e2",
        "on-secondary-container":     "#795d65",
        "secondary-fixed":            "#fed9e2",
        "secondary-fixed-dim":        "#e0bec6",
        "on-secondary-fixed":         "#2a161c",
        "on-secondary-fixed-variant": "#594047",

        "tertiary":                   "#5e5f5a",
        "on-tertiary":                "#ffffff",
        "tertiary-container":         "#e5e3dd",
        "on-tertiary-container":      "#656561",
        "tertiary-fixed":             "#e4e2dd",
        "tertiary-fixed-dim":         "#c8c6c1",
        "on-tertiary-fixed":          "#1b1c19",
        "on-tertiary-fixed-variant":  "#474743",

        "error":                      "#ba1a1a",
        "on-error":                   "#ffffff",
        "error-container":            "#ffdad6",
        "on-error-container":         "#93000a",

        "background":                 "#fdf8fd",
        "on-background":              "#1c1b1f",

        "surface":                    "#fdf8fd",
        "on-surface":                 "#1c1b1f",
        "surface-variant":            "#e6e1e7",
        "on-surface-variant":         "#48464c",
        "surface-tint":               "#645783",
        "surface-dim":                "#ded8de",
        "surface-bright":             "#fdf8fd",
        "surface-container-lowest":   "#ffffff",
        "surface-container-low":      "#f8f2f8",
        "surface-container":          "#f2ecf2",
        "surface-container-high":     "#ece6ec",
        "surface-container-highest":  "#e6e1e7",

        "outline":                    "#78767c",
        "outline-variant":            "#c9c5cc",

        "inverse-surface":            "#322f34",
        "inverse-on-surface":         "#f5eff5",
        "scrim":                      "#000000",
      },
      fontFamily: {
        headline: ["var(--font-noto-serif)", "Georgia", "serif"],
        body:     ["var(--font-manrope)", "system-ui", "sans-serif"],
        label:    ["var(--font-manrope)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        sm:      "0.375rem",
        md:      "0.5rem",
        lg:      "0.75rem",
        xl:      "1rem",
        "2xl":   "1.5rem",
        "3xl":   "2rem",
        full:    "9999px",
      },
    },
  },
  plugins: [],
} satisfies Config;
