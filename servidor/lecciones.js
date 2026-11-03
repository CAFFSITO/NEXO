import { exigirSesion, exigirAcceso, ventanilla } from './comun.js';
import { puedeVer } from './permisos.js';
import { paginaVisible } from './genoma.js';

const id = v => Number.isSafeInteger(Number(v)) && Number(v) > 0 ? Number(v) : null;
export function leccionRealizada(db,nid,uid) {
  if(!db.prepare('SELECT realizado_en FROM curso_nodo_progreso WHERE nodo_id=? AND usuario_id=?').get(nid,uid)?.realizado_en)return false;
  for(const a of db.prepare('SELECT id,tarea_id FROM curso_acciones WHERE nodo_id=? AND activa=1 AND obligatoria=1').all(nid)){
    if(a.tarea_id){if(!db.prepare(`SELECT 1 FROM entregas e WHERE e.tarea_id=? AND e.anulada_en IS NULL AND e.reemplazada_en IS NULL AND
      (e.estudiante_id=? OR e.equipo_id IN(SELECT equipo_id FROM tarea_equipo_miembros WHERE tarea_id=? AND estudiante_id=?)) LIMIT 1`).get(a.tarea_id,uid,a.tarea_id,uid))return false;}
    else if(!db.prepare('SELECT completada FROM curso_accion_progreso WHERE accion_id=? AND usuario_id=?').get(a.id,uid)?.completada)return false;
  }
  return true;
}
export function fuenteLeccionAutorizada(db,u,nodoId) {
  const pagina=u.rol==='admin-academico'?'cursos-activos':'detalle-materia-estudiante';
  if(!puedeVer(u.rol,pagina)||!paginaVisible(db,u,pagina))return null;
  const n=db.prepare(`SELECT n.*,c.profesor_id,c.curso_id,m.institucion_id FROM curso_nodos n JOIN catedras c ON c.id=n.catedra_id
    JOIN materias m ON m.id=c.materia_id WHERE n.id=? AND n.tipo='leccion'`).get(id(nodoId));
  if(!n||n.institucion_id!==u.institucionId)return null;
  if(n.profesor_id!==u.id&&u.rol!=='admin-academico'){
    if(!db.prepare('SELECT 1 FROM inscripciones WHERE curso_id=? AND estudiante_id=?').get(n.curso_id,u.id))return null;
    let cursor=n;const vistos=new Set();
    while(cursor){if(vistos.has(cursor.id)||!cursor.publicado||cursor.disponible_desde&&cursor.disponible_desde>new Date().toISOString()||cursor.prerrequisito_id&&!leccionRealizada(db,cursor.prerrequisito_id,u.id))return null;
      vistos.add(cursor.id);if(!cursor.padre_id)break;cursor=db.prepare('SELECT * FROM curso_nodos WHERE id=? AND catedra_id=?').get(cursor.padre_id,n.catedra_id);if(!cursor)return null;}
  }
  return {tipo:'leccion',id:n.id,titulo:n.titulo,texto:`${n.titulo}\n${n.descripcion}\n${JSON.parse(n.accionables||'[]').join('\n')}`.slice(0,12000)};
}
export function registrarLecciones(app, db) {
  db.exec(`CREATE TABLE IF NOT EXISTS curso_nodos (
    id INTEGER PRIMARY KEY, catedra_id INTEGER NOT NULL REFERENCES catedras(id),
    padre_id INTEGER REFERENCES curso_nodos(id), tipo TEXT NOT NULL CHECK(tipo IN ('modulo','seccion','leccion')),
    titulo TEXT NOT NULL, descripcion TEXT NOT NULL DEFAULT '', orden INTEGER NOT NULL DEFAULT 0,
    documento_id INTEGER REFERENCES documentos_nexo(id), archivo_id INTEGER REFERENCES archivos(id), capitulos TEXT NOT NULL DEFAULT '[]', subtitulos TEXT NOT NULL DEFAULT '[]', accionables TEXT NOT NULL DEFAULT '[]',
    disponible_desde TEXT, prerrequisito_id INTEGER REFERENCES curso_nodos(id), publicado INTEGER NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1);
  CREATE INDEX IF NOT EXISTS idx_curso_nodos_padre ON curso_nodos(catedra_id,padre_id,orden);
  CREATE TABLE IF NOT EXISTS curso_nodo_progreso (
    nodo_id INTEGER NOT NULL REFERENCES curso_nodos(id), usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    visto_en TEXT, realizado_en TEXT, evaluado_en TEXT,
    PRIMARY KEY(nodo_id,usuario_id));
  CREATE TABLE IF NOT EXISTS curso_acciones (
    id INTEGER PRIMARY KEY,nodo_id INTEGER NOT NULL REFERENCES curso_nodos(id),titulo TEXT NOT NULL,
    orden INTEGER NOT NULL DEFAULT 0,tarea_id INTEGER REFERENCES tareas(id),obligatoria INTEGER NOT NULL DEFAULT 0,activa INTEGER NOT NULL DEFAULT 1);
  CREATE TABLE IF NOT EXISTS curso_accion_progreso (
    accion_id INTEGER NOT NULL REFERENCES curso_acciones(id),usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    completada INTEGER NOT NULL DEFAULT 0,evidencia TEXT NOT NULL DEFAULT '',actualizado_en TEXT NOT NULL DEFAULT(datetime('now')),
    PRIMARY KEY(accion_id,usuario_id));`);
  if(!db.prepare('PRAGMA table_info(curso_nodos)').all().some(c=>c.name==='archivo_id')) db.exec('ALTER TABLE curso_nodos ADD COLUMN archivo_id INTEGER REFERENCES archivos(id)');
  if(!db.prepare('PRAGMA table_info(curso_nodos)').all().some(c=>c.name==='capitulos')) db.exec("ALTER TABLE curso_nodos ADD COLUMN capitulos TEXT NOT NULL DEFAULT '[]'");
  if(!db.prepare('PRAGMA table_info(curso_nodos)').all().some(c=>c.name==='subtitulos')) db.exec("ALTER TABLE curso_nodos ADD COLUMN subtitulos TEXT NOT NULL DEFAULT '[]'");
  // Preserva identidades y avances al migrar los textos históricos.
  for(const n of db.prepare('SELECT id,accionables FROM curso_nodos WHERE NOT EXISTS(SELECT 1 FROM curso_acciones a WHERE a.nodo_id=curso_nodos.id)').all()) {
    for(const [orden,titulo] of JSON.parse(n.accionables||'[]').entries()) db.prepare('INSERT INTO curso_acciones(nodo_id,titulo,orden) VALUES(?,?,?)').run(n.id,titulo,orden);
  }
  function acceso(req,res,editar=false) {
    const u=exigirSesion(db,req,res); if(!u)return null;
    if(!exigirAcceso(db,req,res,u.rol==='admin-academico'?'cursos-activos':'detalle-materia-estudiante'))return null;
    const c=db.prepare(`SELECT c.*,m.institucion_id FROM catedras c JOIN materias m ON m.id=c.materia_id WHERE c.id=?`).get(id(req.params.catedraId));
    if(!c||c.institucion_id!==u.institucionId)return res.status(404).json({error:'Curso no disponible.'}),null;
    const docente=c.profesor_id===u.id || u.rol==='admin-academico';
    const alumno=!!db.prepare('SELECT 1 FROM inscripciones WHERE curso_id=? AND estudiante_id=?').get(c.curso_id,u.id);
    if(!docente&&!alumno)return res.status(403).json({error:'No participás en esta cátedra.'}),null;
    if(editar&&!docente)return res.status(403).json({error:'Solo el docente o la dirección editan el curso.'}),null;
    return {u,c,docente};
  }
  const nodo=(cid,nid)=>db.prepare('SELECT * FROM curso_nodos WHERE id=? AND catedra_id=?').get(id(nid),cid);
  const accionesDe=(nid,uid)=>db.prepare('SELECT * FROM curso_acciones WHERE nodo_id=? AND activa=1 ORDER BY orden,id').all(nid).map(a=>{
    const p=uid?db.prepare('SELECT completada,evidencia,actualizado_en FROM curso_accion_progreso WHERE accion_id=? AND usuario_id=?').get(a.id,uid):null;
    const entrega=uid&&a.tarea_id?db.prepare(`SELECT e.id,co.nota,co.devolucion,co.corregido_en FROM entregas e LEFT JOIN correcciones co ON co.entrega_id=e.id
      WHERE e.tarea_id=? AND e.anulada_en IS NULL AND e.reemplazada_en IS NULL AND (e.estudiante_id=? OR e.equipo_id IN
      (SELECT equipo_id FROM tarea_equipo_miembros WHERE tarea_id=? AND estudiante_id=?)) ORDER BY e.id DESC LIMIT 1`).get(a.tarea_id,uid,a.tarea_id,uid):null;
    const tarea=a.tarea_id?db.prepare('SELECT id,titulo,eliminado_en FROM tareas WHERE id=?').get(a.tarea_id):null;
    return {id:String(a.id),titulo:a.titulo,tareaId:a.tarea_id?String(a.tarea_id):null,tareaDisponible:!!tarea&&!tarea.eliminado_en,obligatoria:!!a.obligatoria,
      completada:a.tarea_id?!!entrega:!!p?.completada,evidencia:p?.evidencia??'',entregaId:entrega?String(entrega.id):null,nota:entrega?.nota??null,devolucion:entrega?.devolucion??'',evaluadaEn:entrega?.corregido_en??null};
  });
  const realizada=(nid,uid)=>leccionRealizada(db,nid,uid);
  const serializar=(n,uid)=>({id:String(n.id),padreId:n.padre_id?String(n.padre_id):null,tipo:n.tipo,titulo:n.titulo,descripcion:n.descripcion,orden:n.orden,
    documentoId:n.documento_id?String(n.documento_id):null,archivoId:n.archivo_id?String(n.archivo_id):null,
    archivoTipo:n.archivo_id?db.prepare('SELECT tipo_mime FROM archivos WHERE id=?').get(n.archivo_id)?.tipo_mime??null:null,
    capitulos:JSON.parse(n.capitulos||'[]'),subtitulos:JSON.parse(n.subtitulos||'[]'),accionables:JSON.parse(n.accionables),actividades:accionesDe(n.id,uid),disponibleDesde:n.disponible_desde,
    prerrequisitoId:n.prerrequisito_id?String(n.prerrequisito_id):null,publicado:!!n.publicado,version:n.version,
    progreso:uid?(()=>{const p=db.prepare('SELECT visto_en AS vistoEn, realizado_en AS realizadoEn, evaluado_en AS evaluadoEn FROM curso_nodo_progreso WHERE nodo_id=? AND usuario_id=?').get(n.id,uid);return p?{...p,realizadoEn:realizada(n.id,uid)?p.realizadoEn:null,evaluadoEn:realizada(n.id,uid)?p.evaluadoEn:null}:null;})():null});
  app.get('/api/catedras/:catedraId/lecciones',ventanilla((req,res)=>{
    const a=acceso(req,res);if(!a)return;
    const filas=db.prepare('SELECT * FROM curso_nodos WHERE catedra_id=? ORDER BY orden,id').all(a.c.id);
    const porId=new Map(filas.map(n=>[n.id,n]));
    const visible=a.docente?filas:filas.filter(n=>disponible(n,a.u.id,porId));
    res.json({nodos:visible.map(n=>serializar(n,a.docente?null:a.u.id)),editable:a.docente});
  }));
  function disponible(n,uid,porId,vistos=new Set()) {
    if(!n||vistos.has(n.id)||!n.publicado||n.disponible_desde&&n.disponible_desde>new Date().toISOString())return false;
    vistos.add(n.id);
    if(n.padre_id && !disponible(porId.get(n.padre_id),uid,porId,vistos))return false;
    if(n.prerrequisito_id && !realizada(n.prerrequisito_id,uid))return false;
    return true;
  }
  function padreValido(cid,padre,nid=null) {
    const visitados=new Set(nid?[nid]:[]);let cursor=padre;
    while(cursor){if(cursor.tipo==='leccion'||visitados.has(cursor.id))return false;visitados.add(cursor.id);cursor=cursor.padre_id?nodo(cid,cursor.padre_id):null;}
    return true;
  }
  function guardarAcciones(nid,actividades) {
    db.prepare('UPDATE curso_acciones SET activa=0 WHERE nodo_id=?').run(nid);
    actividades.forEach((a,orden)=>{
      if(a.id)db.prepare('UPDATE curso_acciones SET titulo=?,orden=?,tarea_id=?,obligatoria=?,activa=1 WHERE id=? AND nodo_id=?').run(a.titulo,orden,a.tareaId,Number(a.obligatoria),a.id,nid);
      else db.prepare('INSERT INTO curso_acciones(nodo_id,titulo,orden,tarea_id,obligatoria) VALUES(?,?,?,?,?)').run(nid,a.titulo,orden,a.tareaId,Number(a.obligatoria));
    });
  }
  function validar(req,res,a,actual=null) {
    const b=req.body??{};
    const tipo=b.tipo??actual?.tipo,padre=b.padreId==null?null:nodo(a.c.id,b.padreId);
    if(actual&&tipo!==actual.tipo)return res.status(400).json({error:'El tipo del nodo no se cambia.'}),null;
    if(!['modulo','seccion','leccion'].includes(tipo)||typeof b.titulo!=='string'||!b.titulo.trim()||b.titulo.length>200||typeof(b.descripcion??'')!=='string'||String(b.descripcion??'').length>3000)return res.status(400).json({error:'Revisá título y descripción.'}),null;
    if((b.padreId!=null&&!padre)||!padreValido(a.c.id,padre,actual?.id))return res.status(400).json({error:'Elegí un contenedor válido; la jerarquía no puede formar ciclos.'}),null;
    const doc=b.documentoId==null?null:db.prepare('SELECT * FROM documentos_nexo WHERE id=? AND institucion_id=?').get(id(b.documentoId),a.u.institucionId);
    if(b.documentoId!=null&&(!doc||(b.publicado&&!doc.publicado)))return res.status(400).json({error:'Publicá el documento de la lección antes de abrirla al curso.'}),null;
    const archivo=b.archivoId==null?null:db.prepare('SELECT a.* FROM archivos a JOIN usuarios u ON u.id=a.subido_por WHERE a.id=? AND u.institucion_id=?').get(id(b.archivoId),a.u.institucionId);
    if(b.archivoId!=null&&(!archivo||(archivo.subido_por!==a.u.id&&actual?.archivo_id!==archivo.id)))return res.status(400).json({error:'Archivo no disponible.'}),null;
    const acciones=b.accionables??[];
    if(!Array.isArray(acciones)||acciones.length>100||acciones.some(x=>typeof x!=='string'||!x.trim()||x.length>1000))return res.status(400).json({error:'Accionables inválidos.'}),null;
    const previas=actual?db.prepare('SELECT * FROM curso_acciones WHERE nodo_id=? AND activa=1 ORDER BY orden,id').all(actual.id):[];
    const actividades=b.actividades??acciones.map((titulo,i)=>{const previa=previas[i]?.titulo===titulo?previas[i]:previas.find(x=>x.titulo===titulo);return {id:previa?.id??null,titulo,tareaId:previa?.tarea_id??null,obligatoria:!!previa?.obligatoria};});
    const usados=new Set();
    if(!Array.isArray(actividades)||actividades.length>100||actividades.some(x=>!x||typeof x.titulo!=='string'||!x.titulo.trim()||x.titulo.length>1000||
      (x.id!=null&&(!id(x.id)||!previas.some(p=>p.id===id(x.id))||usados.has(id(x.id))||!usados.add(id(x.id))))||
      (x.tareaId!=null&&(!id(x.tareaId)||!db.prepare('SELECT 1 FROM tareas WHERE id=? AND catedra_id=? AND eliminado_en IS NULL').get(id(x.tareaId),a.c.id)))))return res.status(400).json({error:'Actividad o tarea vinculada inválida.'}),null;
    const capitulos=b.capitulos??[];
    if(!Array.isArray(capitulos)||capitulos.length>40||capitulos.some(x=>!x||!Number.isInteger(x.segundo)||x.segundo<0||x.segundo>86400||typeof x.titulo!=='string'||!x.titulo.trim()||x.titulo.length>120)||capitulos.length&&!archivo)return res.status(400).json({error:'Capítulos inválidos.'}),null;
    const subtitulos=b.subtitulos??[];
    if(!Array.isArray(subtitulos)||subtitulos.length>10000||subtitulos.some((x,i)=>!x||!Number.isFinite(x.inicio)||!Number.isFinite(x.fin)||x.inicio<0||x.fin<=x.inicio||x.fin>86400||typeof x.texto!=='string'||!x.texto.trim()||x.texto.length>500||(i>0&&x.inicio<subtitulos[i-1].fin))||subtitulos.length&&!archivo)return res.status(400).json({error:'Subtítulos inválidos.'}),null;
    const previo=b.prerrequisitoId==null?null:nodo(a.c.id,b.prerrequisitoId);
    if(b.prerrequisitoId!=null&&(!previo||previo.tipo!=='leccion'||previo.id===actual?.id))return res.status(400).json({error:'Prerrequisito inválido.'}),null;
    if(previo&&actual){const visitados=new Set();let cursor=previo;while(cursor){if(cursor.id===actual.id)return res.status(400).json({error:'Los prerrequisitos no pueden formar un ciclo.'}),null;if(visitados.has(cursor.id))break;visitados.add(cursor.id);cursor=cursor.prerrequisito_id?nodo(a.c.id,cursor.prerrequisito_id):null;}}
    const fecha=b.disponibleDesde??null;
    if(fecha!==null&&(typeof fecha!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(fecha)||!Number.isFinite(Date.parse(fecha))))return res.status(400).json({error:'Fecha inválida.'}),null;
    return {tipo,padreId:padre?.id??null,titulo:b.titulo.trim(),descripcion:(b.descripcion??'').trim(),documentoId:doc?.id??null,archivoId:archivo?.id??null,capitulos:capitulos.map(x=>({segundo:x.segundo,titulo:x.titulo.trim()})),subtitulos:subtitulos.map(x=>({inicio:x.inicio,fin:x.fin,texto:x.texto.trim()})),acciones:actividades.map(x=>x.titulo.trim()),actividades:actividades.map(x=>({id:id(x.id),titulo:x.titulo.trim(),tareaId:id(x.tareaId),obligatoria:!!x.obligatoria})),prerrequisitoId:previo?.id??null,fecha,publicado:!!b.publicado};
  }
  app.post('/api/catedras/:catedraId/lecciones',ventanilla((req,res)=>{
    const a=acceso(req,res,true);if(!a)return;const v=validar(req,res,a);if(!v)return;
    const orden=db.prepare('SELECT COALESCE(MAX(orden),0)+1 AS n FROM curso_nodos WHERE catedra_id=? AND padre_id IS ?').get(a.c.id,v.padreId).n;
    db.exec('BEGIN');try {
    const nuevo=Number(db.prepare('INSERT INTO curso_nodos(catedra_id,padre_id,tipo,titulo,descripcion,orden,documento_id,archivo_id,capitulos,subtitulos,accionables,disponible_desde,prerrequisito_id,publicado) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(a.c.id,v.padreId,v.tipo,v.titulo,v.descripcion,orden,v.documentoId,v.archivoId,JSON.stringify(v.capitulos),JSON.stringify(v.subtitulos),JSON.stringify(v.acciones),v.fecha,v.prerrequisitoId,Number(v.publicado)).lastInsertRowid);
    guardarAcciones(nuevo,v.actividades);db.exec('COMMIT');res.status(201).json({nodo:serializar(nodo(a.c.id,nuevo))});
    }catch(error){db.exec('ROLLBACK');throw error;}
  }));
  app.put('/api/catedras/:catedraId/lecciones/:id',ventanilla((req,res)=>{
    const a=acceso(req,res,true);if(!a)return;const n=nodo(a.c.id,req.params.id);if(!n)return res.status(404).json({error:'Lección no disponible.'});
    if(req.body?.version!==n.version)return res.status(409).json({error:'La estructura cambió.'});
    const v=validar(req,res,a,n);if(!v)return;
    const orden=Number.isInteger(req.body?.orden)&&req.body.orden>=0?req.body.orden:n.orden;
    db.exec('BEGIN');try {
    db.prepare('UPDATE curso_nodos SET padre_id=?,titulo=?,descripcion=?,orden=?,documento_id=?,archivo_id=?,capitulos=?,subtitulos=?,accionables=?,disponible_desde=?,prerrequisito_id=?,publicado=?,version=version+1 WHERE id=?').run(v.padreId,v.titulo,v.descripcion,orden,v.documentoId,v.archivoId,JSON.stringify(v.capitulos),JSON.stringify(v.subtitulos),JSON.stringify(v.acciones),v.fecha,v.prerrequisitoId,Number(v.publicado),n.id);
    guardarAcciones(n.id,v.actividades);db.exec('COMMIT');res.json({nodo:serializar(nodo(a.c.id,n.id))});
    }catch(error){db.exec('ROLLBACK');throw error;}
  }));
  app.post('/api/catedras/:catedraId/lecciones/:id/mover',ventanilla((req,res)=>{
    const a=acceso(req,res,true);if(!a)return;const n=nodo(a.c.id,req.params.id);
    if(!n)return res.status(404).json({error:'Lección no disponible.'});
    if(req.body?.version!==n.version)return res.status(409).json({error:'La estructura cambió.'});
    if(Object.hasOwn(req.body??{},'padreId')) {
      const padre=req.body.padreId==null?null:nodo(a.c.id,req.body.padreId);
      if((req.body.padreId!=null&&!padre)||!padreValido(a.c.id,padre,n.id))return res.status(400).json({error:'No podés mover un nodo dentro de sí mismo, sus descendientes o una lección.'});
      const hermanos=db.prepare('SELECT id FROM curso_nodos WHERE catedra_id=? AND padre_id IS ? AND id<>? ORDER BY orden,id').all(a.c.id,padre?.id??null,n.id).map(x=>x.id);
      const antes=req.body.antesDeId==null?null:id(req.body.antesDeId);
      if(antes!==null&&!hermanos.includes(antes))return res.status(400).json({error:'La posición de destino no está disponible.'});
      hermanos.splice(antes===null?hermanos.length:hermanos.indexOf(antes),0,n.id);
      db.exec('BEGIN');try{
        db.prepare('UPDATE curso_nodos SET padre_id=? WHERE id=?').run(padre?.id??null,n.id);
        hermanos.forEach((nid,i)=>db.prepare('UPDATE curso_nodos SET orden=?,version=version+1 WHERE id=?').run(i+1,nid));
        db.exec('COMMIT');
      }catch(error){db.exec('ROLLBACK');throw error;}
      return res.json({nodo:serializar(nodo(a.c.id,n.id))});
    }
    const direccion=req.body?.direccion;
    if(direccion!==-1&&direccion!==1)return res.status(400).json({error:'Dirección inválida.'});
    const hermanos=db.prepare('SELECT id,orden FROM curso_nodos WHERE catedra_id=? AND padre_id IS ? ORDER BY orden,id').all(a.c.id,n.padre_id);
    const indice=hermanos.findIndex(h=>h.id===n.id), otro=hermanos[indice+direccion];
    if(!otro)return res.json({nodo:serializar(n)});
    db.exec('BEGIN');
    try {
      db.prepare('UPDATE curso_nodos SET orden=?,version=version+1 WHERE id=?').run(otro.orden,n.id);
      db.prepare('UPDATE curso_nodos SET orden=?,version=version+1 WHERE id=?').run(n.orden,otro.id);
      if(n.orden===otro.orden){
        hermanos.forEach((h,i)=>db.prepare('UPDATE curso_nodos SET orden=? WHERE id=?').run(i+1,h.id));
        db.prepare('UPDATE curso_nodos SET orden=?,version=version+1 WHERE id=?').run(indice+direccion+1,n.id);
        db.prepare('UPDATE curso_nodos SET orden=?,version=version+1 WHERE id=?').run(indice+1,otro.id);
      }
      db.exec('COMMIT');
    } catch(error) { db.exec('ROLLBACK'); throw error; }
    res.json({nodo:serializar(nodo(a.c.id,n.id))});
  }));
  app.post('/api/catedras/:catedraId/lecciones/:id/duplicar',ventanilla((req,res)=>{
    const a=acceso(req,res,true);if(!a)return;const n=nodo(a.c.id,req.params.id);
    if(!n)return res.status(404).json({error:'Nodo no disponible.'});
    const destinoId=req.body?.catedraDestinoId==null?a.c.id:id(req.body.catedraDestinoId);
    const destino=db.prepare('SELECT c.*,m.institucion_id FROM catedras c JOIN materias m ON m.id=c.materia_id WHERE c.id=?').get(destinoId);
    if(!destino||destino.institucion_id!==a.u.institucionId||!(destino.profesor_id===a.u.id||a.u.rol==='admin-academico'))return res.status(403).json({error:'Elegí una cátedra propia para reutilizar la rama.'});
    const padreId=Object.hasOwn(req.body??{},'padreId')?req.body.padreId:(destinoId===a.c.id?n.padre_id:null);
    const padre=padreId==null?null:nodo(destinoId,padreId);
    if((padreId!=null&&!padre)||!padreValido(destinoId,padre))return res.status(400).json({error:'Contenedor de destino inválido.'});
    const todos=db.prepare('SELECT * FROM curso_nodos WHERE catedra_id=? ORDER BY orden,id').all(a.c.id);
    const rama=[];const vistos=new Set();
    function recorrer(x){if(vistos.has(x.id))throw new Error('La estructura contiene un ciclo.');vistos.add(x.id);rama.push(x);todos.filter(h=>h.padre_id===x.id).forEach(recorrer);}
    recorrer(n);const idsNuevos=new Map();
    db.exec('BEGIN');try{
      for(const x of rama){
        const nuevo=Number(db.prepare(`INSERT INTO curso_nodos(catedra_id,padre_id,tipo,titulo,descripcion,orden,documento_id,archivo_id,capitulos,subtitulos,accionables,disponible_desde,publicado)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?,0)`).run(destinoId,x.id===n.id?padre?.id??null:idsNuevos.get(x.padre_id),x.tipo,x.id===n.id?`Copia de ${x.titulo}`.slice(0,200):x.titulo,x.descripcion,x.orden+(x.id===n.id?1:0),x.documento_id,x.archivo_id,x.capitulos,x.subtitulos,x.accionables,x.disponible_desde).lastInsertRowid);
        idsNuevos.set(x.id,nuevo);
        guardarAcciones(nuevo,accionesDe(x.id).map(v=>({titulo:v.titulo,tareaId:destinoId===a.c.id?id(v.tareaId):null,obligatoria:v.obligatoria})));
      }
      for(const x of rama)if(x.prerrequisito_id)db.prepare('UPDATE curso_nodos SET prerrequisito_id=? WHERE id=?').run(idsNuevos.get(x.prerrequisito_id)??(destinoId===a.c.id?x.prerrequisito_id:null),idsNuevos.get(x.id));
      db.exec('COMMIT');
    }catch(error){db.exec('ROLLBACK');throw error;}
    res.status(201).json({nodo:serializar(nodo(destinoId,idsNuevos.get(n.id))),catedraId:String(destinoId),copiados:idsNuevos.size,tareasDesvinculadas:destinoId!==a.c.id});
  }));
  app.get('/api/catedras/:catedraId/lecciones/vinculos',ventanilla((req,res)=>{
    const a=acceso(req,res,true);if(!a)return;
    const tareas=db.prepare('SELECT id,titulo FROM tareas WHERE catedra_id=? AND eliminado_en IS NULL ORDER BY id DESC').all(a.c.id);
    const catedras=db.prepare(`SELECT c.id,m.nombre AS materia,cu.anio,cu.division FROM catedras c JOIN materias m ON m.id=c.materia_id JOIN cursos cu ON cu.id=c.curso_id
      WHERE m.institucion_id=? AND (?='admin-academico' OR c.profesor_id=?) ORDER BY m.nombre,cu.anio,cu.division`).all(a.u.institucionId,a.u.rol,a.u.id);
    res.json({tareas:tareas.map(x=>({...x,id:String(x.id)})),catedras:catedras.map(x=>({id:String(x.id),titulo:`${x.materia} · ${x.anio}° ${x.division}`}))});
  }));
  app.put('/api/catedras/:catedraId/lecciones/:id/acciones/:accionId/progreso',ventanilla((req,res)=>{
    const a=acceso(req,res);if(!a)return;const n=nodo(a.c.id,req.params.id);
    const porId=new Map(db.prepare('SELECT * FROM curso_nodos WHERE catedra_id=?').all(a.c.id).map(x=>[x.id,x]));
    if(a.docente||!n||!disponible(n,a.u.id,porId))return res.status(403).json({error:'Actividad no disponible para este estudiante.'});
    const accion=db.prepare('SELECT * FROM curso_acciones WHERE id=? AND nodo_id=? AND activa=1').get(id(req.params.accionId),n.id);
    if(!accion)return res.status(404).json({error:'Actividad no disponible.'});
    const anterior=db.prepare('SELECT * FROM curso_accion_progreso WHERE accion_id=? AND usuario_id=?').get(accion.id,a.u.id);
    const b=req.body??{},evidencia=b.evidencia??anterior?.evidencia??'';
    if(typeof evidencia!=='string'||evidencia.length>10000||(b.completada!==undefined&&typeof b.completada!=='boolean'))return res.status(400).json({error:'Revisá estado y evidencia.'});
    if(accion.tarea_id&&b.completada!==undefined)return res.status(409).json({error:'El estado de esta actividad proviene de su entrega.'});
    db.prepare(`INSERT INTO curso_accion_progreso(accion_id,usuario_id,completada,evidencia) VALUES(?,?,?,?) ON CONFLICT(accion_id,usuario_id)
      DO UPDATE SET completada=excluded.completada,evidencia=excluded.evidencia,actualizado_en=datetime('now')`).run(accion.id,a.u.id,Number(b.completada??!!anterior?.completada),evidencia.trim());
    if(accion.obligatoria&&b.completada===false)db.prepare('UPDATE curso_nodo_progreso SET realizado_en=NULL,evaluado_en=NULL WHERE nodo_id=? AND usuario_id=?').run(n.id,a.u.id);
    res.json({actividad:accionesDe(n.id,a.u.id).find(x=>x.id===String(accion.id))});
  }));
  app.post('/api/catedras/:catedraId/lecciones/:id/progreso',ventanilla((req,res)=>{
    const a=acceso(req,res);if(!a)return;const n=nodo(a.c.id,req.params.id);if(!n||n.tipo!=='leccion'||a.docente)return res.status(403).json({error:'Lección no disponible para este estudiante.'});
    const porId=new Map(db.prepare('SELECT * FROM curso_nodos WHERE catedra_id=?').all(a.c.id).map(x=>[x.id,x]));
    if(!disponible(n,a.u.id,porId))return res.status(403).json({error:'Lección aún no disponible.'});
    const campo={visto:'visto_en',realizado:'realizado_en'}[req.body?.estado];if(!campo)return res.status(400).json({error:'Estado inválido.'});
    if(campo==='realizado_en'&&accionesDe(n.id,a.u.id).some(x=>x.obligatoria&&!x.completada))return res.status(409).json({error:'Completá primero los accionables obligatorios de esta lección.'});
    if(campo==='realizado_en'&&n.prerrequisito_id&&!realizada(n.prerrequisito_id,a.u.id))return res.status(409).json({error:'Completá el prerrequisito.'});
    db.prepare(`INSERT INTO curso_nodo_progreso(nodo_id,usuario_id,${campo}) VALUES(?,?,datetime('now')) ON CONFLICT(nodo_id,usuario_id) DO UPDATE SET ${campo}=COALESCE(${campo},datetime('now'))`).run(n.id,a.u.id);
    res.json({nodo:serializar(n,a.u.id)});
  }));
  app.get('/api/catedras/:catedraId/lecciones/:id/progresos',ventanilla((req,res)=>{
    const a=acceso(req,res,true);if(!a)return;const n=nodo(a.c.id,req.params.id);
    if(!n||n.tipo!=='leccion')return res.status(404).json({error:'Lección no disponible.'});
    const alumnos=db.prepare(`SELECT u.id,u.nombre,p.visto_en AS vistoEn,p.realizado_en AS realizadoEn,p.evaluado_en AS evaluadoEn
      FROM inscripciones i JOIN usuarios u ON u.id=i.estudiante_id LEFT JOIN curso_nodo_progreso p ON p.nodo_id=? AND p.usuario_id=u.id
      WHERE i.curso_id=? ORDER BY u.nombre`).all(n.id,a.c.curso_id);
    res.json({alumnos:alumnos.map(x=>({...x,id:String(x.id),realizadoEn:realizada(n.id,x.id)?x.realizadoEn:null,evaluadoEn:realizada(n.id,x.id)?x.evaluadoEn:null,actividades:accionesDe(n.id,x.id)}))});
  }));
  app.post('/api/catedras/:catedraId/lecciones/:id/progresos/:usuarioId/evaluar',ventanilla((req,res)=>{
    const a=acceso(req,res,true);if(!a)return;const n=nodo(a.c.id,req.params.id),uid=id(req.params.usuarioId);
    if(!n||n.tipo!=='leccion'||!db.prepare('SELECT 1 FROM inscripciones WHERE curso_id=? AND estudiante_id=?').get(a.c.curso_id,uid))return res.status(404).json({error:'Lección o estudiante no disponible.'});
    const p=db.prepare('SELECT * FROM curso_nodo_progreso WHERE nodo_id=? AND usuario_id=?').get(n.id,uid);
    if(!p?.realizado_en||!realizada(n.id,uid))return res.status(409).json({error:'La lección todavía no fue realizada.'});
    db.prepare("UPDATE curso_nodo_progreso SET evaluado_en=COALESCE(evaluado_en,datetime('now')) WHERE nodo_id=? AND usuario_id=?").run(n.id,uid);
    res.json({nodo:serializar(n,uid)});
  }));
}
