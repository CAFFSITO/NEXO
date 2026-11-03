// ============================================================================
// NEXO — Servicio de archivos (Etapa 4, sección 14.19)
// ----------------------------------------------------------------------------
// UNA sola pieza que sube y baja archivos para todos los módulos (entregas,
// recursos, adjuntos de chat, evidencias, comunicados). Los demás módulos NO
// guardan archivos por su cuenta: suben acá, se quedan con el `id` que devuelve
// y lo referencian. Así hay un solo lugar donde vive un archivo y un solo lugar
// donde se decide quién puede bajarlo (principio de fuente única, sección 1.4).
//
// Las dos ventanillas:
//   POST /api/archivos      → subir. El cuerpo son los bytes crudos del archivo;
//                             el nombre y el tipo viajan en cabeceras. Devuelve
//                             el registro creado en la tabla `archivos`.
//   GET  /api/archivos/:id  → bajar. Antes de entregar un solo byte comprueba
//                             que QUIEN pide tiene permiso sobre ese archivo
//                             (regla de oro 4 del plan): no alcanza con conocer
//                             el número, hay que tener una relación real con él.
//
// Por qué bytes crudos y no un formulario multipart: el navegador manda el
// archivo con `fetch(..., { body: File })`, que viaja como un cuerpo binario
// simple. Parsear multipart a mano es frágil y traería una dependencia nueva;
// con `express.raw` alcanza y no se instala nada (regla: reutilizar, no sumar).
// ============================================================================

import express from "express";
import { mkdirSync, writeFileSync, existsSync, appendFileSync, readFileSync, unlinkSync, statSync, truncateSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { randomBytes } from "node:crypto";
import { puedeDescargarArchivoProyecto } from './proyectos.js';
import { exigirSesion, ventanilla, estaInscripto } from "./comun.js";
import { canalDe } from "./canales.js";
import { puedeVer } from './permisos.js';
import { paginaVisible } from './genoma.js';
import { leccionRealizada } from './lecciones.js';

// Topes de tamaño: 15 MB para documentos e imágenes (una entrega, un recurso) y
// 100 MB para video y audio (la Comunidad). Un freno para que nadie llene el
// disco del servidor de una.
const LIMITE_BYTES = 15 * 1024 * 1024;
const LIMITE_MULTIMEDIA = 100 * 1024 * 1024;
const esMultimedia = (tipo) => tipo.startsWith("video/") || tipo.startsWith("audio/");

// Lo que se puede MOSTRAR en la página (?inline=1). El resto siempre se
// descarga: un HTML o un SVG subido por alguien nunca se ejecuta en NEXO.
const TIPOS_EN_LINEA = new Set(["application/pdf", "text/plain", "image/png", "image/jpeg", "image/gif", "image/webp"]);
const seMuestraEnLinea = (tipo) => TIPOS_EN_LINEA.has(tipo) || esMultimedia(tipo);

// Se admite cualquier extensión. El contenido activo siempre se descarga como
// binario, incluso si quien lo sube declara un MIME de imagen o documento.
const EXTENSIONES_SOLO_DESCARGA = new Set([".exe", ".bat", ".cmd", ".com", ".msi", ".scr", ".ps1", ".vbs", ".jar", ".app", ".sh", ".dll", ".html", ".htm", ".svg", ".hta", ".lnk", ".js", ".mjs", ".xhtml"]);

// Tipos conocidos: se guardan con su tipo. Cualquier otro se guarda como binario
// genérico (application/octet-stream), que nunca se muestra en la página: solo se
// descarga. Así un tipo nuevo peligroso no pasa "por olvido" a mostrarse. Los
// archivos activos se fuerzan a binario por extensión.
const TIPOS_PERMITIDOS = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-zip-compressed",
  "text/plain",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/heic",
  // Video y audio (la Comunidad: perfiles con la capacidad "multimedia").
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/ogg",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/aac",
  "audio/x-m4a",
  "audio/x-wav",
  "audio/flac",
  "audio/x-flac",
  "audio/3gpp",
  // Más documentos y comprimidos.
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.presentation",
  "application/rtf",
  "application/epub+zip",
  "application/json",
  "text/markdown",
  "application/x-7z-compressed",
  "application/vnd.rar",
  "application/x-rar-compressed",
  // Cualquier otro archivo (el navegador lo manda así si no conoce el tipo).
  "application/octet-stream",
]);

