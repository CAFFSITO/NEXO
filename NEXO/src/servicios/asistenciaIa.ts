// src/servicios/asistenciaIa.ts
// Puerta de la Asistencia IA hacia el servidor (sección 14.16, Errores 2.G.1/2.G.2).
//
// La respuesta ya NO es fija: el servidor arma el pedido (system prompt de
// config_ia + la conversación) y llama al proveedor de IA gratuito. La CLAVE
// vive en el servidor (variable de entorno), nunca acá en el navegador.

import { enviar, usarDatos, pedir } from "./api";

export interface MensajeIa {
  id: string;
  rol: "user" | "ai";
  contenido: string;
  creadoEn: string;
}

export interface EstadoIa {
  configurada: boolean;
  proveedor: string | null;
  modelo: string | null;
  /** Si el servidor tiene la clave cargada. La clave misma nunca viaja. */
  clavePresente: boolean;
}

export function usarEstadoIa() {
  const { datos, cargando, error } = usarDatos<EstadoIa>("/api/asistencia-ia/estado");
  return { estado: datos, cargando, error };
}

/** Trae el historial de la conversación del estudiante con el tutor. */
export async function traerHistorialIa(): Promise<MensajeIa[]> {
  const datos = await pedir<{ mensajes: MensajeIa[] }>("/api/asistencia-ia/historial");
  return datos.mensajes;
}

/** Manda un mensaje y devuelve la respuesta real del tutor. */
export async function enviarMensajeIa(contenido: string): Promise<string> {
  const datos = await enviar<{ respuesta: string }>(
    "/api/asistencia-ia/mensaje",
    "POST",
    { contenido }
  );
  return datos.respuesta;
}

/** Borra la conversación (acción real del menú de tres puntos, Error 2.G.2). */
export async function borrarHistorialIa(): Promise<void> {
  await enviar("/api/asistencia-ia/historial", "DELETE");
}
