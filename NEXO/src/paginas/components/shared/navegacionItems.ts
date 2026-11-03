import { HOME_POR_ROL, MAPA_RUTAS, seccionDeRuta, type RutaPrivada } from "../../../navegacion";
import { moduloDePagina, type Instancia } from "../../../servicios/instancia";
import type { SeccionMenu } from "../../../servicios/maestro";
import type { Rol } from "./roles";

export interface NavItem {
  label: string;
  icono: string;
  ruta: RutaPrivada;
  /** Sección del menú donde va ("" o ausente = "Mi espacio"). */
  seccion?: string;
}

/** Un grupo del menú lateral: "Mi espacio" o una sección que armó la dirección. */
export interface GrupoMenu extends SeccionMenu { items: NavItem[] }

/** El grupo de siempre: lo que no está en ninguna sección (y lo que no es de un módulo). */
export const SECCION_BASE: SeccionMenu = { id: "", nombre: "Mi espacio", icono: "home" };

// Menú y buscador comparten accesos; el servidor conserva la validación de permisos.
// Este es el menú "de fábrica" de cada rol. El de cada persona sale de cruzarlo
// con el genoma de su escuela (navDeInstancia): el Maestro puede ocultar,
// reordenar y renombrar módulos para toda la escuela o para un perfil.
export const NAV_POR_ROL: Record<Rol, NavItem[]> = {
  secretaria: [
    { label: "Mensajes", icono: "chat_bubble", ruta: "/chat" },
    { label: "Documentos y formularios", icono: "edit_document", ruta: "/documentos" },
    { label: "Anuncios", icono: "notifications_active", ruta: "/anuncios" },
    { label: "Calendario", icono: "calendar_today", ruta: "/comunidad/calendario" },
  ],
  estudiante: [
    { label: "Comunidad", icono: "group", ruta: "/comunidad" },
    { label: "Mi aprendizaje", icono: "school", ruta: "/portafolio/mis-cursos" },
    { label: "Métodos de estudio", icono: "psychology", ruta: "/estudio/metodos" },
    { label: "Objetivos personales", icono: "track_changes", ruta: "/objetivos" },
    { label: "Biblioteca", icono: "local_library", ruta: "/biblioteca/institucional" },
    { label: "Documentos y formularios", icono: "edit_document", ruta: "/documentos" },
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
    { label: "Métodos de estudio", icono: "psychology", ruta: "/estudio/metodos" },
    { label: "Biblioteca", icono: "local_library", ruta: "/biblioteca/institucional" },
    { label: "Documentos y formularios", icono: "edit_document", ruta: "/documentos" },
    { label: "Calendario", icono: "calendar_today", ruta: "/comunidad/calendario" },
    { label: "Mensajes", icono: "chat_bubble", ruta: "/chat" },
  ],
  "admin-academico": [
    { label: "Panel institucional", icono: "space_dashboard", ruta: "/admin/panel" },
    { label: "Anuncios", icono: "notifications_active", ruta: "/anuncios" },
    { label: "Comunidad", icono: "group", ruta: "/comunidad" },
    { label: "Perfiles académicos", icono: "manage_accounts", ruta: "/admin/perfiles" },
    { label: "Cursos y materias", icono: "school", ruta: "/admin/cursos" },
    { label: "Biblioteca", icono: "local_library", ruta: "/biblioteca/institucional" },
    { label: "Documentos y formularios", icono: "edit_document", ruta: "/documentos" },
    { label: "Calendario", icono: "calendar_today", ruta: "/comunidad/calendario" },
    { label: "Reportes", icono: "assessment", ruta: "/reportes" },
    { label: "Mensajes", icono: "chat_bubble", ruta: "/chat" },
    { label: "Buzón estudiantil", icono: "inbox", ruta: "/centro-estudiantes/quejas" },
    { label: "Modo edición", icono: "edit_square", ruta: "/admin/edicion" },
  ],
  preceptor: [
    { label: "Mis cursos", icono: "school", ruta: "/comunidad/curso" },
    { label: "Anuncios", icono: "notifications_active", ruta: "/anuncios" },
    { label: "Comunidad", icono: "group", ruta: "/comunidad" },
    { label: "Mensajes", icono: "chat_bubble", ruta: "/chat" },
    { label: "Calendario", icono: "calendar_today", ruta: "/comunidad/calendario" },
    { label: "Documentos y formularios", icono: "edit_document", ruta: "/documentos" },
  ],
  "centro-estudiantes": [
    { label: "Nuestro portal", icono: "campaign", ruta: "/centro-estudiantes" },
    { label: "Comunidad", icono: "group", ruta: "/comunidad" },
    { label: "Buzón estudiantil", icono: "inbox", ruta: "/centro-estudiantes/quejas" },
    { label: "Calendario", icono: "calendar_today", ruta: "/comunidad/calendario" },
    { label: "Documentos y formularios", icono: "edit_document", ruta: "/documentos" },
  ],
  bibliotecario: [
    { label: "Mi biblioteca", icono: "space_dashboard", ruta: "/biblioteca/panel" },
    { label: "Revisión de recursos", icono: "fact_check", ruta: "/biblioteca/cola-revision" },
    { label: "Catálogo", icono: "local_library", ruta: "/biblioteca/institucional" },
    { label: "Comunidad", icono: "group", ruta: "/comunidad" },
    { label: "Calendario", icono: "calendar_today", ruta: "/comunidad/calendario" },
    { label: "Mensajes", icono: "chat_bubble", ruta: "/chat" },
    { label: "Documentos y formularios", icono: "edit_document", ruta: "/documentos" },
  ],
  administrador: [
    { label: "Estudio del Maestro", icono: "auto_awesome", ruta: "/maestro" },
    { label: "Forjar instancia", icono: "local_fire_department", ruta: "/maestro/forja" },
    { label: "Grupos de anuncios", icono: "notifications_active", ruta: "/maestro/anuncios" },
    { label: "Instituciones", icono: "domain", ruta: "/admin/instituciones" },
    { label: "Estado del sistema", icono: "monitor_heart", ruta: "/admin/salud" },
  ],
  familia: [
    { label: "Comunicados", icono: "campaign", ruta: "/comunicados" },
    { label: "Calendario familiar", icono: "calendar_today", ruta: "/familia/calendario" },
    { label: "Mensajes", icono: "chat_bubble", ruta: "/chat" },
    { label: "Documentos y formularios", icono: "edit_document", ruta: "/documentos" },
  ],
};

