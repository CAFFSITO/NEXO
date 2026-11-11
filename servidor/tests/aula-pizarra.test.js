import test from 'node:test';
import assert from 'node:assert/strict';
import {crearEntorno} from './entorno.js';

test('pizarra: colaboración configurable, selección por curso, revocación y cierre con validación de trazos',async()=>{
  const e=await crearEntorno('nexo-pizarra-colaborativa-');
  try{
    await e.entrar('docente','garcia@sanmartin.nexo.edu');await e.entrar('alumna','julieta@sanmartin.nexo.edu');
    const d=e.db.prepare("SELECT id FROM usuarios WHERE email='garcia@sanmartin.nexo.edu'").get().id;
    const u=e.db.prepare("SELECT id FROM usuarios WHERE email='julieta@sanmartin.nexo.edu'").get().id;
    const c=e.db.prepare('SELECT c.id,c.curso_id FROM catedras c JOIN inscripciones i ON i.curso_id=c.curso_id WHERE c.profesor_id=? AND i.estudiante_id=? LIMIT 1').get(d,u);
    const otro=Number(e.db.prepare("INSERT INTO usuarios(institucion_id,email,hash_contrasena,nombre,rol) SELECT institucion_id,'companero@prueba.edu',hash_contrasena,'Compañero','estudiante' FROM usuarios WHERE id=?").run(u).lastInsertRowid);
    e.db.prepare('INSERT INTO inscripciones(curso_id,estudiante_id) VALUES(?,?)').run(c.curso_id,otro);await e.entrar('otro','companero@prueba.edu');
    const clase=await e.ok('/api/aula/clases','docente','POST',{catedraId:c.id,titulo:'Pizarra compartida',fechaHora:new Date().toISOString(),objetivos:'',materiales:'',etapas:[{titulo:'Tema'}]},201);
    const base=`/api/aula/clases/${clase.id}/pizarra`,permiso=base+'/permisos';
    const datos={color:'#ffffff',ancho:3,puntos:[{x:0,y:0},{x:1,y:1}]};
    assert.equal((await e.ok(permiso,'alumna')).puedeDibujar,false);
    assert.equal((await e.request(permiso,'alumna','PUT',{modo:'todos',version:0})).status,403);
    let estado=await e.ok(permiso,'docente','PUT',{modo:'todos',version:0});
    assert.equal((await e.request(base,'alumna','POST',{datos})).status,403);
    await e.ok(`/api/aula/clases/${clase.id}/iniciar`,'docente','POST',{});
    assert.equal((await e.ok(permiso,'alumna')).puedeDibujar,true);
    assert.ok(!(await e.ok(permiso,'alumna')).candidatos);
    await e.ok(base,'alumna','POST',{datos});
    assert.equal((await e.request(base,'alumna','POST',{datos:{...datos,puntos:[{x:2,y:0}]}})).status,400);
    assert.equal((await e.request(permiso,'docente','PUT',{modo:'docente',version:0})).status,409);
    assert.equal((await e.request(permiso,'docente','PUT',{modo:'seleccion',editores:[d],version:estado.version})).status,400);
    estado=await e.ok(permiso,'docente','PUT',{modo:'seleccion',editores:[u],version:estado.version});
    await e.ok(base,'alumna','POST',{datos});assert.equal((await e.request(base,'otro','POST',{datos})).status,403);
    assert.equal((await e.request(base+'/limpiar','alumna','POST',{})).status,403);
    estado=await e.ok(permiso,'docente','PUT',{modo:'docente',editores:[],version:estado.version});
    assert.equal((await e.request(base,'alumna','POST',{datos})).status,403);
    assert.equal((await e.ok(base,'docente')).trazos.length,2);
    await e.ok(`/api/aula/clases/${clase.id}/finalizar`,'docente','POST',{});
    assert.equal((await e.request(base,'docente','POST',{datos})).status,403);
    assert.equal((await e.request(permiso,'docente','PUT',{modo:'todos',version:estado.version})).status,409);
  }finally{await e.cerrar();}
});
