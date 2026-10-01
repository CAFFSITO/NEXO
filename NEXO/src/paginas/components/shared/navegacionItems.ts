import type { RutaPrivada } from "../../../navegacion";
import type { Rol } from "./roles";

export interface NavItem { label: string; icono: string; ruta: RutaPrivada }

// Menú y buscador comparten accesos; el servidor conserva la validación de permisos.
export const NAV_POR_ROL: Record<Rol, NavItem[]> = {
  estudiante: [
    { label: "Comunidad", icono: "group", ruta: "/comunidad" },
    { label: "Mi aprendizaje", icono: "school", ruta: "/portafolio/mis-cursos" },
    { label: "Objetivos personales", icono: "track_changes", ruta: "/objetivos" },
    { label: "Biblioteca", icono: "local_library", ruta: "/biblioteca/institucional" },
    { label: "Calendario", icono: "calendar_today", ruta: "/comunidad/calendario" },
    { label: "Mensajes", icono: "chat_bubble", ruta: "/chat" },
    { label: "Asistencia académica", icono: "auto_awesome", ruta: "/asistencia-academica" },
    { label: "Buzón estudiantil", icono: "mark_email_unread", ruta: "/quejas/enviar" },
  ],
  profesor: [
    { label: "Mi portafolio", icono: "space_dashboard", ruta: "/portafolio-docente" },
    { label: "Comunidad", icono: "group", ruta: "/comunidad" },
    { label: "Aula virtual", icono: "cast_for_education", ruta: "/portafolio-docente/aula-virtual" },
    { label: "Tareas y entregas", icono: "assignment", ruta: "/portafolio/gestion" },
    { label: "Biblioteca", icono: "local_library", ruta: "/biblioteca/institucional" },
    { label: "Calendario", icono: "calendar_today", ruta: "/comunidad/calendario" },
    { label: "Mensajes", icono: "chat_bubble", ruta: "/chat" },
  ],
  "admin-academico": [
    { label: "Panel institucional", icono: "space_dashboard", ruta: "/admin/panel" },
    { label: "Comunidad", icono: "group", ruta: "/comunidad" },
    { label: "Perfiles académicos", icono: "manage_accounts", ruta: "/admin/perfiles" },
    { label: "Cursos y materias", icono: "school", ruta: "/admin/cursos" },
    { label: "Biblioteca", icono: "local_library", ruta: "/biblioteca/institucional" },
    { label: "Calendario", icono: "calendar_today", ruta: "/comunidad/calendario" },
    { label: "Reportes", icono: "assessment", ruta: "/reportes" },
    { label: "Mensajes", icono: "chat_bubble", ruta: "/chat" },
    { label: "Buzón estudiantil", icono: "inbox", ruta: "/centro-estudiantes/quejas" },
  ],
  preceptor: [
    { label: "Mis cursos", icono: "school", ruta: "/comunidad/curso" },
    { label: "Comunidad", icono: "group", ruta: "/comunidad" },
    { label: "Mensajes", icono: "chat_bubble", ruta: "/chat" },
    { label: "Calendario", icono: "calendar_today", ruta: "/comunidad/calendario" },
  ],
  "centro-estudiantes": [
    { label: "Nuestro portal", icono: "campaign", ruta: "/centro-estudiantes" },
    { label: "Comunidad", icono: "group", ruta: "/comunidad" },
    { label: "Buzón estudiantil", icono: "inbox", ruta: "/centro-estudiantes/quejas" },
    { label: "Calendario", icono: "calendar_today", ruta: "/comunidad/calendario" },
  ],
  bibliotecario: [
    { label: "Mi biblioteca", icono: "space_dashboard", ruta: "/biblioteca/panel" },
    { label: "Revisión de recursos", icono: "fact_check", ruta: "/biblioteca/cola-revision" },
    { label: "Catálogo", icono: "local_library", ruta: "/biblioteca/institucional" },
    { label: "Comunidad", icono: "group", ruta: "/comunidad" },
    { label: "Calendario", icono: "calendar_today", ruta: "/comunidad/calendario" },
    { label: "Mensajes", icono: "chat_bubble", ruta: "/chat" },
  ],
  administrador: [
    { label: "Instituciones", icono: "domain", ruta: "/admin/instituciones" },
    { label: "Estado del sistema", icono: "monitor_heart", ruta: "/admin/salud" },
  ],
  familia: [
    { label: "Comunicados", icono: "campaign", ruta: "/comunicados" },
    { label: "Calendario familiar", icono: "calendar_today", ruta: "/familia/calendario" },
    { label: "Mensajes", icono: "chat_bubble", ruta: "/chat" },
  ],
};

export function accesosDeRol(rol: Rol): NavItem[] {
  const extras: NavItem[] = [];
  if (rol === "estudiante") extras.push(
    { label: "Mis tareas", icono: "assignment", ruta: "/portafolio/mis-tareas" },
    { label: "Calificaciones", icono: "school", ruta: "/portafolio/calificaciones" },
    { label: "Mis metas", icono: "flag", ruta: "/objetivos/metas" },
    { label: "Hábitos", icono: "routine", ruta: "/objetivos/habitos" },
    { label: "Competencias", icono: "verified", ruta: "/objetivos/competencias" },
  );
  if (rol === "profesor") extras.push({ label: "Diario reflexivo", icono: "edit_note", ruta: "/portafolio-docente/diario" });
  if (NAV_POR_ROL[rol].some(i => i.ruta === "/comunidad")) extras.push(
    { label: "Debates", icono: "forum", ruta: "/comunidad/debates" },
    { label: "Tendencias", icono: "trending_up", ruta: "/comunidad/tendencias" },
  );
  if (["estudiante", "profesor", "admin-academico", "bibliotecario"].includes(rol))
    extras.push({ label: "Biblioteca nacional", icono: "public", ruta: "/biblioteca/nacional" });
  return [...NAV_POR_ROL[rol], ...extras,
    { label: "Notificaciones", icono: "notifications", ruta: "/notificaciones" },
    { label: "Configuración de mi cuenta", icono: "settings", ruta: "/configuracion" },
  ];
}
