// src/servicios/anuncios.ts
// Puerta de los Anuncios obligatorios hacia la cocina (servidor/anuncios.js).
//
// Un anuncio no es un chat: es una tarjeta que le aparece encima de todo a cada
// destinatario y que tiene que leer y marcar como leída para seguir usando
// NEXO. Quién manda a quién lo deciden los grupos de difusión que arma la
// dirección; acá solo se trae y se manda. Toda regla vive en el servidor.

import type { CSSProperties } from "react";
import { enviar, pedir } from "./api";
import { contraste, hexAHsl, hexValido, hslAHex, mezclar } from "./color";
import { cicloDe } from "./gestionAcademica";
import { urlPreview } from "./archivos";

/** Un archivo que viaja con el aviso: cualquier tipo, o una nota de voz. */
export interface AdjuntoAviso {
  id: string;
  nombre: string;
  tipo: string;
  tamano: number;
  /** Nota de voz grabada en NEXO: se muestra como reproductor. */
  voz: boolean;
  duracionMs: number | null;
}

export type TipoGrupo = "uno-a-muchos" | "muchos-a-uno" | "muchos-a-muchos";

/** Un curso a cargo de un preceptor: con su turno y especialidad, para armar grupos. */
export interface CursoDePersona {
  nombre: string;
  anio: number;
  turno: string | null;
  especialidad: string | null;
}

export interface PersonaAnuncio {
  id: string;
  nombre: string;
  rol: string;
  avatarUrl: string | null;
  /** Solo los preceptores (en las listas para elegir): sus cursos a cargo. */
  cursos?: CursoDePersona[];
}

export interface Aviso {
  reaccion?: string | null;
  id: string;
  cuerpo: string;
  /** ISO en UTC ("…Z"): se muestra en la hora local de quien mira. */
  creadoEn: string;
  /** null si quien lo mandó ya no está en NEXO. */
  autor: PersonaAnuncio | null;
  /** null = mensaje directo a personas puntuales. */
  grupo: { id: string; nombre: string; tipo: TipoGrupo; color: string } | null;
  /** El color de la tarjeta: el del grupo (o el de los mensajes directos). */
  color: string;
  /** Archivos y notas de voz. Un aviso puede traer solo esto, sin texto. */
  adjuntos: AdjuntoAviso[];
}

export interface AvisoLeido extends Aviso {
  leidoEn: string;
  reaccion: string | null;
}

export interface Lectura {
  respuestas: number;
  persona: PersonaAnuncio;
  leidoEn: string | null;
  reaccion: string | null;
}

export interface AvisoEnviado extends Aviso {
  destinatarios: Lectura[];
  leidos: number;
  total: number;
}

export interface DestinoGrupo {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: TipoGrupo;
  color: string;
  /** A quiénes les llega si mando a este grupo. */
  destinatarios: PersonaAnuncio[];
}

export interface Destinos {
  grupos: DestinoGrupo[];
  personas: PersonaAnuncio[];
  colorDirecto: string;
  maxCuerpo: number;
  maxAdjuntos: number;
  maxPersonas: number;
}

export interface GrupoAnuncios {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: TipoGrupo;
  color: string;
  creadoEn: string;
  creadoPor: string | null;
  enviados: number;
  emisores: PersonaAnuncio[];
  receptores: PersonaAnuncio[];
  miembros: PersonaAnuncio[];
}

export interface GruposDeEscuela {
  grupos: GrupoAnuncios[];
  personas: PersonaAnuncio[];
  colorDirecto: string;
  /** Los colores del diseño de la escuela (el acento primero). */
  paleta?: string[];
}

/** Lo que se manda para crear o editar un grupo. */
export interface DatosGrupo {
  nombre: string;
  descripcion: string;
  tipo: TipoGrupo;
  color: string;
  emisores: string[];
  receptores: string[];
  miembros: string[];
  /** Solo el Maestro: de qué escuela es el grupo. */
  institucionId?: string;
}

// ── Recibir ─────────────────────────────────────────────
export function pedirPendientes(signal?: AbortSignal) {
  return pedir<{ anuncios: Aviso[]; total: number; emojis: string[] }>("/api/anuncios/pendientes", signal);
}

