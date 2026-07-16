// src/servicios/sesion.ts
// Única puerta de la aplicación hacia las ventanillas de sesión del servidor.
// Ninguna pantalla habla con /api/sesion por su cuenta: todas pasan por acá.
//
// La llave de sesión NO se guarda ni se lee desde este código: vive en una
// cookie httpOnly que el navegador manda sola en cada pedido. Por eso ningún
// script de la página puede robarla, ni siquiera el nuestro.

import type { Usuario } from "../navegacion";

// El proxy de Vite reenvía todo /api al servidor del puerto 3000, así que la
// vidriera y la cocina son el mismo origen y la cookie viaja sin configurar nada.
const API = "/api/sesion";

export interface ResultadoIngreso {
  ok: boolean;
  usuario?: Usuario;
  error?: string;
}

/** Entrega correo y contraseña al servidor. El servidor decide, no la pantalla. */
export async function iniciarSesion(
  email: string,
  contrasena: string
): Promise<ResultadoIngreso> {
  let respuesta: Response;
  try {
    respuesta = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, contrasena }),
    });
  } catch {
    // Falla de red: casi siempre es que la cocina está apagada. Conviene
    // decirlo con todas las letras en vez de "correo o contraseña incorrectos".
    return { ok: false, error: "No se pudo contactar al servidor de NEXO." };
  }

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    return { ok: false, error: datos.error ?? "No se pudo iniciar sesión." };
  }
  return { ok: true, usuario: datos.usuario };
}

/**
 * Le pregunta al servidor "¿esta sesión sigue viva?" usando la cookie guardada.
 * Es lo que hace que recargar la página no te expulse (Error 12.1).
 * Devuelve el usuario, o null si no hay sesión válida.
 */
export async function sesionActual(): Promise<Usuario | null> {
  try {
    const respuesta = await fetch(API);
    if (!respuesta.ok) return null;
    const datos = await respuesta.json();
    return datos.usuario ?? null;
  } catch {
    return null;
  }
}

/** Cierra la sesión en el servidor y borra la cookie. */
export async function cerrarSesionEnServidor(): Promise<void> {
  try {
    await fetch(API, { method: "DELETE" });
  } catch {
    // Si la cocina no responde, igual se limpia la sesión local: el usuario
    // pidió salir y tiene que salir.
  }
}
