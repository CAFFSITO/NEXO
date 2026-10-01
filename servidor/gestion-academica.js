import { exigirAcceso, ventanilla } from "./comun.js";
import { asegurarComunidadCurso } from "./chat.js";

const idValido = (valor) => Number.isSafeInteger(Number(valor)) && Number(valor) > 0;

/** La dirección administra relaciones reales; nunca nombres libres sin usuario. */
export function registrarGestionAcademica(app, db) {
  const acceso = (req, res) => exigirAcceso(db, req, res, "cursos-activos");
  const persona = db.prepare("SELECT id FROM usuarios WHERE id = ? AND institucion_id = ? AND rol = ? AND estado = 'activo'");
  const buscarCurso = db.prepare("SELECT * FROM cursos WHERE id = ? AND institucion_id = ?");
  function cursoPropio(req, res, usuario) {
    const curso = idValido(req.params.id) ? buscarCurso.get(Number(req.params.id), usuario.institucionId) : null;
    if (!curso) res.status(404).json({ error: "Ese curso no existe en tu institución." });
    return curso;
  }
  function datosCurso(req, res, usuario) {
    const anio = Number(req.body?.anio);
    const division = String(req.body?.division ?? "").trim().toUpperCase();
    const preceptorId = req.body?.preceptorId == null || req.body.preceptorId === "" ? null : Number(req.body.preceptorId);
    if (!Number.isInteger(anio) || anio < 1 || anio > 7 || !/^[A-Z0-9ÁÉÍÓÚÑ -]{1,12}$/.test(division)) {
      res.status(400).json({ error: "Elegí un año entre 1 y 7 y una división válida de hasta 12 caracteres." });
      return null;
    }
    if (preceptorId !== null && (!idValido(preceptorId) || !persona.get(preceptorId, usuario.institucionId, "preceptor"))) {
      res.status(400).json({ error: "Elegí un preceptor activo de tu institución." });
      return null;
    }
    return { anio, division, preceptorId };
  }
  function transaccion(operacion) {
    db.exec("BEGIN");
    try {
      const resultado = operacion();
      db.exec("COMMIT");
      return resultado;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  app.get("/api/gestion-academica/opciones", ventanilla((req, res) => {
    const usuario = acceso(req, res);
    if (!usuario) return;
    const personas = db.prepare(`SELECT u.id, u.nombre, u.rol,
      (SELECT i.curso_id FROM inscripciones i WHERE i.estudiante_id = u.id LIMIT 1) AS curso_id
      FROM usuarios u WHERE u.institucion_id = ? AND u.estado = 'activo' ORDER BY u.nombre`).all(usuario.institucionId);
    const porRol = (rol) => personas.filter((p) => p.rol === rol).map((p) => ({ id: String(p.id), nombre: p.nombre,
      ...(rol === "estudiante" ? { cursoId: p.curso_id == null ? null : String(p.curso_id) } : {}) }));
    res.json({
      preceptores: porRol("preceptor"), profesores: porRol("profesor"), estudiantes: porRol("estudiante"), familias: porRol("familia"),
      materias: db.prepare("SELECT id, nombre FROM materias WHERE institucion_id = ? ORDER BY nombre").all(usuario.institucionId).map((m) => ({ ...m, id: String(m.id) })),
      cursos: db.prepare("SELECT id, anio, division FROM cursos WHERE institucion_id = ? ORDER BY anio, division").all(usuario.institucionId).map((c) => ({ ...c, id: String(c.id) })),
    });
  }));

  app.post("/api/cursos", ventanilla((req, res) => {
    const usuario = acceso(req, res);
    if (!usuario) return;
    const datos = datosCurso(req, res, usuario);
    if (!datos) return;
    const { anio, division, preceptorId } = datos;
    if (db.prepare("SELECT id FROM cursos WHERE institucion_id = ? AND anio = ? AND division = ? COLLATE NOCASE").get(usuario.institucionId, anio, division)) {
      return res.status(409).json({ error: "Ya existe un curso con ese año y división." });
    }
    const id = transaccion(() => {
      const info = db.prepare("INSERT INTO cursos (institucion_id, anio, division, preceptor_id) VALUES (?, ?, ?, ?)").run(usuario.institucionId, anio, division, preceptorId);
      asegurarComunidadCurso(db, Number(info.lastInsertRowid));
      return info.lastInsertRowid;
    });
    res.status(201).json({ id: String(id) });
  }));

  app.put("/api/cursos/:id", ventanilla((req, res) => {
    const usuario = acceso(req, res);
    if (!usuario) return;
    const curso = cursoPropio(req, res, usuario);
    if (!curso) return;
    const datos = datosCurso(req, res, usuario);
    if (!datos) return;
    const { anio, division, preceptorId } = datos;
    if (db.prepare("SELECT id FROM cursos WHERE institucion_id = ? AND anio = ? AND division = ? COLLATE NOCASE AND id <> ?").get(usuario.institucionId, anio, division, curso.id)) {
      return res.status(409).json({ error: "Ya existe un curso con ese año y división." });
    }
    transaccion(() => {
      db.prepare("UPDATE cursos SET anio = ?, division = ?, preceptor_id = ? WHERE id = ?").run(anio, division, preceptorId, curso.id);
      asegurarComunidadCurso(db, curso.id);
    });
    res.json({ ok: true });
  }));

  app.put("/api/cursos/:id/inscripciones", ventanilla((req, res) => {
    const usuario = acceso(req, res);
    if (!usuario) return;
    const curso = cursoPropio(req, res, usuario);
    if (!curso) return;
    if (!Array.isArray(req.body?.estudianteIds) || req.body.estudianteIds.length > 1000 || req.body.estudianteIds.some((id) => !idValido(id))) {
      return res.status(400).json({ error: "Enviá una lista válida de estudiantes." });
    }
    const ids = [...new Set(req.body.estudianteIds.map(Number))];
    for (const id of ids) {
      if (!persona.get(id, usuario.institucionId, "estudiante")) {
        return res.status(400).json({ error: "Todos los estudiantes deben estar activos y pertenecer a tu institución." });
      }
      if (db.prepare("SELECT 1 FROM inscripciones WHERE estudiante_id = ? AND curso_id <> ?").get(id, curso.id)) {
        return res.status(409).json({ error: "Un estudiante ya pertenece a otro curso. Quitalo de ese curso antes de trasladarlo." });
      }
    }
    transaccion(() => {
      db.prepare("DELETE FROM inscripciones WHERE curso_id = ?").run(curso.id);
      const insertar = db.prepare("INSERT INTO inscripciones (curso_id, estudiante_id) VALUES (?, ?)");
      for (const id of ids) insertar.run(curso.id, id);
      asegurarComunidadCurso(db, curso.id);
      // Retirar acceso a chats de clases al quitar una inscripción.
      db.prepare(`DELETE FROM conversacion_miembros WHERE conversacion_id IN (
        SELECT co.id FROM conversaciones co JOIN clases_planificadas cp ON cp.id = co.clase_id
        JOIN catedras ca ON ca.id = cp.catedra_id WHERE ca.curso_id = ?
      ) AND usuario_id IN (SELECT id FROM usuarios WHERE rol = 'estudiante')
        AND usuario_id NOT IN (SELECT estudiante_id FROM inscripciones WHERE curso_id = ?)`
      ).run(curso.id, curso.id);
    });
    res.json({ ok: true, estudiantes: ids.length });
  }));

  app.post("/api/cursos/:id/catedras", ventanilla((req, res) => {
    const usuario = acceso(req, res);
    if (!usuario) return;
    const curso = cursoPropio(req, res, usuario);
    if (!curso) return;
    const materiaId = Number(req.body?.materiaId);
    const profesorId = Number(req.body?.profesorId);
    if (!idValido(materiaId) || !db.prepare("SELECT id FROM materias WHERE id = ? AND institucion_id = ?").get(materiaId, usuario.institucionId)
      || !idValido(profesorId) || !persona.get(profesorId, usuario.institucionId, "profesor")) {
      return res.status(400).json({ error: "Elegí una materia y un profesor activo de tu institución." });
    }
    db.prepare(`INSERT INTO catedras (curso_id, materia_id, profesor_id) VALUES (?, ?, ?)
      ON CONFLICT(materia_id, curso_id) DO UPDATE SET profesor_id = excluded.profesor_id`).run(curso.id, materiaId, profesorId);
    const catedra = db.prepare("SELECT id FROM catedras WHERE curso_id = ? AND materia_id = ?").get(curso.id, materiaId);
    res.status(201).json({ id: String(catedra.id) });
  }));

  app.post("/api/materias", ventanilla((req, res) => {
    const usuario = acceso(req, res);
    if (!usuario) return;
    const nombre = String(req.body?.nombre ?? "").trim();
    if (!nombre || nombre.length > 100) return res.status(400).json({ error: "Escribí un nombre de materia de hasta 100 caracteres." });
    if (db.prepare("SELECT id FROM materias WHERE institucion_id = ? AND nombre = ? COLLATE NOCASE").get(usuario.institucionId, nombre)) {
      return res.status(409).json({ error: "Esa materia ya existe en tu institución." });
    }
    const info = db.prepare("INSERT INTO materias (institucion_id, nombre) VALUES (?, ?)").run(usuario.institucionId, nombre);
    res.status(201).json({ id: String(info.lastInsertRowid), nombre });
  }));

  app.get("/api/perfiles/:id/vinculos", ventanilla((req, res) => {
    const usuario = acceso(req, res);
    if (!usuario) return;
    if (!idValido(req.params.id) || !persona.get(Number(req.params.id), usuario.institucionId, "familia")) {
      return res.status(404).json({ error: "Ese perfil de familia no existe en tu institución." });
    }
    const estudiantes = db.prepare("SELECT estudiante_id, parentesco FROM familiares WHERE usuario_familia_id = ?").all(Number(req.params.id));
    res.json({ estudiantes: estudiantes.map((e) => ({ id: String(e.estudiante_id), parentesco: e.parentesco })) });
  }));

  app.put("/api/perfiles/:id/vinculos", ventanilla((req, res) => {
    const usuario = acceso(req, res);
    if (!usuario) return;
    const familiaId = Number(req.params.id);
    if (!idValido(familiaId) || !persona.get(familiaId, usuario.institucionId, "familia")) {
      return res.status(404).json({ error: "Ese perfil de familia no existe en tu institución." });
    }
    const estudiantes = req.body?.estudiantes;
    if (!Array.isArray(estudiantes) || estudiantes.length > 100 || estudiantes.some((e) => !idValido(e?.id)
      || !persona.get(Number(e.id), usuario.institucionId, "estudiante") || String(e.parentesco ?? "").length > 80)) {
      return res.status(400).json({ error: "Elegí estudiantes activos de tu institución y un parentesco válido." });
    }
    transaccion(() => {
      db.prepare("DELETE FROM familiares WHERE usuario_familia_id = ?").run(familiaId);
      const insertar = db.prepare("INSERT OR IGNORE INTO familiares (usuario_familia_id, estudiante_id, parentesco) VALUES (?, ?, ?)");
      for (const e of estudiantes) insertar.run(familiaId, Number(e.id), String(e.parentesco ?? "").trim() || "madre/padre");
    });
    res.json({ ok: true });
  }));
}
