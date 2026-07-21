// src/servicios/chat.ts
// Puerta del Chat hacia el servidor.
//
// Etapa 2: lectura (qué conversaciones tenés, con quién, el hilo de cada una).
// Etapa 6: escritura y tiempo real: enviar un mensaje (Error 2.F.4), marcar la
// conversación como leída al abrirla (Error 2.F.5), adjuntar archivos (Error
// 2.F.3) y la moderación del preceptor (Error 7.A.3). El aviso en vivo llega por
// el mensajero (ver servicios/tiempoReal.ts).

import type { Rol } from "../paginas/components/shared/roles";
import { enviar, pedir, usarDatos } from "./api";
import { subirArchivo } from "./archivos";

export interface Conversacion {
  id: string;
  tipo: "directa" | "grupo-curso" | "clase";
  nombre: string;
  avatarUrl?: string;
  participantes: { id: number; nombre: string; rol: Rol }[];
  ultimoMensaje: string;
  ultimoEn: string | null;
  noLeidos: number;
}

export interface Mensaje {
  id: string;
  autorId: number;
  autor: string;
  autorAvatar?: string;
  /** true si lo escribió quien está mirando, decidido en el servidor. */
  mio: boolean;
  contenido: string;
  archivo: string | null;
  enviadoEn: string;
}

export function usarConversaciones() {
  const { datos, cargando, error, recargar } =
    usarDatos<{ conversaciones: Conversacion[] }>("/api/chat/conversaciones");
  return { conversaciones: datos?.conversaciones ?? null, cargando, error, recargar };
}

export function usarMensajes(conversacionId: string | null) {
  // Cuando no hay conversación elegida se pide una ruta imposible que el hook
  // igual maneja; más simple es pedir siempre y dejar que el componente no
  // monte el hook hasta tener id. Acá se resuelve pidiendo una ruta vacía.
  const { datos, cargando, error, recargar } = usarDatos<{ mensajes: Mensaje[] }>(
    conversacionId
      ? `/api/chat/conversaciones/${conversacionId}/mensajes`
      : "/api/chat/conversaciones/0/mensajes"
  );
  return { mensajes: datos?.mensajes ?? null, cargando, error, recargar };
}

// ── Escritura (Etapa 6) ──────────────────────────────────────────────────────

/**
 * Envía un mensaje. Si viene un archivo, primero lo sube al servicio de archivos
 * (14.19) y después manda el mensaje con la referencia (Error 2.F.3). Devuelve
 * el mensaje ya guardado, con "mio: true", para pintarlo al instante.
 */
export async function enviarMensaje(
  conversacionId: string,
  contenido: string,
  archivo?: File | null
): Promise<Mensaje> {
  let archivoId: string | undefined;
  if (archivo) {
    const subido = await subirArchivo(archivo);
    archivoId = subido.id;
  }
  const { mensaje } = await enviar<{ mensaje: Mensaje }>(
    `/api/chat/conversaciones/${conversacionId}/mensajes`,
    "POST",
    { contenido, archivoId }
  );
  return mensaje;
}

/**
 * Marca una conversación como leída (Error 2.F.5). Abrirla borra su globito de
 * no leídos, sin necesidad de responder nada.
 */
export async function marcarConversacionLeida(conversacionId: string): Promise<void> {
  await enviar(`/api/chat/conversaciones/${conversacionId}/leer`, "POST");
}

// ── Moderación del preceptor (Error 7.A.3) y comunidad del curso (7.A.5) ─────

export interface CursoPreceptor {
  id: string;
  nombre: string;
  estudiantes: number;
  /** Conversación grupo-curso: la comunidad del curso, tipo grupo de WhatsApp. */
  comunidadId: string;
}

export interface ConversacionModerable {
  id: string;
  tipo: "directa" | "grupo-curso" | "clase";
  nombre: string;
  ultimoMensaje: string;
}

/** Los cursos a cargo del preceptor, con su comunidad asegurada. */
export function usarCursosPreceptor() {
  const { datos, cargando, error, recargar } =
    usarDatos<{ cursos: CursoPreceptor[] }>("/api/chat/mis-cursos-preceptor");
  return { cursos: datos?.cursos ?? null, cargando, error, recargar };
}

/** Las conversaciones moderables de un curso (comunidad + charlas entre alumnos). */
export async function conversacionesAModerar(cursoId: string): Promise<ConversacionModerable[]> {
  const { conversaciones } = await pedir<{ conversaciones: ConversacionModerable[] }>(
    `/api/chat/moderacion/${cursoId}`
  );
  return conversaciones;
}

/** El hilo de una conversación que el preceptor está moderando (solo lectura). */
export async function mensajesModerados(
  cursoId: string,
  conversacionId: string
): Promise<Mensaje[]> {
  const { mensajes } = await pedir<{ mensajes: Mensaje[] }>(
    `/api/chat/moderacion/${cursoId}/${conversacionId}/mensajes`
  );
  return mensajes;
}
