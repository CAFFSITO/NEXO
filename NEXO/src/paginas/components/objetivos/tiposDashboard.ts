// Presentación del módulo Objetivos Personales (Estudiante).
//
// Los datos vienen de `servicios/objetivos.ts`. Acá solo están los colores y
// las etiquetas.
//
// Lo importante que cambió: antes este archivo definía DOS tipos de hábito
// —`Habito` (con `rachaDias` y `diasVisibles`) para el Dashboard y
// `HabitoDetallado` (con `historial`) para la sección Hábitos— y cada pantalla
// llenaba el suyo a mano. Esa era la forma estructural del Error 13.5: dos
// tipos distintos para la misma cosa garantizan que tarde o temprano digan
// cosas distintas, y decían (racha 7 contra racha 8, tres hábitos contra
// cuatro). Ahora hay un solo tipo `Habito`, es el del servidor, y las dos
// pantallas dibujan ese.

import type { NivelCompetencia } from "./tiposCompetencia";

export type { Habito, Meta, Subtarea, Competencia } from "../../../servicios/objetivos";
export { progresoDeMeta } from "../../../servicios/objetivos";

// ─── Paleta por materia/categoría ───────────────────────
// (clases estáticas — Tailwind no interpola)

export interface PaletaMateria {
  badgeBg: string;
  badgeText: string;
}

export const PALETAS_MATERIA: Record<string, PaletaMateria> = {
  HISTORIA: { badgeBg: "bg-orange-500/20", badgeText: "text-orange-400" },
  IDIOMAS: { badgeBg: "bg-violet-500/20", badgeText: "text-violet-400" },
  MATEMÁTICA: { badgeBg: "bg-blue-500/20", badgeText: "text-blue-400" },
  BIOLOGÍA: { badgeBg: "bg-green-500/20", badgeText: "text-green-400" },
  LENGUA: { badgeBg: "bg-purple-500/20", badgeText: "text-purple-400" },
  INGLÉS: { badgeBg: "bg-pink-500/20", badgeText: "text-pink-400" },
  ACADÉMICA: { badgeBg: "bg-blue-500/20", badgeText: "text-blue-400" },
  PERSONAL: { badgeBg: "bg-teal-500/20", badgeText: "text-teal-300" },
};

export const PALETA_MATERIA_DEFAULT: PaletaMateria = {
  badgeBg: "bg-slate-500/20",
  badgeText: "text-slate-300",
};

/**
 * El badge de una meta: su materia si tiene, y si no su categoría. Una meta
 * puede no pertenecer a ninguna materia (el B2 de Francés no es una materia del
 * colegio) y eso es válido: el esquema deja `materia_id` en NULL.
 */
export function badgeDeMeta(materia: string | null, categoria: string): string {
  return (materia ?? categoria).toUpperCase();
}

export function paletaDeMateria(etiqueta: string): PaletaMateria {
  return PALETAS_MATERIA[etiqueta] ?? PALETA_MATERIA_DEFAULT;
}

// ─── Hábitos ────────────────────────────────────────────

export const FRECUENCIA_LABELS: Record<string, string> = {
  diario: "Todos los días",
  semanal: "Una vez por semana",
};

// ─── Competencias ───────────────────────────────────────

// Cantidad de segmentos llenos según el nivel (escala de 4). Las claves son los
// cuatro niveles que acepta la base (`competencia_avances.nivel`): antes eran
// "inicial" y "experto", que la base rechaza — la escala de la pantalla y la de
// la base no eran la misma.
export const SEGMENTOS_POR_NIVEL: Record<NivelCompetencia, number> = {
  iniciado: 1,
  "en-desarrollo": 2,
  avanzado: 3,
  dominado: 4,
};
