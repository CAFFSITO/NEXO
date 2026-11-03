import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { crearEntorno } from './entorno.js';
import { migrarComunicacion } from '../migraciones.js';
import { crearNotificaciones } from '../notificaciones.js';

const esquema = readFileSync(new URL('../../base-de-datos/esquema.sql', import.meta.url), 'utf8');
const semillas = readFileSync(new URL('../../base-de-datos/datos-iniciales.sql', import.meta.url), 'utf8');
let entorno, secretaria, conversacion;
before(async () => {
  entorno = await crearEntorno('nexo-comunicacion-');
  await entorno.entrar('direccion', 'direccion@sanmartin.nexo.edu');
  await entorno.entrar('preceptor', 'pereyra@sanmartin.nexo.edu');
  await entorno.entrar('estudiante', 'julieta@sanmartin.nexo.edu');
  secretaria = await entorno.ok('/api/perfiles', 'direccion', 'POST', {
    nombre: 'Ana Secretaría', email: 'secretaria@sanmartin.nexo.edu', rol: 'secretaria',
  }, 201);
  await entorno.entrar('secretaria', secretaria.email, secretaria.contrasenaInicial);
  await entorno.ok('/api/cuenta/primer-ingreso', 'secretaria', 'POST', {});
});
after(async () => { await entorno?.cerrar(); });

test('Migración de una base anterior: conserva cuentas, sesiones, relaciones y vistas; es idempotente', () => {
  const db = new DatabaseSync(':memory:');
  try {
    const viejo = esquema.replace("'preceptor','secretaria'", "'preceptor'")
      .replace(/CREATE TABLE IF NOT EXISTS mensaje_reacciones\s*\([\s\S]*?\);/, '')
      .replace(/^\s*(prioridad\s+TEXT|respuesta_a\s+INTEGER|mensaje_id\s+INTEGER|ultimo_push_en\s+TEXT).*\r?\n/gm, '');
    db.exec(viejo); db.exec(semillas);
    db.exec("INSERT INTO sesiones(usuario_id, token, expira_en) VALUES (1, 'sesion-previa', '2099-01-01')");
    const usuarios = db.prepare('SELECT * FROM usuarios ORDER BY id').all();
    const mensajes = db.prepare('SELECT id, contenido FROM mensajes ORDER BY id').all();
    migrarComunicacion(db); migrarComunicacion(db);
    assert.deepEqual(db.prepare('SELECT * FROM usuarios ORDER BY id').all(), usuarios);
    assert.deepEqual(db.prepare('SELECT id, contenido FROM mensajes ORDER BY id').all(), mensajes);
    assert.equal(db.prepare("SELECT usuario_id FROM sesiones WHERE token = 'sesion-previa'").get().usuario_id, 1);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    db.prepare('SELECT * FROM v_no_leidos').all();
    db.exec("INSERT INTO usuarios(institucion_id, email, nombre, hash_contrasena, rol) VALUES (1, 'nueva@escuela.edu', 'Nueva', 'hash', 'secretaria')");
    assert.throws(() => db.exec("UPDATE usuarios SET rol = 'superusuario' WHERE email = 'nueva@escuela.edu'"));
  } finally { db.close(); }
});

test('Secretaría: alta, sesión, menú y permisos propios sin privilegios de Dirección', async () => {
  const instancia = await entorno.ok('/api/instancia', 'secretaria');
  assert.ok(instancia.modulos.some((m) => m.id === 'chat' && m.visible));
  for (const pagina of ['chat', 'notificaciones', 'configuracion-cuenta', 'calendario-institucional', 'anuncios']) {
    await entorno.ok(`/api/permisos/acceso?pagina=${pagina}`, 'secretaria');
  }
  await entorno.ok('/api/perfiles', 'secretaria', 'GET', undefined, 403);
  await entorno.ok('/api/panel/institucional', 'secretaria', 'GET', undefined, 403);
  await entorno.ok('/api/anuncios/pendientes', 'secretaria');
  const lista = await entorno.ok('/api/perfiles', 'direccion');
  assert.equal(lista.perfiles.find((p) => p.id === secretaria.id).rol, 'secretaria');
});

