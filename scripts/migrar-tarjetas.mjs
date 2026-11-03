// Migración única: tarjetas y botones más sobrios en toda la plataforma.
//   node scripts/migrar-tarjetas.mjs NEXO/src
// · Radios enormes (rounded-[20px], rounded-[2rem]…) → rounded-xl.
// · Botones "píldora" con texto (rounded-full + px-3…px-9 + py-) → rounded-lg.
//   Los círculos de íconos, avatares e insignias (sin px grande) quedan redondos.
// · Sin "rebotes" al tocar o pasar el mouse (active:scale-95, hover:scale-105…).
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function recorrer(dir, archivos = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { if (n !== 'maestro') recorrer(p, archivos); }
    else if (n.endsWith('.tsx')) archivos.push(p);
  }
  return archivos;
}

let total = 0;
const contar = (r) => (...m) => { total++; return typeof r === 'function' ? r(...m) : r; };
for (const archivo of recorrer(process.argv[2] ?? 'NEXO/src')) {
  const antes = readFileSync(archivo, 'utf8');
  let s = antes;
  s = s.replace(/\brounded-\[(?:1[6-9]|[2-9]\d)px\]/g, contar('rounded-xl'));
  s = s.replace(/\brounded-\[\d+(?:\.\d+)?rem\]/g, contar('rounded-xl'));
  s = s.replace(/\s(?:[a-z-]+:)?(?:active|hover|group-hover):scale-(?:\[[\d.]+\]|\d+)/g, contar(''));
  // Botones con texto en forma de píldora: dentro de cada cadena de clases.
  s = s.replace(/(["'`])([^"'`\n]*?)\1/g, (todo, q, clases) => {
    if (!/\brounded-full\b/.test(clases) || !/\bpx-(?:[3-9]|1[0-2])\b/.test(clases) || !/\bpy-/.test(clases)) return todo;
    if (/\b(?:w|h|size)-(?:\d|\[)/.test(clases) && !/\bw-full\b/.test(clases)) return todo; // círculos de tamaño fijo
    total++;
    return q + clases.replace(/\brounded-full\b/g, 'rounded-lg') + q;
  });
  if (s !== antes) writeFileSync(archivo, s);
}
console.log('cambios:', total);
