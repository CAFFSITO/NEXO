// ============================================================================
// NEXO — El genoma de cada instancia (perfil Maestro)
// ----------------------------------------------------------------------------
// Cada escuela es una INSTANCIA de NEXO con su propio "genoma": un documento
// que dice qué módulos se ven y en qué orden, qué funciones de cada módulo
// están habilitadas, cómo se comportan sus algoritmos, con qué colores se
// pinta, qué perfiles existen (los de siempre y los que invente el Maestro) y
// qué flujos de nodos reaccionan a lo que pasa en la escuela.
//
// Reglas de fondo, que este archivo hace cumplir:
//   1. Un módulo NUNCA se elimina: se oculta. El Maestro lo oculta y la
//      dirección de la escuela puede volver a mostrarlo.
//   2. Cada perfil nace de un ARQUETIPO (uno de los siete perfiles escolares).
//      El arquetipo es el techo: el Maestro esculpe dentro de lo que ese perfil
//      ya sabe hacer en el servidor; no le inventa permisos que el servidor no
//      sabría custodiar.
//   3. Todo se aplica en el SERVIDOR (regla de oro 4): un módulo oculto o una
//      función apagada devuelven 403 aunque alguien llame a la API a mano.
//   4. Ningún algoritmo personalizado ni flujo se activa sin haber sido
//      simulado y aprobado por probabilidad (huella del grafo).
//   5. Sin IA: lo que "adapta" un genoma a una escuela es probabilidad
//      (curvas logísticas sobre necesidades declaradas), combinatoria y una
//      semilla reproducible.
// ============================================================================

import { ROLES_POR_PAGINA } from "./permisos.js";
import { normalizarPersonalizacion, catalogoPersonalizacion } from "./personalizacion.js";
import {
  validarGrafo,
  compilarGrafo,
  huellaGrafo,
  crearAzar,
  sano,
  ErrorGrafo,
  catalogoNodos,
} from "./nodos.js";

export class ErrorGenoma extends Error {}

// ── Arquetipos: los siete perfiles escolares que el servidor sabe custodiar ──
export const ARQUETIPOS = [
  { id: "secretaria", nombre: "Secretaría", color: "#06b6d4", icono: "contact_mail" },
  { id: "estudiante", nombre: "Estudiante", color: "#10b981", icono: "school" },
  { id: "profesor", nombre: "Profesor", color: "#3b82f6", icono: "cast_for_education" },
  { id: "preceptor", nombre: "Preceptor", color: "#94a3b8", icono: "badge" },
  { id: "admin-academico", nombre: "Admin. Académica", color: "#8b5cf6", icono: "account_balance" },
  { id: "centro-estudiantes", nombre: "Centro de Estudiantes", color: "#f97316", icono: "campaign" },
  { id: "bibliotecario", nombre: "Bibliotecario", color: "#f59e0b", icono: "local_library" },
  { id: "familia", nombre: "Familia", color: "#2dd4bf", icono: "family_restroom" },
];
const IDS_ARQUETIPO = new Set(ARQUETIPOS.map((a) => a.id));

// ── Jerarquía: los niveles de la escuela, de arriba hacia abajo ─────────────
// Deciden quién le puede mostrar algo a quién (por ejemplo, un evento del
// calendario): cada nivel comparte con el suyo y con los de abajo, solo con los
// de abajo, o solo crea cosas personales. El Maestro no cuenta (no pertenece a
// ninguna escuela) y la dirección queda siempre en el nivel de arriba. La
// dirección puede renombrar niveles, crear otros y mover perfiles entre ellos
// desde su modo edición.
export const POLITICAS_NIVEL = ["nivel-y-abajo", "abajo", "personal"];
export const JERARQUIA_BASE = Object.freeze({
  niveles: Object.freeze([
    Object.freeze({ id: "conduccion", nombre: "Dirección y Centro de Estudiantes", politica: "nivel-y-abajo" }),
    Object.freeze({ id: "equipo", nombre: "Profesores, biblioteca y preceptoría", politica: "nivel-y-abajo" }),
    Object.freeze({ id: "comunidad", nombre: "Estudiantes y familias", politica: "personal" }),
  ]),
});
/** El nivel de fábrica de cada arquetipo (índice en JERARQUIA_BASE). */
const NIVEL_DE_ARQUETIPO = {
  "admin-academico": 0, "centro-estudiantes": 0,
  profesor: 1, bibliotecario: 1, preceptor: 1, secretaria: 1,
  estudiante: 2, familia: 2,
};
const MAX_NIVELES = 6;

// Las seis necesidades con las que el generador por probabilidad "lee" a una
// escuela. Cada módulo y cada función tienen una afinidad con ellas.
export const NECESIDADES = [
  { id: "comunidad", nombre: "Vida comunitaria", icono: "diversity_3" },
  { id: "academico", nombre: "Foco académico", icono: "menu_book" },
  { id: "familias", nombre: "Puente con las familias", icono: "family_restroom" },
  { id: "autonomia", nombre: "Autonomía estudiantil", icono: "rocket_launch" },
  { id: "control", nombre: "Supervisión institucional", icono: "shield" },
  { id: "innovacion", nombre: "Herramientas digitales", icono: "bolt" },
];

// ── Catálogo de módulos ──────────────────────────────────────────────────────
// paginas: pantallas (de permisos.js) que pertenecen al módulo. Con eso se
//          decide si una pantalla se ve (exigirAcceso) y qué arquetipos tienen
//          el módulo (unión de los roles de sus pantallas).
// rutas:   prefijos de la API que son del módulo aunque su ventanilla no pase
//          por exigirAcceso (por ejemplo el aula en vivo). Opcionalmente atados
//          a ciertos arquetipos.
// funciones: el checklist. Cada una apaga rutas concretas de escritura.
//            `arquetipos` = quiénes la tienen de base (el techo).
// afinidad: [comunidad, academico, familias, autonomia, control, innovacion]
const COMUNIDAD6 = ["estudiante", "profesor", "admin-academico", "preceptor", "centro-estudiantes", "bibliotecario"];
const PUBLICAN = ["estudiante", "profesor", "admin-academico", "centro-estudiantes"];
const CHAT = ["estudiante", "profesor", "preceptor", "bibliotecario", "familia", "admin-academico", "secretaria"];
const BIBLIO = ["estudiante", "profesor", "admin-academico", "bibliotecario"];
const TODOS = ["estudiante", "profesor", "preceptor", "admin-academico", "centro-estudiantes", "bibliotecario", "familia", "secretaria"];
const EQUIPO = ["profesor", "preceptor", "admin-academico", "centro-estudiantes", "bibliotecario"];

// ── Capacidades: lo que solo algunos perfiles pueden hacer ──────────────────
// Una función del checklist está prendida para todos salvo que se la apague.
// Una CAPACIDAD es al revés: arranca solo en algunos perfiles y la dirección
// elige, en su modo edición, a qué otros perfiles se la da.
export const CAPACIDADES = [
  {
    id: "comunidad.multimedia", modulo: "comunidad", nombre: "Subir fotos, videos y archivos",
    descripcion: "Adjuntar imágenes, videos y archivos de todo tipo a publicaciones, respuestas y debates.",
    arquetipos: PUBLICAN, porDefecto: ["admin-academico", "centro-estudiantes"],
  },
  {
    id: "comunidad.fijar", modulo: "comunidad", nombre: "Fijar publicaciones y debates",
    descripcion: "Fijar arriba de todo, sin límite: lo último que se fija queda primero.",
    arquetipos: COMUNIDAD6, porDefecto: ["admin-academico"],
  },
];
const CAPACIDAD_POR_ID = new Map(CAPACIDADES.map((c) => [c.id, c]));

