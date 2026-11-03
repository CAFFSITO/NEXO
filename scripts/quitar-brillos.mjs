// Migración única: sin brillos ("glows") en ninguna parte de NEXO.
//   node scripts/quitar-brillos.mjs NEXO/src
// · Clases: manchas de luz decorativas (círculos con blur-3xl / blur-[NNNpx])
//   desaparecen; las sombras de color (shadow-acento/20…) se van.
// · CSS: se sacan las sombras de color difusas (0 0 18px acento…), los
//   text-shadow y los drop-shadow. Quedan las sombras neutras y los anillos de
//   foco (0 0 0 3px …), que son accesibilidad, no decoración.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function recorrer(dir, archivos = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) recorrer(p, archivos);
    else if (/\.(tsx|css)$/.test(n)) archivos.push(p);
  }
  return archivos;
}

// Divide "a, b(c, d), e" en sus partes de primer nivel.
function partes(valor) {
  const out = []; let nivel = 0; let actual = '';
  for (const c of valor) {
    if (c === '(') nivel++;
    if (c === ')') nivel--;
    if (c === ',' && nivel === 0) { out.push(actual.trim()); actual = ''; } else actual += c;
  }
  if (actual.trim()) out.push(actual.trim());
  return out;
}

const NEUTRO = /rgba?\(\s*0\s*,\s*0\s*,\s*0|rgb\(\s*0 0 0|#000|var\(--nexo-sombra|var\(--nexo-sup|var\(--nexo-linea|var\(--nexo-borde|currentColor|transparent|var\(--nexo-fondo|var\(--m-negro|#0b0d12|var\(--av-oscuro/;
function esBrillo(parte) {
  const m = parte.replace(/^inset\s+/, '').match(/^(-?[\d.]+(?:px)?)\s+(-?[\d.]+(?:px)?)\s+([\d.]+)px(?:\s+(-?[\d.]+)px)?\s+(.+)$/);
  if (!m) return false;
  const [, x, y, desenfoque, , color] = m;
  const deColor = /acento|primario|secundario|terciario|--m-|--ev|--av-color|--planeta|rgba?\(\s*(?!0\s*,\s*0\s*,\s*0)\d/.test(color);
  if (!deColor && NEUTRO.test(color)) return false;
  const difuso = parseFloat(desenfoque) >= 4;
  const centrado = parseFloat(x) === 0 && parseFloat(y) === 0;
  // De color y difusa: alrededor del elemento (glow) o muy grande hacia abajo.
  return difuso && (centrado || parseFloat(desenfoque) >= 20);
}

let cambios = 0;
for (const archivo of recorrer(process.argv[2] ?? 'NEXO/src')) {
  const antes = readFileSync(archivo, 'utf8');
  let s = antes;
  if (archivo.endsWith('.tsx')) {
    // Manchas de luz: un elemento decorativo con desenfoque grande → oculto.
    s = s.replace(/\b(?:blur-(?:2xl|3xl)|blur-\[\d+px\])(?=[\s"`'])/g, () => { cambios++; return 'hidden'; });
    s = s.replace(/\s(?:[a-z-]+:)*shadow-(?:primary|acento|tertiary|secondary|primary-container)(?:\/\d+)?(?=[\s"`'])/g, () => { cambios++; return ''; });
  } else {
    s = s.replace(/box-shadow:\s*([^;}]+)/g, (todo, valor) => {
      if (/^\s*(none|var\([^)]*\))\s*$/.test(valor)) return todo;
      const quedan = partes(valor).filter((p) => !esBrillo(p));
      if (quedan.length === partes(valor).length) return todo;
      cambios++;
      return `box-shadow: ${quedan.length ? quedan.join(', ') : 'none'}`;
    });
    s = s.replace(/\s*text-shadow:[^;}]+;?/g, () => { cambios++; return ''; });
    s = s.replace(/filter:\s*drop-shadow\([^;}]*\);?/g, () => { cambios++; return ''; });
  }
  if (s !== antes) { writeFileSync(archivo, s); console.log('sin brillos:', archivo); }
}
console.log('cambios:', cambios);
