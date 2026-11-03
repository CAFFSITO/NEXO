// Pruebas del modo edición de la dirección: jerarquía del menú, módulos
// (ocultar, desocultar, nombre, funciones), algoritmos con vista previa sobre
// datos reales, límites de lo que puede tocar y control de versiones.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { crearEntorno } from './entorno.js';

let entorno, request, ok, entrar;

before(async () => {
  entorno = await crearEntorno('nexo-edicion-');
  ({ request, ok, entrar } = entorno);
  await entrar('maestro', 'sistema@nexo.edu');
  await entrar('direccion', 'direccion@sanmartin.nexo.edu');
  await entrar('estudiante', 'julieta@sanmartin.nexo.edu');
  await entrar('profesor', 'garcia@sanmartin.nexo.edu');
});

after(async () => {
  await entorno?.cerrar();
});

/** Guarda cambios sobre la versión vigente y devuelve la respuesta. */
async function guardar(cambios, quien = 'direccion') {
  const { version } = await ok('/api/instancia/edicion', quien);
  return ok('/api/instancia/edicion', quien, 'PUT', { version, ...cambios });
}

test('Solo la dirección entra al modo edición', async () => {
  const e = await ok('/api/instancia/edicion', 'direccion');
  assert.equal(typeof e.version, 'number', 'la escuela del seed arranca sin versiones (0)');
  assert.ok(e.catalogo.modulos.length >= 20);
  assert.equal(e.perfiles.length >= 7, true);
  assert.deepEqual(e.secciones, []);
  // El grafo de nodos es del Maestro: no viaja a la dirección.
  assert.equal('grafo' in e.algoritmos['comunidad.orden-feed'], false);
  assert.equal(e.algoritmos['comunidad.orden-feed'].disenoMaestro, false);
  await ok('/api/instancia/edicion', 'estudiante', 'GET', undefined, 403);
  await ok('/api/instancia/edicion', 'profesor', 'GET', undefined, 403);
  await ok('/api/instancia/edicion', 'maestro', 'GET', undefined, 403);
  const r = await request('/api/instancia/edicion', 'estudiante', 'PUT', { version: e.version, modulos: { comunidad: { oculto: true } } });
  assert.equal(r.status, 403);
});

test('Jerarquía: secciones con nombre, módulos adentro y nuevo orden', async () => {
  const r = await guardar({
    secciones: [
      { id: 'aprender', nombre: 'Aprender', icono: 'school' },
      { id: 'convivir', nombre: 'Convivir', icono: 'diversity_3' },
      { id: 'MAL ID', nombre: 'Se descarta' },
      { id: 'sin-nombre', nombre: '' },
    ],
    modulos: {
      portafolio: { seccion: 'aprender', orden: 0 },
      objetivos: { seccion: 'aprender', orden: 1 },
      comunidad: { seccion: 'convivir', orden: 2, etiqueta: 'Nuestra plaza', icono: 'forum' },
      calendario: { seccion: 'no-existe', orden: 3 },
    },
  });
  assert.deepEqual(r.edicion.secciones.map((s) => s.id), ['aprender', 'convivir']);
  assert.ok(r.cambios.some((c) => c.texto.includes('Nueva sección «Aprender»')));
  assert.ok(r.cambios.some((c) => c.texto.includes('pasa a llamarse «Nuestra plaza»')));

  // Lo ve la estudiante en su instancia: secciones y la sección de cada módulo.
  const inst = await ok('/api/instancia', 'estudiante');
  assert.deepEqual(inst.secciones.map((s) => s.nombre), ['Aprender', 'Convivir']);
  const modulo = (id) => inst.modulos.find((m) => m.id === id);
  assert.equal(modulo('portafolio').seccion, 'aprender');
  assert.equal(modulo('comunidad').seccion, 'convivir');
  assert.equal(modulo('comunidad').etiqueta, 'Nuestra plaza');
  // Una sección inexistente devuelve el módulo a "Mi espacio".
  assert.equal(modulo('calendario').seccion, '');
  assert.ok(modulo('portafolio').orden < modulo('comunidad').orden);

  // Quitar una sección devuelve sus módulos a "Mi espacio".
  const r2 = await guardar({ secciones: [{ id: 'convivir', nombre: 'Convivir', icono: 'diversity_3' }] });
  assert.equal(r2.edicion.modulos.portafolio.seccion, '');
  assert.equal(r2.edicion.modulos.comunidad.seccion, 'convivir');
  assert.ok(r2.cambios.some((c) => c.texto.includes('Se quita la sección «Aprender»')));
});