export const MODULOS = [
  {
    id: "comunidad", nombre: "Comunidad", icono: "group", color: "#c548f5",
    descripcion: "El feed de la escuela, estilo X y Reddit: publicaciones, hilos, respuestas anidadas, votos, reacciones, reposts, citas, encuestas y moderación.",
    paginas: ["comunidad", "moderacion-comunidad"],
    sesgo: 0.7, afinidad: [1.3, 0, 0, 0.5, -0.2, 0.2],
    funciones: [
      { id: "comunidad.publicar", nombre: "Publicar en el feed", arquetipos: PUBLICAN, sens: 0.6,
        rutas: [["POST", "/api/comunidad/publicaciones"]] },
      { id: "comunidad.programar", nombre: "Programar publicaciones con fecha", arquetipos: PUBLICAN, sens: 0.2,
        rutas: [["POST", "/api/comunidad/publicaciones", "programado"]] },
      { id: "comunidad.hilos", nombre: "Publicar hilos (varias publicaciones encadenadas)", arquetipos: PUBLICAN, sens: 0.3,
        rutas: [["POST", "/api/comunidad/publicaciones", "conHilo"]] },
      { id: "comunidad.encuestas", nombre: "Encuestas en las publicaciones", arquetipos: PUBLICAN, sens: 0.3,
        rutas: [["POST", "/api/comunidad/publicaciones", "conEncuesta"]] },
      { id: "comunidad.citar", nombre: "Citar publicaciones", arquetipos: PUBLICAN, sens: 0.3,
        rutas: [["POST", "/api/comunidad/publicaciones", "conCita"]] },
      { id: "comunidad.repostear", nombre: "Repostear", arquetipos: PUBLICAN, sens: 0.3,
        rutas: [["POST", "/api/comunidad/publicaciones/:id/repost"]] },
      { id: "comunidad.editar", nombre: "Editar lo propio (los primeros 30 minutos)", arquetipos: COMUNIDAD6, sens: 0.1,
        rutas: [["PUT", "/api/comunidad/publicaciones/:id"], ["PUT", "/api/comunidad/comentarios/:id"]] },
      { id: "comunidad.votar", nombre: "Votar (flechas a favor y en contra)", arquetipos: COMUNIDAD6, sens: 0.5,
        rutas: [["POST", "/api/comunidad/voto"], ["POST", "/api/comunidad/encuestas/:id/votar"]] },
      { id: "comunidad.reaccionar", nombre: "Reaccionar con emojis", arquetipos: COMUNIDAD6, sens: 0.4,
        rutas: [["POST", "/api/comunidad/reacciones"]] },
      { id: "comunidad.comentar", nombre: "Responder (hilos y sub-hilos)", arquetipos: COMUNIDAD6, sens: 0.5,
        rutas: [["POST", "/api/comunidad/comentarios"]] },
      { id: "comunidad.seguir", nombre: "Seguir y silenciar personas", arquetipos: COMUNIDAD6, sens: 0.2,
        rutas: [["POST", "/api/comunidad/usuarios/:id/seguir"], ["POST", "/api/comunidad/usuarios/:id/silenciar"]] },
      { id: "comunidad.guardar", nombre: "Guardar publicaciones", arquetipos: COMUNIDAD6, sens: 0.1,
        rutas: [["POST", "/api/comunidad/publicaciones/:id/guardar"]] },
      { id: "comunidad.denunciar", nombre: "Denunciar contenido", arquetipos: COMUNIDAD6, sens: -0.6,
        rutas: [["POST", "/api/comunidad/denuncias"]] },
      { id: "comunidad.moderar", nombre: "Bandeja de moderación", arquetipos: ["admin-academico", "preceptor"], sens: -0.8,
        rutas: [["GET", "/api/comunidad/denuncias"], ["PUT", "/api/comunidad/denuncias/:id"]] },
      { id: "comunidad.eliminar", nombre: "Eliminar contenido", arquetipos: COMUNIDAD6, sens: -0.3,
        rutas: [["DELETE", "/api/comunidad/publicaciones/:id"], ["DELETE", "/api/comunidad/comentarios/:id"]] },
      // Fijar y subir multimedia no son funciones de "sí para todos": son
      // CAPACIDADES que la dirección le da a ciertos perfiles (ver CAPACIDADES).
    ],
  },
  {
    id: "debates", nombre: "Debates", icono: "forum", color: "#a855f7", padre: "comunidad",
    descripcion: "Debates armados con bloques combinables (postura, encuesta, escala, ranking, argumentos, propuestas, pregunta abierta) y con hilos adentro. Vive dentro de Comunidad.",
    paginas: ["debates"],
    sesgo: 0.2, afinidad: [1, 0.2, 0, 0.9, -0.4, 0.2],
    funciones: [
      { id: "debates.crear", nombre: "Abrir debates", arquetipos: PUBLICAN, sens: 0.6,
        rutas: [["POST", "/api/comunidad/debates"]] },
      { id: "debates.participar", nombre: "Participar: postura, encuestas, escalas y rankings", arquetipos: COMUNIDAD6, sens: 0.5,
        rutas: [["POST", "/api/comunidad/debates/:id/participar"], ["PUT", "/api/comunidad/debates/:id/postura"], ["POST", "/api/comunidad/debates/:id/responder"]] },
      { id: "debates.aportar", nombre: "Aportar argumentos, propuestas y respuestas", arquetipos: COMUNIDAD6, sens: 0.5,
        rutas: [["POST", "/api/comunidad/debates/:id/aportes"], ["POST", "/api/comunidad/debates/aportes/:id/convencio"]] },
      { id: "debates.concluir", nombre: "Cerrar debates y escribir la conclusión", arquetipos: PUBLICAN, sens: 0.1,
        rutas: [["PUT", "/api/comunidad/debates/:id/conclusion"], ["POST", "/api/comunidad/debates/:id/cerrar"]] },
      { id: "debates.eliminar", nombre: "Eliminar debates y aportes", arquetipos: COMUNIDAD6, sens: -0.3,
        rutas: [["DELETE", "/api/comunidad/debates/:id"], ["DELETE", "/api/comunidad/debates/aportes/:id"]] },
    ],
  },
  {
    id: "tendencias", nombre: "Tendencias", icono: "trending_up", color: "#ec4899", padre: "comunidad",
    descripcion: "Lo que más se movió en la comunidad, en la escuela y a nivel nacional. Vive dentro de Comunidad.",
    paginas: ["tendencias", "tendencias-direccion"],
    sesgo: 0, afinidad: [1, 0, 0, 0.4, -0.3, 0.4],
    funciones: [
      { id: "tendencias.nacional", nombre: "Llevar tendencias a lo nacional", arquetipos: ["admin-academico"], sens: -0.2,
        rutas: [["POST", "/api/comunidad/tendencias/nacional"]] },
    ],
  },
  {
    id: "calendario", nombre: "Calendario", icono: "calendar_today", color: "#38bdf8",
    descripcion: "Eventos con jerarquía: cada nivel se los muestra al suyo y a los de abajo. Repeticiones, recordatorios y confirmaciones.",
    paginas: ["calendario-institucional", "calendario-editar", "familia-calendario"],
    sesgo: 1.4, afinidad: [0.3, 0.3, 0.6, 0, 0.3, 0],
    funciones: [
      { id: "calendario.crear", nombre: "Crear eventos", arquetipos: TODOS, sens: 0.2,
        rutas: [["POST", "/api/calendario/eventos"]] },
      { id: "calendario.compartir", nombre: "Mostrar eventos a otras personas (según la jerarquía)", arquetipos: EQUIPO, sens: 0.4,
        rutas: [["POST", "/api/calendario/eventos", "conAudiencia"], ["PUT", "/api/calendario/eventos/:id", "conAudiencia"]] },
      { id: "calendario.recurrentes", nombre: "Eventos que se repiten", arquetipos: TODOS, sens: 0.1,
        rutas: [["POST", "/api/calendario/eventos", "recurrente"], ["PUT", "/api/calendario/eventos/:id", "recurrente"]] },
      { id: "calendario.obligatorios", nombre: "Marcar eventos como obligatorios", arquetipos: EQUIPO, sens: 0.3,
        rutas: [["POST", "/api/calendario/eventos", "obligatorio"], ["PUT", "/api/calendario/eventos/:id", "obligatorio"]] },
      { id: "calendario.confirmaciones", nombre: "Pedir confirmación de asistencia", arquetipos: EQUIPO, sens: 0.2,
        rutas: [["POST", "/api/calendario/eventos", "confirmacion"], ["PUT", "/api/calendario/eventos/:id", "confirmacion"]] },
      { id: "calendario.avisar", nombre: "Avisar a los destinatarios al crear", arquetipos: EQUIPO, sens: 0.3,
        rutas: [["POST", "/api/calendario/eventos", "avisar"], ["PUT", "/api/calendario/eventos/:id", "avisar"]] },
      { id: "calendario.editar", nombre: "Editar y borrar eventos", arquetipos: TODOS, sens: 0,
        rutas: [["PUT", "/api/calendario/eventos/:id"], ["DELETE", "/api/calendario/eventos/:id"]] },
      { id: "calendario.responder", nombre: "Confirmar asistencia, ocultar y recordatorios propios", arquetipos: TODOS, sens: 0,
        rutas: [["POST", "/api/calendario/eventos/:id/respuesta"], ["POST", "/api/calendario/eventos/:id/preferencias"]] },
    ],
  },
  {
    id: "portafolio", nombre: "Portafolio del estudiante", icono: "school", color: "#10b981",
    descripcion: "Mis cursos, mis tareas, calificaciones y el detalle de cada materia.",
    paginas: ["mis-tareas-estudiante", "mis-cursos-estudiante", "detalle-materia-estudiante", "calificaciones"],
    sesgo: 1.8, afinidad: [0, 1.2, 0.2, 0.3, 0.2, 0.2],
    funciones: [
      { id: "portafolio.entregar", nombre: "Entregar tareas", arquetipos: ["estudiante"], sens: 0.4,
        rutas: [["POST", "/api/tareas/:id/entrega"]] },
      { id: "portafolio.anular", nombre: "Anular una entrega no corregida", arquetipos: ["estudiante"], sens: 0.2,
        rutas: [["DELETE", "/api/tareas/:id/entrega"]] },
      { id: "portafolio.personales", nombre: "Tareas personales (recordatorios)", arquetipos: ["estudiante"], sens: 0.5,
        rutas: [["POST", "/api/tareas-personales"], ["PUT", "/api/tareas-personales/:id"], ["PUT", "/api/tareas-personales/:id/completada"], ["DELETE", "/api/tareas-personales/:id"]] },
      { id: "portafolio.reacciones", nombre: "Reaccionar a avisos de materia", arquetipos: ["estudiante"], sens: 0.4,
        rutas: [["POST", "/api/materias/avisos/:avisoId/reaccion"]] },
      { id: "portafolio.respuestas", nombre: "Responder avisos de materia", arquetipos: ["estudiante"], sens: 0.4,
        rutas: [["POST", "/api/materias/avisos/:avisoId/respuesta"], ["PUT", "/api/materias/respuestas/:respuestaId"], ["DELETE", "/api/materias/respuestas/:respuestaId"]] },
    ],
  },
  {
    id: "aula-virtual", nombre: "Aula virtual", icono: "cast_for_education", color: "#06b6d4",
    descripcion: "Clases en vivo: video propio, pizarra, pulso, preguntas y trayectoria.",
    paginas: ["aula-virtual-estudiante", "aula-virtual-profesor"],
    rutas: [{ prefijo: "/api/aula" }],
    sesgo: 0.4, afinidad: [0.1, 0.6, 0, 0.2, 0, 1.3],
    funciones: [
      { id: "aula.planificar", nombre: "Planificar clases", arquetipos: ["profesor"], sens: 0,
        rutas: [["POST", "/api/aula/clases"]] },
      { id: "aula.pizarra", nombre: "Pizarra del docente", arquetipos: ["profesor"], sens: 0.2,
        rutas: [["POST", "/api/aula/clases/:id/pizarra"], ["POST", "/api/aula/clases/:id/pizarra/limpiar"]] },
      { id: "aula.umbral", nombre: "Ajustar la alerta de ritmo por clase", arquetipos: ["profesor"], sens: 0.1,
        rutas: [["PUT", "/api/aula/clases/:id/umbral"]] },
      { id: "aula.pulso", nombre: "Marcar el pulso de comprensión", arquetipos: ["estudiante"], sens: 0.5,
        rutas: [["POST", "/api/aula/clases/:id/comprension"]] },
      { id: "aula.preguntas", nombre: "Hacer preguntas en clase", arquetipos: ["estudiante"], sens: 0.5,
        rutas: [["POST", "/api/aula/clases/:id/preguntas"]] },
    ],
  },
  {
    id: "objetivos", nombre: "Objetivos personales", icono: "track_changes", color: "#84cc16",
    descripcion: "Metas, hábitos con rachas y competencias con evidencias.",
    paginas: ["objetivos-dashboard", "objetivos-metas", "objetivos-habitos", "competencias"],
    sesgo: 0.5, afinidad: [0, 0.6, 0, 1.2, -0.2, 0.3],
    funciones: [
      { id: "objetivos.metas", nombre: "Crear y editar metas", arquetipos: ["estudiante"], sens: 0.6,
        rutas: [["POST", "/api/objetivos/metas"], ["PUT", "/api/objetivos/metas/:id"], ["PUT", "/api/objetivos/metas/:id/estado"], ["DELETE", "/api/objetivos/metas/:id"], ["POST", "/api/objetivos/metas/:id/subtareas"], ["PUT", "/api/objetivos/subtareas/:id"], ["DELETE", "/api/objetivos/subtareas/:id"]] },
      { id: "objetivos.habitos", nombre: "Hábitos y registros diarios", arquetipos: ["estudiante"], sens: 0.6,
        rutas: [["POST", "/api/objetivos/habitos"], ["PUT", "/api/objetivos/habitos/:id"], ["PUT", "/api/objetivos/habitos/:id/registro"], ["DELETE", "/api/objetivos/habitos/:id"]] },
      { id: "objetivos.evidencias", nombre: "Cargar evidencias de competencias", arquetipos: ["estudiante"], sens: 0.4,
        rutas: [["POST", "/api/objetivos/competencias/:id/evidencias"], ["DELETE", "/api/objetivos/evidencias/:id"]] },
      { id: "objetivos.autoevaluar", nombre: "Autoevaluar el nivel de competencias", arquetipos: ["estudiante"], sens: 0.7,
        rutas: [["PUT", "/api/objetivos/competencias/:id/nivel"]] },
    ],
  },
  {
    id: "biblioteca", nombre: "Biblioteca", icono: "local_library", color: "#f59e0b",
    descripcion: "Catálogo institucional y nacional, con votos.",
    paginas: ["biblioteca", "biblioteca-nacional"],
    sesgo: 0.8, afinidad: [0.3, 0.8, 0, 0.4, 0, 0.3],
    funciones: [
      { id: "biblioteca.presentar", nombre: "Presentar recursos", arquetipos: BIBLIO, sens: 0.5,
        rutas: [["POST", "/api/biblioteca/recursos"]] },
      { id: "biblioteca.votar", nombre: "Votar recursos", arquetipos: BIBLIO, sens: 0.4,
        rutas: [["POST", "/api/biblioteca/recursos/:id/voto"]] },
    ],
  },
  {
    id: "documentos", nombre: "Documentos y formularios", icono: "edit_document", color: "#8b5cf6",
    descripcion: "Páginas de bloques y formularios compartibles con historial.",
    paginas: ["documentos"], sesgo: 0.6, afinidad: [0.4, 0.6, 0.3, 0.5, 0, 0.2],
    rutas: [{ prefijo: "/api/documentos" }],
    funciones: [],
  },
  {
    id: "proyectos", nombre: "Proyectos compartidos", icono: "workspaces", color: "#14b8a6",
    descripcion: "Problemas, proyectos y producciones compartidas con responsables, evidencias y devolución.",
    paginas: ["proyectos"], sesgo: 0.6, afinidad: [0.6, 0.7, 0.7, 0.6, 0, 0.3],
    rutas: [{ prefijo: "/api/proyectos" }], funciones: [],
  },
  {
    id: "metodos-estudio", nombre: "Métodos de estudio", icono: "psychology", color: "#8b5cf6",
    descripcion: "Prácticas estructuradas y repaso basados en reglas sin IA.",
    paginas: ["metodos-estudio"], sesgo: 0.6, afinidad: [0.4, 0.6, 0.4, 0.5, 0, 0.3],
    rutas: [{ prefijo: "/api/estudio" }], funciones: [],
  },
  {
    id: "gestion-biblioteca", nombre: "Gestión de biblioteca", icono: "fact_check", color: "#eab308",
    descripcion: "El panel del bibliotecario y la cola de revisión.",
    paginas: ["panel-bibliotecario"],
    sesgo: 1.6, afinidad: [0.2, 0.5, 0, 0, 0.5, 0],
    funciones: [
      { id: "biblioteca.revisar", nombre: "Aprobar o rechazar recursos", arquetipos: ["bibliotecario"], sens: -0.2,
        rutas: [["POST", "/api/biblioteca/cola/:id/decidir"]] },
    ],
  },
  {
    id: "chat", nombre: "Mensajes", icono: "chat_bubble", color: "#8b5cf6",
    descripcion: "Chat directo y grupos de curso, con adjuntos.",
    paginas: ["chat", "familia-chat"],
    sesgo: 0.8, afinidad: [0.6, 0.2, 0.8, 0.2, -0.2, 0.3],
    funciones: [
      { id: "chat.iniciar", nombre: "Iniciar conversaciones", arquetipos: CHAT, sens: 0.4,
        rutas: [["POST", "/api/chat/conversaciones"]] },
      { id: "chat.espacios", nombre: "Crear y configurar canales, foros y ayuda", arquetipos: CHAT, sens: 0.4,
        rutas: [["POST", "/api/chat/canales"], ["PUT", "/api/chat/canales/:id"]] },
      { id: "chat.contextos", nombre: "Abrir conversaciones de tareas, entregas y metas", arquetipos: CHAT, sens: 0.3,
        rutas: [["POST", "/api/chat/contextos/:tipo/:id"]] },
      { id: "chat.enviar", nombre: "Enviar mensajes", arquetipos: CHAT, sens: 0.3,
        rutas: [["POST", "/api/chat/conversaciones/:id/mensajes"]] },
      { id: "chat.adjuntos", nombre: "Adjuntar archivos", arquetipos: CHAT, sens: 0.2,
        rutas: [["POST", "/api/chat/conversaciones/:id/mensajes", "conArchivo"]] },
    ],
  },
  {
    id: "asistencia-ia", nombre: "Asistencia académica", icono: "auto_awesome", color: "#22d3ee",
    descripcion: "El tutor de estudio (usa un proveedor externo si la escuela lo configura).",
    paginas: ["asistencia-ia"],
    rutas: [{ prefijo: "/api/asistencia-ia" }],
    sesgo: -0.1, afinidad: [0, 0.5, 0, 0.6, -0.5, 1.4],
    funciones: [
      { id: "ia.preguntar", nombre: "Hacer consultas", arquetipos: ["estudiante"], sens: 0.5,
        rutas: [["POST", "/api/asistencia-ia/mensaje"]] },
      { id: "ia.historial", nombre: "Borrar el propio historial", arquetipos: ["estudiante"], sens: 0.3,
        rutas: [["DELETE", "/api/asistencia-ia/historial"]] },
    ],
  },
  {
    id: "buzon", nombre: "Buzón estudiantil", icono: "mark_email_unread", color: "#fb7185",
    descripcion: "Quejas anónimas: el estudiante envía, el centro y la dirección leen.",
    paginas: ["enviar-queja", "gestion-quejas"],
    sesgo: 0.5, afinidad: [0.7, 0, 0, 0.9, -0.3, 0],
    funciones: [
      { id: "buzon.enviar", nombre: "Enviar quejas anónimas", arquetipos: ["estudiante"], sens: 0.6,
        rutas: [["POST", "/api/quejas"]] },
      { id: "buzon.gestionar", nombre: "Marcar quejas como vistas", arquetipos: ["centro-estudiantes", "admin-academico"], sens: -0.2,
        rutas: [["POST", "/api/quejas/:id/vista"]] },
    ],
  },
  {
    id: "portafolio-docente", nombre: "Portafolio docente", icono: "space_dashboard", color: "#3b82f6",
    descripcion: "Panel del profesor, diario reflexivo y avisos a sus cátedras.",
    paginas: ["profesor-dashboard", "diario-reflexivo-profesor"],
    sesgo: 1.6, afinidad: [0, 1, 0, 0, 0.3, 0.2],
    funciones: [
      { id: "docente.diario", nombre: "Diario reflexivo", arquetipos: ["profesor"], sens: 0.3,
        rutas: [["POST", "/api/diario"], ["PUT", "/api/diario/:id"], ["DELETE", "/api/diario/:id"]] },
      { id: "docente.avisos", nombre: "Publicar avisos a sus cátedras", arquetipos: ["profesor"], sens: 0.2,
        rutas: [["POST", "/api/materias/:catedraId/avisos"], ["PUT", "/api/materias/avisos/:avisoId"], ["DELETE", "/api/materias/avisos/:avisoId"]] },
    ],
  },
  {
    id: "tareas-docente", nombre: "Tareas y entregas", icono: "assignment", color: "#6366f1",
    descripcion: "El docente crea tareas, ve entregas y corrige.",
    paginas: ["gestion-tareas-profesor"],
    sesgo: 1.9, afinidad: [0, 1.2, 0, 0, 0.4, 0],
    funciones: [
      { id: "tareas.crear", nombre: "Crear tareas", arquetipos: ["profesor"], sens: 0,
        rutas: [["POST", "/api/tareas"]] },
      { id: "tareas.editar", nombre: "Editar y anular tareas", arquetipos: ["profesor"], sens: 0,
        rutas: [["PUT", "/api/tareas/:id"], ["DELETE", "/api/tareas/:id"]] },
      { id: "tareas.corregir", nombre: "Corregir entregas", arquetipos: ["profesor"], sens: 0,
        rutas: [["POST", "/api/entregas/:id/correccion"]] },
    ],
  },
  {
    id: "comunicados", nombre: "Comunicados", icono: "campaign", color: "#14b8a6",
    descripcion: "Comunicados a familias, con lecturas y respuesta privada.",
    paginas: ["comunicados-emitir", "familia-comunicados"],
    sesgo: 1, afinidad: [0, 0, 1.5, 0, 0.4, 0],
    funciones: [
      { id: "comunicados.emitir", nombre: "Emitir comunicados", arquetipos: ["preceptor", "admin-academico"], sens: -0.1,
        rutas: [["POST", "/api/comunicados"]] },
      { id: "comunicados.programar", nombre: "Programar comunicados con fecha", arquetipos: ["preceptor", "admin-academico"], sens: 0,
        rutas: [["POST", "/api/comunicados", "programado"]] },
      { id: "comunicados.fijar", nombre: "Fijar comunicados", arquetipos: ["admin-academico"], sens: -0.3,
        rutas: [["POST", "/api/comunicados/:id/fijar"], ["POST", "/api/comunicados/:id/desfijar"]] },
      { id: "comunicados.responder", nombre: "Responder por chat privado", arquetipos: ["familia"], sens: 0.4,
        rutas: [["POST", "/api/comunicados/:id/responder"]] },
    ],
  },
  {
    id: "anuncios", nombre: "Anuncios", icono: "notifications_active", color: "#f43f5e",
    descripcion: "Avisos obligatorios entre la dirección y la preceptoría: llegan como tarjetas que hay que leer sí o sí, por grupos de difusión o a una persona, con alerta push.",
    paginas: ["anuncios", "anuncios-grupos"],
    sesgo: 1.2, afinidad: [0.3, 0, 0, 0, 1.2, 0.3],
    funciones: [
      { id: "anuncios.enviar", nombre: "Enviar avisos", arquetipos: ["preceptor", "admin-academico", "secretaria"], sens: 0,
        rutas: [["POST", "/api/anuncios"]] },
      { id: "anuncios.grupos", nombre: "Crear y editar grupos de difusión", arquetipos: ["admin-academico"], sens: 0,
        rutas: [["POST", "/api/anuncios/grupos"], ["PUT", "/api/anuncios/grupos/:id"], ["DELETE", "/api/anuncios/grupos/:id"]] },
    ],
  },
  {
    id: "perfiles", nombre: "Perfiles académicos", icono: "manage_accounts", color: "#a78bfa",
    descripcion: "Alta, edición y papelera de las personas de la escuela.",
    paginas: ["perfiles-academicos"],
    sesgo: 4, afinidad: [0, 0, 0, 0, 0.5, 0],
    funciones: [
      { id: "perfiles.crear", nombre: "Dar de alta perfiles", arquetipos: ["admin-academico"], sens: 0,
        rutas: [["POST", "/api/perfiles"]] },
      { id: "perfiles.editar", nombre: "Editar perfiles y vínculos familiares", arquetipos: ["admin-academico"], sens: 0,
        rutas: [["PATCH", "/api/perfiles/:id"], ["PUT", "/api/perfiles/:id/vinculos"]] },
      { id: "perfiles.papelera", nombre: "Papelera de perfiles", arquetipos: ["admin-academico"], sens: 0,
        rutas: [["POST", "/api/perfiles/:id/papelera"], ["POST", "/api/perfiles/:id/restaurar"], ["DELETE", "/api/perfiles/:id"]] },
    ],
  },
  {
    id: "cursos", nombre: "Cursos y materias", icono: "school", color: "#60a5fa",
    descripcion: "Divisiones, cátedras, inscripciones y materias.",
    paginas: ["cursos-activos"],
    sesgo: 4, afinidad: [0, 0.4, 0, 0, 0.5, 0],
    funciones: [
      { id: "cursos.crear", nombre: "Crear cursos", arquetipos: ["admin-academico"], sens: 0,
        rutas: [["POST", "/api/cursos"], ["POST", "/api/cursos/turnos"], ["POST", "/api/cursos/especialidades"]] },
      { id: "cursos.organizar", nombre: "Cátedras e inscripciones", arquetipos: ["admin-academico"], sens: 0,
        // El preceptor, turno y especialidad son datos básicos del curso:
        // editarlos depende del acceso a Cursos, no de usar cátedras o alumnos.
        rutas: [["PUT", "/api/cursos/:id/inscripciones"], ["POST", "/api/cursos/:id/catedras"]] },
      { id: "cursos.materias", nombre: "Crear materias", arquetipos: ["admin-academico"], sens: 0,
        rutas: [["POST", "/api/materias"]] },
    ],
  },
  {
    id: "panel-institucional", nombre: "Panel institucional", icono: "space_dashboard", color: "#c084fc",
    descripcion: "El pulso de la escuela para la dirección.",
    paginas: ["panel-institucional"],
    sesgo: 1.6, afinidad: [0.2, 0.3, 0.2, 0, 0.8, 0.1],
    funciones: [],
  },
  {
    id: "reportes", nombre: "Reportes", icono: "assessment", color: "#f472b6",
    descripcion: "Reportes y expedientes descargables.",
    paginas: ["reportes"],
    sesgo: 0.6, afinidad: [0, 0.5, 0.2, 0, 1, 0],
    funciones: [
      { id: "reportes.generar", nombre: "Generar reportes", arquetipos: ["admin-academico"], sens: -0.2,
        rutas: [["POST", "/api/reportes/generar"]] },
    ],
  },
  {
    id: "preceptoria", nombre: "Preceptoría", icono: "badge", color: "#94a3b8",
    descripcion: "Los cursos del preceptor, su actividad y la moderación del chat.",
    paginas: ["mis-cursos-preceptor"],
    sesgo: 1.5, afinidad: [0, 0.3, 0.5, 0, 0.8, 0],
    funciones: [
      { id: "preceptoria.moderar", nombre: "Moderar el chat de sus cursos", arquetipos: ["preceptor"], sens: -0.6,
        rutas: [["GET", "/api/chat/moderacion/:cursoId"], ["GET", "/api/chat/moderacion/:cursoId/:conversacionId/mensajes"]] },
    ],
  },
  {
    id: "portal-centro", nombre: "Portal del Centro", icono: "campaign", color: "#fb923c",
    descripcion: "La cara pública del Centro de Estudiantes.",
    paginas: ["portal-centro"],
    sesgo: 0.6, afinidad: [1.1, 0, 0, 0.9, -0.3, 0],
    funciones: [],
  },
];

