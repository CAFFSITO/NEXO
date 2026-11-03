// Migración única de los CSS de módulos al tema claro/oscuro.
//   node scripts/migrar-css-tema.mjs archivo.css [...]
// Reemplaza los blancos/negros translúcidos (pensados para fondo oscuro) por la
// tinta del tema, los colores claros de Tailwind por sus variables (que se
// espejan en modo claro), las sombras pesadas y los velos por tokens.
import { readFileSync, writeFileSync } from 'node:fs';

// Tonos claros de Tailwind (v3, hex) → variable de la paleta (se espeja en claro).
const CLAROS = {
  '#ecfdf5': 'emerald-50', '#d1fae5': 'emerald-100', '#a7f3d0': 'emerald-200', '#6ee7b7': 'emerald-300', '#34d399': 'emerald-400',
  '#fff1f2': 'rose-50', '#ffe4e6': 'rose-100', '#fecdd3': 'rose-200', '#fda4af': 'rose-300', '#fb7185': 'rose-400',
  '#fef3c7': 'amber-100', '#fde68a': 'amber-200', '#fcd34d': 'amber-300', '#fbbf24': 'amber-400',
  '#fef08a': 'yellow-200', '#fde047': 'yellow-300', '#facc15': 'yellow-400',
  '#bae6fd': 'sky-200', '#7dd3fc': 'sky-300', '#38bdf8': 'sky-400',
  '#fecaca': 'red-200', '#fca5a5': 'red-300', '#f87171': 'red-400',
  '#bbf7d0': 'green-200', '#86efac': 'green-300', '#4ade80': 'green-400',
  '#99f6e4': 'teal-200', '#5eead4': 'teal-300', '#2dd4bf': 'teal-400',
  '#a5f3fc': 'cyan-200', '#67e8f9': 'cyan-300', '#22d3ee': 'cyan-400',
  '#bfdbfe': 'blue-200', '#93c5fd': 'blue-300', '#60a5fa': 'blue-400',
  '#c7d2fe': 'indigo-200', '#a5b4fc': 'indigo-300', '#818cf8': 'indigo-400',
  '#ddd6fe': 'violet-200', '#c4b5fd': 'violet-300', '#a78bfa': 'violet-400',
  '#e9d5ff': 'purple-200', '#d8b4fe': 'purple-300', '#c084fc': 'purple-400',
  '#fbcfe8': 'pink-200', '#f9a8d4': 'pink-300', '#f472b6': 'pink-400',
  '#fed7aa': 'orange-200', '#fdba74': 'orange-300', '#fb923c': 'orange-400',
  '#d9f99d': 'lime-200', '#bef264': 'lime-300', '#a3e635': 'lime-400',
};

const pct = (a) => `${Math.round(parseFloat(a) * 1000) / 10}%`;

for (const archivo of process.argv.slice(2)) {
  let s = readFileSync(archivo, 'utf8');
  const antes = s;
  // Sombras pesadas → sombras del tema.
  s = s.replace(/box-shadow:\s*0 (?:1[6-9]|[2-9]\d)px \d+px rgba\(0,\s*0,\s*0,\s*\.\d+\)(?=[;,])/g, 'box-shadow: var(--nexo-sombra-3)');
  // Velos de diálogos.
  s = s.replace(/background:\s*rgba\(\s*4,\s*2,\s*10,\s*\.\d+\)/g, 'background: var(--nexo-velo)');
  // Superficies flotantes "casi negras".
  s = s.replace(/color-mix\(in srgb, var\(--nexo-sup-(\d)\) 9\d%, black\)/g, 'var(--nexo-sup-1)');
  // Campos sobre negro translúcido → campo del tema.
  s = s.replace(/background:\s*rgba\(0,\s*0,\s*0,\s*\.(1\d|2\d|3\d?)\)/g, 'background: var(--nexo-sup-2)');
  // Blancos translúcidos → tinta del tema.
  s = s.replace(/rgba\(255,\s*255,\s*255,\s*(\.\d+|0?\.\d+|1)\)/g, (_, a) => `color-mix(in srgb, var(--nexo-tinta) ${pct(a)}, transparent)`);
  // Colores claros de Tailwind → variable de paleta.
  s = s.replace(/#[0-9a-fA-F]{6}\b/g, (hex) => (CLAROS[hex.toLowerCase()] ? `var(--color-${CLAROS[hex.toLowerCase()]})` : hex));
  // Ya no hay campos "solo oscuros".
  s = s.replace(/\s*color-scheme:\s*dark;/g, '');
  s = s.replace(/font-family:\s*"Plus Jakarta Sans",\s*sans-serif;/g, 'font-family: "Inter", sans-serif;');
  if (s !== antes) { writeFileSync(archivo, s); console.log('migrado', archivo); }
}
