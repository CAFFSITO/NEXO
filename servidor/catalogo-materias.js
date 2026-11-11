// ============================================================================
// NEXO — Materias de la escuela (sección "Materias" de la dirección)
// ----------------------------------------------------------------------------
// La dirección crea cada materia con todos sus detalles y elige qué profesores
// la dan. Después, en Cursos, busca "materia — profesor" y la suma al curso.
//
//   GET    /api/gestion-academica/materias → materias con profesores, cursos y temario
//   POST   /api/materias                   → crear (solo el nombre es obligatorio)
//   PUT    /api/materias/:id               → editar (lo que no se manda queda igual)
//   DELETE /api/materias/:id               → borrar (solo si no se da en ningún curso)
//
// El temario es opcional y vive en `unidades` (el mismo que usa el formulario de
// metas de los estudiantes): de referencia para los profesores.
// ============================================================================

import { exigirAcceso, nombreDeMateria, ventanilla } from "./comun.js";
import { leerGenoma } from "./genoma.js";

const idValido = (valor) => Number.isSafeInteger(Number(valor)) && Number(valor) > 0;
const LARGO = { nombre: 100, area: 60, texto: 4000, unidad: 150 };
const MAX_UNIDADES = 60;
const MAX_PROFESORES = 500;
const textoLimpio = (v) => String(v ?? "").replace(/\r\n/g, "\n").trim();
const nombreLimpio = (v) => String(v ?? "").replace(/\s+/g, " ").trim();
const nombreCurso = (c) => `${c.anio}° ${c.division}`;

