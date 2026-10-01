import { useCallback, useEffect, useState } from "react";

export class ErrorDeApi extends Error {
  readonly estado: number;
  constructor(mensaje: string, estado: number) {
    super(mensaje);
    this.name = "ErrorDeApi";
    this.estado = estado;
  }
}

/** Errores, vencimiento de sesión y límite de espera comunes a toda la aplicación. */
async function solicitar<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const controlador = new AbortController();
  const cancelar = () => controlador.abort();
  opciones.signal?.addEventListener("abort", cancelar, { once: true });
  if (opciones.signal?.aborted) controlador.abort();
  let vencio = false;
  const tiempo = window.setTimeout(() => {
    vencio = true;
    controlador.abort();
  }, 25_000);

  try {
    const respuesta = await fetch(ruta, {
      ...opciones,
      credentials: "same-origin",
      signal: controlador.signal,
      headers: { Accept: "application/json", ...opciones.headers },
    });
    if (respuesta.status === 401) window.dispatchEvent(new CustomEvent("nexo:sesion-vencida"));
    const contenido = await respuesta.text();
    let datos: unknown;
    try {
      datos = contenido ? JSON.parse(contenido) : undefined;
    } catch {
      throw new ErrorDeApi("El servidor devolvió una respuesta no válida. Reintentá en unos instantes.", respuesta.status);
    }
    if (!respuesta.ok) {
      const detalle = datos && typeof datos === "object" && "error" in datos
        ? (datos as { error: unknown }).error : null;
      throw new ErrorDeApi(
        typeof detalle === "string" ? detalle : respuesta.status === 401
          ? "Tu sesión venció. Volvé a ingresar."
          : "No se pudo completar la operación. Reintentá en unos instantes.",
        respuesta.status,
      );
    }
    if (datos === undefined && respuesta.status !== 204) {
      throw new ErrorDeApi("El servidor respondió sin datos. Reintentá la operación.", respuesta.status);
    }
    return datos as T;
  } catch (error) {
    if (error instanceof ErrorDeApi || opciones.signal?.aborted) throw error;
    throw new ErrorDeApi(
      vencio ? "El servidor tardó demasiado en responder. Reintentá la operación."
        : "No se pudo contactar al servidor de NEXO. Revisá tu conexión y reintentá.", 0,
    );
  } finally {
    window.clearTimeout(tiempo);
    opciones.signal?.removeEventListener("abort", cancelar);
  }
}

export function pedir<T>(ruta: string, signal?: AbortSignal): Promise<T> {
  return solicitar<T>(ruta, { signal });
}

export function enviar<T = unknown>(
  ruta: string, metodo: "POST" | "PUT" | "PATCH" | "DELETE", cuerpo?: unknown,
): Promise<T> {
  return solicitar<T>(ruta, {
    method: metodo,
    headers: cuerpo === undefined ? undefined : { "Content-Type": "application/json" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
}

export interface EstadoDatos<T> {
  datos: T | null;
  cargando: boolean;
  error: string | null;
  recargar: () => void;
}

/** null pausa la consulta. Una respuesta anterior nunca puede pisar la ruta actual. */
export function useDatos<T>(ruta: string | null): EstadoDatos<T> {
  const [respuesta, setRespuesta] = useState<{
    ruta: string; intento: number; datos: T | null; error: string | null;
  } | null>(null);
  const [intento, setIntento] = useState(0);
  const recargar = useCallback(() => setIntento((n) => n + 1), []);

  useEffect(() => {
    if (ruta === null) return;
    const controlador = new AbortController();
    pedir<T>(ruta, controlador.signal).then((datos) => {
      if (!controlador.signal.aborted) setRespuesta({ ruta, intento, datos, error: null });
    }).catch((fallo: unknown) => {
      if (!controlador.signal.aborted) setRespuesta({ ruta, intento, datos: null,
        error: fallo instanceof Error ? fallo.message : "No se pudieron traer los datos." });
    });
    return () => controlador.abort();
  }, [ruta, intento]);

  const actual = respuesta?.ruta === ruta && respuesta?.intento === intento;
  return {
    datos: ruta !== null && respuesta?.ruta === ruta ? respuesta.datos : null,
    cargando: ruta !== null && !actual,
    error: actual ? respuesta.error : null,
    recargar,
  };
}
