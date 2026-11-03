// Recorrido real de paso 2 contra una base temporal. Requiere build y Playwright.
import assert from 'node:assert/strict';
import { crearEntorno } from '../servidor/tests/entorno.js';
const { chromium } = await import(process.env.NEXO_PLAYWRIGHT || 'playwright');
const e = await crearEntorno('nexo-comunicacion-ui-');
let browser;
try {
  const base = new URL((await e.request('/api/sesion')).response.url).origin;
  await e.entrar('docente', 'garcia@sanmartin.nexo.edu');
  await e.entrar('estudiante', 'julieta@sanmartin.nexo.edu');
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errores = [];
  page.on('pageerror', error => errores.push(error.message));
  async function login(p, email) {
    assert.equal((await p.request.post(`${base}/api/sesion`, { data: { email, contrasena: 'nexo1234' } })).status(), 200);
  }
  await login(page, 'garcia@sanmartin.nexo.edu');
  await page.goto(`${base}/chat`);
  if (!await page.getByRole('button', { name: 'Explorar canales, foros y ayuda' }).count()) {
    console.log('Diagnóstico de Chat:', page.url(), (await page.locator('body').innerText()).slice(0, 1000));
  }
  const explorar = () => page.getByRole('button', { name: 'Explorar canales, foros y ayuda' }).click();
  const dialogo = page.getByRole('dialog');
  async function nuevo(nombre, tipo) {
    await explorar();
    await dialogo.getByRole('button', { name: '+ Crear espacio', exact: true }).click();
    await dialogo.getByLabel('Nombre', { exact: true }).fill(nombre);
    if (tipo) {
      await dialogo.getByRole('combobox').first().click();
      await page.getByRole('option', { name: tipo, exact: true }).click();
    }
    await dialogo.getByRole('button', { name: 'Crear', exact: true }).click();
  }
  await nuevo('Encuentro UI');
  await page.getByRole('heading', { name: 'Encuentro UI', exact: true }).waitFor();
  const canal = new URL(page.url()).searchParams.get('conversacion');
  assert.ok(canal);
  await page.getByRole('textbox', { name: 'Mensaje', exact: true }).fill('Mensaje escrito desde el navegador');
  await page.getByRole('button', { name: 'Enviar mensaje', exact: true }).click();
  await page.getByRole('log').getByText('Mensaje escrito desde el navegador', { exact: true }).waitFor();
  // Sembrar historial extenso para comprobar que la búsqueda no se limita a la última página.
  for (let n = 0; n < 65; n++) await e.ok(`/api/chat/conversaciones/${canal}/mensajes`, 'docente', 'POST', { contenido: `histórico ${String(n).padStart(3, '0')}` }, 201);
  await page.reload();
  await page.getByRole('log').getByText('histórico 064', { exact: true }).waitFor();
  assert.equal(await page.getByRole('log').getByText('histórico 000', { exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Cargar mensajes anteriores', exact: true }).click();
  await page.getByRole('log').getByText('histórico 000', { exact: true }).waitFor();
  assert.equal(await page.getByRole('log').locator('[id^="mensaje-"]').count(), 66);
  await page.getByRole('textbox', { name: 'Buscar en el historial', exact: true }).fill('histórico 000');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('[role="log"] [id^="mensaje-"]').length === 1);
  await page.getByRole('log').getByText('histórico 000', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Ver todos', exact: true }).click();
  await nuevo('Foro UI', 'Foro');
  await dialogo.getByRole('button', { name: 'Nuevo tema', exact: true }).click();
  await dialogo.getByLabel('Nombre', { exact: true }).fill('Tema independiente UI');
  await dialogo.getByRole('button', { name: 'Crear', exact: true }).click();
  await page.getByRole('heading', { name: 'Tema independiente UI', exact: true }).waitFor();
  await nuevo('Ayuda UI', 'Pedido de ayuda');
  await page.getByRole('heading', { name: 'Ayuda UI', exact: true }).waitFor();
  const ayuda = new URL(page.url()).searchParams.get('conversacion');
  assert.equal((await e.request(`/api/chat/conversaciones/${ayuda}/mensajes`, 'estudiante')).status, 403);
  const { tareas } = await e.ok('/api/tareas/docente', 'docente');
  const tarea = tareas[0];
  assert.ok(tarea);
  await page.goto(`${base}/portafolio/gestion?tarea=${tarea.id}`);
  await page.getByRole('button', { name: 'Conversación de la tarea', exact: true }).click();
  await page.getByRole('link', { name: `Abrir tarea: ${tarea.titulo}`, exact: true }).click();
  assert.equal(new URL(page.url()).searchParams.get('tarea'), tarea.id);
  await page.getByRole('button', { name: 'Conversación de la tarea', exact: true }).waitFor();
  // Regreso a una entrega concreta dentro del panel docente.
  let entrega;
  for (const t of tareas) {
    const panel = await e.ok(`/api/tareas/${t.id}/panel`, 'docente');
    const alumno = panel.alumnos.find(a => a.entregaId);
    if (alumno) { entrega = { tarea: t, alumno }; break; }
  }
  if (!entrega) {
    const estudianteId = e.db.prepare("SELECT id FROM usuarios WHERE email='julieta@sanmartin.nexo.edu'").get().id;
    const profesorId = e.db.prepare("SELECT id FROM usuarios WHERE email='garcia@sanmartin.nexo.edu'").get().id;
    const catedra = e.db.prepare('SELECT ca.id FROM catedras ca JOIN inscripciones i ON i.curso_id=ca.curso_id WHERE ca.profesor_id=? AND i.estudiante_id=? LIMIT 1').get(profesorId, estudianteId);
    assert.ok(catedra, 'La base de ejemplo debe incluir una cátedra docente');
    const nueva = await e.ok('/api/tareas', 'docente', 'POST', { catedraId: catedra.id, titulo: 'Entrega UI', consigna: 'Prueba de vínculo contextual.', fechaLimite: '2099-12-31' }, 201);
    const resultado = await e.ok(`/api/tareas/${nueva.id}/entrega`, 'estudiante', 'POST', { comentario: 'Entrega para el recorrido de interfaz.', archivos: [] }, 201);
    entrega = { tarea: { ...nueva, titulo: 'Entrega UI' }, alumno: { entregaId: resultado.id } };
  }
  await page.goto(`${base}/portafolio/gestion?correccion=${entrega.tarea.id}&entrega=${entrega.alumno.entregaId}`);
  await page.getByRole('button', { name: 'Conversar sobre esta entrega', exact: true }).click();
  await page.getByRole('link', { name: `Abrir entrega: ${entrega.tarea.titulo}`, exact: true }).click();
  assert.equal(new URL(page.url()).searchParams.get('entrega'), entrega.alumno.entregaId);
  await page.getByRole('button', { name: 'Conversar sobre esta entrega', exact: true }).waitFor();
  const alumnoPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  alumnoPage.on('pageerror', error => errores.push(error.message));
  await login(alumnoPage, 'julieta@sanmartin.nexo.edu');
  const { metas } = await e.ok('/api/objetivos', 'estudiante');
  assert.ok(metas[0]);
  await alumnoPage.goto(`${base}/objetivos/metas?meta=${metas[0].id}`);
  await alumnoPage.getByRole('button', { name: 'Conversación de la meta', exact: true }).click();
  await alumnoPage.getByRole('link', { name: `Abrir meta: ${metas[0].titulo}`, exact: true }).waitFor();
  assert.equal(await alumnoPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'Chat no debe desbordar en móvil');
  await alumnoPage.getByRole('link', { name: `Abrir meta: ${metas[0].titulo}`, exact: true }).click();
  await alumnoPage.getByRole('button', { name: 'Conversación de la meta', exact: true }).waitFor();
  assert.deepEqual(errores, []);
  console.log('PASS: canal y mensaje, historial >50 y búsqueda, foro/tema, ayuda privada, enlaces tarea/entrega/meta ida y vuelta, móvil; sin errores JS.');
} finally {
  await browser?.close();
  await e.cerrar();
}
