import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import WebSocket from 'ws';
import { crearEntorno } from './entorno.js';
import { migrarCanales } from '../canales.js';

test('Migración de canales conserva historial, relaciones, vistas e índices al repetirse', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(readFileSync(new URL('../../base-de-datos/esquema.sql', import.meta.url), 'utf8').replace("'clase','canal'", "'clase'"));
    db.exec(readFileSync(new URL('../../base-de-datos/datos-iniciales.sql', import.meta.url), 'utf8'));
    const tablas = ['conversaciones', 'conversacion_miembros', 'mensajes'];
    const antes = tablas.map(tabla => db.prepare(`SELECT * FROM ${tabla} ORDER BY rowid`).all());
    migrarCanales(db); migrarCanales(db);
    assert.deepEqual(tablas.map(tabla => db.prepare(`SELECT * FROM ${tabla} ORDER BY rowid`).all()), antes);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    db.prepare('SELECT * FROM v_no_leidos').all();
    assert.ok(db.prepare("SELECT 1 FROM sqlite_master WHERE name='idx_mensajes_pagina'").get());
    db.exec("INSERT INTO conversaciones(tipo) VALUES('canal')");
    assert.throws(() => db.exec("INSERT INTO conversaciones(tipo) VALUES('inventado')"));
  } finally { db.close(); }
});

