// src/servicios/materia.ts
// Puerta del detalle de materia del estudiante hacia el servidor.
//
// Todo real, de nexo.db: el profesor, los días/horas en que se dicta, los avisos
// del docente (con reacciones y respuestas) y las tareas de la cátedra. El
// permiso lo valida el servidor por fila: solo un alumno inscripto en ese curso
// ve el detalle, reacciona y responde.

import type { Rol } from "../paginas/components/shared/roles";
import type { TareaAcademica } from "./portafolio";
import { enviar, pedir, usarDatos } from "./api";

// El set FIJO de emojis, el mismo que valida la base (CHECK de aviso_reacciones).
export const EMOJIS_REACCION = ["👍", "❤️", "🎉", "😮", "✅"] as const;
export type EmojiReaccion = (typeof EMOJIS_REACCION)[number];

export interface HorarioCatedra {
  dia: "lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "sabado";
  horaInicio: string; // "08:30"
  horaFin: string; // "10:00"
  aula: string | null;
}

export interface DetalleMateria {
  /** true si quien mira es el profesor de la cátedra (puede publicar avisos). */
  soyProfesor: boolean;
  materia: string;
  profesor: string;
  profesorAvatar: string | null;
  horarios: HorarioCatedra[];
  tareas: TareaAcademica[];
}

export function usarDetalleMateria(catedraId: string) {
  const { datos, cargando, error, recargar } = usarDatos<DetalleMateria>(
    `/api/materias/${catedraId}/detalle`,
  );
  return { detalle: datos, cargando, error, recargar };
}

// ─── Avisos con reacciones y respuestas ─────────────────

export interface RespuestaAviso {
  id: string;
  contenido: string;
  creadoEn: string;
  autor: string;
  autorRol: Rol;
  autorAvatar: string | null;
  /** true si la respuesta es mía: puedo editarla o borrarla. */
  esMia: boolean;
}

export interface AvisoMateria {
  id: string;
  titulo: string | null;
  contenido: string;
  creadoEn: string;
  editadoEn: string | null;
  autor: string;
  autorRol: Rol;
  autorAvatar: string | null;
  /** true si el aviso es mío (soy el profesor autor): puedo editarlo o borrarlo. */
  esMio: boolean;
  /** Conteo real por emoji (solo los presentes). */
  reacciones: Partial<Record<EmojiReaccion, number>>;
  /** Mi reacción, privada. null = todavía no reaccioné. */
  miReaccion: EmojiReaccion | null;
  respuestas: RespuestaAviso[];
}

export function usarAvisosMateria(catedraId: string) {
  const { datos, cargando, error, recargar } = usarDatos<{ avisos: AvisoMateria[] }>(
    `/api/materias/${catedraId}/avisos`,
  );
  return { avisos: datos?.avisos ?? null, cargando, error, recargar };
}

/** Resultado de reaccionar: el conteo fresco y mi reacción actual. */
export interface ResultadoReaccion {
  reacciones: Partial<Record<EmojiReaccion, number>>;
  miReaccion: EmojiReaccion | null;
}

/**
 * Poner/cambiar/sacar mi reacción a un aviso (única por persona y aviso). Tocar
 * el mismo emoji la quita; otro la cambia. El servidor garantiza una sola.
 */
export function reaccionarAviso(avisoId: string, emoji: EmojiReaccion) {
  return enviar<ResultadoReaccion>(
    `/api/materias/avisos/${avisoId}/reaccion`,
    "POST",
    { emoji },
  );
}

/** Responder por texto a un aviso. Devuelve la respuesta creada, para pintarla. */
export function responderAviso(avisoId: string, contenido: string) {
  return enviar<RespuestaAviso>(
    `/api/materias/avisos/${avisoId}/respuesta`,
    "POST",
    { contenido },
  );
}

// ─── Publicar / gestionar avisos (SOLO el profesor de la cátedra) ───────