export function marcarAvisoLeido(id: string) {
  return enviar<{ leidoEn: string; pendientes: number }>(`/api/anuncios/${id}/leer`, "POST");
}

export function reaccionarAviso(id: string, emoji: string | null) {
  return enviar<{ reaccion: string | null }>(`/api/anuncios/${id}/reaccion`, "PUT", { emoji });
}

export interface RespuestaAviso {
  id: string; autor: string; autorId: string; mio: boolean; cuerpo: string; creadoEn: string;
  adjuntos: AdjuntoAviso[];
}
export interface HiloAviso {
  anuncio: { id: string; cuerpo: string; autor: string | null };
  destinatario: { id: string; nombre: string };
  puedeResponder: boolean;
  respuestas: RespuestaAviso[];
}
export function pedirRespuestasAviso(id: string, destinatarioId?: string, signal?: AbortSignal) {
  return pedir<HiloAviso>(`/api/anuncios/${id}/respuestas${destinatarioId ? `?destinatarioId=${encodeURIComponent(destinatarioId)}` : ""}`, signal);
}
export function responderAviso(id: string, cuerpo: string, archivoIds: string[], destinatarioId?: string) {
  return enviar<{ respuesta: RespuestaAviso }>(`/api/anuncios/${id}/respuestas`, "POST", { cuerpo, archivoIds, destinatarioId });
}

export function pedirLeidos({ q = "", antes }: { q?: string; antes?: string } = {}, signal?: AbortSignal) {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (antes) params.set("antes", antes);
  const consulta = params.toString();
  return pedir<{ anuncios: AvisoLeido[]; hayMas: boolean; emojis: string[] }>(
    "/api/anuncios/leidos" + (consulta ? "?" + consulta : ""), signal,
  );
}

// ── Mandar ──────────────────────────────────────────────
export function pedirEnviados(antes?: string, signal?: AbortSignal) {
  return pedir<{ anuncios: AvisoEnviado[]; hayMas: boolean }>(
    "/api/anuncios/enviados" + (antes ? `?antes=${encodeURIComponent(antes)}` : ""), signal,
  );
}

export function pedirDestinos(signal?: AbortSignal) {
  return pedir<Destinos>("/api/anuncios/destinos", signal);
}

export function enviarAviso(datos: {
  grupoId?: string;
  personas?: string[];
  cuerpo: string;
  /** Archivos ya subidos a /api/archivos; voz = nota de voz grabada. */
  adjuntos?: { id: string; voz?: boolean; duracionMs?: number }[];
}) {
  return enviar<{ anuncio: AvisoEnviado }>("/api/anuncios", "POST", datos);
}

/** Borrar para todos un aviso que mandé: desaparece también para quien ya lo leyó. */
export function borrarAvisoParaTodos(id: string) {
  return enviar<{ ok: boolean; mensaje: string }>(`/api/anuncios/${id}`, "DELETE");
}

// ── Grupos (la dirección o el Maestro) ──────────────────
export function pedirGrupos(institucionId?: string, signal?: AbortSignal) {
  return pedir<GruposDeEscuela>(
    "/api/anuncios/grupos" + (institucionId ? `?institucion=${encodeURIComponent(institucionId)}` : ""), signal,
  );
}

export function crearGrupo(datos: DatosGrupo) {
  return enviar<{ grupo: GrupoAnuncios }>("/api/anuncios/grupos", "POST", datos);
}

export function editarGrupo(id: string, datos: DatosGrupo) {
  return enviar<{ grupo: GrupoAnuncios }>(`/api/anuncios/grupos/${id}`, "PUT", datos);
}

export function archivarGrupo(id: string) {
  return enviar(`/api/anuncios/grupos/${id}`, "DELETE");
}

// ── Presentación ────────────────────────────────────────
export const TIPOS_GRUPO: { id: TipoGrupo; nombre: string; ejemplo: string; icono: string }[] = [
  { id: "uno-a-muchos", nombre: "Uno a muchos", ejemplo: "La directora les escribe a los preceptores.", icono: "campaign" },
  { id: "muchos-a-uno", nombre: "Muchos a uno", ejemplo: "Todos le escriben a la misma persona.", icono: "move_to_inbox" },
  { id: "muchos-a-muchos", nombre: "Todos con todos", ejemplo: "Cualquiera escribe y les llega a los demás.", icono: "hub" },
];

