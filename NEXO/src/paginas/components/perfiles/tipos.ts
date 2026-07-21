// src/paginas/components/perfiles/tipos.ts
// Cómo se DIBUJA cada rol en la Gestión de Perfiles: su color y sus etiquetas.
//
// Los datos (quién es cada quien) ya no están acá: vienen del servidor por
// `servicios/perfiles.ts`. Este archivo es solo presentación.
//
// El tipo de rol tampoco está acá: es `Rol` de `shared/roles.ts`, el mismo que
// usa el menú lateral y el mismo que guarda la base. Hasta la Etapa 2 este
// archivo tenía su propia lista de CINCO roles, que llamaba "admin" a lo que la
// base llama "admin-academico" y directamente no conocía a Familia ni a
// Bibliotecario: la dirección no podía ni ver ni crear esos perfiles
// (Errores 6.B.3 y 6.B.4). Una segunda lista de roles es una segunda verdad
// sobre quién existe en NEXO, y solo puede estar desactualizada.

import { ROL_LABELS, type Rol } from "../shared/roles";

export type { Rol };

// Los tres valores que acepta `usuarios.estado`. "papelera" es baja reversible.
export type EstadoPerfil = "activo" | "inactivo" | "papelera";

// El perfil que muestran estas pantallas es el que arma el servidor.
export type { Perfil } from "../../../servicios/perfiles";

// Datos que se completan al crear o editar. La "asignación" NO está: no es un
// texto que se escriba a mano sino algo que se deriva de la base (el curso de un
// estudiante, la cátedra de un profesor). Antes se tipeaba libre y no se
// guardaba en ningún lado: un dato inventado más (sección 1.3). El correo es la
// cuenta con la que la persona entra, así que ahora es obligatorio (Error 6.B.3).
export interface PerfilEditable {
  nombre: string;
  rol: Rol;
  email: string;
  // En el alta el estado siempre es 'activo'; en la edición se pasa entre activo
  // e inactivo. La papelera tiene su propio camino y no se toca desde el modal.
  estado: "activo" | "inactivo";
}

// ─── Metadatos de presentación por rol ──────────────────

interface MetaRol {
  label: string;
  /** Clases del badge (fondo/texto/borde). */
  badge: string;
  /** Cómo se llama la "asignación" para este rol. */
  labelAsignacion: string;
  placeholderAsignacion: string;
}

export const META_ROL: Record<Rol, MetaRol> = {
  estudiante: {
    label: ROL_LABELS.estudiante,
    badge: "bg-green-500/10 text-green-400 border border-green-500/20",
    labelAsignacion: "Curso",
    placeholderAsignacion: "Ej: 4° B",
  },
  profesor: {
    label: ROL_LABELS.profesor,
    badge: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    labelAsignacion: "Cátedra",
    placeholderAsignacion: "Ej: Cátedra de Matemática",
  },
  preceptor: {
    label: ROL_LABELS.preceptor,
    badge: "bg-slate-500/20 text-slate-400 border border-white/10",
    labelAsignacion: "Cursos a cargo",
    placeholderAsignacion: "Ej: 4° A, 4° B",
  },
  "admin-academico": {
    label: ROL_LABELS["admin-academico"],
    badge: "bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/40",
    labelAsignacion: "Área",
    placeholderAsignacion: "Ej: Dirección Académica",
  },
  "centro-estudiantes": {
    label: ROL_LABELS["centro-estudiantes"],
    badge: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
    labelAsignacion: "Representación",
    placeholderAsignacion: "Ej: Comisión Directiva",
  },
  bibliotecario: {
    label: ROL_LABELS.bibliotecario,
    badge: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    labelAsignacion: "Área",
    placeholderAsignacion: "Ej: Biblioteca",
  },
  familia: {
    label: ROL_LABELS.familia,
    badge: "bg-teal-500/15 text-teal-300 border border-teal-500/30",
    labelAsignacion: "Estudiante a cargo",
    placeholderAsignacion: "Ej: Julieta Rossi",
  },
  administrador: {
    label: ROL_LABELS.administrador,
    badge: "bg-red-500/15 text-red-300 border border-red-500/30",
    labelAsignacion: "Área",
    placeholderAsignacion: "Ej: Plataforma",
  },
};

// Los roles que la dirección administra dentro de SU colegio. El administrador
// de plataforma no está: no pertenece a ninguna institución y no es la
// dirección quien lo da de alta (sección 1.1). Por eso esta lista y `Rol` no
// son la misma cosa, aunque se parezcan.
export const ROLES: Rol[] = [
  "estudiante",
  "profesor",
  "preceptor",
  "admin-academico",
  "centro-estudiantes",
  "bibliotecario",
  "familia",
];
