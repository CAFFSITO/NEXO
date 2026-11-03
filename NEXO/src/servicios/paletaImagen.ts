// La paleta de una escuela a partir de su logo (o cualquier imagen).
//
// Cómo decide:
//   1. Achica la imagen (unos 100 px) y descarta lo transparente.
//   2. Detecta el fondo: si el borde de la imagen es casi todo de un mismo color
//      neutro (el blanco de un logo en JPG, por ejemplo), ese color no cuenta.
//   3. Agrupa los colores con k-means en el espacio Lab (el que se parece a cómo
//      vemos las diferencias) y se queda con los grupos de cada color del logo.
//   4. Elige el acento: el grupo más "de marca" (saturado y presente), ni muy
//      claro ni muy oscuro para que un botón se lea. Después busca otros dos
//      tonos distintos del logo para secundario y terciario; si el logo tiene un
//      solo color, los deriva por armonía (análogo y complementario).
//   5. Arma el resto como el Maestro: primario claro del acento (textos en modo
//      oscuro) y fondo/superficie muy oscuros del mismo tono.
// Todo pasa en el navegador: la imagen no se sube a ningún lado.

import { hexAHsl, hslAHex, luminancia, oscurecerHasta, rgbAHex, type PaletaBase } from "./color";

export interface ResultadoLogo {
  paleta: PaletaBase;
  /** Los colores principales que se encontraron en la imagen (para mostrarlos). */
  muestras: string[];
  /** La imagen casi no tiene colores (blanco, negro y grises). */
  monocromo: boolean;
}

type Lab = [number, number, number];

