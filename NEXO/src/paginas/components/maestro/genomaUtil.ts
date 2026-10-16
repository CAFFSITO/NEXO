// Ayudas del estudio del Maestro para trabajar sobre un BORRADOR de genoma:
// vistas previas (qué ve cada perfil), reordenar, advertencias y plantillas.
// El servidor es el que valida y aplica de verdad; esto solo dibuja lo que va a
// pasar antes de guardar.

import { MAPA_RUTAS } from "../../../navegacion";
import { NAV_POR_ROL, type NavItem } from "../shared/navegacionItems";
import type { Rol } from "../shared/roles";
import type { Catalogo, FlujoGenoma, Genoma, Grafo, ModuloCatalogo, PerfilGenoma } from "../../../servicios/maestro";

export function clonar<T>(valor: T): T {
  return structuredClone(valor);
}

export interface ModuloDePerfil {
  modulo: ModuloCatalogo;
  visible: boolean;
  /** Por qué no se ve: oculto para toda la escuela, para este perfil o porque su módulo padre está oculto. */
  ocultoEn: "institucion" | "perfil" | "padre" | null;
  orden: number;
  etiqueta: string;
  icono: string;
}

// Lo mínimo que necesitan las vistas previas: sirven igual para el borrador de
// la Forja que para el del modo edición de la dirección.
type GenomaDeMenu = Pick<Genoma, "modulos">;
type CatalogoDeMenu = Pick<Catalogo, "modulos">;
type PerfilDeMenu = Pick<PerfilGenoma, "arquetipo" | "modulos">;

/** Los módulos que tiene un perfil (los de su arquetipo), resueltos como los resolverá el servidor. */
export function modulosDePerfil(genoma: GenomaDeMenu, catalogo: CatalogoDeMenu, perfil: PerfilDeMenu): ModuloDePerfil[] {
  const propio = (id: string) => !genoma.modulos[id]?.oculto && !perfil.modulos[id]?.oculto;
  return catalogo.modulos
    .filter((m) => m.arquetipos.includes(perfil.arquetipo))
    .map((m, i) => {
      const gi = genoma.modulos[m.id];
      const gp = perfil.modulos[m.id] ?? {};
      const padreVisible = !m.padre || propio(m.padre);
      return {
        modulo: m,
        visible: propio(m.id) && padreVisible,
        ocultoEn: gi?.oculto ? "institucion" as const : gp.oculto ? "perfil" as const : !padreVisible ? "padre" as const : null,
        orden: gp.orden ?? gi?.orden ?? i,
        etiqueta: gp.etiqueta || gi?.etiqueta || "",
        icono: gp.icono || gi?.icono || "",
      };
    })
    .sort((a, b) => a.orden - b.orden);
}

/** El menú lateral que vería un perfil con este borrador (vista previa). */
export function menuDePerfil(genoma: GenomaDeMenu, catalogo: CatalogoDeMenu, perfil: PerfilDeMenu): NavItem[] {
  const base = NAV_POR_ROL[perfil.arquetipo as Rol] ?? [];
  const modulos = modulosDePerfil(genoma, catalogo, perfil);
  const deRuta = (ruta: NavItem["ruta"]) => {
    const pagina = MAPA_RUTAS[ruta].pagina;
    return modulos.find((m) => m.modulo.paginas.includes(pagina)) ?? null;
  };
  const nombrados = new Set<string>();
  return base
    .map((item, indice) => {
      const m = deRuta(item.ruta);
      if (m && !m.visible) return null;
      let { label, icono } = item;
      if (m && !nombrados.has(m.modulo.id)) {
        nombrados.add(m.modulo.id);
        if (m.etiqueta) label = m.etiqueta;
        if (m.icono) icono = m.icono;
      }
      const seccion = m ? genoma.modulos[m.modulo.id]?.seccion ?? "" : "";
      const nuevo: NavItem = { ...item, label, icono, seccion };
      return { item: nuevo, clave: m ? m.orden : 1000 + indice, indice };
    })
    .filter((x): x is { item: NavItem; clave: number; indice: number } => x !== null)
    .sort((a, b) => a.clave - b.clave || a.indice - b.indice)
    .map((x) => x.item);
}

/** Reasigna el orden de los módulos de la instancia según la lista de ids. */
export function ordenarInstancia(genoma: Genoma, ids: string[]): Genoma {
  const g = clonar(genoma);
  ids.forEach((id, i) => { if (g.modulos[id]) g.modulos[id].orden = i; });
  return g;
}

/** Mueve un elemento de una lista (para reordenar arrastrando o con flechas). */
export function mover<T>(lista: T[], desde: number, hasta: number): T[] {
  const copia = [...lista];
  const [x] = copia.splice(desde, 1);
  copia.splice(Math.max(0, Math.min(copia.length, hasta)), 0, x);
  return copia;
}

