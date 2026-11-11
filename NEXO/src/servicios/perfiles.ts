// src/servicios/perfiles.ts
// Puerta de las pantallas de Gestión de Perfiles y de Cursos hacia el servidor.

import { useDatos, pedir } from "./api";
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

/**
 * Un curso asignado en el alta. Para un profesor lleva la materia que da en ese
 * curso: en la base, un profesor se une a un curso a través de una cátedra.
 */
export interface Asignacion {
  cursoId: string;
  materiaId?: string;
}

export interface DatosAlta {
  nombre: string;
  rol: Rol;
  email: string;
  /** Perfil diseñado por el Maestro (null = el predeterminado del rol). */
  perfilClave?: string | null;
  /** Opcional: el curso del estudiante, los del preceptor o los del profesor. */
  asignaciones?: Asignacion[];
}

/** Lo que necesita el formulario de alta, tal como lo cuenta el servidor. */
export interface OpcionesAlta {
  /** La terminación del correo de la escuela ("sinvueltas.org"); null = no hay. */
  dominio: string | null;
  /** Con su preceptor de hoy (un curso tiene uno solo). */
  /** detalle = "Mañana · Informática" (null si el curso no tiene esos datos). */
  cursos: {
    id: string;
    nombre: string;
    detalle: string | null;
    /** Para mostrarlos agrupados por turno, ciclo y especialidad. */
    anio: number;
    turno: DatoDeCurso | null;
    especialidad: DatoDeCurso | null;
    preceptor: string | null;
  }[];
  materias: { id: string; nombre: string }[];
  /** Quién da hoy cada materia en cada curso. */
  catedras: { cursoId: string; materiaId: string; profesor: string }[];
}

export function useOpcionesAlta() {
  const { datos, cargando } = useDatos<OpcionesAlta>("/api/perfiles/opciones");
  return { opciones: datos, cargando };
}

export interface DatosEdicion {
  nombre: string;
  rol: Rol;
  email: string;
  estado: "activo" | "inactivo";
  perfilClave?: string | null;
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

/** Borra para siempre un perfil que está en la papelera y libera su correo. */
export function borrarDefinitivamente(id: string): Promise<ResultadoPerfil> {
  return mutar(`${API_PERFILES}/${id}`, "DELETE");
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
  /** El perfil que el Maestro diseñó y la dirección le asignó (null = el de su rol). */
  perfilClave?: string | null;
  /** Solo profesores: las materias que da ("Matemática · 1° año") y en qué cursos. */
  materias?: MateriaDelProfesor[];
}

export interface MateriaDelProfesor {
  id: string;
  nombre: string;
  /** Vacío = la tiene elegida en Materias pero todavía no la da en ningún curso. */
  cursos: string[];
}

export function usePerfiles() {
  const { datos, cargando, error, recargar } =
    useDatos<{ perfiles: Perfil[]; diasPapelera: number | null }>("/api/perfiles");
  // diasPapelera: el plazo de la papelera en ESTA escuela (genoma del Maestro);
  // null = la papelera no se purga sola.
  return { perfiles: datos?.perfiles ?? null, diasPapelera: datos?.diasPapelera ?? null, cargando, error, recargar };
}

// ─── Cursos ─────────────────────────────────────────────

/** Turno o especialidad de un curso: su id y su nombre (vienen del servidor). */
export interface DatoDeCurso {
  id: string;
  nombre: string;
}

export interface Curso {
  id: string;
  anio: number;
  division: string;
  /** null = curso cargado antes de que existiera el dato. */
  turno: DatoDeCurso | null;
  especialidad: DatoDeCurso | null;
  /** null = sin preceptor asignado (la tarjeta lo muestra como alerta). */
  preceptor: string | null;
  estudiantes: number;
  materias: number;
  /** Cupo de estudiantes (null = sin límite) y aula. */
  cupoMinimo: number | null;
  cupoMaximo: number | null;
  aula: string | null;
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

export function useCursos() {
  const { datos, cargando, error, recargar } = useDatos<DatosCursos>("/api/cursos");
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
  curso: { id: string; anio: number; division: string; turno: DatoDeCurso | null; especialidad: DatoDeCurso | null; cupoMinimo: number | null; cupoMaximo: number | null; aula: string | null };
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
