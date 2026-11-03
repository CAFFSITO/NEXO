// Canales y contextos reutilizan el historial, adjuntos y bus del chat.
import { exigirAcceso, ventanilla } from './comun.js';
import { paginaVisible } from './genoma.js';
import { puedeVer } from './permisos.js';
import { proyectoContexto } from './proyectos.js';

function contextoHabilitado(db,usuario,tipo) {
  const pagina=tipo==='proyecto'?'proyectos':tipo==='meta'?'objetivos-metas':usuario.rol==='profesor'?'gestion-tareas-profesor':'mis-tareas-estudiante';
  return puedeVer(usuario.rol,pagina)&&paginaVisible(db,usuario,pagina);
}

export function migrarCanales(db) {
  const tabla = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='conversaciones'").get();
  if (!tabla.sql.includes("'canal'")) {
    const indices = db.prepare("SELECT sql FROM sqlite_master WHERE tbl_name='conversaciones' AND type IN ('index','trigger') AND sql IS NOT NULL").all();
    db.exec('PRAGMA foreign_keys=OFF; PRAGMA legacy_alter_table=ON; BEGIN IMMEDIATE');
    try {
      db.exec(tabla.sql.replace(/CREATE TABLE\s+"?conversaciones"?/i, 'CREATE TABLE conversaciones_nueva').replace("'clase'", "'clase','canal'"));
      db.exec('INSERT INTO conversaciones_nueva SELECT * FROM conversaciones; DROP TABLE conversaciones; ALTER TABLE conversaciones_nueva RENAME TO conversaciones');
      for (const i of indices) db.exec(i.sql);
      if (db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Relaciones inválidas al migrar canales');
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    finally { db.exec('PRAGMA legacy_alter_table=OFF; PRAGMA foreign_keys=ON'); }
  }
  db.exec(`CREATE TABLE IF NOT EXISTS chat_canales (
    conversacion_id INTEGER PRIMARY KEY REFERENCES conversaciones(id),
    institucion_id INTEGER NOT NULL REFERENCES instituciones(id),
    creador_id INTEGER NOT NULL REFERENCES usuarios(id),
    nombre TEXT NOT NULL, descripcion TEXT NOT NULL DEFAULT '',
    clase TEXT NOT NULL CHECK(clase IN ('canal','foro','hilo','ayuda','sugerencias','contexto')),
    visibilidad TEXT NOT NULL CHECK(visibilidad IN ('institucion','privada')),
    solo_lectura INTEGER NOT NULL DEFAULT 0,
    estado TEXT NOT NULL DEFAULT 'abierto' CHECK(estado IN ('abierto','resuelto','cerrado')),
    padre_id INTEGER REFERENCES chat_canales(conversacion_id),
    contexto_tipo TEXT, contexto_id INTEGER,
    version INTEGER NOT NULL DEFAULT 1,
    UNIQUE(institucion_id,contexto_tipo,contexto_id)
  );
  CREATE INDEX IF NOT EXISTS idx_chat_canales_institucion ON chat_canales(institucion_id,padre_id);
  CREATE INDEX IF NOT EXISTS idx_mensajes_pagina ON mensajes(conversacion_id,id);`);
}

function objeto(db, tipo, id) {
  if (tipo === 'proyecto') return proyectoContexto(db,id);
  if (tipo === 'meta') {
    const m = db.prepare(`SELECT m.*, u.institucion_id FROM metas m JOIN usuarios u ON u.id=m.estudiante_id WHERE m.id=?`).get(id);
    return m ? { titulo:m.titulo, institucionId:m.institucion_id, miembros:[m.estudiante_id], propietario:m.estudiante_id, pagina:'/objetivos/metas', parametro:'meta' } : null;
  }
  if (!['tarea','entrega'].includes(tipo)) return null;
  const t = tipo === 'tarea'
    ? db.prepare(`SELECT t.*, c.profesor_id, c.curso_id, cu.institucion_id FROM tareas t JOIN catedras c ON c.id=t.catedra_id JOIN cursos cu ON cu.id=c.curso_id WHERE t.id=? AND t.eliminado_en IS NULL`).get(id)
    : db.prepare(`SELECT t.*, e.estudiante_id, c.profesor_id,c.curso_id,cu.institucion_id FROM entregas e JOIN tareas t ON t.id=e.tarea_id JOIN catedras c ON c.id=t.catedra_id JOIN cursos cu ON cu.id=c.curso_id WHERE e.id=? AND t.eliminado_en IS NULL AND e.anulada_en IS NULL`).get(id);
  if (!t) return null;
  const miembros = tipo === 'entrega' ? [t.profesor_id,t.estudiante_id] : [t.profesor_id,...db.prepare('SELECT estudiante_id FROM inscripciones WHERE curso_id=?').all(t.curso_id).map(x=>x.estudiante_id)];
  return { titulo:t.titulo, institucionId:t.institucion_id, miembros, propietario:t.profesor_id, tareaId:t.id };
}

export function sincronizarCanal(db, canal) {
  if (canal.padre_id) {
    db.prepare(`DELETE FROM conversacion_miembros WHERE conversacion_id=? AND usuario_id NOT IN (SELECT usuario_id FROM conversacion_miembros WHERE conversacion_id=?)`).run(canal.conversacion_id,canal.padre_id);
    // En foros privados la invitación al foro incluye todos sus temas.
    if(canal.visibilidad==='privada')db.prepare(`INSERT OR IGNORE INTO conversacion_miembros(conversacion_id,usuario_id) SELECT ?,usuario_id FROM conversacion_miembros WHERE conversacion_id=?`).run(canal.conversacion_id,canal.padre_id);
  }
  if (!canal.contexto_tipo) return;
  const o = objeto(db,canal.contexto_tipo,canal.contexto_id);
  // Las metas personales admiten colaboradores invitados; no amplían el acceso a su contenido.
  const ids = o && o.institucionId===canal.institucion_id ? o.miembros : [];
  if (canal.contexto_tipo==='meta' && o) {
    db.prepare(`DELETE FROM conversacion_miembros WHERE conversacion_id=? AND usuario_id NOT IN (SELECT id FROM usuarios WHERE institucion_id=? AND estado='activo')`).run(canal.conversacion_id,canal.institucion_id);
  } else {
    db.prepare(`DELETE FROM conversacion_miembros WHERE conversacion_id=? ${ids.length?'AND usuario_id NOT IN ('+ids.map(()=>'?').join(',')+')':''}`).run(canal.conversacion_id,...ids);
  }
  const insertar=db.prepare('INSERT OR IGNORE INTO conversacion_miembros(conversacion_id,usuario_id) VALUES(?,?)');
  for (const id of ids) if(id) insertar.run(canal.conversacion_id,id);
}

export function canalDe(db,id,usuario) {
  const c=db.prepare('SELECT * FROM chat_canales WHERE conversacion_id=?').get(id);
  if (!c || c.institucion_id!==usuario.institucionId) return null;
  sincronizarCanal(db,c);
  if(c.contexto_tipo&&objeto(db,c.contexto_tipo,c.contexto_id)?.miembros.includes(usuario.id)&&!contextoHabilitado(db,usuario,c.contexto_tipo))return null;
  const miembro=Boolean(db.prepare('SELECT 1 FROM conversacion_miembros WHERE conversacion_id=? AND usuario_id=?').get(id,usuario.id));
  if(!miembro && c.visibilidad!=='institucion') return null;
  const propietario=c.contexto_tipo?objeto(db,c.contexto_tipo,c.contexto_id)?.propietario:c.creador_id;
  const administrable=propietario===usuario.id || (usuario.rol==='admin-academico' && !c.contexto_tipo);
  let contexto=null;
  if(c.contexto_tipo) {
    const o=objeto(db,c.contexto_tipo,c.contexto_id);
    if(o && o.miembros.includes(usuario.id)) contexto={tipo:c.contexto_tipo,id:String(c.contexto_id),titulo:o.titulo,
      href:c.contexto_tipo==='proyecto'?`/proyectos?proyecto=${c.contexto_id}`:c.contexto_tipo==='meta'?`/objetivos/metas?meta=${c.contexto_id}`:`${usuario.id===o.propietario?'/portafolio/gestion':'/portafolio/mis-tareas'}?${usuario.id===o.propietario&&c.contexto_tipo==='entrega'?'correccion':'tarea'}=${o.tareaId}${c.contexto_tipo==='entrega'?`&entrega=${c.contexto_id}`:''}`};
  }
  const padre=c.padre_id?canalDe(db,c.padre_id,usuario):null;
  const archivado=c.contexto_tipo==='proyecto'&&objeto(db,'proyecto',c.contexto_id)?.archivado;
  const puedeEscribir=Boolean(!archivado&&miembro&&c.estado==='abierto'&&c.clase!=='foro'&&(!c.solo_lectura||administrable)&&(!c.padre_id||(padre?.miembro&&padre.estado==='abierto'&&(!padre.soloLectura||padre.administrable))));
  return {id:String(id),nombre:c.nombre,descripcion:c.descripcion,clase:c.clase,visibilidad:c.visibilidad,soloLectura:Boolean(c.solo_lectura),estado:c.estado,padreId:c.padre_id?String(c.padre_id):null,version:c.version,miembro,administrable,contexto,puedeEscribir,
    puedeSalir:miembro&&!c.contexto_tipo&&c.clase!=='ayuda'&&c.creador_id!==usuario.id&&!(c.padre_id&&c.visibilidad==='privada'),
    participantes:miembro?db.prepare('SELECT u.id,u.nombre,u.rol FROM conversacion_miembros cm JOIN usuarios u ON u.id=cm.usuario_id WHERE cm.conversacion_id=? ORDER BY u.nombre').all(id).map(u=>({...u,id:String(u.id)})):[],
    temas:c.clase==='foro'?db.prepare('SELECT COUNT(*) AS n FROM chat_canales WHERE padre_id=?').get(id).n:undefined};
}

export function puedeEscribirCanal(db,id,usuario) {
  const c=db.prepare('SELECT * FROM chat_canales WHERE conversacion_id=?').get(id);
  if(!c) return true;
  return Boolean(canalDe(db,id,usuario)?.puedeEscribir);
}

/** También usado por archivos/avisos para validar acceso aunque nunca se abra Chat. */
export function puedeRecibirCanal(db,id,usuario) {
  if(db.prepare('SELECT tipo FROM conversaciones WHERE id=?').get(id)?.tipo!=='canal')return true;
  const u=typeof usuario==='object'?usuario:db.prepare('SELECT id,rol,institucion_id AS institucionId,perfil_clave AS perfilClave FROM usuarios WHERE id=?').get(usuario);
  return Boolean(u&&canalDe(db,id,u)?.miembro&&puedeVer(u.rol,'chat')&&paginaVisible(db,u,'chat'));
}

export function registrarCanales(app,db,mensajero) {
  migrarCanales(db);
  // Actualiza también las membresías retiradas antes de listar o leer el historial.
  app.use('/api/chat', (req,res,next)=>{
    const u=exigirAcceso(db,req,res,'chat'); if(!u)return;
    for(const c of db.prepare('SELECT * FROM chat_canales WHERE institucion_id=? AND (contexto_tipo IS NOT NULL OR padre_id IS NOT NULL)').all(u.institucionId)) sincronizarCanal(db,c);
    db.prepare('DELETE FROM conversacion_miembros WHERE usuario_id=? AND conversacion_id IN (SELECT conversacion_id FROM chat_canales WHERE institucion_id<>?)').run(u.id,u.institucionId);
    next();
  });
  const emitir=id=>{for(const m of db.prepare('SELECT usuario_id FROM conversacion_miembros WHERE conversacion_id=?').all(id)) mensajero.emitirA(m.usuario_id,{tipo:'conversaciones-actualizadas',conversacionId:String(id)});};
  const miembrosValidos=(ids,u)=>Array.isArray(ids)&&ids.length<=500&&ids.every(id=>Number.isSafeInteger(Number(id))&&db.prepare("SELECT 1 FROM usuarios WHERE id=? AND institucion_id=? AND estado='activo'").get(Number(id),u.institucionId));
  function crear(u,d,ids,contexto=null) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const id=Number(db.prepare("INSERT INTO conversaciones(tipo) VALUES('canal')").run().lastInsertRowid);
      db.prepare(`INSERT INTO chat_canales(conversacion_id,institucion_id,creador_id,nombre,descripcion,clase,visibilidad,solo_lectura,padre_id,contexto_tipo,contexto_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(id,u.institucionId,contexto?.propietario??u.id,d.nombre,d.descripcion??'',d.clase,d.visibilidad,Number(d.soloLectura??false),d.padreId??null,contexto?.tipo??null,contexto?.id??null);
      const agregar=db.prepare('INSERT OR IGNORE INTO conversacion_miembros(conversacion_id,usuario_id) VALUES(?,?)');
      for(const miembro of new Set([u.id,...ids.map(Number)])) agregar.run(id,miembro);
      db.exec('COMMIT');return id;
    } catch(e){db.exec('ROLLBACK');throw e;}
  }
  app.get('/api/chat/canales',ventanilla((req,res)=>{
    const u=exigirAcceso(db,req,res,'chat');if(!u)return;
    const padre=req.query.padreId==null?null:Number(req.query.padreId);
    if(padre!==null&&!canalDe(db,padre,u)?.miembro)return res.status(404).json({error:'Foro no disponible.'});
    const q=String(req.query.q??'').trim().slice(0,200).toLocaleLowerCase();
    const canales=db.prepare('SELECT conversacion_id FROM chat_canales WHERE institucion_id=? AND padre_id IS ? ORDER BY conversacion_id DESC').all(u.institucionId,padre).map(c=>canalDe(db,c.conversacion_id,u)).filter(c=>c&&(!q||`${c.nombre} ${c.descripcion}`.toLocaleLowerCase().includes(q)));
    res.json({canales});
  }));
  app.post('/api/chat/canales',ventanilla((req,res)=>{
    const u=exigirAcceso(db,req,res,'chat');if(!u)return;
    const d=req.body??{};const nombre=String(d.nombre??'').trim();const descripcion=String(d.descripcion??'').trim();
    if(!nombre||nombre.length>120||descripcion.length>2000||!['canal','foro','hilo','ayuda','sugerencias'].includes(d.clase)||!['institucion','privada'].includes(d.visibilidad)||typeof(d.soloLectura??false)!=='boolean')return res.status(400).json({error:'Revisá nombre, descripción y configuración del canal.'});
    let ids=d.miembros??[];
    if(!miembrosValidos(ids,u))return res.status(400).json({error:'Los participantes deben ser cuentas activas de esta institución.'});
    if(d.clase==='hilo'){
      const p=canalDe(db,Number(d.padreId),u);
      if(!p?.miembro||p.clase!=='foro'||p.estado!=='abierto'||(p.soloLectura&&!p.administrable))return res.status(403).json({error:'No podés abrir temas en este foro.'});
      if(d.visibilidad!==p.visibilidad)return res.status(400).json({error:'El tema debe conservar la visibilidad del foro.'});
      ids=p.participantes.map(x=>x.id);
    }else if(d.padreId!=null)return res.status(400).json({error:'Solo los temas pueden tener un foro padre.'});
    if(d.clase==='ayuda'){
      if(d.visibilidad!=='privada')return res.status(400).json({error:'Los pedidos de ayuda son privados.'});
      ids=db.prepare("SELECT id FROM usuarios WHERE institucion_id=? AND rol='admin-academico' AND estado='activo'").all(u.institucionId).map(x=>x.id);
    }
    const id=crear(u,{...d,nombre,descripcion},ids);emitir(id);res.status(201).json({canal:canalDe(db,id,u)});
  }));
  app.post('/api/chat/canales/:id/unirse',ventanilla((req,res)=>{
    const u=exigirAcceso(db,req,res,'chat');if(!u)return;
    const id=Number(req.params.id);const c=canalDe(db,id,u);
    if(!c||c.visibilidad!=='institucion')return res.status(404).json({error:'Canal no disponible.'});
    if(c.padreId&&!canalDe(db,Number(c.padreId),u)?.miembro)return res.status(403).json({error:'Unite primero al foro.'});
    db.prepare('INSERT OR IGNORE INTO conversacion_miembros(conversacion_id,usuario_id) VALUES(?,?)').run(id,u.id);emitir(id);res.json({canal:canalDe(db,id,u)});
  }));
  app.get('/api/chat/canales/:id',ventanilla((req,res)=>{
    const u=exigirAcceso(db,req,res,'chat');if(!u)return;
    const canal=canalDe(db,Number(req.params.id),u);
    if(!canal)return res.status(404).json({error:'Canal no disponible.'});
    res.json({canal});
  }));
  app.post('/api/chat/canales/:id/salir',ventanilla((req,res)=>{
    const u=exigirAcceso(db,req,res,'chat');if(!u)return;
    const id=Number(req.params.id),c=canalDe(db,id,u);
    if(!c?.puedeSalir)return res.status(403).json({error:'No podés salir desde aquí: quien creó un espacio puede cerrarlo; los contextos académicos mantienen su membresía y los temas privados se abandonan desde el foro.'});
    db.exec('BEGIN IMMEDIATE');try{
      db.prepare('DELETE FROM conversacion_miembros WHERE usuario_id=? AND (conversacion_id=? OR conversacion_id IN (SELECT conversacion_id FROM chat_canales WHERE padre_id=?))').run(u.id,id,id);
      db.exec('COMMIT');
    }catch(e){db.exec('ROLLBACK');throw e;}
    mensajero.emitirA(u.id,{tipo:'conversaciones-actualizadas',conversacionId:String(id)});emitir(id);res.json({ok:true});
  }));
  app.put('/api/chat/canales/:id',ventanilla((req,res)=>{
    const u=exigirAcceso(db,req,res,'chat');if(!u)return;
    const id=Number(req.params.id);const c=canalDe(db,id,u);const d=req.body??{};
    if(!c?.administrable)return res.status(403).json({error:'No podés configurar este canal.'});
    if(d.version!==c.version)return res.status(409).json({error:'El canal cambió. Recargá antes de guardar.'});
    const nombre=String(d.nombre??c.nombre).trim(),descripcion=String(d.descripcion??c.descripcion).trim();
    const estado=d.estado??c.estado,soloLectura=d.soloLectura??c.soloLectura;
    if(!nombre||nombre.length>120||descripcion.length>2000||!['abierto','resuelto','cerrado'].includes(estado)||typeof soloLectura!=='boolean')return res.status(400).json({error:'Configuración inválida.'});
    if(d.miembros!==undefined&&(!miembrosValidos(d.miembros,u)||['tarea','entrega','proyecto'].includes(c.contexto?.tipo)||c.clase==='ayuda'||c.clase==='hilo'))return res.status(400).json({error:'No se pueden reemplazar esos participantes.'});
    db.exec('BEGIN IMMEDIATE');try{
      db.prepare('UPDATE chat_canales SET nombre=?,descripcion=?,estado=?,solo_lectura=?,version=version+1 WHERE conversacion_id=?').run(nombre,descripcion,estado,Number(soloLectura),id);
      if(d.miembros!==undefined){
        db.prepare('DELETE FROM conversacion_miembros WHERE conversacion_id=?').run(id);
        const insertar=db.prepare('INSERT OR IGNORE INTO conversacion_miembros(conversacion_id,usuario_id) VALUES(?,?)');
        const creador=db.prepare('SELECT creador_id FROM chat_canales WHERE conversacion_id=?').get(id).creador_id;
        for(const miembro of new Set([creador,...d.miembros.map(Number)]))insertar.run(id,miembro);
      }
      db.exec('COMMIT');
    }catch(e){db.exec('ROLLBACK');throw e;}
    emitir(id);res.json({canal:canalDe(db,id,u)});
  }));
  const contexto=(req,res,crearSiFalta)=>{
    const u=exigirAcceso(db,req,res,'chat');if(!u)return;
    const tipo=req.params.tipo,id=Number(req.params.id),o=objeto(db,tipo,id);
    if(!o||o.institucionId!==u.institucionId||!o.miembros.includes(u.id)||!contextoHabilitado(db,u,tipo))return res.status(404).json({error:'Ese contexto no está disponible.'});
    let c=db.prepare('SELECT * FROM chat_canales WHERE institucion_id=? AND contexto_tipo=? AND contexto_id=?').get(u.institucionId,tipo,id);
    let nuevo=false;
    if(!c&&crearSiFalta){const cid=crear(u,{nombre:o.titulo,clase:'contexto',visibilidad:'privada'},o.miembros,{tipo,id,propietario:o.propietario});c=db.prepare('SELECT * FROM chat_canales WHERE conversacion_id=?').get(cid);nuevo=true;emitir(cid);}
    res.status(nuevo?201:200).json({canal:c?canalDe(db,c.conversacion_id,u):null});
  };
  app.get('/api/chat/contextos/:tipo/:id',ventanilla((req,res)=>contexto(req,res,false)));
  app.post('/api/chat/contextos/:tipo/:id',ventanilla((req,res)=>contexto(req,res,true)));
}
