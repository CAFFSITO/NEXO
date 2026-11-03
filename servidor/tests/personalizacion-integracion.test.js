// Solo bases y almacenes temporales: nunca usa ni modifica datos de la instalación.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearEntorno } from './entorno.js';
import { revisarRetencion } from '../retencion.js';
import { olvidarGenoma } from '../genoma.js';

test('Personalización integrada: herencia, aislamiento, versiones y conservación', async (t) => {
  const entorno = await crearEntorno('nexo-personalizacion-', (db) => {
    db.prepare("INSERT INTO instituciones (id, nombre, ciclo_lectivo) VALUES (991, 'Escuela aislada', 2026)").run();
    db.prepare(`INSERT INTO usuarios (institucion_id, email, hash_contrasena, nombre, rol)
      SELECT 991, 'estudiante@aislada.test', hash_contrasena, 'Estudiante aislado', 'estudiante'
      FROM usuarios WHERE id = 8`).run();
  });
  const { ok, request, entrar, db } = entorno;
  try {
    for (const [sesion, email] of [
      ['maestro', 'sistema@nexo.edu'], ['direccion', 'direccion@sanmartin.nexo.edu'],
      ['julieta', 'julieta@sanmartin.nexo.edu'], ['martin', 'martin@sanmartin.nexo.edu'],
      ['profesor', 'garcia@sanmartin.nexo.edu'],
      ['aislado', 'estudiante@aislada.test'],
    ]) await entrar(sesion, email);

    async function editar(personalizacion) {
      const { version } = await ok('/api/instancia/edicion', 'direccion');
      return ok('/api/instancia/edicion', 'direccion', 'PUT', { version, personalizacion });
    }
    async function personal(preferencias, sesion = 'julieta') {
      const { version } = await ok('/api/cuenta/preferencias', sesion);
      return ok('/api/cuenta/preferencias', sesion, 'PUT', { version, preferencias });
    }

    await t.test('Una instancia anterior conserva valores compatibles sin overrides personales', async () => {
      const cuenta = await ok('/api/cuenta/preferencias', 'julieta');
      assert.deepEqual(cuenta.preferencias, {});
      assert.deepEqual(cuenta.efectivas, { densidad: 'comoda', movimiento: 'sistema', tamanoTexto: 100 });
      assert.equal(typeof cuenta.version, 'number');
      const instancia = await ok('/api/instancia', 'julieta');
      assert.deepEqual(instancia.personalizacion, cuenta.efectivas);
      assert.deepEqual(instancia.academico, { anioMin: 1, anioMax: 7 });
      const detalle = await ok('/api/maestro/instancias/1', 'maestro');
      for (const regla of Object.values(detalle.genoma.personalizacion.retencion)) {
        assert.deepEqual(regla, { modo: 'conservar', dias: null });
      }
    });

    await t.test('Institución, perfil y persona se combinan sin contaminar usuarios del mismo perfil', async () => {
      await editar({ institucion: { densidad: 'compacta', tamanoTexto: 110 }, perfiles: { estudiante: { tamanoTexto: 120 } } });
      assert.equal((await ok('/api/instancia', 'profesor')).personalizacion.tamanoTexto, 110);
      assert.equal((await ok('/api/instancia', 'martin')).personalizacion.tamanoTexto, 120);
      const propia = await personal({ tamanoTexto: 130, movimiento: 'reducido' });
      assert.deepEqual(propia.efectivas, { densidad: 'compacta', movimiento: 'reducido', tamanoTexto: 130 });
      for (let i = 0; i < 2; i++) {
        assert.equal((await ok('/api/instancia', 'julieta')).personalizacion.tamanoTexto, 130);
        assert.equal((await ok('/api/instancia', 'martin')).personalizacion.tamanoTexto, 120);
      }
      assert.deepEqual((await ok('/api/cuenta/preferencias', 'martin')).preferencias, {});
      assert.deepEqual((await ok('/api/instancia', 'aislado')).personalizacion, { densidad: 'comoda', movimiento: 'sistema', tamanoTexto: 100 });
      await personal({ tamanoTexto: 145 }, 'aislado');
      assert.equal((await ok('/api/instancia', 'julieta')).personalizacion.tamanoTexto, 130);
      assert.equal((await ok('/api/instancia', 'aislado')).personalizacion.tamanoTexto, 145);
      await personal({});
      assert.equal((await ok('/api/instancia', 'julieta')).personalizacion.tamanoTexto, 120);
      await editar({ perfiles: { estudiante: { tamanoTexto: 125 } } });
      assert.equal((await ok('/api/instancia', 'julieta')).personalizacion.tamanoTexto, 125);
    });

    await t.test('Una versión vieja no sobrescribe preferencias ni la configuración institucional', async () => {
      const anterior = await ok('/api/cuenta/preferencias', 'julieta');
      await personal({ densidad: 'comoda' });
      await ok('/api/cuenta/preferencias', 'julieta', 'PUT', { version: anterior.version, preferencias: { tamanoTexto: 150 } }, 409);
      assert.deepEqual((await ok('/api/cuenta/preferencias', 'julieta')).preferencias, { densidad: 'comoda' });
      const edicion = await ok('/api/instancia/edicion', 'direccion');
      await editar({ institucion: { tamanoTexto: 115 } });
      await ok('/api/instancia/edicion', 'direccion', 'PUT', { version: edicion.version, personalizacion: { institucion: { tamanoTexto: 140 } } }, 409);
    });

    await t.test('Valida preferencias, rango académico y retención y no concede acceso por preferencia', async () => {
      for (const preferencias of [{ tamanoTexto: 99 }, { tamanoTexto: 151 }, { densidad: 'inexistente' }, { movimiento: true }, { administrador: true }, []]) {
        const { version } = await ok('/api/cuenta/preferencias', 'julieta');
        await ok('/api/cuenta/preferencias', 'julieta', 'PUT', { version, preferencias }, 400);
      }
      await ok('/api/cuenta/preferencias', null, 'GET', undefined, 401);
      const cuentaAntes = await ok('/api/cuenta/preferencias', 'julieta');
      for (const cuerpo of [{ version: cuentaAntes.version }, { version: cuentaAntes.version, preferencias: null }]) {
        await ok('/api/cuenta/preferencias', 'julieta', 'PUT', cuerpo, 400);
      }
      assert.deepEqual(await ok('/api/cuenta/preferencias', 'julieta'), cuentaAntes);
      await ok('/api/instancia/retencion', 'julieta', 'GET', undefined, 403);
      for (const personalizacion of [
        { academico: { anioMin: 9, anioMax: 8 } },
        { academico: { anioMin: 1, anioMax: 101 } },
        { retencion: { historialIa: { modo: 'eliminar', dias: 0 } } },
        { retencion: { notificacionesLeidas: { modo: 'eliminar', dias: null } } },
      ]) {
        const { version } = await ok('/api/instancia/edicion', 'direccion');
        await ok('/api/instancia/edicion', 'direccion', 'PUT', { version, personalizacion }, 400);
      }
      await ok('/api/instancia/edicion', 'julieta', 'PUT', { version: 0, personalizacion: { institucion: { densidad: 'compacta' } } }, 403);
    });

    await t.test('Evidencia y extensiones sobreviven edición, snapshot y restauración', async () => {
      const original = await ok('/api/maestro/instancias/1', 'maestro');
      const genoma = structuredClone(original.genoma);
      genoma.personalizacion.extensiones = { 'metodo.prueba': { version: 1, tipo: 'metodo', config: { pasos: ['recordar', 'comparar'], activo: false } } };
      genoma.personalizacion.evidencias = { 'metodo.prueba': { version: 1, tipo: 'metodo', id: 'metodo.prueba', estado: 'sin-evaluar', resumen: 'Fixture sin afirmación científica.', limites: 'No evaluado.', fuentes: [], revisadoEn: null } };
      const guardado = await ok('/api/maestro/instancias/1/genoma', 'maestro', 'PUT', { genoma, versionBase: original.version, nota: 'Fixture de conservación' });
      const conFicha = await ok('/api/maestro/instancias/1', 'maestro');
      await editar({ institucion: { movimiento: 'reducido' } });
      const editado = await ok('/api/maestro/instancias/1', 'maestro');
      assert.deepEqual(editado.genoma.personalizacion.extensiones, conFicha.genoma.personalizacion.extensiones);
      assert.deepEqual(editado.genoma.personalizacion.evidencias, conFicha.genoma.personalizacion.evidencias);
      await ok('/api/maestro/instancias/1/restaurar', 'maestro', 'POST', { version: guardado.version });
      const restaurado = await ok('/api/maestro/instancias/1', 'maestro');
      assert.deepEqual(restaurado.genoma.personalizacion, conFicha.genoma.personalizacion);
      assert.ok(restaurado.version > editado.version);
    });

    await t.test('La configuración académica permite cursos posteriores al séptimo año', async () => {
      const opciones = await ok('/api/gestion-academica/opciones', 'direccion');
      const datos = { anio: 9, division: 'PRUEBA', turnoId: opciones.turnos[0].id };
      await ok('/api/cursos', 'direccion', 'POST', datos, 400);
      await editar({ academico: { anioMin: 1, anioMax: 12 } });
      const creado = await ok('/api/cursos', 'direccion', 'POST', datos, 201);
      const curso = (await ok('/api/cursos', 'direccion')).cursos.find((c) => c.id === creado.id);
      assert.equal(curso.anio, 9);
      assert.deepEqual((await ok('/api/instancia', 'julieta')).academico, { anioMin: 1, anioMax: 12 });
    });

    await t.test('Consultar retención no ejecuta borrados', async () => {
      const contar = () => db.prepare('SELECT COUNT(*) AS n FROM notificaciones').get().n;
      const antes = contar();
      const version = (await ok('/api/instancia/edicion', 'direccion')).version;
      const respuesta = await request('/api/instancia/retencion', 'direccion');
      assert.equal(respuesta.status, 200);
      assert.equal(contar(), antes);
      assert.equal((await ok('/api/instancia/edicion', 'direccion')).version, version);
    });

    await t.test('Retención elimina solo vencidos de la institución, conserva no leídas y es idempotente', async () => {
      const local = db.prepare('SELECT id FROM usuarios WHERE email = ?').get('julieta@sanmartin.nexo.edu').id;
      const ajeno = db.prepare('SELECT id FROM usuarios WHERE email = ?').get('estudiante@aislada.test').id;
      const mensaje = db.prepare("INSERT INTO ia_mensajes (usuario_id, rol, contenido, creado_en) VALUES (?, 'user', 'prueba retención', datetime('now', ?))");
      const aviso = db.prepare("INSERT INTO notificaciones (usuario_id, tipo, titulo, creado_en, leida_en) VALUES (?, 'prueba', 'retención', datetime('now', '-90 days'), CASE WHEN ? IS NULL THEN NULL ELSE datetime('now', ?) END)");
      const viejo = Number(mensaje.run(local, '-90 days').lastInsertRowid);
      const reciente = Number(mensaje.run(local, '-1 day').lastInsertRowid);
      const externo = Number(mensaje.run(ajeno, '-90 days').lastInsertRowid);
      const leido = Number(aviso.run(local, '-90 days', '-90 days').lastInsertRowid);
      const sinLeer = Number(aviso.run(local, null, null).lastInsertRowid);
      const recienLeido = Number(aviso.run(local, '-1 day', '-1 day').lastInsertRowid);
      const avisoExterno = Number(aviso.run(ajeno, '-90 days', '-90 days').lastInsertRowid);
      olvidarGenoma(1);
      assert.equal(revisarRetencion(db, 1, true).historialIa.registros, 0);
      assert.ok(db.prepare('SELECT id FROM ia_mensajes WHERE id = ?').get(viejo));
      await editar({ retencion: { historialIa: { modo: 'eliminar', dias: 30 }, notificacionesLeidas: { modo: 'eliminar', dias: 30 } } });
      olvidarGenoma(1);
      const preview = revisarRetencion(db, 1);
      assert.ok(preview.historialIa.registros >= 1);
      assert.ok(db.prepare('SELECT id FROM ia_mensajes WHERE id = ?').get(viejo));
      assert.deepEqual(revisarRetencion(db, 1, true), preview);
      assert.equal(db.prepare('SELECT id FROM ia_mensajes WHERE id = ?').get(viejo), undefined);
      assert.equal(db.prepare('SELECT id FROM notificaciones WHERE id = ?').get(leido), undefined);
      for (const id of [reciente, externo]) assert.ok(db.prepare('SELECT id FROM ia_mensajes WHERE id = ?').get(id));
      for (const id of [sinLeer, recienLeido, avisoExterno]) assert.ok(db.prepare('SELECT id FROM notificaciones WHERE id = ?').get(id));
      const repetido = revisarRetencion(db, 1, true);
      assert.equal(repetido.historialIa.registros, 0);
      assert.equal(repetido.notificacionesLeidas.registros, 0);
      olvidarGenoma(1);
    });
  } finally {
    await entorno.cerrar();
  }
});
