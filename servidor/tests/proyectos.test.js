import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearEntorno } from './entorno.js';

const nuevo=(extra={})=>({titulo:'Resolver un problema juntos',problema:'Los materiales están dispersos',objetivo:'Publicar una guía comprobada',criterio:'La guía permite completar un caso real',visibilidad:'privada',...extra});
async function sesiones(e){await e.entrar('docente','garcia@sanmartin.nexo.edu');await e.entrar('alumna','julieta@sanmartin.nexo.edu');await e.entrar('martin','martin@sanmartin.nexo.edu');await e.entrar('familia','familia.rossi@sanmartin.nexo.edu');}
const persona=(e,email)=>String(e.db.prepare('SELECT id FROM usuarios WHERE email=?').get(email).id);
test('proyectos comunes: perfiles, privacidad, institución, roles, versiones y genoma',async()=>{
  const e=await crearEntorno('nexo-proyectos-acceso-',db=>{db.exec("INSERT INTO instituciones(id,nombre,ciclo_lectivo) VALUES(998,'Otra',2026)");db.exec("INSERT INTO usuarios(institucion_id,email,hash_contrasena,nombre,rol) SELECT 998,'otro@externo.test',hash_contrasena,'Externo','estudiante' FROM usuarios WHERE id=8");});
  try{
    await sesiones(e);await e.entrar('externo','otro@externo.test');
    const metas=e.db.prepare('SELECT COUNT(*) AS n FROM metas').get().n;
    const p=await e.ok('/api/proyectos','familia','POST',nuevo(),201),base=`/api/proyectos/${p.id}`;
    assert.equal((await e.request(base,'docente')).status,404);assert.equal((await e.request(base,'externo')).status,404);
    const profesor=persona(e,'garcia@sanmartin.nexo.edu');await e.ok(`${base}/miembros/${profesor}`,'familia','PUT',{rol:'lector'});
    assert.equal((await e.ok(base,'docente')).proyecto.rol,'lector');assert.equal((await e.request(`${base}/pasos`,'docente','POST',{titulo:'No autorizado'})).status,403);
    await e.ok(`${base}/miembros/${profesor}`,'familia','PUT',{rol:'participante'});
    await e.ok(`${base}/pasos`,'docente','POST',{titulo:'Revisar fuentes'},201);
    assert.equal((await e.request(`${base}/miembros/${persona(e,'otro@externo.test')}`,'familia','PUT',{rol:'participante'})).status,400);
    assert.equal((await e.request(base,'familia','PUT',{version:99,titulo:'Pisada'})).status,409);
    await e.ok(base,'familia','PUT',{version:1,visibilidad:'institucion'});
    assert.equal((await e.ok(base,'alumna')).proyecto.rol,null);await e.ok(`${base}/unirse`,'alumna','POST',{});
    assert.equal((await e.ok(base,'alumna')).proyecto.rol,'participante');assert.equal((await e.request(base,'externo')).status,404);
    assert.equal(e.db.prepare('SELECT COUNT(*) AS n FROM metas').get().n,metas,'Los proyectos no crean metas personales');
    await e.entrar('direccion','direccion@sanmartin.nexo.edu');const ed=await e.ok('/api/instancia/edicion','direccion');await e.ok('/api/instancia/edicion','direccion','PUT',{version:ed.version,modulos:{proyectos:{oculto:true}}});
    assert.equal((await e.request(base,'familia')).status,403);
  }finally{await e.cerrar();}
});

