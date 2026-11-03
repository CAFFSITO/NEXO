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

/** Cambiar mi nombre (solo el nombre: el correo lo administra la escuela). */
export function cambiarMiNombre(nombre: string): Promise<Resultado> {
  return pedir(`${API_CUENTA}/nombre`, "PUT", { nombre });
}

/** Cambiar la contraseña desde la configuración, sabiendo la actual. */
export function cambiarContrasena(actual: string, nueva: string): Promise<Resultado> {
  return pedir(`${API_CUENTA}/contrasena`, "PUT", { actual, nueva });
}

/**
 * Primer ingreso: cambiar la contraseña inicial sin volver a tipearla. El
 * servidor lo acepta solo mientras la cuenta no haya pasado por la bienvenida.
 */
export function elegirContrasenaPrimerIngreso(nueva: string): Promise<Resultado> {
  return pedir(`${API_CUENTA}/contrasena`, "PUT", { nueva });
}

/** Primer ingreso: seguir con la contraseña que dio la escuela. */
export function seguirConContrasenaInicial(): Promise<Resultado> {
  return pedir(`${API_CUENTA}/primer-ingreso`, "POST", {});
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

// ── Foto de perfil ──────────────────────────────────────────────────────────
// La imagen se recorta cuadrada y se achica en el navegador antes de subirla:
// viaja liviana (unos 30 KB) y se ve igual de nítida en todos los tamaños.
const LADO_AVATAR = 320;

async function recortarAvatar(archivo: File): Promise<Blob> {
  const imagen = await createImageBitmap(archivo);
  const lado = Math.min(imagen.width, imagen.height);
  const lienzo = document.createElement("canvas");
  lienzo.width = LADO_AVATAR;
  lienzo.height = LADO_AVATAR;
  const ctx = lienzo.getContext("2d");
  if (!ctx) throw new Error("Este navegador no puede preparar la foto.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(imagen, (imagen.width - lado) / 2, (imagen.height - lado) / 2, lado, lado, 0, 0, LADO_AVATAR, LADO_AVATAR);
  imagen.close();
  return new Promise((listo, fallo) => lienzo.toBlob((b) => (b ? listo(b) : fallo(new Error("No se pudo preparar la foto."))), "image/jpeg", 0.88));
}

/** Sube una foto de perfil nueva. Devuelve la dirección con la que se ve. */
export async function subirAvatar(archivo: File): Promise<string> {
  if (!archivo.type.startsWith("image/")) throw new Error("Elegí una imagen (JPG, PNG o WebP).");
  if (archivo.size > 15 * 1024 * 1024) throw new Error("La imagen es demasiado grande (máximo 15 MB).");
  const cuerpo = await recortarAvatar(archivo);
  const respuesta = await fetch("/api/cuenta/avatar", { method: "PUT", headers: { "Content-Type": "image/jpeg" }, body: cuerpo });
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new Error(datos.error ?? "No se pudo guardar la foto.");
  return datos.avatarUrl as string;
}

export async function quitarAvatar(): Promise<void> {
  const respuesta = await fetch("/api/cuenta/avatar", { method: "DELETE" });
  if (!respuesta.ok) throw new Error("No se pudo quitar la foto.");
}