test('Ocultar y desocultar módulos: para toda la escuela o para un perfil, y lo frena el servidor', async () => {
  await guardar({ modulos: { objetivos: { oculto: true } } });
  const r = await request('/api/objetivos', 'estudiante');
  assert.equal(r.status, 403);
  assert.equal(r.data.codigo, 'modulo-oculto');

  await guardar({ modulos: { objetivos: { oculto: false } } });
  await ok('/api/objetivos', 'estudiante');

  // Solo para estudiantes: el calendario deja de verse para ellas, no para el profesorado.
  const e = await ok('/api/instancia/edicion', 'direccion');
  const estudiante = e.perfiles.find((p) => p.clave === 'estudiante');
  await guardar({ perfiles: { estudiante: { modulos: { ...estudiante.modulos, calendario: { oculto: true } } } } });
  const vistaEst = await ok('/api/instancia', 'estudiante');
  const vistaProf = await ok('/api/instancia', 'profesor');
  assert.equal(vistaEst.modulos.find((m) => m.id === 'calendario').visible, false);
  assert.equal(vistaProf.modulos.find((m) => m.id === 'calendario').visible, true);
  await guardar({ perfiles: { estudiante: { modulos: estudiante.modulos } } });
  assert.equal((await ok('/api/instancia', 'estudiante')).modulos.find((m) => m.id === 'calendario').visible, true);
});

test('El checklist de funciones de un módulo se aplica en el servidor', async () => {
  await guardar({ modulos: { comunidad: { funciones: { 'comunidad.publicar': false } } } });
  const r = await request('/api/comunidad/publicaciones', 'estudiante', 'POST', { contenido: 'Esto no debería publicarse.' });
  assert.equal(r.status, 403);
  assert.equal(r.data.codigo, 'funcion-desactivada');
  const inst = await ok('/api/instancia', 'estudiante');
  assert.ok(inst.funcionesDesactivadas.includes('comunidad.publicar'));

  await guardar({ modulos: { comunidad: { funciones: {} } } });
  await ok('/api/comunidad/publicaciones', 'estudiante', 'POST', { contenido: 'Ahora sí: volvió la función de publicar.' }, 201);
});

test('Algoritmos: calibrar con vista previa sobre los datos reales de la escuela', async () => {
  const previa = await ok('/api/instancia/edicion/vista-previa', 'direccion', 'POST', {
    slot: 'comunidad.orden-feed',
    config: { activo: true, parametros: { pesoVotos: 3, pesoComentarios: 2, pesoDireccion: 0, vidaMedia: 48 } },
  });
  assert.equal(previa.tipo, 'ranking');
  assert.ok(previa.items.length > 0);
  assert.ok(previa.items.every((it) => it.despues >= 1 && (it.antes === null || it.antes >= 1)));

  const tendencias = await ok('/api/instancia/edicion/vista-previa', 'direccion', 'POST', {
    slot: 'comunidad.tendencias', config: { activo: true, parametros: { minParticipantes: 1, minimo: 0 } },
  });
  assert.equal(tendencias.tipo, 'ranking');
  assert.ok(tendencias.items.length > 0, 'el seed trae actividad reciente');

  const papelera = await ok('/api/instancia/edicion/vista-previa', 'direccion', 'POST', { slot: 'perfiles.papelera', config: { parametros: { dias: 1 } } });
  assert.equal(papelera.tipo, 'impacto');
  const racha = await ok('/api/instancia/edicion/vista-previa', 'direccion', 'POST', { slot: 'objetivos.racha', config: { parametros: { diasGracia: 3 } } });
  assert.equal(racha.tipo, 'impacto');
  assert.ok(racha.cifras[0].despues >= racha.cifras[0].antes, 'más gracia nunca corta más rachas');
  const alerta = await ok('/api/instancia/edicion/vista-previa', 'direccion', 'POST', { slot: 'aula.alerta-ritmo', config: { activo: true } });
  assert.equal(alerta.tipo, 'distribucion');
  assert.equal(alerta.despues.histograma.reduce((s, n) => s + n, 0), 1500);
  await ok('/api/instancia/edicion/vista-previa', 'direccion', 'POST', { slot: 'no.existe' }, 404);

  // Guardar: las perillas se acotan a su rango y el servidor usa lo nuevo.
  const r = await guardar({ algoritmos: { 'comunidad.orden-feed': { parametros: { pesoVotos: 99, vidaMedia: 24 } }, 'calendario.limpieza': { activo: false } } });
  assert.equal(r.edicion.algoritmos['comunidad.orden-feed'].parametros.pesoVotos, 5);
  assert.equal(r.edicion.algoritmos['comunidad.orden-feed'].parametros.vidaMedia, 24);
  assert.equal(r.edicion.algoritmos['calendario.limpieza'].activo, false);
  assert.ok(r.cambios.some((c) => c.texto.includes('Peso de los votos 0 → 5')));
  assert.ok(r.cambios.some((c) => c.texto.includes('Se apaga el algoritmo «Limpieza de eventos viejos»')));
});

