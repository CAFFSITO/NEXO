// Los avisos ordenados como chats (WhatsApp): uno por grupo de difusión, uno
// por persona (mensajes directos, en los dos sentidos) y uno por cada lista de
// varias personas que se armó a mano. No hay estado nuevo en el servidor: los
// chats se arman con los avisos enviados, los leídos y los destinos posibles.

import {
  esAudio,
  nombreTipo,
  rolEnAvisos,
  type AvisoEnviado,
  type AvisoLeido,
  type Destinos,
  type PersonaAnuncio,
  type TipoGrupo,
} from "../../../servicios/anuncios";

export type Mensaje =
  | { tipo: "enviado"; aviso: AvisoEnviado }
  | { tipo: "recibido"; aviso: AvisoLeido };

export interface GrupoChat {
  id: string;
  nombre: string;
  tipo: TipoGrupo;
  color: string;
  descripcion?: string;
}

export interface ChatAviso {
  clave: string;
  clase: "grupo" | "persona" | "lista";
  nombre: string;
  color: string;
  grupo: GrupoChat | null;
  /** persona: la otra persona; lista: todas; grupo: a quiénes les llega (si se sabe). */
  personas: PersonaAnuncio[];
  /** Del más viejo al más nuevo. */
  mensajes: Mensaje[];
  ultimoEn: number;
  /** A dónde va un aviso escrito acá; null si no puedo escribir en este chat. */
  destino: { grupoId: string } | { personas: string[] } | null;
}

export const claveGrupo = (id: string) => `g:${id}`;
export const clavePersona = (id: string) => `p:${id}`;
export const claveLista = (ids: string[]) => `l:${[...ids].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b)).join(",")}`;

const instante = (iso: string) => {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
};

/** "Carlos Pereyra y Laura Martínez" / "Carlos, Laura y 3 más". */
export function listaDeNombres(personas: PersonaAnuncio[]): string {
  const nombres = personas.map((p) => p.nombre.split(" ").slice(0, 2).join(" "));
  if (nombres.length <= 2) return nombres.join(" y ");
  return `${nombres.slice(0, 2).join(", ")} y ${nombres.length - 2} más`;
}

export function armarChats(enviados: AvisoEnviado[], leidos: AvisoLeido[], destinos: Destinos | null): ChatAviso[] {
  const chats = new Map<string, ChatAviso>();
  const colorDirecto = destinos?.colorDirecto ?? "#4f46e5";
  const maxPersonas = destinos?.maxPersonas ?? 50;
  const puedoA = new Set((destinos?.personas ?? []).map((p) => p.id));

  const obtener = (clave: string, crear: () => Omit<ChatAviso, "clave" | "mensajes" | "ultimoEn">): ChatAviso => {
    let chat = chats.get(clave);
    if (!chat) {
      chat = { clave, mensajes: [], ultimoEn: 0, ...crear() };
      chats.set(clave, chat);
    }
    return chat;
  };

  // Los grupos donde puedo escribir aparecen aunque todavía no tengan avisos.
  for (const g of destinos?.grupos ?? []) {
    obtener(claveGrupo(g.id), () => ({
      clase: "grupo", nombre: g.nombre, color: g.color,
      grupo: { id: g.id, nombre: g.nombre, tipo: g.tipo, color: g.color, descripcion: g.descripcion },
      personas: g.destinatarios, destino: { grupoId: g.id },
    }));
  }

  for (const aviso of enviados) {
    let chat: ChatAviso;
    if (aviso.grupo) {
      const g = aviso.grupo;
      chat = obtener(claveGrupo(g.id), () => ({
        clase: "grupo", nombre: g.nombre, color: g.color, grupo: { ...g }, personas: aviso.destinatarios.map((d) => d.persona), destino: null,
      }));
    } else if (aviso.destinatarios.length === 1) {
      const p = aviso.destinatarios[0].persona;
      chat = obtener(clavePersona(p.id), () => ({
        clase: "persona", nombre: p.nombre, color: colorDirecto, grupo: null, personas: [p],
        destino: puedoA.has(p.id) ? { personas: [p.id] } : null,
      }));
    } else {
      const personas = aviso.destinatarios.map((d) => d.persona);
      const ids = personas.map((p) => p.id);
      chat = obtener(claveLista(ids), () => ({
        clase: "lista", nombre: listaDeNombres(personas), color: colorDirecto, grupo: null, personas,
        destino: ids.every((id) => puedoA.has(id)) && ids.length <= maxPersonas ? { personas: ids } : null,
      }));
    }
    chat.mensajes.push({ tipo: "enviado", aviso });
  }

  for (const aviso of leidos) {
    let chat: ChatAviso;
    if (aviso.grupo) {
      const g = aviso.grupo;
      chat = obtener(claveGrupo(g.id), () => ({
        clase: "grupo", nombre: g.nombre, color: g.color, grupo: { ...g }, personas: [], destino: null,
      }));
    } else {
      const autor = aviso.autor;
      chat = obtener(clavePersona(autor?.id ?? "?"), () => ({
        clase: "persona", nombre: autor?.nombre ?? "Alguien que ya no está en NEXO", color: aviso.color || colorDirecto, grupo: null,
        personas: autor ? [autor] : [], destino: autor && puedoA.has(autor.id) ? { personas: [autor.id] } : null,
      }));
    }
    chat.mensajes.push({ tipo: "recibido", aviso });
  }

  for (const chat of chats.values()) {
    chat.mensajes.sort((a, b) => instante(a.aviso.creadoEn) - instante(b.aviso.creadoEn) || Number(a.aviso.id) - Number(b.aviso.id));
    chat.ultimoEn = chat.mensajes.length ? instante(chat.mensajes[chat.mensajes.length - 1].aviso.creadoEn) : 0;
  }
  return [...chats.values()].sort((a, b) => b.ultimoEn - a.ultimoEn || a.nombre.localeCompare(b.nombre, "es"));
}