const MODULO_POR_ID = new Map(MODULOS.map((m) => [m.id, m]));
export const moduloPorId = (id) => MODULO_POR_ID.get(id) ?? null;

// Pantallas que pertenecen al núcleo: no se pueden ocultar (configuración de la
// cuenta, notificaciones, la pantalla de módulos de la dirección y las del
// Maestro). Ocultarlas dejaría a alguien sin forma de volver.
export const PAGINAS_NUCLEO = new Set([
  "en-construccion", "configuracion-cuenta", "notificaciones", "modulos-institucion",
  "gestion-instituciones", "salud-sistema", "maestro-estudio", "anuncios-maestro",
]);

// Una misma pantalla puede pertenecer a otro módulo según quién la mira: el
// profesor entra al detalle de materia desde SU portafolio docente.
const PAGINA_SEGUN_ARQUETIPO = {
  "detalle-materia-estudiante": { profesor: "portafolio-docente" },
};

const MODULO_DE_PAGINA = new Map();
for (const m of MODULOS) for (const p of m.paginas) MODULO_DE_PAGINA.set(p, m.id);

export function moduloDePagina(pagina, arquetipo) {
  return PAGINA_SEGUN_ARQUETIPO[pagina]?.[arquetipo] ?? MODULO_DE_PAGINA.get(pagina) ?? null;
}

/** Las pantallas que son de este módulo para este arquetipo (la vidriera las cruza con sus rutas). */
export function paginasDeModulo(moduloId, arquetipo) {
  const todas = new Set([...(MODULO_POR_ID.get(moduloId)?.paginas ?? []), ...Object.keys(PAGINA_SEGUN_ARQUETIPO)]);
  return [...todas].filter((p) => moduloDePagina(p, arquetipo) === moduloId);
}

// Arquetipos de cada módulo: los roles de sus pantallas (se calcula al primer
// uso para no depender del orden de carga entre permisos.js y este archivo).
let arquetiposCache = null;
export function arquetiposDeModulo(moduloId) {
  if (!arquetiposCache) {
    arquetiposCache = new Map();
    for (const m of MODULOS) {
      const set = new Set();
      for (const p of m.paginas) for (const r of ROLES_POR_PAGINA[p] ?? []) if (IDS_ARQUETIPO.has(r)) set.add(r);
      for (const [pagina, porRol] of Object.entries(PAGINA_SEGUN_ARQUETIPO)) {
        for (const [rol, mod] of Object.entries(porRol)) {
          if (mod === m.id && (ROLES_POR_PAGINA[pagina] ?? []).includes(rol)) set.add(rol);
        }
      }
      arquetiposCache.set(m.id, [...set]);
    }
    // La pantalla de detalle de materia no cuenta como "portafolio del
    // estudiante" para el profesor (lo resuelve PAGINA_SEGUN_ARQUETIPO).
    arquetiposCache.set("portafolio", arquetiposCache.get("portafolio").filter((r) => r !== "profesor"));
  }
  return arquetiposCache.get(moduloId) ?? [];
}

// ── Eventos que pueden disparar flujos ───────────────────────────────────────
// Se detectan en la guardia (un pedido de escritura que terminó bien). Los
// marcados `anonimo` NUNCA exponen a quien los provocó: una queja anónima no
// puede tener un "actor" al que avisar ni que quede registrado.
export const EVENTOS = [
  { id: "comunidad.publicacion", nombre: "Alguien publica en el feed", modulo: "comunidad", metodo: "POST", patron: "/api/comunidad/publicaciones" },
  { id: "comunidad.comentario", nombre: "Alguien comenta", modulo: "comunidad", metodo: "POST", patron: "/api/comunidad/comentarios" },
  { id: "comunidad.denuncia", nombre: "Llega una denuncia", modulo: "comunidad", metodo: "POST", patron: "/api/comunidad/denuncias" },
  { id: "debates.nuevo", nombre: "Se abre un debate", modulo: "debates", metodo: "POST", patron: "/api/comunidad/debates" },
  { id: "debates.postura", nombre: "Alguien toma postura en un debate", modulo: "debates", metodo: "PUT", patron: "/api/comunidad/debates/:id/postura" },
  { id: "debates.respuesta", nombre: "Alguien responde un bloque de un debate", modulo: "debates", metodo: "POST", patron: "/api/comunidad/debates/:id/responder" },
  { id: "debates.aporte", nombre: "Alguien aporta un argumento o una propuesta", modulo: "debates", metodo: "POST", patron: "/api/comunidad/debates/:id/aportes" },
  { id: "tendencias.decision", nombre: "La dirección decide sobre una tendencia nacional", modulo: "tendencias", metodo: "POST", patron: "/api/comunidad/tendencias/nacional" },
  { id: "calendario.evento", nombre: "Se crea un evento", modulo: "calendario", metodo: "POST", patron: "/api/calendario/eventos" },
  { id: "anuncios.aviso", nombre: "Alguien manda un aviso obligatorio", modulo: "anuncios", metodo: "POST", patron: "/api/anuncios" },
  { id: "portafolio.entrega", nombre: "Un estudiante entrega una tarea", modulo: "portafolio", metodo: "POST", patron: "/api/tareas/:id/entrega" },
  { id: "tareas.nueva", nombre: "Un docente publica una tarea", modulo: "tareas-docente", metodo: "POST", patron: "/api/tareas" },
  { id: "tareas.correccion", nombre: "Un docente corrige una entrega", modulo: "tareas-docente", metodo: "POST", patron: "/api/entregas/:id/correccion" },
  { id: "aula.inicio", nombre: "Empieza una clase en vivo", modulo: "aula-virtual", metodo: "POST", patron: "/api/aula/clases/:id/iniciar" },
  { id: "aula.pregunta", nombre: "Llega una pregunta en clase", modulo: "aula-virtual", metodo: "POST", patron: "/api/aula/clases/:id/preguntas" },
  { id: "objetivos.meta", nombre: "Un estudiante crea una meta", modulo: "objetivos", metodo: "POST", patron: "/api/objetivos/metas" },
  { id: "objetivos.habito", nombre: "Un estudiante registra un hábito", modulo: "objetivos", metodo: "PUT", patron: "/api/objetivos/habitos/:id/registro" },
  { id: "biblioteca.recurso", nombre: "Se presenta un recurso", modulo: "biblioteca", metodo: "POST", patron: "/api/biblioteca/recursos" },
  { id: "biblioteca.decision", nombre: "La biblioteca decide sobre un recurso", modulo: "gestion-biblioteca", metodo: "POST", patron: "/api/biblioteca/cola/:id/decidir" },
  { id: "chat.mensaje", nombre: "Se envía un mensaje", modulo: "chat", metodo: "POST", patron: "/api/chat/conversaciones/:id/mensajes" },
  { id: "buzon.queja", nombre: "Llega una queja anónima", modulo: "buzon", metodo: "POST", patron: "/api/quejas", anonimo: true },
  { id: "comunicados.emitido", nombre: "Se emite un comunicado", modulo: "comunicados", metodo: "POST", patron: "/api/comunicados" },
  { id: "comunicados.respuesta", nombre: "Una familia responde un comunicado", modulo: "comunicados", metodo: "POST", patron: "/api/comunicados/:id/responder" },
  { id: "perfiles.alta", nombre: "La dirección da de alta un perfil", modulo: "perfiles", metodo: "POST", patron: "/api/perfiles" },
];

