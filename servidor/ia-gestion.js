import { exigirSesion, ventanilla } from './comun.js';

// Las descargas envían únicamente el nombre del modelo al Ollama privado.
// Nunca reciben mensajes, fuentes ni datos académicos.
export function registrarGestionIA(app, db, { validarOrigen, modeloAdmitido, leerBase }) {
  db.exec(`CREATE TABLE IF NOT EXISTS ia_privada_config (
    institucion_id INTEGER PRIMARY KEY REFERENCES instituciones(id), origen TEXT NOT NULL,
    modelo TEXT NOT NULL, activa INTEGER NOT NULL DEFAULT 1, version INTEGER NOT NULL DEFAULT 1);`);
  const trabajos = new Map();
  const fila = id => db.prepare('SELECT * FROM ia_privada_config WHERE institucion_id=?').get(id);
  const valores = id => fila(id) || {origen:process.env.NEXO_IA_URL?.trim() || 'http://127.0.0.1:11434',modelo:process.env.NEXO_IA_MODELO?.trim() || 'llama3.2',activa:1,version:0};
  const permiso = (req,res) => {
    const u=exigirSesion(db,req,res);if(!u)return;
    if(!['admin-academico','administrador'].includes(u.rol)){res.status(403).json({error:'La configuración de modelos corresponde a la dirección.'});return;}
    return u;
  };
  app.get('/api/ia-privada/configuracion',ventanilla((req,res)=>{const u=permiso(req,res);if(u)res.json(valores(u.institucionId));}));
  app.put('/api/ia-privada/configuracion',ventanilla(async(req,res)=>{
    const u=permiso(req,res);if(!u)return;
    const {origen,modelo,activa,version}=req.body??{};
    if(typeof origen!=='string'||origen.length>250||!modeloAdmitido(modelo)||typeof activa!=='boolean')return res.status(400).json({error:'Indicá un origen privado, un modelo local y el estado del servicio.'});
    let normalizado;try{normalizado=await validarOrigen(origen);}catch(e){return res.status(400).json({error:e.message});}
    const actual=valores(u.institucionId);
    if(version!==actual.version)return res.status(409).json({error:'La configuración cambió. Recargala antes de guardar.'});
    db.prepare(`INSERT INTO ia_privada_config(institucion_id,origen,modelo,activa,version) VALUES(?,?,?,?,1)
      ON CONFLICT(institucion_id) DO UPDATE SET origen=excluded.origen,modelo=excluded.modelo,activa=excluded.activa,version=ia_privada_config.version+1`).run(u.institucionId,normalizado,modelo,Number(activa));
    res.json(valores(u.institucionId));
  }));
  app.get('/api/ia-privada/descarga',ventanilla((req,res)=>{const u=permiso(req,res);if(!u)return;const t=trabajos.get(u.institucionId);res.json(t?{modelo:t.modelo,estado:t.estado,detalle:t.detalle,total:t.total,completado:t.completado}: {estado:'sin-descarga'});}));
  app.post('/api/ia-privada/descarga',ventanilla(async(req,res)=>{
    const u=permiso(req,res);if(!u)return;
    const modelo=req.body?.modelo;
    if(!modeloAdmitido(modelo))return res.status(400).json({error:'Elegí un identificador de modelo local válido.'});
    let origen;try{origen=await validarOrigen(valores(u.institucionId).origen);}catch(e){return res.status(400).json({error:e.message});}
    const previo=trabajos.get(u.institucionId);
    if(previo?.estado==='descargando')return res.status(409).json({error:'Ya hay una descarga en curso.'});
    const t={modelo,estado:'descargando',detalle:'Iniciando descarga',total:0,completado:0,controller:new AbortController()};trabajos.set(u.institucionId,t);
    res.status(202).json({estado:t.estado,modelo});
    void (async()=>{
      const timeout=setTimeout(()=>t.controller.abort(),3600000);timeout.unref?.();
      try {
        const r=await fetch(origen+'/api/pull',{method:'POST',redirect:'error',signal:t.controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({model:modelo,stream:true})});
        if(!r.ok||!r.body)throw new Error('El servicio privado no pudo descargar el modelo.');
        const lector=r.body.getReader(),decoder=new TextDecoder();let pendiente='';let exito=false;
        const registrar=linea=>{if(!linea.trim())return;const d=JSON.parse(linea);if(d.error)throw new Error(String(d.error));t.detalle=String(d.status||'Descargando').slice(0,300);if(Number.isFinite(d.total))t.total=d.total;if(Number.isFinite(d.completed))t.completado=d.completed;if(d.status==='success')exito=true;};
        while(true){const {value,done}=await lector.read();if(done)break;pendiente+=decoder.decode(value,{stream:true});if(pendiente.length>1024*1024)throw new Error('Respuesta de descarga demasiado grande.');const lineas=pendiente.split('\n');pendiente=lineas.pop()||'';for(const linea of lineas)registrar(linea);}
        pendiente+=decoder.decode();registrar(pendiente);if(!exito)throw new Error('El servicio no confirmó que la descarga haya terminado.');t.estado='completada';t.completado=t.total;
      }catch(e){t.estado=t.controller.signal.aborted?'cancelada':'error';t.detalle=t.controller.signal.aborted?'Descarga cancelada':String(e.message||'Falló la descarga').slice(0,300);}
      finally{clearTimeout(timeout);}
    })();
  }));
  app.post('/api/ia-privada/descarga/cancelar',ventanilla((req,res)=>{const u=permiso(req,res);if(!u)return;const t=trabajos.get(u.institucionId);if(t?.estado==='descargando')t.controller.abort();res.json({cancelada:!!t&&t.estado==='descargando'});}));
  return {
    get(id){const base=leerBase(id),p=fila(id);if(p&&!p.activa)return null;if(!base&&!p)return null;return {...(base||{system_prompt:'Sos un tutor educativo. Ayudá a comprender y practicar los contenidos.',temperatura:0.7}),...(p?{origen:p.origen,modelo:p.modelo}:{})};},
  };
}
