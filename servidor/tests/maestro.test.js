// Pruebas del perfil Maestro: forja de instancias, genoma aplicado en el
// servidor, aprobación por probabilidad, flujos de nodos y aislamiento.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { crearEntorno } from './entorno.js';

let entorno, db, request, ok, entrar;

before(async () => {
  entorno = await crearEntorno('nexo-maestro-');
  ({ db, request, ok, entrar } = entorno);
  await entrar('maestro', 'sistema@nexo.edu', 'nexo1234');
  await entrar('direccionSM', 'direccion@sanmartin.nexo.edu', 'nexo1234');
  await entrar('estudianteSM', 'julieta@sanmartin.nexo.edu', 'nexo1234');
});

after(async () => {
  await entorno?.cerrar();
});

const estado = {};

test('Solo el Maestro entra al estudio', async () => {
  const catalogo = await ok('/api/maestro/catalogo', 'maestro');
  assert.ok(catalogo.modulos.length >= 20);
  assert.ok(catalogo.nodos.some((n) => n.tipo === 'puerta'));
  assert.ok(catalogo.algoritmos.some((a) => a.id === 'comunidad.orden-feed'));
  await ok('/api/maestro/catalogo', 'direccionSM', 'GET', undefined, 403);
  await ok('/api/maestro/catalogo', 'estudianteSM', 'GET', undefined, 403);
  estado.catalogo = catalogo;
});

test('El generador por probabilidad es reproducible con la misma semilla', async () => {
  const necesidades = { comunidad: 0.9, academico: 0.4, familias: 0.2, autonomia: 0.8, control: 0.1, innovacion: 0.7 };
  const a = await ok('/api/maestro/proponer', 'maestro', 'POST', { necesidades, semilla: 4242 });
  const b = await ok('/api/maestro/proponer', 'maestro', 'POST', { necesidades, semilla: 4242 });
  assert.deepEqual(a.genoma, b.genoma);
  assert.ok(a.decisiones.every((d) => d.probabilidad >= 0 && d.probabilidad <= 1));
  assert.ok(a.combinatoria.exponente > 50);
  assert.equal(a.genoma.modulos.perfiles.oculto, false, 'perfiles es casi seguro');
});

test('Aprobar por probabilidad: un grafo personalizado sin aprobación no se guarda', async () => {
  const nativo = await ok('/api/maestro/grafo-nativo', 'maestro', 'POST', { slot: 'aula.alerta-ritmo' });
  const sim = await ok('/api/maestro/simular', 'maestro', 'POST', { modo: 'algoritmo', slot: 'aula.alerta-ritmo', grafo: nativo.grafo, iteraciones: 1000 });
  assert.ok(sim.probabilidad > 0 && sim.probabilidad < 1);
  assert.equal(sim.histograma.reduce((s, h) => s + h.cuenta, 0), 1000);
  const evaluado = await ok('/api/maestro/evaluar', 'maestro', 'POST', { modo: 'algoritmo', slot: 'aula.alerta-ritmo', grafo: nativo.grafo, valores: { pctEnRiesgo: 50, total: 10, umbral: 20 } });
  assert.equal(evaluado.salida, 1);
  // Un ciclo se rechaza con un motivo legible.
  const ciclico = { nodos: [{ id: 'a', tipo: 'sumar' }, { id: 'b', tipo: 'sumar' }, { id: 's', tipo: 'salida' }], conexiones: [{ de: 'a', salida: 'valor', a: 'b', entrada: 'a' }, { de: 'b', salida: 'valor', a: 'a', entrada: 'a' }, { de: 'b', salida: 'valor', a: 's', entrada: 'valor' }] };
  const r = await request('/api/maestro/simular', 'maestro', 'POST', { modo: 'algoritmo', slot: 'aula.alerta-ritmo', grafo: ciclico });
  assert.equal(r.status, 400);
  assert.match(r.data.error, /ciclo/);
  const aprobado = await ok('/api/maestro/aprobar', 'maestro', 'POST', { modo: 'algoritmo', slot: 'aula.alerta-ritmo', grafo: nativo.grafo });
  assert.equal(aprobado.aprobacion.huella, nativo.huella);
  estado.alertaNativa = { grafo: nativo.grafo, aprobacion: aprobado.aprobacion };
});

