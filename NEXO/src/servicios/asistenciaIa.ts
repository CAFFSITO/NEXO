// src/servicios/asistenciaIa.ts
// Puerta de la Asistencia IA hacia el servidor (sección 14.16, Errores 2.G.1/2.G.2).
//
// La respuesta se genera en el servicio local o institucional privado.

import { enviar, useDatos, pedir } from "./api";

export interface MensajeIa {
  id: string;
  rol: "user" | "ai";
  contenido: string;
  creadoEn: string;
}

export interface EstadoIa {
  configurada: boolean;
  modo: "local-servidor" | "institucional";
  modelo: string | null;
  disponible: boolean;
  privacidad: string;
}

export interface FuenteIa { tipo: "biblioteca" | "tarea" | "documento" | "leccion" | "proyecto"; id: number; titulo?: string }

export function useEstadoIa() {
  const { datos, cargando, error } = useDatos<EstadoIa>("/api/asistencia-ia/estado");
  return { estado: datos, cargando, error };
}

/** Trae el historial de la conversación del estudiante con el tutor. */
export async function traerHistorialIa(): Promise<MensajeIa[]> {
  const datos = await pedir<{ mensajes: MensajeIa[] }>("/api/asistencia-ia/historial");
  return datos.mensajes;
}

/** Manda un mensaje y devuelve la respuesta real del tutor. */
export async function enviarMensajeIa(contenido: string, fuentes: FuenteIa[] = []): Promise<string> {
  // La generación local puede tardar más que las lecturas comunes (25 s).
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 125_000);
  try {
    const r = await fetch("/api/asistencia-ia/mensaje", {
      method: "POST", credentials: "same-origin", signal: controller.signal,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ contenido, fuentes }),
    });
    if (r.status === 401) window.dispatchEvent(new CustomEvent("nexo:sesion-vencida"));
    const datos = await r.json() as { respuesta?: string; error?: string };
    if (!r.ok) throw new Error(datos.error || "El modelo privado no respondió.");
    if (!datos.respuesta) throw new Error("El modelo privado devolvió una respuesta vacía.");
    return datos.respuesta;
  } catch (error) {
    if (controller.signal.aborted) {
      await cancelarMensajeIa().catch(() => {});
      throw new Error("La respuesta tardó demasiado y se canceló.");
    }
    throw error;
  } finally { window.clearTimeout(timeout); }
}

export async function cancelarMensajeIa(): Promise<void> {
  await enviar("/api/asistencia-ia/cancelar", "POST", {});
}

export async function traerModelosIa(): Promise<{modelos: {nombre: string; tamano: number}[]; seleccionado: string}> {
  return pedir("/api/asistencia-ia/modelos");
}

export async function buscarFuentesIa(buscar = ""): Promise<FuenteIa[]> {
  const datos = await pedir<{fuentes: FuenteIa[]}>("/api/asistencia-ia/fuentes?buscar=" + encodeURIComponent(buscar));
  return datos.fuentes;
}

/** Borra la conversación (acción real del menú de tres puntos, Error 2.G.2). */
export async function borrarHistorialIa(): Promise<void> {
  await enviar("/api/asistencia-ia/historial", "DELETE");
}