test('Un diseño de nodos solo se elige si el Maestro lo dejó aprobado', async () => {
  const { version } = await ok('/api/instancia/edicion', 'direccion');
  const r = await request('/api/instancia/edicion', 'direccion', 'PUT', { version, algoritmos: { 'comunidad.orden-feed': { variante: 'personalizado' } } });
  assert.equal(r.status, 400);
  assert.match(r.data.error, /personalizado/);

  // El Maestro aprueba un grafo para la escuela; recién ahí la dirección puede elegirlo.
  const nativo = await ok('/api/maestro/grafo-nativo', 'maestro', 'POST', { slot: 'comunidad.orden-feed', parametros: { pesoVotos: 2 } });
  const { aprobacion } = await ok('/api/maestro/aprobar', 'maestro', 'POST', { modo: 'algoritmo', slot: 'comunidad.orden-feed', grafo: nativo.grafo });
  const detalle = await ok('/api/maestro/instancias/1', 'maestro');
  const genoma = structuredClone(detalle.genoma);
  genoma.algoritmos['comunidad.orden-feed'] = { ...genoma.algoritmos['comunidad.orden-feed'], grafo: nativo.grafo, aprobacion, variante: 'nativo' };
  await ok('/api/maestro/instancias/1/genoma', 'maestro', 'PUT', { genoma, version: detalle.version, nota: 'Diseño para la dirección' });

  const e = await ok('/api/instancia/edicion', 'direccion');
  assert.equal(e.algoritmos['comunidad.orden-feed'].disenoMaestro, true);
  // El Maestro conservó la jerarquía que armó la dirección.
  assert.deepEqual(e.secciones.map((s) => s.id), ['convivir']);
  const g = await guardar({ algoritmos: { 'comunidad.orden-feed': { variante: 'personalizado' } } });
  assert.equal(g.edicion.algoritmos['comunidad.orden-feed'].variante, 'personalizado');
  assert.ok(g.cambios.some((c) => c.texto.includes('diseño de nodos del Maestro')));
  await ok('/api/comunidad/publicaciones', 'estudiante');
});

test('La dirección no toca lo que es del Maestro', async () => {
  const antes = await ok('/api/instancia/edicion', 'direccion');
  const r = await guardar({
    identidad: { nombre: 'Escuela Hackeada' },
    // Los colores sí son de la dirección; la redondez y el movimiento, no.
    tema: { radio: 26, movimiento: 'vibrante' },
    flujos: [{ id: 'x', nombre: 'Intruso' }],
    perfiles: {
      estudiante: { nombre: 'Otro nombre', color: '#000000', inicio: 'objetivos' },
      'perfil-nuevo': { nombre: 'No existe', arquetipo: 'estudiante' },
    },
  });
  assert.equal(r.edicion.escuela.nombre, antes.escuela.nombre);
  assert.deepEqual(r.edicion.tema, antes.tema);
  assert.equal(r.edicion.perfiles.length, antes.perfiles.length);
  const est = r.edicion.perfiles.find((p) => p.clave === 'estudiante');
  assert.equal(est.nombre, 'Estudiante');
  assert.equal(est.inicio, 'objetivos', 'el inicio de cada perfil sí es de la dirección');
  const detalle = await ok('/api/maestro/instancias/1', 'maestro');
  assert.deepEqual(detalle.genoma.flujos, []);
  // Nunca se elimina un módulo: aunque se pida, siguen todos.
  const r2 = await guardar({ modulos: { comunidad: null, perfiles: { oculto: true } } });
  assert.equal(Object.keys(r2.edicion.modulos).length, antes.catalogo.modulos.length);
  await guardar({ modulos: { perfiles: { oculto: false } } });
});

