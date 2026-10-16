// Pruebas de las tendencias: el diseño del algoritmo (propiedades matemáticas
// que tiene que cumplir) y el circuito escuela → dirección → nacional.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { grafoNativo } from '../genoma.js';
import { compilarGrafo } from '../nodos.js';
import { crearEntorno } from './entorno.js';

const puntuador = (slot) => {
  const evaluar = compilarGrafo(grafoNativo(slot));
  return (entradas) => evaluar({ entradas }).salida;
};

// ── El diseño: propiedades del algoritmo por defecto ─────────────────────────

test('Escuela: muchas personas distintas pesan más que una sola insistiendo', () => {
  const puntaje = puntuador('comunidad.tendencias');
  const conversacion = { aFavor: 4, enContra: 0, comentarios: 6, posturas: 0, participantes: 5, pulso: 6, horas: 20 };
  const unaSolaPersona = { ...conversacion, participantes: 1 };
  assert.ok(puntaje(conversacion) > puntaje(unaSolaPersona) * 2, 'el alcance tiene que dominar sobre la insistencia');
});

test('Escuela: sin interacción no hay tendencia, y lo rechazado baja', () => {
  const puntaje = puntuador('comunidad.tendencias');
  assert.equal(puntaje({ aFavor: 0, enContra: 0, comentarios: 0, posturas: 0, participantes: 0, pulso: 0, horas: 3 }), 0);
  const querido = { aFavor: 6, enContra: 1, comentarios: 3, posturas: 0, participantes: 7, pulso: 5, horas: 10 };
  const rechazado = { ...querido, aFavor: 1, enContra: 6 };
  assert.ok(puntaje(querido) > puntaje(rechazado) * 2);
});

test('Escuela: lo reciente (pulso) sube, con el resto igual', () => {
  const puntaje = puntuador('comunidad.tendencias');
  const viejo = { aFavor: 5, enContra: 0, comentarios: 4, posturas: 2, participantes: 6, pulso: 1, horas: 100 };
  assert.ok(puntaje({ ...viejo, pulso: 9 }) > puntaje(viejo));
});

test('Nacional: una escuela chica movilizada compite con una grande', () => {
  const puntaje = puntuador('plataforma.tendencias-nacionales');
  const chica = { participantes: 20, comunidad: 40, pulso: 15, aFavor: 15, enContra: 1 };
  const grande = { participantes: 100, comunidad: 1000, pulso: 60, aFavor: 80, enContra: 10 };
  const razon = puntaje(chica) / puntaje(grande);
  assert.ok(razon > 0.7 && razon < 1.4, `razón ${razon}`);
  // Con las mismas personas, la escuela más chica (más proporción) sube.
  assert.ok(puntaje({ ...grande, comunidad: 200 }) > puntaje(grande));
});

// ── El circuito: escuela → dirección → nacional ──────────────────────────────

let entorno, db, request, ok, entrar;

before(async () => {
  entorno = await crearEntorno('nexo-tendencias-', (base) => {
    // Una segunda escuela, para mirar lo nacional desde afuera.
    const otra = base.prepare("INSERT INTO instituciones (nombre, ciclo_lectivo) VALUES ('Escuela Austral', 2026)").run().lastInsertRowid;
    const copiar = base.prepare(
      "INSERT INTO usuarios (institucion_id, email, hash_contrasena, nombre, rol) SELECT ?, ?, hash_contrasena, ?, ? FROM usuarios WHERE id = 8"
    );
    copiar.run(otra, 'alumna@austral.nexo.edu', 'Alumna Austral', 'estudiante');
    copiar.run(otra, 'direccion@austral.nexo.edu', 'Dirección Austral', 'admin-academico');
  });
  ({ db, request, ok, entrar } = entorno);
  await entrar('estudiante', 'julieta@sanmartin.nexo.edu');
  await entrar('direccion', 'direccion@sanmartin.nexo.edu');
  await entrar('maestro', 'sistema@nexo.edu');
  await entrar('austral', 'alumna@austral.nexo.edu');
  await entrar('direccionAustral', 'direccion@austral.nexo.edu');
});

after(async () => {
  await entorno?.cerrar();
});

test('En la escuela lidera lo que mueve a más personas, y el autor no suma', async () => {
  const { tendencias } = await ok('/api/comunidad/tendencias?alcance=mi-escuela', 'estudiante');
  const club = tendencias[0];
  assert.equal(club.tipo, 'publicacion');
  assert.equal(club.id, '6');
  assert.equal(club.participantes, 6);
  assert.equal(club.comentarios, 3, 'el comentario del propio autor no cuenta');
  const uniforme = tendencias.find((t) => t.tipo === 'debate' && t.id === '2');
  assert.ok(uniforme && uniforme.puntaje < club.puntaje);
  // El estudiante no ve las propuestas: solo si algo ya salió a lo nacional.
  assert.ok(tendencias.every((t) => t.estadoNacional === null));
});

