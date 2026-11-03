// ============================================================================
// NEXO — Tareas académicas: el primer circuito completo (Etapa 4, sección 14.7)
// ----------------------------------------------------------------------------
// El ciclo que hoy no existía (Errores 2.C.3 a 2.C.8, 3.C.1, 3.C.9):
//
//   profesor CREA  →  estudiante ENTREGA (con archivos)  →  profesor CORRIGE
//   (nota + devolución)  →  estudiante VE su nota en Calificaciones.
//
// Hasta ahora "entregar", "ver detalle" y "corregir" eran botones que dejaban
// un console.log; las tareas del profesor eran tres ejemplos escritos a mano en
// la pantalla. Acá todo eso pasa por la base y por permisos del servidor.
//
// Reparto de ventanillas:
//   Profesor
//     GET    /api/tareas/catedras        → materias+cursos que doy (para el alta)
//     GET    /api/tareas/docente         → mis tareas creadas, con el conteo real
//     POST   /api/tareas                 → crear (rica: consigna, fecha, adjuntos)
//     PUT    /api/tareas/:id             → editar una tarea mía
//     DELETE /api/tareas/:id             → mandar a la papelera una tarea mía
//     GET    /api/tareas/:id/panel       → panel de corrección: lista del curso
//     POST   /api/entregas/:id/correccion→ poner nota y devolución
//   Estudiante
//     GET    /api/tareas/:id             → detalle: consigna, adjuntos, mi entrega
//     POST   /api/tareas/:id/entrega     → entregar (comentario + archivos)
//     DELETE /api/tareas/:id/entrega     → anular mi entrega (si no está corregida)
//   Estudiante — recordatorios propios (tareas_personales, Errores 2.C.3/2.C.8)
//     POST   /api/tareas-personales      → crear
//     PUT    /api/tareas-personales/:id  → editar
//     DELETE /api/tareas-personales/:id  → borrar
//     PUT    /api/tareas-personales/:id/completada → marcar/desmarcar
//
// La lectura de "Mis Tareas" y "Calificaciones" sigue viniendo de
// /api/portafolio (una sola fuente, Error 13.1): acá se ESCRIBE, allá se lee.
// ============================================================================

import { exigirAcceso, exigirSesion, ventanilla, estaInscripto } from "./comun.js";
import { registrarRevisionPares } from './revision-pares.js';
import { normalizarRecurrencia, expandir, sumarDias, esFechaValida } from './agenda.js';

const PAGINA_DOCENTE = "gestion-tareas-profesor";
const PAGINA_ESTUDIANTE = "mis-tareas-estudiante";

