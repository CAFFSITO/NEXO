import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearEntorno } from './entorno.js';

const banco=[{concepto:'Fracción',definicion:'Parte de un total',ejemplo:'Media pizza',pasosResueltos:['Identificar el total','Dividir en partes iguales']},{concepto:'Porcentaje',definicion:'Partes de cien'},{concepto:'Proporción',definicion:'Relación entre cantidades'}];
test('reabrir un accionable obligatorio revoca las prácticas detrás del prerrequisito',async()=>{
  const e=await crearEntorno('nexo-estudio-prerrequisito-');
  try{
    await e.entrar('docente','garcia@sanmartin.nexo.edu');await e.entrar('alumna','julieta@sanmartin.nexo.edu');
    const raiz='/api/catedras/1/lecciones';
    const crear=async(tipo,padreId,titulo,extra={})=>(await e.ok(raiz,'docente','POST',{tipo,padreId,titulo,descripcion:'',documentoId:null,accionables:[],disponibleDesde:null,prerrequisitoId:null,publicado:true,...extra},201)).nodo;
    const m=await crear('modulo',null,'M'),s=await crear('seccion',m.id,'S');
    const previa=await crear('leccion',s.id,'Preparar',{actividades:[{titulo:'Explicar el caso',obligatoria:true}]});
    const destino=await crear('leccion',s.id,'Aplicar',{prerrequisitoId:previa.id});
    const p=await e.ok('/api/estudio/practicas','docente','POST',{metodo:'recuperacion',titulo:'Práctica condicionada',banco,visibilidad:'institucion',leccionId:destino.id},201);
    await e.ok(`${raiz}/${previa.id}/acciones/${previa.actividades[0].id}/progreso`,'alumna','PUT',{completada:true,evidencia:'Preparación terminada'});
    await e.ok(`${raiz}/${previa.id}/progreso`,'alumna','POST',{estado:'realizado'});
    assert.equal((await e.request(`/api/estudio/practicas/${p.id}`,'alumna')).status,200);
    await e.ok(`${raiz}/${previa.id}/acciones/${previa.actividades[0].id}/progreso`,'alumna','PUT',{completada:false});
    assert.equal((await e.request(`/api/estudio/practicas/${p.id}`,'alumna')).status,404);
  }finally{await e.cerrar();}
});
test('memoria por concepto, ayuda editable, agenda idempotente y valoración docente separada',async()=>{
  const e=await crearEntorno('nexo-estudio-memoria-');
  try{
    await e.entrar('docente','garcia@sanmartin.nexo.edu');await e.entrar('alumna','julieta@sanmartin.nexo.edu');await e.entrar('otro','lombardi@sanmartin.nexo.edu');
    const p=await e.ok('/api/estudio/practicas','docente','POST',{metodo:'progresiva',titulo:'Memoria',banco,visibilidad:'institucion'},201),ruta=`/api/estudio/practicas/${p.id}`;
    let d=await e.ok(ruta,'alumna');assert.deepEqual(d.actividad.indicesConceptos,[0]);
    assert.equal((await e.ok(`${ruta}?dificultad=1`,'alumna')).actividad.apoyo.definicion,banco[0].definicion);
    assert.equal((await e.ok(`${ruta}?dificultad=3`,'alumna')).actividad.apoyo,null);
    await e.ok(`${ruta}/intentos`,'alumna','POST',{respuesta:'Primera explicación',calidad:3,numero:0},201);
    assert.equal((await e.request(`${ruta}/intentos`,'alumna','POST',{respuesta:'Pestaña vieja',calidad:2,numero:0})).status,409);
    d=await e.ok(ruta,'alumna');assert.deepEqual(d.actividad.indicesConceptos,[1]);assert.equal(d.memoria[0].intentos,1);
    const a=await e.ok(`${ruta}/agenda`,'alumna','POST',{}),b=await e.ok(`${ruta}/agenda`,'alumna','POST',{});assert.equal(a.evento.id,b.evento.id);
    await e.ok(`${ruta}/intentos`,'alumna','POST',{respuesta:'Segunda explicación',calidad:0,numero:1},201);
    assert.equal(e.db.prepare('SELECT COUNT(*) AS n FROM estudio_agenda WHERE practica_id=?').get(p.id).n,1);
    const agenda=await e.ok(`${ruta}/agenda`,'alumna','POST',{});assert.equal(agenda.evento.id,a.evento.id);
    const antes=e.db.prepare('SELECT fecha FROM eventos WHERE id=?').get(a.evento.id).fecha;
    e.db.prepare("UPDATE estudio_memoria SET siguiente_el='2000-01-01' WHERE practica_id=? AND concepto=0").run(p.id);
    d=await e.ok(ruta,'alumna');assert.deepEqual(d.actividad.indicesConceptos,[0]);
    await e.ok(`${ruta}/intentos`,'alumna','POST',{respuesta:'Recuerdo otra vez',calidad:0,numero:2},201);
    assert.ok(e.db.prepare('SELECT fecha FROM eventos WHERE id=?').get(a.evento.id).fecha>=antes);
    assert.equal((await e.ok(ruta,'otro')).memoria.length,0);
    assert.equal((await e.request(`${ruta}/panel`,'alumna')).status,403);
    const panel=await e.ok(`${ruta}/panel`,'docente');assert.equal(panel.alumnos[0].intentos.length,3);
    await e.ok(`${ruta}/evaluaciones`,'docente','PUT',{usuarioId:panel.alumnos[0].id,concepto:0,logrado:false,criterio:'Aplicar en un caso nuevo',devolucion:'La definición está; explicá la transferencia.'});
    d=await e.ok(ruta,'alumna');assert.equal(d.evaluaciones[0].logrado,0);assert.equal(d.memoria[0].calidad,0);
    assert.equal((await e.request(`${ruta}/evaluaciones`,'otro','PUT',{})).status,403);
  }finally{await e.cerrar();}
});

