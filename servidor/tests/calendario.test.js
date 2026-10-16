// Pruebas del calendario con jerarquía: repeticiones (motor puro), quién le
// puede mostrar qué a quién según el nivel, quién ve cada evento, "solo este /
// este y los siguientes", confirmaciones, ocultar, avisos, recordatorios,
// choques, exportación .ics, la jerarquía editable y la migración de bases viejas.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { crearEntorno } from './entorno.js';
import { expandir, describirRecurrencia, normalizarRecurrencia, ultimaFecha } from '../agenda.js';
import { migrarBase } from '../migraciones.js';

// ── Motor puro: repeticiones ────────────────────────────────────────────────
const fechas = (evento, desde, hasta, opciones) =>
  expandir({ ...evento, regla: normalizarRecurrencia(evento.regla) }, desde, hasta, opciones).map((o) => o.fecha);

test('Repeticiones: semanas, meses, años, feriados y cantidad de veces', () => {
  const martes = { fecha: '2026-09-01', regla: { frecuencia: 'semanal', hasta: '2026-09-30' } };
  assert.deepEqual(fechas(martes, '2026-09-01', '2026-12-31'), ['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29']);
  const sinFeriado = { ...martes, regla: { ...martes.regla, saltarFeriados: true } };
  assert.deepEqual(fechas(sinFeriado, '2026-09-01', '2026-12-31', { feriados: new Set(['2026-09-15']) }), ['2026-09-01', '2026-09-08', '2026-09-22', '2026-09-29']);
  assert.deepEqual(fechas({ fecha: '2026-09-01', regla: { frecuencia: 'semanal', veces: 3 } }, '2026-01-01', '2027-12-31'), ['2026-09-01', '2026-09-08', '2026-09-15']);
  // Cada 2 semanas, lunes y miércoles (semanas de lunes a domingo).
  assert.deepEqual(
    fechas({ fecha: '2026-10-05', regla: { frecuencia: 'semanal', intervalo: 2, dias: [3, 1], veces: 4 } }, '2026-10-01', '2026-12-31'),
    ['2026-10-05', '2026-10-07', '2026-10-19', '2026-10-21'],
  );
  // El segundo martes y el último viernes de cada mes.
  assert.deepEqual(fechas({ fecha: '2026-10-13', regla: { frecuencia: 'mensual', modoMensual: 'posicion', veces: 3 } }, '2026-01-01', '2027-12-31'), ['2026-10-13', '2026-11-10', '2026-12-08']);
  assert.deepEqual(fechas({ fecha: '2026-10-30', regla: { frecuencia: 'mensual', modoMensual: 'ultimo', veces: 3 } }, '2026-01-01', '2027-12-31'), ['2026-10-30', '2026-11-27', '2026-12-25']);
  // El día 31 se saltea los meses que no lo tienen; el 29/2 los años no bisiestos.
  assert.deepEqual(fechas({ fecha: '2026-08-31', regla: { frecuencia: 'mensual', veces: 3 } }, '2026-01-01', '2027-12-31'), ['2026-08-31', '2026-10-31', '2026-12-31']);
  assert.deepEqual(fechas({ fecha: '2028-02-29', regla: { frecuencia: 'anual', veces: 2 } }, '2028-01-01', '2036-12-31'), ['2028-02-29', '2032-02-29']);
  // Días hábiles.
  assert.deepEqual(fechas({ fecha: '2026-10-02', regla: { frecuencia: 'diaria', soloHabiles: true, veces: 3 } }, '2026-10-01', '2026-10-31'), ['2026-10-02', '2026-10-05', '2026-10-06']);
});