export function registrarTareas(app, db, notificaciones) {
  for(const [nombre,definicion] of [
    ['recurrencia',"TEXT"],['restantes','INTEGER'],['origen_id','INTEGER REFERENCES tareas_personales(id) ON DELETE SET NULL'],
  ]) if(!db.prepare('PRAGMA table_info(tareas_personales)').all().some(c=>c.name===nombre))db.exec(`ALTER TABLE tareas_personales ADD COLUMN ${nombre} ${definicion}`);
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_tareas_personales_origen ON tareas_personales(origen_id) WHERE origen_id IS NOT NULL');
  // Migración aditiva: los envíos históricos conservan su fila, archivos y nota.
  if (!db.prepare("PRAGMA table_info(entregas)").all().some((c) => c.name === "reemplazada_en")) {
    db.exec("ALTER TABLE entregas ADD COLUMN reemplazada_en TEXT");
  }
  db.exec(`CREATE TABLE IF NOT EXISTS tarea_equipos (id INTEGER PRIMARY KEY, tarea_id INTEGER NOT NULL REFERENCES tareas(id), nombre TEXT NOT NULL, creado_en TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS tarea_equipo_miembros (equipo_id INTEGER NOT NULL REFERENCES tarea_equipos(id), tarea_id INTEGER NOT NULL REFERENCES tareas(id), estudiante_id INTEGER NOT NULL REFERENCES usuarios(id), PRIMARY KEY(equipo_id,estudiante_id), UNIQUE(tarea_id,estudiante_id));`);
  if (!db.prepare('PRAGMA table_info(entregas)').all().some(c => c.name === 'equipo_id')) db.exec('ALTER TABLE entregas ADD COLUMN equipo_id INTEGER REFERENCES tarea_equipos(id)');
  if (!db.prepare("PRAGMA table_info(tareas)").all().some((c) => c.name === "rubrica")) db.exec("ALTER TABLE tareas ADD COLUMN rubrica TEXT NOT NULL DEFAULT '[]'");
  if (!db.prepare("PRAGMA table_info(correcciones)").all().some((c) => c.name === "criterios")) db.exec("ALTER TABLE correcciones ADD COLUMN criterios TEXT NOT NULL DEFAULT '{}'");
  registrarRevisionPares(app,db);
  const rubricar = bruto => {
    if (bruto === undefined) return [];
    if (!Array.isArray(bruto) || bruto.length > 20 || bruto.some(c => typeof c !== 'string' || !c.trim() || c.length > 120)) return null;
    return [...new Set(bruto.map(c => c.trim()))];
  };
  // ── Consultas reutilizadas ────────────────────────────────────────────────

  // La cátedra de una tarea, con su docente y su curso. Es el centro de casi
  // todos los permisos: "¿esta tarea es mía?" = "¿su cátedra es mía?".
  const catedraDeTarea = db.prepare(
    `SELECT t.id, t.catedra_id, t.fecha_limite, t.eliminado_en, t.rubrica, t.tipo_asignacion,
            ca.profesor_id, ca.curso_id
       FROM tareas t
       JOIN catedras ca ON ca.id = t.catedra_id
      WHERE t.id = ?`
  );

  const catedraPropia = db.prepare(
    `SELECT id, curso_id FROM catedras WHERE id = ? AND profesor_id = ?`
  );

  const archivoPropio = db.prepare(
    "SELECT id FROM archivos WHERE id = ? AND subido_por = ?"
  );

  const adjuntosDe = db.prepare(
    `SELECT a.id, a.nombre_original, a.tipo_mime, a.tamano_bytes
       FROM tarea_adjuntos ta
       JOIN archivos a ON a.id = ta.archivo_id
      WHERE ta.tarea_id = ?`
  );

  const archivosDeEntrega = db.prepare(
    `SELECT a.id, a.nombre_original, a.tipo_mime, a.tamano_bytes
       FROM entrega_archivos ea
       JOIN archivos a ON a.id = ea.archivo_id
      WHERE ea.entrega_id = ?`
  );

  // La entrega VIGENTE de un estudiante en una tarea (una anulada no cuenta:
  // vuelve a estar "sin entregar", por eso `anulada_en IS NULL`).
  const entregaVigente = db.prepare(
    `SELECT e.id, e.comentario, e.entregado_en, e.equipo_id
       FROM entregas e
      WHERE e.tarea_id = ? AND e.anulada_en IS NULL AND
        (e.estudiante_id = ? OR e.equipo_id IN
          (SELECT em.equipo_id FROM tarea_equipo_miembros em WHERE em.tarea_id=e.tarea_id AND em.estudiante_id=?))
      ORDER BY e.id DESC LIMIT 1`
  );

  const correccionDe = db.prepare(
    `SELECT nota, devolucion, corregido_en, criterios FROM correcciones WHERE entrega_id = ?`
  );

  // Convierte una fila de archivo cruda a la forma que espera la pantalla.
  const mapArchivo = (a) => ({
    id: String(a.id),
    nombre: a.nombre_original,
    tipoMime: a.tipo_mime,
    tamanoBytes: a.tamano_bytes,
  });

  // El estado de una entrega frente a la fecha límite: comparación de fechas por
  // texto ISO, que ordena bien ("2026-07-10" <= "2026-07-15"). Se mira solo la
  // parte de la fecha, no la hora: entregar el mismo día del vencimiento es en
  // término aunque sea a las 23:59.
  function enTermino(entregadoEn, fechaLimite) {
    return String(entregadoEn).slice(0, 10) <= fechaLimite;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PROFESOR
  // ══════════════════════════════════════════════════════════════════════════

  // Mis cátedras: la lista de materia+curso que doy, para elegir en el alta de
  // una tarea (Error 3.C.1: "elegir materia y curso cuando doy varias"). Sale de
  // `catedras`, no de una lista escrita a mano en la pantalla.
  app.get(
    "/api/tareas/catedras",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, PAGINA_DOCENTE);
      if (!usuario) return;

      const catedras = db
        .prepare(
          `SELECT ca.id, m.nombre AS materia, c.anio, c.division,
                  (SELECT COUNT(*) FROM inscripciones i WHERE i.curso_id = ca.curso_id) AS alumnos
             FROM catedras ca
             JOIN materias m ON m.id = ca.materia_id
             JOIN cursos c   ON c.id = ca.curso_id
            WHERE ca.profesor_id = ?
            ORDER BY m.nombre, c.anio, c.division`
        )
        .all(usuario.id)
        .map((f) => ({
          id: String(f.id),
          materia: f.materia,
          curso: `${f.anio}° ${f.division}`,
          alumnos: f.alumnos,
        }));

      res.json({ catedras });
    })
  );

  // Mis tareas creadas, con el conteo REAL de entregas (al día / tarde /
  // pendiente). Antes esos números eran fijos y escritos a mano.
  app.get(
    "/api/tareas/docente",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, PAGINA_DOCENTE);
      if (!usuario) return;

      const tareas = db
        .prepare(
          `SELECT t.id, t.titulo, t.consigna, t.fecha_limite, t.metodo_estudio, t.rubrica,
                  t.tipo_asignacion, t.catedra_id,
                  m.nombre AS materia, c.anio, c.division, ca.curso_id
             FROM tareas t
             JOIN catedras ca ON ca.id = t.catedra_id
             JOIN materias m  ON m.id = ca.materia_id
             JOIN cursos c    ON c.id = ca.curso_id
            WHERE ca.profesor_id = ? AND t.eliminado_en IS NULL
            ORDER BY t.fecha_limite DESC`
        )
        .all(usuario.id);

      const inscriptosDe = db.prepare(
        "SELECT COUNT(*) AS n FROM inscripciones WHERE curso_id = ?"
      );
      const entregasDe = db.prepare(
        `SELECT e.entregado_en, co.id AS correccion_id,
                CASE WHEN e.equipo_id IS NULL THEN 1 ELSE
                  (SELECT COUNT(*) FROM tarea_equipo_miembros em WHERE em.equipo_id=e.equipo_id) END AS participantes,
                EXISTS(SELECT 1 FROM entregas anterior WHERE anterior.tarea_id=e.tarea_id
                  AND (anterior.estudiante_id=e.estudiante_id OR (e.equipo_id IS NOT NULL AND anterior.equipo_id=e.equipo_id))
                  AND anterior.reemplazada_en IS NOT NULL) AS reentregada,
                (SELECT COUNT(*) FROM revisiones_pares rp WHERE rp.entrega_id=e.id AND rp.respondida_en IS NULL) AS revisiones_pendientes
           FROM entregas e LEFT JOIN correcciones co ON co.entrega_id=e.id
          WHERE e.tarea_id = ? AND e.anulada_en IS NULL`
      );

      const salida = tareas.map((t) => {
        const total = inscriptosDe.get(t.curso_id).n;
        const entregas = entregasDe.all(t.id);
        let alDia = 0;
        let tarde = 0;
        let porCorregir = 0;
        let reentregadas = 0;
        let revisionesParesPendientes = 0;
        for (const e of entregas) {
          if (enTermino(e.entregado_en, t.fecha_limite)) alDia += e.participantes;
          else tarde += e.participantes;
          if (!e.correccion_id) porCorregir += 1;
          if (e.reentregada) reentregadas += 1;
          revisionesParesPendientes += e.revisiones_pendientes;
        }
        const pendiente = Math.max(0, total - alDia - tarde);
        return {
          id: String(t.id),
          titulo: t.titulo,
          consigna: t.consigna,
          materia: t.materia,
          curso: `${t.anio}° ${t.division}`,
          catedraId: String(t.catedra_id),
          fechaLimite: t.fecha_limite,
          metodoEstudio: t.metodo_estudio ?? "",
          rubrica: JSON.parse(t.rubrica),
          tipoAsignacion: t.tipo_asignacion,
          alDia,
          tarde,
          pendiente,
          porCorregir,
          reentregadas,
          revisionesParesPendientes,
        };
      });

      res.json({ tareas: salida });
    })
  );

  app.get('/api/tareas/:id/equipos', ventanilla((req,res) => {
    const usuario = exigirAcceso(db,req,res,PAGINA_DOCENTE); if(!usuario)return;
    const tarea=catedraDeTarea.get(Number(req.params.id));
    if(!tarea||tarea.eliminado_en||tarea.profesor_id!==usuario.id)return res.status(404).json({error:'Tarea no disponible.'});
    const equipos=db.prepare('SELECT id,nombre FROM tarea_equipos WHERE tarea_id=? ORDER BY id').all(tarea.id).map(e=>({
      id:String(e.id), nombre:e.nombre,
      miembros:db.prepare(`SELECT em.estudiante_id,u.nombre FROM tarea_equipo_miembros em JOIN usuarios u ON u.id=em.estudiante_id WHERE em.equipo_id=? ORDER BY u.nombre`).all(e.id).map(m=>({estudianteId:String(m.estudiante_id),nombre:m.nombre})),
    }));
    res.json({equipos});
  }));
  app.post('/api/tareas/:id/equipos',ventanilla((req,res)=>{
    const usuario=exigirAcceso(db,req,res,PAGINA_DOCENTE);if(!usuario)return;
    const tarea=catedraDeTarea.get(Number(req.params.id));
    if(!tarea||tarea.eliminado_en||tarea.profesor_id!==usuario.id)return res.status(404).json({error:'Tarea no disponible.'});
    if(tarea.tipo_asignacion!=='grupal')return res.status(400).json({error:'La tarea debe ser grupal.'});
    const nombre=String(req.body?.nombre??'').trim();
    const miembros=Array.isArray(req.body?.estudiantes)?req.body.estudiantes.map(Number):[];
    if(!nombre||nombre.length>100||miembros.length<2||new Set(miembros).size!==miembros.length||
      miembros.some(id=>!Number.isSafeInteger(id)||!estaInscripto(db,id,tarea.curso_id)||
        db.prepare('SELECT 1 FROM tarea_equipo_miembros WHERE tarea_id=? AND estudiante_id=?').get(tarea.id,id)||
        db.prepare('SELECT 1 FROM entregas WHERE tarea_id=? AND estudiante_id=? AND anulada_en IS NULL').get(tarea.id,id)))
      return res.status(400).json({error:'Elegí al menos dos estudiantes libres del curso.'});
    db.exec('BEGIN IMMEDIATE');
    try {
      const equipo=db.prepare('INSERT INTO tarea_equipos(tarea_id,nombre) VALUES(?,?)').run(tarea.id,nombre);
      const insertar=db.prepare('INSERT INTO tarea_equipo_miembros(equipo_id,tarea_id,estudiante_id) VALUES(?,?,?)');
      miembros.forEach(id=>insertar.run(equipo.lastInsertRowid,tarea.id,id));
      db.exec('COMMIT');res.status(201).json({id:String(equipo.lastInsertRowid)});
    } catch(e) {db.exec('ROLLBACK');throw e;}
  }));
  app.delete('/api/tareas/:id/equipos/:equipoId',ventanilla((req,res)=>{
    const usuario=exigirAcceso(db,req,res,PAGINA_DOCENTE);if(!usuario)return;
    const tarea=catedraDeTarea.get(Number(req.params.id));
    if(!tarea||tarea.profesor_id!==usuario.id)return res.status(404).json({error:'Tarea no disponible.'});
    const equipoId=Number(req.params.equipoId);
    if(!db.prepare('SELECT 1 FROM tarea_equipos WHERE id=? AND tarea_id=?').get(equipoId,tarea.id))return res.status(404).json({error:'Equipo no disponible.'});
    if(db.prepare('SELECT 1 FROM entregas WHERE equipo_id=?').get(equipoId))return res.status(409).json({error:'El equipo ya tiene historial de entregas.'});
    db.prepare('DELETE FROM tarea_equipo_miembros WHERE equipo_id=?').run(equipoId);
    db.prepare('DELETE FROM tarea_equipos WHERE id=?').run(equipoId);
    res.json({ok:true});
  }));

  // Crear una tarea rica (Error 2.C.3): consigna, fecha límite real, método de
  // estudio, tipo de asignación y adjuntos del profesor.
  app.post(
    "/api/tareas",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, PAGINA_DOCENTE);
      if (!usuario) return;

      const catedraId = Number(req.body?.catedraId);
      const titulo = String(req.body?.titulo ?? "").trim();
      const consigna = String(req.body?.consigna ?? "").trim();
      const fechaLimite = String(req.body?.fechaLimite ?? "").slice(0, 10);
      const metodoEstudio = String(req.body?.metodoEstudio ?? "").trim();
      const tipo = req.body?.tipoAsignacion === "grupal" ? "grupal" : "individual";
      const adjuntos = Array.isArray(req.body?.adjuntos) ? req.body.adjuntos : [];
      const rubrica = rubricar(req.body?.rubrica);
      if (!rubrica) return res.status(400).json({ error: 'Rúbrica inválida.' });

      if (!titulo) return res.status(400).json({ error: "Falta el título." });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaLimite)) {
        return res.status(400).json({ error: "La fecha límite es inválida." });
      }
      // La cátedra tiene que ser MÍA. Si no, un profesor podría cargarle tareas
      // al curso de otro. El permiso de fila se decide acá, en el servidor.
      if (!catedraPropia.get(catedraId, usuario.id)) {
        return res
          .status(403)
          .json({ error: "Esa materia y curso no figuran entre los tuyos." });
      }

      const info = db
        .prepare(
          `INSERT INTO tareas
             (catedra_id, titulo, consigna, fecha_limite, metodo_estudio, tipo_asignacion, rubrica)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(catedraId, titulo, consigna, fechaLimite, metodoEstudio || null, tipo, JSON.stringify(rubrica));

      const tareaId = info.lastInsertRowid;
      vincularAdjuntos(tareaId, adjuntos, usuario.id);

      res.status(201).json({ id: String(tareaId) });
    })
  );

  // Editar una tarea mía. No se cambia la cátedra (movería la tarea a otro curso
  // y dejaría entregas huérfanas); sí el resto de los campos.
  app.put(
    "/api/tareas/:id",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, PAGINA_DOCENTE);
      if (!usuario) return;

      const tarea = catedraDeTarea.get(Number(req.params.id));
      if (!tarea || tarea.eliminado_en) {
        return res.status(404).json({ error: "Esa tarea no existe." });
      }
      if (tarea.profesor_id !== usuario.id) {
        return res.status(403).json({ error: "Esa tarea no es tuya." });
      }

      const titulo = String(req.body?.titulo ?? "").trim();
      const consigna = String(req.body?.consigna ?? "").trim();
      const fechaLimite = String(req.body?.fechaLimite ?? "").slice(0, 10);
      const metodoEstudio = String(req.body?.metodoEstudio ?? "").trim();
      const tipo = req.body?.tipoAsignacion === "grupal" ? "grupal" : "individual";
      if (tipo !== tarea.tipo_asignacion && (db.prepare('SELECT 1 FROM entregas WHERE tarea_id=?').get(tarea.id) ||
        db.prepare('SELECT 1 FROM tarea_equipos WHERE tarea_id=?').get(tarea.id))) {
        return res.status(409).json({ error: 'No se puede cambiar el tipo de una tarea con equipos o entregas.' });
      }
      const rubrica = rubricar(req.body?.rubrica);
      if (!rubrica) return res.status(400).json({ error: 'Rúbrica inválida.' });

      if (!titulo) return res.status(400).json({ error: "Falta el título." });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaLimite)) {
        return res.status(400).json({ error: "La fecha límite es inválida." });
      }

      db.prepare(
        `UPDATE tareas
            SET titulo = ?, consigna = ?, fecha_limite = ?,
                metodo_estudio = ?, tipo_asignacion = ?, rubrica = ?
          WHERE id = ?`
      ).run(titulo, consigna, fechaLimite, metodoEstudio || null, tipo, JSON.stringify(req.body?.rubrica === undefined ? JSON.parse(db.prepare('SELECT rubrica FROM tareas WHERE id=?').get(tarea.id).rubrica) : rubrica), tarea.id);

      res.json({ ok: true });
    })
  );

  // Mandar una tarea a la papelera (borrado suave: `eliminado_en`). Sus entregas
  // quedan, pero la tarea deja de verse. Solo el docente dueño.
  app.delete(
    "/api/tareas/:id",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, PAGINA_DOCENTE);
      if (!usuario) return;

      const tarea = catedraDeTarea.get(Number(req.params.id));
      if (!tarea || tarea.eliminado_en) {
        return res.status(404).json({ error: "Esa tarea no existe." });
      }
      if (tarea.profesor_id !== usuario.id) {
        return res.status(403).json({ error: "Esa tarea no es tuya." });
      }

      db.prepare(
        "UPDATE tareas SET eliminado_en = datetime('now') WHERE id = ?"
      ).run(tarea.id);
      res.json({ ok: true });
    })
  );

  // Panel de corrección (Errores 3.C.9 y 14.7 paso 4): la lista completa del
  // curso con el estado de cada estudiante (entregó / tarde / no entregó), su
  // entrega si existe y su corrección si ya la puse.
  app.get(
    "/api/tareas/:id/panel",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, PAGINA_DOCENTE);
      if (!usuario) return;

      const tarea = catedraDeTarea.get(Number(req.params.id));
      if (!tarea || tarea.eliminado_en) {
        return res.status(404).json({ error: "Esa tarea no existe." });
      }
      if (tarea.profesor_id !== usuario.id) {
        return res.status(403).json({ error: "Esa tarea no es tuya." });
      }

      const encabezado = db
        .prepare(
          `SELECT t.titulo, t.consigna, t.fecha_limite,
                  m.nombre AS materia, c.anio, c.division
             FROM tareas t
             JOIN catedras ca ON ca.id = t.catedra_id
             JOIN materias m  ON m.id = ca.materia_id
             JOIN cursos c    ON c.id = ca.curso_id
            WHERE t.id = ?`
        )
        .get(tarea.id);

      const alumnos = db
        .prepare(
          `SELECT u.id, u.nombre, u.avatar_url
             FROM inscripciones i
             JOIN usuarios u ON u.id = i.estudiante_id
            WHERE i.curso_id = ?
            ORDER BY u.nombre`
        )
        .all(tarea.curso_id);

      const filas = alumnos.map((al) => {
        const entrega = entregaVigente.get(tarea.id, al.id, al.id);
        let estado = "no-entrego";
        let correccion = null;
        let archivos = [];
        if (entrega) {
          estado = enTermino(entrega.entregado_en, tarea.fecha_limite)
            ? "entregado"
            : "tarde";
          archivos = archivosDeEntrega.all(entrega.id).map(mapArchivo);
          const c = correccionDe.get(entrega.id);
          if (c) {
            correccion = {
              nota: c.nota,
              devolucion: c.devolucion,
              corregidoEn: c.corregido_en,
              criterios: JSON.parse(c.criterios),
            };
          }
        }
        return {
          estudianteId: String(al.id),
          nombre: al.nombre,
          avatarUrl: al.avatar_url ?? null,
          estado,
          entregaId: entrega ? String(entrega.id) : null,
          comentario: entrega ? entrega.comentario : "",
          entregadoEn: entrega ? entrega.entregado_en : null,
          archivos,
          correccion,
        };
      });

      res.json({
        tarea: {
          id: String(tarea.id),
          titulo: encabezado.titulo,
          consigna: encabezado.consigna,
          materia: encabezado.materia,
          curso: `${encabezado.anio}° ${encabezado.division}`,
          fechaLimite: encabezado.fecha_limite,
          tipoAsignacion: tarea.tipo_asignacion,
          rubrica: JSON.parse(tarea.rubrica),
        },
        alumnos: filas,
      });
    })
  );

  // Poner nota y devolución (14.7 paso 4). Una sola por entrega: `correcciones`
  // tiene `entrega_id` UNIQUE, así que se hace UPSERT (si ya corregí, actualizo).
  // Calificaciones del alumno lee estas mismas filas (muere el Error 13.1).
  app.post(
    "/api/entregas/:id/correccion",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, PAGINA_DOCENTE);
      if (!usuario) return;

      const entregaId = Number(req.params.id);
      const entrega = db
        .prepare(
          `SELECT e.id, e.estudiante_id, e.equipo_id, e.tarea_id, t.titulo AS tarea_titulo,
                  ca.profesor_id
             FROM entregas e
             JOIN tareas t    ON t.id = e.tarea_id
             JOIN catedras ca ON ca.id = t.catedra_id
            WHERE e.id = ? AND e.anulada_en IS NULL`
        )
        .get(entregaId);

      if (!entrega) {
        return res.status(404).json({ error: "Esa entrega no existe." });
      }
      if (entrega.profesor_id !== usuario.id) {
        return res
          .status(403)
          .json({ error: "No sos el docente de esa entrega." });
      }

      const nota = Number(req.body?.nota);
      const devolucion = String(req.body?.devolucion ?? "").trim();
      const rubrica = JSON.parse(db.prepare('SELECT rubrica FROM tareas WHERE id=?').get(entrega.tarea_id).rubrica);
      const criterios = req.body?.criterios ?? JSON.parse(db.prepare('SELECT criterios FROM correcciones WHERE entrega_id=?').get(entregaId)?.criterios ?? '{}');
      if (criterios === null || typeof criterios !== 'object' || Array.isArray(criterios) || Object.keys(criterios).some(k => !rubrica.includes(k) || typeof criterios[k] !== 'string' || criterios[k].length > 1000)) return res.status(400).json({ error: 'Devolución por criterio inválida.' });
      if (!Number.isFinite(nota) || nota < 1 || nota > 10) {
        return res
          .status(400)
          .json({ error: "La nota tiene que ir de 1 a 10." });
      }

      db.prepare(
        `INSERT INTO correcciones (entrega_id, nota, devolucion, criterios, corregido_en)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT(entrega_id)
         DO UPDATE SET nota = excluded.nota,
                       devolucion = excluded.devolucion,
                       criterios = excluded.criterios,
                       corregido_en = datetime('now')`
      ).run(entregaId, nota, devolucion, JSON.stringify(criterios));

      // Avisar al estudiante que su entrega quedó corregida. El objeto es la
      // TAREA (objetoId real = tarea_id): al tocar la notificación, su portafolio
      // abre el detalle de esa tarea con la nota y la devolución. Dato real, no
      // inventado. `notificaciones` puede faltar si algún día se registra sin él:
      // corregir no debe romperse por el aviso.
      const destinatarios = entrega.equipo_id ? db.prepare('SELECT estudiante_id FROM tarea_equipo_miembros WHERE equipo_id=?').all(entrega.equipo_id).map(f=>f.estudiante_id) : [entrega.estudiante_id];
      for (const destinatario of destinatarios) notificaciones?.crear({
        usuarioId: destinatario,
        tipo: "correccion",
        titulo: "Tu entrega fue corregida",
        cuerpo: `"${entrega.tarea_titulo}": nota ${nota}.`,
        objetoTipo: "tarea",
        objetoId: entrega.tarea_id,
      });

      res.json({ ok: true });
    })
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ESTUDIANTE
  // ══════════════════════════════════════════════════════════════════════════

  // Detalle de una tarea para el estudiante (Error 2.C.5): consigna completa,
  // adjuntos del profesor, método sugerido, y su propia entrega + corrección.
  app.get(
    "/api/tareas/:id",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, PAGINA_ESTUDIANTE);
      if (!usuario) return;

      const tarea = catedraDeTarea.get(Number(req.params.id));
      if (!tarea || tarea.eliminado_en) {
        return res.status(404).json({ error: "Esa tarea no existe." });
      }
      // Solo la ve un estudiante inscripto en el curso de la cátedra: la tarea de
      // otro curso no es asunto suyo.
      if (!estaInscripto(db, usuario.id, tarea.curso_id)) {
        return res.status(403).json({ error: "Esa tarea no es de tu curso." });
      }

      const info = db
        .prepare(
          `SELECT t.titulo, t.consigna, t.fecha_limite, t.metodo_estudio,
                  t.tipo_asignacion, m.nombre AS materia, u.nombre AS profesor
             FROM tareas t
             JOIN catedras ca ON ca.id = t.catedra_id
             JOIN materias m  ON m.id = ca.materia_id
             JOIN usuarios u  ON u.id = ca.profesor_id
            WHERE t.id = ?`
        )
        .get(tarea.id);

      const entrega = entregaVigente.get(tarea.id, usuario.id, usuario.id);
      const equipo = info.tipo_asignacion === 'grupal' ? db.prepare(`SELECT te.id,te.nombre FROM tarea_equipos te
        JOIN tarea_equipo_miembros em ON em.equipo_id=te.id WHERE te.tarea_id=? AND em.estudiante_id=?`).get(tarea.id,usuario.id) : null;
      let entregaSalida = null;
      if (entrega) {
        const c = correccionDe.get(entrega.id);
        entregaSalida = {
          id: String(entrega.id),
          comentario: entrega.comentario,
          entregadoEn: entrega.entregado_en,
          archivos: archivosDeEntrega.all(entrega.id).map(mapArchivo),
          // Si ya está corregida, no se puede anular (regla del paso 3 de 14.7).
          corregida: c !== undefined,
          nota: c ? c.nota : null,
          devolucion: c ? c.devolucion : "",
          corregidoEn: c ? c.corregido_en : null,
          criterios: c ? JSON.parse(c.criterios) : {},
        };
      }

      res.json({
        tarea: {
          id: String(tarea.id),
          titulo: info.titulo,
          consigna: info.consigna,
          materia: info.materia,
          profesor: info.profesor,
          fechaLimite: tarea.fecha_limite,
          metodoEstudio: info.metodo_estudio ?? "",
          tipoAsignacion: info.tipo_asignacion,
          adjuntos: adjuntosDe.all(tarea.id).map(mapArchivo),
        },
        entrega: entregaSalida,
        equipo: equipo ? { id:String(equipo.id), nombre:equipo.nombre,
          miembros:db.prepare(`SELECT u.nombre FROM tarea_equipo_miembros em JOIN usuarios u ON u.id=em.estudiante_id WHERE em.equipo_id=? ORDER BY u.nombre`).all(equipo.id).map(m=>m.nombre) } : null,
      });
    })
  );

  // Entregar (Error 2.C.4): comentario + uno o más archivos ya subidos al
  // servicio de archivos. Se registra la fecha y hora (así se sabe si fue en
  // término o tarde). No se puede entregar dos veces sin anular la anterior.
  app.post(
    "/api/tareas/:id/entrega",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, PAGINA_ESTUDIANTE);
      if (!usuario) return;

      const tarea = catedraDeTarea.get(Number(req.params.id));
      if (!tarea || tarea.eliminado_en) {
        return res.status(404).json({ error: "Esa tarea no existe." });
      }
      if (!estaInscripto(db, usuario.id, tarea.curso_id)) {
        return res.status(403).json({ error: "Esa tarea no es de tu curso." });
      }
      const equipo = tarea.tipo_asignacion === 'grupal' ? db.prepare('SELECT equipo_id FROM tarea_equipo_miembros WHERE tarea_id=? AND estudiante_id=?').get(tarea.id,usuario.id) : null;
      if (tarea.tipo_asignacion === 'grupal' && !equipo) return res.status(409).json({error:'El profesor todavía no te asignó a un equipo para esta tarea.'});
      const anterior = entregaVigente.get(tarea.id, usuario.id, usuario.id);
      const revision = anterior && req.body?.nuevaVersion === true && Boolean(correccionDe.get(anterior.id));
      if (anterior && !revision) {
        return res
          .status(409)
          .json({ error: "Ya tenés una entrega. Anulala antes de reenviar." });
      }

      const comentario = String(req.body?.comentario ?? "").trim();
      const archivos = Array.isArray(req.body?.archivos) ? req.body.archivos : [];

      db.exec('BEGIN IMMEDIATE');
      try {
      if (revision) db.prepare("UPDATE entregas SET anulada_en=datetime('now'), reemplazada_en=datetime('now') WHERE id=? AND anulada_en IS NULL").run(anterior.id);
      const info = db
        .prepare(
          `INSERT INTO entregas (tarea_id, estudiante_id, equipo_id, comentario)
           VALUES (?, ?, ?, ?)`
        )
        .run(tarea.id, usuario.id, equipo?.equipo_id ?? null, comentario);

      const entregaId = info.lastInsertRowid;
      const vincular = db.prepare(
        "INSERT INTO entrega_archivos (entrega_id, archivo_id) VALUES (?, ?)"
      );
      for (const bruto of archivos) {
        const archivoId = Number(bruto);
        // Solo archivos que subió ESTE estudiante: no puede colgar de su entrega
        // el archivo de otra persona pasando un número al azar.
        if (archivoPropio.get(archivoId, usuario.id)) {
          vincular.run(entregaId, archivoId);
        }
      }

      db.exec('COMMIT');
      res.status(201).json({ id: String(entregaId) });
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    })
  );

  // Docente y estudiante ven el historial real, incluidas las versiones corregidas.
  app.get('/api/tareas/:id/entregas/historial', ventanilla((req, res) => {
    const sesion = exigirSesion(db, req, res);
    if (!sesion) return;
    const esDocente = sesion.rol === 'profesor';
    const usuario = exigirAcceso(db, req, res, esDocente ? PAGINA_DOCENTE : PAGINA_ESTUDIANTE);
    if (!usuario) return;
    const tarea = catedraDeTarea.get(Number(req.params.id));
    if (!tarea || tarea.eliminado_en) return res.status(404).json({ error: 'Esa tarea no existe.' });
    if (esDocente && tarea.profesor_id !== usuario.id) return res.status(404).json({ error: 'Esa tarea no existe.' });
    const estudianteId = esDocente ? Number(req.query.estudianteId) : usuario.id;
    if (!Number.isSafeInteger(estudianteId) || !estaInscripto(db, estudianteId, tarea.curso_id)) return res.status(404).json({ error: 'Estudiante no disponible.' });
    const versiones = db.prepare(`SELECT e.id, e.comentario, e.entregado_en, e.anulada_en, e.reemplazada_en,
      c.nota, c.devolucion, c.corregido_en FROM entregas e LEFT JOIN correcciones c ON c.entrega_id=e.id
      WHERE e.tarea_id=? AND (e.estudiante_id=? OR e.equipo_id IN
        (SELECT em.equipo_id FROM tarea_equipo_miembros em WHERE em.tarea_id=e.tarea_id AND em.estudiante_id=?))
      ORDER BY e.id DESC`).all(tarea.id, estudianteId, estudianteId);
    res.json({ versiones: versiones.map(e => ({ id:String(e.id), comentario:e.comentario, entregadoEn:e.entregado_en,
      estado:e.reemplazada_en?'anterior':e.anulada_en?'anulada':'vigente', nota:e.nota,
      devolucion:e.devolucion??'', corregidoEn:e.corregido_en,
      archivos:archivosDeEntrega.all(e.id).map(mapArchivo) })) });
  }));

  // Anular mi entrega (Error 2.C.6): solo mientras no esté corregida. La
  // anulación queda registrada (`anulada_en`) en vez de borrar la fila.
  app.delete(
    "/api/tareas/:id/entrega",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, PAGINA_ESTUDIANTE);
      if (!usuario) return;

      const tarea = catedraDeTarea.get(Number(req.params.id));
      if (!tarea) {
        return res.status(404).json({ error: "Esa tarea no existe." });
      }

      const entrega = entregaVigente.get(tarea.id, usuario.id, usuario.id);
      if (!entrega) {
        return res.status(404).json({ error: "No tenés una entrega para anular." });
      }
      if (correccionDe.get(entrega.id)) {
        return res
          .status(409)
          .json({ error: "No se puede anular una entrega ya corregida." });
      }

      db.prepare(
        "UPDATE entregas SET anulada_en = datetime('now') WHERE id = ?"
      ).run(entrega.id);
      res.json({ ok: true });
    })
  );

  // ── Adjuntos del profesor: vincular archivos ya subidos a una tarea ────────
  function vincularAdjuntos(tareaId, ids, profesorId) {
    const vincular = db.prepare(
      "INSERT INTO tarea_adjuntos (tarea_id, archivo_id) VALUES (?, ?)"
    );
    for (const bruto of ids) {
      const archivoId = Number(bruto);
      if (archivoPropio.get(archivoId, profesorId)) {
        vincular.run(tareaId, archivoId);
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TAREAS PERSONALES DEL ESTUDIANTE (recordatorios propios)
  // ══════════════════════════════════════════════════════════════════════════
  // Antes vivían solo en la memoria de la pantalla: crear una y recargar la
  // borraba. Ahora se guardan en `tareas_personales` y se pueden editar
  // (Error 2.C.8). La lectura sigue saliendo de /api/portafolio.

  const personalPropia = db.prepare(
    "SELECT * FROM tareas_personales WHERE id = ? AND estudiante_id = ?"
  );

  function reglaPersonal(crudo,fecha) {
    const regla=normalizarRecurrencia(crudo);
    if(regla?.error)return {error:regla.error};
    if(regla&&!fecha)return {error:'La tarea recurrente necesita una fecha límite.'};
    return {regla};
  }
  function siguienteFechaPersonal(tarea,regla){
    if(!regla||!tarea.fecha_limite||tarea.restantes!==null&&tarea.restantes<=1)return null;
    const dias={diaria:366,semanal:730,mensual:365*9,anual:365*101}[regla.frecuencia];
    const feriados=regla.saltarFeriados?new Set(db.prepare('SELECT fecha FROM feriados').all().map(f=>f.fecha)):new Set();
    const opciones={...regla};delete opciones.veces;
    return expandir({fecha:tarea.fecha_limite,fecha_fin:null,regla:opciones},sumarDias(tarea.fecha_limite,1),sumarDias(tarea.fecha_limite,dias),{feriados})[0]?.fecha??null;
  }

  app.post(
    "/api/tareas-personales",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, PAGINA_ESTUDIANTE);
      if (!usuario) return;

      const titulo = String(req.body?.titulo ?? "").trim();
      const descripcion = String(req.body?.descripcion ?? "").trim();
      const fechaLimite = String(req.body?.fechaLimite ?? "").slice(0, 10);
      if (!titulo) return res.status(400).json({ error: "Falta el título." });
      const fecha = esFechaValida(fechaLimite) ? fechaLimite : null;
      const {regla,error}=reglaPersonal(req.body?.recurrencia,fecha);
      if(error)return res.status(400).json({error});

      const info = db
        .prepare(
          `INSERT INTO tareas_personales (estudiante_id, titulo, descripcion, fecha_limite, recurrencia, restantes)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(usuario.id, titulo, descripcion, fecha, regla?JSON.stringify(regla):null, regla?.veces??null);
      res.status(201).json({ id: String(info.lastInsertRowid) });
    })
  );

  app.put(
    "/api/tareas-personales/:id",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, PAGINA_ESTUDIANTE);
      if (!usuario) return;
      const actual=personalPropia.get(Number(req.params.id), usuario.id);
      if (!actual) {
        return res.status(404).json({ error: "Esa tarea no existe." });
      }

      const titulo = String(req.body?.titulo ?? "").trim();
      const descripcion = String(req.body?.descripcion ?? "").trim();
      const fechaLimite = String(req.body?.fechaLimite ?? "").slice(0, 10);
      if (!titulo) return res.status(400).json({ error: "Falta el título." });
      const fecha = esFechaValida(fechaLimite) ? fechaLimite : null;
      const {regla,error}=reglaPersonal(req.body?.recurrencia===undefined?(actual.recurrencia?JSON.parse(actual.recurrencia):null):req.body.recurrencia,fecha);
      if(error)return res.status(400).json({error});

      db.prepare(
        `UPDATE tareas_personales
            SET titulo = ?, descripcion = ?, fecha_limite = ?, recurrencia = ?, restantes = ?
          WHERE id = ?`
      ).run(titulo, descripcion, fecha, regla?JSON.stringify(regla):null, req.body?.recurrencia===undefined?actual.restantes:regla?.veces??null, Number(req.params.id));
      res.json({ ok: true });
    })
  );

  app.put(
    "/api/tareas-personales/:id/completada",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, PAGINA_ESTUDIANTE);
      if (!usuario) return;
      const actual=personalPropia.get(Number(req.params.id), usuario.id);
      if (!actual) {
        return res.status(404).json({ error: "Esa tarea no existe." });
      }
      const completada = Boolean(req.body?.completada);
      let siguiente=null;
      db.exec('BEGIN IMMEDIATE');
      try{
        db.prepare('UPDATE tareas_personales SET completada_en=? WHERE id=?').run(completada?new Date().toISOString():null,actual.id);
        if(completada&&!actual.completada_en&&actual.recurrencia&&!db.prepare('SELECT 1 FROM tareas_personales WHERE origen_id=?').get(actual.id)){
          const fecha=siguienteFechaPersonal(actual,JSON.parse(actual.recurrencia));
          if(fecha){
            siguiente=String(db.prepare(`INSERT INTO tareas_personales(estudiante_id,titulo,descripcion,fecha_limite,recurrencia,restantes,origen_id)
              VALUES(?,?,?,?,?,?,?)`).run(usuario.id,actual.titulo,actual.descripcion,fecha,actual.recurrencia,actual.restantes===null?null:actual.restantes-1,actual.id).lastInsertRowid);
          }
        }
        db.exec('COMMIT');
      }catch(e){db.exec('ROLLBACK');throw e;}
      res.json({ ok: true, siguienteId:siguiente });
    })
  );

  app.delete(
    "/api/tareas-personales/:id",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, PAGINA_ESTUDIANTE);
      if (!usuario) return;
      if (!personalPropia.get(Number(req.params.id), usuario.id)) {
        return res.status(404).json({ error: "Esa tarea no existe." });
      }
      db.prepare("DELETE FROM tareas_personales WHERE id = ?").run(
        Number(req.params.id)
      );
      res.json({ ok: true });
    })
  );
}
