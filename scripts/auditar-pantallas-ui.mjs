// Auditoría de apertura por cada pantalla y rol autorizado. Base temporal.
// No acredita las acciones de cada pantalla ni dispositivos multimedia.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { crearEntorno } from '../servidor/tests/entorno.js';
import { ROLES_POR_PAGINA } from '../servidor/permisos.js';

const { chromium } = await import(process.env.NEXO_PLAYWRIGHT || 'playwright');
const fuente = readFileSync(new URL('../NEXO/src/navegacion.tsx', import.meta.url), 'utf8');
const rutas = [...fuente.matchAll(/"(\/[^"\n]+)":\s*\{ pagina: "([^"]+)"/g)];
const pantallas = [...new Map(rutas.map(([, ruta, pagina]) => [pagina, { ruta, pagina }])).values()];
const entorno = await crearEntorno('nexo-auditoria-pantallas-');
let browser;
const resultados = [];
try {
  const base = new URL((await entorno.request('/api/sesion')).response.url).origin;
  entorno.db.exec("UPDATE anuncio_destinatarios SET leido_en=datetime('now')");
  const usuarios = entorno.db.prepare("SELECT email,rol FROM usuarios WHERE estado='activo' ORDER BY id").all();
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const [rol, usuario] of new Map(usuarios.map(u => [u.rol, u]))) {
    const contexto = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    try {
      const sesion = await contexto.request.post(`${base}/api/sesion`, { data: { email: usuario.email, contrasena: 'nexo1234' } });
      assert.equal(sesion.status(), 200);
      const page = await contexto.newPage();
      let errores = [];
      let dependencias = [];
      page.on('pageerror', e => errores.push(e.message));
      page.on('response', r => {
        const path = new URL(r.url()).pathname;
        if (r.status() === 503 && path === '/api/asistencia-ia/modelos') dependencias.push('Motor de modelos privados no disponible (HTTP 503)');
        else if (path.startsWith('/api/') && r.status() >= 500) errores.push(`${r.status()} ${path}`);
      });
      for (const { ruta, pagina } of pantallas.filter(p => ROLES_POR_PAGINA[p.pagina]?.includes(rol))) {
        errores = [];
        dependencias = [];
        let fallo = '';
        try {
          await page.goto(`${base}${ruta}${pagina === 'detalle-materia-estudiante' ? '?catedra=1' : ''}`, { waitUntil: 'networkidle', timeout: 20000 });
          await page.locator('#contenido-principal').waitFor({ timeout: 10000 });
          if (!(await page.locator('#contenido-principal').innerText()).trim()) fallo = 'Contenido vacío';
        } catch (e) { fallo = e.message.split('\n')[0]; }
        resultados.push({ rol, pagina, ruta, errores: [...errores], dependencias: [...dependencias], fallo });
      }
      console.log(`${rol}: ${resultados.filter(r => r.rol === rol).length} pantallas recorridas`);
    } finally { await contexto.close(); }
  }
  const fallos = resultados.filter(r => r.fallo || r.errores.length);
  writeFileSync(new URL('../AUDITORIA_PANTALLAS_RESULTADOS.json', import.meta.url), JSON.stringify({ fecha: new Date().toISOString(), alcance: 'Apertura y errores JS/HTTP 5xx; no valida todas las acciones', resultados }, null, 2));
  console.log(JSON.stringify({ recorridos: resultados.length, fallos }, null, 2));
  assert.equal(fallos.length, 0, 'Pantallas con fallos; consultar AUDITORIA_PANTALLAS_RESULTADOS.json');
} finally { await browser?.close(); await entorno.cerrar(); }
