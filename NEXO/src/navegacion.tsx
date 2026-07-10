// src/navegacion.tsx
// NÚCLEO DE NAVEGACIÓN — conecta todas las vistas entre sí.
// El Sidebar y los botones de cada página emiten una "ruta" (string).
// Este módulo traduce esa ruta a la página concreta que App debe renderizar.

import { createContext, useContext } from "react";
import type { Rol } from "./paginas/components/shared/Sidebar";

// ─── PÁGINAS DISPONIBLES ────────────────────────────────
export type Page =
    | "login"
    | "asistencia-ia"
    | "biblioteca"
    | "biblioteca-nacional"
    | "comunidad"
    | "debates"
    | "chat"
    | "profesor-dashboard"
    | "gestion-institucional"
    | "panel-bibliotecario"
    | "portal-centro"
    | "gestion-quejas"
    | "calendario-institucional"
    | "cursos-activos"
    | "perfiles-academicos"
    | "panel-institucional"
    | "tendencias"
    | "competencias"
    | "objetivos-dashboard"
    | "objetivos-habitos"
    | "objetivos-metas"
    | "calificaciones"
    | "aula-virtual-estudiante"
    | "aula-virtual-profesor"
    | "mis-cursos-estudiante"
    | "mis-tareas-estudiante"
    | "familia-calendario"
    | "familia-chat"
    | "familia-comunicados"
    | "mis-cursos-preceptor"
    | "diario-reflexivo-profesor"
    | "gestion-tareas-profesor";

// ─── MAPA RUTA → PÁGINA ─────────────────────────────────
// Cubre las rutas del Sidebar (todos los roles) + tabs internos + botones.
export const RUTA_TO_PAGE: Record<string, Page> = {
    // Comunidad
    "/comunidad": "comunidad",
    "/comunidad/debate": "debates",
    "/comunidad/debates": "debates",
    "/comunidad/tendencias": "tendencias",
    "/comunidad/calendario": "calendario-institucional",
    "/comunidad/reportes-auditoria": "panel-institucional",
    "/comunidad/curso": "mis-cursos-preceptor",

    // Portafolio (estudiante)
    "/portafolio": "mis-tareas-estudiante",
    "/portafolio/mis-tareas": "mis-tareas-estudiante",
    "/portafolio/mis-cursos": "mis-cursos-estudiante",
    "/portafolio/cursos": "mis-cursos-estudiante",
    "/portafolio/calificaciones": "calificaciones",

    // Portafolio docente
    "/portafolio-docente": "profesor-dashboard",
    "/portafolio-docente/aula-virtual": "aula-virtual-profesor",
    "/portafolio-docente/diario": "diario-reflexivo-profesor",
    "/portafolio/gestion": "gestion-tareas-profesor",

    // Objetivos (estudiante)
    "/objetivos": "objetivos-dashboard",
    "/objetivos/metas": "objetivos-metas",
    "/objetivos/habitos": "objetivos-habitos",
    "/objetivos/competencias": "competencias",

    // Biblioteca
    "/biblioteca/institucional": "biblioteca",
    "/biblioteca/nacional": "biblioteca-nacional",
    "/biblioteca/panel": "panel-bibliotecario",
    "/biblioteca/cola-revision": "panel-bibliotecario",

    // Chat / IA
    "/chat": "chat",
    "/asistencia-academica": "asistencia-ia",

    // Aula virtual estudiante
    "/aula-virtual": "aula-virtual-estudiante",

    // Admin académico
    "/admin/perfiles": "perfiles-academicos",
    "/admin/cursos": "cursos-activos",
    "/admin/panel": "panel-institucional",

    // Admin sistema
    "/admin/instituciones": "gestion-institucional",
    "/admin/salud": "panel-institucional",
    "/admin/actividades": "panel-institucional",

    // Centro de estudiantes
    "/centro-estudiantes": "portal-centro",
    "/centro-estudiantes/quejas": "gestion-quejas",

    // Familia
    "/comunicados": "familia-comunicados",
    "/familia/chat": "familia-chat",
    "/familia/calendario": "familia-calendario",
};

// Traduce una ruta a página. Si es dinámica (/biblioteca/articulo/123),
// prueba con el prefijo más largo que exista en el mapa.
export function rutaAPagina(ruta: string): Page | null {
    if (RUTA_TO_PAGE[ruta]) return RUTA_TO_PAGE[ruta];
    // Coincidencia por prefijo (rutas con :id u otros segmentos)
    const claves = Object.keys(RUTA_TO_PAGE).sort((a, b) => b.length - a.length);
    for (const clave of claves) {
        if (ruta.startsWith(clave + "/")) return RUTA_TO_PAGE[clave];
    }
    return null;
}

// ─── CONTEXTO ───────────────────────────────────────────
// ─── SESIÓN Y CONTROL DE ACCESO ─────────────────────────

export interface Usuario {
    nombre: string;
    rol: Rol;
    avatarUrl?: string;
    curso?: string;
    materia?: string;
}

