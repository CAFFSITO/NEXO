// src/servicios/comunidad.ts
// Puerta de la Comunidad (estilo X y Reddit), los Debates por bloques y las
// Tendencias hacia el servidor. La vidriera pide; el servidor decide y valida
// (quién publica, quién sube multimedia, quién fija, quién ve qué resultado).

import type { Rol } from "../paginas/components/shared/roles";
import { enviar, pedir, useDatos } from "./api";

export type Voto = "a-favor" | "en-contra";
export type ObjetoTipo = "publicacion" | "debate";
export type ObjetoVotable = "publicacion" | "debate" | "comentario" | "aporte";

export interface Reaccion { emoji: string; cantidad: number; mia: boolean }
export interface Adjunto { id: string; nombre: string; tipo: string; tamano: number; clase: "imagen" | "video" | "audio" | "archivo" }

export interface Encuesta {
  opciones: { id: string; texto: string; votos: number | null }[];
  total: number;
  miOpcion: string | null;
  cierraEn: string;
  cerrada: boolean;
}

export interface CitaResumen {
  id: string;
  eliminada?: boolean;
  autorId?: string;
  autor?: string;
  autorAvatar?: string;
  handle?: string;
  contenido?: string;
  creadoEn?: string;
  adjuntos?: Adjunto[];
}

export type Responden = "todos" | "seguidos" | "mencionados";

// ─── Feed ───────────────────────────────────────────────

export interface Publicacion {
  id: string;
  /** Única en la lista (un repost repite la publicación con otra clave). */
  clave: string;
  autorId: string;
  autor: string;
  autorRol: Rol;
  autorAvatar?: string;
  handle: string;
  loSigo: boolean;
  contenido: string;
  creadoEn: string;
  editado: boolean;
  editable: boolean;
  tieneImagen: boolean;
  adjuntos: Adjunto[];
  votosAFavor: number;
  votosEnContra: number;
  /** Mi voto, privado. null = todavía no voté. */
  miVoto: Voto | null;
  comentarios: number;
  reposts: number;
  miRepost: boolean;
  citas: number;
  vistas: number;
  guardado: boolean;
  reacciones: Reaccion[];
  encuesta: Encuesta | null;
  cita: CitaResumen | null;
  /** Hilo estilo X: la primera publicación trae el total. */
  hilo: { raizId: string; orden: number; total?: number } | null;
  menciones: { id: string; handle: string; nombre: string }[];
  hashtags: string[];
  responden: Responden;
  puedoResponder: boolean;
  fijado: boolean;
  fijadoEn: string | null;
  programada: boolean;
  publicarEn: string | null;
  repostadoPor: { id: string; nombre: string } | null;
}

export type VistaFeed = "para-vos" | "siguiendo" | "recientes" | "guardados" | "menciones" | "perfil";

export function usePublicaciones(opciones: { vista?: VistaFeed; usuario?: string; tag?: string; q?: string } = {}) {
  const p = new URLSearchParams();
  if (opciones.vista) p.set("vista", opciones.vista);
  if (opciones.usuario) p.set("usuario", opciones.usuario);
  if (opciones.tag) p.set("tag", opciones.tag);
  if (opciones.q) p.set("q", opciones.q);
  const consulta = p.toString();
  const { datos, cargando, error, recargar } = useDatos<{ publicaciones: Publicacion[] }>("/api/comunidad/publicaciones" + (consulta ? "?" + consulta : ""));
  return { publicaciones: datos?.publicaciones ?? null, cargando, error, recargar };
}

export interface NuevaPublicacion {
  contenido: string;
  publicarEn?: string | null;
  adjuntos?: number[];
  encuesta?: { opciones: string[]; duracionHoras: number } | null;
  citaId?: number | null;
  responden?: Responden;
  /** Las publicaciones que siguen a la primera (hilo). */
  hilo?: { contenido: string; adjuntos?: number[] }[];
}