export function idsPorOrden(genoma: Genoma, catalogo: Catalogo): string[] {
  return catalogo.modulos
    .map((m, i) => ({ id: m.id, orden: genoma.modulos[m.id]?.orden ?? i, i }))
    .sort((a, b) => a.orden - b.orden || a.i - b.i)
    .map((x) => x.id);
}

/** Clave legible y única para un perfil o un flujo nuevo. */
export function claveUnica(texto: string, existentes: Set<string>, prefijo: string): string {
  const base = (texto || prefijo)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 30) || prefijo;
  let clave = /^[a-z0-9]/.test(base) && base.length >= 2 ? base : `${prefijo}-${base}`;
  let n = 2;
  while (existentes.has(clave)) clave = `${base.slice(0, 26)}-${n++}`;
  return clave;
}

/** Cosas que conviene mirar antes de forjar o guardar. */
export function advertencias(genoma: Genoma, catalogo: Catalogo): string[] {
  const avisos: string[] = [];
  for (const p of genoma.perfiles) {
    const visibles = modulosDePerfil(genoma, catalogo, p).filter((m) => m.visible).length;
    if (visibles === 0) avisos.push(`«${p.nombre}» no ve ningún módulo: solo tendrá notificaciones y su cuenta.`);
  }
  for (const a of catalogo.algoritmos) {
    const g = genoma.algoritmos[a.id];
    if (g?.grafo && g.variante === "nativo" && a.admiteGrafo) avisos.push(`El algoritmo «${a.nombre}» tiene un grafo guardado como borrador (sin aprobar): sigue usando el nativo.`);
  }
  for (const f of genoma.flujos) {
    if (!f.activo) avisos.push(`El flujo «${f.nombre}» está apagado.`);
  }
  return avisos;
}

// ── Íconos para los selectores ──────────────────────────
export const ICONOS = [
  "hub", "school", "auto_awesome", "rocket_launch", "science", "public", "eco", "diversity_3", "lightbulb",
  "local_library", "menu_book", "psychology", "palette", "sports_soccer", "music_note", "theater_comedy",
  "groups", "group", "forum", "campaign", "chat_bubble", "calendar_today", "event", "track_changes", "flag",
  "verified", "workspace_premium", "emoji_events", "star", "favorite", "bolt", "shield", "account_balance",
  "badge", "cast_for_education", "space_dashboard", "assignment", "fact_check", "inbox", "family_restroom",
  "diversity_1", "volunteer_activism", "handshake", "travel_explore", "explore", "nature_people", "pets",
  "calculate", "code", "biotech", "draw", "brush", "celebration", "spa", "self_improvement", "trending_up",
  "widgets", "dashboard_customize", "local_fire_department", "water_drop", "sunny", "dark_mode", "landscape",
];

// ── Plantillas de flujos ────────────────────────────────
interface Plantilla {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  crear: () => Omit<FlujoGenoma, "id" | "aprobacion" | "activo">;
}

const grafoDe = (nodos: Grafo["nodos"], conexiones: Grafo["conexiones"]): Grafo => ({ nodos, conexiones });