test('Contactos de Secretaría: Dirección y Preceptoría de su escuela, en ambos sentidos', async () => {
  const { db, ok } = entorno;
  db.exec("INSERT INTO instituciones(id, nombre, ciclo_lectivo) VALUES (909, 'Otra escuela', 2026)");
  db.exec("INSERT INTO usuarios(institucion_id, email, hash_contrasena, nombre, rol) VALUES (909, 'otra@escuela.edu', 'hash', 'Otra Secretaría', 'secretaria')");
  const contactos = (await ok('/api/chat/contactos', 'secretaria')).contactos;
  assert.ok(contactos.some((c) => c.rol === 'admin-academico'));
  assert.ok(contactos.some((c) => c.rol === 'preceptor'));
  assert.ok(contactos.every((c) => ['admin-academico', 'preceptor', 'secretaria'].includes(c.rol)));
  assert.ok(!contactos.some((c) => c.nombre === 'Otra Secretaría'));
  for (const quien of ['direccion', 'preceptor']) {
    assert.ok((await ok('/api/chat/contactos', quien)).contactos.some((c) => c.id === secretaria.id));
  }
  await ok('/api/chat/conversaciones', 'estudiante', 'POST', { destinatarioId: secretaria.id }, 403);
  conversacion = (await ok('/api/chat/conversaciones', 'secretaria', 'POST', { destinatarioId: '1' }, 201)).id;
  assert.equal((await ok('/api/chat/conversaciones', 'direccion', 'POST', { destinatarioId: secretaria.id }, 201)).id, conversacion);
});

test('Respuestas con texto, archivo y audio: persisten y solo los participantes descargan', async () => {
  const { ok, crudo } = entorno;
  const ruta = `/api/chat/conversaciones/${conversacion}/mensajes`;
  const original = (await ok(ruta, 'direccion', 'POST', { contenido: '¿Podés enviar la planilla?' }, 201)).mensaje;
  for (const [nombre, tipo, bytes] of [['planilla.txt', 'text/plain', 'Planilla escolar'], ['respuesta.webm', 'audio/webm;codecs=opus', 'audio-prueba']]) {
    const subida = await crudo('/api/archivos', 'secretaria', { method: 'POST', headers: { 'Content-Type': tipo, 'X-Nombre-Archivo': nombre }, body: bytes });
    assert.equal(subida.status, 201);
    const archivoId = subida.datos.archivo.id;
    const mensaje = (await ok(ruta, 'secretaria', 'POST', { contenido: '', archivoId, respuestaA: original.id }, 201)).mensaje;
    assert.equal(mensaje.respuestaA.id, original.id);
    assert.equal(mensaje.respuestaA.contenido, original.contenido);
    assert.equal(mensaje.archivoTipo, tipo.split(';')[0]);
    const hilo = (await ok(ruta, 'direccion')).mensajes;
    assert.deepEqual(hilo.find((m) => m.id === mensaje.id).respuestaA, mensaje.respuestaA);
    const descarga = await crudo(`/api/archivos/${archivoId}`, 'direccion');
    assert.equal(descarga.status, 200); assert.equal(descarga.datos, bytes);
    assert.match(descarga.cabeceras.get('content-disposition'), /attachment/);
    assert.equal((await crudo(`/api/archivos/${archivoId}?inline=1`, 'direccion')).status, 200);
    assert.equal((await crudo(`/api/archivos/${archivoId}`, 'estudiante')).status, 403);
  }
  await ok(ruta, 'estudiante', 'GET', undefined, 403);
});