test('El algoritmo propone a la dirección, y solo ella decide', async () => {
  const bandeja = await ok('/api/comunidad/tendencias/direccion', 'direccion');
  assert.ok(bandeja.propuestas.some((p) => p.tipo === 'publicacion' && p.id === '6'));
  assert.ok(db.prepare("SELECT 1 FROM notificaciones WHERE usuario_id = 1 AND tipo = 'tendencia'").get(), 'la dirección recibe el aviso');

  await ok('/api/comunidad/tendencias/direccion', 'estudiante', 'GET', undefined, 403);
  await ok('/api/comunidad/tendencias/nacional', 'estudiante', 'POST', { tipo: 'publicacion', id: 6, decision: 'aprobar' }, 403);
  await ok('/api/comunidad/tendencias/nacional', 'direccionAustral', 'POST', { tipo: 'publicacion', id: 6, decision: 'aprobar' }, 404);
  assert.equal((await ok('/api/comunidad/tendencias?alcance=nacional', 'austral')).tendencias.length, 0, 'sin aprobación no hay nada nacional');

  // Descartar una propuesta: queda descartada y no se vuelve a proponer.
  await ok('/api/comunidad/tendencias/nacional', 'direccion', 'POST', { tipo: 'debate', id: 2, decision: 'rechazar' });
  const otraVez = await ok('/api/comunidad/tendencias/direccion', 'direccion');
  assert.ok(otraVez.descartadas.some((p) => p.tipo === 'debate' && p.id === '2'));
  assert.ok(!otraVez.propuestas.some((p) => p.tipo === 'debate' && p.id === '2'));
});

test('Aprobada por la dirección, sale a lo nacional y otras escuelas la leen sin nombres', async () => {
  const r = await ok('/api/comunidad/tendencias/nacional', 'direccion', 'POST', { tipo: 'publicacion', id: 6, decision: 'aprobar' });
  assert.equal(r.estado, 'aprobada');
  assert.ok(db.prepare("SELECT 1 FROM notificaciones WHERE usuario_id = 10 AND tipo = 'tendencia'").get(), 'el autor se entera');
  await ok('/api/comunidad/tendencias/nacional', 'direccion', 'POST', { tipo: 'publicacion', id: 6, decision: 'aprobar' }, 409);

  const { tendencias } = await ok('/api/comunidad/tendencias?alcance=nacional', 'austral');
  assert.equal(tendencias.length, 1);
  assert.equal(tendencias[0].institucion, 'Colegio San Martín');
  assert.equal(tendencias[0].esDeMiEscuela, false);
  assert.ok(tendencias[0].puntaje > 0);

  const detalle = await ok('/api/comunidad/detalle?tipo=publicacion&id=6', 'austral');
  assert.equal(detalle.soloLectura, true);
  assert.equal(detalle.objeto.autor, 'Comunidad de Colegio San Martín');
  assert.ok(detalle.comentarios.length > 0 && detalle.comentarios.every((c) => c.autor === 'Integrante de la comunidad' && c.autorAvatar === null));
  // Leer sí; votar o comentar desde otra escuela, no.
  await ok('/api/comunidad/voto', 'austral', 'POST', { objetoTipo: 'publicacion', objetoId: 6, valor: 1 }, 404);
  await ok('/api/comunidad/detalle?tipo=debate&id=2', 'austral', 'GET', undefined, 404);

  const propia = await ok('/api/comunidad/tendencias?alcance=mi-escuela', 'estudiante');
  assert.equal(propia.tendencias.find((t) => t.id === '6' && t.tipo === 'publicacion').estadoNacional, 'aprobada');
});

test('Tope de tendencias por escuela y retiro de la dirección', async () => {
  // La dirección puede cambiar de opinión sobre un descarte.
  await ok('/api/comunidad/tendencias/nacional', 'direccion', 'POST', { tipo: 'debate', id: 2, decision: 'aprobar' });
  assert.equal((await ok('/api/comunidad/tendencias?alcance=nacional', 'austral')).tendencias.length, 2);

  const { config } = await ok('/api/maestro/tendencias-nacionales', 'maestro');
  config.parametros.maxPorEscuela = 1;
  await ok('/api/maestro/tendencias-nacionales', 'maestro', 'PUT', { config });
  const tope = await ok('/api/comunidad/tendencias?alcance=nacional', 'austral');
  assert.equal(tope.tendencias.length, 1);
  assert.equal(tope.tendencias[0].id, '6', 'queda la mejor de la escuela');

  await ok('/api/comunidad/tendencias/nacional', 'direccion', 'POST', { tipo: 'debate', id: 2, decision: 'rechazar' }, 409);
  await ok('/api/comunidad/tendencias/nacional', 'direccion', 'POST', { tipo: 'publicacion', id: 6, decision: 'retirar' });
  const despues = await ok('/api/comunidad/tendencias?alcance=nacional', 'austral');
  assert.deepEqual(despues.tendencias.map((t) => t.tipo + t.id), ['debate2']);
  await ok('/api/comunidad/detalle?tipo=publicacion&id=6', 'austral', 'GET', undefined, 404);
});

test('El Maestro calibra o apaga lo nacional; nadie más', async () => {
  await ok('/api/maestro/tendencias-nacionales', 'direccion', 'GET', undefined, 403);
  const { config, estadisticas } = await ok('/api/maestro/tendencias-nacionales', 'maestro');
  assert.equal(estadisticas.aprobadas, 1);
  await ok('/api/maestro/tendencias-nacionales', 'maestro', 'PUT', { config: { ...config, activo: false } });
  assert.equal((await ok('/api/comunidad/tendencias?alcance=nacional', 'austral')).desactivado, true);
  const roto = await request('/api/maestro/tendencias-nacionales', 'maestro', 'PUT', { config: { ...config, variante: 'personalizado', grafo: null } });
  assert.equal(roto.status, 400);
  await ok('/api/maestro/tendencias-nacionales', 'maestro', 'PUT', { config: { ...config, activo: true } });
  assert.notEqual((await ok('/api/comunidad/tendencias?alcance=nacional', 'austral')).desactivado, true);
});
