// Auditoría de íconos: junta cada nombre de Material Symbols que usa NEXO (en
// la interfaz y en el servidor) y los dibuja con la fuente real. Un nombre que
// no existe en la fuente se ve como texto cortado: esos se informan.
//   node scripts/auditar-iconos.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const { chromium } = await import(process.env.NEXO_PLAYWRIGHT || 'playwright');
const raiz = new URL('../', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

function recorrer(dir, archivos = []) {
  for (const n of readdirSync(dir)) {
    if (n === 'node_modules' || n === 'dist' || n === 'tests') continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) recorrer(p, archivos);
    else if (/\.(tsx|ts|js|mjs)$/.test(n)) archivos.push(p);
  }
  return archivos;
}

const usos = new Map(); // nombre → archivos
const anotar = (nombre, archivo) => {
  if (!/^[a-z][a-z0-9_]{1,40}$/.test(nombre)) return;
  if (!usos.has(nombre)) usos.set(nombre, new Set());
  usos.get(nombre).add(archivo.replace(raiz, ''));
};
for (const archivo of [...recorrer(join(raiz, 'NEXO/src')), ...recorrer(join(raiz, 'servidor'))]) {
  const s = readFileSync(archivo, 'utf8');
  // <span className="material-symbols-outlined …">nombre</span> y {cond ? "a" : "b"}
  for (const m of s.matchAll(/material-symbols-outlined[^>]*>\s*([a-z0-9_]+)\s*</g)) anotar(m[1], archivo);
  for (const m of s.matchAll(/material-symbols-outlined[^>]*>\s*\{([^}]{0,200})\}\s*</g)) for (const q of m[1].matchAll(/["'`]([a-z0-9_]+)["'`]/g)) anotar(q[1], archivo);
  // icono: "x", icono="x", icon: 'x', iconoColor no.
  for (const m of s.matchAll(/\bicon[oa]?s?\s*[:=]\s*\{?\s*["'`]([a-z0-9_]+)["'`]/g)) anotar(m[1], archivo);
  for (const m of s.matchAll(/\bicono[A-Z]?\w*\s*[:=]\s*["'`]([a-z0-9_]+)["'`]/g)) anotar(m[1], archivo);
  // Tablas de íconos: { x: "icono" } dentro de objetos cuyo nombre empieza con ICONO.
  for (const m of s.matchAll(/ICONO[A-Z_]*[^=]*=\s*\{([\s\S]{0,1500}?)\};/g)) for (const q of m[1].matchAll(/:\s*["'`]([a-z0-9_]+)["'`]/g)) anotar(q[1], archivo);
}

const nombres = [...usos.keys()].sort();
const browser = await chromium.launch({ channel: 'chrome', headless: true }).catch(() => chromium.launch({ headless: true }));
const page = await browser.newPage();
await page.setContent(`<html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block"></head>
<body>${nombres.map((n) => `<span class="i" style="font-family:'Material Symbols Outlined';font-size:40px;white-space:nowrap;font-feature-settings:'liga'" data-n="${n}">${n}</span><br>`).join('')}</body></html>`);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);
const anchos = await page.$$eval('.i', (els) => els.map((e) => [e.dataset.n, e.getBoundingClientRect().width]));
await browser.close();
const rotos = anchos.filter(([, w]) => w > 48).map(([n]) => n);
console.log(`Íconos distintos: ${nombres.length} · rotos: ${rotos.length}`);
for (const n of rotos) console.log(`  ${n}  ←  ${[...usos.get(n)].join(', ')}`);
