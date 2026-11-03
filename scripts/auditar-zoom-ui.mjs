// Auditoría de zoom: con el navegador en 110 %–200 % la pantalla "mide" menos
// píxeles (1440 px al 150 % son 960). Abre cada pantalla de cada rol en esos
// anchos y lista:
//   · aplastado: un texto metido en una columna angosta, que se parte en
//     muchos renglones de pocas letras ("Po / rta / fo...").
//   · desborde: la página entera se corre de costado (scroll horizontal).
//   · encima: dos textos que se pisan.
// Base temporal; necesita NEXO/dist y Playwright (NEXO_PLAYWRIGHT).
//   node scripts/auditar-zoom-ui.mjs [salida.json] [--anchos=1280,1093,960] [--rol=direccion]
import { readFileSync, writeFileSync } from 'node:fs';
import { crearEntorno } from '../servidor/tests/entorno.js';
import { ROLES_POR_PAGINA } from '../servidor/permisos.js';

const { chromium } = await import(process.env.NEXO_PLAYWRIGHT || 'playwright');
const args = process.argv.slice(2);
const salida = args.find((a) => !a.startsWith('--')) ?? 'zoom-ui.json';
const ANCHOS = (args.find((a) => a.startsWith('--anchos='))?.slice(9) ?? '1280,1093,960,820,683').split(',').map(Number);
const soloRol = args.find((a) => a.startsWith('--rol='))?.slice(6);
const fuente = readFileSync(new URL('../NEXO/src/navegacion.tsx', import.meta.url), 'utf8');
const rutas = [...fuente.matchAll(/"(\/[^"\n]+)":\s*\{ pagina: "([^"]+)"/g)];
const pantallas = [...new Map(rutas.map(([, ruta, pagina]) => [pagina, { ruta, pagina }])).values()];

const entorno = await crearEntorno('nexo-zoom-');
let browser;
const hallazgos = [];
try {
  const base = new URL((await entorno.request('/api/sesion')).response.url).origin;
  entorno.db.exec("UPDATE anuncio_destinatarios SET leido_en=datetime('now')");
  const usuarios = entorno.db.prepare("SELECT email,rol FROM usuarios WHERE estado='activo' ORDER BY id").all();
  browser = await chromium.launch({ channel: 'chrome', headless: true }).catch(() => chromium.launch({ headless: true }));
  for (const [rol, usuario] of new Map(usuarios.map((u) => [u.rol, u]))) {
    if (soloRol && rol !== soloRol) continue;
    for (const ancho of ANCHOS) {
      const ctx = await browser.newContext({ viewport: { width: ancho, height: 760 } });
      const r = await ctx.request.post(`${base}/api/sesion`, { data: { email: usuario.email, contrasena: 'nexo1234' } });
      if (r.status() !== 200) { await ctx.close(); continue; }
      const page = await ctx.newPage();
      for (const { ruta, pagina } of pantallas.filter((p) => ROLES_POR_PAGINA[p.pagina]?.includes(rol))) {
        try {
          await page.goto(`${base}${ruta}${pagina === 'detalle-materia-estudiante' ? '?catedra=1' : ''}`, { waitUntil: 'networkidle', timeout: 20000 });
          await page.waitForTimeout(250);
          const problemas = await page.evaluate(() => {
            const out = [];
            if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push({ tipo: 'desborde', texto: `${document.documentElement.scrollWidth}px de ancho` });
            const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
            const textos = [];
            for (const el of document.querySelectorAll('body *')) {
              if (!visible(el) || el.closest('[aria-hidden="true"], .material-symbols-outlined, svg, canvas, video, textarea, input, select, .sr-only')) continue;
              const texto = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
              if (texto.length < 4) continue;
              const cs = getComputedStyle(el);
              const r = el.getBoundingClientRect();
              const tam = parseFloat(cs.fontSize);
              const renglon = parseFloat(cs.lineHeight) || tam * 1.3;
              const renglones = Math.round(r.height / renglon);
              const palabra = Math.max(...texto.split(/\s+/).map((p) => p.length));
              // Más renglones que lo razonable para el largo del texto, en una caja más angosta que su palabra más larga o que ~6 letras.
              if (renglones >= 3 && (r.width < tam * 4.5 || (r.width < palabra * tam * 0.5 && renglones > texto.length / 6))) {
                const clase = (typeof el.className === 'string' ? el.className : '').split(' ').filter(Boolean).slice(0, 4).join('.');
                out.push({ tipo: 'aplastado', texto: texto.slice(0, 50), etiqueta: el.tagName.toLowerCase(), clase, anchoCaja: Math.round(r.width), renglones });
              }
              // Lo que flota a propósito (avisos, barra inferior, encabezados fijos) no cuenta como "se pisan".
              let flota = false;
              for (let p = el; p && p !== document.body; p = p.parentElement) { const pos = getComputedStyle(p).position; if (pos === 'fixed' || pos === 'sticky') { flota = true; break; } }
              if (!flota && renglones <= 2 && r.width > 8) textos.push({ el, r, texto });
            }
            // Textos que se pisan (cajas que se cruzan y ninguna contiene a la otra).
            for (let i = 0; i < textos.length && out.length < 40; i++) {
              for (let j = i + 1; j < textos.length; j++) {
                const a = textos[i]; const b = textos[j];
                if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
                const x = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
                const y = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
                if (x > 6 && y > 6 && x * y > 0.3 * Math.min(a.r.width * a.r.height, b.r.width * b.r.height)) {
                  out.push({ tipo: 'encima', texto: `${a.texto.slice(0, 30)} ↔ ${b.texto.slice(0, 30)}` });
                }
              }
            }
            return out;
          });
          for (const p of problemas) hallazgos.push({ rol, ancho, ruta, ...p });
        } catch (e) { hallazgos.push({ rol, ancho, ruta, tipo: 'error', texto: e.message.split('\n')[0] }); }
      }
      await ctx.close();
    }
    console.log(rol, 'listo');
  }
  writeFileSync(salida, JSON.stringify(hallazgos, null, 1));
  const porTipo = {};
  for (const h of hallazgos) porTipo[h.tipo] = (porTipo[h.tipo] ?? 0) + 1;
  console.log('hallazgos:', hallazgos.length, porTipo);
} finally { await browser?.close(); await entorno.cerrar(); }
