import test from 'node:test';
import assert from 'node:assert/strict';
import { crearEntorno } from './entorno.js';

test('entrega, rúbrica, nueva versión y revisión entre pares conservan una sola nota vigente', async () => {
  const e = await crearEntorno('nexo-aprendizaje-');
  try {
    await e.entrar('profesor', 'garcia@sanmartin.nexo.edu');
    await e.entrar('julieta', 'julieta@sanmartin.nexo.edu');
    await e.entrar('martin', 'martin@sanmartin.nexo.edu');
    const catedra = e.db.prepare(`SELECT ca.id FROM catedras ca JOIN inscripciones i ON i.curso_id=ca.curso_id
      WHERE ca.profesor_id=2 AND i.estudiante_id=8 AND EXISTS
      (SELECT 1 FROM inscripciones x WHERE x.curso_id=ca.curso_id AND x.estudiante_id=9) LIMIT 1`).get();
    assert.ok(catedra);
    const tarea = await e.ok('/api/tareas', 'profesor', 'POST', {
      catedraId: catedra.id, titulo: 'Explicar y mejorar', consigna: 'Argumentá tu respuesta',
      fechaLimite: '2099-12-31', rubrica: ['Claridad', 'Evidencia'],
    }, 201);
    const primera = await e.ok(`/api/tareas/${tarea.id}/entrega`, 'julieta', 'POST', { comentario: 'Primera versión', archivos: [] }, 201);
    await e.ok(`/api/entregas/${primera.id}/correccion`, 'profesor', 'POST', {
      nota: 6, devolucion: 'Agregá un ejemplo', criterios: { Claridad: 'Se entiende', Evidencia: 'Falta un caso concreto' },
    });
    const calificacionPrimera = (await e.ok('/api/portafolio', 'julieta')).tareas.find(t => t.id === tarea.id);
    assert.equal(calificacionPrimera.nota, 6);
    const segunda = await e.ok(`/api/tareas/${tarea.id}/entrega`, 'julieta', 'POST', {
      comentario: 'Versión con ejemplo', archivos: [], nuevaVersion: true,
    }, 201);
    assert.notEqual(segunda.id, primera.id);
    const historia = await e.ok(`/api/tareas/${tarea.id}/entregas/historial`, 'julieta');
    assert.equal(historia.versiones.length, 2);
    assert.equal(historia.versiones.find(v => v.id === primera.id).nota, 6);
    const historiaDocente = await e.ok(`/api/tareas/${tarea.id}/entregas/historial?estudianteId=8`, 'profesor');
    assert.equal(historiaDocente.versiones.length, 2);
    assert.equal((await e.ok(`/api/tareas/${tarea.id}/entregas/historial?estudianteId=9`, 'julieta')).versiones.length, 2);
    assert.equal((await e.ok('/api/portafolio', 'julieta')).tareas.find(t => t.id === tarea.id).nota, null);
    await e.ok(`/api/entregas/${segunda.id}/revisores`, 'profesor', 'POST', { revisorId: '9' }, 201);
    await e.ok(`/api/entregas/${segunda.id}/revisores`, 'julieta', 'POST', { revisorId: '9' }, 403);
    const pendientes = await e.ok('/api/revisiones-pares/pendientes', 'martin');
    const revision = pendientes.revisiones.find(r => r.titulo === 'Explicar y mejorar');
    assert.ok(revision);
    const trabajo = await e.ok(`/api/revisiones-pares/${revision.id}/entrega`, 'martin');
    assert.equal(trabajo.comentario, 'Versión con ejemplo');
    await e.ok(`/api/revisiones-pares/${revision.id}/entrega`, 'julieta', 'GET', undefined, 404);
    await e.ok(`/api/revisiones-pares/${revision.id}`, 'martin', 'PUT', { comentario: 'El ejemplo ayuda; agregaría una fuente.' });
    const pares = await e.ok(`/api/entregas/${segunda.id}/revisiones-pares`, 'julieta');
    assert.match(pares.revisiones[0].comentario, /fuente/);
    await e.ok(`/api/entregas/${segunda.id}/correccion`, 'profesor', 'POST', {
      nota: 9, devolucion: 'Mejoró el argumento', criterios: { Claridad: 'Muy clara', Evidencia: 'Ejemplo válido' },
    });
    assert.equal((await e.ok('/api/portafolio', 'julieta')).tareas.find(t => t.id === tarea.id).nota, 9);
    const tablero = await e.ok('/api/tareas/docente', 'profesor');
    const fila = tablero.tareas.find(t => t.id === tarea.id);
    assert.equal(fila.reentregadas, 1);
    assert.equal(fila.porCorregir, 0);
    assert.equal(fila.revisionesParesPendientes, 0);
  } finally { await e.cerrar(); }
});

