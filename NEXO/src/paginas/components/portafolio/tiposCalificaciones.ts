// Presentación del módulo de Calificaciones (Portafolio — Estudiante).
//
// Acá NO hay datos ni reglas: las notas vienen de `servicios/portafolio.ts`,
// la MISMA puerta que usa Mis Tareas, y las reglas (qué es aprobar, cómo se
// promedia) viven ahí también. Hasta la Etapa 2 este archivo tenía su propia
// definición de aprobación y su propio promedio, y la página traía adentro
// cuatro materias inventadas: por eso Biología figuraba 8.0 acá y 9.5 en Mis
// Tareas sobre el mismo informe (Error 13.1).

import type { EstadoCalificacion } from "../../../servicios/portafolio";

export type { EstadoCalificacion } from "../../../servicios/portafolio";
export {
  NOTA_APROBACION,
  estadoDeNota,
  calcularPromedio,
} from "../../../servicios/portafolio";

/** Acento visual del ícono de la materia (tokens del design system). */
export type AcentoMateria = "primary" | "error" | "tertiary" | "secondary";

/**
 * Lo que la tarjeta necesita para dibujarse. No es una fila de la base: es una
 * tarea del portafolio traducida a lo que muestra esta pantalla (ver
 * `CalificacionesPage`).
 */
export interface Calificacion {
  id: string;
  materia: string;
  detalle?: string;
  icono: string;
  acento: AcentoMateria;
  /** null = todavía sin corregir. */
  nota: number | null;
  actualizado: string;
  devolucion: string;
}

// Metadatos de presentación por estado
export const ESTADO_META: Record<
  EstadoCalificacion,
  { label: string; badge: string }
> = {
  aprobado: {
    label: "Aprobado",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  desaprobado: {
    label: "Desaprobado",
    badge: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  },
  pendiente: {
    label: "Pendiente",
    badge: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  },
};

// Acento del ícono de la materia
export const ACENTO_META: Record<AcentoMateria, string> = {
  primary: "bg-primary/10 text-primary",
  error: "bg-error/10 text-error",
  tertiary: "bg-tertiary/10 text-tertiary",
  secondary: "bg-secondary/10 text-secondary",
};

// ─── Cómo se ve cada materia ────────────────────────────
// El ícono y el color de una materia son decoración, no un dato: no tiene
// sentido guardarlos en la base. Se eligen acá por nombre de materia, igual
// que los colores de Mis Tareas (`colorMateria`).

const ESTILO_MATERIA: Record<string, { icono: string; acento: AcentoMateria }> = {
  Matemática: { icono: "functions", acento: "primary" },
  Historia: { icono: "history_edu", acento: "error" },
  Biología: { icono: "biotech", acento: "tertiary" },
  Lengua: { icono: "menu_book", acento: "secondary" },
  Inglés: { icono: "translate", acento: "primary" },
  Física: { icono: "science", acento: "tertiary" },
};

const ESTILO_DEFAULT = { icono: "school", acento: "secondary" as AcentoMateria };

export function estiloMateria(materia: string) {
  return ESTILO_MATERIA[materia] ?? ESTILO_DEFAULT;
}
