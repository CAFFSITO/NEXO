import { exigirAcceso, exigirSesion, ventanilla, estaInscripto } from './comun.js';

export function registrarRevisionPares(app, db) {
  db.exec(`CREATE TABLE IF NOT EXISTS revisiones_pares (
    id INTEGER PRIMARY KEY, entrega_id INTEGER NOT NULL REFERENCES entregas(id),
    revisor_id INTEGER NOT NULL REFERENCES usuarios(id), comentario TEXT,
    asignada_en TEXT NOT NULL DEFAULT (datetime('now')), respondida_en TEXT,
    UNIQUE(entrega_id,revisor_id))`);
  const entregaDe = db.prepare(`SELECT e.id,e.estudiante_id,e.equipo_id,e.anulada_en,e.tarea_id,ca.profesor_id,ca.curso_id
    FROM entregas e JOIN tareas t ON t.id=e.tarea_id JOIN catedras ca ON ca.id=t.catedra_id WHERE e.id=?`);
  const listar = db.prepare(`SELECT r.id,r.revisor_id,u.nombre AS revisor,r.comentario,r.asignada_en,r.respondida_en
    FROM revisiones_pares r JOIN usuarios u ON u.id=r.revisor_id WHERE r.entrega_id=? ORDER BY r.id`);
  app.get('/api/entregas/:id/revisiones-pares', ventanilla((req,res) => {
    const sesion=exigirSesion(db,req,res);if(!sesion)return;
    const u=exigirAcceso(db,req,res,sesion.rol==='profesor'?'gestion-tareas-profesor':'mis-tareas-estudiante');
    if(!u)return;
    const e=entregaDe.get(Number(req.params.id));
    const miembro=e?.equipo_id && db.prepare('SELECT 1 FROM tarea_equipo_miembros WHERE equipo_id=? AND estudiante_id=?').get(e.equipo_id,u.id);
    if(!e || (![e.estudiante_id,e.profesor_id].includes(u.id)&&!miembro))return res.status(404).json({error:'Entrega no disponible.'});
    res.json({revisiones:listar.all(e.id).map(r=>({id:String(r.id),revisorId:String(r.revisor_id),revisor:r.revisor,comentario:r.comentario,respondidaEn:r.respondida_en}))});
  }));
  app.post('/api/entregas/:id/revisores',ventanilla((req,res)=>{
    const u=exigirAcceso(db,req,res,'gestion-tareas-profesor');if(!u)return;
    const e=entregaDe.get(Number(req.params.id));
    if(!e||e.profesor_id!==u.id||e.anulada_en)return res.status(404).json({error:'Entrega no disponible.'});
    const revisorId=Number(req.body?.revisorId);
    const revisor=db.prepare("SELECT rol,estado FROM usuarios WHERE id=?").get(revisorId);
    const mismoEquipo=e.equipo_id && db.prepare('SELECT 1 FROM tarea_equipo_miembros WHERE equipo_id=? AND estudiante_id=?').get(e.equipo_id,revisorId);
    if(!Number.isSafeInteger(revisorId)||revisorId===e.estudiante_id||mismoEquipo||revisor?.rol!=='estudiante'||revisor.estado!=='activo'||!estaInscripto(db,revisorId,e.curso_id))return res.status(400).json({error:'Elegí otro estudiante activo del curso.'});
    db.prepare('INSERT OR IGNORE INTO revisiones_pares(entrega_id,revisor_id) VALUES(?,?)').run(e.id,revisorId);
    res.status(201).json({revisiones:listar.all(e.id).map(r=>({id:String(r.id),revisorId:String(r.revisor_id),revisor:r.revisor,comentario:r.comentario,respondidaEn:r.respondida_en}))});
  }));
  app.get('/api/revisiones-pares/pendientes',ventanilla((req,res)=>{
    const u=exigirAcceso(db,req,res,'mis-tareas-estudiante');if(!u)return;
    const filas=db.prepare(`SELECT r.id,t.titulo,e.tarea_id,r.comentario FROM revisiones_pares r
      JOIN entregas e ON e.id=r.entrega_id JOIN tareas t ON t.id=e.tarea_id
      WHERE r.revisor_id=? AND e.anulada_en IS NULL ORDER BY r.id DESC`).all(u.id);
    res.json({revisiones:filas.map(r=>({id:String(r.id),tareaId:String(r.tarea_id),titulo:r.titulo,comentario:r.comentario}))});
  }));
  app.get('/api/revisiones-pares/:id/entrega',ventanilla((req,res)=>{
    const u=exigirAcceso(db,req,res,'mis-tareas-estudiante');if(!u)return;
    const fila=db.prepare(`SELECT r.id,e.id AS entrega_id,e.comentario,t.titulo,t.consigna,ca.curso_id
      FROM revisiones_pares r JOIN entregas e ON e.id=r.entrega_id
      JOIN tareas t ON t.id=e.tarea_id JOIN catedras ca ON ca.id=t.catedra_id
      WHERE r.id=? AND r.revisor_id=? AND e.anulada_en IS NULL`).get(Number(req.params.id),u.id);
    if(!fila||!estaInscripto(db,u.id,fila.curso_id))return res.status(404).json({error:'Revisión no disponible.'});
    const archivos=db.prepare(`SELECT a.id,a.nombre_original,a.tamano_bytes FROM entrega_archivos ea
      JOIN archivos a ON a.id=ea.archivo_id WHERE ea.entrega_id=? ORDER BY ea.id`).all(fila.entrega_id);
    res.json({titulo:fila.titulo,consigna:fila.consigna,comentario:fila.comentario,
      archivos:archivos.map(a=>({id:String(a.id),nombre:a.nombre_original,tamanoBytes:a.tamano_bytes}))});
  }));
  app.put('/api/revisiones-pares/:id',ventanilla((req,res)=>{
    const u=exigirAcceso(db,req,res,'mis-tareas-estudiante');if(!u)return;
    const comentario=String(req.body?.comentario??'').trim();
    if(!comentario||comentario.length>3000)return res.status(400).json({error:'La devolución requiere entre 1 y 3000 caracteres.'});
    const asignacion=db.prepare(`SELECT ca.curso_id FROM revisiones_pares r JOIN entregas e ON e.id=r.entrega_id
      JOIN tareas t ON t.id=e.tarea_id JOIN catedras ca ON ca.id=t.catedra_id
      WHERE r.id=? AND r.revisor_id=? AND e.anulada_en IS NULL`).get(Number(req.params.id),u.id);
    if(!asignacion||!estaInscripto(db,u.id,asignacion.curso_id))return res.status(404).json({error:'Revisión no disponible.'});
    const cambio=db.prepare(`UPDATE revisiones_pares SET comentario=?,respondida_en=datetime('now')
      WHERE id=? AND revisor_id=? AND entrega_id IN (SELECT id FROM entregas WHERE anulada_en IS NULL)`).run(comentario,Number(req.params.id),u.id);
    if(!cambio.changes)return res.status(404).json({error:'Revisión no disponible.'});
    res.json({ok:true});
  }));
}
