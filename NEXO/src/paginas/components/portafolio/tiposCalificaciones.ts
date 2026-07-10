// Tipos y lógica del módulo de Calificaciones (Portafolio de Aprendizaje — Estudiante)

// Acento visual del ícono de la materia (tokens del design system)
export type AcentoMateria = "primary" | "error" | "tertiary" | "secondary";

// Estado derivado de la nota, nunca se guarda a mano
export type EstadoCalificacion = "aprobado" | "desaprobado" | "pendiente";

export interface Calificacion {
  id: string;
  materia: string;
  detalle?: string; // Ej: "Células procariotas"
  icono: string; // Material Symbol
  acento: AcentoMateria;
  nota: number | null; // null = todavía sin corregir
  actualizado: string; // Ej: "Hace 2 días"
  devolucion: string; // Feedback del profesor
}

// Nota mínima de aprobación (escala 1-10, criterio argentino)
export const NOTA_APROBACION = 6;

// La única fuente de verdad del estado es la nota
export function estadoDeNota(nota: number | null): EstadoCalificacion {
  if (nota === null) return "pendiente";
  return nota >= NOTA_APROBACION ? "aprobado" : "desaprobado";
}

// Promedio general sobre las materias ya corregidas (ignora pendientes)
export function calcularPromedio(calificaciones: Calificacion[]): number | null {
  const corregidas = calificaciones.filter((c) => c.nota !== null);
  if (corregidas.length === 0) return null;
  const suma = corregidas.reduce((acc, c) => acc + (c.nota as number), 0);
  return Math.round((suma / corregidas.length) * 10) / 10;
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
