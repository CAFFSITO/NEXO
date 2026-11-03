// src/servicios/tema.ts
// El tema de NEXO tiene dos partes que se combinan:
//
//   1. El MODO (claro / oscuro / automático): lo elige cada persona en su
//      dispositivo, como en cualquier aplicación. Por defecto, claro.
//   2. La PALETA de la escuela (genoma del perfil Maestro): el color de marca
//      (acento) y sus acompañantes. En modo claro se usan los colores de marca
//      ajustados para leerse sobre blanco; en modo oscuro, además, el fondo y
//      la superficie que eligió el Maestro.
//
// Con la paleta de fábrica no se pisa nada: los valores por defecto de los dos
// modos viven en index.css.

import type { CSSProperties } from "react";
import { contraste, hexAHsl, hslAHex, mezclar } from "./color";

export type Movimiento = "sereno" | "normal" | "vibrante";
export type ModoColor = "claro" | "oscuro";
export type PreferenciaModo = ModoColor | "sistema";

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

/** La paleta de fábrica (la misma que servidor/genoma.js → TEMA_BASE). */
export const TEMA_BASE: Tema = {
  acento: "#4f46e5",
  primario: "#a5b4fc",
  secundario: "#c4b5fd",
  terciario: "#fbbf24",
  fondo: "#0e1014",
  superficie: "#1a1d24",
  radio: 10,
  movimiento: "normal",
};

/** La paleta de fábrica anterior (violeta): las escuelas que nunca la cambiaron la tienen guardada. */
const TEMA_ANTERIOR = { acento: "#c548f5", primario: "#edb1ff", secundario: "#d2bcfa", terciario: "#efc04c", fondo: "#190d2d", superficie: "#2d1b4e" };

export type ColorDeTema = keyof Pick<Tema, "acento" | "primario" | "secundario" | "terciario" | "fondo" | "superficie">;
const COLORES: ColorDeTema[] = ["acento", "primario", "secundario", "terciario", "fondo", "superficie"];

/** Los seis colores de la escuela con nombres para cualquier persona (Modo edición, colores desde el logo). */
export const NOMBRES_COLORES: { id: ColorDeTema; nombre: string; uso: string }[] = [
  { id: "acento", nombre: "Principal", uso: "Botones y marcas" },
  { id: "primario", nombre: "Destacados", uso: "Textos e íconos activos" },
  { id: "secundario", nombre: "Secundario", uso: "Etiquetas y detalles" },
  { id: "terciario", nombre: "Avisos", uso: "Novedades y logros" },
  { id: "fondo", nombre: "Fondo oscuro", uso: "El fondo en modo oscuro" },
  { id: "superficie", nombre: "Tarjetas oscuras", uso: "Paneles en modo oscuro" },
];

/**
 * La letra que va arriba del color de acento (botones, insignias, el día de hoy).
 * Blanca mientras se lea; si el acento es claro (con blanco no llega a 3:1, el
 * mínimo para texto en negrita), una casi negra del mismo tono.
 */
export function letraSobre(fondo: string): string {
  if (contraste("#ffffff", fondo) >= 3) return "#ffffff";
  const { h, s } = hexAHsl(fondo);
  return hslAHex({ h, s: Math.min(70, s), l: 12 });
}

/** El mismo tono, con la luz justa para llegar a `minimo` de contraste contra `sobre`. */
function ajustarContraste(color: string, sobre: string, minimo: number): string {
  const { h, s, l } = hexAHsl(color);
  // Sobre un fondo claro se oscurece; sobre uno oscuro, se aclara.
  const oscurecer = contraste(sobre, "#000000") > contraste(sobre, "#ffffff");
  let luz = l;
  let actual = color;
  while (contraste(actual, sobre) < minimo && luz > 2 && luz < 98) {
    luz += oscurecer ? -1 : 1;
    actual = hslAHex({ h, s, l: luz });
  }
  return actual;
}

export function esTemaBase(t: Tema): boolean {
  const igual = (ref: Record<string, string>) => COLORES.every((k) => String(t[k]).toLowerCase() === ref[k]);
  return (igual(TEMA_BASE as unknown as Record<string, string>) && t.radio === TEMA_BASE.radio) || (igual(TEMA_ANTERIOR) && (t.radio === 12 || t.radio === TEMA_BASE.radio));
}

