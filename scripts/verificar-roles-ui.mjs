// Humo de integración: cada perfil abre su pantalla propia en una base temporal.
import assert from 'node:assert/strict';
import { crearEntorno } from '../servidor/tests/entorno.js';

const { chromium } = await import(process.env.NEXO_PLAYWRIGHT || 'playwright');
const casos = [
  ['dirección', 'direccion@sanmartin.nexo.edu', '/admin/panel'],
  ['docente', 'garcia@sanmartin.nexo.edu', '/portafolio-docente'],
  ['preceptoría', 'pereyra@sanmartin.nexo.edu', '/comunidad/curso'],
  ['estudiante', 'julieta@sanmartin.nexo.edu', '/portafolio'],
  ['familia', 'familia.rossi@sanmartin.nexo.edu', '/comunicados'],
  ['biblioteca', 'biblioteca@sanmartin.nexo.edu', '/biblioteca/panel'],
  ['centro de estudiantes', 'centro@sanmartin.nexo.edu', '/centro-estudiantes'],
  ['Maestro', 'sistema@nexo.edu', '/maestro'],
];

const entorno = await crearEntorno('nexo-roles-ui-');
let browser;
const desbordes = [];
try {
  const base = new URL((await entorno.request('/api/sesion')).response.url).origin;
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const [rol, email, ruta] of casos) {
    const contexto = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    try {
      const pagina = await contexto.newPage();
      const errores = [];
      pagina.on('pageerror', error => errores.push(error.message));
      const sesion = await pagina.request.post(`${base}/api/sesion`, { data: { email, contrasena: 'nexo1234' } });
      assert.equal(sesion.status(), 200, `${rol}: acceso`);
      await pagina.goto(`${base}${ruta}`, { waitUntil: 'domcontentloaded' });
      await pagina.locator('#contenido-principal').waitFor({ timeout: 15000 });
      assert.deepEqual(errores, [], `${rol}: errores JS en ${ruta}`);
      await pagina.setViewportSize({ width: 390, height: 844 });
      const ancho = await pagina.evaluate(() => ({
        contenido: document.documentElement.scrollWidth,
        ventana: window.innerWidth,
        elementos: [...document.querySelectorAll('body *')].filter(el => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.right > window.innerWidth + 2;
        }).slice(0, 5).map(el => `${el.tagName}.${String(el.className).slice(0, 80)}`),
      }));
      if (ancho.contenido > ancho.ventana) desbordes.push(`${rol} ${ruta}: ${ancho.contenido}px > ${ancho.ventana}px; ${ancho.elementos.join(', ')}`);
      console.log(`PASS: ${rol} abre ${ruta}; ancho móvil ${ancho.contenido}/${ancho.ventana}px`);
    } finally {
      await contexto.close();
    }
  }
  assert.deepEqual(desbordes, [], `Desbordes móviles:\n${desbordes.join('\n')}`);
} finally {
  await browser?.close();
  await entorno.cerrar();
}
