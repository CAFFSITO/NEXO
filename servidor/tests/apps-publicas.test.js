import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearEntorno } from './entorno.js';

test('App pública: dos instituciones, copias múltiples, actualización y reversión conservan datos locales', async () => {
  const e = await crearEntorno('nexo-apps-', (db) => {
    db.prepare('INSERT INTO instituciones(id,nombre,ciclo_lectivo) VALUES(?,?,?)').run(2,'Otra escuela',2026);
    const hash = db.prepare('SELECT hash_contrasena FROM usuarios WHERE id=1').get().hash_contrasena;
    db.prepare(`INSERT INTO usuarios(institucion_id,email,hash_contrasena,nombre,rol,estado) VALUES(?,?,?,?,?,'activo')`).run(2,'direccion@otra.edu',hash,'Otra dirección','admin-academico');
  });
  try {
    await e.entrar('maestro','sistema@nexo.edu');
    await e.entrar('uno','direccion@sanmartin.nexo.edu');
    await e.entrar('dos','direccion@otra.edu');
    const d = { nombre: 'Guía de proyectos', descripcion: 'Aplicación educativa', bloques: [{ id: 'paso', tipo: 'accionable', titulo: 'Presentar idea', contenido: 'Explicá el problema.' }] };
    const creada = await e.ok('/api/apps-publicas/maestro','maestro','POST',d,201);
    assert.equal((await e.ok('/api/apps-publicas/catalogo','uno')).length,0);
    await e.ok(`/api/apps-publicas/maestro/${creada.id}/publicacion`,'maestro','PUT',{publicada:true});
    const uno = await e.ok('/api/apps-publicas/instancias','uno','POST',{appId:creada.id},201);
    const otraCopia = await e.ok('/api/apps-publicas/instancias','uno','POST',{appId:creada.id},201);
    const dos = await e.ok('/api/apps-publicas/instancias','dos','POST',{appId:creada.id},201);
    await e.entrar('alumno','julieta@sanmartin.nexo.edu');
    const visibles = await e.ok('/api/apps-publicas/comunidad','alumno');
    assert.equal(visibles.length,2);
    await e.ok(`/api/apps-publicas/comunidad/${uno.id}/datos`,'alumno','PUT',{datos:{paso:true}});
    assert.equal((await e.ok('/api/apps-publicas/comunidad','alumno')).find(x=>x.id===uno.id).datos.paso,true);
    assert.equal((await e.ok('/api/apps-publicas/comunidad','uno')).find(x=>x.id===uno.id).datos.paso,undefined);
    assert.equal((await e.request(`/api/apps-publicas/comunidad/${dos.id}/datos`,'alumno','PUT',{datos:{paso:true}})).status,404);
    assert.equal((await e.request(`/api/apps-publicas/comunidad/${dos.id}/resumen`,'alumno')).status,404);
    assert.notEqual(uno.id,otraCopia.id);
    assert.equal((await e.request(`/api/apps-publicas/instancias/${uno.id}`,'dos','PUT',{revision:1,operacion:'datos',datos:{paso:true}})).status,404);
    const guardada = await e.ok(`/api/apps-publicas/instancias/${uno.id}`,'uno','PUT',{revision:uno.revision,operacion:'datos',datos:{paso:true}});
    const renombrada = await e.ok(`/api/apps-publicas/instancias/${uno.id}`,'uno','PUT',{revision:guardada.revision,operacion:'configuracion',configuracion:{nombre:'Mi proyecto'}});
    const v2 = { ...d, bloques: [...d.bloques,{ id:'recurso', tipo:'enlace', titulo:'Biblioteca', contenido:'Abrí recursos', ruta:'/biblioteca' }] };
    await e.ok(`/api/apps-publicas/maestro/${creada.id}/versiones`,'maestro','POST',v2,201);
    const actualizada = await e.ok(`/api/apps-publicas/instancias/${uno.id}`,'uno','PUT',{revision:renombrada.revision,operacion:'version',version:2});
    assert.equal(actualizada.version,2);
    assert.equal(actualizada.nombre,'Mi proyecto');
    assert.equal(actualizada.datos.paso,true);
    const revertida = await e.ok(`/api/apps-publicas/instancias/${uno.id}`,'uno','PUT',{revision:actualizada.revision,operacion:'version',version:1});
    assert.equal(revertida.datos.paso,true);
    assert.equal(revertida.nombre,'Mi proyecto');
    assert.equal((await e.ok('/api/apps-publicas/instancias','uno')).find(x=>x.id===otraCopia.id).datos.paso,undefined);
    assert.equal((await e.ok('/api/apps-publicas/instancias','dos')).find(x=>x.id===dos.id).datos.paso,undefined);
  } finally { await e.cerrar(); }
});

