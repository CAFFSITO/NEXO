import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearEntorno } from './entorno.js';

test('Biblioteca Nacional circula entre instituciones sin exponer borradores ni recursos locales', async () => {
  const e = await crearEntorno('nexo-biblioteca-nacional-', db => {
    db.exec("INSERT INTO instituciones(id,nombre,ciclo_lectivo) VALUES(998,'Otra escuela',2026)");
    db.exec("INSERT INTO usuarios(institucion_id,email,hash_contrasena,nombre,rol) SELECT 998,'lector@otra.test',hash_contrasena,'Lector externo','estudiante' FROM usuarios WHERE id=8");
    const autor = db.prepare("SELECT id FROM usuarios WHERE email='julieta@sanmartin.nexo.edu'").get().id;
    const alta = db.prepare("INSERT INTO recursos(institucion_id,autor_id,titulo,alcance,estado,enlace_url) VALUES(1,?,?,?,?,'https://example.org/libro')");
    alta.run(autor,'Cruza escuelas','nacional','aprobado');
    alta.run(autor,'Borrador ajeno','nacional','en-revision');
    alta.run(autor,'Solo local','institucional','aprobado');
  });
  try {
    await e.entrar('lector','lector@otra.test');
    const nacional = await e.ok('/api/biblioteca/recursos?ambito=nacional','lector');
    assert.ok(nacional.recursos.some(r => r.titulo === 'Cruza escuelas'));
    assert.ok(!nacional.recursos.some(r => r.titulo === 'Borrador ajeno'));
    assert.ok(!nacional.recursos.some(r => r.titulo === 'Solo local'));
    const propio = await e.ok('/api/biblioteca/recursos?ambito=institucional','lector');
    assert.ok(!propio.recursos.some(r => r.titulo === 'Solo local'));
    const id = nacional.recursos.find(r => r.titulo === 'Cruza escuelas').id;
    await e.ok(`/api/biblioteca/recursos/${id}/voto`,'lector','POST',{valor:1});
    const coleccion = await e.ok('/api/biblioteca/colecciones','lector','POST',{nombre:'Lecturas compartidas'},201);
    await e.ok(`/api/biblioteca/colecciones/${coleccion.id}/recursos/${id}`,'lector','PUT',{});
    assert.deepEqual((await e.ok(`/api/biblioteca/colecciones/${coleccion.id}`,'lector')).recursos,[id]);
    await e.ok(`/api/biblioteca/recursos/${id}/anotaciones`,'lector','POST',{ubicacion:'página 2',contenido:'Idea propia'},201);
    assert.equal((await e.ok(`/api/biblioteca/recursos/${id}/anotaciones`,'lector')).anotaciones[0].contenido,'Idea propia');
    assert.equal((await e.ok('/api/biblioteca/buscar?q=propia','lector')).anotaciones.length,1);
    const borradorId = e.db.prepare("SELECT id FROM recursos WHERE titulo='Borrador ajeno'").get().id;
    await e.ok(`/api/biblioteca/recursos/${borradorId}/anotaciones`,'lector','GET',undefined,404);
    await e.entrar('autora','julieta@sanmartin.nexo.edu');
    await e.ok(`/api/biblioteca/recursos/${id}/etiquetas`,'autora','PUT',{etiquetas:['historia','Nacional']});
    assert.equal((await e.ok('/api/biblioteca/buscar?q=historia','lector')).recursos[0].id,id);
    await e.ok(`/api/biblioteca/recursos/${id}/version`,'autora','PUT',{titulo:'Cruza escuelas revisado',enlaceUrl:'https://example.org/nueva'});
    const versiones = await e.ok(`/api/biblioteca/recursos/${id}/versiones`,'autora');
    assert.equal(versiones.anteriores[0].titulo,'Cruza escuelas');
    assert.equal(versiones.anteriores[0].enlace_url,'https://example.org/libro');
    assert.equal(e.db.prepare('SELECT estado FROM cola_revision WHERE recurso_id=?').get(Number(id)).estado,'pendiente');
    assert.ok(!(await e.ok('/api/biblioteca/recursos?ambito=nacional','lector')).recursos.some(r=>r.id===id));
    e.db.prepare("UPDATE recursos SET estado='aprobado', alcance='nacional' WHERE id=?").run(Number(id));
    const versionesPublicas = await e.ok(`/api/biblioteca/recursos/${id}/versiones`,'lector');
    assert.deepEqual(versionesPublicas.anteriores,[]);
    assert.equal(versionesPublicas.actual.titulo,'Cruza escuelas revisado');
  } finally { await e.cerrar(); }
});
