// Genera NEXO/src/estilos/paleta-modos.css a partir de la paleta de Tailwind.
//   node scripts/generar-paleta-modos.mjs
//
// NEXO nació oscuro: miles de clases dicen text-white, text-slate-400 o
// text-emerald-300 pensando en un fondo oscuro. En modo claro esas mismas
// clases se leen "espejadas": los grises se invierten (slate-400 ↔ slate-600) y
// los tonos claros de cada color pasan a sus versiones oscuras. "white" pasa a
// ser la tinta del tema (casi negra en claro) y el blanco de verdad es "blanco".
import { readFileSync, writeFileSync } from 'node:fs';

const raiz = new URL('../NEXO/', import.meta.url);
const tema = readFileSync(new URL('node_modules/tailwindcss/theme.css', raiz), 'utf8');
const v = {};
for (const m of tema.matchAll(/--color-([a-z]+)-(\d+):\s*([^;]+);/g)) (v[m[1]] ??= {})[m[2]] = m[3];

const NEUTROS = ['slate', 'gray', 'zinc', 'neutral', 'stone'];
const COLORES = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];
const ESPEJO_NEUTRO = { 50: 950, 100: 900, 200: 800, 300: 700, 400: 600, 600: 400, 700: 300, 800: 200, 900: 100, 950: 50 };
const OSCURO_COLOR = { 50: 900, 100: 900, 200: 800, 300: 700, 400: 700 };

const claro = [];
const oscuro = [];
for (const c of NEUTROS) {
  claro.push('  ' + Object.entries(ESPEJO_NEUTRO).map(([a, b]) => `--color-${c}-${a}: ${v[c][b]};`).join(' '));
  oscuro.push('  ' + Object.keys(ESPEJO_NEUTRO).map((a) => `--color-${c}-${a}: ${v[c][a]};`).join(' '));
}
for (const c of COLORES) {
  claro.push('  ' + Object.entries(OSCURO_COLOR).map(([a, b]) => `--color-${c}-${a}: ${v[c][b]};`).join(' '));
  oscuro.push('  ' + Object.keys(OSCURO_COLOR).map((a) => `--color-${c}-${a}: ${v[c][a]};`).join(' '));
}

// Fondos de color sólido (500 en adelante, negro): el texto blanco sigue blanco.
const solidos = [];
for (const c of COLORES) for (const t of [500, 600, 700, 800, 900, 950]) solidos.push(`[class~="bg-${c}-${t}"]`);
const negros = ['bg-black', 'bg-black/90', 'bg-black/80', 'bg-black/70', 'bg-black/60', 'bg-black/50', 'bg-black/40'].map((k) => `[class~="${k}"]`);

const css = `/* GENERADO por scripts/generar-paleta-modos.mjs — no editar a mano.
   Remapeo de la paleta de Tailwind según el modo (ver el script). */

:root, [data-modo="claro"] {
  --color-white: var(--nexo-tinta);
${claro.join('\n')}
}

[data-modo="oscuro"], .maestro {
  --color-white: #fff;
${oscuro.join('\n')}
}

/* Texto blanco sobre un fondo sólido de color o negro (video, fotos): blanco real. */
:is(
  ${[...solidos, ...negros, '[class*="bg-gradient-to"]', '[class*="bg-[#"]'].join(',\n  ')}
):is(.text-white, [class~="text-white/90"], [class~="text-white/80"], [class~="text-white/70"]),
:is(
  ${solidos.join(',\n  ')}
) .text-white { color: #fff; }

/* Sobre el acento y el primario, la letra que eligió el tema (blanca u oscura). */
.bg-acento:is(.text-white, [class~="text-white/90"]), .bg-acento .text-white { color: var(--nexo-sobre-acento); }
.bg-primary:is(.text-white, [class~="text-white/90"]), .bg-primary .text-white,
.bg-primary-container:is(.text-white), .bg-inverse-primary:is(.text-white) { color: var(--nexo-sobre-primario); }
`;
writeFileSync(new URL('src/estilos/paleta-modos.css', raiz), css);
console.log('paleta-modos.css:', css.length, 'bytes');
