// ============================================================================
// NEXO — Quejas anónimas y su estadística (Etapa 7, sección 14.14)
// ----------------------------------------------------------------------------
//   POST /api/quejas             → enviar una queja anónima (estudiante)
//   GET  /api/quejas             → leerlas (Centro de Estudiantes / dirección)
//   POST /api/quejas/:id/vista   → marcar una como vista
//
// El anonimato es ESTRUCTURAL, no una promesa: la tabla `quejas` no tiene
// columna de autor (Error 8.B.1). Ni mirando la base se puede saber quién
// escribió una queja: acá, al insertarla, tampoco se guarda nada que lo delate.
//
// Las no vistas van arriba de todo (Error 8.B.5) y hay una estadística de
// evolución mes contra mes con su desglose por categoría (Error 8.B.4).
// ============================================================================

import { exigirAcceso, ventanilla } from "./comun.js";

export function registrarQuejas(app, db, notificaciones) {
  // ── Enviar (estudiante) ───────────────────────────────────────────────────
  const insertar = db.prepare(
    `INSERT INTO quejas (institucion_id, categoria, contenido)
     VALUES (?, ?, ?)`
  );
  // A quién le llega: al Centro de Estudiantes y a la dirección de la
  // institución. Es un aviso sin autor: la notificación tampoco lo revela.
  const destinatariosDe = db.prepare(
    `SELECT id FROM usuarios
      WHERE institucion_id = ? AND estado = 'activo'
        AND rol IN ('centro-estudiantes', 'admin-academico')`
  );

  app.post(
    "/api/quejas",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "enviar-queja");
      if (!usuario) return;

      const contenido = String(req.body?.contenido ?? "").trim();
      if (!contenido) return res.status(400).json({ error: "La queja está vacía." });
      const categoria = String(req.body?.categoria ?? "").trim() || "general";

      // Se guarda SIN usuario.id: la queja no lleva rastro de quién la mandó.
      insertar.run(usuario.institucionId, categoria, contenido);

      // El aviso llega, pero no dice quién: "hay una queja nueva", nada más.
      for (const d of destinatariosDe.all(usuario.institucionId)) {
        notificaciones.crear({
          usuarioId: d.id,
          tipo: "queja",
          titulo: "Queja anónima nueva",
          cuerpo: categoria !== "general" ? `Categoría: ${categoria}.` : "",
          objetoTipo: "queja",
          objetoId: null,
        });
      }

      res.status(201).json({ ok: true });
    })
  );

  // ── Leer (Centro de Estudiantes / dirección) ──────────────────────────────
  // Las no vistas primero (Error 8.B.5); dentro de cada grupo, las más
  // recientes arriba.
  const todas = db.prepare(
    `SELECT id, categoria, contenido, creado_en, vista_en, estado
       FROM quejas
      WHERE institucion_id = ?
      ORDER BY (vista_en IS NOT NULL), creado_en DESC, id DESC`
  );
  // Estadística de evolución (Error 8.B.4): cuántas este mes y el anterior.
  const cuantasEnMes = db.prepare(
    `SELECT COUNT(*) AS n FROM quejas
      WHERE institucion_id = ? AND strftime('%Y-%m', creado_en) = ?`
  );
  const porCategoriaEsteMes = db.prepare(
    `SELECT categoria, COUNT(*) AS n FROM quejas
      WHERE institucion_id = ? AND strftime('%Y-%m', creado_en) = ?
      GROUP BY categoria ORDER BY n DESC`
  );
  const mesActual = db.prepare("SELECT strftime('%Y-%m', 'now') AS m");
  const mesPrevio = db.prepare("SELECT strftime('%Y-%m', 'now', '-1 month') AS m");

  app.get(
    "/api/quejas",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "gestion-quejas");
      if (!usuario) return;

      const quejas = todas.all(usuario.institucionId).map((q) => ({
        id: String(q.id),
        categoria: q.categoria,
        contenido: q.contenido,
        creadoEn: q.creado_en,
        estado: q.estado,
        vista: q.vista_en !== null,
      }));

      const esteMes = mesActual.get().m;
      const anterior = mesPrevio.get().m;
      const nEste = cuantasEnMes.get(usuario.institucionId, esteMes).n;
      const nPrevio = cuantasEnMes.get(usuario.institucionId, anterior).n;

      // Variación porcentual mes contra mes. Sin mes anterior no hay con qué
      // comparar: se informa null y la pantalla muestra "sin dato previo" en
      // vez de un 100% inventado.
      let variacion = null;
      if (nPrevio > 0) {
        variacion = Math.round(((nEste - nPrevio) / nPrevio) * 100);
      } else if (nEste > 0) {
        variacion = 100;
      }

      res.json({
        quejas,
        noVistas: quejas.filter((q) => !q.vista).length,
        estadistica: {
          esteMes: nEste,
          mesAnterior: nPrevio,
          variacionPorcentual: variacion,
          porCategoria: porCategoriaEsteMes.all(usuario.institucionId, esteMes),
        },
      });
    })
  );

  // ── Marcar como vista ─────────────────────────────────────────────────────
  // Abrir una queja registra quién y cuándo la vio (14.14). Eso NO rompe el
  // anonimato: guarda quién la LEYÓ, no quién la escribió.
  const marcarVista = db.prepare(
    `UPDATE quejas
        SET vista_en = COALESCE(vista_en, datetime('now')),
            vista_por = COALESCE(vista_por, ?),
            estado = CASE WHEN estado = 'nueva' THEN 'en-tratamiento' ELSE estado END
      WHERE id = ? AND institucion_id = ?`
  );
  const existeQueja = db.prepare(
    "SELECT 1 FROM quejas WHERE id = ? AND institucion_id = ?"
  );

  app.post(
    "/api/quejas/:id/vista",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "gestion-quejas");
      if (!usuario) return;

      const id = Number(req.params.id);
      if (!Number.isInteger(id) || !existeQueja.get(id, usuario.institucionId)) {
        return res.status(404).json({ error: "Esa queja no existe." });
      }
      marcarVista.run(usuario.id, id, usuario.institucionId);
      res.json({ ok: true });
    })
  );
}
