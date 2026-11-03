// Recorrido de roles sobre una base temporal; no modifica datos de uso real.
import assert from 'node:assert/strict';
import { crearEntorno } from '../servidor/tests/entorno.js';

const { chromium } = await import(process.env.NEXO_PLAYWRIGHT || 'playwright');
const entorno = await crearEntorno('nexo-flujos-ui-');
let browser;
const contextos = [];

async function paginaDe(base, email) {
  const contexto = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  contextos.push(contexto);
  const pagina = await contexto.newPage();
  const errores = [];
  pagina.on('pageerror', error => errores.push(error.message));
  const sesion = await pagina.request.post(`${base}/api/sesion`, { data: { email, contrasena: 'nexo1234' } });
  assert.equal(sesion.status(), 200, `Acceso de ${email}`);
  return { pagina, errores };
}

async function cerrarAvisos(pagina) {
  const capa = pagina.locator('.av-capa');
  await pagina.waitForTimeout(500);
  for (let intento = 0; intento < 20 && await capa.isVisible(); intento++) {
    const marcar = capa.getByRole('button', { name: /Marcar como leído/ });
    if (await marcar.isVisible()) await marcar.click();
    await pagina.waitForTimeout(450);
    if (!await capa.isVisible()) break;
    const siguiente = capa.getByRole('button', { name: /Terminar|Siguiente aviso/ });
    if (await siguiente.isVisible()) await siguiente.click({ timeout: 3000 }).catch(async () => {
      if (await capa.isVisible()) throw new Error('No se pudo avanzar al siguiente aviso.');
    });
  }
  assert.equal(await capa.isVisible(), false, 'Los avisos obligatorios se pudieron leer');
}

