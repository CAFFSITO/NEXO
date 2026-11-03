// Una instalación posee referencias nativas y datos locales; la definición no
// contiene IDs ni datos de otra institución. Los permisos nativos siguen vigentes.
import { exigirAcceso, ventanilla } from './comun.js';
import { usuarioDeLaSesion } from './sesiones.js';
import { canalDe } from './canales.js';

const NATIVOS=new Set(['chat','foro','sugerencias','documento','formulario']);
const COMUNIDAD=new Set(['directorio','tablon','propuestas','desafio']);
const texto=(v,max=2000)=>typeof v==='string'?v.trim().slice(0,max):'';
const leer=JSON.parse;

export function prepararCapacidadesApp(db,instancia,definicion,usuario){
  for(const b of definicion.bloques){
    if(!NATIVOS.has(b.tipo))continue;
    const anterior=db.prepare("SELECT * FROM apps_publicas_capacidades WHERE instancia_id=? AND bloque_id=? AND clave='comunidad'").get(instancia.id,b.id);
    if(anterior){if(anterior.tipo!==b.tipo)throw new Error('Un bloque nativo con datos debe conservar su tipo. Usá otro identificador para otra capacidad.');continue;}
    let referencia;
    if(['documento','formulario'].includes(b.tipo)){
      referencia=Number(db.prepare("INSERT INTO documentos_nexo(institucion_id,autor_id,tipo,titulo,contenido) VALUES(?,?,?,?,?)").run(instancia.institucion_id,usuario.id,b.tipo,b.titulo,'[]').lastInsertRowid);
    }else{
      referencia=crearCanal(db,instancia,usuario,b,b.tipo==='chat'?'canal':b.tipo);
    }
    db.prepare('INSERT INTO apps_publicas_capacidades(instancia_id,bloque_id,clave,tipo,referencia_id) VALUES(?,?,?,?,?)').run(instancia.id,b.id,'comunidad',b.tipo,referencia);
  }
}
function crearCanal(db,i,u,b,clase){
  const id=Number(db.prepare("INSERT INTO conversaciones(tipo) VALUES('canal')").run().lastInsertRowid);
  db.prepare('INSERT INTO chat_canales(conversacion_id,institucion_id,creador_id,nombre,descripcion,clase,visibilidad) VALUES(?,?,?,?,?,?,?)').run(id,i.institucion_id,u.id,b.titulo,b.contenido||'',clase,clase==='ayuda'?'privada':'institucion');
  const miembros=clase==='ayuda'?[u.id,...db.prepare("SELECT id FROM usuarios WHERE institucion_id=? AND rol='admin-academico' AND estado='activo'").all(i.institucion_id).map(x=>x.id)]:[u.id];
  for(const idUsuario of new Set(miembros))db.prepare('INSERT INTO conversacion_miembros(conversacion_id,usuario_id) VALUES(?,?)').run(id,idUsuario);
  return id;
}

