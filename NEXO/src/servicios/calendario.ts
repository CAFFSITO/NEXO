// src/servicios/calendario.ts
// Puerta del Calendario y de los Comunicados hacia el servidor.
//
// El calendario tiene JERARQUÍA: cada nivel de la escuela le muestra eventos al
// suyo y a los de abajo (estudiantes y familias, solo eventos personales). El
// servidor decide todo eso y expande las repeticiones: la pantalla recibe solo
// las ocurrencias que le tocan (regla de oro 4: el permiso se decide en la cocina).

import { enviar, useDatos } from "./api";

// ─── Calendario ─────────────────────────────────────────

export type Frecuencia = "diaria" | "semanal" | "mensual" | "anual";

/** La regla de un evento que se repite (la valida y la expande el servidor). */
export interface Recurrencia {
  frecuencia: Frecuencia;
  intervalo: number;
  /** Días de la semana (0 = domingo) para "semanal". */
  dias?: number[];
  /** "dia" = el mismo número; "posicion" = el 2° martes; "ultimo" = el último viernes. */
  modoMensual?: "dia" | "posicion" | "ultimo";
  hasta?: string;
  veces?: number;
  saltarFeriados?: boolean;
  soloHabiles?: boolean;
}

export interface NivelResumen { id: string; nombre: string; indice: number }

/** Un destino tal como lo guarda el servidor (quién ve el evento). */
export interface Destino {
  tipo: "todos" | "nivel" | "perfil" | "curso" | "persona" | "familia-de";
  valor?: string | null;
  cursoId?: number | null;
  rol?: "estudiante" | "familia" | "profesor" | "preceptor" | null;
  usuarioId?: number | null;
}

/** Una ocurrencia de un evento (un evento que se repite trae una por fecha). */
export interface EventoServidor {
  /** Único por ocurrencia: "12" o "12@2026-10-06". */
  id: string;
  eventoId: string;
  /** Fecha original de la ocurrencia en la serie (null si no se repite). */
  ocurrencia: string | null;
  titulo: string;
  /** Texto libre (Error 6.E.4); `categoria` es la que le corresponde. */
  tipo: string;
  categoria: string;
  color: string;
  descripcion: string;
  lugar?: string;
  enlace?: string;
  fecha: string; // ISO "2026-07-22"
  fechaFin?: string;
  horaInicio?: string;
  horaFin?: string;
  todoElDia: boolean;
  creador: string;
  creadorId: string;
  creadorRol: string;
  /** El nivel de la jerarquía de quien lo creó. */
  nivel: NivelResumen | null;
  /** true si el evento lo creó quien está mirando. */
  esMio?: boolean;
  puedeEditar: boolean;
  /** Sin destinatarios: solo lo ve quien lo creó. */
  personal: boolean;
  audiencia: { tipo: Destino["tipo"]; etiqueta: string }[];
  /** Solo para quien lo puede editar: los destinos tal cual. */
  destinos?: Destino[];
  recurrente: boolean;
  recurrencia: Recurrencia | null;
  recurrenciaTexto: string;
  inicioSerie: string;
  finSerie?: string;
  modificada: boolean;
  obligatorio: boolean;
  pideConfirmacion: boolean;
  miRespuesta: Respuesta | null;
  oculto: boolean;
  recordatorios: number[];
  misRecordatorios: number[] | null;
  archivo: { id: string; nombre: string } | null;
  /** La dirección lo ve porque supervisa, no porque sea para ella. */
  supervision: boolean;
}

export type Respuesta = "si" | "quizas" | "no";

export interface Feriado {
  fecha: string;
  nombre: string;
}

export interface Categoria { id: string; nombre: string; color: string; icono: string }

export interface DatosCalendario {
  puedeEditar: boolean;
  puedeCrear: boolean;
  /** Si este nivel puede mostrarle eventos a otras personas. */
  comparte: boolean;
  puedeSupervisar: boolean;
  nivel: NivelResumen & { politica: PoliticaNivel };
  niveles: NivelResumen[];
  categorias: Categoria[];
  desde: string;
  hasta: string;
  eventos: EventoServidor[];
  feriados: Feriado[];
}

export type PoliticaNivel = "nivel-y-abajo" | "abajo" | "personal";

/**
 * Las ocurrencias de un rango. Sin rango, el servidor usa uno amplio alrededor
 * de hoy (lo que necesitan los paneles de "próximos eventos").
 */
export function useCalendario(opciones: { desde?: string; hasta?: string; supervision?: boolean } = {}) {
  const parametros = new URLSearchParams();
  if (opciones.desde) parametros.set("desde", opciones.desde);
  if (opciones.hasta) parametros.set("hasta", opciones.hasta);
  if (opciones.supervision) parametros.set("supervision", "1");
  const consulta = parametros.toString();
  const { datos, cargando, error, recargar } = useDatos<DatosCalendario>("/api/calendario" + (consulta ? "?" + consulta : ""));
  return { datos, cargando, error, recargar };
}

export interface PersonaInvitable { id: number; nombre: string; rol: string; perfil?: string; nivel?: string; detalle: string }

