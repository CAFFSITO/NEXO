// ============================================================================
// NEXO — Ventanilla de Biblioteca (Etapas 2 y 7)
// ----------------------------------------------------------------------------
//   GET  /api/biblioteca/recursos?ambito=institucional|nacional&buscar=...&...
//        → recursos visibles, con búsqueda sin tildes y filtros reales
//   POST /api/biblioteca/recursos            → presentar un recurso (a revisión)
//   GET  /api/biblioteca/cola                → la cola del bibliotecario, por llegada
//   POST /api/biblioteca/cola/:id/decidir    → aprobar (institucional/nacional) o rechazar
//   GET  /api/biblioteca/filtros             → materias y tipos reales, para armar los filtros
//
// El circuito editorial (14.11): cualquiera PRESENTA un recurso, el bibliotecario
// REVISA en orden de llegada y decide si queda institucional o pasa a nacional.
//
// Dos reglas de visibilidad que la pantalla no podía cumplir sola:
//   1. Un recurso en revisión solo lo ve quien lo presentó (Error 2.E.1).
//   2. La Biblioteca Nacional incluye lo institucional aprobado para nacional
//      (Error 2.E.7): una consulta sobre `alcance`, no dos bibliotecas sueltas.
//
// La búsqueda no discrimina tildes (Error 2.E.3): tanto lo escrito como los
// títulos se normalizan (minúsculas y sin acentos) antes de comparar, así
// "biología" = "biologia" = "BIOLOGÍA".
// ============================================================================

import { exigirAcceso, ventanilla } from "./comun.js";

/** El bibliotecario y la dirección ven la cola completa: es su trabajo. */
const VEN_TODA_LA_COLA = ["bibliotecario", "admin-academico"];

