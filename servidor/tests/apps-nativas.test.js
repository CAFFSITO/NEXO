import test from 'node:test';
import assert from 'node:assert/strict';
import { crearEntorno } from './entorno.js';

function preparar(db){
  db.prepare('INSERT INTO instituciones(id,nombre,ciclo_lectivo) VALUES(2,?,2026)').run('Otra comunidad');
  const hash=db.prepare('SELECT hash_contrasena FROM usuarios WHERE id=1').get().hash_contrasena;
  for(const [institucion,email,nombre,rol] of [[2,'direccion@otra.edu','Otra dirección','admin-academico'],[2,'estudiante@otra.edu','Otra estudiante','estudiante'],[1,'compa@prueba.edu','Compañero','estudiante']]){
    db.prepare("INSERT INTO usuarios(institucion_id,email,hash_contrasena,nombre,rol,estado) VALUES(?,?,?,?,?,'activo')").run(institucion,email,hash,nombre,rol);
  }
}
async function entrar(e){
  for(const [clave,email] of [['maestro','sistema@nexo.edu'],['direccion','direccion@sanmartin.nexo.edu'],['otra','direccion@otra.edu'],['alumna','julieta@sanmartin.nexo.edu'],['compa','compa@prueba.edu'],['alumnaOtra','estudiante@otra.edu']])await e.entrar(clave,email);
}
async function publicar(e,bloques){const a=await e.ok('/api/apps-publicas/maestro','maestro','POST',{nombre:'Herramientas comunitarias',descripcion:'Capacidades integradas',bloques},201);await e.ok(`/api/apps-publicas/maestro/${a.id}/publicacion`,'maestro','PUT',{publicada:true});return a;}
const bloque=(id,tipo=id)=>({id,tipo,titulo:`Herramienta ${id}`,contenido:'Creá y colaborá dentro de esta comunidad.'});
const ruta=(i,b)=>`/api/apps-publicas/comunidad/${i.id}/bloques/${b}`;

