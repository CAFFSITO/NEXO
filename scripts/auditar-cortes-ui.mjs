// Auditoría de textos cortados: abre cada pantalla de cada rol en varios anchos
// y lista los textos que quedan truncados (con "…") o tapados por el borde de
// su caja. Base temporal; necesita NEXO/dist y Playwright (NEXO_PLAYWRIGHT).
//   node scripts/auditar-cortes-ui.mjs [salida.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { crearEntorno } from '../servidor/tests/entorno.js';
import { ROLES_POR_PAGINA } from '../servidor/permisos.js';

const { chromium } = await import(process.env.NEXO_PLAYWRIGHT || 'playwright');
const salida = process.argv[2] ?? 'cortes-ui.json';
const fuente = readFileSync(new URL('../NEXO/src/navegacion.tsx', import.meta.url), 'utf8');
const rutas = [...fuente.matchAll(/"(\/[^"\n]+)":\s*\{ pagina: "([^"]+)"/g)];
const pantallas = [...new Map(rutas.map(([, ruta, pagina]) => [pagina, { ruta, pagina }])).values()];
const ANCHOS = [1440, 1024, 390];

const entorno = await crearEntorno('nexo-cortes-');
let browser;
const hallazgos = [];
try {
  const base = new URL((await entorno.request('/api/sesion')).response.url).origin;
  entorno.db.exec("UPDATE anuncio_destinatarios SET leido_en=datetime('now')");
  const usuarios = entorno.db.prepare("SELECT email,rol FROM usuarios WHERE estado='activo' ORDER BY id").all();
  browser = await chromium.launch({ channel: 'chrome', headless: true }).catch(() => chromium.launch({ headless: true }));
  for (const [rol, usuario] of new Map(usuarios.map((u) => [u.rol, u]))) {
    for (const ancho of ANCHOS) {
      const ctx = await browser.newContext({ viewport: { width: ancho, height: 900 } });
      const r = await ctx.request.post(`${base}/api/sesion`, { data: { email: usuario.email, contrasena: 'nexo1234' } });
      if (r.status() !== 200) { await ctx.close(); continue; }
      const page = await ctx.newPage();
      for (const { ruta, pagina } of pantallas.filter((p) => ROLES_POR_PAGINA[p.pagina]?.includes(rol))) {
        try {
          await page.goto(`${base}${ruta}${pagina === 'detalle-materia-estudiante' ? '?catedra=1' : ''}`, { waitUntil: 'networkidle', timeout: 20000 });
          await page.waitForTimeout(300);
          const cortes = await page.evaluate(() => {
            const out = [];
            const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
            for (const el of document.querySelectorAll('#contenido-principal *, .nexo-sidebar *')) {
              if (!visible(el) || el.closest('[aria-hidden="true"], .material-symbols-outlined, svg, canvas, video, textarea, input, select')) continue;
              const texto = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
              if (texto.length < 3) continue;
              const cs = getComputedStyle(el);
              const elipsis = cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1;
              const tapado = cs.overflowX === 'hidden' && cs.textOverflow !== 'ellipsis' && el.scrollWidth > el.clientWidth + 2 && cs.whiteSpace.startsWith('nowrap');
              const clamp = cs.webkitLineClamp && cs.webkitLineClamp !== 'none' && el.scrollHeight > el.clientHeight + 2;
              // Texto que se sale del contenedor visible (cortado por un overflow:hidden de algún padre).
              let fuera = false;
              if (!elipsis && !tapado) {
                const r = el.getBoundingClientRect();
                for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
                  const pc = getComputedStyle(p);
                  if (pc.overflowX === 'hidden' || pc.overflowX === 'clip') {
                    const pr = p.getBoundingClientRect();
                    if (r.right > pr.right + 2 || r.left < pr.left - 2) fuera = true;
                    break;
                  }
                }
              }
              if (elipsis || tapado || fuera || clamp) {
                const clase = (el.className && typeof el.className === 'string' ? el.className : '').split(' ').slice(0, 4).join('.');
                out.push({ texto: texto.slice(0, 60), tipo: elipsis ? 'elipsis' : clamp ? 'recorte' : tapado ? 'tapado' : 'fuera', etiqueta: el.tagName.toLowerCase(), clase });
              }
            }
            return out;
          });
          for (const c of cortes) hallazgos.push({ rol, ancho, ruta, ...c });
        } catch (e) { hallazgos.push({ rol, ancho, ruta, error: e.message.split('\n')[0] }); }
      }
      await ctx.close();
    }
    console.log(rol, 'listo');
  }
  writeFileSync(salida, JSON.stringify(hallazgos, null, 1));
  const porTipo = {};
  for (const h of hallazgos) porTipo[h.tipo ?? 'error'] = (porTipo[h.tipo ?? 'error'] ?? 0) + 1;
  console.log('hallazgos:', hallazgos.length, porTipo);
} finally { await browser?.close(); await entorno.cerrar(); }