function aLineal(c: number) { const x = c / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }
function rgbALab(r: number, g: number, b: number): Lab {
  const [R, G, B] = [aLineal(r), aLineal(g), aLineal(b)];
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047);
  const y = f(R * 0.2126 + G * 0.7152 + B * 0.0722);
  const z = f((R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
const distancia = (a: Lab, b: Lab) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const croma = (l: Lab) => Math.hypot(l[1], l[2]);
const diferenciaTono = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

interface Grupo { lab: Lab; rgb: [number, number, number]; n: number }

/** k-means en Lab, arrancando con los puntos más separados entre sí (resultado estable). */
function agrupar(puntos: { lab: Lab; rgb: [number, number, number] }[], k: number): Grupo[] {
  if (!puntos.length) return [];
  const centros: Lab[] = [puntos.reduce((m, p) => (croma(p.lab) > croma(m.lab) ? p : m)).lab];
  while (centros.length < Math.min(k, puntos.length)) {
    let lejos = puntos[0];
    let mejor = -1;
    for (const p of puntos) {
      const d = Math.min(...centros.map((c) => distancia(c, p.lab)));
      if (d > mejor) { mejor = d; lejos = p; }
    }
    if (mejor < 4) break;
    centros.push(lejos.lab);
  }
  let asignacion: number[] = [];
  for (let vuelta = 0; vuelta < 10; vuelta++) {
    asignacion = puntos.map((p) => { let i = 0; let d = Infinity; centros.forEach((c, j) => { const dd = distancia(c, p.lab); if (dd < d) { d = dd; i = j; } }); return i; });
    centros.forEach((_, j) => {
      const miembros = puntos.filter((_, i) => asignacion[i] === j);
      if (!miembros.length) return;
      centros[j] = [0, 1, 2].map((e) => miembros.reduce((s, m) => s + m.lab[e], 0) / miembros.length) as Lab;
    });
  }
  const grupos = centros.map((lab, j) => {
    const miembros = puntos.filter((_, i) => asignacion[i] === j);
    const rgb = [0, 1, 2].map((e) => miembros.reduce((s, m) => s + m.rgb[e], 0) / Math.max(1, miembros.length)) as [number, number, number];
    return { lab, rgb, n: miembros.length };
  }).filter((g) => g.n > 0).sort((a, b) => b.n - a.n);
  // Un mismo color partido en dos grupos (pasa cuando el logo tiene menos
  // colores que k) se vuelve a juntar en el más grande.
  const juntos: Grupo[] = [];
  for (const g of grupos) {
    const cerca = juntos.find((j) => distancia(j.lab, g.lab) < 12);
    if (cerca) cerca.n += g.n;
    else juntos.push({ ...g });
  }
  return juntos;
}

/** Lleva un color a algo usable como acento: saturación y luz razonables para un botón. */
function comoAcento(hex: string): string {
  const { h, s, l } = hexAHsl(hex);
  return hslAHex({ h, s: Math.max(45, Math.min(90, s)), l: Math.max(32, Math.min(58, l)) });
}

/** Abre la imagen: rápido con createImageBitmap; los SVG, con un <img> (no se pueden de la otra forma). */
async function cargar(archivo: Blob): Promise<{ fuente: CanvasImageSource; ancho: number; alto: number; soltar: () => void }> {
  try {
    const b = await createImageBitmap(archivo);
    return { fuente: b, ancho: b.width, alto: b.height, soltar: () => b.close() };
  } catch {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.src = url;
    try { await img.decode(); } catch { URL.revokeObjectURL(url); throw new Error("No se pudo leer la imagen. Probá con un PNG, JPG, WebP o SVG."); }
    return { fuente: img, ancho: img.naturalWidth || 300, alto: img.naturalHeight || 150, soltar: () => URL.revokeObjectURL(url) };
  }
}

export async function paletaDesdeImagen(archivo: Blob): Promise<ResultadoLogo> {
  const imagen = await cargar(archivo);
  const escala = Math.min(1, 100 / Math.max(imagen.ancho, imagen.alto));
  const ancho = Math.max(1, Math.round(imagen.ancho * escala));
  const alto = Math.max(1, Math.round(imagen.alto * escala));
  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Este navegador no puede analizar imágenes.");
  // Sin suavizado: al achicar no se inventan colores "mezcla" en los bordes.
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(imagen.fuente, 0, 0, ancho, alto);
  imagen.soltar();
  const { data } = ctx.getImageData(0, 0, ancho, alto);

  // El fondo: el color más repetido del borde, si ocupa buena parte del borde.
  const cuentaBorde = new Map<string, { n: number; rgb: [number, number, number] }>();
  let borde = 0;
  for (let y = 0; y < alto; y++) for (let x = 0; x < ancho; x++) {
    if (x > 1 && y > 1 && x < ancho - 2 && y < alto - 2) continue;
    const i = (y * ancho + x) * 4;
    if (data[i + 3] < 128) continue;
    borde++;
    const clave = `${data[i] >> 4},${data[i + 1] >> 4},${data[i + 2] >> 4}`;
    const e = cuentaBorde.get(clave) ?? { n: 0, rgb: [data[i], data[i + 1], data[i + 2]] as [number, number, number] };
    e.n++;
    cuentaBorde.set(clave, e);
  }
  const masRepetido = [...cuentaBorde.values()].sort((a, b) => b.n - a.n)[0];
  // Solo se descarta un fondo neutro (blanco, negro, gris, crema): si el logo es
  // un cuadrado de color de borde a borde, ese color es de la marca.
  const labBorde = masRepetido ? rgbALab(...masRepetido.rgb) : null;
  const fondoLab = masRepetido && labBorde && masRepetido.n > borde * 0.4 && croma(labBorde) < 14 ? labBorde : null;

  const todos: { lab: Lab; rgb: [number, number, number] }[] = [];
  const sinFondo: typeof todos = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const rgb: [number, number, number] = [data[i], data[i + 1], data[i + 2]];
    const lab = rgbALab(...rgb);
    todos.push({ lab, rgb });
    if (!fondoLab || distancia(lab, fondoLab) > 14) sinFondo.push({ lab, rgb });
  }
  const puntos = sinFondo.length >= 25 ? sinFondo : todos;
  if (!puntos.length) throw new Error("La imagen está vacía o es totalmente transparente.");

  // Los bordes suavizados crean colores "mezcla" (el rosado entre un bordó y el
  // blanco del fondo): un grupo chico que cae en el camino entre dos colores más
  // grandes (o entre uno y el fondo) no es un color del logo.
  const crudos = agrupar(puntos, 7).filter((g) => g.n >= puntos.length * 0.015);
  const grupos = crudos.filter((g, i) => {
    const extremos = [...crudos.slice(0, i).filter((o) => o.n > g.n * 2).map((o) => o.lab), ...(fondoLab ? [fondoLab] : [])];
    return !extremos.some((a, x) => extremos.some((b, y) => y > x && distancia(a, g.lab) + distancia(g.lab, b) <= distancia(a, b) * 1.08));
  });
  const conColor = grupos.filter((g) => croma(g.lab) >= 18);
  const muestras = (conColor.length ? conColor : grupos).slice(0, 6).map((g) => rgbAHex(...g.rgb));

  // Ningún color de verdad: un logo en blanco y negro. Paleta sobria en grises azulados.
  if (!conColor.length) {
    const oscuro = grupos.reduce((m, g) => (g.lab[0] < m.lab[0] ? g : m), grupos[0]);
    const h = hexAHsl(rgbAHex(...oscuro.rgb)).h || 220;
    return {
      monocromo: true,
      muestras,
      paleta: {
        acento: hslAHex({ h: 222, s: 30, l: 40 }),
        primario: hslAHex({ h: 222, s: 30, l: 82 }),
        secundario: hslAHex({ h, s: 12, l: 76 }),
        terciario: "#fbbf24",
        fondo: oscurecerHasta(hslAHex({ h: 222, s: 18, l: 8 }), 0.06),
        superficie: oscurecerHasta(hslAHex({ h: 222, s: 16, l: 14 }), 0.08),
      },
    };
  }

  // El acento: presencia × color, castigando lo muy claro o muy oscuro.
  const puntaje = (g: Grupo) => {
    const L = g.lab[0];
    const extremo = L > 88 || L < 12 ? 0.25 : L > 78 || L < 20 ? 0.6 : 1;
    return Math.pow(g.n, 0.6) * (croma(g.lab) / 100 + 0.15) * extremo;
  };
  const ordenados = [...conColor].sort((a, b) => puntaje(b) - puntaje(a));
  const acento = comoAcento(rgbAHex(...ordenados[0].rgb));
  const ha = hexAHsl(acento).h;
  const otros = ordenados.slice(1).map((g) => rgbAHex(...g.rgb)).filter((c) => diferenciaTono(hexAHsl(c).h, ha) >= 25);
  const segundo = otros[0] ?? null;
  const tercero = otros.find((c) => segundo && diferenciaTono(hexAHsl(c).h, hexAHsl(segundo).h) >= 25) ?? null;
  const s = hexAHsl(acento).s;

  const secundario = segundo
    ? hslAHex({ h: hexAHsl(segundo).h, s: Math.min(75, Math.max(35, hexAHsl(segundo).s)), l: 76 })
    : hslAHex({ h: ha + 30, s: Math.min(70, s * 0.8), l: 78 });
  const terciario = tercero
    ? hslAHex({ h: hexAHsl(tercero).h, s: Math.min(90, Math.max(45, hexAHsl(tercero).s)), l: 60 })
    : segundo && diferenciaTono(hexAHsl(segundo).h, ha) >= 60
      ? hslAHex({ h: hexAHsl(segundo).h, s: Math.min(90, Math.max(50, hexAHsl(segundo).s)), l: 60 })
      : hslAHex({ h: ha + 180, s: Math.min(85, s), l: 60 });

  const paleta: PaletaBase = {
    acento,
    primario: hslAHex({ h: ha, s: Math.min(100, s + 8), l: 84 }),
    secundario,
    terciario,
    fondo: oscurecerHasta(hslAHex({ h: ha, s: Math.min(40, s * 0.5), l: 9 }), 0.06),
    superficie: oscurecerHasta(hslAHex({ h: ha, s: Math.min(34, s * 0.45), l: 15 }), 0.08),
  };
  // El servidor rechaza fondos claros: por las dudas, se verifica acá también.
  if (luminancia(paleta.fondo) > 0.08) paleta.fondo = oscurecerHasta(paleta.fondo, 0.06);
  return { paleta, muestras, monocromo: false };
}
