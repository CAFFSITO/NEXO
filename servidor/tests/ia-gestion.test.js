import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {crearEntorno} from './entorno.js';

test('modelos privados: configuración institucional versionada, aislamiento, descarga con progreso y cancelación',async()=>{
  const llamadas=[];
  const remoto=createServer(async(req,res)=>{
    const partes=[];for await(const p of req)partes.push(p);
    const body=partes.length?JSON.parse(Buffer.concat(partes).toString()):{};llamadas.push({ruta:req.url,body});
    res.setHeader('Content-Type','application/json');
    if(req.url==='/api/pull'){
      res.setHeader('Content-Type','application/x-ndjson');res.write(JSON.stringify({status:'downloading',total:100,completed:50})+'\n');
      if(body.model!=='lento:local')res.end(JSON.stringify({status:'success'})+'\n');
    }else if(req.url==='/api/chat')res.end(JSON.stringify({message:{content:'Respuesta institucional'}}));
    else res.end(JSON.stringify({models:[{name:'local:prueba',size:100}]}));
  });
  await new Promise(r=>remoto.listen(0,'127.0.0.1',r));const origen=`http://127.0.0.1:${remoto.address().port}`;
  let e;
  const esperar=async estado=>{for(let i=0;i<100;i++){const t=await e.ok('/api/ia-privada/descarga','direccion');if(t.estado===estado)return t;await new Promise(r=>setTimeout(r,20));}assert.fail(`No llegó a ${estado}`);};
  try{
    e=await crearEntorno('nexo-ia-gestion-',()=>{}, {NEXO_IA_URL:origen,NEXO_IA_MODELO:'modelo-original'});
    await e.entrar('direccion','direccion@sanmartin.nexo.edu');await e.entrar('alumna','julieta@sanmartin.nexo.edu');
    assert.equal((await e.request('/api/ia-privada/configuracion','alumna')).status,403);
    const inicial=await e.ok('/api/ia-privada/configuracion','direccion');assert.equal(inicial.version,0);
    const guardar=body=>e.request('/api/ia-privada/configuracion','direccion','PUT',{origen,modelo:'local:prueba',activa:true,version:0,...body});
    assert.equal((await guardar({origen:'https://api.ejemplo.com'})).status,400);
    assert.equal((await guardar({modelo:'llama:cloud'})).status,400);
    assert.equal((await guardar({})).status,200);assert.equal((await guardar({})).status,409);
    assert.equal((await e.ok('/api/asistencia-ia/estado','alumna')).modelo,'local:prueba');
    await e.ok('/api/asistencia-ia/mensaje','alumna','POST',{contenido:'Explicá el tema'});
    assert.equal(llamadas.find(x=>x.ruta==='/api/chat').body.model,'local:prueba');
    assert.equal((await e.request('/api/ia-privada/descarga','alumna','POST',{modelo:'local:prueba'})).status,403);
    assert.equal((await e.request('/api/ia-privada/descarga','direccion','POST',{modelo:'llama:cloud'})).status,400);
    await e.ok('/api/ia-privada/descarga','direccion','POST',{modelo:'local:prueba'},202);
    const completa=await esperar('completada');assert.equal(completa.total,100);assert.equal(completa.completado,100);
    assert.deepEqual(llamadas.find(x=>x.ruta==='/api/pull').body,{model:'local:prueba',stream:true});
    await e.ok('/api/ia-privada/descarga','direccion','POST',{modelo:'lento:local'},202);
    assert.equal((await e.request('/api/ia-privada/descarga','direccion','POST',{modelo:'otro:local'})).status,409);
    await e.ok('/api/ia-privada/descarga/cancelar','direccion','POST',{});await esperar('cancelada');
    const otra=Number(e.db.prepare("INSERT INTO instituciones(nombre,ciclo_lectivo) VALUES('Otra',2026)").run().lastInsertRowid);
    e.db.prepare("INSERT INTO usuarios(institucion_id,email,hash_contrasena,nombre,rol) SELECT ?, 'otra-direccion@prueba.edu',hash_contrasena,'Otra dirección','admin-academico' FROM usuarios WHERE email='direccion@sanmartin.nexo.edu'").run(otra);
    await e.entrar('otra','otra-direccion@prueba.edu');
    assert.equal((await e.ok('/api/ia-privada/configuracion','otra')).version,0);
    assert.equal((await e.ok('/api/ia-privada/descarga','otra')).estado,'sin-descarga');
    assert.equal((await e.ok('/api/ia-privada/configuracion','otra')).modelo,'modelo-original');
  }finally{await e?.cerrar();remoto.closeAllConnections();await new Promise(r=>remoto.close(r));}
});
