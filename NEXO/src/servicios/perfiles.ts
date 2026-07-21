// src/servicios/perfiles.ts
// Puerta de las pantallas de Gestión de Perfiles y de Cursos hacia el servidor.

import { usarDatos, pedir } from "./api";
import type { Rol } from "../paginas/components/shared/roles";

// ─── Escritura (Etapa 3) ────────────────────────────────
// Alta, edición y papelera de perfiles. Ninguna pantalla decide nada: el
// servidor valida el rol, la institución y la unicidad del correo. Acá solo se
// pregunta y se trae la respuesta con sus palabras.

const API_PERFILES = "/api/perfiles";
const SIN_COCINA = "No se pudo contactar al servidor de NEXO.";

/** Resultado de una operación de escritura, con lo que hay que mostrarle a la persona. */
export interface ResultadoPerfil {
  ok: boolean;
  mensaje?: string;
  error?: string;
  /** Solo en el alta: la contraseña inicial, que viaja una única vez. */
  contrasenaInicial?: string;
  email?: string;
}

async function mutar(url: string, metodo: string, cuerpo?: unknown): Promise<ResultadoPerfil> {
  let respuesta: Response;
  try {
    respuesta = await fetch(url, {
      method: metodo,
      headers: cuerpo ? { "Content-Type": "application/json" } : undefined,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    return { ok: false, error: SIN_COCINA };
  }
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    return { ok: false, error: datos.error ?? "No se pudo completar la operación." };
  }
  return {
    ok: true,
    mensaje: datos.mensaje,
    contrasenaInicial: datos.contrasenaInicial,
    email: datos.email,
  };
}

export interface DatosAlta {
  nombre: string;
  rol: Rol;
  email: string;
}

export interface DatosEdicion {
  nombre: string;
  rol: Rol;
  email: string;
  estado: "activo" | "inactivo";
}

/** Alta real: crea la cuenta y devuelve la contraseña inicial (Errores 6.B.3, 6.B.4). */
export function crearPerfil(datos: DatosAlta): Promise<ResultadoPerfil> {
  return mutar(API_PERFILES, "POST", datos);
}

export function editarPerfil(id: string, datos: DatosEdicion): Promise<ResultadoPerfil> {
  return mutar(`${API_PERFILES}/${id}`, "PATCH", datos);
}

/** Baja suave: manda a la papelera (restaurable 7 días, sección 14.17). */
export function enviarAPapelera(id: string): Promise<ResultadoPerfil> {
  return mutar(`${API_PERFILES}/${id}/papelera`, "POST");
}

export function restaurarPerfilEnServidor(id: string): Promise<ResultadoPerfil> {
  return mutar(`${API_PERFILES}/${id}/restaurar`, "POST");
}

// ─── Perfiles ───────────────────────────────────────────

// activo / inactivo son estados operativos; "papelera" es baja reversible
// (restaurable 7 días, sección 14.17). Son los tres valores que acepta la
// columna `estado` de `usuarios`: la pantalla no puede inventar un cuarto.
export type EstadoPerfil = "activo" | "inactivo" | "papelera";

export interface Perfil {
  id: string;
  nombre: string;
  /** El correo. Es lo que identifica de verdad a una persona, ver perfiles.js. */
  identificador: string;
  email: string;
  // El rol es el de la base y son los ocho de NEXO, no una lista aparte de
  // cinco que se había quedado vieja (le faltaban Familia y Bibliotecario, y
  // llamaba "admin" a lo que la base llama "admin-academico").
  rol: Rol;
  /** Qué hace en el colegio: su curso, su cátedra, sus cursos a cargo. */
  asignacion: string;
  estado: EstadoPerfil;
  avatarUrl?: string;
  eliminadoEn?: string | null;
}

export function usarPerfiles() {
  const { datos, cargando, error, recargar } =
    usarDatos<{ perfiles: Perfil[] }>("/api/perfiles");
  return { perfiles: datos?.perfiles ?? null, cargando, error, recargar };
}

// ─── Cursos ─────────────────────────────────────────────

export interface Curso {
  id: string;
  anio: number;
  division: string;
  /** null = sin preceptor asignado (la tarjeta lo muestra como alerta). */
  preceptor: string | null;
  estudiantes: number;
  materias: number;
  activo: boolean;
}

export interface EstadoCiclo {
  inscripciones: number;
  docentes: number;
  materias: number;
  /** Qué parte de las tareas del colegio ya pasó su fecha límite (0..100). */
  avanceCronograma: number;
}

export interface ActividadSemanal {
  correcciones: number;
  entregas: number;
  eventos: number;
}

export interface DatosCursos {
  cursos: Curso[];
  ciclo: EstadoCiclo;
  semana: ActividadSemanal;
}

export function usarCursos() {
  const { datos, cargando, error, recargar } = usarDatos<DatosCursos>("/api/cursos");
  return { datos, cargando, error, recargar };
}

// ─── Detalle de un curso (solo lectura, Error 6.C.2) ────────────────
// Lo que un curso tiene de verdad, para la vista de detalle de la dirección.
// Todo sale de nexo.db; el servidor valida rol dirección y misma institución.

export interface CatedraDetalle {
  materia: string;
  profesor: string;
}

export interface AlumnoDetalle {
  nombre: string;
  email: string;
}

export interface TareaDetalle {
  titulo: string;
  materia: string;
  fechaLimite: string;
  cantidadEntregas: number;
}

export interface DetalleCurso {
  curso: { id: string; anio: number; division: string };
  /** null = el curso no tiene preceptor asignado. */
  preceptor: string | null;
  catedras: CatedraDetalle[];
  alumnos: AlumnoDetalle[];
  tareas: TareaDetalle[];
}

/** Trae el detalle de un curso. Se pide recién al abrir "Ver detalle". */
export function obtenerDetalleCurso(id: string): Promise<DetalleCurso> {
  return pedir<DetalleCurso>(`/api/cursos/${id}/detalle`);
}