/** Un chat que todavía no existe (se elige a alguien en "Nuevo aviso"). */
export function chatNuevo(clave: string, destinos: Destinos | null): ChatAviso | null {
  if (!destinos) return null;
  const [tipo, resto] = [clave.slice(0, 1), clave.slice(2)];
  if (tipo === "g") {
    const g = destinos.grupos.find((x) => x.id === resto);
    if (!g) return null;
    return { clave, clase: "grupo", nombre: g.nombre, color: g.color, grupo: { id: g.id, nombre: g.nombre, tipo: g.tipo, color: g.color, descripcion: g.descripcion }, personas: g.destinatarios, mensajes: [], ultimoEn: 0, destino: { grupoId: g.id } };
  }
  const ids = resto.split(",").filter(Boolean);
  const personas = ids.map((id) => destinos.personas.find((p) => p.id === id)).filter((p): p is PersonaAnuncio => Boolean(p));
  if (!personas.length || personas.length !== ids.length) return null;
  if (tipo === "p") return { clave, clase: "persona", nombre: personas[0].nombre, color: destinos.colorDirecto, grupo: null, personas, mensajes: [], ultimoEn: 0, destino: { personas: ids } };
  return { clave, clase: "lista", nombre: listaDeNombres(personas), color: destinos.colorDirecto, grupo: null, personas, mensajes: [], ultimoEn: 0, destino: { personas: ids } };
}

/** Lo que se lee en la lista de chats debajo del nombre. */
export function vistaPrevia(m: Mensaje): { icono: string | null; texto: string } {
  const texto = m.aviso.cuerpo.replace(/\s+/g, " ").trim();
  const adjuntos = m.aviso.adjuntos ?? [];
  if (texto) return { icono: adjuntos.length ? "attach_file" : null, texto };
  if (adjuntos.some((a) => a.voz)) return { icono: "mic", texto: "Mensaje de voz" };
  if (adjuntos.some((a) => esAudio(a))) return { icono: "headphones", texto: "Audio" };
  if (adjuntos.some((a) => a.tipo.startsWith("image/"))) return { icono: "image", texto: "Foto" };
  if (adjuntos.length) return { icono: "description", texto: adjuntos[0].nombre };
  return { icono: null, texto: "Aviso" };
}

/** "10:42", "Ayer", "lunes", "05/10/2026": la hora corta de la lista de chats. */
export function horaCorta(ms: number): string {
  if (!ms) return "";
  const d = new Date(ms);
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
  if (ms >= inicioHoy) return new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
  if (ms >= inicioHoy - 86_400_000) return "Ayer";
  if (ms >= inicioHoy - 6 * 86_400_000) return new Intl.DateTimeFormat("es-AR", { weekday: "long" }).format(d);
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

/** "Hoy", "Ayer", "martes 3 de noviembre": el separador de días en la conversación. */
export function etiquetaDia(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hoy = new Date();
  const mismo = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (mismo(d, hoy)) return "Hoy";
  if (mismo(d, new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1))) return "Ayer";
  const texto = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", ...(d.getFullYear() !== hoy.getFullYear() ? { year: "numeric" } : {}) }).format(d);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export const horaDe = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
};

/** El subtítulo de la cabecera: tipo de grupo y a quiénes llega, o el rol de la persona. */
export function subtituloChat(chat: ChatAviso): string {
  if (chat.clase === "grupo") {
    const n = chat.personas.length;
    return [chat.grupo ? nombreTipo(chat.grupo.tipo) : "Grupo", n ? `${n} ${n === 1 ? "persona" : "personas"}` : ""].filter(Boolean).join(" · ");
  }
  if (chat.clase === "lista") return chat.personas.map((p) => p.nombre).join(", ");
  return rolEnAvisos(chat.personas[0]?.rol) || "Mensaje directo";
}
