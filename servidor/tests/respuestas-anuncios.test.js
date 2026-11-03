import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { crearEntorno } from './entorno.js';

let e, aviso, ruta;
before(async () => {
  e = await crearEntorno('nexo-respuestas-', (db) => db.exec('DROP TABLE mensaje_reacciones'));
  await e.entrar('direccion', 'direccion@sanmartin.nexo.edu');
  await e.entrar('pereyra', 'pereyra@sanmartin.nexo.edu');
  await e.entrar('martinez', 'martinez@sanmartin.nexo.edu');
  await e.entrar('julieta', 'julieta@sanmartin.nexo.edu');
  aviso = (await e.ok('/api/anuncios', 'direccion', 'POST', { personas: ['6', '7'], cuerpo: '¿Entregaron las planillas?' }, 201)).anuncio;
  ruta = `/api/anuncios/${aviso.id}/respuestas`;
});
after(async () => { await e?.cerrar(); });

test('Se responde un aviso pendiente con texto y el emisor puede contestar en privado', async () => {
  const respuesta = (await e.ok(ruta, 'pereyra', 'POST', { cuerpo: 'Hecho' }, 201)).respuesta;
  assert.equal(respuesta.cuerpo, 'Hecho');
  assert.equal(respuesta.mio, true);
  assert.match(respuesta.creadoEn, /T.*Z$/);
  assert.equal(e.db.prepare('SELECT leido_en FROM anuncio_destinatarios WHERE anuncio_id = ? AND usuario_id = 6').get(aviso.id).leido_en, null);
  const recibido = await e.ok(`${ruta}?destinatarioId=6`, 'direccion');
  assert.equal(recibido.respuestas[0].id, respuesta.id);
  assert.equal(recibido.respuestas[0].mio, false);
  await e.ok(ruta, 'direccion', 'POST', { destinatarioId: '6', cuerpo: 'Gracias, recibido.' }, 201);
  assert.deepEqual((await e.ok(ruta, 'pereyra')).respuestas.map((r) => r.cuerpo), ['Hecho', 'Gracias, recibido.']);
  await e.ok(ruta, 'martinez', 'POST', { cuerpo: 'No, falta una firma.' }, 201);
  assert.deepEqual((await e.ok(ruta, 'martinez')).respuestas.map((r) => r.cuerpo), ['No, falta una firma.']);
  await e.ok(`${ruta}?destinatarioId=6`, 'martinez', 'GET', undefined, 403);
  await e.ok(ruta, 'martinez', 'POST', { destinatarioId: '6', cuerpo: 'Intrusión' }, 403);
  await e.ok(ruta, 'julieta', 'GET', undefined, 403);
  const enviados = await e.ok('/api/anuncios/enviados', 'direccion');
  const enviado = enviados.anuncios.find((a) => a.id === aviso.id);
  assert.equal(enviado.destinatarios.find((d) => d.persona.id === '6').respuestas, 2);
});

test('Texto con documentos y audio, y respuesta solo de audio: persistencia y descarga privada', async () => {
  const ids = [];
  for (const [nombre, tipo, bytes] of [['planilla.txt', 'text/plain', 'Planilla completada'], ['nota.webm', 'audio/webm;codecs=opus', 'audio-prueba']]) {
    const subida = await e.crudo('/api/archivos', 'pereyra', { method: 'POST', headers: { 'Content-Type': tipo, 'X-Nombre-Archivo': nombre }, body: bytes });
    assert.equal(subida.status, 201);
    ids.push(subida.datos.archivo.id);
  }
  const respuesta = (await e.ok(ruta, 'pereyra', 'POST', { cuerpo: 'Adjunto la planilla y una aclaración.', archivoIds: ids }, 201)).respuesta;
  assert.equal(respuesta.adjuntos.length, 2);
  assert.equal(respuesta.adjuntos[1].voz, true);
  const recargada = (await e.ok(`${ruta}?destinatarioId=6`, 'direccion')).respuestas.find((r) => r.id === respuesta.id);
  assert.deepEqual(recargada.adjuntos, respuesta.adjuntos);
  for (const id of ids) {
    const descarga = await e.crudo(`/api/archivos/${id}`, 'direccion');
    assert.equal(descarga.status, 200);
    assert.match(descarga.cabeceras.get('content-disposition'), /attachment/);
    assert.equal((await e.crudo(`/api/archivos/${id}?inline=1`, 'direccion')).status, 200);
    assert.equal((await e.crudo(`/api/archivos/${id}`, 'martinez')).status, 403);
  }
  const soloAudio = (await e.ok(ruta, 'pereyra', 'POST', { archivoIds: [ids[1]] }, 201)).respuesta;
  assert.equal(soloAudio.cuerpo, '');
  assert.equal(soloAudio.adjuntos[0].voz, true);
  await e.ok(ruta, 'martinez', 'POST', { archivoIds: [ids[0]] }, 400);
});

