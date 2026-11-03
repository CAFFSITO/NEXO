// Migración única: clases de Tailwind con colores fijos del diseño violeta
// anterior → tokens del tema (que funcionan en claro y en oscuro).
//   node scripts/migrar-clases-tema.mjs NEXO/src
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REEMPLAZOS = [
  // Acento y sus variantes.
  [/\bhover:bg-\[#d15aff\]/g, 'hover:bg-acento-vivo'],
  [/\bbg-\[#d15aff\]/g, 'bg-acento-vivo'],
  [/\bto-\[#d15aff\]/g, 'to-acento-vivo'],
  [/\bbg-\[#b039df\]/g, 'bg-acento-vivo'],
  [/\bbg-\[#8032a3\]/g, 'bg-acento'],
  [/\bbg-\[#4900a6\]/g, 'bg-acento-oscuro'],
  [/\bborder-\[#4900a6\](\/\d+)?/g, 'border-acento$1'],
  [/\bfrom-\[#4900a6\]\/20/g, 'from-primary/10'],
  [/\bto-\[#4900a6\]/g, 'to-primary/10'],
  [/\bto-\[#3D2A6B\]/g, 'to-primary/10'],
  [/\bhover:bg-\[#241640\]/g, 'hover:bg-surface-container-high'],
  [/\bto-\[#241640\]/g, 'to-primary/5'],
  [/\btext-\[#7c8cff\]/g, 'text-primary'],
  [/\btext-\[#ecdcff\]/g, 'text-on-surface'],
  // Superficies del violeta viejo.
  [/\bborder-\[#3b2f50\]/g, 'border-linea'],
  [/\bbg-\[#(?:25193a|24143b|231340|241338|211633|241640)\]/gi, 'bg-surface-container-low'],
  [/\bbg-\[#0f0820\]/gi, 'bg-surface-container-lowest'],
  [/\bbg-\[#(?:3d2568|3b2f50|3D2A6B|37205c|341f5a)\]/gi, 'bg-surface-container-high'],
  // Semánticos claros (pensados para fondo oscuro) → paleta que se espeja.
  [/\btext-\[#4ade80\]/g, 'text-emerald-400'],
  [/\btext-\[#FACC15\]/g, 'text-yellow-400'],
  [/\bbg-\[#2e7d32\]\/20/g, 'bg-emerald-500/15'],
  // Brillos "neón" del diseño anterior: un diseño serio no los usa.
  [/\s?(?:hover:)?shadow-\[0_0_\d+px_(?:rgba\([^)\]]*\)|var\(--nexo-acento\))\]/g, ''],
  [/\bshadow-\[0_20px_40px_rgba\(0,0,0,0\.4\)\]/g, 'shadow-lg'],
];

function recorrer(dir, archivos = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) recorrer(p, archivos);
    else if (/\.(tsx|ts)$/.test(n)) archivos.push(p);
  }
  return archivos;
}

let total = 0;
for (const archivo of recorrer(process.argv[2] ?? 'NEXO/src')) {
  const antes = readFileSync(archivo, 'utf8');
  let s = antes;
  for (const [re, por] of REEMPLAZOS) s = s.replace(re, (...m) => { total++; return typeof por === 'string' ? por.replace('$1', m[1] ?? '') : por; });
  if (s !== antes) { writeFileSync(archivo, s); console.log('migrado', archivo); }
}
console.log('reemplazos:', total);
