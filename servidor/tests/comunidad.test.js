// Pruebas de la Comunidad estilo X / Reddit y de los debates por bloques:
// capacidades que reparte la dirección (multimedia, fijar), fijar sin límite,
// respuestas anidadas, votos y reacciones, hilos, citas, reposts, guardados,
// seguir y silenciar, menciones, hashtags, encuestas, edición, quién responde,
// vistas, y debates con bloques combinables, aportes, Δ, anonimato y cierre.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { crearEntorno } from './entorno.js';

let entorno, db, request, ok, crudo, entrar;
const QUIENES = {
  direccion: 'direccion@sanmartin.nexo.edu', garcia: 'garcia@sanmartin.nexo.edu', pereyra: 'pereyra@sanmartin.nexo.edu',
  julieta: 'julieta@sanmartin.nexo.edu', martin: 'martin@sanmartin.nexo.edu', sofia: 'sofia.chen@sanmartin.nexo.edu',
  lucas: 'lucas@sanmartin.nexo.edu', centro: 'centro@sanmartin.nexo.edu', biblioteca: 'biblioteca@sanmartin.nexo.edu',
  austral: 'alumna@austral.nexo.edu',
};

before(async () => {
  entorno = await crearEntorno('nexo-comunidad-', (base) => {
    const austral = base.prepare("INSERT INTO instituciones (nombre, ciclo_lectivo) VALUES ('Escuela Austral', 2026)").run().lastInsertRowid;
    base.prepare("INSERT INTO usuarios (institucion_id, email, hash_contrasena, nombre, rol) SELECT ?, 'alumna@austral.nexo.edu', hash_contrasena, 'Alumna Austral', 'estudiante' FROM usuarios WHERE id = 8").run(austral);
  });
  ({ db, request, ok, crudo, entrar } = entorno);
  for (const [quien, email] of Object.entries(QUIENES)) await entrar(quien, email);
});
after(async () => { await entorno?.cerrar(); });

const PNG = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');
const subir = async (quien, { bytes = PNG, tipo = 'image/png', nombre = 'foto.png' } = {}) =>
  crudo('/api/archivos', quien, { method: 'POST', headers: { 'Content-Type': tipo, 'X-Nombre-Archivo': encodeURIComponent(nombre) }, body: bytes });
const publicar = (quien, cuerpo, status = 201) => ok('/api/comunidad/publicaciones', quien, 'POST', cuerpo, status);
const feed = async (quien, consulta = '') => (await ok(`/api/comunidad/publicaciones${consulta}`, quien)).publicaciones;
const notifs = async (quien) => (await ok('/api/notificaciones', quien)).notificaciones;
const guardarEdicion = async (cambios) => {
  const { version } = await ok('/api/instancia/edicion', 'direccion');
  return ok('/api/instancia/edicion', 'direccion', 'PUT', { version, ...cambios });
};

test('Multimedia: por defecto solo dirección y centro; la dirección se lo da a otros perfiles', async () => {
  const foto = await subir('julieta');
  assert.equal(foto.status, 201);
  const r = await request('/api/comunidad/publicaciones', 'julieta', 'POST', { contenido: 'Mirá esta foto', adjuntos: [Number(foto.datos.archivo.id)] });
  assert.equal(r.status, 403);
  assert.match(r.data.error, /dirección/);
  assert.deepEqual((await ok('/api/instancia', 'julieta')).capacidades, []);
  assert.ok((await ok('/api/instancia', 'centro')).capacidades.includes('comunidad.multimedia'));

  const video = await subir('centro', { bytes: Buffer.alloc(2048, 7), tipo: 'video/mp4', nombre: 'asamblea.mp4' });
  assert.equal(video.status, 201);
  const { id } = await publicar('centro', { contenido: 'El video de la asamblea #asamblea', adjuntos: [Number(video.datos.archivo.id)] });
  const pub = (await feed('martin')).find((p) => p.id === id);
  assert.equal(pub.adjuntos[0].clase, 'video');
  // Lo baja la gente de la escuela (y se puede adelantar el video); otra escuela no.
  const descarga = await crudo(`/api/archivos/${video.datos.archivo.id}?inline=1`, 'martin', { headers: { Range: 'bytes=0-99' } });
  assert.equal(descarga.status, 206);
  assert.match(descarga.cabeceras.get('content-disposition'), /^inline/);
  assert.equal((await crudo(`/api/archivos/${video.datos.archivo.id}`, 'austral')).status, 403);
  // Se puede compartir cualquier extensión; el contenido activo se descarga.
  const programa = await subir('centro', { tipo: 'application/octet-stream', nombre: 'juego.exe' });
  assert.equal(programa.status, 201);
  assert.match((await crudo(`/api/archivos/${programa.datos.archivo.id}?inline=1`, 'centro')).cabeceras.get('content-disposition'), /^attachment/);

  const g = await guardarEdicion({ capacidades: { 'comunidad.multimedia': ['admin-academico', 'centro-estudiantes', 'estudiante'] } });
  assert.ok(g.cambios.some((c) => c.texto.includes('Estudiante ahora puede: subir fotos, videos y archivos')));
  assert.ok((await ok('/api/instancia', 'julieta')).capacidades.includes('comunidad.multimedia'));
  await publicar('julieta', { contenido: 'Ahora sí', adjuntos: [Number(foto.datos.archivo.id)] });
  await guardarEdicion({ capacidades: { 'comunidad.multimedia': ['admin-academico', 'centro-estudiantes'] } });
});

