// Pruebas del alta completa de perfiles (correo con la terminación de la
// escuela, cursos asignados por rol) y del borrado definitivo desde la papelera.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { crearEntorno } from './entorno.js';

let entorno, db, request, ok, entrar;
const estado = {};

before(async () => {
  entorno = await crearEntorno('nexo-perfiles-alta-');
  ({ db, request, ok, entrar } = entorno);
  await entrar('direccion', 'direccion@sanmartin.nexo.edu');
  await entrar('julieta', 'julieta@sanmartin.nexo.edu');
});

after(async () => {
  await entorno?.cerrar();
});

test('El formulario de alta recibe la terminación del correo, los cursos y las materias', async () => {
  const opciones = await ok('/api/perfiles/opciones', 'direccion');
  // San Martín no tiene dominio en el genoma: sale del que usan sus cuentas.
  assert.equal(opciones.dominio, 'sanmartin.nexo.edu');
  assert.ok(opciones.cursos.length >= 2);
  assert.ok(opciones.materias.length >= 1);
  assert.ok(opciones.cursos.every((c) => /^\d° /.test(c.nombre)));
  await ok('/api/perfiles/opciones', 'julieta', 'GET', undefined, 403);
  estado.opciones = opciones;
});

test('Un estudiante se crea con su curso, y no puede ir en dos', async () => {
  const [c1, c2] = estado.opciones.cursos;
  const dos = await request('/api/perfiles', 'direccion', 'POST', { nombre: 'Tomás Díaz', email: 'tomas.diaz@sanmartin.nexo.edu', rol: 'estudiante', asignaciones: [{ cursoId: c1.id }, { cursoId: c2.id }] });
  assert.equal(dos.status, 400);
  const creado = await ok('/api/perfiles', 'direccion', 'POST', { nombre: 'Tomás Díaz', email: 'tomas.diaz@sanmartin.nexo.edu', rol: 'estudiante', asignaciones: [{ cursoId: c1.id }] }, 201);
  assert.ok(db.prepare('SELECT 1 FROM inscripciones WHERE estudiante_id = ? AND curso_id = ?').get(Number(creado.id), Number(c1.id)));
  const lista = (await ok('/api/perfiles', 'direccion')).perfiles;
  assert.equal(lista.find((p) => p.id === creado.id).asignacion, c1.nombre);
});

test('Un preceptor se crea con varios cursos a cargo', async () => {
  const [c1, c2] = estado.opciones.cursos;
  const creado = await ok('/api/perfiles', 'direccion', 'POST', { nombre: 'Laura Sosa', email: 'laura@sanmartin.nexo.edu', rol: 'preceptor', asignaciones: [{ cursoId: c1.id }, { cursoId: c2.id }] }, 201);
  const cursos = db.prepare('SELECT id FROM cursos WHERE preceptor_id = ? ORDER BY id').all(Number(creado.id)).map((c) => String(c.id));
  assert.deepEqual(cursos.sort(), [c1.id, c2.id].sort());
  // Y la lista muestra sus cursos a cargo: así la dirección distingue a cada preceptor.
  const lista = (await ok('/api/perfiles', 'direccion')).perfiles;
  assert.equal(lista.find((p) => p.id === creado.id).asignacion, `${c1.nombre}, ${c2.nombre}`);
});

test('Un profesor se crea con la materia que da en cada curso', async () => {
  const [c1, c2] = estado.opciones.cursos;
  const [m1] = estado.opciones.materias;
  const sinMateria = await request('/api/perfiles', 'direccion', 'POST', { nombre: 'Pablo Ruiz', email: 'pablo@sanmartin.nexo.edu', rol: 'profesor', asignaciones: [{ cursoId: c1.id }] });
  assert.equal(sinMateria.status, 400);
  assert.match(sinMateria.data.error, /materia/);
  // Nada quedó a medio crear.
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM usuarios WHERE email = 'pablo@sanmartin.nexo.edu'").get().n, 0);

  const creado = await ok('/api/perfiles', 'direccion', 'POST', { nombre: 'Pablo Ruiz', email: 'pablo@sanmartin.nexo.edu', rol: 'profesor', asignaciones: [{ cursoId: c1.id, materiaId: m1.id }, { cursoId: c2.id, materiaId: m1.id }] }, 201);
  const catedras = db.prepare('SELECT curso_id FROM catedras WHERE profesor_id = ? AND materia_id = ?').all(Number(creado.id), Number(m1.id));
  assert.equal(catedras.length, 2);
  estado.profesor = { id: creado.id, email: 'pablo@sanmartin.nexo.edu' };

  const ajeno = await request('/api/perfiles', 'direccion', 'POST', { nombre: 'Nadie', email: 'nadie@sanmartin.nexo.edu', rol: 'profesor', asignaciones: [{ cursoId: '999999', materiaId: m1.id }] });
  assert.equal(ajeno.status, 400);
  const bibliotecario = await request('/api/perfiles', 'direccion', 'POST', { nombre: 'Nadie', email: 'nadie@sanmartin.nexo.edu', rol: 'bibliotecario', asignaciones: [{ cursoId: c1.id }] });
  assert.equal(bibliotecario.status, 400);
});