test('Repeticiones: excepciones, eventos de varios días y textos', () => {
  const evento = { fecha: '2026-09-01', regla: normalizarRecurrencia({ frecuencia: 'semanal', veces: 4 }) };
  const excepciones = new Map([
    ['2026-09-08', { cancelada: true, cambios: {} }],
    ['2026-09-15', { cancelada: false, cambios: { fecha: '2026-09-17', titulo: 'Movido' } }],
  ]);
  const ocs = expandir(evento, '2026-09-01', '2026-12-31', { excepciones });
  assert.deepEqual(ocs.map((o) => [o.original, o.fecha]), [['2026-09-01', '2026-09-01'], ['2026-09-15', '2026-09-17'], ['2026-09-22', '2026-09-22']]);
  assert.equal(ocs[1].cambios.titulo, 'Movido');
  // Un evento de tres días que empezó antes del rango igual aparece.
  const largo = expandir({ fecha: '2026-07-20', fecha_fin: '2026-07-22', regla: null }, '2026-07-21', '2026-07-31');
  assert.deepEqual(largo.map((o) => [o.fecha, o.fechaFin]), [['2026-07-20', '2026-07-22']]);
  assert.equal(ultimaFecha({ fecha: '2026-09-01', regla: normalizarRecurrencia({ frecuencia: 'semanal', veces: 3 }) }), '2026-09-15');
  assert.equal(ultimaFecha({ fecha: '2026-09-01', regla: normalizarRecurrencia({ frecuencia: 'semanal' }) }), null);
  assert.equal(
    describirRecurrencia(normalizarRecurrencia({ frecuencia: 'semanal', dias: [1, 3], hasta: '2026-12-15', saltarFeriados: true }), '2026-09-07'),
    'Cada semana los lunes y miércoles, hasta el 15/12/2026 · salta feriados',
  );
  assert.equal(describirRecurrencia(normalizarRecurrencia({ frecuencia: 'mensual', modoMensual: 'posicion' }), '2026-10-13'), 'Cada mes el segundo martes');
  assert.ok(normalizarRecurrencia({ frecuencia: 'cada tanto' }).error);
});

test('Una base vieja se migra sin perder eventos ni a quién le llegaban', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../../base-de-datos/esquema.sql', import.meta.url), 'utf8'));
  db.exec(readFileSync(new URL('../../base-de-datos/datos-iniciales.sql', import.meta.url), 'utf8'));
  // Se la lleva a la forma anterior: eventos sin columnas nuevas y evento_visibilidad.
  db.exec(`
    DROP TABLE evento_avisos; DROP TABLE evento_participantes; DROP TABLE evento_excepciones; DROP TABLE evento_destinos;
    CREATE TABLE eventos_vieja (id INTEGER PRIMARY KEY, institucion_id INTEGER NOT NULL, creador_id INTEGER NOT NULL, titulo TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'evento', descripcion TEXT NOT NULL DEFAULT '', lugar TEXT, fecha TEXT NOT NULL, hora_inicio TEXT, hora_fin TEXT,
      creado_en TEXT NOT NULL DEFAULT (datetime('now')), CHECK (hora_fin IS NULL OR hora_inicio IS NULL OR hora_fin > hora_inicio));
    INSERT INTO eventos_vieja (id, institucion_id, creador_id, titulo, tipo, descripcion, lugar, fecha, hora_inicio, hora_fin)
      SELECT id, institucion_id, creador_id, titulo, tipo, descripcion, lugar, fecha, hora_inicio, hora_fin FROM eventos WHERE id <= 5;
    DROP TABLE eventos; ALTER TABLE eventos_vieja RENAME TO eventos;
    CREATE TABLE evento_visibilidad (id INTEGER PRIMARY KEY, evento_id INTEGER NOT NULL REFERENCES eventos(id), alcance TEXT NOT NULL, curso_id INTEGER, estudiante_id INTEGER);
    INSERT INTO evento_visibilidad (evento_id, alcance, curso_id, estudiante_id) VALUES
      (1, 'todos', NULL, NULL), (2, 'familias-curso', 2, NULL), (3, 'familia-de-estudiante', NULL, 8), (4, 'docentes', NULL, NULL), (5, 'curso', 1, NULL);
    CREATE VIEW v_eventos_vigentes AS SELECT * FROM eventos;
  `);
  migrarBase(db);
  const columnas = db.prepare('PRAGMA table_info(eventos)').all().map((c) => c.name);
  assert.ok(columnas.includes('recurrencia') && columnas.includes('fecha_fin'));
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM eventos').get().n, 5);
  const destinos = (id) => db.prepare('SELECT tipo, valor, curso_id, rol, usuario_id FROM evento_destinos WHERE evento_id = ? ORDER BY id').all(id).map((d) => ({ ...d }));
  assert.deepEqual(destinos(2), [{ tipo: 'curso', valor: null, curso_id: 2, rol: 'familia', usuario_id: null }]);
  assert.deepEqual(destinos(3), [{ tipo: 'familia-de', valor: null, curso_id: null, rol: null, usuario_id: 8 }]);
  assert.deepEqual(destinos(4).map((d) => d.valor), ['profesor', 'preceptor', 'admin-academico']);
  assert.deepEqual(destinos(5).map((d) => d.rol), ['estudiante', 'familia']);
  assert.equal(db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'evento_visibilidad'").get(), undefined);
  // Y ahora acepta un evento de varios días que termina "más temprano" que su hora de inicio.
  db.prepare("INSERT INTO eventos (institucion_id, creador_id, titulo, fecha, fecha_fin, hora_inicio, hora_fin) VALUES (1, 1, 'Campamento', '2026-10-09', '2026-10-11', '18:00', '12:00')").run();
  migrarBase(db); // otra vez: no hace nada
  db.close();
});