// ── Métricas que puede contar un flujo (nodo «Conteo») ──────────────────────
// Solo TOTALES de la institución en una ventana de días. Ninguna devuelve
// personas, nombres ni contenidos: el Maestro diseña reglas, no espía escuelas.
export const METRICAS = [
  { id: "publicaciones", nombre: "Publicaciones nuevas",
    sql: "SELECT COUNT(*) AS n FROM publicaciones WHERE institucion_id = ? AND eliminado_en IS NULL AND creado_en >= datetime('now', ?)" },
  { id: "comentarios", nombre: "Comentarios",
    sql: "SELECT COUNT(*) AS n FROM comentarios c JOIN usuarios u ON u.id = c.usuario_id WHERE u.institucion_id = ? AND c.eliminado_en IS NULL AND c.creado_en >= datetime('now', ?)" },
  { id: "denuncias-pendientes", nombre: "Denuncias sin resolver",
    sql: "SELECT COUNT(*) AS n FROM denuncias d JOIN usuarios u ON u.id = d.denunciante_id WHERE u.institucion_id = ? AND d.resuelta_en IS NULL AND d.creado_en >= datetime('now', ?)" },
  { id: "quejas", nombre: "Quejas recibidas",
    sql: "SELECT COUNT(*) AS n FROM quejas WHERE institucion_id = ? AND creado_en >= datetime('now', ?)" },
  { id: "quejas-sin-ver", nombre: "Quejas todavía sin ver",
    sql: "SELECT COUNT(*) AS n FROM quejas WHERE institucion_id = ? AND vista_en IS NULL AND creado_en >= datetime('now', ?)" },
  { id: "tareas", nombre: "Tareas publicadas",
    sql: "SELECT COUNT(*) AS n FROM tareas t JOIN catedras ca ON ca.id = t.catedra_id JOIN cursos c ON c.id = ca.curso_id WHERE c.institucion_id = ? AND t.eliminado_en IS NULL AND t.creado_en >= datetime('now', ?)" },
  { id: "entregas", nombre: "Entregas de tareas",
    sql: "SELECT COUNT(*) AS n FROM entregas e JOIN tareas t ON t.id = e.tarea_id JOIN catedras ca ON ca.id = t.catedra_id JOIN cursos c ON c.id = ca.curso_id WHERE c.institucion_id = ? AND e.anulada_en IS NULL AND e.entregado_en >= datetime('now', ?)" },
  { id: "entregas-tarde", nombre: "Entregas fuera de término",
    sql: "SELECT COUNT(*) AS n FROM entregas e JOIN tareas t ON t.id = e.tarea_id JOIN catedras ca ON ca.id = t.catedra_id JOIN cursos c ON c.id = ca.curso_id WHERE c.institucion_id = ? AND e.anulada_en IS NULL AND date(e.entregado_en) > t.fecha_limite AND e.entregado_en >= datetime('now', ?)" },
  { id: "mensajes", nombre: "Mensajes de chat",
    sql: "SELECT COUNT(*) AS n FROM mensajes m JOIN usuarios u ON u.id = m.autor_id WHERE u.institucion_id = ? AND m.enviado_en >= datetime('now', ?)" },
  { id: "eventos", nombre: "Eventos creados",
    sql: "SELECT COUNT(*) AS n FROM eventos WHERE institucion_id = ? AND creado_en >= datetime('now', ?)" },
  { id: "recursos-en-cola", nombre: "Recursos esperando revisión",
    sql: "SELECT COUNT(*) AS n FROM cola_revision cr JOIN recursos r ON r.id = cr.recurso_id WHERE r.institucion_id = ? AND cr.estado = 'pendiente' AND cr.presentado_en >= datetime('now', ?)" },
  { id: "comunicados", nombre: "Comunicados emitidos",
    sql: "SELECT COUNT(*) AS n FROM comunicados WHERE institucion_id = ? AND enviado_en >= datetime('now', ?)" },
];

// ── Algoritmos (slots) ───────────────────────────────────────────────────────
// Cada slot es un punto real del servidor donde una decisión se calcula. El
// algoritmo "nativo" de cada uno ES un grafo de nodos armado con sus
// parámetros: lo que el Maestro ve en el editor es literalmente lo que corre.
function armador() {
  const nodos = [];
  const conexiones = [];
  let k = 0;
  // Las coordenadas se escriben en una grilla compacta y se estiran acá, para
  // que en el editor los nodos (de 214 px de ancho) respiren entre sí.
  const nodo = (tipo, x, y, datos = {}) => {
    const id = "n" + ++k;
    nodos.push({ id, tipo, x: Math.round(x * 1.2), y: Math.round(y * 1.15), datos });
    return id;
  };
  const unir = (de, a, entrada, salida = "valor") => conexiones.push({ de, salida, a, entrada });
  return { nodo, unir, grafo: () => ({ nodos, conexiones }) };
}

export const ALGORITMOS = [
  {
    id: "comunidad.orden-feed", modulo: "comunidad", nombre: "Orden del feed",
    descripcion: "Decide qué publicación aparece primero. Las fijadas por la dirección siempre quedan arriba.",
    salida: "Puntaje: más alto, más arriba.",
    alDesactivar: "Orden cronológico puro: lo más nuevo arriba.",
    admiteGrafo: true,
    entradas: [
      { id: "votosAFavor", nombre: "Votos a favor", rango: [0, 40] },
      { id: "votosEnContra", nombre: "Votos en contra", rango: [0, 15] },
      { id: "comentarios", nombre: "Comentarios", rango: [0, 25] },
      { id: "horas", nombre: "Horas desde que se publicó", rango: [0, 168] },
      { id: "esDireccion", nombre: "La publicó la dirección (1 o 0)", rango: [0, 1] },
    ],
    parametros: [
      { id: "pesoVotos", nombre: "Peso de los votos", min: 0, max: 5, paso: 0.1, defecto: 0 },
      { id: "pesoComentarios", nombre: "Peso de los comentarios", min: 0, max: 5, paso: 0.1, defecto: 0 },
      { id: "pesoDireccion", nombre: "Impulso a la dirección", min: 0, max: 10, paso: 0.5, defecto: 0 },
      { id: "vidaMedia", nombre: "Vida media (horas)", min: 1, max: 336, paso: 1, defecto: 48 },
    ],
    grafoNativo(p) {
      const g = armador();
      const af = g.nodo("entrada", 0, 0, { variable: "votosAFavor" });
      const ec = g.nodo("entrada", 0, 110, { variable: "votosEnContra" });
      const co = g.nodo("entrada", 0, 220, { variable: "comentarios" });
      const di = g.nodo("entrada", 0, 330, { variable: "esDireccion" });
      const ho = g.nodo("entrada", 0, 440, { variable: "horas" });
      const balance = g.nodo("restar", 240, 40);
      g.unir(af, balance, "a"); g.unir(ec, balance, "b");
      const mVotos = g.nodo("multiplicar", 470, 40, { en: { b: p.pesoVotos } });
      g.unir(balance, mVotos, "a");
      const mCom = g.nodo("multiplicar", 470, 200, { en: { b: p.pesoComentarios } });
      g.unir(co, mCom, "a");
      const mDir = g.nodo("multiplicar", 470, 330, { en: { b: p.pesoDireccion } });
      g.unir(di, mDir, "a");
      const s1 = g.nodo("sumar", 700, 110);
      g.unir(mVotos, s1, "a"); g.unir(mCom, s1, "b");
      const s2 = g.nodo("sumar", 920, 200);
      g.unir(s1, s2, "a"); g.unir(mDir, s2, "b");
      const base = g.nodo("sumar", 1140, 200, { en: { b: 1 } });
      g.unir(s2, base, "a");
      const piso = g.nodo("maximo", 1360, 200, { en: { b: 0.05 } });
      g.unir(base, piso, "a");
      const dec = g.nodo("decaimiento", 1140, 420, { en: { vida: p.vidaMedia } });
      g.unir(ho, dec, "x");
      const final = g.nodo("multiplicar", 1580, 300);
      g.unir(piso, final, "a"); g.unir(dec, final, "b");
      const out = g.nodo("salida", 1800, 300);
      g.unir(final, out, "valor");
      return g.grafo();
    },
  },
  {
    // ── Tendencias de la escuela ────────────────────────────────────────────
    // Qué se está moviendo AHORA en la comunidad. Las variables las calcula
    // servidor/tendencias.js sobre la ventana de días, contando solo lo que
    // hicieron OTRAS personas (el autor no se impulsa a sí mismo):
    //
    //   energía   = pesoVotos·(a favor − en contra) + pesoComentarios·comentarios
    //               + pesoPosturas·posturas + pesoPulso·pulso
    //   alcance   = ln(1 + personas distintas)       ← 30 comentarios de UNA
    //                                                   persona no son tendencia
    //   confianza = 0,5 + Wilson(a favor, votos)     ← entre 0,5 y 1,5: lo
    //                                                   rechazado o polémico baja
    //   puntaje   = máx(energía, 0) × alcance × confianza
    //
    // El "pulso" es la atención reciente: cada interacción vale 0,5 elevado a
    // (horas que pasaron ÷ vida media), así lo de hoy pesa más que lo de hace
    // cinco días. Además se exige un mínimo de personas distintas. Los mejores
    // de la escuela se PROPONEN a la dirección para salir a lo nacional.
    id: "comunidad.tendencias", modulo: "tendencias", nombre: "Tendencias de la escuela",
    descripcion: "Qué se está moviendo ahora: energía reciente × cuántas personas distintas participan × qué tan bien recibido es. El autor no se impulsa a sí mismo.",
    salida: "Puntaje: más alto, más arriba. Entra lo que supera el mínimo y reúne suficientes personas.",
    alDesactivar: "La pestaña Tendencias queda vacía y no se proponen tendencias a lo nacional.",
    admiteGrafo: true,
    entradas: [
      { id: "aFavor", nombre: "Votos a favor (de otras personas)", rango: [0, 25] },
      { id: "enContra", nombre: "Votos en contra", rango: [0, 8] },
      { id: "comentarios", nombre: "Comentarios", rango: [0, 20] },
      { id: "posturas", nombre: "Posturas en el debate", rango: [0, 15] },
      { id: "participantes", nombre: "Personas distintas que participaron", rango: [1, 30] },
      { id: "pulso", nombre: "Pulso (atención reciente, con decaimiento)", rango: [0, 25] },
      { id: "horas", nombre: "Horas desde que se publicó", rango: [0, 168] },
      { id: "balance", nombre: "Balance de votos (a favor − en contra)", rango: [-5, 25] },
    ],
    parametros: [
      { id: "pesoVotos", nombre: "Peso de los votos", min: 0, max: 5, paso: 0.1, defecto: 1 },
      { id: "pesoComentarios", nombre: "Peso de los comentarios", min: 0, max: 5, paso: 0.1, defecto: 1.5 },
      { id: "pesoPosturas", nombre: "Peso de las posturas", min: 0, max: 5, paso: 0.1, defecto: 2 },
      { id: "pesoPulso", nombre: "Peso del pulso reciente", min: 0, max: 5, paso: 0.1, defecto: 1.5 },
      { id: "ventanaDias", nombre: "Ventana (días)", min: 1, max: 60, paso: 1, defecto: 7, fueraDelGrafo: true },
      { id: "vidaMedia", nombre: "Vida media del pulso (horas)", min: 1, max: 336, paso: 1, defecto: 36, fueraDelGrafo: true },
      { id: "minParticipantes", nombre: "Personas distintas mínimas", min: 1, max: 20, paso: 1, defecto: 2, fueraDelGrafo: true },
      { id: "minimo", nombre: "Puntaje mínimo para entrar", min: 0, max: 100, paso: 0.5, defecto: 1, fueraDelGrafo: true },
      { id: "candidatas", nombre: "Cuántas proponer a lo nacional (0 = ninguna)", min: 0, max: 10, paso: 1, defecto: 3, fueraDelGrafo: true },
      { id: "umbralNacional", nombre: "Puntaje mínimo para proponer a lo nacional", min: 0, max: 500, paso: 1, defecto: 15, fueraDelGrafo: true },
    ],
    grafoNativo(p) {
      const g = armador();
      const af = g.nodo("entrada", 0, 0, { variable: "aFavor" });
      const ec = g.nodo("entrada", 0, 110, { variable: "enContra" });
      const co = g.nodo("entrada", 0, 230, { variable: "comentarios" });
      const po = g.nodo("entrada", 0, 340, { variable: "posturas" });
      const pu = g.nodo("entrada", 0, 450, { variable: "pulso" });
      const pa = g.nodo("entrada", 0, 580, { variable: "participantes" });
      // Energía
      const bal = g.nodo("restar", 240, 40);
      g.unir(af, bal, "a"); g.unir(ec, bal, "b");
      const mV = g.nodo("multiplicar", 470, 40, { en: { b: p.pesoVotos } });
      g.unir(bal, mV, "a");
      const mC = g.nodo("multiplicar", 470, 200, { en: { b: p.pesoComentarios } });
      g.unir(co, mC, "a");
      const mP = g.nodo("multiplicar", 470, 330, { en: { b: p.pesoPosturas } });
      g.unir(po, mP, "a");
      const mPu = g.nodo("multiplicar", 470, 450, { en: { b: p.pesoPulso } });
      g.unir(pu, mPu, "a");
      const s1 = g.nodo("sumar", 700, 110);
      g.unir(mV, s1, "a"); g.unir(mC, s1, "b");
      const s2 = g.nodo("sumar", 700, 390);
      g.unir(mP, s2, "a"); g.unir(mPu, s2, "b");
      const energia = g.nodo("sumar", 930, 250);
      g.unir(s1, energia, "a"); g.unir(s2, energia, "b");
      const piso = g.nodo("maximo", 1160, 250, { en: { b: 0 } });
      g.unir(energia, piso, "a");
      // Alcance: personas distintas, en escala logarítmica
      const alcance = g.nodo("log", 470, 600);
      g.unir(pa, alcance, "x");
      // Confianza: Wilson de los votos, corrido a [0,5 ; 1,5]
      const total = g.nodo("sumar", 240, 720);
      g.unir(af, total, "a"); g.unir(ec, total, "b");
      const wilson = g.nodo("wilson", 470, 720);
      g.unir(af, wilson, "positivos"); g.unir(total, wilson, "total");
      const confianza = g.nodo("sumar", 700, 720, { en: { b: 0.5 } });
      g.unir(wilson, confianza, "a");
      // Puntaje
      const m1 = g.nodo("multiplicar", 1390, 400);
      g.unir(piso, m1, "a"); g.unir(alcance, m1, "b");
      const m2 = g.nodo("multiplicar", 1620, 540);
      g.unir(m1, m2, "a"); g.unir(confianza, m2, "b");
      const out = g.nodo("salida", 1850, 540);
      g.unir(m2, out, "valor");
      return g.grafo();
    },
  },
  {
    id: "aula.alerta-ritmo", modulo: "aula-virtual", nombre: "Alerta de ritmo",
    descripcion: "Decide si el ritmo de una clase en vivo está en problemas (y avisa al docente si se sostiene).",
    salida: "1 = el ritmo está superado; 0 = todo bien.",
    alDesactivar: "No se envían alertas de ritmo.",
    admiteGrafo: true,
    entradas: [
      { id: "pctEnRiesgo", nombre: "% del curso perdido o más o menos", rango: [0, 100] },
      { id: "total", nombre: "Estudiantes que marcaron pulso", rango: [0, 35] },
      { id: "umbral", nombre: "Umbral de la clase (%)", rango: [5, 60] },
    ],
    parametros: [
      { id: "umbralPct", nombre: "Umbral inicial de cada clase (%)", min: 1, max: 100, paso: 1, defecto: 20, fueraDelGrafo: true },
      { id: "umbralMin", nombre: "Minutos sostenidos antes de avisar", min: 0, max: 60, paso: 1, defecto: 3, fueraDelGrafo: true },
    ],
    grafoNativo() {
      const g = armador();
      const pct = g.nodo("entrada", 0, 0, { variable: "pctEnRiesgo" });
      const umb = g.nodo("entrada", 0, 140, { variable: "umbral" });
      const tot = g.nodo("entrada", 0, 280, { variable: "total" });
      const supera = g.nodo("mayor-igual", 260, 60);
      g.unir(pct, supera, "a"); g.unir(umb, supera, "b");
      const hay = g.nodo("mayor", 260, 280, { en: { b: 0 } });
      g.unir(tot, hay, "a");
      const y = g.nodo("y", 500, 160);
      g.unir(supera, y, "a"); g.unir(hay, y, "b");
      const out = g.nodo("salida", 720, 160);
      g.unir(y, out, "valor");
      return g.grafo();
    },
  },
  {
    id: "biblioteca.orden-catalogo", modulo: "biblioteca", nombre: "Orden del catálogo",
    descripcion: "En qué orden se listan los recursos aprobados de la biblioteca.",
    salida: "Puntaje: más alto, más arriba.",
    alDesactivar: "Orden por fecha: lo más nuevo arriba.",
    admiteGrafo: true,
    entradas: [
      { id: "votosAFavor", nombre: "Votos a favor", rango: [0, 30] },
      { id: "votosEnContra", nombre: "Votos en contra", rango: [0, 10] },
      { id: "dias", nombre: "Días desde que se cargó", rango: [0, 365] },
    ],
    parametros: [
      { id: "pesoVotos", nombre: "Peso de los votos", min: 0, max: 5, paso: 0.1, defecto: 0 },
      { id: "vidaMedia", nombre: "Vida media (días)", min: 1, max: 730, paso: 1, defecto: 30 },
    ],
    grafoNativo(p) {
      const g = armador();
      const af = g.nodo("entrada", 0, 0, { variable: "votosAFavor" });
      const ec = g.nodo("entrada", 0, 140, { variable: "votosEnContra" });
      const di = g.nodo("entrada", 0, 300, { variable: "dias" });
      const bal = g.nodo("restar", 240, 60);
      g.unir(af, bal, "a"); g.unir(ec, bal, "b");
      const m = g.nodo("multiplicar", 470, 60, { en: { b: p.pesoVotos } });
      g.unir(bal, m, "a");
      const base = g.nodo("sumar", 690, 60, { en: { b: 1 } });
      g.unir(m, base, "a");
      const piso = g.nodo("maximo", 910, 60, { en: { b: 0.05 } });
      g.unir(base, piso, "a");
      const dec = g.nodo("decaimiento", 690, 300, { en: { vida: p.vidaMedia } });
      g.unir(di, dec, "x");
      const f = g.nodo("multiplicar", 1130, 170);
      g.unir(piso, f, "a"); g.unir(dec, f, "b");
      const out = g.nodo("salida", 1350, 170);
      g.unir(f, out, "valor");
      return g.grafo();
    },
  },
  {
    id: "objetivos.racha", modulo: "objetivos", nombre: "Racha de hábitos",
    descripcion: "Cuántos días seguidos lleva un hábito. Los días de gracia perdonan huecos sin cortar la racha.",
    alDesactivar: "Las rachas se muestran en cero.",
    admiteGrafo: false,
    entradas: [],
    parametros: [{ id: "diasGracia", nombre: "Días de gracia", min: 0, max: 3, paso: 1, defecto: 0 }],
  },
  {
    id: "perfiles.papelera", modulo: "perfiles", nombre: "Purga de la papelera",
    descripcion: "Cuántos días sobrevive un perfil en la papelera antes de borrarse para siempre.",
    alDesactivar: "Los perfiles quedan en la papelera hasta que alguien los restaure.",
    admiteGrafo: false,
    entradas: [],
    parametros: [{ id: "dias", nombre: "Días en la papelera", min: 1, max: 90, paso: 1, defecto: 7 }],
  },
  {
    id: "calendario.limpieza", modulo: "calendario", nombre: "Limpieza de eventos viejos",
    descripcion: "Cuántos meses se conservan los eventos que ya pasaron.",
    alDesactivar: "Los eventos pasados no se borran nunca.",
    admiteGrafo: false,
    entradas: [],
    parametros: [{ id: "meses", nombre: "Meses que se conservan", min: 1, max: 60, paso: 1, defecto: 12 }],
  },
];
const ALGORITMO_POR_ID = new Map(ALGORITMOS.map((a) => [a.id, a]));