/** Las variables de marca en modo claro: los colores de la escuela, legibles sobre blanco. */
function variablesClaras(t: Tema): Record<string, string> {
  const acento = ajustarContraste(t.acento, "#ffffff", 3);
  const a = hexAHsl(acento);
  const primario = ajustarContraste(t.acento, "#ffffff", 5.5);
  const p = hexAHsl(primario);
  const secundario = ajustarContraste(t.secundario, "#ffffff", 5);
  const terciario = ajustarContraste(t.terciario, "#ffffff", 4.5);
  return {
    "--nexo-acento": acento,
    "--nexo-acento-vivo": hslAHex({ h: a.h, s: a.s, l: Math.max(10, a.l - 7) }),
    "--nexo-acento-oscuro": hslAHex({ h: a.h, s: a.s, l: Math.max(10, a.l - 16) }),
    "--nexo-sobre-acento": letraSobre(acento),
    "--nexo-primario": primario,
    "--nexo-primario-claro": mezclar(primario, "#ffffff", 0.88),
    "--nexo-sobre-primario": letraSobre(primario),
    "--nexo-sobre-primario-fuerte": letraSobre(primario),
    "--nexo-secundario": secundario,
    "--nexo-secundario-contenedor": mezclar(secundario, "#ffffff", 0.86),
    "--nexo-sobre-secundario": hslAHex({ h: hexAHsl(secundario).h, s: 60, l: 25 }),
    "--nexo-terciario": terciario,
    "--nexo-terciario-oscuro": hslAHex({ ...hexAHsl(terciario), l: Math.max(10, hexAHsl(terciario).l - 10) }),
    "--nexo-foco": hslAHex({ h: p.h, s: p.s, l: Math.min(60, p.l + 10) }),
    "--nexo-radio": `${t.radio}px`,
  };
}

/** Todas las variables del modo oscuro: superficies, textos y bordes salen del fondo de la escuela. */
function variablesOscuras(t: Tema): Record<string, string> {
  const f = hexAHsl(t.fondo);
  const a = hexAHsl(t.acento);
  const p = hexAHsl(t.primario);
  const sec = hexAHsl(t.secundario);
  const ter = hexAHsl(t.terciario);
  const sup = (ds: number, dl: number) => hslAHex({ h: f.h, s: Math.min(100, f.s * ds), l: Math.max(2, Math.min(40, f.l + dl)) });
  return {
    "--nexo-acento": t.acento,
    "--nexo-acento-vivo": hslAHex({ h: a.h, s: Math.min(100, a.s + 5), l: Math.min(80, a.l + 6) }),
    "--nexo-acento-oscuro": hslAHex({ h: a.h, s: Math.min(100, a.s + 8), l: Math.max(20, a.l - 20) }),
    "--nexo-sobre-acento": letraSobre(t.acento),
    "--nexo-primario": t.primario,
    "--nexo-primario-claro": hslAHex({ h: p.h, s: p.s, l: Math.min(95, p.l + 8) }),
    "--nexo-sobre-primario": hslAHex({ h: p.h, s: 70, l: 16 }),
    "--nexo-sobre-primario-fuerte": hslAHex({ h: p.h, s: 70, l: 14 }),
    "--nexo-secundario": t.secundario,
    "--nexo-secundario-contenedor": hslAHex({ h: sec.h, s: Math.min(40, sec.s * 0.4), l: 28 }),
    "--nexo-sobre-secundario": hslAHex({ h: sec.h, s: Math.min(70, sec.s * 0.6), l: 82 }),
    "--nexo-terciario": t.terciario,
    "--nexo-terciario-oscuro": hslAHex({ h: ter.h, s: ter.s, l: Math.max(20, ter.l - 22) }),
    "--nexo-fondo": t.fondo,
    "--nexo-fondo-pagina": t.fondo,
    "--nexo-lienzo": t.superficie,
    "--nexo-sidebar": sup(0.95, -1.5),
    "--nexo-sup-0": sup(1.1, -3),
    "--nexo-sup-1": sup(0.85, 3),
    "--nexo-sup-2": sup(0.8, 5),
    "--nexo-sup-3": sup(0.7, 9),
    "--nexo-sup-4": sup(0.6, 13),
    "--nexo-sup-brillante": sup(0.55, 16),
    "--nexo-texto": hslAHex({ h: f.h, s: 20, l: 92 }),
    "--nexo-texto-suave": hslAHex({ h: f.h, s: 10, l: 69 }),
    "--nexo-borde": hslAHex({ h: f.h, s: 8, l: 46 }),
    "--nexo-borde-suave": hslAHex({ h: f.h, s: 12, l: 20 }),
    "--nexo-linea": hslAHex({ h: f.h, s: 12, l: 17 }),
    "--nexo-foco": t.primario,
    "--nexo-radio": `${t.radio}px`,
  };
}