// ── API ─────────────────────────────────────────────────────────────────────
let entorno, request, ok, texto, entrar;
const QUIENES = {
  direccion: 'direccion@sanmartin.nexo.edu', garcia: 'garcia@sanmartin.nexo.edu', lombardi: 'lombardi@sanmartin.nexo.edu',
  pereyra: 'pereyra@sanmartin.nexo.edu', martinez: 'martinez@sanmartin.nexo.edu', julieta: 'julieta@sanmartin.nexo.edu',
  martin: 'martin@sanmartin.nexo.edu', valentina: 'valentina@sanmartin.nexo.edu', rossi: 'familia.rossi@sanmartin.nexo.edu',
  biblioteca: 'biblioteca@sanmartin.nexo.edu', centro: 'centro@sanmartin.nexo.edu',
};

before(async () => {
  entorno = await crearEntorno('nexo-calendario-');
  ({ request, ok, texto, entrar } = entorno);
  for (const [quien, email] of Object.entries(QUIENES)) await entrar(quien, email);
});
after(async () => { await entorno?.cerrar(); });

const DIA = '2026-11-18';
const base = (extra = {}) => ({ titulo: 'Evento', fecha: DIA, horaInicio: '10:00', horaFin: '11:00', ...extra });
const crear = (quien, extra, status = 201) => ok('/api/calendario/eventos', quien, 'POST', base(extra), status);
const enRango = async (quien, extra = '') => (await ok(`/api/calendario?desde=2026-11-01&hasta=2026-12-31${extra}`, quien)).eventos;
const ve = async (quien, titulo) => (await enRango(quien)).some((e) => e.titulo === titulo);

