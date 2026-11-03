import { exigirAcceso, ventanilla } from './comun.js';
import { paginaVisible } from './genoma.js';
import { ROLES_POR_PAGINA } from './permisos.js';

const hoy=()=>new Date().toISOString().slice(0,10);
const texto=(v,max)=>typeof v==='string'&&v.trim()&&v.length<=max;
export function prepararEstudioEvolucion(app,db,{acceso,propia,practicaVisible,generarActividad,proximoRepaso}) {
  db.exec(`CREATE TABLE IF NOT EXISTS estudio_memoria (
    practica_id INTEGER NOT NULL REFERENCES estudio_practicas(id), usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    concepto INTEGER NOT NULL, intentos INTEGER NOT NULL DEFAULT 0, racha INTEGER NOT NULL DEFAULT 0,
    calidad INTEGER NOT NULL, siguiente_el TEXT NOT NULL, actualizado_en TEXT NOT NULL DEFAULT(datetime('now')),
    PRIMARY KEY(practica_id,usuario_id,concepto));
  CREATE TABLE IF NOT EXISTS estudio_agenda (
    practica_id INTEGER NOT NULL REFERENCES estudio_practicas(id), usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    evento_id INTEGER REFERENCES eventos(id) ON DELETE SET NULL, PRIMARY KEY(practica_id,usuario_id));
  CREATE TABLE IF NOT EXISTS estudio_mapas (
    practica_id INTEGER NOT NULL REFERENCES estudio_practicas(id), usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    vinculos TEXT NOT NULL DEFAULT '[]', version INTEGER NOT NULL DEFAULT 1, PRIMARY KEY(practica_id,usuario_id));
  CREATE TABLE IF NOT EXISTS estudio_evaluaciones (
    practica_id INTEGER NOT NULL REFERENCES estudio_practicas(id), usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    concepto INTEGER NOT NULL, docente_id INTEGER NOT NULL REFERENCES usuarios(id), logrado INTEGER NOT NULL,
    criterio TEXT NOT NULL, devolucion TEXT NOT NULL, actualizado_en TEXT NOT NULL DEFAULT(datetime('now')),
    PRIMARY KEY(practica_id,usuario_id,concepto));
  CREATE TABLE IF NOT EXISTS estudio_sesiones (
    id INTEGER PRIMARY KEY, practica_id INTEGER NOT NULL REFERENCES estudio_practicas(id), creador_id INTEGER NOT NULL REFERENCES usuarios(id),
    participantes TEXT NOT NULL, cerrada INTEGER NOT NULL DEFAULT 0, creado_en TEXT NOT NULL DEFAULT(datetime('now')));
  CREATE TABLE IF NOT EXISTS estudio_aportes (
    id INTEGER PRIMARY KEY, sesion_id INTEGER NOT NULL REFERENCES estudio_sesiones(id), usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    fase TEXT NOT NULL, contenido TEXT NOT NULL, creado_en TEXT NOT NULL DEFAULT(datetime('now')));`);
  if(!db.prepare('PRAGMA table_info(estudio_intentos)').all().some(c=>c.name==='conceptos')) db.exec("ALTER TABLE estudio_intentos ADD COLUMN conceptos TEXT NOT NULL DEFAULT '[]'");
  const memorias=(p,u)=>db.prepare('SELECT concepto,intentos,racha,calidad,siguiente_el AS siguienteEl FROM estudio_memoria WHERE practica_id=? AND usuario_id=? ORDER BY concepto').all(p,u);
  function actividad(p,u,solicitada) {
    const banco=JSON.parse(p.banco), memoria=memorias(p.id,u.id), porIndice=new Map(memoria.map(m=>[m.concepto,m]));
    const perfilFila=db.prepare('SELECT datos FROM estudio_perfiles WHERE usuario_id=?').get(u.id);
    const perfil=perfilFila?JSON.parse(perfilFila.datos):{};
    const numero=db.prepare('SELECT COUNT(*) AS n FROM estudio_intentos WHERE practica_id=? AND usuario_id=?').get(p.id,u.id).n;
    // Primero vencidos, luego conceptos sin practicar y después la fecha más próxima.
    const orden=banco.map((_,i)=>i).sort((a,b)=>{
      const x=porIndice.get(a),y=porIndice.get(b);
      const prioridad=m=>m&&m.siguienteEl<=hoy()?0:!m?1:2;
      return prioridad(x)-prioridad(y)||(x?.siguienteEl||'').localeCompare(y?.siguienteEl||'')||(x?.calidad??-1)-(y?.calidad??-1)||a-b;
    });
    const principal=orden[0], anterior=porIndice.get(principal);
    const sugerida=anterior?(anterior.calidad<=1?1:anterior.calidad===2?2:3):Math.max(1,Math.min(3,Math.ceil((perfil.conocimientosPrevios||3)/2)));
    const dificultad=[1,2,3].includes(Number(solicitada))?Number(solicitada):sugerida;
    const dos=['intercalado','conexiones'].includes(p.metodo)&&banco.length>1;
    const indicesConceptos=dos?[principal,orden.find(i=>i!==principal)]:[principal];
    const pasosPorBloque=perfil.atencionDisponible<=2||perfil.motivacionActual<=2||perfil.ritmoPreferido<=2?1:dificultad===1?2:3;
    const generada=generarActividad(p.metodo,banco,numero,{indicesConceptos,dificultad});
    return {...generada,pasosPorBloque,dificultad,sugerida,
      apoyo:dificultad===1?{definicion:banco[principal].definicion,ejemplo:banco[principal].ejemplo||'',pasos:banco[principal].pasosResueltos||[]}:null,
      motivo:`Concepto ${anterior?(anterior.siguienteEl<=hoy()?'con repaso vencido':'con repaso próximo'):'sin practicar'}. Nivel ${dificultad}${solicitada?' elegido por vos':` sugerido por ${anterior?'tu última autoevaluación':'tus conocimientos previos declarados'}`}; ${pasosPorBloque} pasos por bloque según atención, motivación y ritmo declarados. No es un diagnóstico de capacidad.`};
  }
  function sincronizarAgenda(p,u) {
    const fila=db.prepare('SELECT evento_id FROM estudio_agenda WHERE practica_id=? AND usuario_id=?').get(p.id,u.id);
    if(!fila)return null;
    const fecha=db.prepare('SELECT MIN(siguiente_el) AS fecha FROM estudio_memoria WHERE practica_id=? AND usuario_id=?').get(p.id,u.id).fecha;
    if(!fecha)return null;
    let id=fila.evento_id;
    if(id&&db.prepare('SELECT 1 FROM eventos WHERE id=? AND creador_id=? AND institucion_id=?').get(id,u.id,u.institucionId)){
      db.prepare("UPDATE eventos SET fecha=?,titulo=?,actualizado_en=datetime('now') WHERE id=?").run(fecha,`Repasar: ${p.titulo}`,id);
    } else {
      id=Number(db.prepare("INSERT INTO eventos(institucion_id,creador_id,titulo,tipo,descripcion,fecha) VALUES(?,?,?,'estudio',?,?)").run(u.institucionId,u.id,`Repasar: ${p.titulo}`,`Práctica /estudio/metodos?practica=${p.id}. Fecha basada en autoevaluaciones.`,fecha).lastInsertRowid);
      db.prepare('UPDATE estudio_agenda SET evento_id=? WHERE practica_id=? AND usuario_id=?').run(id,p.id,u.id);
    }
    return {id:String(id),fecha};
  }
  const puedeEvaluar=(p,u)=>['profesor','admin-academico'].includes(u.rol)&&(p.autor_id===u.id||u.rol==='admin-academico');
  const detalle=(req,res)=>{
    const a=propia(req,res);if(!a)return;
    const mapa=db.prepare('SELECT vinculos,version FROM estudio_mapas WHERE practica_id=? AND usuario_id=?').get(a.p.id,a.u.id);
    res.json({practica:{id:String(a.p.id),titulo:a.p.titulo,metodo:a.p.metodo,banco:JSON.parse(a.p.banco),puedeEvaluar:puedeEvaluar(a.p,a.u)},
      actividad:actividad(a.p,a.u,req.query.dificultad),memoria:memorias(a.p.id,a.u.id),
      mapa:{version:mapa?.version||0,vinculos:JSON.parse(mapa?.vinculos||'[]')},
      agenda:db.prepare('SELECT evento_id AS eventoId FROM estudio_agenda WHERE practica_id=? AND usuario_id=?').get(a.p.id,a.u.id)||null,
      evaluaciones:db.prepare('SELECT concepto,logrado,criterio,devolucion,actualizado_en AS actualizadoEn FROM estudio_evaluaciones WHERE practica_id=? AND usuario_id=?').all(a.p.id,a.u.id),
      intentos:db.prepare('SELECT numero,respuesta,calidad,conceptos,siguiente_el AS siguienteEl,creado_en AS creadoEn FROM estudio_intentos WHERE practica_id=? AND usuario_id=? ORDER BY id DESC').all(a.p.id,a.u.id).map(i=>({...i,conceptos:JSON.parse(i.conceptos)}))});
  };
  const intentar=(req,res)=>{
    const a=propia(req,res);if(!a)return;
    const {respuesta,calidad,numero:numeroRecibido}=req.body||{};
    if(!texto(respuesta,10000)||!Number.isInteger(calidad)||calidad<0||calidad>3)return res.status(400).json({error:'Respuesta o revisión inválida.'});
    const act=actividad(a.p,a.u,req.body?.dificultad);
    if(numeroRecibido!==undefined&&numeroRecibido!==act.numero)return res.status(409).json({error:'La práctica cambió en otra pestaña. Recargá antes de responder.'});
    const actuales=memorias(a.p.id,a.u.id),repasos=[];
    db.exec('BEGIN');try{
      for(const indice of act.indicesConceptos){
        const previo=actuales.find(m=>m.concepto===indice),repaso=proximoRepaso(calidad,previo?.racha||0,hoy());repasos.push(repaso);
        db.prepare(`INSERT INTO estudio_memoria(practica_id,usuario_id,concepto,intentos,racha,calidad,siguiente_el) VALUES(?,?,?,1,?,?,?)
          ON CONFLICT(practica_id,usuario_id,concepto) DO UPDATE SET intentos=intentos+1,racha=excluded.racha,calidad=excluded.calidad,siguiente_el=excluded.siguiente_el,actualizado_en=datetime('now')`).run(a.p.id,a.u.id,indice,repaso.racha,calidad,repaso.fecha);
      }
      const repaso=repasos.sort((x,y)=>x.fecha.localeCompare(y.fecha))[0];
      db.prepare('INSERT INTO estudio_intentos(practica_id,usuario_id,numero,respuesta,calidad,siguiente_el,conceptos) VALUES(?,?,?,?,?,?,?)').run(a.p.id,a.u.id,act.numero,respuesta.trim(),calidad,repaso.fecha,JSON.stringify(act.indicesConceptos));
      const agenda=sincronizarAgenda(a.p,a.u);db.exec('COMMIT');res.status(201).json({numero:act.numero,conceptos:act.indicesConceptos,proximoRepaso:repaso,agenda});
    }catch(e){db.exec('ROLLBACK');throw e;}
  };
  app.post('/api/estudio/practicas/:id/agenda',ventanilla((req,res)=>{
    const a=propia(req,res);if(!a||!exigirAcceso(db,req,res,'calendario-institucional'))return;
    if(!memorias(a.p.id,a.u.id).length)return res.status(409).json({error:'Primero registrá un intento.'});
    db.exec('BEGIN');try{db.prepare('INSERT OR IGNORE INTO estudio_agenda(practica_id,usuario_id) VALUES(?,?)').run(a.p.id,a.u.id);const evento=sincronizarAgenda(a.p,a.u);db.exec('COMMIT');res.json({evento});}catch(e){db.exec('ROLLBACK');throw e;}
  }));
  app.put('/api/estudio/practicas/:id/mapa',ventanilla((req,res)=>{
    const a=propia(req,res);if(!a)return;if(a.p.metodo!=='conexiones')return res.status(400).json({error:'Esta práctica no es un mapa.'});
    const {vinculos,version}=req.body||{},banco=JSON.parse(a.p.banco);
    if(!Array.isArray(vinculos)||vinculos.length>500||vinculos.some(v=>!Number.isInteger(v.de)||!Number.isInteger(v.a)||v.de<0||v.a<0||v.de>=banco.length||v.a>=banco.length||v.de===v.a||!texto(v.relacion,300)))return res.status(400).json({error:'Cada vínculo necesita dos conceptos distintos y una explicación.'});
    const previo=db.prepare('SELECT version FROM estudio_mapas WHERE practica_id=? AND usuario_id=?').get(a.p.id,a.u.id);
    if(version!==(previo?.version||0))return res.status(409).json({error:'El mapa cambió en otra pestaña.'});
    db.prepare('INSERT INTO estudio_mapas(practica_id,usuario_id,vinculos,version) VALUES(?,?,?,1) ON CONFLICT(practica_id,usuario_id) DO UPDATE SET vinculos=excluded.vinculos,version=version+1').run(a.p.id,a.u.id,JSON.stringify(vinculos.map(({de,a,relacion})=>({de,a,relacion:relacion.trim()}))));res.json({version:version+1});
  }));
  app.get('/api/estudio/participantes',ventanilla((req,res)=>{const u=acceso(req,res);if(!u)return;res.json({personas:db.prepare("SELECT id,nombre,rol FROM usuarios WHERE institucion_id=? AND estado='activo' ORDER BY nombre").all(u.institucionId)});}));
  app.get('/api/estudio/practicas/:id/panel',ventanilla((req,res)=>{
    const a=propia(req,res);if(!a)return;if(!puedeEvaluar(a.p,a.u))return res.status(403).json({error:'El tablero corresponde al docente autor o Dirección.'});
    const alumnos=db.prepare('SELECT DISTINCT u.id,u.nombre FROM estudio_intentos i JOIN usuarios u ON u.id=i.usuario_id WHERE i.practica_id=? AND u.institucion_id=? ORDER BY u.nombre').all(a.p.id,a.u.institucionId).map(u=>({...u,memoria:memorias(a.p.id,u.id),intentos:db.prepare('SELECT numero,respuesta,calidad,conceptos,creado_en AS creadoEn FROM estudio_intentos WHERE practica_id=? AND usuario_id=? ORDER BY id DESC LIMIT 20').all(a.p.id,u.id).map(i=>({...i,conceptos:JSON.parse(i.conceptos)})),evaluaciones:db.prepare('SELECT concepto,logrado,criterio,devolucion FROM estudio_evaluaciones WHERE practica_id=? AND usuario_id=?').all(a.p.id,u.id)}));
    res.json({alumnos,aviso:'La memoria se basa en autoevaluaciones. La evidencia y la valoración docente se muestran por separado.'});
  }));
  app.put('/api/estudio/practicas/:id/evaluaciones',ventanilla((req,res)=>{
    const a=propia(req,res);if(!a)return;if(!puedeEvaluar(a.p,a.u))return res.status(403).json({error:'Sólo el docente autor o Dirección evalúa.'});
    const {usuarioId,concepto,logrado,criterio,devolucion}=req.body||{};
    if(!Number.isInteger(concepto)||concepto<0||concepto>=JSON.parse(a.p.banco).length||typeof logrado!=='boolean'||!texto(criterio,1000)||!texto(devolucion,3000)||!db.prepare('SELECT 1 FROM estudio_intentos WHERE practica_id=? AND usuario_id=?').get(a.p.id,usuarioId))return res.status(400).json({error:'Elegí un participante con intento y completá criterio y devolución.'});
    db.prepare(`INSERT INTO estudio_evaluaciones(practica_id,usuario_id,concepto,docente_id,logrado,criterio,devolucion) VALUES(?,?,?,?,?,?,?) ON CONFLICT(practica_id,usuario_id,concepto) DO UPDATE SET docente_id=excluded.docente_id,logrado=excluded.logrado,criterio=excluded.criterio,devolucion=excluded.devolucion,actualizado_en=datetime('now')`).run(a.p.id,usuarioId,concepto,a.u.id,logrado?1:0,criterio.trim(),devolucion.trim());res.json({ok:true});
  }));
  const turno=(sesion,aportes)=>{
    const miembros=JSON.parse(sesion.participantes),ronda=Math.floor(aportes.length/3),fase=['explicacion','pregunta','revision'][aportes.length%3],explicador=miembros[ronda%miembros.length];
    return {ronda:ronda+1,fase,usuarioId:fase==='pregunta'?miembros[(ronda+1)%miembros.length]:explicador};
  };
  const sesionPropia=(req,res)=>{const a=propia(req,res);if(!a)return null;const s=db.prepare('SELECT * FROM estudio_sesiones WHERE id=? AND practica_id=?').get(req.params.sesionId,a.p.id);if(!s||!JSON.parse(s.participantes).includes(a.u.id)){res.status(404).json({error:'Sesión no disponible.'});return null;}return {...a,s};};
  app.post('/api/estudio/practicas/:id/sesiones',ventanilla((req,res)=>{
    const a=propia(req,res);if(!a)return;if(a.p.metodo!=='cooperativa'||a.p.visibilidad!=='institucion')return res.status(400).json({error:'Elegí una práctica cooperativa compartida.'});
    const participantes=[...new Set([a.u.id,...(Array.isArray(req.body?.participantes)?req.body.participantes.map(Number):[])])];
    if(participantes.length<2||participantes.length>12||participantes.some(id=>{const u=db.prepare("SELECT id,rol,institucion_id AS institucionId FROM usuarios WHERE id=? AND estado='activo'").get(id);return !u||!ROLES_POR_PAGINA['metodos-estudio'].includes(u.rol)||!paginaVisible(db,u,'metodos-estudio')||!practicaVisible(db,a.p,u);} ))return res.status(400).json({error:'Elegí entre 2 y 12 personas con acceso a la práctica.'});
    const id=db.prepare('INSERT INTO estudio_sesiones(practica_id,creador_id,participantes) VALUES(?,?,?)').run(a.p.id,a.u.id,JSON.stringify(participantes)).lastInsertRowid;res.status(201).json({id:String(id)});
  }));
  app.get('/api/estudio/practicas/:id/sesiones',ventanilla((req,res)=>{const a=propia(req,res);if(!a)return;res.json({sesiones:db.prepare('SELECT id,participantes,cerrada FROM estudio_sesiones WHERE practica_id=? ORDER BY id DESC').all(a.p.id).filter(s=>JSON.parse(s.participantes).includes(a.u.id))});}));
  app.get('/api/estudio/practicas/:id/sesiones/:sesionId',ventanilla((req,res)=>{
    const a=sesionPropia(req,res);if(!a)return;const aportes=db.prepare('SELECT a.id,a.usuario_id AS usuarioId,u.nombre,a.fase,a.contenido,a.creado_en AS creadoEn FROM estudio_aportes a JOIN usuarios u ON u.id=a.usuario_id WHERE sesion_id=? ORDER BY a.id').all(a.s.id);
    res.json({id:String(a.s.id),creadorId:a.s.creador_id,cerrada:!!a.s.cerrada,version:aportes.length,turno:turno(a.s,aportes),participantes:JSON.parse(a.s.participantes).map(id=>db.prepare('SELECT id,nombre FROM usuarios WHERE id=?').get(id)),aportes});
  }));
  app.post('/api/estudio/practicas/:id/sesiones/:sesionId/aportes',ventanilla((req,res)=>{
    const a=sesionPropia(req,res);if(!a)return;const aportes=db.prepare('SELECT id FROM estudio_aportes WHERE sesion_id=? ORDER BY id').all(a.s.id),t=turno(a.s,aportes);
    if(a.s.cerrada||req.body?.version!==aportes.length)return res.status(409).json({error:'La sesión cambió o está cerrada. Actualizá.'});
    if(t.usuarioId!==a.u.id)return res.status(403).json({error:'Esperá tu turno.'});
    if(!texto(req.body?.contenido,5000))return res.status(400).json({error:'Escribí tu explicación, pregunta o revisión.'});
    db.prepare('INSERT INTO estudio_aportes(sesion_id,usuario_id,fase,contenido) VALUES(?,?,?,?)').run(a.s.id,a.u.id,t.fase,req.body.contenido.trim());res.status(201).json({ok:true});
  }));
  app.put('/api/estudio/practicas/:id/sesiones/:sesionId/cerrar',ventanilla((req,res)=>{const a=sesionPropia(req,res);if(!a)return;if(a.s.creador_id!==a.u.id)return res.status(403).json({error:'Sólo quien creó la sesión puede cerrarla.'});db.prepare('UPDATE estudio_sesiones SET cerrada=1 WHERE id=?').run(a.s.id);res.json({ok:true});}));
  return {detalle,intentar};
}
