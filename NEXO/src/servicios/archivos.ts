// src/servicios/archivos.ts
// Puerta ÚNICA de la aplicación hacia el servicio de archivos (14.19).
//
// Subir y bajar archivos es lo mismo para todos los módulos (una entrega, un
// recurso, un adjunto de chat), así que la forma vive una sola vez acá. Ninguna
// pantalla habla con /api/archivos por su cuenta.
//
// El servidor decide TODO: el tamaño máximo, los tipos permitidos y —al bajar—
// si quien pide tiene permiso sobre ese archivo. La vidriera solo manda los
// bytes y muestra el resultado.

import { ErrorDeApi } from "./api";

/** Un archivo ya guardado en el servidor, tal como lo referencian los módulos. */
export interface ArchivoSubido {
  id: string;
  nombre: string;
  tipoMime: string;
  tamanoBytes: number;
}

/**
 * Sube un archivo y devuelve su registro. Los bytes viajan crudos en el cuerpo;
 * el nombre original va en una cabecera (codificado, porque una cabecera HTTP no
 * admite acentos ni espacios). El servidor contesta con el `id` que después se
 * referencia desde la entrega, el recurso, etc.
 */
export async function subirArchivo(archivo: File): Promise<ArchivoSubido> {
  let respuesta: Response;
  try {
    respuesta = await fetch("/api/archivos", {
      method: "POST",
      headers: {
        // Sin tipo, el navegador manda "text/plain" y el servidor lo rechaza:
        // hay que declarar el tipo real para que pase la lista blanca.
        "Content-Type": archivo.type || "application/octet-stream",
        "X-Nombre-Archivo": encodeURIComponent(archivo.name),
      },
      body: archivo,
    });
  } catch {
    throw new ErrorDeApi("No se pudo contactar al servidor de NEXO.", 0);
  }

  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new ErrorDeApi(
      datos.error ?? "No se pudo subir el archivo.",
      respuesta.status
    );
  }
  return datos.archivo as ArchivoSubido;
}

/**
 * La dirección para descargar un archivo. El navegador la abre y el servidor,
 * antes de entregar un byte, comprueba el permiso (por eso no hay que esconder
 * el enlace: si no corresponde, el servidor contesta 403).
 */
export function urlDescarga(archivoId: string): string {
  return `/api/archivos/${archivoId}`;
}

/** Tamaño legible ("1.4 MB", "820 KB") para mostrar al lado del nombre. */
export function tamanoLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
