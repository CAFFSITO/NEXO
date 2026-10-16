// src/servicios/tema.ts
// El tema de una instancia: la paleta que el Maestro eligió en el genoma de la
// escuela, convertida en las variables CSS que usa toda la aplicación
// (index.css y tailwind.config.ts). Con la paleta original no se toca nada: los
// valores por defecto de index.css son exactamente los de siempre.

import type { CSSProperties } from "react";
import { contraste, hexAHsl, hslAHex, mezclar } from "./color";

export type Movimiento = "sereno" | "normal" | "vibrante";

export interface Tema {
  acento: string;
  primario: string;
  secundario: string;
  terciario: string;
  fondo: string;
  superficie: string;
  radio: number;
  movimiento: Movimiento;
}

export const TEMA_BASE: Tema = {
  acento: "#c548f5",
  primario: "#edb1ff",
  secundario: "#d2bcfa",
  terciario: "#efc04c",
  fondo: "#190d2d",
  superficie: "#2d1b4e",
  radio: 12,
  movimiento: "normal",
};

const COLORES: (keyof Tema)[] = ["acento", "primario", "secundario", "terciario", "fondo", "superficie"];

/**
 * La letra que va arriba del color de acento (botones, insignias, el día de hoy).
 * Blanca mientras se lea; si el acento es claro (con blanco no llega a 3:1, el
 * mínimo para texto en negrita), una casi negra del mismo tono. Así una escuela
 * con un acento pastel no queda con botones blancos sobre blanco.
 */
export function letraSobre(fondo: string): string {
  if (contraste("#ffffff", fondo) >= 3) return "#ffffff";
  const { h, s } = hexAHsl(fondo);
  return hslAHex({ h, s: Math.min(70, s), l: 12 });
}

export function esTemaBase(t: Tema): boolean {
  return COLORES.every((k) => String(t[k]).toLowerCase() === TEMA_BASE[k]) && t.radio === TEMA_BASE.radio;
}

/** Todas las variables CSS que se derivan de una paleta (superficies, textos, bordes). */
export function variablesDeTema(t: Tema): Record<string, string> {
  const f = hexAHsl(t.fondo);
  const a = hexAHsl(t.acento);
  const p = hexAHsl(t.primario);
  const sec = hexAHsl(t.secundario);
  const ter = hexAHsl(t.terciario);
  // Las superficies escalonadas salen del fondo: mismo tono, menos saturación
  // y más luz a medida que "suben" (el mismo escalonado que la paleta original).
  const sup = (ds: number, dl: number) => hslAHex({ h: f.h, s: Math.min(100, f.s * ds), l: Math.max(2, Math.min(40, f.l + dl)) });
  return {
    "--nexo-acento": t.acento,
    "--nexo-acento-vivo": hslAHex({ h: a.h, s: Math.min(100, a.s + 5), l: Math.min(80, a.l + 5) }),
    "--nexo-acento-oscuro": hslAHex({ h: a.h, s: Math.min(100, a.s + 8), l: Math.max(20, a.l - 20) }),
    "--nexo-sobre-acento": letraSobre(t.acento),
    "--nexo-primario": t.primario,
    "--nexo-primario-claro": hslAHex({ h: p.h, s: p.s, l: Math.min(95, p.l + 8) }),
    "--nexo-sobre-primario": hslAHex({ h: p.h, s: 100, l: 22 }),
    "--nexo-sobre-primario-fuerte": hslAHex({ h: p.h, s: 100, l: 19 }),
    "--nexo-secundario": t.secundario,
    "--nexo-secundario-contenedor": hslAHex({ h: sec.h, s: Math.min(40, sec.s * 0.4), l: 34 }),
    "--nexo-sobre-secundario": hslAHex({ h: sec.h, s: Math.min(70, sec.s * 0.6), l: 79 }),
    "--nexo-terciario": t.terciario,
    "--nexo-terciario-oscuro": hslAHex({ h: ter.h, s: ter.s, l: Math.max(20, ter.l - 22) }),
    "--nexo-fondo": t.fondo,
    "--nexo-fondo-pagina": mezclar(t.fondo, t.superficie, 0.15),
    "--nexo-lienzo": t.superficie,
    "--nexo-sidebar": sup(0.93, -1),
    "--nexo-sup-0": sup(1.25, -2.4),
    "--nexo-sup-1": sup(0.8, 3.1),
    "--nexo-sup-2": sup(0.73, 4.9),
    "--nexo-sup-3": sup(0.58, 9.2),
    "--nexo-sup-4": sup(0.47, 13.5),
    "--nexo-sup-brillante": sup(0.42, 15.5),
    "--nexo-texto": hslAHex({ h: f.h, s: 100, l: 93 }),
    "--nexo-texto-suave": hslAHex({ h: p.h, s: 18, l: 79 }),
    "--nexo-borde": hslAHex({ h: p.h, s: 8, l: 58 }),
    "--nexo-borde-suave": hslAHex({ h: p.h, s: 11, l: 29 }),
    "--nexo-radio": `${t.radio}px`,
  };
}

const NOMBRES_VARIABLES = Object.keys(variablesDeTema(TEMA_BASE));

/**
 * Pinta la aplicación con el tema de la escuela (o la devuelve a la paleta
 * original con `null`). Se aplica sobre <html> para que lo herede todo, incluso
 * los diálogos que se montan fuera del árbol principal.
 */
export function aplicarTema(tema: Tema | null): void {
  const raiz = document.documentElement;
  for (const nombre of NOMBRES_VARIABLES) raiz.style.removeProperty(nombre);
  if (!tema) {
    delete raiz.dataset.movimiento;
    return;
  }
  raiz.dataset.movimiento = tema.movimiento;
  if (esTemaBase(tema)) return;
  for (const [nombre, valor] of Object.entries(variablesDeTema(tema))) raiz.style.setProperty(nombre, valor);
}

/**
 * Las mismas variables como estilo en línea, para que una vista previa (la de
 * la paleta en el estudio del Maestro) se vea con el tema de OTRA escuela sin
 * tocar la aplicación.
 */
export function estiloDeTema(tema: Tema): CSSProperties {
  return variablesDeTema(tema) as CSSProperties;
}
