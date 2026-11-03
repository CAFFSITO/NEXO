import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { crearEntorno } from '../servidor/tests/entorno.js';
const { chromium } = await import(process.env.NEXO_PLAYWRIGHT || 'playwright');
const fuente = stripTypeScriptTypes(readFileSync(new URL('../NEXO/src/servicios/borradorMultimedia.ts',import.meta.url),'utf8')).replaceAll('export ', '');
const api = `${fuente}\nreturn {guardarBorradorMultimedia,leerBorradorMultimedia,iniciarCapturaLocal,guardarFragmentoLocal,recuperarCapturaLocal,finalizarCapturaLocal,guardarIntentoLocal,listarIntentosLocales,quitarIntentoLocal};`;
const e = await crearEntorno('nexo-multimedia-idb-'); let browser;
try {
  browser = await chromium.launch({channel:'chrome',headless:true});
  const pagina = await browser.newPage();
  const base = new URL((await e.request('/api/sesion')).response.url).origin;
  await pagina.goto(base);
  const resultado = await pagina.evaluate(async source => {
    // Simula el almacén v1 que ya puede tener una cuenta real.
    await new Promise((resolve,reject) => {const p=indexedDB.open('nexo-multimedia-local',1);p.onupgradeneeded=()=>p.result.createObjectStore('borradores');p.onsuccess=()=>{const db=p.result;const tx=db.transaction('borradores','readwrite');tx.objectStore('borradores').put({archivo:new File(['anterior'],'viejo.webm',{type:'audio/webm'}),capitulos:[]},1);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};p.onerror=()=>reject(p.error);});
    const m = new Function(source)();
    const previo = await m.leerBorradorMultimedia(1);
    await m.iniciarCapturaLocal(1,'sesion','audio/webm');
    await m.guardarFragmentoLocal(1,'sesion',0,new Blob(['primero']));
    await m.guardarFragmentoLocal(1,'sesion',1,new Blob(['segundo']));
    const recuperado=await m.recuperarCapturaLocal(1);
    const ajeno=await m.recuperarCapturaLocal(2);
    await m.guardarBorradorMultimedia(1,recuperado,[],{texto:'Texto editable',duracion:12,subtitulos:[{inicio:0,fin:1,texto:'Hola'}],metricasVideo:{cuadros:3,luzMedia:42,cambioMedio:2}});
    const borrador=await m.leerBorradorMultimedia(1);
    await m.guardarIntentoLocal(1,'Primer intento',borrador);
    await m.finalizarCapturaLocal(1,'sesion');
    return {previo:await previo.archivo.text(),recuperado:await recuperado.text(),ajeno,cerrada:await m.recuperarCapturaLocal(1)};
  },api);
  assert.deepEqual(resultado,{previo:'anterior',recuperado:'primerosegundo',ajeno:null,cerrada:null});
  await pagina.reload();
  const persistido=await pagina.evaluate(async source=>{const m=new Function(source)();const lista=await m.listarIntentosLocales(1);const ajena=await m.listarIntentosLocales(2);const i=lista[0];await m.quitarIntentoLocal(2,i.id);const conservado=(await m.listarIntentosLocales(1)).length;await m.quitarIntentoLocal(1,i.id);return {texto:i.texto,archivo:await i.archivo.text(),subtitulos:i.subtitulos,luz:i.metricasVideo.luzMedia,ajenos:ajena.length,conservado,restantes:(await m.listarIntentosLocales(1)).length};},api);
  assert.deepEqual(persistido,{texto:'Texto editable',archivo:'primerosegundo',subtitulos:[{inicio:0,fin:1,texto:'Hola'}],luz:42,ajenos:0,conservado:1,restantes:0});
  console.log('PASS: migración v1, recuperación por fragmentos, metadatos, catálogo tras recarga y aislamiento por cuenta.');
} finally {await browser?.close();await e.cerrar();}
