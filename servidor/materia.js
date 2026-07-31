// ============================================================================
// NEXO — Detalle de materia: estudiante y profesor (detalles finales)
// ----------------------------------------------------------------------------
// Lo que se ve al entrar a una materia: profesor, días/horas, avisos del docente
// (con reacciones y respuestas) y tareas de la cátedra.
//
//   GET    /api/materias/:catedraId/detalle          → profesor, horarios, tareas
//   GET    /api/materias/:catedraId/avisos           → avisos con reacciones/respuestas
//   POST   /api/materias/:catedraId/avisos           → publicar aviso (SOLO el profe)
//   PUT    /api/materias/avisos/:avisoId             → editar aviso (SOLO su autor)
//   DELETE /api/materias/avisos/:avisoId             → borrar aviso (SOLO su autor)
//   POST   /api/materias/avisos/:avisoId/reaccion    → poner/cambiar/sacar mi emoji
//   POST   /api/materias/avisos/:avisoId/respuesta   → responder por texto
//   PUT    /api/materias/respuestas/:respuestaId     → editar mi respuesta
//   DELETE /api/materias/respuestas/:respuestaId     → borrar mi respuesta
//
// Regla de oro 4: el permiso se decide en la cocina, por fila. Al detalle entran
// el alumno INSCRIPTO en el curso de la cátedra y el PROFESOR de esa cátedra;
// nadie más (403). Publicar avisos es solo del profe; editar/borrar, solo del
// autor de cada aviso o respuesta.
// ============================================================================

import { exigirAcceso, exigirSesion, ventanilla, estaInscripto } from "./comun.js";

// El set FIJO de emojis, el mismo que declara el CHECK de aviso_reacciones.
const EMOJIS = ["👍", "❤️", "🎉", "😮", "✅"];

