// Tipos compartidos del módulo de Competencias (Objetivos Personales — Estudiante)
//
// La escala es la de la base (`competencia_avances.nivel`): iniciado →
// en-desarrollo → avanzado → dominado. La pantalla usaba "inicial" y "experto",
// dos valores que la base rechaza con un CHECK: eran una escala paralela que
// nunca podría haberse guardado.

export type { NivelCompetencia } from "../../../servicios/objetivos";
import type { NivelCompetencia } from "../../../servicios/objetivos";

// Orden fijo de la escala de desarrollo (Iniciado → Dominado)
export const NIVELES: { id: NivelCompetencia; label: string }[] = [
  { id: "iniciado", label: "INICIADO" },
  { id: "en-desarrollo", label: "EN DESARROLLO" },
  { id: "avanzado", label: "AVANZADO" },
  { id: "dominado", label: "DOMINADO" },
];

export interface Evidencia {
  id: string;
  titulo: string;
  icono?: string; // Material Symbol; si falta, la tarjeta usa uno por defecto
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

/** Lo que dibuja la tarjeta: una competencia de la base + su presentación. */
export interface Competencia {
  id: string;
  nombre: string;
  descripcion?: string; // la base no guarda descripción de la competencia
  icono: string; // Material Symbol
  color: ColorCompetencia;
  nivel: NivelCompetencia;
  evidencias: Evidencia[];
}

// Etiqueta legible del nivel para el badge de estado
export const LABEL_NIVEL: Record<NivelCompetencia, string> = {
  iniciado: "Iniciado",
  "en-desarrollo": "En desarrollo",
  avanzado: "Avanzado",
  dominado: "Dominado",
};

// Un color por competencia raíz, elegido de forma estable por nombre: la misma
// competencia se ve siempre igual, sin guardar el color en la base (un color no
// es un dato del colegio).
const COLORES: ColorCompetencia[] = ["purple", "blue", "amber", "teal"];

export function colorDeCompetencia(nombre: string): ColorCompetencia {
  let suma = 0;
  for (const letra of nombre) suma += letra.codePointAt(0) ?? 0;
  return COLORES[suma % COLORES.length];
}
