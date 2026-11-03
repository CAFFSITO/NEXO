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
  if (archivo.size > 5 * 1024 * 1024) return subirReanudable(archivo);
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

/** Guarda el avance local para continuar tras corte de red o recarga. */
async function subirReanudable(archivo: File): Promise<ArchivoSubido> {
  const clave = `nexo-carga:${archivo.name}:${archivo.size}:${archivo.lastModified}`;
  const json = async (r: Response) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new ErrorDeApi(d.error ?? 'No se pudo continuar la carga.', r.status); return d; };
  let id = localStorage.getItem(clave);
  let recibido = 0;
  if (id) {
    const r = await fetch(`/api/archivos/cargas/${id}`);
    if (r.ok) {
      const estado = await r.json();
      if (estado.archivo) { localStorage.removeItem(clave); return estado.archivo as ArchivoSubido; }
      recibido = estado.recibido;
    }
    else { id = null; localStorage.removeItem(clave); }
  }
  if (!id) {
    const creada = await json(await fetch('/api/archivos/cargas', { method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nombre:archivo.name,tipo:archivo.type.split(';')[0]||'application/octet-stream',tamano:archivo.size}) }));
    id = String(creada.id); localStorage.setItem(clave,id);
  }
  while (recibido < archivo.size) {
    const siguiente = Math.min(archivo.size,recibido+5*1024*1024);
    try {
      const r = await json(await fetch(`/api/archivos/cargas/${id}`,{method:'PUT',headers:{'Content-Type':'application/octet-stream','X-Offset':String(recibido)},body:archivo.slice(recibido,siguiente)}));
      recibido = r.recibido;
    } catch (error) {
      const estado = await fetch(`/api/archivos/cargas/${id}`);
      if (estado.ok) { const progreso = await estado.json(); if (progreso.recibido > recibido) { recibido = progreso.recibido; continue; } }
      throw error;
    }
  }
  const terminado = await json(await fetch(`/api/archivos/cargas/${id}/completar`,{method:'POST'}));
  localStorage.removeItem(clave);
  return terminado.archivo as ArchivoSubido;
}

/**
 * La dirección para descargar un archivo. El navegador la abre y el servidor,
 * antes de entregar un byte, comprueba el permiso (por eso no hay que esconder
 * el enlace: si no corresponde, el servidor contesta 403).
 */
export function urlDescarga(archivoId: string): string {
  return `/api/archivos/${archivoId}`;
}

/**
 * La misma dirección, pero pidiéndole al servidor que MUESTRE el archivo en la
 * página (Content-Disposition: inline) en vez de descargarlo. Sirve para
 * previsualizar: una imagen en un <img> o un PDF en un <iframe>. El permiso es
 * el mismo que para descargar; solo cambia cómo lo entrega el servidor.
 */
export function urlPreview(archivoId: string): string {
  return `/api/archivos/${archivoId}?inline=1`;
}

/** Tamaño legible ("1.4 MB", "820 KB") para mostrar al lado del nombre. */
export function tamanoLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
