// tailwind.config.ts
// Configuración de Tailwind con los tokens del Design System de NEXO

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // === BASES ===
        background: "#190d2d",
        surface: "#190d2d",
        "surface-dim": "#190d2d",
        "surface-bright": "#403355",
        "surface-container-lowest": "#130727",
        "surface-container-low": "#211535",
        "surface-container": "#25193a",
        "surface-container-high": "#302445",
        "surface-container-highest": "#3b2f50",
        "surface-variant": "#3b2f50",

        // === MARCA ===
        primary: "#edb1ff",
        "primary-container": "#d15aff",
        "primary-fixed": "#f9d8ff",
        "primary-fixed-dim": "#edb1ff",
        "on-primary": "#53006f",
        "on-primary-container": "#480062",
        "on-primary-fixed": "#320045",
        "on-primary-fixed-variant": "#76009d",
        "inverse-primary": "#9a06cb",

        // === SECUNDARIOS ===
        secondary: "#d2bcfa",
        "secondary-container": "#4f3d72",
        "secondary-fixed": "#ebddff",
        "secondary-fixed-dim": "#d2bcfa",
        "on-secondary": "#38265a",
        "on-secondary-container": "#c1abe8",
        "on-secondary-fixed": "#231043",
        "on-secondary-fixed-variant": "#4f3d72",

        // === TERCIARIOS ===
        tertiary: "#efc04c",
        "tertiary-container": "#b38b15",
        "tertiary-fixed": "#ffdf98",
        "tertiary-fixed-dim": "#efc04c",
        "on-tertiary": "#3f2e00",
        "on-tertiary-container": "#362700",
        "on-tertiary-fixed": "#251a00",
        "on-tertiary-fixed-variant": "#5a4300",

        // === SUPERFICIES ===
        "on-surface": "#ecdcff",
        "on-surface-variant": "#d4c1d5",
        "on-background": "#ecdcff",
        "surface-tint": "#edb1ff",
        "inverse-surface": "#ecdcff",
        "inverse-on-surface": "#372a4c",

        // === ERROR ===
        error: "#ffb4ab",
        "error-container": "#93000a",
        "on-error": "#690005",
        "on-error-container": "#ffdad6",

        // === BORDES ===
        outline: "#9c8b9e",
        "outline-variant": "#504253",

        // === MATERIAS (badges) ===
        "materia-matematica": "#3B82F6",
        "materia-historia": "#F97316",
        "materia-biologia": "#10B981",
        "materia-lengua": "#8B5CF6",
        "materia-ingles": "#EC4899",

        // === ESTADOS ===
        "status-pending": "#F59E0B",
        "status-delivered": "#10B981",
        "status-overdue": "#EF4444",
        "status-in-progress": "#3B82F6",

        // === ROLES ===
        "role-student": "#10B981",
        "role-teacher": "#3B82F6",
        "role-admin": "#8B5CF6",
      },
      borderRadius: {
        DEFAULT: "1rem",
        lg: "2rem",
        xl: "3rem",
        full: "9999px",
      },
      fontFamily: {
        headline: ["Plus Jakarta Sans", "sans-serif"],
        body: ["Inter", "sans-serif"],
        label: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