// ── Tendencias NACIONALES (algoritmo de plataforma) ──────────────────────────
// No vive en el genoma de ninguna escuela: es UNO para toda la plataforma y lo
// calibra el Maestro. Si cada escuela pudiera tocarlo, podría inflar sus propios
// números para ganar la tabla nacional. Solo puntúa contenido que la DIRECCIÓN
// de su escuela aprobó para salir a lo nacional, y lo compara entre escuelas de
// tamaños muy distintos:
//
//   proporción = personas ÷ comunidad de su escuela      (0 a 1)
//   impacto    = ln(1 + personas) × (1 + pesoProporción · proporción)
//   momento    = 1 + pesoMomento · ln(1 + pulso)
//   confianza  = 0,5 + Wilson(a favor, votos)
//   puntaje    = impacto × momento × confianza
//
// Así una escuela chica con media comunidad movilizada compite de igual a igual
// con una grande donde participó una décima parte. Después del puntaje se
// aplica un tope de tendencias por escuela, para que una sola no copie la tabla.
export const ALGORITMO_NACIONAL = {
  id: "plataforma.tendencias-nacionales", modulo: "tendencias", nombre: "Tendencias nacionales",
  descripcion: "Entre lo que cada dirección aprobó para lo nacional: impacto (personas, relativo al tamaño de su escuela) × momento reciente × confianza de los votos.",
  salida: "Puntaje nacional: más alto, más arriba. Máximo de tendencias por escuela.",
  alDesactivar: "La pestaña Nacional queda vacía (las aprobaciones de las direcciones se conservan).",
  admiteGrafo: true,
  entradas: [
    { id: "participantes", nombre: "Personas distintas que participaron", rango: [3, 120] },
    { id: "comunidad", nombre: "Personas de su escuela con acceso a Comunidad", rango: [20, 900] },
    { id: "pulso", nombre: "Pulso (atención reciente, con decaimiento)", rango: [0, 80] },
    { id: "aFavor", nombre: "Votos a favor", rango: [0, 80] },
    { id: "enContra", nombre: "Votos en contra", rango: [0, 20] },
    { id: "comentarios", nombre: "Comentarios", rango: [0, 60] },
    { id: "posturas", nombre: "Posturas en el debate", rango: [0, 40] },
    { id: "horas", nombre: "Horas desde que se publicó", rango: [0, 336] },
  ],
  parametros: [
    { id: "pesoProporcion", nombre: "Peso de la proporción de la escuela", min: 0, max: 10, paso: 0.5, defecto: 4 },
    { id: "pesoMomento", nombre: "Peso del momento reciente", min: 0, max: 3, paso: 0.1, defecto: 0.6 },
    { id: "ventanaDias", nombre: "Ventana (días)", min: 1, max: 60, paso: 1, defecto: 14, fueraDelGrafo: true },
    { id: "vidaMedia", nombre: "Vida media del pulso (horas)", min: 6, max: 336, paso: 1, defecto: 72, fueraDelGrafo: true },
    { id: "minParticipantes", nombre: "Personas distintas mínimas", min: 1, max: 50, paso: 1, defecto: 3, fueraDelGrafo: true },
    { id: "maxPorEscuela", nombre: "Máximo de tendencias por escuela", min: 1, max: 20, paso: 1, defecto: 3, fueraDelGrafo: true },
    { id: "minimo", nombre: "Puntaje mínimo para entrar", min: 0, max: 100, paso: 0.5, defecto: 1, fueraDelGrafo: true },
  ],
  grafoNativo(p) {
    const g = armador();
    const pa = g.nodo("entrada", 0, 0, { variable: "participantes" });
    const co = g.nodo("entrada", 0, 150, { variable: "comunidad" });
    const pu = g.nodo("entrada", 0, 320, { variable: "pulso" });
    const af = g.nodo("entrada", 0, 460, { variable: "aFavor" });
    const ec = g.nodo("entrada", 0, 580, { variable: "enContra" });
    // Impacto: personas, en escala logarítmica, potenciado por la proporción.
    const logPa = g.nodo("log", 240, 0);
    g.unir(pa, logPa, "x");
    const comunidad = g.nodo("maximo", 240, 150, { en: { b: 1 } });
    g.unir(co, comunidad, "a");
    const proporcion = g.nodo("dividir", 470, 120);
    g.unir(pa, proporcion, "a"); g.unir(comunidad, proporcion, "b");
    const acotada = g.nodo("limitar", 700, 120, { en: { min: 0, max: 1 } });
    g.unir(proporcion, acotada, "x");
    const peso = g.nodo("multiplicar", 930, 120, { en: { b: p.pesoProporcion } });
    g.unir(acotada, peso, "a");
    const factor = g.nodo("sumar", 1160, 120, { en: { b: 1 } });
    g.unir(peso, factor, "a");
    const impacto = g.nodo("multiplicar", 1390, 60);
    g.unir(logPa, impacto, "a"); g.unir(factor, impacto, "b");
    // Momento: atención reciente, también logarítmica.
    const logPu = g.nodo("log", 240, 320);
    g.unir(pu, logPu, "x");
    const pesoMomento = g.nodo("multiplicar", 470, 320, { en: { b: p.pesoMomento } });
    g.unir(logPu, pesoMomento, "a");
    const momento = g.nodo("sumar", 700, 320, { en: { b: 1 } });
    g.unir(pesoMomento, momento, "a");
    // Confianza de los votos.
    const total = g.nodo("sumar", 240, 560);
    g.unir(af, total, "a"); g.unir(ec, total, "b");
    const wilson = g.nodo("wilson", 470, 500);
    g.unir(af, wilson, "positivos"); g.unir(total, wilson, "total");
    const confianza = g.nodo("sumar", 700, 500, { en: { b: 0.5 } });
    g.unir(wilson, confianza, "a");
    // Puntaje nacional.
    const m1 = g.nodo("multiplicar", 1620, 200);
    g.unir(impacto, m1, "a"); g.unir(momento, m1, "b");
    const m2 = g.nodo("multiplicar", 1850, 340);
    g.unir(m1, m2, "a"); g.unir(confianza, m2, "b");
    const out = g.nodo("salida", 2080, 340);
    g.unir(m2, out, "valor");
    return g.grafo();
  },
};

// Todos los slots que el editor de nodos sabe abrir (los de cada escuela y el
// nacional de plataforma).
const SLOT_POR_ID = new Map([...ALGORITMO_POR_ID, [ALGORITMO_NACIONAL.id, ALGORITMO_NACIONAL]]);
export const slotPorId = (id) => SLOT_POR_ID.get(id) ?? null;

export const TEMA_BASE = Object.freeze({
  acento: "#4f46e5",
  primario: "#a5b4fc",
  secundario: "#c4b5fd",
  terciario: "#fbbf24",
  fondo: "#0e1014",
  superficie: "#1a1d24",
  radio: 10,
  movimiento: "normal",
});
export const COLORES_TEMA = ["acento", "primario", "secundario", "terciario", "fondo", "superficie"];
const MOVIMIENTOS = ["sereno", "normal", "vibrante"];

// ── Rutas → patrones ─────────────────────────────────────────────────────────
function compilarPatron(patron) {
  const escapado = patron.split("/").map((seg) =>
    seg.startsWith(":") ? "[^/]+" : seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  ).join("/");
  return new RegExp("^" + escapado + "/?$");
}

const CONDICIONES = {
  conAudiencia: (cuerpo) => (Array.isArray(cuerpo?.audiencia) && cuerpo.audiencia.length > 0) || (Array.isArray(cuerpo?.visibilidades) && cuerpo.visibilidades.length > 0),
  recurrente: (cuerpo) => Boolean(cuerpo?.recurrencia && typeof cuerpo.recurrencia === "object" && cuerpo.recurrencia.frecuencia),
  obligatorio: (cuerpo) => cuerpo?.obligatorio === true,
  confirmacion: (cuerpo) => cuerpo?.pideConfirmacion === true,
  avisar: (cuerpo) => cuerpo?.avisar === true,
  programado: (cuerpo) => cuerpo?.publicarEn !== undefined && cuerpo?.publicarEn !== null && cuerpo?.publicarEn !== "",
  conImagen: (cuerpo) => cuerpo?.imagenId !== undefined && cuerpo?.imagenId !== null && cuerpo?.imagenId !== "",
  conHilo: (cuerpo) => Array.isArray(cuerpo?.hilo) && cuerpo.hilo.length > 0,
  conEncuesta: (cuerpo) => Boolean(cuerpo?.encuesta && Array.isArray(cuerpo.encuesta.opciones)),
  conCita: (cuerpo) => cuerpo?.citaId !== undefined && cuerpo?.citaId !== null && cuerpo?.citaId !== "",
  conArchivo: (cuerpo) => cuerpo?.archivoId !== undefined && cuerpo?.archivoId !== null && cuerpo?.archivoId !== "",
};

