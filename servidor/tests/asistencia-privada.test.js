import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { crearEntorno } from './entorno.js';

test('contexto privado incorpora documentos y lecciones visibles sin soluciones y revoca contenido despublicado',async()=>{
  const e=await crearEntorno('nexo-ia-contexto-ampliado-');
  try{
    await e.entrar('alumna','julieta@sanmartin.nexo.edu');
    const u=e.db.prepare("SELECT id,institucion_id FROM usuarios WHERE email='julieta@sanmartin.nexo.edu'").get();
    const c=e.db.prepare('SELECT c.id,c.profesor_id FROM catedras c JOIN inscripciones i ON i.curso_id=c.curso_id WHERE i.estudiante_id=? LIMIT 1').get(u.id);
    const contenido=JSON.stringify([{id:'tema',tipo:'texto',texto:'Texto educativo autorizado'},{id:'p',tipo:'pregunta',texto:'Explicá el tema',respuesta:'texto',correcta:'SOLUCION_RESERVADA',devolucion:'DEVOLUCION_RESERVADA'}]);
    const d=Number(e.db.prepare("INSERT INTO documentos_nexo(institucion_id,autor_id,tipo,titulo,contenido,publicado) VALUES(?,?,'formulario','Fuente autorizada',?,1)").run(u.institucion_id,c.profesor_id,contenido).lastInsertRowid);
    const borrador=Number(e.db.prepare("INSERT INTO documentos_nexo(institucion_id,autor_id,tipo,titulo,contenido,publicado) VALUES(?,?,'documento','Borrador oculto','[]',0)").run(u.institucion_id,c.profesor_id).lastInsertRowid);
    const padre=Number(e.db.prepare("INSERT INTO curso_nodos(catedra_id,tipo,titulo,publicado) VALUES(?,'modulo','Módulo autorizado',1)").run(c.id).lastInsertRowid);
    const l=Number(e.db.prepare("INSERT INTO curso_nodos(catedra_id,padre_id,tipo,titulo,descripcion,publicado) VALUES(?,?,'leccion','Lección autorizada','Explicación para practicar',1)").run(c.id,padre).lastInsertRowid);
    const lista=await e.ok('/api/asistencia-ia/fuentes','alumna');
    assert.ok(lista.fuentes.some(f=>f.tipo==='documento'&&f.id===d));assert.ok(lista.fuentes.some(f=>f.tipo==='leccion'&&f.id===l));assert.ok(!lista.fuentes.some(f=>f.tipo==='documento'&&f.id===borrador));
    const contexto=await e.ok('/api/asistencia-ia/contexto-dispositivo','alumna','POST',{fuentes:[{tipo:'documento',id:d},{tipo:'leccion',id:l}]});
    assert.match(contexto.fuentes[0].texto,/Texto educativo autorizado/);assert.doesNotMatch(JSON.stringify(contexto),/SOLUCION_RESERVADA|DEVOLUCION_RESERVADA/);
    assert.match(contexto.fuentes[1].texto,/Explicación para practicar/);
    assert.equal((await e.request('/api/asistencia-ia/contexto-dispositivo','alumna','POST',{fuentes:[{tipo:'documento',id:borrador}]})).status,400);
    e.db.prepare('UPDATE curso_nodos SET publicado=0 WHERE id=?').run(padre);
    assert.equal((await e.request('/api/asistencia-ia/contexto-dispositivo','alumna','POST',{fuentes:[{tipo:'leccion',id:l}]})).status,400);
  }finally{await e.cerrar();}
});

test('contexto de dispositivo funciona sin configuración institucional y conserva permisos de fuentes', async () => {
  const env = await crearEntorno('nexo-ia-dispositivo-sin-servidor-', db => db.exec('UPDATE config_ia SET activo=0'));
  try {
    await env.entrar('alumna','julieta@sanmartin.nexo.edu');
    assert.equal((await env.ok('/api/asistencia-ia/estado','alumna')).configurada, false);
    const contexto = await env.ok('/api/asistencia-ia/contexto-dispositivo','alumna','POST',{fuentes:[]});
    assert.match(contexto.instruccion,/tutor educativo/);
    assert.deepEqual(contexto.fuentes,[]);
    assert.equal((await env.request('/api/asistencia-ia/contexto-dispositivo','alumna','POST',{fuentes:[{tipo:'tarea',id:999999}]})).status,400);
    assert.equal((await env.request('/api/asistencia-ia/mensaje','alumna','POST',{contenido:'consulta'})).status,503);
    assert.equal((await env.ok('/api/asistencia-ia/historial','alumna')).mensajes.length,0);
  } finally { await env.cerrar(); }
});

