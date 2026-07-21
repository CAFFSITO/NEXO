// ============================================================================
// NEXO — Diario reflexivo del docente (Errores 3.C.3 y 3.C.6)
// ----------------------------------------------------------------------------
// Hasta ahora el diario vivía SOLO en la memoria de la pantalla: al recargar,
// se borraba todo. La tabla `diario_registros` ya estaba en el esquema pero
// nadie la escribía. Acá está su ventanilla, con el MISMO patrón que el resto
// de los módulos de escritura (ver objetivos.js): leer con `exigirAcceso`,
// escribir validando permiso POR FILA en el servidor.
//
//   GET    /api/diario       → mis registros no borrados, más nuevos primero
//   POST   /api/diario       → crear (titulo, contenido, etiquetas)
//   PUT    /api/diario/:id    → editar (setea editado_en); solo el autor
//   DELETE /api/diario/:id    → borrado suave (eliminado_en); solo el autor
//
// La regla de fondo es la regla de oro 4 del plan: que el diario sea de quien
// lo escribió no se decide escondiendo botones, se decide en la cocina. Cada
// escritura comprueba que la fila sea del profesor de la sesión: nadie edita ni
// borra el diario de otro (permiso de fila, en el servidor).
// ============================================================================

import { exigirAcceso, ventanilla } from "./comun.js";

export function registrarDiario(app, db) {
  const registrosDe = db.prepare(
    `SELECT id, titulo, contenido, etiquetas, creado_en, editado_en
       FROM diario_registros
      WHERE profesor_id = ? AND eliminado_en IS NULL
      ORDER BY creado_en DESC, id DESC`
  );

  // El portero de fila: la misma pregunta para editar y para borrar. Devuelve
  // la fila SOLO si es del profesor que pide y todavía no está borrada.
  const registroPropio = db.prepare(
    `SELECT id FROM diario_registros
      WHERE id = ? AND profesor_id = ? AND eliminado_en IS NULL`
  );

  const aRegistro = (fila) => ({
    id: String(fila.id),
    titulo: fila.titulo,
    contenido: fila.contenido,
    etiquetas: fila.etiquetas,
    creadoEn: fila.creado_en,
    editadoEn: fila.editado_en ?? null,
  });

  // El cuerpo de un registro es siempre lo mismo (crear y editar lo comparten):
  // un título y un contenido obligatorios, y etiquetas opcionales. El servidor
  // guarda texto tal cual llega; qué estructura le da la pantalla es cosa suya.
  function leerCuerpo(req) {
    return {
      titulo: String(req.body?.titulo ?? "").trim(),
      contenido: String(req.body?.contenido ?? "").trim(),
      etiquetas: String(req.body?.etiquetas ?? "").trim(),
    };
  }

  function faltante(res, titulo, contenido) {
    if (!titulo) {
      res.status(400).json({ error: "El registro necesita un título." });
      return true;
    }
    if (!contenido) {
      res.status(400).json({ error: "El registro necesita un contenido." });
      return true;
    }
    return false;
  }

  // ── Listar: mis registros ──────────────────────────────────────────────────
  app.get(
    "/api/diario",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "diario-reflexivo-profesor");
      if (!usuario) return;
      res.json({ registros: registrosDe.all(usuario.id).map(aRegistro) });
    })
  );

  // ── Crear ──────────────────────────────────────────────────────────────────
  app.post(
    "/api/diario",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "diario-reflexivo-profesor");
      if (!usuario) return;

      const { titulo, contenido, etiquetas } = leerCuerpo(req);
      if (faltante(res, titulo, contenido)) return;

      const info = db
        .prepare(
          `INSERT INTO diario_registros (profesor_id, titulo, contenido, etiquetas)
           VALUES (?, ?, ?, ?)`
        )
        .run(usuario.id, titulo, contenido, etiquetas);
      res.status(201).json({ id: String(info.lastInsertRowid) });
    })
  );

  // ── Editar (solo el autor) ─────────────────────────────────────────────────
  app.put(
    "/api/diario/:id",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "diario-reflexivo-profesor");
      if (!usuario) return;
      if (!registroPropio.get(Number(req.params.id), usuario.id)) {
        return res.status(404).json({ error: "Ese registro no existe." });
      }

      const { titulo, contenido, etiquetas } = leerCuerpo(req);
      if (faltante(res, titulo, contenido)) return;

      db.prepare(
        `UPDATE diario_registros
            SET titulo = ?, contenido = ?, etiquetas = ?, editado_en = datetime('now')
          WHERE id = ?`
      ).run(titulo, contenido, etiquetas, Number(req.params.id));
      res.json({ ok: true });
    })
  );

  // ── Borrar (suave, solo el autor) ──────────────────────────────────────────
  app.delete(
    "/api/diario/:id",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "diario-reflexivo-profesor");
      if (!usuario) return;
      if (!registroPropio.get(Number(req.params.id), usuario.id)) {
        return res.status(404).json({ error: "Ese registro no existe." });
      }
      db.prepare(
        "UPDATE diario_registros SET eliminado_en = datetime('now') WHERE id = ?"
      ).run(Number(req.params.id));
      res.json({ ok: true });
    })
  );
}