test('Fijar sin límite: lo último que se fija queda arriba de todo', async () => {
  const a = await publicar('julieta', { contenido: 'Primera para fijar' });
  const b = await publicar('martin', { contenido: 'Segunda para fijar' });
  const c = await publicar('sofia', { contenido: 'Tercera para fijar' });
  for (const p of [a, b, c]) await ok(`/api/comunidad/publicaciones/${p.id}/fijar`, 'direccion', 'POST');
  let arriba = (await feed('lucas')).slice(0, 3).map((p) => p.contenido);
  assert.deepEqual(arriba, ['Tercera para fijar', 'Segunda para fijar', 'Primera para fijar']);
  await ok(`/api/comunidad/publicaciones/${a.id}/fijar`, 'direccion', 'POST'); // volver a fijar la sube
  arriba = (await feed('lucas', '?vista=recientes')).slice(0, 3).map((p) => p.contenido);
  assert.deepEqual(arriba, ['Primera para fijar', 'Tercera para fijar', 'Segunda para fijar']);
  assert.equal((await request(`/api/comunidad/publicaciones/${a.id}/fijar`, 'centro', 'POST')).status, 403);
  await guardarEdicion({ capacidades: { 'comunidad.fijar': ['admin-academico', 'centro-estudiantes'] } });
  await ok(`/api/comunidad/publicaciones/${b.id}/desfijar`, 'centro', 'POST');
  for (const p of [a, c]) await ok(`/api/comunidad/publicaciones/${p.id}/desfijar`, 'direccion', 'POST');
});

test('Hilos y sub-hilos estilo Reddit, con avisos y respuestas borradas que no rompen el hilo', async () => {
  const { id } = await publicar('julieta', { contenido: '¿Qué libro recomiendan para las vacaciones?' });
  const r1 = await ok('/api/comunidad/comentarios', 'martin', 'POST', { objetoTipo: 'publicacion', objetoId: Number(id), contenido: 'El Principito.' }, 201);
  const r2 = await ok('/api/comunidad/comentarios', 'sofia', 'POST', { objetoTipo: 'publicacion', objetoId: Number(id), contenido: '¿El de Saint-Exupéry?', padreId: Number(r1.id) }, 201);
  const r3 = await ok('/api/comunidad/comentarios', 'martin', 'POST', { objetoTipo: 'publicacion', objetoId: Number(id), contenido: '¡Ese!', padreId: Number(r2.id) }, 201);
  assert.equal(r3.comentario.padreId, r2.id);
  assert.ok((await notifs('martin')).some((n) => n.titulo.includes('respondió tu comentario')));
  assert.ok((await notifs('julieta')).some((n) => n.titulo.includes('respondió tu publicación')));
  // Una respuesta a otra publicación no se cuela.
  const otra = await publicar('lucas', { contenido: 'Otra cosa' });
  assert.equal((await request('/api/comunidad/comentarios', 'sofia', 'POST', { objetoTipo: 'publicacion', objetoId: Number(otra.id), contenido: 'x', padreId: Number(r1.id) })).status, 400);

  await ok(`/api/comunidad/comentarios/${r2.id}`, 'sofia', 'DELETE');
  const { comentarios } = await ok(`/api/comunidad/detalle?tipo=publicacion&id=${id}`, 'lucas');
  const borrada = comentarios.find((c) => c.id === r2.id);
  assert.equal(borrada.eliminado, true);
  assert.equal(borrada.autor, '[eliminada]');
  assert.equal(borrada.contenido, '');
  assert.equal(comentarios.find((c) => c.id === r3.id).padreId, r2.id, 'su respuesta sigue colgando de ella');
  assert.equal((await feed('lucas')).find((p) => p.id === id).comentarios, 2);
});