test('La jerarquía decide a quién le puede mostrar eventos cada uno', async () => {
  const destinos = await ok('/api/calendario/destinos', 'garcia');
  assert.equal(destinos.nivel.id, 'equipo');
  assert.equal(destinos.todos, false);
  assert.equal(destinos.niveles.find((n) => n.id === 'conduccion').permitido, false);
  assert.equal(destinos.perfiles.find((p) => p.clave === 'admin-academico').permitido, false);
  assert.equal(destinos.perfiles.find((p) => p.clave === 'bibliotecario').permitido, true);
  assert.deepEqual(destinos.cursos.map((c) => c.id).sort(), [1, 2], 'solo los cursos que dicta');
  assert.ok(!destinos.personas.some((p) => p.id === 1), 'la dirección no aparece entre sus invitables');
  assert.ok(!destinos.personas.some((p) => p.id === 13), 'tampoco un alumno de un curso que no dicta');

  // Un profe no le muestra eventos a la dirección, ni a toda la escuela, ni a un curso ajeno.
  for (const audiencia of [
    [{ tipo: 'perfil', valor: 'admin-academico' }],
    [{ tipo: 'todos' }],
    [{ tipo: 'nivel', valor: 'conduccion' }],
    [{ tipo: 'persona', usuarioId: 1 }],
    [{ tipo: 'curso', cursoId: 3, rol: 'estudiante' }],
  ]) {
    const r = await request('/api/calendario/eventos', 'garcia', 'POST', base({ titulo: 'Prohibido', audiencia }));
    assert.equal(r.status, 403, JSON.stringify(audiencia) + ' → ' + JSON.stringify(r.data));
  }

  // Sí: sus alumnos de 4°B y su preceptor (el ejemplo del pedido).
  await crear('garcia', { titulo: 'Evaluación de funciones', tipo: 'examen', audiencia: [{ tipo: 'curso', cursoId: 2, rol: 'estudiante' }, { tipo: 'curso', cursoId: 2, rol: 'preceptor' }] });
  assert.equal(await ve('julieta', 'Evaluación de funciones'), true);
  assert.equal(await ve('pereyra', 'Evaluación de funciones'), true);
  assert.equal(await ve('garcia', 'Evaluación de funciones'), true);
  for (const quien of ['rossi', 'valentina', 'direccion', 'lombardi', 'martinez']) {
    assert.equal(await ve(quien, 'Evaluación de funciones'), false, quien);
  }
  // A su mismo nivel: la biblioteca.
  await crear('garcia', { titulo: 'Préstamo de calculadoras', audiencia: [{ tipo: 'perfil', valor: 'bibliotecario' }] });
  assert.equal(await ve('biblioteca', 'Préstamo de calculadoras'), true);
  // Solo él.
  await crear('garcia', { titulo: 'Corregir parciales', audiencia: [] });
  assert.equal(await ve('garcia', 'Corregir parciales'), true);
  assert.equal(await ve('pereyra', 'Corregir parciales'), false);
});

test('Estudiantes y familias crean eventos que solo ven ellos', async () => {
  const d = await ok('/api/calendario/destinos', 'julieta');
  assert.equal(d.comparte, false);
  await crear('julieta', { titulo: 'Estudiar para Biología' });
  const r = await request('/api/calendario/eventos', 'julieta', 'POST', base({ titulo: 'Fiesta', audiencia: [{ tipo: 'persona', usuarioId: 9 }] }));
  assert.equal(r.status, 403);
  assert.match(r.data.error, /personales/);
  await crear('rossi', { titulo: 'Turno con el pediatra', obligatorio: true, pideConfirmacion: true });
  const propio = (await enRango('rossi')).find((e) => e.titulo === 'Turno con el pediatra');
  assert.equal(propio.personal, true);
  assert.equal(propio.obligatorio, false, 'lo que es para otros no aplica a un evento personal');
  for (const quien of ['martin', 'direccion', 'garcia']) assert.equal(await ve(quien, 'Estudiar para Biología'), false, quien);
  // Ni la supervisión de la dirección ve lo personal.
  const supervision = await enRango('direccion', '&supervision=1');
  assert.equal(supervision.some((e) => e.titulo === 'Estudiar para Biología'), false);
  const delProfe = supervision.find((e) => e.titulo === 'Evaluación de funciones');
  assert.equal(delProfe?.supervision, true, 'la dirección supervisa lo que el equipo le muestra a otros');
});

test('Arriba: la dirección a toda la escuela; el centro también a la dirección', async () => {
  await crear('direccion', { titulo: 'Jornada institucional', tipo: 'institucional', audiencia: [{ tipo: 'todos' }], obligatorio: true });
  for (const quien of ['julieta', 'rossi', 'biblioteca', 'centro', 'pereyra']) assert.equal(await ve(quien, 'Jornada institucional'), true, quien);
  await crear('centro', { titulo: 'Reunión con la dirección', audiencia: [{ tipo: 'perfil', valor: 'admin-academico' }] });
  assert.equal(await ve('direccion', 'Reunión con la dirección'), true);
  // El formato anterior (visibilidades) se sigue entendiendo.
  await ok('/api/calendario/eventos', 'direccion', 'POST', { ...base({ titulo: 'Para las familias de 4°B' }), visibilidades: [{ alcance: 'familias-curso', cursoId: 2 }] }, 201);
  assert.equal(await ve('rossi', 'Para las familias de 4°B'), true);
  assert.equal(await ve('julieta', 'Para las familias de 4°B'), false);
});

