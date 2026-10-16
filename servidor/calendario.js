// ============================================================================
// NEXO — Ventanillas de Calendario y Comunicados (Etapas 2 y 7)
// ----------------------------------------------------------------------------
// El CALENDARIO con jerarquía (eventos, repeticiones, destinos por nivel,
// confirmaciones, recordatorios) vive en eventos.js y su motor en agenda.js;
// acá se lo registra junto con los COMUNICADOS a familias:
//
//   GET    /api/comunicados                → los comunicados que me tocan (familia)
//   GET    /api/comunicados/enviados       → los que emití, con lectura confirmada
//   POST   /api/comunicados                → emitir un comunicado (preceptor/dirección)
//   POST   /api/comunicados/:id/leer       → registrar que lo leí
//   POST   /api/comunicados/:id/responder  → abrir/retomar el chat privado con el emisor
//   POST   /api/comunicados/:id/fijar       → la dirección lo fija arriba (Prompt 13)
//   POST   /api/comunicados/:id/desfijar    → la dirección lo desfija
// ============================================================================

import {
  exigirAcceso,
  exigirSesion,
  ventanilla,
  normalizarPublicarEn,
  publicarEnISO,
} from "./comun.js";
import { asegurarConversacionDirecta } from "./chat.js";
import { registrarEventos } from "./eventos.js";

export { limpiarEventosViejos, programarLimpiezaEventos } from "./eventos.js";

/**
 * Registra el calendario y los comunicados. Devuelve el motor de recordatorios
 * del calendario (servidor.js lo programa al arrancar).
 */
