// Presentación del módulo Mis Tareas (Portafolio de Aprendizaje — Estudiante).
//
// Los datos ya no están acá: vienen de `servicios/portafolio.ts`. Este archivo
// es solo cómo se dibuja lo que llega.
//
// El calculador de fechas tampoco está acá. Tenía uno propio que parseaba
// "15 ABR" y le pegaba el año en curso, porque las fechas de ejemplo no tenían
// año (Error 2.C.9). Ahora las fechas llegan completas y la cuenta la hace
// `servicios/fechas.ts`, que es el único calculador de la aplicación: tener uno
// por pantalla es lo que hacía que la misma fecha se leyera distinto en Mis
// Tareas y en Mis Metas (Errores 13.6 y 2.D.14).

import { diasHasta } from "../../../servicios/fechas";
import type { TareaAcademica } from "../../../servicios/portafolio";

export type { TareaAcademica, TareaPersonal } from "../../../servicios/portafolio";

// El estado que se MUESTRA. La base solo sabe si está entregada o no; "vencida"
// depende del día en que se mire, así que se calcula acá.
export type EstadoTarea = "pendiente" | "entregada" | "vencida";

export type FiltroTarea = "todas" | EstadoTarea;

export const FILTROS: { valor: FiltroTarea; label: string }[] = [
  { valor: "todas", label: "Todas" },
  { valor: "pendiente", label: "Pendientes" },
  { valor: "entregada", label: "Entregadas" },
  { valor: "vencida", label: "Vencidas" },
];

// Metadatos de presentación por estado (badge del design system).
export const ESTADO_META: Record<EstadoTarea, { label: string; badge: string }> = {
  pendiente: { label: "PENDIENTE", badge: "bg-yellow-500/10 text-yellow-500" },
  entregada: { label: "ENTREGADA ✓", badge: "bg-green-500/10 text-green-400" },
  vencida: { label: "VENCIDA", badge: "bg-red-500/10 text-red-500" },
};

// Color del pill de materia (colores del design system NEXO).
export const MATERIA_COLORES: Record<string, string> = {
  Matemática: "bg-blue-500/10 text-blue-400",
  Historia: "bg-orange-500/10 text-orange-400",
  Biología: "bg-green-500/10 text-green-400",
  Lengua: "bg-violet-500/10 text-violet-400",
  Inglés: "bg-pink-500/10 text-pink-400",
  Física: "bg-cyan-500/10 text-cyan-400",
};

// Fallback para materias sin color asignado.
export const MATERIA_COLOR_DEFAULT = "bg-slate-500/10 text-slate-400";

export function colorMateria(materia: string): string {
  return MATERIA_COLORES[materia] ?? MATERIA_COLOR_DEFAULT;
}

/**
 * El estado real de una tarea el día que se la mira: una tarea sin entregar
 * cuya fecha ya pasó está vencida. Una entregada no vence nunca, aunque se
 * haya entregado tarde: ya está hecha.
 */
export function estadoEfectivo(tarea: TareaAcademica): EstadoTarea {
  if (tarea.estado === "entregada") return "entregada";
  const dias = diasHasta(tarea.fechaLimite);
  if (dias !== null && dias < 0) return "vencida";
  return "pendiente";
}
