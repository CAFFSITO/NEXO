import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import WebSocket from 'ws';
import { crearEntorno } from './entorno.js';
import { fuenteDocumentoAutorizada } from '../documentos.js';

let entorno;
before(async () => {
  entorno = await crearEntorno('nexo-documentos-');
  await entorno.entrar('profesor', 'garcia@sanmartin.nexo.edu');
  await entorno.entrar('estudiante', 'julieta@sanmartin.nexo.edu');
});
after(async () => { await entorno?.cerrar(); });

test('Bloques enriquecidos: archivos autorizados, colaboración de lectura revocable y avances personales', async()=>{
  const {ok,crudo,db}=entorno;
  const subida=await crudo('/api/archivos','profesor',{method:'POST',headers:{'Content-Type':'text/plain','X-Nombre-Archivo':'lectura.txt'},body:'Material del documento'});
  assert.equal(subida.status,201);
  const archivoId=subida.datos.archivo.id;
  const contenido=[{id:'t',tipo:'tabla',texto:'Resultados',filas:[['Tema','Valor'],['Concepto','2']]},{id:'l',tipo:'enlace',texto:'Consultar',url:'https://example.org/'},{id:'f',tipo:'archivo',texto:'Lectura',archivoId},{id:'a',tipo:'accionable',texto:'Explicar el concepto'}];
  const creado=(await ok('/api/documentos','profesor','POST',{tipo:'documento',titulo:'Bloques reales',contenido},201)).documento;
  const url=`/api/documentos/${creado.id}`,alumno=db.prepare("SELECT id FROM usuarios WHERE email='julieta@sanmartin.nexo.edu'").get();
  assert.equal((await crudo(`/api/archivos/${archivoId}`,'estudiante')).status,403);
  await ok(`${url}/colaboradores`,'profesor','POST',{usuarioId:alumno.id,permiso:'leer'});
  const lectura=(await ok(url,'estudiante')).documento;
  assert.equal(lectura.editable,false);assert.deepEqual(lectura.contenido[0].filas,contenido[0].filas);
  assert.equal((await crudo(`/api/archivos/${archivoId}`,'estudiante')).status,200);
  await ok(url,'estudiante','PUT',{version:1,contenido:[]},403);
  await ok(`${url}/acciones/a`,'estudiante','PUT',{completado:true,evidencia:'Explicación propia'});
  assert.deepEqual((await ok(`${url}/acciones`,'estudiante')).acciones,[{bloqueId:'a',completado:true,evidencia:'Explicación propia'}]);
  assert.deepEqual((await ok(`${url}/acciones`,'profesor')).acciones,[]);
  await ok(`${url}/acciones/t`,'estudiante','PUT',{completado:true},404);
  await ok(`${url}/colaboradores/${alumno.id}`,'profesor','DELETE');
  await ok(url,'estudiante','GET',undefined,404);
  assert.equal((await crudo(`/api/archivos/${archivoId}`,'estudiante')).status,403);
  const busqueda=await ok('/api/documentos/personas?buscar=Julieta','profesor');assert.ok(busqueda.personas.some(p=>p.id===alumno.id));
  await ok('/api/documentos','estudiante','POST',{tipo:'documento',titulo:'Archivo ajeno',contenido:[contenido[2]]},400);
  await ok('/api/documentos','profesor','POST',{tipo:'documento',titulo:'Enlace inseguro',contenido:[{...contenido[1],url:'javascript:alert(1)'}]},400);
});