test('Cualquier extensión se puede responder y descargar sin ejecutar contenido activo', async () => {
  const ejemplos = [
    ['datos.json', 'application/json', '{"hecho":true}'],
    ['planilla.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'archivo-prueba'],
    ['paquete.zip', 'application/zip', 'archivo-prueba'],
    ['dibujo.dwg', 'application/acad', 'archivo-prueba'],
    ['pagina.html', 'text/html', '<h1>Ejemplo</h1>'],
    ['imagen.svg', 'image/png', '<svg></svg>'],
    ['programa.exe', 'application/octet-stream', 'MZ-prueba'],
  ];
  for (const [nombre, tipo, bytes] of ejemplos) {
    const subida = await e.crudo('/api/archivos', 'pereyra', { method: 'POST', headers: { 'Content-Type': tipo, 'X-Nombre-Archivo': nombre }, body: bytes });
    assert.equal(subida.status, 201, nombre);
    const id = subida.datos.archivo.id;
    await e.ok(ruta, 'pereyra', 'POST', { archivoIds: [id] }, 201);
    const descarga = await e.crudo(`/api/archivos/${id}?inline=1`, 'direccion');
    assert.equal(descarga.status, 200);
    assert.match(descarga.cabeceras.get('content-disposition'), /^attachment/);
    assert.equal(descarga.cabeceras.get('x-content-type-options'), 'nosniff');
    if (['pagina.html', 'imagen.svg', 'programa.exe', 'dibujo.dwg'].includes(nombre)) assert.equal(subida.datos.archivo.tipoMime, 'application/octet-stream');
  }
});

test('La notificación abre el hilo correcto sin exponer otros destinatarios', async () => {
  const { notificaciones } = await e.ok('/api/notificaciones', 'direccion');
  const n = notificaciones.find((n) => n.objetoTipo === 'anuncio-respuesta');
  assert.ok(n);
  const destino = await e.ok(`/api/anuncios/respuestas/${n.objetoId}/destino`, 'direccion');
  assert.equal(destino.url, `/anuncios?respuesta=${aviso.id}&destinatarioId=6`);
  await e.ok(`/api/anuncios/respuestas/${n.objetoId}/destino`, 'martinez', 'GET', undefined, 404);
});

test('Rechaza respuestas vacías, demasiado largas, archivos ajenos y cuentas inactivas', async () => {
  for (const cuerpo of [{}, { cuerpo: '   ' }, { cuerpo: 'a'.repeat(10001) }, { cuerpo: 23 }, { archivoIds: 'invalido' }, { archivoIds: [0] }, { archivoIds: [1, 2, 3, 4, 5, 6] }]) {
    await e.ok(ruta, 'pereyra', 'POST', cuerpo, 400);
  }
  e.db.prepare("UPDATE usuarios SET estado = 'inactivo' WHERE id = 1").run();
  try {
    assert.equal((await e.ok(ruta, 'pereyra')).puedeResponder, false);
    await e.ok(ruta, 'pereyra', 'POST', { cuerpo: '¿Está disponible?' }, 409);
  } finally { e.db.prepare("UPDATE usuarios SET estado = 'activo' WHERE id = 1").run(); }
});