test('Votos con flechas (no hay "me gusta") y reacciones con emoji', async () => {
  const { id } = await publicar('garcia', { contenido: 'Mañana hay simulacro de evacuación.' });
  let v = await ok('/api/comunidad/voto', 'julieta', 'POST', { objetoTipo: 'publicacion', objetoId: Number(id), valor: 1 });
  assert.deepEqual([v.miVoto, v.votosAFavor], ['a-favor', 1]);
  v = await ok('/api/comunidad/voto', 'martin', 'POST', { objetoTipo: 'publicacion', objetoId: Number(id), valor: -1 });
  assert.equal(v.votosEnContra, 1);
  assert.equal((await request('/api/comunidad/voto', 'martin', 'POST', { objetoTipo: 'publicacion', objetoId: Number(id), valor: 2 })).status, 400);

  let r = await ok('/api/comunidad/reacciones', 'julieta', 'POST', { objetoTipo: 'publicacion', objetoId: Number(id), emoji: '🔥' });
  r = await ok('/api/comunidad/reacciones', 'martin', 'POST', { objetoTipo: 'publicacion', objetoId: Number(id), emoji: '🔥' });
  r = await ok('/api/comunidad/reacciones', 'martin', 'POST', { objetoTipo: 'publicacion', objetoId: Number(id), emoji: '👏🏽' });
  assert.deepEqual(r.reacciones.map((x) => [x.emoji, x.cantidad, x.mia]), [['🔥', 2, true], ['👏🏽', 1, true]]);
  r = await ok('/api/comunidad/reacciones', 'martin', 'POST', { objetoTipo: 'publicacion', objetoId: Number(id), emoji: '🔥' });
  assert.deepEqual(r.reacciones.find((x) => x.emoji === '🔥'), { emoji: '🔥', cantidad: 1, mia: false });
  for (const emoji of ['hola', '<img>', '']) {
    assert.equal((await request('/api/comunidad/reacciones', 'martin', 'POST', { objetoTipo: 'publicacion', objetoId: Number(id), emoji })).status, 400, emoji);
  }
  assert.equal((await request('/api/comunidad/reacciones', 'austral', 'POST', { objetoTipo: 'publicacion', objetoId: Number(id), emoji: '🔥' })).status, 404);
});

test('Estilo X: hilos encadenados, citas, reposts, guardados y silenciar (sin seguir personas)', async () => {
  const hilo = await publicar('garcia', { contenido: 'Hilo sobre cómo estudiar mejor 🧵', hilo: [{ contenido: '1. Repasá con preguntas.' }, { contenido: '2. Espaciá el estudio.' }] });
  assert.equal(hilo.hilo.length, 3);
  const enFeed = await feed('julieta');
  assert.equal(enFeed.find((p) => p.id === hilo.id).hilo.total, 3);
  assert.ok(!enFeed.some((p) => p.contenido.startsWith('1. Repasá')), 'las continuaciones no van sueltas en el feed');
  assert.deepEqual((await ok(`/api/comunidad/detalle?tipo=publicacion&id=${hilo.hilo[1]}`, 'julieta')).hilo.map((p) => p.id), hilo.hilo);

  const cita = await publicar('julieta', { contenido: 'Esto me sirvió muchísimo', citaId: Number(hilo.id) });
  const conCita = (await feed('martin')).find((p) => p.id === cita.id);
  assert.equal(conCita.cita.id, hilo.id);
  assert.ok((await notifs('garcia')).some((n) => n.titulo.includes('citó tu publicación')));
  assert.equal((await feed('martin')).find((p) => p.id === hilo.id).citas, 1);

  // En NEXO no se sigue a personas: la ventanilla de seguir ya no existe.
  assert.equal((await request(`/api/comunidad/usuarios/8/seguir`, 'lucas', 'POST')).status, 410);
  await ok(`/api/comunidad/publicaciones/${hilo.id}/repost`, 'julieta', 'POST');
  assert.ok(!(await notifs('julieta')).some((n) => n.titulo.includes('empezó a seguirte')));
  assert.equal((await request(`/api/comunidad/publicaciones/${hilo.id}/repost`, 'pereyra', 'POST')).status, 403, 'el preceptor lee y responde, no repostea');
  const perfil = await ok('/api/comunidad/usuarios/8', 'lucas');
  assert.equal(perfil.handle, 'julieta');
  assert.ok((await feed('lucas', '?vista=perfil&usuario=8')).some((p) => p.repostadoPor));

  await ok(`/api/comunidad/publicaciones/${cita.id}/guardar`, 'lucas', 'POST');
  assert.deepEqual((await feed('lucas', '?vista=guardados')).map((p) => p.id), [cita.id]);

  await ok(`/api/comunidad/usuarios/2/silenciar`, 'lucas', 'POST');
  assert.ok(!(await feed('lucas')).some((p) => p.autorId === '2'), 'lo silenciado no aparece');
  await ok(`/api/comunidad/usuarios/2/silenciar`, 'lucas', 'POST');
});