test('Colores de la escuela: la dirección los cambia (por ejemplo, desde el logo)', async () => {
  const antes = await ok('/api/instancia/edicion', 'direccion');
  const paleta = { acento: '#0B6E4F', primario: '#a7f3d0', secundario: '#fde68a', terciario: '#f59e0b', fondo: '#07130e', superficie: '#10241b' };
  const revision = await ok('/api/instancia/edicion/revisar', 'direccion', 'POST', { tema: paleta });
  assert.ok(revision.cambios.some((c) => c.icono === 'palette' && c.texto === 'Nuevos colores de la escuela'));

  const r = await guardar({ tema: paleta });
  assert.equal(r.edicion.tema.acento, '#0b6e4f', 'se guarda en minúsculas');
  assert.equal(r.edicion.tema.fondo, '#07130e');
  assert.equal(r.edicion.tema.radio, antes.tema.radio, 'la redondez sigue siendo la del Maestro');
  assert.equal(r.edicion.tema.movimiento, antes.tema.movimiento);
  // Todos los de la escuela reciben la paleta nueva.
  assert.equal((await ok('/api/instancia', 'estudiante')).tema.acento, '#0b6e4f');
  const detalle = await ok('/api/maestro/instancias/1', 'maestro');
  assert.equal(detalle.genoma.tema.superficie, '#10241b');

  // Un fondo claro o un color mal escrito no se guardan, y se dice por qué.
  const { version } = await ok('/api/instancia/edicion', 'direccion');
  const claro = await request('/api/instancia/edicion', 'direccion', 'PUT', { version, tema: { fondo: '#f5f5f5' } });
  assert.equal(claro.status, 400);
  assert.match(claro.data.error, /oscuro/);
  const mal = await request('/api/instancia/edicion', 'direccion', 'PUT', { version, tema: { acento: 'rojo' } });
  assert.equal(mal.status, 400);
  assert.match(mal.data.error, /no es válido/);
  assert.equal((await ok('/api/instancia/edicion', 'direccion')).tema.acento, '#0b6e4f');

  // Vuelve a la paleta de antes para no afectar las otras pruebas.
  const deVuelta = Object.fromEntries(['acento', 'primario', 'secundario', 'terciario', 'fondo', 'superficie'].map((k) => [k, antes.tema[k]]));
  assert.deepEqual((await guardar({ tema: deVuelta })).edicion.tema, antes.tema);
});

test('Revisar antes de guardar: lista de cambios y advertencias', async () => {
  const r = await ok('/api/instancia/edicion/revisar', 'direccion', 'POST', { modulos: { comunidad: { oculto: true } } });
  assert.ok(r.cambios.some((c) => c.texto.includes('Se oculta «Nuestra plaza» para toda la escuela')));
  assert.ok(r.advertencias.some((a) => a.includes('dependen de «Nuestra plaza»')));
  assert.ok(r.advertencias.some((a) => a.startsWith('Vos (')), 'avisa lo que deja de ver la propia dirección');
  const vacio = await ok('/api/instancia/edicion/revisar', 'direccion', 'POST', {});
  assert.deepEqual(vacio.cambios, []);
  const malo = await request('/api/instancia/edicion/revisar', 'direccion', 'POST', { algoritmos: { 'aula.alerta-ritmo': { variante: 'personalizado' } } });
  assert.equal(malo.status, 400);
});

test('Versiones: sin cambios no guarda, una versión vieja no pisa y queda el historial', async () => {
  const { version } = await ok('/api/instancia/edicion', 'direccion');
  const sinCambios = await request('/api/instancia/edicion', 'direccion', 'PUT', { version });
  assert.equal(sinCambios.status, 400);
  const sinVersion = await request('/api/instancia/edicion', 'direccion', 'PUT', { modulos: { chat: { etiqueta: 'Charlas' } } });
  assert.equal(sinVersion.status, 400);

  await ok('/api/instancia/edicion', 'direccion', 'PUT', { version, nota: 'Nombres más cálidos', modulos: { chat: { etiqueta: 'Charlas' } } });
  const viejo = await request('/api/instancia/edicion', 'direccion', 'PUT', { version, modulos: { chat: { etiqueta: 'Otro' } } });
  assert.equal(viejo.status, 409);
  assert.equal(viejo.data.codigo, 'version');

  const e = await ok('/api/instancia/edicion', 'direccion');
  assert.equal(e.modulos.chat.etiqueta, 'Charlas');
  const ultima = e.historial[0];
  assert.equal(ultima.autorRol, 'direccion');
  assert.match(ultima.nota, /^Nombres más cálidos — «Mensajes» pasa a llamarse «Charlas»/);
  assert.ok(e.historial.some((h) => h.autorRol === 'maestro'));
});