/** El módulo del genoma al que pertenece una ruta (por su pantalla). */
function moduloDeRuta(instancia: Instancia | null, ruta: RutaPrivada) {
  return moduloDePagina(instancia, MAPA_RUTAS[ruta].pagina);
}

/** ¿Esta ruta está visible para mí según el genoma? Lo que no es de ningún módulo, siempre. */
export function rutaVisible(instancia: Instancia | null, ruta: RutaPrivada): boolean {
  const modulo = moduloDeRuta(instancia, ruta);
  return !modulo || modulo.visible;
}

/**
 * El menú de una persona: el de su rol, sin lo oculto, con los nombres e íconos
 * que eligió el Maestro y en el orden del genoma. Si un módulo tiene varios
 * ítems (el bibliotecario), conservan su orden entre sí y solo el primero toma
 * el nombre propio del módulo.
 */
export function navDeInstancia(rol: Rol, instancia: Instancia | null): NavItem[] {
  const base = NAV_POR_ROL[rol];
  if (!instancia || instancia.modulos.length === 0) return base;
  const yaNombrado = new Set<string>();
  return base
    .map((item, indice) => {
      const modulo = moduloDeRuta(instancia, item.ruta);
      if (modulo && !modulo.visible) return null;
      let { label, icono } = item;
      if (modulo && !yaNombrado.has(modulo.id)) {
        yaNombrado.add(modulo.id);
        if (modulo.etiqueta) label = modulo.etiqueta;
        if (modulo.icono) icono = modulo.icono;
      }
      const nuevo: NavItem = { ...item, label, icono, seccion: modulo?.seccion ?? "" };
      return { item: nuevo, clave: modulo ? modulo.orden : 1000 + indice, indice };
    })
    .filter((x): x is { item: NavItem; clave: number; indice: number } => x !== null)
    .sort((a, b) => a.clave - b.clave || a.indice - b.indice)
    .map((x) => x.item);
}

/**
 * Reparte un menú ya ordenado en sus secciones: primero "Mi espacio" y después
 * las de la escuela en su orden. Una sección vacía no se muestra; un ítem de una
 * sección que ya no existe cae en "Mi espacio".
 */
