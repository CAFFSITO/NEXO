import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearEntorno } from './entorno.js';

test('Una base anterior sin entregas grupales migra antes de registrar revisión entre pares',async()=>{
  const e=await crearEntorno('nexo-tareas-migracion-grupos-',db=>db.exec('ALTER TABLE entregas DROP COLUMN equipo_id'));
  try{
    assert.ok(e.db.prepare('PRAGMA table_info(entregas)').all().some(c=>c.name==='equipo_id'));
    assert.equal(e.db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
    await e.entrar('profesor','garcia@sanmartin.nexo.edu');
    const lista=await e.ok('/api/tareas/docente','profesor');assert.ok(lista);
  }finally{await e.cerrar();}
});

test('Una tarea personal recurrente crea sólo la siguiente ocurrencia al completarse', async () => {
  const e=await crearEntorno('nexo-tareas-recurrentes-');
  try {
    await e.entrar('alumna','julieta@sanmartin.nexo.edu');
    const creada=await e.ok('/api/tareas-personales','alumna','POST',{
      titulo:'Recuperar conceptos',descripcion:'Con ejemplos',fechaLimite:'2026-11-02',
      recurrencia:{frecuencia:'diaria',intervalo:1,veces:2}
    },201);
    const primera=await e.ok(`/api/tareas-personales/${creada.id}/completada`,'alumna','PUT',{completada:true});
    assert.ok(primera.siguienteId);
    assert.equal(e.db.prepare('SELECT fecha_limite FROM tareas_personales WHERE id=?').get(Number(primera.siguienteId)).fecha_limite,'2026-11-03');
    assert.equal((await e.ok(`/api/tareas-personales/${creada.id}/completada`,'alumna','PUT',{completada:true})).siguienteId,null);
    assert.equal((await e.ok(`/api/tareas-personales/${primera.siguienteId}/completada`,'alumna','PUT',{completada:true})).siguienteId,null);
    assert.equal(e.db.prepare('SELECT COUNT(*) AS n FROM tareas_personales WHERE origen_id=?').get(Number(creada.id)).n,1);
  } finally { await e.cerrar(); }
});
