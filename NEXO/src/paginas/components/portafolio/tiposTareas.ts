// Tipos y lógica del módulo Mis Tareas (Portafolio de Aprendizaje — Estudiante)

// Estado de una tarea académica. "vencida" se deriva de la fecha, no se guarda a mano.
export type EstadoTarea = "pendiente" | "en-progreso" | "entregada" | "vencida";

// Tarea asignada por un profesor.
export interface TareaAcademica {
  id: string;
  materia: string; // Ej: "Matemática"
  titulo: string;
  profesor: string;
  fechaLimite: string; // Formato "15 ABR"
  estado: EstadoTarea;
  metodoEstudio?: string; // Solo si el profesor lo sugirió
  nota?: number; // Solo cuando estado === "entregada" y fue calificada (escala 1-10)
}

// Tarea personal creada por el propio estudiante (recordatorio, no evaluable).
export interface TareaPersonal {
  id: string;
  titulo: string;
  completada: boolean;
}

// Filtros de la barra de herramientas.
export type FiltroTarea = "todas" | "pendiente" | "en-progreso" | "entregada" | "vencida";

export const FILTROS: { valor: FiltroTarea; label: string }[] = [
  { valor: "todas", label: "Todas" },
  { valor: "pendiente", label: "Pendientes" },
  { valor: "en-progreso", label: "En progreso" },
  { valor: "entregada", label: "Entregadas" },
  { valor: "vencida", label: "Vencidas" },
];

// Metadatos de presentación por estado (badge del design system).
export const ESTADO_META: Record<EstadoTarea, { label: string; badge: string }> = {
  pendiente: { label: "PENDIENTE", badge: "bg-yellow-500/10 text-yellow-500" },
  "en-progreso": { label: "EN PROGRESO", badge: "bg-blue-500/10 text-blue-400" },
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

// Abreviaturas de meses en español → índice (0-11).
const MESES: Record<string, number> = {
  ENE: 0, FEB: 1, MAR: 2, ABR: 3, MAY: 4, JUN: 5,
  JUL: 6, AGO: 7, SEP: 8, OCT: 9, NOV: 10, DIC: 11,
};

// Días restantes hasta el vencimiento (texto "15 ABR"). null si no se puede parsear.
// Negativo = ya venció.
export function diasHasta(fechaLimite: string): number | null {
  const partes = fechaLimite.trim().toUpperCase().split(/\s+/);
  if (partes.length < 2) return null;
  const dia = Number(partes[0]);
  const mes = MESES[partes[1]];
  if (Number.isNaN(dia) || mes === undefined) return null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const objetivo = new Date(hoy.getFullYear(), mes, dia);
  return Math.round((objetivo.getTime() - hoy.getTime()) / 86_400_000);
}

// Texto legible de vencimiento según los días restantes.
export function textoVencimiento(dias: number | null): string {
  if (dias === null) return "Sin fecha";
  if (dias < 0) return `Vencida hace ${Math.abs(dias)} día${dias === -1 ? "" : "s"}`;
  if (dias === 0) return "Vence hoy";
  return `Vence en ${dias} día${dias === 1 ? "" : "s"}`;
}

// Color del texto de fecha según proximidad (verde >7, amarillo 3-7, rojo <3).
export function colorVencimiento(dias: number | null): string {
  if (dias === null) return "text-slate-400";
  if (dias < 3) return "text-red-500";
  if (dias <= 7) return "text-orange-400";
  return "text-green-500";
}

// Estado real de una tarea considerando la fecha: una pendiente/en-progreso
// cuya fecha ya pasó se muestra como vencida.
export function estadoEfectivo(tarea: TareaAcademica): EstadoTarea {
  if (tarea.estado === "entregada") return "entregada";
  const dias = diasHasta(tarea.fechaLimite);
  if (dias !== null && dias < 0) return "vencida";
  return tarea.estado;
}
