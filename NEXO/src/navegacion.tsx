// src/navegacion.tsx
// NÚCLEO DE NAVEGACIÓN — conecta todas las vistas entre sí.
// El Sidebar y los botones de cada página emiten una "ruta" (string).
// Este módulo traduce esa ruta a la página concreta que App debe renderizar.

import { createContext, useContext } from "react";
import type { Rol } from "./paginas/components/shared/Sidebar";

// ─── PÁGINAS DISPONIBLES ────────────────────────────────
export type Page =
    | "login"
    | "en-construccion"
    | "configuracion-cuenta"
    | "recuperar-contrasena"
    | "ayuda-de-acceso"
    | "asistencia-ia"
    | "biblioteca"
    | "biblioteca-nacional"
    | "comunidad"
    | "debates"
    | "chat"
    | "notificaciones"
    | "profesor-dashboard"
    | "panel-bibliotecario"
    | "portal-centro"
    | "gestion-quejas"
    | "calendario-institucional"
    | "cursos-activos"
    | "perfiles-academicos"
    | "panel-institucional"
    | "reportes"
    | "gestion-instituciones"
    | "salud-sistema"
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
    | "familia-comunicados"
    | "mis-cursos-preceptor"
    | "diario-reflexivo-profesor"
    | "gestion-tareas-profesor"
    | "enviar-queja";

// ─── SECCIONES DEL MENÚ LATERAL ─────────────────────────
// Una "sección" es un ítem del menú lateral: lo que el usuario percibe como
// "dónde estoy". Varias direcciones pertenecen a la MISMA sección (Mis Tareas,
// Mis Cursos y Calificaciones son, todas, "estoy en Portafolio"), y direcciones
// parecidas pueden ser secciones DISTINTAS (`/portafolio/mis-tareas` es el
// Portafolio del estudiante, `/portafolio/gestion` es la Gestión de Tareas del
// profesor).
//
// Por qué existe esto: hasta ahora el menú adivinaba la sección activa mirando
// cómo EMPIEZA la dirección, y eso no puede funcionar (Error 12.7). Con el
// prefijo, estar en `/portafolio-docente/aula-virtual` encendía "Aula Virtual"
// y "Mi Portafolio" a la vez (porque la segunda es prefijo de la primera), y
// estar en `/portafolio/mis-cursos` no encendía "Portafolio" (porque el ítem
// apunta a `/portafolio/mis-tareas`, que no es prefijo). La pertenencia a una
// sección no se puede deducir del texto de la dirección: hay que declararla.
// Acá se declara una sola vez, al lado de la ruta, y el menú la lee.
export type Seccion =
    | "configuracion"
    | "comunidad"
    | "calendario"
    | "reportes"
    | "curso-preceptor"
    | "portafolio-estudiante"
    | "portafolio-docente"
    | "aula-virtual-docente"
    | "gestion-tareas"
    | "objetivos"
    | "biblioteca"
    | "biblioteca-panel"
    | "cola-revision"
    | "chat"
    | "asistencia-ia"
    | "admin-perfiles"
    | "admin-cursos"
    | "admin-panel"
    | "admin-instituciones"
    | "admin-salud"
    | "admin-actividades"
    | "centro-portal"
    | "centro-quejas"
    | "enviar-queja"
    | "familia-comunicados"
    | "familia-calendario"
    | "notificaciones";

interface Destino {
    /** Qué pantalla dibuja esta dirección. */
    pagina: Exclude<Page, "login">;
    /** Qué ítem del menú lateral se ilumina mientras se está acá. */
    seccion: Seccion;
}