test('accionables anidados se aíslan por dueño y reubican hijos al borrar un paso', async () => {
  const e = await crearEntorno('nexo-accionables-');
  try {
    await e.entrar('julieta', 'julieta@sanmartin.nexo.edu');
    await e.entrar('martin', 'martin@sanmartin.nexo.edu');
    await e.entrar('docente', 'garcia@sanmartin.nexo.edu');
    const meta = await e.ok('/api/objetivos/metas', 'julieta', 'POST', {
      titulo: 'Proyecto anidado', venceEl: '2099-12-31', subtareas: [],
    }, 201);
    const padre = await e.ok(`/api/objetivos/metas/${meta.id}/subtareas`, 'julieta', 'POST', { titulo: 'Investigar' }, 201);
    const hijo = await e.ok(`/api/objetivos/metas/${meta.id}/subtareas`, 'julieta', 'POST', { titulo: 'Buscar fuentes', padreId: padre.id }, 201);
    const archivo = await e.crudo('/api/archivos','julieta',{method:'POST',headers:{'Content-Type':'text/plain','X-Nombre-Archivo':'fuentes.txt'},body:Buffer.from('Fuentes verificadas')});
    assert.equal(archivo.status,201);
    const archivoId=archivo.datos.archivo.id;
    await e.ok(`/api/objetivos/subtareas/${hijo.id}`,'julieta','PUT',{archivoId});
    await e.ok(`/api/objetivos/subtareas/${hijo.id}`,'martin','PUT',{archivoId},404);
    await e.ok(`/api/objetivos/subtareas/${hijo.id}`,'julieta','PUT',{archivoId:'999999'},400);
    await e.ok(`/api/objetivos/subtareas/${hijo.id}`, 'julieta', 'PUT', { dependeDeId: padre.id, evidencia: 'Dos fuentes contrastadas' });
    await e.ok(`/api/objetivos/subtareas/${hijo.id}`, 'julieta', 'PUT', { completada: true }, 409);
    await e.ok(`/api/objetivos/subtareas/${padre.id}`, 'julieta', 'PUT', { dependeDeId: hijo.id }, 400);
    await e.ok(`/api/objetivos/subtareas/${padre.id}`,'julieta','PUT',{responsableId:'2'});
    assert.ok((await e.ok('/api/objetivos/responsables','julieta')).personas.some(p=>p.id==='2'));
    await e.ok(`/api/objetivos/subtareas/${padre.id}`,'julieta','PUT',{responsableId:'999999'},400);
    assert.ok((await e.ok('/api/objetivos/pasos-asignados','docente')).pasos.some(p=>p.id===padre.id));
    assert.ok(!(await e.ok('/api/objetivos/pasos-asignados','martin')).pasos.some(p=>p.id===padre.id));
    await e.ok(`/api/objetivos/pasos-asignados/${padre.id}/avance`,'martin','PUT',{completada:true},404);
    await e.ok(`/api/objetivos/pasos-asignados/${padre.id}/avance`,'docente','PUT',{evidencia:'Fuentes revisadas',completada:true});
    const fuenteDocente=await e.crudo('/api/archivos','docente',{method:'POST',headers:{'Content-Type':'text/plain','X-Nombre-Archivo':'fuentes-docente.txt'},body:Buffer.from('Fuente docente')});
    const archivoDocenteId=fuenteDocente.datos.archivo.id;
    await e.ok(`/api/objetivos/pasos-asignados/${padre.id}/avance`,'docente','PUT',{archivoId:archivoDocenteId});
    assert.equal((await e.crudo(`/api/archivos/${archivoDocenteId}`,'julieta')).status,200);
    assert.equal((await e.crudo(`/api/archivos/${archivoDocenteId}`,'martin')).status,403);
    await e.ok(`/api/objetivos/subtareas/${hijo.id}`, 'julieta', 'PUT', { completada: true });
    await e.ok(`/api/objetivos/subtareas/${padre.id}`, 'julieta', 'PUT', { completada: false }, 409);
    await e.ok(`/api/objetivos/metas/${meta.id}/subtareas`, 'martin', 'POST', { titulo: 'Ajeno', padreId: padre.id }, 404);
    let guardada = (await e.ok('/api/objetivos', 'julieta')).metas.find(m => m.id === meta.id);
    assert.equal(guardada.subtareas.find(s => s.id === hijo.id).padreId, padre.id);
    assert.equal(guardada.subtareas.find(s => s.id === hijo.id).evidencia, 'Dos fuentes contrastadas');
    assert.equal(guardada.subtareas.find(s => s.id === hijo.id).archivoId, archivoId);
    await e.ok(`/api/objetivos/subtareas/${padre.id}`, 'julieta', 'DELETE');
    guardada = (await e.ok('/api/objetivos', 'julieta')).metas.find(m => m.id === meta.id);
    assert.equal(guardada.subtareas.find(s => s.id === hijo.id).padreId, null);
    assert.equal(guardada.subtareas.find(s => s.id === hijo.id).dependeDeId, null);
  } finally { await e.cerrar(); }
});

