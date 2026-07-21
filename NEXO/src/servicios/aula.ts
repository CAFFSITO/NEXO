// src/servicios/aula.ts
// Puerta del Aula Virtual hacia el servidor (Etapa 9, sección 14.3).
//
// El video y el audio los resuelve Jitsi dentro del navegador; TODO lo demás
// —planificación, etapas, quién está conectado, la pizarra, el pulso, la alerta
// y el chat— sale de la cocina, que lee y escribe en nexo.db. Ningún dato de
// esta pantalla se inventa (regla de oro 3).

import { enviar, pedir, usarDatos } from "./api";

// ─── Tipos ──────────────────────────────────────────────

export type EstadoClase = "planificada" | "en-vivo" | "finalizada" | "cancelada";
export type EstadoEtapa = "pendiente" | "en-progreso" | "completado";

export interface Catedra {
  id: number;
  etiqueta: string;
}

export interface ClasePlanificada {
  id: string;
  titulo: string;
  fechaHora: string;
  estado: EstadoClase;
  materiaCurso: string;
  iniciable: boolean;
  enVivo: boolean;
}

export interface ClaseEstudiante {
  id: string;
  titulo: string;
  fechaHora: string;
  estado: EstadoClase;
  materiaCurso: string;
  docente: string;
  enVivo: boolean;
}

export interface Etapa {
  id: string;
  orden: number;
  titulo: string;
  duracion: number | null;
  estado: EstadoEtapa;
}

export interface DetalleClase {
  id: string;
  titulo: string;
  materiaCurso: string;
  docente: string;
  fechaHora: string;
  estado: EstadoClase;
  objetivos: string;
  materiales: string;
  sala: string;
  umbralPct: number;
  umbralMin: number;
  esDocente: boolean;
}

export interface Persona {
  id: number;
  nombre: string;
  avatarUrl?: string;
}

export interface Pulso {
  total: number;
  entiendo: Persona[];
  masOMenos: Persona[];
  perdido: Persona[];
  pctEnRiesgo: number;
}

export interface PreguntaClase {
  id: string;
  texto: string;
  autor: string;
  creadoEn: string;
}

export interface Trazo {
  secuencia: number;
  datos: unknown;
}

export interface EntradaSala {
  sala: string;
  conversacionId: string;
  nombre: string;
  esDocente: boolean;
}

// ─── Planificación (docente) ────────────────────────────

/** Mis cátedras, para elegir al planificar una clase. */
export function usarCatedras() {
  const { datos, cargando, error } = usarDatos<{ catedras: Catedra[] }>("/api/aula/catedras");
  return { catedras: datos?.catedras ?? null, cargando, error };
}

/** Mis clases planificadas, con estado y si ya son iniciables (Errores 3.B.9/10). */
export function usarClasesPlanificadas() {
  const { datos, cargando, error, recargar } =
    usarDatos<{ clases: ClasePlanificada[] }>("/api/aula/clases");
  return { clases: datos?.clases ?? null, cargando, error, recargar };
}

export interface NuevaClase {
  catedraId: number;
  titulo: string;
  fechaHora: string;
  objetivos: string;
  materiales: string;
  etapas: { titulo: string; duracion?: number }[];
}

export async function crearClase(clase: NuevaClase): Promise<string> {
  const { id } = await enviar<{ id: string }>("/api/aula/clases", "POST", clase);
  return id;
}

export async function iniciarClase(claseId: string): Promise<void> {
  await enviar(`/api/aula/clases/${claseId}/iniciar`, "POST");
}

export async function finalizarClase(claseId: string): Promise<void> {
  await enviar(`/api/aula/clases/${claseId}/finalizar`, "POST");
}

export async function ajustarUmbral(claseId: string, pct: number, min: number): Promise<void> {
  await enviar(`/api/aula/clases/${claseId}/umbral`, "PUT", { pct, min });
}

// ─── Estudiante ─────────────────────────────────────────

/** Las clases en vivo / próximas de mi curso (para entrar). */
export function usarMisClases() {
  const { datos, cargando, error, recargar } =
    usarDatos<{ clases: ClaseEstudiante[] }>("/api/aula/mis-clases");
  return { clases: datos?.clases ?? null, cargando, error, recargar };
}

// ─── Sala en vivo (docente y estudiantes) ───────────────

export async function detalleClase(claseId: string): Promise<{ clase: DetalleClase; etapas: Etapa[] }> {
  return pedir<{ clase: DetalleClase; etapas: Etapa[] }>(`/api/aula/clases/${claseId}`);
}

export async function entrarASala(claseId: string): Promise<EntradaSala> {
  return enviar<EntradaSala>(`/api/aula/clases/${claseId}/entrar`, "POST");
}

export async function salirDeSala(claseId: string): Promise<void> {
  await enviar(`/api/aula/clases/${claseId}/salir`, "POST");
}

export async function conectadosDeClase(claseId: string): Promise<Persona[]> {
  const { conectados } = await pedir<{ conectados: Persona[] }>(`/api/aula/clases/${claseId}/conectados`);
  return conectados;
}

export async function marcarEtapa(
  claseId: string,
  etapaId: string,
  accion: "iniciar" | "completar"
): Promise<Etapa[]> {
  const { etapas } = await enviar<{ etapas: Etapa[] }>(
    `/api/aula/clases/${claseId}/etapas/${etapaId}`,
    "POST",
    { accion }
  );
  return etapas;
}

// ─── Pizarra (docente dibuja, todos ven — Error 2.C.1) ──

export async function trazosDeClase(claseId: string): Promise<Trazo[]> {
  const { trazos } = await pedir<{ trazos: Trazo[] }>(`/api/aula/clases/${claseId}/pizarra`);
  return trazos;
}

export async function enviarTrazo(claseId: string, datos: unknown): Promise<void> {
  await enviar(`/api/aula/clases/${claseId}/pizarra`, "POST", { datos });
}

export async function limpiarPizarra(claseId: string): Promise<void> {
  await enviar(`/api/aula/clases/${claseId}/pizarra/limpiar`, "POST");
}

// ─── Pulso y preguntas ──────────────────────────────────

export async function marcarComprension(
  claseId: string,
  estado: "entiendo" | "mas-o-menos" | "perdido"
): Promise<void> {
  await enviar(`/api/aula/clases/${claseId}/comprension`, "POST", { estado });
}

export async function pulsoDeClase(claseId: string): Promise<Pulso> {
  return pedir<Pulso>(`/api/aula/clases/${claseId}/pulso`);
}

export async function enviarPregunta(claseId: string, texto: string): Promise<void> {
  await enviar(`/api/aula/clases/${claseId}/preguntas`, "POST", { texto });
}

export async function preguntasPendientes(claseId: string): Promise<PreguntaClase[]> {
  const { preguntas } = await pedir<{ preguntas: PreguntaClase[] }>(`/api/aula/clases/${claseId}/preguntas`);
  return preguntas;
}

export async function responderPregunta(preguntaId: string): Promise<void> {
  await enviar(`/api/aula/preguntas/${preguntaId}/responder`, "POST");
}
