import { exigirAcceso, ventanilla } from './comun.js';
import { createHash } from 'node:crypto';

/** Material propio organizado sobre recursos existentes, sin duplicar sus archivos. */
export function registrarBibliotecaOrganizacion(app, db) {
  db.exec(`CREATE TABLE IF NOT EXISTS biblioteca_colecciones (
    id INTEGER PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL, creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS biblioteca_coleccion_recursos (
    coleccion_id INTEGER NOT NULL REFERENCES biblioteca_colecciones(id) ON DELETE CASCADE,
    recurso_id INTEGER NOT NULL REFERENCES recursos(id) ON DELETE CASCADE,
    PRIMARY KEY(coleccion_id,recurso_id)
  );
  CREATE TABLE IF NOT EXISTS biblioteca_anotaciones (
    id INTEGER PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    recurso_id INTEGER NOT NULL REFERENCES recursos(id) ON DELETE CASCADE,
    ubicacion TEXT NOT NULL DEFAULT '', contenido TEXT NOT NULL,
    creado_en TEXT NOT NULL DEFAULT (datetime('now')),
    actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_biblioteca_anotaciones_recurso ON biblioteca_anotaciones(usuario_id,recurso_id);`);
  db.exec(`CREATE TABLE IF NOT EXISTS biblioteca_etiquetas (
    recurso_id INTEGER NOT NULL REFERENCES recursos(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL, PRIMARY KEY(recurso_id,nombre)
  );`);
  db.exec(`CREATE TABLE IF NOT EXISTS biblioteca_versiones (
    id INTEGER PRIMARY KEY, recurso_id INTEGER NOT NULL REFERENCES recursos(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL, titulo TEXT NOT NULL, descripcion TEXT NOT NULL,
    archivo_id INTEGER REFERENCES archivos(id), enlace_url TEXT,
    creado_por INTEGER NOT NULL REFERENCES usuarios(id), creado_en TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(recurso_id,numero)
  );`);
  db.exec(`CREATE TABLE IF NOT EXISTS biblioteca_vinculos (
    recurso_id INTEGER NOT NULL REFERENCES recursos(id) ON DELETE CASCADE,
    objeto_tipo TEXT NOT NULL CHECK(objeto_tipo IN ('tarea','materia','publicacion')),
    objeto_id INTEGER NOT NULL,
    creado_por INTEGER NOT NULL REFERENCES usuarios(id),
    creado_en TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY(recurso_id,objeto_tipo,objeto_id)
  );
  CREATE INDEX IF NOT EXISTS idx_biblioteca_vinculos_destino ON biblioteca_vinculos(objeto_tipo,objeto_id);`);
  const usuario = (req,res) => exigirAcceso(db,req,res,'biblioteca');
  const visible = (u,id) => db.prepare(`SELECT 1 FROM recursos WHERE id=? AND eliminado_en IS NULL AND
    ((estado='aprobado' AND (alcance='nacional' OR institucion_id=?)) OR
    (institucion_id=? AND (autor_id=? OR (estado='en-revision' AND ? IN ('bibliotecario','admin-academico')))))`).get(id,u.institucionId,u.institucionId,u.id,u.rol);
  db.exec(`CREATE TABLE IF NOT EXISTS biblioteca_notas_locales (
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id), clave TEXT NOT NULL,
    recurso_id INTEGER NOT NULL REFERENCES recursos(id), anotacion_id INTEGER REFERENCES biblioteca_anotaciones(id) ON DELETE SET NULL,
    huella TEXT NOT NULL, version_origen TEXT NOT NULL, PRIMARY KEY(usuario_id,clave));`);
  const versionLocal = rid => {
    const r=db.prepare('SELECT titulo,descripcion,archivo_id,enlace_url,(SELECT COALESCE(MAX(numero),0) FROM biblioteca_versiones WHERE recurso_id=r.id) AS version FROM recursos r WHERE id=?').get(rid);
    return r ? createHash('sha256').update(JSON.stringify(r)).digest('hex') : null;
  };
  app.get('/api/biblioteca/recursos/:id/copia-local',ventanilla((req,res)=>{
    const u=usuario(req,res);if(!u)return;const rid=Number(req.params.id);
    if(!Number.isSafeInteger(rid)||rid<1)return res.status(400).json({error:'Recurso inválido.'});
    if(!visible(u,rid))return res.status(404).json({error:'Recurso no disponible para esta cuenta.'});
    const r=db.prepare(`SELECT r.id,r.titulo,r.descripcion,r.archivo_id,r.enlace_url,r.alcance,u.nombre AS autor,
      a.nombre_original,a.tipo_mime,a.tamano_bytes FROM recursos r JOIN usuarios u ON u.id=r.autor_id LEFT JOIN archivos a ON a.id=r.archivo_id WHERE r.id=?`).get(rid);
    const anotaciones=db.prepare('SELECT id,ubicacion,contenido FROM biblioteca_anotaciones WHERE recurso_id=? AND usuario_id=? ORDER BY id').all(rid,u.id).map(n=>({...n,id:String(n.id)}));
    res.json({recurso:{id:String(r.id),titulo:r.titulo,descripcion:r.descripcion,autor:r.autor,alcance:r.alcance,enlaceUrl:r.enlace_url},version:versionLocal(rid),archivo:r.archivo_id&&r.nombre_original?{id:String(r.archivo_id),nombre:r.nombre_original,tipoMime:r.tipo_mime||'application/octet-stream',tamanoBytes:r.tamano_bytes}:null,anotaciones});
  }));
  app.post('/api/biblioteca/recursos/:id/anotaciones-locales',ventanilla((req,res)=>{
    const u=usuario(req,res);if(!u)return;const rid=Number(req.params.id);
    if(!Number.isSafeInteger(rid)||rid<1)return res.status(400).json({error:'Recurso inválido.'});
    if(!visible(u,rid))return res.status(404).json({error:'Recurso no disponible para esta cuenta.'});
    const {version,notas}=req.body??{};
    if(typeof version!=='string'||!Array.isArray(notas)||notas.length>100||notas.some(n=>!n||typeof n.clave!=='string'||!/^[\w-]{8,100}$/.test(n.clave)||typeof n.contenido!=='string'||!n.contenido.trim()||n.contenido.length>10000||typeof n.ubicacion!=='string'||n.ubicacion.length>200||typeof n.versionOrigen!=='string'||n.versionOrigen.length>100))return res.status(400).json({error:'Notas locales inválidas; enviá hasta 100 por lote.'});
    const actual=versionLocal(rid);
    if(version!==actual)return res.status(409).json({error:'El recurso cambió. Conservá tus notas y elegí si corresponden a la versión actual antes de sincronizarlas.',versionActual:actual});
    db.exec('BEGIN');try{
      const confirmadas=[];
      for(const n of notas){
        const huella=createHash('sha256').update(JSON.stringify({rid,ubicacion:n.ubicacion,contenido:n.contenido.trim(),versionOrigen:n.versionOrigen})).digest('hex');
        const previa=db.prepare('SELECT recurso_id,anotacion_id,huella FROM biblioteca_notas_locales WHERE usuario_id=? AND clave=?').get(u.id,n.clave);
        if(previa){if(previa.huella!==huella||previa.recurso_id!==rid){db.exec('ROLLBACK');return res.status(409).json({error:'Una nota con ese identificador ya fue sincronizada con otro contenido. Duplicala como nota nueva para conservar ambas.'});}confirmadas.push({clave:n.clave,id:previa.anotacion_id?String(previa.anotacion_id):null});continue;}
        const id=db.prepare('INSERT INTO biblioteca_anotaciones(usuario_id,recurso_id,ubicacion,contenido) VALUES(?,?,?,?)').run(u.id,rid,n.ubicacion,n.contenido.trim()).lastInsertRowid;
        db.prepare('INSERT INTO biblioteca_notas_locales(usuario_id,clave,recurso_id,anotacion_id,huella,version_origen) VALUES(?,?,?,?,?,?)').run(u.id,n.clave,rid,id,huella,n.versionOrigen);
        confirmadas.push({clave:n.clave,id:String(id)});
      }
      db.exec('COMMIT');res.json({confirmadas,version:actual});
    }catch(e){try{db.exec('ROLLBACK');}catch{/* La transacción ya fue cerrada. */}throw e;}
  }));
  const destino=(u,tipo,id,editar=false)=>{
    if(!Number.isSafeInteger(id)||id<1)return null;
    if(tipo==='tarea'){
      const t=db.prepare(`SELECT t.id,t.titulo,t.eliminado_en,c.profesor_id,c.curso_id,m.institucion_id FROM tareas t
        JOIN catedras c ON c.id=t.catedra_id JOIN materias m ON m.id=c.materia_id WHERE t.id=?`).get(id);
      if(!t||t.eliminado_en||t.institucion_id!==u.institucionId)return null;
      const docente=t.profesor_id===u.id||u.rol==='admin-academico';
      const alumno=!!db.prepare('SELECT 1 FROM inscripciones WHERE curso_id=? AND estudiante_id=?').get(t.curso_id,u.id);
      return (editar?docente:docente||alumno)?{tipo,id,titulo:t.titulo}:null;
    }
    if(tipo==='materia'){
      const m=db.prepare('SELECT id,nombre,institucion_id FROM materias WHERE id=?').get(id);
      if(!m||m.institucion_id!==u.institucionId)return null;
      const docente=u.rol==='admin-academico'||!!db.prepare('SELECT 1 FROM catedras WHERE materia_id=? AND profesor_id=?').get(id,u.id);
      return (editar?docente:true)?{tipo,id,titulo:m.nombre}:null;
    }
    if(tipo==='publicacion'){
      const p=db.prepare("SELECT id,contenido,institucion_id,autor_id,eliminado_en,publicar_en FROM publicaciones WHERE id=?").get(id);
      if(!p||p.eliminado_en||p.institucion_id!==u.institucionId)return null;
      if(!editar&&p.publicar_en&&Date.parse(p.publicar_en)>Date.now())return null;
      if(editar&&p.autor_id!==u.id&&u.rol!=='admin-academico')return null;
      return {tipo,id,titulo:p.contenido.slice(0,100)};
    }
    return null;
  };
  app.get('/api/biblioteca/vinculos/destinos',ventanilla((req,res)=>{
    const u=usuario(req,res);if(!u)return;
    const tipo=String(req.query?.tipo??'');
    let filas=[];
    if(tipo==='tarea')filas=db.prepare(`SELECT t.id FROM tareas t JOIN catedras c ON c.id=t.catedra_id
      JOIN materias m ON m.id=c.materia_id WHERE m.institucion_id=? AND t.eliminado_en IS NULL AND (c.profesor_id=? OR ?='admin-academico') ORDER BY t.id DESC LIMIT 100`).all(u.institucionId,u.id,u.rol);
    else if(tipo==='materia')filas=db.prepare(`SELECT m.id FROM materias m WHERE m.institucion_id=? AND
      (?='admin-academico' OR EXISTS(SELECT 1 FROM catedras c WHERE c.materia_id=m.id AND c.profesor_id=?)) ORDER BY m.nombre LIMIT 100`).all(u.institucionId,u.rol,u.id);
    else if(tipo==='publicacion')filas=db.prepare(`SELECT id FROM publicaciones WHERE institucion_id=? AND eliminado_en IS NULL AND
      (autor_id=? OR ?='admin-academico') ORDER BY id DESC LIMIT 100`).all(u.institucionId,u.id,u.rol);
    else return res.status(400).json({error:'Tipo de vínculo inválido.'});
    res.json({destinos:filas.map(f=>destino(u,tipo,f.id,true)).filter(Boolean)});
  }));
  app.get('/api/biblioteca/recursos/:id/vinculos',ventanilla((req,res)=>{
    const u=usuario(req,res);if(!u)return;
    const rid=Number(req.params.id);if(!visible(u,rid))return res.status(404).json({error:'Recurso no disponible.'});
    const vinculos=db.prepare('SELECT objeto_tipo,objeto_id FROM biblioteca_vinculos WHERE recurso_id=? ORDER BY creado_en DESC').all(rid)
      .map(v=>{const d=destino(u,v.objeto_tipo,v.objeto_id);return d?{...d,editable:!!destino(u,v.objeto_tipo,v.objeto_id,true)}:null;}).filter(Boolean);
    res.json({vinculos});
  }));
  app.post('/api/biblioteca/recursos/:id/vinculos',ventanilla((req,res)=>{
    const u=usuario(req,res);if(!u)return;
    const rid=Number(req.params.id),tipo=String(req.body?.tipo??''),oid=Number(req.body?.id);
    const r=db.prepare('SELECT estado,alcance,institucion_id FROM recursos WHERE id=? AND eliminado_en IS NULL').get(rid);
    if(!r||!visible(u,rid)||r.estado!=='aprobado')return res.status(404).json({error:'Recurso aprobado no disponible.'});
    const d=destino(u,tipo,oid,true);if(!d)return res.status(404).json({error:'Destino no disponible para vincular.'});
    db.prepare('INSERT OR IGNORE INTO biblioteca_vinculos(recurso_id,objeto_tipo,objeto_id,creado_por) VALUES(?,?,?,?)').run(rid,tipo,oid,u.id);
    res.status(201).json({vinculo:d});
  }));
  app.delete('/api/biblioteca/recursos/:id/vinculos/:tipo/:objetoId',ventanilla((req,res)=>{
    const u=usuario(req,res);if(!u)return;
    const rid=Number(req.params.id),tipo=String(req.params.tipo),oid=Number(req.params.objetoId);
    if(!visible(u,rid)||!destino(u,tipo,oid,true))return res.status(404).json({error:'Vínculo no disponible.'});
    db.prepare('DELETE FROM biblioteca_vinculos WHERE recurso_id=? AND objeto_tipo=? AND objeto_id=?').run(rid,tipo,oid);
    res.json({ok:true});
  }));
  app.get('/api/biblioteca/vinculos/:tipo/:objetoId/recursos',ventanilla((req,res)=>{
    const u=usuario(req,res);if(!u)return;
    const tipo=String(req.params.tipo),oid=Number(req.params.objetoId);
    if(!destino(u,tipo,oid))return res.status(404).json({error:'Destino no disponible.'});
    const recursos=db.prepare(`SELECT r.id,r.titulo,r.alcance,r.institucion_id FROM biblioteca_vinculos v
      JOIN recursos r ON r.id=v.recurso_id WHERE v.objeto_tipo=? AND v.objeto_id=? ORDER BY r.titulo`).all(tipo,oid)
      .filter(r=>visible(u,r.id)).map(r=>({id:String(r.id),titulo:r.titulo,nacional:r.alcance==='nacional'}));
    res.json({recursos});
  }));
  app.get('/api/biblioteca/buscar',ventanilla((req,res)=>{
    const u=usuario(req,res);if(!u)return;
    const termino=String(req.query?.q??'').trim().slice(0,120);
    if(!termino)return res.json({recursos:[],colecciones:[],anotaciones:[]});
    const normalizar=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const q=normalizar(termino);
    const recursos=db.prepare(`SELECT r.id,r.titulo,r.descripcion,r.tematica_libre,GROUP_CONCAT(t.nombre,' ') AS etiquetas
      FROM recursos r LEFT JOIN biblioteca_etiquetas t ON t.recurso_id=r.id
      WHERE r.eliminado_en IS NULL AND ((r.estado='aprobado' AND (r.alcance='nacional' OR r.institucion_id=?)) OR (r.institucion_id=? AND r.autor_id=?))
      GROUP BY r.id ORDER BY r.creado_en DESC`).all(u.institucionId,u.institucionId,u.id)
      .filter(r=>normalizar(`${r.titulo} ${r.descripcion} ${r.tematica_libre??''} ${r.etiquetas??''}`).includes(q)).slice(0,100)
      .map(r=>({id:String(r.id),titulo:r.titulo}));
    const colecciones=db.prepare('SELECT id,nombre FROM biblioteca_colecciones WHERE usuario_id=?').all(u.id)
      .filter(c=>normalizar(c.nombre).includes(q)).map(c=>({id:String(c.id),nombre:c.nombre}));
    const anotaciones=db.prepare('SELECT a.id,a.recurso_id,a.contenido,a.ubicacion FROM biblioteca_anotaciones a WHERE a.usuario_id=?').all(u.id)
      .filter(a=>visible(u,a.recurso_id)&&normalizar(`${a.contenido} ${a.ubicacion}`).includes(q))
      .slice(0,100).map(a=>({id:String(a.id),recursoId:String(a.recurso_id),contenido:a.contenido.slice(0,160)}));
    res.json({recursos,colecciones,anotaciones});
  }));
  app.get('/api/biblioteca/recursos/:id/etiquetas',ventanilla((req,res)=>{
    const u=usuario(req,res);if(!u)return;
    const rid=Number(req.params.id);if(!visible(u,rid))return res.status(404).json({error:'Recurso no disponible.'});
    res.json({etiquetas:db.prepare('SELECT nombre FROM biblioteca_etiquetas WHERE recurso_id=? ORDER BY nombre').all(rid).map(r=>r.nombre)});
  }));
  app.put('/api/biblioteca/recursos/:id/etiquetas',ventanilla((req,res)=>{
    const u=usuario(req,res);if(!u)return;
    const rid=Number(req.params.id);
    const r=db.prepare('SELECT autor_id FROM recursos WHERE id=? AND institucion_id=? AND eliminado_en IS NULL').get(rid,u.institucionId);
    if(!r||r.autor_id!==u.id)return res.status(404).json({error:'Recurso no disponible.'});
    const etiquetas=req.body?.etiquetas;
    if(!Array.isArray(etiquetas)||etiquetas.length>20||etiquetas.some(t=>typeof t!=='string'||!t.trim()||t.trim().length>40))return res.status(400).json({error:'Etiquetas inválidas.'});
    const nombres=[...new Set(etiquetas.map(t=>t.trim().toLowerCase()))];
    db.exec('BEGIN IMMEDIATE');try {db.prepare('DELETE FROM biblioteca_etiquetas WHERE recurso_id=?').run(rid);const insert=db.prepare('INSERT INTO biblioteca_etiquetas(recurso_id,nombre) VALUES(?,?)');for(const nombre of nombres)insert.run(rid,nombre);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
    res.json({etiquetas:nombres});
  }));
  app.get('/api/biblioteca/colecciones',ventanilla((req,res)=>{
    const u=usuario(req,res); if(!u)return;
    const colecciones=db.prepare(`SELECT c.id,c.nombre,c.creado_en,
      (SELECT COUNT(*) FROM biblioteca_coleccion_recursos cr WHERE cr.coleccion_id=c.id) AS total
      FROM biblioteca_colecciones c WHERE usuario_id=? ORDER BY c.nombre`).all(u.id);
    res.json({colecciones:colecciones.map(c=>({...c,id:String(c.id)}))});
  }));
  app.post('/api/biblioteca/colecciones',ventanilla((req,res)=>{
    const u=usuario(req,res);if(!u)return;
    const nombre=String(req.body?.nombre??'').trim();
    if(!nombre||nombre.length>120)return res.status(400).json({error:'Nombre de colección inválido.'});
    const id=db.prepare('INSERT INTO biblioteca_colecciones(usuario_id,nombre) VALUES(?,?)').run(u.id,nombre).lastInsertRowid;
    res.status(201).json({id:String(id),nombre});
  }));
  app.get('/api/biblioteca/colecciones/:id',ventanilla((req,res)=>{
    const u=usuario(req,res);if(!u)return;
    const c=db.prepare('SELECT * FROM biblioteca_colecciones WHERE id=? AND usuario_id=?').get(Number(req.params.id),u.id);
    if(!c)return res.status(404).json({error:'Colección no disponible.'});
    const recursos=db.prepare('SELECT recurso_id AS id FROM biblioteca_coleccion_recursos WHERE coleccion_id=?').all(c.id).filter(r=>visible(u,r.id)).map(r=>String(r.id));
    res.json({id:String(c.id),nombre:c.nombre,recursos});
  }));
  app.put('/api/biblioteca/colecciones/:id/recursos/:recursoId',ventanilla((req,res)=>{
    const u=usuario(req,res);if(!u)return;
    const c=db.prepare('SELECT id FROM biblioteca_colecciones WHERE id=? AND usuario_id=?').get(Number(req.params.id),u.id);
    const rid=Number(req.params.recursoId);
    if(!c||!visible(u,rid))return res.status(404).json({error:'Colección o recurso no disponible.'});
    db.prepare('INSERT OR IGNORE INTO biblioteca_coleccion_recursos(coleccion_id,recurso_id) VALUES(?,?)').run(c.id,rid);
    res.json({ok:true});
  }));
  app.delete('/api/biblioteca/colecciones/:id/recursos/:recursoId',ventanilla((req,res)=>{
    const u=usuario(req,res);if(!u)return;
    db.prepare('DELETE FROM biblioteca_coleccion_recursos WHERE coleccion_id IN (SELECT id FROM biblioteca_colecciones WHERE id=? AND usuario_id=?) AND recurso_id=?').run(Number(req.params.id),u.id,Number(req.params.recursoId));
    res.json({ok:true});
  }));
  app.get('/api/biblioteca/recursos/:id/anotaciones',ventanilla((req,res)=>{
    const u=usuario(req,res);if(!u)return;
    const rid=Number(req.params.id);if(!visible(u,rid))return res.status(404).json({error:'Recurso no disponible.'});
    const anotaciones=db.prepare('SELECT id,ubicacion,contenido,creado_en,actualizado_en FROM biblioteca_anotaciones WHERE recurso_id=? AND usuario_id=? ORDER BY id').all(rid,u.id).map(a=>({...a,id:String(a.id)}));
    res.json({anotaciones});
  }));
  app.post('/api/biblioteca/recursos/:id/anotaciones',ventanilla((req,res)=>{
    const u=usuario(req,res);if(!u)return;
    const rid=Number(req.params.id);if(!visible(u,rid))return res.status(404).json({error:'Recurso no disponible.'});
    const contenido=String(req.body?.contenido??'').trim(),ubicacion=String(req.body?.ubicacion??'').trim();
    if(!contenido||contenido.length>10000||ubicacion.length>200)return res.status(400).json({error:'Anotación inválida.'});
    const id=db.prepare('INSERT INTO biblioteca_anotaciones(usuario_id,recurso_id,ubicacion,contenido) VALUES(?,?,?,?)').run(u.id,rid,ubicacion,contenido).lastInsertRowid;
    res.status(201).json({id:String(id),ubicacion,contenido});
  }));
  app.delete('/api/biblioteca/anotaciones/:id',ventanilla((req,res)=>{
    const u=usuario(req,res);if(!u)return;
    db.prepare('DELETE FROM biblioteca_anotaciones WHERE id=? AND usuario_id=?').run(Number(req.params.id),u.id);
    res.json({ok:true});
  }));
  app.get('/api/biblioteca/recursos/:id/versiones',ventanilla((req,res)=>{
    const u=usuario(req,res);if(!u)return;
    const rid=Number(req.params.id);if(!visible(u,rid))return res.status(404).json({error:'Recurso no disponible.'});
    const recurso=db.prepare('SELECT titulo,descripcion,archivo_id,enlace_url FROM recursos WHERE id=?').get(rid);
    const anteriores=db.prepare('SELECT numero,titulo,descripcion,archivo_id,enlace_url,creado_en FROM biblioteca_versiones WHERE recurso_id=? ORDER BY numero DESC').all(rid);
    // El historial puede contener también títulos y descripciones de
    // borradores que nunca fueron aprobados: sólo el autor lo recibe.
    const autor=db.prepare('SELECT autor_id FROM recursos WHERE id=?').get(rid)?.autor_id===u.id;
    res.json({actual:{...recurso,numero:anteriores.length+1},anteriores:autor?anteriores:[]});
  }));
  app.put('/api/biblioteca/recursos/:id/version',ventanilla((req,res)=>{
    const u=usuario(req,res);if(!u)return;
    const rid=Number(req.params.id);
    const r=db.prepare('SELECT * FROM recursos WHERE id=? AND institucion_id=? AND eliminado_en IS NULL').get(rid,u.institucionId);
    if(!r||r.autor_id!==u.id)return res.status(404).json({error:'Recurso no disponible.'});
    const titulo=String(req.body?.titulo??r.titulo).trim(),descripcion=String(req.body?.descripcion??r.descripcion).trim();
    const archivoId=req.body?.archivoId==null?r.archivo_id:Number(req.body.archivoId);
    const enlaceUrl=req.body?.enlaceUrl===undefined?r.enlace_url:String(req.body.enlaceUrl??'').trim()||null;
    if(!titulo||titulo.length>200||descripcion.length>10000||!archivoId&&!enlaceUrl)return res.status(400).json({error:'Versión incompleta.'});
    if(archivoId&&!db.prepare('SELECT 1 FROM archivos WHERE id=? AND subido_por=?').get(archivoId,u.id))return res.status(400).json({error:'Archivo ajeno.'});
    const anterior=db.prepare('SELECT COALESCE(MAX(numero),0)+1 AS n FROM biblioteca_versiones WHERE recurso_id=?').get(rid).n;
    db.exec('BEGIN IMMEDIATE');try {
      db.prepare('INSERT INTO biblioteca_versiones(recurso_id,numero,titulo,descripcion,archivo_id,enlace_url,creado_por) VALUES(?,?,?,?,?,?,?)').run(rid,anterior,r.titulo,r.descripcion,r.archivo_id,r.enlace_url,u.id);
      db.prepare("UPDATE recursos SET titulo=?,descripcion=?,archivo_id=?,enlace_url=?,estado='en-revision',alcance='institucional' WHERE id=?").run(titulo,descripcion,archivoId,enlaceUrl,rid);
      db.prepare("INSERT INTO cola_revision(recurso_id,presentado_por,estado) VALUES(?,?,'pendiente') ON CONFLICT(recurso_id) DO UPDATE SET presentado_por=excluded.presentado_por,presentado_en=datetime('now'),estado='pendiente',destino=NULL,motivo_rechazo=NULL,decidido_por=NULL,decidido_en=NULL").run(rid,u.id);
      db.exec('COMMIT');
    } catch(e){db.exec('ROLLBACK');throw e;}
    res.json({id:String(rid),version:anterior+1,estado:'en-revision'});
  }));
  app.post('/api/biblioteca/recursos/:id/versiones/:numero/restaurar',ventanilla((req,res)=>{
    const u=usuario(req,res);if(!u)return;
    const rid=Number(req.params.id),numero=Number(req.params.numero);
    const r=db.prepare('SELECT * FROM recursos WHERE id=? AND institucion_id=? AND autor_id=? AND eliminado_en IS NULL').get(rid,u.institucionId,u.id);
    const v=db.prepare('SELECT * FROM biblioteca_versiones WHERE recurso_id=? AND numero=?').get(rid,numero);
    if(!r||!v)return res.status(404).json({error:'Versión no disponible.'});
    const siguiente=db.prepare('SELECT COALESCE(MAX(numero),0)+1 AS n FROM biblioteca_versiones WHERE recurso_id=?').get(rid).n;
    db.exec('BEGIN IMMEDIATE');try {
      db.prepare('INSERT INTO biblioteca_versiones(recurso_id,numero,titulo,descripcion,archivo_id,enlace_url,creado_por) VALUES(?,?,?,?,?,?,?)').run(rid,siguiente,r.titulo,r.descripcion,r.archivo_id,r.enlace_url,u.id);
      db.prepare("UPDATE recursos SET titulo=?,descripcion=?,archivo_id=?,enlace_url=?,estado='en-revision',alcance='institucional' WHERE id=?").run(v.titulo,v.descripcion,v.archivo_id,v.enlace_url,rid);
      db.prepare("INSERT INTO cola_revision(recurso_id,presentado_por,estado) VALUES(?,?,'pendiente') ON CONFLICT(recurso_id) DO UPDATE SET presentado_por=excluded.presentado_por,presentado_en=datetime('now'),estado='pendiente',destino=NULL,motivo_rechazo=NULL,decidido_por=NULL,decidido_en=NULL").run(rid,u.id);
      db.exec('COMMIT');
    }catch(e){db.exec('ROLLBACK');throw e;}
    res.json({id:String(rid),version:siguiente+1,estado:'en-revision'});
  }));
}
