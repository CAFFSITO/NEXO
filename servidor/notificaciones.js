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
import { puedeRecibirCanal } from "./canales.js";

/**
 * Crea el servicio de notificaciones. Necesita el mensajero para el aviso en
 * vivo. Devuelve `crear`, que es lo que llaman los otros módulos.
 */
export function crearNotificaciones(db, mensajero, push) {
  const insertar = db.prepare(
    `INSERT INTO notificaciones (usuario_id, tipo, titulo, cuerpo, objeto_tipo, objeto_id, prioridad, mensaje_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  /**
   * Avisar a una persona. `objetoTipo`/`objetoId` dicen a dónde navegar cuando
   * toque la notificación (por ejemplo objetoTipo "conversacion", objetoId 4).
   */
  function crear({ usuarioId, tipo, titulo, cuerpo = "", objetoTipo = null, objetoId = null, prioridad = "estandar", mensajeId = null }) {
    const info = insertar.run(usuarioId, tipo, titulo, cuerpo, objetoTipo, objetoId, prioridad, mensajeId);
    mensajero.emitirA(usuarioId, {
      tipo: "notificacion",
      notificacion: {
        id: String(info.lastInsertRowid),
        tipoNotif: tipo,
        titulo,
        cuerpo,
        objetoTipo,
        objetoId,
        prioridad,
        mensajeId,
      },
    });
    if (mensajeId != null) void enviarPush(db.prepare("SELECT * FROM notificaciones WHERE id = ?").get(info.lastInsertRowid)).catch(console.error);
    return info.lastInsertRowid;
  }

  async function enviarPush(n) {
    if (!push) return;
    if(n.objeto_tipo==='conversacion'&&!puedeRecibirCanal(db,n.objeto_id,n.usuario_id))return;
    // Marcar antes de esperar la red evita repetir el mismo envío simultáneamente.
    db.prepare("UPDATE notificaciones SET ultimo_push_en = datetime('now') WHERE id = ?").run(n.id);
    await push.enviarAUsuario(n.usuario_id, {
      tipo: "mensaje", prioridad: n.prioridad,
      titulo: `${n.prioridad === "urgente" ? "URGENTE · " : ""}${n.titulo}`,
      cuerpo: n.cuerpo.slice(0, 300),
      url: `/chat?conversacion=${n.objeto_id}`,
      tag: `nexo-mensaje-${n.id}`,
      notificacionId: String(n.id),
    }, { urgencia: n.prioridad === "urgente" ? "high" : "normal", tema: `mensaje-${n.id}`, ttl: 3600 });
  }
  async function recordar() {
    // Un recordatorio por destinatario y pasada. Continúa tras reiniciar el servidor.
    const pendientes = db.prepare(`SELECT n.* FROM notificaciones n
      JOIN usuarios u ON u.id = n.usuario_id AND u.estado = 'activo'
      JOIN mensajes m ON m.id = n.mensaje_id AND m.eliminado_en IS NULL
      JOIN conversacion_miembros cm ON cm.conversacion_id = m.conversacion_id AND cm.usuario_id = n.usuario_id
      WHERE n.leida_en IS NULL AND n.prioridad = 'urgente'
        AND (n.ultimo_push_en IS NULL OR n.ultimo_push_en <= datetime('now', '-1 minute'))
      ORDER BY n.ultimo_push_en, n.id`).all();
    const destinatarios = new Set();
    await Promise.all(pendientes.filter((n) => {
      if(!puedeRecibirCanal(db,n.objeto_id,n.usuario_id))return false;
      if (destinatarios.has(n.usuario_id)) return false;
      destinatarios.add(n.usuario_id); return true;
    }).map(enviarPush));
  }
  function programar() {
    const timer = setInterval(() => { void recordar().catch(console.error); }, 15000);
    timer.unref?.();
    return timer;
  }
  return { crear, recordar, programar };
}

export function registrarNotificaciones(app, db, mensajero) {
  const mias = db.prepare(
    `SELECT id, tipo, titulo, cuerpo, objeto_tipo, objeto_id, creado_en, leida_en, prioridad, mensaje_id
       FROM notificaciones
      WHERE usuario_id = ?
      ORDER BY (leida_en IS NOT NULL), creado_en DESC, id DESC
      LIMIT 100`
  );

  app.get("/api/notificaciones/mensajes-pendientes", ventanilla((req, res) => {
    const usuario = exigirSesion(db, req, res);
    if (!usuario) return;
    const pendientes = db.prepare(`SELECT n.id, n.titulo, n.cuerpo, n.prioridad, n.objeto_id, n.creado_en, n.mensaje_id,
      (SELECT emoji FROM mensaje_reacciones r WHERE r.mensaje_id = m.id AND r.usuario_id = n.usuario_id) AS reaccion
      FROM notificaciones n JOIN mensajes m ON m.id = n.mensaje_id AND m.eliminado_en IS NULL
      JOIN conversacion_miembros cm ON cm.conversacion_id = m.conversacion_id AND cm.usuario_id = n.usuario_id
      WHERE n.usuario_id = ? AND n.leida_en IS NULL
      ORDER BY (n.prioridad = 'urgente') DESC, n.id`).all(usuario.id).filter(n=>puedeRecibirCanal(db,n.objeto_id,usuario));
    res.json({ pendientes: pendientes.map((n) => ({ id: String(n.id), titulo: n.titulo, cuerpo: n.cuerpo,
      prioridad: n.prioridad, conversacionId: String(n.objeto_id), mensajeId: String(n.mensaje_id), reaccion: n.reaccion, creadoEn: n.creado_en })) });
  }));

  // Cuántas notificaciones sin leer (la campana).
  const notifSinLeer = db.prepare(
    "SELECT objeto_tipo, objeto_id FROM notificaciones WHERE usuario_id = ? AND leida_en IS NULL"
  );

  // Cuántos mensajes de chat sin leer (el globito del ítem Chat del menú). Sale
  // de la MISMA vista que usa el chat, así el número no puede contradecirse.
  const chatSinLeer = db.prepare(
    "SELECT conversacion_id, no_leidos FROM v_no_leidos WHERE usuario_id = ?"
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

      const notificaciones = mias.all(usuario.id).filter(f=>f.objeto_tipo!=='conversacion'||puedeRecibirCanal(db,f.objeto_id,usuario)).map((f) => ({
        id: String(f.id),
        tipo: f.tipo,
        titulo: f.titulo,
        cuerpo: f.cuerpo,
        objetoTipo: f.objeto_tipo,
        objetoId: f.objeto_id,
        creadoEn: f.creado_en,
        leida: f.leida_en !== null,
        prioridad: f.prioridad,
        mensajeId: f.mensaje_id,
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
        notificaciones: notifSinLeer.all(usuario.id).filter(n=>n.objeto_tipo!=='conversacion'||puedeRecibirCanal(db,n.objeto_id,usuario)).length,
        chat: chatSinLeer.all(usuario.id).filter(c=>puedeRecibirCanal(db,c.conversacion_id,usuario)).reduce((total,c)=>total+c.no_leidos,0),
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
      mensajero?.emitirA(usuario.id, { tipo: "notificaciones-leidas" });
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
      mensajero?.emitirA(usuario.id, { tipo: "notificaciones-leidas" });
      res.json({ ok: true });
    })
  );
}