test('una entrega grupal comparte versión, nota e historial con todos sus integrantes', async () => {
  const e = await crearEntorno('nexo-equipos-');
  try {
    await e.entrar('profesor', 'garcia@sanmartin.nexo.edu');
    await e.entrar('julieta', 'julieta@sanmartin.nexo.edu');
    await e.entrar('martin', 'martin@sanmartin.nexo.edu');
    const catedra = e.db.prepare(`SELECT ca.id FROM catedras ca JOIN inscripciones i ON i.curso_id=ca.curso_id
      WHERE ca.profesor_id=2 AND i.estudiante_id=8 AND EXISTS
      (SELECT 1 FROM inscripciones x WHERE x.curso_id=ca.curso_id AND x.estudiante_id=9) LIMIT 1`).get();
    const tarea = await e.ok('/api/tareas', 'profesor', 'POST', {
      catedraId:catedra.id, titulo:'Proyecto grupal', consigna:'Entreguen juntos',
      fechaLimite:'2099-12-31', tipoAsignacion:'grupal',
    },201);
    await e.ok(`/api/tareas/${tarea.id}/entrega`, 'martin', 'POST', {comentario:'Antes de asignar',archivos:[]},409);
    const equipo=await e.ok(`/api/tareas/${tarea.id}/equipos`,'profesor','POST',{nombre:'Equipo uno',estudiantes:['8','9']},201);
    assert.ok(equipo.id);
    const subida=await e.crudo('/api/archivos','martin',{method:'POST',headers:{'Content-Type':'text/plain','X-Nombre-Archivo':'equipo.txt'},body:Buffer.from('Trabajo conjunto')});
    assert.equal(subida.status,201);
    const archivoId=subida.datos.archivo.id;
    assert.equal((await e.crudo(`/api/archivos/${archivoId}`,'julieta')).status,403);
    const entrega=await e.ok(`/api/tareas/${tarea.id}/entrega`,'martin','POST',{comentario:'Trabajo conjunto',archivos:[archivoId]},201);
    assert.equal((await e.crudo(`/api/archivos/${archivoId}`,'julieta')).status,200);
    assert.equal((await e.ok(`/api/tareas/${tarea.id}`,'julieta')).entrega.id,entrega.id);
    const panel=await e.ok(`/api/tareas/${tarea.id}/panel`,'profesor');
    assert.equal(panel.alumnos.find(a=>a.estudianteId==='8').entregaId,entrega.id);
    assert.equal(panel.alumnos.find(a=>a.estudianteId==='9').entregaId,entrega.id);
    await e.ok(`/api/entregas/${entrega.id}/revisores`,'profesor','POST',{revisorId:'8'},400);
    const tablero=await e.ok('/api/tareas/docente','profesor');
    assert.equal(tablero.tareas.find(t=>t.id===tarea.id).alDia,2);
    await e.ok(`/api/entregas/${entrega.id}/correccion`,'profesor','POST',{nota:8,devolucion:'Buen trabajo'});
    assert.equal((await e.ok('/api/portafolio','julieta')).tareas.find(t=>t.id===tarea.id).nota,8);
    assert.equal((await e.ok('/api/portafolio','martin')).tareas.find(t=>t.id===tarea.id).nota,8);
    const nueva=await e.ok(`/api/tareas/${tarea.id}/entrega`,'julieta','POST',{comentario:'Equipo mejorado',archivos:[],nuevaVersion:true},201);
    assert.notEqual(nueva.id,entrega.id);
    assert.equal((await e.ok(`/api/tareas/${tarea.id}`,'martin')).entrega.id,nueva.id);
    assert.equal((await e.ok(`/api/tareas/${tarea.id}/entregas/historial`,'martin')).versiones.length,2);
    await e.ok(`/api/tareas/${tarea.id}/equipos/${equipo.id}`,'profesor','DELETE',undefined,409);
  } finally { await e.cerrar(); }
});
