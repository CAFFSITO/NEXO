// src/servicios/push.ts
// Las alertas push de este navegador (celular o computadora).
//
// Para que un aviso suene con NEXO CERRADO, el navegador tiene que (1) dar
// permiso de notificaciones, (2) registrar el trabajador en segundo plano
// (public/sw.js) y (3) suscribirse al servicio de push con la clave pública de
// esta instalación de NEXO. La suscripción se le entrega a la cocina
// (servidor/push.js), que es la que cifra y manda cada aviso.
//
// Solo funciona en contexto seguro (https, o localhost mientras se programa).

import { enviar, pedir } from "./api";

export type EstadoPush =
  | "no-soportado" // el navegador no tiene push, o NEXO no está en https
  | "bloqueado"    // la persona (o el navegador) negó las notificaciones
  | "inactivo"     // se puede activar
  | "activo";      // este navegador ya recibe avisos

export const ETIQUETA_AVISOS = "nexo-anuncios";

export function soportaPush(): boolean {
  return typeof window !== "undefined"
    && window.isSecureContext
    && "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window;
}

function claveABytes(clave: string): Uint8Array<ArrayBuffer> {
  const base64 = (clave + "=".repeat((4 - (clave.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const binario = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binario.length));
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

function mismaClave(a: ArrayBuffer | null | undefined, b: Uint8Array): boolean {
  if (!a) return false;
  const x = new Uint8Array(a);
  return x.length === b.length && x.every((v, i) => v === b[i]);
}

let registro: Promise<ServiceWorkerRegistration> | null = null;
function trabajador(): Promise<ServiceWorkerRegistration> {
  if (!registro) {
    registro = navigator.serviceWorker.register("/sw.js").then(() => navigator.serviceWorker.ready);
    registro.catch(() => { registro = null; });
  }
  return registro;
}

export async function estadoPush(): Promise<EstadoPush> {
  if (!soportaPush()) return "no-soportado";
  if (Notification.permission === "denied") return "bloqueado";
  if (Notification.permission !== "granted") return "inactivo";
  try {
    const reg = await trabajador();
    return (await reg.pushManager.getSubscription()) ? "activo" : "inactivo";
  } catch {
    return "no-soportado";
  }
}

/**
 * Deja este navegador suscripto y la suscripción guardada a nombre de quien
 * está adentro. Si `pedirPermiso` es false solo se sincroniza (no abre el
 * cartel del navegador): sirve al entrar, para que una suscripción vieja quede
 * a nombre de la persona correcta.
 */
let enCurso: Promise<unknown> = Promise.resolve();
export function activarPush(opciones: { pedirPermiso?: boolean } = {}): Promise<EstadoPush> {
  // De a una: si dos pantallas activan a la vez, el navegador crearía dos
  // suscripciones y la primera quedaría inservible.
  const turno = enCurso.catch(() => {}).then(() => suscribir(opciones));
  enCurso = turno;
  return turno;
}

async function suscribir({ pedirPermiso = true }: { pedirPermiso?: boolean }): Promise<EstadoPush> {
  if (!soportaPush()) return "no-soportado";
  let permiso = Notification.permission;
  if (permiso === "default" && pedirPermiso) permiso = await Notification.requestPermission();
  if (permiso === "denied") return "bloqueado";
  if (permiso !== "granted") return "inactivo";

  const reg = await trabajador();
  const { clave } = await pedir<{ clave: string }>("/api/push/clave");
  const bytes = claveABytes(clave);
  let sub = await reg.pushManager.getSubscription();
  // Si la instalación de NEXO cambió de clave, la suscripción vieja ya no sirve.
  if (sub && !mismaClave(sub.options.applicationServerKey, bytes)) {
    await sub.unsubscribe().catch(() => {});
    sub = null;
  }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
  await enviar("/api/push/suscripcion", "POST", sub.toJSON());
  return "activo";
}

/** Al salir de NEXO: que este navegador deje de recibir los avisos de esta persona. */
export async function olvidarPush(): Promise<void> {
  if (!soportaPush() || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) await enviar("/api/push/suscripcion", "DELETE", { endpoint: sub.endpoint });
  } catch {
    // Sin conexión: el servidor la reasigna igual cuando entre otra persona.
  }
}

/** Cierra las notificaciones de avisos que quedaron en la bandeja del sistema. */
export async function cerrarNotificacionesDeAvisos(): Promise<void> {
  if (!soportaPush()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    for (const n of (await reg?.getNotifications({ tag: ETIQUETA_AVISOS })) ?? []) n.close();
  } catch {
    // Nada que cerrar.
  }
}

/** Manda un push de prueba a mis navegadores. Devuelve a cuántos llegó. */
export async function probarPush(): Promise<number> {
  const { entregados } = await enviar<{ entregados: number }>("/api/push/prueba", "POST");
  return entregados;
}

/** Qué sistema es, para explicar cómo desbloquear las notificaciones. */
export function ayudaDesbloqueo(): string {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "Tocá el candado junto a la dirección → Permisos → Notificaciones → Permitir. Después recargá NEXO.";
  return "Hacé clic en el candado junto a la dirección → Notificaciones → Permitir. Después recargá NEXO.";
}
