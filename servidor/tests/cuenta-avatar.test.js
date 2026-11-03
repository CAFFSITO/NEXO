// La foto de perfil: cada persona sube o quita la suya; cualquiera con sesión
// la ve; solo se aceptan imágenes reales (no SVG ni texto disfrazado).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearEntorno } from './entorno.js';

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082', 'hex');

test('Foto de perfil: subir, ver con sesión, rechazar lo que no es imagen y quitar', async () => {
  const e = await crearEntorno('nexo-avatar-');
  try {
    await e.entrar('alumno', 'martin@sanmartin.nexo.edu');
    await e.entrar('docente', 'garcia@sanmartin.nexo.edu');
    const mala = await e.crudo('/api/cuenta/avatar', 'alumno', { method: 'PUT', headers: { 'Content-Type': 'image/svg+xml' }, body: Buffer.from('<svg onload="alert(1)"/>') });
    assert.equal(mala.status, 400);
    const subida = await e.crudo('/api/cuenta/avatar', 'alumno', { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: PNG });
    assert.equal(subida.status, 200);
    assert.match(subida.datos.avatarUrl, /^\/api\/avatares\/\d+\?v=\d+$/);
    assert.equal((await e.ok('/api/sesion', 'alumno')).usuario.avatarUrl, subida.datos.avatarUrl);
    const vista = await e.crudo(subida.datos.avatarUrl, 'docente');
    assert.equal(vista.status, 200);
    assert.equal(vista.cabeceras.get('content-type'), 'image/png');
    assert.equal(vista.cabeceras.get('x-content-type-options'), 'nosniff');
    assert.equal((await e.crudo(subida.datos.avatarUrl, null)).status, 401);
    assert.equal((await e.crudo('/api/cuenta/avatar', 'alumno', { method: 'DELETE' })).status, 200);
    assert.equal((await e.ok('/api/sesion', 'alumno')).usuario.avatarUrl, undefined);
    assert.equal((await e.crudo(subida.datos.avatarUrl, 'docente')).status, 404);
  } finally { await e.cerrar(); }
});
