import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { ROLES_POR_PAGINA } from '../permisos.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const tempRoot = realpathSync(tmpdir());
const temp = mkdtempSync(join(tempRoot, 'nexo-integracion-'));
const dbPath = join(temp, 'prueba.db');
let server, base, db, alumnoOtraEscuela, cursoOtraEscuela;
let logs = '';
const usuarios = {};
const cookies = {};
async function request(path, rol, method = 'GET', body) {
  const response = await fetch(base + path, { method, headers: { ...(rol ? { Cookie: cookies[rol] } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000) });
  const content = await response.text();
  let data;
  try { data = JSON.parse(content); } catch { assert.fail(`${method} ${path} no respondió JSON: ${content.slice(0,100)}`); }
  return { status: response.status, data, response };
}
async function ok(path, rol, method = 'GET', body, status = 200) {
  const result = await request(path, rol, method, body);
  assert.equal(result.status, status, `${method} ${path} (${rol}): ${JSON.stringify(result.data)}`);
  return result.data;
}
before(async () => {
  db = new DatabaseSync(dbPath);
  db.exec(readFileSync(join(root, 'base-de-datos/esquema.sql'), 'utf8'));
  db.exec(readFileSync(join(root, 'base-de-datos/datos-iniciales.sql'), 'utf8'));
  for (const usuario of db.prepare("SELECT id, email, rol FROM usuarios WHERE estado = 'activo' ORDER BY id").all()) usuarios[usuario.rol] ??= usuario;
  const otraEscuela = db.prepare('INSERT INTO instituciones (nombre,ciclo_lectivo) VALUES (?,?)').run('Institución aislada de prueba',2026).lastInsertRowid;
  alumnoOtraEscuela = Number(db.prepare("INSERT INTO usuarios (institucion_id,email,hash_contrasena,nombre,rol) SELECT ?, 'aislado@prueba.nexo', hash_contrasena, 'Estudiante de otra institución', 'estudiante' FROM usuarios WHERE id=?").run(otraEscuela,usuarios.estudiante.id).lastInsertRowid);
  cursoOtraEscuela = Number(db.prepare("INSERT INTO cursos (institucion_id,anio,division) VALUES (?,1,'Z')").run(otraEscuela).lastInsertRowid);
  server = spawn(process.execPath, ['servidor.js'], { cwd: join(root,'servidor'), windowsHide: true, env: { ...process.env, NEXO_DB_PATH: dbPath, NEXO_STORAGE_DIR: temp, NEXO_HOST: '127.0.0.1', NEXO_PORT: '0', NEXO_TLS_CERT: '', NEXO_TLS_KEY: '' }, stdio: ['ignore','pipe','pipe'] });
  await new Promise((resolveReady,reject) => {
    const timer = setTimeout(() => reject(new Error('Servidor no inició: '+logs)),15000);
    server.stdout.on('data', chunk => { logs += chunk; const match = logs.match(/encendida en http:\/\/localhost:(\d+)/); if (match) { base = `http://127.0.0.1:${match[1]}`; clearTimeout(timer); resolveReady(); } });
    server.stderr.on('data', chunk => { logs += chunk; });
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`Servidor salió ${code}: ${logs}`)); });
  });
  for (const [rol, usuario] of Object.entries(usuarios)) {
    const { response, status, data } = await request('/api/sesion', null, 'POST', { email: usuario.email, contrasena: 'nexo1234' });
    assert.equal(status, 200, JSON.stringify(data));
    cookies[rol] = response.headers.get('set-cookie').split(';')[0];
  }
});
after(async () => {
  if (server && server.exitCode === null) {
    await new Promise(resolveExit => { server.once('exit',resolveExit); server.kill(); setTimeout(resolveExit,3000).unref(); });
  }
  db?.close();
  const target = resolve(temp);
  assert.ok(target.startsWith(tempRoot + sep) && target.split(sep).at(-1).startsWith('nexo-integracion-'));
  rmSync(target,{recursive:true,force:true,maxRetries:3,retryDelay:100});
});