test('Cuestionario: soluciones protegidas, puntaje, intentos, historial propio y restauración de configuración',async()=>{
  const {ok,db}=entorno;
  const contenido=[{id:'p',tipo:'pregunta',texto:'Dos más dos',respuesta:'numero',opciones:[],correcta:4,puntos:3,devolucion:'Comprobá la suma.',obligatoria:true},{id:'m',tipo:'pregunta',texto:'Seleccioná pares',respuesta:'multiple',opciones:['2','3','4'],correcta:['2','4'],puntos:1}];
  const creado=(await ok('/api/documentos','profesor','POST',{tipo:'formulario',titulo:'Evaluación protegida',contenido,evaluacion:{intentosMaximos:2,aprobacion:80}},201)).documento;
  const url=`/api/documentos/${creado.id}`;
  await ok(url,'profesor','PUT',{version:1,publicado:true});
  const lector=(await ok(url,'estudiante')).documento;assert.equal(lector.contenido[0].correcta,undefined);assert.equal(lector.contenido[0].devolucion,undefined);
  const listado=(await ok('/api/documentos','estudiante')).documentos.find(d=>d.id===creado.id);assert.equal(listado.contenido[0].correcta,undefined);
  const copia=(await ok(`${url}/ramificar`,'estudiante','POST',{},201)).documento;assert.equal(copia.contenido[0].correcta,undefined);
  const intento1=(await ok(`${url}/respuestas`,'estudiante','POST',{respuestas:{p:3,m:['2']}},201)).resultado;
  assert.equal(intento1.puntaje,0);assert.equal(intento1.maximo,4);assert.equal(intento1.aprobado,false);assert.equal(intento1.detalle[0].solucion,undefined);
  const intento2=(await ok(`${url}/respuestas`,'estudiante','POST',{respuestas:{p:4,m:['4','2']}},201)).resultado;
  assert.equal(intento2.porcentaje,100);assert.equal(intento2.aprobado,true);assert.equal(intento2.detalle[0].solucion,4);
  await ok(`${url}/respuestas`,'estudiante','POST',{respuestas:{p:4,m:['2','4']}},409);
  assert.equal((await ok(`${url}/mis-respuestas`,'estudiante')).respuestas.length,2);
  assert.equal((await ok(`${url}/mis-respuestas`,'profesor')).respuestas.length,0);
  await ok(`${url}/respuestas`,'estudiante','GET',undefined,403);
  const u=db.prepare("SELECT id,institucion_id AS institucionId,rol FROM usuarios WHERE email='julieta@sanmartin.nexo.edu'").get();
  const fuente=fuenteDocumentoAutorizada(db,u,creado.id);assert.ok(fuente.texto.includes('Dos más dos'));assert.ok(!fuente.texto.includes('Comprobá la suma.'));assert.equal(fuenteDocumentoAutorizada(db,u,999999),null);
  await ok(url,'profesor','PUT',{version:2,evaluacion:{intentosMaximos:4,aprobacion:40}});
  const restaurado=(await ok(`${url}/restaurar`,'profesor','POST',{version:2,actual:3})).documento;assert.equal(restaurado.evaluacion.intentosMaximos,2);
});

test('Documento: publicación, versiones, conflicto, restauración y ramificación', async () => {
  const { ok } = entorno;
  const creado = (await ok('/api/documentos', 'profesor', 'POST', { tipo: 'documento', titulo: 'Página inicial', contenido: [{ id: 'a', tipo: 'texto', texto: 'Original' }] }, 201)).documento;
  await ok(`/api/documentos/${creado.id}`, 'estudiante', 'GET', undefined, 404);
  const editado = (await ok(`/api/documentos/${creado.id}`, 'profesor', 'PUT', { version: creado.version, publicado: true, contenido: [{ id: 'a', tipo: 'texto', texto: 'Revisado' }] })).documento;
  assert.equal(editado.version, 2);
  await ok(`/api/documentos/${creado.id}`, 'profesor', 'PUT', { version: creado.version, contenido: [] }, 409);
  assert.equal((await ok(`/api/documentos/${creado.id}`, 'estudiante')).documento.contenido[0].texto, 'Revisado');
  const copia = (await ok(`/api/documentos/${creado.id}/ramificar`, 'estudiante', 'POST', { plantilla: true }, 201)).documento;
  assert.equal(copia.plantilla, true);
  assert.equal(copia.publicado, false);
  assert.equal(copia.contenido[0].texto, 'Revisado');
  const restaurado = (await ok(`/api/documentos/${creado.id}/restaurar`, 'profesor', 'POST', { version: 1, actual: 2 })).documento;
  assert.equal(restaurado.contenido[0].texto, 'Original');
  assert.deepEqual((await ok(`/api/documentos/${creado.id}/versiones`, 'profesor')).versiones.map(v => v.version), [2, 1]);
});

test('Formulario: colaboración, condiciones y respuestas válidas', async () => {
  const { ok, db } = entorno;
  const bloques = [
    { id: 'a', tipo: 'pregunta', texto: 'Opción', respuesta: 'seleccion', opciones: ['Sí', 'No'], obligatoria: true },
    { id: 'b', tipo: 'pregunta', texto: 'Explicación', respuesta: 'texto', opciones: [], obligatoria: true, visibleSi: { id: 'a', operador: 'igual', valor: 'Sí' } },
  ];
  const creado = (await ok('/api/documentos', 'profesor', 'POST', { tipo: 'formulario', titulo: 'Consulta', contenido: bloques }, 201)).documento;
  const estudiante = db.prepare("SELECT id FROM usuarios WHERE email='julieta@sanmartin.nexo.edu'").get();
  await ok(`/api/documentos/${creado.id}/colaboradores`, 'profesor', 'POST', { usuarioId: estudiante.id });
  assert.equal((await ok(`/api/documentos/${creado.id}`, 'estudiante')).documento.editable, true);
  await ok(`/api/documentos/${creado.id}`, 'profesor', 'PUT', { version: 1, publicado: true });
  await ok(`/api/documentos/${creado.id}/respuestas`, 'estudiante', 'POST', { respuestas: { a: 'Sí' } }, 400);
  await ok(`/api/documentos/${creado.id}/respuestas`, 'estudiante', 'POST', { respuestas: { a: 'No' } }, 201);
  await ok(`/api/documentos/${creado.id}/respuestas`, 'estudiante', 'POST', { respuestas: { a: 'Sí', b: 'Porque sí' } }, 201);
  assert.equal((await ok(`/api/documentos/${creado.id}/respuestas`, 'profesor')).respuestas.length, 2);
  await ok('/api/documentos', 'profesor', 'POST', { tipo: 'formulario', titulo: 'Condición inválida', contenido: [{ ...bloques[1], visibleSi: { id: 'ausente', operador: 'igual', valor: 'Sí' } }] }, 400);
});

