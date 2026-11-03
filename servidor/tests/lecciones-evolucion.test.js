import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearEntorno } from './entorno.js';
import { fuenteLeccionAutorizada } from '../lecciones.js';

const base='/api/catedras/1/lecciones';
const cuerpo=(tipo,padreId,titulo,extra={})=>({tipo,padreId,titulo,descripcion:'Material para practicar',accionables:[],publicado:true,...extra});

test('lecciones flexibles: mover sin ciclos, copiar ramas a cátedra propia y proteger todos los ancestros',async()=>{
  const e=await crearEntorno('nexo-lecciones-flexibles-');
  try{
    await e.entrar('docente','garcia@sanmartin.nexo.edu');await e.entrar('alumna','julieta@sanmartin.nexo.edu');
    const nuevo=async(tipo,padre,titulo,extra={})=>(await e.ok(base,'docente','POST',cuerpo(tipo,padre,titulo,extra),201)).nodo;
    const a=await nuevo('modulo',null,'Unidad');const b=await nuevo('seccion',a.id,'Nivel dos');const c=await nuevo('modulo',b.id,'Nivel tres');const d=await nuevo('seccion',c.id,'Nivel cuatro');
    const archivoId=Number(e.db.prepare("INSERT INTO archivos(nombre_original,ruta_local,tipo_mime,tamano_bytes,subido_por) VALUES('lectura.pdf','faltante.pdf','application/pdf',10,2)").run().lastInsertRowid);
    const leccion=await nuevo('leccion',d.id,'Lectura',{archivoId:String(archivoId),actividades:[{titulo:'Pensar un ejemplo',obligatoria:true}]});
    assert.equal(leccion.archivoTipo,'application/pdf');
    assert.equal((await e.ok(base,'alumna')).nodos.length,5);
    assert.equal((await e.request(`/api/archivos/${archivoId}`,'alumna')).status,404,'El archivo visible inexistente supera autorización');
    assert.equal((await e.request(`${base}/${a.id}/mover`,'docente','POST',{padreId:d.id,version:a.version})).status,400);
    assert.equal((await e.request(`${base}/${a.id}`,'docente','PUT',{...a,padreId:d.id})).status,400);
    await e.ok(`${base}/${a.id}`,'docente','PUT',{...a,publicado:false});
    assert.equal((await e.request(`/api/archivos/${archivoId}`,'alumna')).status,403,'El quinto nivel respeta el ancestro oculto');
    assert.equal((await e.ok(base,'alumna')).nodos.length,0);
    const actual=(await e.ok(base,'docente')).nodos.find(x=>x.id===a.id);
    await e.ok(`${base}/${a.id}`,'docente','PUT',{...actual,publicado:true});
    const movida=(await e.ok(`${base}/${leccion.id}/mover`,'docente','POST',{version:leccion.version,padreId:null,antesDeId:a.id})).nodo;
    assert.equal(movida.padreId,null);
    assert.equal((await e.ok(base,'docente')).nodos.filter(x=>x.padreId===null)[0].id,movida.id);
    await e.ok(`${base}/${leccion.id}/mover`,'docente','POST',{version:movida.version,padreId:d.id});
    const copia=await e.ok(`${base}/${a.id}/duplicar`,'docente','POST',{},201);
    assert.equal(copia.copiados,5);assert.equal(copia.nodo.publicado,false);
    const materia=Number(e.db.prepare("INSERT INTO materias(institucion_id,nombre) VALUES(1,'Seminario')").run().lastInsertRowid);
    const destino=Number(e.db.prepare('INSERT INTO catedras(materia_id,curso_id,profesor_id) SELECT ?,curso_id,profesor_id FROM catedras WHERE id=1').run(materia).lastInsertRowid);
    const reutilizada=await e.ok(`${base}/${a.id}/duplicar`,'docente','POST',{catedraDestinoId:destino},201);
    assert.equal(reutilizada.copiados,5);assert.equal(reutilizada.tareasDesvinculadas,true);
    const copiados=(await e.ok(`/api/catedras/${destino}/lecciones`,'docente')).nodos;
    assert.equal(copiados.length,5);assert.ok(copiados.every(x=>!x.publicado&&!x.progreso));
    assert.equal((await e.request(`${base}/${a.id}/duplicar`,'docente','POST',{catedraDestinoId:999999})).status,403);
    const u={id:8,rol:'estudiante',institucionId:1};
    assert.equal(fuenteLeccionAutorizada(e.db,u,leccion.id)?.titulo,'Lectura');
    assert.equal(fuenteLeccionAutorizada(e.db,{...u,id:3},leccion.id),null);
  }finally{await e.cerrar();}
});