test('Sesiones y permisos: cada pantalla, los ocho roles y acceso anónimo', async t => {
  assert.equal((await request('/api/objetivos')).status,401);
  for (const rol of Object.keys(usuarios)) {
    await t.test(rol, async () => {
      const actual = await ok('/api/sesion',rol);
      assert.equal(actual.usuario.rol,rol);
      for (const [pagina,roles] of Object.entries(ROLES_POR_PAGINA)) await ok(`/api/permisos/acceso?pagina=${pagina}`,rol,'GET',undefined,roles.includes(rol)?200:403);
      await ok('/api/cuenta',rol);
      await ok('/api/notificaciones',rol);
      await ok('/api/notificaciones/resumen',rol);
    });
  }
});
const lecturas = {
  estudiante: ['/api/portafolio','/api/objetivos','/api/objetivos/resumen','/api/objetivos/materias','/api/objetivos/competencias/catalogo','/api/comunidad/publicaciones','/api/comunidad/debates','/api/biblioteca/filtros','/api/chat/conversaciones','/api/chat/contactos','/api/calendario','/api/aula/mis-clases','/api/asistencia-ia/estado','/api/asistencia-ia/historial'],
  profesor: ['/api/tareas/catedras','/api/tareas/docente','/api/aula/catedras','/api/aula/clases','/api/diario','/api/chat/contactos','/api/calendario/destinos'],
  'admin-academico': ['/api/panel/institucional','/api/perfiles','/api/cursos','/api/cursos/1/detalle','/api/gestion-academica/opciones','/api/reportes/opciones','/api/reportes/historial','/api/comunidad/denuncias','/api/comunicados/enviados','/api/quejas'],
  preceptor: ['/api/chat/mis-cursos-preceptor','/api/comunicados/enviados','/api/calendario','/api/chat/contactos'],
  bibliotecario: ['/api/biblioteca/cola','/api/biblioteca/filtros','/api/chat/contactos'],
  familia: ['/api/comunicados','/api/calendario','/api/chat/contactos'],
  administrador: ['/api/plataforma','/api/plataforma/plantillas'],
  'centro-estudiantes': ['/api/quejas','/api/calendario','/api/comunidad/publicaciones'],
};
test('Contratos de lectura del frontend',async t => {
  for (const [rol,rutas] of Object.entries(lecturas)) for (const ruta of rutas) await t.test(`${rol} ${ruta}`,()=>ok(ruta,rol));
});
test('Cursos: crear, evitar duplicado, asignar docente y conservar identidad', async () => {
  const opciones = await ok('/api/gestion-academica/opciones','admin-academico');
  const curso = await ok('/api/cursos','admin-academico','POST',{anio:7,division:'TEST',preceptorId:opciones.preceptores[0].id},201);
  await ok('/api/cursos','admin-academico','POST',{anio:7,division:'TEST'},409);
  await ok('/api/cursos','estudiante','POST',{anio:7,division:'OTRO'},403);
  await ok(`/api/cursos/${curso.id}/catedras`,'admin-academico','POST',{materiaId:opciones.materias[0].id,profesorId:opciones.profesores[0].id},201);
  const detalle = await ok(`/api/cursos/${curso.id}/detalle`,'admin-academico');
  assert.equal(detalle.catedras.length,1);
  assert.equal(detalle.catedras[0].materiaId,opciones.materias[0].id);
  assert.equal(detalle.preceptorId,opciones.preceptores[0].id);
  await ok(`/api/cursos/${curso.id}/inscripciones`,'admin-academico','PUT',{estudianteIds:[String(usuarios.estudiante.id)]},409);
});
test('Competencias: evidencia libre persistente, propiedad y validación',async()=>{
  const catalogo = await ok('/api/objetivos/competencias/catalogo','estudiante');
  assert.ok(catalogo.competencias.length);
  const id = catalogo.competencias[0].id;
  const evidencia = await ok(`/api/objetivos/competencias/${id}/evidencias`,'estudiante','POST',{titulo:'Evidencia de prueba',descripcion:'Una reflexión comprobable'},201);
  const objetivos = await ok('/api/objetivos','estudiante');
  assert.ok(objetivos.competencias.find(c=>c.id===id).evidencias.some(e=>e.id===evidencia.id));
  await ok(`/api/objetivos/competencias/${id}/evidencias`,'estudiante','POST',{titulo:'Vínculo inválido',tareaId:999999},400);
  await ok(`/api/objetivos/competencias/${id}/evidencias`,'profesor','POST',{titulo:'No permitido'},403);
  await ok(`/api/objetivos/evidencias/${evidencia.id}`,'estudiante','DELETE');
});
test('Chat: contactos, conversación idempotente, envío y lectura',async()=>{
  const {contactos} = await ok('/api/chat/contactos','estudiante');
  assert.ok(contactos.length);
  const destino = contactos[0].id;
  const primero = await ok('/api/chat/conversaciones','estudiante','POST',{destinatarioId:destino},201);
  const segundo = await request('/api/chat/conversaciones','estudiante','POST',{destinatarioId:destino});
  assert.ok([200,201].includes(segundo.status));
  assert.equal(primero.id,segundo.data.id);
  const mensaje = await request(`/api/chat/conversaciones/${primero.id}/mensajes`,'estudiante','POST',{contenido:'Mensaje de integración'});
  assert.ok([200,201].includes(mensaje.status),JSON.stringify(mensaje));
  const mensajes = await ok(`/api/chat/conversaciones/${primero.id}/mensajes`,'estudiante');
  assert.ok(mensajes.mensajes.some(m=>m.contenido==='Mensaje de integración'));
});
test('Circuito académico: asignación, entrega, corrección, nota y notificación consistentes', async () => {
  const catedra = db.prepare('SELECT ca.id FROM catedras ca JOIN inscripciones i ON i.curso_id=ca.curso_id WHERE ca.profesor_id=? AND i.estudiante_id=? LIMIT 1').get(usuarios.profesor.id,usuarios.estudiante.id);
  assert.ok(catedra);
  const tarea = await ok('/api/tareas','profesor','POST',{catedraId:catedra.id,titulo:'Trabajo de integración',consigna:'Explicá el procedimiento.',fechaLimite:'2099-12-31'},201);
  assert.ok((await ok('/api/portafolio','estudiante')).tareas.some(t=>t.id===tarea.id));
  const entrega = await ok(`/api/tareas/${tarea.id}/entrega`,'estudiante','POST',{comentario:'Mi resolución',archivos:[]},201);
  await ok(`/api/tareas/${tarea.id}/entrega`,'estudiante','POST',{comentario:'Duplicado'},409);
  const panel = await ok(`/api/tareas/${tarea.id}/panel`,'profesor');
  assert.equal(panel.alumnos.find(a=>a.estudianteId===String(usuarios.estudiante.id)).entregaId,entrega.id);
  await ok(`/api/entregas/${entrega.id}/correccion`,'profesor','POST',{nota:11,devolucion:'Inválida'},400);
  await ok(`/api/entregas/${entrega.id}/correccion`,'profesor','POST',{nota:9,devolucion:'Buen procedimiento.'});
  const detalle = await ok(`/api/tareas/${tarea.id}`,'estudiante');
  assert.equal(detalle.entrega.nota,9);
  assert.equal((await ok('/api/portafolio','estudiante')).tareas.find(t=>t.id===tarea.id).nota,9);
  await ok(`/api/tareas/${tarea.id}/entrega`,'estudiante','DELETE',undefined,409);
  const notificacion = db.prepare("SELECT id FROM notificaciones WHERE usuario_id=? AND objeto_tipo='tarea' AND objeto_id=?").get(usuarios.estudiante.id,Number(tarea.id));
  assert.ok(notificacion);
  await ok(`/api/notificaciones/${notificacion.id}/leer`,'profesor','POST',{},404);
  await ok(`/api/notificaciones/${notificacion.id}/leer`,'estudiante','POST',{});
});