export const PLANTILLAS_FLUJO: Plantilla[] = [
  {
    id: "quejas",
    nombre: "Alerta de quejas acumuladas",
    descripcion: "Cada mañana hábil, si hay más de 5 quejas sin ver en la semana, avisa a la dirección.",
    icono: "mark_email_unread",
    crear: () => ({
      nombre: "Alerta de quejas acumuladas",
      descripcion: "Avisa a la dirección cuando se acumulan quejas sin ver.",
      limiteHora: 5,
      grafo: grafoDe(
        [
          { id: "reloj", tipo: "reloj", x: 0, y: 0, datos: { hora: "08:00", dias: [1, 2, 3, 4, 5] } },
          { id: "conteo", tipo: "conteo", x: 0, y: 170, datos: { metrica: "quejas-sin-ver", dias: 7 } },
          { id: "umbral", tipo: "mayor", x: 280, y: 170, datos: { en: { b: 5 } } },
          { id: "y", tipo: "y", x: 540, y: 60, datos: {} },
          { id: "aviso", tipo: "notificar", x: 800, y: 100, datos: { destino: "direccion", titulo: "Quejas acumuladas", cuerpo: "Hay {valor} quejas sin ver esta semana." } },
        ],
        [
          { de: "reloj", salida: "pulso", a: "y", entrada: "a" },
          { de: "conteo", salida: "valor", a: "umbral", entrada: "a" },
          { de: "umbral", salida: "valor", a: "y", entrada: "b" },
          { de: "y", salida: "valor", a: "aviso", entrada: "activar" },
          { de: "conteo", salida: "valor", a: "aviso", entrada: "valor" },
        ],
      ),
    }),
  },
  {
    id: "celebrar",
    nombre: "Celebrar entregas (al azar)",
    descripcion: "Cada vez que un estudiante entrega, con 20 % de probabilidad le llega un mensaje de aliento.",
    icono: "celebration",
    crear: () => ({
      nombre: "Celebrar entregas",
      descripcion: "Un mensaje de aliento sorpresa al entregar.",
      limiteHora: 60,
      grafo: grafoDe(
        [
          { id: "entrega", tipo: "disparador", x: 0, y: 40, datos: { evento: "portafolio.entrega" } },
          { id: "suerte", tipo: "puerta", x: 280, y: 40, datos: { en: { p: 0.2 } } },
          { id: "aviso", tipo: "notificar", x: 560, y: 40, datos: { destino: "actor", titulo: "¡Gran entrega! 🎉", cuerpo: "Seguí así: cada entrega suma." } },
        ],
        [
          { de: "entrega", salida: "pulso", a: "suerte", entrada: "senal" },
          { de: "suerte", salida: "valor", a: "aviso", entrada: "activar" },
        ],
      ),
    }),
  },
  {
    id: "moderacion",
    nombre: "Moderación preventiva",
    descripcion: "Si con una nueva denuncia ya son 3 o más sin resolver en 3 días, avisa a los preceptores.",
    icono: "shield",
    crear: () => ({
      nombre: "Moderación preventiva",
      descripcion: "Avisa a los preceptores cuando se juntan denuncias.",
      limiteHora: 10,
      grafo: grafoDe(
        [
          { id: "denuncia", tipo: "disparador", x: 0, y: 0, datos: { evento: "comunidad.denuncia" } },
          { id: "conteo", tipo: "conteo", x: 0, y: 170, datos: { metrica: "denuncias-pendientes", dias: 3 } },
          { id: "umbral", tipo: "mayor-igual", x: 280, y: 170, datos: { en: { b: 3 } } },
          { id: "y", tipo: "y", x: 540, y: 60, datos: {} },
          { id: "aviso", tipo: "notificar", x: 800, y: 100, datos: { destino: "arquetipo:preceptor", titulo: "Denuncias por revisar", cuerpo: "Hay {valor} denuncias sin resolver en la comunidad." } },
        ],
        [
          { de: "denuncia", salida: "pulso", a: "y", entrada: "a" },
          { de: "conteo", salida: "valor", a: "umbral", entrada: "a" },
          { de: "umbral", salida: "valor", a: "y", entrada: "b" },
          { de: "y", salida: "valor", a: "aviso", entrada: "activar" },
          { de: "conteo", salida: "valor", a: "aviso", entrada: "valor" },
        ],
      ),
    }),
  },
  {
    id: "blanco",
    nombre: "En blanco",
    descripcion: "Un disparador conectado a un aviso. Desde acá, conectá lo que imagines.",
    icono: "add_circle",
    crear: () => ({
      nombre: "Flujo nuevo",
      descripcion: "",
      limiteHora: 30,
      grafo: grafoDe(
        [
          { id: "inicio", tipo: "disparador", x: 0, y: 40, datos: { evento: "comunidad.publicacion" } },
          { id: "aviso", tipo: "notificar", x: 320, y: 40, datos: { destino: "direccion", titulo: "Aviso", cuerpo: "" } },
        ],
        [{ de: "inicio", salida: "pulso", a: "aviso", entrada: "activar" }],
      ),
    }),
  },
];

export const COLOR_CATEGORIA: Record<string, string> = {
  entrada: "#22d3ee",
  contexto: "#2dd4bf",
  disparador: "#fbbf24",
  matematica: "#a78bfa",
  logica: "#60a5fa",
  probabilidad: "#f472b6",
  salida: "#34d399",
  accion: "#fb923c",
};

export const NOMBRE_CATEGORIA: Record<string, string> = {
  entrada: "Entradas",
  contexto: "Contexto",
  disparador: "Disparadores",
  matematica: "Matemática",
  logica: "Lógica",
  probabilidad: "Probabilidad",
  salida: "Salida",
  accion: "Acciones",
};

/** Formato corto de un número para mostrar en cables y estadísticas. */
export function numeroCorto(x: number | null | undefined): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return "—";
  const abs = Math.abs(x);
  if (abs >= 1000) return x.toFixed(0);
  if (abs >= 100) return x.toFixed(1);
  if (abs >= 10) return x.toFixed(2);
  return Number(x.toFixed(3)).toString();
}

/** "10^312" con superíndice real. */
export function potenciaDeDiez(exponente: number): string {
  const sup = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  return "10" + String(exponente).split("").map((d) => sup[Number(d)] ?? d).join("");
}
