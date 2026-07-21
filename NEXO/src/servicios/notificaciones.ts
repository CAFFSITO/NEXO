// src/servicios/notificaciones.ts
// Puerta de las Notificaciones hacia la cocina (Etapa 6, sección 14.15).
//
// Sirve a dos consumidores: la pantalla de Notificaciones (la lista completa) y
// el menú lateral (el resumen: cuántas sin leer para la campana y el globito de
// chat). Los dos leen de la misma cocina, así el número de la campana y el de la
// lista no pueden contradecirse.

import { useCallback, useEffect, useState } from "react";
import { enviar, pedir, usarDatos } from "./api";
import { useTiempoReal } from "./tiempoReal";

// Señal local: cuando esta misma pestaña marca algo como leído (abrir un chat,
// tocar una notificación), el servidor no le manda un evento en vivo a sí misma,
// así que se avisa a mano para que la campana y los globitos se actualicen ya.
const EVENTO_REFRESCO = "nexo:refrescar-notificaciones";
export function avisarCambioNotificaciones() {
  window.dispatchEvent(new Event(EVENTO_REFRESCO));
}

export interface Notificacion {
  id: string;
  tipo: string;
  titulo: string;
  cuerpo: string;
  objetoTipo: string | null;
  objetoId: number | null;
  creadoEn: string;
  leida: boolean;
}

export interface ResumenNotificaciones {
  /** Notificaciones sin leer: el número de la campana. */
  notificaciones: number;
  /** Mensajes de chat sin leer: el globito del ítem Chat del menú. */
  chat: number;
}

export function usarNotificaciones() {
  const { datos, cargando, error, recargar } =
    usarDatos<{ notificaciones: Notificacion[] }>("/api/notificaciones");
  return { notificaciones: datos?.notificaciones ?? null, cargando, error, recargar };
}

export async function marcarNotificacionLeida(id: string): Promise<void> {
  await enviar(`/api/notificaciones/${id}/leer`, "POST");
  avisarCambioNotificaciones();
}

export async function marcarTodasLeidas(): Promise<void> {
  await enviar("/api/notificaciones/leer-todas", "POST");
  avisarCambioNotificaciones();
}

/**
 * El resumen para el menú (campana + globitos). No usa `usarDatos` porque se
 * recarga solo cuando llega un evento en vivo o cuando la pantalla lo pide, no
 * en un intervalo: el mensajero avisa, no hace falta preguntar cada tanto.
 */
export function usarResumenNotificaciones() {
  const [resumen, setResumen] = useState<ResumenNotificaciones>({ notificaciones: 0, chat: 0 });

  const recargar = useCallback(() => {
    pedir<ResumenNotificaciones>("/api/notificaciones/resumen")
      .then(setResumen)
      .catch(() => {
        // Sin sesión o cocina apagada: se deja el último número conocido en vez
        // de romper el menú. El globito es un adorno informativo, no crítico.
      });
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  // Se actualiza solo cuando llega algo en vivo (un mensaje o una notificación)
  // y cuando esta pestaña marca algo leído (señal local). Nada de preguntar cada
  // tanto: el mensajero avisa.
  useTiempoReal(
    useCallback(
      (evento) => {
        if (evento.tipo === "mensaje" || evento.tipo === "notificacion") recargar();
      },
      [recargar]
    )
  );

  useEffect(() => {
    window.addEventListener(EVENTO_REFRESCO, recargar);
    return () => window.removeEventListener(EVENTO_REFRESCO, recargar);
  }, [recargar]);

  return { resumen, recargar };
}
