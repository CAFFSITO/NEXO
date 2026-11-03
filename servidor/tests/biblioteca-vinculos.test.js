import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearEntorno } from './entorno.js';

test('Los vínculos son bidireccionales y sólo revelan recursos y destinos visibles', async () => {
  const e=await crearEntorno('nexo-biblioteca-vinculos-',db=>{
    db.exec("INSERT INTO instituciones(id,nombre,ciclo_lectivo) VALUES(998,'Otra escuela',2026)");
    db.exec("INSERT INTO usuarios(institucion_id,email,hash_contrasena,nombre,rol) SELECT 998,'externo@otra.test',hash_contrasena,'Externo','estudiante' FROM usuarios WHERE id=8");
  });
  try {
    await e.entrar('docente','garcia@sanmartin.nexo.edu');
    await e.entrar('alumna','julieta@sanmartin.nexo.edu');
    await e.entrar('otro','lombardi@sanmartin.nexo.edu');
    await e.entrar('externo','externo@otra.test');
    const base='/api/biblioteca/recursos/3/vinculos';
    assert.equal((await e.request(base,'alumna','POST',{tipo:'tarea',id:1})).status,404);
    await e.ok(base,'docente','POST',{tipo:'tarea',id:1},201);
    await e.ok(base,'docente','POST',{tipo:'materia',id:1},201);
    assert.equal((await e.ok(base,'alumna')).vinculos.length,2);
    assert.equal((await e.ok('/api/biblioteca/vinculos/tarea/1/recursos','alumna')).recursos[0].id,'3');
    assert.equal((await e.request('/api/biblioteca/vinculos/tarea/1/recursos','externo')).status,404);
    assert.equal((await e.request(base,'otro','POST',{tipo:'tarea',id:1})).status,404);
    await e.ok(`${base}/tarea/1`,'docente','DELETE');
    assert.deepEqual((await e.ok('/api/biblioteca/vinculos/tarea/1/recursos','alumna')).recursos,[]);
    const publicacion=e.db.prepare("INSERT INTO publicaciones(institucion_id,autor_id,contenido) VALUES(1,2,'Material para estudiar')").run().lastInsertRowid;
    await e.ok(base,'docente','POST',{tipo:'publicacion',id:Number(publicacion)},201);
    assert.equal((await e.ok(`/api/biblioteca/vinculos/publicacion/${publicacion}/recursos`,'alumna')).recursos.length,1);
    e.db.prepare("UPDATE publicaciones SET eliminado_en=datetime('now') WHERE id=?").run(publicacion);
    assert.equal((await e.request(`/api/biblioteca/vinculos/publicacion/${publicacion}/recursos`,'alumna')).status,404);
    e.db.prepare("UPDATE recursos SET estado='en-revision' WHERE id=3").run();
    assert.deepEqual((await e.ok('/api/biblioteca/vinculos/materia/1/recursos','alumna')).recursos,[]);
  } finally { await e.cerrar(); }
});
