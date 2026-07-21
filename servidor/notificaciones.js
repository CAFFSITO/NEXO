// ============================================================================
// NEXO — Notificaciones (servicio transversal, Etapa 6, sección 14.15, Error 9.D.1)
// ----------------------------------------------------------------------------
// UNA sola pieza que todos los módulos usan para avisar. Cuando pasa algo que le
// importa a alguien —un mensaje nuevo, una corrección, un comunicado, un recurso
// aprobado— el módulo correspondiente llama a `crear(...)` y esto se ocupa de:
//   1. guardar la fila en `notificaciones` (así el aviso sobrevive aunque la
//      persona esté desconectada: lo verá al entrar),
//   2. empujarla en vivo por el mensajero si la persona está conectada.
//
// Los demás módulos NO escriben en `notificaciones` a mano: piden acá. Así el
// aviso en vivo y el globito salen siempre iguales, desde un solo lugar
// (principio de fuente única, sección 1.4).
//
// Las ventanillas de lectura (la campana y su lista):
//   GET  /api/notificaciones          → mis notificaciones (no leídas primero)
//   GET  /api/notificaciones/resumen  → cuántas sin leer, para la campana y los
//                                        globitos del menú (notificaciones + chat)
//   POST /api/notificaciones/:id/leer → marcar una como leída (al tocarla)
//   POST /api/notificaciones/leer-todas → marcar todas como leídas
//
// El Error 9.D.1 ("Notificaciones no lleva a ninguna pantalla") se resuelve con
// esto más la pantalla real del frontend: la sección deja de ser un cartel.
// ============================================================================

import { exigirSesion, ventanilla } from "./comun.js";

/**
 * Crea el servicio de notificaciones. Necesita el mensajero para el aviso en
 * vivo. Devuelve `crear`, que es lo que llaman los otros módulos.
 */
export function crearNotificaciones(db, mensajero) {
  const insertar = db.prepare(
    `INSERT INTO notificaciones (usuario_id, tipo, titulo, cuerpo, objeto_tipo, objeto_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  /**
   * Avisar a una persona. `objetoTipo`/`objetoId` dicen a dónde navegar cuando
   * toque la notificación (por ejemplo objetoTipo "conversacion", objetoId 4).
   */
  function crear({ usuarioId, tipo, titulo, cuerpo = "", objetoTipo = null, objetoId = null }) {
    const info = insertar.run(usuarioId, tipo, titulo, cuerpo, objetoTipo, objetoId);
    mensajero.emitirA(usuarioId, {
      tipo: "notificacion",
      notificacion: {
        id: String(info.lastInsertRowid),
        tipoNotif: tipo,
        titulo,
        cuerpo,
        objetoTipo,
        objetoId,
      },
    });
    return info.lastInsertRowid;
  }

  return { crear };
}

export function registrarNotificaciones(app, db) {
  const mias = db.prepare(
    `SELECT id, tipo, titulo, cuerpo, objeto_tipo, objeto_id, creado_en, leida_en
       FROM notificaciones
      WHERE usuario_id = ?
      ORDER BY (leida_en IS NOT NULL), creado_en DESC, id DESC
      LIMIT 100`
  );

  // Cuántas notificaciones sin leer (la campana).
  const notifSinLeer = db.prepare(
    "SELECT COUNT(*) AS n FROM notificaciones WHERE usuario_id = ? AND leida_en IS NULL"
  );

  // Cuántos mensajes de chat sin leer (el globito del ítem Chat del menú). Sale
  // de la MISMA vista que usa el chat, así el número no puede contradecirse.
  const chatSinLeer = db.prepare(
    "SELECT COALESCE(SUM(no_leidos), 0) AS n FROM v_no_leidos WHERE usuario_id = ?"
  );

  const unaMia = db.prepare(
    "SELECT id FROM notificaciones WHERE id = ? AND usuario_id = ?"
  );
  const marcarLeida = db.prepare(
    "UPDATE notificaciones SET leida_en = datetime('now') WHERE id = ? AND leida_en IS NULL"
  );
  const marcarTodas = db.prepare(
    "UPDATE notificaciones SET leida_en = datetime('now') WHERE usuario_id = ? AND leida_en IS NULL"
  );

  // ── La lista (la pantalla de Notificaciones) ────────────────────────────────
  app.get(
    "/api/notificaciones",
    ventanilla((req, res) => {
      const usuario = exigirSesion(db, req, res);
      if (!usuario) return;

      const notificaciones = mias.all(usuario.id).map((f) => ({
        id: String(f.id),
        tipo: f.tipo,
        titulo: f.titulo,
        cuerpo: f.cuerpo,
        objetoTipo: f.objeto_tipo,
        objetoId: f.objeto_id,
        creadoEn: f.creado_en,
        leida: f.leida_en !== null,
      }));

      res.json({ notificaciones });
    })
  );

  // ── El resumen (la campana y los globitos) ──────────────────────────────────
  app.get(
    "/api/notificaciones/resumen",
    ventanilla((req, res) => {
      const usuario = exigirSesion(db, req, res);
      if (!usuario) return;

      res.json({
        notificaciones: notifSinLeer.get(usuario.id).n,
        chat: chatSinLeer.get(usuario.id).n,
      });
    })
  );

  // ── Marcar una como leída (al tocarla en la lista) ──────────────────────────
  app.post(
    "/api/notificaciones/:id/leer",
    ventanilla((req, res) => {
      const usuario = exigirSesion(db, req, res);
      if (!usuario) return;

      const id = Number(req.params.id);
      if (!Number.isInteger(id) || !unaMia.get(id, usuario.id)) {
        // Que sea MÍA: nadie marca leída la notificación de otro cambiando el
        // número de la dirección (regla de oro 4: el permiso lo decide la cocina).
        return res.status(404).json({ error: "Esa notificación no existe." });
      }
      marcarLeida.run(id);
      res.json({ ok: true });
    })
  );

  // ── Marcar todas como leídas ────────────────────────────────────────────────
  app.post(
    "/api/notificaciones/leer-todas",
    ventanilla((req, res) => {
      const usuario = exigirSesion(db, req, res);
      if (!usuario) return;
      marcarTodas.run(usuario.id);
      res.json({ ok: true });
    })
  );
}