// ─── MAPA RUTA → PÁGINA + SECCIÓN ───────────────────────
// La única lista de direcciones de NEXO. Cubre las rutas del Sidebar (todos los
// roles) + tabs internos + botones. Agregar una pantalla = agregar una línea acá.
export const MAPA_RUTAS = {
    // Configuración de la cuenta propia (Error 2.A.1). No cuelga de ningún
    // módulo: la tienen los ocho roles y se llega igual desde cualquier parte.
    "/configuracion": { pagina: "configuracion-cuenta", seccion: "configuracion" },

    // Comunidad
    "/comunidad": { pagina: "comunidad", seccion: "comunidad" },
    "/comunidad/debate": { pagina: "debates", seccion: "comunidad" },
    "/comunidad/debates": { pagina: "debates", seccion: "comunidad" },
    "/comunidad/tendencias": { pagina: "tendencias", seccion: "comunidad" },
    "/comunidad/calendario": { pagina: "calendario-institucional", seccion: "calendario" },
    // Reportes de la dirección (Etapa 8, 14.18). Antes esta ruta reusaba el panel
    // del administrador y estaba rota (Error 6.F.1); ahora dibuja la herramienta
    // de reportes real, exclusiva de la dirección (Error 6.F.2).
    "/reportes": { pagina: "reportes", seccion: "reportes" },
    "/comunidad/curso": { pagina: "mis-cursos-preceptor", seccion: "curso-preceptor" },

    // Portafolio (estudiante). Las tres sub-pantallas son UNA sola sección de
    // menú: el ítem "Portafolio" queda encendido en las tres.
    "/portafolio": { pagina: "mis-tareas-estudiante", seccion: "portafolio-estudiante" },
    "/portafolio/mis-tareas": { pagina: "mis-tareas-estudiante", seccion: "portafolio-estudiante" },
    "/portafolio/mis-cursos": { pagina: "mis-cursos-estudiante", seccion: "portafolio-estudiante" },
    "/portafolio/cursos": { pagina: "mis-cursos-estudiante", seccion: "portafolio-estudiante" },
    "/portafolio/calificaciones": { pagina: "calificaciones", seccion: "portafolio-estudiante" },
    // El aula virtual del estudiante se entra desde Mis Cursos (Error 2.C.1):
    // mientras está en clase sigue estando, para el menú, en su Portafolio.
    "/aula-virtual": { pagina: "aula-virtual-estudiante", seccion: "portafolio-estudiante" },

    // Portafolio docente
    "/portafolio-docente": { pagina: "profesor-dashboard", seccion: "portafolio-docente" },
    "/portafolio-docente/diario": { pagina: "diario-reflexivo-profesor", seccion: "portafolio-docente" },
    // El profesor SÍ tiene un ítem propio de Aula Virtual: es su propia sección,
    // aunque su dirección cuelgue de /portafolio-docente.
    "/portafolio-docente/aula-virtual": { pagina: "aula-virtual-profesor", seccion: "aula-virtual-docente" },
    // Cuelga de /portafolio pero NO es el Portafolio del estudiante.
    "/portafolio/gestion": { pagina: "gestion-tareas-profesor", seccion: "gestion-tareas" },

    // Objetivos (estudiante)
    "/objetivos": { pagina: "objetivos-dashboard", seccion: "objetivos" },
    "/objetivos/metas": { pagina: "objetivos-metas", seccion: "objetivos" },
    "/objetivos/habitos": { pagina: "objetivos-habitos", seccion: "objetivos" },
    "/objetivos/competencias": { pagina: "competencias", seccion: "objetivos" },

    // Biblioteca. Panel y Cola de Revisión dibujan la misma pantalla, pero son
    // dos ítems distintos del menú del bibliotecario: dos secciones distintas.
    "/biblioteca/institucional": { pagina: "biblioteca", seccion: "biblioteca" },
    "/biblioteca/nacional": { pagina: "biblioteca-nacional", seccion: "biblioteca" },
    "/biblioteca/panel": { pagina: "panel-bibliotecario", seccion: "biblioteca-panel" },
    "/biblioteca/cola-revision": { pagina: "panel-bibliotecario", seccion: "cola-revision" },

    // Chat / IA
    "/chat": { pagina: "chat", seccion: "chat" },
    "/asistencia-academica": { pagina: "asistencia-ia", seccion: "asistencia-ia" },

    // Buzón de quejas anónimas (Error 8.B.1, sección 14.14). Es el canal del
    // estudiante para enviar; el servidor no guarda quién la escribió. Leerlas es
    // otra pantalla (el Centro de Estudiantes / la dirección, /centro-estudiantes/quejas).
    "/quejas/enviar": { pagina: "enviar-queja", seccion: "enviar-queja" },

    // Admin académico
    "/admin/perfiles": { pagina: "perfiles-academicos", seccion: "admin-perfiles" },
    "/admin/cursos": { pagina: "cursos-activos", seccion: "admin-cursos" },
    "/admin/panel": { pagina: "panel-institucional", seccion: "admin-panel" },

    // Administrador de PLATAFORMA ("nosotros", sección 5). Sus pantallas son
    // propias y NO las de la dirección de un colegio: antes /admin/instituciones
    // abría la gestión interna de una escuela (cursos, materias, perfiles) y
    // /admin/salud abría el panel de la dirección, con las métricas de un colegio
    // puntual. Eso era la mezcla de roles del Error 5.A.9. Ahora cada una apunta
    // a la pantalla que le corresponde: instituciones en general y salud + logs.
    "/admin/instituciones": { pagina: "gestion-instituciones", seccion: "admin-instituciones" },
    "/admin/salud": { pagina: "salud-sistema", seccion: "admin-salud" },

    // Centro de estudiantes
    "/centro-estudiantes": { pagina: "portal-centro", seccion: "centro-portal" },
    "/centro-estudiantes/quejas": { pagina: "gestion-quejas", seccion: "centro-quejas" },

    // Familia. El chat de la familia es el chat COMPARTIDO real ("/chat"): se
    // eliminó la pantalla paralela con datos de ejemplo (Error 10.C.2). El
    // calendario sí tiene su página propia diferenciada (Error 10.B.5).
    "/comunicados": { pagina: "familia-comunicados", seccion: "familia-comunicados" },
    "/familia/calendario": { pagina: "familia-calendario", seccion: "familia-calendario" },

    // Notificaciones (Etapa 6, sección 14.15). Antes apuntaba a "en-construccion"
    // (el ítem del bibliotecario no abría nada, Error 9.D.1); ahora es la pantalla
    // real, común a todos los perfiles y accesible desde la campana del menú.
    "/notificaciones": { pagina: "notificaciones", seccion: "notificaciones" },
} satisfies Record<string, Destino>;