test('La jerarquía se edita desde el modo edición y se aplica al instante', async () => {
  const e = await ok('/api/instancia/edicion', 'direccion');
  const niveles = e.jerarquia.niveles.map((n) => (n.id === 'equipo' ? { ...n, politica: 'abajo' } : n));
  const guardado = await ok('/api/instancia/edicion', 'direccion', 'PUT', {
    version: e.version,
    jerarquia: { niveles, perfiles: { bibliotecario: 'conduccion', 'admin-academico': 'comunidad' } },
  });
  assert.equal(guardado.edicion.jerarquia.perfiles['admin-academico'], 'conduccion', 'la dirección queda siempre arriba');
  assert.ok(guardado.cambios.some((c) => c.texto.includes('Bibliotecario pasa al nivel «Dirección y Centro de Estudiantes»')));
  assert.ok(guardado.cambios.some((c) => c.texto.includes('comparte solo con los de abajo')));
  // Ahora el profe ya no le muestra eventos a otros profes (su nivel) ni a la biblioteca (que subió).
  for (const valor of ['profesor', 'bibliotecario']) {
    const r = await request('/api/calendario/eventos', 'garcia', 'POST', base({ titulo: 'No', audiencia: [{ tipo: 'perfil', valor }] }));
    assert.equal(r.status, 403, valor);
  }
  await crear('garcia', { titulo: 'Para estudiantes', audiencia: [{ tipo: 'perfil', valor: 'estudiante' }] });
  // Y la biblioteca, ahora arriba, sí llega a la dirección.
  await crear('biblioteca', { titulo: 'Inventario anual', audiencia: [{ tipo: 'perfil', valor: 'admin-academico' }] });
  // Se deja como estaba.
  const actual = await ok('/api/instancia/edicion', 'direccion');
  await ok('/api/instancia/edicion', 'direccion', 'PUT', {
    version: actual.version,
    jerarquia: { niveles: e.jerarquia.niveles, perfiles: { bibliotecario: 'equipo' } },
  });
});

test('Repeticiones por la API: solo este, este y los siguientes, toda la serie', async () => {
  const { id } = await crear('garcia', {
    titulo: 'Taller de álgebra', tipo: 'clase', fecha: '2026-11-03', horaInicio: '15:00', horaFin: '16:00',
    recurrencia: { frecuencia: 'semanal', dias: [2], veces: 6 },
    audiencia: [{ tipo: 'curso', cursoId: 2, rol: 'estudiante' }],
  });
  const delTaller = async (quien = 'julieta') => (await enRango(quien)).filter((e) => e.titulo.startsWith('Taller de álgebra') || e.titulo === 'Taller intensivo');
  let ocs = await delTaller();
  assert.deepEqual(ocs.map((o) => o.fecha), ['2026-11-03', '2026-11-10', '2026-11-17', '2026-11-24', '2026-12-01', '2026-12-08']);
  assert.equal(ocs[0].recurrenciaTexto, 'Cada semana los martes, 6 veces');

  // Solo este: cambia el título y la hora del 10/11; el 17/11 se cancela.
  await ok(`/api/calendario/eventos/${id}`, 'garcia', 'PUT', { ...base({ titulo: 'Taller de álgebra (aula 5)', fecha: '2026-11-10', horaInicio: '16:00', horaFin: '17:00', tipo: 'clase', recurrencia: { frecuencia: 'semanal', dias: [2], veces: 6 } }), alcance: 'este', ocurrencia: '2026-11-10' });
  await ok(`/api/calendario/eventos/${id}?alcance=este&ocurrencia=2026-11-17`, 'garcia', 'DELETE');
  ocs = await delTaller();
  assert.deepEqual(ocs.map((o) => o.fecha), ['2026-11-03', '2026-11-10', '2026-11-24', '2026-12-01', '2026-12-08']);
  assert.equal(ocs[1].titulo, 'Taller de álgebra (aula 5)');
  assert.equal(ocs[1].horaInicio, '16:00');
  assert.equal(ocs[1].modificada, true);

  // Este y los siguientes: desde el 01/12 pasa a llamarse distinto (nace otra serie).
  const r = await ok(`/api/calendario/eventos/${id}`, 'garcia', 'PUT', { ...base({ titulo: 'Taller intensivo', fecha: '2026-12-01', horaInicio: '15:00', horaFin: '16:30', tipo: 'clase', recurrencia: { frecuencia: 'semanal', dias: [2], veces: 6 } }), alcance: 'siguientes', ocurrencia: '2026-12-01' });
  assert.notEqual(r.id, id);
  ocs = await delTaller();
  assert.deepEqual(ocs.map((o) => [o.fecha, o.titulo]), [
    ['2026-11-03', 'Taller de álgebra'], ['2026-11-10', 'Taller de álgebra (aula 5)'], ['2026-11-24', 'Taller de álgebra'],
    ['2026-12-01', 'Taller intensivo'], ['2026-12-08', 'Taller intensivo'],
  ]);
  // Una fecha que no es de la serie no se toca; y un alumno no puede editarla.
  assert.equal((await request(`/api/calendario/eventos/${id}?alcance=este&ocurrencia=2026-11-05`, 'garcia', 'DELETE')).status, 400);
  assert.equal((await request(`/api/calendario/eventos/${id}`, 'julieta', 'DELETE')).status, 403);
  // Toda la serie.
  await ok(`/api/calendario/eventos/${r.id}`, 'garcia', 'DELETE');
  assert.deepEqual((await delTaller()).map((o) => o.fecha), ['2026-11-03', '2026-11-10', '2026-11-24']);
});

