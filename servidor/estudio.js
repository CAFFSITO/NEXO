import { exigirAcceso, ventanilla } from './comun.js';
import { leerGenoma, paginaVisible } from './genoma.js';
import { prepararEstudioEvolucion } from './estudio-evolucion.js';
import { leccionRealizada } from './lecciones.js';

// El banco estructurado y las reglas hacen reproducibles las prácticas; ningún texto se genera con IA.
const METODOS = [
  ['recuperacion','Recuperación activa','Responder sin mirar y comparar con la respuesta'],
  ['espaciado','Repetición espaciada','Volver al concepto según el resultado anterior'],
  ['intercalado','Práctica intercalada','Alternar conceptos antes de repetir uno'],
  ['autoexplicacion','Autoexplicación','Explicar con palabras propias y cotejar componentes'],
  ['elaboracion','Interrogación elaborativa','Responder por qué y relacionar conocimientos'],
  ['ejemplo-resuelto','Ejemplo resuelto','Analizar pasos antes de intentar una variante'],
  ['progresiva','Práctica progresiva','Avanzar desde pasos guiados a una respuesta autónoma'],
  ['conexiones','Mapa de conexiones','Relacionar conceptos con justificación'],
  ['creativa','Transformación creativa','Aplicar conceptos a un caso nuevo'],
  ['cooperativa','Explicación cooperativa','Alternar explicación y preguntas entre participantes'],
];
const FUENTE_DUNLOSKY = 'https://www.psychologicalscience.org/publications/journals/pspi/learning-techniques.html';
const FUENTE_IES = 'https://ies.ed.gov/ncee/wwc/PracticeGuide/1';
const EVIDENCIA = {
  recuperacion: { estado: 'respaldo-amplio', resumen: 'Las pruebas de práctica tienen utilidad alta en la revisión citada. La calidad de estas preguntas depende del banco preparado por personas.', fuente: FUENTE_DUNLOSKY },
  espaciado: { estado: 'respaldo-amplio', resumen: 'Distribuir la práctica en el tiempo tiene utilidad alta. Los intervalos concretos de NEXO son una regla ajustable, no una dosificación validada universalmente.', fuente: FUENTE_DUNLOSKY },
  intercalado: { estado: 'respaldo-contextual', resumen: 'La práctica intercalada tuvo utilidad moderada en la revisión; su efecto depende del contenido y del diseño de las comparaciones.', fuente: FUENTE_DUNLOSKY },
  autoexplicacion: { estado: 'respaldo-contextual', resumen: 'La autoexplicación tuvo utilidad moderada en la revisión; requiere contrastar la explicación con contenido fiable.', fuente: FUENTE_DUNLOSKY },
  elaboracion: { estado: 'respaldo-contextual', resumen: 'La interrogación elaborativa tuvo utilidad moderada en la revisión; conviene disponer de una referencia para comprobar las respuestas.', fuente: FUENTE_DUNLOSKY },
  'ejemplo-resuelto': { estado: 'recomendacion-guia', resumen: 'La guía IES recomienda combinar ejemplos resueltos con problemas que el estudiante intenta resolver.', fuente: FUENTE_IES },
  progresiva: { estado: 'sin-evaluar', resumen: 'Secuencia de ayuda diseñada por NEXO. La implementación concreta aún no tiene evaluación propia.', fuente: null },
  conexiones: { estado: 'sin-evaluar', resumen: 'La actividad de relacionar conceptos necesita evaluación según tema y contexto.', fuente: null },
  creativa: { estado: 'sin-evaluar', resumen: 'Actividad de aplicación creativa; no debe presentarse como método universal de retención.', fuente: null },
  cooperativa: { estado: 'sin-evaluar', resumen: 'La calidad depende de las preguntas y devoluciones entre participantes; esta implementación aún no fue evaluada.', fuente: null },
};
export const catalogoMetodos = () => METODOS.map(([id,nombre,descripcion]) => ({id,nombre,descripcion,evidencia:EVIDENCIA[id]}));
const ids = new Set(METODOS.map(x=>x[0]));
const entero = n => Number.isSafeInteger(Number(n)) && Number(n)>0 ? Number(n) : null;
function bancoValido(banco) {
  return Array.isArray(banco) && banco.length>0 && banco.length<=200 && banco.every(x =>
    x && typeof x.concepto==='string' && x.concepto.trim() && x.concepto.length<=200 &&
    typeof x.definicion==='string' && x.definicion.trim() && x.definicion.length<=2000 &&
    (x.ejemplo===undefined || typeof x.ejemplo==='string' && x.ejemplo.length<=2000) &&
    (x.pregunta===undefined || typeof x.pregunta==='string' && x.pregunta.length<=500) &&
    (x.pasosResueltos===undefined || Array.isArray(x.pasosResueltos)&&x.pasosResueltos.length<=30&&x.pasosResueltos.every(p=>typeof p==='string'&&p.length<=1000)));
}
function indices(metodo,banco,numero) {
  const n=banco.length, primero=numero%n;
  if(metodo==='intercalado' && n>1) return [primero,(primero+Math.ceil(n/2))%n];
  if(metodo==='conexiones' && n>1) return [primero,(primero+1)%n];
  return [primero];
}
export function generarActividad(metodo,banco,numero=0,opciones={}) {
  if(!ids.has(metodo)||!bancoValido(banco)||!Number.isSafeInteger(numero)||numero<0) throw new Error('Método, banco o número inválido.');
  const elegidos=opciones.indicesConceptos||indices(metodo,banco,numero);
  const [a,b] = elegidos.map(i=>banco[i]);
  const base={metodo,numero,indicesConceptos:elegidos,conceptos:[a.concepto,...(b?[b.concepto]:[])],respuestaModelo:b?`${a.concepto}: ${a.definicion}\n${b.concepto}: ${b.definicion}`:a.definicion};
  switch(metodo) {
    case 'recuperacion': return {...base,consigna:a.pregunta||`Explicá ${a.concepto} sin consultar apuntes.`,pasos:['Responder de memoria','Comparar con la definición','Anotar diferencia']};
    case 'espaciado': return {...base,consigna:a.pregunta||`Recordá ${a.concepto} antes de volver a verlo.`,pasos:['Recordar','Comparar','Registrar facilidad']};
    case 'intercalado': return {...base,consigna:`Explicá ${a.concepto} y luego ${b?.concepto||a.concepto}; distinguí cuándo usar cada uno.`,pasos:['Resolver primero','Cambiar de concepto','Comparar']};
    case 'autoexplicacion': return {...base,consigna:`Explicá por qué ${a.concepto} funciona y cómo se relaciona con lo que ya sabés.`,pasos:['Explicar','Identificar lagunas','Reformular']};
    case 'elaboracion': return {...base,consigna:`¿Por qué es cierto o útil ${a.concepto}? Justificá con un ejemplo.`,pasos:['Responder por qué','Dar ejemplo','Contrastar']};
    case 'ejemplo-resuelto': return {...base,consigna:`Estudiá este ejemplo: ${a.ejemplo||a.definicion}. Señalá cada paso y proponé una variación.`,pasos:a.pasosResueltos?.length?[...a.pasosResueltos,'Explicar por qué funciona cada paso','Resolver una variación propia']:['Inspeccionar','Explicar pasos','Variar']};
    case 'progresiva': {const nivel=opciones.dificultad||Math.min(3,Math.floor(numero/2)+1);return {...base,consigna:`Nivel ${nivel}: ${a.pregunta||`Aplicá ${a.concepto}`}.`,pasos:nivel===1?['Leer pista','Resolver con ayuda','Comprobar']:nivel===2?['Resolver','Consultar pista solo si hace falta','Comprobar']:['Resolver sin pista','Comprobar','Explicar error']};}
    case 'conexiones': return {...base,consigna:`Relacioná ${a.concepto} con ${b?.concepto||a.concepto} y justificá la conexión.`,pasos:['Dibujar vínculo','Explicar relación','Revisar']};
    case 'creativa': return {...base,consigna:`Diseñá un uso nuevo de ${a.concepto} en una situación elegida por vos.`,pasos:['Elegir problema','Transformar concepto','Probar propuesta']};
    default: return {...base,consigna:`Explicá ${a.concepto} a otra persona; intercambien preguntas y revisen la explicación.`,pasos:['Explicar','Escuchar pregunta','Reformular']};
  }
}
export function proximoRepaso(calidad,racha,desde='2026-01-01') {
  if(!Number.isInteger(calidad)||calidad<0||calidad>3||!Number.isInteger(racha)||racha<0) throw new Error('Resultado inválido.');
  const dias=calidad===0?1:calidad===1?2:calidad===2?Math.min(90,2**Math.min(racha+1,6)):Math.min(180,3**Math.min(racha+1,5));
  const fecha=new Date(`${desde}T12:00:00Z`);if(Number.isNaN(fecha.getTime()))throw new Error('Fecha inválida.');
  fecha.setUTCDate(fecha.getUTCDate()+dias);
  return {dias,fecha:fecha.toISOString().slice(0,10),racha:calidad===0?0:racha+1};
}
const camposPerfil = ['conocimientosPrevios','atencionDisponible','motivacionActual','ritmoPreferido'];
function leccionDisponible(db,leccion,usuarioId) {
  const nodos=db.prepare('SELECT * FROM curso_nodos WHERE catedra_id=?').all(leccion.catedra_id);
  const porId=new Map(nodos.map(n=>[n.id,n]));
  const disponible=(n,vistos=new Set())=>{
    if(!n||vistos.has(n.id)||!n.publicado||n.disponible_desde&&n.disponible_desde>new Date().toISOString())return false;
    vistos.add(n.id);
    if(n.padre_id&&!disponible(porId.get(n.padre_id),vistos))return false;
    if(n.prerrequisito_id&&!leccionRealizada(db,n.prerrequisito_id,usuarioId))return false;
    return true;
  };
  return disponible(porId.get(leccion.id));
}
const moduloLeccionVisible=(db,u)=>paginaVisible(db,u,u.rol==='admin-academico'?'cursos-activos':'detalle-materia-estudiante');
function practicaVisible(db,practica,usuario) {
  if(practica.institucion_id!==usuario.institucionId)return false;
  if(practica.leccion_id&&!moduloLeccionVisible(db,usuario))return false;
  if(practica.autor_id===usuario.id)return true;
  if(practica.visibilidad!=='institucion')return false;
  if(!practica.leccion_id)return true;
  const leccion=db.prepare('SELECT n.id,n.catedra_id,c.profesor_id,c.curso_id,m.institucion_id FROM curso_nodos n JOIN catedras c ON c.id=n.catedra_id JOIN materias m ON m.id=c.materia_id WHERE n.id=?').get(practica.leccion_id);
  if(!leccion||leccion.institucion_id!==usuario.institucionId)return false;
  if(leccion.profesor_id===usuario.id||usuario.rol==='admin-academico')return true;
  return !!db.prepare('SELECT 1 FROM inscripciones WHERE curso_id=? AND estudiante_id=?').get(leccion.curso_id,usuario.id)&&leccionDisponible(db,leccion,usuario.id);
}
export function recomendarMetodo(perfil, resumen={intentos:0,calidadMedia:null,pendientes:0}) {
  if(resumen.pendientes>0) return {metodo:'espaciado',motivo:'Tenés repasos cuya fecha sugerida ya llegó.'};
  if(resumen.intentos>0 && resumen.calidadMedia!==null && resumen.calidadMedia<1.5) return {metodo:'recuperacion',motivo:'Tus últimas autoevaluaciones señalaron dificultades de recuerdo.'};
  if(perfil?.conocimientosPrevios<=2) return {metodo:'ejemplo-resuelto',motivo:'Indicaste pocos conocimientos previos; un ejemplo puede ofrecer un punto de partida.'};
  if(perfil?.atencionDisponible<=2) return {metodo:'progresiva',motivo:'Indicaste atención disponible baja; se sugieren pasos breves y guiados.'};
  if(perfil?.conocimientosPrevios>=4) return {metodo:'intercalado',motivo:'Indicaste conocimientos previos altos; podés comparar conceptos distintos.'};
  return {metodo:'autoexplicacion',motivo:'Probá explicar un concepto y contrastar tu respuesta con la referencia.'};
}

