// src/paginas/components/perfiles/tipos.ts
// Tipos del módulo Gestión de Perfiles Académicos (acceso: Admin Académica).
// La vista lista todos los usuarios de la institución y permite altas, ediciones
// y bajas (soft delete → papelera 7 días, según NEXO_PERFIL_ARCHITECTURE).

export type RolPerfil =
  | "estudiante"
  | "profesor"
  | "preceptor"
  | "admin"
  | "centro-estudiantes";

// activo / inactivo son estados operativos; "papelera" es soft delete (restaurable 7 días).
export type EstadoPerfil = "activo" | "inactivo" | "papelera";

export interface Perfil {
  id: string;
  nombre: string;
  identificador: string; // ID #48291, Matrícula DOC-331, etc.
  rol: RolPerfil;
  asignacion: string; // "4°B — Secundario", "Cátedra de Matemática", "Dirección Académica"
  estado: EstadoPerfil;
  avatarUrl?: string;
  email?: string;
  eliminadoEn?: string | null; // ISO date cuando pasó a papelera
}

// Datos que el usuario completa al crear/editar (sin campos derivados/del sistema).
export type PerfilEditable = Pick<
  Perfil,
  "nombre" | "rol" | "asignacion" | "email" | "estado"
>;

// ─── Metadatos de presentación por rol ──────────────────────────────

interface MetaRol {
  label: string;
  // Clases Tailwind del badge (fondo/texto/borde) — siguen el HTML original de Stitch.
  badge: string;
  // Etiqueta del campo "asignación" que cambia según el rol.
  labelAsignacion: string;
  placeholderAsignacion: string;
  // Prefijo del identificador autogenerado al crear.
  prefijoId: string;
}

export const META_ROL: Record<RolPerfil, MetaRol> = {
  estudiante: {
    label: "Estudiante",
    badge: "bg-green-500/10 text-green-400 border border-green-500/20",
    labelAsignacion: "Curso",
    placeholderAsignacion: "Ej: 4°B — Secundario",
    prefijoId: "#",
  },
  profesor: {
    label: "Profesor",
    badge: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    labelAsignacion: "Cátedra",
    placeholderAsignacion: "Ej: Cátedra de Matemática",
    prefijoId: "DOC-",
  },
  preceptor: {
    label: "Preceptor",
    badge: "bg-slate-500/20 text-slate-400 border border-white/10",
    labelAsignacion: "Curso a cargo",
    placeholderAsignacion: "Ej: 4°B — Nivel Medio",
    prefijoId: "AUX-",
  },
  admin: {
    label: "Admin",
    badge: "bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/40",
    labelAsignacion: "Área",
    placeholderAsignacion: "Ej: Dirección Académica",
    prefijoId: "ADMIN-",
  },
  "centro-estudiantes": {
    label: "Centro Est.",
    badge: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
    labelAsignacion: "Representación",
    placeholderAsignacion: "Ej: Comisión Directiva",
    prefijoId: "CE-",
  },
};

export const ROLES: RolPerfil[] = [
  "estudiante",
  "profesor",
  "preceptor",
  "admin",
  "centro-estudiantes",
];
