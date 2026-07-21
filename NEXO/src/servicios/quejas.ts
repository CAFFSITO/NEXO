// src/servicios/quejas.ts
// Puerta del canal de quejas anónimas hacia el servidor (sección 14.14).
//
// El anonimato es ESTRUCTURAL (Error 8.B.1): al enviar una queja NO viaja quién
// la escribió, y la tabla `quejas` no tiene columna de autor. Esta puerta manda
// solo el contenido y la categoría; el servidor no guarda nada que delate al
// autor, ni siquiera mirando la base.

import { enviar, usarDatos } from "./api";

// ─── Enviar (estudiante) ─────────────────────────────────

export interface DatosQueja {
  contenido: string;
  categoria?: string;
}

/** Envía una queja anónima. No devuelve nada que ate la queja a quien la mandó. */
export async function enviarQueja(datos: DatosQueja): Promise<void> {
  await enviar("/api/quejas", "POST", {
    contenido: datos.contenido,
    categoria: datos.categoria,
  });
}

// ─── Leer (Centro de Estudiantes / dirección) ────────────

export interface QuejaServidor {
  id: string;
  categoria: string;
  contenido: string;
  creadoEn: string;
  estado: "nueva" | "en-tratamiento" | "resuelta";
  vista: boolean;
}

export interface EstadisticaQuejas {
  esteMes: number;
  mesAnterior: number;
  /** null cuando no hay mes previo con el cual comparar. */
  variacionPorcentual: number | null;
  porCategoria: { categoria: string; n: number }[];
}

export function usarQuejas() {
  const { datos, cargando, error, recargar } = usarDatos<{
    quejas: QuejaServidor[];
    noVistas: number;
    estadistica: EstadisticaQuejas;
  }>("/api/quejas");
  return {
    quejas: datos?.quejas ?? null,
    noVistas: datos?.noVistas ?? 0,
    estadistica: datos?.estadistica ?? null,
    cargando,
    error,
    recargar,
  };
}

/** Abrir una queja la marca como vista (guarda quién la LEYÓ, no quién la escribió). */
export async function marcarQuejaVista(id: string): Promise<void> {
  await enviar(`/api/quejas/${id}/vista`, "POST");
}
