import { exigirAcceso, ventanilla } from "./comun.js";

// Cada destinatario tiene un hilo privado con quien emitió el aviso.
// Recibir una difusión no da acceso a las respuestas de los demás.
export function registrarRespuestasAnuncios(app, db, mensajero, notificaciones, push) {
  function acceso(req, res, usuario) {
    const id = Number(req.params.id);
    const anuncio = Number.isSafeInteger(id) ? db.prepare(`SELECT a.*, u.nombre AS autor_nombre, u.estado AS autor_estado
      FROM anuncios a LEFT JOIN usuarios u ON u.id = a.autor_id WHERE a.id = ? AND a.institucion_id = ?`).get(id, usuario.institucionId) : null;
    if (!anuncio) { res.status(404).json({ error: "Ese aviso no existe." }); return null; }
    const solicitado = req.method === "GET" ? req.query.destinatarioId : req.body?.destinatarioId;
    const destinatarioId = solicitado == null ? usuario.id : Number(solicitado);
    const destino = Number.isSafeInteger(destinatarioId) ? db.prepare(`SELECT u.id, u.nombre, u.estado
      FROM anuncio_destinatarios d JOIN usuarios u ON u.id = d.usuario_id
      WHERE d.anuncio_id = ? AND d.usuario_id = ? AND u.institucion_id = ?`).get(id, destinatarioId, usuario.institucionId) : null;
    if (!destino || (usuario.id !== anuncio.autor_id && usuario.id !== destinatarioId)) {
      res.status(403).json({ error: "No tenés acceso a estas respuestas." }); return null;
    }
    return { anuncio, destino };
  }
  const adjuntosDe = db.prepare(`SELECT ar.* FROM anuncio_respuesta_adjuntos ra JOIN archivos ar ON ar.id = ra.archivo_id
    WHERE ra.respuesta_id = ? ORDER BY ra.orden`);
  const respuestasDe = db.prepare(`SELECT r.*, u.nombre AS autor FROM anuncio_respuestas r
    JOIN usuarios u ON u.id = r.autor_id WHERE r.anuncio_id = ? AND r.destinatario_id = ? ORDER BY r.id`);
  const vista = (r, usuarioId) => ({
    id: String(r.id), autor: r.autor, autorId: String(r.autor_id), mio: r.autor_id === usuarioId,
    cuerpo: r.cuerpo, creadoEn: String(r.creado_en).replace(" ", "T") + "Z",
    adjuntos: adjuntosDe.all(r.id).map((a) => ({ id: String(a.id), nombre: a.nombre_original,
      tipo: a.tipo_mime, tamano: a.tamano_bytes, voz: a.tipo_mime.startsWith("audio/"), duracionMs: null })),
  });
  app.get("/api/anuncios/:id/respuestas", ventanilla((req, res) => {
    const usuario = exigirAcceso(db, req, res, "anuncios");
    if (!usuario) return;
    const permiso = acceso(req, res, usuario);
    if (!permiso) return;
    const { anuncio, destino } = permiso;
    res.json({ anuncio: { id: String(anuncio.id), cuerpo: anuncio.cuerpo, autor: anuncio.autor_nombre },
      destinatario: { id: String(destino.id), nombre: destino.nombre },
      puedeResponder: anuncio.autor_estado === "activo" && destino.estado === "activo",
      respuestas: respuestasDe.all(anuncio.id, destino.id).map((r) => vista(r, usuario.id)) });
  }));
  app.post("/api/anuncios/:id/respuestas", ventanilla((req, res) => {
    const usuario = exigirAcceso(db, req, res, "anuncios");
    if (!usuario) return;
    const permiso = acceso(req, res, usuario);
    if (!permiso) return;
    const { anuncio, destino } = permiso;
    if (anuncio.autor_estado !== "activo" || destino.estado !== "activo") return res.status(409).json({ error: "La otra persona ya no tiene una cuenta activa." });
    const cuerpo = req.body?.cuerpo ?? "";
    const archivos = req.body?.archivoIds ?? [];
    if (typeof cuerpo !== "string" || cuerpo.length > 10000) return res.status(400).json({ error: "La respuesta admite hasta 10.000 caracteres." });
    if (!Array.isArray(archivos) || archivos.length > 5) return res.status(400).json({ error: "Podés adjuntar hasta 5 archivos o audios." });
    const ids = [...new Set(archivos.map(Number))];
    if (ids.some((id) => !Number.isSafeInteger(id) || !db.prepare("SELECT 1 FROM archivos WHERE id = ? AND subido_por = ?").get(id, usuario.id))) {
      return res.status(400).json({ error: "Uno de los adjuntos no te pertenece o no existe." });
    }
    if (!cuerpo.trim() && !ids.length) return res.status(400).json({ error: "Escribí una respuesta, elegí una opción, adjuntá un archivo o grabá un audio." });
    let respuestaId;
    db.exec("BEGIN");
    try {
      respuestaId = Number(db.prepare("INSERT INTO anuncio_respuestas(anuncio_id, destinatario_id, autor_id, cuerpo) VALUES (?, ?, ?, ?)").run(anuncio.id, destino.id, usuario.id, cuerpo.trim()).lastInsertRowid);
      ids.forEach((id, orden) => db.prepare("INSERT INTO anuncio_respuesta_adjuntos(respuesta_id, archivo_id, orden) VALUES (?, ?, ?)").run(respuestaId, id, orden));
      db.exec("COMMIT");
    } catch (error) { db.exec("ROLLBACK"); throw error; }
    const receptor = usuario.id === anuncio.autor_id ? destino.id : anuncio.autor_id;
    const titulo = `Respuesta de ${usuario.nombre}`;
    const url = `/anuncios?respuesta=${anuncio.id}&destinatarioId=${destino.id}`;
    notificaciones.crear({ usuarioId: receptor, tipo: "respuesta", titulo, cuerpo: cuerpo.trim() || "Respuesta con archivos o audio",
      objetoTipo: "anuncio-respuesta", objetoId: respuestaId });
    for (const id of new Set([anuncio.autor_id, destino.id])) mensajero.emitirA(id, { tipo: "anuncio-respuesta", anuncioId: String(anuncio.id) });
    // Actualiza también el contador de respuestas de Enviados.
    mensajero.emitirA(anuncio.autor_id, { tipo: "anuncio-lectura", anuncioId: String(anuncio.id) });
    if (push) void push.enviarAUsuario(receptor, { tipo: "respuesta-anuncio", prioridad: "estandar", titulo,
      cuerpo: (cuerpo.trim() || "Respuesta con archivos o audio").slice(0, 300), url, tag: `nexo-respuesta-${respuestaId}` },
    { urgencia: "normal", tema: `respuesta-${respuestaId}` }).catch(console.error);
    const fila = respuestasDe.all(anuncio.id, destino.id).find((r) => r.id === respuestaId);
    res.status(201).json({ respuesta: vista(fila, usuario.id) });
  }));
  // La notificación resuelve el hilo con los mismos permisos que el aviso.
  app.get("/api/anuncios/respuestas/:respuestaId/destino", ventanilla((req, res) => {
    const usuario = exigirAcceso(db, req, res, "anuncios");
    if (!usuario) return;
    const id = Number(req.params.respuestaId);
    const r = Number.isSafeInteger(id) ? db.prepare(`SELECT r.anuncio_id, r.destinatario_id FROM anuncio_respuestas r
      JOIN anuncios a ON a.id = r.anuncio_id WHERE r.id = ? AND a.institucion_id = ? AND (a.autor_id = ? OR r.destinatario_id = ?)`)
      .get(id, usuario.institucionId, usuario.id, usuario.id) : null;
    if (!r) return res.status(404).json({ error: "La respuesta ya no está disponible." });
    res.json({ url: `/anuncios?respuesta=${r.anuncio_id}&destinatarioId=${r.destinatario_id}` });
  }));
}