test('pasos: jerarquía y dependencias sin ciclos, responsables y evidencias privadas',async()=>{
  const e=await crearEntorno('nexo-proyectos-pasos-');
  try{
    await sesiones(e);const p=await e.ok('/api/proyectos','docente','POST',nuevo(),201),base=`/api/proyectos/${p.id}`,alumna=persona(e,'julieta@sanmartin.nexo.edu'),martin=persona(e,'martin@sanmartin.nexo.edu');
    await e.ok(`${base}/miembros/${alumna}`,'docente','PUT',{rol:'participante'});await e.ok(`${base}/miembros/${martin}`,'docente','PUT',{rol:'participante'});
    const padre=await e.ok(`${base}/pasos`,'docente','POST',{titulo:'Crear guía'},201);
    const hijo=await e.ok(`${base}/pasos`,'docente','POST',{titulo:'Consultar fuentes',padreId:padre.id,responsableId:alumna},201);
    const dependiente=await e.ok(`${base}/pasos`,'docente','POST',{titulo:'Probar guía',dependeDeId:padre.id},201);
    assert.equal((await e.request(`${base}/pasos/${padre.id}`,'docente','PUT',{version:1,completada:true})).status,400);
    assert.equal((await e.request(`${base}/pasos/${hijo.id}`,'docente','PUT',{version:1,dependeDeId:padre.id})).status,400,'No permite padre→hijo→padre');
    assert.equal((await e.request(`${base}/pasos/${hijo.id}`,'martin','PUT',{version:1,completada:true})).status,403);
    const archivo=await e.crudo('/api/archivos','alumna',{method:'POST',headers:{'Content-Type':'text/plain','X-Nombre-Archivo':'fuentes.txt'},body:Buffer.from('Fuentes del proyecto')});assert.equal(archivo.status,201);
    await e.ok(`${base}/pasos/${hijo.id}`,'alumna','PUT',{version:1,evidencia:'Fuentes comprobadas',archivoId:archivo.datos.archivo.id,completada:true});
    assert.equal((await e.crudo(`/api/archivos/${archivo.datos.archivo.id}`,'martin')).status,200);
    await e.ok(`${base}/pasos/${padre.id}`,'docente','PUT',{version:1,completada:true});await e.ok(`${base}/pasos/${dependiente.id}`,'docente','PUT',{version:1,completada:true});
    assert.equal((await e.request(`${base}/pasos/${padre.id}`,'docente','PUT',{version:2,completada:false})).status,400);
    assert.equal((await e.request(`${base}/pasos/${hijo.id}`,'alumna','PUT',{version:1,evidencia:'Versión vieja'})).status,409);
    await e.ok(`${base}/miembros/${martin}`,'docente','DELETE');assert.equal((await e.crudo(`/api/archivos/${archivo.datos.archivo.id}`,'martin')).status,403);
  }finally{await e.cerrar();}
});

test('producciones conservan versiones, feedback accionable y permisos de archivos',async()=>{
  const e=await crearEntorno('nexo-proyectos-entregas-');
  try{
    await sesiones(e);const p=await e.ok('/api/proyectos','docente','POST',nuevo(),201),base=`/api/proyectos/${p.id}`,alumna=persona(e,'julieta@sanmartin.nexo.edu');await e.ok(`${base}/miembros/${alumna}`,'docente','PUT',{rol:'participante'});
    const archivo=await e.crudo('/api/archivos','alumna',{method:'POST',headers:{'Content-Type':'text/plain','X-Nombre-Archivo':'guia.txt'},body:Buffer.from('Guía de prueba')});
    const primera=await e.ok(`${base}/entregas`,'alumna','POST',{texto:'Borrador de producción',archivos:[archivo.datos.archivo.id]},201);assert.equal(primera.numero,1);
    assert.equal((await e.crudo(`/api/archivos/${archivo.datos.archivo.id}`,'docente')).status,200);assert.equal((await e.crudo(`/api/archivos/${archivo.datos.archivo.id}`,'martin')).status,403);
    assert.equal((await e.request(`${base}/entregas/${primera.id}/devoluciones`,'alumna','POST',{criterio:'C',comentario:'C',siguienteAccion:'C'})).status,409);
    await e.ok(`${base}/entregas/${primera.id}/devoluciones`,'docente','POST',{criterio:'Resolver un caso real',comentario:'Falta una prueba externa',siguienteAccion:'Probar con otra persona'},201);
    const segunda=await e.ok(`${base}/entregas`,'alumna','POST',{texto:'Mejoré con la prueba externa',archivos:[]},201);assert.equal(segunda.numero,2);
    const d=await e.ok(base,'docente');assert.equal(d.entregas.length,2);assert.equal(d.entregas.find(x=>x.id===primera.id).devoluciones[0].siguienteAccion,'Probar con otra persona');
    await e.ok(base,'docente','PUT',{version:1,archivado:true});assert.equal((await e.request(`${base}/entregas`,'alumna','POST',{texto:'No debe entrar'})).status,409);assert.equal((await e.ok(base,'alumna')).entregas.length,2);
  }finally{await e.cerrar();}
});

