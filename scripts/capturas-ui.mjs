// Capturas de pantalla de NEXO por rol, para revisar el diseño a ojo.
// Usa una base temporal (no toca nexo.db) y el frontend compilado (NEXO/dist).
//   node scripts/capturas-ui.mjs [carpeta] [--tema=claro|oscuro] [--movil] [--solo=ruta1,ruta2]
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { crearEntorno } from '../servidor/tests/entorno.js';

const { chromium } = await import(process.env.NEXO_PLAYWRIGHT || 'playwright');
const args = process.argv.slice(2);
const carpeta = args.find((a) => !a.startsWith('--')) ?? 'capturas';
const tema = args.find((a) => a.startsWith('--tema='))?.split('=')[1] ?? 'claro';
const movil = args.includes('--movil');
const solo = args.find((a) => a.startsWith('--solo='))?.slice(7).split(',');
mkdirSync(carpeta, { recursive: true });

const PLAN = [
  ['direccion@sanmartin.nexo.edu', 'direccion', ['/admin/cursos | button:has-text("Nuevo curso")', '/admin/cursos | tbody tr >> nth=1', '/documentos | button:has-text("Documento en blanco")', '/comunidad | .nexo-menu-cerrar', '/admin/panel', '/anuncios', '/anuncios | .wa-chat >> nth=1', '/anuncios | .wa-chat >> nth=1 | .wa-fila.saliente .wa-menu-boton', '/anuncios | .wa-chat >> nth=0 | .wa-conversacion-titulo', '/anuncios | [aria-label="Nuevo aviso"]', '/admin/panel | .nexo-user-boton', '/comunidad', '/admin/perfiles', '/admin/cursos', '/reportes', '/chat', '/comunidad/calendario', '/admin/edicion', '/configuracion', '/notificaciones', '/documentos']],
  ['garcia@sanmartin.nexo.edu', 'profesor', ['/portafolio-docente', '/portafolio-docente/aula-virtual', '/portafolio/gestion', '/biblioteca/institucional', '/estudio/metodos', '/portafolio-docente/diario']],
  ['martin@sanmartin.nexo.edu', 'estudiante', ['/comunidad | [aria-label="Más secciones"]', '/portafolio/materia?catedra=1', '/aula-virtual', '/objetivos/competencias', '/comunidad/tendencias', '/comunidad', '/portafolio/mis-cursos', '/portafolio/mis-tareas', '/portafolio/calificaciones', '/objetivos', '/objetivos/metas', '/objetivos/habitos', '/asistencia-academica', '/quejas/enviar', '/biblioteca/nacional', '/proyectos', '/comunidad/debates']],
  ['pereyra@sanmartin.nexo.edu', 'preceptor', ['/anuncios', '/comunidad/curso']],
  ['familia.rossi@sanmartin.nexo.edu', 'familia', ['/comunicados', '/familia/calendario']],
  ['biblioteca@sanmartin.nexo.edu', 'biblioteca', ['/biblioteca/panel']],
  ['centro@sanmartin.nexo.edu', 'centro', ['/centro-estudiantes', '/centro-estudiantes/quejas']],
  ['sistema@nexo.edu', 'maestro', ['/maestro', '/maestro/anuncios', '/admin/instituciones', '/admin/salud']],
];

const entorno = await crearEntorno('nexo-capturas-');
let browser;
try {
  const base = new URL((await entorno.request('/api/sesion')).response.url).origin;
  // Sin la capa de avisos obligatorios tapando todo (salvo que se pida verla).
  if (!args.includes('--pendientes')) entorno.db.exec("UPDATE anuncio_destinatarios SET leido_en=datetime('now')");
  browser = await chromium.launch({ channel: 'chrome', headless: true }).catch(() => chromium.launch({ headless: true }));
  const viewport = movil ? { width: 390, height: 844 } : { width: 1440, height: 900 };
  // Login sin sesión.
  {
    const ctx = await browser.newContext({ viewport, colorScheme: tema === 'oscuro' ? 'dark' : 'light' });
    await ctx.addInitScript((t) => { try { localStorage.setItem('nexo:tema', t); } catch { /* */ } }, tema);
    const page = await ctx.newPage();
    await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: join(carpeta, `login.png`) });
    await ctx.close();
  }
  for (const [email, nombre, rutas] of PLAN) {
    const ctx = await browser.newContext({ viewport, colorScheme: tema === 'oscuro' ? 'dark' : 'light' });
    await ctx.addInitScript((t) => { try { localStorage.setItem('nexo:tema', t); } catch { /* */ } }, tema);
    const r = await ctx.request.post(`${base}/api/sesion`, { data: { email, contrasena: 'nexo1234' } });
    if (r.status() !== 200) { console.log('login fallo', email, r.status()); await ctx.close(); continue; }
    const page = await ctx.newPage();
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    let n = 0;
    for (const paso of rutas) {
      // "/ruta | selector | selector": después de abrir la ruta, un clic en cada selector.
      const [ruta, ...clics] = paso.split(' | ').map((x) => x.trim());
      if (solo && !solo.includes(ruta)) continue;
      try {
        await page.goto(`${base}${ruta}`, { waitUntil: 'networkidle', timeout: 20000 });
        for (const sel of clics) { await page.locator(sel).first().click({ timeout: 8000 }); await page.waitForTimeout(500); }
        await page.waitForTimeout(600);
        const archivo = join(carpeta, `${nombre}${ruta.replace(/[/?=:]/g, '_')}${clics.length ? `-${++n}` : ''}.png`);
        await page.screenshot({ path: archivo, fullPage: args.includes('--completa') });
      } catch (e) { console.log('fallo', nombre, ruta, e.message.split('\n')[0]); }
    }
    if (errores.length) console.log(nombre, 'errores JS:', errores);
    await ctx.close();
  }
  console.log('listo', carpeta);
} finally { await browser?.close(); await entorno.cerrar(); }