test('Confirmaciones, ocultar y avisar a los destinatarios', async () => {
  const { id } = await crear('garcia', {
    titulo: 'Salida al museo', tipo: 'salida', pideConfirmacion: true, avisar: true,
    audiencia: [{ tipo: 'curso', cursoId: 2, rol: 'estudiante' }],
  });
  const notifs = (await ok('/api/notificaciones', 'julieta')).notificaciones;
  assert.ok(notifs.some((n) => n.titulo === 'Evento nuevo en tu calendario' && n.cuerpo.includes('Salida al museo')));
  await ok(`/api/calendario/eventos/${id}/respuesta`, 'julieta', 'POST', { respuesta: 'si' });
  await ok(`/api/calendario/eventos/${id}/respuesta`, 'martin', 'POST', { respuesta: 'no' });
  assert.equal((await request(`/api/calendario/eventos/${id}/respuesta`, 'valentina', 'POST', { respuesta: 'si' })).status, 404, 'no lo ve');
  const c = await ok(`/api/calendario/eventos/${id}/confirmaciones`, 'garcia');
  assert.deepEqual(c.resumen, { si: 1, quizas: 0, no: 1, pendientes: 2, total: 4 });
  assert.equal((await request(`/api/calendario/eventos/${id}/confirmaciones`, 'julieta')).status, 403);
  const mia = (await enRango('julieta')).find((e) => e.eventoId === id);
  assert.equal(mia.miRespuesta, 'si');

  await ok(`/api/calendario/eventos/${id}/preferencias`, 'julieta', 'POST', { oculto: true, recordatorios: [30, 1440] });
  const oculta = (await enRango('julieta')).find((e) => e.eventoId === id);
  assert.equal(oculta.oculto, true);
  assert.deepEqual(oculta.misRecordatorios, [30, 1440]);
  const jornada = (await enRango('julieta')).find((e) => e.titulo === 'Jornada institucional');
  assert.equal((await request(`/api/calendario/eventos/${jornada.eventoId}/preferencias`, 'julieta', 'POST', { oculto: true })).status, 400, 'lo obligatorio no se oculta');
});