try {
  const base = new URL((await entorno.request('/api/sesion')).response.url).origin;
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const maestro = await paginaDe(base, 'sistema@nexo.edu');
  await maestro.pagina.goto(`${base}/maestro`, { waitUntil: 'domcontentloaded' });
  const constructor = maestro.pagina.getByRole('region', { name: 'Apps públicas' });
  await constructor.getByRole('button', { name: '+ Crear app' }).click();
  await constructor.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Laboratorio comunitario');
  await constructor.getByRole('textbox', { name: 'Descripción' }).fill('Proyecto con una acción concreta.');
  await constructor.getByRole('combobox', { name: 'Tipo del bloque 1' }).click();
  await maestro.pagina.getByRole('option', { name: 'Accionable' }).click();
  await constructor.getByRole('textbox', { name: 'Título del bloque 1' }).fill('Explicar el proyecto');
  await constructor.getByRole('textbox', { name: 'Contenido del bloque 1' }).fill('Escribí una explicación y compartila.');
  await constructor.getByRole('button', { name: 'Crear borrador' }).click();
  await constructor.getByRole('status').getByText('App creada como borrador.').waitFor();
  await constructor.getByRole('button', { name: /Laboratorio comunitario.*Borrador/ }).click();
  await constructor.getByRole('button', { name: 'Publicar gratis' }).click();
  await constructor.getByRole('status').getByText('Publicación actualizada.').waitFor();
  assert.deepEqual(maestro.errores, [], 'Maestro sin errores JS');
  console.log('PASS: Maestro crea borrador y publica app');

  const direccion = await paginaDe(base, 'direccion@sanmartin.nexo.edu');
  await direccion.pagina.goto(`${base}/admin/edicion`, { waitUntil: 'domcontentloaded' });
  await cerrarAvisos(direccion.pagina);
  await direccion.pagina.locator('#contenido-principal').waitFor({ timeout: 15000 });
  await direccion.pagina.locator('#e-tab-apps').click();
  const panel = direccion.pagina.getByRole('region', { name: 'Apps públicas de la institución' });
  const ficha = panel.getByRole('article').filter({ hasText: 'Laboratorio comunitario' }).first();
  await ficha.getByRole('button', { name: '+ Instalar' }).click();
  await panel.getByRole('status').getByText('Laboratorio comunitario instalada.').waitFor();
  assert.deepEqual(direccion.errores, [], 'Dirección sin errores JS');
  console.log('PASS: dirección instala app desde el catálogo');

  const estudiante = await paginaDe(base, 'julieta@sanmartin.nexo.edu');
  await estudiante.pagina.goto(`${base}/comunidad`, { waitUntil: 'domcontentloaded' });
  await cerrarAvisos(estudiante.pagina);
  const comunidad = estudiante.pagina.getByRole('region', { name: 'Apps de la comunidad' });
  await comunidad.getByRole('button', { name: /Apps de esta comunidad \(1\)/ }).click();
  const accion = comunidad.getByRole('article').filter({ hasText: 'Laboratorio comunitario' });
  await accion.getByRole('checkbox', { name: 'Completado' }).click();
  await estudiante.pagina.waitForFunction(() => document.querySelector('section[aria-label="Apps de la comunidad"] input[type="checkbox"]')?.checked === true);
  await assert.doesNotReject(async () => {
    await estudiante.pagina.reload({ waitUntil: 'domcontentloaded' });
    await comunidad.getByRole('button', { name: /Apps de esta comunidad \(1\)/ }).click();
    await accion.getByRole('checkbox', { name: 'Completado' }).waitFor();
    assert.equal(await accion.getByRole('checkbox', { name: 'Completado' }).isChecked(), true);
  }, 'Avance del estudiante persiste');
  assert.deepEqual(estudiante.errores, [], 'Estudiante sin errores JS');
  console.log('PASS: estudiante usa app y conserva avance al recargar');

  // Meta propia con paso delegado: preparación por API, uso del delegado por UI.
  await entorno.entrar('dueña', 'julieta@sanmartin.nexo.edu');
  const meta = await entorno.ok('/api/objetivos/metas', 'dueña', 'POST', {
    titulo: 'Investigación compartida', venceEl: '2099-12-31', subtareas: [],
  }, 201);
  const paso = await entorno.ok(`/api/objetivos/metas/${meta.id}/subtareas`, 'dueña', 'POST', { titulo: 'Revisar fuentes' }, 201);
  await entorno.ok(`/api/objetivos/subtareas/${paso.id}`, 'dueña', 'PUT', { responsableId: '2' });
  await entorno.entrar('docente', 'garcia@sanmartin.nexo.edu');
  const asignaciones = await entorno.ok('/api/objetivos/pasos-asignados', 'docente');
  assert.ok(asignaciones.pasos.some(p => p.titulo === 'Revisar fuentes'), 'La API muestra el paso delegado al docente');
  const profesor = await paginaDe(base, 'garcia@sanmartin.nexo.edu');
  await profesor.pagina.goto(`${base}/configuracion`, { waitUntil: 'domcontentloaded' });
  await cerrarAvisos(profesor.pagina);
  const asignados = profesor.pagina.locator('section').filter({ has: profesor.pagina.getByRole('heading', { name: 'Pasos que me asignaron' }) });
  const tarea = asignados.getByRole('article').filter({ hasText: 'Revisar fuentes' });
  await tarea.getByRole('textbox', { name: 'Evidencia o resultado' }).fill('Fuentes verificadas');
  await tarea.getByRole('button', { name: 'Guardar resultado' }).click();
  await tarea.getByRole('checkbox', { name: 'Paso completado' }).click();
  await profesor.pagina.waitForFunction(el => el.checked, await tarea.getByRole('checkbox', { name: 'Paso completado' }).elementHandle());
  await profesor.pagina.reload({ waitUntil: 'domcontentloaded' });
  const tareaRecargada = profesor.pagina.getByRole('article').filter({ hasText: 'Revisar fuentes' });
  await tareaRecargada.getByRole('checkbox', { name: 'Paso completado' }).waitFor();
  assert.equal(await tareaRecargada.getByRole('checkbox', { name: 'Paso completado' }).isChecked(), true);
  assert.equal(await tareaRecargada.getByRole('textbox', { name: 'Evidencia o resultado' }).inputValue(), 'Fuentes verificadas');
  assert.deepEqual(profesor.errores, [], 'Profesor sin errores JS');
  console.log('PASS: docente delegado registra evidencia y avance persistentes');

  // Contrato simulado: modo dispositivo independiente del motor institucional.
  const enviosInstitucionales = [];
  estudiante.pagina.on('request', r => { if (new URL(r.url()).pathname === '/api/asistencia-ia/mensaje') enviosInstitucionales.push(r.url()); });
  await estudiante.pagina.route('**/api/asistencia-ia/estado', r => r.fulfill({ json: { configurada: false, disponible: false, modo: 'local-servidor', modelo: null, privacidad: 'privada' } }));
  await estudiante.pagina.route('http://127.0.0.1:11434/**', r => r.fulfill({
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' },
    json: r.request().method() === 'OPTIONS' ? {} : r.request().url().endsWith('/api/tags') ? { models: [{ name: 'modelo-prueba:local' }] } : { message: { content: 'Respuesta local de contrato' } },
  }));
  await estudiante.pagina.goto(`${base}/asistencia-academica`, { waitUntil: 'domcontentloaded' });
  await estudiante.pagina.getByRole('combobox').first().click();
  await estudiante.pagina.getByRole('option', { name: 'Este dispositivo' }).click();
  await estudiante.pagina.getByRole('textbox', { name: 'Mensaje al tutor' }).fill('Consulta de prueba local');
  await estudiante.pagina.getByRole('button', { name: 'Enviar mensaje' }).click();
  await estudiante.pagina.getByText('Respuesta local de contrato', { exact: true }).waitFor();
  assert.deepEqual(enviosInstitucionales, [], 'La consulta de dispositivo no se envía al motor institucional');
  console.log('PASS: dispositivo funciona sin IA institucional configurada (Ollama simulado)');
} finally {
  await Promise.all(contextos.map(contexto => contexto.close()));
  await browser?.close();
  await entorno.cerrar();
}