test('Dos editores fusionan bloques distintos y reciben 409 al modificar el mismo bloque', async () => {
  const { ok, db } = entorno;
  const original = [
    { id: 'a', tipo: 'texto', texto: 'A' },
    { id: 'b', tipo: 'texto', texto: 'B' },
  ];
  const creado = (await ok('/api/documentos', 'profesor', 'POST', { tipo: 'documento', titulo: 'Colaboración', contenido: original }, 201)).documento;
  const estudiante = db.prepare("SELECT id FROM usuarios WHERE email='julieta@sanmartin.nexo.edu'").get();
  await ok(`/api/documentos/${creado.id}/colaboradores`, 'profesor', 'POST', { usuarioId: estudiante.id });
  const url = `/api/documentos/${creado.id}`;
  const sesion = await entorno.request('/api/sesion', null, 'POST', { email: 'julieta@sanmartin.nexo.edu', contrasena: 'nexo1234' });
  assert.equal(sesion.status, 200);
  const socket = new WebSocket(sesion.response.url.replace(/^http/, 'ws').replace('/api/sesion', '/ws'), { headers: { Cookie: sesion.response.headers.get('set-cookie').split(';')[0] } });
  await once(socket, 'open');
  const aviso = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('No llegó aviso de nueva versión')), 3000);
    socket.on('message', data => { const evento = JSON.parse(data.toString()); if (evento.tipo === 'documento-version' && evento.documentoId === creado.id) { clearTimeout(timer); resolve(evento); } });
  });
  const primera = await ok(url, 'profesor', 'PUT', { version: 1, titulo: 'Colaboración', publicado: false, contenido: [{ ...original[0], texto: 'A docente' }, original[1]] });
  assert.equal(primera.documento.version, 2);
  assert.equal((await aviso).version, 2);
  socket.close();
  const segunda = await ok(url, 'estudiante', 'PUT', { version: 1, titulo: 'Colaboración', publicado: false, contenido: [original[0], { ...original[1], texto: 'B estudiante' }] });
  assert.equal(segunda.fusionado, true);
  assert.equal(segunda.documento.version, 3);
  assert.deepEqual(segunda.documento.contenido.map(b => b.texto), ['A docente', 'B estudiante']);
  await ok(url, 'estudiante', 'PUT', { version: 1, titulo: 'Colaboración', publicado: false, contenido: [{ ...original[0], texto: 'A estudiante' }, original[1]] }, 409);
  assert.deepEqual((await ok(url, 'profesor')).documento.contenido.map(b => b.texto), ['A docente', 'B estudiante']);
});

test('Formulario: condiciones encadenadas descartan respuestas ocultas y rechazan fechas imposibles', async () => {
  const { ok } = entorno;
  const contenido = [
    { id:'a', tipo:'pregunta', texto:'Participar', respuesta:'seleccion', opciones:['Sí','No'], obligatoria:true },
    { id:'b', tipo:'pregunta', texto:'Tema', respuesta:'texto', opciones:[], obligatoria:true, visibleSi:{id:'a',operador:'igual',valor:'Sí'} },
    { id:'c', tipo:'pregunta', texto:'Detalle', respuesta:'texto', opciones:[], obligatoria:true, visibleSi:{id:'b',operador:'distinto',valor:'Otro'} },
    { id:'fecha', tipo:'pregunta', texto:'Fecha', respuesta:'fecha', opciones:[], obligatoria:true },
  ];
  const creado=(await ok('/api/documentos','profesor','POST',{tipo:'formulario',titulo:'Ramas',contenido},201)).documento;
  const ruta=`/api/documentos/${creado.id}`;
  await ok(ruta,'profesor','PUT',{version:1,publicado:true});
  await ok(`${ruta}/respuestas`,'estudiante','POST',{respuestas:{a:'No',b:'Anterior',c:'Oculto',fecha:'2026-11-02'}},201);
  assert.deepEqual((await ok(`${ruta}/respuestas`,'profesor')).respuestas[0].respuestas,{a:'No',fecha:'2026-11-02'});
  await ok(`${ruta}/respuestas`,'estudiante','POST',{respuestas:{a:'No',fecha:'2026-02-30'}},400);
  await ok(`${ruta}/respuestas`,'estudiante','POST',{respuestas:{a:'No',fecha:'2026-11-02',intrusa:'No pertenece'}},400);
  await ok('/api/documentos','profesor','POST',{tipo:'formulario',titulo:'Opciones inválidas',contenido:[{...contenido[0],opciones:[{texto:'Objeto'}]}]},400);
  await ok('/api/documentos','profesor','POST',{tipo:'documento',titulo:'Texto inválido',contenido:[{id:'a',tipo:'texto',texto:{contenido:'Objeto'}}]},400);
});
