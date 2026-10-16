// Ayudas de la Comunidad: números cortos, el árbol de respuestas (Reddit), sus
// órdenes y cómo insertar un emoji donde está el cursor.

import type { Comentario } from "../../../servicios/comunidad";

/** 1234 → "1,2 k"; 999 → "999". */
export function numeroCorto(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(".", ",")} k`;
  return `${(n / 1_000_000).toFixed(1).replace(".", ",")} M`;
}

export type OrdenRespuestas = "mejores" | "nuevas" | "antiguas" | "polemicas";

export interface NodoRespuesta { c: Comentario; hijos: NodoRespuesta[]; total: number }

const puntaje = (c: Comentario) => c.votosAFavor - c.votosEnContra;
const polemica = (c: Comentario) => {
  const a = c.votosAFavor;
  const b = c.votosEnContra;
  return a && b ? (a + b) * (Math.min(a, b) / Math.max(a, b)) : 0;
};
const ORDENES: Record<OrdenRespuestas, (a: Comentario, b: Comentario) => number> = {
  mejores: (a, b) => puntaje(b) - puntaje(a) || a.creadoEn.localeCompare(b.creadoEn),
  nuevas: (a, b) => b.creadoEn.localeCompare(a.creadoEn),
  antiguas: (a, b) => a.creadoEn.localeCompare(b.creadoEn),
  polemicas: (a, b) => polemica(b) - polemica(a) || puntaje(b) - puntaje(a),
};

/** Arma el árbol de respuestas a partir de la lista plana (cada una con su padre). */
export function armarArbol(comentarios: Comentario[], orden: OrdenRespuestas): NodoRespuesta[] {
  const ids = new Set(comentarios.map((c) => c.id));
  const hijos = new Map<string | null, Comentario[]>();
  for (const c of comentarios) {
    const padre = c.padreId && ids.has(c.padreId) ? c.padreId : null;
    if (!hijos.has(padre)) hijos.set(padre, []);
    hijos.get(padre)!.push(c);
  }
  const armar = (padre: string | null): NodoRespuesta[] =>
    (hijos.get(padre) ?? []).sort(ORDENES[orden]).map((c) => {
      const sub = armar(c.id);
      return { c, hijos: sub, total: sub.reduce((s, h) => s + 1 + h.total, 0) };
    });
  return armar(null);
}

/** Inserta `texto` donde está el cursor del área; devuelve el valor nuevo y la posición. */
export function insertarEnCursor(area: HTMLTextAreaElement | null, valor: string, texto: string) {
  const inicio = area?.selectionStart ?? valor.length;
  const fin = area?.selectionEnd ?? valor.length;
  return { valor: valor.slice(0, inicio) + texto + valor.slice(fin), cursor: inicio + texto.length };
}

/** Las iniciales de un nombre ("Julieta Rossi" → "JR"). */
export const iniciales = (nombre: string) => nombre.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
