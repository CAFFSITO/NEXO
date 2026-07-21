// src/servicios/cuenta.ts
// Única puerta de la aplicación hacia las ventanillas de cuenta y recuperación.
// Ninguna pantalla llama a /api/cuenta ni a /api/recuperacion por su cuenta.
//
// Acá no se decide NADA: ni si la contraseña actual es correcta, ni si la nueva
// es lo bastante larga, ni si el código sirve. Todo eso lo resuelve el servidor
// (servidor/cuenta.js), que es el único que puede: la vidriera no tiene ni la
// contraseña guardada ni el código. Este archivo pregunta y trae la respuesta.

import type { Rol } from "../paginas/components/shared/Sidebar";

const API_CUENTA = "/api/cuenta";
const API_RECUPERACION = "/api/recuperacion";

/** Los datos de la cuenta, tal como salen de la tabla `usuarios`. */
export interface Cuenta {
  nombre: string;
  email: string;
  rol: Rol;
  avatarUrl: string | null;
  /** Curso del estudiante, derivado de `inscripciones`. */
  curso: string | null;
  /** Materias del profesor, derivadas de `catedras`. */
  materia: string | null;
  /** Institución a la que pertenece. El administrador de plataforma no tiene. */
  institucion: string | null;
  creadoEn: string;
}

export interface Resultado {
  ok: boolean;
  /** Lo que hay que mostrarle a la persona: sale del servidor, con sus palabras. */
  mensaje?: string;
  error?: string;
}

const SIN_COCINA = "No se pudo contactar al servidor de NEXO.";

/** Manda un pedido y traduce cualquier respuesta a un `Resultado`. */
async function pedir(url: string, metodo: string, cuerpo: unknown): Promise<Resultado> {
  let respuesta: Response;
  try {
    respuesta = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
  } catch {
    return { ok: false, error: SIN_COCINA };
  }

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    return { ok: false, error: datos.error ?? "No se pudo completar la operación." };
  }
  return { ok: true, mensaje: datos.mensaje };
}

/** Mis datos de cuenta. Devuelve null si no hay sesión válida. */
export async function miCuenta(): Promise<Cuenta | null> {
  try {
    const respuesta = await fetch(API_CUENTA);
    if (!respuesta.ok) return null;
    const datos = await respuesta.json();
    return datos.cuenta ?? null;
  } catch {
    return null;
  }
}

/** Cambiar la contraseña desde la configuración, sabiendo la actual. */
export function cambiarContrasena(actual: string, nueva: string): Promise<Resultado> {
  return pedir(`${API_CUENTA}/contrasena`, "PUT", { actual, nueva });
}

/**
 * Paso 1 de "olvidé mi contraseña": pedir el código.
 * Contesta lo mismo exista o no la cuenta, a propósito: así nadie puede usar
 * esta pantalla para averiguar quién tiene cuenta en NEXO.
 */
export function pedirCodigo(email: string): Promise<Resultado> {
  return pedir(API_RECUPERACION, "POST", { email });
}

/** Paso 2: canjear el código por una contraseña nueva. */
export function confirmarRecuperacion(
  email: string,
  codigo: string,
  nueva: string
): Promise<Resultado> {
  return pedir(`${API_RECUPERACION}/confirmar`, "POST", { email, codigo, nueva });
}