test('La Forja crea una escuela entera: genoma, perfiles propios y cuentas semilla', async () => {
  const genoma = structuredClone(estado.catalogo.genomaPorDefecto);
  genoma.identidad = { nombre: 'Escuela Técnica Andrómeda', lema: 'Ciencia y comunidad', icono: 'rocket_launch', dominio: 'andromeda.nexo.edu', semilla: 77 };
  genoma.tema.acento = '#22d3ee';
  genoma.modulos['asistencia-ia'].oculto = true;
  for (const [id, m] of Object.entries(genoma.modulos)) m.orden = id === 'objetivos' ? 0 : m.orden + 1;
  genoma.perfiles.find((p) => p.clave === 'estudiante').modulos.comunidad = { funciones: { 'comunidad.publicar': false } };
  genoma.perfiles.push({ clave: 'tutor', arquetipo: 'preceptor', nombre: 'Tutor de convivencia', color: '#f43f5e', icono: 'diversity_1', modulos: { calendario: { oculto: true } } });
  genoma.algoritmos['perfiles.papelera'].parametros.dias = 15;
  genoma.algoritmos['aula.alerta-ritmo'].variante = 'personalizado';
  genoma.algoritmos['aula.alerta-ritmo'].grafo = estado.alertaNativa.grafo;
  // Sin aprobación, el personalizado se rechaza.
  const sinAprobar = await request('/api/maestro/instancias', 'maestro', 'POST', { genoma, cicloLectivo: 2026, direccion: { nombre: 'Dra. Vera Rubin', email: 'direccion@andromeda.nexo.edu' }, cuentasSemilla: true });
  assert.equal(sinAprobar.status, 400);
  assert.match(sinAprobar.data.error, /aprob/);
  genoma.algoritmos['aula.alerta-ritmo'].aprobacion = estado.alertaNativa.aprobacion;

  const creada = await ok('/api/maestro/instancias', 'maestro', 'POST', { genoma, cicloLectivo: 2026, direccion: { nombre: 'Dra. Vera Rubin', email: 'direccion@andromeda.nexo.edu' }, cuentasSemilla: true }, 201);
  assert.ok(creada.id);
  const porEmail = Object.fromEntries(creada.credenciales.map((c) => [c.email, c]));
  assert.ok(porEmail['direccion@andromeda.nexo.edu']);
  assert.ok(porEmail['estudiante@andromeda.nexo.edu']);
  assert.ok(porEmail['tutor@andromeda.nexo.edu']);
  assert.equal(db.prepare("SELECT perfil_clave FROM usuarios WHERE email = 'tutor@andromeda.nexo.edu'").get().perfil_clave, 'tutor');
  estado.id = creada.id;
  await entrar('direccionA', 'direccion@andromeda.nexo.edu', porEmail['direccion@andromeda.nexo.edu'].contrasena);
  await entrar('estudianteA', 'estudiante@andromeda.nexo.edu', porEmail['estudiante@andromeda.nexo.edu'].contrasena);
  await entrar('profesorA', 'profesor@andromeda.nexo.edu', porEmail['profesor@andromeda.nexo.edu'].contrasena);
  await entrar('tutorA', 'tutor@andromeda.nexo.edu', porEmail['tutor@andromeda.nexo.edu'].contrasena);
  // El nombre de la instancia quedó en instituciones.
  assert.equal((await ok('/api/institucion', 'estudianteA')).nombre, 'Escuela Técnica Andrómeda');
});