test('Constructor acepta composición declarativa y rechaza enlaces inseguros o evidencia sin fuente', async () => {
  const e = await crearEntorno('nexo-apps-bloques-');
  try {
    await e.entrar('maestro','sistema@nexo.edu');
    await e.entrar('alumno','julieta@sanmartin.nexo.edu');
    const base = { nombre:'Secuencia', descripcion:'Prueba', bloques:[
      { id:'inicio', tipo:'bienvenida', titulo:'Bienvenida', contenido:'Empezá aquí' },
      { id:'juego', tipo:'juego', titulo:'Aplicá', contenido:'Elegí', dependeDe:'inicio', opciones:['Incorrecta','Correcta'], correcta:1,
        evidencia:{ estado:'favorable', fuente:'https://example.org/estudio' } },
      { id:'recurso', tipo:'embed', titulo:'Lectura', contenido:'Fuente', ruta:'https://example.org/lectura' },
      { id:'extra', tipo:'accionable', titulo:'Otra acción', contenido:'Independiente' },
    ] };
    assert.equal((await e.request('/api/apps-publicas/maestro','maestro','POST',{...base,bloques:[{...base.bloques[0],tipo:'embed',ruta:'javascript:alert(1)'}]})).status,400);
    assert.equal((await e.request('/api/apps-publicas/maestro','maestro','POST',{...base,bloques:base.bloques.map(b=>b.id==='juego'?{...b,evidencia:{estado:'favorable'}}:b)})).status,400);
    const creada = await e.ok('/api/apps-publicas/maestro','maestro','POST',base,201);
    await e.ok(`/api/apps-publicas/maestro/${creada.id}/publicacion`,'maestro','PUT',{publicada:true});
    await e.entrar('direccion','direccion@sanmartin.nexo.edu');
    const instalada = await e.ok('/api/apps-publicas/instancias','direccion','POST',{appId:creada.id},201);
    assert.equal((await e.request(`/api/apps-publicas/comunidad/${instalada.id}/datos`,'alumno','PUT',{datos:{juego:'1'}})).status,409);
    const marcado = await e.ok(`/api/apps-publicas/comunidad/${instalada.id}/datos`,'alumno','PUT',{datos:{inicio:true,juego:'1',inventado:'dato'}});
    assert.deepEqual(marcado.datos,{inicio:true,juego:'1'});
    await Promise.all([
      e.ok(`/api/apps-publicas/comunidad/${instalada.id}/datos`,'alumno','PUT',{datos:{extra:true}}),
      e.ok(`/api/apps-publicas/comunidad/${instalada.id}/datos`,'alumno','PUT',{datos:{juego:'0'}}),
    ]);
    const leida = (await e.ok('/api/apps-publicas/comunidad','alumno')).find(x=>x.id===instalada.id);
    assert.deepEqual(leida.datos,{inicio:true,juego:'0',extra:true});
    assert.equal(leida.definicion.bloques[1].dependeDe,'inicio');
    assert.equal(leida.definicion.bloques[1].evidencia.estado,'favorable');
  } finally { await e.cerrar(); }
});

test('Reservas por instancia respetan cupos, cancelación y actualización segura',async()=>{
  const e=await crearEntorno('nexo-apps-reservas-');
  try{
    await e.entrar('maestro','sistema@nexo.edu');
    await e.entrar('direccion','direccion@sanmartin.nexo.edu');
    await e.entrar('julieta','julieta@sanmartin.nexo.edu');
    await e.entrar('martin','martin@sanmartin.nexo.edu');
    const d={nombre:'Taller',descripcion:'Reservas gratuitas',bloques:[
      {id:'turno',tipo:'reserva',titulo:'Elegí turno',contenido:'Un cupo por persona',opciones:['Lunes','Martes'],capacidad:1},
      {id:'opinion',tipo:'encuesta',titulo:'Tema',contenido:'Elegí tema',opciones:['A','B']},
    ]};
    const app=await e.ok('/api/apps-publicas/maestro','maestro','POST',d,201);
    await e.ok(`/api/apps-publicas/maestro/${app.id}/publicacion`,'maestro','PUT',{publicada:true});
    const copia=await e.ok('/api/apps-publicas/instancias','direccion','POST',{appId:app.id},201);
    const otra=await e.ok('/api/apps-publicas/instancias','direccion','POST',{appId:app.id},201);
    const ruta=`/api/apps-publicas/comunidad/${copia.id}`;
    await e.ok(`${ruta}/reservas/turno`,'julieta','PUT',{opcion:0});
    assert.equal((await e.request(`${ruta}/reservas/turno`,'martin','PUT',{opcion:0})).status,409);
    assert.equal((await e.ok(`${ruta}/resumen`,'martin')).totales.turno[0],1);
    assert.equal((await e.ok(`/api/apps-publicas/comunidad/${otra.id}/resumen`,'martin')).totales.turno[0],0);
    await e.ok(`${ruta}/datos`,'julieta','PUT',{datos:{opinion:'1'}});
    assert.equal((await e.ok('/api/apps-publicas/comunidad','julieta')).find(x=>x.id===copia.id).datos.turno,'0');
    assert.equal((await e.ok(`${ruta}/resumen`,'martin')).totales.opinion[1],1);
    const v2={...d,bloques:[{...d.bloques[0],opciones:['Otro día','Martes']},d.bloques[1]]};
    await e.ok(`/api/apps-publicas/maestro/${app.id}/versiones`,'maestro','POST',v2,201);
    assert.equal((await e.request(`/api/apps-publicas/instancias/${copia.id}`,'direccion','PUT',{revision:copia.revision,operacion:'version',version:2})).status,400);
    await e.ok(`${ruta}/reservas/turno`,'julieta','PUT',{opcion:null});
    assert.equal((await e.ok(`${ruta}/resumen`,'martin')).totales.turno[0],0);
    await e.ok(`${ruta}/reservas/turno`,'martin','PUT',{opcion:0});
  }finally{await e.cerrar();}
});