test('mapa guarda conexiones privadas con control de versión y coopera por turnos reales',async()=>{
  const e=await crearEntorno('nexo-estudio-colaboracion-');
  try{
    await e.entrar('docente','garcia@sanmartin.nexo.edu');await e.entrar('alumna','julieta@sanmartin.nexo.edu');await e.entrar('otro','lombardi@sanmartin.nexo.edu');
    const mapa=await e.ok('/api/estudio/practicas','docente','POST',{metodo:'conexiones',titulo:'Mapa',banco,visibilidad:'institucion'},201),ruta=`/api/estudio/practicas/${mapa.id}`;
    await e.ok(`${ruta}/mapa`,'alumna','PUT',{version:0,vinculos:[{de:0,a:1,relacion:'Puede expresarse como'}]});
    assert.equal((await e.ok(ruta,'alumna')).mapa.vinculos.length,1);assert.equal((await e.ok(ruta,'otro')).mapa.vinculos.length,0);
    assert.equal((await e.request(`${ruta}/mapa`,'alumna','PUT',{version:0,vinculos:[]})).status,409);
    assert.equal((await e.request(`${ruta}/mapa`,'alumna','PUT',{version:1,vinculos:[{de:0,a:0,relacion:'Ciclo trivial'}]})).status,400);
    const cooperativa=await e.ok('/api/estudio/practicas','docente','POST',{metodo:'cooperativa',titulo:'Explicar juntos',banco,visibilidad:'institucion'},201),base=`/api/estudio/practicas/${cooperativa.id}/sesiones`;
    const alumno=e.db.prepare("SELECT id FROM usuarios WHERE email='julieta@sanmartin.nexo.edu'").get().id;
    const s=await e.ok(base,'docente','POST',{participantes:[alumno]},201);
    let sesion=await e.ok(`${base}/${s.id}`,'alumna');assert.equal(sesion.turno.fase,'explicacion');
    assert.equal((await e.request(`${base}/${s.id}`,'otro')).status,404);
    assert.equal((await e.request(`${base}/${s.id}/aportes`,'alumna','POST',{version:0,contenido:'Me adelanto'})).status,403);
    await e.ok(`${base}/${s.id}/aportes`,'docente','POST',{version:0,contenido:'Una fracción expresa una parte.'},201);
    sesion=await e.ok(`${base}/${s.id}`,'alumna');assert.equal(sesion.turno.fase,'pregunta');assert.equal(sesion.turno.usuarioId,alumno);
    await e.ok(`${base}/${s.id}/aportes`,'alumna','POST',{version:1,contenido:'¿Qué pasa si las partes no son iguales?'},201);
    await e.ok(`${base}/${s.id}/aportes`,'docente','POST',{version:2,contenido:'Reviso mi definición: deben ser partes iguales.'},201);
    sesion=await e.ok(`${base}/${s.id}`,'alumna');assert.equal(sesion.turno.ronda,2);assert.equal(sesion.turno.usuarioId,alumno);assert.equal(sesion.aportes.length,3);
    assert.equal((await e.request(`${base}/${s.id}/aportes`,'alumna','POST',{version:2,contenido:'Versión vieja'})).status,409);
    await e.ok(`${base}/${s.id}/cerrar`,'docente','PUT',{});
    assert.equal((await e.request(`${base}/${s.id}/aportes`,'alumna','POST',{version:3,contenido:'Sesión cerrada'})).status,409);
  }finally{await e.cerrar();}
});