/** A quién le puede mostrar eventos ESTA persona, según su nivel (lo arma el servidor). */
export interface DestinosCalendario {
  nivel: NivelResumen & { politica: PoliticaNivel };
  comparte: boolean;
  todos: boolean;
  niveles: (NivelResumen & { permitido: boolean; politica: PoliticaNivel })[];
  perfiles: { clave: string; nombre: string; color: string; icono: string; nivel: string; nivelNombre: string; permitido: boolean }[];
  cursos: { id: number; nombre: string; roles: NonNullable<Destino["rol"]>[] }[];
  personas: PersonaInvitable[];
  familiasDe: PersonaInvitable[];
  categorias: Categoria[];
  limiteCentro: { limite: number; usados: number } | null;
}

export function useDestinosCalendario() {
  const { datos, cargando, error } = useDatos<DestinosCalendario>("/api/calendario/destinos");
  return { destinos: datos, cargando, error };
}

export interface DatosNuevoEvento {
  titulo: string;
  fecha: string; // ISO AAAA-MM-DD
  fechaFin?: string | null;
  todoElDia?: boolean;
  tipo?: string;
  descripcion?: string;
  lugar?: string;
  enlace?: string;
  color?: string | null;
  horaInicio?: string;
  horaFin?: string;
  recurrencia?: Recurrencia | null;
  recordatorios?: number[];
  obligatorio?: boolean;
  pideConfirmacion?: boolean;
  avisar?: boolean;
  audiencia?: Destino[];
}

export type AlcanceCambio = "serie" | "este" | "siguientes";

/** Crea un evento (fila en `eventos` + sus destinos). */
export function crearEvento(datos: DatosNuevoEvento): Promise<{ id: string }> {
  return enviar<{ id: string }>("/api/calendario/eventos", "POST", datos);
}

/** Edita un evento: toda la serie, solo esta ocurrencia o esta y las siguientes. */
export function editarEvento(id: string, datos: DatosNuevoEvento, alcance: AlcanceCambio = "serie", ocurrencia?: string | null) {
  return enviar<{ ok: true; id: string }>(`/api/calendario/eventos/${id}`, "PUT", { ...datos, alcance, ocurrencia });
}

/** Borra un evento (o solo una ocurrencia, o desde una ocurrencia en adelante). */
export async function borrarEvento(id: string, alcance: AlcanceCambio = "serie", ocurrencia?: string | null): Promise<void> {
  const q = alcance === "serie" ? "" : `?alcance=${alcance}&ocurrencia=${ocurrencia ?? ""}`;
  await enviar(`/api/calendario/eventos/${id}${q}`, "DELETE");
}

export function responderEvento(id: string, respuesta: Respuesta | null) {
  return enviar<{ ok: true }>(`/api/calendario/eventos/${id}/respuesta`, "POST", { respuesta });
}

export function preferenciasEvento(id: string, cambios: { oculto?: boolean; recordatorios?: number[] | null }) {
  return enviar<{ ok: true }>(`/api/calendario/eventos/${id}/preferencias`, "POST", cambios);
}

export interface Confirmaciones {
  resumen: { si: number; quizas: number; no: number; pendientes: number; total: number };
  personas: { id: number; nombre: string; perfil: string; respuesta: Respuesta | null }[];
}

export function useConfirmaciones(id: string | null) {
  return useDatos<Confirmaciones>(id ? `/api/calendario/eventos/${id}/confirmaciones` : null);
}

export interface Revision {
  personas: number;
  porNivel: { nivel: string; personas: number }[];
  ocurrencias: number;
  choques: { titulo: string; categoria: string; fecha: string; horaInicio?: string; horaFin?: string; afectados: number; visible: boolean }[];
}

/** Antes de guardar: a cuántas personas llega y con qué choca. */
export function revisarEvento(datos: DatosNuevoEvento, excluir?: string) {
  return enviar<Revision>("/api/calendario/revisar", "POST", { ...datos, excluir });
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
  /** Fijado arriba por la dirección (sale de fijado_en, Prompt 13). */
  fijado: boolean;
}

export function useComunicados() {
  const { datos, cargando, error, recargar } = useDatos<{
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

// ─── Comunicados emitidos (los que ve/gestiona la dirección) ────────────────

export interface ComunicadoEnviado {
  id: string;
  titulo: string;
  contenido: string;
  enviadoEn: string;
  destino: string;
  leidos: number;
  destinatarios: number;
  /** Fijado arriba para las familias (fijado_en real, Prompt 13). */
  fijado: boolean;
  /** Programado a futuro: todavía no le llegó a las familias. */
  programada: boolean;
  /** Cuándo se publica (ISO), si está programado. null si ya se envió. */
  publicarEn: string | null;
}

export function useComunicadosEnviados() {
  const { datos, cargando, error, recargar } = useDatos<{
    comunicados: ComunicadoEnviado[];
  }>("/api/comunicados/enviados");
  return {
    comunicados: datos?.comunicados ?? null,
    cargando,
    error,
    recargar,
  };
}

/**
 * Fijar / desfijar un comunicado (Prompt 13). El servidor solo lo permite a la
 * dirección de la misma institución; la vidriera solo refleja ese permiso.
 */
export async function fijarComunicado(id: string, fijado: boolean): Promise<void> {
  const accion = fijado ? "fijar" : "desfijar";
  await enviar(`/api/comunicados/${id}/${accion}`, "POST");
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
