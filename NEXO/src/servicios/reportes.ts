// src/servicios/reportes.ts
// Puerta de la herramienta de Reportes de la dirección hacia el servidor
// (sección 14.18, Errores 6.C.4 y 6.F.1 a 6.F.5).
//
// La generación NO termina en un "generando…" vacío (ese era el Error 6.C.4):
// el servidor arma un archivo real desde nexo.db y esta puerta lo descarga.

import { enviar, usarDatos, pedir } from "./api";

export interface BloqueReporte {
  clave: string;
  etiqueta: string;
}
export interface OpcionAlumno {
  id: string;
  nombre: string;
  curso: string;
}
export interface OpcionesReportes {
  bloquesInstitucional: BloqueReporte[];
  bloquesExpediente: BloqueReporte[];
  cursos: { id: string; nombre: string }[];
  alumnos: OpcionAlumno[];
}

export function usarOpcionesReportes() {
  const { datos, cargando, error, recargar } =
    usarDatos<OpcionesReportes>("/api/reportes/opciones");
  return { opciones: datos, cargando, error, recargar };
}

export interface ResultadoReporte {
  archivoId: string;
  nombreArchivo: string;
  tamanoBytes: number;
}

/** Genera el reporte institucional con los bloques marcados. Devuelve el archivo. */
export async function generarInstitucional(
  bloques: Record<string, boolean>
): Promise<ResultadoReporte> {
  return enviar<ResultadoReporte>("/api/reportes/generar", "POST", {
    tipo: "institucional",
    bloques,
  });
}

/** Genera el expediente de un alumno. `autorizaChats` habilita exportar chats. */
export async function generarExpediente(
  estudianteId: string,
  bloques: Record<string, boolean>,
  autorizaChats: boolean
): Promise<ResultadoReporte> {
  return enviar<ResultadoReporte>("/api/reportes/generar", "POST", {
    tipo: "expediente-alumno",
    estudianteId: Number(estudianteId),
    bloques,
    autorizaChats,
  });
}

export interface ReporteHistorial {
  id: string;
  tipo: string;
  generadoPor: string;
  generadoEn: string;
  archivoId: string | null;
}
export function usarHistorialReportes() {
  const { datos, cargando, error, recargar } = usarDatos<{
    reportes: ReporteHistorial[];
  }>("/api/reportes/historial");
  return { reportes: datos?.reportes ?? null, cargando, error, recargar };
}

/**
 * Descarga un archivo del servidor y dispara el "Guardar como" del navegador.
 * Se baja como blob (con la cookie de sesión, mismo origen) y se fuerza la
 * descarga con el nombre real: así funciona dentro de la SPA sin recargar.
 */
export async function descargarArchivo(archivoId: string, nombre: string): Promise<void> {
  const respuesta = await fetch(`/api/archivos/${archivoId}`);
  if (!respuesta.ok) {
    const datos = await respuesta.json().catch(() => ({}));
    throw new Error(datos.error ?? "No se pudo descargar el archivo.");
  }
  const blob = await respuesta.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// `pedir` se reexporta por si alguna pantalla necesita un GET suelto de reportes.
export { pedir };
