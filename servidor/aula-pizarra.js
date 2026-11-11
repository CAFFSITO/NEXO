import {ventanilla} from './comun.js';

export function registrarPermisosPizarra(app,db,{accesoAClase,mensajero,destinatariosClase}){
  db.exec(`CREATE TABLE IF NOT EXISTS clase_pizarra_config(clase_id INTEGER PRIMARY KEY REFERENCES clases_planificadas(id) ON DELETE CASCADE,modo TEXT NOT NULL DEFAULT 'docente' CHECK(modo IN('docente','todos','seleccion')),version INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS clase_pizarra_editores(clase_id INTEGER NOT NULL REFERENCES clases_planificadas(id) ON DELETE CASCADE,usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,PRIMARY KEY(clase_id,usuario_id));`);
  const config=id=>db.prepare('SELECT modo,version FROM clase_pizarra_config WHERE clase_id=?').get(id)||{modo:'docente',version:0};
  const puedeDibujar=a=>a.clase.estado!=='finalizada'&&(a.esDocente||a.clase.estado==='en-vivo'&&(config(a.clase.id).modo==='todos'||config(a.clase.id).modo==='seleccion'&&!!db.prepare('SELECT 1 FROM clase_pizarra_editores WHERE clase_id=? AND usuario_id=?').get(a.clase.id,a.usuario.id)));
  const estado=a=>{
    const c=config(a.clase.id);
    return {...c,puedeDibujar:puedeDibujar(a),...(a.esDocente?{
      editores:db.prepare('SELECT usuario_id FROM clase_pizarra_editores WHERE clase_id=?').all(a.clase.id).map(x=>String(x.usuario_id)),
      candidatos:db.prepare("SELECT u.id,u.nombre FROM inscripciones i JOIN usuarios u ON u.id=i.estudiante_id WHERE i.curso_id=? AND u.estado='activo' ORDER BY u.nombre").all(a.clase.curso_id).map(u=>({...u,id:String(u.id)})),
    }:{})};
  };
  app.get('/api/aula/clases/:id/pizarra/permisos',ventanilla((req,res)=>{const a=accesoAClase(req,res,req.params.id);if(a)res.json(estado(a));}));
  app.put('/api/aula/clases/:id/pizarra/permisos',ventanilla((req,res)=>{
    const a=accesoAClase(req,res,req.params.id);if(!a)return;
    if(!a.esDocente)return res.status(403).json({error:'Sólo el docente configura la colaboración de la pizarra.'});
    if(a.clase.estado==='finalizada')return res.status(409).json({error:'La clase ya finalizó.'});
    const {modo,editores=[],version}=req.body??{};
    if(!['docente','todos','seleccion'].includes(modo)||!Array.isArray(editores)||editores.length>2000||editores.some(x=>!Number.isSafeInteger(Number(x))||Number(x)<1))return res.status(400).json({error:'Configuración de pizarra inválida.'});
    if(config(a.clase.id).version!==version)return res.status(409).json({error:'Los permisos cambiaron. Recargá la pizarra antes de configurar.'});
    const validos=new Set(estado(a).candidatos.map(x=>Number(x.id))),ids=[...new Set(editores.map(Number))];
    if(ids.some(id=>!validos.has(id)))return res.status(400).json({error:'Los editores deben ser estudiantes activos de este curso.'});
    db.exec('BEGIN');try{
      db.prepare(`INSERT INTO clase_pizarra_config(clase_id,modo,version) VALUES(?,?,1) ON CONFLICT(clase_id) DO UPDATE SET modo=excluded.modo,version=clase_pizarra_config.version+1`).run(a.clase.id,modo);
      db.prepare('DELETE FROM clase_pizarra_editores WHERE clase_id=?').run(a.clase.id);
      if(modo==='seleccion')for(const id of ids)db.prepare('INSERT INTO clase_pizarra_editores(clase_id,usuario_id) VALUES(?,?)').run(a.clase.id,id);
      db.exec('COMMIT');
    }catch(e){db.exec('ROLLBACK');throw e;}
    mensajero.emitirAVarios(destinatariosClase(a.clase),{tipo:'aula-pizarra-permisos',claseId:String(a.clase.id)});
    res.json(estado(a));
  }));
  return {puedeDibujar};
}
