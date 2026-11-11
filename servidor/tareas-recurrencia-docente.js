import {normalizarRecurrencia,expandir,esFechaValida,sumarDias} from './agenda.js';
import {paginaVisible} from './genoma.js';

export const hoyLocal=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export function prepararRecurrenciaDocente(db){
  db.exec(`CREATE TABLE IF NOT EXISTS tarea_series (
    id INTEGER PRIMARY KEY,plantilla_id INTEGER NOT NULL REFERENCES tareas(id),inicio TEXT NOT NULL,
    regla TEXT NOT NULL,anticipacion INTEGER NOT NULL DEFAULT 0,activa INTEGER NOT NULL DEFAULT 1,version INTEGER NOT NULL DEFAULT 1,contenido TEXT);
    CREATE TABLE IF NOT EXISTS tarea_serie_ocurrencias (
      serie_id INTEGER NOT NULL REFERENCES tarea_series(id),fecha TEXT NOT NULL,tarea_id INTEGER NOT NULL UNIQUE REFERENCES tareas(id),PRIMARY KEY(serie_id,fecha));`);
  if(!db.prepare('PRAGMA table_info(tareas)').all().some(c=>c.name==='serie_id'))db.exec('ALTER TABLE tareas ADD COLUMN serie_id INTEGER REFERENCES tarea_series(id)');
  if(!db.prepare('PRAGMA table_info(tarea_series)').all().some(c=>c.name==='contenido'))db.exec('ALTER TABLE tarea_series ADD COLUMN contenido TEXT');
  const instantanea=t=>JSON.stringify({catedra_id:t.catedra_id,titulo:t.titulo,consigna:t.consigna,metodo_estudio:t.metodo_estudio,tipo_asignacion:t.tipo_asignacion,rubrica:t.rubrica,adjuntos:db.prepare('SELECT archivo_id FROM tarea_adjuntos WHERE tarea_id=?').all(t.id).map(a=>a.archivo_id)});
  for(const s of db.prepare('SELECT id,plantilla_id FROM tarea_series WHERE contenido IS NULL').all()){const t=db.prepare('SELECT * FROM tareas WHERE id=?').get(s.plantilla_id);if(t)db.prepare('UPDATE tarea_series SET contenido=? WHERE id=?').run(instantanea(t),s.id);}
  const serieDe=tid=>db.prepare('SELECT s.* FROM tarea_series s JOIN tareas t ON t.serie_id=s.id WHERE t.id=?').get(tid);
  const vista=tid=>{const s=serieDe(tid);return s?{serieId:String(s.id),recurrencia:JSON.parse(s.regla),recurrenciaActiva:!!s.activa,anticipacionDias:s.anticipacion,serieVersion:s.version}: {serieId:null,recurrencia:null,recurrenciaActiva:false,anticipacionDias:0,serieVersion:0};};
  function validar(regla,fecha,anticipacion){
    const r=normalizarRecurrencia(regla);if(r?.error)return r.error;
    if(r&&!esFechaValida(fecha))return 'La repetición necesita una fecha límite real.';
    if(r?.hasta&&r.hasta<fecha)return 'La fecha final debe ser igual o posterior a la primera entrega.';
    if(!Number.isInteger(anticipacion)||anticipacion<0||anticipacion>90)return 'La anticipación debe estar entre 0 y 90 días.';
    return null;
  }
  function configurar(tid,regla,anticipacion=0,activa=true,version){
    const t=db.prepare('SELECT * FROM tareas WHERE id=?').get(tid),s=serieDe(tid);
    const error=validar(regla,t.fecha_limite,anticipacion);if(error)throw new Error(error);
    if(s&&version!==undefined&&version!==s.version){const e=new Error('La repetición cambió. Recargá antes de guardar.');e.estado=409;throw e;}
    const r=normalizarRecurrencia(regla);
    if(!r){if(s)db.prepare('UPDATE tarea_series SET activa=0,version=version+1 WHERE id=?').run(s.id);return vista(tid);}
    db.exec('BEGIN IMMEDIATE');try{
      if(s)db.prepare('UPDATE tarea_series SET regla=?,anticipacion=?,activa=?,version=version+1 WHERE id=?').run(JSON.stringify(r),anticipacion,Number(activa),s.id);
      else{
        const sid=Number(db.prepare('INSERT INTO tarea_series(plantilla_id,inicio,regla,anticipacion,activa,contenido) VALUES(?,?,?,?,?,?)').run(tid,t.fecha_limite,JSON.stringify(r),anticipacion,Number(activa),instantanea(t)).lastInsertRowid);
        db.prepare('UPDATE tareas SET serie_id=? WHERE id=?').run(sid,tid);
        db.prepare('INSERT INTO tarea_serie_ocurrencias(serie_id,fecha,tarea_id) VALUES(?,?,?)').run(sid,t.fecha_limite,tid);
      }
      db.exec('COMMIT');return vista(tid);
    }catch(e){db.exec('ROLLBACK');throw e;}
  }
  function copiarEquipos(desde,hasta){
    for(const grupo of db.prepare('SELECT id,nombre FROM tarea_equipos WHERE tarea_id=?').all(desde)){
      const miembros=db.prepare(`SELECT em.estudiante_id FROM tarea_equipo_miembros em JOIN usuarios u ON u.id=em.estudiante_id JOIN tareas t ON t.id=em.tarea_id JOIN catedras c ON c.id=t.catedra_id
        WHERE em.equipo_id=? AND u.estado='activo' AND EXISTS(SELECT 1 FROM inscripciones i WHERE i.curso_id=c.curso_id AND i.estudiante_id=u.id)`).all(grupo.id);
      if(miembros.length<2)continue;
      const gid=db.prepare('INSERT INTO tarea_equipos(tarea_id,nombre) VALUES(?,?)').run(hasta,grupo.nombre).lastInsertRowid;
      for(const m of miembros)db.prepare('INSERT INTO tarea_equipo_miembros(equipo_id,tarea_id,estudiante_id) VALUES(?,?,?)').run(gid,hasta,m.estudiante_id);
    }
  }
  function generar({profesorId=null,serieId=null,hoy=hoyLocal()}={}){
    const generadas=[];
    const series=db.prepare(`SELECT s.*,c.profesor_id,cu.institucion_id,u.perfil_clave,u.rol FROM tarea_series s JOIN tareas t ON t.id=s.plantilla_id JOIN catedras c ON c.id=t.catedra_id JOIN cursos cu ON cu.id=c.curso_id JOIN usuarios u ON u.id=c.profesor_id
      WHERE s.activa=1 AND t.eliminado_en IS NULL AND u.estado='activo' AND (? IS NULL OR c.profesor_id=?) AND (? IS NULL OR s.id=?)`).all(profesorId,profesorId,serieId,serieId);
    for(const s of series){
      if(!paginaVisible(db,{id:s.profesor_id,institucionId:s.institucion_id,rol:s.rol,perfilClave:s.perfil_clave},'gestion-tareas-profesor'))continue;
      const hasta=sumarDias(hoy,s.anticipacion);if(hasta<s.inicio)continue;
      const regla=JSON.parse(s.regla),feriados=regla.saltarFeriados?new Set(db.prepare('SELECT fecha FROM feriados').all().map(f=>f.fecha)):new Set();
      const sinCuenta={...regla};delete sinCuenta.veces;
      const fechas=expandir({fecha:s.inicio,fecha_fin:null,regla:sinCuenta},s.inicio,hasta,{feriados});
      db.exec('BEGIN IMMEDIATE');try{
        const t={...db.prepare('SELECT * FROM tareas WHERE id=?').get(s.plantilla_id),...JSON.parse(s.contenido)};
        for(const f of fechas){
          if(f.fecha<=s.inicio)continue; // La tarea original es siempre la primera ocurrencia.
          if(db.prepare('SELECT 1 FROM tarea_serie_ocurrencias WHERE serie_id=? AND fecha=?').get(s.id,f.fecha))continue;
          if(regla.veces&&db.prepare('SELECT COUNT(*) AS n FROM tarea_serie_ocurrencias WHERE serie_id=?').get(s.id).n>=regla.veces)break;
          const tid=Number(db.prepare('INSERT INTO tareas(catedra_id,titulo,consigna,fecha_limite,metodo_estudio,tipo_asignacion,rubrica,serie_id) VALUES(?,?,?,?,?,?,?,?)').run(t.catedra_id,t.titulo,t.consigna,f.fecha,t.metodo_estudio,t.tipo_asignacion,t.rubrica,s.id).lastInsertRowid);
          for(const archivoId of t.adjuntos)db.prepare('INSERT INTO tarea_adjuntos(tarea_id,archivo_id) VALUES(?,?)').run(tid,archivoId);
          copiarEquipos(t.id,tid);
          db.prepare('INSERT INTO tarea_serie_ocurrencias(serie_id,fecha,tarea_id) VALUES(?,?,?)').run(s.id,f.fecha,tid);generadas.push(String(tid));
        }
        db.exec('COMMIT');
      }catch(e){db.exec('ROLLBACK');throw e;}
    }
    return generadas;
  }
  function actualizarFuturas(tid){
    const s=serieDe(tid);if(!s)return 0;
    const t=db.prepare('SELECT * FROM tareas WHERE id=?').get(tid);
    db.exec('BEGIN IMMEDIATE');try{
      const futuras=db.prepare(`SELECT id FROM tareas WHERE serie_id=? AND id<>? AND fecha_limite>? AND eliminado_en IS NULL AND NOT EXISTS(SELECT 1 FROM entregas e WHERE e.tarea_id=tareas.id)`).all(s.id,tid,hoyLocal());
      for(const f of futuras){
        db.prepare('UPDATE tareas SET titulo=?,consigna=?,metodo_estudio=?,rubrica=? WHERE id=?').run(t.titulo,t.consigna,t.metodo_estudio,t.rubrica,f.id);
        db.prepare('DELETE FROM tarea_adjuntos WHERE tarea_id=?').run(f.id);db.prepare('INSERT INTO tarea_adjuntos(tarea_id,archivo_id) SELECT ?,archivo_id FROM tarea_adjuntos WHERE tarea_id=?').run(f.id,tid);
      }
      db.prepare('UPDATE tarea_series SET plantilla_id=?,contenido=?,version=version+1 WHERE id=?').run(tid,instantanea(t),s.id);
      db.exec('COMMIT');return futuras.length;
    }catch(e){db.exec('ROLLBACK');throw e;}
  }
  return {vista,validar,configurar,generar,actualizarFuturas,serieDe};
}
