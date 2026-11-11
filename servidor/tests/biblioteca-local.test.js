import test from 'node:test';
import assert from 'node:assert/strict';
import {crearEntorno} from './entorno.js';

test('biblioteca local: instantánea autorizada, versión y sincronización idempotente sin pisar notas',async()=>{
  const e=await crearEntorno('nexo-biblioteca-local-',db=>{
    db.exec("INSERT INTO instituciones(id,nombre,ciclo_lectivo) VALUES(998,'Otra',2026)");
    db.exec("INSERT INTO usuarios(institucion_id,email,hash_contrasena,nombre,rol) SELECT 998,'lector@otra.test',hash_contrasena,'Lector externo','estudiante' FROM usuarios WHERE id=8");
  });
  try{
    await e.entrar('alumna','julieta@sanmartin.nexo.edu');await e.entrar('otra','lector@otra.test');
    const u=e.db.prepare("SELECT id FROM usuarios WHERE email='julieta@sanmartin.nexo.edu'").get();
    const rid=Number(e.db.prepare("INSERT INTO recursos(institucion_id,autor_id,titulo,descripcion,alcance,estado,enlace_url) VALUES(1,?,'Lectura offline','Texto de referencia','institucional','aprobado','https://example.org/recurso')").run(u.id).lastInsertRowid);
    assert.equal((await e.request(`/api/biblioteca/recursos/${rid}/copia-local`)).status,401);
    assert.equal((await e.request(`/api/biblioteca/recursos/${rid}/copia-local`,'otra')).status,404);
    const copia=await e.ok(`/api/biblioteca/recursos/${rid}/copia-local`,'alumna');
    assert.match(copia.version,/^[a-f\d]{64}$/);assert.equal(copia.recurso.titulo,'Lectura offline');assert.equal(copia.archivo,null);
    const notas=[{clave:'nota-estable-001',contenido:'Idea sin red',ubicacion:'Página 2',versionOrigen:copia.version}];
    const enviar=()=>e.ok(`/api/biblioteca/recursos/${rid}/anotaciones-locales`,'alumna','POST',{version:copia.version,notas});
    const primera=await enviar(),segunda=await enviar();assert.deepEqual(segunda,primera);
    assert.equal((await e.ok(`/api/biblioteca/recursos/${rid}/anotaciones`,'alumna')).anotaciones.length,1);
    assert.equal((await e.request(`/api/biblioteca/recursos/${rid}/anotaciones-locales`,'alumna','POST',{version:copia.version,notas:[{...notas[0],contenido:'Otra idea con la misma clave'}]})).status,409);
    e.db.prepare('UPDATE recursos SET descripcion=? WHERE id=?').run('Nuevo texto del recurso',rid);
    const cambiado=await e.ok(`/api/biblioteca/recursos/${rid}/copia-local`,'alumna');assert.notEqual(cambiado.version,copia.version);
    const pendiente={clave:'nota-estable-002',contenido:'Segunda idea conservada',ubicacion:'Página 4',versionOrigen:copia.version};
    assert.equal((await e.request(`/api/biblioteca/recursos/${rid}/anotaciones-locales`,'alumna','POST',{version:copia.version,notas:[pendiente]})).status,409);
    assert.equal((await e.ok(`/api/biblioteca/recursos/${rid}/anotaciones`,'alumna')).anotaciones.length,1);
    await e.ok(`/api/biblioteca/recursos/${rid}/anotaciones-locales`,'alumna','POST',{version:cambiado.version,notas:[pendiente]});
    assert.equal((await e.ok(`/api/biblioteca/recursos/${rid}/anotaciones`,'alumna')).anotaciones.length,2);
    e.db.prepare("UPDATE recursos SET autor_id=(SELECT id FROM usuarios WHERE email='garcia@sanmartin.nexo.edu'),estado='en-revision' WHERE id=?").run(rid);
    assert.equal((await e.request(`/api/biblioteca/recursos/${rid}/copia-local`,'alumna')).status,404);
    assert.equal((await e.request(`/api/biblioteca/recursos/${rid}/anotaciones-locales`,'alumna','POST',{version:cambiado.version,notas:[pendiente]})).status,404);
    assert.equal(e.db.prepare('SELECT COUNT(*) AS n FROM biblioteca_anotaciones WHERE recurso_id=?').get(rid).n,2);
  }finally{await e.cerrar();}
});