// ─── DIRECCIONES PÚBLICAS ───────────────────────────────
// Las de arriba exigen sesión. Estas dos NO pueden exigirla: son justamente las
// pantallas para quien no logra entrar (Error 12.5). Pedir sesión para recuperar
// la contraseña sería pedirle la llave a quien la perdió.
//
// Por eso van en un mapa aparte y no en MAPA_RUTAS: la diferencia entre "pide
// sesión" y "no pide sesión" es demasiado importante para dejarla escondida en
// una propiedad. Acá una dirección está en una lista o en la otra, y App las
// dibuja distinto. No tienen sección de menú porque no hay menú sin sesión.
export const MAPA_RUTAS_PUBLICAS = {
    "/recuperar-contrasena": { pagina: "recuperar-contrasena" },
    "/ayuda-de-acceso": { pagina: "ayuda-de-acceso" },
} satisfies Record<string, { pagina: Exclude<Page, "login"> }>;

/** Direcciones de adentro de NEXO: exigen sesión y viven en el menú lateral. */
export type RutaPrivada = keyof typeof MAPA_RUTAS;

/** Direcciones que se ven sin sesión (recuperar contraseña, ayuda de acceso). */
export type RutaPublica = keyof typeof MAPA_RUTAS_PUBLICAS;

/**
 * Las direcciones que existen en NEXO, como tipo. Tipar un botón con `Ruta`
 * hace que apuntar a una pantalla inexistente sea un error al compilar, no un
 * clic muerto en producción (Error 12.8).
 */
