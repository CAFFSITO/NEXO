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
  /** Por qué se negó, con las palabras del servidor. Se le muestra al usuario. */
  error?: string;
}

// El rol de una sesión no cambia mientras dura, así que preguntar dos veces por
// la misma pantalla es preguntar dos veces lo mismo: sin esto, volver al Feed
// dispararía un pedido y un parpadeo de "Comprobando permisos" cada vez.
const recordadas = new Map<string, ResultadoAcceso>();

/** Vaciar lo recordado. Se llama al entrar y al salir: ahí sí cambia el rol. */
export function olvidarPermisos(): void {
  recordadas.clear();
}

/** Le pregunta al servidor si la sesión abierta puede ver esta pantalla. */
export async function consultarAcceso(
  pagina: Exclude<Page, "login">
): Promise<ResultadoAcceso> {
  const recordado = recordadas.get(pagina);
  if (recordado) return recordado;

  let respuesta: Response;
  try {
    respuesta = await fetch(`${API}?pagina=${encodeURIComponent(pagina)}`);
  } catch {
    // Falla de red: casi siempre es que la cocina está apagada. Se dice tal
    // cual, porque no es lo mismo que "no tenés permiso".
    return { permitido: false, error: "No se pudo contactar al servidor de NEXO." };
  }

  const datos = await respuesta.json().catch(() => ({}));

  if (respuesta.ok) {
    const resultado: ResultadoAcceso = { permitido: true };
    recordadas.set(pagina, resultado);
    return resultado;
  }

  const resultado: ResultadoAcceso = {
    permitido: false,
    error: datos.error ?? "No se pudo comprobar el permiso.",
  };

  // Un 401 significa que la sesión venció recién, no que la pantalla esté
  // prohibida: no se recuerda, para que al volver a entrar no arrastre una
  // negativa que ya no corresponde.
  if (respuesta.status !== 401) recordadas.set(pagina, resultado);

  return resultado;
}
