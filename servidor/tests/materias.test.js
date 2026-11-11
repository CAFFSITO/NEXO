// Pruebas de la sección Materias: cada materia con sus detalles, su temario
// opcional y los profesores que la dan; y en Cursos, elegir "materia — profesor"
// de esa lista, ver lo asignado y quitarlo.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { crearEntorno } from './entorno.js';

let entorno, request, ok, entrar, db;
const estado = {};
const GARCIA = '2', LOMBARDI = '3', MENDEZ = '4';

before(async () => {
  entorno = await crearEntorno('nexo-materias-');
  ({ request, ok, entrar, db } = entorno);
  await entrar('direccion', 'direccion@sanmartin.nexo.edu');
  await entrar('garcia', 'garcia@sanmartin.nexo.edu');
  await entrar('julieta', 'julieta@sanmartin.nexo.edu');
});

after(async () => {
  await entorno?.cerrar();
});

const listar = () => ok('/api/gestion-academica/materias', 'direccion');
const porNombre = (lista, nombre, anio = null) => lista.find((m) => m.nombre === nombre && m.anio === anio);

test('Las cátedras que ya existían cargan solas los profesores de cada materia', async () => {
  const { materias, profesores, anios } = await listar();
  const matematica = porNombre(materias, 'Matemática');
  assert.deepEqual(matematica.profesores.map((p) => p.id), [GARCIA]);
  assert.deepEqual(matematica.cursos.map((c) => c.curso), ['4° A', '4° B']);
  assert.equal(matematica.temario.length, 3);
  assert.deepEqual(porNombre(materias, 'Inglés').profesores, []);
  assert.ok(profesores.some((p) => p.id === LOMBARDI));
  assert.ok(anios.min >= 1 && anios.max >= anios.min);
  // Solo la dirección.
  assert.equal((await request('/api/gestion-academica/materias', 'julieta')).status, 403);
  assert.equal((await request('/api/gestion-academica/materias', 'garcia')).status, 403);
});

test('La dirección crea una materia con todos sus detalles, profesores y temario', async () => {
  const creada = await ok('/api/materias', 'direccion', 'POST', {
    nombre: '  Matemática  ', anio: 4, area: 'Ciencias exactas', horasSemanales: 5,
    descripcion: 'Álgebra y funciones.', objetivos: 'Resolver problemas.', evaluacion: 'Trabajos prácticos.', bibliografia: 'Manual 4',
    profesorIds: [GARCIA, LOMBARDI],
    temario: [{ titulo: 'Funciones', contenidos: 'Lineal y cuadrática' }, { titulo: 'Límites' }],
  }, 201);
  const m = porNombre((await listar()).materias, 'Matemática', 4);
  assert.equal(m.id, creada.id);
  assert.equal(m.area, 'Ciencias exactas');
  assert.equal(m.horasSemanales, 5);
  assert.equal(m.bibliografia, 'Manual 4');
  assert.deepEqual(m.profesores.map((p) => p.id).sort(), [GARCIA, LOMBARDI]);
  assert.deepEqual(m.temario.map((u) => [u.numero, u.titulo, u.contenidos]), [[1, 'Funciones', 'Lineal y cuadrática'], [2, 'Límites', '']]);
  assert.deepEqual(m.cursos, []);
  estado.mate4 = m;

  // Solo el nombre es obligatorio.
  const simple = await ok('/api/materias', 'direccion', 'POST', { nombre: 'Taller de radio' }, 201);
  estado.radio = simple.id;
  // Mismo nombre y año → repetida; mismo nombre sin año ya existe.
  assert.equal((await request('/api/materias', 'direccion', 'POST', { nombre: 'matemática', anio: 4 })).status, 409);
  assert.equal((await request('/api/materias', 'direccion', 'POST', { nombre: 'Matemática' })).status, 409);
  await ok('/api/materias', 'direccion', 'POST', { nombre: 'Matemática', anio: 5 }, 201);
});

test('Lo que no es válido se rechaza con un mensaje claro', async () => {
  const pedir = (body) => request('/api/materias', 'direccion', 'POST', body);
  assert.equal((await pedir({ nombre: '' })).status, 400);
  assert.equal((await pedir({ nombre: 'X', anio: 99 })).status, 400);
  assert.equal((await pedir({ nombre: 'X', horasSemanales: 0 })).status, 400);
  assert.equal((await pedir({ nombre: 'X', temario: [{ titulo: '' }] })).status, 400);
  // Un estudiante no es un profesor.
  assert.equal((await pedir({ nombre: 'X', profesorIds: ['8'] })).status, 400);
  assert.equal((await request('/api/materias', 'julieta', 'POST', { nombre: 'X' })).status, 403);
  assert.ok(!porNombre((await listar()).materias, 'X'));
});

