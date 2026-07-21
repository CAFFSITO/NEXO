// src/servicios/portafolio.ts
// Puerta ÚNICA de Mis Tareas y Calificaciones hacia el servidor.
//
// Es una sola y es a propósito: las dos pantallas piden `/api/portafolio` y
// muestran las mismas filas con distinta forma. Ahí muere el Error 13.1 —
// Mis Tareas decía que Biología estaba 9.5 y Calificaciones decía 8.0 sobre el
// mismo trabajo, porque cada pantalla traía su propia lista escrita a mano.
//
// Si mañana alguien quiere agregarle una nota a una pantalla, tiene que pasar
// por la tabla `correcciones`, que solo admite una por entrega. No hay dónde
// volver a contradecirse.

import { usarDatos } from "./api";

export interface TareaAcademica {
  id: string;
  materia: string;
  titulo: string;
  consigna: string;
  profesor: string;
  /** Fecha ISO completa, con año: "2026-07-10" (Error 2.C.9). */
  fechaLimite: string;
  /** Lo que dice la base: entregada o no. "vencida" se calcula con la fecha. */
  estado: "pendiente" | "entregada";
  metodoEstudio?: string;
  tipoAsignacion: "individual" | "grupal";
  entregadoEn: string | null;
  comentarioEntrega: string | null;
  /** De `correcciones`. null = sin corregir todavía, que no es un cero. */
  nota: number | null;
  devolucion: string;
  corregidoEn: string | null;
}

export interface TareaPersonal {
  id: string;
  titulo: string;
  descripcion: string;
  fechaLimite: string | null;
  completada: boolean;
}

export interface DatosPortafolio {
  tareas: TareaAcademica[];
  personales: TareaPersonal[];
}

export function usarPortafolio() {
  const { datos, cargando, error, recargar } =
    usarDatos<DatosPortafolio>("/api/portafolio");
  return { datos, cargando, error, recargar };
}

// ─── Reglas compartidas por las dos pantallas ───────────

/** Nota mínima de aprobación (escala 1-10, criterio argentino). */
export const NOTA_APROBACION = 6;

export type EstadoCalificacion = "aprobado" | "desaprobado" | "pendiente";

/** La única fuente de verdad del estado de una nota es la nota. */
export function estadoDeNota(nota: number | null): EstadoCalificacion {
  if (nota === null) return "pendiente";
  return nota >= NOTA_APROBACION ? "aprobado" : "desaprobado";
}

/**
 * Promedio sobre los trabajos ya corregidos (los pendientes no bajan el
 * promedio: todavía no son una nota).
 */
export function calcularPromedio(tareas: TareaAcademica[]): number | null {
  const corregidas = tareas.filter((t) => t.nota !== null);
  if (corregidas.length === 0) return null;
  const suma = corregidas.reduce((acc, t) => acc + (t.nota as number), 0);
  return Math.round((suma / corregidas.length) * 10) / 10;
}