test('Reacciones de chat: confirman lectura urgente, persisten y se pueden cambiar o quitar', async () => {
  const ruta = `/api/chat/conversaciones/${conversacion}/mensajes`;
  const mensaje = (await entorno.ok(ruta, 'direccion', 'POST', { contenido: 'Confirmá cuando puedas', prioridad: 'urgente' }, 201)).mensaje;
  const reaccion = `/api/chat/mensajes/${mensaje.id}/reaccion`;
  await entorno.ok(reaccion, 'secretaria', 'PUT', { emoji: '👍' });
  const pendientes = (await entorno.ok('/api/notificaciones/mensajes-pendientes', 'secretaria')).pendientes;
  assert.ok(!pendientes.some((p) => p.mensajeId === mensaje.id));
  assert.ok(entorno.db.prepare('SELECT leida_en FROM notificaciones WHERE mensaje_id = ? AND usuario_id = ?').get(Number(mensaje.id), Number(secretaria.id)).leida_en);
  await entorno.ok(reaccion, 'secretaria', 'PUT', { emoji: '❤️' });
  const hilo = (await entorno.ok(ruta, 'direccion')).mensajes;
  assert.deepEqual(hilo.find((m) => m.id === mensaje.id).reacciones.map((r) => r.emoji), ['❤️']);
  await entorno.ok(reaccion, 'estudiante', 'PUT', { emoji: '👍' }, 404);
  await entorno.ok(reaccion, 'secretaria', 'PUT', { emoji: 'invalido' }, 400);
  await entorno.ok(reaccion, 'secretaria', 'PUT', { emoji: null });
  assert.deepEqual((await entorno.ok(ruta, 'direccion')).mensajes.find((m) => m.id === mensaje.id).reacciones, []);
  assert.ok(!(await entorno.ok('/api/notificaciones/mensajes-pendientes', 'secretaria')).pendientes.some((p) => p.mensajeId === mensaje.id));
});

test('Valida contenido, prioridad, propiedad de archivos y respuesta dentro de la conversación', async () => {
  const { ok, db } = entorno;
  const ruta = `/api/chat/conversaciones/${conversacion}/mensajes`;
  for (const body of [{ contenido: '' }, { contenido: 'x'.repeat(10001) }, { contenido: 'x', prioridad: 'alarma-total' }, { contenido: 'x', respuestaA: 999999 }]) {
    await ok(ruta, 'secretaria', 'POST', body, 400);
  }
  const ajeno = db.prepare('SELECT id FROM mensajes WHERE conversacion_id <> ? LIMIT 1').get(Number(conversacion));
  await ok(ruta, 'secretaria', 'POST', { contenido: 'x', respuestaA: ajeno.id }, 400);
  const adjunto = db.prepare('SELECT id FROM archivos WHERE subido_por = ? LIMIT 1').get(Number(secretaria.id));
  await ok(ruta, 'direccion', 'POST', { contenido: 'x', archivoId: adjunto.id }, 400);
});

test('Estándar se lee al abrir; urgente persiste hasta confirmación del destinatario', async () => {
  const { ok, db } = entorno;
  const ruta = `/api/chat/conversaciones/${conversacion}/mensajes`;
  await ok(ruta, 'secretaria', 'POST', { contenido: 'Información', prioridad: 'estandar' }, 201);
  const urgente = (await ok(ruta, 'secretaria', 'POST', { contenido: 'Necesitamos respuesta ahora', prioridad: 'urgente' }, 201)).mensaje;
  assert.equal(urgente.prioridad, 'urgente');
  await ok(`/api/chat/conversaciones/${conversacion}/leer`, 'direccion', 'POST');
  const { pendientes } = await ok('/api/notificaciones/mensajes-pendientes', 'direccion');
  assert.equal(pendientes.filter((n) => n.conversacionId === conversacion).length, 1);
  const aviso = pendientes.find((n) => n.conversacionId === conversacion);
  assert.equal(aviso.prioridad, 'urgente');
  await ok(`/api/notificaciones/${aviso.id}/leer`, 'secretaria', 'POST', {}, 404);
  assert.equal(db.prepare('SELECT leida_en FROM notificaciones WHERE id = ?').get(Number(aviso.id)).leida_en, null);
  await ok(`/api/notificaciones/${aviso.id}/leer`, 'direccion', 'POST');
  assert.ok(!(await ok('/api/notificaciones/mensajes-pendientes', 'direccion')).pendientes.some((n) => n.id === aviso.id));
});