test('Menciones, hashtags, encuestas, edición, quién responde y vistas', async () => {
  const m = await publicar('lucas', { contenido: 'Gracias @julieta y @martin. por los apuntes #biologia #Biología' });
  assert.ok((await notifs('julieta')).some((n) => n.titulo === 'Lucas Fernández te mencionó'));
  assert.ok((await feed('martin', '?vista=menciones')).some((p) => p.id === m.id));
  const pub = (await feed('sofia')).find((p) => p.id === m.id);
  assert.deepEqual(pub.menciones.map((x) => x.handle), ['julieta', 'martin']);
  assert.deepEqual(pub.hashtags, ['biologia']);
  assert.ok((await ok('/api/comunidad/hashtags', 'sofia')).hashtags.some((h) => h.tag === 'biologia'));
  assert.deepEqual((await feed('sofia', '?tag=Biología')).map((p) => p.id), [m.id]);
  assert.ok((await ok('/api/comunidad/personas?q=juli', 'sofia')).personas.some((p) => p.handle === 'julieta'));

  const e = await publicar('sofia', { contenido: '¿A qué hora el taller?', encuesta: { opciones: ['13 h', '15 h', '17 h'], duracionHoras: 24 } });
  const antes = (await feed('lucas')).find((p) => p.id === e.id).encuesta;
  assert.ok(antes.opciones.every((o) => o.votos === null), 'no se ve el resultado antes de votar');
  const voto = await ok(`/api/comunidad/encuestas/${e.id}/votar`, 'lucas', 'POST', { opcionId: Number(antes.opciones[1].id) });
  assert.equal(voto.total, 1);
  assert.equal((await request(`/api/comunidad/encuestas/${e.id}/votar`, 'lucas', 'POST', { opcionId: Number(antes.opciones[0].id) })).status, 409);
  assert.equal((await request('/api/comunidad/publicaciones', 'sofia', 'POST', { contenido: 'x', encuesta: { opciones: ['solo una'] } })).status, 400);

  await ok(`/api/comunidad/publicaciones/${e.id}`, 'sofia', 'PUT', { contenido: '¿A qué hora hacemos el taller?' });
  assert.equal((await feed('lucas')).find((p) => p.id === e.id).editado, true);
  assert.equal((await request(`/api/comunidad/publicaciones/${e.id}`, 'lucas', 'PUT', { contenido: 'hackeo' })).status, 403);

  const solo = await publicar('julieta', { contenido: 'Pregunta para @sofia.chen', responden: 'mencionados' });
  assert.equal((await request('/api/comunidad/comentarios', 'martin', 'POST', { objetoTipo: 'publicacion', objetoId: Number(solo.id), contenido: 'Yo opino' })).status, 403);
  await ok('/api/comunidad/comentarios', 'sofia', 'POST', { objetoTipo: 'publicacion', objetoId: Number(solo.id), contenido: 'Te respondo' }, 201);

  await ok('/api/comunidad/vistas', 'martin', 'POST', { ids: [Number(solo.id), Number(solo.id)] });
  await ok('/api/comunidad/vistas', 'martin', 'POST', { ids: [Number(solo.id)] });
  await ok('/api/comunidad/vistas', 'lucas', 'POST', { ids: [Number(solo.id)] });
  assert.equal((await feed('julieta')).find((p) => p.id === solo.id).vistas, 2);
});

