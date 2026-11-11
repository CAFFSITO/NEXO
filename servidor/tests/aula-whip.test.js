import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {crearEntorno} from './entorno.js';

test('WHIP: docente publica con SDP, sesión opaca, pertenencia, prevención de duplicados y destino fijo',async()=>{
  let locationMala=false,respuestaMala=false;const recibidas=[];
  const media=createServer(async(req,res)=>{
    const partes=[];for await(const p of req)partes.push(p);
    recibidas.push({metodo:req.method,ruta:req.url,autorizacion:req.headers.authorization,cuerpo:Buffer.concat(partes).toString()});
    if(req.method==='DELETE'){res.writeHead(200);res.end();return;}
    res.writeHead(201,{'Content-Type':'application/sdp',Location:locationMala?'http://192.168.1.99/admin':req.url+'/sesion-1'});
    res.end(respuestaMala?'respuesta inválida':'v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n');
  });
  await new Promise(r=>media.listen(0,'127.0.0.1',r));const origen=`http://127.0.0.1:${media.address().port}`;let e;
  try{
    e=await crearEntorno('nexo-aula-whip-',()=>{}, {NEXO_MEDIA_HLS_ORIGIN:origen,NEXO_MEDIA_WEBRTC_ORIGIN:origen,NEXO_MEDIA_RTMP_ORIGIN:'',NEXO_MEDIA_TOKEN_SECRET:'token-privado-con-mas-de-32-caracteres-1234',NEXO_MEDIA_AUTH_SECRET:'autorizacion-privada-con-32-caracteres-1234'});
    await e.entrar('docente','garcia@sanmartin.nexo.edu');await e.entrar('alumna','julieta@sanmartin.nexo.edu');await e.entrar('otro','lombardi@sanmartin.nexo.edu');
    const p=e.db.prepare("SELECT id FROM usuarios WHERE email='garcia@sanmartin.nexo.edu'").get().id;
    const u=e.db.prepare("SELECT id FROM usuarios WHERE email='julieta@sanmartin.nexo.edu'").get().id;
    const c=e.db.prepare('SELECT c.id FROM catedras c JOIN inscripciones i ON i.curso_id=c.curso_id WHERE c.profesor_id=? AND i.estudiante_id=? LIMIT 1').get(p,u);
    const clase=await e.ok('/api/aula/clases','docente','POST',{catedraId:c.id,titulo:'Publicación web',fechaHora:new Date().toISOString(),objetivos:'',materiales:'',etapas:[{titulo:'Tema'}]},201);
    await e.ok(`/api/aula/clases/${clase.id}/iniciar`,'docente','POST',{});
    const base=`/api/aula/clases/${clase.id}/transmision`;
    const d=await e.ok(base,'docente');assert.equal(d.obsServidor,undefined);assert.equal(d.whipUrl,base+'/whip');assert.equal((await e.ok(base,'alumna')).whipUrl,undefined);
    const oferta='v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n';
    const publicar=(quien,body=oferta)=>e.crudo(base+'/whip',quien,{method:'POST',headers:{'Content-Type':'application/sdp'},body});
    assert.equal((await publicar('alumna')).status,403);assert.equal((await publicar('otro')).status,403);assert.equal((await publicar('docente','no SDP')).status,400);assert.equal(recibidas.length,0);
    const r=await publicar('docente');assert.equal(r.status,201);assert.match(r.datos,/^v=0/);assert.match(recibidas[0].autorizacion,/^Bearer /);assert.equal(recibidas[0].cuerpo,oferta);
    const ubicacion=r.cabeceras.get('location');assert.ok(ubicacion.startsWith(base+'/whip/'));assert.ok(!ubicacion.includes('sesion-1'));
    assert.equal((await publicar('docente')).status,409);assert.equal((await e.crudo(ubicacion,'alumna',{method:'DELETE'})).status,404);
    assert.equal((await e.crudo(ubicacion,'docente',{method:'DELETE'})).status,204);assert.equal(recibidas.at(-1).metodo,'DELETE');assert.equal((await e.crudo(ubicacion,'docente',{method:'DELETE'})).status,404);
    locationMala=true;assert.equal((await publicar('docente')).status,502);locationMala=false;
    respuestaMala=true;assert.equal((await publicar('docente')).status,502);assert.equal(recibidas.at(-1).metodo,'DELETE');respuestaMala=false;
    const ultima=await publicar('docente');assert.equal(ultima.status,201);
    const antes=recibidas.filter(x=>x.metodo==='DELETE').length;
    await e.ok(`/api/aula/clases/${clase.id}/finalizar`,'docente','POST',{});assert.equal((await publicar('docente')).status,503);
    assert.equal(recibidas.filter(x=>x.metodo==='DELETE').length,antes+1);
    assert.equal((await e.crudo(ultima.cabeceras.get('location'),'docente',{method:'DELETE'})).status,404);
  }finally{await e?.cerrar();media.closeAllConnections();await new Promise(r=>media.close(r));}
});