test('Canales: circuitos persistentes, contextos, historial y aislamiento', async t => {
  const e = await crearEntorno('nexo-canales-', db => {
    db.exec("INSERT INTO instituciones(id,nombre,ciclo_lectivo) VALUES(990,'Ajena',2026)");
    db.exec("INSERT INTO usuarios(institucion_id,email,hash_contrasena,nombre,rol) SELECT 990,'ajena@nexo.test',hash_contrasena,'Ajena','estudiante' FROM usuarios WHERE id=8");
  });
  const { ok, db, crudo, request } = e;
  const crear = async (quien, datos) => (await ok('/api/chat/canales', quien, 'POST', { nombre:'Espacio de prueba',clase:'canal',visibilidad:'privada',...datos }, 201)).canal;
  const enviar = async (id, quien, contenido, extras={}) => (await ok(`/api/chat/conversaciones/${id}/mensajes`,quien,'POST',{contenido,...extras},201)).mensaje;
  const listar = async quien => (await ok('/api/chat/canales',quien)).canales;
  try {
    for (const [quien,email] of Object.entries({direccion:'direccion@sanmartin.nexo.edu',profesor:'garcia@sanmartin.nexo.edu',julieta:'julieta@sanmartin.nexo.edu',martin:'martin@sanmartin.nexo.edu',ajena:'ajena@nexo.test'})) await e.entrar(quien,email);

    await t.test('Canales respetan los perfiles habilitados y no amplían acceso a Maestro o centro',async()=>{
      for(const [quien,email] of Object.entries({familia:'familia.rossi@sanmartin.nexo.edu',preceptor:'pereyra@sanmartin.nexo.edu',biblioteca:'biblioteca@sanmartin.nexo.edu',centro:'centro@sanmartin.nexo.edu',maestro:'sistema@nexo.edu'})) await e.entrar(quien,email);
      const secretaria=await ok('/api/perfiles','direccion','POST',{nombre:'Secretaría Prueba',email:'secretaria@sanmartin.nexo.edu',rol:'secretaria'},201);
      await e.entrar('secretaria',secretaria.email,secretaria.contrasenaInicial);
      await ok('/api/cuenta/primer-ingreso','secretaria','POST',{});
      for(const quien of ['direccion','profesor','julieta','familia','preceptor','biblioteca','secretaria']) {
        await ok('/api/chat/canales',quien);
        const canal=await crear(quien,{nombre:`Espacio ${quien}`});
        await enviar(canal.id,quien,'Saludo del perfil');
      }
      for(const quien of ['centro','maestro']) await ok('/api/chat/canales',quien,'GET',undefined,403);
      await ok('/api/chat/canales',null,'GET',undefined,401);
    });

    await t.test('Canal público requiere unirse; el privado y sus mensajes no se descubren fuera de sus miembros', async () => {
      const publico=await crear('julieta',{nombre:'Encuentros sociales',visibilidad:'institucion'});
      assert.equal((await listar('martin')).find(c=>c.id===publico.id).miembro,false);
      await ok(`/api/chat/conversaciones/${publico.id}/mensajes`,'martin','GET',undefined,403);
      await ok(`/api/chat/canales/${publico.id}/unirse`,'martin','POST',{});
      await enviar(publico.id,'martin','Hola comunidad');
      const privado=await crear('julieta',{miembros:[9]});
      assert.ok(!(await listar('profesor')).some(c=>c.id===privado.id));
      assert.ok(!(await listar('ajena')).some(c=>c.id===publico.id));
      await ok(`/api/chat/canales/${privado.id}/unirse`,'profesor','POST',{},404);
      await ok(`/api/chat/conversaciones/${privado.id}/mensajes`,'ajena','GET',undefined,403);
      await ok('/api/chat/canales','julieta','POST',{nombre:'Invasión',clase:'canal',visibilidad:'privada',miembros:[db.prepare("SELECT id FROM usuarios WHERE email='ajena@nexo.test'").get().id]},400);
    });

    await t.test('Foros conservan temas e historial; cerrar o retirar miembros del padre afecta sus hijos', async () => {
      const foro=await crear('julieta',{clase:'foro',miembros:[9]});
      const hilo=await crear('martin',{clase:'hilo',padreId:foro.id});
      await enviar(hilo.id,'martin','Una propuesta');
      await ok(`/api/chat/conversaciones/${foro.id}/mensajes`,'julieta','POST',{contenido:'Debe abrir tema'},403);
      assert.equal((await ok(`/api/chat/canales?padreId=${foro.id}`,'julieta')).canales[0].id,hilo.id);
      const cerrado=(await ok(`/api/chat/canales/${foro.id}`,'julieta','PUT',{version:foro.version,estado:'cerrado'})).canal;
      await ok(`/api/chat/conversaciones/${hilo.id}/mensajes`,'martin','POST',{contenido:'No debe entrar'},403);
      await ok(`/api/chat/canales/${foro.id}`,'julieta','PUT',{version:foro.version,nombre:'Vieja versión'},409);
      await ok(`/api/chat/canales/${foro.id}`,'julieta','PUT',{version:cerrado.version,estado:'abierto',miembros:[]});
      await ok(`/api/chat/conversaciones/${hilo.id}/mensajes`,'martin','GET',undefined,403);
      assert.equal((await ok(`/api/chat/conversaciones/${hilo.id}/mensajes`,'julieta')).mensajes.length,1);
    });

    await t.test('Ayuda es privada para solicitante y dirección y no crea ni modifica quejas anónimas', async () => {
      const tablas=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%queja%'").all();
      const antes=tablas.map(({name})=>db.prepare(`SELECT * FROM ${name}`).all());
      await ok('/api/chat/canales','julieta','POST',{nombre:'Ayuda pública',clase:'ayuda',visibilidad:'institucion'},400);
      const ayuda=await crear('julieta',{clase:'ayuda'});
      assert.deepEqual(ayuda.participantes.map(p=>p.id).sort(),['1','8']);
      await enviar(ayuda.id,'julieta','Necesito ayuda');
      await enviar(ayuda.id,'direccion','Te acompaño');
      assert.ok(!(await listar('martin')).some(c=>c.id===ayuda.id));
      const resuelto=(await ok(`/api/chat/canales/${ayuda.id}`,'direccion','PUT',{version:ayuda.version,estado:'resuelto'})).canal;
      assert.equal(resuelto.estado,'resuelto');
      assert.deepEqual(tablas.map(({name})=>db.prepare(`SELECT * FROM ${name}`).all()),antes);
    });

    await t.test('Foro público requiere unirse al padre y solo lectura se aplica también a sus temas', async () => {
      const foro=await crear('julieta',{clase:'foro',visibilidad:'institucion'});
      const hilo=await crear('julieta',{clase:'hilo',visibilidad:'institucion',padreId:foro.id});
      await ok(`/api/chat/canales/${hilo.id}/unirse`,'martin','POST',{},403);
      await ok(`/api/chat/canales/${foro.id}/unirse`,'martin','POST',{});
      await ok(`/api/chat/canales/${hilo.id}/unirse`,'martin','POST',{});
      await enviar(hilo.id,'martin','Participación voluntaria');
      await ok(`/api/chat/canales/${foro.id}`,'julieta','PUT',{version:foro.version,soloLectura:true});
      await ok(`/api/chat/conversaciones/${hilo.id}/mensajes`,'martin','POST',{contenido:'No debe publicarse'},403);
      await enviar(hilo.id,'julieta','Aviso de la moderadora');
    });

    await t.test('Contextos son idempotentes y GET no crea conversaciones; entrega no expone otros estudiantes', async () => {
      const antes=db.prepare('SELECT COUNT(*) n FROM conversaciones').get().n;
      assert.equal((await ok('/api/chat/contextos/tarea/1','julieta')).canal,null);
      assert.equal(db.prepare('SELECT COUNT(*) n FROM conversaciones').get().n,antes);
      const {canal}=await ok('/api/chat/contextos/tarea/1','julieta','POST',{},201);
      assert.equal((await ok('/api/chat/contextos/tarea/1','profesor','POST',{})).canal.id,canal.id);
      assert.match(canal.contexto.href,/tarea=1/);
      assert.equal(canal.administrable,false);
      assert.equal((await ok('/api/chat/contextos/tarea/1','profesor')).canal.administrable,true);
      await ok('/api/chat/contextos/tarea/1','ajena','GET',undefined,404);
      const entrega=(await ok('/api/chat/contextos/entrega/1','julieta','POST',{},201)).canal;
      assert.deepEqual(entrega.participantes.map(p=>p.id).sort(),['4','8']);
      await ok('/api/chat/contextos/entrega/1','martin','GET',undefined,404);
      await ok(`/api/chat/conversaciones/${entrega.id}/mensajes`,'martin','GET',undefined,403);
      const meta=(await ok('/api/chat/contextos/meta/1','julieta','POST',{},201)).canal;
      await ok(`/api/chat/canales/${meta.id}`,'julieta','PUT',{version:meta.version,miembros:[9,2]});
      const invitado=(await listar('martin')).find(c=>c.id===meta.id);
      assert.equal(invitado.contexto,null);
      await ok('/api/chat/contextos/meta/1','martin','GET',undefined,404);
      const colaborador=(await ok(`/api/chat/canales/${meta.id}`,'profesor')).canal;
      assert.equal(colaborador.contexto,null);
      await enviar(meta.id,'profesor','Conversamos sin acceder a los datos de la meta');
    });

    await t.test('Salir de un canal o foro retira acceso de sus temas sin borrar el historial',async()=>{
      const foro=await crear('julieta',{clase:'foro',miembros:[9]});
      const tema=await crear('julieta',{clase:'hilo',padreId:foro.id});
      await enviar(tema.id,'martin','Mi aporte permanece');
      const vista=(await ok(`/api/chat/canales/${foro.id}`,'martin')).canal;
      assert.equal(vista.puedeSalir,true);
      assert.equal((await ok(`/api/chat/canales/${tema.id}`,'martin')).canal.puedeSalir,false);
      await ok(`/api/chat/canales/${tema.id}/salir`,'martin','POST',{},403);
      await ok(`/api/chat/canales/${foro.id}/salir`,'julieta','POST',{},403);
      await ok(`/api/chat/canales/${foro.id}/salir`,'martin','POST',{});
      await ok(`/api/chat/conversaciones/${tema.id}/mensajes`,'martin','GET',undefined,403);
      assert.equal((await ok(`/api/chat/conversaciones/${tema.id}/mensajes`,'julieta')).mensajes[0].contenido,'Mi aporte permanece');
      const publico=await crear('julieta',{visibilidad:'institucion'});
      await ok(`/api/chat/canales/${publico.id}/unirse`,'martin','POST',{});
      await ok(`/api/chat/canales/${publico.id}/salir`,'martin','POST',{});
      assert.equal((await ok(`/api/chat/canales/${publico.id}`,'martin')).canal.miembro,false);
      await ok(`/api/chat/canales/${publico.id}/unirse`,'martin','POST',{});
      assert.equal((await ok(`/api/chat/canales/${publico.id}`,'martin')).canal.miembro,true);
    });

    await t.test('Paginación no duplica ni pierde mensajes y búsqueda respeta la conversación', async () => {
      const canal=await crear('julieta',{miembros:[9]});
      assert.deepEqual(await ok(`/api/chat/conversaciones/${canal.id}/mensajes`,'martin'),{mensajes:[],siguienteAntes:null});
      const ids=[];
      for(let i=0;i<7;i++) ids.push((await enviar(canal.id,'julieta',i%2?'Otro mensaje':`Buscable ${i}`)).id);
      let antes='', encontrados=[];
      do {
        const p=await ok(`/api/chat/conversaciones/${canal.id}/mensajes?limite=3${antes?'&antes='+antes:''}`,'martin');
        encontrados=[...p.mensajes.map(m=>m.id),...encontrados]; antes=p.siguienteAntes;
      } while(antes);
      assert.deepEqual(encontrados,ids);
      assert.equal((await ok(`/api/chat/conversaciones/${canal.id}/mensajes?q=buscable`,'martin')).mensajes.length,4);
      await ok(`/api/chat/conversaciones/${canal.id}/mensajes?limite=101`,'martin','GET',undefined,400);
      for(const consulta of ['limite=0','limite=-1','limite=1.5','limite=abc','antes=0','antes=-1','antes=abc']) await ok(`/api/chat/conversaciones/${canal.id}/mensajes?${consulta}`,'martin','GET',undefined,400);
      await enviar(canal.id,'julieta','Literal 100% y guion_bajo');
      for(const q of ['%','_']) assert.equal((await ok(`/api/chat/conversaciones/${canal.id}/mensajes?q=${encodeURIComponent(q)}`,'martin')).mensajes.length,1);
    });

    await t.test('Retirar inscripción bloquea adjunto inmediatamente, reacciones y nuevos eventos en vivo', async () => {
      const {canal}=await ok('/api/chat/contextos/tarea/1','profesor');
      const subida=await crudo('/api/archivos','profesor',{method:'POST',headers:{'Content-Type':'text/plain','X-Nombre-Archivo':'privado.txt'},body:'Adjunto del curso'});
      assert.equal(subida.status,201);
      const archivoId=subida.datos.archivo.id;
      const mensaje=await enviar(canal.id,'profesor','Archivo para clase',{archivoId});
      assert.equal((await crudo(`/api/archivos/${archivoId}`,'martin')).status,200);
      const login=await request('/api/sesion',null,'POST',{email:'martin@sanmartin.nexo.edu',contrasena:'nexo1234'});
      const url=new URL('/ws',login.response.url);url.protocol='ws:';
      const ws=new WebSocket(url,{headers:{Cookie:login.response.headers.get('set-cookie').split(';')[0]}});
      const eventos=[];ws.on('message',dato=>eventos.push(JSON.parse(dato.toString())));
      await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});
      try {
        await enviar(canal.id,'profesor','Mensaje antes del retiro');
        await new Promise(resolve=>setTimeout(resolve,100));
        assert.ok(eventos.some(evento=>evento.conversacionId===canal.id&&evento.tipo==='mensaje'));
        eventos.length=0;
        db.prepare('DELETE FROM inscripciones WHERE curso_id=2 AND estudiante_id=9').run();
        assert.ok(!(await ok('/api/notificaciones/mensajes-pendientes','martin')).pendientes.some(n=>n.conversacionId===canal.id));
        assert.equal((await crudo(`/api/archivos/${archivoId}`,'martin')).status,403);
        await ok(`/api/chat/mensajes/${mensaje.id}/reaccion`,'martin','PUT',{emoji:'👍'},404);
        await ok(`/api/chat/conversaciones/${canal.id}/mensajes`,'martin','GET',undefined,403);
        const nuevo=await enviar(canal.id,'profesor','Solo inscriptos');
        await new Promise(resolve=>setTimeout(resolve,100));
        assert.ok(!eventos.some(evento=>evento.conversacionId===canal.id&&evento.tipo==='mensaje'));
        assert.equal(db.prepare('SELECT COUNT(*) n FROM notificaciones WHERE usuario_id=9 AND mensaje_id=?').get(Number(nuevo.id)).n,0);
      } finally {ws.terminate();db.prepare('INSERT OR IGNORE INTO inscripciones(curso_id,estudiante_id) VALUES(2,9)').run();}
    });

    await t.test('Ocultar el módulo del objeto impide abrir su contexto y leer su historial',async()=>{
      const {canal}=await ok('/api/chat/contextos/tarea/1','julieta');
      const edicion=await ok('/api/instancia/edicion','direccion');
      await ok('/api/instancia/edicion','direccion','PUT',{version:edicion.version,modulos:{portafolio:{oculto:true}}});
      try {
        assert.ok([403,404].includes((await request('/api/chat/contextos/tarea/1','julieta')).status));
        assert.ok([403,404].includes((await request(`/api/chat/conversaciones/${canal.id}/mensajes`,'julieta')).status));
        const mensaje=db.prepare('SELECT id FROM mensajes WHERE conversacion_id=? LIMIT 1').get(Number(canal.id));
        assert.ok([403,404].includes((await request(`/api/chat/mensajes/${mensaje.id}/reaccion`,'julieta','PUT',{emoji:'👍'})).status));
      } finally {
        const ultima=await ok('/api/instancia/edicion','direccion');
        await ok('/api/instancia/edicion','direccion','PUT',{version:ultima.version,modulos:{portafolio:{oculto:false}}});
      }
    });

    await t.test('Ocultar chat impide acceder a canales y contextos por API',async()=>{
      const edicion=await ok('/api/instancia/edicion','direccion');
      await ok('/api/instancia/edicion','direccion','PUT',{version:edicion.version,modulos:{chat:{oculto:true}}});
      try {await ok('/api/chat/canales','julieta','GET',undefined,403);await ok('/api/chat/contextos/tarea/1','julieta','GET',undefined,403);}
      finally {const ultima=await ok('/api/instancia/edicion','direccion');await ok('/api/instancia/edicion','direccion','PUT',{version:ultima.version,modulos:{chat:{oculto:false}}});}
    });
  } finally {await e.cerrar();}
});