test('Organización personal: crear, editar, completar y quitar sin perder datos al recargar',async()=>{
  const personal = await ok('/api/tareas-personales','estudiante','POST',{titulo:'Preparar resumen',descripcion:'Capítulo 2',fechaLimite:'2099-11-20'},201);
  await ok(`/api/tareas-personales/${personal.id}`,'estudiante','PUT',{titulo:'Preparar resumen final',descripcion:'Capítulos 2 y 3',fechaLimite:'2099-11-21'});
  await ok(`/api/tareas-personales/${personal.id}/completada`,'estudiante','PUT',{completada:true});
  const guardada=(await ok('/api/portafolio','estudiante')).personales.find(p=>p.id===personal.id);
  assert.equal(guardada.descripcion,'Capítulos 2 y 3'); assert.equal(guardada.completada,true);
  await ok(`/api/tareas-personales/${personal.id}`,'estudiante','DELETE');
  assert.ok(!(await ok('/api/portafolio','estudiante')).personales.some(p=>p.id===personal.id));
  const habito = await ok('/api/objetivos/habitos','estudiante','POST',{nombre:'Leer apuntes',frecuencia:'diario'},201);
  await ok(`/api/objetivos/habitos/${habito.id}`,'estudiante','PUT',{nombre:'Repasar apuntes',frecuencia:'semanal'});
  await ok(`/api/objetivos/habitos/${habito.id}/registro`,'estudiante','PUT',{cumplido:true});
  assert.ok((await ok('/api/objetivos','estudiante')).habitos.some(h=>h.id===habito.id && h.nombre==='Repasar apuntes'));
  await ok(`/api/objetivos/habitos/${habito.id}`,'estudiante','DELETE');
  assert.ok(!(await ok('/api/objetivos','estudiante')).habitos.some(h=>h.id===habito.id));
});

