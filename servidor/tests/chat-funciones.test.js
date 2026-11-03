import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearEntorno } from './entorno.js';

test('La dirección configura creación de espacios y contextos sin bloquear lectura, unión ni salida', async () => {
  const e = await crearEntorno('nexo-chat-funciones-');
  try {
    for (const [quien, email] of Object.entries({ direccion:'direccion@sanmartin.nexo.edu', julieta:'julieta@sanmartin.nexo.edu', martin:'martin@sanmartin.nexo.edu' })) await e.entrar(quien,email);
    const { canal } = await e.ok('/api/chat/canales','julieta','POST',{nombre:'Espacio voluntario',clase:'canal',visibilidad:'institucion'},201);
    const contexto = await e.ok('/api/chat/contextos/tarea/1','julieta','POST',{},201);
    const edicion = await e.ok('/api/instancia/edicion','direccion');
    await e.ok('/api/instancia/edicion','direccion','PUT',{version:edicion.version,modulos:{chat:{funciones:{'chat.espacios':false,'chat.contextos':false}}}});
    const instancia = await e.ok('/api/instancia','julieta');
    assert.ok(instancia.funcionesDesactivadas.includes('chat.espacios'));
    assert.ok(instancia.funcionesDesactivadas.includes('chat.contextos'));
    await e.ok('/api/chat/canales','julieta','POST',{nombre:'Bloqueado',clase:'canal',visibilidad:'institucion'},403);
    await e.ok(`/api/chat/canales/${canal.id}`,'julieta','PUT',{version:canal.version,nombre:'Cambio bloqueado'},403);
    await e.ok('/api/chat/contextos/tarea/1','julieta','POST',{},403);
    assert.equal((await e.ok('/api/chat/contextos/tarea/1','julieta')).canal.id,contexto.canal.id);
    await e.ok(`/api/chat/canales/${canal.id}`,'martin');
    await e.ok(`/api/chat/canales/${canal.id}/unirse`,'martin','POST',{});
    await e.ok(`/api/chat/conversaciones/${canal.id}/mensajes`,'martin');
    await e.ok(`/api/chat/canales/${canal.id}/salir`,'martin','POST',{});
    const ultima = await e.ok('/api/instancia/edicion','direccion');
    await e.ok('/api/instancia/edicion','direccion','PUT',{version:ultima.version,modulos:{chat:{funciones:{}}}});
    await e.ok(`/api/chat/canales/${canal.id}`,'julieta','PUT',{version:canal.version,nombre:'Configuración restablecida'});
    await e.ok('/api/chat/contextos/tarea/1','julieta','POST',{});
  } finally { await e.cerrar(); }
});
