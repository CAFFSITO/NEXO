import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { crearEntorno } from './entorno.js';

test('transmisión institucional autoriza por clase y rol, revoca al finalizar y no expone HLS a terceros', async () => {
  const media = createServer((req,res) => {
    assert.match(req.headers.authorization || '', /^Bearer /);
    if(req.url.endsWith('/bad.m3u8')){res.writeHead(200,{'Content-Type':'text/html'});return res.end('<script>invalido</script>');}
    if(req.url.endsWith('/huge.m3u8')){res.writeHead(200,{'Content-Type':'application/vnd.apple.mpegurl','Content-Length':String(2*1024*1024)});return res.end('#EXTM3U\n');}
    res.writeHead(200, {'Content-Type':'application/vnd.apple.mpegurl'});
    res.end('#EXTM3U\n');
  });
  await new Promise(resolve => media.listen(0,'127.0.0.1',resolve));
  const puerto=media.address().port;
  const clave='clave-de-autorizacion-institucional-12345678';
  const e=await crearEntorno('nexo-aula-media-',()=>{}, {
    NEXO_MEDIA_HLS_ORIGIN:`http://127.0.0.1:${puerto}`,
    NEXO_MEDIA_RTMP_ORIGIN:'rtmp://127.0.0.1:1935',
    NEXO_MEDIA_TOKEN_SECRET:'token-de-firma-de-pruebas-con-mas-de-32-caracteres',
    NEXO_MEDIA_AUTH_SECRET:clave,
  });
  try {
    await e.entrar('docente','garcia@sanmartin.nexo.edu');
    await e.entrar('alumna','julieta@sanmartin.nexo.edu');
    await e.entrar('otro','lombardi@sanmartin.nexo.edu');
    const profesor=e.db.prepare("SELECT id FROM usuarios WHERE email='garcia@sanmartin.nexo.edu'").get().id;
    const alumna=e.db.prepare("SELECT id FROM usuarios WHERE email='julieta@sanmartin.nexo.edu'").get().id;
    const cat=e.db.prepare('SELECT c.id FROM catedras c JOIN inscripciones i ON i.curso_id=c.curso_id WHERE c.profesor_id=? AND i.estudiante_id=? LIMIT 1').get(profesor,alumna);
    const clase=await e.ok('/api/aula/clases','docente','POST',{catedraId:cat.id,titulo:'Clase transmitida',fechaHora:new Date(Date.now()-60000).toISOString(),objetivos:'',materiales:'',etapas:[{titulo:'Tema'}]},201);
    const base=`/api/aula/clases/${clase.id}/transmision`;
    assert.equal((await e.ok(base,'docente')).habilitada,false);
    await e.ok(`/api/aula/clases/${clase.id}/iniciar`,'docente','POST',{});
    const d=await e.ok(base,'docente');
    assert.equal(d.habilitada,true);
    assert.match(d.obsServidor,/^rtmp:\/\/127\.0\.0\.1:1935\/nexo-inst\d+-clase\d+\?token=/);
    assert.equal((await e.ok(base,'alumna')).obsServidor,undefined);
    await e.ok(base,'otro','GET',undefined,403);
    const ruta=d.obsServidor.split('/').at(-1).split('?')[0];
    const token=new URL(d.obsServidor).searchParams.get('token');
    const auth='/api/aula/transmision/autorizacion';
    const payload={token,path:ruta,action:'publish',protocol:'rtmp'};
    assert.equal((await e.ok(`${auth}?clave=${clave}`,null,'POST',payload)).expireAt.length>0,true);
    assert.equal((await e.crudo(`${auth}?clave=incorrecta`,null,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})).status,403);
    assert.equal((await e.crudo(`${auth}?clave=${clave}`,null,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,path:'nexo-inst998-clase1'})})).status,403);
    assert.equal((await e.crudo(`${auth}?clave=${clave}`,null,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,action:'read'})})).status,403);
    const playlist=await e.crudo(`${base}/hls/index.m3u8`,'alumna');
    assert.equal(playlist.status,200);
    assert.match(playlist.datos,/#EXTM3U/);
    assert.equal((await e.crudo(`${base}/hls/bad.m3u8`,'alumna')).status,502);
    assert.equal((await e.crudo(`${base}/hls/huge.m3u8`,'alumna')).status,502);
    assert.equal((await e.crudo(`${base}/hls/index.m3u8`,'otro')).status,403);
    await e.ok(`/api/aula/clases/${clase.id}/finalizar`,'docente','POST',{});
    assert.equal((await e.crudo(`${auth}?clave=${clave}`,null,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})).status,403);
    assert.equal((await e.crudo(`${base}/hls/index.m3u8`,'alumna')).status,503);
  } finally { await e.cerrar(); await new Promise(resolve=>media.close(resolve)); }
});