test('Editar el temario conserva las unidades que siguen y suelta las metas de las que se quitan', async () => {
  const historia = porNombre((await listar()).materias, 'Historia');
  const [mayo, segunda] = historia.temario;
  // La meta 1 de Julieta apunta a la unidad "La Revolución de Mayo".
  assert.equal(db.prepare('SELECT unidad_id FROM metas WHERE id = 1').get().unidad_id, Number(mayo.id));
  await ok(`/api/materias/${historia.id}`, 'direccion', 'PUT', {
    temario: [{ id: segunda.id, titulo: segunda.titulo + ' (ampliada)', contenidos: 'Nuevos contenidos' }, { titulo: 'Unidad nueva' }],
  });
  const despues = porNombre((await listar()).materias, 'Historia');
  assert.equal(despues.temario[0].id, segunda.id);
  assert.equal(despues.temario[0].numero, 1);
  assert.equal(despues.temario[0].contenidos, 'Nuevos contenidos');
  assert.equal(despues.temario[1].titulo, 'Unidad nueva');
  const meta = db.prepare('SELECT materia_id, unidad_id FROM metas WHERE id = 1').get();
  assert.equal(meta.unidad_id, null);
  assert.equal(meta.materia_id, Number(historia.id));
  // Lo que no se manda queda como estaba.
  assert.deepEqual(despues.profesores.map((p) => p.id), [LOMBARDI]);
  assert.equal(despues.nombre, 'Historia');
});

test('En un curso se elige "materia — profesor" y queda en la lista del curso', async () => {
  const curso = '1'; // 4° A
  const asignada = await ok(`/api/cursos/${curso}/catedras`, 'direccion', 'POST', { materiaId: estado.mate4.id, profesorId: LOMBARDI }, 201);
  assert.equal(asignada.reemplazo, null);
  let detalle = await ok(`/api/cursos/${curso}/detalle`, 'direccion');
  const fila = detalle.catedras.find((c) => c.id === asignada.id);
  assert.equal(fila.profesorId, LOMBARDI);
  assert.equal(fila.materiaAnio, 4);
  // La misma materia con otro profesor la cambia (y dice a quién reemplazó).
  const cambio = await ok(`/api/cursos/${curso}/catedras`, 'direccion', 'POST', { materiaId: estado.mate4.id, profesorId: GARCIA }, 201);
  assert.equal(cambio.id, asignada.id);
  assert.equal(cambio.reemplazo, 'Prof. Silvia Lombardi');
  detalle = await ok(`/api/cursos/${curso}/detalle`, 'direccion');
  assert.equal(detalle.catedras.find((c) => c.id === asignada.id).profesorId, GARCIA);
  const m = porNombre((await listar()).materias, 'Matemática', 4);
  assert.deepEqual(m.cursos.map((c) => [c.curso, c.profesorId]), [['4° A', GARCIA]]);
  estado.catedraNueva = asignada.id;

  // Asignar a alguien que no estaba en la materia lo suma a su lista.
  await ok(`/api/cursos/${curso}/catedras`, 'direccion', 'POST', { materiaId: estado.radio, profesorId: MENDEZ }, 201);
  const radio = (await listar()).materias.find((x) => x.id === estado.radio);
  assert.deepEqual(radio.profesores.map((p) => p.id), [MENDEZ]);
});

test('Mientras un profesor da la materia en un curso, no se lo puede sacar de la materia', async () => {
  const r = await request(`/api/materias/${estado.mate4.id}`, 'direccion', 'PUT', { profesorIds: [LOMBARDI] });
  assert.equal(r.status, 409);
  assert.match(r.data.error, /García.*4° A/);
  // Lombardi no da Matemática 4 en ningún curso: sale sin problema.
  await ok(`/api/materias/${estado.mate4.id}`, 'direccion', 'PUT', { profesorIds: [GARCIA] });
  assert.deepEqual(porNombre((await listar()).materias, 'Matemática', 4).profesores.map((p) => p.id), [GARCIA]);
});

test('El profesor ve el programa y el temario de referencia; el estudiante no', async () => {
  await ok(`/api/materias/${estado.mate4.id}`, 'direccion', 'PUT', { descripcion: 'Para referencia del docente' });
  const delProfe = await ok(`/api/materias/${estado.catedraNueva}/detalle`, 'garcia');
  assert.equal(delProfe.referencia.descripcion, 'Para referencia del docente');
  assert.equal(delProfe.referencia.temario.length, 2);
  assert.equal(delProfe.referencia.anio, 4);
  // Julieta está en 4° B: entra a Matemática 4° B (cátedra 1) sin referencia.
  const delAlumno = await ok('/api/materias/1/detalle', 'julieta');
  assert.equal(delAlumno.referencia, undefined);
});