test('Desde la papelera se borra para siempre y el correo queda libre', async () => {
  const creado = await ok('/api/perfiles', 'direccion', 'POST', { nombre: 'Rosa Paz', email: 'rosa@sanmartin.nexo.edu', rol: 'familia' }, 201);
  // Un perfil activo no se borra directo: primero va a la papelera.
  assert.equal((await request(`/api/perfiles/${creado.id}`, 'direccion', 'DELETE')).status, 400);
  await ok(`/api/perfiles/${creado.id}/papelera`, 'direccion', 'POST');

  const repetido = await request('/api/perfiles', 'direccion', 'POST', { nombre: 'Rosa Paz', email: 'rosa@sanmartin.nexo.edu', rol: 'familia' });
  assert.equal(repetido.status, 409);
  assert.match(repetido.data.error, /papelera/);

  assert.equal((await request(`/api/perfiles/${creado.id}`, 'julieta', 'DELETE')).status, 403);
  const borrado = await ok(`/api/perfiles/${creado.id}`, 'direccion', 'DELETE');
  assert.match(borrado.mensaje, /rosa@sanmartin\.nexo\.edu/);
  // Sin actividad, la fila desaparece de verdad; el historial la recuerda.
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM usuarios WHERE id = ?').get(Number(creado.id)).n, 0);
  assert.ok(db.prepare("SELECT 1 FROM papelera_movimientos WHERE accion = 'purgado' AND afectado_desc LIKE 'Rosa Paz%' AND realizado_por_id IS NOT NULL").get());

  await ok('/api/perfiles', 'direccion', 'POST', { nombre: 'Rosa Paz', email: 'rosa@sanmartin.nexo.edu', rol: 'familia' }, 201);
});

/** Una tarea en la cátedra de ese profesor en ese curso: actividad que la base protege. */
function darTarea(profesorId, cursoId) {
  const catedra = db.prepare('SELECT id FROM catedras WHERE profesor_id = ? AND curso_id = ?').get(Number(profesorId), Number(cursoId));
  db.prepare("INSERT INTO tareas (catedra_id, titulo, fecha_limite) VALUES (?, 'Tarea de prueba', '2026-12-01')").run(catedra.id);
}

test('Un profesor sin actividad se borra entero y suelta sus cátedras', async () => {
  const [c1] = estado.opciones.cursos;
  const [, m2] = estado.opciones.materias;
  const creado = await ok('/api/perfiles', 'direccion', 'POST', { nombre: 'Sin Nada', email: 'sin.nada@sanmartin.nexo.edu', rol: 'profesor', asignaciones: [{ cursoId: c1.id, materiaId: (m2 ?? estado.opciones.materias[0]).id }] }, 201);
  await ok(`/api/perfiles/${creado.id}/papelera`, 'direccion', 'POST');
  await ok(`/api/perfiles/${creado.id}`, 'direccion', 'DELETE');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM usuarios WHERE id = ?').get(Number(creado.id)).n, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM catedras WHERE profesor_id = ?').get(Number(creado.id)).n, 0);
});

test('Con actividad que otros necesitan, la cuenta queda anónima y el correo libre', async () => {
  const { id, email } = estado.profesor;
  const [c1] = estado.opciones.cursos;
  darTarea(id, c1.id);
  await ok(`/api/perfiles/${id}/papelera`, 'direccion', 'POST');
  await ok(`/api/perfiles/${id}`, 'direccion', 'DELETE');

  const fila = db.prepare('SELECT email, nombre, institucion_id FROM usuarios WHERE id = ?').get(Number(id));
  assert.equal(fila.nombre, 'Cuenta eliminada');
  assert.equal(fila.institucion_id, null);
  assert.notEqual(fila.email, email);
  // La cátedra con la tarea sigue ahí (las tareas de los chicos no se pierden);
  // la que no tenía nada se soltó.
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM catedras WHERE profesor_id = ?').get(Number(id)).n, 1);
  assert.ok(!(await ok('/api/perfiles', 'direccion')).perfiles.some((p) => p.id === id));
  assert.equal((await request('/api/sesion', null, 'POST', { email: fila.email, contrasena: '!' })).status, 401);

  await ok('/api/perfiles', 'direccion', 'POST', { nombre: 'Pablo Ruiz', email, rol: 'profesor' }, 201);
});

test('La purga automática también cumple con quien tiene actividad', async () => {
  const [, c2] = estado.opciones.cursos;
  const [m1] = estado.opciones.materias;
  const creado = await ok('/api/perfiles', 'direccion', 'POST', { nombre: 'Ana Vencida', email: 'ana.vencida@sanmartin.nexo.edu', rol: 'profesor', asignaciones: [{ cursoId: c2.id, materiaId: m1.id }] }, 201);
  darTarea(creado.id, c2.id);
  await ok(`/api/perfiles/${creado.id}/papelera`, 'direccion', 'POST');
  db.prepare("UPDATE usuarios SET eliminado_en = datetime('now', '-60 days') WHERE id = ?").run(Number(creado.id));

  // Abrir la lista dispara la purga perezosa.
  const lista = (await ok('/api/perfiles', 'direccion')).perfiles;
  assert.ok(!lista.some((p) => p.id === creado.id));
  assert.equal(db.prepare('SELECT nombre FROM usuarios WHERE id = ?').get(Number(creado.id)).nombre, 'Cuenta eliminada');
  assert.ok(db.prepare("SELECT 1 FROM papelera_movimientos WHERE accion = 'purgado' AND afectado_desc LIKE 'Ana Vencida%' AND realizado_por_id IS NULL").get());
});