export function crearPublicacion(datos: NuevaPublicacion) {
  return enviar<{ id: string; hilo: string[] }>("/api/comunidad/publicaciones", "POST", datos);
}
export const editarPublicacion = (id: string, contenido: string) => enviar(`/api/comunidad/publicaciones/${id}`, "PUT", { contenido });
export const repostear = (id: string) => enviar<{ activo: boolean; total: number }>(`/api/comunidad/publicaciones/${id}/repost`, "POST");
export const guardarPublicacion = (id: string) => enviar<{ activo: boolean }>(`/api/comunidad/publicaciones/${id}/guardar`, "POST");
export const votarEncuesta = (id: string, opcionId: string) => enviar<Encuesta>(`/api/comunidad/encuestas/${id}/votar`, "POST", { opcionId: Number(opcionId) });
export const registrarVistas = (ids: string[]) => enviar("/api/comunidad/vistas", "POST", { ids: ids.map(Number) });

/** Fijar sin límite: lo último que se fija queda arriba. Solo con la capacidad "fijar". */
export function fijar(tipo: ObjetoTipo, id: string, fijado: boolean) {
  return enviar(`/api/comunidad/${tipo === "publicacion" ? "publicaciones" : "debates"}/${id}/${fijado ? "fijar" : "desfijar"}`, "POST");
}
/** Compatibilidad: fijar una publicación. */
export const fijarPublicacion = (id: string, fijado: boolean) => fijar("publicacion", id, fijado);

export function reaccionar(objetoTipo: ObjetoVotable, objetoId: string, emoji: string) {
  return enviar<{ reacciones: Reaccion[] }>("/api/comunidad/reacciones", "POST", { objetoTipo, objetoId: Number(objetoId), emoji });
}

// ─── Personas ───────────────────────────────────────────

export interface PersonaComunidad { id: string; nombre: string; handle: string; rol: Rol; avatar: string | null }

export interface PerfilComunidad {
  id: string;
  nombre: string;
  handle: string;
  rol: Rol;
  perfil: { nombre: string; color: string; icono: string };
  avatar: string | null;
  seguidores: number;
  siguiendo: number;
  publicaciones: number;
  debates: number;
  votosRecibidos: number;
  loSigo: boolean;
  meSigue: boolean;
  silenciado: boolean;
  esYo: boolean;
}

export const usePerfilComunidad = (id: string | null) => useDatos<PerfilComunidad>(id ? `/api/comunidad/usuarios/${id}` : null);
export const seguir = (id: string) => enviar<{ activo: boolean }>(`/api/comunidad/usuarios/${id}/seguir`, "POST");
export const silenciar = (id: string) => enviar<{ activo: boolean }>(`/api/comunidad/usuarios/${id}/silenciar`, "POST");
export const buscarPersonas = (q: string) => pedir<{ personas: PersonaComunidad[] }>(`/api/comunidad/personas?q=${encodeURIComponent(q)}`);
export const useHashtags = () => useDatos<{ hashtags: { tag: string; publicaciones: number; personas: number }[] }>("/api/comunidad/hashtags");
export const useSugerencias = () => useDatos<{ personas: PersonaComunidad[] }>("/api/comunidad/sugerencias");

// ─── Debates por bloques ────────────────────────────────

export type TipoBloque = "postura" | "opciones" | "escala" | "ranking" | "argumentos" | "propuestas" | "abierta";
export type VisibilidadResultados = "siempre" | "al-participar" | "al-cierre";

export interface Debate {
  id: string;
  titulo: string;
  descripcion: string;
  autorId: string;
  autor: string;
  autorRol: Rol;
  autorAvatar?: string;
  handle: string;
  creadoEn: string;
  cierraEn: string | null;
  abierto: boolean;
  cerradoEn: string | null;
  fijado: boolean;
  fijadoEn: string | null;
  resultados: VisibilidadResultados;
  anonimo: boolean;
  bloques: { id: string; tipo: TipoBloque; titulo: string }[];
  participantes: number;
  comentarios: number;
  aportes: number;
  cambiosDeOpinion: number;
  conclusion: { texto: string; en: string; por?: string | null } | null;
  votosAFavor: number;
  votosEnContra: number;
  consenso: number | null;
  estoyParticipando: boolean;
  miPostura: string | null;
  apoyo: { aFavor: number; enContra: number; miVoto: Voto | null };
  reacciones: Reaccion[];
  adjuntos: Adjunto[];
  puedoGestionar: boolean;
}