test('El genoma se aplica en el servidor: módulos ocultos y funciones apagadas dan 403', async () => {
  const instancia = await ok('/api/instancia', 'estudianteA');
  assert.equal(instancia.tema.acento, '#22d3ee');
  assert.equal(instancia.modulos[0].id, 'objetivos');
  assert.equal(instancia.modulos.find((m) => m.id === 'asistencia-ia').visible, false);
  assert.ok(instancia.funcionesDesactivadas.includes('comunidad.publicar'));

  const oculto = await request('/api/permisos/acceso?pagina=asistencia-ia', 'estudianteA');
  assert.equal(oculto.status, 403);
  assert.equal(oculto.data.codigo, 'modulo-oculto');
  assert.equal((await request('/api/asistencia-ia/estado', 'estudianteA')).status, 403);

  const publicar = await request('/api/comunidad/publicaciones', 'estudianteA', 'POST', { contenido: 'Hola Andrómeda' });
  assert.equal(publicar.status, 403);
  assert.equal(publicar.data.codigo, 'funcion-desactivada');
  // El profesor sí publica (la función solo se apagó para el perfil Estudiante).
  await ok('/api/comunidad/publicaciones', 'profesorA', 'POST', { contenido: 'Bienvenidos a Andrómeda' }, 201);

  // El perfil propio "Tutor" (arquetipo preceptor) no ve el calendario.
  const tutor = await ok('/api/instancia', 'tutorA');
  assert.equal(tutor.perfil.nombre, 'Tutor de convivencia');
  assert.equal((await request('/api/calendario', 'tutorA')).status, 403);

  // San Martín no se enteró de nada: sigue con el genoma por defecto.
  await ok('/api/permisos/acceso?pagina=asistencia-ia', 'estudianteSM');
  const sm = await ok('/api/instancia', 'estudianteSM');
  assert.equal(sm.tema.acento, '#4f46e5');

  // Plazo de papelera propio de la escuela.
  assert.equal((await ok('/api/perfiles', 'direccionA')).diasPapelera, 15);
  assert.equal((await ok('/api/perfiles', 'direccionSM')).diasPapelera, 7);
});

test('La dirección desoculta lo que ocultó el Maestro', async () => {
  const antes = await ok('/api/instancia/modulos', 'direccionA');
  const ia = antes.modulos.find((m) => m.id === 'asistencia-ia');
  assert.equal(ia.oculto, true);
  const tutor = antes.modulos.find((m) => m.id === 'calendario');
  assert.deepEqual(tutor.perfilesOcultos.map((p) => p.clave), ['tutor']);
  await ok('/api/instancia/modulos', 'estudianteA', 'GET', undefined, 403);

  await ok('/api/instancia/modulos/asistencia-ia/desocultar', 'direccionA', 'POST', {});
  await ok('/api/permisos/acceso?pagina=asistencia-ia', 'estudianteA');
  await ok('/api/instancia/modulos/calendario/desocultar', 'direccionA', 'POST', { perfil: 'tutor' });
  await ok('/api/calendario', 'tutorA');
  // Ya visible: desocultar de nuevo es un conflicto, no un éxito silencioso.
  await ok('/api/instancia/modulos/asistencia-ia/desocultar', 'direccionA', 'POST', {}, 409);
  estado.versionTrasDireccion = (await ok('/api/instancia/modulos', 'direccionA')).version;
});

test('Guardar con una versión vieja no pisa el cambio de la dirección', async () => {
  const detalle = await ok(`/api/maestro/instancias/${estado.id}`, 'maestro');
  assert.equal(detalle.version, estado.versionTrasDireccion);
  assert.ok(detalle.versiones.some((v) => v.autorRol === 'direccion'));
  const conflicto = await request(`/api/maestro/instancias/${estado.id}/genoma`, 'maestro', 'PUT', { genoma: detalle.genoma, versionBase: 1 });
  assert.equal(conflicto.status, 409);
  estado.detalle = detalle;
});