test('Debates con bloques combinables: crear, responder y validar', async () => {
  const malo = await request('/api/comunidad/debates', 'garcia', 'POST', { titulo: 'x', bloques: [{ tipo: 'opciones', config: { opciones: ['solo una'] } }] });
  assert.equal(malo.status, 400);
  const { id } = await ok('/api/comunidad/debates', 'garcia', 'POST', {
    titulo: '¿Cómo usamos el patio en los recreos?', descripcion: 'Queremos decidirlo entre todos.', resultados: 'al-participar',
    bloques: [
      { tipo: 'postura', titulo: '¿Hay que dividir el patio por zonas?', config: { neutral: true } },
      { tipo: 'opciones', titulo: '¿Qué actividades querés?', config: { opciones: ['Fútbol', 'Lectura', 'Música', 'Ajedrez'], multiple: true, maximo: 2 } },
      { tipo: 'escala', titulo: '¿Qué tan importante es para vos?', config: { minimo: 1, maximo: 5 } },
      { tipo: 'ranking', titulo: 'Ordená las prioridades', config: { opciones: ['Sombra', 'Bancos', 'Bebederos'] } },
      { tipo: 'argumentos' },
      { tipo: 'propuestas', config: { maximoPorPersona: 1 } },
      { tipo: 'abierta', titulo: '¿Qué te gustaría que cambie?' },
    ],
  }, 201);
  let d = await ok(`/api/comunidad/debates/${id}`, 'julieta');
  assert.equal(d.bloques.length, 7);
  const [postura, opciones, escala, ranking] = d.bloques;
  assert.equal(postura.resultados, null, 'al-participar: sin responder no ve resultados');

  const responder = (quien, bloque, valor, status = 200) => ok(`/api/comunidad/debates/${id}/responder`, quien, 'POST', { bloqueId: Number(bloque.id), valor }, status);
  d = await responder('julieta', postura, 'a-favor');
  assert.deepEqual(d.bloques[0].resultados, { total: 1, aFavor: 1, enContra: 0, neutral: 0, consenso: 1 });
  await responder('martin', postura, 'en-contra');
  await responder('sofia', postura, 'neutral');
  await responder('julieta', opciones, ['o1', 'o3']);
  await responder('martin', opciones, ['o1']);
  await responder('julieta', escala, 5);
  await responder('martin', escala, 3);
  await responder('julieta', ranking, ['o3', 'o1', 'o2']);
  d = await responder('martin', ranking, ['o3', 'o2', 'o1']);
  assert.deepEqual(d.bloques[1].resultados.opciones.map((o) => o.votos), [2, 0, 1, 0]);
  assert.equal(d.bloques[2].resultados.promedio, 4);
  assert.equal(d.bloques[3].resultados.opciones[0].texto, 'Bebederos', 'Borda: lo que todos pusieron primero gana');
  assert.equal(d.bloques[0].resultados.consenso, 0, 'uno a favor y uno en contra: dividido');

  for (const [bloque, valor] of [[postura, 'tal vez'], [opciones, ['o1', 'o2', 'o3']], [escala, 9], [ranking, ['o1', 'o2']]]) {
    await responder('lucas', bloque, valor, 400);
  }
  d = await responder('julieta', postura, null);
  assert.equal(d.bloques[0].miRespuesta, null, 'se puede quitar la respuesta');
  await ok(`/api/comunidad/debates/${id}/postura`, 'julieta', 'PUT', { postura: 'a-favor' });
  const lista = (await ok('/api/comunidad/debates', 'julieta')).debates.find((x) => x.id === id);
  assert.deepEqual(lista.bloques.map((b) => b.tipo), ['postura', 'opciones', 'escala', 'ranking', 'argumentos', 'propuestas', 'abierta']);
  assert.equal(lista.miPostura, 'a-favor');
  assert.equal(lista.participantes, 3);
});

