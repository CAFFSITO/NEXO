// tailwind.config.ts
// Configuración de Tailwind con los tokens del Design System de NEXO

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["selector", '[data-modo="oscuro"]'],
  theme: {
    extend: {
      colors: {
        // === INSTANCIA (perfil Maestro) ===
        // Cada escuela tiene su propia paleta en el genoma. Los colores de abajo
        // ya no son hex fijos: son variables CSS que define index.css (con la
        // paleta original como valor por defecto) y que servicios/tema.ts
        // reemplaza al entrar a una escuela con otra paleta.
        acento: "var(--nexo-acento)",
        "acento-vivo": "var(--nexo-acento-vivo)",
        "acento-oscuro": "var(--nexo-acento-oscuro)",
        fondo: "var(--nexo-fondo-pagina)",
        lienzo: "var(--nexo-lienzo)",

        // === BASES ===
        background: "var(--nexo-fondo)",
        surface: "var(--nexo-fondo)",
        "surface-dim": "var(--nexo-fondo)",
        "surface-bright": "var(--nexo-sup-brillante)",
        "surface-container-lowest": "var(--nexo-sup-0)",
        "surface-container-low": "var(--nexo-sup-1)",
        "surface-container": "var(--nexo-sup-2)",
        "surface-container-high": "var(--nexo-sup-3)",
        "surface-container-highest": "var(--nexo-sup-4)",
        "surface-variant": "var(--nexo-sup-4)",

        // === MARCA ===
        primary: "var(--nexo-primario)",
        "primary-container": "var(--nexo-acento-vivo)",
        "primary-fixed": "var(--nexo-primario-claro)",
        "primary-fixed-dim": "var(--nexo-primario)",
        "on-primary": "var(--nexo-sobre-primario)",
        "on-primary-container": "var(--nexo-sobre-primario-fuerte)",
        "on-primary-fixed": "#320045",
        "on-primary-fixed-variant": "#76009d",
        "inverse-primary": "var(--nexo-acento-oscuro)",

        // === SECUNDARIOS ===
        secondary: "var(--nexo-secundario)",
        "secondary-container": "var(--nexo-secundario-contenedor)",
        "secondary-fixed": "#ebddff",
        "secondary-fixed-dim": "var(--nexo-secundario)",
        "on-secondary": "var(--nexo-sobre-secundario)",
        "on-secondary-container": "var(--nexo-sobre-secundario)",
        "on-secondary-fixed": "#231043",
        "on-secondary-fixed-variant": "#4f3d72",

        // === TERCIARIOS ===
        tertiary: "var(--nexo-terciario)",
        "tertiary-container": "var(--nexo-terciario-oscuro)",
        "tertiary-fixed": "#ffdf98",
        "tertiary-fixed-dim": "var(--nexo-terciario)",
        "on-tertiary": "#3f2e00",
        "on-tertiary-container": "#362700",
        "on-tertiary-fixed": "#251a00",
        "on-tertiary-fixed-variant": "#5a4300",

        // === SUPERFICIES ===
        "on-surface": "var(--nexo-texto)",
        "on-surface-variant": "var(--nexo-texto-suave)",
        "on-background": "var(--nexo-texto)",
        "surface-tint": "var(--nexo-primario)",
        "inverse-surface": "#ecdcff",
        "inverse-on-surface": "#372a4c",

        // === ERROR ===
        error: "var(--nexo-error)",
        "error-container": "var(--nexo-error-contenedor)",
        "on-error": "#ffffff",
        "on-error-container": "var(--nexo-sobre-error-contenedor)",

        // === NEUTROS DEL TEMA ===
        // "white" es la tinta del tema (ver estilos/paleta-modos.css); "blanco" es
        // blanco de verdad en los dos modos (texto sobre fotos, botones de color).
        blanco: "#ffffff",
        tinta: "var(--nexo-tinta)",
        linea: "var(--nexo-linea)",

        // === BORDES ===
        outline: "var(--nexo-borde)",
        "outline-variant": "var(--nexo-borde-suave)",

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
        // El radio también es del genoma (--nexo-radio, 12px por defecto).
        DEFAULT: "calc(var(--nexo-radio) * 0.6667)",
        lg: "var(--nexo-radio)",
        xl: "calc(var(--nexo-radio) * 1.3334)",
        full: "9999px",
      },
      fontFamily: {
        headline: ["Inter", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        label: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