// Credenciales demo. Clave = email institucional (en minúsculas).
export const CREDENCIALES: Record<string, { password: string; usuario: Usuario }> = {
    "estudiante@nexo.edu": {
        password: "nexo1234",
        usuario: {
            nombre: "Julieta Rossi",
            rol: "estudiante",
            curso: "4° B",
            avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Julieta",
        },
    },
    "profesor@nexo.edu": {
        password: "nexo1234",
        usuario: {
            nombre: "Prof. García",
            rol: "profesor",
            materia: "Matemática",
            avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Garcia",
        },
    },
    "admin@nexo.edu": {
        password: "nexo1234",
        usuario: {
            nombre: "Directora Romero",
            rol: "admin-academico",
            avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Romero",
        },
    },
    "preceptor@nexo.edu": {
        password: "nexo1234",
        usuario: {
            nombre: "Carlos Pereyra",
            rol: "preceptor",
            avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Pereyra",
        },
    },
    "centro@nexo.edu": {
        password: "nexo1234",
        usuario: { nombre: "Centro de Estudiantes", rol: "centro-estudiantes" },
    },
    "biblioteca@nexo.edu": {
        password: "nexo1234",
        usuario: { nombre: "Bibliotecario", rol: "bibliotecario" },
    },
    "familia@nexo.edu": {
        password: "nexo1234",
        usuario: {
            nombre: "Fam. Rossi",
            rol: "familia",
            avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Rossi",
        },
    },
    "sistema@nexo.edu": {
        password: "nexo1234",
        usuario: { nombre: "Administrador", rol: "administrador" },
    },
};

// Página de inicio (home) a la que cae cada rol tras loguearse.
export const HOME_POR_ROL: Record<Rol, string> = {
    estudiante: "/comunidad",
    profesor: "/comunidad",
    "admin-academico": "/comunidad",
    preceptor: "/comunidad",
    "centro-estudiantes": "/comunidad",
    bibliotecario: "/biblioteca/panel",
    administrador: "/admin/salud",
    familia: "/comunicados",
};

// Qué roles pueden VER cada página. Un rol ausente = acceso denegado.
export const ROLES_POR_PAGINA: Record<Exclude<Page, "login">, Rol[]> = {
    // Comunidad (compartida por los perfiles educativos)
    comunidad: ["estudiante", "profesor", "admin-academico", "preceptor", "centro-estudiantes", "bibliotecario"],
    debates: ["estudiante", "profesor", "admin-academico", "preceptor", "centro-estudiantes", "bibliotecario"],
    tendencias: ["estudiante", "profesor", "admin-academico", "preceptor", "centro-estudiantes", "bibliotecario"],
    "calendario-institucional": ["admin-academico", "preceptor", "centro-estudiantes", "familia"],

    // Estudiante
    "mis-tareas-estudiante": ["estudiante"],
    "mis-cursos-estudiante": ["estudiante"],
    calificaciones: ["estudiante"],
    "objetivos-dashboard": ["estudiante"],
    "objetivos-metas": ["estudiante"],
    "objetivos-habitos": ["estudiante"],
    competencias: ["estudiante"],
    "asistencia-ia": ["estudiante"],
    "aula-virtual-estudiante": ["estudiante"],

    // Biblioteca (lectura para varios perfiles)
    biblioteca: ["estudiante", "profesor", "admin-academico", "bibliotecario"],
    "biblioteca-nacional": ["estudiante", "profesor", "admin-academico", "bibliotecario"],

    // Chat
    chat: ["estudiante", "profesor", "preceptor", "bibliotecario", "familia"],

    // Profesor
    "profesor-dashboard": ["profesor"],
    "gestion-tareas-profesor": ["profesor"],
    "aula-virtual-profesor": ["profesor"],
    "diario-reflexivo-profesor": ["profesor"],

    // Admin académica
    "perfiles-academicos": ["admin-academico"],
    "cursos-activos": ["admin-academico"],
    "gestion-institucional": ["admin-academico", "administrador"],
    "panel-institucional": ["admin-academico", "administrador"],

    // Bibliotecario
    "panel-bibliotecario": ["bibliotecario"],

    // Centro de estudiantes
    "portal-centro": ["centro-estudiantes"],
    "gestion-quejas": ["centro-estudiantes", "admin-academico"],

    // Preceptor
    "mis-cursos-preceptor": ["preceptor"],

    // Familia
    "familia-comunicados": ["familia"],
    "familia-chat": ["familia"],
    "familia-calendario": ["familia"],
};

// ¿Puede este rol acceder a la ruta pedida?
export function puedeAcceder(rol: Rol, ruta: string): boolean {
    const pagina = rutaAPagina(ruta);
    if (!pagina || pagina === "login") return false;
    return ROLES_POR_PAGINA[pagina].includes(rol);
}

// ─── CONTEXTO ───────────────────────────────────────────
interface NavegacionValor {
    usuario: Usuario | null;
    rutaActiva: string;
    navegar: (ruta: string) => void;
    cerrarSesion: () => void;
    login: (email: string, password: string) => boolean;
}

export const NavegacionContext = createContext<NavegacionValor>({
    usuario: null,
    rutaActiva: "/comunidad",
    navegar: () => { },
    cerrarSesion: () => { },
    login: () => false,
});

export const useNavegacion = () => useContext(NavegacionContext);