test('Debates: argumentos con hilos, "me hizo cambiar de opinión", anonimato, cierre y conclusión', async () => {
  const { id } = await ok('/api/comunidad/debates', 'centro', 'POST', {
    titulo: '¿Uniforme obligatorio?', anonimo: true, resultados: 'al-cierre',
    bloques: [{ tipo: 'postura' }, { tipo: 'argumentos' }, { tipo: 'propuestas', config: { maximoPorPersona: 1 } }],
  }, 201);
  let d = await ok(`/api/comunidad/debates/${id}`, 'julieta');
  const [postura, argumentos, propuestas] = d.bloques;
  const aportar = (quien, bloque, cuerpo, status = 201) => ok(`/api/comunidad/debates/${id}/aportes`, quien, 'POST', { bloqueId: Number(bloque.id), ...cuerpo }, status);
  await aportar('julieta', argumentos, { texto: 'Iguala a todos.' }, 400);
  const a1 = await aportar('julieta', argumentos, { texto: 'Iguala a todos y evita comparaciones.', lado: 'a-favor' });
  await aportar('martin', argumentos, { texto: 'Limita la expresión personal.', lado: 'en-contra' });
  await aportar('martin', propuestas, { texto: 'Uniforme solo los lunes.' });
  await aportar('martin', propuestas, { texto: 'Otra más.' }, 409);

  // Δ: le cambió la opinión a Martín.
  assert.equal((await ok(`/api/comunidad/debates/aportes/${a1.id}/convencio`, 'martin', 'POST')).convencidos, 1);
  assert.equal((await request(`/api/comunidad/debates/aportes/${a1.id}/convencio`, 'julieta', 'POST')).status, 400);
  assert.ok((await notifs('julieta')).some((n) => n.titulo.includes('cambiar de opinión')));
  // Hilo propio del argumento.
  await ok('/api/comunidad/comentarios', 'sofia', 'POST', { objetoTipo: 'debate', objetoId: Number(id), aporteId: Number(a1.id), contenido: '¿Y si es caro para algunas familias?' }, 201);

  d = await ok(`/api/comunidad/debates/${id}`, 'lucas');
  const arg = d.bloques[1].aportes.find((a) => a.id === a1.id);
  assert.deepEqual([arg.autor, arg.autorId, arg.convencidos, arg.respuestas], ['Participante', null, 1, 1], 'anónimo para el resto');
  assert.equal(d.comentarios.find((c) => c.aporteId === a1.id).autor, 'Participante');
  assert.equal((await ok(`/api/comunidad/debates/${id}`, 'direccion')).bloques[1].aportes.find((a) => a.id === a1.id).autor, 'Julieta Rossi', 'la dirección modera');
  assert.equal(d.estadisticas.cambiosDeOpinion, 1);

  await ok(`/api/comunidad/debates/${id}/responder`, 'lucas', 'POST', { bloqueId: Number(postura.id), valor: 'en-contra' });
  assert.equal((await ok(`/api/comunidad/debates/${id}`, 'lucas')).bloques[0].resultados, null, 'al-cierre: nadie ve nada hasta que cierre');
  assert.equal((await request(`/api/comunidad/debates/${id}/cerrar`, 'julieta', 'POST')).status, 403);
  d = await ok(`/api/comunidad/debates/${id}/cerrar`, 'centro', 'POST');
  assert.equal(d.debate.abierto, false);
  assert.equal((await ok(`/api/comunidad/debates/${id}`, 'lucas')).bloques[0].resultados.enContra, 1);
  assert.ok((await notifs('lucas')).some((n) => n.titulo.includes('Se cerró un debate')));
  await ok(`/api/comunidad/debates/${id}/responder`, 'martin', 'POST', { bloqueId: Number(postura.id), valor: 'a-favor' }, 409);
  await ok(`/api/comunidad/debates/${id}/aportes`, 'martin', 'POST', { bloqueId: Number(argumentos.id), texto: 'Tarde', lado: 'a-favor' }, 409);

  assert.equal((await request(`/api/comunidad/debates/${id}/conclusion`, 'julieta', 'PUT', { texto: 'Gané' })).status, 403);
  d = await ok(`/api/comunidad/debates/${id}/conclusion`, 'centro', 'PUT', { texto: 'Llevamos a la dirección la propuesta del uniforme los lunes.' });
  assert.match(d.debate.conclusion.texto, /los lunes/);
  assert.ok((await notifs('martin')).some((n) => n.titulo.includes('tiene conclusión')));
  // Fijar un debate (la capacidad la tiene el centro desde la prueba de fijar).
  await ok(`/api/comunidad/debates/${id}/fijar`, 'centro', 'POST');
  assert.equal((await ok('/api/comunidad/debates', 'lucas')).debates[0].id, id);
});
