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

import { exigirAcceso, ventanilla, estaInscripto } from "./comun.js";

const PAGINA_DOCENTE = "gestion-tareas-profesor";
const PAGINA_ESTUDIANTE = "mis-tareas-estudiante";

export function registrarTareas(app, db) {
  // ── Consultas reutilizadas ────────────────────────────────────────────────

  // La cátedra de una tarea, con su docente y su curso. Es el centro de casi
  // todos los permisos: "¿esta tarea es mía?" = "¿su cátedra es mía?".
  const catedraDeTarea = db.prepare(
    `SELECT t.id, t.catedra_id, t.fecha_limite, t.eliminado_en,
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
    `SELECT id, comentario, entregado_en
       FROM entregas
      WHERE tarea_id = ? AND estudiante_id = ? AND anulada_en IS NULL`
  );

  const correccionDe = db.prepare(
    `SELECT nota, devolucion, corregido_en FROM correcciones WHERE entrega_id = ?`
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
          `SELECT t.id, t.titulo, t.consigna, t.fecha_limite, t.metodo_estudio,
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
        `SELECT entregado_en FROM entregas
          WHERE tarea_id = ? AND anulada_en IS NULL`
      );

      const salida = tareas.map((t) => {
        const total = inscriptosDe.get(t.curso_id).n;
        const entregas = entregasDe.all(t.id);
        let alDia = 0;
        let tarde = 0;
        for (const e of entregas) {
          if (enTermino(e.entregado_en, t.fecha_limite)) alDia += 1;
          else tarde += 1;
        }
        const pendiente = Math.max(0, total - entregas.length);
        return {
          id: String(t.id),
          titulo: t.titulo,
          consigna: t.consigna,
          materia: t.materia,
          curso: `${t.anio}° ${t.division}`,
          catedraId: String(t.catedra_id),
          fechaLimite: t.fecha_limite,
          metodoEstudio: t.metodo_estudio ?? "",
          tipoAsignacion: t.tipo_asignacion,
          alDia,
          tarde,
          pendiente,
        };
      });

      res.json({ tareas: salida });
    })
  );

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
             (catedra_id, titulo, consigna, fecha_limite, metodo_estudio, tipo_asignacion)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(catedraId, titulo, consigna, fechaLimite, metodoEstudio || null, tipo);

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

      if (!titulo) return res.status(400).json({ error: "Falta el título." });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaLimite)) {
        return res.status(400).json({ error: "La fecha límite es inválida." });
      }

      db.prepare(
        `UPDATE tareas
            SET titulo = ?, consigna = ?, fecha_limite = ?,
                metodo_estudio = ?, tipo_asignacion = ?
          WHERE id = ?`
      ).run(titulo, consigna, fechaLimite, metodoEstudio || null, tipo, tarea.id);

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
        const entrega = entregaVigente.get(tarea.id, al.id);
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
          `SELECT e.id, ca.profesor_id
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
      if (!Number.isFinite(nota) || nota < 1 || nota > 10) {
        return res
          .status(400)
          .json({ error: "La nota tiene que ir de 1 a 10." });
      }

      db.prepare(
        `INSERT INTO correcciones (entrega_id, nota, devolucion, corregido_en)
         VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT(entrega_id)
         DO UPDATE SET nota = excluded.nota,
                       devolucion = excluded.devolucion,
                       corregido_en = datetime('now')`
      ).run(entregaId, nota, devolucion);

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

      const entrega = entregaVigente.get(tarea.id, usuario.id);
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
      if (entregaVigente.get(tarea.id, usuario.id)) {
        return res
          .status(409)
          .json({ error: "Ya tenés una entrega. Anulala antes de reenviar." });
      }

      const comentario = String(req.body?.comentario ?? "").trim();
      const archivos = Array.isArray(req.body?.archivos) ? req.body.archivos : [];

      const info = db
        .prepare(
          `INSERT INTO entregas (tarea_id, estudiante_id, comentario)
           VALUES (?, ?, ?)`
        )
        .run(tarea.id, usuario.id, comentario);

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

      res.status(201).json({ id: String(entregaId) });
    })
  );

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

      const entrega = entregaVigente.get(tarea.id, usuario.id);
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
    "SELECT id FROM tareas_personales WHERE id = ? AND estudiante_id = ?"
  );

  app.post(
    "/api/tareas-personales",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, PAGINA_ESTUDIANTE);
      if (!usuario) return;

      const titulo = String(req.body?.titulo ?? "").trim();
      const descripcion = String(req.body?.descripcion ?? "").trim();
      const fechaLimite = String(req.body?.fechaLimite ?? "").slice(0, 10);
      if (!titulo) return res.status(400).json({ error: "Falta el título." });
      const fecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaLimite) ? fechaLimite : null;

      const info = db
        .prepare(
          `INSERT INTO tareas_personales (estudiante_id, titulo, descripcion, fecha_limite)
           VALUES (?, ?, ?, ?)`
        )
        .run(usuario.id, titulo, descripcion, fecha);
      res.status(201).json({ id: String(info.lastInsertRowid) });
    })
  );

  app.put(
    "/api/tareas-personales/:id",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, PAGINA_ESTUDIANTE);
      if (!usuario) return;
      if (!personalPropia.get(Number(req.params.id), usuario.id)) {
        return res.status(404).json({ error: "Esa tarea no existe." });
      }

      const titulo = String(req.body?.titulo ?? "").trim();
      const descripcion = String(req.body?.descripcion ?? "").trim();
      const fechaLimite = String(req.body?.fechaLimite ?? "").slice(0, 10);
      if (!titulo) return res.status(400).json({ error: "Falta el título." });
      const fecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaLimite) ? fechaLimite : null;

      db.prepare(
        `UPDATE tareas_personales
            SET titulo = ?, descripcion = ?, fecha_limite = ?
          WHERE id = ?`
      ).run(titulo, descripcion, fecha, Number(req.params.id));
      res.json({ ok: true });
    })
  );

  app.put(
    "/api/tareas-personales/:id/completada",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, PAGINA_ESTUDIANTE);
      if (!usuario) return;
      if (!personalPropia.get(Number(req.params.id), usuario.id)) {
        return res.status(404).json({ error: "Esa tarea no existe." });
      }
      const completada = Boolean(req.body?.completada);
      db.prepare(
        `UPDATE tareas_personales
            SET completada_en = ?
          WHERE id = ?`
      ).run(completada ? new Date().toISOString() : null, Number(req.params.id));
      res.json({ ok: true });
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
