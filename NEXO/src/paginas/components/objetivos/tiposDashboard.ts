// Tipos del Dashboard de Objetivos Personales (Estudiante)

import type { NivelCompetencia } from "./tiposCompetencia";

// ─── Metas activas ──────────────────────────────────────

export interface Meta {
  id: string;
  materia: string; // ej: "HISTORIA", "IDIOMAS"
  titulo: string;
  vence: string; // texto legible, ej: "15 ABR"
  progreso: number; // 0-100
  subtareasHechas: number;
  subtareasTotal: number;
  iconoDetalle: string; // Material Symbol del pie de tarjeta
}

// Paleta de badge por materia (clases estáticas — Tailwind no interpola)
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
};

export const PALETA_MATERIA_DEFAULT: PaletaMateria = {
  badgeBg: "bg-slate-500/20",
  badgeText: "text-slate-300",
};

// ─── Vista "Mis Metas" / Gestión de Metas (/objetivos/metas) ─

export type EstadoMeta = "en-curso" | "completada";

// Meta con la info completa que muestra la vista de gestión.
export interface MetaGestion {
  id: string;
  materia: string; // ej: "HISTORIA", "IDIOMAS"
  titulo: string;
  vence: string; // texto legible, ej: "15 ABR"
  estado: EstadoMeta;
  subtareasHechas: number;
  subtareasTotal: number;
  unidadSubtarea: string; // ej: "subtareas", "unidades"
  colaboradores: number; // 0 = sin colaboradores
  recursos: number; // adjuntos vinculados
  finalizadoEl?: string; // solo si estado === "completada"
}

// Progreso derivado (0-100) a partir de las subtareas.
export function progresoMeta(meta: MetaGestion): number {
  if (meta.subtareasTotal === 0) return 0;
  return Math.round((meta.subtareasHechas / meta.subtareasTotal) * 100);
}

// Color del texto "VENCE EL ..." según proximidad y estado.
// Recibe los días restantes; null = sin cálculo (usa neutro).
export function colorUrgencia(diasRestantes: number | null): string {
  if (diasRestantes === null) return "text-slate-400";
  if (diasRestantes < 3) return "text-red-400";
  if (diasRestantes <= 7) return "text-yellow-400";
  return "text-emerald-400";
}

// ─── Hábitos / Rachas ───────────────────────────────────

export interface Habito {
  id: string;
  nombre: string;
  rachaDias: number;
  cumplidoHoy: boolean;
  diasVisibles: number; // cantidad de puntos a mostrar
}

// ─── Vista "Mis Hábitos de Estudio" (/objetivos/habitos) ─

export type FrecuenciaHabito = "diario" | "semanal" | "dias-especificos";

export const FRECUENCIA_LABELS: Record<FrecuenciaHabito, string> = {
  diario: "Todos los días",
  semanal: "Una vez por semana",
  "dias-especificos": "Días específicos",
};

// Hábito con historial detallado para la vista dedicada de hábitos.
// historial: últimos N días — true = cumplido, false = incumplido.
// El último elemento del array representa "hoy".
export interface HabitoDetallado {
  id: string;
  nombre: string;
  frecuencia: FrecuenciaHabito;
  rachaDias: number;
  cumplidoHoy: boolean;
  historial: boolean[];
}

// ─── Resumen de competencias ────────────────────────────

export interface CompetenciaResumen {
  id: string;
  nombre: string;
  nivel: NivelCompetencia;
}

// Cantidad de segmentos llenos según el nivel (escala de 4)
export const SEGMENTOS_POR_NIVEL: Record<NivelCompetencia, number> = {
  inicial: 1,
  "en-desarrollo": 2,
  avanzado: 3,
  experto: 4,
};
