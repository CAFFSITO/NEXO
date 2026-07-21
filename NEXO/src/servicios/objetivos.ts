// src/servicios/objetivos.ts
// Puerta ÚNICA de las cuatro pantallas de Objetivos hacia el servidor.
//
// Una sola, otra vez a propósito: el Dashboard y la sección Hábitos mostraban
// listas distintas del mismo hábito (uno decía racha de 7, el otro de 8, y uno
// mostraba tres hábitos y el otro cuatro — Error 13.5). Ahora los dos piden
// `/api/objetivos` y dibujan lo mismo.
//
// La racha no viene guardada: la cuenta el servidor a partir de los días
// registrados (`habito_registros`). Ver `servidor/objetivos.js`.

import { enviar, pedir, usarDatos } from "./api";

// ─── Metas ──────────────────────────────────────────────

export interface Subtarea {
  id: string;
  titulo: string;
  orden: number;
  completada: boolean;
}

export interface Meta {
  id: string;
  titulo: string;
  categoria: string;
  materiaId: string | null;
  unidadId: string | null;
  materia: string | null;
  unidad: string | null;
  /** Fecha ISO completa, con año. */
  venceEl: string;
  estado: "en-curso" | "completada";
  completadaEn: string | null;
  subtareasTotal: number;
  subtareasHechas: number;
  /** Cada subtarea con su nombre y su estado, no un número (Error 2.D.6). */
  subtareas: Subtarea[];
}

/**
 * El progreso de una meta es la proporción de subtareas hechas, y nada más.
 *
 * Antes el progreso venía escrito al lado de "3 de 5", dos números sin relación
 * que podían decir cosas distintas. Y marcar la meta como completada saltaba el
 * contador a "5 de 5" sin que nadie hiciera esas subtareas (Error 2.D.15). Acá
 * el progreso no se puede falsificar: se cuenta.
 */
export function progresoDeMeta(meta: Meta): number {
  if (meta.subtareasTotal === 0) return meta.estado === "completada" ? 100 : 0;
  return Math.round((meta.subtareasHechas / meta.subtareasTotal) * 100);
}

// ─── Hábitos ────────────────────────────────────────────

export interface DiaDeHabito {
  fecha: string;
  cumplido: boolean;
}

export interface Habito {
  id: string;
  nombre: string;
  frecuencia: "diario" | "semanal";
  /** Días seguidos, contados de los registros. No es un número guardado. */
  rachaDias: number;
  cumplidoHoy: boolean;
  /** Los últimos 10 días, del más viejo al más nuevo. */
  historial: DiaDeHabito[];
  /** Cuántas veces se registró en los últimos 7 días (Error 2.D.16). */
  registrosUltimaSemana: number;
}

// ─── Competencias ───────────────────────────────────────

export type NivelCompetencia = "iniciado" | "en-desarrollo" | "avanzado" | "dominado";

export interface EvidenciaCompetencia {
  id: string;
  titulo: string;
  descripcion: string;
}

export interface Competencia {
  id: string;
  nombre: string;
  /** De qué competencia raíz cuelga. null = es una raíz (Error 2.D.12). */
  padre: string | null;
  nivel: NivelCompetencia;
  actualizadoEn: string;
  /** Las evidencias que respaldan el avance, con su título. */
  evidencias: EvidenciaCompetencia[];
}

export interface DatosObjetivos {
  metas: Meta[];
  habitos: Habito[];
  competencias: Competencia[];
  /** Hoy según el servidor, en ISO. */
  hoy: string;
}

export function usarObjetivos() {
  const { datos, cargando, error, recargar } = usarDatos<DatosObjetivos>("/api/objetivos");
  return { datos, cargando, error, recargar };
}

// ═══════════════════════════════════════════════════════════
// ESCRITURA (Etapa 5, secciones 14.8 y 14.9)
// ═══════════════════════════════════════════════════════════

// ─── Materias y unidades para el formulario de meta (Error 2.D.8) ──

export interface UnidadMateria {
  id: string;
  numero: number;
  titulo: string;
}

export interface MateriaConUnidades {
  id: string;
  nombre: string;
  unidades: UnidadMateria[];
}

export function traerMaterias() {
  return pedir<{ materias: MateriaConUnidades[] }>("/api/objetivos/materias");
}

// ─── Metas ──

export interface DatosNuevaMeta {
  titulo: string;
  categoria: string;
  materiaId: string | null;
  unidadId: string | null;
  venceEl: string; // ISO con año
  subtareas: string[];
}