test('Quitar una materia del curso: sin trabajo se quita, con tareas no', async () => {
  // Matemática 4° B (cátedra 1) tiene tareas.
  const conTareas = await request('/api/cursos/2/catedras/1', 'direccion', 'DELETE');
  assert.equal(conTareas.status, 409);
  assert.match(conTareas.data.error, /tareas/);
  // De otro curso → no existe ahí.
  assert.equal((await request(`/api/cursos/2/catedras/${estado.catedraNueva}`, 'direccion', 'DELETE')).status, 404);
  await ok(`/api/cursos/1/catedras/${estado.catedraNueva}`, 'direccion', 'DELETE');
  const detalle = await ok('/api/cursos/1/detalle', 'direccion');
  assert.ok(!detalle.catedras.some((c) => c.id === estado.catedraNueva));
  assert.equal((await request('/api/cursos/1/catedras/1', 'julieta', 'DELETE')).status, 403);
});

test('Una materia que se da en un curso no se borra; sin cursos, sí', async () => {
  const matematica = porNombre((await listar()).materias, 'Matemática');
  const r = await request(`/api/materias/${matematica.id}`, 'direccion', 'DELETE');
  assert.equal(r.status, 409);
  assert.match(r.data.error, /4° A, 4° B/);
  await ok(`/api/materias/${estado.mate4.id}`, 'direccion', 'DELETE');
  const despues = await listar();
  assert.ok(!porNombre(despues.materias, 'Matemática', 4));
  assert.equal(db.prepare('SELECT COUNT(*) n FROM unidades WHERE materia_id = ?').get(Number(estado.mate4.id)).n, 0);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM materia_profesores WHERE materia_id = ?').get(Number(estado.mate4.id)).n, 0);
  assert.equal((await request(`/api/materias/${estado.mate4.id}`, 'direccion', 'DELETE')).status, 404);
});

test('Al dar de alta un profesor con su materia, queda en la lista de esa materia', async () => {
  const opciones = await ok('/api/perfiles/opciones', 'direccion');
  const ingles = opciones.materias.find((m) => m.nombre === 'Inglés');
  const nuevo = await ok('/api/perfiles', 'direccion', 'POST', {
    nombre: 'Prof. Ana Inglés', email: 'ana.ingles@sanmartin.nexo.edu', rol: 'profesor',
    asignaciones: [{ cursoId: '3', materiaId: ingles.id }],
  }, 201);
  const m = porNombre((await listar()).materias, 'Inglés');
  assert.deepEqual(m.profesores.map((p) => p.id), [nuevo.id]);
  // En la lista de materias del alta, la de un año dice cuál.
  assert.ok((await ok('/api/perfiles/opciones', 'direccion')).materias.some((x) => x.nombre === 'Matemática · 5° año'));
});

test('Duplicar una materia para otro año: la copia se crea; para el mismo año, no', async () => {
  const base = { nombre: 'Historia', area: 'Sociales', profesorIds: [LOMBARDI], temario: [{ titulo: 'Revolución de Mayo' }] };
  await ok('/api/materias', 'direccion', 'POST', { ...base, anio: 3 }, 201);
  const copia = await ok('/api/materias', 'direccion', 'POST', { ...base, anio: 4 }, 201);
  const m = (await listar()).materias.find((x) => x.id === copia.id);
  assert.equal(m.anio, 4);
  assert.deepEqual(m.profesores.map((p) => p.id), [LOMBARDI]);
  assert.deepEqual(m.temario.map((u) => u.titulo), ['Revolución de Mayo']);
  const repetida = await request('/api/materias', 'direccion', 'POST', { ...base, anio: 3 });
  assert.equal(repetida.status, 409);
  assert.match(repetida.data.error, /Historia de 3° año/);
});

test('En Perfiles, cada profesor muestra sus materias y en qué cursos las da', async () => {
  const { perfiles } = await ok('/api/perfiles', 'direccion');
  const garcia = perfiles.find((p) => p.id === GARCIA);
  const matematica = garcia.materias.find((m) => m.nombre === 'Matemática');
  assert.deepEqual(matematica.cursos, ['4° A', '4° B']);
  const lombardi = perfiles.find((p) => p.id === LOMBARDI);
  const historia = lombardi.materias.filter((m) => m.nombre.startsWith('Historia ·'));
  assert.deepEqual(historia.map((m) => [m.nombre, m.cursos]), [['Historia · 3° año', []], ['Historia · 4° año', []]]);
  assert.match(lombardi.asignacion, /Historia · 3° año/);
  // Solo los profesores traen la lista.
  assert.ok(perfiles.filter((p) => p.rol !== 'profesor').every((p) => p.materias === undefined));
});