/** Minúsculas y sin acentos: la base de la búsqueda tolerante (Error 2.E.3). */
function normalizar(texto) {
  return String(texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // saca las marcas de acento (diacríticos)
}

export function registrarBiblioteca(app, db, notificaciones) {
  // `?3` es el rol de quien pregunta y `?2` su id: juntos deciden si un recurso
  // en revisión se muestra. Un aprobado lo ve todo el mundo.
  const recursosDe = db.prepare(
    `SELECT r.id,
            r.titulo,
            r.descripcion,
            r.tipo,
            r.alcance,
            r.estado,
            r.enlace_url,
            r.tematica_libre,
            r.creado_en,
            r.autor_id,
            r.materia_id,
            r.archivo_id,
            m.nombre     AS materia,
            u.nombre     AS autor,
            u.rol        AS autor_rol,
            u.avatar_url AS autor_avatar,
            a.nombre_original,
            a.tipo_mime,
            a.tamano_bytes,
            i.nombre AS institucion
       FROM recursos r
       JOIN usuarios u      ON u.id = r.autor_id
       LEFT JOIN materias m ON m.id = r.materia_id
       LEFT JOIN archivos a ON a.id = r.archivo_id
       LEFT JOIN instituciones i ON i.id = r.institucion_id
      WHERE r.eliminado_en IS NULL
        AND r.alcance = ?4
        AND (r.institucion_id = ?1 OR r.institucion_id IS NULL)
        AND (
              r.estado = 'aprobado'
              OR (r.estado = 'en-revision' AND (r.autor_id = ?2 OR ?3 = 1))
            )
      ORDER BY r.creado_en DESC`
  );

  /** El peso del archivo, escrito como lo lee una persona. */
  function tamanoLegible(bytes) {
    if (bytes === null || bytes === undefined) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * La etiqueta corta del archivo ("PDF", "DOCX", "LINK"). Sale del tipo real
   * del recurso y del nombre real del archivo, no de un texto escrito al lado.
   */
  function etiquetaDeArchivo(fila) {
    if (fila.tipo === "enlace" || (!fila.nombre_original && fila.enlace_url)) {
      return "LINK";
    }
    if (!fila.nombre_original) return fila.tipo.toUpperCase();
    const punto = fila.nombre_original.lastIndexOf(".");
    return punto === -1
      ? fila.tipo.toUpperCase()
      : fila.nombre_original.slice(punto + 1).toUpperCase();
  }

  app.get(
    "/api/biblioteca/recursos",
    ventanilla((req, res) => {
      const ambito = req.query?.ambito === "nacional" ? "nacional" : "institucional";
      const pagina = ambito === "nacional" ? "biblioteca-nacional" : "biblioteca";

      const usuario = exigirAcceso(db, req, res, pagina);
      if (!usuario) return;

      const veTodaLaCola = VEN_TODA_LA_COLA.includes(usuario.rol) ? 1 : 0;

      // Los filtros llegan como parámetros de la dirección web. Ausente = no
      // filtra por eso. La búsqueda de texto se aplica ya normalizada; los
      // demás filtros comparan contra la columna real (Error 2.E.5).
      const buscar = normalizar(req.query?.buscar ?? "");
      const filtroTipo = String(req.query?.tipo ?? "").trim() || null;
      const filtroMateria = req.query?.materiaId ? Number(req.query.materiaId) : null;
      const filtroAutor = req.query?.autorId ? Number(req.query.autorId) : null;
      const desde = String(req.query?.desde ?? "").trim() || null; // "2026-01-01"
      const hasta = String(req.query?.hasta ?? "").trim() || null;

      const recursos = recursosDe
        .all(usuario.institucionId, usuario.id, veTodaLaCola, ambito)
        .filter((r) => {
          // Búsqueda tolerante a tildes sobre título, descripción y temática.
          if (buscar) {
            const heno = normalizar(`${r.titulo} ${r.descripcion} ${r.tematica_libre ?? ""} ${r.materia ?? ""}`);
            if (!heno.includes(buscar)) return false;
          }
          if (filtroTipo && r.tipo !== filtroTipo) return false;
          if (filtroMateria && r.materia_id !== filtroMateria) return false;
          if (filtroAutor && r.autor_id !== filtroAutor) return false;
          const fecha = (r.creado_en ?? "").slice(0, 10);
          if (desde && fecha < desde) return false;
          if (hasta && fecha > hasta) return false;
          return true;
        })
        .map((fila) => ({
          id: String(fila.id),
          titulo: fila.titulo,
          descripcion: fila.descripcion,
          // La "categoría" de la tarjeta es la materia; si el recurso no
          // pertenece a ninguna (como el apunte de inversiones), es su temática
          // libre. El esquema permite las dos cosas a propósito (Error 9.A.4).
          categoria: fila.materia ?? fila.tematica_libre ?? "General",
          tipo: fila.tipo,
          autor: fila.autor,
          autorRol: fila.autor_rol,
          autorAvatar: fila.autor_avatar ?? undefined,
          etiquetaArchivo: etiquetaDeArchivo(fila),
          tamano: tamanoLegible(fila.tamano_bytes),
          enlaceUrl: fila.enlace_url ?? null,
          // Para que "Descargar" descargue de verdad (Error 2.E.4): la tarjeta
          // arma /api/archivos/:id y el servidor valida el permiso al entregar.
          archivoId: fila.archivo_id ? String(fila.archivo_id) : null,
          // La tarjeta habla de "verificado" y "en revisión"; la base, de
          // "aprobado" y "en-revision". Es la misma cosa con dos nombres, y el
          // nombre bueno es el de la base.
          estado: fila.estado,
          alcance: fila.alcance,
          institucion: fila.institucion ?? null,
          creadoEn: fila.creado_en,
          // Por id y no por nombre: dos personas pueden llamarse igual, y el
          // nombre no es lo que identifica a nadie.
          esMio: fila.autor_id === usuario.id,
        }));

      res.json({ ambito, recursos });
    })
  );

  // ── Filtros disponibles (materias y tipos reales) ─────────────────────────
  // La pantalla arma los desplegables de filtro con ESTO, no con listas fijas.
  const materiasDe = db.prepare(
    "SELECT id, nombre FROM materias WHERE institucion_id = ? ORDER BY nombre"
  );
  app.get(
    "/api/biblioteca/filtros",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "biblioteca");
      if (!usuario) return;
      res.json({
        materias: materiasDe.all(usuario.institucionId).map((m) => ({
          id: m.id,
          nombre: m.nombre,
        })),
        tipos: ["documento", "guia", "video", "enlace", "libro"],
      });
    })
  );

  // ── Presentar un recurso (Error 2.E.2) ────────────────────────────────────
  // Un solo botón (Error 2.E.6): abre el formulario, y al enviarlo se crea el
  // recurso "en revisión" y su fila en la cola. El destino final (institucional
  // o nacional) lo decide el bibliotecario al aprobar, no quien presenta.
  const insertarRecurso = db.prepare(
    `INSERT INTO recursos
       (institucion_id, autor_id, titulo, descripcion, materia_id, tematica_libre,
        tipo, archivo_id, enlace_url, alcance, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'institucional', 'en-revision')`
  );
  const insertarCola = db.prepare(
    `INSERT INTO cola_revision (recurso_id, presentado_por)
     VALUES (?, ?)`
  );
  const materiaEnInstitucion = db.prepare(
    "SELECT 1 FROM materias WHERE id = ? AND institucion_id = ?"
  );
  const archivoPropio = db.prepare(
    "SELECT id FROM archivos WHERE id = ? AND subido_por = ?"
  );
  const bibliotecariosDe = db.prepare(
    "SELECT id FROM usuarios WHERE rol = 'bibliotecario' AND institucion_id = ? AND estado = 'activo'"
  );

  app.post(
    "/api/biblioteca/recursos",
    ventanilla((req, res) => {
      // Cualquiera que pueda entrar a la biblioteca puede presentar (14.11).
      const usuario = exigirAcceso(db, req, res, "biblioteca");
      if (!usuario) return;

      const titulo = String(req.body?.titulo ?? "").trim();
      const descripcion = String(req.body?.descripcion ?? "").trim();
      if (!titulo) return res.status(400).json({ error: "El recurso necesita un título." });

      const TIPOS = ["documento", "guia", "video", "enlace", "libro"];
      const tipo = TIPOS.includes(String(req.body?.tipo)) ? String(req.body.tipo) : "documento";

      // Materia opcional (Error 9.A.4): un recurso puede no pertenecer a ninguna
      // y traer en cambio una temática libre ("inversiones").
      let materiaId = null;
      if (req.body?.materiaId) {
        materiaId = Number(req.body.materiaId);
        if (!Number.isInteger(materiaId) || !materiaEnInstitucion.get(materiaId, usuario.institucionId)) {
          return res.status(400).json({ error: "Esa materia no existe." });
        }
      }
      const tematicaLibre = String(req.body?.tematicaLibre ?? "").trim() || null;

      // Un recurso es un archivo o un enlace; al menos uno.
      let archivoId = null;
      if (req.body?.archivoId) {
        archivoId = Number(req.body.archivoId);
        if (!Number.isInteger(archivoId) || !archivoPropio.get(archivoId, usuario.id)) {
          return res.status(400).json({ error: "Ese archivo no es válido." });
        }
      }
      const enlaceUrl = String(req.body?.enlaceUrl ?? "").trim() || null;
      if (!archivoId && !enlaceUrl) {
        return res.status(400).json({ error: "Adjuntá un archivo o pegá un enlace." });
      }

      const info = insertarRecurso.run(
        usuario.institucionId, usuario.id, titulo, descripcion,
        materiaId, tematicaLibre, tipo, archivoId, enlaceUrl
      );
      insertarCola.run(info.lastInsertRowid, usuario.id);

      // Aviso a los bibliotecarios: entró algo nuevo para revisar.
      for (const b of bibliotecariosDe.all(usuario.institucionId)) {
        notificaciones.crear({
          usuarioId: b.id,
          tipo: "recurso",
          titulo: "Nuevo recurso para revisar",
          cuerpo: `${titulo} — presentado por ${usuario.nombre}.`,
          objetoTipo: "recurso",
          objetoId: Number(info.lastInsertRowid),
        });
      }

      res.status(201).json({ id: String(info.lastInsertRowid) });
    })
  );

  // ── La cola de revisión, por orden de llegada (Errores 9.A.1, 9.A.2) ──────
  // El más viejo primero: primero en entrar, primero en revisarse. Solo lo
  // pendiente. Alcance por institución del recurso.
  const colaDe = db.prepare(
    `SELECT cr.id, cr.recurso_id, cr.presentado_en,
            r.titulo, r.descripcion, r.tipo, r.tematica_libre,
            r.enlace_url, r.archivo_id,
            m.nombre AS materia,
            u.nombre AS presentado_por_nombre,
            u.rol    AS presentado_por_rol,
            a.nombre_original, a.tamano_bytes
       FROM cola_revision cr
       JOIN recursos r ON r.id = cr.recurso_id
       JOIN usuarios u ON u.id = cr.presentado_por
       LEFT JOIN materias m ON m.id = r.materia_id
       LEFT JOIN archivos a ON a.id = r.archivo_id
      WHERE cr.estado = 'pendiente'
        AND (r.institucion_id = ?1 OR r.institucion_id IS NULL)
      ORDER BY cr.presentado_en ASC, cr.id ASC`
  );
  const contarPorEstado = db.prepare(
    `SELECT cr.estado, COUNT(*) AS n
       FROM cola_revision cr JOIN recursos r ON r.id = cr.recurso_id
      WHERE (r.institucion_id = ?1 OR r.institucion_id IS NULL)
      GROUP BY cr.estado`
  );

  app.get(
    "/api/biblioteca/cola",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "panel-bibliotecario");
      if (!usuario) return;

      const pendientes = colaDe.all(usuario.institucionId).map((c) => ({
        id: String(c.id),
        recursoId: String(c.recurso_id),
        titulo: c.titulo,
        descripcion: c.descripcion,
        tipo: c.tipo,
        categoria: c.materia ?? c.tematica_libre ?? "General",
        presentadoPor: c.presentado_por_nombre,
        presentadoPorRol: c.presentado_por_rol,
        presentadoEn: c.presentado_en,
        enlaceUrl: c.enlace_url ?? null,
        archivo: c.nombre_original ?? null,
      }));

      // Estadísticas del panel (14.11 paso 5): totales por estado, de datos reales.
      const conteo = { pendiente: 0, aprobado: 0, rechazado: 0 };
      for (const fila of contarPorEstado.all(usuario.institucionId)) {
        conteo[fila.estado] = fila.n;
      }

      res.json({ pendientes, conteo });
    })
  );

  // ── Decidir sobre un elemento de la cola (Errores 9.A.2, 9.B.1) ───────────
  // Aprobar como institucional, aprobar como nacional (camino del Error 2.E.7)
  // o rechazar con motivo. Queda registrado quién y cuándo, y se avisa a quien
  // lo presentó (14.11 paso 3).
  const colaPorId = db.prepare(
    `SELECT cr.*, r.institucion_id, r.titulo
       FROM cola_revision cr JOIN recursos r ON r.id = cr.recurso_id
      WHERE cr.id = ?`
  );
  const resolverCola = db.prepare(
    `UPDATE cola_revision
        SET estado = ?, destino = ?, motivo_rechazo = ?,
            decidido_por = ?, decidido_en = datetime('now')
      WHERE id = ?`
  );
  const aprobarRecurso = db.prepare(
    "UPDATE recursos SET estado = 'aprobado', alcance = ? WHERE id = ?"
  );
  const rechazarRecurso = db.prepare(
    "UPDATE recursos SET estado = 'rechazado' WHERE id = ?"
  );

  app.post(
    "/api/biblioteca/cola/:id/decidir",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "panel-bibliotecario");
      if (!usuario) return;

      const id = Number(req.params.id);
      const item = Number.isInteger(id) ? colaPorId.get(id) : null;
      if (!item) return res.status(404).json({ error: "Ese elemento no está en la cola." });
      // Solo la cola de la propia institución (o recursos nacionales sin dueño).
      if (item.institucion_id !== null && item.institucion_id !== usuario.institucionId) {
        return res.status(403).json({ error: "Esa cola no es de tu institución." });
      }
      if (item.estado !== "pendiente") {
        return res.status(409).json({ error: "Ese recurso ya fue revisado." });
      }

      const decision = String(req.body?.decision ?? "");

      if (decision === "aprobar") {
        const destino = req.body?.destino === "nacional" ? "nacional" : "institucional";
        resolverCola.run("aprobado", destino, null, usuario.id, id);
        aprobarRecurso.run(destino, item.recurso_id);
        notificaciones.crear({
          usuarioId: item.presentado_por,
          tipo: "recurso",
          titulo: "Tu recurso fue aprobado",
          cuerpo: destino === "nacional"
            ? `"${item.titulo}" ahora está en la Biblioteca Nacional.`
            : `"${item.titulo}" ya está en la biblioteca institucional.`,
          objetoTipo: "recurso",
          objetoId: item.recurso_id,
        });
        return res.json({ ok: true, estado: "aprobado", destino });
      }

      if (decision === "rechazar") {
        const motivo = String(req.body?.motivo ?? "").trim();
        if (!motivo) return res.status(400).json({ error: "El rechazo necesita un motivo." });
        resolverCola.run("rechazado", null, motivo, usuario.id, id);
        rechazarRecurso.run(item.recurso_id);
        notificaciones.crear({
          usuarioId: item.presentado_por,
          tipo: "recurso",
          titulo: "Tu recurso fue rechazado",
          cuerpo: `"${item.titulo}": ${motivo}`,
          objetoTipo: "recurso",
          objetoId: item.recurso_id,
        });
        return res.json({ ok: true, estado: "rechazado" });
      }

      res.status(400).json({ error: "Decisión desconocida: usá 'aprobar' o 'rechazar'." });
    })
  );
}