/**
 * ¿Puede este usuario bajar este archivo? Devuelve el registro del archivo si
 * sí, o null si no (y en ese caso ya se contestó con el código correcto).
 *
 * Las reglas, de la más simple a la más específica:
 *   1. Quien lo subió siempre puede: es suyo.
 *   2. Adjunto de la consigna de una tarea → lo ven el docente de esa cátedra y
 *      los estudiantes inscriptos en su curso.
 *   3. Archivo de una entrega → lo ven el autor de la entrega y el docente que
 *      la corrige. Nadie más (ni siquiera un compañero del curso).
 *
 * A medida que otros módulos (biblioteca, chat, evidencias) usen este servicio,
 * se suman acá sus relaciones. Por defecto: si no hay una relación conocida que
 * habilite, NO se baja. Negar es la respuesta segura.
 */
function archivoDescargable(db, usuario, archivoId, res) {
  const archivo = db
    .prepare("SELECT * FROM archivos WHERE id = ?")
    .get(archivoId);

  if (!archivo) {
    res.status(404).json({ error: "Ese archivo no existe." });
    return null;
  }

  // 1. El dueño.
  if (archivo.subido_por === usuario.id) return archivo;
  if (puedeDescargarArchivoProyecto(db,usuario,archivoId)) return archivo;

  // Evidencia de un paso delegado: únicamente dueño de la meta o responsable
  // actual. Revocar la asignación revoca también la descarga del adjunto.
  const evidenciaPaso=db.prepare(`SELECT 1 FROM subtareas s JOIN metas m ON m.id=s.meta_id
    JOIN usuarios o ON o.id=m.estudiante_id
    WHERE s.archivo_id=? AND o.institucion_id=? AND m.estado<>'archivada'
      AND (m.estudiante_id=? OR s.responsable_id=?) LIMIT 1`).get(archivoId,usuario.institucionId,usuario.id,usuario.id);
  if(evidenciaPaso)return archivo;

  // 2. Adjunto de la consigna de una tarea.
  const comoAdjunto = db
    .prepare(
      `SELECT ca.profesor_id, ca.curso_id
         FROM tarea_adjuntos ta
         JOIN tareas t   ON t.id = ta.tarea_id
         JOIN catedras ca ON ca.id = t.catedra_id
        WHERE ta.archivo_id = ?`
    )
    .get(archivoId);
  if (comoAdjunto) {
    if (usuario.id === comoAdjunto.profesor_id) return archivo;
    if (estaInscripto(db, usuario.id, comoAdjunto.curso_id)) return archivo;
  }

  // 3. Archivo de una entrega.
  const comoEntrega = db
    .prepare(
      `SELECT e.id AS entrega_id, e.estudiante_id, e.equipo_id, e.anulada_en, ca.profesor_id, ca.curso_id
         FROM entrega_archivos ea
         JOIN entregas e ON e.id = ea.entrega_id
         JOIN tareas t   ON t.id = e.tarea_id
         JOIN catedras ca ON ca.id = t.catedra_id
        WHERE ea.archivo_id = ?`
    )
    .get(archivoId);
  if (comoEntrega) {
    if (usuario.id === comoEntrega.estudiante_id) return archivo;
    if (usuario.id === comoEntrega.profesor_id) return archivo;
    if (comoEntrega.equipo_id && db.prepare('SELECT 1 FROM tarea_equipo_miembros WHERE equipo_id=? AND estudiante_id=?').get(comoEntrega.equipo_id, usuario.id)) return archivo;
    if (!comoEntrega.anulada_en && estaInscripto(db, usuario.id, comoEntrega.curso_id) &&
        db.prepare('SELECT 1 FROM revisiones_pares WHERE entrega_id=? AND revisor_id=?').get(comoEntrega.entrega_id, usuario.id)) return archivo;
  }

  // 4. Adjunto de un mensaje de chat → lo ven los miembros de esa conversación
  //    (Error 2.F.3). El que lo mandó ya pasó por la regla 1; esto habilita a
  //    quien lo recibe. Solo miembros: un tercero con el número no lo baja.
  const comoAdjuntoChat = db
    .prepare(
      `SELECT m.conversacion_id, c.tipo
         FROM mensajes m
         JOIN conversaciones c ON c.id = m.conversacion_id
         JOIN conversacion_miembros cm ON cm.conversacion_id = m.conversacion_id
        WHERE m.archivo_id = ? AND cm.usuario_id = ? AND m.eliminado_en IS NULL`
    )
    .all(archivoId, usuario.id);
  if (comoAdjuntoChat.some(c => c.tipo !== 'canal' || canalDe(db,c.conversacion_id,usuario)?.miembro)) return archivo;

  // 5. Archivo de un recurso de BIBLIOTECA (Error 2.E.4). Un recurso aprobado
  //    lo baja quien puede verlo en la biblioteca: cualquiera si es nacional,
  //    la gente del colegio si es institucional. Uno todavía en revisión solo
  //    lo bajan quienes revisan (bibliotecario / dirección de ese colegio);
  //    el autor ya pasó por la regla 1.
  const comoRecurso = db
    .prepare(
      `SELECT institucion_id, alcance, estado
         FROM recursos
        WHERE archivo_id = ? AND eliminado_en IS NULL`
    )
    .get(archivoId);
  if (comoRecurso) {
    const delColegio =
      comoRecurso.institucion_id === null ||
      comoRecurso.institucion_id === usuario.institucionId;
    if (comoRecurso.estado === "aprobado") {
      if (comoRecurso.alcance === "nacional" || delColegio) return archivo;
    }
    if (
      comoRecurso.estado === "en-revision" &&
      delColegio &&
      (usuario.rol === "bibliotecario" || usuario.rol === "admin-academico")
    ) {
      return archivo;
    }
  }

  // 6. Adjunto de un COMUNICADO → lo baja la familia destinataria (14.13):
  //    si el comunicado es de toda la institución, cualquier familia del
  //    colegio; si es de un curso, la familia con un hijo inscripto en él.
  //    El emisor ya pasó por la regla 1.
  const comoComunicado = db
    .prepare(
      `SELECT institucion_id, curso_id FROM comunicados WHERE archivo_id = ?`
    )
    .get(archivoId);
  if (comoComunicado && comoComunicado.institucion_id === usuario.institucionId) {
    if (comoComunicado.curso_id === null) return archivo;
    const esDestinataria = db
      .prepare(
        `SELECT 1
           FROM familiares f
           JOIN inscripciones i ON i.estudiante_id = f.estudiante_id
          WHERE f.usuario_familia_id = ? AND i.curso_id = ?
          LIMIT 1`
      )
      .get(usuario.id, comoComunicado.curso_id);
    if (esDestinataria) return archivo;
  }

  // 7. Adjunto de la COMUNIDAD (publicación, respuesta, debate o aporte) → lo
  //    baja la gente de esa escuela mientras el contenido siga publicado. Una
  //    publicación programada todavía no existe para el resto.
  const enComunidad = db.prepare("SELECT objeto_tipo, objeto_id FROM contenido_adjuntos WHERE archivo_id = ?").all(archivoId);
  const imagenVieja = db.prepare("SELECT id FROM publicaciones WHERE imagen_id = ?").all(archivoId).map((p) => ({ objeto_tipo: "publicacion", objeto_id: p.id }));
  for (const { objeto_tipo: tipo, objeto_id: id } of [...enComunidad, ...imagenVieja]) {
    if (institucionDeContenido(db, tipo, id) === usuario.institucionId) return archivo;
  }

  // 8. Adjunto de un AVISO (anuncios obligatorios) → lo baja cada persona a la
  //    que le llegó ese aviso. Quien lo mandó ya pasó por la regla 1.
  const comoAviso = db
    .prepare(
      `SELECT 1
         FROM anuncio_adjuntos aa
         JOIN anuncio_destinatarios d ON d.anuncio_id = aa.anuncio_id
        WHERE aa.archivo_id = ? AND d.usuario_id = ?
        LIMIT 1`
    )
    .get(archivoId, usuario.id);
  if (comoAviso) return archivo;

  // Respuestas privadas: emisor del aviso y destinatario de ese hilo solamente.
  const comoRespuesta = db.prepare(`SELECT 1 FROM anuncio_respuesta_adjuntos ra
    JOIN anuncio_respuestas r ON r.id = ra.respuesta_id JOIN anuncios a ON a.id = r.anuncio_id
    WHERE ra.archivo_id = ? AND a.institucion_id = ? AND (a.autor_id = ? OR r.destinatario_id = ?) LIMIT 1`)
    .get(archivoId, usuario.institucionId, usuario.id, usuario.id);
  if (comoRespuesta) return archivo;

  // Adjuntos de bloques publicados/compartidos: sólo lectores actuales del
  // documento y del módulo, nunca por una versión histórica o ID adivinado.
  if (puedeVer(usuario.rol,'documentos') && paginaVisible(db,usuario,'documentos')) {
    const documento=db.prepare(`SELECT 1 FROM documentos_nexo d, json_each(d.contenido) b
      WHERE d.institucion_id=? AND json_extract(b.value,'$.tipo')='archivo'
        AND CAST(json_extract(b.value,'$.archivoId') AS TEXT)=?
        AND (d.publicado=1 OR d.autor_id=? OR EXISTS(SELECT 1 FROM documentos_nexo_colaboradores c WHERE c.documento_id=d.id AND c.usuario_id=?)) LIMIT 1`)
      .get(usuario.institucionId,String(archivoId),usuario.id,usuario.id);
    if(documento)return archivo;
  }

  // Material grabado dentro de una lección: solo participantes de esa cátedra.
  // Las condiciones de publicación se vuelven a comprobar al descargar, no
  // solo al listar, para que un enlace directo no salte la secuencia didáctica.
  const enLecciones = db.prepare(`SELECT n.id,n.catedra_id,n.padre_id,n.publicado,n.disponible_desde,n.prerrequisito_id,
      ca.profesor_id,ca.curso_id,m.institucion_id
    FROM curso_nodos n JOIN catedras ca ON ca.id=n.catedra_id JOIN materias m ON m.id=ca.materia_id
    WHERE n.archivo_id=?`).all(archivoId);
  const ahora=new Date().toISOString();
  for (const n of enLecciones) {
    if(n.institucion_id!==usuario.institucionId)continue;
    if(!paginaVisible(db,usuario,usuario.rol==='admin-academico'?'cursos-activos':'detalle-materia-estudiante'))continue;
    if(usuario.id===n.profesor_id||usuario.rol==='admin-academico')return archivo;
    if(!estaInscripto(db,usuario.id,n.curso_id))continue;
    let cursor=n;const vistos=new Set();let visible=true;
    while(cursor){
      if(vistos.has(cursor.id)||!cursor.publicado||cursor.disponible_desde&&cursor.disponible_desde>ahora||cursor.prerrequisito_id&&!leccionRealizada(db,cursor.prerrequisito_id,usuario.id)){visible=false;break;}
      vistos.add(cursor.id);
      if(!cursor.padre_id)break;
      cursor=db.prepare('SELECT * FROM curso_nodos WHERE id=? AND catedra_id=?').get(cursor.padre_id,n.catedra_id);
      if(!cursor){visible=false;break;}
    }
    if(!visible)continue;
    return archivo;
  }

  res.status(403).json({ error: "No tenés permiso para ver este archivo." });
  return null;
}