export function registrarCalendario(app, db, notificaciones) {
  const motorRecordatorios = registrarEventos(app, db, notificaciones);

  // ── Comunicados: lectura (familia) ────────────────────────────────────────
  // Le llegan a una familia si son para toda la institución (curso_id NULL) o
  // para el curso de alguno de sus hijos. "Leído" no es una marca en el
  // comunicado sino una fila en `comunicado_lecturas` por persona: el mismo
  // comunicado puede estar leído por una familia y no por otra.
  // Un comunicado PROGRAMADO (publicar_en futuro) no le llega a la familia hasta
  // su hora (Prompt 13); su emisor sí lo ve, pero eso es la ventanilla de
  // "enviados". Uno FIJADO por la dirección va arriba de todo (fijado_en real).
  const misComunicados = db.prepare(
    `SELECT c.id, c.titulo, c.contenido, c.enviado_en, c.emisor_id,
            u.nombre AS emisor,
            u.rol    AS emisor_rol,
            cu.anio, cu.division,
            c.archivo_id,
            c.fijado_en,
            a.nombre_original AS archivo,
            l.leido_en
       FROM comunicados c
       JOIN usuarios u       ON u.id = c.emisor_id
       LEFT JOIN cursos cu   ON cu.id = c.curso_id
       LEFT JOIN archivos a  ON a.id = c.archivo_id
       LEFT JOIN comunicado_lecturas l
              ON l.comunicado_id = c.id AND l.usuario_id = ?2
      WHERE c.institucion_id = ?1
        AND (c.publicar_en IS NULL OR c.publicar_en <= datetime('now') OR c.emisor_id = ?2)
        AND (
          c.curso_id IS NULL
          OR EXISTS (SELECT 1 FROM familiares f
                       JOIN inscripciones i ON i.estudiante_id = f.estudiante_id
                      WHERE f.usuario_familia_id = ?2 AND i.curso_id = c.curso_id)
        )
      ORDER BY (c.fijado_en IS NOT NULL) DESC, c.enviado_en DESC`
  );

  app.get(
    "/api/comunicados",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "familia-comunicados");
      if (!usuario) return;

      const comunicados = misComunicados
        .all(usuario.institucionId, usuario.id)
        .map((fila) => ({
          id: String(fila.id),
          titulo: fila.titulo,
          contenido: fila.contenido,
          emisor: fila.emisor,
          emisorId: fila.emisor_id,
          emisorRol: fila.emisor_rol,
          destino: fila.anio ? `${fila.anio}° ${fila.division}` : "Toda la institución",
          archivo: fila.archivo ?? null,
          // Para descargar el adjunto vía /api/archivos/:id (el permiso lo
          // valida el servidor al entregar).
          archivoId: fila.archivo_id ? String(fila.archivo_id) : null,
          enviadoEn: fila.enviado_en,
          leido: fila.leido_en !== null,
          // El pin de la tarjeta sale del dato real (fijado_en), no de decoración.
          fijado: fila.fijado_en !== null,
        }));

      res.json({
        comunicados,
        // El globito de "no leídos" del menú (Error 10.A.3) es esto: los que
        // no tienen fila de lectura. Se cuenta acá para que la pantalla no
        // tenga que volver a definir qué significa "no leído".
        noLeidos: comunicados.filter((c) => !c.leido).length,
      });
    })
  );

  // ── Comunicados: escritura (Etapa 7) ──────────────────────────────────────
  const insertarComunicado = db.prepare(
    `INSERT INTO comunicados (institucion_id, emisor_id, curso_id, titulo, contenido, archivo_id, publicar_en)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const cursoPropioDelPreceptor = db.prepare(
    "SELECT 1 FROM cursos WHERE id = ? AND preceptor_id = ?"
  );
  const cursoEnInstitucion = db.prepare(
    "SELECT 1 FROM cursos WHERE id = ? AND institucion_id = ?"
  );
  const archivoPropio = db.prepare(
    "SELECT id FROM archivos WHERE id = ? AND subido_por = ?"
  );
  // Las familias destinatarias de un comunicado: las de un curso, o todas las de
  // la institución si el comunicado no tiene curso. Se usa para avisarles.
  const familiasDeCurso = db.prepare(
    `SELECT DISTINCT f.usuario_familia_id AS id
       FROM familiares f
       JOIN inscripciones i ON i.estudiante_id = f.estudiante_id
      WHERE i.curso_id = ?`
  );
  const familiasDeInstitucion = db.prepare(
    "SELECT id FROM usuarios WHERE rol = 'familia' AND institucion_id = ?"
  );

  app.post(
    "/api/comunicados",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "comunicados-emitir");
      if (!usuario) return;

      const titulo = String(req.body?.titulo ?? "").trim();
      const contenido = String(req.body?.contenido ?? "").trim();
      if (!titulo || !contenido) {
        return res.status(400).json({ error: "Falta el título o el contenido." });
      }

      // Fecha de publicación opcional (Prompt 13), misma regla que la comunidad.
      const publicarEn = normalizarPublicarEn(req.body?.publicarEn);
      if (publicarEn === undefined) {
        return res.status(400).json({ error: "La fecha de publicación no es válida." });
      }

      // A quién va: un curso (cursoId) o toda la institución (cursoId null).
      let cursoId = null;
      const cursoBruto = req.body?.cursoId;
      if (cursoBruto !== undefined && cursoBruto !== null && cursoBruto !== "") {
        cursoId = Number(cursoBruto);
        if (!Number.isInteger(cursoId) || !cursoEnInstitucion.get(cursoId, usuario.institucionId)) {
          return res.status(400).json({ error: "Ese curso no existe." });
        }
      }

      // Permiso fino: el preceptor solo puede escribirle a SU curso, y no puede
      // mandar a toda la institución. La dirección, a cualquiera.
      if (usuario.rol === "preceptor") {
        if (cursoId === null) {
          return res.status(403).json({ error: "El preceptor comunica a su curso, no a toda la institución." });
        }
        if (!cursoPropioDelPreceptor.get(cursoId, usuario.id)) {
          return res.status(403).json({ error: "Ese curso no está a tu cargo." });
        }
      }

      // Adjunto opcional: tiene que ser un archivo que subió esta persona.
      let archivoId = null;
      const archivoBruto = req.body?.archivoId;
      if (archivoBruto !== undefined && archivoBruto !== null && archivoBruto !== "") {
        archivoId = Number(archivoBruto);
        if (!Number.isInteger(archivoId) || !archivoPropio.get(archivoId, usuario.id)) {
          return res.status(400).json({ error: "Ese adjunto no es válido." });
        }
      }

      const info = insertarComunicado.run(
        usuario.institucionId, usuario.id, cursoId, titulo, contenido, archivoId, publicarEn
      );

      // Aviso a cada familia destinataria: el globito y la notificación (14.15).
      // Si el comunicado quedó PROGRAMADO a futuro no se avisa todavía: no tendría
      // sentido notificar algo que la familia aún no puede abrir. (Se publica en
      // su hora; disparar el aviso diferido excede este prompt.)
      if (publicarEn === null) {
        const destinatarias = cursoId === null
          ? familiasDeInstitucion.all(usuario.institucionId)
          : familiasDeCurso.all(cursoId);
        for (const fam of destinatarias) {
          notificaciones.crear({
            usuarioId: fam.id,
            tipo: "comunicado",
            titulo: "Comunicado nuevo",
            cuerpo: titulo,
            objetoTipo: "comunicado",
            objetoId: Number(info.lastInsertRowid),
          });
        }
      }

      res.status(201).json({ id: String(info.lastInsertRowid) });
    })
  );

  // Los comunicados que emití, con cuántas familias los leyeron: la
  // "confirmación de lectura" del 14.13, vista desde quien los mandó.
  const misEnviados = db.prepare(
    `SELECT c.id, c.titulo, c.contenido, c.enviado_en,
            cu.anio, cu.division,
            c.fijado_en, c.publicar_en,
            (c.publicar_en IS NOT NULL AND c.publicar_en > datetime('now')) AS programada,
            (SELECT COUNT(*) FROM comunicado_lecturas l WHERE l.comunicado_id = c.id) AS leidos
       FROM comunicados c
       LEFT JOIN cursos cu ON cu.id = c.curso_id
      WHERE c.emisor_id = ?
      ORDER BY (c.fijado_en IS NOT NULL) DESC, c.enviado_en DESC`
  );
  const alcanzadasDeCurso = db.prepare(
    `SELECT COUNT(DISTINCT f.usuario_familia_id) AS n
       FROM familiares f JOIN inscripciones i ON i.estudiante_id = f.estudiante_id
      WHERE i.curso_id = ?`
  );
  const totalFamilias = db.prepare(
    "SELECT COUNT(*) AS n FROM usuarios WHERE rol = 'familia' AND institucion_id = ?"
  );

  app.get(
    "/api/comunicados/enviados",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "comunicados-emitir");
      if (!usuario) return;

      const comunicados = misEnviados.all(usuario.id).map((c) => ({
        id: String(c.id),
        titulo: c.titulo,
        contenido: c.contenido,
        enviadoEn: c.enviado_en,
        destino: c.anio ? `${c.anio}° ${c.division}` : "Toda la institución",
        leidos: c.leidos,
        // Cuántas familias son destinatarias, para leer "3 de 5 leyeron".
        destinatarios: c.anio
          ? alcanzadasDeCurso.get(cursoIdDeComunicado(db, c.id)).n
          : totalFamilias.get(usuario.institucionId).n,
        // Estado real (Prompt 13): fijado por la dirección y/o programado a futuro.
        fijado: c.fijado_en !== null,
        programada: c.programada === 1,
        publicarEn: publicarEnISO(c.publicar_en),
      }));

      res.json({ comunicados });
    })
  );

  // ── Fijar / desfijar un comunicado (Prompt 13) ────────────────────────────
  // SOLO la dirección (admin-academico) de la MISMA institución, no el conjunto
  // que puede EMITIR (que incluye al preceptor). Por eso el permiso se chequea a
  // mano acá y no con la página "comunicados-emitir". Pedirlo sin ser dirección
  // da 403; el pin de la tarjeta de la familia sale de fijado_en, no de adorno.
  const comunicadoInstitucion = db.prepare(
    "SELECT institucion_id FROM comunicados WHERE id = ?"
  );
  function fijarComunicado(fijar) {
    return ventanilla((req, res) => {
      const usuario = exigirSesion(db, req, res);
      if (!usuario) return;
      if (usuario.rol !== "admin-academico") {
        return res.status(403).json({ error: "Solo la dirección puede fijar comunicados." });
      }
      const id = Number(req.params.id);
      const c = Number.isInteger(id) ? comunicadoInstitucion.get(id) : null;
      if (!c || c.institucion_id !== usuario.institucionId) {
        return res.status(404).json({ error: "Ese comunicado no existe." });
      }
      if (fijar) {
        db.prepare(
          "UPDATE comunicados SET fijado_en = datetime('now'), fijado_por_id = ? WHERE id = ?"
        ).run(usuario.id, id);
      } else {
        db.prepare(
          "UPDATE comunicados SET fijado_en = NULL, fijado_por_id = NULL WHERE id = ?"
        ).run(id);
      }
      res.json({ ok: true });
    });
  }

  app.post("/api/comunicados/:id/fijar", fijarComunicado(true));
  app.post("/api/comunicados/:id/desfijar", fijarComunicado(false));

  // Registrar que leí un comunicado (Error 10.A.3: abrir su detalle lo marca).
  const comunicadoPorId = db.prepare(
    "SELECT * FROM comunicados WHERE id = ? AND institucion_id = ?"
  );
  const registrarLectura = db.prepare(
    `INSERT OR IGNORE INTO comunicado_lecturas (comunicado_id, usuario_id)
     VALUES (?, ?)`
  );

  app.post(
    "/api/comunicados/:id/leer",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "familia-comunicados");
      if (!usuario) return;

      const id = Number(req.params.id);
      const com = Number.isInteger(id) ? comunicadoPorId.get(id, usuario.institucionId) : null;
      if (!com || !familiaRecibe(db, usuario.id, com)) {
        return res.status(404).json({ error: "Ese comunicado no existe." });
      }
      registrarLectura.run(id, usuario.id);
      res.json({ ok: true });
    })
  );

  // "Responder" NO escribe en el comunicado (lo verían todas las familias):
  // abre o retoma la conversación privada con el emisor (Error 10.A.2). Además
  // marca el comunicado como leído, porque responder implica haberlo abierto.
  app.post(
    "/api/comunicados/:id/responder",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "familia-comunicados");
      if (!usuario) return;

      const id = Number(req.params.id);
      const com = Number.isInteger(id) ? comunicadoPorId.get(id, usuario.institucionId) : null;
      if (!com || !familiaRecibe(db, usuario.id, com)) {
        return res.status(404).json({ error: "Ese comunicado no existe." });
      }

      registrarLectura.run(id, usuario.id);
      const conversacionId = asegurarConversacionDirecta(db, usuario.id, com.emisor_id);
      res.json({ conversacionId: String(conversacionId) });
    })
  );

  return motorRecordatorios;
}

// ── Ayudas de comunicados ────────────────────────────────────────────────────

/** ¿Le llega este comunicado a esta familia? (institución entera o su curso.) */
function familiaRecibe(db, familiaId, comunicado) {
  if (comunicado.curso_id === null) return true;
  return (
    db
      .prepare(
        `SELECT 1 FROM familiares f
           JOIN inscripciones i ON i.estudiante_id = f.estudiante_id
          WHERE f.usuario_familia_id = ? AND i.curso_id = ?`
      )
      .get(familiaId, comunicado.curso_id) !== undefined
  );
}

function cursoIdDeComunicado(db, comunicadoId) {
  return db.prepare("SELECT curso_id FROM comunicados WHERE id = ?").get(comunicadoId).curso_id;
}