export const nombreTipo = (tipo: TipoGrupo) => TIPOS_GRUPO.find((t) => t.id === tipo)?.nombre ?? tipo;

/** Colores pensados para que la tarjeta entera se vea bien y se lea fácil. */
export const PALETA_GRUPOS: { color: string; nombre: string }[] = [
  { color: "#2563eb", nombre: "Azul" },
  { color: "#0891b2", nombre: "Celeste" },
  { color: "#0d9488", nombre: "Turquesa" },
  { color: "#059669", nombre: "Verde" },
  { color: "#65a30d", nombre: "Lima" },
  { color: "#d97706", nombre: "Ámbar" },
  { color: "#ea580c", nombre: "Naranja" },
  { color: "#dc2626", nombre: "Rojo" },
  { color: "#db2777", nombre: "Rosa" },
  { color: "#475569", nombre: "Pizarra" },
];

/** Un tono casi negro del mismo color (para el texto oscuro y las sombras). */
function oscuroDe(color: string, luz: number): string {
  const { h, s } = hexAHsl(color);
  return hslAHex({ h, s: Math.min(60, s), l: luz });
}

/** Texto claro u oscuro según el color de fondo de la tarjeta. */
export function tintaSobre(fondo: string): string {
  return contraste(fondo, "#ffffff") >= 3.2 ? "#ffffff" : oscuroDe(fondo, 12);
}

/** Las variables CSS de una tarjeta de este color (ver anuncios.css). */
export function estiloAviso(color: string): CSSProperties {
  const base = hexValido(color) ? color : "#7c3aed";
  const tinta = tintaSobre(base);
  const clara = tinta === "#ffffff";
  // Con tinta oscura (colores claros) el degradé oscurece menos, para que el
  // texto se siga leyendo hasta abajo de la tarjeta.
  const oscuro = mezclar(base, oscuroDe(base, 4), clara ? 0.42 : 0.16);
  return {
    "--av-color": base,
    "--av-oscuro": oscuro,
    "--av-tinta": tinta,
    // El texto que va SOBRE una superficie del color de la tinta (el botón).
    "--av-contra": clara ? oscuro : base,
  } as CSSProperties;
}

/** "lunes 5 de octubre · 10:42" en la hora local de quien mira. */
export function fechaLarga(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dia = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" }).format(d);
  const hora = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
  return `${dia} · ${hora}`;
}

/** "10:42" si es de hoy; "ayer 10:42"; "5 oct · 10:42" si no. */
export function fechaCompacta(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hora = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
  const hoy = new Date();
  const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);
  if (d.toDateString() === hoy.toDateString()) return `hoy ${hora}`;
  if (d.toDateString() === ayer.toDateString()) return `ayer ${hora}`;
  const dia = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(d).replace(".", "");
  return `${dia} · ${hora}`;
}

/** Copiar al portapapeles, con un plan B para navegadores sin la API moderna. */
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = texto;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

const ROL_EN_AVISOS: Record<string, string> = {
  "admin-academico": "Dirección",
  preceptor: "Preceptoría",
  secretaria: "Secretaría",
  profesor: "Docente",
};
/** Cómo se nombra el rol de alguien en un aviso ("Dirección", "Preceptoría"). */
export const rolEnAvisos = (rol: string | undefined) => (rol ? ROL_EN_AVISOS[rol] ?? rol : "");

/** El ícono del tipo de grupo (o del mensaje directo). */
export function iconoDestino(tipo: TipoGrupo | null | undefined): string {
  return TIPOS_GRUPO.find((t) => t.id === tipo)?.icono ?? "person";
}

/** Iniciales para el avatar cuando la persona no tiene foto. */
export function iniciales(nombre: string | undefined | null): string {
  const partes = String(nombre ?? "").replace(/^(Prof\.|Preceptora?|Directora?)\s+/i, "").split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase() || "?";
}

// ── Adjuntos ────────────────────────────────────────────

