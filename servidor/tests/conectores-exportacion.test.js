import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { idExportacion, uuidExportacion, eventoCalendar, tareaTodoist, camposCalendar, camposTodoist, huellaCampos } from '../conectores-exportacion.js';
import { crearEntorno } from './entorno.js';

test('adaptadores: ID estable, fechas de Calendar y comando Todoist repetible',()=>{
  const id=idExportacion(12,'evento',34);
  assert.match(id,/^[a-f0-9]{64}$/);
  assert.equal(id,idExportacion(12,'evento',34));
  assert.notEqual(id,idExportacion(13,'evento',34));
  assert.equal(uuidExportacion(12,'tarea-personal',34,'crear'),uuidExportacion(12,'tarea-personal',34,'crear'));
  const c=eventoCalendar({titulo:'Clase',descripcion:'Tema',fecha:'2026-10-30',fecha_fin:'2026-10-31'},id);
  assert.equal(c.end.date,'2026-11-01');
  assert.equal(c.extendedProperties.private.nexoExportId,id);
  assert.equal(huellaCampos(camposCalendar(c)),huellaCampos(camposCalendar({...c,etag:'externo'})));
  const t=tareaTodoist({titulo:'Repasar',descripcion:'Capítulo 1',fecha_limite:'2026-11-02'});
  assert.deepEqual(t.due,{date:'2026-11-02'});
  assert.deepEqual(camposTodoist(t),{content:'Repasar',description:'Capítulo 1',due:'2026-11-02'});
  assert.throws(()=>eventoCalendar({titulo:'X',fecha:'2026-10-30',hora_inicio:'10:00',hora_fin:'11:00'},id),/zona horaria/);
  for (const hora of ['24:00','29:30','08:60']) assert.throws(()=>eventoCalendar({titulo:'X',fecha:'2026-10-30',hora_inicio:hora,hora_fin:'23:59'},id,'America/Argentina/Buenos_Aires'),/hora inicial/);
  assert.throws(()=>eventoCalendar({titulo:'X',fecha:'2026-10-30',hora_inicio:'10:00',hora_fin:'09:00'},id,'America/Argentina/Buenos_Aires'),/posterior/);
  assert.throws(()=>eventoCalendar({titulo:'X',fecha:'2026-10-30',fecha_fin:'2026-10-29'},id),/posterior/);
});

test('exportación: autenticación, pertenencia y roles antes de llamar APIs externas',async()=>{
  const e=await crearEntorno('nexo-conector-export-',()=>{}, {NEXO_CONECTORES_KEY:randomBytes(32).toString('base64')});
  try {
    await e.entrar('alumno','julieta@sanmartin.nexo.edu');
    await e.entrar('profesor','garcia@sanmartin.nexo.edu');
    assert.equal((await e.request('/api/conectores/calendar/exportar',null,'POST',{id:1})).status,401);
    assert.equal((await e.request('/api/conectores/todoist/exportar','profesor','POST',{id:1})).status,403);
    assert.equal((await e.request('/api/conectores/calendar/exportar','alumno','POST',{id:1})).status,409);
    await e.ok('/api/conectores/cuentas','alumno','POST',{proveedor:'todoist',token:'token-simulado',nombre:'Prueba'},201);
    assert.equal((await e.request('/api/conectores/todoist/exportar','alumno','POST',{id:999999})).status,404);
    const lista=await e.ok('/api/conectores/todoist/exportables','alumno');
    assert.ok(Array.isArray(lista.elementos));
  } finally {await e.cerrar();}
});