export function crearMeta(datos: DatosNuevaMeta) {
  return enviar<{ id: string }>("/api/objetivos/metas", "POST", {
    titulo: datos.titulo,
    categoria: datos.categoria,
    materiaId: datos.materiaId ? Number(datos.materiaId) : null,
    unidadId: datos.unidadId ? Number(datos.unidadId) : null,
    venceEl: datos.venceEl,
    subtareas: datos.subtareas,
  });
}

export function editarMeta(
  id: string,
  datos: Omit<DatosNuevaMeta, "subtareas">
) {
  return enviar("/api/objetivos/metas/" + id, "PUT", {
    titulo: datos.titulo,
    categoria: datos.categoria,
    materiaId: datos.materiaId ? Number(datos.materiaId) : null,
    unidadId: datos.unidadId ? Number(datos.unidadId) : null,
    venceEl: datos.venceEl,
  });
}

export function archivarMeta(id: string) {
  return enviar("/api/objetivos/metas/" + id, "DELETE");
}

/**
 * Marca / desmarca una meta como completada (Error 2.D.15). Si quedan subtareas
 * sin hacer, el servidor responde `requiereConfirmacion`; volver a llamar con
 * `forzar` las completa de verdad (nunca con un número inventado).
 */
export interface ResultadoEstadoMeta {
  ok?: boolean;
  estado?: "en-curso" | "completada";
  error?: string;
  requiereConfirmacion?: boolean;
  pendientes?: number;
}

export function cambiarEstadoMeta(id: string, completada: boolean, forzar = false) {
  return enviar<ResultadoEstadoMeta>("/api/objetivos/metas/" + id + "/estado", "PUT", {
    completada,
    forzar,
  });
}

// ─── Subtareas (Errores 2.D.6 y 2.D.7) ──

export function agregarSubtarea(metaId: string, titulo: string) {
  return enviar<{ id: string }>("/api/objetivos/metas/" + metaId + "/subtareas", "POST", { titulo });
}

export function editarSubtarea(id: string, cambios: { titulo?: string; completada?: boolean }) {
  return enviar("/api/objetivos/subtareas/" + id, "PUT", cambios);
}

export function eliminarSubtarea(id: string) {
  return enviar("/api/objetivos/subtareas/" + id, "DELETE");
}

// ─── Hábitos (Error 2.D.3 y 14.9) ──

export function crearHabito(nombre: string, frecuencia: "diario" | "semanal") {
  return enviar<{ id: string }>("/api/objetivos/habitos", "POST", { nombre, frecuencia });
}

export function editarHabito(id: string, nombre: string, frecuencia: "diario" | "semanal") {
  return enviar("/api/objetivos/habitos/" + id, "PUT", { nombre, frecuencia });
}

export function archivarHabito(id: string) {
  return enviar("/api/objetivos/habitos/" + id, "DELETE");
}

/** Marca / desmarca el hábito HOY. La racha se recalcula sola en el servidor. */
export function registrarHabito(id: string, cumplido: boolean) {
  return enviar("/api/objetivos/habitos/" + id + "/registro", "PUT", { cumplido });
}

// ─── Competencias (Error 2.D.12) ──

/**
 * Cambia el nivel del estudiante de la sesión en una competencia. El servidor
 * hace un upsert sobre `competencia_avances` (uno por competencia y estudiante),
 * así que un estudiante solo mueve SU propio nivel.
 */
export function cambiarNivelCompetencia(competenciaId: string, nivel: NivelCompetencia) {
  return enviar("/api/objetivos/competencias/" + competenciaId + "/nivel", "PUT", { nivel });
}

/** Borra una evidencia. El servidor valida que sea del estudiante de la sesión. */
export function eliminarEvidencia(evidenciaId: string) {
  return enviar("/api/objetivos/evidencias/" + evidenciaId, "DELETE");
}

// ─── Resumen semanal + próximo hito (Errores 2.D.10 y 2.D.11) ──

export interface ResumenObjetivos {
  semana: {
    subtareasCompletadas: number;
    subtareasSemanaPrevia: number;
    metasTerminadas: number;
    ritmoPorDia: number;
    mensaje: string;
  };
  proximoHito: { id: string; titulo: string; venceEl: string } | null;
  hoy: string;
}

export function usarResumen() {
  const { datos, cargando, error, recargar } =
    usarDatos<ResumenObjetivos>("/api/objetivos/resumen");
  return { resumen: datos, cargando, error, recargar };
}
