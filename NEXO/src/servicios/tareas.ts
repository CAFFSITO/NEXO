// src/servicios/tareas.ts
// Puerta ÚNICA de la aplicación hacia el circuito de tareas (Etapa 4, 14.7).
//
// Acá se ESCRIBE (crear, entregar, anular, corregir); la LECTURA de Mis Tareas y
// Calificaciones sigue saliendo de `portafolio.ts` (/api/portafolio), que es la
// única fuente de las notas (Error 13.1). Este archivo no decide nada: valida y
// decide el servidor (tareas.js), que es el único con la tabla de permisos.

import { enviar, pedir } from "./api";
import type { ArchivoSubido } from "./archivos";

// ─── Profesor: crear y gestionar ────────────────────────

/** Una materia+curso que el profesor da, para elegir al crear una tarea (3.C.1). */
export interface Catedra {
  id: string;
  materia: string;
  curso: string;
  alumnos: number;
}

/** Datos de una tarea creada por el profesor, con el conteo real de entregas. */
export interface TareaDocente {
  id: string;
  titulo: string;
  consigna: string;
  materia: string;
  curso: string;
  catedraId: string;
  fechaLimite: string;
  metodoEstudio: string;
  tipoAsignacion: "individual" | "grupal";
  alDia: number;
  tarde: number;
  pendiente: number;
}

/** Lo que el profesor completa en el formulario de creación/edición. */
export interface DatosNuevaTarea {
  catedraId: string;
  titulo: string;
  consigna: string;
  fechaLimite: string;
  metodoEstudio: string;
  tipoAsignacion: "individual" | "grupal";
  adjuntos: string[]; // ids de archivos ya subidos
}

export function traerCatedras() {
  return pedir<{ catedras: Catedra[] }>("/api/tareas/catedras");
}

export function traerTareasDocente() {
  return pedir<{ tareas: TareaDocente[] }>("/api/tareas/docente");
}

export function crearTarea(datos: DatosNuevaTarea) {
  return enviar<{ id: string }>("/api/tareas", "POST", datos);
}

export function editarTarea(id: string, datos: Omit<DatosNuevaTarea, "adjuntos" | "catedraId">) {
  return enviar("/api/tareas/" + id, "PUT", datos);
}

export function eliminarTarea(id: string) {
  return enviar("/api/tareas/" + id, "DELETE");
}

// ─── Profesor: panel de corrección ──────────────────────

export type EstadoEntregaAlumno = "entregado" | "tarde" | "no-entrego";

export interface FilaCorreccion {
  estudianteId: string;
  nombre: string;
  avatarUrl: string | null;
  estado: EstadoEntregaAlumno;
  entregaId: string | null;
  comentario: string;
  entregadoEn: string | null;
  archivos: ArchivoSubido[];
  correccion: { nota: number; devolucion: string; corregidoEn: string } | null;
}

export interface PanelCorreccion {
  tarea: {
    id: string;
    titulo: string;
    consigna: string;
    materia: string;
    curso: string;
    fechaLimite: string;
  };
  alumnos: FilaCorreccion[];
}

export function traerPanel(tareaId: string) {
  return pedir<PanelCorreccion>("/api/tareas/" + tareaId + "/panel");
}

export function corregirEntrega(entregaId: string, nota: number, devolucion: string) {
  return enviar("/api/entregas/" + entregaId + "/correccion", "POST", { nota, devolucion });
}

// ─── Estudiante: detalle y entrega ──────────────────────

export interface DetalleTarea {
  tarea: {
    id: string;
    titulo: string;
    consigna: string;
    materia: string;
    profesor: string;
    fechaLimite: string;
    metodoEstudio: string;
    tipoAsignacion: "individual" | "grupal";
    adjuntos: ArchivoSubido[];
  };
  entrega: {
    id: string;
    comentario: string;
    entregadoEn: string;
    archivos: ArchivoSubido[];
    /** Si ya está corregida no se puede anular (14.7 paso 3). */
    corregida: boolean;
    nota: number | null;
    devolucion: string;
    corregidoEn: string | null;
  } | null;
}

export function traerDetalle(tareaId: string) {
  return pedir<DetalleTarea>("/api/tareas/" + tareaId);
}

export function entregarTarea(tareaId: string, comentario: string, archivos: string[]) {
  return enviar<{ id: string }>("/api/tareas/" + tareaId + "/entrega", "POST", {
    comentario,
    archivos,
  });
}

export function anularEntrega(tareaId: string) {
  return enviar("/api/tareas/" + tareaId + "/entrega", "DELETE");
}

// ─── Estudiante: tareas personales (recordatorios propios) ──

export function crearPersonal(titulo: string, descripcion: string, fechaLimite: string | null) {
  return enviar<{ id: string }>("/api/tareas-personales", "POST", {
    titulo,
    descripcion,
    fechaLimite: fechaLimite ?? "",
  });
}

export function editarPersonal(
  id: string,
  titulo: string,
  descripcion: string,
  fechaLimite: string | null
) {
  return enviar("/api/tareas-personales/" + id, "PUT", {
    titulo,
    descripcion,
    fechaLimite: fechaLimite ?? "",
  });
}

export function completarPersonal(id: string, completada: boolean) {
  return enviar("/api/tareas-personales/" + id + "/completada", "PUT", { completada });
}

export function eliminarPersonal(id: string) {
  return enviar("/api/tareas-personales/" + id, "DELETE");
}