test('Familias: contenido de comunicados, respuesta privada y lectura por Dirección',async()=>{
  const lista = await ok('/api/comunicados','familia');
  const comunicado = lista.comunicados.find(c=>c.emisorRol==='admin-academico');
  assert.ok(comunicado?.contenido);
  const {conversacionId} = await ok(`/api/comunicados/${comunicado.id}/responder`,'familia','POST',{});
  const recargada = await ok('/api/comunicados','familia');
  assert.equal(recargada.comunicados.find(c=>c.id===comunicado.id).contenido,comunicado.contenido);
  assert.equal(recargada.comunicados.find(c=>c.id===comunicado.id).leido,true);
  const respuesta = await request(`/api/chat/conversaciones/${conversacionId}/mensajes`,'familia','POST',{contenido:'Consulta de prueba sobre el comunicado'});
  assert.ok([200,201].includes(respuesta.status));
  const hilo = await ok(`/api/chat/conversaciones/${conversacionId}/mensajes`,'admin-academico');
  assert.ok(hilo.mensajes.some(m=>m.contenido==='Consulta de prueba sobre el comunicado'));
  await ok(`/api/chat/conversaciones/${conversacionId}/mensajes`,'estudiante','GET',undefined,403);
  const vinculos = await ok(`/api/perfiles/${usuarios.familia.id}/vinculos`,'admin-academico');
  await ok(`/api/perfiles/${usuarios.familia.id}/vinculos`,'admin-academico','PUT',vinculos);
  assert.deepEqual(await ok(`/api/perfiles/${usuarios.familia.id}/vinculos`,'admin-academico'),vinculos);
});

test('Aislamiento institucional: cursos, familias y conversaciones rechazan referencias ajenas',async()=>{
  const opciones = await ok('/api/gestion-academica/opciones','admin-academico');
  assert.ok(!opciones.estudiantes.some(e=>e.id===String(alumnoOtraEscuela)));
  await ok(`/api/cursos/${cursoOtraEscuela}/detalle`,'admin-academico','GET',undefined,404);
  await ok(`/api/cursos/${cursoOtraEscuela}`,'admin-academico','PUT',{anio:2,division:'A'},404);
  await ok(`/api/perfiles/${usuarios.familia.id}/vinculos`,'admin-academico','PUT',{estudiantes:[{id:String(alumnoOtraEscuela),parentesco:'Tutor'}]},400);
  await ok('/api/chat/conversaciones','admin-academico','POST',{destinatarioId:String(alumnoOtraEscuela)},403);
});