export function registrarCatalogoMaterias(app, db) {
  const acceso = (req, res) => exigirAcceso(db, req, res, "materias-institucion");

  const materiaPropia = db.prepare("SELECT * FROM materias WHERE id = ? AND institucion_id = ?");
  const profesorActivo = db.prepare("SELECT id FROM usuarios WHERE id = ? AND institucion_id = ? AND rol = 'profesor' AND estado = 'activo'");
  const repetida = db.prepare(
    "SELECT id FROM materias WHERE institucion_id = ? AND nombre = ? COLLATE NOCASE AND COALESCE(anio, 0) = COALESCE(?, 0) AND id <> ?"
  );
  const cursosDeMateria = db.prepare(
    `SELECT ca.id AS catedra_id, c.id AS curso_id, c.anio, c.division, ca.profesor_id, p.nombre AS profesor
       FROM catedras ca
       JOIN cursos c ON c.id = ca.curso_id
       JOIN usuarios p ON p.id = ca.profesor_id
      WHERE ca.materia_id = ?
      ORDER BY c.anio, c.division`
  );

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

  /** Error de validación que se devuelve tal cual a la pantalla. */
  class Rechazo extends Error {
    constructor(status, mensaje, extra = {}) { super(mensaje); this.status = status; this.extra = extra; }
  }

  /**
   * Lee y valida lo que viene en el pedido. `actual` = la materia que se edita
   * (null al crear). Lo que no viene queda como estaba.
   */
  function leerDatos(body, usuario, actual) {
    const datos = {};
    const tiene = (clave) => body?.[clave] !== undefined;

    if (!actual || tiene("nombre")) {
      const nombre = nombreLimpio(body?.nombre);
      if (!nombre || nombre.length > LARGO.nombre) throw new Rechazo(400, "Escribí el nombre de la materia (hasta 100 letras).");
      datos.nombre = nombre;
    }
    if (tiene("anio")) {
      if (body.anio === null || body.anio === "") datos.anio = null;
      else {
        const anio = Number(body.anio);
        const { anioMin, anioMax } = leerGenoma(db, usuario.institucionId).personalizacion.academico;
        // Un cambio de política no impide editar una materia que ya tenía su año.
        const igualQueAntes = actual && actual.anio === anio;
        if (!Number.isInteger(anio) || (!igualQueAntes && (anio < anioMin || anio > anioMax))) {
          throw new Rechazo(400, `Elegí un año entre ${anioMin}° y ${anioMax}°, o "Todos los años".`);
        }
        datos.anio = anio;
      }
    }
    if (tiene("area")) {
      const area = nombreLimpio(body.area);
      if (area.length > LARGO.area) throw new Rechazo(400, "El área puede tener hasta 60 letras.");
      datos.area = area || null;
    }
    if (tiene("horasSemanales")) {
      if (body.horasSemanales === null || body.horasSemanales === "") datos.horas_semanales = null;
      else {
        const horas = Number(body.horasSemanales);
        if (!Number.isInteger(horas) || horas < 1 || horas > 40) throw new Rechazo(400, "Las horas por semana van de 1 a 40 (o dejalas vacías).");
        datos.horas_semanales = horas;
      }
    }
    for (const clave of ["descripcion", "objetivos", "evaluacion", "bibliografia"]) {
      if (!tiene(clave)) continue;
      const texto = textoLimpio(body[clave]);
      if (texto.length > LARGO.texto) throw new Rechazo(400, "Cada parte del programa puede tener hasta 4000 caracteres.");
      datos[clave] = texto;
    }

    let profesorIds;
    if (tiene("profesorIds")) {
      if (!Array.isArray(body.profesorIds) || body.profesorIds.length > MAX_PROFESORES || body.profesorIds.some((id) => !idValido(id))) {
        throw new Rechazo(400, "La lista de profesores no es válida.");
      }
      profesorIds = [...new Set(body.profesorIds.map(Number))];
    }

    let temario;
    if (tiene("temario")) {
      if (!Array.isArray(body.temario) || body.temario.length > MAX_UNIDADES) {
        throw new Rechazo(400, `El temario puede tener hasta ${MAX_UNIDADES} unidades.`);
      }
      temario = body.temario.map((u, i) => {
        const titulo = nombreLimpio(u?.titulo);
        const contenidos = textoLimpio(u?.contenidos);
        if (!titulo) throw new Rechazo(400, `Ponele un título a la unidad ${i + 1} (o quitala).`);
        if (titulo.length > LARGO.unidad) throw new Rechazo(400, `El título de la unidad ${i + 1} puede tener hasta 150 letras.`);
        if (contenidos.length > LARGO.texto) throw new Rechazo(400, `Los contenidos de la unidad ${i + 1} pueden tener hasta 4000 caracteres.`);
        return { id: idValido(u?.id) ? Number(u.id) : null, titulo, contenidos };
      });
    }
    return { datos, profesorIds, temario };
  }

  /** Cambia la lista de profesores. Nadie sale mientras dé la materia en un curso. */
  function guardarProfesores(materia, profesorIds, usuario) {
    const actuales = db.prepare("SELECT profesor_id FROM materia_profesores WHERE materia_id = ?").all(materia.id).map((f) => f.profesor_id);
    const nuevos = profesorIds.filter((id) => !actuales.includes(id));
    for (const id of nuevos) {
      if (!profesorActivo.get(id, usuario.institucionId)) throw new Rechazo(400, "Elegí profesores activos de tu escuela.");
    }
    const salen = actuales.filter((id) => !profesorIds.includes(id));
    if (salen.length) {
      const enCursos = cursosDeMateria.all(materia.id).filter((c) => salen.includes(c.profesor_id));
      if (enCursos.length) {
        const c = enCursos[0];
        const cursos = enCursos.filter((x) => x.profesor_id === c.profesor_id).map(nombreCurso).join(", ");
        throw new Rechazo(409, `${c.profesor} da esta materia en ${cursos}. Para sacarle la materia, primero quitala o cambiale el profesor en ese curso (sección Cursos).`);
      }
      const borrar = db.prepare("DELETE FROM materia_profesores WHERE materia_id = ? AND profesor_id = ?");
      for (const id of salen) borrar.run(materia.id, id);
    }
    const sumar = db.prepare("INSERT OR IGNORE INTO materia_profesores (materia_id, profesor_id) VALUES (?, ?)");
    for (const id of nuevos) sumar.run(materia.id, id);
  }

  /**
   * Guarda el temario conservando los ids de las unidades que siguen (así las
   * metas que ya apuntaban a una unidad no la pierden). Si se quita una unidad
   * que alguna meta usaba, la meta queda con su materia y sin unidad.
   */
  function guardarTemario(materiaId, temario) {
    const existentes = new Set(db.prepare("SELECT id FROM unidades WHERE materia_id = ?").all(materiaId).map((f) => f.id));
    const siguen = new Set(temario.filter((u) => u.id && existentes.has(u.id)).map((u) => u.id));
    for (const id of existentes) {
      if (siguen.has(id)) continue;
      db.prepare("UPDATE metas SET unidad_id = NULL WHERE unidad_id = ?").run(id);
      db.prepare("DELETE FROM unidades WHERE id = ?").run(id);
    }
    const actualizar = db.prepare("UPDATE unidades SET numero = ?, titulo = ?, contenidos = ? WHERE id = ?");
    const insertar = db.prepare("INSERT INTO unidades (materia_id, numero, titulo, contenidos) VALUES (?, ?, ?, ?)");
    temario.forEach((u, i) => {
      if (u.id && siguen.has(u.id)) actualizar.run(i + 1, u.titulo, u.contenidos, u.id);
      else insertar.run(materiaId, i + 1, u.titulo, u.contenidos);
    });
  }

  const responderRechazo = (res, error) => {
    if (error instanceof Rechazo) {
      res.status(error.status).json({ error: error.message, ...error.extra });
      return true;
    }
    return false;
  };

  // ── Listado completo ─────────────────────────────────────────────────────
  app.get("/api/gestion-academica/materias", ventanilla((req, res) => {
    const usuario = acceso(req, res);
    if (!usuario) return;
    const inst = usuario.institucionId;
    const materias = db.prepare("SELECT * FROM materias WHERE institucion_id = ? ORDER BY nombre COLLATE NOCASE, COALESCE(anio, 0)").all(inst);
    const profesoresDe = db.prepare(
      `SELECT u.id, u.nombre, u.estado FROM materia_profesores mp JOIN usuarios u ON u.id = mp.profesor_id
        WHERE mp.materia_id = ? ORDER BY u.nombre COLLATE NOCASE`
    );
    const unidadesDe = db.prepare("SELECT id, numero, titulo, contenidos FROM unidades WHERE materia_id = ? ORDER BY numero, id");
    const { anioMin, anioMax } = leerGenoma(db, inst).personalizacion.academico;
    res.json({
      materias: materias.map((m) => ({
        id: String(m.id),
        nombre: m.nombre,
        anio: m.anio ?? null,
        area: m.area ?? null,
        horasSemanales: m.horas_semanales ?? null,
        descripcion: m.descripcion ?? "",
        objetivos: m.objetivos ?? "",
        evaluacion: m.evaluacion ?? "",
        bibliografia: m.bibliografia ?? "",
        temario: unidadesDe.all(m.id).map((u) => ({ id: String(u.id), numero: u.numero, titulo: u.titulo, contenidos: u.contenidos ?? "" })),
        profesores: profesoresDe.all(m.id).map((p) => ({ id: String(p.id), nombre: p.nombre, activo: p.estado === "activo" })),
        cursos: cursosDeMateria.all(m.id).map((c) => ({
          catedraId: String(c.catedra_id), cursoId: String(c.curso_id), curso: nombreCurso(c), anio: c.anio,
          profesorId: String(c.profesor_id), profesor: c.profesor,
        })),
      })),
      profesores: db.prepare("SELECT id, nombre, email FROM usuarios WHERE institucion_id = ? AND rol = 'profesor' AND estado = 'activo' ORDER BY nombre COLLATE NOCASE")
        .all(inst).map((p) => ({ id: String(p.id), nombre: p.nombre, email: p.email })),
      areas: db.prepare("SELECT DISTINCT area FROM materias WHERE institucion_id = ? AND area IS NOT NULL AND area <> '' ORDER BY area COLLATE NOCASE")
        .all(inst).map((f) => f.area),
      anios: { min: anioMin, max: anioMax },
    });
  }));

  // ── Crear ────────────────────────────────────────────────────────────────
  // Solo el nombre es obligatorio: el resto (año, área, programa, profesores y
  // temario) se puede cargar ahora o más adelante.
  app.post("/api/materias", ventanilla((req, res) => {
    const usuario = acceso(req, res);
    if (!usuario) return;
    try {
      const { datos, profesorIds, temario } = leerDatos(req.body, usuario, null);
      if (repetida.get(usuario.institucionId, datos.nombre, datos.anio ?? null, 0)) {
        return res.status(409).json({ error: datos.anio ? `Ya existe ${datos.nombre} de ${datos.anio}° año.` : "Esa materia ya existe en tu escuela." });
      }
      const id = transaccion(() => {
        const columnas = ["institucion_id", ...Object.keys(datos)];
        const info = db.prepare(`INSERT INTO materias (${columnas.join(", ")}) VALUES (${columnas.map(() => "?").join(", ")})`)
          .run(usuario.institucionId, ...Object.values(datos));
        const materia = materiaPropia.get(Number(info.lastInsertRowid), usuario.institucionId);
        if (profesorIds) guardarProfesores(materia, profesorIds, usuario);
        if (temario) guardarTemario(materia.id, temario);
        return materia.id;
      });
      res.status(201).json({ id: String(id), nombre: datos.nombre });
    } catch (error) {
      if (!responderRechazo(res, error)) throw error;
    }
  }));

  // ── Editar ───────────────────────────────────────────────────────────────
  app.put("/api/materias/:id", ventanilla((req, res) => {
    const usuario = acceso(req, res);
    if (!usuario) return;
    const materia = idValido(req.params.id) ? materiaPropia.get(Number(req.params.id), usuario.institucionId) : null;
    if (!materia) return res.status(404).json({ error: "Esa materia no existe en tu escuela." });
    try {
      const { datos, profesorIds, temario } = leerDatos(req.body, usuario, materia);
      const nombre = datos.nombre ?? materia.nombre;
      const anio = "anio" in datos ? datos.anio : materia.anio;
      if (repetida.get(usuario.institucionId, nombre, anio ?? null, materia.id)) {
        return res.status(409).json({ error: anio ? `Ya existe ${nombre} de ${anio}° año.` : "Ya hay otra materia con ese nombre." });
      }
      transaccion(() => {
        const columnas = Object.keys(datos);
        if (columnas.length) {
          db.prepare(`UPDATE materias SET ${columnas.map((c) => `${c} = ?`).join(", ")} WHERE id = ?`).run(...Object.values(datos), materia.id);
        }
        if (profesorIds) guardarProfesores(materia, profesorIds, usuario);
        if (temario) guardarTemario(materia.id, temario);
      });
      res.json({ ok: true });
    } catch (error) {
      if (!responderRechazo(res, error)) throw error;
    }
  }));

  // ── Borrar ───────────────────────────────────────────────────────────────
  // Mientras se dé en algún curso no se borra: ahí cuelgan tareas, clases y
  // avisos de los chicos. Las metas que la nombraban quedan sin materia.
  app.delete("/api/materias/:id", ventanilla((req, res) => {
    const usuario = acceso(req, res);
    if (!usuario) return;
    const materia = idValido(req.params.id) ? materiaPropia.get(Number(req.params.id), usuario.institucionId) : null;
    if (!materia) return res.status(404).json({ error: "Esa materia no existe en tu escuela." });
    const cursos = cursosDeMateria.all(materia.id);
    if (cursos.length) {
      return res.status(409).json({ error: `${nombreDeMateria(materia)} se da en ${cursos.map(nombreCurso).join(", ")}. Quitala de ${cursos.length === 1 ? "ese curso" : "esos cursos"} primero (sección Cursos).` });
    }
    try {
      transaccion(() => {
        db.prepare("DELETE FROM materia_profesores WHERE materia_id = ?").run(materia.id);
        db.prepare("UPDATE metas SET unidad_id = NULL WHERE unidad_id IN (SELECT id FROM unidades WHERE materia_id = ?)").run(materia.id);
        db.prepare("UPDATE metas SET materia_id = NULL WHERE materia_id = ?").run(materia.id);
        db.prepare("DELETE FROM unidades WHERE materia_id = ?").run(materia.id);
        db.prepare("DELETE FROM materias WHERE id = ?").run(materia.id);
      });
    } catch (error) {
      // Algo más la usa (por ejemplo, un recurso de la biblioteca): se avisa en
      // vez de dejarla a medio borrar.
      if (String(error?.message ?? "").includes("FOREIGN KEY")) {
        return res.status(409).json({ error: "Esta materia se usa en otras partes de NEXO (por ejemplo, en la Biblioteca). No se puede borrar." });
      }
      throw error;
    }
    res.json({ ok: true });
  }));
}