test('vínculos bidireccionales respetan acceso a proyecto y a cada origen',async()=>{
  const e=await crearEntorno('nexo-proyectos-vinculos-');
  try{
    await sesiones(e);const p=await e.ok('/api/proyectos','docente','POST',nuevo(),201),base=`/api/proyectos/${p.id}`,alumna=persona(e,'julieta@sanmartin.nexo.edu');
    await e.ok(`${base}/miembros/${alumna}`,'docente','PUT',{rol:'participante'});
    await e.ok(`${base}/vinculos`,'docente','POST',{tipo:'biblioteca',objetoId:3});await e.ok(`${base}/vinculos`,'docente','POST',{tipo:'tarea',objetoId:1});
    assert.equal((await e.ok('/api/proyectos/vinculos/biblioteca/3','alumna')).proyectos[0].id,p.id);
    assert.equal((await e.ok('/api/proyectos/vinculos/biblioteca/3','martin')).proyectos.length,0);
    assert.equal((await e.ok(base,'alumna')).vinculos.length,2);
    e.db.prepare("UPDATE recursos SET autor_id=2,estado='en-revision' WHERE id=3").run();
    assert.equal((await e.ok(base,'alumna')).vinculos.length,1);assert.equal((await e.request('/api/proyectos/vinculos/biblioteca/3','alumna')).status,404);
    assert.equal((await e.ok(base,'docente')).vinculos.length,2);
    assert.equal((await e.request(`${base}/vinculos`,'alumna','POST',{tipo:'biblioteca',objetoId:3})).status,404);
  }finally{await e.cerrar();}
});

test('conversación de proyecto sincroniza equipo, revoca historial y archiva en lectura',async()=>{
  const e=await crearEntorno('nexo-proyectos-chat-');
  try{
    await sesiones(e);const p=await e.ok('/api/proyectos','docente','POST',nuevo(),201),base=`/api/proyectos/${p.id}`,alumna=persona(e,'julieta@sanmartin.nexo.edu');await e.ok(`${base}/miembros/${alumna}`,'docente','PUT',{rol:'participante'});
    const contexto=await e.ok(`/api/chat/contextos/proyecto/${p.id}`,'docente','POST',{},201),cid=contexto.canal.id;
    await e.ok(`/api/chat/conversaciones/${cid}/mensajes`,'docente','POST',{contenido:'Coordinamos la evidencia'},201);
    assert.equal((await e.ok(`/api/chat/conversaciones/${cid}/mensajes`,'alumna')).mensajes.length,1);
    await e.ok(`${base}/miembros/${alumna}`,'docente','DELETE');assert.equal((await e.request(`/api/chat/conversaciones/${cid}/mensajes`,'alumna')).status,403);
    await e.ok(base,'docente','PUT',{version:1,archivado:true});assert.equal((await e.request(`/api/chat/conversaciones/${cid}/mensajes`,'docente','POST',{contenido:'No entra'})).status,403);assert.equal((await e.ok(`/api/chat/conversaciones/${cid}/mensajes`,'docente')).mensajes.length,1);
  }finally{await e.cerrar();}
});