export function useDebates() {
  const { datos, cargando, error, recargar } = useDatos<{ debates: Debate[] }>("/api/comunidad/debates");
  return { debates: datos?.debates ?? null, cargando, error, recargar };
}

export interface OpcionBloque { id: string; texto: string }
export interface ConfigBloque {
  neutral?: boolean;
  opciones?: OpcionBloque[];
  multiple?: boolean;
  maximo?: number;
  minimo?: number;
  etiquetaMin?: string;
  etiquetaMax?: string;
  maximoPorPersona?: number;
}

export interface Aporte {
  id: string;
  lado: Voto | null;
  texto: string;
  autorId: string | null;
  autor: string;
  autorRol: Rol | null;
  autorAvatar: string | null;
  handle: string | null;
  esMio: boolean;
  creadoEn: string;
  votosAFavor: number;
  votosEnContra: number;
  miVoto: Voto | null;
  convencidos: number;
  meConvencio: boolean;
  respuestas: number;
  reacciones: Reaccion[];
  adjuntos: Adjunto[];
  puedoBorrar: boolean;
}

export interface ResultadosBloque {
  total: number;
  aFavor?: number;
  enContra?: number;
  neutral?: number;
  consenso?: number | null;
  opciones?: { id: string; texto: string; votos?: number; puntos?: number; posicionPromedio?: number | null }[];
  distribucion?: { valor: number; cantidad: number }[];
  promedio?: number | null;
  mediana?: number | null;
}

export interface BloqueDebate {
  id: string;
  tipo: TipoBloque;
  titulo: string;
  config: ConfigBloque;
  miRespuesta?: unknown;
  respondieron?: number;
  resultadosVisibles?: boolean;
  resultados?: ResultadosBloque | null;
  aportes?: Aporte[];
  misAportes?: number;
}

export interface DetalleDebate {
  debate: Debate & { puedoAportar: boolean; puedoCerrar: boolean; puedoConcluir: boolean; puedoEliminar: boolean };
  bloques: BloqueDebate[];
  estadisticas: { participantes: number; respuestas: number; aportes: number; cambiosDeOpinion: number; comentarios: number };
  comentarios: Comentario[];
}

export const useDetalleDebate = (id: string | null) => useDatos<DetalleDebate>(id ? `/api/comunidad/debates/${id}` : null);

export interface NuevoDebate {
  titulo: string;
  descripcion: string;
  cierraEn: string | null;
  resultados: VisibilidadResultados;
  anonimo: boolean;
  bloques: { tipo: TipoBloque; titulo: string; config: Record<string, unknown> }[];
  adjuntos?: number[];
}

export const crearDebate = (datos: NuevoDebate) => enviar<{ id: string }>("/api/comunidad/debates", "POST", datos);
export const responderBloque = (debateId: string, bloqueId: string, valor: unknown) =>
  enviar<DetalleDebate>(`/api/comunidad/debates/${debateId}/responder`, "POST", { bloqueId: Number(bloqueId), valor });
export const aportar = (debateId: string, bloqueId: string, texto: string, lado?: Voto | null, adjuntos?: number[]) =>
  enviar<DetalleDebate & { id: string }>(`/api/comunidad/debates/${debateId}/aportes`, "POST", { bloqueId: Number(bloqueId), texto, lado, adjuntos });