const REGLAS_FUNCION = [];
for (const m of MODULOS) {
  for (const f of m.funciones) {
    for (const [metodo, patron, condicion] of f.rutas) {
      REGLAS_FUNCION.push({ metodo, re: compilarPatron(patron), condicion: condicion ? CONDICIONES[condicion] : null, funcion: f, modulo: m.id });
    }
  }
}
const FUNCION_POR_ID = new Map();
for (const m of MODULOS) for (const f of m.funciones) FUNCION_POR_ID.set(f.id, { ...f, modulo: m.id });

const REGLAS_MODULO = [];
for (const m of MODULOS) {
  for (const r of m.rutas ?? []) REGLAS_MODULO.push({ prefijo: r.prefijo, arquetipos: r.arquetipos ?? null, modulo: m.id });
}
const REGLAS_EVENTO = EVENTOS.map((ev) => ({ ...ev, re: compilarPatron(ev.patron) }));

/** Funciones del catálogo que corresponden a este pedido. */
export function funcionesDeRuta(metodo, ruta, cuerpo) {
  return REGLAS_FUNCION
    .filter((r) => r.metodo === metodo && r.re.test(ruta) && (!r.condicion || r.condicion(cuerpo)))
    .map((r) => r.funcion);
}

/** Módulos dueños de un prefijo de API (para ventanillas sin exigirAcceso). */
export function modulosDeRuta(ruta, arquetipo) {
  return REGLAS_MODULO
    .filter((r) => (ruta === r.prefijo || ruta.startsWith(r.prefijo + "/")) && (!r.arquetipos || r.arquetipos.includes(arquetipo)))
    .map((r) => r.modulo);
}

/** El evento que produce este pedido de escritura, si produce alguno. */
export function eventoDeRuta(metodo, ruta) {
  return REGLAS_EVENTO.find((r) => r.metodo === metodo && r.re.test(ruta)) ?? null;
}

// ── Genoma por defecto ───────────────────────────────────────────────────────
function parametrosPorDefecto(algoritmo) {
  return Object.fromEntries(algoritmo.parametros.map((p) => [p.id, p.defecto]));
}

export function perfilPorDefecto(arquetipo) {
  const a = ARQUETIPOS.find((x) => x.id === arquetipo);
  return { clave: a.id, arquetipo: a.id, nombre: a.nombre, color: a.color, icono: a.icono, predeterminado: true, inicio: "", modulos: {} };
}

export function genomaPorDefecto(nombre = "Nueva instancia") {
  return {
    version: 1,
    personalizacion: normalizarPersonalizacion(),
    identidad: { nombre: String(nombre).slice(0, 80), lema: "", icono: "hub", dominio: "", semilla: 1 },
    tema: { ...TEMA_BASE },
    // Jerarquía del menú: secciones con nombre (vacío = todo en "Mi espacio").
    secciones: [],
    modulos: Object.fromEntries(MODULOS.map((m, i) => [m.id, { oculto: false, orden: i, etiqueta: "", icono: "", seccion: "", funciones: {} }])),
    algoritmos: Object.fromEntries(ALGORITMOS.map((a) => [a.id, {
      activo: true, variante: "nativo", parametros: parametrosPorDefecto(a), grafo: null, aprobacion: null,
    }])),
    perfiles: ARQUETIPOS.map((a) => perfilPorDefecto(a.id)),
    capacidades: Object.fromEntries(CAPACIDADES.map((c) => [c.id, [...c.porDefecto]])),
    jerarquia: {
      niveles: JERARQUIA_BASE.niveles.map((n) => ({ ...n })),
      perfiles: Object.fromEntries(ARQUETIPOS.map((a) => [a.id, JERARQUIA_BASE.niveles[NIVEL_DE_ARQUETIPO[a.id]].id])),
    },
    flujos: [],
  };
}

