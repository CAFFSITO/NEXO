// Pruebas del turno y la especialidad de los cursos: listas propias de cada
// escuela (arrancan con Mañana, Tarde y Vespertino, y tres especialidades) a
// las que la dirección les puede sumar más.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { crearEntorno } from './entorno.js';

let entorno, request, ok, entrar;
const estado = {};

before(async () => {
  entorno = await crearEntorno('nexo-cursos-');
  ({ request, ok, entrar } = entorno);
  await entrar('direccion', 'direccion@sanmartin.nexo.edu');
  await entrar('julieta', 'julieta@sanmartin.nexo.edu');
});

after(async () => {
  await entorno?.cerrar();
});

const porNombre = (lista, nombre) => lista.find((x) => x.nombre === nombre);

test('Cada escuela arranca con Mañana, Tarde y Vespertino y tres especialidades', async () => {
  const opciones = await ok('/api/gestion-academica/opciones', 'direccion');
  assert.deepEqual(opciones.turnos.map((t) => t.nombre), ['Mañana', 'Tarde', 'Vespertino']);
  assert.deepEqual(opciones.especialidades.map((e) => e.nombre), ['Informática', 'Electromecánica', 'Energías renovables']);
  // Los cursos de ejemplo se cargaron antes del turno: quedan sin ese dato.
  assert.ok(opciones.cursos.every((c) => c.turno === null));
  estado.opciones = opciones;
  estado.viejo = opciones.cursos[0];
});

test('La dirección suma turnos y especialidades, sin repetidos', async () => {
  const noche = await ok('/api/cursos/turnos', 'direccion', 'POST', { nombre: '  Noche  ' }, 201);
  assert.equal(noche.nombre, 'Noche');
  const repetido = await request('/api/cursos/turnos', 'direccion', 'POST', { nombre: 'vespertino' });
  assert.equal(repetido.status, 409);
  assert.equal(repetido.data.existente.nombre, 'Vespertino');
  assert.equal((await request('/api/cursos/turnos', 'direccion', 'POST', { nombre: '' })).status, 400);
  const quimica = await ok('/api/cursos/especialidades', 'direccion', 'POST', { nombre: 'Química' }, 201);
  assert.equal((await request('/api/cursos/especialidades', 'julieta', 'POST', { nombre: 'Robótica' })).status, 403);

  const opciones = await ok('/api/gestion-academica/opciones', 'direccion');
  assert.deepEqual(opciones.turnos.map((t) => t.nombre), ['Mañana', 'Tarde', 'Vespertino', 'Noche']);
  assert.ok(porNombre(opciones.especialidades, 'Química'));
  estado.noche = noche;
  estado.quimica = quimica;
});

test('Al crear un curso el turno es obligatorio y la especialidad, opcional', async () => {
  const { turnos, especialidades } = estado.opciones;
  const vespertino = porNombre(turnos, 'Vespertino');
  const sinTurno = await request('/api/cursos', 'direccion', 'POST', { anio: 6, division: 'Z' });
  assert.equal(sinTurno.status, 400);
  assert.match(sinTurno.data.error, /turno/);
  assert.equal((await request('/api/cursos', 'direccion', 'POST', { anio: 6, division: 'Z', turnoId: '99999' })).status, 400);
  assert.equal((await request('/api/cursos', 'direccion', 'POST', { anio: 6, division: 'Z', turnoId: vespertino.id, especialidadId: '99999' })).status, 400);

  const creado = await ok('/api/cursos', 'direccion', 'POST', { anio: 6, division: 'Z', turnoId: vespertino.id, especialidadId: porNombre(especialidades, 'Informática').id }, 201);
  const curso = (await ok('/api/cursos', 'direccion')).cursos.find((c) => c.id === creado.id);
  assert.deepEqual(curso.turno, { id: vespertino.id, nombre: 'Vespertino' });
  assert.equal(curso.especialidad.nombre, 'Informática');
  // Con un turno y una especialidad recién sumados, también.
  const otro = await ok('/api/cursos', 'direccion', 'POST', { anio: 6, division: 'Y', turnoId: estado.noche.id, especialidadId: estado.quimica.id }, 201);
  const detalle = await ok(`/api/cursos/${otro.id}/detalle`, 'direccion');
  assert.equal(detalle.curso.turno.nombre, 'Noche');
  assert.equal(detalle.curso.especialidad.nombre, 'Química');
  estado.id = creado.id;
});