export const convencio = (aporteId: string) => enviar<{ activo: boolean; convencidos: number }>(`/api/comunidad/debates/aportes/${aporteId}/convencio`, "POST");
export const borrarAporte = (aporteId: string) => enviar(`/api/comunidad/debates/aportes/${aporteId}`, "DELETE");
export const cerrarDebate = (id: string) => enviar<DetalleDebate>(`/api/comunidad/debates/${id}/cerrar`, "POST");
export const concluirDebate = (id: string, texto: string) => enviar<DetalleDebate>(`/api/comunidad/debates/${id}/conclusion`, "PUT", { texto });

// ─── Tendencias ─────────────────────────────────────────

// "mi-escuela": el ranking de la propia escuela (algoritmo de su genoma).
// "nacional": lo que cada dirección aprobó para salir, con el algoritmo único
// de la plataforma.
export type AlcanceTendencias = "mi-escuela" | "nacional";

/** El camino de algo institucional a lo nacional (lo decide la dirección). */
export type EstadoNacional = "propuesta" | "aprobada" | "rechazada" | "retirada";

export interface Tendencia {
  tipo: "publicacion" | "debate";
  id: string;
  titulo: string;
  puntaje: number;
  institucion: string;
  /** Personas distintas (que no son el autor) que participaron en la ventana. */
  participantes: number;
  comentarios: number;
  aFavor: number;
  enContra: number;
  esDeMiEscuela: boolean;
  /** Para la comunidad, solo "aprobada" o null; la dirección ve todo el camino. */
  estadoNacional: EstadoNacional | null;
}

export function useTendencias(alcance: AlcanceTendencias) {
  const { datos, cargando, error, recargar } = useDatos<{
    alcance: AlcanceTendencias;
    desactivado?: boolean;
    tendencias: Tendencia[];
  }>(`/api/comunidad/tendencias?alcance=${alcance}`);
  return { tendencias: datos?.tendencias ?? null, desactivado: datos?.desactivado === true, cargando, error, recargar };
}

/** Una fila de la bandeja de la dirección (propuesta, aprobada o descartada). */
export interface FilaNacional {
  tipo: "publicacion" | "debate";
  id: string;
  titulo: string;
  estado: EstadoNacional;
  puntajeAlProponer: number;
  puntajeActual: number | null;
  posicionEscuela: number | null;
  participantes: number | null;
  posicionNacional: number | null;
  propuestaEn: string;
  decididoEn: string | null;
}

export interface BandejaNacional {
  propuestas: FilaNacional[];
  aprobadas: FilaNacional[];
  descartadas: FilaNacional[];
  reglas: { activo: boolean; candidatas: number; umbralNacional: number; nacionalActivo: boolean; maxPorEscuela: number };
}

/** La bandeja de la dirección. Sin `activa` no se pide (el resto de los perfiles no la tiene). */
export function useBandejaNacional(activa: boolean) {
  return useDatos<BandejaNacional>(activa ? "/api/comunidad/tendencias/direccion" : null);
}

/** Llevar a lo nacional, descartar una propuesta o retirar lo que ya salió. */
export function decidirTendenciaNacional(tipo: "publicacion" | "debate", id: string, decision: "aprobar" | "rechazar" | "retirar") {
  return enviar<{ estado: EstadoNacional; mensaje: string }>("/api/comunidad/tendencias/nacional", "POST", { tipo, id: Number(id), decision });
}

// ═══════════════════════════════════════════════════════════
// CONVERSACIÓN: votos, respuestas anidadas, denuncias
// ═══════════════════════════════════════════════════════════

/** Resultado de votar: mi voto (privado) y los totales frescos. */
export interface ResultadoVoto {
  miVoto: Voto | null;
  votosAFavor: number;
  votosEnContra: number;
}

/** Flecha verde (+1) o roja (−1). Tocar el mismo sentido lo quita; el otro lo cambia. */
export function votar(objetoTipo: ObjetoVotable, objetoId: string, valor: 1 | -1) {
  return enviar<ResultadoVoto>("/api/comunidad/voto", "POST", { objetoTipo, objetoId: Number(objetoId), valor });
}

