import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearEntorno } from './entorno.js';
import { catalogoMetodos, generarActividad, proximoRepaso } from '../estudio.js';

const banco = [
  { concepto: 'fracción', definicion: 'Parte de un todo', ejemplo: '1/2 de una pizza' },
  { concepto: 'porcentaje', definicion: 'Parte sobre cien', ejemplo: '50 %' },
  { concepto: 'proporción', definicion: 'Relación entre cantidades' },
];

test('estudio: cada método tiene una regla de actividad propia y el repaso es reproducible', () => {
  const metodos = catalogoMetodos();
  assert.equal(new Set(metodos.map(m => m.id)).size, metodos.length);
  assert.ok(metodos.length >= 10);
  assert.equal(new Set(metodos.map(m => generarActividad(m.id, banco, 0).consigna)).size, metodos.length);
  assert.deepEqual(proximoRepaso(3, 0, '2026-01-01'), proximoRepaso(3, 0, '2026-01-01'));
  assert.ok(proximoRepaso(3, 2, '2026-01-01').dias > proximoRepaso(0, 2, '2026-01-01').dias);
  assert.throws(() => generarActividad('inexistente', banco, 0));
});

test('estudio: práctica privada, compartida e intentos individuales', async () => {
  const e = await crearEntorno('nexo-estudio-');
  try {
    await e.entrar('docente', 'garcia@sanmartin.nexo.edu');
    await e.entrar('alumna', 'julieta@sanmartin.nexo.edu');
    await e.entrar('otro', 'lombardi@sanmartin.nexo.edu');
    const ruta = '/api/estudio/practicas';
    const privada = await e.ok(ruta, 'docente', 'POST', { metodo: 'recuperacion', titulo: 'Privada', banco }, 201);
    assert.equal((await e.request(`${ruta}/${privada.id}`, 'alumna')).status, 404);
    const compartida = await e.ok(ruta, 'docente', 'POST', { metodo: 'intercalado', titulo: 'Compartida', banco, visibilidad: 'institucion' }, 201);
    assert.equal((await e.ok(`${ruta}/${compartida.id}`, 'alumna')).intentos.length, 0);
    await e.ok(`${ruta}/${compartida.id}/intentos`, 'alumna', 'POST', { respuesta: 'Ambas comparadas', calidad: 2 }, 201);
    assert.equal((await e.ok(`${ruta}/${compartida.id}`, 'alumna')).intentos.length, 1);
    assert.equal((await e.ok(`${ruta}/${compartida.id}`, 'docente')).intentos.length, 0);
    assert.equal((await e.request(`${ruta}/${compartida.id}`, 'otro')).status, 200);
    assert.equal((await e.request(ruta, 'docente', 'POST', { metodo: 'recuperacion', titulo: 'Inválida', banco: [] })).status, 400);
    const perfil = { conocimientosPrevios: 2, atencionDisponible: 3, motivacionActual: 4, ritmoPreferido: 2 };
    assert.equal((await e.ok('/api/estudio/perfil', 'alumna', 'PUT', perfil)).recomendacion.metodo, 'ejemplo-resuelto');
    assert.deepEqual((await e.ok('/api/estudio/perfil', 'alumna')).perfil, perfil);
    await e.ok('/api/estudio/perfil', 'alumna', 'PUT', { ...perfil, atencionDisponible: 1 });
    assert.equal((await e.ok(`${ruta}/${compartida.id}`, 'alumna')).actividad.pasosPorBloque, 1);
    assert.equal((await e.request('/api/estudio/perfil', 'alumna', 'PUT', { ...perfil, motivacionActual: 9 })).status, 400);
  } finally { await e.cerrar(); }
});

test('estudio: la práctica vinculada sigue publicación y acceso de la lección', async () => {
  const e = await crearEntorno('nexo-estudio-leccion-');
  try {
    await e.entrar('docente', 'garcia@sanmartin.nexo.edu');
    await e.entrar('alumna', 'julieta@sanmartin.nexo.edu');
    await e.entrar('otro', 'lombardi@sanmartin.nexo.edu');
    const ruta = '/api/catedras/1/lecciones';
    const cuerpo=(tipo,padreId,titulo,extra={})=>({tipo,padreId,titulo,descripcion:'',documentoId:null,accionables:[],disponibleDesde:null,prerrequisitoId:null,publicado:false,...extra});
    const modulo=(await e.ok(ruta,'docente','POST',cuerpo('modulo',null,'M'),201)).nodo;
    const seccion=(await e.ok(ruta,'docente','POST',cuerpo('seccion',modulo.id,'S'),201)).nodo;
    const leccion=(await e.ok(ruta,'docente','POST',cuerpo('leccion',seccion.id,'L'),201)).nodo;
    const ligada=await e.ok('/api/estudio/practicas','docente','POST',{metodo:'recuperacion',titulo:'Vinculada',banco,visibilidad:'institucion',leccionId:leccion.id},201);
    assert.equal((await e.request(`/api/estudio/practicas/${ligada.id}`,'alumna')).status,404);
    assert.equal((await e.request(`/api/estudio/lecciones/${leccion.id}/practicas`,'alumna')).status,403);
    assert.equal((await e.request('/api/estudio/practicas','alumna','POST',{metodo:'recuperacion',titulo:'Intrusa',banco,visibilidad:'institucion',leccionId:leccion.id})).status,403);
    assert.equal((await e.request(`/api/estudio/lecciones/${leccion.id}/practicas`,'otro')).status,403);
    for(const n of [modulo,seccion,leccion])await e.ok(`${ruta}/${n.id}`,'docente','PUT',cuerpo(n.tipo,n.padreId,n.titulo,{publicado:true,version:n.version}));
    assert.equal((await e.ok(`/api/estudio/lecciones/${leccion.id}/practicas`,'alumna')).practicas[0].id,ligada.id);
    assert.equal((await e.ok(`/api/estudio/practicas/${ligada.id}`,'alumna')).practica.titulo,'Vinculada');
    await e.entrar('direccion','direccion@sanmartin.nexo.edu');
    const edicion=await e.ok('/api/instancia/edicion','direccion');
    await e.ok('/api/instancia/edicion','direccion','PUT',{version:edicion.version,modulos:{portafolio:{oculto:true}}});
    assert.equal((await e.request(`/api/estudio/practicas/${ligada.id}`,'alumna')).status,404);
    assert.equal((await e.request(`/api/estudio/lecciones/${leccion.id}/practicas`,'alumna')).status,403);
    assert.equal((await e.ok('/api/estudio/practicas','alumna')).practicas.some(p=>p.id===ligada.id),false);
  } finally { await e.cerrar(); }
});
