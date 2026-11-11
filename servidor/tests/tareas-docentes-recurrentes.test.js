import test from 'node:test';
import assert from 'node:assert/strict';
import {crearEntorno} from './entorno.js';
import {hoyLocal} from '../tareas-recurrencia-docente.js';
import {sumarDias} from '../agenda.js';

test('serie docente genera sin duplicados y conserva rúbricas, adjuntos, equipos y notas independientes',async()=>{
  const e=await crearEntorno('nexo-docente-serie-');
  try{
    await e.entrar('profe','garcia@sanmartin.nexo.edu');await e.entrar('alumna','julieta@sanmartin.nexo.edu');
    const hoy=hoyLocal();
    const a=await e.crudo('/api/archivos','profe',{method:'POST',headers:{'Content-Type':'text/plain','X-Nombre-Archivo':'consigna.txt'},body:Buffer.from('Consigna recurrente')});assert.equal(a.status,201);
    const datos={catedraId:'1',titulo:'Práctica de equipo',consigna:'Resolver y explicar',fechaLimite:hoy,metodoEstudio:'recuperación',tipoAsignacion:'grupal',rubrica:['Explicación'],adjuntos:[a.datos.archivo.id],recurrencia:{frecuencia:'diaria',intervalo:1,veces:3},anticipacionDias:0};
    const t=await e.ok('/api/tareas','profe','POST',datos,201);
    await e.ok(`/api/tareas/${t.id}/equipos`,'profe','POST',{nombre:'Equipo recurrente',estudiantes:['8','9']},201);
    let serie=await e.ok(`/api/tareas/${t.id}/serie`,'profe');assert.equal(serie.ocurrencias.length,1);
    await e.ok(`/api/tareas/${t.id}/serie`,'profe','PUT',{version:serie.serieVersion,anticipacionDias:2});
    const generado=await e.ok(`/api/tareas/${t.id}/serie/generar`,'profe','POST',{});assert.equal(generado.generadas.length,2);
    assert.equal((await e.ok(`/api/tareas/${t.id}/serie/generar`,'profe','POST',{})).generadas.length,0);
    await e.ok(`/api/tareas/${t.id}`,'profe','PUT',{titulo:'Cambio sólo esta tarea',consigna:'Otro enunciado',fechaLimite:hoy,tipoAsignacion:'individual'});
    serie=await e.ok(`/api/tareas/${t.id}/serie`,'profe');assert.deepEqual(serie.ocurrencias.map(x=>x.fechaLimite),[hoy,sumarDias(hoy,1),sumarDias(hoy,2)]);
    for(const copia of serie.ocurrencias.slice(1)){
      assert.deepEqual(JSON.parse(e.db.prepare('SELECT rubrica FROM tareas WHERE id=?').get(Number(copia.id)).rubrica),['Explicación']);
      assert.equal(e.db.prepare('SELECT archivo_id FROM tarea_adjuntos WHERE tarea_id=?').get(Number(copia.id)).archivo_id,Number(a.datos.archivo.id));
      assert.equal((await e.ok(`/api/tareas/${copia.id}/equipos`,'profe')).equipos[0].miembros.length,2);
    }
    const conHistoria=serie.ocurrencias[1].id,sinHistoria=serie.ocurrencias[2].id;
    const entrega=await e.ok(`/api/tareas/${conHistoria}/entrega`,'alumna','POST',{comentario:'Primera producción',archivos:[]},201);
    await e.ok(`/api/entregas/${entrega.id}/correccion`,'profe','POST',{nota:8,devolucion:'Revisá el ejemplo',criterios:{}});
    await e.ok(`/api/tareas/${t.id}`,'profe','PUT',{...datos,titulo:'Consigna mejorada',serieVersion:serie.serieVersion,anticipacionDias:2,actualizarFuturas:true});
    assert.equal(e.db.prepare('SELECT titulo FROM tareas WHERE id=?').get(Number(conHistoria)).titulo,'Práctica de equipo');
    assert.equal(e.db.prepare('SELECT titulo FROM tareas WHERE id=?').get(Number(sinHistoria)).titulo,'Consigna mejorada');
    assert.equal(e.db.prepare('SELECT nota FROM correcciones WHERE entrega_id=?').get(Number(entrega.id)).nota,8);
    assert.equal(e.db.prepare('SELECT COUNT(*) AS n FROM entregas WHERE tarea_id=?').get(Number(sinHistoria)).n,0);
    assert.equal((await e.request(`/api/tareas/${t.id}/serie`,'alumna')).status,403);
  }finally{await e.cerrar();}
});

test('pausar/reanudar conserva ocurrencias; regla cuenta original y rechaza fechas/versiones inválidas',async()=>{
  const e=await crearEntorno('nexo-docente-serie-pausa-');
  try{
    await e.entrar('profe','garcia@sanmartin.nexo.edu');const hoy=hoyLocal();
    const datos={catedraId:'1',titulo:'Repetición controlada',consigna:'Una práctica',fechaLimite:hoy,tipoAsignacion:'individual',adjuntos:[],recurrencia:{frecuencia:'diaria',intervalo:1,veces:2},anticipacionDias:2,recurrenciaActiva:false};
    assert.equal((await e.request('/api/tareas','profe','POST',{...datos,fechaLimite:'2026-02-31'})).status,400);
    const t=await e.ok('/api/tareas','profe','POST',datos,201);let s=await e.ok(`/api/tareas/${t.id}/serie`,'profe');
    assert.equal((await e.ok(`/api/tareas/${t.id}/serie/generar`,'profe','POST',{})).generadas.length,0);
    assert.equal((await e.request(`/api/tareas/${t.id}/serie`,'profe','PUT',{version:99,activa:true})).status,409);
    await e.ok(`/api/tareas/${t.id}/serie`,'profe','PUT',{version:s.serieVersion,activa:true});
    assert.equal((await e.ok(`/api/tareas/${t.id}/serie/generar`,'profe','POST',{})).generadas.length,1);
    const copia=e.db.prepare('SELECT titulo,consigna FROM tareas WHERE serie_id=? AND id<>?').get(Number(s.serieId),Number(t.id));
    assert.deepEqual({...copia},{titulo:'Repetición controlada',consigna:'Una práctica'},'Editar sólo esta ocurrencia no cambia la plantilla futura');
    s=await e.ok(`/api/tareas/${t.id}/serie`,'profe');await e.ok(`/api/tareas/${t.id}/serie`,'profe','PUT',{version:s.serieVersion,activa:false});
    assert.equal((await e.ok(`/api/tareas/${t.id}/serie`,'profe')).ocurrencias.length,2);
    assert.equal((await e.ok(`/api/tareas/${t.id}/serie/generar`,'profe','POST',{})).generadas.length,0);
    assert.equal((await e.request(`/api/tareas/${t.id}/serie`,'profe','PUT',{anticipacionDias:91})).status,400);
  }finally{await e.cerrar();}
});