test('Apps nativas: instalaciones independientes, chat/foro/ayuda privados y documentos/formularios/cursos reales',async()=>{
  const e=await crearEntorno('nexo-apps-nativas-',preparar);
  try{
    await entrar(e);
    const a=await publicar(e,['chat','foro','sugerencias','ayuda','documento','formulario','curso'].map(t=>bloque(t)));
    let i=await e.ok('/api/apps-publicas/instancias','direccion','POST',{appId:a.id},201);
    const copia=await e.ok('/api/apps-publicas/instancias','direccion','POST',{appId:a.id},201);
    const otra=await e.ok('/api/apps-publicas/instancias','otra','POST',{appId:a.id},201);
    const refs=id=>e.db.prepare('SELECT bloque_id,referencia_id FROM apps_publicas_capacidades WHERE instancia_id=? ORDER BY bloque_id').all(id);
    assert.equal(refs(i.id).length,5);
    assert.ok(refs(i.id).every(r=>refs(copia.id).find(x=>x.bloque_id===r.bloque_id).referencia_id!==r.referencia_id));
    assert.ok(refs(i.id).every(r=>refs(otra.id).find(x=>x.bloque_id===r.bloque_id).referencia_id!==r.referencia_id));
    await e.ok(`/api/apps-publicas/instancias/${i.id}/preparar`,'direccion','POST',{});
    assert.equal(refs(i.id).length,5,'Preparar de nuevo no duplica objetos');
    await e.ok(ruta(otra,'chat'),'alumna','GET',undefined,404);
    const previo=await e.ok(ruta(i,'chat'),'alumna');assert.equal(previo.canal.miembro,false);
    const chat=(await e.ok(`${ruta(i,'chat')}/abrir`,'alumna','POST',{})).canal;
    await e.ok(`/api/chat/conversaciones/${chat.id}/mensajes`,'alumna','POST',{contenido:'Mensaje del chat integrado'},201);
    assert.equal((await e.ok(`/api/chat/conversaciones/${chat.id}/mensajes`,'direccion')).mensajes.at(-1).contenido,'Mensaje del chat integrado');
    assert.equal((await e.ok(ruta(copia,'chat'),'alumna')).canal.miembro,false);
    const foro=(await e.ok(`${ruta(i,'foro')}/abrir`,'alumna','POST',{})).canal;
    const hilo=(await e.ok('/api/chat/canales','alumna','POST',{clase:'hilo',padreId:foro.id,nombre:'Pregunta del curso',descripcion:'',visibilidad:'institucion',soloLectura:false,miembros:[]},201)).canal;
    await e.ok(`/api/chat/conversaciones/${hilo.id}/mensajes`,'alumna','POST',{contenido:'Explicación en un tema'},201);
    assert.ok((await e.ok(`/api/chat/canales?padreId=${foro.id}`,'direccion')).canales.some(c=>c.id===hilo.id));
    const sugerencias=(await e.ok(`${ruta(i,'sugerencias')}/abrir`,'alumna','POST',{})).canal;assert.equal(sugerencias.clase,'sugerencias');
    const pedido=(await e.ok(`${ruta(i,'ayuda')}/abrir`,'alumna','POST',{})).canal;
    assert.equal((await e.ok(`${ruta(i,'ayuda')}/abrir`,'alumna','POST',{})).canal.id,pedido.id,'Abrir mantiene el pedido actual');
    const pedido2=(await e.ok(`${ruta(i,'ayuda')}/abrir`,'alumna','POST',{nuevo:true})).canal;assert.notEqual(pedido2.id,pedido.id);
    assert.equal((await e.ok(ruta(i,'ayuda'),'alumna')).pedidos.length,2);
    assert.equal((await e.ok(ruta(i,'ayuda'),'compa')).pedidos.length,0);
    assert.equal((await e.ok(ruta(i,'ayuda'),'direccion')).pedidos.length,2);
    await e.ok(`/api/chat/canales/${pedido.id}`,'compa','GET',undefined,404);
    await e.ok(`/api/chat/conversaciones/${pedido.id}/mensajes`,'alumna','POST',{contenido:'Necesito ayuda privada'},201);
    const pedir=await e.ok(`/api/chat/canales/${pedido.id}`,'direccion');
    await e.ok(`/api/chat/canales/${pedido.id}`,'direccion','PUT',{...pedir.canal,estado:'resuelto'});
    assert.equal((await e.ok(ruta(i,'ayuda'),'alumna')).pedidos.find(c=>c.id===pedido.id).estado,'resuelto');
    const docId=(await e.ok(ruta(i,'documento'),'direccion')).documentoId;
    const doc=(await e.ok(`/api/documentos/${docId}`,'direccion')).documento;
    await e.ok(`/api/documentos/${docId}`,'alumna','GET',undefined,404);
    await e.ok(`/api/documentos/${docId}`,'direccion','PUT',{version:doc.version,titulo:'Documento de la app',contenido:[{id:'p',tipo:'texto',texto:'Contenido local independiente'},{id:'a',tipo:'accionable',texto:'Explicar con mis palabras'}],publicado:true});
    assert.equal((await e.ok(`/api/documentos/${docId}`,'alumna')).documento.contenido[0].texto,'Contenido local independiente');
    await e.ok(`/api/documentos/${docId}/acciones/a`,'alumna','PUT',{completado:true,evidencia:'Mi explicación'});
    const otroDoc=(await e.ok(ruta(otra,'documento'),'otra')).documentoId;
    assert.equal((await e.ok(`/api/documentos/${otroDoc}`,'otra')).documento.contenido.length,0);
    const formId=(await e.ok(ruta(i,'formulario'),'direccion')).documentoId;
    const form=(await e.ok(`/api/documentos/${formId}`,'direccion')).documento;
    await e.ok(`/api/documentos/${formId}`,'direccion','PUT',{version:form.version,titulo:'Cuestionario integrado',publicado:true,evaluacion:{mostrarSoluciones:true,intentosMaximos:1,aprobacion:100},contenido:[{id:'q',tipo:'pregunta',texto:'Elegí el concepto',respuesta:'seleccion',opciones:['A','B'],correcta:'B',puntos:1}]});
    const visible=(await e.ok(`/api/documentos/${formId}`,'alumna')).documento;assert.equal(visible.contenido[0].correcta,undefined);
    const respondido=await e.ok(`/api/documentos/${formId}/respuestas`,'alumna','POST',{respuestas:{q:'B'}},201);assert.ok(respondido.resultado);
    const catedra=e.db.prepare("SELECT c.id FROM catedras c JOIN inscripciones i ON i.curso_id=c.curso_id JOIN usuarios u ON u.id=i.estudiante_id WHERE u.email='julieta@sanmartin.nexo.edu' LIMIT 1").get().id;
    const opciones=await e.ok(`/api/apps-publicas/instancias/${i.id}/opciones`,'direccion');assert.ok(opciones.catedras.some(c=>c.id===catedra));
    i=await e.ok(`/api/apps-publicas/instancias/${i.id}`,'direccion','PUT',{revision:i.revision,operacion:'configuracion',configuracion:{bloques:{curso:{catedraId:catedra}}}});
    assert.equal((await e.ok(ruta(i,'curso'),'alumna')).catedraId,String(catedra));
    await e.ok(`/api/apps-publicas/instancias/${otra.id}`,'otra','PUT',{revision:otra.revision,operacion:'configuracion',configuracion:{bloques:{curso:{catedraId:catedra}}}},400);
    assert.equal((await e.ok(ruta(copia,'curso'),'alumna')).catedraId,null);
    const siguiente={nombre:'Herramientas actualizadas',descripcion:'Versión nueva',bloques:[...a.bloques??[],...['chat','foro','sugerencias','ayuda','documento','formulario','curso'].map(t=>bloque(t)),bloque('extra','texto')]};
    await e.ok(`/api/apps-publicas/maestro/${a.id}/versiones`,'maestro','POST',siguiente,201);
    i=await e.ok(`/api/apps-publicas/instancias/${i.id}`,'direccion','PUT',{revision:i.revision,operacion:'version',version:2});
    assert.equal((await e.ok(ruta(i,'documento'),'direccion')).documentoId,docId);
    assert.equal((await e.ok(ruta(i,'curso'),'alumna')).catedraId,String(catedra));
    i=await e.ok(`/api/apps-publicas/instancias/${i.id}`,'direccion','PUT',{revision:i.revision,operacion:'version',version:1});
    assert.equal((await e.ok(ruta(i,'ayuda'),'alumna')).pedidos.length,2);
    assert.equal((await e.ok(`/api/documentos/${docId}/acciones`,'alumna')).acciones[0].evidencia,'Mi explicación');
    assert.deepEqual(e.db.prepare('PRAGMA foreign_key_check').all(),[]);
  }finally{await e.cerrar();}
});

