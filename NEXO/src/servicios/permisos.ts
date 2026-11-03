// src/servicios/permisos.ts
// Única puerta de la aplicación hacia la ventanilla de permisos del servidor.
//
// Acá NO hay ninguna regla de permisos: la tabla "qué rol ve qué pantalla" vive
// en `servidor/permisos.js` y no se descarga al navegador. Este archivo solo
// pregunta y trae la respuesta de la cocina (regla de oro 4 del plan).

import type { Page } from "../navegacion";

const API = "/api/permisos/acceso";

export interface ResultadoAcceso {
  permitido: boolean;
  temporal?: boolean;
  /** Por qué se negó, con las palabras del servidor. Se le muestra al usuario. */
  error?: string;
}

// Lo permitido se recuerda para no preguntar en cada navegación. Las negativas
// NO se recuerdan: la dirección puede mostrar un módulo en Modo edición y, si la
// negativa quedara guardada, el ítem aparecería en el menú pero al tocarlo
// diría "no tenés permiso". Todo se olvida también cuando cambia el genoma.
const recordadas = new Map<string, ResultadoAcceso>();

/** Vaciar lo recordado. Se llama al entrar, al salir y cada vez que cambia la configuración de la escuela. */
export function olvidarPermisos(): void {
  recordadas.clear();
}

/** Lo que ya se sabe sin preguntar (solo lo permitido se recuerda). */
export function accesoRecordado(pagina: Exclude<Page, "login">): ResultadoAcceso | null {
  return recordadas.get(pagina) ?? null;
}

/** Le pregunta al servidor si la sesión abierta puede ver esta pantalla. */
export async function consultarAcceso(
  pagina: Exclude<Page, "login">
): Promise<ResultadoAcceso> {
  const recordado = recordadas.get(pagina);
  if (recordado) return recordado;

  let respuesta: Response;
  try {
    respuesta = await fetch(`${API}?pagina=${encodeURIComponent(pagina)}`, { signal: AbortSignal.timeout(15000) });
  } catch {
    // Falla de red: casi siempre es que la cocina está apagada. Se dice tal
    // cual, porque no es lo mismo que "no tenés permiso".
    return { permitido: false, temporal: true, error: "No se pudo contactar al servidor de NEXO." };
  }

  const datos = await respuesta.json().catch(() => ({}));

  if (respuesta.ok) {
    const resultado: ResultadoAcceso = { permitido: true };
    recordadas.set(pagina, resultado);
    return resultado;
  }

  const resultado: ResultadoAcceso = {
    permitido: false,
    temporal: respuesta.status !== 403,
    error: datos.error ?? "No se pudo comprobar el permiso.",
  };

  // Un 401 significa que la sesión venció recién, no que la pantalla esté prohibida.
  if (respuesta.status === 401) window.dispatchEvent(new Event("nexo:sesion-vencida"));

  return resultado;
}