export function agruparMenu(items: NavItem[], secciones: SeccionMenu[] = []): GrupoMenu[] {
  const grupos: GrupoMenu[] = [{ ...SECCION_BASE, items: [] }, ...secciones.map((s) => ({ ...s, items: [] }))];
  const porId = new Map(grupos.map((g) => [g.id, g]));
  for (const item of items) (porId.get(item.seccion ?? "") ?? grupos[0]).items.push(item);
  return grupos.filter((g) => g.items.length > 0);
}

/** El menú de una persona, ya repartido en las secciones de su escuela. */
export function menuPorSecciones(rol: Rol, instancia: Instancia | null): GrupoMenu[] {
  return agruparMenu(navDeInstancia(rol, instancia), instancia?.secciones ?? []);
}

// ── Organización visual del menú ─────────────────────────
// Un menú de diez o más ítems en una sola lista no se recorre de un vistazo.
// Como en cualquier aplicación grande, lo que no está en una sección propia de
// la escuela se ordena en categorías fijas. Solo afecta cómo se dibuja: el
// orden dentro de cada categoría sigue siendo el del genoma.
export type Categoria = "principal" | "comunicacion" | "recursos" | "gestion";

export const NOMBRE_CATEGORIA: Record<Categoria, string> = {
  principal: "General",
  comunicacion: "Comunicación",
  recursos: "Recursos",
  gestion: "Gestión",
};

const CATEGORIA_DE_RUTA: Partial<Record<RutaPrivada, Categoria>> = {
  "/chat": "comunicacion",
  "/anuncios": "comunicacion",
  "/comunidad/calendario": "comunicacion",
  "/familia/calendario": "comunicacion",
  "/comunicados": "comunicacion",
  "/quejas/enviar": "comunicacion",
  "/centro-estudiantes/quejas": "comunicacion",
  "/maestro/anuncios": "comunicacion",
  "/biblioteca/institucional": "recursos",
  "/biblioteca/nacional": "recursos",
  "/documentos": "recursos",
  "/estudio/metodos": "recursos",
  "/asistencia-academica": "recursos",
  "/admin/perfiles": "gestion",
  "/admin/cursos": "gestion",
  "/reportes": "gestion",
  "/admin/edicion": "gestion",
  "/admin/instituciones": "gestion",
  "/admin/salud": "gestion",
};

export const categoriaDeRuta = (ruta: RutaPrivada): Categoria => CATEGORIA_DE_RUTA[ruta] ?? "principal";

/** Los ítems de un grupo en categorías (solo si el grupo es largo; si no, uno solo sin título). */
export function categorizar(items: NavItem[], minimo = 8): { categoria: Categoria | null; items: NavItem[] }[] {
  if (items.length < minimo) return [{ categoria: null, items }];
  const orden: Categoria[] = ["principal", "comunicacion", "recursos", "gestion"];
  return orden
    .map((categoria) => ({ categoria, items: items.filter((i) => categoriaDeRuta(i.ruta) === categoria) }))
    .filter((g) => g.items.length > 0);
}

/** Nombres cortos para la barra inferior del celular (si la escuela no lo renombró). */
const ETIQUETA_CORTA: Partial<Record<RutaPrivada, string>> = {
  "/portafolio/mis-cursos": "Aprendizaje",
  "/portafolio-docente": "Portafolio",
  "/portafolio-docente/aula-virtual": "Aula",
  "/portafolio/gestion": "Tareas",
  "/admin/panel": "Panel",
  "/comunidad/curso": "Mis cursos",
  "/comunidad/calendario": "Calendario",
  "/familia/calendario": "Calendario",
  "/documentos": "Documentos",
  "/centro-estudiantes": "Portal",
  "/centro-estudiantes/quejas": "Buzón",
  "/quejas/enviar": "Buzón",
  "/biblioteca/panel": "Biblioteca",
  "/biblioteca/cola-revision": "Revisión",
  "/biblioteca/institucional": "Biblioteca",
  "/maestro": "Estudio",
  "/maestro/forja": "Forja",
  "/maestro/anuncios": "Anuncios",
  "/admin/instituciones": "Escuelas",
  "/admin/salud": "Sistema",
  "/objetivos": "Objetivos",
  "/asistencia-academica": "Asistente",
  "/estudio/metodos": "Métodos",
};