/** La escuela de un contenido publicado de la Comunidad (null si no está o no se ve). */
function institucionDeContenido(db, tipo, id) {
  if (tipo === "publicacion") {
    return db.prepare(
      "SELECT institucion_id AS i FROM publicaciones WHERE id = ? AND eliminado_en IS NULL AND (publicar_en IS NULL OR publicar_en <= datetime('now'))"
    ).get(id)?.i ?? null;
  }
  if (tipo === "debate") return db.prepare("SELECT institucion_id AS i FROM debates WHERE id = ? AND eliminado_en IS NULL").get(id)?.i ?? null;
  if (tipo === "aporte") {
    return db.prepare(
      "SELECT d.institucion_id AS i FROM debate_aportes a JOIN debates d ON d.id = a.debate_id WHERE a.id = ? AND a.eliminado_en IS NULL AND d.eliminado_en IS NULL"
    ).get(id)?.i ?? null;
  }
  if (tipo === "comentario") {
    const c = db.prepare("SELECT objeto_tipo, objeto_id FROM comentarios WHERE id = ? AND eliminado_en IS NULL").get(id);
    return c ? institucionDeContenido(db, c.objeto_tipo, c.objeto_id) : null;
  }
  return null;
}

/** Deja un nombre de archivo sin separadores de ruta ni caracteres raros. */
function nombreSeguro(nombre) {
  const limpio = basename(nombre).replace(/[^\w.\- ]+/g, "_").trim();
  return limpio || "archivo";
}