// ── Normalización / validación ──────────────────────────────────────────────
const texto = (v, largo) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, largo);
const color = (v, defecto) => (/^#[0-9a-f]{6}$/i.test(String(v ?? "")) ? String(v).toLowerCase() : defecto);
const icono = (v, defecto = "") => (/^[a-z0-9_]{1,40}$/.test(String(v ?? "")) ? String(v) : defecto);
const entero = (v, min, max, defecto) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : defecto;
};
/** Luminancia relativa WCAG de un color "#rrggbb" (0 = negro, 1 = blanco). */
export function luminancia(hex) {
  const canal = (i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
}
const CLAVE_PERFIL = /^[a-z0-9][a-z0-9-]{1,39}$/;
const ID_FLUJO = /^[a-z0-9][a-z0-9-]{1,39}$/;

function normalizarFunciones(modulo, crudas) {
  const fuente = crudas && typeof crudas === "object" ? crudas : {};
  const r = {};
  for (const f of modulo.funciones) if (fuente[f.id] === false) r[f.id] = false;
  return r;
}

function normalizarModuloInstancia(modulo, crudo, orden, idsSeccion) {
  const c = crudo && typeof crudo === "object" ? crudo : {};
  const seccion = String(c.seccion ?? "");
  return {
    oculto: c.oculto === true,
    orden: entero(c.orden, 0, 999, orden),
    etiqueta: texto(c.etiqueta, 40),
    icono: icono(c.icono),
    // La sección del menú donde vive ("" = "Mi espacio"). Una sección que ya no
    // existe devuelve el módulo a "Mi espacio".
    seccion: idsSeccion.has(seccion) ? seccion : "",
    funciones: normalizarFunciones(modulo, c.funciones),
  };
}

const ID_SECCION = /^[a-z0-9][a-z0-9-]{0,39}$/;
const ID_NIVEL = /^[a-z0-9][a-z0-9-]{0,39}$/;

/**
 * La jerarquía llevada a algo válido: entre 2 y 6 niveles con nombre, cada
 * perfil en un nivel que existe (si no, el de fábrica de su arquetipo) y la
 * dirección siempre arriba, compartiendo con todos.
 */
function normalizarJerarquia(crudo, perfiles) {
  const c = crudo && typeof crudo === "object" ? crudo : {};
  let niveles = [];
  const vistos = new Set();
  for (const n of Array.isArray(c.niveles) ? c.niveles.slice(0, MAX_NIVELES) : []) {
    if (!n || typeof n !== "object") continue;
    const id = String(n.id ?? "");
    const nombre = texto(n.nombre, 40);
    if (!ID_NIVEL.test(id) || vistos.has(id) || !nombre) continue;
    vistos.add(id);
    niveles.push({ id, nombre, politica: POLITICAS_NIVEL.includes(n.politica) ? n.politica : "nivel-y-abajo" });
  }
  if (niveles.length < 2) niveles = JERARQUIA_BASE.niveles.map((n) => ({ ...n }));
  niveles[0].politica = "nivel-y-abajo";
  const ids = new Set(niveles.map((n) => n.id));
  const cp = c.perfiles && typeof c.perfiles === "object" ? c.perfiles : {};
  const asignacion = {};
  for (const p of perfiles) {
    const pedido = String(cp[p.clave] ?? "");
    const porDefecto = niveles[Math.min(NIVEL_DE_ARQUETIPO[p.arquetipo] ?? niveles.length - 1, niveles.length - 1)].id;
    asignacion[p.clave] = p.clave === "admin-academico" ? niveles[0].id : ids.has(pedido) ? pedido : porDefecto;
  }
  return { niveles, perfiles: asignacion };
}
const MAX_SECCIONES = 12;

/** Las secciones del menú: id, nombre e ícono, en el orden en que se muestran. */
function normalizarSecciones(crudas) {
  const lista = Array.isArray(crudas) ? crudas.slice(0, MAX_SECCIONES) : [];
  const vistas = new Set();
  const secciones = [];
  for (const s of lista) {
    if (!s || typeof s !== "object") continue;
    const id = String(s.id ?? "");
    const nombre = texto(s.nombre, 30);
    if (!ID_SECCION.test(id) || vistas.has(id) || !nombre) continue;
    vistas.add(id);
    secciones.push({ id, nombre, icono: icono(s.icono) });
  }
  return secciones;
}

function normalizarModuloPerfil(modulo, crudo) {
  if (!crudo || typeof crudo !== "object") return null;
  const r = {};
  if (crudo.oculto === true) r.oculto = true;
  if (crudo.orden !== undefined && crudo.orden !== null && crudo.orden !== "") r.orden = entero(crudo.orden, 0, 999, 0);
  const et = texto(crudo.etiqueta, 40);
  if (et) r.etiqueta = et;
  const ic = icono(crudo.icono);
  if (ic) r.icono = ic;
  const fs = normalizarFunciones(modulo, crudo.funciones);
  if (Object.keys(fs).length) r.funciones = fs;
  return Object.keys(r).length ? r : null;
}

function normalizarPerfil(crudo, existentes) {
  const c = crudo && typeof crudo === "object" ? crudo : {};
  const arquetipo = String(c.arquetipo ?? "");
  if (!IDS_ARQUETIPO.has(arquetipo)) return null;
  const predeterminado = c.predeterminado === true && c.clave === arquetipo;
  const clave = predeterminado ? arquetipo : String(c.clave ?? "");
  if (!predeterminado && (!CLAVE_PERFIL.test(clave) || IDS_ARQUETIPO.has(clave))) {
    throw new ErrorGenoma(`El perfil «${texto(c.nombre, 40) || clave}» necesita una clave válida (minúsculas, números y guiones).`);
  }
  if (existentes.has(clave)) throw new ErrorGenoma(`Hay dos perfiles con la clave «${clave}».`);
  const base = perfilPorDefecto(arquetipo);
  const nombre = texto(c.nombre, 40) || (predeterminado ? base.nombre : "");
  if (!nombre) throw new ErrorGenoma("Cada perfil necesita un nombre.");
  const modulos = {};
  const cm = c.modulos && typeof c.modulos === "object" ? c.modulos : {};
  for (const m of MODULOS) {
    if (!arquetiposDeModulo(m.id).includes(arquetipo)) continue;
    const n = normalizarModuloPerfil(m, cm[m.id]);
    if (n) modulos[m.id] = n;
  }
  const inicio = MODULO_POR_ID.has(String(c.inicio ?? "")) && arquetiposDeModulo(String(c.inicio)).includes(arquetipo)
    ? String(c.inicio) : "";
  return {
    clave,
    arquetipo,
    nombre,
    color: color(c.color, base.color),
    icono: icono(c.icono, base.icono),
    predeterminado,
    inicio,
    modulos,
  };
}

/** ¿Este destino de un aviso existe en el genoma? */
function validadorDestinos(perfiles) {
  const claves = new Set(perfiles.map((p) => p.clave));
  return (destino) => {
    if (destino === "actor" || destino === "direccion") return true;
    if (destino.startsWith("arquetipo:")) return IDS_ARQUETIPO.has(destino.slice(10));
    if (destino.startsWith("perfil:")) return claves.has(destino.slice(7));
    return false;
  };
}

const IDS_EVENTO = EVENTOS.map((e) => e.id);
const IDS_METRICA = METRICAS.map((m) => m.id);

function aprobacionValida(aprobacion, grafo) {
  return Boolean(aprobacion && typeof aprobacion === "object" && aprobacion.huella === huellaGrafo(grafo));
}

function limpiarAprobacion(a) {
  if (!a || typeof a !== "object") return null;
  return {
    huella: texto(a.huella, 16),
    probabilidad: sano(a.probabilidad),
    media: sano(a.media),
    iteraciones: entero(a.iteraciones, 0, 100000, 0),
    aprobadoEn: texto(a.aprobadoEn, 30),
  };
}

/**
 * La configuración de UN algoritmo (activo, variante, parámetros, grafo y
 * aprobación) llevada a algo válido. La usan los slots de cada escuela y el
 * algoritmo nacional de la plataforma. Con `estricto` lanza ante lo que
 * necesita atención (un personalizado sin grafo o sin aprobación vigente).
 */
function normalizarAlgoritmo(a, crudo, estricto) {
  const x = crudo && typeof crudo === "object" ? crudo : {};
  const parametros = {};
  for (const p of a.parametros) {
    const v = Number(x.parametros?.[p.id]);
    parametros[p.id] = Number.isFinite(v) ? Math.max(p.min, Math.min(p.max, v)) : p.defecto;
  }
  let variante = a.admiteGrafo && x.variante === "personalizado" ? "personalizado" : "nativo";
  let grafo = null;
  let aprobacion = limpiarAprobacion(x.aprobacion);
  if (a.admiteGrafo && x.grafo) {
    try {
      grafo = validarGrafo(x.grafo, { modo: "algoritmo", variables: a.entradas.map((v) => v.id) });
    } catch (err) {
      if (estricto && variante === "personalizado") throw new ErrorGenoma(`Algoritmo «${a.nombre}»: ${err.message}`);
      grafo = null;
    }
  }
  if (variante === "personalizado") {
    if (!grafo) {
      if (estricto) throw new ErrorGenoma(`El algoritmo «${a.nombre}» está en modo personalizado pero no tiene grafo.`);
      variante = "nativo";
    } else if (!aprobacionValida(aprobacion, grafo)) {
      if (estricto) {
        throw new ErrorGenoma(`El algoritmo personalizado «${a.nombre}» cambió desde su aprobación: simulalo y aprobalo antes de guardarlo.`);
      }
      variante = "nativo";
    }
  }
  if (grafo && !aprobacionValida(aprobacion, grafo)) aprobacion = null;
  return { activo: x.activo !== false, variante, parametros, grafo, aprobacion };
}

/**
 * Lleva cualquier cosa que mande la vidriera (o lo guardado) a un genoma
 * válido y completo. Con `estricto` lanza ErrorGenoma ante lo que necesita la
 * atención del Maestro (un grafo roto, un flujo activo sin aprobar); sin él
 * (al leer lo guardado) repara en silencio para no tirar abajo una escuela.
 */
export function normalizarGenoma(crudo, { estricto = true, nombreInstitucion } = {}) {
  const c = crudo && typeof crudo === "object" ? crudo : {};
  const base = genomaPorDefecto(nombreInstitucion ?? c.identidad?.nombre ?? "Nueva instancia");
  const id = c.identidad && typeof c.identidad === "object" ? c.identidad : {};
  const tm = c.tema && typeof c.tema === "object" ? c.tema : {};

  const identidad = {
    nombre: texto(id.nombre, 80) || base.identidad.nombre,
    lema: texto(id.lema, 140),
    icono: icono(id.icono, "hub"),
    dominio: /^[a-z0-9.-]{3,80}$/.test(String(id.dominio ?? "").toLowerCase()) ? String(id.dominio).toLowerCase() : "",
    semilla: entero(id.semilla, 0, 2 ** 31 - 1, 1),
  };

  const tema = { ...TEMA_BASE };
  for (const k of COLORES_TEMA) tema[k] = color(tm[k], TEMA_BASE[k]);
  // NEXO es una interfaz oscura: un fondo claro dejaría el texto ilegible en
  // todas las pantallas. Fondo y superficie tienen que ser oscuros.
  for (const k of ["fondo", "superficie"]) if (luminancia(tema[k]) > 0.08) tema[k] = TEMA_BASE[k];
  tema.radio = entero(tm.radio, 4, 28, TEMA_BASE.radio);
  tema.movimiento = MOVIMIENTOS.includes(tm.movimiento) ? tm.movimiento : TEMA_BASE.movimiento;

  const secciones = normalizarSecciones(c.secciones);
  const idsSeccion = new Set(secciones.map((s) => s.id));
  const cm = c.modulos && typeof c.modulos === "object" ? c.modulos : {};
  const modulos = {};
  MODULOS.forEach((m, i) => { modulos[m.id] = normalizarModuloInstancia(m, cm[m.id], i, idsSeccion); });

  const ca = c.algoritmos && typeof c.algoritmos === "object" ? c.algoritmos : {};
  const algoritmos = {};
  for (const a of ALGORITMOS) algoritmos[a.id] = normalizarAlgoritmo(a, ca[a.id], estricto);

  // Perfiles: los siete predeterminados existen siempre (se reponen si faltan);
  // los personalizados se validan uno por uno.
  const crudos = Array.isArray(c.perfiles) ? c.perfiles.slice(0, 60) : [];
  const claves = new Set();
  const perfiles = [];
  for (const a of ARQUETIPOS) {
    const encontrado = crudos.find((p) => p && p.clave === a.id && p.arquetipo === a.id);
    const p = normalizarPerfil({ ...(encontrado ?? perfilPorDefecto(a.id)), clave: a.id, arquetipo: a.id, predeterminado: true }, claves);
    claves.add(p.clave);
    perfiles.push(p);
  }
  for (const crudoPerfil of crudos) {
    if (!crudoPerfil || IDS_ARQUETIPO.has(crudoPerfil.clave)) continue;
    if (perfiles.length >= ARQUETIPOS.length + 40) {
      if (estricto) throw new ErrorGenoma("Una instancia admite hasta 40 perfiles personalizados.");
      break;
    }
    let p;
    try {
      p = normalizarPerfil({ ...crudoPerfil, predeterminado: false }, claves);
    } catch (err) {
      if (estricto) throw err;
      continue;
    }
    if (!p) continue;
    claves.add(p.clave);
    perfiles.push(p);
  }

  const jerarquia = normalizarJerarquia(c.jerarquia, perfiles);
  const capacidades = normalizarCapacidades(c.capacidades, perfiles);

  const destinos = validadorDestinos(perfiles);
  const cf = Array.isArray(c.flujos) ? c.flujos.slice(0, 40) : [];
  const flujos = [];
  const idsFlujo = new Set();
  for (const f of cf) {
    if (!f || typeof f !== "object") continue;
    const idF = String(f.id ?? "");
    if (!ID_FLUJO.test(idF) || idsFlujo.has(idF)) {
      if (estricto) throw new ErrorGenoma("Hay un flujo con un identificador inválido o repetido.");
      continue;
    }
    const nombre = texto(f.nombre, 60) || "Flujo sin nombre";
    let grafo;
    try {
      grafo = validarGrafo(f.grafo, { modo: "flujo", eventos: IDS_EVENTO, metricas: IDS_METRICA, destinos });
    } catch (err) {
      if (estricto) throw new ErrorGenoma(`Flujo «${nombre}»: ${err.message}`);
      continue;
    }
    let aprobacion = limpiarAprobacion(f.aprobacion);
    if (!aprobacionValida(aprobacion, grafo)) aprobacion = null;
    let activo = f.activo === true;
    if (activo && !aprobacion) {
      if (estricto) throw new ErrorGenoma(`El flujo «${nombre}» cambió desde su aprobación: simulalo y aprobalo antes de activarlo.`);
      activo = false;
    }
    idsFlujo.add(idF);
    flujos.push({
      id: idF,
      nombre,
      descripcion: texto(f.descripcion, 200),
      activo,
      limiteHora: entero(f.limiteHora, 1, 500, 30),
      grafo,
      aprobacion,
    });
  }

  let personalizacion;
  try {
    personalizacion = normalizarPersonalizacion(c.personalizacion, { estricto, perfiles });
  } catch (error) {
    throw new ErrorGenoma(error.message);
  }
  return { version: 1, identidad, tema, secciones, modulos, algoritmos, perfiles, jerarquia, capacidades, flujos, personalizacion };
}

// ── Resolución para una persona ─────────────────────────────────────────────

/**
 * Qué perfiles tienen cada capacidad. Solo perfiles que existen y cuyo
 * arquetipo puede tenerla; sin dato, la de fábrica.
 */
function normalizarCapacidades(crudo, perfiles) {
  const c = crudo && typeof crudo === "object" ? crudo : {};
  const salida = {};
  for (const cap of CAPACIDADES) {
    const validos = new Set(perfiles.filter((p) => cap.arquetipos.includes(p.arquetipo)).map((p) => p.clave));
    const pedido = Array.isArray(c[cap.id]) ? c[cap.id].map(String) : cap.porDefecto;
    salida[cap.id] = [...new Set(pedido)].filter((clave) => validos.has(clave));
  }
  return salida;
}

/** ¿Este perfil tiene esta capacidad en su escuela? */
export function tieneCapacidad(genoma, perfilClave, capacidadId) {
  const lista = genoma.capacidades?.[capacidadId] ?? CAPACIDAD_POR_ID.get(capacidadId)?.porDefecto ?? [];
  return lista.includes(perfilClave);
}

/** El nivel de un perfil en la jerarquía de su escuela: índice (0 = arriba) y datos del nivel. */
export function nivelDePerfil(genoma, clave) {
  const { niveles, perfiles } = genoma.jerarquia;
  const indice = Math.max(0, niveles.findIndex((n) => n.id === perfiles[clave]));
  return { indice, ...niveles[indice] };
}

/** El perfil que le toca a un usuario (el personalizado si es de su arquetipo). */
export function perfilDeUsuario(genoma, usuario) {
  if (usuario.perfilClave) {
    const p = genoma.perfiles.find((x) => x.clave === usuario.perfilClave && x.arquetipo === usuario.rol);
    if (p) return p;
  }
  return genoma.perfiles.find((x) => x.clave === usuario.rol) ?? perfilPorDefecto(usuario.rol);
}

/**
 * Lo que ve y puede hacer una persona según el genoma de su escuela: sus
 * módulos (con nombre, ícono y orden ya resueltos), cuáles están ocultos y por
 * qué, y qué funciones tiene apagadas.
 */
export function resolverParaUsuario(genoma, usuario) {
  const perfil = perfilDeUsuario(genoma, usuario);
  const modulos = [];
  const funcionesOff = new Set();
  // Un submódulo (Debates, Tendencias) solo se ve si su módulo padre se ve:
  // comparte ventanillas con Comunidad.
  const propio = (id) => !genoma.modulos[id]?.oculto && !perfil.modulos?.[id]?.oculto;
  MODULOS.forEach((m, i) => {
    if (!arquetiposDeModulo(m.id).includes(usuario.rol)) return;
    const gi = genoma.modulos[m.id] ?? { orden: i, funciones: {} };
    const gp = perfil.modulos?.[m.id] ?? {};
    const padreVisible = !m.padre || propio(m.padre);
    const visible = propio(m.id) && padreVisible;
    modulos.push({
      id: m.id,
      padre: m.padre ?? null,
      paginas: paginasDeModulo(m.id, usuario.rol),
      etiqueta: gp.etiqueta || gi.etiqueta || "",
      icono: gp.icono || gi.icono || "",
      orden: gp.orden ?? gi.orden ?? i,
      seccion: gi.seccion ?? "",
      visible,
      ocultoEn: gi.oculto ? "institucion" : gp.oculto ? "perfil" : !padreVisible ? "padre" : null,
    });
    for (const f of m.funciones) {
      if (!f.arquetipos.includes(usuario.rol)) continue;
      if (!visible || gi.funciones?.[f.id] === false || gp.funciones?.[f.id] === false) funcionesOff.add(f.id);
    }
  });
  modulos.sort((a, b) => a.orden - b.orden);
  // Las capacidades de su perfil, solo si el módulo de cada una está a la vista.
  const visibles = new Set(modulos.filter((m) => m.visible).map((m) => m.id));
  const capacidades = new Set(CAPACIDADES.filter((cap) => visibles.has(cap.modulo) && tieneCapacidad(genoma, perfil.clave, cap.id)).map((cap) => cap.id));
  return { perfil, modulos, visibles, funcionesOff, capacidades };
}

// ── Lectura, caché y guardado ────────────────────────────────────────────────
// El genoma se consulta en cada pedido (la guardia), así que se guarda ya
// interpretado en memoria. Solo este proceso escribe genomas, así que basta con
// olvidar la entrada al guardar.
const cache = new Map();

function entradaDeCache(db, institucionId) {
  let entrada = cache.get(institucionId);
  if (entrada) return entrada;
  const fila = db.prepare("SELECT genoma, version FROM instancia_genomas WHERE institucion_id = ?").get(institucionId);
  const inst = db.prepare("SELECT nombre FROM instituciones WHERE id = ?").get(institucionId);
  let genoma;
  if (fila) {
    try {
      genoma = normalizarGenoma(JSON.parse(fila.genoma), { estricto: false, nombreInstitucion: inst?.nombre });
    } catch {
      genoma = genomaPorDefecto(inst?.nombre);
    }
  } else {
    genoma = genomaPorDefecto(inst?.nombre ?? "Instancia");
  }
  entrada = { version: fila?.version ?? 0, genoma, resoluciones: new Map(), algoritmos: new Map() };
  cache.set(institucionId, entrada);
  return entrada;
}

export function leerGenoma(db, institucionId) {
  return entradaDeCache(db, institucionId).genoma;
}

export function versionDeGenoma(db, institucionId) {
  return entradaDeCache(db, institucionId).version;
}

export function olvidarGenoma(institucionId) {
  cache.delete(institucionId);
}

/** Resolución cacheada por perfil (la guardia la pide en cada pedido). */
export function resolucionDe(db, usuario) {
  const entrada = entradaDeCache(db, usuario.institucionId);
  const clave = usuario.rol + "|" + (usuario.perfilClave ?? "");
  let r = entrada.resoluciones.get(clave);
  if (!r) {
    r = resolverParaUsuario(entrada.genoma, usuario);
    entrada.resoluciones.set(clave, r);
  }
  return r;
}

/**
 * ¿Esta persona puede abrir esta pantalla según el genoma de su escuela? Las
 * pantallas que no son de ningún módulo (núcleo) siempre se pueden abrir.
 */
export function paginaVisible(db, usuario, pagina) {
  if (usuario.institucionId === null || usuario.institucionId === undefined) return true;
  if (PAGINAS_NUCLEO.has(pagina)) return true;
  const modulo = moduloDePagina(pagina, usuario.rol);
  if (!modulo) return true;
  return resolucionDe(db, usuario).visibles.has(modulo);
}

/**
 * Guarda un genoma ya normalizado como nueva versión. `versionBase` permite
 * detectar que alguien (la dirección desocultando un módulo) lo cambió en el
 * medio: en ese caso se rechaza para no pisar su cambio.
 */
export function guardarGenoma(db, institucionId, genoma, { usuarioId = null, autorRol = "maestro", nota = "", versionBase, enTransaccion = false } = {}) {
  const actual = db.prepare("SELECT version FROM instancia_genomas WHERE institucion_id = ?").get(institucionId);
  const versionActual = actual?.version ?? 0;
  if (versionBase !== undefined && versionBase !== null && Number(versionBase) !== versionActual) {
    throw new ErrorGenoma("La instancia cambió mientras la editabas (por ejemplo, la dirección desocultó un módulo). Recargala para no pisar ese cambio.");
  }
  const nueva = versionActual + 1;
  const json = JSON.stringify(genoma);
  // Quien ya abrió una transacción (la Forja crea escuela, cuentas y genoma de
  // un solo golpe) la cierra él; acá solo se escribe.
  if (!enTransaccion) db.exec("BEGIN");
  try {
    if (actual) {
      db.prepare(
        "UPDATE instancia_genomas SET genoma = ?, version = ?, actualizado_en = datetime('now'), actualizado_por = ? WHERE institucion_id = ?"
      ).run(json, nueva, usuarioId, institucionId);
    } else {
      db.prepare(
        "INSERT INTO instancia_genomas (institucion_id, genoma, version, actualizado_por) VALUES (?, ?, ?, ?)"
      ).run(institucionId, json, nueva, usuarioId);
    }
    db.prepare(
      "INSERT INTO genoma_versiones (institucion_id, version, genoma, nota, autor_rol, creado_por) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(institucionId, nueva, json, texto(nota, 200), autorRol, usuarioId);
    if (genoma.identidad?.nombre) {
      db.prepare("UPDATE instituciones SET nombre = ? WHERE id = ?").run(genoma.identidad.nombre, institucionId);
    }
    if (!enTransaccion) db.exec("COMMIT");
  } catch (err) {
    if (!enTransaccion) db.exec("ROLLBACK");
    throw err;
  }
  olvidarGenoma(institucionId);
  return nueva;
}

// ── Algoritmos en tiempo de ejecución ────────────────────────────────────────

/**
 * Lo que un módulo necesita para usar un slot: si está activo, sus parámetros y
 * una función `puntuar(entradas)` que evalúa el grafo vigente (el nativo armado
 * con los parámetros o el personalizado aprobado).
 */
export function algoritmo(db, institucionId, slotId) {
  const def = ALGORITMO_POR_ID.get(slotId);
  if (!def) throw new Error("Slot de algoritmo desconocido: " + slotId);
  if (institucionId === null || institucionId === undefined) {
    const parametros = parametrosPorDefecto(def);
    return { activo: true, parametros, puntuar: def.admiteGrafo ? crearPuntuador(def.grafoNativo(parametros)) : null };
  }
  const entrada = entradaDeCache(db, institucionId);
  let r = entrada.algoritmos.get(slotId);
  if (!r) {
    const config = entrada.genoma.algoritmos[slotId];
    r = { activo: config.activo, parametros: config.parametros, variante: config.variante, puntuar: puntuadorDeConfig(slotId, config) };
    entrada.algoritmos.set(slotId, r);
  }
  return r;
}

function crearPuntuador(grafo) {
  const evaluar = compilarGrafo(grafo);
  return (entradas) => evaluar({ entradas }).salida ?? 0;
}

/**
 * El puntuador de un slot con una configuración dada: el grafo nativo armado
 * con sus parámetros o el personalizado si es el vigente. Lo usa el servidor en
 * cada pedido y el modo edición para previsualizar valores todavía sin guardar.
 * null si el slot no se decide con un grafo.
 */
export function puntuadorDeConfig(slotId, config) {
  const def = ALGORITMO_POR_ID.get(slotId);
  if (!def?.admiteGrafo) return null;
  const grafo = config.variante === "personalizado" && config.grafo
    ? config.grafo
    : validarGrafo(def.grafoNativo(config.parametros), { modo: "algoritmo", variables: def.entradas.map((v) => v.id) });
  return crearPuntuador(grafo);
}

/** El grafo nativo de un slot con ciertos parámetros (para abrirlo en el editor). */
export function grafoNativo(slotId, parametros) {
  const def = SLOT_POR_ID.get(slotId);
  if (!def?.admiteGrafo) return null;
  const p = { ...parametrosPorDefecto(def), ...(parametros ?? {}) };
  return validarGrafo(def.grafoNativo(p), { modo: "algoritmo", variables: def.entradas.map((v) => v.id) });
}

export function opcionesDeGrafo(modo, { slotId, genoma } = {}) {
  if (modo === "algoritmo") {
    const def = SLOT_POR_ID.get(slotId);
    if (!def?.admiteGrafo) throw new ErrorGenoma("Ese algoritmo no admite grafos.");
    return { modo, variables: def.entradas.map((v) => v.id) };
  }
  const perfiles = genoma?.perfiles ?? ARQUETIPOS.map((a) => perfilPorDefecto(a.id));
  return { modo: "flujo", eventos: IDS_EVENTO, metricas: IDS_METRICA, destinos: validadorDestinos(perfiles) };
}

export { ErrorGrafo, validarGrafo, huellaGrafo };

// ── El algoritmo nacional: configuración de plataforma ───────────────────────
// Vive en `plataforma_config` (clave "tendencias-nacionales"), no en el genoma
// de una escuela. Sin fila, rige el nativo con sus parámetros por defecto.
const CLAVE_NACIONAL = "tendencias-nacionales";
let cacheNacional = null;

export function configNacional(db) {
  if (!cacheNacional) {
    const fila = db.prepare("SELECT valor FROM plataforma_config WHERE clave = ?").get(CLAVE_NACIONAL);
    let crudo = {};
    try { crudo = fila ? JSON.parse(fila.valor) : {}; } catch { crudo = {}; }
    cacheNacional = { config: normalizarAlgoritmo(ALGORITMO_NACIONAL, crudo, false), runtime: null };
  }
  return cacheNacional.config;
}

/** Igual que `algoritmo()` pero para el slot nacional: activo, parámetros y puntuar. */
export function algoritmoNacional(db) {
  const config = configNacional(db);
  if (!cacheNacional.runtime) {
    const grafo = config.variante === "personalizado" && config.grafo
      ? config.grafo
      : validarGrafo(ALGORITMO_NACIONAL.grafoNativo(config.parametros), { modo: "algoritmo", variables: ALGORITMO_NACIONAL.entradas.map((v) => v.id) });
    cacheNacional.runtime = { activo: config.activo, parametros: config.parametros, variante: config.variante, puntuar: crearPuntuador(grafo) };
  }
  return cacheNacional.runtime;
}

export function guardarConfigNacional(db, crudo, usuarioId = null) {
  const config = normalizarAlgoritmo(ALGORITMO_NACIONAL, crudo, true);
  db.prepare(
    `INSERT INTO plataforma_config (clave, valor, actualizado_por) VALUES (?, ?, ?)
     ON CONFLICT (clave) DO UPDATE SET valor = excluded.valor, actualizado_en = datetime('now'), actualizado_por = excluded.actualizado_por`
  ).run(CLAVE_NACIONAL, JSON.stringify(config), usuarioId);
  cacheNacional = null;
  return configNacional(db);
}

// ── Combinatoria: cuántos NEXOs distintos caben ──────────────────────────────
function log10Factorial(n) {
  let s = 0;
  for (let k = 2; k <= n; k++) s += Math.log10(k);
  return s;
}

/**
 * Cuántas configuraciones DISCRETAS distintas admite un genoma con estos
 * perfiles (ocultar/mostrar, orden, checklist, activar algoritmos, colores).
 * Los parámetros continuos y los grafos de nodos lo vuelven infinito; esto es
 * solo la parte que se puede contar.
 */
export function combinatoria(genoma) {
  let log = 0;
  const M = MODULOS.length;
  log += M * Math.log10(2) + log10Factorial(M);
  for (const m of MODULOS) log += m.funciones.length * Math.log10(2);
  for (const a of ALGORITMOS) log += Math.log10(a.admiteGrafo ? 4 : 2);
  log += COLORES_TEMA.length * 6 * Math.log10(16);
  for (const p of genoma?.perfiles ?? ARQUETIPOS.map((a) => perfilPorDefecto(a.id))) {
    const mods = MODULOS.filter((m) => arquetiposDeModulo(m.id).includes(p.arquetipo));
    log += mods.length * Math.log10(2) + log10Factorial(mods.length);
    for (const m of mods) log += m.funciones.filter((f) => f.arquetipos.includes(p.arquetipo)).length * Math.log10(2);
  }
  return { log10: Math.round(log * 10) / 10, exponente: Math.floor(log) };
}

// ── Generador por probabilidad (sin IA) ─────────────────────────────────────
const sigmoide = (x) => 1 / (1 + Math.exp(-x));
const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
const r2 = (x) => Math.round(x * 100) / 100;

function hslAHex(tono, s, l) {
  const h = ((tono % 360) + 360) % 360;
  const sat = s / 100;
  const lum = l / 100;
  const k = (n) => (n + h / 30) % 12;
  const a = sat * Math.min(lum, 1 - lum);
  const f = (n) => lum - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
  return "#" + hex(f(0)) + hex(f(8)) + hex(f(4));
}

export const ARMONIAS = ["complementaria", "triadica", "analoga", "dividida", "monocromatica"];

/** Paleta matemática a partir de un tono, una armonía y una semilla. */
export function paletaDesde(tono, armonia, azar = Math.random) {
  const h = ((tono % 360) + 360) % 360;
  const desplazamientos = {
    complementaria: [0, 180, 30],
    triadica: [0, 120, 240],
    analoga: [0, 30, -30],
    dividida: [0, 150, 210],
    monocromatica: [0, 0, 0],
  }[armonia] ?? [0, 180, 30];
  const [d0, d1, d2] = desplazamientos;
  const jitter = () => (azar() - 0.5) * 8;
  const mono = armonia === "monocromatica";
  return {
    acento: hslAHex(h + d0, 88, 62),
    primario: hslAHex(h + d0 + jitter(), 95, 84),
    secundario: hslAHex(h + d1 + jitter(), mono ? 45 : 75, mono ? 74 : 80),
    terciario: hslAHex(h + d2 + jitter(), mono ? 60 : 82, mono ? 64 : 62),
    fondo: hslAHex(h + d0, 55, 11),
    superficie: hslAHex(h + d0, 48, 20),
  };
}

/**
 * Propone un genoma a partir de las necesidades declaradas (0 a 1 cada una) y
 * una semilla. Cada módulo y cada función tienen una probabilidad de quedar
 * activos = curva logística de (sesgo + afinidad · necesidades); la semilla
 * decide la "tirada". Devuelve el genoma, la probabilidad de CADA decisión (para
 * que el Maestro la apruebe o la invierta) y la combinatoria.
 */
export function proponerGenoma({ necesidades = {}, semilla = 1, base } = {}) {
  const azar = crearAzar(semilla);
  const n = NECESIDADES.map((x) => Math.max(0, Math.min(1, Number(necesidades[x.id] ?? 0.5))));
  const centrado = n.map((v) => v - 0.5);
  const genoma = normalizarGenoma(base ?? genomaPorDefecto(), { estricto: false });
  const decisiones = [];

  const puntajes = MODULOS.map((m) => {
    const z = m.sesgo + m.afinidad.reduce((s, w, i) => s + w * centrado[i] * 2.4, 0);
    const p = sigmoide(z * 1.6);
    const incluido = azar() < p;
    decisiones.push({ tipo: "modulo", id: m.id, nombre: m.nombre, probabilidad: r2(p), resultado: incluido });
    genoma.modulos[m.id].oculto = !incluido;
    return { id: m.id, orden: p + (azar() - 0.5) * 0.08 };
  });
  puntajes.sort((a, b) => b.orden - a.orden).forEach((x, i) => { genoma.modulos[x.id].orden = i; });

  const [comunidad, academico, familias, autonomia, control, innovacion] = n;
  for (const m of MODULOS) {
    for (const f of m.funciones) {
      const p = sigmoide(2.2 + (f.sens ?? 0) * (autonomia - control) * 4);
      const activa = azar() < p;
      decisiones.push({ tipo: "funcion", id: f.id, nombre: `${m.nombre} · ${f.nombre}`, probabilidad: r2(p), resultado: activa });
      if (activa) delete genoma.modulos[m.id].funciones[f.id];
      else genoma.modulos[m.id].funciones[f.id] = false;
    }
  }

  const params = genoma.algoritmos;
  Object.assign(params["comunidad.orden-feed"].parametros, {
    pesoVotos: r2(lerp(0, 2, comunidad)),
    pesoComentarios: r2(lerp(0, 1.5, comunidad * autonomia * 2)),
    pesoDireccion: Math.round(lerp(0, 6, control) * 2) / 2,
    vidaMedia: Math.round(lerp(18, 96, academico)),
  });
  Object.assign(params["comunidad.tendencias"].parametros, {
    ventanaDias: Math.round(lerp(3, 14, comunidad)),
    pesoPosturas: r2(lerp(1, 3, autonomia)),
  });
  Object.assign(params["aula.alerta-ritmo"].parametros, {
    umbralPct: Math.round(lerp(35, 10, academico)),
    umbralMin: Math.round(lerp(5, 1, control)),
  });
  Object.assign(params["biblioteca.orden-catalogo"].parametros, {
    pesoVotos: r2(lerp(0, 1.5, comunidad)),
    vidaMedia: Math.round(lerp(30, 365, academico)),
  });
  params["objetivos.racha"].parametros.diasGracia = Math.round(lerp(2, 0, control));
  params["perfiles.papelera"].parametros.dias = Math.round(lerp(3, 30, control));
  params["calendario.limpieza"].parametros.meses = Math.round(lerp(6, 24, academico));
  for (const [slot, v] of Object.entries(params)) {
    decisiones.push({ tipo: "parametros", id: slot, nombre: ALGORITMO_POR_ID.get(slot).nombre, probabilidad: 1, resultado: true, valores: { ...v.parametros } });
  }

  // Paleta: el tono sale de la semilla (ángulo áureo), la armonía de la
  // necesidad dominante.
  const tono = (semilla * 137.508) % 360;
  const dominante = n.indexOf(Math.max(...n));
  const armonia = ["triadica", "analoga", "analoga", "complementaria", "monocromatica", "dividida"][dominante];
  Object.assign(genoma.tema, paletaDesde(tono, armonia, azar));
  genoma.tema.movimiento = innovacion + comunidad > 1.2 ? "vibrante" : control > 0.7 ? "sereno" : "normal";
  genoma.identidad.semilla = semilla;
  decisiones.push({ tipo: "paleta", id: "tema", nombre: `Armonía ${armonia} · tono ${Math.round(tono)}°`, probabilidad: 1, resultado: true });

  // Perfil familia: con poco puente con las familias, el chat se oculta para ellas.
  const familia = genoma.perfiles.find((p) => p.clave === "familia");
  const pChatFamilia = sigmoide((familias - 0.35) * 8);
  const chatFamilia = azar() < pChatFamilia;
  decisiones.push({ tipo: "perfil", id: "familia.chat", nombre: "Familia · Mensajes", probabilidad: r2(pChatFamilia), resultado: chatFamilia });
  if (familia) {
    familia.modulos.chat = { ...(familia.modulos.chat ?? {}) };
    if (!chatFamilia) familia.modulos.chat.oculto = true;
    else delete familia.modulos.chat.oculto;
    if (!Object.keys(familia.modulos.chat).length) delete familia.modulos.chat;
  }

  return { genoma, decisiones, combinatoria: combinatoria(genoma) };
}

// ── Catálogo público (lo que recibe el estudio del Maestro) ─────────────────
export function catalogoPublico() {
  return {
    personalizacion: catalogoPersonalizacion(),
    arquetipos: ARQUETIPOS,
    necesidades: NECESIDADES,
    armonias: ARMONIAS,
    temaBase: TEMA_BASE,
    modulos: MODULOS.map((m) => ({
      id: m.id,
      nombre: m.nombre,
      icono: m.icono,
      color: m.color,
      descripcion: m.descripcion,
      padre: m.padre ?? null,
      paginas: m.paginas,
      arquetipos: arquetiposDeModulo(m.id),
      funciones: m.funciones.map((f) => ({ id: f.id, nombre: f.nombre, arquetipos: f.arquetipos })),
    })),
    algoritmos: ALGORITMOS.map((a) => ({
      id: a.id,
      modulo: a.modulo,
      nombre: a.nombre,
      descripcion: a.descripcion,
      salida: a.salida ?? "",
      alDesactivar: a.alDesactivar,
      admiteGrafo: a.admiteGrafo,
      entradas: a.entradas,
      parametros: a.parametros,
    })),
    algoritmoNacional: {
      id: ALGORITMO_NACIONAL.id,
      modulo: ALGORITMO_NACIONAL.modulo,
      nombre: ALGORITMO_NACIONAL.nombre,
      descripcion: ALGORITMO_NACIONAL.descripcion,
      salida: ALGORITMO_NACIONAL.salida,
      alDesactivar: ALGORITMO_NACIONAL.alDesactivar,
      admiteGrafo: true,
      entradas: ALGORITMO_NACIONAL.entradas,
      parametros: ALGORITMO_NACIONAL.parametros,
    },
    capacidades: CAPACIDADES.map(({ id, modulo, nombre, descripcion, arquetipos, porDefecto }) => ({ id, modulo, nombre, descripcion, arquetipos, porDefecto })),
    eventos: EVENTOS.map((e) => ({ id: e.id, nombre: e.nombre, modulo: e.modulo, anonimo: e.anonimo === true })),
    metricas: METRICAS.map((m) => ({ id: m.id, nombre: m.nombre })),
    nodos: catalogoNodos(),
    genomaPorDefecto: genomaPorDefecto("Nueva instancia"),
  };
}