test('IA privada usa solo el modelo local, cita fuentes y bloquea destinos públicos', async () => {
  const recibidos = [];
  const modelo = createServer(async (req,res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    recibidos.push({ url:req.url, body:Buffer.concat(chunks).toString() });
    res.setHeader('Content-Type','application/json');
    res.end(req.url === '/api/tags' ? JSON.stringify({ models:[{name:'llama3.2',size:123},{name:'gpt-oss:120b-cloud',size:1}] }) :
      JSON.stringify({message:{content:'Respuesta con [1]'}}));
  });
  await new Promise(resolve => modelo.listen(0,'127.0.0.1',resolve));
  const port = modelo.address().port;
  const env = await crearEntorno('nexo-ia-privada-', () => {}, {
    NEXO_IA_URL: `http://127.0.0.1:${port}`,
    NEXO_IA_MODELO: 'llama3.2',
    NEXO_IA_CLAVE: 'clave-legacy-que-no-debe-usarse'
  });
  try {
    await env.entrar('alumna','julieta@sanmartin.nexo.edu');
    const estado = await env.ok('/api/asistencia-ia/estado','alumna');
    assert.equal(estado.modo,'institucional');
    assert.equal(estado.modelo,'llama3.2');
    const lista = await env.ok('/api/asistencia-ia/fuentes','alumna');
    const fuente = lista.fuentes.find(x => x.tipo === 'biblioteca');
    assert.ok(fuente);
    const contexto = await env.ok('/api/asistencia-ia/contexto-dispositivo','alumna','POST',{
      fuentes:[{tipo:'biblioteca',id:fuente.id}]
    });
    assert.equal(contexto.fuentes[0].id,fuente.id);
    assert.match(contexto.instruccion,/No ejecutes acciones/);
    assert.equal((await env.ok('/api/asistencia-ia/historial','alumna')).mensajes.length,0);
    assert.equal(recibidos.length,0);
    assert.equal((await env.request('/api/asistencia-ia/contexto-dispositivo','alumna','POST',{
      fuentes:[{tipo:'biblioteca',id:999999}]
    })).status,400);
    const r = await env.ok('/api/asistencia-ia/mensaje','alumna','POST',{
      contenido:'Explicame esto', fuentes:[{tipo:'biblioteca',id:fuente.id}]
    });
    assert.equal(r.respuesta,'Respuesta con [1]');
    assert.equal(r.fuentes[0].id,fuente.id);
    const solicitud = recibidos.find(x => x.url === '/api/chat');
    assert.ok(solicitud);
    const cuerpo = JSON.parse(solicitud.body);
    assert.match(cuerpo.messages[0].content, /biblioteca #/);
    assert.equal(cuerpo.messages.at(-1).content,'Explicame esto');
    assert.equal((await env.ok('/api/asistencia-ia/historial','alumna')).mensajes.length,2);
    assert.equal((await env.request('/api/asistencia-ia/mensaje','alumna','POST',{
      contenido:'otro', fuentes:[{tipo:'biblioteca',id:999999}]
    })).status,400);
    const modelos = await env.ok('/api/asistencia-ia/modelos','alumna');
    assert.deepEqual(modelos.modelos.map(m => m.nombre), ['llama3.2']);
  } finally { await env.cerrar(); await new Promise(resolve => modelo.close(resolve)); }
});

test('IA privada rechaza modelos cloud antes de enviar datos a un Ollama privado', async () => {
  let solicitudes = 0;
  const remoto = createServer((_req,res) => { solicitudes++; res.end('{}'); });
  await new Promise(resolve => remoto.listen(0,'127.0.0.1',resolve));
  const env = await crearEntorno('nexo-ia-cloud-', () => {}, {
    NEXO_IA_URL: `http://127.0.0.1:${remoto.address().port}`,
    NEXO_IA_MODELO:'gpt-oss:120b-cloud'
  });
  try {
    await env.entrar('alumna','julieta@sanmartin.nexo.edu');
    const r = await env.request('/api/asistencia-ia/mensaje','alumna','POST',{contenido:'dato privado'});
    assert.equal(r.status,503);
    assert.equal(solicitudes,0);
    assert.equal((await env.ok('/api/asistencia-ia/historial','alumna')).mensajes.length,0);
  } finally { await env.cerrar(); await new Promise(resolve => remoto.close(resolve)); }
});

test('IA privada rechaza URL pública antes de transmitir el mensaje', async () => {
  const env = await crearEntorno('nexo-ia-bloqueo-', () => {}, {
    NEXO_IA_URL:'https://api.groq.com', NEXO_IA_CLAVE:'legacy'
  });
  try {
    await env.entrar('alumna','julieta@sanmartin.nexo.edu');
    const r = await env.request('/api/asistencia-ia/mensaje','alumna','POST',{contenido:'dato privado'});
    assert.equal(r.status,503);
    assert.equal((await env.ok('/api/asistencia-ia/historial','alumna')).mensajes.length,0);
  } finally { await env.cerrar(); }
});
