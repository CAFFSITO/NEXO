// src/servicios/calendario.ts
// Puerta del Calendario y de los Comunicados hacia el servidor.
//
// El servidor ya aplica las capas de visibilidad (quién ve qué evento): la
// pantalla recibe solo los eventos que le tocan y no tiene que filtrar nada
// (esa es justamente la regla de oro 4 — el permiso se decide en la cocina).

import { enviar, usarDatos } from "./api";

// ─── Calendario ─────────────────────────────────────────

export interface EventoServidor {
  id: string;
  titulo: string;
  /** Texto libre (Error 6.E.4): "reunión", "acto", "evento institucional"… */
  tipo: string;
  descripcion: string;
  lugar?: string;
  fecha: string; // ISO "2026-07-22"
  horaInicio?: string;
  horaFin?: string;
  creador: string;
  /** true si el evento lo creó quien está mirando (menú de tres puntos). */
  esMio?: boolean;
}

export interface Feriado {
  fecha: string;
  nombre: string;
}

export interface DatosCalendario {
  /** Si este usuario puede crear/editar eventos (lo decide el servidor). */
  puedeEditar: boolean;
  eventos: EventoServidor[];
  feriados: Feriado[];
}

export function usarCalendario() {
  const { datos, cargando, error, recargar } =
    usarDatos<DatosCalendario>("/api/calendario");
  return { datos, cargando, error, recargar };
}

// Una capa de visibilidad, tal como la valida el servidor (evento_visibilidad).
// La pantalla arma la lista según el rol; el servidor rechaza lo que no
// corresponda (regla de oro 4: el permiso se decide en la cocina).
export interface Visibilidad {
  alcance:
    | "todos"
    | "curso"
    | "familias-curso"
    | "familia-de-estudiante"
    | "familias-todas"
    | "docentes";
  cursoId?: number;
  estudianteId?: number;
}

// Los destinos que ESTE usuario puede darle a un evento, según su rol. Los
// arma el servidor (/api/calendario/destinos) para que el selector no ofrezca
// capas ni cursos que después la cocina va a rechazar.
export interface OpcionAlcance {
  alcance: Visibilidad["alcance"];
  label: string;
  /** Qué dato extra pide esta capa: un curso, un alumno, o nada. */
  requiere: "curso" | "estudiante" | null;
}
export interface DestinosCalendario {
  alcances: OpcionAlcance[];
  cursos: { id: number; nombre: string }[];
  estudiantes: { id: number; nombre: string; curso: string }[];
}

export function usarDestinosCalendario() {
  // Se llama desde el modal de nuevo evento, que solo abre quien puede editar:
  // por eso pedir los destinos acá siempre corresponde.
  const { datos, cargando, error } = usarDatos<DestinosCalendario>(
    "/api/calendario/destinos",
  );
  return { destinos: datos, cargando, error };
}

export interface DatosNuevoEvento {
  titulo: string;
  fecha: string; // ISO AAAA-MM-DD
  tipo?: string;
  descripcion?: string;
  lugar?: string;
  horaInicio?: string;
  horaFin?: string;
}

/** Crea un evento de verdad (fila en `eventos` + sus capas de visibilidad). */
export async function crearEvento(
  datos: DatosNuevoEvento,
  visibilidades: Visibilidad[],
): Promise<{ id: string }> {
  return enviar<{ id: string }>("/api/calendario/eventos", "POST", {
    ...datos,
    visibilidades,
  });
}

/** Borra un evento propio (o cualquiera, si es la dirección). */
export async function borrarEvento(id: string): Promise<void> {
  await enviar(`/api/calendario/eventos/${id}`, "DELETE");
}

// ─── Comunicados ────────────────────────────────────────

export interface Comunicado {
  id: string;
  titulo: string;
  contenido: string;
  emisor: string;
  emisorRol: string;
  destino: string;
  archivo: string | null;
  /** Id del adjunto, para bajarlo vía /api/archivos/:id. */
  archivoId: string | null;
  enviadoEn: string;
  leido: boolean;
}

export function usarComunicados() {
  const { datos, cargando, error, recargar } = usarDatos<{
    comunicados: Comunicado[];
    noLeidos: number;
  }>("/api/comunicados");
  return {
    comunicados: datos?.comunicados ?? null,
    noLeidos: datos?.noLeidos ?? 0,
    cargando,
    error,
    recargar,
  };
}

/** Registrar que leí un comunicado: borra su globito de no leído (Error 10.A.3). */
export async function marcarComunicadoLeido(id: string): Promise<void> {
  await enviar(`/api/comunicados/${id}/leer`, "POST");
}

/**
 * "Responder" NO escribe en el comunicado (Error 10.A.2): abre/retoma el chat
 * privado con quien lo emitió y lo marca como leído. Devuelve la conversación.
 */
export async function responderComunicado(
  id: string,
): Promise<{ conversacionId: string }> {
  return enviar<{ conversacionId: string }>(
    `/api/comunicados/${id}/responder`,
    "POST",
  );
}
