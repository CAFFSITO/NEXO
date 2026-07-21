// src/servicios/institucion.ts
// El nombre del colegio y el ciclo lectivo, leídos de la base (Error 13.7).
//
// Seis pantallas decían "Colegio San Martín — Ciclo 2025" con las dos cosas
// escritas a mano. El nombre estaba repetido en seis archivos y el año estaba
// mintiendo: los datos de la base son del ciclo 2026. Un año escrito a mano no
// se arregla escribiendo otro año a mano — el 1 de enero vuelve a estar mal.
//
// Ahora las seis piden acá, y acá se pide una sola vez al servidor.

import { usarDatos } from "./api";

export interface Institucion {
  nombre: string;
  /** null para el administrador de plataforma: no pertenece a ningún colegio. */
  cicloLectivo: number | null;
}

/**
 * Los datos de mi institución.
 *
 * Devuelve `null` mientras carga. Las pantallas que lo muestran en un subtítulo
 * no deberían mostrar un cartel de "cargando" por esto: es un renglón chico y
 * el resto de la pantalla ya está. Con `subtituloInstitucional` se resuelve
 * solo: mientras no está, el renglón queda vacío en vez de parpadear.
 */
export function usarInstitucion() {
  const { datos, cargando, error } = usarDatos<Institucion>("/api/institucion");
  return { institucion: datos, cargando, error };
}

/**
 * El subtítulo "Colegio San Martín — Ciclo 2026", ya armado.
 *
 * Mientras la respuesta viaja devuelve "", que es lo correcto: es preferible un
 * renglón vacío por un instante a un año inventado como valor por defecto. Un
 * valor por defecto acá sería exactamente el Error 13.7 otra vez.
 */
export function subtituloInstitucional(institucion: Institucion | null): string {
  if (!institucion) return "";
  if (institucion.cicloLectivo === null) return institucion.nombre;
  return `${institucion.nombre} — Ciclo ${institucion.cicloLectivo}`;
}