test('Al asignar cursos a una persona se ve su turno y especialidad', async () => {
  const opciones = await ok('/api/perfiles/opciones', 'direccion');
  assert.equal(opciones.cursos.find((c) => c.id === estado.id).detalle, 'Vespertino · Informática');
});

test('Editar sin mandar turno ni especialidad los deja como estaban', async () => {
  await ok(`/api/cursos/${estado.id}`, 'direccion', 'PUT', { anio: 6, division: 'Z', preceptorId: null });
  let detalle = await ok(`/api/cursos/${estado.id}/detalle`, 'direccion');
  assert.equal(detalle.curso.turno.nombre, 'Vespertino');
  assert.equal(detalle.curso.especialidad.nombre, 'Informática');

  const tarde = porNombre(estado.opciones.turnos, 'Tarde');
  await ok(`/api/cursos/${estado.id}`, 'direccion', 'PUT', { anio: 6, division: 'Z', turnoId: tarde.id, especialidadId: null });
  detalle = await ok(`/api/cursos/${estado.id}/detalle`, 'direccion');
  assert.equal(detalle.curso.turno.nombre, 'Tarde');
  assert.equal(detalle.curso.especialidad, null);

  // Un curso viejo (sin turno) se sigue pudiendo editar sin elegirlo todavía.
  const v = estado.viejo;
  await ok(`/api/cursos/${v.id}`, 'direccion', 'PUT', { anio: v.anio, division: v.division, preceptorId: null });
});

test('Sin cátedras e inscripciones se pueden crear cursos y editar su preceptor, turno y especialidad', async () => {
  const configurar = async (modulo) => {
    const { version } = await ok('/api/instancia/edicion', 'direccion');
    await ok('/api/instancia/edicion', 'direccion', 'PUT', { version, modulos: { cursos: modulo } });
  };
  await configurar({ funciones: { 'cursos.organizar': false } });
  try {
    const opciones = await ok('/api/gestion-academica/opciones', 'direccion');
    const [primero, segundo] = opciones.preceptores;
    assert.ok(primero && segundo);
    const turno = porNombre(opciones.turnos, 'Mañana');
    const creado = await ok('/api/cursos', 'direccion', 'POST', {
      anio: 2, division: 'QA', turnoId: turno.id, preceptorId: primero.id,
    }, 201);
    const ruta = `/api/cursos/${creado.id}`;
    const datos = { anio: 2, division: 'QA' };
    // Cambiar, quitar y volver a asignar desde el mismo endpoint del detalle.
    for (const preceptorId of [segundo.id, null, primero.id]) {
      await ok(ruta, 'direccion', 'PUT', { ...datos, preceptorId });
      const detalle = await ok(`${ruta}/detalle`, 'direccion');
      assert.equal(detalle.preceptorId, preceptorId);
      assert.equal(detalle.curso.turno.id, turno.id);
    }
    await ok(ruta, 'direccion', 'PUT', {
      ...datos, preceptorId: primero.id, turnoId: estado.noche.id, especialidadId: estado.quimica.id,
    });
    const detalle = await ok(`${ruta}/detalle`, 'direccion');
    assert.equal(detalle.preceptorId, primero.id);
    assert.equal(detalle.curso.turno.id, estado.noche.id);
    assert.equal(detalle.curso.especialidad.id, estado.quimica.id);

    // La función apagada sigue frenando las operaciones que sí le corresponden.
    for (const [sufijo, metodo, cuerpo] of [
      ['inscripciones', 'PUT', { estudianteIds: [] }],
      ['catedras', 'POST', { materiaId: opciones.materias[0].id, profesorId: opciones.profesores[0].id }],
    ]) {
      const respuesta = await request(`${ruta}/${sufijo}`, 'direccion', metodo, cuerpo);
      assert.equal(respuesta.status, 403);
      assert.equal(respuesta.data.funcion, 'cursos.organizar');
    }
    assert.equal((await request(ruta, 'julieta', 'PUT', { ...datos, preceptorId: primero.id })).status, 403);
    assert.equal((await request(ruta, null, 'PUT', { ...datos, preceptorId: primero.id })).status, 401);
    await configurar({ oculto: true });
    const oculto = await request(ruta, 'direccion', 'PUT', { ...datos, preceptorId: primero.id });
    assert.equal(oculto.status, 403);
    assert.equal(oculto.data.codigo, 'modulo-oculto');
  } finally {
    await configurar({ oculto: false, funciones: {} });
  }
});