test('Un flujo de nodos aprobado y activo avisa de verdad', async () => {
  const flujo = {
    id: 'aviso-publicacion',
    nombre: 'Avisar a la dirección cada publicación',
    activo: true,
    limiteHora: 10,
    grafo: {
      nodos: [
        { id: 't', tipo: 'disparador', x: 0, y: 0, datos: { evento: 'comunidad.publicacion' } },
        { id: 'p', tipo: 'puerta', x: 200, y: 0, datos: { en: { p: 1 } } },
        { id: 'n', tipo: 'notificar', x: 400, y: 0, datos: { destino: 'direccion', titulo: 'Nueva publicación', cuerpo: 'Se publicó algo a las {hora}' } },
      ],
      conexiones: [
        { de: 't', salida: 'pulso', a: 'p', entrada: 'senal' },
        { de: 'p', salida: 'valor', a: 'n', entrada: 'activar' },
      ],
    },
  };
  const genoma = structuredClone(estado.detalle.genoma);
  genoma.flujos = [flujo];
  // Activo sin aprobar: rechazado.
  const sinAprobar = await request(`/api/maestro/instancias/${estado.id}/genoma`, 'maestro', 'PUT', { genoma, versionBase: estado.detalle.version });
  assert.equal(sinAprobar.status, 400);
  const aprobado = await ok('/api/maestro/aprobar', 'maestro', 'POST', { modo: 'flujo', grafo: flujo.grafo, genoma });
  assert.equal(aprobado.simulacion.probabilidad, 1);
  flujo.aprobacion = aprobado.aprobacion;
  const guardado = await ok(`/api/maestro/instancias/${estado.id}/genoma`, 'maestro', 'PUT', { genoma, versionBase: estado.detalle.version, nota: 'Flujo de avisos' });
  assert.equal(guardado.version, estado.detalle.version + 1);

  await ok('/api/comunidad/publicaciones', 'profesorA', 'POST', { contenido: 'Mañana hay feria de ciencias' }, 201);
  const direccionA = db.prepare("SELECT id FROM usuarios WHERE email = 'direccion@andromeda.nexo.edu'").get().id;
  let aviso;
  for (let i = 0; i < 20 && !aviso; i++) {
    aviso = db.prepare("SELECT titulo FROM notificaciones WHERE usuario_id = ? AND tipo = 'flujo'").get(direccionA);
    if (!aviso) await new Promise((r) => setTimeout(r, 50));
  }
  assert.equal(aviso?.titulo, 'Nueva publicación');
  const detalle = await ok(`/api/maestro/instancias/${estado.id}`, 'maestro');
  assert.equal(detalle.actividad.find((a) => a.flujoId === 'aviso-publicacion').disparos, 1);
  estado.detalle = detalle;
});

test('La dirección asigna perfiles propios; no se puede borrar un perfil con personas', async () => {
  const { perfiles } = await ok('/api/instancia/perfiles', 'direccionA');
  assert.ok(perfiles.some((p) => p.clave === 'tutor' && p.usuarios === 1));
  await ok('/api/perfiles', 'direccionA', 'POST', { nombre: 'Lucía Tutora', email: 'lucia@andromeda.nexo.edu', rol: 'preceptor', perfilClave: 'tutor' }, 201);
  await ok('/api/perfiles', 'direccionA', 'POST', { nombre: 'Mal Asignado', email: 'mal@andromeda.nexo.edu', rol: 'estudiante', perfilClave: 'tutor' }, 400);
  const genoma = structuredClone(estado.detalle.genoma);
  genoma.perfiles = genoma.perfiles.filter((p) => p.clave !== 'tutor');
  const r = await request(`/api/maestro/instancias/${estado.id}/genoma`, 'maestro', 'PUT', { genoma, versionBase: estado.detalle.version });
  assert.equal(r.status, 400);
  assert.match(r.data.error, /asignada/);
});

test('Restaurar una versión anterior y apagar algoritmos', async () => {
  const detalle = await ok(`/api/maestro/instancias/${estado.id}`, 'maestro');
  const genoma = structuredClone(detalle.genoma);
  genoma.algoritmos['comunidad.tendencias'].activo = false;
  const guardado = await ok(`/api/maestro/instancias/${estado.id}/genoma`, 'maestro', 'PUT', { genoma, versionBase: detalle.version });
  const tendencias = await ok('/api/comunidad/tendencias', 'profesorA');
  assert.equal(tendencias.desactivado, true);
  await ok(`/api/maestro/instancias/${estado.id}/restaurar`, 'maestro', 'POST', { version: guardado.version - 1 });
  const otraVez = await ok('/api/comunidad/tendencias', 'profesorA');
  assert.notEqual(otraVez.desactivado, true);
  const lista = await ok('/api/maestro/instancias', 'maestro');
  assert.ok(lista.instancias.some((i) => i.id === estado.id && i.genoma.perfilesPropios === 1));
});
