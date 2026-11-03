import { exigirAcceso, ventanilla } from './comun.js';
import { puedeVer } from './permisos.js';
import { paginaVisible } from './genoma.js';
import { fuenteLeccionAutorizada } from './lecciones.js';

const id=v=>Number.isSafeInteger(Number(v))&&Number(v)>0?Number(v):null;
const texto=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
export function proyectoAutorizado(db,u,pid) {
  if(!puedeVer(u.rol,'proyectos')||!paginaVisible(db,u,'proyectos'))return null;
  const p=db.prepare('SELECT * FROM proyectos WHERE id=? AND institucion_id=?').get(id(pid),u.institucionId);
  if(!p)return null;
  const m=db.prepare('SELECT rol FROM proyecto_miembros WHERE proyecto_id=? AND usuario_id=?').get(p.id,u.id);
  return m||p.visibilidad==='institucion'?{...p,rol:m?.rol||null,puedeEditar:!!m&&m.rol!=='lector',puedeGestionar:m?.rol==='coordinador'}:null;
}
export function proyectoContexto(db,pid) {
  const p=db.prepare('SELECT id,titulo,institucion_id,creador_id,archivado FROM proyectos WHERE id=?').get(id(pid));
  if(!p)return null;
  const miembros=db.prepare("SELECT m.usuario_id FROM proyecto_miembros m JOIN usuarios u ON u.id=m.usuario_id WHERE m.proyecto_id=? AND u.estado='activo' AND u.institucion_id=?").all(p.id,p.institucion_id).map(m=>m.usuario_id);
  return {titulo:p.titulo,institucionId:p.institucion_id,miembros,propietario:p.creador_id,pagina:'/proyectos',parametro:'proyecto',archivado:!!p.archivado};
}
export function fuenteProyectoAutorizada(db,u,pid) {
  const p=proyectoAutorizado(db,u,pid);return p?{tipo:'proyecto',id:p.id,titulo:p.titulo,texto:`${p.titulo}\nProblema: ${p.problema}\nObjetivo: ${p.objetivo}\nCriterio: ${p.criterio}`}:null;
}
export function puedeDescargarArchivoProyecto(db,u,archivoId) {
  if(!puedeVer(u.rol,'proyectos')||!paginaVisible(db,u,'proyectos'))return false;
  const proyectos=db.prepare(`SELECT proyecto_id FROM proyecto_pasos WHERE archivo_id=? UNION SELECT e.proyecto_id FROM proyecto_entregas e,json_each(e.archivos) a WHERE CAST(a.value AS INTEGER)=?`).all(archivoId,archivoId);
  return proyectos.some(p=>!!proyectoAutorizado(db,u,p.proyecto_id));
}
function fuenteVinculada(db,u,tipo,objetoId) {
  if(tipo==='biblioteca'){
    if(!puedeVer(u.rol,'biblioteca')||!paginaVisible(db,u,'biblioteca'))return null;
    const r=db.prepare(`SELECT id,titulo,alcance FROM recursos WHERE id=? AND eliminado_en IS NULL AND
      ((estado='aprobado' AND (alcance='nacional' OR institucion_id=?)) OR (institucion_id=? AND autor_id=?))`).get(id(objetoId),u.institucionId,u.institucionId,u.id);
    return r?{tipo,id:String(r.id),titulo:r.titulo,href:`/biblioteca/${r.alcance==='nacional'?'nacional':'institucional'}?recurso=${r.id}`}:null;
  }
  if(tipo==='leccion'){
    const r=fuenteLeccionAutorizada(db,u,objetoId);if(!r)return null;
    const n=db.prepare('SELECT catedra_id FROM curso_nodos WHERE id=?').get(r.id);
    return {tipo,id:String(r.id),titulo:r.titulo,href:`/portafolio/materia?catedra=${n.catedra_id}&leccion=${r.id}`};
  }
  if(tipo==='tarea'){
    const pagina=u.rol==='profesor'?'gestion-tareas-profesor':'mis-tareas-estudiante';
    if(!puedeVer(u.rol,pagina)||!paginaVisible(db,u,pagina))return null;
    const t=db.prepare(`SELECT t.id,t.titulo,c.profesor_id,c.curso_id,m.institucion_id FROM tareas t JOIN catedras c ON c.id=t.catedra_id JOIN materias m ON m.id=c.materia_id WHERE t.id=? AND t.eliminado_en IS NULL`).get(id(objetoId));
    if(!t||t.institucion_id!==u.institucionId||!(t.profesor_id===u.id||db.prepare('SELECT 1 FROM inscripciones WHERE curso_id=? AND estudiante_id=?').get(t.curso_id,u.id)))return null;
    return {tipo,id:String(t.id),titulo:t.titulo,href:`${u.rol==='profesor'?'/portafolio/gestion':'/portafolio/mis-tareas'}?tarea=${t.id}`};
  }
  return null;
}
function errorPasos(pasos) {
  const porId=new Map(pasos.map(p=>[p.id,p])),salidas=new Map(pasos.map(p=>[p.id,[]]));
  for(const p of pasos){
    if(p.padre_id){if(!porId.has(p.padre_id))return 'El paso padre no pertenece al proyecto.';salidas.get(p.padre_id).push(p.id);}
    if(p.depende_de_id){if(!porId.has(p.depende_de_id))return 'La dependencia no pertenece al proyecto.';salidas.get(p.id).push(p.depende_de_id);}
  }
  const terminados=new Set(),enRuta=new Set();
  const ciclo=n=>{if(enRuta.has(n))return true;if(terminados.has(n))return false;enRuta.add(n);for(const vecino of salidas.get(n))if(ciclo(vecino))return true;enRuta.delete(n);terminados.add(n);return false;};
  if(pasos.some(p=>ciclo(p.id)))return 'La jerarquía y las dependencias no pueden formar ciclos.';
  for(const p of pasos)if(p.completada&&(salidas.get(p.id)||[]).some(n=>!porId.get(n).completada))return 'Para completar un paso deben estar completos sus hijos y su dependencia. Para reabrirlo, reabrí primero los pasos que lo necesitan.';
  return null;
}
export function registrarProyectos(app,db) {
  db.exec(`CREATE TABLE IF NOT EXISTS proyectos (
    id INTEGER PRIMARY KEY,institucion_id INTEGER NOT NULL REFERENCES instituciones(id),creador_id INTEGER NOT NULL REFERENCES usuarios(id),
    titulo TEXT NOT NULL,problema TEXT NOT NULL,objetivo TEXT NOT NULL,criterio TEXT NOT NULL DEFAULT '',
    visibilidad TEXT NOT NULL CHECK(visibilidad IN ('privada','institucion')),archivado INTEGER NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,creado_en TEXT NOT NULL DEFAULT(datetime('now')),actualizado_en TEXT NOT NULL DEFAULT(datetime('now')));
  CREATE TABLE IF NOT EXISTS proyecto_miembros (
    proyecto_id INTEGER NOT NULL REFERENCES proyectos(id),usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    rol TEXT NOT NULL CHECK(rol IN ('coordinador','participante','lector')),PRIMARY KEY(proyecto_id,usuario_id));
  CREATE TABLE IF NOT EXISTS proyecto_pasos (
    id INTEGER PRIMARY KEY,proyecto_id INTEGER NOT NULL REFERENCES proyectos(id),padre_id INTEGER REFERENCES proyecto_pasos(id),depende_de_id INTEGER REFERENCES proyecto_pasos(id),
    titulo TEXT NOT NULL,responsable_id INTEGER REFERENCES usuarios(id),completada INTEGER NOT NULL DEFAULT 0,
    evidencia TEXT NOT NULL DEFAULT '',archivo_id INTEGER REFERENCES archivos(id),version INTEGER NOT NULL DEFAULT 1,
    creado_por INTEGER NOT NULL REFERENCES usuarios(id),actualizado_en TEXT NOT NULL DEFAULT(datetime('now')));
  CREATE TABLE IF NOT EXISTS proyecto_entregas (
    id INTEGER PRIMARY KEY,proyecto_id INTEGER NOT NULL REFERENCES proyectos(id),paso_id INTEGER REFERENCES proyecto_pasos(id),
    autor_id INTEGER NOT NULL REFERENCES usuarios(id),numero INTEGER NOT NULL,texto TEXT NOT NULL,archivos TEXT NOT NULL DEFAULT '[]',
    creado_en TEXT NOT NULL DEFAULT(datetime('now')));
  CREATE TABLE IF NOT EXISTS proyecto_devoluciones (
    id INTEGER PRIMARY KEY,entrega_id INTEGER NOT NULL REFERENCES proyecto_entregas(id),autor_id INTEGER NOT NULL REFERENCES usuarios(id),
    criterio TEXT NOT NULL,comentario TEXT NOT NULL,siguiente_accion TEXT NOT NULL,creado_en TEXT NOT NULL DEFAULT(datetime('now')));
  CREATE TABLE IF NOT EXISTS proyecto_vinculos (
    proyecto_id INTEGER NOT NULL REFERENCES proyectos(id),tipo TEXT NOT NULL CHECK(tipo IN ('biblioteca','leccion','tarea')),objeto_id INTEGER NOT NULL,
    creado_por INTEGER NOT NULL REFERENCES usuarios(id),PRIMARY KEY(proyecto_id,tipo,objeto_id));
  CREATE INDEX IF NOT EXISTS idx_proyectos_institucion ON proyectos(institucion_id,id);
  CREATE INDEX IF NOT EXISTS idx_proyecto_pasos ON proyecto_pasos(proyecto_id,padre_id);
  CREATE INDEX IF NOT EXISTS idx_proyecto_entregas ON proyecto_entregas(proyecto_id,autor_id,paso_id,numero);`);
  const acceso=(req,res)=>exigirAcceso(db,req,res,'proyectos');
  const propio=(req,res,editar=false,gestionar=false)=>{const u=acceso(req,res);if(!u)return null;const p=proyectoAutorizado(db,u,req.params.id);if(!p){res.status(404).json({error:'Proyecto no disponible.'});return null;}if((editar&&!p.puedeEditar)||(gestionar&&!p.puedeGestionar)){res.status(403).json({error:'Tu participación no permite esta acción.'});return null;}if(editar&&p.archivado){res.status(409).json({error:'El proyecto está archivado.'});return null;}return {u,p};};
  const pasosDe=pid=>db.prepare('SELECT * FROM proyecto_pasos WHERE proyecto_id=? ORDER BY id').all(pid);
  const archivoPropio=(u,aid)=>!aid||!!db.prepare('SELECT 1 FROM archivos WHERE id=? AND subido_por=?').get(aid,u.id);
  const miembroActivo=(pid,uid)=>!!db.prepare("SELECT 1 FROM proyecto_miembros m JOIN usuarios u ON u.id=m.usuario_id WHERE m.proyecto_id=? AND u.id=? AND u.estado='activo' AND m.rol<>'lector'").get(pid,uid);
  const pasosVista=pid=>pasosDe(pid).map(p=>({id:String(p.id),titulo:p.titulo,padreId:p.padre_id?String(p.padre_id):null,dependeDeId:p.depende_de_id?String(p.depende_de_id):null,responsableId:p.responsable_id?String(p.responsable_id):null,completada:!!p.completada,evidencia:p.evidencia,archivoId:p.archivo_id?String(p.archivo_id):null,version:p.version,creadoPor:String(p.creado_por)}));
  const resumen=p=>({id:String(p.id),titulo:p.titulo,problema:p.problema,objetivo:p.objetivo,criterio:p.criterio,visibilidad:p.visibilidad,archivado:!!p.archivado,version:p.version,rol:p.rol,puedeEditar:p.puedeEditar,puedeGestionar:p.puedeGestionar,creadorId:String(p.creador_id)});
  app.get('/api/proyectos',ventanilla((req,res)=>{const u=acceso(req,res);if(!u)return;const antes=id(req.query.antes)||Number.MAX_SAFE_INTEGER,q=String(req.query.q||'').slice(0,200);const filas=db.prepare('SELECT id FROM proyectos WHERE institucion_id=? AND id<? AND titulo LIKE ? ORDER BY id DESC LIMIT 201').all(u.institucionId,antes,`%${q}%`);const visibles=filas.map(p=>proyectoAutorizado(db,u,p.id)).filter(Boolean);res.json({proyectos:visibles.slice(0,200).map(resumen),antes:filas.length===201?String(filas[199].id):null});}));
  app.get('/api/proyectos/personas',ventanilla((req,res)=>{const u=acceso(req,res);if(!u)return;res.json({personas:db.prepare("SELECT id,nombre,rol FROM usuarios WHERE institucion_id=? AND estado='activo' AND nombre LIKE ? ORDER BY nombre LIMIT 100").all(u.institucionId,`%${String(req.query.q||'').slice(0,100)}%`).filter(p=>puedeVer(p.rol,'proyectos')).map(p=>({...p,id:String(p.id)}))});}));
  app.get('/api/proyectos/fuentes',ventanilla((req,res)=>{
    const u=acceso(req,res);if(!u)return;const tipo=String(req.query.tipo||''),q=`%${String(req.query.q||'').slice(0,100)}%`;let candidatos=[];
    if(tipo==='biblioteca')candidatos=db.prepare('SELECT id FROM recursos WHERE titulo LIKE ? AND eliminado_en IS NULL ORDER BY id DESC LIMIT 200').all(q);
    if(tipo==='leccion')candidatos=db.prepare("SELECT id FROM curso_nodos WHERE tipo='leccion' AND titulo LIKE ? ORDER BY id DESC LIMIT 200").all(q);
    if(tipo==='tarea')candidatos=db.prepare('SELECT id FROM tareas WHERE titulo LIKE ? AND eliminado_en IS NULL ORDER BY id DESC LIMIT 200').all(q);
    res.json({fuentes:candidatos.map(c=>fuenteVinculada(db,u,tipo,c.id)).filter(Boolean).slice(0,100)});
  }));
  app.get('/api/proyectos/vinculos/:tipo/:objetoId',ventanilla((req,res)=>{
    const u=acceso(req,res);if(!u)return;if(!fuenteVinculada(db,u,req.params.tipo,req.params.objetoId))return res.status(404).json({error:'Fuente no disponible.'});
    res.json({proyectos:db.prepare('SELECT proyecto_id FROM proyecto_vinculos WHERE tipo=? AND objeto_id=?').all(req.params.tipo,id(req.params.objetoId)).map(v=>proyectoAutorizado(db,u,v.proyecto_id)).filter(Boolean).map(p=>({id:String(p.id),titulo:p.titulo}))});
  }));
  app.post('/api/proyectos',ventanilla((req,res)=>{
    const u=acceso(req,res);if(!u)return;const {titulo,problema,objetivo,criterio,visibilidad='privada'}=req.body||{};
    if(!texto(titulo,200)||!texto(problema,4000)||!texto(objetivo,4000)||!texto(criterio,2000)||!['privada','institucion'].includes(visibilidad))return res.status(400).json({error:'Completá título, problema, objetivo y criterio de resultado.'});
    db.exec('BEGIN');try{const pid=Number(db.prepare('INSERT INTO proyectos(institucion_id,creador_id,titulo,problema,objetivo,criterio,visibilidad) VALUES(?,?,?,?,?,?,?)').run(u.institucionId,u.id,titulo.trim(),problema.trim(),objetivo.trim(),criterio.trim(),visibilidad).lastInsertRowid);db.prepare("INSERT INTO proyecto_miembros(proyecto_id,usuario_id,rol) VALUES(?,?,'coordinador')").run(pid,u.id);db.exec('COMMIT');res.status(201).json({id:String(pid)});}catch(e){db.exec('ROLLBACK');throw e;}
  }));
  app.get('/api/proyectos/:id',ventanilla((req,res)=>{
    const a=propio(req,res);if(!a)return;
    const entregas=db.prepare('SELECT e.*,u.nombre FROM proyecto_entregas e JOIN usuarios u ON u.id=e.autor_id WHERE proyecto_id=? ORDER BY e.id DESC').all(a.p.id).map(e=>({id:String(e.id),pasoId:e.paso_id?String(e.paso_id):null,autorId:String(e.autor_id),autor:e.nombre,numero:e.numero,texto:e.texto,archivos:JSON.parse(e.archivos).map(String),creadoEn:e.creado_en,devoluciones:db.prepare('SELECT d.id,u.nombre AS autor,d.criterio,d.comentario,d.siguiente_accion AS siguienteAccion,d.creado_en AS creadoEn FROM proyecto_devoluciones d JOIN usuarios u ON u.id=d.autor_id WHERE entrega_id=? ORDER BY d.id').all(e.id)}));
    res.json({proyecto:resumen(a.p),miembros:db.prepare("SELECT m.usuario_id AS id,u.nombre,u.rol AS perfil,m.rol FROM proyecto_miembros m JOIN usuarios u ON u.id=m.usuario_id WHERE m.proyecto_id=? AND u.estado='activo' ORDER BY u.nombre").all(a.p.id).map(m=>({...m,id:String(m.id)})),pasos:pasosVista(a.p.id),entregas,vinculos:db.prepare('SELECT tipo,objeto_id FROM proyecto_vinculos WHERE proyecto_id=?').all(a.p.id).map(v=>fuenteVinculada(db,a.u,v.tipo,v.objeto_id)).filter(Boolean)});
  }));
  app.put('/api/proyectos/:id',ventanilla((req,res)=>{
    const a=propio(req,res,false,true);if(!a)return;const b=req.body||{};
    if(b.version!==a.p.version)return res.status(409).json({error:'El proyecto cambió. Actualizá antes de guardar.'});
    const titulo=b.titulo??a.p.titulo,problema=b.problema??a.p.problema,objetivo=b.objetivo??a.p.objetivo,criterio=b.criterio??a.p.criterio,visibilidad=b.visibilidad??a.p.visibilidad;
    if(!texto(titulo,200)||!texto(problema,4000)||!texto(objetivo,4000)||!texto(criterio,2000)||!['privada','institucion'].includes(visibilidad)||b.archivado!==undefined&&typeof b.archivado!=='boolean')return res.status(400).json({error:'Datos de proyecto inválidos.'});
    db.prepare("UPDATE proyectos SET titulo=?,problema=?,objetivo=?,criterio=?,visibilidad=?,archivado=?,version=version+1,actualizado_en=datetime('now') WHERE id=?").run(titulo.trim(),problema.trim(),objetivo.trim(),criterio.trim(),visibilidad,b.archivado===undefined?a.p.archivado:b.archivado?1:0,a.p.id);res.json({version:a.p.version+1});
  }));
  app.post('/api/proyectos/:id/unirse',ventanilla((req,res)=>{const a=propio(req,res);if(!a)return;if(a.p.visibilidad!=='institucion'||a.p.archivado)return res.status(409).json({error:'Este proyecto no admite nuevas participaciones.'});db.prepare("INSERT OR IGNORE INTO proyecto_miembros(proyecto_id,usuario_id,rol) VALUES(?,?,'participante')").run(a.p.id,a.u.id);res.json({ok:true});}));
  app.put('/api/proyectos/:id/miembros/:usuarioId',ventanilla((req,res)=>{
    const a=propio(req,res,true,true);if(!a)return;const uid=id(req.params.usuarioId),rol=req.body?.rol;
    if(!['coordinador','participante','lector'].includes(rol)||!db.prepare("SELECT 1 FROM usuarios WHERE id=? AND institucion_id=? AND estado='activo'").get(uid,a.u.institucionId))return res.status(400).json({error:'Persona o rol no válido.'});
    if(uid===a.p.creador_id&&rol!=='coordinador')return res.status(409).json({error:'El creador conserva la coordinación.'});
    db.prepare('INSERT INTO proyecto_miembros(proyecto_id,usuario_id,rol) VALUES(?,?,?) ON CONFLICT(proyecto_id,usuario_id) DO UPDATE SET rol=excluded.rol').run(a.p.id,uid,rol);res.json({ok:true});
  }));
  app.delete('/api/proyectos/:id/miembros/:usuarioId',ventanilla((req,res)=>{
    const a=propio(req,res,true,true);if(!a)return;const uid=id(req.params.usuarioId);if(uid===a.p.creador_id)return res.status(409).json({error:'El creador conserva la coordinación.'});
    db.exec('BEGIN');try{db.prepare('DELETE FROM proyecto_miembros WHERE proyecto_id=? AND usuario_id=?').run(a.p.id,uid);db.prepare('UPDATE proyecto_pasos SET responsable_id=NULL,version=version+1 WHERE proyecto_id=? AND responsable_id=?').run(a.p.id,uid);db.exec('COMMIT');res.json({ok:true});}catch(e){db.exec('ROLLBACK');throw e;}
  }));
  const datosPaso=(a,b,previo)=>{
    const p={id:previo?.id??-1,proyecto_id:a.p.id,titulo:b.titulo??previo?.titulo,padre_id:b.padreId===undefined?previo?.padre_id??null:b.padreId===null?null:id(b.padreId),depende_de_id:b.dependeDeId===undefined?previo?.depende_de_id??null:b.dependeDeId===null?null:id(b.dependeDeId),responsable_id:b.responsableId===undefined?previo?.responsable_id??a.u.id:b.responsableId===null?null:id(b.responsableId),completada:b.completada===undefined?previo?.completada??0:b.completada?1:0,evidencia:b.evidencia??previo?.evidencia??'',archivo_id:b.archivoId===undefined?previo?.archivo_id??null:b.archivoId===null?null:id(b.archivoId)};
    if(!texto(p.titulo,1000)||typeof p.evidencia!=='string'||p.evidencia.length>6000||b.completada!==undefined&&typeof b.completada!=='boolean'||p.responsable_id&&!miembroActivo(a.p.id,p.responsable_id)||p.archivo_id!==previo?.archivo_id&&!archivoPropio(a.u,p.archivo_id))return {error:'Completá un título, un responsable participante y evidencia/archivo propios válidos.'};
    for(const clave of ['padreId','dependeDeId','responsableId','archivoId'])if(b[clave]!==undefined&&b[clave]!==null&&!id(b[clave]))return {error:'Referencia de paso inválida.'};
    const error=errorPasos([...pasosDe(a.p.id).filter(x=>x.id!==p.id),p]);return error?{error}:p;
  };
  app.post('/api/proyectos/:id/pasos',ventanilla((req,res)=>{
    const a=propio(req,res,true);if(!a)return;const p=datosPaso(a,req.body||{},null);if(p.error)return res.status(400).json({error:p.error});
    const nuevo=db.prepare('INSERT INTO proyecto_pasos(proyecto_id,padre_id,depende_de_id,titulo,responsable_id,completada,evidencia,archivo_id,creado_por) VALUES(?,?,?,?,?,?,?,?,?)').run(a.p.id,p.padre_id,p.depende_de_id,p.titulo.trim(),p.responsable_id,p.completada,p.evidencia.trim(),p.archivo_id,a.u.id).lastInsertRowid;res.status(201).json({id:String(nuevo)});
  }));
  app.put('/api/proyectos/:id/pasos/:pasoId',ventanilla((req,res)=>{
    const a=propio(req,res,true);if(!a)return;const previo=db.prepare('SELECT * FROM proyecto_pasos WHERE id=? AND proyecto_id=?').get(id(req.params.pasoId),a.p.id);if(!previo)return res.status(404).json({error:'Paso no disponible.'});
    const b=req.body||{};if(b.version!==previo.version)return res.status(409).json({error:'El paso cambió. Actualizá antes de guardar.'});
    if(!a.p.puedeGestionar){if(previo.responsable_id!==a.u.id&&previo.creado_por!==a.u.id)return res.status(403).json({error:'Sólo el responsable, creador del paso o coordinación puede actualizarlo.'});if(Object.keys(b).some(k=>!['version','evidencia','archivoId','completada'].includes(k)))return res.status(403).json({error:'La coordinación organiza la estructura y responsables.'});}
    const p=datosPaso(a,b,previo);if(p.error)return res.status(400).json({error:p.error});
    db.prepare("UPDATE proyecto_pasos SET titulo=?,padre_id=?,depende_de_id=?,responsable_id=?,completada=?,evidencia=?,archivo_id=?,version=version+1,actualizado_en=datetime('now') WHERE id=?").run(p.titulo.trim(),p.padre_id,p.depende_de_id,p.responsable_id,p.completada,p.evidencia.trim(),p.archivo_id,previo.id);res.json({version:previo.version+1});
  }));
  app.post('/api/proyectos/:id/entregas',ventanilla((req,res)=>{
    const a=propio(req,res,true);if(!a)return;const b=req.body||{},pasoId=b.pasoId===null||b.pasoId===undefined?null:id(b.pasoId),archivos=b.archivos??[];
    if(!texto(b.texto,15000)||!Array.isArray(archivos)||archivos.length>20||archivos.some(x=>!id(x)||!archivoPropio(a.u,id(x)))||b.pasoId&&!pasoId||pasoId&&!db.prepare('SELECT 1 FROM proyecto_pasos WHERE id=? AND proyecto_id=?').get(pasoId,a.p.id))return res.status(400).json({error:'Escribí una producción y usá sólo archivos propios y un paso del proyecto.'});
    const numero=db.prepare('SELECT COALESCE(MAX(numero),0)+1 AS n FROM proyecto_entregas WHERE proyecto_id=? AND autor_id=? AND paso_id IS ?').get(a.p.id,a.u.id,pasoId).n;
    const nueva=db.prepare('INSERT INTO proyecto_entregas(proyecto_id,paso_id,autor_id,numero,texto,archivos) VALUES(?,?,?,?,?,?)').run(a.p.id,pasoId,a.u.id,numero,b.texto.trim(),JSON.stringify([...new Set(archivos.map(Number))])).lastInsertRowid;res.status(201).json({id:String(nueva),numero});
  }));
  app.post('/api/proyectos/:id/entregas/:entregaId/devoluciones',ventanilla((req,res)=>{
    const a=propio(req,res,true);if(!a)return;const e=db.prepare('SELECT id,autor_id FROM proyecto_entregas WHERE id=? AND proyecto_id=?').get(id(req.params.entregaId),a.p.id);if(!e)return res.status(404).json({error:'Entrega no disponible.'});if(e.autor_id===a.u.id)return res.status(409).json({error:'La devolución corresponde a otra persona del equipo.'});
    const b=req.body||{};if(!texto(b.criterio,2000)||!texto(b.comentario,6000)||!texto(b.siguienteAccion,3000))return res.status(400).json({error:'Indicá criterio, devolución y siguiente acción.'});
    const nueva=db.prepare('INSERT INTO proyecto_devoluciones(entrega_id,autor_id,criterio,comentario,siguiente_accion) VALUES(?,?,?,?,?)').run(e.id,a.u.id,b.criterio.trim(),b.comentario.trim(),b.siguienteAccion.trim()).lastInsertRowid;res.status(201).json({id:String(nueva)});
  }));
  app.post('/api/proyectos/:id/vinculos',ventanilla((req,res)=>{const a=propio(req,res,true);if(!a)return;const f=fuenteVinculada(db,a.u,req.body?.tipo,req.body?.objetoId);if(!f)return res.status(404).json({error:'No tenés acceso al material de origen.'});db.prepare('INSERT OR IGNORE INTO proyecto_vinculos(proyecto_id,tipo,objeto_id,creado_por) VALUES(?,?,?,?)').run(a.p.id,f.tipo,Number(f.id),a.u.id);res.json({vinculo:f});}));
  app.delete('/api/proyectos/:id/vinculos/:tipo/:objetoId',ventanilla((req,res)=>{const a=propio(req,res,true);if(!a)return;db.prepare('DELETE FROM proyecto_vinculos WHERE proyecto_id=? AND tipo=? AND objeto_id=?').run(a.p.id,req.params.tipo,id(req.params.objetoId));res.json({ok:true});}));
}