test('Recordatorios: llegan cuando faltan los minutos elegidos', async () => {
  const pronto = new Date(Date.now() + 10 * 60 * 1000);
  const dos = (n) => String(n).padStart(2, '0');
  const fecha = `${pronto.getFullYear()}-${dos(pronto.getMonth() + 1)}-${dos(pronto.getDate())}`;
  const hora = `${dos(pronto.getHours())}:${dos(pronto.getMinutes())}`;
  await ok('/api/calendario/eventos', 'pereyra', 'POST', {
    titulo: 'Firma de boletines', fecha, horaInicio: hora, recordatorios: [15],
    audiencia: [{ tipo: 'curso', cursoId: 2, rol: 'familia' }],
  }, 201);
  let llego = false;
  for (let i = 0; i < 30 && !llego; i++) {
    await new Promise((r) => setTimeout(r, 100));
    llego = (await ok('/api/notificaciones', 'rossi')).notificaciones.some((n) => n.titulo === 'Recordatorio: Firma de boletines');
  }
  assert.ok(llego, 'la familia recibe el recordatorio');
  const propios = (await ok('/api/notificaciones', 'pereyra')).notificaciones.filter((n) => n.titulo === 'Recordatorio: Firma de boletines');
  assert.equal(propios.length, 1, 'quien lo creó también, una sola vez');
});

test('Revisar antes de guardar: a cuántos llega y con qué choca (sin mostrar lo ajeno)', async () => {
  const r = await ok('/api/calendario/revisar', 'lombardi', 'POST', base({
    titulo: 'Evaluación de Historia', horaInicio: '10:30', horaFin: '11:30',
    audiencia: [{ tipo: 'curso', cursoId: 2, rol: 'estudiante' }],
  }));
  assert.equal(r.personas, 4);
  const choque = r.choques.find((c) => c.categoria === 'examen');
  assert.ok(choque, JSON.stringify(r.choques));
  assert.equal(choque.visible, false);
  assert.equal(choque.titulo, 'Evaluación (Profesores, biblioteca y preceptoría)');
  assert.equal(choque.afectados, 4);
  const sinChoque = await ok('/api/calendario/revisar', 'lombardi', 'POST', base({ horaInicio: '13:00', horaFin: '14:00', audiencia: [{ tipo: 'curso', cursoId: 2, rol: 'estudiante' }] }));
  assert.ok(!sinChoque.choques.some((c) => c.categoria === 'examen'));
});

test('Validaciones, eventos de varios días y exportación .ics', async () => {
  for (const [cuerpo, motivo] of [
    [base({ horaInicio: '11:00', horaFin: '10:00' }), /fin/],
    [base({ recurrencia: { frecuencia: 'nunca' } }), /repite/],
    [base({ recurrencia: { frecuencia: 'semanal', hasta: '2026-01-01' } }), /antes/],
    [base({ enlace: 'javascript:alert(1)' }), /enlace/],
    [base({ fecha: '2026-02-30' }), /fecha/],
  ]) {
    const r = await request('/api/calendario/eventos', 'garcia', 'POST', cuerpo);
    assert.equal(r.status, 400, JSON.stringify(cuerpo));
    assert.match(r.data.error, motivo);
  }
  await crear('direccion', { titulo: 'Campamento de 4°', fecha: '2026-11-26', fechaFin: '2026-11-28', horaInicio: '18:00', horaFin: '12:00', audiencia: [{ tipo: 'curso', cursoId: 2, rol: 'estudiante' }] });
  const campamento = (await enRango('julieta')).find((e) => e.titulo === 'Campamento de 4°');
  assert.equal(campamento.fechaFin, '2026-11-28');

  const ics = await texto('/api/calendario/exportar.ics?desde=2026-11-01&hasta=2026-12-31', 'julieta');
  assert.equal(ics.status, 200);
  assert.match(ics.tipo, /text\/calendar/);
  assert.match(ics.cuerpo, /BEGIN:VCALENDAR/);
  assert.match(ics.cuerpo, /SUMMARY:Campamento de 4°/);
  assert.match(ics.cuerpo, /DTSTART:20261126T180000/);
  assert.doesNotMatch(ics.cuerpo, /Corregir parciales/, 'lo personal de otros no se exporta');
});
