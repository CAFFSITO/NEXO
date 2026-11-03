// Ejecutar tras compilar NEXO. Usa Chrome headless y una base descartable.
// NEXO_PLAYWRIGHT puede apuntar al index.mjs de una instalación de Playwright.
import assert from 'node:assert/strict';
import { crearEntorno } from '../servidor/tests/entorno.js';
const { chromium } = await import(process.env.NEXO_PLAYWRIGHT || 'playwright');
const entorno = await crearEntorno('nexo-personalizacion-ui-');
let browser;
try {
  const respuesta = await entorno.request('/api/sesion');
  const base = new URL(respuesta.response.url).origin;
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errores = [];
  page.on('pageerror', error => errores.push(error.message));
  const sesion = await page.request.post(`${base}/api/sesion`, { data: { email: 'julieta@sanmartin.nexo.edu', contrasena: 'nexo1234' } });
  assert.equal(sesion.status(), 200);
  await page.goto(`${base}/configuracion`);
  const panel = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Mi experiencia de lectura' }) });
  await panel.getByRole('button', { name: 'Guardar preferencias' }).waitFor();
  await panel.getByLabel('Tamaño de texto (%)').fill('125');
  await panel.getByRole('combobox').nth(0).click();
  await page.getByRole('option', { name: 'Compacta', exact: true }).click();
  await panel.getByRole('combobox').nth(1).click();
  await page.getByRole('option', { name: 'Reducido', exact: true }).click();
  await panel.getByRole('button', { name: 'Guardar preferencias' }).click();
  await page.waitForFunction(() => document.documentElement.style.fontSize === '125%' && document.documentElement.dataset.densidad === 'compacta' && document.documentElement.dataset.preferenciaMovimiento === 'reducido');
  await page.reload();
  await page.waitForFunction(() => document.documentElement.style.fontSize === '125%');
  await panel.getByRole('button', { name: 'Heredar todas las preferencias' }).click();
  await panel.getByRole('button', { name: 'Guardar preferencias' }).click();
  await page.waitForFunction(() => document.documentElement.style.fontSize === '100%' && document.documentElement.dataset.densidad === 'comoda');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'Configuración no debe desbordar en móvil');
  assert.deepEqual(errores, []);
  console.log('PASS: preferencias desde UI, persistencia tras recarga, restauración de herencia y ancho móvil; sin errores JS.');
} finally {
  await browser?.close();
  await entorno.cerrar();
}
