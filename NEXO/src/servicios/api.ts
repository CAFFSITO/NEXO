// src/servicios/api.ts
// La única forma en que una pantalla le pide datos a la cocina.
//
// Antes de la Etapa 2 ninguna pantalla pedía nada: cada una traía su lista de
// ejemplo escrita adentro. Ahora todas piden, y "pedir" es siempre lo mismo:
// esperar, poder fallar, poder no tener permiso. Si cada pantalla resolviera
// eso a su manera tendríamos diecisiete versiones del mismo `useEffect` y
// diecisiete carteles de error distintos (sección 1.4).
//
// Acá está la versión única: `usarDatos` para leer y `pedir` para el pedido
// suelto. Ninguna pantalla debería llamar a `fetch` por su cuenta.

import { useCallback, useEffect, useState } from "react";

export class ErrorDeApi extends Error {
  /** Código HTTP. 401 = se venció la sesión, 403 = este rol no puede. */
  readonly estado: number;

  constructor(mensaje: string, estado: number) {
    super(mensaje);
    this.name = "ErrorDeApi";
    this.estado = estado;
  }
}

/** Un pedido de lectura a la cocina. Devuelve los datos ya convertidos. */
export async function pedir<T>(ruta: string): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(ruta);
  } catch {
    // Que la cocina esté apagada no es lo mismo que "no hay datos": es el error
    // más común mientras se desarrolla y merece decirse con todas las letras.
    throw new ErrorDeApi("No se pudo contactar al servidor de NEXO.", 0);
  }

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    throw new ErrorDeApi(
      datos.error ?? "La cocina no pudo responder este pedido.",
      respuesta.status
    );
  }

  return datos as T;
}

/**
 * Un pedido de ESCRITURA a la cocina (crear, editar, borrar). Hasta la Etapa 4
 * ninguna pantalla escribía: solo leían con `pedir`. Ahora escriben, y escribir
 * es siempre lo mismo —mandar JSON, poder fallar, poder no tener permiso—, así
 * que la forma vive una sola vez acá y no una copia por pantalla (sección 1.4).
 *
 * `metodo` es POST / PUT / DELETE. Devuelve lo que responda el servidor (a
 * veces `{ id }`, a veces `{ ok: true }`). Lanza `ErrorDeApi` si algo falla.
 */
export async function enviar<T = unknown>(
  ruta: string,
  metodo: "POST" | "PUT" | "DELETE",
  cuerpo?: unknown
): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(ruta, {
      method: metodo,
      headers: cuerpo === undefined ? undefined : { "Content-Type": "application/json" },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  } catch {
    throw new ErrorDeApi("No se pudo contactar al servidor de NEXO.", 0);
  }

  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new ErrorDeApi(
      datos.error ?? "La cocina no pudo responder este pedido.",
      respuesta.status
    );
  }
  return datos as T;
}

export interface EstadoDatos<T> {
  datos: T | null;
  cargando: boolean;
  /** El motivo del fallo, con las palabras del servidor. Listo para mostrar. */
  error: string | null;
  /** Volver a preguntar. Sirve para el botón "Reintentar". */
  recargar: () => void;
}

/**
 * Lee una ventanilla del servidor y sigue su estado (cargando / error / datos).
 *
 * `ruta` tiene que ser estable entre renders (una constante, o algo memorizado):
 * es lo que decide cuándo volver a preguntar.
 */
export function usarDatos<T>(ruta: string): EstadoDatos<T> {
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  const recargar = useCallback(() => setIntento((n) => n + 1), []);

  useEffect(() => {
    // Si la pantalla se cierra (o cambia la ruta) mientras el pedido viaja, la
    // respuesta que llega tarde no debe pisar el estado de una pantalla que ya
    // no está: sin esto, React avisa que se actualizó algo desmontado y, peor,
    // una respuesta vieja puede pisar a una nueva.
    let vigente = true;

    setCargando(true);
    setError(null);

    pedir<T>(ruta)
      .then((resultado) => {
        if (!vigente) return;
        setDatos(resultado);
        setCargando(false);
      })
      .catch((fallo: unknown) => {
        if (!vigente) return;
        setError(
          fallo instanceof Error ? fallo.message : "No se pudieron traer los datos."
        );
        setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [ruta, intento]);

  return { datos, cargando, error, recargar };
}