export function registrarEstudio(app,db) {
  db.exec(`CREATE TABLE IF NOT EXISTS estudio_practicas(id INTEGER PRIMARY KEY, institucion_id INTEGER NOT NULL REFERENCES instituciones(id), autor_id INTEGER NOT NULL REFERENCES usuarios(id), leccion_id INTEGER REFERENCES curso_nodos(id), metodo TEXT NOT NULL, titulo TEXT NOT NULL, banco TEXT NOT NULL, visibilidad TEXT NOT NULL DEFAULT 'privada' CHECK(visibilidad IN ('privada','institucion')), creado_en TEXT NOT NULL DEFAULT(datetime('now')));
  CREATE TABLE IF NOT EXISTS estudio_intentos(id INTEGER PRIMARY KEY, practica_id INTEGER NOT NULL REFERENCES estudio_practicas(id), usuario_id INTEGER NOT NULL REFERENCES usuarios(id), numero INTEGER NOT NULL, respuesta TEXT NOT NULL, calidad INTEGER NOT NULL CHECK(calidad BETWEEN 0 AND 3), siguiente_el TEXT NOT NULL, creado_en TEXT NOT NULL DEFAULT(datetime('now')));`);
  db.exec(`CREATE TABLE IF NOT EXISTS estudio_perfiles(usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id), datos TEXT NOT NULL, actualizado_en TEXT NOT NULL DEFAULT(datetime('now')));
  CREATE TABLE IF NOT EXISTS estudio_perfil_historial(id INTEGER PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuarios(id), datos TEXT NOT NULL, creado_en TEXT NOT NULL DEFAULT(datetime('now')));`);
  if(!db.prepare('PRAGMA table_info(estudio_practicas)').all().some(c=>c.name==='leccion_id')) db.exec('ALTER TABLE estudio_practicas ADD COLUMN leccion_id INTEGER REFERENCES curso_nodos(id)');
  const acceso=(req,res)=>exigirAcceso(db,req,res,'metodos-estudio');
  const resumenUsuario=u=>{const r=db.prepare("SELECT COUNT(*) AS intentos,AVG(calidad) AS calidadMedia FROM (SELECT calidad FROM estudio_intentos WHERE usuario_id=? ORDER BY id DESC LIMIT 20)").get(u.id);const pendientes=db.prepare("SELECT COUNT(*) AS n FROM estudio_practicas p WHERE p.institucion_id=? AND (p.autor_id=? OR p.visibilidad='institucion') AND COALESCE((SELECT MIN(m.siguiente_el) FROM estudio_memoria m WHERE m.practica_id=p.id AND m.usuario_id=?),(SELECT i.siguiente_el FROM estudio_intentos i WHERE i.practica_id=p.id AND i.usuario_id=? ORDER BY i.id DESC LIMIT 1))<=date('now')").get(u.institucionId,u.id,u.id,u.id).n;return {...r,pendientes};};
  app.get('/api/estudio/perfil',ventanilla((req,res)=>{const u=acceso(req,res);if(!u)return;const fila=db.prepare('SELECT datos,actualizado_en AS actualizadoEn FROM estudio_perfiles WHERE usuario_id=?').get(u.id);const perfil=fila?JSON.parse(fila.datos):null;const resumen=resumenUsuario(u);res.json({perfil,actualizadoEn:fila?.actualizadoEn??null,resumen,recomendacion:recomendarMetodo(perfil,resumen)});}));
  app.put('/api/estudio/perfil',ventanilla((req,res)=>{const u=acceso(req,res);if(!u)return;const perfil=req.body??{};if(Object.keys(perfil).sort().join('|')!==[...camposPerfil].sort().join('|')||camposPerfil.some(k=>!Number.isInteger(perfil[k])||perfil[k]<1||perfil[k]>5))return res.status(400).json({error:'Valorá los cuatro aspectos de 1 a 5.'});const datos=JSON.stringify(perfil);db.prepare("INSERT INTO estudio_perfiles(usuario_id,datos,actualizado_en) VALUES(?,?,datetime('now')) ON CONFLICT(usuario_id) DO UPDATE SET datos=excluded.datos,actualizado_en=excluded.actualizado_en").run(u.id,datos);db.prepare('INSERT INTO estudio_perfil_historial(usuario_id,datos) VALUES(?,?)').run(u.id,datos);res.json({perfil,recomendacion:recomendarMetodo(perfil,resumenUsuario(u))});}));
  const propia=(req,res)=>{const u=acceso(req,res);if(!u)return null;const p=db.prepare('SELECT * FROM estudio_practicas WHERE id=? AND institucion_id=?').get(entero(req.params.id),u.institucionId);if(!p||!practicaVisible(db,p,u)){res.status(404).json({error:'Práctica no disponible.'});return null;}return {u,p};};
  const evolucion=prepararEstudioEvolucion(app,db,{acceso,propia,practicaVisible,generarActividad,proximoRepaso});
  app.get('/api/estudio/metodos',ventanilla((req,res)=>{const u=acceso(req,res);if(!u)return;const fichas=leerGenoma(db,u.institucionId).personalizacion?.evidencias??{};res.json({metodos:catalogoMetodos().map(m=>({...m,evidencia:{...m.evidencia,...(fichas[m.id]??{})}}))});}));
  app.get('/api/estudio/practicas',ventanilla((req,res)=>{const u=acceso(req,res);if(u)res.json({practicas:db.prepare("SELECT p.id,p.institucion_id,p.autor_id,p.leccion_id,p.visibilidad,p.metodo,p.titulo,p.creado_en AS creadoEn,(SELECT COUNT(*) FROM estudio_intentos i WHERE i.practica_id=p.id AND i.usuario_id=?) AS intentos,COALESCE((SELECT MIN(m.siguiente_el) FROM estudio_memoria m WHERE m.practica_id=p.id AND m.usuario_id=?),(SELECT i.siguiente_el FROM estudio_intentos i WHERE i.practica_id=p.id AND i.usuario_id=? ORDER BY i.id DESC LIMIT 1)) AS siguienteEl FROM estudio_practicas p WHERE p.institucion_id=? AND (p.autor_id=? OR p.visibilidad='institucion') ORDER BY p.id DESC").all(u.id,u.id,u.id,u.institucionId,u.id).filter(p=>practicaVisible(db,p,u)).map(p=>({id:String(p.id),autorId:p.autor_id,metodo:p.metodo,titulo:p.titulo,creadoEn:p.creadoEn,intentos:p.intentos,siguienteEl:p.siguienteEl}))});}));
  app.post('/api/estudio/practicas',ventanilla((req,res)=>{const u=acceso(req,res);if(!u)return;const {metodo,titulo,banco,visibilidad='privada',leccionId=null}=req.body??{};if(!ids.has(metodo)||typeof titulo!=='string'||!titulo.trim()||titulo.length>200||!bancoValido(banco)||!['privada','institucion'].includes(visibilidad))return res.status(400).json({error:'Completá método, título y banco de conceptos estructurado.'});let leccion=null;if(leccionId!==null){if(!moduloLeccionVisible(db,u))return res.status(403).json({error:'El módulo de la lección está oculto.'});leccion=db.prepare('SELECT n.id,c.profesor_id,m.institucion_id FROM curso_nodos n JOIN catedras c ON c.id=n.catedra_id JOIN materias m ON m.id=c.materia_id WHERE n.id=? AND n.tipo=\'leccion\'').get(entero(leccionId));if(!leccion||leccion.institucion_id!==u.institucionId||!(leccion.profesor_id===u.id||u.rol==='admin-academico')||visibilidad!=='institucion')return res.status(403).json({error:'Solo el docente puede vincular una práctica compartida a su lección.'});}const id=db.prepare('INSERT INTO estudio_practicas(institucion_id,autor_id,leccion_id,metodo,titulo,banco,visibilidad) VALUES(?,?,?,?,?,?,?)').run(u.institucionId,u.id,leccion?.id??null,metodo,titulo.trim(),JSON.stringify(banco),visibilidad).lastInsertRowid;res.status(201).json({id:String(id)});}));
  app.get('/api/estudio/lecciones/:leccionId/practicas',ventanilla((req,res)=>{const u=acceso(req,res);if(!u)return;if(!moduloLeccionVisible(db,u))return res.status(403).json({error:'El módulo de la lección está oculto.'});const leccion=db.prepare('SELECT n.id,n.catedra_id,c.profesor_id,c.curso_id,m.institucion_id FROM curso_nodos n JOIN catedras c ON c.id=n.catedra_id JOIN materias m ON m.id=c.materia_id WHERE n.id=? AND n.tipo=\'leccion\'').get(entero(req.params.leccionId));if(!leccion||leccion.institucion_id!==u.institucionId)return res.status(404).json({error:'Lección no disponible.'});const docente=leccion.profesor_id===u.id||u.rol==='admin-academico';const inscrito=!!db.prepare('SELECT 1 FROM inscripciones WHERE curso_id=? AND estudiante_id=?').get(leccion.curso_id,u.id);if(!docente&&(!inscrito||!leccionDisponible(db,leccion,u.id)))return res.status(403).json({error:'No participás en esta lección.'});res.json({practicas:db.prepare("SELECT p.id,p.titulo,p.metodo,(SELECT COUNT(*) FROM estudio_intentos i WHERE i.practica_id=p.id AND i.usuario_id=?) AS intentos,COALESCE((SELECT MIN(m.siguiente_el) FROM estudio_memoria m WHERE m.practica_id=p.id AND m.usuario_id=?),(SELECT i.siguiente_el FROM estudio_intentos i WHERE i.practica_id=p.id AND i.usuario_id=? ORDER BY i.id DESC LIMIT 1)) AS siguienteEl FROM estudio_practicas p WHERE p.leccion_id=? AND p.visibilidad='institucion' ORDER BY p.id").all(u.id,u.id,u.id,leccion.id).map(p=>({...p,id:String(p.id)}))});}));
  app.get('/api/estudio/practicas/:id',ventanilla(evolucion.detalle));
  app.post('/api/estudio/practicas/:id/intentos',ventanilla(evolucion.intentar));
}