export interface Comentario {
  id: string;
  padreId: string | null;
  aporteId: string | null;
  contenido: string;
  eliminado: boolean;
  autorId: string | null;
  autor: string;
  autorRol: Rol | null;
  autorAvatar: string | null;
  handle: string | null;
  esMio: boolean;
  editado: boolean;
  editable: boolean;
  creadoEn: string;
  votosAFavor: number;
  votosEnContra: number;
  miVoto: Voto | null;
  reacciones: Reaccion[];
  adjuntos: Adjunto[];
}

export interface DetalleComunidad {
  objeto: Partial<Publicacion> & { tipo: ObjetoTipo; id: string; titulo: string | null; contenido: string; autorId: string; autor: string; autorRol: Rol | null; autorAvatar: string | null; creadoEn: string; votosAFavor: number; votosEnContra: number; miVoto: Voto | null };
  hilo: Publicacion[];
  comentarios: Comentario[];
  /** Tendencia nacional de OTRA escuela: se lee, pero no se vota ni se responde, y sin nombres. */
  soloLectura?: boolean;
  institucion?: string;
}

export function traerDetalle(tipo: ObjetoTipo, id: string) {
  return pedir<DetalleComunidad>(`/api/comunidad/detalle?tipo=${tipo}&id=${id}`);
}
export const useDetalle = (tipo: ObjetoTipo, id: string | null) => useDatos<DetalleComunidad>(id ? `/api/comunidad/detalle?tipo=${tipo}&id=${id}` : null);

export function comentar(objetoTipo: ObjetoTipo, objetoId: string, contenido: string, extra: { padreId?: string | null; aporteId?: string | null; adjuntos?: number[] } = {}) {
  return enviar<{ id: string; comentario: Comentario }>("/api/comunidad/comentarios", "POST", {
    objetoTipo,
    objetoId: Number(objetoId),
    contenido,
    padreId: extra.padreId ? Number(extra.padreId) : undefined,
    aporteId: extra.aporteId ? Number(extra.aporteId) : undefined,
    adjuntos: extra.adjuntos,
  });
}
export const editarComentario = (id: string, contenido: string) => enviar(`/api/comunidad/comentarios/${id}`, "PUT", { contenido });

export function denunciar(objetoTipo: ObjetoVotable, objetoId: string, motivo: string) {
  return enviar("/api/comunidad/denuncias", "POST", { objetoTipo, objetoId: Number(objetoId), motivo });
}

export function eliminarContenido(objetoTipo: ObjetoVotable, objetoId: string) {
  const ruta = objetoTipo === "publicacion" ? "/api/comunidad/publicaciones/"
    : objetoTipo === "debate" ? "/api/comunidad/debates/"
    : objetoTipo === "aporte" ? "/api/comunidad/debates/aportes/"
    : "/api/comunidad/comentarios/";
  return enviar(ruta + objetoId, "DELETE");
}

/**
 * Qué ofrece el menú de tres puntos (14.4.4). Es solo la apariencia: el
 * servidor vuelve a validar. Dirección y preceptor moderan, el centro modera
 * debates y el autor borra lo suyo; el resto denuncia.
 */
export function puedeEliminar(rol: Rol, objetoTipo: ObjetoVotable, esAutor: boolean): boolean {
  if (esAutor) return true;
  if (rol === "admin-academico" || rol === "preceptor") return true;
  if (rol === "centro-estudiantes" && (objetoTipo === "debate" || objetoTipo === "aporte")) return true;
  return false;
}

// ─── Bandeja de moderación (14.4.4) ──

export interface DenunciaModeracion {
  id: string;
  objetoTipo: ObjetoVotable;
  objetoId: string;
  motivo: string;
  creadoEn: string;
  denunciante: string;
  extracto: string;
  objetoEliminado: boolean;
}

export function traerDenuncias() {
  return pedir<{ denuncias: DenunciaModeracion[] }>("/api/comunidad/denuncias");
}

export function resolverDenuncia(id: string, resultado: "contenido-eliminado" | "descartada") {
  return enviar("/api/comunidad/denuncias/" + id, "PUT", { resultado });
}
