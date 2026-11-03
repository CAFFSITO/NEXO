// Conexiones externas optativas. Nunca intervienen en la IA privada de NEXO.
// Los secretos sólo se guardan cifrados y las peticiones salen a hosts fijos.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { exigirSesion } from './comun.js';
import { convertirDocs, convertirForms, convertirNotion } from './conectores-conversion.js';
import { idExportacion, uuidExportacion, eventoCalendar, tareaTodoist, camposCalendar, camposTodoist, huellaCampos, enviarComandoTodoist } from './conectores-exportacion.js';

const SERVICIOS = Object.freeze({
  drive: { proveedor: 'google', capacidad: 'archivos y metadatos' },
  docs: { proveedor: 'google', capacidad: 'documentos' },
  forms: { proveedor: 'google', capacidad: 'formularios' },
  gmail: { proveedor: 'google', capacidad: 'correo' },
  calendar: { proveedor: 'google', capacidad: 'eventos' },
  meet: { proveedor: 'google', capacidad: 'reuniones' },
  classroom: { proveedor: 'google', capacidad: 'cursos y tareas' },
  notion: { proveedor: 'notion', capacidad: 'páginas' },
  todoist: { proveedor: 'todoist', capacidad: 'tareas' },
  whatsapp: { proveedor: 'whatsapp', capacidad: 'mensajería empresarial' },
});
const SCOPES_GOOGLE = Object.freeze({
  drive: 'https://www.googleapis.com/auth/drive.metadata.readonly',
  docs: 'https://www.googleapis.com/auth/documents.readonly',
  forms: 'https://www.googleapis.com/auth/forms.body.readonly',
  gmail: 'https://www.googleapis.com/auth/gmail.readonly',
  calendar: 'https://www.googleapis.com/auth/calendar.events',
  meet: 'https://www.googleapis.com/auth/meetings.space.readonly',
  classroom: 'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me.readonly',
});
const LIMITE = 100;
const clave = () => {
  const raw = process.env.NEXO_CONECTORES_KEY;
  if (!raw) return null;
  const b = Buffer.from(raw, 'base64');
  return b.length === 32 ? b : null;
};
function cifrar(valor) {
  const k = clave(); if (!k) throw new Error('Falta NEXO_CONECTORES_KEY (32 bytes en base64).');
  const iv = randomBytes(12), c = createCipheriv('aes-256-gcm', k, iv);
  const datos = Buffer.concat([c.update(valor, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), datos].map(x => x.toString('base64url')).join('.');
}
function descifrar(valor) {
  const k = clave(); if (!k) throw new Error('Falta NEXO_CONECTORES_KEY.');
  const [a,b,d] = String(valor).split('.');
  const c = createDecipheriv('aes-256-gcm', k, Buffer.from(a,'base64url'));
  c.setAuthTag(Buffer.from(b,'base64url'));
  return Buffer.concat([c.update(Buffer.from(d,'base64url')), c.final()]).toString('utf8');
}
const hash = x => createHash('sha256').update(x).digest('hex');
const tieneAmbitos=(c,servicio)=>SCOPES_GOOGLE[servicio].split(' ').every(s=>c.alcances.split(' ').includes(s));
const parametro = (v, max=200) => typeof v === 'string' && v.length > 0 && v.length <= max ? v : null;
const fallo = (res, estado, mensaje) => res.status(estado).json({ error: mensaje });

async function remoto(url, token, { method='GET', body, form, headers={} }={}) {
  // URL la arma exclusivamente un adaptador de abajo; jamás recibe un host del cliente.
  const permitidos = ['www.googleapis.com','docs.googleapis.com','forms.googleapis.com','gmail.googleapis.com','classroom.googleapis.com','meet.googleapis.com','api.notion.com','api.todoist.com'];
  if (!permitidos.includes(new URL(url).hostname)) throw new Error('Host externo no permitido.');
  for (let intento=0; intento<3; intento++) {
    const r = await fetch(url, { method, redirect:'error', signal:AbortSignal.timeout(10000),
      headers: { Authorization:`Bearer ${token}`, Accept:'application/json', ...headers },
      ...(form ? {body:new URLSearchParams(form)} : body ? {body:JSON.stringify(body)} : {}) });
    if ((r.status===429 || r.status>=500) && intento<2) {
      const espera = Math.min(1500, Number(r.headers.get('retry-after'))*1000 || 250*(intento+1));
      await new Promise(resolve=>setTimeout(resolve,espera)); continue;
    }
    if (!r.ok) { const e=new Error(`API externa respondió ${r.status}.`); e.estado=r.status; throw e; }
    return r.json();
  }
}
function url(base, params={}) { const u=new URL(base); for(const [k,v] of Object.entries(params)) if(v!==undefined && v!==null && v!=='')u.searchParams.set(k,String(v)); return u.toString(); }
async function listar(servicio, token, cursor, contexto) {
  switch (servicio) {
    case 'drive': { const d=await remoto(url('https://www.googleapis.com/drive/v3/files',{q:'trashed = false',fields:'nextPageToken,files(id,name,mimeType,modifiedTime,webViewLink,description)',pageSize:LIMITE,pageToken:cursor}),token); return {items:d.files||[],cursor:d.nextPageToken||null}; }
    case 'gmail': { const d=await remoto(url('https://gmail.googleapis.com/gmail/v1/users/me/messages',{maxResults:25,pageToken:cursor}),token);
      const items=await Promise.all((d.messages||[]).map(async m=>{
        const x=await remoto(url(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(m.id)}`,{format:'metadata',metadataHeaders:'Subject'}),token);
        return {id:m.id,threadId:m.threadId,subject:x.payload?.headers?.find(h=>h.name?.toLowerCase()==='subject')?.value||'(sin asunto)',snippet:x.snippet||'',internalDate:x.internalDate};
      }));return {items,cursor:d.nextPageToken||null}; }
    case 'calendar': { const d=await remoto(url('https://www.googleapis.com/calendar/v3/calendars/primary/events',{maxResults:LIMITE,pageToken:cursor,singleEvents:true,orderBy:'startTime',timeMin:new Date(Date.now()-30*86400000).toISOString()}),token); return {items:d.items||[],cursor:d.nextPageToken||null}; }
    case 'classroom': { const cursoId=parametro(contexto.cursoId,100);
      if(cursoId){const d=await remoto(url(`https://classroom.googleapis.com/v1/courses/${encodeURIComponent(cursoId)}/courseWork`,{pageSize:LIMITE,pageToken:cursor}),token);return {items:(d.courseWork||[]).map(x=>({...x,_nexoCursoId:cursoId})),cursor:d.nextPageToken||null};}
      const d=await remoto(url('https://classroom.googleapis.com/v1/courses',{pageSize:LIMITE,pageToken:cursor}),token); return {items:d.courses||[],cursor:d.nextPageToken||null}; }
    case 'notion': { const d=await remoto('https://api.notion.com/v1/search',token,{method:'POST',body:{page_size:LIMITE,...(cursor?{start_cursor:cursor}:{})},headers:{'Content-Type':'application/json','Notion-Version':'2022-06-28'}}); return {items:d.results||[],cursor:d.next_cursor||null}; }
    case 'todoist': { const d=await remoto(url('https://api.todoist.com/api/v1/tasks',{limit:LIMITE,cursor}),token); return {items:d.results||[],cursor:d.next_cursor||null}; }
    case 'docs': { const id=parametro(contexto.id,200); if(!id) throw new Error('Indicá el ID del documento.'); const d=await remoto(`https://docs.googleapis.com/v1/documents/${encodeURIComponent(id)}`,token); return {items:[d],cursor:null}; }
    case 'forms': { const id=parametro(contexto.id,200); if(!id) throw new Error('Indicá el ID del formulario.'); const d=await remoto(`https://forms.googleapis.com/v1/forms/${encodeURIComponent(id)}`,token); return {items:[d],cursor:null}; }
    case 'meet': { const id=parametro(contexto.id,200); if(!id||!/^([a-zA-Z0-9_-]+|spaces\/[a-zA-Z0-9_-]+)$/.test(id)) throw new Error('Indicá el ID o código de reunión.'); const d=await remoto(`https://meet.googleapis.com/v2/${id.startsWith('spaces/')?id:`spaces/${id}`}`,token); return {items:[d],cursor:null}; }
    default: throw new Error('Este servicio aún no ofrece una lectura implementada.');
  }
}
function idExterno(servicio,item) { return String(servicio==='classroom'&&item._nexoCursoId?`${item._nexoCursoId}:${item.id}`:item.id ?? item.formId ?? item.documentId ?? item.name ?? item.object_id ?? ''); }
function resumen(servicio,item) {
  const enlaceBruto=item.webViewLink ?? item.htmlLink ?? item.url ?? item.meetingUri ?? null;
  let enlace=null;try{const u=new URL(enlaceBruto);if(u.protocol==='https:')enlace=u.toString();}catch{}
  return { id:idExterno(servicio,item), titulo:String(item.title?.[0]?.plain_text ?? item.title ?? item.info?.title ?? item.subject ?? item.summary ?? item.name ?? item.content ?? item.id ?? '').slice(0,240),
    actualizadoEn:item.modifiedTime ?? item.last_edited_time ?? item.updated ?? item.updated_at ?? null,
    enlace };
}
function errorExterno(res,e) {
  if(e.estado===401 || e.estado===403)return fallo(res,502,'La cuenta externa rechazó el acceso o requiere permisos adicionales.');
  if(e.estado===429)return fallo(res,503,'El servicio externo limitó los pedidos. Reintentá más tarde.');
  if(e.estado===404)return fallo(res,404,'El recurso externo no existe o no está compartido.');
  if(e.estado)return fallo(res,502,`El servicio externo respondió ${e.estado}.`);
  if(e.name==='TimeoutError')return fallo(res,504,'El servicio externo tardó demasiado.');
  return fallo(res,400,e.message||'No fue posible consultar el servicio externo.');
}

export function registrarConectores(app,db) {
  db.exec(`CREATE TABLE IF NOT EXISTS conector_cuentas (
    id INTEGER PRIMARY KEY, institucion_id INTEGER NOT NULL REFERENCES instituciones(id), usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    proveedor TEXT NOT NULL, secreto TEXT NOT NULL, refresh TEXT, vence_en TEXT, alcances TEXT NOT NULL DEFAULT '',
    nombre TEXT NOT NULL DEFAULT '', creado_en TEXT NOT NULL DEFAULT (datetime('now')), actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(institucion_id,usuario_id,proveedor));
  CREATE TABLE IF NOT EXISTS conector_estados_oauth (
    estado_hash TEXT PRIMARY KEY, institucion_id INTEGER NOT NULL, usuario_id INTEGER NOT NULL, servicio TEXT NOT NULL,
    vence_en INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS conector_elementos (
    id INTEGER PRIMARY KEY, cuenta_id INTEGER NOT NULL REFERENCES conector_cuentas(id) ON DELETE CASCADE,
    servicio TEXT NOT NULL, externo_id TEXT NOT NULL, huella TEXT NOT NULL, resumen TEXT NOT NULL,
    nativo_tipo TEXT, nativo_id INTEGER, visto_en TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(cuenta_id,servicio,externo_id));
  CREATE INDEX IF NOT EXISTS idx_conector_elementos_cuenta ON conector_elementos(cuenta_id,servicio);
  CREATE TABLE IF NOT EXISTS conector_exportaciones (
    id INTEGER PRIMARY KEY, cuenta_id INTEGER NOT NULL REFERENCES conector_cuentas(id) ON DELETE CASCADE,
    servicio TEXT NOT NULL, nativo_tipo TEXT NOT NULL, nativo_id INTEGER NOT NULL,
    externo_id TEXT, huella_nativa TEXT, huella_remota TEXT,
    creado_en TEXT NOT NULL DEFAULT (datetime('now')), actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(cuenta_id,servicio,nativo_tipo,nativo_id));`);
  function cuenta(u,servicio) { return db.prepare('SELECT * FROM conector_cuentas WHERE institucion_id=? AND usuario_id=? AND proveedor=?').get(u.institucionId,u.id,SERVICIOS[servicio].proveedor); }
  const requiereClave=(res)=>clave()?true:(fallo(res,503,'Configurá NEXO_CONECTORES_KEY para habilitar conexiones cifradas.'),false);

  app.get('/api/conectores/catalogo',(req,res)=>{ const u=exigirSesion(db,req,res);if(!u)return;
    res.json({servicios:Object.entries(SERVICIOS).map(([id,s])=>{const c=cuenta(u,id);return {id,...s,conectado:!!c&&(s.proveedor!=='google'||tieneAmbitos(c,id)),lectura:id!=='whatsapp',exportacionNativa:id==='calendar'||id==='todoist'&&u.rol==='estudiante',importacionNativa:['calendar','drive','docs','forms','meet','notion'].includes(id)||id==='todoist'&&u.rol==='estudiante'||id==='classroom'&&u.rol==='profesor'};})}); });
  app.get('/api/conectores/cuentas',(req,res)=>{const u=exigirSesion(db,req,res);if(!u)return;
    res.json({cuentas:db.prepare('SELECT id,proveedor,nombre,alcances,creado_en AS creadoEn,actualizado_en AS actualizadoEn FROM conector_cuentas WHERE institucion_id=? AND usuario_id=?').all(u.institucionId,u.id)});});
  // Notion admite secretos de integración interna; Todoist, token personal.
  // WhatsApp Business requiere webhooks: no se acepta un token que aún no se usaría.
  app.post('/api/conectores/cuentas',(req,res)=>{const u=exigirSesion(db,req,res);if(!u||!requiereClave(res))return;
    const {proveedor,token,nombre=''}=req.body??{};
    if(!['notion','todoist'].includes(proveedor)||!parametro(token,4000)||typeof nombre!=='string'||nombre.length>100)return fallo(res,400,'Cuenta, token o nombre inválido.');
    db.prepare(`INSERT INTO conector_cuentas(institucion_id,usuario_id,proveedor,secreto,nombre) VALUES(?,?,?,?,?)
      ON CONFLICT(institucion_id,usuario_id,proveedor) DO UPDATE SET secreto=excluded.secreto,nombre=excluded.nombre,actualizado_en=datetime('now')`).run(u.institucionId,u.id,proveedor,cifrar(token),nombre);
    res.status(201).json({proveedor,conectado:true}); });
  app.delete('/api/conectores/cuentas/:proveedor',(req,res)=>{const u=exigirSesion(db,req,res);if(!u)return;
    if(!['google','notion','todoist','whatsapp'].includes(req.params.proveedor))return fallo(res,400,'Proveedor inválido.');
    const c=db.prepare('SELECT id FROM conector_cuentas WHERE institucion_id=? AND usuario_id=? AND proveedor=?').get(u.institucionId,u.id,req.params.proveedor);
    if(c)db.prepare('DELETE FROM conector_cuentas WHERE id=?').run(c.id);res.json({desconectado:true});});
  app.get('/api/conectores/google/autorizar',(req,res)=>{const u=exigirSesion(db,req,res);if(!u||!requiereClave(res))return;
    const servicio=req.query.servicio, clientId=process.env.NEXO_GOOGLE_CLIENT_ID, redirect=process.env.NEXO_GOOGLE_REDIRECT_URI;
    if(!SCOPES_GOOGLE[servicio])return fallo(res,400,'Servicio Google inválido.');
    if(!clientId||!process.env.NEXO_GOOGLE_CLIENT_SECRET||!redirect)return fallo(res,503,'Configurá credenciales OAuth de Google.');
    const estado=randomBytes(32).toString('base64url');
    db.prepare('INSERT INTO conector_estados_oauth(estado_hash,institucion_id,usuario_id,servicio,vence_en) VALUES(?,?,?,?,?)').run(hash(estado),u.institucionId,u.id,servicio,Date.now()+600000);
    res.json({url:url('https://accounts.google.com/o/oauth2/v2/auth',{client_id:clientId,redirect_uri:redirect,response_type:'code',scope:SCOPES_GOOGLE[servicio],access_type:'offline',include_granted_scopes:'true',state:estado,prompt:'consent'})}); });
  app.get('/api/conectores/google/callback',async(req,res)=>{
    const estado=parametro(req.query.state,200),code=parametro(req.query.code,2000);
    if(!estado||!code)return fallo(res,400,'Autorización incompleta.');
    const fila=db.prepare('SELECT * FROM conector_estados_oauth WHERE estado_hash=?').get(hash(estado));
    if(!fila||fila.vence_en<Date.now())return fallo(res,400,'Estado OAuth inválido o vencido.');
    db.prepare('DELETE FROM conector_estados_oauth WHERE estado_hash=?').run(hash(estado));
    if(!requiereClave(res))return;
    try { const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:process.env.NEXO_GOOGLE_CLIENT_ID,client_secret:process.env.NEXO_GOOGLE_CLIENT_SECRET,redirect_uri:process.env.NEXO_GOOGLE_REDIRECT_URI,grant_type:'authorization_code'})});
      if(!r.ok)return fallo(res,502,'Google rechazó el código de autorización.');const t=await r.json();if(!t.access_token)return fallo(res,502,'Google no entregó un token.');
      const anterior=db.prepare('SELECT refresh,alcances FROM conector_cuentas WHERE institucion_id=? AND usuario_id=? AND proveedor=?').get(fila.institucion_id,fila.usuario_id,'google');
      const refresh=t.refresh_token?cifrar(t.refresh_token):anterior?.refresh??null;
      const alcances=[...new Set([...(anterior?.alcances||'').split(' ').filter(Boolean),...(t.scope||SCOPES_GOOGLE[fila.servicio]).split(' ')])].join(' ');
      db.prepare(`INSERT INTO conector_cuentas(institucion_id,usuario_id,proveedor,secreto,refresh,vence_en,alcances) VALUES(?,?,?,?,?,?,?)
        ON CONFLICT(institucion_id,usuario_id,proveedor) DO UPDATE SET secreto=excluded.secreto,refresh=excluded.refresh,vence_en=excluded.vence_en,alcances=excluded.alcances,actualizado_en=datetime('now')`).run(fila.institucion_id,fila.usuario_id,'google',cifrar(t.access_token),refresh,new Date(Date.now()+(t.expires_in||3600)*1000).toISOString(),alcances);
      res.redirect(303, '/configuracion?conexion=google');
    } catch(e) {errorExterno(res,e);} });
  async function tokenActivo(c) { if(c.proveedor!=='google'||!c.vence_en||Date.parse(c.vence_en)>Date.now()+60000)return descifrar(c.secreto);
    if(!c.refresh)throw new Error('La autorización Google venció. Volvé a conectarla.');
    const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:process.env.NEXO_GOOGLE_CLIENT_ID,client_secret:process.env.NEXO_GOOGLE_CLIENT_SECRET,refresh_token:descifrar(c.refresh),grant_type:'refresh_token'})});
    if(!r.ok)throw new Error('No se pudo renovar la autorización Google.');const t=await r.json();
    db.prepare("UPDATE conector_cuentas SET secreto=?,vence_en=?,actualizado_en=datetime('now') WHERE id=?").run(cifrar(t.access_token),new Date(Date.now()+(t.expires_in||3600)*1000).toISOString(),c.id);return t.access_token; }
  app.get('/api/conectores/gmail/mensajes/:id',async(req,res)=>{
    const u=exigirSesion(db,req,res);if(!u)return;
    const c=cuenta(u,'gmail'),mensajeId=parametro(req.params.id,200);
    if(!c||!tieneAmbitos(c,'gmail'))return fallo(res,403,'Conectá y autorizá Gmail.');
    if(!mensajeId||!/^[A-Za-z0-9_-]+$/.test(mensajeId))return fallo(res,400,'ID de correo inválido.');
    if(!db.prepare("SELECT 1 FROM conector_elementos WHERE cuenta_id=? AND servicio='gmail' AND externo_id=?").get(c.id,mensajeId))return fallo(res,404,'Primero sincronizá este correo.');
    try {
      const m=await remoto(url(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(mensajeId)}`,{format:'full'}),await tokenActivo(c));
      const cabecera=(nombre)=>String(m.payload?.headers?.find(h=>h.name?.toLowerCase()===nombre)?.value||'').slice(0,500);
      const partes=[];const recorrer=p=>{if(p?.mimeType==='text/plain'&&p.body?.data)partes.push(p.body.data);for(const hijo of p?.parts||[])recorrer(hijo);};recorrer(m.payload);
      const texto=partes.map(p=>Buffer.from(p,'base64url').toString('utf8')).join('\n').slice(0,100000)||String(m.snippet||'').slice(0,100000);
      res.set('Cache-Control','no-store');
      res.json({id:mensajeId,asunto:cabecera('subject')||'(sin asunto)',remitente:cabecera('from'),fecha:cabecera('date'),texto});
    }catch(e){errorExterno(res,e);}
  });
  app.post('/api/conectores/:servicio/sincronizar',async(req,res)=>{const u=exigirSesion(db,req,res);if(!u)return;
    const servicio=req.params.servicio;if(!SERVICIOS[servicio])return fallo(res,404,'Servicio desconocido.');
    if(servicio==='whatsapp')return fallo(res,501,'WhatsApp Cloud API no ofrece una lista histórica equivalente; requiere webhooks y cuenta Business.');
    const c=cuenta(u,servicio);if(!c)return fallo(res,409,'Conectá tu cuenta antes de sincronizar.');
    if(c.proveedor==='google'&&!tieneAmbitos(c,servicio))return fallo(res,403,'Autorizá este servicio Google por separado.');
    try {const datos=await listar(servicio,await tokenActivo(c),parametro(req.body?.cursor,1000),{id:req.body?.id,cursoId:req.body?.cursoId});let nuevos=0,cambios=0;
      const guardar=db.prepare(`INSERT INTO conector_elementos(cuenta_id,servicio,externo_id,huella,resumen) VALUES(?,?,?,?,?)
        ON CONFLICT(cuenta_id,servicio,externo_id) DO UPDATE SET huella=excluded.huella,resumen=excluded.resumen,visto_en=datetime('now')`);
      db.exec('BEGIN IMMEDIATE');try {for(const item of datos.items){const id=idExterno(servicio,item);if(!id)continue;const r=resumen(servicio,item),huella=hash(JSON.stringify(item));
        const previo=db.prepare('SELECT huella FROM conector_elementos WHERE cuenta_id=? AND servicio=? AND externo_id=?').get(c.id,servicio,id);
        if(!previo)nuevos++;else if(previo.huella!==huella)cambios++;guardar.run(c.id,servicio,id,huella,JSON.stringify(r));}db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
      res.json({servicio,recibidos:datos.items.length,nuevos,cambios,cursor:datos.cursor,importacionAutomatica:false});
    }catch(e){errorExterno(res,e);} });
  app.get('/api/conectores/:servicio/elementos',(req,res)=>{const u=exigirSesion(db,req,res);if(!u)return;const servicio=req.params.servicio;
    if(!SERVICIOS[servicio])return fallo(res,404,'Servicio desconocido.');const c=cuenta(u,servicio);if(!c)return fallo(res,409,'Conectá tu cuenta.');
    res.json({elementos:db.prepare('SELECT externo_id AS externoId,resumen,nativo_tipo AS nativoTipo,nativo_id AS nativoId,visto_en AS vistoEn FROM conector_elementos WHERE cuenta_id=? AND servicio=? ORDER BY visto_en DESC,id DESC LIMIT 200').all(c.id,servicio).map(x=>({...x,resumen:JSON.parse(x.resumen)}))}); });
  app.get('/api/conectores/:servicio/exportables',(req,res)=>{const u=exigirSesion(db,req,res);if(!u)return;const servicio=req.params.servicio;
    if(!['calendar','todoist'].includes(servicio))return fallo(res,404,'Servicio sin exportación nativa.');
    if(servicio==='todoist'&&u.rol!=='estudiante')return fallo(res,403,'Sólo se exportan tareas personales de estudiantes.');
    const c=cuenta(u,servicio);if(!c||c.proveedor==='google'&&!tieneAmbitos(c,servicio))return fallo(res,409,'Conectá y autorizá este servicio.');
    const sql=servicio==='calendar'
      ? `SELECT e.id,e.titulo,e.fecha,e.fecha_fin AS fechaFin,x.externo_id AS externoId FROM eventos e LEFT JOIN conector_exportaciones x ON x.cuenta_id=? AND x.servicio='calendar' AND x.nativo_tipo='evento' AND x.nativo_id=e.id WHERE e.institucion_id=? AND e.creador_id=? ORDER BY e.fecha DESC,e.id DESC LIMIT 100`
      : `SELECT t.id,t.titulo,t.fecha_limite AS fechaLimite,x.externo_id AS externoId FROM tareas_personales t LEFT JOIN conector_exportaciones x ON x.cuenta_id=? AND x.servicio='todoist' AND x.nativo_tipo='tarea-personal' AND x.nativo_id=t.id WHERE t.estudiante_id=? ORDER BY t.id DESC LIMIT 100`;
    const args=servicio==='calendar'?[c.id,u.institucionId,u.id]:[c.id,u.id];res.json({elementos:db.prepare(sql).all(...args)}); });
  app.post('/api/conectores/:servicio/exportar',async(req,res)=>{const u=exigirSesion(db,req,res);if(!u)return;const servicio=req.params.servicio;
    if(!['calendar','todoist'].includes(servicio))return fallo(res,404,'Servicio sin exportación nativa.');
    if(servicio==='todoist'&&u.rol!=='estudiante')return fallo(res,403,'Sólo se exportan tareas personales de estudiantes.');
    const nativoId=Number(req.body?.id);if(!Number.isSafeInteger(nativoId)||nativoId<1)return fallo(res,400,'ID nativo inválido.');
    const c=cuenta(u,servicio);if(!c)return fallo(res,409,'Conectá tu cuenta.');
    if(c.proveedor==='google'&&!tieneAmbitos(c,servicio))return fallo(res,403,'Reautorizá Calendar para permitir exportación.');
    const nativo=servicio==='calendar'
      ? db.prepare('SELECT * FROM eventos WHERE id=? AND institucion_id=? AND creador_id=?').get(nativoId,u.institucionId,u.id)
      : db.prepare('SELECT * FROM tareas_personales WHERE id=? AND estudiante_id=?').get(nativoId,u.id);
    if(!nativo)return fallo(res,404,'El elemento no existe o no es propio.');
    const tipo=servicio==='calendar'?'evento':'tarea-personal';
    const previo=db.prepare('SELECT * FROM conector_exportaciones WHERE cuenta_id=? AND servicio=? AND nativo_tipo=? AND nativo_id=?').get(c.id,servicio,tipo,nativoId);
    try {
      const token=await tokenActivo(c), externoDeterminista=idExportacion(c.id,tipo,nativoId);
      const payload=servicio==='calendar'?eventoCalendar(nativo,externoDeterminista,req.body?.zonaHoraria):tareaTodoist(nativo);
      const campos=servicio==='calendar'?camposCalendar:camposTodoist;
      const huellaNativa=huellaCampos(campos(payload));
      if(previo?.externo_id && previo.huella_nativa===huellaNativa)return res.json({externoId:previo.externo_id,estado:'sin-cambios'});
      let remotoActual=null, externoId=previo?.externo_id||null;
      if(servicio==='calendar') {
        const base='https://www.googleapis.com/calendar/v3/calendars/primary/events';
        if(externoId) {
          remotoActual=await remoto(`${base}/${encodeURIComponent(externoId)}`,token);
          if(remotoActual.extendedProperties?.private?.nexoExportId!==externoDeterminista)return fallo(res,409,'El evento externo no pertenece a esta exportación.');
          if(previo.huella_remota && huellaCampos(campos(remotoActual))!==previo.huella_remota)return fallo(res,409,'Calendar cambió este evento. Revisalo antes de volver a exportar.');
          remotoActual=await remoto(`${base}/${encodeURIComponent(externoId)}`,token,{method:'PATCH',body:payload,headers:{'Content-Type':'application/json','If-Match':remotoActual.etag}});
        } else {
          try {remotoActual=await remoto(base,token,{method:'POST',body:payload,headers:{'Content-Type':'application/json'}});}
          catch(e){if(e.estado!==409)throw e;remotoActual=await remoto(`${base}/${externoDeterminista}`,token);
            if(remotoActual.extendedProperties?.private?.nexoExportId!==externoDeterminista)return fallo(res,409,'Existe un evento externo con el mismo identificador.');}
          externoId=remotoActual.id;
        }
      } else {
        const base='https://api.todoist.com/api/v1';
        if(externoId){
          remotoActual=await remoto(`${base}/tasks/${encodeURIComponent(externoId)}`,token);
          if(previo.huella_remota && huellaCampos(campos(remotoActual))!==previo.huella_remota)return fallo(res,409,'Todoist cambió esta tarea. Revisala antes de volver a exportar.');
        }
        const uuid=uuidExportacion(c.id,tipo,nativoId,externoId?'actualizar':'crear',externoId?huellaNativa:'');
        const tempId=uuidExportacion(c.id,tipo,nativoId,'temporal');
        const comando={type:externoId?'item_update':'item_add',uuid,...(!externoId?{temp_id:tempId}:{}),args:{...payload,...(externoId?{id:externoId,...(!payload.due?{due:null}:{})}:{})}};
        const resultado=await enviarComandoTodoist(remoto,token,comando);
        if(!externoId){externoId=resultado.temp_id_mapping?.[tempId];if(!externoId)return fallo(res,503,'Todoist aceptó el comando, pero no confirmó su ID. Reintentá con el mismo comando seguro.');}
        remotoActual=await remoto(`${base}/tasks/${encodeURIComponent(externoId)}`,token);
      }
      if(!externoId)return fallo(res,502,'El servicio externo no confirmó un ID.');
      const huellaRemota=huellaCampos(campos(remotoActual));
      db.prepare(`INSERT INTO conector_exportaciones(cuenta_id,servicio,nativo_tipo,nativo_id,externo_id,huella_nativa,huella_remota) VALUES(?,?,?,?,?,?,?)
        ON CONFLICT(cuenta_id,servicio,nativo_tipo,nativo_id) DO UPDATE SET externo_id=excluded.externo_id,huella_nativa=excluded.huella_nativa,huella_remota=excluded.huella_remota,actualizado_en=datetime('now')`).run(c.id,servicio,tipo,nativoId,externoId,huellaNativa,huellaRemota);
      res.json({externoId,estado:previo?.externo_id?'actualizado':'creado'});
    }catch(e){if(e.estado===412)return fallo(res,409,'Calendar cambió este evento durante la exportación.');errorExterno(res,e);}
  });
  app.post('/api/conectores/:servicio/importar',async(req,res)=>{const u=exigirSesion(db,req,res);if(!u)return;const servicio=req.params.servicio;
    if(!['calendar','todoist','drive','docs','forms','meet','notion','classroom'].includes(servicio))return fallo(res,501,'La importación nativa de este servicio aún no está implementada.');
    if(servicio==='todoist'&&u.rol!=='estudiante')return fallo(res,501,'Las tareas personales nativas aún están disponibles sólo para estudiantes.');
    if(servicio==='classroom'&&u.rol!=='profesor')return fallo(res,403,'La importación de trabajos de Classroom corresponde al profesor.');
    const c=cuenta(u,servicio),id=parametro(req.body?.id,300);if(!c||!id)return fallo(res,400,'Conectá la cuenta e indicá un ID sincronizado.');
    const fila=db.prepare('SELECT * FROM conector_elementos WHERE cuenta_id=? AND servicio=? AND externo_id=?').get(c.id,servicio,id);
    if(!fila)return fallo(res,404,'Primero sincronizá el elemento.');if(fila.nativo_id)return res.json({tipo:fila.nativo_tipo,id:String(fila.nativo_id),existente:true});
    try {const token=await tokenActivo(c);let dato,tipo,nativo,convertido;
      // La llamada externa ocurre antes de tomar el bloqueo de SQLite.
      if(servicio==='calendar') {dato=await remoto(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(id)}`,token);
        const inicio=dato.start?.dateTime||dato.start?.date,fin=dato.end?.dateTime||dato.end?.date;
        if(!inicio||!/^\d{4}-\d{2}-\d{2}/.test(inicio))return fallo(res,422,'El evento no tiene una fecha importable.');
        const fecha=inicio.slice(0,10),hora= dato.start?.dateTime?.slice(11,16)||null;
        // Calendar expresa el fin de un evento de día completo como día exclusivo.
        const fechaFin=fin?.slice(0,10);
        const finDia=fechaFin && !dato.end?.dateTime ? new Date(Date.parse(`${fechaFin}T00:00:00Z`)-86400000).toISOString().slice(0,10) : fechaFin;
        const finValido=finDia && finDia>=fecha ? finDia:null;
        const horaFin=dato.end?.dateTime?.slice(11,16)||null;
        dato={...dato,_fecha:fecha,_fechaFin:finValido,_hora:hora,_horaFin:horaFin&&hora&&horaFin>hora?horaFin:null};tipo='evento';
      } else if(servicio==='todoist') {dato=await remoto(`https://api.todoist.com/api/v1/tasks/${encodeURIComponent(id)}`,token);tipo='tarea-personal';}
      else if(servicio==='drive'){
        dato=await remoto(url(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}`,{fields:'id,name,mimeType,description,webViewLink,trashed'}),token);
        if(dato.trashed||!dato.webViewLink||new URL(dato.webViewLink).protocol!=='https:')return fallo(res,422,'El archivo no tiene un enlace web seguro para la biblioteca.');
        tipo='recurso';
      } else if(servicio==='docs'){
        dato=await remoto(`https://docs.googleapis.com/v1/documents/${encodeURIComponent(id)}`,token);convertido=convertirDocs(dato);tipo='documento';
      } else if(servicio==='forms'){
        dato=await remoto(`https://forms.googleapis.com/v1/forms/${encodeURIComponent(id)}`,token);convertido=convertirForms(dato);tipo='formulario';
      } else if(servicio==='notion'){
        dato=await remoto(`https://api.notion.com/v1/pages/${encodeURIComponent(id)}`,token,{headers:{'Notion-Version':'2022-06-28'}});
        const bloques=await remoto(url(`https://api.notion.com/v1/blocks/${encodeURIComponent(id)}/children`,{page_size:100}),token,{headers:{'Notion-Version':'2022-06-28'}});
        if(bloques.has_more)return fallo(res,422,'La página supera 100 bloques; esta importación no la copiaría completa.');
        convertido=convertirNotion(dato,bloques.results||[]);tipo='documento';
      } else if(servicio==='meet'){
        const nombre=id.startsWith('spaces/')?id:`spaces/${id}`;
        if(!/^spaces\/[a-zA-Z0-9_-]+$/.test(nombre))return fallo(res,400,'ID de Meet inválido.');
        dato=await remoto(`https://meet.googleapis.com/v2/${nombre}`,token);
        const fecha=parametro(req.body?.fecha,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(fecha||''))return fallo(res,400,'Indicá la fecha de la reunión en NEXO.');
        dato._fecha=fecha;tipo='evento';
      } else if(servicio==='classroom'){
        const partes=id.split(':');if(partes.length!==2||!partes.every(x=>/^[a-zA-Z0-9_-]+$/.test(x)))return fallo(res,400,'Primero sincronizá un trabajo de un curso Classroom.');
        const catedraId=Number(req.body?.catedraId);
        const catedra=db.prepare(`SELECT c.id FROM catedras c JOIN cursos cu ON cu.id=c.curso_id WHERE c.id=? AND c.profesor_id=? AND cu.institucion_id=?`).get(catedraId,u.id,u.institucionId);
        if(!catedra)return fallo(res,400,'Elegí una cátedra propia de NEXO.');
        dato=await remoto(`https://classroom.googleapis.com/v1/courses/${partes[0]}/courseWork/${partes[1]}`,token);
        if(dato.workType!=='ASSIGNMENT')return fallo(res,422,'Sólo se importan trabajos de tipo tarea.');
        const limite=dato.dueDate?`${dato.dueDate.year}-${String(dato.dueDate.month).padStart(2,'0')}-${String(dato.dueDate.day).padStart(2,'0')}`:parametro(req.body?.fechaLimite,10);
        if(!/^\d{4}-\d{2}-\d{2}$/.test(limite||''))return fallo(res,400,'El trabajo no tiene vencimiento; indicá fechaLimite.');
        dato._fechaLimite=limite;dato._catedraId=catedraId;tipo='tarea';
      }
      db.exec('BEGIN IMMEDIATE');
      try {
        const vigente=db.prepare('SELECT nativo_tipo,nativo_id FROM conector_elementos WHERE id=?').get(fila.id);
        if(vigente.nativo_id){db.exec('COMMIT');return res.json({tipo:vigente.nativo_tipo,id:String(vigente.nativo_id),existente:true});}
        if(servicio==='calendar') nativo=Number(db.prepare(`INSERT INTO eventos(institucion_id,creador_id,titulo,tipo,descripcion,enlace,fecha,fecha_fin,hora_inicio,hora_fin)
          VALUES(?,?,?,'evento',?,?,?,?,?,?)`).run(u.institucionId,u.id,String(dato.summary||'Evento importado').slice(0,200),String(dato.description||''),dato.htmlLink||null,dato._fecha,dato._fechaFin,dato._hora,dato._horaFin).lastInsertRowid);
        else if(servicio==='todoist') nativo=Number(db.prepare('INSERT INTO tareas_personales(estudiante_id,titulo,descripcion,fecha_limite) VALUES(?,?,?,?)').run(u.id,String(dato.content||'Tarea importada').slice(0,200),String(dato.description||''),dato.due?.date?.slice(0,10)||null).lastInsertRowid);
        else if(servicio==='drive'){
          nativo=Number(db.prepare(`INSERT INTO recursos(institucion_id,autor_id,titulo,descripcion,tipo,enlace_url,alcance,estado) VALUES(?,?,?,?,'enlace',?,'institucional','en-revision')`).run(u.institucionId,u.id,String(dato.name||'Archivo de Drive').slice(0,200),String(dato.description||''),dato.webViewLink).lastInsertRowid);
          db.prepare('INSERT INTO cola_revision(recurso_id,presentado_por) VALUES(?,?)').run(nativo,u.id);
        } else if(['docs','forms','notion'].includes(servicio))nativo=Number(db.prepare('INSERT INTO documentos_nexo(institucion_id,autor_id,tipo,titulo,contenido) VALUES(?,?,?,?,?)').run(u.institucionId,u.id,convertido.tipo,convertido.titulo,JSON.stringify(convertido.bloques)).lastInsertRowid);
        else if(servicio==='meet')nativo=Number(db.prepare(`INSERT INTO eventos(institucion_id,creador_id,titulo,tipo,descripcion,enlace,fecha) VALUES(?,?,'Reunión de Meet','reunion','',?,?)`).run(u.institucionId,u.id,dato.meetingUri,dato._fecha).lastInsertRowid);
        else if(servicio==='classroom')nativo=Number(db.prepare('INSERT INTO tareas(catedra_id,titulo,consigna,fecha_limite) VALUES(?,?,?,?)').run(dato._catedraId,String(dato.title||'Trabajo de Classroom').slice(0,200),String(dato.description||''),dato._fechaLimite).lastInsertRowid);
        db.prepare('UPDATE conector_elementos SET nativo_tipo=?,nativo_id=? WHERE id=?').run(tipo,nativo,fila.id);
        db.exec('COMMIT');
      } catch(e){db.exec('ROLLBACK');throw e;}
      res.status(201).json({tipo,id:String(nativo),existente:false});
    }catch(e){errorExterno(res,e);} });
}