test('Preceptoría: la actividad proviene de mensajes de cursos propios',async()=>{
  const {cursos} = await ok('/api/chat/mis-cursos-preceptor','preceptor');
  assert.ok(cursos.length);
  const curso = cursos[0];
  const mensaje = await request(`/api/chat/conversaciones/${curso.comunidadId}/mensajes`,'preceptor','POST',{contenido:'Actividad de prueba del curso'});
  assert.ok([200,201].includes(mensaje.status));
  const {actividades} = await ok('/api/chat/actividad-preceptor','preceptor');
  assert.ok(actividades.some(a=>a.cursoId===curso.id));
  assert.ok(actividades.every(a=>cursos.some(c=>c.id===a.cursoId)));
  await ok('/api/chat/actividad-preceptor','estudiante','GET',undefined,403);
});

test('Aula: planificación, horario, ingreso idempotente, etapas, pulso, preguntas y cierre',async()=>{
  const catedra = db.prepare('SELECT ca.id FROM catedras ca JOIN inscripciones i ON i.curso_id=ca.curso_id WHERE ca.profesor_id=? AND i.estudiante_id=? LIMIT 1').get(usuarios.profesor.id,usuarios.estudiante.id);
  const datos = {catedraId:catedra.id,titulo:'Clase de integración',fechaHora:new Date(Date.now()-60000).toISOString(),objetivos:'Repasar',materiales:'Apuntes',etapas:[{titulo:'Repaso',duracion:10}]};
  await ok('/api/aula/clases','profesor','POST',{...datos,fechaHora:'incorrecta'},400);
  const futura = await ok('/api/aula/clases','profesor','POST',{...datos,fechaHora:'2099-10-01T12:00:00Z'},201);
  await ok(`/api/aula/clases/${futura.id}/iniciar`,'profesor','POST',{},409);
  const clase = await ok('/api/aula/clases','profesor','POST',datos,201);
  const ruta = `/api/aula/clases/${clase.id}`;
  await ok(`${ruta}/entrar`,'estudiante','POST',{},409);
  await ok(`${ruta}/iniciar`,'estudiante','POST',{},403);
  await ok(`${ruta}/iniciar`,'profesor','POST',{});
  await ok(`${ruta}/entrar`,'estudiante','POST',{});
  await ok(`${ruta}/entrar`,'estudiante','POST',{});
  assert.equal(db.prepare('SELECT count(*) n FROM clase_asistencias WHERE clase_id=? AND estudiante_id=? AND desconectado_en IS NULL').get(Number(clase.id),usuarios.estudiante.id).n,1);
  const detalle = await ok(ruta,'profesor');
  await ok(`${ruta}/etapas/${detalle.etapas[0].id}`,'profesor','POST',{accion:'completar'});
  assert.equal((await ok(ruta,'estudiante')).etapas[0].estado,'completado');
  await ok(`${ruta}/comprension`,'estudiante','POST',{estado:'entiendo'});
  assert.ok((await ok(`${ruta}/pulso`,'profesor')).entiendo.some(p=>p.id===usuarios.estudiante.id));
  await ok(`${ruta}/preguntas`,'estudiante','POST',{texto:'¿Cómo se resuelve?'});
  const preguntas = await ok(`${ruta}/preguntas`,'profesor');
  await ok(`/api/aula/preguntas/${preguntas.preguntas[0].id}/responder`,'profesor','POST',{});
  assert.equal((await ok(`${ruta}/preguntas`,'profesor')).preguntas.length,0);
  await ok(`${ruta}/finalizar`,'profesor','POST',{});
  assert.equal((await ok(ruta,'estudiante')).clase.estado,'finalizada');
  assert.equal((await ok(`${ruta}/conectados`,'profesor')).conectados.length,0);
  await ok(`${ruta}/entrar`,'estudiante','POST',{},409);
});

test('Errores de API tienen formato JSON, incluyendo cuerpo inválido',async()=>{
  await ok('/api/no-existe',null,'GET',undefined,404);
  const mal = await fetch(base+'/api/sesion',{method:'POST',headers:{'Content-Type':'application/json'},body:'{mal'});
  assert.equal(mal.status,400);
  assert.equal(typeof (await mal.json()).error,'string');
});