export type Ruta = RutaPrivada | RutaPublica;

/**
 * En qué sección del menú está esta dirección. `null` = la dirección no
 * pertenece a ninguna sección (por ejemplo el login, o una dirección
 * inexistente): ahí el menú no enciende nada, que es lo correcto.
 *
 * Recibe `string` y no `Ruta` porque la dirección puede venir de la barra del
 * navegador, escrita por una persona: puede ser cualquier cosa.
 */
export function seccionDeRuta(ruta: string): Seccion | null {
    const rutas: Record<string, Destino> = MAPA_RUTAS;
    return rutas[ruta]?.seccion ?? null;
}

// ─── CONTEXTO ───────────────────────────────────────────
// ─── SESIÓN Y CONTROL DE ACCESO ─────────────────────────

// Quién es el usuario logueado. Lo arma el SERVIDOR a partir de la tabla
// `usuarios` y lo entrega al iniciar sesión (ver servicios/sesion.ts).
//
// Acá NO hay ninguna lista de cuentas: hasta la Etapa 1, este archivo tenía
// ocho usuarios de juguete con la contraseña escrita al lado, y todo eso se
// descargaba al navegador, donde cualquiera podía leerlo (Error 12.4). Las
// personas reales viven en la base y las contraseñas se verifican en el
// servidor, cifradas con scrypt. Que no vuelva a aparecer una lista de
// credenciales en el código de la vidriera.
export interface Usuario {
    id: number;
    nombre: string;
    rol: Rol;
    avatarUrl?: string;
    curso?: string;
    materia?: string;
}

// Página de inicio (home) a la que cae cada rol tras loguearse. Tipada con
// `RutaPrivada`: el inicio de un rol no puede ser una dirección que no existe,
// ni una de las públicas (a nadie se lo manda a "recuperar contraseña" al entrar).
export const HOME_POR_ROL: Record<Rol, RutaPrivada> = {
    estudiante: "/comunidad",
    profesor: "/comunidad",
    "admin-academico": "/comunidad",
    preceptor: "/comunidad",
    "centro-estudiantes": "/comunidad",
    bibliotecario: "/biblioteca/panel",
    administrador: "/admin/salud",
    familia: "/comunicados",
};

// La tabla de "qué rol puede ver qué pantalla" ya NO está acá. Hasta el punto 4
// de la Etapa 1 vivía en este archivo, es decir, en el navegador: cualquiera
// podía abrir las herramientas del navegador, editarla y darse permisos solo.
// Ahora vive en `servidor/permisos.js` y la vidriera la consulta a través de
// `servicios/permisos.ts`. Que no vuelva a aparecer una regla de permisos acá.

// ─── CONTEXTO ───────────────────────────────────────────
export interface ResultadoLogin {
    ok: boolean;
    error?: string;
}

interface NavegacionValor {
    usuario: Usuario | null;
    rutaActiva: string;
    // true mientras se le pregunta al servidor si la sesión guardada sigue viva
    // (el instante posterior a recargar la página).
    revisandoSesion: boolean;
    navegar: (ruta: string) => void;
    cerrarSesion: () => void;
    // Ahora el ingreso viaja al servidor, así que la respuesta tarda: es una
    // promesa, y trae el motivo del rechazo para poder mostrarlo tal cual.
    login: (email: string, contrasena: string) => Promise<ResultadoLogin>;
}

export const NavegacionContext = createContext<NavegacionValor>({
    usuario: null,
    rutaActiva: "/comunidad",
    revisandoSesion: true,
    navegar: () => { },
    cerrarSesion: () => { },
    login: async () => ({ ok: false }),
});

export const useNavegacion = () => useContext(NavegacionContext);