test('Apps comunitarias: directorio, tablón, votos, devolución, moderación y compatibilidad de tipos con datos',async()=>{
  const e=await crearEntorno('nexo-apps-comunidad-',preparar);
  try{
    await entrar(e);
    const bloques=['directorio','tablon','propuestas','desafio'].map(t=>bloque(t));
    const a=await publicar(e,bloques);
    let i=await e.ok('/api/apps-publicas/instancias','direccion','POST',{appId:a.id},201);
    const otra=await e.ok('/api/apps-publicas/instancias','otra','POST',{appId:a.id},201);
    for(const tipo of ['directorio','tablon','propuestas','desafio'])await e.ok(`${ruta(i,tipo)}/entradas`,'alumna','POST',{titulo:`Producción ${tipo}`,contenido:'Explicación propia'},201);
    await e.ok(`${ruta(i,'directorio')}/entradas`,'alumna','POST',{titulo:'Mi ficha actualizada',contenido:'Nueva presentación'});
    assert.equal((await e.ok(ruta(i,'directorio'),'alumna')).entradas.length,1);
    const p=(await e.ok(ruta(i,'propuestas'),'alumna')).entradas[0];
    await e.ok(`${ruta(i,'propuestas')}/entradas/${p.id}`,'compa','PUT',{voto:true});await e.ok(`${ruta(i,'propuestas')}/entradas/${p.id}`,'compa','PUT',{voto:true});
    assert.equal((await e.ok(ruta(i,'propuestas'),'alumna')).entradas[0].votos,1);
    await e.ok(`${ruta(i,'propuestas')}/entradas/${p.id}`,'compa','PUT',{titulo:'Usurpada',contenido:'Otro contenido'},403);
    await e.ok(`${ruta(i,'propuestas')}/entradas/${p.id}`,'alumna','PUT',{estado:'aceptada'},403);
    await e.ok(`${ruta(i,'propuestas')}/entradas/${p.id}`,'direccion','PUT',{estado:'aceptada',devolucion:'Apliquemos la propuesta'});
    await e.ok(`${ruta(i,'propuestas')}/entradas/${p.id}`,'direccion','PUT',{oculta:true});
    assert.equal((await e.ok(ruta(i,'propuestas'),'compa')).entradas.length,0);
    assert.equal((await e.ok(ruta(i,'propuestas'),'alumna')).entradas[0].estado,'aceptada','Ocultar no borra la decisión');
    await e.ok(`${ruta(i,'propuestas')}/entradas/${p.id}`,'alumna','PUT',{oculta:false},403);
    await e.ok(`${ruta(i,'propuestas')}/entradas/${p.id}`,'direccion','PUT',{oculta:false});
    await e.ok(`${ruta(i,'propuestas')}/entradas/${p.id}`,'alumna','PUT',{titulo:'Propuesta mejorada',contenido:'Con ejemplos'});
    const final=(await e.ok(ruta(i,'propuestas'),'compa')).entradas[0];assert.equal(final.estado,'aceptada');assert.equal(final.devolucion,'Apliquemos la propuesta');assert.equal(final.titulo,'Propuesta mejorada');
    const d=(await e.ok(ruta(i,'desafio'),'alumna')).entradas[0];
    await e.ok(`${ruta(i,'desafio')}/entradas/${d.id}`,'direccion','PUT',{estado:'devuelto',devolucion:'Agregá evidencia'});
    assert.equal((await e.ok(ruta(i,'desafio'),'alumna')).entradas[0].devolucion,'Agregá evidencia');
    await e.ok(`${ruta(i,'desafio')}/entradas/${d.id}`,'direccion','PUT',{estado:'aceptada'},403);
    await e.ok(ruta(otra,'propuestas'),'alumna','GET',undefined,404);
    assert.equal((await e.ok(ruta(otra,'propuestas'),'alumnaOtra')).entradas.length,0);
    await e.ok(`/api/apps-publicas/maestro/${a.id}/versiones`,'maestro','POST',{nombre:'Cambiar tipo',descripcion:'Prueba',bloques:bloques.map(b=>b.id==='propuestas'?{...b,tipo:'tablon'}:b)},201);
    await e.ok(`/api/apps-publicas/instancias/${i.id}`,'direccion','PUT',{revision:i.revision,operacion:'version',version:2},400);
    assert.equal((await e.ok('/api/apps-publicas/instancias','direccion')).find(x=>x.id===i.id).version,1);
    i=await e.ok(`/api/apps-publicas/instancias/${i.id}`,'direccion','PUT',{revision:i.revision,operacion:'configuracion',configuracion:{nombre:'Comunidad renombrada'}});
    assert.equal((await e.ok(ruta(i,'propuestas'),'alumna')).entradas[0].contenido,'Con ejemplos');
  }finally{await e.cerrar();}
});