/**
 * Guarda un archivo generado POR EL SERVIDOR (no subido por el navegador) en el
 * mismo almacén y con el mismo registro que las subidas normales. Lo usa el
 * módulo de reportes (Etapa 8, 14.18): en vez de duplicar la lógica de "escribir
 * en disco + anotar en la tabla `archivos`", reutiliza esta única pieza
 * (principio de fuente única, sección 1.4). Devuelve el registro creado.
 *
 * El `subidoPor` es quien lo generó: así, la ventanilla de descarga
 * (`archivoDescargable`, regla 1: el dueño) lo deja bajar sin permisos extra.
 */
export function guardarArchivoServidor(
  db,
  carpetaServidor,
  { nombreOriginal, tipoMime, bytes, subidoPor }
) {
  const almacen = join(carpetaServidor, "almacen");
  mkdirSync(almacen, { recursive: true });

  const nombre = nombreSeguro(nombreOriginal);
  const enDisco = randomBytes(12).toString("hex") + extname(nombre);
  writeFileSync(join(almacen, enDisco), bytes);

  const info = db
    .prepare(
      `INSERT INTO archivos (nombre_original, ruta_local, tipo_mime, tamano_bytes, subido_por)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(nombre, enDisco, tipoMime, bytes.length, subidoPor);

  return {
    id: Number(info.lastInsertRowid),
    nombreOriginal: nombre,
    tipoMime,
    tamanoBytes: bytes.length,
  };
}

export function registrarArchivos(app, db, carpetaServidor) {
  // Carpeta donde quedan los bytes. Se crea si no existe (la primera subida no
  // debería fallar por una carpeta que falta).
  const almacen = join(carpetaServidor, "almacen");
  mkdirSync(almacen, { recursive: true });
  const temporales = join(carpetaServidor, 'cargas');
  mkdirSync(temporales, { recursive: true });
  db.exec(`CREATE TABLE IF NOT EXISTS archivo_cargas (
    id TEXT PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL, tipo TEXT NOT NULL, tamano INTEGER NOT NULL,
    recibido INTEGER NOT NULL DEFAULT 0, archivo_id INTEGER REFERENCES archivos(id),
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  if (!db.prepare('PRAGMA table_info(archivo_cargas)').all().some(c=>c.name==='archivo_id'))
    db.exec('ALTER TABLE archivo_cargas ADD COLUMN archivo_id INTEGER REFERENCES archivos(id)');
  db.exec(`CREATE TABLE IF NOT EXISTS archivo_carpetas (
    id INTEGER PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL, creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS archivo_carpeta_elementos (
    carpeta_id INTEGER NOT NULL REFERENCES archivo_carpetas(id) ON DELETE CASCADE,
    archivo_id INTEGER NOT NULL REFERENCES archivos(id) ON DELETE CASCADE,
    PRIMARY KEY(carpeta_id,archivo_id)
  );`);
  db.exec(`CREATE TABLE IF NOT EXISTS archivo_cuotas (
    institucion_id INTEGER PRIMARY KEY REFERENCES instituciones(id) ON DELETE CASCADE,
    limite_bytes INTEGER NOT NULL CHECK(limite_bytes > 0)
  );`);
  const cuota=(institucionId)=>{
    const limite=db.prepare('SELECT limite_bytes FROM archivo_cuotas WHERE institucion_id=?').get(institucionId)?.limite_bytes??null;
    const usado=db.prepare('SELECT COALESCE(SUM(a.tamano_bytes),0) AS total FROM archivos a JOIN usuarios u ON u.id=a.subido_por WHERE u.institucion_id=?').get(institucionId).total;
    const reservado=db.prepare(`SELECT COALESCE(SUM(c.tamano),0) AS total FROM archivo_cargas c JOIN usuarios u ON u.id=c.usuario_id
      WHERE u.institucion_id=? AND c.archivo_id IS NULL`).get(institucionId).total;
    return {limiteBytes:limite,usadoBytes:usado,reservadoBytes:reservado};
  };
  app.get('/api/archivos/cuota',ventanilla((req,res)=>{
    const u=exigirSesion(db,req,res);if(!u)return;
    res.json(cuota(u.institucionId));
  }));
  app.put('/api/archivos/cuota',ventanilla((req,res)=>{
    const u=exigirSesion(db,req,res);if(!u)return;
    if(u.rol!=='admin-academico')return res.status(403).json({error:'Solo la dirección configura la cuota de archivos.'});
    const valor=req.body?.limiteBytes;
    if(valor!==null&&(!Number.isSafeInteger(valor)||valor<1024*1024||valor>Number.MAX_SAFE_INTEGER))return res.status(400).json({error:'Indicá una cuota de al menos 1 MB o dejala sin límite.'});
    if(valor===null)db.prepare('DELETE FROM archivo_cuotas WHERE institucion_id=?').run(u.institucionId);
    else db.prepare('INSERT INTO archivo_cuotas(institucion_id,limite_bytes) VALUES(?,?) ON CONFLICT(institucion_id) DO UPDATE SET limite_bytes=excluded.limite_bytes').run(u.institucionId,valor);
    res.json(cuota(u.institucionId));
  }));
  // Las cargas sin actividad se liberan al arrancar. Las terminadas conservan
  // el recibo un mes para responder de forma idempotente a reintentos tardíos.
  for (const c of db.prepare("SELECT id FROM archivo_cargas WHERE archivo_id IS NULL AND creado_en < datetime('now','-7 days')").all()) {
    const ruta=join(temporales,c.id);if(existsSync(ruta))unlinkSync(ruta);
    db.prepare('DELETE FROM archivo_cargas WHERE id=?').run(c.id);
  }
  db.prepare("DELETE FROM archivo_cargas WHERE archivo_id IS NOT NULL AND creado_en < datetime('now','-30 days')").run();
  app.get('/api/archivos/mis-archivos',ventanilla((req,res)=>{
    const u=exigirSesion(db,req,res);if(!u)return;
    const q=String(req.query?.q??'').trim().slice(0,120);
    const normalizar=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const archivos=db.prepare('SELECT id,nombre_original,tipo_mime,tamano_bytes FROM archivos WHERE subido_por=? ORDER BY id DESC LIMIT 1000').all(u.id)
      .filter(a=>!q||normalizar(a.nombre_original).includes(normalizar(q))).slice(0,100)
      .map(a=>({id:String(a.id),nombre:a.nombre_original,tipoMime:a.tipo_mime,tamanoBytes:a.tamano_bytes}));
    res.json({archivos});
  }));
  app.get('/api/archivos/carpetas',ventanilla((req,res)=>{
    const u=exigirSesion(db,req,res);if(!u)return;
    const carpetas=db.prepare(`SELECT c.id,c.nombre,COUNT(e.archivo_id) AS total FROM archivo_carpetas c
      LEFT JOIN archivo_carpeta_elementos e ON e.carpeta_id=c.id WHERE c.usuario_id=? GROUP BY c.id ORDER BY c.nombre`).all(u.id);
    res.json({carpetas:carpetas.map(c=>({...c,id:String(c.id)}))});
  }));
  app.post('/api/archivos/carpetas',ventanilla((req,res)=>{
    const u=exigirSesion(db,req,res);if(!u)return;
    const nombre=String(req.body?.nombre??'').trim();if(!nombre||nombre.length>120)return res.status(400).json({error:'Nombre de carpeta inválido.'});
    const id=db.prepare('INSERT INTO archivo_carpetas(usuario_id,nombre) VALUES(?,?)').run(u.id,nombre).lastInsertRowid;
    res.status(201).json({id:String(id),nombre});
  }));
  app.get('/api/archivos/carpetas/:id',ventanilla((req,res)=>{
    const u=exigirSesion(db,req,res);if(!u)return;
    const c=db.prepare('SELECT id,nombre FROM archivo_carpetas WHERE id=? AND usuario_id=?').get(Number(req.params.id),u.id);
    if(!c)return res.status(404).json({error:'Carpeta no disponible.'});
    const archivos=db.prepare(`SELECT a.id,a.nombre_original AS nombre,a.tipo_mime AS tipoMime,a.tamano_bytes AS tamanoBytes
      FROM archivo_carpeta_elementos e JOIN archivos a ON a.id=e.archivo_id
      WHERE e.carpeta_id=? AND a.subido_por=? ORDER BY a.id DESC`).all(c.id,u.id).map(a=>({...a,id:String(a.id)}));
    res.json({id:String(c.id),nombre:c.nombre,archivos});
  }));
  app.put('/api/archivos/carpetas/:id/archivos/:archivoId',ventanilla((req,res)=>{
    const u=exigirSesion(db,req,res);if(!u)return;
    const c=db.prepare('SELECT id FROM archivo_carpetas WHERE id=? AND usuario_id=?').get(Number(req.params.id),u.id);
    const a=db.prepare('SELECT id FROM archivos WHERE id=? AND subido_por=?').get(Number(req.params.archivoId),u.id);
    if(!c||!a)return res.status(404).json({error:'Carpeta o archivo no disponible.'});
    db.prepare('INSERT OR IGNORE INTO archivo_carpeta_elementos(carpeta_id,archivo_id) VALUES(?,?)').run(c.id,a.id);res.json({ok:true});
  }));
  app.delete('/api/archivos/carpetas/:id/archivos/:archivoId',ventanilla((req,res)=>{
    const u=exigirSesion(db,req,res);if(!u)return;
    db.prepare('DELETE FROM archivo_carpeta_elementos WHERE carpeta_id IN (SELECT id FROM archivo_carpetas WHERE id=? AND usuario_id=?) AND archivo_id=?').run(Number(req.params.id),u.id,Number(req.params.archivoId));
    res.json({ok:true});
  }));
  const cargaPropia=(id,u)=>db.prepare('SELECT * FROM archivo_cargas WHERE id=? AND usuario_id=?').get(id,u.id);
  app.post('/api/archivos/cargas',ventanilla((req,res)=>{
    const u=exigirSesion(db,req,res);if(!u)return;
    const nombre=nombreSeguro(String(req.body?.nombre??'')),declarado=String(req.body?.tipo??'application/octet-stream').toLowerCase();
    const tipo=!EXTENSIONES_SOLO_DESCARGA.has(extname(nombre).toLowerCase())&&TIPOS_PERMITIDOS.has(declarado)?declarado:'application/octet-stream';
    const tamano=Number(req.body?.tamano);
    if(!Number.isSafeInteger(tamano)||tamano<1||tamano>(esMultimedia(tipo)?LIMITE_MULTIMEDIA:LIMITE_BYTES))return res.status(413).json({error:'Tamaño no admitido.'});
    const espacio=cuota(u.institucionId);
    if(espacio.limiteBytes!==null&&espacio.usadoBytes+espacio.reservadoBytes+tamano>espacio.limiteBytes)return res.status(413).json({error:'La escuela alcanzó su cuota de archivos.'});
    const id=randomBytes(20).toString('hex');
    db.prepare('INSERT INTO archivo_cargas(id,usuario_id,nombre,tipo,tamano) VALUES(?,?,?,?,?)').run(id,u.id,nombre,tipo,tamano);
    writeFileSync(join(temporales,id),Buffer.alloc(0));
    res.status(201).json({id,recibido:0,tamano});
  }));
  app.get('/api/archivos/cargas/:id',ventanilla((req,res)=>{
    const u=exigirSesion(db,req,res);if(!u)return;
    const c=cargaPropia(req.params.id,u);if(!c)return res.status(404).json({error:'Carga no disponible.'});
    res.json({id:c.id,recibido:c.recibido,tamano:c.tamano,archivo:c.archivo_id?archivoDeCarga(c):null});
  }));
  function archivoDeCarga(c) { return {id:String(c.archivo_id),nombreOriginal:c.nombre,tipoMime:c.tipo,tamanoBytes:c.tamano}; }
  app.put('/api/archivos/cargas/:id',express.raw({type:'*/*',limit:'5mb'}),ventanilla((req,res)=>{
    const u=exigirSesion(db,req,res);if(!u)return;
    const c=cargaPropia(req.params.id,u);if(!c)return res.status(404).json({error:'Carga no disponible.'});
    if(c.archivo_id)return res.status(409).json({error:'La carga ya finalizó.',recibido:c.recibido});
    const offset=Number(req.headers['x-offset']),bytes=req.body;
    if(!Number.isSafeInteger(offset)||offset!==c.recibido)return res.status(409).json({error:'Consultá la posición recibida antes de reintentar.',recibido:c.recibido});
    if(!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>5*1024*1024||offset+bytes.length>c.tamano)return res.status(400).json({error:'Fragmento inválido.'});
    const ruta=join(temporales,c.id);if(!existsSync(ruta))return res.status(409).json({error:'Falta el archivo temporal; reiniciá la carga.'});
    const tamanoDisco=statSync(ruta).size;
    if(tamanoDisco<c.recibido)return res.status(409).json({error:'La carga temporal está incompleta; reiniciá la carga.'});
    if(tamanoDisco>c.recibido)truncateSync(ruta,c.recibido);
    appendFileSync(ruta,bytes);
    db.prepare('UPDATE archivo_cargas SET recibido=? WHERE id=?').run(offset+bytes.length,c.id);
    res.json({recibido:offset+bytes.length,tamano:c.tamano});
  }));
  app.post('/api/archivos/cargas/:id/completar',ventanilla((req,res)=>{
    const u=exigirSesion(db,req,res);if(!u)return;
    const c=cargaPropia(req.params.id,u);if(!c)return res.status(404).json({error:'Carga no disponible.'});
    if(c.archivo_id)return res.json({archivo:archivoDeCarga(c)});
    if(c.recibido!==c.tamano)return res.status(409).json({error:'Todavía faltan fragmentos.',recibido:c.recibido});
    const ruta=join(temporales,c.id);if(!existsSync(ruta))return res.status(409).json({error:'Falta el archivo temporal.'});
    const bytes=readFileSync(ruta);if(bytes.length!==c.tamano)return res.status(409).json({error:'La carga está incompleta.'});
    const espacio=cuota(u.institucionId);
    if(espacio.limiteBytes!==null&&espacio.usadoBytes+espacio.reservadoBytes-c.tamano+bytes.length>espacio.limiteBytes)return res.status(413).json({error:'La escuela alcanzó su cuota de archivos.'});
    const guardado=guardarArchivoServidor(db,carpetaServidor,{nombreOriginal:c.nombre,tipoMime:c.tipo,bytes,subidoPor:u.id});
    db.prepare('UPDATE archivo_cargas SET archivo_id=? WHERE id=?').run(guardado.id,c.id);unlinkSync(ruta);
    res.status(201).json({archivo:{id:String(guardado.id),nombreOriginal:guardado.nombreOriginal,tipoMime:guardado.tipoMime,tamanoBytes:guardado.tamanoBytes}});
  }));
  app.delete('/api/archivos/cargas/:id',ventanilla((req,res)=>{
    const u=exigirSesion(db,req,res);if(!u)return;
    const c=cargaPropia(req.params.id,u);if(!c)return res.status(404).json({error:'Carga no disponible.'});
    if(c.archivo_id)return res.status(409).json({error:'La carga ya finalizó.'});
    db.prepare('DELETE FROM archivo_cargas WHERE id=?').run(c.id);
    const ruta=join(temporales,c.id);if(existsSync(ruta))unlinkSync(ruta);
    res.json({ok:true});
  }));

  // ── Subir ──────────────────────────────────────────────────────────────────
  // express.raw junta el cuerpo binario en un Buffer. Se limita acá también el
  // tamaño: sin esto, alguien podría mandar gigabytes antes de que miremos.
  app.post(
    "/api/archivos",
    express.raw({ type: "*/*", limit: LIMITE_MULTIMEDIA }),
    ventanilla((req, res) => {
      const usuario = exigirSesion(db, req, res);
      if (!usuario) return;

      const bytes = req.body;
      if (!Buffer.isBuffer(bytes) || bytes.length === 0) {
        return res.status(400).json({ error: "No llegó ningún archivo." });
      }
      // Un tipo que no está en la lista se guarda como binario genérico en vez
      // de rechazarse: subirlo así ya estaba permitido (octet-stream), y un
      // archivo genérico nunca se muestra en la página, solo se descarga. Lo que
      // tenga contenido activo también se entrega exclusivamente como descarga.
      const declarado = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
      const nombreOriginal = decodeURIComponent(String(req.headers["x-nombre-archivo"] || "archivo"));
      const tipo = !EXTENSIONES_SOLO_DESCARGA.has(extname(nombreOriginal.trim()).toLowerCase()) && TIPOS_PERMITIDOS.has(declarado) ? declarado : "application/octet-stream";
      if (bytes.length > (esMultimedia(tipo) ? LIMITE_MULTIMEDIA : LIMITE_BYTES)) {
        return res
          .status(413)
          .json({ error: esMultimedia(tipo) ? "El video o audio supera el límite de 100 MB." : "El archivo supera el límite de 15 MB." });
      }
      const espacio=cuota(usuario.institucionId);
      if(espacio.limiteBytes!==null&&espacio.usadoBytes+espacio.reservadoBytes+bytes.length>espacio.limiteBytes)return res.status(413).json({error:'La escuela alcanzó su cuota de archivos.'});

      // Escribir en disco y anotar en la tabla, con la MISMA pieza que usa el
      // servidor para los reportes que genera él mismo (sección 1.4).
      const guardado = guardarArchivoServidor(db, carpetaServidor, {
        nombreOriginal,
        tipoMime: tipo,
        bytes,
        subidoPor: usuario.id,
      });

      res.status(201).json({
        archivo: {
          id: String(guardado.id),
          nombreOriginal: guardado.nombreOriginal,
          tipoMime: guardado.tipoMime,
          tamanoBytes: guardado.tamanoBytes,
        },
      });
    })
  );

  // ── Bajar ────────────────────────────────────────────────────────────────
  app.get(
    "/api/archivos/:id",
    ventanilla((req, res) => {
      const usuario = exigirSesion(db, req, res);
      if (!usuario) return;

      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: "Identificador inválido." });
      }

      const archivo = archivoDescargable(db, usuario, id, res);
      if (!archivo) return; // ya contestó con 403/404

      const ruta = join(almacen, archivo.ruta_local);
      if (!existsSync(ruta)) {
        return res
          .status(404)
          .json({ error: "El archivo figura registrado pero no está en el disco." });
      }

      res.setHeader("Content-Type", archivo.tipo_mime);
      res.setHeader("X-Content-Type-Options", "nosniff");
      // Con `?inline=1` el navegador MUESTRA el archivo en la misma página (una
      // imagen en un <img>, un PDF en un <iframe>): así el bibliotecario lo
      // previsualiza antes de decidir. Sin ese parámetro es `attachment` y se
      // descarga, como siempre. El permiso ya se validó igual para los dos casos
      // (archivoDescargable): `inline` solo cambia cómo se entrega, no a quién.
      // Y solo para lo que es seguro mostrar (imágenes, PDF, video, audio).
      const inline = (req.query?.inline === "1" || req.query?.inline === "true") && seMuestraEnLinea(archivo.tipo_mime);
      // El nombre que ve la persona es el original, no el hexadecimal con que lo
      // guardamos.
      res.setHeader(
        "Content-Disposition",
        `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(archivo.nombre_original)}`
      );
      // sendFile entiende pedidos por rangos: un video se puede adelantar.
      res.sendFile(ruta);
    })
  );
}