/** Lo primero que usa cada perfil, en orden: va a la barra inferior del celular. */
const PRIORIDAD_INFERIOR: Record<Rol, RutaPrivada[]> = {
  estudiante: ["/comunidad", "/portafolio/mis-cursos", "/chat", "/comunidad/calendario"],
  profesor: ["/portafolio-docente", "/portafolio/gestion", "/chat", "/comunidad"],
  "admin-academico": ["/admin/panel", "/anuncios", "/chat", "/comunidad"],
  preceptor: ["/comunidad/curso", "/anuncios", "/chat", "/comunidad"],
  secretaria: ["/chat", "/anuncios", "/documentos", "/comunidad/calendario"],
  "centro-estudiantes": ["/centro-estudiantes", "/comunidad", "/centro-estudiantes/quejas", "/comunidad/calendario"],
  bibliotecario: ["/biblioteca/panel", "/biblioteca/cola-revision", "/biblioteca/institucional", "/chat"],
  administrador: ["/maestro", "/maestro/forja", "/admin/instituciones", "/admin/salud"],
  familia: ["/comunicados", "/familia/calendario", "/chat", "/documentos"],
};

/** Las (hasta) cuatro secciones de la barra inferior: las prioritarias visibles, completadas con el menú. */
export function pestanasInferiores(rol: Rol, instancia: Instancia | null, cantidad = 4): NavItem[] {
  const menu = navDeInstancia(rol, instancia);
  const elegidas: NavItem[] = [];
  for (const ruta of PRIORIDAD_INFERIOR[rol]) {
    const item = menu.find((i) => i.ruta === ruta);
    if (item && elegidas.length < cantidad) elegidas.push(item);
  }
  for (const item of menu) if (elegidas.length < cantidad && !elegidas.includes(item)) elegidas.push(item);
  const base = NAV_POR_ROL[rol];
  return elegidas.map((item) => {
    const renombrado = base.find((b) => b.ruta === item.ruta)?.label !== item.label;
    return { ...item, label: renombrado ? item.label : ETIQUETA_CORTA[item.ruta] ?? item.label };
  });
}

/**
 * Dónde está parada la persona en su menú: el ítem que el lateral enciende y la
 * sección que lo contiene. Gana la dirección exacta; si no, el primer ítem de la
 * misma sección (las sub-pantallas: Mis metas cae en "Objetivos personales").
 */
export function ubicacionEnMenu(rol: Rol, instancia: Instancia | null, ruta: string): { grupo: GrupoMenu; item: NavItem } | null {
  const seccion = seccionDeRuta(ruta);
  let porSeccion: { grupo: GrupoMenu; item: NavItem } | null = null;
  for (const grupo of menuPorSecciones(rol, instancia)) {
    for (const item of grupo.items) {
      if (item.ruta === ruta) return { grupo, item };
      if (!porSeccion && seccion && MAPA_RUTAS[item.ruta].seccion === seccion) porSeccion = { grupo, item };
    }
  }
  return porSeccion;
}

/** A dónde cae esta persona al entrar: el inicio de su perfil o el primero visible. */
export function inicioPara(rol: Rol, instancia: Instancia | null): RutaPrivada {
  const habitual = HOME_POR_ROL[rol];
  if (!instancia || instancia.modulos.length === 0) return habitual;
  const menu = navDeInstancia(rol, instancia);
  if (instancia.inicio) {
    const elegido = menu.find((i) => moduloDeRuta(instancia, i.ruta)?.id === instancia.inicio);
    if (elegido) return elegido.ruta;
  }
  if (rutaVisible(instancia, habitual)) return habitual;
  return menu[0]?.ruta ?? "/configuracion";
}

export function accesosDeRol(rol: Rol, instancia: Instancia | null = null): NavItem[] {
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
  const vistos = new Set<string>();
  const todos: NavItem[] = [...navDeInstancia(rol, instancia), ...extras.filter((i) => rutaVisible(instancia, i.ruta)),
    { label: "Notificaciones", icono: "notifications", ruta: "/notificaciones" },
    { label: "Configuración de mi cuenta", icono: "settings", ruta: "/configuracion" },
  ];
  return todos.filter((i) => !vistos.has(i.ruta) && vistos.add(i.ruta));
}