/** Las variables CSS de una paleta en un modo. */
export function variablesDeTema(t: Tema, modo: ModoColor = modoActual()): Record<string, string> {
  return modo === "claro" ? variablesClaras(t) : variablesOscuras(t);
}

const NOMBRES_VARIABLES = [...new Set([...Object.keys(variablesOscuras(TEMA_BASE)), ...Object.keys(variablesClaras(TEMA_BASE))])];

// ── Modo claro / oscuro ──────────────────────────────────
const CLAVE_MODO = "nexo:tema";
const consultaOscuro = typeof window !== "undefined" ? window.matchMedia?.("(prefers-color-scheme: dark)") : undefined;

export function preferenciaModo(): PreferenciaModo {
  try {
    const guardado = localStorage.getItem(CLAVE_MODO);
    if (guardado === "claro" || guardado === "oscuro" || guardado === "sistema") return guardado;
  } catch { /* sin almacenamiento: claro */ }
  return "claro";
}

function resolverModo(p: PreferenciaModo): ModoColor {
  if (p === "sistema") return consultaOscuro?.matches ? "oscuro" : "claro";
  return p;
}

export function modoActual(): ModoColor {
  return resolverModo(preferenciaModo());
}

let temaVigente: Tema | null = null;

function pintar(): void {
  const raiz = document.documentElement;
  const modo = modoActual();
  raiz.dataset.modo = modo;
  raiz.style.colorScheme = modo === "oscuro" ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", modo === "oscuro" ? "#0e1014" : "#ffffff");
  for (const nombre of NOMBRES_VARIABLES) raiz.style.removeProperty(nombre);
  if (!temaVigente) {
    delete raiz.dataset.movimiento;
    return;
  }
  raiz.dataset.movimiento = temaVigente.movimiento;
  if (esTemaBase(temaVigente)) return;
  for (const [nombre, valor] of Object.entries(variablesDeTema(temaVigente, modo))) raiz.style.setProperty(nombre, valor);
}

/** Cambia el modo en este dispositivo (y lo recuerda). */
export function guardarPreferenciaModo(p: PreferenciaModo): void {
  try { localStorage.setItem(CLAVE_MODO, p); } catch { /* se aplica igual, sin recordarlo */ }
  pintar();
  window.dispatchEvent(new Event("nexo:modo"));
}

consultaOscuro?.addEventListener?.("change", () => {
  if (preferenciaModo() === "sistema") { pintar(); window.dispatchEvent(new Event("nexo:modo")); }
});

/**
 * Pinta la aplicación con el tema de la escuela (o la devuelve a la paleta de
 * fábrica con `null`). Se aplica sobre <html> para que lo herede todo, incluso
 * los diálogos que se montan fuera del árbol principal.
 */
export function aplicarTema(tema: Tema | null): void {
  temaVigente = tema;
  pintar();
}

/**
 * Las mismas variables como estilo en línea, para que una vista previa (la de
 * la paleta en el estudio del Maestro) se vea con el tema de OTRA escuela sin
 * tocar la aplicación. La vista previa del Maestro muestra el modo oscuro, el
 * único que usa el fondo y la superficie.
 */
export function estiloDeTema(tema: Tema, modo: ModoColor = "oscuro"): CSSProperties {
  return variablesDeTema(tema, modo) as CSSProperties;
}
