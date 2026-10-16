// src/servicios/color.ts
// Matemática de color para la paleta de cada instancia: conversiones, mezclas,
// contraste WCAG y armonías. Sin dependencias: es aritmética. La usan el motor
// de temas (servicios/tema.ts) y el estudio del Maestro (paleta y vistas
// previas). Todos los colores viajan como "#rrggbb".

export interface Hsl { h: number; s: number; l: number }

const limitar = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x));

export function hexValido(hex: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(hex);
}

export function hexARgb(hex: string): [number, number, number] {
  const h = hexValido(hex) ? hex : "#000000";
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

export function rgbAHex(r: number, g: number, b: number): string {
  const c = (x: number) => Math.round(limitar(x, 0, 255)).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function hexAHsl(hex: string): Hsl {
  const [r, g, b] = hexARgb(hex).map((x) => x / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s: s * 100, l: l * 100 };
}

export function hslAHex({ h, s, l }: Hsl): string {
  const tono = ((h % 360) + 360) % 360;
  const sat = limitar(s, 0, 100) / 100;
  const lum = limitar(l, 0, 100) / 100;
  const k = (n: number) => (n + tono / 30) % 12;
  const a = sat * Math.min(lum, 1 - lum);
  const f = (n: number) => lum - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbAHex(f(0) * 255, f(8) * 255, f(4) * 255);
}

/** Mezcla lineal en RGB: t = 0 da `a`, t = 1 da `b`. */
export function mezclar(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexARgb(a);
  const [r2, g2, b2] = hexARgb(b);
  return rgbAHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/** Luminancia relativa WCAG (0 negro, 1 blanco). La misma regla que el servidor. */
export function luminancia(hex: string): number {
  const canal = (c: number) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = hexARgb(hex);
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/** Relación de contraste WCAG entre dos colores (1 a 21). */
export function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Lo que dice WCAG de un contraste para texto normal. */
export function veredictoContraste(ratio: number): "AAA" | "AA" | "Grande" | "Insuficiente" {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "Grande";
  return "Insuficiente";
}

export type Armonia = "complementaria" | "triadica" | "analoga" | "dividida" | "monocromatica";

export const ARMONIAS: { id: Armonia; nombre: string; angulos: [number, number, number] }[] = [
  { id: "complementaria", nombre: "Complementaria", angulos: [0, 180, 30] },
  { id: "triadica", nombre: "Triádica", angulos: [0, 120, 240] },
  { id: "analoga", nombre: "Análoga", angulos: [0, 30, -30] },
  { id: "dividida", nombre: "Complementaria dividida", angulos: [0, 150, 210] },
  { id: "monocromatica", nombre: "Monocromática", angulos: [0, 0, 0] },
];

export interface PaletaBase {
  acento: string;
  primario: string;
  secundario: string;
  terciario: string;
  fondo: string;
  superficie: string;
}

/**
 * Una paleta completa a partir de un tono (0–360), una armonía y una
 * intensidad (0–1). Fondo y superficie salen siempre oscuros: NEXO es una
 * interfaz oscura y el servidor rechaza fondos claros.
 */
export function paletaArmonica(tono: number, armonia: Armonia, intensidad = 0.85): PaletaBase {
  const [, d1, d2] = ARMONIAS.find((a) => a.id === armonia)?.angulos ?? [0, 180, 30];
  const mono = armonia === "monocromatica";
  const s = 40 + intensidad * 55;
  return {
    acento: hslAHex({ h: tono, s, l: 62 }),
    primario: hslAHex({ h: tono, s: Math.min(100, s + 8), l: 84 }),
    secundario: hslAHex({ h: tono + d1, s: mono ? s * 0.5 : s * 0.85, l: mono ? 74 : 80 }),
    terciario: hslAHex({ h: tono + d2, s: mono ? s * 0.7 : s * 0.9, l: mono ? 64 : 62 }),
    fondo: hslAHex({ h: tono, s: 55, l: 11 }),
    superficie: hslAHex({ h: tono, s: 48, l: 20 }),
  };
}

/** Lleva un color a "oscuro suficiente" para usarlo de fondo (tope de luminancia). */
export function oscurecerHasta(hex: string, tope = 0.06): string {
  const { h, s, l: inicial } = hexAHsl(hex);
  let l = inicial;
  let actual = hslAHex({ h, s, l });
  while (luminancia(actual) > tope && l > 1) {
    l -= 1;
    actual = hslAHex({ h, s, l });
  }
  return actual;
}