test('Push: prioridades, enlace al chat, repetición urgente tras reinicio y corte al confirmar', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(esquema); db.exec(semillas);
    const c = db.prepare("INSERT INTO conversaciones(tipo) VALUES ('directa')").run().lastInsertRowid;
    db.prepare('INSERT INTO conversacion_miembros(conversacion_id, usuario_id) VALUES (?, 1), (?, 6)').run(c, c);
    const llamadas = [];
    const push = { enviarAUsuario: async (...args) => { llamadas.push(args); return 1; } };
    const mensajero = { emitirA() {} };
    let motor = crearNotificaciones(db, mensajero, push);
    const avisos = [];
    for (const prioridad of ['estandar', 'urgente']) {
      const mensajeId = db.prepare('INSERT INTO mensajes(conversacion_id, autor_id, contenido, prioridad) VALUES (?, 1, ?, ?)').run(c, prioridad, prioridad).lastInsertRowid;
      avisos.push(motor.crear({ usuarioId: 6, tipo: 'mensaje', titulo: 'Mensaje de Dirección', cuerpo: 'Atención', objetoTipo: 'conversacion', objetoId: Number(c), mensajeId: Number(mensajeId), prioridad }));
    }
    assert.equal(llamadas[0][2].urgencia, 'normal');
    assert.equal(llamadas[1][2].urgencia, 'high');
    assert.equal(llamadas[1][1].url, `/chat?conversacion=${c}`);
    assert.equal(llamadas[1][1].notificacionId, String(avisos[1]));
    llamadas.length = 0;
    await motor.recordar(); assert.equal(llamadas.length, 0);
    db.exec("UPDATE notificaciones SET ultimo_push_en = datetime('now', '-2 minutes')");
    motor = crearNotificaciones(db, mensajero, push);
    await motor.recordar(); assert.equal(llamadas.length, 1); assert.equal(llamadas[0][1].prioridad, 'urgente');
    db.prepare("UPDATE notificaciones SET leida_en = datetime('now'), ultimo_push_en = NULL WHERE id = ?").run(avisos[1]);
    await motor.recordar(); assert.equal(llamadas.length, 1);
  } finally { db.close(); }
});

test('Service worker: vibración diferenciada, persistencia y navegación al chat exacto', async () => {
  const eventos = {}, mostradas = [], navegaciones = [];
  const self = {
    location: { origin: 'https://nexo.test' },
    addEventListener: (tipo, f) => { eventos[tipo] = f; },
    registration: { showNotification: async (...args) => mostradas.push(args), getNotifications: async () => [] },
    clients: { matchAll: async () => [{ url: 'https://nexo.test/calendario', navigate: async (url) => navegaciones.push(url), focus: async () => {} }] },
  };
  runInNewContext(readFileSync(new URL('../../NEXO/public/sw.js', import.meta.url), 'utf8'), { self, URL, fetch: async () => ({ ok: true, json: async () => ({ pendientes: [{ id: '1' }, { id: '2' }] }) }) });
  for (const [id, prioridad] of [['1', 'estandar'], ['2', 'urgente']]) {
    let trabajo;
    eventos.push({ data: { json: () => ({ tipo: 'mensaje', notificacionId: id, prioridad, url: '/chat?conversacion=42', tag: `nexo-mensaje-${id}` }) }, waitUntil: (p) => { trabajo = p; } });
    await trabajo;
  }
  assert.equal(mostradas.length, 2);
  assert.ok(mostradas.every(([, opciones]) => opciones.requireInteraction));
  assert.ok(mostradas[1][1].vibrate.reduce((a, b) => a + b) > mostradas[0][1].vibrate.reduce((a, b) => a + b));
  let trabajo;
  eventos.notificationclick({ notification: { close() {}, data: mostradas[1][1].data }, waitUntil: (p) => { trabajo = p; } });
  await trabajo;
  assert.equal(navegaciones[0], 'https://nexo.test/chat?conversacion=42');
});

test('Service worker: un push atrasado no vuelve a alertar un mensaje confirmado', async () => {
  const eventos = {};
  let mostradas = 0, cerradas = 0;
  const self = {
    addEventListener: (tipo, f) => { eventos[tipo] = f; },
    registration: { showNotification: async () => { mostradas++; }, getNotifications: async () => [{ close: () => { cerradas++; } }] },
  };
  runInNewContext(readFileSync(new URL('../../NEXO/public/sw.js', import.meta.url), 'utf8'), { self, URL, fetch: async () => ({ ok: true, json: async () => ({ pendientes: [] }) }) });
  let trabajo;
  eventos.push({ data: { json: () => ({ tipo: 'mensaje', notificacionId: '5', prioridad: 'urgente', tag: 'nexo-mensaje-5' }) }, waitUntil: (p) => { trabajo = p; } });
  await trabajo;
  assert.equal(mostradas, 0); assert.equal(cerradas, 1);
});