export function registrarCapacidadesApps(app,db){
  db.exec(`CREATE TABLE IF NOT EXISTS apps_publicas_capacidades(instancia_id INTEGER NOT NULL REFERENCES apps_publicas_instancias(id),bloque_id TEXT NOT NULL,clave TEXT NOT NULL,tipo TEXT NOT NULL,referencia_id INTEGER NOT NULL,PRIMARY KEY(instancia_id,bloque_id,clave));
    CREATE TABLE IF NOT EXISTS apps_publicas_entradas(id INTEGER PRIMARY KEY,instancia_id INTEGER NOT NULL REFERENCES apps_publicas_instancias(id),bloque_id TEXT NOT NULL,autor_id INTEGER NOT NULL REFERENCES usuarios(id),titulo TEXT NOT NULL,contenido TEXT NOT NULL,estado TEXT NOT NULL DEFAULT 'publicado',devolucion TEXT NOT NULL DEFAULT '',creado_en TEXT NOT NULL DEFAULT(datetime('now')),actualizado_en TEXT NOT NULL DEFAULT(datetime('now')));
    CREATE INDEX IF NOT EXISTS idx_apps_entradas_bloque ON apps_publicas_entradas(instancia_id,bloque_id);
    CREATE TABLE IF NOT EXISTS apps_publicas_votos(entrada_id INTEGER NOT NULL REFERENCES apps_publicas_entradas(id) ON DELETE CASCADE,usuario_id INTEGER NOT NULL REFERENCES usuarios(id),PRIMARY KEY(entrada_id,usuario_id));`);
  function actual(req,res){
    const u=usuarioDeLaSesion(db,req);if(!u){res.status(401).json({error:'No hay sesión abierta.'});return null;}
    const i=db.prepare('SELECT * FROM apps_publicas_instancias WHERE id=? AND institucion_id=?').get(req.params.id,u.institucionId);
    if(!i){res.status(404).json({error:'Instalación inexistente.'});return null;}
    const def=leer(db.prepare('SELECT definicion FROM apps_publicas_versiones WHERE app_id=? AND version=?').get(i.app_id,i.version).definicion),b=def.bloques.find(x=>x.id===req.params.bloqueId);
    if(!b){res.status(404).json({error:'Bloque no disponible.'});return null;}
    if(COMUNIDAD.has(b.tipo)&&!exigirAcceso(db,req,res,'comunidad'))return null;
    const datos=leer(db.prepare('SELECT datos FROM apps_publicas_usuario_datos WHERE instancia_id=? AND usuario_id=?').get(i.id,u.id)?.datos||'{}');
    if(b.dependeDe&&!datos[b.dependeDe]){res.status(409).json({error:'Completá primero el bloque requerido.'});return null;}
    return {u,i,b};
  }
  app.post('/api/apps-publicas/instancias/:id/preparar',ventanilla((req,res)=>{
    const u=usuarioDeLaSesion(db,req);if(!u)return res.status(401).json({error:'No hay sesión abierta.'});if(u.rol!=='admin-academico')return res.status(403).json({error:'Sólo Dirección prepara capacidades.'});
    const i=db.prepare('SELECT * FROM apps_publicas_instancias WHERE id=? AND institucion_id=?').get(req.params.id,u.institucionId);if(!i)return res.status(404).json({error:'Instalación inexistente.'});
    const d=leer(db.prepare('SELECT definicion FROM apps_publicas_versiones WHERE app_id=? AND version=?').get(i.app_id,i.version).definicion);
    db.exec('BEGIN IMMEDIATE');try{prepararCapacidadesApp(db,i,d,u);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');return res.status(400).json({error:e.message});}res.json({ok:true});
  }));
  app.get('/api/apps-publicas/instancias/:id/opciones',ventanilla((req,res)=>{
    const u=usuarioDeLaSesion(db,req);if(!u)return res.status(401).json({error:'No hay sesión abierta.'});if(u.rol!=='admin-academico')return res.status(403).json({error:'Sólo Dirección configura capacidades.'});
    if(!db.prepare('SELECT 1 FROM apps_publicas_instancias WHERE id=? AND institucion_id=?').get(req.params.id,u.institucionId))return res.status(404).json({error:'Instalación inexistente.'});
    res.json({catedras:db.prepare("SELECT ca.id,m.nombre||' · '||c.anio||c.division AS titulo FROM catedras ca JOIN cursos c ON c.id=ca.curso_id JOIN materias m ON m.id=ca.materia_id WHERE c.institucion_id=? ORDER BY titulo").all(u.institucionId)});
  }));
  app.get('/api/apps-publicas/comunidad/:id/bloques/:bloqueId',ventanilla((req,res)=>{
    const a=actual(req,res);if(!a)return;const {i,b,u}=a;
    if(['chat','foro','sugerencias','ayuda'].includes(b.tipo)){
      if(!exigirAcceso(db,req,res,'chat'))return;
      const c=db.prepare('SELECT referencia_id FROM apps_publicas_capacidades WHERE instancia_id=? AND bloque_id=? AND clave=?').get(i.id,b.id,b.tipo==='ayuda'?String(u.id):'comunidad');
      const canal=c&&canalDe(db,c.referencia_id,u);return res.json({tipo:b.tipo,canal:canal??null});
    }
    if(['documento','formulario'].includes(b.tipo)){
      if(!exigirAcceso(db,req,res,'documentos'))return;
      const c=db.prepare("SELECT referencia_id FROM apps_publicas_capacidades WHERE instancia_id=? AND bloque_id=? AND clave='comunidad'").get(i.id,b.id);return res.json({tipo:b.tipo,documentoId:c?String(c.referencia_id):null});
    }
    if(b.tipo==='curso'){
      const catedraId=leer(i.configuracion).bloques?.[b.id]?.catedraId??null;
      if(!catedraId)return res.json({tipo:b.tipo,catedraId:null});
      if(!exigirAcceso(db,req,res,u.rol==='admin-academico'?'cursos-activos':'detalle-materia-estudiante'))return;
      const c=db.prepare('SELECT ca.profesor_id,ca.curso_id FROM catedras ca JOIN cursos c ON c.id=ca.curso_id WHERE ca.id=? AND c.institucion_id=?').get(catedraId,u.institucionId);
      if(!c||!(u.rol==='admin-academico'||c.profesor_id===u.id||db.prepare('SELECT 1 FROM inscripciones WHERE curso_id=? AND estudiante_id=?').get(c.curso_id,u.id)))return res.status(403).json({error:'No participás de esta cátedra.'});
      return res.json({tipo:b.tipo,catedraId:String(catedraId)});
    }
    if(!COMUNIDAD.has(b.tipo))return res.status(400).json({error:'El bloque no es una capacidad comunitaria.'});
    const entradas=db.prepare(`SELECT e.id,e.autor_id AS autorId,u.nombre AS autor,e.titulo,e.contenido,e.estado,e.devolucion,e.creado_en AS creadoEn,(SELECT COUNT(*) FROM apps_publicas_votos v WHERE v.entrada_id=e.id) AS votos,EXISTS(SELECT 1 FROM apps_publicas_votos v WHERE v.entrada_id=e.id AND v.usuario_id=?) AS votada FROM apps_publicas_entradas e JOIN usuarios u ON u.id=e.autor_id WHERE e.instancia_id=? AND e.bloque_id=? AND (e.estado<>'oculto' OR e.autor_id=? OR ?='admin-academico') ORDER BY e.id DESC LIMIT 200`).all(u.id,i.id,b.id,u.id,u.rol);
    res.json({tipo:b.tipo,usuarioId:u.id,administrable:u.rol==='admin-academico',entradas});
  }));
  app.post('/api/apps-publicas/comunidad/:id/bloques/:bloqueId/abrir',ventanilla((req,res)=>{
    const a=actual(req,res);if(!a)return;const {u,i,b}=a;
    if(!['chat','foro','sugerencias','ayuda'].includes(b.tipo))return res.status(400).json({error:'No es un canal.'});
    if(!exigirAcceso(db,req,res,'chat'))return;
    const clave=b.tipo==='ayuda'?String(u.id):'comunidad';let c=db.prepare('SELECT referencia_id FROM apps_publicas_capacidades WHERE instancia_id=? AND bloque_id=? AND clave=?').get(i.id,b.id,clave);
    if(!c&&b.tipo==='ayuda'){const id=crearCanal(db,i,u,b,'ayuda');db.prepare('INSERT INTO apps_publicas_capacidades(instancia_id,bloque_id,clave,tipo,referencia_id) VALUES(?,?,?,?,?)').run(i.id,b.id,clave,b.tipo,id);c={referencia_id:id};}
    if(!c)return res.status(409).json({error:'Dirección debe preparar esta instalación.'});
    const canal=canalDe(db,c.referencia_id,u);if(!canal)return res.status(404).json({error:'Canal no disponible.'});
    if(!canal.miembro)db.prepare('INSERT OR IGNORE INTO conversacion_miembros(conversacion_id,usuario_id) VALUES(?,?)').run(c.referencia_id,u.id);
    res.json({canal:canalDe(db,c.referencia_id,u)});
  }));
  app.post('/api/apps-publicas/comunidad/:id/bloques/:bloqueId/entradas',ventanilla((req,res)=>{
    const a=actual(req,res);if(!a)return;const {u,i,b}=a;if(!COMUNIDAD.has(b.tipo))return res.status(400).json({error:'El bloque no acepta entradas.'});
    const titulo=texto(req.body?.titulo,160),contenido=texto(req.body?.contenido,5000);if(!titulo||!contenido)return res.status(400).json({error:'Completá título y contenido.'});
    const propia=db.prepare('SELECT id FROM apps_publicas_entradas WHERE instancia_id=? AND bloque_id=? AND autor_id=?').get(i.id,b.id,u.id);
    if(propia&&['directorio','desafio'].includes(b.tipo)){db.prepare("UPDATE apps_publicas_entradas SET titulo=?,contenido=?,estado=?,actualizado_en=datetime('now') WHERE id=?").run(titulo,contenido,b.tipo==='desafio'?'presentado':'publicado',propia.id);return res.json({id:propia.id});}
    const id=Number(db.prepare('INSERT INTO apps_publicas_entradas(instancia_id,bloque_id,autor_id,titulo,contenido,estado) VALUES(?,?,?,?,?,?)').run(i.id,b.id,u.id,titulo,contenido,b.tipo==='propuestas'?'propuesta':b.tipo==='desafio'?'presentado':'publicado').lastInsertRowid);res.status(201).json({id});
  }));
  app.put('/api/apps-publicas/comunidad/:id/bloques/:bloqueId/entradas/:entradaId',ventanilla((req,res)=>{
    const a=actual(req,res);if(!a)return;const {u,i,b}=a;const e=db.prepare('SELECT * FROM apps_publicas_entradas WHERE id=? AND instancia_id=? AND bloque_id=?').get(req.params.entradaId,i.id,b.id);if(!e)return res.status(404).json({error:'Entrada no disponible.'});
    if(req.body?.voto!==undefined){if(b.tipo!=='propuestas'||typeof req.body.voto!=='boolean'||e.estado==='oculto')return res.status(400).json({error:'Voto inválido.'});if(req.body.voto)db.prepare('INSERT OR IGNORE INTO apps_publicas_votos(entrada_id,usuario_id) VALUES(?,?)').run(e.id,u.id);else db.prepare('DELETE FROM apps_publicas_votos WHERE entrada_id=? AND usuario_id=?').run(e.id,u.id);return res.json({ok:true});}
    if(u.rol!=='admin-academico'&&e.autor_id!==u.id)return res.status(403).json({error:'Sólo autor o Dirección pueden modificar la entrada.'});
    const estado=texto(req.body?.estado,30),permitidos=u.rol==='admin-academico'?['publicado','oculto','aceptada','rechazada','devuelto','resuelto']:['oculto','publicado','presentado'];
    if(!permitidos.includes(estado))return res.status(400).json({error:'Estado inválido.'});
    db.prepare("UPDATE apps_publicas_entradas SET estado=?,devolucion=?,actualizado_en=datetime('now') WHERE id=?").run(estado,u.rol==='admin-academico'?texto(req.body?.devolucion,3000):e.devolucion,e.id);res.json({ok:true});
  }));
}