export function registrarMateria(app, db) {
  // ── Consultas reutilizadas ────────────────────────────────────────────────
  const catedraPorId = db.prepare(
    `SELECT ca.id, ca.curso_id, ca.materia_id, ca.profesor_id,
            m.institucion_id,
            m.nombre     AS materia,
            p.nombre     AS profesor,
            p.avatar_url AS profesor_avatar
       FROM catedras ca
       JOIN materias m ON m.id = ca.materia_id
       JOIN usuarios p ON p.id = ca.profesor_id
      WHERE ca.id = ?`
  );

  const horariosDe = db.prepare(
    `SELECT dia_semana, hora_inicio, hora_fin, aula
       FROM catedra_horarios
      WHERE catedra_id = ?
      ORDER BY CASE dia_semana
                 WHEN 'lunes'     THEN 1
                 WHEN 'martes'    THEN 2
                 WHEN 'miercoles' THEN 3
                 WHEN 'jueves'    THEN 4
                 WHEN 'viernes'   THEN 5
                 WHEN 'sabado'    THEN 6
               END,
               hora_inicio`
  );

  const tareasDeCatedra = db.prepare(
    `SELECT t.id, t.titulo, t.consigna, t.fecha_limite, t.metodo_estudio,
            t.tipo_asignacion,
            ca.id    AS catedra_id,
            m.nombre AS materia,
            p.nombre AS profesor,
            e.id          AS entrega_id,
            e.entregado_en,
            e.comentario  AS comentario_entrega,
            co.nota, co.devolucion, co.corregido_en
       FROM catedras ca
       JOIN tareas t    ON t.catedra_id = ca.id AND t.eliminado_en IS NULL
       JOIN materias m  ON m.id = ca.materia_id
       JOIN usuarios p  ON p.id = ca.profesor_id
       LEFT JOIN entregas e
              ON e.tarea_id = t.id AND e.estudiante_id = ?2 AND e.anulada_en IS NULL
       LEFT JOIN correcciones co ON co.entrega_id = e.id
      WHERE ca.id = ?1
      ORDER BY t.fecha_limite`
  );

  function tareaJSON(fila) {
    return {
      id: String(fila.id),
      catedraId: String(fila.catedra_id),
      materia: fila.materia,
      titulo: fila.titulo,
      consigna: fila.consigna,
      profesor: fila.profesor,
      fechaLimite: fila.fecha_limite,
      estado: fila.entrega_id ? "entregada" : "pendiente",
      metodoEstudio: fila.metodo_estudio ?? undefined,
      tipoAsignacion: fila.tipo_asignacion,
      entregadoEn: fila.entregado_en ?? null,
      comentarioEntrega: fila.comentario_entrega ?? null,
      nota: fila.nota ?? null,
      devolucion: fila.devolucion ?? "",
      corregidoEn: fila.corregido_en ?? null,
    };
  }

  const avisosDe = db.prepare(
    `SELECT a.id, a.titulo, a.contenido, a.creado_en, a.editado_en, a.autor_id,
            u.nombre AS autor, u.rol AS autor_rol, u.avatar_url AS autor_avatar
       FROM catedra_avisos a
       JOIN usuarios u ON u.id = a.autor_id
      WHERE a.catedra_id = ? AND a.eliminado_en IS NULL
      ORDER BY a.creado_en DESC`
  );
  const reaccionesDe = db.prepare(
    "SELECT emoji, COUNT(*) AS n FROM aviso_reacciones WHERE aviso_id = ? GROUP BY emoji"
  );
  const miReaccionDe = db.prepare(
    "SELECT emoji FROM aviso_reacciones WHERE aviso_id = ? AND usuario_id = ?"
  );
  const respuestasDe = db.prepare(
    `SELECT r.id, r.contenido, r.creado_en, r.usuario_id,
            u.nombre AS autor, u.rol AS autor_rol, u.avatar_url AS autor_avatar
       FROM aviso_respuestas r
       JOIN usuarios u ON u.id = r.usuario_id
      WHERE r.aviso_id = ? AND r.eliminado_en IS NULL
      ORDER BY r.creado_en`
  );

  function reaccionesJSON(avisoId) {
    const conteo = {};
    for (const fila of reaccionesDe.all(avisoId)) conteo[fila.emoji] = fila.n;
    return conteo;
  }
  function respuestaJSON(fila, usuarioId) {
    return {
      id: String(fila.id),
      contenido: fila.contenido,
      creadoEn: fila.creado_en,
      autor: fila.autor,
      autorRol: fila.autor_rol,
      autorAvatar: fila.autor_avatar ?? null,
      // Para ofrecer editar/borrar solo sobre lo propio (el servidor igual revalida).
      esMia: fila.usuario_id === usuarioId,
    };
  }
  function avisoJSON(a, usuarioId) {
    return {
      id: String(a.id),
      titulo: a.titulo ?? null,
      contenido: a.contenido,
      creadoEn: a.creado_en,
      editadoEn: a.editado_en ?? null,
      autor: a.autor,
      autorRol: a.autor_rol,
      autorAvatar: a.autor_avatar ?? null,
      esMio: a.autor_id === usuarioId,
      reacciones: reaccionesJSON(a.id),
      miReaccion: miReaccionDe.get(a.id, usuarioId)?.emoji ?? null,
      respuestas: respuestasDe.all(a.id).map((r) => respuestaJSON(r, usuarioId)),
    };
  }

  // ── Permiso por fila ──────────────────────────────────────────────────────
  // "profesor" si es el docente de la cátedra; "estudiante" si está inscripto en
  // su curso; null en cualquier otro caso.
  function accesoACatedra(usuario, catedra) {
    if (!catedra) return null;
    if (usuario.id === catedra.profesor_id) return "profesor";
    if (estaInscripto(db, usuario.id, catedra.curso_id)) return "estudiante";
    return null;
  }

  /** La cátedra si el usuario puede verla (profe o alumno inscripto), o corta. */
  function catedraConAcceso(usuario, catedraId, res) {
    const catedra = Number.isInteger(catedraId) ? catedraPorId.get(catedraId) : null;
    if (!catedra) {
      res.status(404).json({ error: "Esa materia no existe." });
      return null;
    }
    if (!accesoACatedra(usuario, catedra)) {
      res.status(403).json({ error: "No tenés acceso a esa materia." });
      return null;
    }
    return catedra;
  }

  // ── GET detalle ───────────────────────────────────────────────────────────
  app.get(
    "/api/materias/:catedraId/detalle",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "detalle-materia-estudiante");
      if (!usuario) return;

      const catedraId = Number(req.params.catedraId);
      const catedra = catedraConAcceso(usuario, catedraId, res);
      if (!catedra) return;

      res.json({
        // El rol con que entra: la vidriera decide si mostrar el compositor de
        // avisos (el servidor igual revalida cada publicación).
        soyProfesor: usuario.id === catedra.profesor_id,
        materia: catedra.materia,
        profesor: catedra.profesor,
        profesorAvatar: catedra.profesor_avatar ?? null,
        horarios: horariosDe.all(catedraId).map((h) => ({
          dia: h.dia_semana,
          horaInicio: h.hora_inicio,
          horaFin: h.hora_fin,
          aula: h.aula ?? null,
        })),
        tareas: tareasDeCatedra.all(catedraId, usuario.id).map(tareaJSON),
      });
    })
  );

  // ── GET avisos ────────────────────────────────────────────────────────────
  app.get(
    "/api/materias/:catedraId/avisos",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "detalle-materia-estudiante");
      if (!usuario) return;

      const catedraId = Number(req.params.catedraId);
      const catedra = catedraConAcceso(usuario, catedraId, res);
      if (!catedra) return;

      res.json({ avisos: avisosDe.all(catedraId).map((a) => avisoJSON(a, usuario.id)) });
    })
  );

  // ── POST aviso: publicar (SOLO el profesor de la cátedra) ─────────────────
  app.post(
    "/api/materias/:catedraId/avisos",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "detalle-materia-estudiante");
      if (!usuario) return;

      const catedraId = Number(req.params.catedraId);
      const catedra = catedraConAcceso(usuario, catedraId, res);
      if (!catedra) return;
      if (usuario.id !== catedra.profesor_id) {
        return res.status(403).json({ error: "Solo el profesor de la materia publica avisos." });
      }

      const titulo = String(req.body?.titulo ?? "").trim() || null;
      const contenido = String(req.body?.contenido ?? "").trim();
      if (!contenido) return res.status(400).json({ error: "El aviso necesita un texto." });

      const info = db
        .prepare(
          "INSERT INTO catedra_avisos (catedra_id, autor_id, titulo, contenido) VALUES (?, ?, ?, ?)"
        )
        .run(catedraId, usuario.id, titulo, contenido);

      const fila = avisosDe.all(catedraId).find((a) => a.id === Number(info.lastInsertRowid));
      res.status(201).json(avisoJSON(fila, usuario.id));
    })
  );

  // El aviso con su cátedra y autor, para validar permiso de fila.
  const avisoPorId = db.prepare(
    "SELECT id, catedra_id, autor_id FROM catedra_avisos WHERE id = ? AND eliminado_en IS NULL"
  );

  /** El aviso si el usuario puede verlo (profe o alumno de su cátedra), o corta. */
  function avisoConAcceso(usuario, avisoId, res) {
    const aviso = Number.isInteger(avisoId) ? avisoPorId.get(avisoId) : null;
    if (!aviso) {
      res.status(404).json({ error: "Ese aviso no existe." });
      return null;
    }
    const catedra = catedraPorId.get(aviso.catedra_id);
    if (!accesoACatedra(usuario, catedra)) {
      res.status(403).json({ error: "No tenés acceso a esa materia." });
      return null;
    }
    return aviso;
  }

  // ── PUT aviso: editar (SOLO su autor) ─────────────────────────────────────
  app.put(
    "/api/materias/avisos/:avisoId",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "detalle-materia-estudiante");
      if (!usuario) return;

      const avisoId = Number(req.params.avisoId);
      const aviso = avisoConAcceso(usuario, avisoId, res);
      if (!aviso) return;
      if (aviso.autor_id !== usuario.id) {
        return res.status(403).json({ error: "Solo podés editar tus propios avisos." });
      }

      const titulo = String(req.body?.titulo ?? "").trim() || null;
      const contenido = String(req.body?.contenido ?? "").trim();
      if (!contenido) return res.status(400).json({ error: "El aviso necesita un texto." });

      db.prepare(
        "UPDATE catedra_avisos SET titulo = ?, contenido = ?, editado_en = datetime('now') WHERE id = ?"
      ).run(titulo, contenido, avisoId);

      res.json({ ok: true });
    })
  );

  // ── DELETE aviso: borrado suave (SOLO su autor) ───────────────────────────
  app.delete(
    "/api/materias/avisos/:avisoId",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "detalle-materia-estudiante");
      if (!usuario) return;

      const avisoId = Number(req.params.avisoId);
      const aviso = avisoConAcceso(usuario, avisoId, res);
      if (!aviso) return;
      if (aviso.autor_id !== usuario.id) {
        return res.status(403).json({ error: "Solo podés borrar tus propios avisos." });
      }

      db.prepare("UPDATE catedra_avisos SET eliminado_en = datetime('now') WHERE id = ?").run(avisoId);
      res.json({ ok: true });
    })
  );

  // ── POST reacción: poner / cambiar / sacar mi emoji (único por aviso) ─────
  app.post(
    "/api/materias/avisos/:avisoId/reaccion",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "detalle-materia-estudiante");
      if (!usuario) return;

      const emoji = String(req.body?.emoji ?? "");
      if (!EMOJIS.includes(emoji)) {
        return res.status(400).json({ error: "Ese emoji no está permitido." });
      }

      const avisoId = Number(req.params.avisoId);
      const aviso = avisoConAcceso(usuario, avisoId, res);
      if (!aviso) return;

      const previa = db
        .prepare("SELECT id, emoji FROM aviso_reacciones WHERE aviso_id = ? AND usuario_id = ?")
        .get(avisoId, usuario.id);

      let miReaccion;
      if (!previa) {
        db.prepare(
          "INSERT INTO aviso_reacciones (aviso_id, usuario_id, emoji) VALUES (?, ?, ?)"
        ).run(avisoId, usuario.id, emoji);
        miReaccion = emoji;
      } else if (previa.emoji === emoji) {
        db.prepare("DELETE FROM aviso_reacciones WHERE id = ?").run(previa.id);
        miReaccion = null;
      } else {
        db.prepare(
          "UPDATE aviso_reacciones SET emoji = ?, creado_en = datetime('now') WHERE id = ?"
        ).run(emoji, previa.id);
        miReaccion = emoji;
      }

      res.json({ reacciones: reaccionesJSON(avisoId), miReaccion });
    })
  );

  // ── POST respuesta: responder por texto ───────────────────────────────────
  app.post(
    "/api/materias/avisos/:avisoId/respuesta",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "detalle-materia-estudiante");
      if (!usuario) return;

      const contenido = String(req.body?.contenido ?? "").trim();
      if (!contenido) return res.status(400).json({ error: "La respuesta está vacía." });

      const avisoId = Number(req.params.avisoId);
      const aviso = avisoConAcceso(usuario, avisoId, res);
      if (!aviso) return;

      const info = db
        .prepare(
          "INSERT INTO aviso_respuestas (aviso_id, usuario_id, contenido) VALUES (?, ?, ?)"
        )
        .run(avisoId, usuario.id, contenido);

      const fila = db
        .prepare(
          `SELECT r.id, r.contenido, r.creado_en, r.usuario_id,
                  u.nombre AS autor, u.rol AS autor_rol, u.avatar_url AS autor_avatar
             FROM aviso_respuestas r JOIN usuarios u ON u.id = r.usuario_id
            WHERE r.id = ?`
        )
        .get(info.lastInsertRowid);

      res.status(201).json(respuestaJSON(fila, usuario.id));
    })
  );

  // La respuesta con su aviso, para validar permiso de fila.
  const respuestaPorId = db.prepare(
    "SELECT id, aviso_id, usuario_id FROM aviso_respuestas WHERE id = ? AND eliminado_en IS NULL"
  );

  /** La respuesta si es del usuario (y su aviso es de una cátedra suya), o corta. */
  function respuestaMia(usuario, respuestaId, res) {
    const r = Number.isInteger(respuestaId) ? respuestaPorId.get(respuestaId) : null;
    if (!r) {
      res.status(404).json({ error: "Esa respuesta no existe." });
      return null;
    }
    if (r.usuario_id !== usuario.id) {
      res.status(403).json({ error: "Solo podés tocar tus propias respuestas." });
      return null;
    }
    return r;
  }

  // ── PUT respuesta: editar la mía ──────────────────────────────────────────
  app.put(
    "/api/materias/respuestas/:respuestaId",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "detalle-materia-estudiante");
      if (!usuario) return;

      const respuestaId = Number(req.params.respuestaId);
      const r = respuestaMia(usuario, respuestaId, res);
      if (!r) return;

      const contenido = String(req.body?.contenido ?? "").trim();
      if (!contenido) return res.status(400).json({ error: "La respuesta no puede quedar vacía." });

      db.prepare("UPDATE aviso_respuestas SET contenido = ? WHERE id = ?").run(contenido, respuestaId);
      res.json({ ok: true, contenido });
    })
  );

  // ── DELETE respuesta: borrado suave de la mía ─────────────────────────────
  app.delete(
    "/api/materias/respuestas/:respuestaId",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "detalle-materia-estudiante");
      if (!usuario) return;

      const respuestaId = Number(req.params.respuestaId);
      const r = respuestaMia(usuario, respuestaId, res);
      if (!r) return;

      db.prepare("UPDATE aviso_respuestas SET eliminado_en = datetime('now') WHERE id = ?").run(respuestaId);
      res.json({ ok: true });
    })
  );

  // ══════════════════════════════════════════════════════════════════════════
  // VISTA DEL PROFESOR (Prompt 10): quién reaccionó, alumnos y progreso
  // ══════════════════════════════════════════════════════════════════════════

  /** La cátedra si el usuario es SU profesor; si no (incluido el alumno), corta. */
  function catedraDelProfe(usuario, catedraId, res) {
    const catedra = catedraConAcceso(usuario, catedraId, res);
    if (!catedra) return null; // ya respondió 404/403
    if (usuario.id !== catedra.profesor_id) {
      res.status(403).json({ error: "Solo el profesor de la materia puede ver esto." });
      return null;
    }
    return catedra;
  }

  // ── GET detalle de un aviso: quiénes reaccionaron (con qué emoji) + respuestas
  // Solo el profesor de la cátedra: es su tablero de cómo cayó el aviso.
  const reaccionesConNombreDe = db.prepare(
    `SELECT r.emoji, r.creado_en, u.nombre, u.avatar_url
       FROM aviso_reacciones r
       JOIN usuarios u ON u.id = r.usuario_id
      WHERE r.aviso_id = ?
      ORDER BY r.creado_en`
  );
  app.get(
    "/api/materias/:catedraId/avisos/:avisoId/detalle",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "detalle-materia-estudiante");
      if (!usuario) return;

      const catedraId = Number(req.params.catedraId);
      if (!catedraDelProfe(usuario, catedraId, res)) return;

      const avisoId = Number(req.params.avisoId);
      const aviso = Number.isInteger(avisoId) ? avisoPorId.get(avisoId) : null;
      if (!aviso || aviso.catedra_id !== catedraId) {
        return res.status(404).json({ error: "Ese aviso no existe en esta materia." });
      }

      res.json({
        reacciones: reaccionesConNombreDe.all(avisoId).map((r) => ({
          emoji: r.emoji,
          nombre: r.nombre,
          avatar: r.avatar_url ?? null,
          creadoEn: r.creado_en,
        })),
        respuestas: respuestasDe.all(avisoId).map((r) => respuestaJSON(r, usuario.id)),
      });
    })
  );

  // ── GET alumnos de la materia (los inscriptos en su curso). Solo el profesor.
  const alumnosDeCurso = db.prepare(
    `SELECT u.id, u.nombre, u.avatar_url
       FROM inscripciones i
       JOIN usuarios u ON u.id = i.estudiante_id
      WHERE i.curso_id = ?
      ORDER BY u.nombre`
  );
  app.get(
    "/api/materias/:catedraId/alumnos",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "detalle-materia-estudiante");
      if (!usuario) return;

      const catedraId = Number(req.params.catedraId);
      const catedra = catedraDelProfe(usuario, catedraId, res);
      if (!catedra) return;

      res.json({
        alumnos: alumnosDeCurso.all(catedra.curso_id).map((a) => ({
          id: String(a.id),
          nombre: a.nombre,
          avatar: a.avatar_url ?? null,
        })),
      });
    })
  );

  // ── GET progreso de UN alumno en la materia. SOLO el profesor dueño o la
  // dirección de la institución. El propio alumno (u otro rol) → 403: el progreso
  // analítico es del docente. La serie sale de correcciones reales; sin notas,
  // llega vacía (el frontend muestra un estado honesto, nunca una línea inventada).
  const serieDe = db.prepare(
    `SELECT t.titulo, co.nota, co.corregido_en
       FROM tareas t
       JOIN entregas e     ON e.tarea_id = t.id AND e.estudiante_id = ?2 AND e.anulada_en IS NULL
       JOIN correcciones co ON co.entrega_id = e.id
      WHERE t.catedra_id = ?1 AND t.eliminado_en IS NULL
      ORDER BY co.corregido_en`
  );
  const entregadasDe = db.prepare(
    `SELECT t.id, t.titulo, t.fecha_limite, e.entregado_en, co.nota
       FROM tareas t
       JOIN entregas e ON e.tarea_id = t.id AND e.estudiante_id = ?2 AND e.anulada_en IS NULL
       LEFT JOIN correcciones co ON co.entrega_id = e.id
      WHERE t.catedra_id = ?1 AND t.eliminado_en IS NULL
      ORDER BY e.entregado_en`
  );
  const adeudadasDe = db.prepare(
    `SELECT t.id, t.titulo, t.fecha_limite
       FROM tareas t
      WHERE t.catedra_id = ?1 AND t.eliminado_en IS NULL
        AND NOT EXISTS (
              SELECT 1 FROM entregas e
               WHERE e.tarea_id = t.id AND e.estudiante_id = ?2 AND e.anulada_en IS NULL
            )
      ORDER BY t.fecha_limite`
  );
  const alumnoPorId = db.prepare("SELECT id, nombre, avatar_url FROM usuarios WHERE id = ?");

  app.get(
    "/api/materias/:catedraId/alumnos/:alumnoId/progreso",
    ventanilla((req, res) => {
      // Cualquiera con sesión puede pedirla, pero solo el profe dueño o la
      // dirección la reciben: el chequeo es por fila, no por pantalla escondida.
      const usuario = exigirSesion(db, req, res);
      if (!usuario) return;

      const catedraId = Number(req.params.catedraId);
      const catedra = Number.isInteger(catedraId) ? catedraPorId.get(catedraId) : null;
      if (!catedra) return res.status(404).json({ error: "Esa materia no existe." });

      const esProfe = usuario.id === catedra.profesor_id;
      const esDireccion =
        usuario.rol === "admin-academico" && usuario.institucionId === catedra.institucion_id;
      if (!esProfe && !esDireccion) {
        return res.status(403).json({ error: "El progreso de un alumno es solo para el docente." });
      }

      const alumnoId = Number(req.params.alumnoId);
      // El alumno tiene que estar inscripto en el curso de la cátedra.
      if (!Number.isInteger(alumnoId) || !estaInscripto(db, alumnoId, catedra.curso_id)) {
        return res.status(404).json({ error: "Ese alumno no está en esta materia." });
      }
      const alumno = alumnoPorId.get(alumnoId);

      res.json({
        alumno: { id: String(alumno.id), nombre: alumno.nombre, avatar: alumno.avatar_url ?? null },
        serie: serieDe.all(catedraId, alumnoId).map((f) => ({
          fecha: f.corregido_en,
          nota: f.nota,
          tarea: f.titulo,
        })),
        entregadas: entregadasDe.all(catedraId, alumnoId).map((f) => ({
          id: String(f.id),
          titulo: f.titulo,
          fechaLimite: f.fecha_limite,
          entregadoEn: f.entregado_en,
          enTermino: String(f.entregado_en).slice(0, 10) <= f.fecha_limite,
          nota: f.nota ?? null,
        })),
        adeudadas: adeudadasDe.all(catedraId, alumnoId).map((f) => ({
          id: String(f.id),
          titulo: f.titulo,
          fechaLimite: f.fecha_limite,
        })),
      });
    })
  );
}
