import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearEntorno } from './entorno.js';

test('Una carga por fragmentos reanuda sin duplicar bytes y termina en el almacén común', async () => {
  const e=await crearEntorno('nexo-cargas-');
  try {
    await e.entrar('julieta','julieta@sanmartin.nexo.edu');
    await e.entrar('martin','martin@sanmartin.nexo.edu');
    const c=await e.ok('/api/archivos/cargas','julieta','POST',{nombre:'documento.txt',tipo:'text/plain',tamano:9},201);
    const parte=(offset,body,quien='julieta')=>e.crudo(`/api/archivos/cargas/${c.id}`,quien,{method:'PUT',headers:{'Content-Type':'application/octet-stream','X-Offset':String(offset)},body:Buffer.from(body)});
    assert.equal((await parte(0,'Hola')).status,200);
    assert.equal((await parte(0,'Hola')).status,409);
    assert.equal((await e.ok(`/api/archivos/cargas/${c.id}`,'julieta')).recibido,4);
    assert.equal((await e.request(`/api/archivos/cargas/${c.id}`,'martin')).status,404);
    assert.equal((await parte(4,' NEXO')).status,200);
    const archivo=(await e.ok(`/api/archivos/cargas/${c.id}/completar`,'julieta','POST',{},201)).archivo;
    const respuesta=await e.crudo(`/api/archivos/${archivo.id}`,'julieta');
    assert.equal(respuesta.status,200);
    assert.equal(respuesta.datos,'Hola NEXO');
    assert.equal((await e.ok(`/api/archivos/cargas/${c.id}`,'julieta')).archivo.id,archivo.id);
    assert.equal((await e.ok(`/api/archivos/cargas/${c.id}/completar`,'julieta','POST',{})).archivo.id,archivo.id);
    assert.equal(e.db.prepare('SELECT COUNT(*) AS n FROM archivos WHERE id=?').get(Number(archivo.id)).n,1);
    const carpeta=await e.ok('/api/archivos/carpetas','julieta','POST',{nombre:'Mis notas'},201);
    await e.ok(`/api/archivos/carpetas/${carpeta.id}/archivos/${archivo.id}`,'julieta','PUT',{});
    assert.equal((await e.ok(`/api/archivos/carpetas/${carpeta.id}`,'julieta')).archivos[0].id,archivo.id);
    assert.equal((await e.request(`/api/archivos/carpetas/${carpeta.id}`,'martin')).status,404);
  } finally { await e.cerrar(); }
});

test('La dirección configura una cuota institucional y las reservas incompletas se liberan', async () => {
  const e=await crearEntorno('nexo-cuotas-');
  try {
    await e.entrar('direccion','direccion@sanmartin.nexo.edu');
    await e.entrar('julieta','julieta@sanmartin.nexo.edu');
    const inicial=await e.ok('/api/archivos/cuota','julieta');
    assert.equal(inicial.limiteBytes,null);
    assert.equal((await e.request('/api/archivos/cuota','julieta','PUT',{limiteBytes:1048576})).status,403);
    await e.ok('/api/archivos/cuota','direccion','PUT',{limiteBytes:inicial.usadoBytes+1048576});
    const primera=await e.ok('/api/archivos/cargas','julieta','POST',{nombre:'uno.txt',tipo:'text/plain',tamano:600000},201);
    assert.equal((await e.request('/api/archivos/cargas','julieta','POST',{nombre:'dos.txt',tipo:'text/plain',tamano:600000})).status,413);
    assert.ok((await e.ok('/api/archivos/cuota','julieta')).reservadoBytes>=600000);
    await e.ok(`/api/archivos/cargas/${primera.id}`,'julieta','DELETE');
    await e.ok('/api/archivos/cargas','julieta','POST',{nombre:'dos.txt',tipo:'text/plain',tamano:600000},201);
    await e.ok('/api/archivos/cuota','direccion','PUT',{limiteBytes:null});
    assert.equal((await e.ok('/api/archivos/cuota','julieta')).limiteBytes,null);
  } finally { await e.cerrar(); }
});
