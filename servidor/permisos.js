// ============================================================================
// NEXO — Permisos por rol (Etapa 1 punto 4, Error 12.6, sección 14.1)
// ----------------------------------------------------------------------------
// Esta tabla es la ÚNICA fuente de verdad sobre qué rol puede ver qué pantalla.
// Hasta ahora vivía en el navegador (`navegacion.tsx`), donde cualquiera podía
// editarla desde las herramientas del navegador y darse permisos solo. Ahora
// vive acá: la vidriera pregunta y la cocina contesta (regla de oro 4 del plan).
//
// La ventanilla:
//   GET /api/permisos/acceso?pagina=objetivos-metas
//     200 → { permitido: true }
//     401 → no hay sesión abierta
//     403 → el rol de quien pregunta no puede ver esa pantalla
//     400 → esa pantalla no existe
//
// Reparto de responsabilidades: qué dirección web corresponde a cada pantalla
// (`/objetivos/metas` → `objetivos-metas`) es asunto de la vidriera y sigue en
// `navegacion.tsx`. Quién puede verla es asunto de la cocina y es esto.
// ============================================================================

import { usuarioDeLaSesion } from "./sesiones.js";

// Qué roles pueden VER cada pantalla. Un rol ausente = acceso denegado.
// El nombre de cada pantalla es el mismo que usa el tipo `Page` de la vidriera.
export const ROLES_POR_PAGINA = {
  // Aviso de "sección en construcción" (Error 12.8). No muestra ningún dato,
  // así que la puede ver cualquiera: negarla sería decirle a alguien "no tenés
  // permiso" para ver un cartel que dice que la pantalla todavía no existe.
  "en-construccion": [
    "estudiante", "profesor", "admin-academico", "preceptor",
    "centro-estudiantes", "bibliotecario", "familia", "administrador",
  ],

  // Configuración de la cuenta propia (Error 2.A.1). La ven TODOS los roles, y
  // no por descuido: cada persona que puede entrar a NEXO tiene una cuenta que
  // configurar y una contraseña que cambiar. La ventanilla igual solo devuelve
  // y toca los datos de QUIEN pregunta (ver cuenta.js): "puede ver la pantalla"
  // no es lo mismo que "puede ver la cuenta de otro".
  "configuracion-cuenta": [
    "estudiante", "profesor", "admin-academico", "preceptor",
    "centro-estudiantes", "bibliotecario", "familia", "administrador",
  ],

  // Comunidad (compartida por los perfiles educativos)
  comunidad: ["estudiante", "profesor", "admin-academico", "preceptor", "centro-estudiantes", "bibliotecario"],
  debates: ["estudiante", "profesor", "admin-academico", "preceptor", "centro-estudiantes", "bibliotecario"],
  tendencias: ["estudiante", "profesor", "admin-academico", "preceptor", "centro-estudiantes", "bibliotecario"],
  // Bandeja de moderación de la comunidad (denuncias, sección 14.4). Solo la ven
  // quienes pueden ELIMINAR contenido denunciado: la dirección y los preceptores.
  // El botón que la abre vive dentro de Comunidad; el permiso, como siempre, se
  // decide acá y no escondiendo el botón (regla de oro 4).
  "moderacion-comunidad": ["admin-academico", "preceptor"],
  // El calendario es VISIBLE PARA TODOS (Error 6.E.1): dentro de Comunidad, en
  // modo lectura para quien no puede editar. Por eso lo ven los ocho perfiles
  // educativos. Quién puede EDITARLO es otra pantalla ("calendario-editar") y
  // otra validación fina en calendario.js (regla de oro 4).
  "calendario-institucional": [
    "estudiante", "profesor", "admin-academico", "preceptor",
    "centro-estudiantes", "bibliotecario", "familia",
  ],
  // Editar el calendario: solo algunos (Error 6.E.9, 7.B.1, 8.C.1). El permiso
  // de PANTALLA deja pasar a estos cuatro; qué visibilidad puede darle cada uno
  // a un evento (la dirección cualquiera, el preceptor solo su curso, el centro
  // solo eventos propios) lo decide `validarVisibilidad` en calendario.js.
  "calendario-editar": ["admin-academico", "preceptor", "centro-estudiantes", "profesor"],

  // Emitir comunicados a familias (14.13): el preceptor a su curso, la dirección
  // a un curso o a toda la institución. Las familias solo los reciben.
  "comunicados-emitir": ["preceptor", "admin-academico"],

  // Enviar una queja anónima (14.14): es el canal del estudiante. La base ni
  // siquiera guarda quién la escribió; el permiso solo controla quién ABRE el
  // canal, no deja rastro de autoría.
  "enviar-queja": ["estudiante"],

  // Estudiante
  "mis-tareas-estudiante": ["estudiante"],
  "mis-cursos-estudiante": ["estudiante"],
  // Detalle de una materia (profesor, horarios, avisos, tareas). La ventanilla
  // vuelve a validar por fila: el alumno debe estar inscripto en ese curso y el
  // profesor debe ser el docente de esa cátedra (publicar avisos es solo suyo).
  "detalle-materia-estudiante": ["estudiante", "profesor"],
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

  // Notificaciones (Etapa 6, servicio transversal 14.15, Error 9.D.1). La campana
  // y su lista las tienen los ocho roles: cualquiera que use NEXO recibe avisos.
  // La ventanilla igual solo devuelve las notificaciones de QUIEN pregunta.
  notificaciones: [
    "estudiante", "profesor", "admin-academico", "preceptor",
    "centro-estudiantes", "bibliotecario", "familia", "administrador",
  ],

  // Profesor
  "profesor-dashboard": ["profesor"],
  "gestion-tareas-profesor": ["profesor"],
  "aula-virtual-profesor": ["profesor"],
  "diario-reflexivo-profesor": ["profesor"],

  // Admin académica (la DIRECCIÓN de un colegio). El administrador de plataforma
  // ya NO está en estas dos: son la vida interna de una escuela, y su alcance es
  // otro (sección 5). Antes las compartían y por eso el operador de plataforma
  // veía los cursos, las materias y las métricas de un colegio puntual.
  "perfiles-academicos": ["admin-academico"],
  "cursos-activos": ["admin-academico"],
  "panel-institucional": ["admin-academico"],
  // Reportes y expedientes (Etapa 8, sección 14.18). Corresponde SOLO a la
  // dirección (Error 6.F.2): el administrador de PLATAFORMA no arma reportes de
  // la vida interna de un colegio. La generación real vive en reportes.js.
  reportes: ["admin-academico"],

  // Administrador de PLATAFORMA ("nosotros"). Sus dos pantallas propias: la
  // gestión de instituciones y la salud del sistema con los logs (sección 5).
  // Ningún otro rol las ve; este rol no ve ninguna pantalla escolar interna.
  "gestion-instituciones": ["administrador"],
  "salud-sistema": ["administrador"],

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

/**
 * ¿Puede este rol ver esta pantalla?
 * Las ventanillas de datos que vengan (Etapa 2 en adelante) deben preguntarle
 * a ESTA función antes de servir nada, en vez de armar su propia lista.
 */
export function puedeVer(rol, pagina) {
  if (!Object.hasOwn(ROLES_POR_PAGINA, pagina)) return false;
  return ROLES_POR_PAGINA[pagina].includes(rol);
}

export function registrarPermisos(app, db) {
  app.get("/api/permisos/acceso", (req, res) => {
    const usuario = usuarioDeLaSesion(db, req);
    if (!usuario) {
      return res.status(401).json({ error: "No hay sesión abierta." });
    }

    const pagina = String(req.query?.pagina ?? "");

    // Object.hasOwn y no `in`: con `in`, preguntar por "toString" daría que sí,
    // porque es una propiedad heredada de todo objeto de JavaScript.
    if (!Object.hasOwn(ROLES_POR_PAGINA, pagina)) {
      return res.status(400).json({ error: "Esa sección no existe en NEXO." });
    }

    if (!puedeVer(usuario.rol, pagina)) {
      return res
        .status(403)
        .json({ error: "No tenés permiso para ver esta sección." });
    }

    res.json({ permitido: true });
  });
}
