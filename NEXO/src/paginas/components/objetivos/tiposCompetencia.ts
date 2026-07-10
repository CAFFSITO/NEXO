// Tipos compartidos del módulo de Competencias (Objetivos Personales — Estudiante)

export type NivelCompetencia = "inicial" | "en-desarrollo" | "avanzado" | "experto";

// Orden fijo de la escala de desarrollo (Inicial → Experto)
export const NIVELES: { id: NivelCompetencia; label: string }[] = [
  { id: "inicial", label: "INICIAL" },
  { id: "en-desarrollo", label: "EN DESARROLLO" },
  { id: "avanzado", label: "AVANZADO" },
  { id: "experto", label: "EXPERTO" },
];

export interface Evidencia {
  id: string;
  titulo: string;
  icono: string; // Material Symbol
}

// Paleta por competencia (clases estáticas — Tailwind no admite interpolación dinámica)
export type ColorCompetencia = "purple" | "blue" | "amber" | "teal";

export interface PaletaColor {
  iconoBg: string;
  iconoText: string;
  descText: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const PALETAS: Record<ColorCompetencia, PaletaColor> = {
  purple: {
    iconoBg: "bg-purple-500/20",
    iconoText: "text-purple-400",
    descText: "text-purple-300",
    badgeBg: "bg-[#C548F5]/10",
    badgeText: "text-[#C548F5]",
    badgeBorder: "border-[#C548F5]/20",
  },
  blue: {
    iconoBg: "bg-blue-500/20",
    iconoText: "text-blue-400",
    descText: "text-blue-300",
    badgeBg: "bg-blue-500/10",
    badgeText: "text-blue-400",
    badgeBorder: "border-blue-500/20",
  },
  amber: {
    iconoBg: "bg-amber-500/20",
    iconoText: "text-amber-400",
    descText: "text-amber-300",
    badgeBg: "bg-amber-500/10",
    badgeText: "text-amber-400",
    badgeBorder: "border-amber-500/20",
  },
  teal: {
    iconoBg: "bg-teal-500/20",
    iconoText: "text-teal-400",
    descText: "text-teal-300",
    badgeBg: "bg-teal-500/10",
    badgeText: "text-teal-400",
    badgeBorder: "border-teal-500/20",
  },
};

export interface Competencia {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string; // Material Symbol
  color: ColorCompetencia;
  nivel: NivelCompetencia;
  evidencias: Evidencia[];
}

// Etiqueta legible del nivel para el badge de estado
export const LABEL_NIVEL: Record<NivelCompetencia, string> = {
  inicial: "Inicial",
  "en-desarrollo": "En desarrollo",
  avanzado: "Avanzado",
  experto: "Experto",
};
