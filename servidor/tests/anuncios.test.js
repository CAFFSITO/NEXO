// Pruebas de los anuncios obligatorios: quién manda a quién según el tipo de
// grupo, permisos por fila (leer, reaccionar), confirmaciones de lectura para
// quien manda, los grupos de la dirección y del Maestro, y el push propio de
// punta a punta (cifrado RFC 8291 y firma VAPID) contra un servicio falso.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createDecipheriv, createECDH, createHmac, createPublicKey, randomBytes, verify } from 'node:crypto';
import { crearEntorno } from './entorno.js';
import { cifrarParaNavegador, cabeceraVapid, generarClavesVapid, endpointPermitido } from '../push.js';
import { registrarAnuncios, destinatariosSegunTipo, armarMiembros } from '../anuncios.js';

const b64u = (b) => Buffer.from(b).toString('base64url');

// ── Lo que hace el navegador al recibir: descifrar (RFC 8291) ───────────────
function hkdf(sal, ikm, info, largo) {
  const prk = createHmac('sha256', sal).update(ikm).digest();
  return createHmac('sha256', prk).update(Buffer.concat([info, Buffer.from([1])])).digest().subarray(0, largo);
}
function descifrar(cuerpo, navegador, auth) {
  const sal = cuerpo.subarray(0, 16);
  const largoId = cuerpo[20];
  const publicaServidor = cuerpo.subarray(21, 21 + largoId);
  const datos = cuerpo.subarray(21 + largoId);
  const compartido = navegador.computeSecret(publicaServidor);
  const info = Buffer.concat([Buffer.from('WebPush: info\0'), navegador.getPublicKey(), publicaServidor]);
  const ikm = hkdf(auth, compartido, info, 32);
  const cek = hkdf(sal, ikm, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
  const nonce = hkdf(sal, ikm, Buffer.from('Content-Encoding: nonce\0'), 12);
  const d = createDecipheriv('aes-128-gcm', cek, nonce);
  d.setAuthTag(datos.subarray(datos.length - 16));
  const plano = Buffer.concat([d.update(datos.subarray(0, datos.length - 16)), d.final()]);
  assert.equal(plano[plano.length - 1], 2, 'falta el delimitador de último registro');
  return JSON.parse(plano.subarray(0, plano.length - 1).toString('utf8'));
}
function verificarVapid(autorizacion, endpoint) {
  const m = /^vapid t=([^,]+), k=(.+)$/.exec(autorizacion);
  assert.ok(m, 'cabecera VAPID mal formada: ' + autorizacion);
  const [encabezado, carga, firma] = m[1].split('.');
  const publica = Buffer.from(m[2], 'base64url');
  const llave = createPublicKey({ format: 'jwk', key: { kty: 'EC', crv: 'P-256', x: b64u(publica.subarray(1, 33)), y: b64u(publica.subarray(33)) } });
  assert.ok(verify('sha256', Buffer.from(`${encabezado}.${carga}`), { key: llave, dsaEncoding: 'ieee-p1363' }, Buffer.from(firma, 'base64url')), 'firma VAPID inválida');
  const datos = JSON.parse(Buffer.from(carga, 'base64url').toString());
  assert.equal(datos.aud, new URL(endpoint).origin);
  assert.ok(datos.exp > Date.now() / 1000 && datos.exp <= Date.now() / 1000 + 24 * 3600);
  assert.match(datos.sub, /^mailto:|^https:/);
}

test('Push: el cifrado coincide con el ejemplo del RFC 8291 y la firma VAPID verifica', () => {
  const cuerpo = cifrarParaNavegador('When I grow up, I want to be a watermelon', {
    p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
    auth: 'BTBZMqHH6r4Tts7J_aSIgg',
  }, { sal: Buffer.from('DGv6ra1nlYgDCS1FRnbzlw', 'base64url'), clavePrivadaServidor: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw' });
  assert.equal(b64u(cuerpo),
    'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN');
  const endpoint = 'https://fcm.googleapis.com/fcm/send/abc';
  verificarVapid(cabeceraVapid(endpoint, generarClavesVapid()), endpoint);
  assert.ok(endpointPermitido(endpoint));
  assert.ok(endpointPermitido('https://updates.push.services.mozilla.com/wpush/v2/x'));
  assert.ok(endpointPermitido('https://wns2-par02p.notify.windows.com/w/?token=x'));
  assert.ok(!endpointPermitido('https://evil.example.com/fcm.googleapis.com'));
  assert.ok(!endpointPermitido('http://fcm.googleapis.com/x'));
  assert.ok(!endpointPermitido('https://fcm.googleapis.com.evil.com/x'));
  assert.ok(!endpointPermitido('http://127.0.0.1:3000/api'));
});

test('Las reglas de los tres tipos de grupo', () => {
  const m = (usuarioId, papel) => ({ usuarioId, papel });
  const unoAMuchos = [m(1, 'emisor'), m(6, 'receptor'), m(7, 'receptor')];
  assert.deepEqual(destinatariosSegunTipo('uno-a-muchos', unoAMuchos, 1), [6, 7]);
  assert.equal(destinatariosSegunTipo('uno-a-muchos', unoAMuchos, 6), null);
  const muchosAUno = [m(6, 'emisor'), m(7, 'emisor'), m(1, 'receptor')];
  assert.deepEqual(destinatariosSegunTipo('muchos-a-uno', muchosAUno, 7), [1]);
  assert.equal(destinatariosSegunTipo('muchos-a-uno', muchosAUno, 1), null);
  const todos = [m(1, 'miembro'), m(6, 'miembro'), m(7, 'miembro')];
  assert.deepEqual(destinatariosSegunTipo('muchos-a-muchos', todos, 6), [1, 7]);
  assert.equal(destinatariosSegunTipo('muchos-a-muchos', todos, 99), null);

  const elegibles = new Set([1, 6, 7]);
  assert.equal(armarMiembros('uno-a-muchos', { emisores: [1, 6], receptores: [7], miembros: [] }, elegibles).includes('exactamente una persona que envía'), true);
  assert.equal(armarMiembros('muchos-a-uno', { emisores: [6], receptores: [1, 7], miembros: [] }, elegibles).includes('exactamente una persona que recibe'), true);
  assert.equal(typeof armarMiembros('muchos-a-uno', { emisores: [6, 1], receptores: [1], miembros: [] }, elegibles), 'string');
  assert.equal(typeof armarMiembros('muchos-a-muchos', { emisores: [], receptores: [], miembros: [6] }, elegibles), 'string');
  assert.equal(typeof armarMiembros('muchos-a-muchos', { emisores: [], receptores: [], miembros: [6, 8] }, elegibles), 'string');
  assert.equal(typeof armarMiembros('otro', { emisores: [], receptores: [], miembros: [] }, elegibles), 'string');
  assert.deepEqual(armarMiembros('uno-a-muchos', { emisores: [1], receptores: [6, 7], miembros: [] }, elegibles),
    [m(1, 'emisor'), m(6, 'receptor'), m(7, 'receptor')]);
});

test('La insistencia push: cada 10 minutos, con tope, y nunca de noche', () => {
  const db = new DatabaseSync(':memory:');
  const raiz = new URL('../../', import.meta.url);
  db.exec(readFileSync(new URL('base-de-datos/esquema.sql', raiz), 'utf8'));
  db.exec(readFileSync(new URL('base-de-datos/datos-iniciales.sql', raiz), 'utf8'));
  // Solo Carlos (6) tiene un navegador suscripto; Laura (7) también tiene pendientes.
  db.prepare("INSERT INTO push_suscripciones (usuario_id, endpoint, p256dh, auth) VALUES (6, 'https://fcm.googleapis.com/x', 'a', 'b')").run();
  const enviados = [];
  const app = { get() {}, post() {}, put() {}, delete() {} };
  const push = { enviarAUsuario: async (id, datos) => { enviados.push({ id, datos }); return 1; }, tieneSuscripcion: () => true };
  const motor = registrarAnuncios(app, db, { emitirA() {} }, push);

  const mediodia = new Date(2026, 9, 5, 12, 0);
  assert.equal(motor.insistir(new Date(2026, 9, 5, 23, 30)), 0, 'de noche no se insiste');
  assert.equal(motor.insistir(mediodia), 1);
  assert.equal(enviados[0].id, 6);
  assert.match(enviados[0].datos.titulo, /Tenés 2 avisos sin leer/);
  assert.equal(enviados[0].datos.url, '/anuncios');
  // Recién avisado: no se repite enseguida.
  assert.equal(motor.insistir(mediodia), 0);
  const insistencias = () => db.prepare('SELECT MAX(insistencias) AS n FROM anuncio_destinatarios WHERE usuario_id = 6').get().n;
  assert.equal(insistencias(), 0, 'el primer push no cuenta como insistencia');
  for (let i = 1; i <= 8; i++) {
    db.exec("UPDATE anuncio_destinatarios SET ultimo_push_en = datetime('now', '-11 minutes') WHERE usuario_id = 6");
    motor.insistir(mediodia);
  }
  assert.equal(insistencias(), 6, 'tope de insistencias');
  assert.equal(enviados.length, 7);
  // Leído: no se insiste más.
  db.exec("UPDATE anuncio_destinatarios SET leido_en = datetime('now'), insistencias = 0, ultimo_push_en = datetime('now', '-1 hour') WHERE usuario_id = 6");
  assert.equal(motor.insistir(mediodia), 0);
  db.close();
});

// ── La API con un servidor real ─────────────────────────────────────────────
let entorno;
let servicioPush;
const recibidos = [];
let esperarPush = null;

before(async () => {
  // Un servicio de push falso: guarda lo que llega y contesta 201 (o 410 para
  // una suscripción que "ya no existe").
  servicioPush = createServer((req, res) => {
    const partes = [];
    req.on('data', (c) => partes.push(c));
    req.on('end', () => {
      const pedido = { url: req.url, headers: req.headers, cuerpo: Buffer.concat(partes) };
      recibidos.push(pedido);
      esperarPush?.(pedido);
      res.statusCode = req.url.includes('vencida') ? 410 : 201;
      res.end();
    });
  });
  await new Promise((listo) => servicioPush.listen(0, '127.0.0.1', listo));
  process.env.NEXO_PUSH_PERMITIR = `http://127.0.0.1:${servicioPush.address().port}`;
  entorno = await crearEntorno('nexo-anuncios-');
  await entorno.entrar('direccion', 'direccion@sanmartin.nexo.edu');
  await entorno.entrar('pereyra', 'pereyra@sanmartin.nexo.edu');
  await entorno.entrar('martinez', 'martinez@sanmartin.nexo.edu');
  await entorno.entrar('julieta', 'julieta@sanmartin.nexo.edu');
  await entorno.entrar('maestro', 'sistema@nexo.edu');
});

after(async () => {
  await entorno?.cerrar();
  servicioPush?.close();
  delete process.env.NEXO_PUSH_PERMITIR;
});

test('Recibir: pendientes del más nuevo al más viejo, leer, reaccionar y la casilla de leídos', async () => {
  const { ok, request } = entorno;
  assert.equal((await request('/api/anuncios/pendientes', 'julieta')).status, 403, 'un estudiante no participa');

  const { anuncios, total, emojis } = await ok('/api/anuncios/pendientes', 'pereyra');
  assert.deepEqual(anuncios.map((a) => a.id), ['4', '2']);
  assert.equal(total, 2);
  assert.equal(anuncios[0].grupo, null, 'el 4 es un mensaje directo');
  assert.equal(anuncios[0].autor.nombre, 'Preceptora Laura Martínez');
  assert.equal(anuncios[1].color, '#2563eb', 'la tarjeta toma el color del grupo');
  assert.equal(anuncios[1].grupo.nombre, 'Dirección a Preceptoría');
  assert.match(anuncios[1].creadoEn, /Z$/);
  assert.ok(emojis.includes('👍'));

  assert.equal((await request('/api/anuncios/4/reaccion', 'pereyra', 'PUT', { emoji: '👍' })).status, 200, 'se puede reaccionar desde la recepción');
  const pendiente = (await ok('/api/anuncios/pendientes', 'pereyra')).anuncios.find((a) => a.id === '4');
  assert.equal(pendiente, undefined, 'reaccionar marca leído y retira el aviso de pendientes');
  const reaccionLeida = (await ok('/api/anuncios/leidos', 'pereyra')).anuncios.find((a) => a.id === '4');
  assert.equal(reaccionLeida.reaccion, '👍');
  assert.ok(reaccionLeida.leidoEn);
  assert.equal((await request('/api/anuncios/4/leer', 'direccion', 'POST')).status, 404, 'no es suyo');
  const leido = await ok('/api/anuncios/4/leer', 'pereyra', 'POST');
  assert.equal(leido.pendientes, 1);
  assert.match(leido.leidoEn, /Z$/);
  await ok('/api/anuncios/4/leer', 'pereyra', 'POST'); // marcar dos veces no rompe
  assert.equal((await request('/api/anuncios/4/reaccion', 'pereyra', 'PUT', { emoji: '💩' })).status, 400);
  assert.deepEqual(await ok('/api/anuncios/4/reaccion', 'pereyra', 'PUT', { emoji: '🙏' }), { reaccion: '🙏' });

  const casilla = await ok('/api/anuncios/leidos', 'pereyra');
  assert.deepEqual(casilla.anuncios.map((a) => [a.id, a.reaccion]), [['4', '🙏'], ['1', '👍']]);
  assert.ok(casilla.anuncios.every((a) => a.leidoEn));
  const buscado = await ok('/api/anuncios/leidos?q=museo', 'pereyra');
  assert.deepEqual(buscado.anuncios.map((a) => a.id), ['4']);
  assert.deepEqual((await ok('/api/anuncios/leidos?q=100%25', 'pereyra')).anuncios, []);
});

test('Mandar: a cada grupo según su tipo, o directo a personas; quien manda ve quién leyó', async () => {
  const { ok, request, db } = entorno;
  const destinos = await ok('/api/anuncios/destinos', 'pereyra');
  assert.deepEqual(destinos.grupos.map((g) => g.id).sort(), ['2', '3'], 'en el grupo 1 solo recibe');
  assert.deepEqual(destinos.grupos.find((g) => g.id === '2').destinatarios.map((p) => p.id), ['1']);
  assert.deepEqual(destinos.personas.map((p) => p.id).sort(), ['1', '7']);

  assert.equal((await request('/api/anuncios', 'pereyra', 'POST', { grupoId: '1', cuerpo: 'Hola' })).status, 403);
  assert.equal((await request('/api/anuncios', 'pereyra', 'POST', { grupoId: '2', cuerpo: '   ' })).status, 400);
  assert.equal((await request('/api/anuncios', 'pereyra', 'POST', { personas: ['8'], cuerpo: 'Hola' })).status, 400, 'a un estudiante no');
  assert.equal((await request('/api/anuncios', 'pereyra', 'POST', { personas: ['6'], cuerpo: 'Hola' })).status, 400, 'a sí mismo no');
  assert.equal((await request('/api/anuncios', 'pereyra', 'POST', { cuerpo: 'Hola' })).status, 400);
  assert.equal((await request('/api/anuncios', 'pereyra', 'POST', { grupoId: '99', cuerpo: 'Hola' })).status, 404);
  assert.equal((await request('/api/anuncios', 'julieta', 'POST', { personas: ['1'], cuerpo: 'Hola' })).status, 403);

  const antes = (await ok('/api/anuncios/pendientes', 'direccion')).total;
  const { anuncio } = await ok('/api/anuncios', 'pereyra', 'POST', { grupoId: '2', cuerpo: 'Línea 1\r\nLínea 2\u0007' }, 201);
  assert.equal(anuncio.cuerpo, 'Línea 1\nLínea 2', 'conserva saltos y saca caracteres de control');
  assert.deepEqual(anuncio.destinatarios.map((d) => d.persona.id), ['1']);
  assert.equal((await ok('/api/anuncios/pendientes', 'direccion')).total, antes + 1);
  assert.equal((await ok('/api/anuncios/pendientes', 'martinez')).anuncios.some((a) => a.id === anuncio.id), false, 'muchos a uno: solo le llega al receptor');

  const todos = await ok('/api/anuncios', 'martinez', 'POST', { grupoId: '3', cuerpo: 'Para todo el equipo' }, 201);
  assert.deepEqual(todos.anuncio.destinatarios.map((d) => d.persona.id).sort(), ['1', '6']);

  const directo = await ok('/api/anuncios', 'direccion', 'POST', { personas: ['6', '7'], cuerpo: 'A los dos' }, 201);
  assert.equal(directo.anuncio.grupo, null);
  assert.equal(directo.anuncio.total, 2);

  // Confirmaciones: el anuncio 1 lo leyó Carlos (con 👍) y Laura todavía no.
  const enviados = await ok('/api/anuncios/enviados', 'direccion');
  const primero = enviados.anuncios.find((a) => a.id === '1');
  assert.equal(primero.leidos, 1);
  assert.equal(primero.total, 2);
  assert.deepEqual(primero.destinatarios.map((d) => [d.persona.nombre, d.reaccion, Boolean(d.leidoEn)]),
    [['Carlos Pereyra', '👍', true], ['Preceptora Laura Martínez', null, false]]);
  await ok(`/api/anuncios/1/leer`, 'martinez', 'POST');
  await ok(`/api/anuncios/1/reaccion`, 'martinez', 'PUT', { emoji: '✅' });
  const despues = (await ok('/api/anuncios/enviados', 'direccion')).anuncios.find((a) => a.id === '1');
  assert.equal(despues.leidos, 2);
  assert.equal(despues.destinatarios.find((d) => d.persona.id === '7').reaccion, '✅');
  assert.ok(db.prepare('SELECT COUNT(*) AS n FROM anuncios').get().n >= 7);
});

test('Adjuntos y notas de voz: cualquier tipo de archivo, y solo los bajan quienes lo reciben', async () => {
  const { ok, request, crudo } = entorno;
  const subir = async (quien, tipo, nombre, contenido = 'hola') => {
    const r = await crudo('/api/archivos', quien, { method: 'POST', headers: { 'Content-Type': tipo, 'X-Nombre-Archivo': encodeURIComponent(nombre) }, body: Buffer.from(contenido) });
    assert.equal(r.status, 201, JSON.stringify(r.datos));
    return r.datos.archivo;
  };
  const voz = await subir('direccion', 'audio/webm;codecs=opus', 'nota.webm', 'OggS');
  const raro = await subir('direccion', 'application/x-cosa-rara', 'plano.dwg');
  assert.equal(raro.tipoMime, 'application/octet-stream', 'un tipo desconocido se guarda como genérico, no se rechaza');
  const texto = await subir('direccion', 'text/plain', 'lista.txt');
  const ajeno = await subir('martinez', 'text/plain', 'ajeno.txt');

  assert.equal((await request('/api/anuncios', 'direccion', 'POST', { personas: ['6'], cuerpo: '' })).status, 400, 'sin texto ni adjuntos, no');
  assert.equal((await request('/api/anuncios', 'direccion', 'POST', { personas: ['6'], cuerpo: '', adjuntos: [{ id: ajeno.id }] })).status, 400, 'no se adjunta un archivo ajeno');
  assert.equal((await request('/api/anuncios', 'direccion', 'POST', { personas: ['6'], cuerpo: '', adjuntos: [{ id: texto.id, voz: true }] })).status, 400, 'una nota de voz tiene que ser audio');

  // Solo un audio (sin texto) ya es un aviso.
  const { anuncio } = await ok('/api/anuncios', 'direccion', 'POST', { personas: ['6'], cuerpo: '', adjuntos: [{ id: voz.id, voz: true, duracionMs: 4200 }, { id: raro.id }, { id: texto.id }] }, 201);
  assert.deepEqual(anuncio.adjuntos.map((a) => [a.nombre, a.voz, a.duracionMs]),
    [['nota.webm', true, 4200], ['plano.dwg', false, null], ['lista.txt', false, null]]);

  const pendiente = (await ok('/api/anuncios/pendientes', 'pereyra')).anuncios.find((a) => a.id === anuncio.id);
  assert.equal(pendiente.adjuntos.length, 3);
  assert.equal(pendiente.cuerpo, '');
  // Quien lo recibe lo baja; alguien a quien no le llegó, no.
  const bajada = await crudo(`/api/archivos/${texto.id}`, 'pereyra');
  assert.equal(bajada.status, 200);
  assert.equal(bajada.datos, 'hola');
  assert.equal((await crudo(`/api/archivos/${raro.id}`, 'martinez')).status, 403);
  // Programas, nunca (por la extensión, aunque digan ser genéricos).
  const binario = await crudo('/api/archivos', 'direccion', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'X-Nombre-Archivo': 'programa.exe' }, body: Buffer.from('MZ') });
  assert.equal(binario.status, 201);
  assert.match((await crudo(`/api/archivos/${binario.datos.archivo.id}?inline=1`, 'direccion')).cabeceras.get('content-disposition'), /^attachment/);
});

test('Borrar para todos: solo quien lo mandó; desaparece para quien lo leyó y para quien no', async () => {
  const { ok, request, crudo } = entorno;
  const r = await crudo('/api/archivos', 'direccion', { method: 'POST', headers: { 'Content-Type': 'text/plain', 'X-Nombre-Archivo': 'horarios.txt' }, body: Buffer.from('hola') });
  const archivo = r.datos.archivo;
  const { anuncio } = await ok('/api/anuncios', 'direccion', 'POST', { personas: ['6', '7'], cuerpo: 'Me equivoqué de horario', adjuntos: [{ id: archivo.id }] }, 201);
  await ok(`/api/anuncios/${anuncio.id}/leer`, 'pereyra', 'POST');
  assert.equal((await crudo(`/api/archivos/${archivo.id}`, 'pereyra')).status, 200);

  assert.equal((await request(`/api/anuncios/${anuncio.id}`, 'pereyra', 'DELETE')).status, 404, 'quien lo recibió no lo borra');
  assert.equal((await request(`/api/anuncios/${anuncio.id}`, 'julieta', 'DELETE')).status, 403);
  assert.equal((await request(`/api/anuncios/${anuncio.id}`, null, 'DELETE')).status, 401);
  assert.equal((await request('/api/anuncios/999999', 'direccion', 'DELETE')).status, 404);

  const borrado = await ok(`/api/anuncios/${anuncio.id}`, 'direccion', 'DELETE');
  assert.equal(borrado.ok, true);
  const esta = (lista) => lista.some((a) => a.id === anuncio.id);
  assert.equal(esta((await ok('/api/anuncios/pendientes', 'martinez')).anuncios), false, 'se va la tarjeta de quien no lo leyó');
  assert.equal(esta((await ok('/api/anuncios/leidos', 'pereyra')).anuncios), false, 'y de la casilla de quien ya lo leyó');
  assert.equal(esta((await ok('/api/anuncios/enviados', 'direccion')).anuncios), false);
  assert.equal((await crudo(`/api/archivos/${archivo.id}`, 'pereyra')).status, 403, 'su archivo ya no se baja');
  assert.equal((await request(`/api/anuncios/${anuncio.id}/leer`, 'martinez', 'POST')).status, 404);
  assert.equal((await request(`/api/anuncios/${anuncio.id}`, 'direccion', 'DELETE')).status, 404, 'dos veces no');
});

test('Los avisos siguen los colores de la escuela y cada preceptor muestra su turno', async () => {
  const { ok } = entorno;
  const grupos = await ok('/api/anuncios/grupos', 'direccion');
  assert.ok(grupos.paleta.length >= 1, 'la paleta del diseño de la escuela');
  assert.equal(grupos.colorDirecto, grupos.paleta[0], 'el aviso directo lleva el acento de la escuela');
  assert.notEqual(grupos.colorDirecto, '#7c3aed');
  const pereyra = grupos.personas.find((p) => p.nombre === 'Carlos Pereyra');
  assert.ok(pereyra.cursos.length > 0, 'sus cursos a cargo');
  assert.ok(pereyra.cursos.every((c) => /^\d° /.test(c.nombre) && 'turno' in c && 'especialidad' in c));
  const { anuncio } = await ok('/api/anuncios', 'direccion', 'POST', { personas: ['6'], cuerpo: 'Con los colores de la escuela' }, 201);
  assert.equal(anuncio.color, grupos.colorDirecto);
});

test('Grupos: los arma la dirección (o el Maestro para cualquier escuela); se archivan', async () => {
  const { ok, request } = entorno;
  assert.equal((await request('/api/anuncios/grupos', 'pereyra')).status, 403);
  assert.equal((await request('/api/anuncios/grupos', 'pereyra', 'POST', { nombre: 'X' })).status, 403);

  const lista = await ok('/api/anuncios/grupos', 'direccion');
  assert.deepEqual(lista.grupos.map((g) => g.tipo), ['uno-a-muchos', 'muchos-a-uno', 'muchos-a-muchos']);
  assert.deepEqual(lista.grupos[0].emisores.map((p) => p.id), ['1']);
  assert.equal(lista.personas.every((p) => ['preceptor', 'admin-academico'].includes(p.rol)), true);

  const base = { nombre: 'Turno tarde', tipo: 'uno-a-muchos', color: '#DB2777', emisores: ['1'], receptores: ['7'] };
  assert.equal((await request('/api/anuncios/grupos', 'direccion', 'POST', { ...base, nombre: 'equipo de CONDUCCIÓN' })).status, 400, 'nombre repetido');
  assert.equal((await request('/api/anuncios/grupos', 'direccion', 'POST', { ...base, receptores: ['7', '8'] })).status, 400, 'un estudiante no');
  assert.equal((await request('/api/anuncios/grupos', 'direccion', 'POST', { ...base, color: 'rojo' })).status, 400);
  const { grupo } = await ok('/api/anuncios/grupos', 'direccion', 'POST', base, 201);
  assert.equal(grupo.color, '#db2777');
  assert.equal(grupo.creadoPor, 'Directora Ana Romero');

  const editado = await ok(`/api/anuncios/grupos/${grupo.id}`, 'direccion', 'PUT', { ...base, tipo: 'muchos-a-muchos', miembros: ['1', '6', '7'] });
  assert.deepEqual(editado.grupo.miembros.map((p) => p.id).sort(), ['1', '6', '7']);
  assert.deepEqual(editado.grupo.emisores, []);
  assert.ok((await ok('/api/anuncios/destinos', 'pereyra')).grupos.some((g) => g.id === grupo.id));

  await ok(`/api/anuncios/grupos/${grupo.id}`, 'direccion', 'DELETE');
  assert.ok(!(await ok('/api/anuncios/destinos', 'pereyra')).grupos.some((g) => g.id === grupo.id));
  assert.equal((await request('/api/anuncios', 'pereyra', 'POST', { grupoId: grupo.id, cuerpo: 'Hola' })).status, 404, 'archivado');
  assert.equal((await request(`/api/anuncios/grupos/${grupo.id}`, 'direccion', 'PUT', base)).status, 404);

  // El Maestro: elige la escuela; no recibe ni manda avisos.
  assert.equal((await request('/api/anuncios/grupos', 'maestro')).status, 400);
  assert.equal((await request('/api/anuncios/grupos?institucion=999', 'maestro')).status, 400);
  assert.equal((await ok('/api/anuncios/grupos?institucion=1', 'maestro')).grupos.length, 3);
  const delMaestro = await ok('/api/anuncios/grupos', 'maestro', 'POST', { ...base, nombre: 'Del Maestro', institucionId: '1' }, 201);
  assert.equal(delMaestro.grupo.creadoPor, 'Maestro NEXO');
  await ok(`/api/anuncios/grupos/${delMaestro.grupo.id}`, 'maestro', 'PUT', { ...base, nombre: 'Del Maestro (editado)' });
  assert.equal((await request('/api/anuncios/grupos/9999', 'maestro', 'DELETE')).status, 404);
  assert.equal((await request('/api/anuncios/pendientes', 'maestro')).status, 403);
});

test('Push de punta a punta: el aviso llega cifrado y firmado; las suscripciones vencidas se olvidan', async () => {
  const { ok, request, db } = entorno;
  const origen = process.env.NEXO_PUSH_PERMITIR;
  const navegador = createECDH('prime256v1');
  navegador.generateKeys();
  const auth = randomBytes(16);
  const keys = { p256dh: b64u(navegador.getPublicKey()), auth: b64u(auth) };

  assert.match((await ok('/api/push/clave', 'martinez')).clave, /^[A-Za-z0-9_-]{87}$/);
  assert.equal((await request('/api/push/suscripcion', 'martinez', 'POST', { endpoint: 'https://evil.example.com/x', keys })).status, 400);
  assert.equal((await request('/api/push/suscripcion', 'martinez', 'POST', { endpoint: `${origen}/push/x`, keys: { ...keys, auth: 'corta' } })).status, 400);
  await ok('/api/push/suscripcion', 'martinez', 'POST', { endpoint: `${origen}/push/laura`, keys });
  await ok('/api/push/suscripcion', 'martinez', 'POST', { endpoint: `${origen}/push/vencida`, keys });
  // El mismo navegador después con otra persona: la suscripción cambia de dueño.
  await ok('/api/push/suscripcion', 'pereyra', 'POST', { endpoint: `${origen}/push/compartida`, keys });
  await ok('/api/push/suscripcion', 'martinez', 'POST', { endpoint: `${origen}/push/compartida`, keys });
  assert.equal(db.prepare("SELECT usuario_id FROM push_suscripciones WHERE endpoint LIKE '%compartida'").get().usuario_id, 7);
  await ok('/api/push/suscripcion', 'martinez', 'DELETE', { endpoint: `${origen}/push/compartida` });

  recibidos.length = 0;
  const llegaron = new Promise((listo) => {
    esperarPush = () => { if (recibidos.length >= 2) listo(); };
    setTimeout(listo, 5000);
  });
  await ok('/api/anuncios', 'direccion', 'POST', { grupoId: '1', cuerpo: 'Simulacro de evacuación a las 10:15. Cada preceptor acompaña a su curso.' }, 201);
  await llegaron;
  const aLaura = recibidos.find((r) => r.url === '/push/laura');
  assert.ok(aLaura, 'el push no llegó al servicio');
  assert.equal(aLaura.headers['content-encoding'], 'aes128gcm');
  assert.equal(aLaura.headers.urgency, 'high');
  assert.ok(Number(aLaura.headers.ttl) > 0);
  verificarVapid(aLaura.headers.authorization, `${origen}/push/laura`);
  const datos = descifrar(aLaura.cuerpo, navegador, auth);
  assert.equal(datos.titulo, '📣 Directora Ana Romero · Dirección a Preceptoría');
  assert.match(datos.cuerpo, /Simulacro de evacuación/);
  assert.equal(datos.url, '/anuncios');
  assert.ok(datos.pendientes >= 1);
  assert.ok(db.prepare('SELECT ultimo_push_en FROM anuncio_destinatarios WHERE usuario_id = 7 ORDER BY anuncio_id DESC').get().ultimo_push_en);

  // El servicio contestó 410 a la vencida: se borra sola.
  for (let i = 0; i < 20 && db.prepare("SELECT 1 FROM push_suscripciones WHERE endpoint LIKE '%vencida'").get(); i++) {
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM push_suscripciones WHERE endpoint LIKE '%vencida'").get().n, 0);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM push_suscripciones WHERE endpoint LIKE '%laura'").get().n, 1);
});
