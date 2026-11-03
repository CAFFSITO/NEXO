import { exigirAcceso, ventanilla } from './comun.js';
import { puedeVer } from './permisos.js';
import { paginaVisible } from './genoma.js';

function lecturaPermitida(db,d,u) { return d && d.institucion_id===u.institucionId && (d.publicado || d.autor_id===u.id || u.rol==='admin-academico' || db.prepare('SELECT 1 FROM documentos_nexo_colaboradores WHERE documento_id=? AND usuario_id=?').get(d.id,u.id)); }
export function fuenteDocumentoAutorizada(db,u,id) {
  if(!Number.isSafeInteger(Number(id))||Number(id)<1)return null;
  if(!puedeVer(u.rol,'documentos')||!paginaVisible(db,u,'documentos'))return null;
  const d=db.prepare('SELECT * FROM documentos_nexo WHERE id=?').get(Number(id));
  if(!lecturaPermitida(db,d,u))return null;
  const texto=JSON.parse(d.contenido).map(b=>[b.texto,...(b.tipo==='tabla'?(b.filas??[]).map(f=>f.join(' | ')):[])].join('\n')).join('\n').slice(0,12000);
  return {id:d.id,titulo:d.titulo,texto};
}

const entero = v => Number.isSafeInteger(Number(v)) && Number(v) > 0 ? Number(v) : null;
const tipos = new Set(['documento', 'formulario']);
const bloques = new Set(['texto', 'titulo', 'lista', 'tabla', 'enlace', 'archivo', 'accionable', 'pregunta']);
const urlSegura = v => { try { const u = new URL(v); return ['http:','https:'].includes(u.protocol) && !u.username && !u.password; } catch { return false; } };
const igualRespuesta = (a,b) => Array.isArray(a) && Array.isArray(b) ? [...new Set(a)].sort().join('\u0000') === [...new Set(b)].sort().join('\u0000') : typeof a === 'string' && typeof b === 'string' ? a.trim().toLocaleLowerCase('es') === b.trim().toLocaleLowerCase('es') : a === b;
function evaluacionValida(x) { return x && typeof x === 'object' && !Array.isArray(x) && (x.intentosMaximos == null || Number.isInteger(x.intentosMaximos) && x.intentosMaximos >= 1 && x.intentosMaximos <= 100) && (x.aprobacion == null || typeof x.aprobacion === 'number' && x.aprobacion >= 0 && x.aprobacion <= 100) && (x.mostrarSoluciones == null || typeof x.mostrarSoluciones === 'boolean'); }
function validarContenido(tipo, contenido) {
  if (!Array.isArray(contenido) || contenido.length > 500) return false;
  const ids = new Set();
  for (const b of contenido) {
    if (!b || typeof b !== 'object' || !bloques.has(b.tipo) || typeof b.id !== 'string' || !b.id.trim() || b.id.length > 80 || ids.has(b.id) || typeof b.texto !== 'string' || JSON.stringify(b).length > 10000) return false;
    ids.add(b.id);
    if (b.tipo === 'tabla' && b.filas !== undefined && (!Array.isArray(b.filas) || b.filas.length > 100 || b.filas.some(f=>!Array.isArray(f)||f.length>30||f.some(c=>typeof c!=='string'||c.length>2000)))) return false;
    if (b.tipo === 'enlace' && b.url !== undefined && !urlSegura(b.url)) return false;
    if (b.tipo === 'archivo' && b.archivoId !== undefined && !entero(b.archivoId)) return false;
    if (b.nombreArchivo !== undefined && (typeof b.nombreArchivo !== 'string' || b.nombreArchivo.length > 1000)) return false;
    if (b.tipo === 'pregunta' && (b.puntos !== undefined && (!Number.isFinite(b.puntos)||b.puntos<0||b.puntos>1000) || b.devolucion !== undefined && (typeof b.devolucion!=='string'||b.devolucion.length>3000))) return false;
    if (b.tipo === 'pregunta' && b.correcta !== undefined) {
      if (b.respuesta === 'multiple' ? !Array.isArray(b.correcta)||!Array.isArray(b.opciones)||b.correcta.some(x=>!b.opciones.includes(x)) : b.respuesta === 'seleccion' ? !Array.isArray(b.opciones)||!b.opciones.includes(b.correcta) : b.respuesta === 'numero' ? typeof b.correcta!=='number'||!Number.isFinite(b.correcta) : typeof b.correcta!=='string') return false;
    }
    if (tipo === 'formulario' && b.tipo === 'pregunta' && (!Array.isArray(b.opciones) || b.opciones.length > 100 || !['texto', 'numero', 'seleccion', 'multiple', 'fecha'].includes(b.respuesta)
      || b.opciones.some(o=>typeof o!=='string'||!o.trim()||o.length>1000) || new Set(b.opciones).size!==b.opciones.length
      || (b.obligatoria!==undefined&&typeof b.obligatoria!=='boolean')
      || (b.visibleSi && (typeof b.visibleSi.id !== 'string' || !['igual','distinto'].includes(b.visibleSi.operador) || typeof b.visibleSi.valor !== 'string')))) return false;
  }
  const posicion = new Map(contenido.map((b,i)=>[b.id,i]));
  for (const [i,b] of contenido.entries()) if (b.visibleSi && (b.tipo !== 'pregunta' || !posicion.has(b.visibleSi.id) || posicion.get(b.visibleSi.id) >= i || contenido[posicion.get(b.visibleSi.id)].tipo !== 'pregunta')) return false;
  return true;
}
export function registrarDocumentos(app, db, mensajero = null) {
  db.exec(`CREATE TABLE IF NOT EXISTS documentos_nexo (
    id INTEGER PRIMARY KEY, institucion_id INTEGER NOT NULL REFERENCES instituciones(id), autor_id INTEGER NOT NULL REFERENCES usuarios(id),
    tipo TEXT NOT NULL CHECK(tipo IN ('documento','formulario')), titulo TEXT NOT NULL, contenido TEXT NOT NULL DEFAULT '[]',
    version INTEGER NOT NULL DEFAULT 1, publicado INTEGER NOT NULL DEFAULT 0, plantilla INTEGER NOT NULL DEFAULT 0,
    actualizado_en TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS documentos_nexo_versiones (
    documento_id INTEGER NOT NULL REFERENCES documentos_nexo(id) ON DELETE CASCADE, version INTEGER NOT NULL,
    contenido TEXT NOT NULL, autor_id INTEGER NOT NULL REFERENCES usuarios(id), creado_en TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY(documento_id,version));
  CREATE TABLE IF NOT EXISTS documentos_nexo_colaboradores (
    documento_id INTEGER NOT NULL REFERENCES documentos_nexo(id) ON DELETE CASCADE, usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    PRIMARY KEY(documento_id,usuario_id));
  CREATE TABLE IF NOT EXISTS documentos_nexo_comentarios (
    id INTEGER PRIMARY KEY, documento_id INTEGER NOT NULL REFERENCES documentos_nexo(id) ON DELETE CASCADE,
    bloque_id TEXT, autor_id INTEGER NOT NULL REFERENCES usuarios(id), texto TEXT NOT NULL, creado_en TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS formularios_nexo_respuestas (
    id INTEGER PRIMARY KEY, documento_id INTEGER NOT NULL REFERENCES documentos_nexo(id) ON DELETE CASCADE,
    autor_id INTEGER NOT NULL REFERENCES usuarios(id), respuestas TEXT NOT NULL, enviado_en TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE INDEX IF NOT EXISTS idx_documentos_nexo_institucion ON documentos_nexo(institucion_id,tipo);`);
  for (const [tabla,columna,def] of [['documentos_nexo','evaluacion',"TEXT NOT NULL DEFAULT '{}'"],['documentos_nexo_versiones','evaluacion',"TEXT NOT NULL DEFAULT '{}'"],['documentos_nexo_colaboradores','permiso',"TEXT NOT NULL DEFAULT 'editar'"],['formularios_nexo_respuestas','resultado',"TEXT NOT NULL DEFAULT '{}'"],['formularios_nexo_respuestas','version_documento','INTEGER']]) if (!db.prepare(`PRAGMA table_info(${tabla})`).all().some(c=>c.name===columna)) db.exec(`ALTER TABLE ${tabla} ADD COLUMN ${columna} ${def}`);
  db.exec(`CREATE TABLE IF NOT EXISTS documentos_nexo_acciones(documento_id INTEGER NOT NULL REFERENCES documentos_nexo(id) ON DELETE CASCADE, bloque_id TEXT NOT NULL, usuario_id INTEGER NOT NULL REFERENCES usuarios(id), completado INTEGER NOT NULL DEFAULT 0, evidencia TEXT NOT NULL DEFAULT '', actualizado_en TEXT NOT NULL DEFAULT(datetime('now')), PRIMARY KEY(documento_id,bloque_id,usuario_id));`);
  function actual(req,res,editar=false) {
    const u=exigirAcceso(db,req,res,'documentos'); if(!u) return null;
    const d=db.prepare('SELECT * FROM documentos_nexo WHERE id=? AND institucion_id=?').get(entero(req.params.id),u.institucionId);
    if(!d) { res.status(404).json({error:'Documento no disponible.'}); return null; }
    const permiso=db.prepare('SELECT permiso FROM documentos_nexo_colaboradores WHERE documento_id=? AND usuario_id=?').get(d.id,u.id)?.permiso;
    const colaborador=permiso === 'editar';
    if(editar && d.autor_id!==u.id && !colaborador) { res.status(403).json({error:'No podés editar este documento.'}); return null; }
    if(!editar && !lecturaPermitida(db,d,u)) { res.status(404).json({error:'Documento no disponible.'}); return null; }
    return {u,d,colaborador};
  }
  const puedeEditar=(d,u)=>d.autor_id===u.id || db.prepare("SELECT 1 FROM documentos_nexo_colaboradores WHERE documento_id=? AND usuario_id=? AND permiso='editar'").get(d.id,u.id);
  const contenidoPublico = contenido => contenido.map(b=>{ const {correcta,puntos,devolucion,...visible}=b; void correcta; void puntos; void devolucion; return visible; });
  const dto=(d,u)=>({...d,id:String(d.id),autorId:String(d.autor_id),institucionId:undefined,autor_id:undefined,institucion_id:undefined,contenido:!u||puedeEditar(d,u)?JSON.parse(d.contenido):contenidoPublico(JSON.parse(d.contenido)),evaluacion:JSON.parse(d.evaluacion||'{}'),editable:!!u&&!!puedeEditar(d,u),propietario:!!u&&d.autor_id===u.id,publicado:Boolean(d.publicado),plantilla:Boolean(d.plantilla)});
  function archivosValidos(contenido,u,d=null) {
    const anteriores=new Set(d?JSON.parse(d.contenido).filter(b=>b.tipo==='archivo').map(b=>String(b.archivoId)):[]);
    return contenido.filter(b=>b.tipo==='archivo'&&b.archivoId).every(b=>anteriores.has(String(b.archivoId))||db.prepare('SELECT 1 FROM archivos WHERE id=? AND subido_por=?').get(entero(b.archivoId),u.id));
  }
  const avisar=(documentoId,version,autorId)=>{
    if(!mensajero)return;
    const d=db.prepare('SELECT autor_id FROM documentos_nexo WHERE id=?').get(documentoId);
    const ids=new Set([d.autor_id,...db.prepare('SELECT usuario_id FROM documentos_nexo_colaboradores WHERE documento_id=?').all(documentoId).map(x=>x.usuario_id)]);
    mensajero.emitirAVarios(ids,{tipo:'documento-version',documentoId:String(documentoId),version,autorId:String(autorId)});
  };
  function fusionar(base,actual,propuesto){
    const porBase=new Map(base.map(b=>[b.id,b]));
    const porActual=new Map(actual.map(b=>[b.id,b]));
    const porPropuesto=new Map(propuesto.map(b=>[b.id,b]));
    const ids=new Set([...porBase.keys(),...porActual.keys(),...porPropuesto.keys()]);
    const elegido=new Map();
    for(const id of ids){
      const b=porBase.get(id),c=porActual.get(id),p=porPropuesto.get(id);
      const modActual=JSON.stringify(c)!==JSON.stringify(b),modPropuesto=JSON.stringify(p)!==JSON.stringify(b);
      if(modActual&&modPropuesto&&JSON.stringify(c)!==JSON.stringify(p))return null;
      if(modPropuesto ? p!==undefined : c!==undefined)elegido.set(id,modPropuesto?p:c);
    }
    // El editor actual agrega bloques al final y no ofrece reordenarlos. Así
    // preservamos el orden vigente y añadimos los nuevos del segundo editor.
    return [...actual,...propuesto].filter(b=>elegido.has(b.id)&&elegido.get(b.id)===b)
      .filter((b,i,a)=>a.findIndex(x=>x.id===b.id)===i);
  }
  app.get('/api/documentos',ventanilla((req,res)=>{
    const u=exigirAcceso(db,req,res,'documentos');if(!u)return;
    const tipo=req.query.tipo;if(tipo && !tipos.has(tipo))return res.status(400).json({error:'Tipo inválido.'});
    const filas=db.prepare(`SELECT d.* FROM documentos_nexo d WHERE d.institucion_id=? AND (? IS NULL OR d.tipo=?)
      AND (d.publicado=1 OR d.autor_id=? OR EXISTS(SELECT 1 FROM documentos_nexo_colaboradores c WHERE c.documento_id=d.id AND c.usuario_id=?)) ORDER BY d.actualizado_en DESC,d.id DESC LIMIT 200`).all(u.institucionId,tipo??null,tipo??null,u.id,u.id);
    res.json({documentos:filas.map(d=>dto(d,u))});
  }));
  app.post('/api/documentos',ventanilla((req,res)=>{
    const u=exigirAcceso(db,req,res,'documentos');if(!u)return;
    const {tipo,titulo,contenido=[],plantilla=false,evaluacion={}}=req.body??{};
    if(!tipos.has(tipo)||typeof titulo!=='string'||!titulo.trim()||titulo.length>200||!validarContenido(tipo,contenido)||!evaluacionValida(evaluacion)||!archivosValidos(contenido,u))return res.status(400).json({error:'Revisá título, bloques, archivos y evaluación.'});
    const id=Number(db.prepare('INSERT INTO documentos_nexo(institucion_id,autor_id,tipo,titulo,contenido,plantilla) VALUES(?,?,?,?,?,?)').run(u.institucionId,u.id,tipo,titulo.trim(),JSON.stringify(contenido),Number(!!plantilla)).lastInsertRowid);
    db.prepare('UPDATE documentos_nexo SET evaluacion=? WHERE id=?').run(JSON.stringify(evaluacion),id);
    res.status(201).json({documento:dto(db.prepare('SELECT * FROM documentos_nexo WHERE id=?').get(id),u)});
  }));
  app.get('/api/documentos/personas',ventanilla((req,res)=>{const u=exigirAcceso(db,req,res,'documentos');if(!u)return;const buscar=String(req.query.buscar??'').trim().slice(0,100);res.json({personas:buscar?db.prepare("SELECT id,nombre,email,rol FROM usuarios WHERE institucion_id=? AND estado='activo' AND id<>? AND (nombre LIKE ? OR email LIKE ?) ORDER BY nombre LIMIT 30").all(u.institucionId,u.id,`%${buscar}%`,`%${buscar}%`):[]});}));
  app.get('/api/documentos/:id',ventanilla((req,res)=>{const a=actual(req,res);if(a)res.json({documento:dto(a.d,a.u)});}));
  app.post('/api/documentos/:id/ramificar',ventanilla((req,res)=>{
    const a=actual(req,res);if(!a)return;
    const titulo=req.body?.titulo??`Copia de ${a.d.titulo}`;
    if(typeof titulo!=='string'||!titulo.trim()||titulo.length>200)return res.status(400).json({error:'Título inválido.'});
    const copiable=puedeEditar(a.d,a.u)?JSON.parse(a.d.contenido):contenidoPublico(JSON.parse(a.d.contenido));
    const id=Number(db.prepare('INSERT INTO documentos_nexo(institucion_id,autor_id,tipo,titulo,contenido,plantilla,evaluacion) VALUES(?,?,?,?,?,?,?)').run(a.u.institucionId,a.u.id,a.d.tipo,titulo.trim(),JSON.stringify(copiable),Number(!!req.body?.plantilla),a.d.evaluacion).lastInsertRowid);
    res.status(201).json({documento:dto(db.prepare('SELECT * FROM documentos_nexo WHERE id=?').get(id),a.u)});
  }));
  app.put('/api/documentos/:id',ventanilla((req,res)=>{
    const a=actual(req,res,true);if(!a)return;const {u,d}=a;const b=req.body??{};
    const titulo=b.titulo??d.titulo,evaluacion=b.evaluacion??JSON.parse(d.evaluacion||'{}');let contenido=b.contenido??JSON.parse(d.contenido),fusionado=false;
    if(b.version!==d.version){
      const base=Number.isSafeInteger(b.version)&&b.version>0&&b.version<d.version&&db.prepare('SELECT contenido FROM documentos_nexo_versiones WHERE documento_id=? AND version=?').get(d.id,b.version);
      if(!base||b.titulo!==d.titulo||b.publicado!==Boolean(d.publicado)||JSON.stringify(evaluacion)!==d.evaluacion||!validarContenido(d.tipo,contenido))return res.status(409).json({error:'El documento cambió. Revisá la última versión antes de guardar.'});
      contenido=fusionar(JSON.parse(base.contenido),JSON.parse(d.contenido),contenido);
      if(!contenido)return res.status(409).json({error:'Otra persona editó el mismo bloque. Revisá la última versión.'});
      fusionado=true;
    }
    if(typeof titulo!=='string'||!titulo.trim()||titulo.length>200||!validarContenido(d.tipo,contenido)||!evaluacionValida(evaluacion)||!archivosValidos(contenido,u,d)||typeof(b.publicado??Boolean(d.publicado))!=='boolean')return res.status(400).json({error:'Documento inválido.'});
    db.exec('BEGIN IMMEDIATE');try{
      db.prepare('INSERT INTO documentos_nexo_versiones(documento_id,version,contenido,autor_id,evaluacion) VALUES(?,?,?,?,?)').run(d.id,d.version,d.contenido,u.id,d.evaluacion);
      db.prepare("UPDATE documentos_nexo SET titulo=?,contenido=?,version=version+1,publicado=?,actualizado_en=datetime('now') WHERE id=?").run(titulo.trim(),JSON.stringify(contenido),Number(b.publicado??Boolean(d.publicado)),d.id);
      db.prepare('UPDATE documentos_nexo SET evaluacion=? WHERE id=?').run(JSON.stringify(evaluacion),d.id);
      db.exec('COMMIT');
    }catch(e){db.exec('ROLLBACK');throw e;}
    const actualizado=db.prepare('SELECT * FROM documentos_nexo WHERE id=?').get(d.id);
    avisar(d.id,actualizado.version,u.id);
    res.json({documento:dto(actualizado,u),fusionado});
  }));
  app.get('/api/documentos/:id/versiones',ventanilla((req,res)=>{const a=actual(req,res,true);if(a)res.json({versiones:db.prepare('SELECT version,creado_en AS creadoEn,autor_id AS autorId FROM documentos_nexo_versiones WHERE documento_id=? ORDER BY version DESC').all(a.d.id)});}));
  app.post('/api/documentos/:id/restaurar',ventanilla((req,res)=>{
    const a=actual(req,res,true);if(!a)return;const v=db.prepare('SELECT contenido,evaluacion FROM documentos_nexo_versiones WHERE documento_id=? AND version=?').get(a.d.id,entero(req.body?.version));
    if(!v)return res.status(404).json({error:'Versión no disponible.'});
    if(req.body?.actual!==a.d.version)return res.status(409).json({error:'El documento cambió.'});
    db.exec('BEGIN IMMEDIATE');try{
      db.prepare('INSERT INTO documentos_nexo_versiones(documento_id,version,contenido,autor_id,evaluacion) VALUES(?,?,?,?,?)').run(a.d.id,a.d.version,a.d.contenido,a.u.id,a.d.evaluacion);
      db.prepare("UPDATE documentos_nexo SET contenido=?,evaluacion=?,version=version+1,actualizado_en=datetime('now') WHERE id=?").run(v.contenido,v.evaluacion,a.d.id);db.exec('COMMIT');
    }catch(e){db.exec('ROLLBACK');throw e;}
    const actualizado=db.prepare('SELECT * FROM documentos_nexo WHERE id=?').get(a.d.id);
    avisar(a.d.id,actualizado.version,a.u.id);
    res.json({documento:dto(actualizado,a.u)});
  }));
  app.post('/api/documentos/:id/colaboradores',ventanilla((req,res)=>{
    const a=actual(req,res,true);if(!a)return;if(a.d.autor_id!==a.u.id)return res.status(403).json({error:'Solo quien creó el documento invita.'});
    const id=entero(req.body?.usuarioId),permiso=req.body?.permiso??'editar';const otro=id&&db.prepare("SELECT 1 FROM usuarios WHERE id=? AND institucion_id=? AND estado='activo'").get(id,a.u.institucionId);
    if(!otro||!['leer','editar'].includes(permiso)||id===a.d.autor_id)return res.status(400).json({error:'Persona o permiso inválido.'});
    db.prepare('INSERT INTO documentos_nexo_colaboradores(documento_id,usuario_id,permiso) VALUES(?,?,?) ON CONFLICT(documento_id,usuario_id) DO UPDATE SET permiso=excluded.permiso').run(a.d.id,id,permiso);res.json({ok:true});
  }));
  app.get('/api/documentos/:id/colaboradores',ventanilla((req,res)=>{
    const a=actual(req,res,true);if(!a)return;
    res.json({colaboradores:db.prepare('SELECT u.id,u.nombre,u.email,c.permiso FROM documentos_nexo_colaboradores c JOIN usuarios u ON u.id=c.usuario_id WHERE c.documento_id=? ORDER BY u.nombre').all(a.d.id)});
  }));
  app.delete('/api/documentos/:id/colaboradores/:usuarioId',ventanilla((req,res)=>{const a=actual(req,res,true);if(!a)return;if(a.d.autor_id!==a.u.id)return res.status(403).json({error:'Sólo quien creó el documento gestiona colaboradores.'});db.prepare('DELETE FROM documentos_nexo_colaboradores WHERE documento_id=? AND usuario_id=?').run(a.d.id,entero(req.params.usuarioId));res.json({ok:true});}));
  app.get('/api/documentos/:id/acciones',ventanilla((req,res)=>{const a=actual(req,res);if(!a)return;res.json({acciones:db.prepare('SELECT bloque_id AS bloqueId,completado,evidencia FROM documentos_nexo_acciones WHERE documento_id=? AND usuario_id=?').all(a.d.id,a.u.id).filter(x=>JSON.parse(a.d.contenido).some(b=>b.id===x.bloqueId&&b.tipo==='accionable')).map(x=>({...x,completado:!!x.completado}))});}));
  app.put('/api/documentos/:id/acciones/:bloqueId',ventanilla((req,res)=>{const a=actual(req,res);if(!a)return;const b=JSON.parse(a.d.contenido).find(b=>b.id===req.params.bloqueId&&b.tipo==='accionable');if(!b)return res.status(404).json({error:'Accionable no disponible.'});const {completado,evidencia=''}=req.body??{};if(typeof completado!=='boolean'||typeof evidencia!=='string'||evidencia.length>5000)return res.status(400).json({error:'Avance inválido.'});db.prepare("INSERT INTO documentos_nexo_acciones(documento_id,bloque_id,usuario_id,completado,evidencia) VALUES(?,?,?,?,?) ON CONFLICT(documento_id,bloque_id,usuario_id) DO UPDATE SET completado=excluded.completado,evidencia=excluded.evidencia,actualizado_en=datetime('now')").run(a.d.id,b.id,a.u.id,Number(completado),evidencia);res.json({ok:true});}));
  app.get('/api/documentos/:id/comentarios',ventanilla((req,res)=>{const a=actual(req,res);if(a)res.json({comentarios:db.prepare('SELECT id,bloque_id AS bloqueId,autor_id AS autorId,texto,creado_en AS creadoEn FROM documentos_nexo_comentarios WHERE documento_id=? ORDER BY id').all(a.d.id)});}));
  app.post('/api/documentos/:id/comentarios',ventanilla((req,res)=>{
    const a=actual(req,res);if(!a)return;const texto=req.body?.texto;
    if(typeof texto!=='string'||!texto.trim()||texto.length>2000)return res.status(400).json({error:'Comentario inválido.'});
    const id=db.prepare('INSERT INTO documentos_nexo_comentarios(documento_id,bloque_id,autor_id,texto) VALUES(?,?,?,?)').run(a.d.id,String(req.body?.bloqueId??''),a.u.id,texto.trim()).lastInsertRowid;
    res.status(201).json({id:String(id)});
  }));
  app.post('/api/documentos/:id/respuestas',ventanilla((req,res)=>{
    const a=actual(req,res);if(!a)return;if(a.d.tipo!=='formulario'||!a.d.publicado)return res.status(403).json({error:'Formulario no disponible.'});
    const evaluacion=JSON.parse(a.d.evaluacion||'{}'),intentos=db.prepare('SELECT COUNT(*) AS n FROM formularios_nexo_respuestas WHERE documento_id=? AND autor_id=?').get(a.d.id,a.u.id).n;
    if(evaluacion.intentosMaximos&&intentos>=evaluacion.intentosMaximos)return res.status(409).json({error:'Alcanzaste el máximo de intentos de este formulario.'});
    const preguntas=JSON.parse(a.d.contenido).filter(b=>b.tipo==='pregunta');const respuestas=req.body?.respuestas;
    if(!respuestas||typeof respuestas!=='object'||Array.isArray(respuestas)||JSON.stringify(respuestas).length>50000)return res.status(400).json({error:'Respuestas inválidas.'});
    const porId=new Map(preguntas.map(p=>[p.id,p]));
    if(Object.keys(respuestas).some(id=>!porId.has(id)))return res.status(400).json({error:'Hay respuestas para preguntas que no pertenecen al formulario.'});
    const visibles=new Set(),limpias={};
    for(const p of preguntas){
      if(p.visibleSi){const condicion=porId.get(p.visibleSi.id);if(!condicion)return res.status(400).json({error:'Condición de formulario inválida.'});
        if(!visibles.has(condicion.id))continue;
        const coincide=String(respuestas[condicion.id]??'')===p.visibleSi.valor;
        if(p.visibleSi.operador==='igual'&&!coincide||p.visibleSi.operador==='distinto'&&coincide)continue;
      }
      visibles.add(p.id);
      const valor=respuestas[p.id];if(p.obligatoria && (valor==null||valor===''||Array.isArray(valor)&&!valor.length))return res.status(400).json({error:`Falta ${p.texto||p.id}.`});
      if(valor!=null&&valor!==''){
        const valido=p.respuesta==='numero'?typeof valor==='number'&&Number.isFinite(valor):p.respuesta==='multiple'?Array.isArray(valor)&&new Set(valor).size===valor.length&&valor.every(v=>p.opciones.includes(v)):
          p.respuesta==='seleccion'?typeof valor==='string'&&p.opciones.includes(valor):p.respuesta==='fecha'?typeof valor==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(valor)&&Number.isFinite(Date.parse(`${valor}T00:00:00Z`))&&new Date(`${valor}T00:00:00Z`).toISOString().slice(0,10)===valor:typeof valor==='string'&&valor.length<=10000;
        if(!valido)return res.status(400).json({error:`Respuesta inválida: ${p.texto||p.id}.`});
      }
      if(valor!==undefined)limpias[p.id]=valor;
    }
    const detalle=preguntas.filter(p=>visibles.has(p.id)&&p.correcta!==undefined).map(p=>({bloqueId:p.id,pregunta:p.texto,correcto:igualRespuesta(limpias[p.id],p.correcta),puntos:igualRespuesta(limpias[p.id],p.correcta)?(p.puntos??1):0,maximo:p.puntos??1,devolucion:p.devolucion||'',...(evaluacion.mostrarSoluciones||evaluacion.intentosMaximos&&intentos+1>=evaluacion.intentosMaximos?{solucion:p.correcta}:{})}));
    const maximo=detalle.reduce((n,p)=>n+p.maximo,0),puntaje=detalle.reduce((n,p)=>n+p.puntos,0),porcentaje=maximo?Math.round(puntaje/maximo*10000)/100:null;
    const resultado={intento:intentos+1,version:a.d.version,puntaje,maximo,porcentaje,aprobado:porcentaje===null?null:porcentaje>=(evaluacion.aprobacion??60),detalle};
    const id=db.prepare('INSERT INTO formularios_nexo_respuestas(documento_id,autor_id,respuestas,resultado,version_documento) VALUES(?,?,?,?,?)').run(a.d.id,a.u.id,JSON.stringify(limpias),JSON.stringify(resultado),a.d.version).lastInsertRowid;
    res.status(201).json({id:String(id),resultado});
  }));
  const respuestaDto=r=>({...r,respuestas:JSON.parse(r.respuestas),resultado:JSON.parse(r.resultado||'{}')});
  app.get('/api/documentos/:id/respuestas',ventanilla((req,res)=>{const a=actual(req,res,true);if(a)res.json({respuestas:db.prepare('SELECT id,autor_id AS autorId,respuestas,resultado,enviado_en AS enviadoEn FROM formularios_nexo_respuestas WHERE documento_id=? ORDER BY id DESC').all(a.d.id).map(respuestaDto)});}));
  app.get('/api/documentos/:id/mis-respuestas',ventanilla((req,res)=>{const a=actual(req,res);if(a)res.json({respuestas:db.prepare('SELECT id,respuestas,resultado,enviado_en AS enviadoEn FROM formularios_nexo_respuestas WHERE documento_id=? AND autor_id=? ORDER BY id DESC').all(a.d.id,a.u.id).map(respuestaDto)});}));
}
