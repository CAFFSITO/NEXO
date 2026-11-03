import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearEntorno } from './entorno.js';

test('lecciones: estructura, publicación, orden, duplicación y progreso aislado', async () => {
  const e=await crearEntorno('nexo-lecciones-');
  try {
    await e.entrar('docente','garcia@sanmartin.nexo.edu');
    await e.entrar('alumna','julieta@sanmartin.nexo.edu');
    await e.entrar('otro','lombardi@sanmartin.nexo.edu');
    const base='/api/catedras/1/lecciones';
    const cuerpo=(tipo,padreId,titulo,extra={})=>({tipo,padreId,titulo,descripcion:'',documentoId:null,accionables:[],disponibleDesde:null,prerrequisitoId:null,publicado:false,...extra});
    const archivoId=Number(e.db.prepare("INSERT INTO archivos(nombre_original,ruta_local,tipo_mime,tamano_bytes,subido_por) VALUES('grabacion.webm','faltante.webm','video/webm',10,2)").run().lastInsertRowid);
    const modulo=(await e.ok(base,'docente','POST',cuerpo('modulo',null,'Módulo 1'),201)).nodo;
    const seccion=(await e.ok(base,'docente','POST',cuerpo('seccion',modulo.id,'Sección 1'),201)).nodo;
    const subs=[{inicio:0,fin:2.5,texto:'Hola, empezamos.'},{inicio:2.5,fin:4,texto:'Un ejemplo.'}];
    const leccion=(await e.ok(base,'docente','POST',cuerpo('leccion',seccion.id,'Lección 1',{accionables:['Resolver un problema'],archivoId:String(archivoId),capitulos:[{segundo:42,titulo:'Ejemplo'}],subtitulos:subs}),201)).nodo;
    assert.deepEqual(leccion.capitulos,[{segundo:42,titulo:'Ejemplo'}]);
    assert.deepEqual(leccion.subtitulos,subs);
    assert.equal((await e.request(base,'docente','POST',cuerpo('leccion',seccion.id,'Sin video',{subtitulos:subs}))).status,400);
    assert.equal((await e.request(base,'docente','POST',cuerpo('leccion',seccion.id,'Solapados',{archivoId:String(archivoId),subtitulos:[subs[0],{inicio:2,fin:3,texto:'Solapado'}]}))).status,400);
    assert.equal((await e.ok(base,'alumna')).nodos.length,0);
    assert.equal((await e.request(`/api/archivos/${archivoId}`,'alumna')).status,403);
    assert.equal((await e.request(base,'alumna','POST',cuerpo('modulo',null,'Intruso'))).status,403);
    assert.equal((await e.request(base,'otro')).status,403);
    for(const n of [modulo,seccion,leccion]) await e.ok(`${base}/${n.id}`,'docente','PUT',cuerpo(n.tipo,n.padreId,n.titulo,{accionables:n.accionables,archivoId:n.archivoId,capitulos:n.capitulos,subtitulos:n.subtitulos,publicado:true,version:n.version}));
    assert.equal((await e.ok(base,'alumna')).nodos.length,3);
    assert.deepEqual((await e.ok(base,'alumna')).nodos.find(n=>n.id===leccion.id).capitulos,[{segundo:42,titulo:'Ejemplo'}]);
    assert.deepEqual((await e.ok(base,'alumna')).nodos.find(n=>n.id===leccion.id).subtitulos,subs);
    assert.equal((await e.request(`/api/archivos/${archivoId}`,'alumna')).status,404);
    const vista=await e.ok(`${base}/${leccion.id}/progreso`,'alumna','POST',{estado:'visto'});
    assert.ok(vista.nodo.progreso.vistoEn);
    const realizado=await e.ok(`${base}/${leccion.id}/progreso`,'alumna','POST',{estado:'realizado'});
    assert.ok(realizado.nodo.progreso.realizadoEn);
    const seguimiento=await e.ok(`${base}/${leccion.id}/progresos`,'docente');
    assert.ok(seguimiento.alumnos.find(a=>a.id==='8')?.realizadoEn);
    assert.equal((await e.request(`${base}/${leccion.id}/progresos`,'alumna')).status,403);
    const evaluada=await e.ok(`${base}/${leccion.id}/progresos/8/evaluar`,'docente','POST',{});
    assert.ok(evaluada.nodo.progreso.evaluadoEn);
    const copia=(await e.ok(`${base}/${leccion.id}/duplicar`,'docente','POST',{},201)).nodo;
    assert.equal(copia.publicado,false);
    assert.equal(copia.progreso,null);
    assert.deepEqual(copia.capitulos,[{segundo:42,titulo:'Ejemplo'}]);
    assert.deepEqual(copia.subtitulos,subs);
    const leccionActual=(await e.ok(base,'docente')).nodos.find(n=>n.id===leccion.id);
    await e.ok(`${base}/${copia.id}/mover`,'docente','POST',{direccion:-1,version:copia.version});
    const orden=(await e.ok(base,'docente')).nodos.filter(n=>n.padreId===seccion.id);
    assert.deepEqual(orden.map(n=>n.id),[copia.id,leccion.id]);
    assert.equal((await e.request(`${base}/${leccion.id}`,'docente','PUT',cuerpo('leccion',seccion.id,'Obsoleto',{version:leccionActual.version}))).status,409);
    assert.equal((await e.ok(base,'alumna')).nodos.length,3);
  } finally { await e.cerrar(); }
});

test('lecciones: ocultar el módulo de cada rol bloquea lectura y escritura por API', async () => {
  const e=await crearEntorno('nexo-lecciones-genoma-');
  try {
    await e.entrar('docente','garcia@sanmartin.nexo.edu');
    await e.entrar('alumna','julieta@sanmartin.nexo.edu');
    await e.entrar('direccion','direccion@sanmartin.nexo.edu');
    const ruta='/api/catedras/1/lecciones';
    for(const [rol,modulo] of [['alumna','portafolio'],['docente','portafolio-docente'],['direccion','cursos']]){
      assert.equal((await e.request(ruta,rol)).status,200);
      const edicion=await e.ok('/api/instancia/edicion','direccion');
      await e.ok('/api/instancia/edicion','direccion','PUT',{version:edicion.version,modulos:{[modulo]:{oculto:true}}});
      assert.equal((await e.request(ruta,rol)).status,403);
      assert.equal((await e.request(ruta,rol,'POST',{tipo:'modulo',titulo:'Oculto'})).status,403);
      const actual=await e.ok('/api/instancia/edicion','direccion');
      await e.ok('/api/instancia/edicion','direccion','PUT',{version:actual.version,modulos:{[modulo]:{oculto:false}}});
      assert.equal((await e.request(ruta,rol)).status,200);
    }
  }finally{await e.cerrar();}
});
