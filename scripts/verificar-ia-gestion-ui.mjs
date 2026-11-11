import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {crearEntorno} from '../servidor/tests/entorno.js';
const {chromium}=await import(process.env.NEXO_PLAYWRIGHT||'playwright');
const recibidos=[];
const ollama=createServer(async(req,res)=>{
  const partes=[];for await(const p of req)partes.push(p);recibidos.push({ruta:req.url,cuerpo:Buffer.concat(partes).toString()});
  res.setHeader('Content-Type','application/json');
  if(req.url==='/api/pull'){res.setHeader('Content-Type','application/x-ndjson');res.write('{"status":"downloading","total":100,"completed":50}\n');setTimeout(()=>res.end('{"status":"success"}\n'),100);}
  else res.end('{"models":[{"name":"local:prueba","size":100}]}');
});
await new Promise(r=>ollama.listen(0,'127.0.0.1',r));let e,browser;
try{
  const origen=`http://127.0.0.1:${ollama.address().port}`;
  e=await crearEntorno('nexo-ia-gestion-ui-',db=>db.exec("UPDATE anuncio_destinatarios SET leido_en=datetime('now')"),{NEXO_IA_URL:origen});
  const base=new URL((await e.request('/api/sesion')).response.url).origin;
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();const errores=[];page.on('pageerror',x=>errores.push(x.message));
  assert.equal((await page.request.post(base+'/api/sesion',{data:{email:'direccion@sanmartin.nexo.edu',contrasena:'nexo1234'}})).status(),200);
  await page.goto(base+'/configuracion',{waitUntil:'domcontentloaded'});
  const panel=page.getByRole('region',{name:'Modelos privados de la institución'});
  await panel.getByRole('textbox',{name:'Modelo IA institucional'}).fill('local:prueba');
  const guardada=page.waitForResponse(r=>r.url().endsWith('/api/ia-privada/configuracion')&&r.request().method()==='PUT');
  await panel.getByRole('button',{name:'Guardar configuración privada'}).click();assert.equal((await guardada).status(),200);
  await e.entrar('alumna','julieta@sanmartin.nexo.edu');assert.equal((await e.ok('/api/asistencia-ia/estado','alumna')).modelo,'local:prueba');
  await panel.getByRole('textbox',{name:'Modelo para instalar'}).fill('local:prueba');
  await panel.getByRole('button',{name:'Instalar modelo local en servidor'}).click();
  await panel.getByRole('status').filter({hasText:'completada'}).waitFor({timeout:10000});
  assert.deepEqual(JSON.parse(recibidos.find(x=>x.ruta==='/api/pull').cuerpo),{model:'local:prueba',stream:true});
  await panel.getByRole('textbox',{name:'Origen IA privado'}).fill('https://servidor-publico.example');
  await panel.getByRole('button',{name:'Guardar configuración privada'}).click();
  await panel.getByRole('status').filter({hasText:'Destino no permitido'}).waitFor();
  assert.deepEqual(errores,[]);console.log('PASS: dirección configura IA por UI, descarga con progreso, modelo usado por su institución y destino público rechazado (motor simulado).');
}finally{await browser?.close();await e?.cerrar();ollama.closeAllConnections();await new Promise(r=>ollama.close(r));}