/** Publicar un aviso en la cátedra. Devuelve el aviso creado, para pintarlo. */
export function publicarAviso(catedraId: string, titulo: string, contenido: string) {
  return enviar<AvisoMateria>(`/api/materias/${catedraId}/avisos`, "POST", {
    titulo,
    contenido,
  });
}

/** Editar un aviso propio (solo su autor; el servidor revalida). */
export function editarAviso(avisoId: string, titulo: string, contenido: string) {
  return enviar<{ ok: true }>(`/api/materias/avisos/${avisoId}`, "PUT", {
    titulo,
    contenido,
  });
}

/** Borrar (suave) un aviso propio. */
export function eliminarAviso(avisoId: string) {
  return enviar<{ ok: true }>(`/api/materias/avisos/${avisoId}`, "DELETE");
}

// ─── Editar / borrar mis respuestas (estudiante o profesor) ─────────────

/** Editar mi respuesta. */
export function editarRespuesta(respuestaId: string, contenido: string) {
  return enviar<{ ok: true; contenido: string }>(
    `/api/materias/respuestas/${respuestaId}`,
    "PUT",
    { contenido },
  );
}

/** Borrar (suave) mi respuesta. */
export function eliminarRespuesta(respuestaId: string) {
  return enviar<{ ok: true }>(`/api/materias/respuestas/${respuestaId}`, "DELETE");
}

// ═══════════════════════════════════════════════════════════
// VISTA DEL PROFESOR (Prompt 10): reacciones, alumnos y progreso
// ═══════════════════════════════════════════════════════════

/** Quién reaccionó a un aviso, con qué emoji (para el profesor). */
export interface ReaccionDetalle {
  emoji: EmojiReaccion;
  nombre: string;
  avatar: string | null;
  creadoEn: string;
}

export interface DetalleAviso {
  reacciones: ReaccionDetalle[];
  respuestas: RespuestaAviso[];
}

/** Detalle de un aviso (quién reaccionó + respuestas). Solo el profesor dueño. */
export function traerDetalleAviso(catedraId: string, avisoId: string) {
  return pedir<DetalleAviso>(`/api/materias/${catedraId}/avisos/${avisoId}/detalle`);
}

// ─── Alumnos de la materia ──────────────────────────────

export interface AlumnoMateria {
  id: string;
  nombre: string;
  avatar: string | null;
}

export function usarAlumnosMateria(catedraId: string) {
  const { datos, cargando, error, recargar } = usarDatos<{ alumnos: AlumnoMateria[] }>(
    `/api/materias/${catedraId}/alumnos`,
  );
  return { alumnos: datos?.alumnos ?? null, cargando, error, recargar };
}

// ─── Progreso de un alumno (SOLO profesor/dirección) ────

/** Un punto de la serie temporal de notas (de la tabla correcciones real). */
export interface PuntoProgreso {
  fecha: string; // corregido_en
  nota: number; // 1..10
  tarea: string;
}

export interface TareaEntregada {
  id: string;
  titulo: string;
  fechaLimite: string;
  entregadoEn: string;
  enTermino: boolean;
  nota: number | null;
}

export interface TareaAdeudada {
  id: string;
  titulo: string;
  fechaLimite: string;
}

export interface ProgresoAlumno {
  alumno: AlumnoMateria;
  serie: PuntoProgreso[];
  entregadas: TareaEntregada[];
  adeudadas: TareaAdeudada[];
}

/**
 * Progreso analítico de un alumno en la materia. El servidor lo entrega SOLO al
 * profesor dueño de la cátedra o a la dirección; el propio alumno recibe 403.
 */
export function usarProgresoAlumno(catedraId: string, alumnoId: string) {
  const { datos, cargando, error, recargar } = usarDatos<ProgresoAlumno>(
    `/api/materias/${catedraId}/alumnos/${alumnoId}/progreso`,
  );
  return { progreso: datos, cargando, error, recargar };
}
