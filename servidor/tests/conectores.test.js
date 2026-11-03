import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { crearEntorno } from './entorno.js';

test('catálogo, aislamiento de cuentas, cifrado y desconexión sin credenciales externas', async () => {
  const e=await crearEntorno('nexo-conectores-',()=>{}, {NEXO_CONECTORES_KEY:randomBytes(32).toString('base64')});
  try {
    await e.entrar('alumno','julieta@sanmartin.nexo.edu');
    await e.entrar('profesor','garcia@sanmartin.nexo.edu');
    const catalogo=await e.ok('/api/conectores/catalogo','alumno');
    assert.equal(catalogo.servicios.length,10);
    assert.equal(catalogo.servicios.find(x=>x.id==='calendar').conectado,false);
    assert.equal(catalogo.servicios.find(x=>x.id==='whatsapp').lectura,false);
    const sinCuenta=await e.request('/api/conectores/todoist/sincronizar','alumno','POST',{});
    assert.equal(sinCuenta.status,409);
    const token='secreto-solo-en-la-base';
    await e.ok('/api/conectores/cuentas','alumno','POST',{proveedor:'todoist',token,nombre:'Personal'},201);
    const cuentas=await e.ok('/api/conectores/cuentas','alumno');
    assert.equal(cuentas.cuentas.length,1);
    assert.equal(cuentas.cuentas[0].nombre,'Personal');
    assert.equal(JSON.stringify(cuentas).includes(token),false);
    const almacenado=e.db.prepare("SELECT secreto FROM conector_cuentas WHERE proveedor='todoist'").get().secreto;
    assert.equal(almacenado.includes(token),false);
    assert.equal((await e.ok('/api/conectores/cuentas','profesor')).cuentas.length,0);
    const otro=await e.request('/api/conectores/todoist/elementos','profesor');assert.equal(otro.status,409);
    const importacion=await e.request('/api/conectores/todoist/importar','alumno','POST',{id:'externo-desconocido'});assert.equal(importacion.status,404);
    await e.ok('/api/conectores/cuentas/todoist','alumno','DELETE');
    assert.equal((await e.ok('/api/conectores/cuentas','alumno')).cuentas.length,0);
  } finally {await e.cerrar();}
});

test('Google OAuth exige configuración y valida el servicio sin exponer secretos',async()=>{
  const e=await crearEntorno('nexo-conectores-google-',()=>{}, {NEXO_CONECTORES_KEY:randomBytes(32).toString('base64'),NEXO_GOOGLE_CLIENT_ID:'',NEXO_GOOGLE_CLIENT_SECRET:'',NEXO_GOOGLE_REDIRECT_URI:''});
  try {await e.entrar('alumno','julieta@sanmartin.nexo.edu');
    assert.equal((await e.request('/api/conectores/google/autorizar?servicio=drive','alumno')).status,503);
    assert.equal((await e.request('/api/conectores/google/autorizar?servicio=inventado','alumno')).status,400);
  } finally {await e.cerrar();}
});
