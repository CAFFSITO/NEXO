// src/servicios/comunidad.ts
// Puerta de las tres pestañas de Comunidad (Feed, Debates, Tendencias) hacia el
// servidor. Ninguna trae ya su lista escrita adentro.
//
// Alcance de la Etapa 2: LECTURA. Los números que se muestran (votos, posturas,
// comentarios) son reales, pero votar, comentar y participar todavía no
// funcionan: eso es escritura y va en la Etapa 5.

import type { Rol } from "../paginas/components/shared/roles";
import { enviar, pedir, usarDatos } from "./api";

export type Voto = "a-favor" | "en-contra";
export type ObjetoTipo = "publicacion" | "debate";
export type ObjetoVotable = "publicacion" | "debate" | "comentario";

// ─── Feed ───────────────────────────────────────────────

export interface Publicacion {
  id: string;
  autorId: string;
  autor: string;
  autorRol: Rol;
  autorAvatar?: string;
  contenido: string;
  creadoEn: string;
  tieneImagen: boolean;
  votosAFavor: number;
  votosEnContra: number;
  comentarios: number;
  /** Mi voto, privado. null = todavía no voté (Error 2.B.1). */
  miVoto: "a-favor" | "en-contra" | null;
}

export function usarPublicaciones() {
  const { datos, cargando, error, recargar } =
    usarDatos<{ publicaciones: Publicacion[] }>("/api/comunidad/publicaciones");
  return { publicaciones: datos?.publicaciones ?? null, cargando, error, recargar };
}

// ─── Debates ────────────────────────────────────────────

export interface Debate {
  id: string;
  titulo: string;
  descripcion: string;
  autorId: string;
  autor: string;
  autorRol: Rol;
  creadoEn: string;
  cierraEn: string | null;
  abierto: boolean;
  votosAFavor: number;
  votosEnContra: number;
  participantes: number;
  comentarios: number;
  estoyParticipando: boolean;
  miPostura: "a-favor" | "en-contra" | null;
}

export function usarDebates() {
  const { datos, cargando, error, recargar } =
    usarDatos<{ debates: Debate[] }>("/api/comunidad/debates");
  return { debates: datos?.debates ?? null, cargando, error, recargar };
}

// ─── Tendencias ─────────────────────────────────────────

export type AlcanceTendencias = "mi-escuela" | "todas-las-escuelas";

export interface Tendencia {
  tipo: "publicacion" | "debate";
  id: string;
  titulo: string;
  puntaje: number;
  institucion: string;
}

export function usarTendencias(alcance: AlcanceTendencias) {
  const { datos, cargando, error, recargar } = usarDatos<{
    alcance: AlcanceTendencias;
    tendencias: Tendencia[];
  }>(`/api/comunidad/tendencias?alcance=${alcance}`);
  return { tendencias: datos?.tendencias ?? null, cargando, error, recargar };
}

// ═══════════════════════════════════════════════════════════
// ESCRITURA (Etapa 5). La vidriera pide; el servidor decide y valida.
// ═══════════════════════════════════════════════════════════

/** Resultado de votar: mi voto (privado) y los totales frescos. */
export interface ResultadoVoto {
  miVoto: Voto | null;
  votosAFavor: number;
  votosEnContra: number;
}

/**
 * Voto único y privado (Error 2.B.1). Tocar el mismo sentido lo quita; el otro
 * lo cambia. El servidor garantiza un solo voto por persona y objeto.
 */
export function votar(objetoTipo: ObjetoVotable, objetoId: string, valor: 1 | -1) {
  return enviar<ResultadoVoto>("/api/comunidad/voto", "POST", {
    objetoTipo,
    objetoId: Number(objetoId),
    valor,
  });
}

// ─── Detalle con hilo de comentarios (Errores 2.B.2, 2.B.3, 2.B.7) ──

export interface Comentario {
  id: string;
  contenido: string;
  autor: string;
  autorRol: Rol;
  autorAvatar: string | null;
  creadoEn: string;
  votosAFavor: number;
  votosEnContra: number;
  miVoto: Voto | null;
}

export interface DetalleObjeto {
  tipo: ObjetoTipo;
  id: string;
  titulo: string | null;
  contenido: string;
  autorId: string;
  autor: string;
  autorRol: Rol;
  autorAvatar: string | null;
  creadoEn: string;
  votosAFavor: number;
  votosEnContra: number;
  miVoto: Voto | null;
}

export interface DetalleComunidad {
  objeto: DetalleObjeto;
  comentarios: Comentario[];
}

export function traerDetalle(tipo: ObjetoTipo, id: string) {
  return pedir<DetalleComunidad>(`/api/comunidad/detalle?tipo=${tipo}&id=${id}`);
}

export function comentar(objetoTipo: ObjetoTipo, objetoId: string, contenido: string) {
  return enviar<{ id: string }>("/api/comunidad/comentarios", "POST", {
    objetoTipo,
    objetoId: Number(objetoId),
    contenido,
  });
}

// ─── Debates: participar y fijar postura (Error 2.B.6 / 14.5) ──

export function participar(debateId: string) {
  return enviar("/api/comunidad/debates/" + debateId + "/participar", "POST");
}

export function fijarPostura(debateId: string, postura: Voto) {
  return enviar("/api/comunidad/debates/" + debateId + "/postura", "PUT", { postura });
}

// ─── Crear ──

export function crearPublicacion(contenido: string, imagenId?: string) {
  return enviar<{ id: string }>("/api/comunidad/publicaciones", "POST", {
    contenido,
    imagenId: imagenId ? Number(imagenId) : undefined,
  });
}

export function crearDebate(titulo: string, descripcion: string, cierraEn: string | null) {
  return enviar<{ id: string }>("/api/comunidad/debates", "POST", {
    titulo,
    descripcion,
    cierraEn: cierraEn ?? "",
  });
}

// ─── Menú de tres puntos: denunciar / eliminar (Errores 2.B.5, 2.B.8) ──

export function denunciar(objetoTipo: ObjetoVotable, objetoId: string, motivo: string) {
  return enviar("/api/comunidad/denuncias", "POST", {
    objetoTipo,
    objetoId: Number(objetoId),
    motivo,
  });
}

export function eliminarContenido(objetoTipo: ObjetoVotable, objetoId: string) {
  const ruta =
    objetoTipo === "publicacion"
      ? "/api/comunidad/publicaciones/"
      : objetoTipo === "debate"
        ? "/api/comunidad/debates/"
        : "/api/comunidad/comentarios/";
  return enviar(ruta + objetoId, "DELETE");
}

/**
 * Qué acciones ofrece el menú de tres puntos según el rol (14.4.4). Es solo la
 * apariencia: el servidor vuelve a validar cada acción. Estudiante y profesor
 * denuncian; dirección, preceptor y centro (en debates) eliminan; el autor
 * puede eliminar lo suyo.
 */
export function puedeEliminar(rol: Rol, objetoTipo: ObjetoVotable, esAutor: boolean): boolean {
  if (esAutor) return true;
  if (rol === "admin-academico" || rol === "preceptor") return true;
  if (rol === "centro-estudiantes" && objetoTipo === "debate") return true;
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