test('accionables: evidencia aislada, tareas/entregas/notas fuente única y revocación de prerrequisitos',async()=>{
  const e=await crearEntorno('nexo-lecciones-acciones-');
  try{
    await e.entrar('docente','garcia@sanmartin.nexo.edu');await e.entrar('alumna','julieta@sanmartin.nexo.edu');
    const tarea=await e.ok('/api/tareas','docente','POST',{catedraId:'1',titulo:'Aplicar lo aprendido',consigna:'Resolver y explicar',fechaLimite:'2099-12-31',tipoAsignacion:'individual',adjuntos:[]},201);
    const n=(await e.ok(base,'docente','POST',cuerpo('leccion',null,'Tema y práctica',{actividades:[{titulo:'Explicar un ejemplo',obligatoria:true},{titulo:'Entregar la solución',tareaId:tarea.id,obligatoria:true}]}),201)).nodo;
    const [libre,vinculada]=n.actividades;
    const siguiente=(await e.ok(base,'docente','POST',cuerpo('leccion',null,'Siguiente tema',{prerrequisitoId:n.id}),201)).nodo;
    assert.equal((await e.request(`${base}/${n.id}/progreso`,'alumna','POST',{estado:'realizado'})).status,409);
    assert.equal((await e.request(`${base}/${n.id}/acciones/${vinculada.id}/progreso`,'alumna','PUT',{completada:true})).status,409);
    await e.ok(`${base}/${n.id}/acciones/${libre.id}/progreso`,'alumna','PUT',{completada:true,evidencia:'Relacioné dos ideas con un ejemplo propio.'});
    const entrega=await e.ok(`/api/tareas/${tarea.id}/entrega`,'alumna','POST',{comentario:'Esta es la solución explicada.',archivos:[]},201);
    const entregaId=entrega.id??e.db.prepare('SELECT id FROM entregas WHERE tarea_id=? AND estudiante_id=8').get(Number(tarea.id)).id;
    await e.ok(`/api/entregas/${entregaId}/correccion`,'docente','POST',{nota:9,devolucion:'Explicación clara. Probá un caso distinto.'});
    let lectura=(await e.ok(base,'alumna')).nodos.find(x=>x.id===n.id);
    assert.equal(lectura.actividades[0].completada,true);assert.equal(lectura.actividades[1].completada,true);
    assert.equal(lectura.actividades[1].nota,9);assert.match(lectura.actividades[1].devolucion,/caso distinto/);
    assert.equal(e.db.prepare('SELECT COUNT(*) AS n FROM correcciones WHERE entrega_id=?').get(Number(entregaId)).n,1);
    await e.ok(`${base}/${n.id}/progreso`,'alumna','POST',{estado:'realizado'});
    assert.ok((await e.ok(base,'alumna')).nodos.some(x=>x.id===siguiente.id));
    const seguimiento=await e.ok(`${base}/${n.id}/progresos`,'docente');
    assert.equal(seguimiento.alumnos.find(x=>x.id==='8').actividades[0].evidencia,'Relacioné dos ideas con un ejemplo propio.');
    assert.ok(seguimiento.alumnos.filter(x=>x.id!=='8').every(x=>x.actividades.every(a=>!a.evidencia&&!a.completada)));
    await e.ok(`${base}/${n.id}/acciones/${libre.id}/progreso`,'alumna','PUT',{completada:false});
    lectura=(await e.ok(base,'alumna')).nodos.find(x=>x.id===n.id);
    assert.equal(lectura.progreso.realizadoEn,null);
    assert.ok(!(await e.ok(base,'alumna')).nodos.some(x=>x.id===siguiente.id));
    assert.equal(fuenteLeccionAutorizada(e.db,{id:8,rol:'estudiante',institucionId:1},siguiente.id),null);
    assert.equal((await e.request(`${base}/${n.id}/acciones/${libre.id}/progreso`,'docente','PUT',{completada:true})).status,403);
    // Editar el texto conserva identidad/evidencia. Copiar no copia avance.
    const actual=(await e.ok(base,'docente')).nodos.find(x=>x.id===n.id);
    actual.actividades[0].titulo='Explicar y conectar dos ejemplos';
    await e.ok(`${base}/${n.id}`,'docente','PUT',actual);
    lectura=(await e.ok(base,'alumna')).nodos.find(x=>x.id===n.id);
    assert.equal(lectura.actividades[0].id,libre.id);assert.match(lectura.actividades[0].evidencia,/ejemplo propio/);
    const copia=await e.ok(`${base}/${n.id}/duplicar`,'docente','POST',{},201);
    assert.ok(copia.nodo.actividades.every(a=>!a.completada&&!a.evidencia));
  }finally{await e.cerrar();}
});