test('Ficha de evidencia completa y condiciones nativas honestas se preservan en versiones',async()=>{
  const e=await crearEntorno('nexo-apps-evidencia-');
  try{
    await e.entrar('maestro','sistema@nexo.edu');await e.entrar('direccion','direccion@sanmartin.nexo.edu');
    const evidencia={estado:'mixta',resumen:'Adultos que practican recuperación',limites:'Depende de diseño y objetivos',revisadoEn:'2026-11-11',fuentes:[{titulo:'Estudio primario',url:'https://example.org/estudio'},{titulo:'Replicación',url:'https://example.org/replica'}]};
    const a=await publicar(e,[{...bloque('practica','desafio'),evidencia}]);
    const i=await e.ok('/api/apps-publicas/instancias','direccion','POST',{appId:a.id},201);
    assert.deepEqual(i.definicion.bloques[0].evidencia.fuentes,evidencia.fuentes);assert.equal(i.definicion.bloques[0].evidencia.revisadoEn,evidencia.revisadoEn);assert.equal(i.definicion.bloques[0].evidencia.resumen,evidencia.resumen);
    for(const tipo of ['chat','foro','ayuda','sugerencias','documento','formulario','curso'])await e.ok('/api/apps-publicas/maestro','maestro','POST',{nombre:'Condición visual inválida',bloques:[bloque('inicio','bienvenida'),{...bloque('nativo',tipo),dependeDe:'inicio'}]},400);
    await e.ok('/api/apps-publicas/maestro','maestro','POST',{nombre:'Fecha inválida',bloques:[{...bloque('e','texto'),evidencia:{...evidencia,revisadoEn:'2026-02-30'}}]},400);
  }finally{await e.cerrar();}
});