/** El ícono de un archivo según su tipo (o su extensión, si el tipo es genérico). */
export function iconoArchivo(tipo: string, nombre: string): string {
  const ext = nombre.toLowerCase().split(".").pop() ?? "";
  if (tipo.startsWith("image/")) return "image";
  if (tipo.startsWith("audio/")) return "graphic_eq";
  if (tipo.startsWith("video/")) return "movie";
  if (tipo === "application/pdf" || ext === "pdf") return "picture_as_pdf";
  if (/sheet|excel|csv/.test(tipo) || ["xls", "xlsx", "ods", "csv"].includes(ext)) return "table_chart";
  if (/presentation|powerpoint/.test(tipo) || ["ppt", "pptx", "odp"].includes(ext)) return "slideshow";
  if (/word|opendocument\.text|rtf/.test(tipo) || ["doc", "docx", "odt", "rtf"].includes(ext)) return "description";
  if (/zip|rar|7z|compressed/.test(tipo) || ["zip", "rar", "7z"].includes(ext)) return "folder_zip";
  if (tipo.startsWith("text/")) return "article";
  return "draft";
}

/** Un audio (nota de voz grabada o archivo de audio): se escucha en el aviso. */
export function esAudio(adjunto: Pick<AdjuntoAviso, "voz" | "tipo">): boolean {
  return adjunto.voz || adjunto.tipo.startsWith("audio/");
}

/** Los archivos que el navegador deja poner en el portapapeles: imágenes y texto. */
export function sePuedeCopiar(adjunto: Pick<AdjuntoAviso, "tipo">): boolean {
  return adjunto.tipo.startsWith("image/") || adjunto.tipo.startsWith("text/") || adjunto.tipo === "application/json";
}

/**
 * Copia un archivo para pegarlo en otro lado: una imagen como imagen (pasada a
 * PNG, el único formato de imagen que aceptan los portapapeles), y un archivo de
 * texto como texto. El resto de los tipos el navegador no los deja copiar.
 */
export async function copiarArchivo(adjunto: AdjuntoAviso): Promise<boolean> {
  try {
    const respuesta = await fetch(urlPreview(adjunto.id));
    if (!respuesta.ok) return false;
    if (adjunto.tipo.startsWith("image/")) {
      let imagen = await respuesta.blob();
      if (imagen.type !== "image/png") {
        const mapa = await createImageBitmap(imagen);
        const lienzo = document.createElement("canvas");
        lienzo.width = mapa.width;
        lienzo.height = mapa.height;
        lienzo.getContext("2d")?.drawImage(mapa, 0, 0);
        imagen = await new Promise<Blob>((listo, fallo) => lienzo.toBlob((b) => (b ? listo(b) : fallo(new Error("png"))), "image/png"));
      }
      await navigator.clipboard.write([new ClipboardItem({ "image/png": imagen })]);
      return true;
    }
    return copiarTexto(await respuesta.text());
  } catch {
    return false;
  }
}

/** "0:07", "12:30": la duración de una nota de voz. */
export function duracionLegible(ms: number | null | undefined): string {
  const total = Math.max(0, Math.round((ms ?? 0) / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

// ── Turno y especialidad de cada preceptor (para armar grupos) ──

/** Lo que se sabe de una persona por sus cursos: turnos, especialidades y ciclos. */
export function perfilPorCursos(p: PersonaAnuncio) {
  const cursos = p.cursos ?? [];
  const unicos = (lista: (string | null)[]) => [...new Set(lista.filter((x): x is string => Boolean(x)))];
  return {
    cursos,
    turnos: unicos(cursos.map((c) => c.turno)),
    especialidades: unicos(cursos.map((c) => c.especialidad)),
    ciclos: [...new Set(cursos.map((c) => cicloDe(c.anio)))],
  };
}

/** "Turno mañana · Informática · 4° A, 5° A" (vacío si no tiene cursos). */
export function resumenDeCursos(p: PersonaAnuncio): string {
  const { cursos, turnos, especialidades } = perfilPorCursos(p);
  if (!cursos.length) return "";
  const turno = turnos.length ? `Turno ${turnos.map((t) => t.toLocaleLowerCase("es")).join(" y ")}` : "";
  return [turno, especialidades.join(", "), cursos.map((c) => c.nombre).join(", ")].filter(Boolean).join(" · ");
}
