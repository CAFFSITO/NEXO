// ============================================================================
// NEXO — Ventanillas de Comunidad (estilo X y Reddit)
// ----------------------------------------------------------------------------
// FEED
//   GET  /api/comunidad/publicaciones?vista=para-vos|siguiendo|recientes|guardados|menciones|perfil
//                                     &usuario=ID &tag=tema &q=texto
//   POST /api/comunidad/publicaciones            → publicar (con hilo, encuesta, cita, adjuntos)
//   PUT  /api/comunidad/publicaciones/:id        → editar lo propio (30 minutos)
//   POST /api/comunidad/publicaciones/:id/repost → repostear / deshacer
//   POST /api/comunidad/publicaciones/:id/guardar→ guardar / quitar
//   POST /api/comunidad/publicaciones/:id/fijar  → fijar (sin límite; la última queda arriba)
//   POST /api/comunidad/publicaciones/:id/desfijar
//   POST /api/comunidad/encuestas/:id/votar      → votar una opción de la encuesta
//   POST /api/comunidad/vistas                   → registrar vistas (únicas por persona)
// CONVERSACIÓN
//   GET  /api/comunidad/detalle?tipo=publicacion|debate&id=  → el contenido, su hilo y sus respuestas
//   POST /api/comunidad/comentarios              → responder (a la publicación o a otra respuesta)
//   PUT  /api/comunidad/comentarios/:id          → editar lo propio (30 minutos)
//   POST /api/comunidad/voto                     → flecha verde / roja (no hay "me gusta")
//   POST /api/comunidad/reacciones               → reaccionar con un emoji / quitarlo
// PERSONAS
//   GET  /api/comunidad/usuarios/:id             → perfil en la comunidad
//   POST /api/comunidad/usuarios/:id/seguir      → seguir / dejar de seguir
//   POST /api/comunidad/usuarios/:id/silenciar   → silenciar / dejar de silenciar
//   GET  /api/comunidad/personas?q=              → para completar @menciones
//   GET  /api/comunidad/hashtags                 → los #temas del momento
//   GET  /api/comunidad/sugerencias              → a quién seguir
// MODERACIÓN (sección 14.4.4)
//   POST /api/comunidad/denuncias · GET/PUT /api/comunidad/denuncias · DELETE /api/comunidad/:tipo/:id
//
// Todo se filtra por la escuela de quien pide (una escuela no ve el feed de
// otra). Los debates viven en debates.js; las tendencias, en tendencias.js.
// ============================================================================

import {
  exigirAcceso,
  ventanilla,
  aplicarVoto,
  nombreDeVoto,
  normalizarPublicarEn,
  publicarEnISO,
  antiguedadEnHoras,
} from "./comun.js";
import { algoritmo } from "./genoma.js";
import { tendenciaNacionalAprobada } from "./tendencias.js";
import { crearUtilComunidad, esEmoji, handleDe, handlesEn, hashtagsEn, normalizarTag, TIPOS_REACCIONABLES } from "./comunidad-util.js";
import { registrarDebates } from "./debates.js";

/** Quiénes publican en la comunidad general (preceptor y biblioteca leen y responden). */
const PUEDE_PUBLICAR = new Set(["estudiante", "profesor", "admin-academico", "centro-estudiantes"]);
const MAX_TEXTO = 1000;
const MAX_HILO = 15;
const VISTAS = ["para-vos", "siguiendo", "recientes", "guardados", "menciones", "perfil"];
const sinTildes = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const votoTexto = (v) => (v === 1 ? "a-favor" : v === -1 ? "en-contra" : null);

export function registrarComunidad(app, db, notificaciones = null) {
  const util = crearUtilComunidad(db, notificaciones);
  const { institucionDe } = util;

  // ── Cargar publicaciones con todo lo que se dibuja ────────────────────────
  const filasDeEscuela = db.prepare(
    `SELECT p.*, u.nombre AS autor, u.rol AS autor_rol, u.avatar_url AS autor_avatar, u.email AS autor_email,
            (p.publicar_en IS NOT NULL AND p.publicar_en > datetime('now')) AS programada
       FROM publicaciones p JOIN usuarios u ON u.id = p.autor_id
      WHERE p.institucion_id = ?1 AND p.eliminado_en IS NULL
        AND (p.publicar_en IS NULL OR p.publicar_en <= datetime('now') OR p.autor_id = ?2)`
  );
  const contar = (sql) => db.prepare(sql);
  const respuestasPorPub = contar("SELECT c.objeto_id AS id, COUNT(*) AS n FROM comentarios c JOIN publicaciones p ON p.id = c.objeto_id WHERE c.objeto_tipo = 'publicacion' AND c.eliminado_en IS NULL AND p.institucion_id = ? GROUP BY c.objeto_id");
  const repostsPorPub = contar("SELECT r.publicacion_id AS id, COUNT(*) AS n, MAX(r.usuario_id = ?2) AS mio FROM reposts r JOIN publicaciones p ON p.id = r.publicacion_id WHERE p.institucion_id = ?1 GROUP BY r.publicacion_id");
  const citasPorPub = contar("SELECT cita_id AS id, COUNT(*) AS n FROM publicaciones WHERE institucion_id = ? AND cita_id IS NOT NULL AND eliminado_en IS NULL GROUP BY cita_id");
  const vistasPorPub = contar("SELECT v.publicacion_id AS id, COUNT(*) AS n FROM publicacion_vistas v JOIN publicaciones p ON p.id = v.publicacion_id WHERE p.institucion_id = ? GROUP BY v.publicacion_id");
  const guardadosMios = contar("SELECT publicacion_id AS id, creado_en FROM guardados WHERE usuario_id = ?");
  const hiloPorRaiz = contar("SELECT hilo_raiz_id AS id, COUNT(*) AS n FROM publicaciones WHERE institucion_id = ? AND hilo_raiz_id IS NOT NULL AND eliminado_en IS NULL GROUP BY hilo_raiz_id");
  const opcionesDe = contar("SELECT o.publicacion_id, o.id, o.texto, (SELECT COUNT(*) FROM encuesta_votos v WHERE v.opcion_id = o.id) AS votos FROM encuesta_opciones o JOIN publicaciones p ON p.id = o.publicacion_id WHERE p.institucion_id = ? ORDER BY o.publicacion_id, o.orden");
  const misVotosEncuesta = contar("SELECT publicacion_id, opcion_id FROM encuesta_votos WHERE usuario_id = ?");
  const mencionesMias = contar("SELECT objeto_id AS id FROM menciones WHERE objeto_tipo = 'publicacion' AND usuario_id = ?");
  const sigo = contar("SELECT seguido_id AS id FROM seguimientos WHERE seguidor_id = ?");
  const silencio = contar("SELECT silenciado_id AS id FROM silenciados WHERE usuario_id = ?");
  const seguidosDe = contar("SELECT seguido_id AS id FROM seguimientos WHERE seguidor_id = ?");

  /**
   * Todas las publicaciones visibles de la escuela, ya armadas para la
   * pantalla. Devuelve un Map(id → vista) más los conjuntos que usan las vistas.
   */
  function cargar(usuario) {
    const filas = filasDeEscuela.all(usuario.institucionId, usuario.id);
    const ids = filas.map((f) => f.id);
    const mapa = (lista) => new Map(lista.map((x) => [x.id, x]));
    const respuestas = mapa(respuestasPorPub.all(usuario.institucionId));
    const reposts = mapa(repostsPorPub.all(usuario.institucionId, usuario.id));
    const citas = mapa(citasPorPub.all(usuario.institucionId));
    const vistas = mapa(vistasPorPub.all(usuario.institucionId));
    const guardados = mapa(guardadosMios.all(usuario.id));
    const hilos = mapa(hiloPorRaiz.all(usuario.institucionId));
    const votos = util.votosDe("publicacion", ids, usuario.id);
    const reacciones = util.reaccionesDe("publicacion", ids, usuario.id);
    const adjuntos = util.adjuntosDe("publicacion", ids);
    const misOpciones = new Map(misVotosEncuesta.all(usuario.id).map((v) => [v.publicacion_id, v.opcion_id]));
    const opciones = new Map();
    for (const o of opcionesDe.all(usuario.institucionId)) {
      if (!opciones.has(o.publicacion_id)) opciones.set(o.publicacion_id, []);
      opciones.get(o.publicacion_id).push(o);
    }
    const yoSigo = new Set(sigo.all(usuario.id).map((x) => x.id));
    const porId = new Map(filas.map((f) => [f.id, f]));
    // Las menciones se resuelven contra la gente de la escuela, una sola vez.
    const handles = util.porHandle(usuario.institucionId);
    const mencionadosDe = (texto) => [...new Set(handlesEn(texto))].map((h) => handles.get(h)).filter(Boolean);
    const ahora = new Date().toISOString();

    const vistaDe = (f) => {
      const v = votos.get(f.id) ?? { aFavor: 0, enContra: 0, mio: null };
      const ops = opciones.get(f.id);
      const cerrada = f.encuesta_cierra_en ? f.encuesta_cierra_en <= ahora : false;
      const miOpcion = misOpciones.get(f.id) ?? null;
      const totalEncuesta = ops ? ops.reduce((s, o) => s + o.votos, 0) : 0;
      const mencionados = mencionadosDe(f.contenido);
      const puedoResponder = f.autor_id === usuario.id || f.responden === "todos"
        || (f.responden === "mencionados" && mencionados.some((m) => m.id === usuario.id))
        || (f.responden === "seguidos" && new Set(seguidosDe.all(f.autor_id).map((x) => x.id)).has(usuario.id));
      return {
        id: String(f.id),
        clave: String(f.id),
        autorId: String(f.autor_id),
        autor: f.autor,
        autorRol: f.autor_rol,
        autorAvatar: f.autor_avatar ?? undefined,
        handle: handleDe(f.autor_email),
        loSigo: yoSigo.has(f.autor_id),
        contenido: f.contenido,
        creadoEn: f.publicar_en ?? f.creado_en,
        editado: f.editado_en !== null,
        editable: f.autor_id === usuario.id && util.editable(f.publicar_en ?? f.creado_en),
        tieneImagen: f.imagen_id !== null || (adjuntos.get(f.id) ?? []).some((a) => a.clase === "imagen"),
        adjuntos: adjuntos.get(f.id) ?? [],
        votosAFavor: v.aFavor,
        votosEnContra: v.enContra,
        miVoto: votoTexto(v.mio),
        comentarios: respuestas.get(f.id)?.n ?? 0,
        reposts: reposts.get(f.id)?.n ?? 0,
        miRepost: reposts.get(f.id)?.mio === 1,
        citas: citas.get(f.id)?.n ?? 0,
        vistas: vistas.get(f.id)?.n ?? 0,
        guardado: guardados.has(f.id),
        reacciones: reacciones.get(f.id) ?? [],
        encuesta: ops ? {
          opciones: ops.map((o) => ({ id: String(o.id), texto: o.texto, votos: miOpcion || cerrada || f.autor_id === usuario.id ? o.votos : null })),
          total: totalEncuesta,
          miOpcion: miOpcion ? String(miOpcion) : null,
          cierraEn: f.encuesta_cierra_en,
          cerrada,
        } : null,
        cita: null,
        hilo: f.hilo_raiz_id ? { raizId: String(f.hilo_raiz_id), orden: f.hilo_orden } : hilos.has(f.id) ? { raizId: String(f.id), orden: 0, total: hilos.get(f.id).n + 1 } : null,
        menciones: mencionados.map((m) => ({ id: String(m.id), handle: handleDe(m.email), nombre: m.nombre })),
        hashtags: hashtagsEn(f.contenido),
        responden: f.responden,
        puedoResponder,
        fijado: f.fijado_en !== null,
        fijadoEn: f.fijado_en,
        programada: f.programada === 1,
        publicarEn: publicarEnISO(f.publicar_en),
        repostadoPor: null,
      };
    };

    const vistasPorId = new Map(filas.map((f) => [f.id, vistaDe(f)]));
    // La publicación citada, resumida (o avisando que ya no está).
    for (const f of filas) {
      if (!f.cita_id) continue;
      const citada = porId.get(f.cita_id);
      const v = vistasPorId.get(f.id);
      v.cita = citada && citada.programada !== 1
        ? (({ id, autorId, autor, autorAvatar, handle, contenido, creadoEn, adjuntos: a }) => ({ id, autorId, autor, autorAvatar, handle, contenido: contenido.slice(0, 400), creadoEn, adjuntos: a.slice(0, 1) }))(vistasPorId.get(f.cita_id))
        : { id: String(f.cita_id), eliminada: true };
    }
    return { filas, porId, vistas: vistasPorId, yoSigo };
  }

  const repostsDe = db.prepare(
    `SELECT r.id, r.usuario_id, r.publicacion_id, r.creado_en, u.nombre
       FROM reposts r JOIN usuarios u ON u.id = r.usuario_id JOIN publicaciones p ON p.id = r.publicacion_id
      WHERE p.institucion_id = ? AND p.eliminado_en IS NULL`
  );

  // ── Feed ──────────────────────────────────────────────────────────────────
  app.get(
    "/api/comunidad/publicaciones",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "comunidad");
      if (!usuario) return;
      const vista = VISTAS.includes(req.query.vista) ? req.query.vista : "para-vos";
      const { filas, vistas, yoSigo } = cargar(usuario);
      const silenciados = new Set(silencio.all(usuario.id).map((x) => x.id));
      const raices = filas.filter((f) => f.hilo_raiz_id === null && !silenciados.has(f.autor_id));
      let items = [];

      if (vista === "guardados") {
        const guardados = new Map(guardadosMios.all(usuario.id).map((g) => [g.id, g.creado_en]));
        items = filas.filter((f) => guardados.has(f.id)).sort((a, b) => String(guardados.get(b.id)).localeCompare(String(guardados.get(a.id)))).map((f) => vistas.get(f.id));
      } else if (vista === "menciones") {
        const mias = new Set(mencionesMias.all(usuario.id).map((m) => m.id));
        items = filas.filter((f) => mias.has(f.id)).sort((a, b) => String(b.creado_en).localeCompare(String(a.creado_en))).map((f) => vistas.get(f.id));
      } else if (vista === "perfil" || vista === "siguiendo") {
        // Publicaciones y reposts de una persona (perfil) o de quienes sigo (y míos).
        const autorPerfil = Number(req.query.usuario);
        const de = vista === "perfil" ? new Set([autorPerfil]) : new Set([...yoSigo, usuario.id]);
        const propias = raices.filter((f) => de.has(f.autor_id)).map((f) => ({ v: vistas.get(f.id), cuando: String(f.publicar_en ?? f.creado_en) }));
        const reposteadas = repostsDe.all(usuario.institucionId)
          .filter((r) => de.has(r.usuario_id) && vistas.has(r.publicacion_id) && !silenciados.has(r.usuario_id))
          .map((r) => ({ v: { ...vistas.get(r.publicacion_id), clave: `r${r.id}`, repostadoPor: { id: String(r.usuario_id), nombre: r.nombre } }, cuando: String(r.creado_en).replace(" ", "T") }));
        items = [...propias, ...reposteadas].sort((a, b) => b.cuando.localeCompare(a.cuando)).map((x) => x.v);
        if (vista === "siguiendo") items = [...raices.filter((f) => f.fijado_en).sort((a, b) => b.fijado_en.localeCompare(a.fijado_en)).map((f) => vistas.get(f.id)), ...items.filter((v) => !(v.fijado && !v.repostadoPor))];
      } else {
        // Para vos (el algoritmo del genoma) o Recientes (cronológico). Lo
        // fijado va arriba de todo, la última fijada primero.
        const orden = algoritmo(db, usuario.institucionId, "comunidad.orden-feed");
        const ahora = Date.now();
        const puntaje = new Map(raices.map((f) => {
          const v = vistas.get(f.id);
          return [f.id, vista === "para-vos" && orden.activo ? orden.puntuar({
            votosAFavor: v.votosAFavor, votosEnContra: v.votosEnContra, comentarios: v.comentarios,
            horas: antiguedadEnHoras(f.publicar_en ?? f.creado_en, ahora), esDireccion: f.autor_rol === "admin-academico" ? 1 : 0,
          }) : 0];
        }));
        items = [...raices].sort((a, b) =>
          Number(b.fijado_en !== null) - Number(a.fijado_en !== null) ||
          String(b.fijado_en ?? "").localeCompare(String(a.fijado_en ?? "")) ||
          puntaje.get(b.id) - puntaje.get(a.id) ||
          String(b.publicar_en ?? b.creado_en).localeCompare(String(a.publicar_en ?? a.creado_en))
        ).map((f) => vistas.get(f.id));
      }

      const tag = normalizarTag(req.query.tag);
      if (tag) items = items.filter((v) => v.hashtags.includes(tag));
      const q = sinTildes(String(req.query.q ?? "").trim());
      if (q) items = items.filter((v) => sinTildes(`${v.contenido} ${v.autor} @${v.handle}`).includes(q));

      res.json({ vista, publicaciones: items });
    })
  );

  // ── Publicar ──────────────────────────────────────────────────────────────
  const insertarPublicacion = db.prepare(
    `INSERT INTO publicaciones (institucion_id, autor_id, contenido, imagen_id, publicar_en, cita_id, hilo_raiz_id, hilo_orden, responden, encuesta_cierra_en)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertarOpcion = db.prepare("INSERT INTO encuesta_opciones (publicacion_id, texto, orden) VALUES (?, ?, ?)");
  const publicacionVisible = db.prepare(
    "SELECT id, autor_id, contenido FROM publicaciones WHERE id = ? AND institucion_id = ? AND eliminado_en IS NULL AND (publicar_en IS NULL OR publicar_en <= datetime('now') OR autor_id = ?)"
  );

  function enTransaccion(fn) {
    db.exec("BEGIN");
    try {
      const r = fn();
      db.exec("COMMIT");
      return r;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  /** Avisos de una publicación recién creada: menciones y cita. */
  function avisarPublicacion(usuario, id, texto, citaDe) {
    for (const p of util.guardarMenciones("publicacion", id, texto, usuario.institucionId)) {
      util.avisar(p.id, usuario, { tipo: "mencion", titulo: `${usuario.nombre} te mencionó`, cuerpo: texto, objetoTipo: "publicacion", objetoId: id });
    }
    if (citaDe) util.avisar(citaDe.autor_id, usuario, { tipo: "cita", titulo: `${usuario.nombre} citó tu publicación`, cuerpo: texto, objetoTipo: "publicacion", objetoId: id });
  }

  app.post(
    "/api/comunidad/publicaciones",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "comunidad");
      if (!usuario) return;
      if (!PUEDE_PUBLICAR.has(usuario.rol)) return res.status(403).json({ error: "Tu perfil tiene solo lectura en la comunidad." });
      const cuerpo = req.body ?? {};

      // El hilo: la primera publicación y las que la siguen.
      const partes = [{ contenido: cuerpo.contenido, adjuntos: cuerpo.adjuntos ?? (cuerpo.imagenId ? [cuerpo.imagenId] : undefined) }];
      if (Array.isArray(cuerpo.hilo)) partes.push(...cuerpo.hilo.slice(0, MAX_HILO));
      const leidas = [];
      for (const [i, p] of partes.entries()) {
        const contenido = String(p?.contenido ?? "").trim();
        const adj = util.leerAdjuntos(p?.adjuntos, usuario.id);
        if (adj.error) return res.status(400).json({ error: adj.error });
        if (!contenido && !adj.ids.length) return res.status(400).json({ error: i === 0 ? "La publicación está vacía." : `La parte ${i + 1} del hilo está vacía.` });
        if (contenido.length > MAX_TEXTO) return res.status(400).json({ error: `Cada publicación admite hasta ${MAX_TEXTO} caracteres.` });
        leidas.push({ contenido, adjuntos: adj.ids });
      }
      if (leidas.some((p) => p.adjuntos.length) && !util.tiene(usuario, "comunidad.multimedia")) {
        return res.status(403).json({ error: "Tu perfil no puede subir fotos, videos ni archivos (lo decide la dirección en su modo edición)." });
      }

      const publicarEn = normalizarPublicarEn(cuerpo.publicarEn);
      if (publicarEn === undefined) return res.status(400).json({ error: "La fecha de publicación no es válida." });
      const responden = ["todos", "seguidos", "mencionados"].includes(cuerpo.responden) ? cuerpo.responden : "todos";

      let citada = null;
      if (cuerpo.citaId !== undefined && cuerpo.citaId !== null && cuerpo.citaId !== "") {
        citada = publicacionVisible.get(Number(cuerpo.citaId), usuario.institucionId, usuario.id);
        if (!citada) return res.status(404).json({ error: "La publicación que querés citar no existe." });
      }

      let encuesta = null;
      if (cuerpo.encuesta) {
        const opciones = Array.isArray(cuerpo.encuesta.opciones) ? cuerpo.encuesta.opciones.map((o) => String(o ?? "").trim()).filter(Boolean) : [];
        if (opciones.length < 2 || opciones.length > 6) return res.status(400).json({ error: "Una encuesta tiene entre 2 y 6 opciones." });
        if (opciones.some((o) => o.length > 80)) return res.status(400).json({ error: "Cada opción de la encuesta admite hasta 80 caracteres." });
        const horas = Math.max(1, Math.min(24 * 7, Math.round(Number(cuerpo.encuesta.duracionHoras) || 24)));
        const desde = publicarEn ? new Date(publicarEn.replace(" ", "T") + "Z").getTime() : Date.now();
        encuesta = { opciones, cierra: new Date(desde + horas * 3600 * 1000).toISOString() };
      }

      const ids = enTransaccion(() => {
        const creados = [];
        leidas.forEach((p, i) => {
          const info = insertarPublicacion.run(
            usuario.institucionId, usuario.id, p.contenido, null, publicarEn,
            i === 0 ? citada?.id ?? null : null, i === 0 ? null : creados[0], i, responden, i === 0 ? encuesta?.cierra ?? null : null
          );
          const id = Number(info.lastInsertRowid);
          creados.push(id);
          util.guardarAdjuntos("publicacion", id, p.adjuntos);
          if (i === 0 && encuesta) encuesta.opciones.forEach((o, k) => insertarOpcion.run(id, o, k));
        });
        return creados;
      });

      // Una programada avisa recién cuando se publique (no hay a quién mostrársela todavía).
      if (!publicarEn) leidas.forEach((p, i) => avisarPublicacion(usuario, ids[i], p.contenido, i === 0 ? citada : null));
      else leidas.forEach((p, i) => util.guardarMenciones("publicacion", ids[i], p.contenido, usuario.institucionId));
      res.status(201).json({ id: String(ids[0]), hilo: ids.map(String) });
    })
  );

  // ── Editar lo propio ──────────────────────────────────────────────────────
  app.put(
    "/api/comunidad/publicaciones/:id",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "comunidad");
      if (!usuario) return;
      const id = Number(req.params.id);
      const p = db.prepare("SELECT * FROM publicaciones WHERE id = ? AND institucion_id = ? AND eliminado_en IS NULL").get(id, usuario.institucionId);
      if (!p) return res.status(404).json({ error: "Esa publicación no existe." });
      if (p.autor_id !== usuario.id) return res.status(403).json({ error: "Solo quien la escribió puede editarla." });
      if (!util.editable(p.publicar_en ?? p.creado_en)) return res.status(409).json({ error: "Una publicación se puede editar durante los primeros 30 minutos." });
      const contenido = String(req.body?.contenido ?? "").trim();
      if (!contenido) return res.status(400).json({ error: "La publicación no puede quedar vacía." });
      if (contenido.length > MAX_TEXTO) return res.status(400).json({ error: `Una publicación admite hasta ${MAX_TEXTO} caracteres.` });
      db.prepare("UPDATE publicaciones SET contenido = ?, editado_en = datetime('now') WHERE id = ?").run(contenido, id);
      for (const m of util.guardarMenciones("publicacion", id, contenido, usuario.institucionId)) {
        util.avisar(m.id, usuario, { tipo: "mencion", titulo: `${usuario.nombre} te mencionó`, cuerpo: contenido, objetoTipo: "publicacion", objetoId: id });
      }
      res.json({ ok: true });
    })
  );

  // ── Repostear, guardar y vistas ───────────────────────────────────────────
  function alternar({ tabla, aviso, soloPublican = false }) {
    return ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "comunidad");
      if (!usuario) return;
      // Repostear es publicar: preceptor y biblioteca leen.
      if (soloPublican && !PUEDE_PUBLICAR.has(usuario.rol)) return res.status(403).json({ error: "Tu perfil tiene solo lectura en la comunidad." });
      const id = Number(req.params.id);
      const p = publicacionVisible.get(id, usuario.institucionId, usuario.id);
      if (!p) return res.status(404).json({ error: "Esa publicación no existe en tu comunidad." });
      const previo = db.prepare(`SELECT id FROM ${tabla} WHERE usuario_id = ? AND publicacion_id = ?`).get(usuario.id, id);
      if (previo) db.prepare(`DELETE FROM ${tabla} WHERE id = ?`).run(previo.id);
      else {
        db.prepare(`INSERT INTO ${tabla} (usuario_id, publicacion_id) VALUES (?, ?)`).run(usuario.id, id);
        if (aviso) util.avisar(p.autor_id, usuario, { tipo: aviso, titulo: `${usuario.nombre} reposteó tu publicación`, cuerpo: p.contenido, objetoTipo: "publicacion", objetoId: id });
      }
      const total = db.prepare(`SELECT COUNT(*) AS n FROM ${tabla} WHERE publicacion_id = ?`).get(id).n;
      res.json({ activo: !previo, total });
    });
  }
  app.post("/api/comunidad/publicaciones/:id/repost", alternar({ tabla: "reposts", aviso: "repost", soloPublican: true }));
  app.post("/api/comunidad/publicaciones/:id/guardar", alternar({ tabla: "guardados" }));

  const marcarVista = db.prepare("INSERT OR IGNORE INTO publicacion_vistas (publicacion_id, usuario_id) VALUES (?, ?)");
  app.post(
    "/api/comunidad/vistas",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "comunidad");
      if (!usuario) return;
      const ids = Array.isArray(req.body?.ids) ? [...new Set(req.body.ids.map(Number))].slice(0, 100) : [];
      let nuevas = 0;
      for (const id of ids) if (publicacionVisible.get(id, usuario.institucionId, usuario.id)) nuevas += marcarVista.run(id, usuario.id).changes;
      res.json({ nuevas });
    })
  );

  // ── Encuestas ─────────────────────────────────────────────────────────────
  app.post(
    "/api/comunidad/encuestas/:id/votar",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "comunidad");
      if (!usuario) return;
      const id = Number(req.params.id);
      const p = db.prepare("SELECT id, encuesta_cierra_en FROM publicaciones WHERE id = ? AND institucion_id = ? AND eliminado_en IS NULL AND (publicar_en IS NULL OR publicar_en <= datetime('now'))").get(id, usuario.institucionId);
      if (!p || !p.encuesta_cierra_en) return res.status(404).json({ error: "Esa encuesta no existe." });
      if (p.encuesta_cierra_en <= new Date().toISOString()) return res.status(409).json({ error: "La encuesta ya cerró." });
      const opcion = db.prepare("SELECT id FROM encuesta_opciones WHERE id = ? AND publicacion_id = ?").get(Number(req.body?.opcionId), id);
      if (!opcion) return res.status(400).json({ error: "Esa opción no es de esta encuesta." });
      const r = db.prepare("INSERT OR IGNORE INTO encuesta_votos (publicacion_id, usuario_id, opcion_id) VALUES (?, ?, ?)").run(id, usuario.id, opcion.id);
      if (!r.changes) return res.status(409).json({ error: "Ya votaste en esta encuesta." });
      const opciones = db.prepare("SELECT o.id, o.texto, (SELECT COUNT(*) FROM encuesta_votos v WHERE v.opcion_id = o.id) AS votos FROM encuesta_opciones o WHERE o.publicacion_id = ? ORDER BY o.orden").all(id);
      res.json({ opciones: opciones.map((o) => ({ id: String(o.id), texto: o.texto, votos: o.votos })), total: opciones.reduce((s, o) => s + o.votos, 0), miOpcion: String(opcion.id) });
    })
  );

  // ── Fijar sin límite (la última fijada queda arriba) ──────────────────────
  function fijar(tabla, tipo, valor) {
    return ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, tipo === "debate" ? "debates" : "comunidad");
      if (!usuario) return;
      if (!util.tiene(usuario, "comunidad.fijar")) return res.status(403).json({ error: "Tu perfil no puede fijar (lo decide la dirección en su modo edición)." });
      const id = Number(req.params.id);
      if (institucionDe(tipo, id) !== usuario.institucionId) return res.status(404).json({ error: "Ese contenido no existe en tu comunidad." });
      if (valor) db.prepare(`UPDATE ${tabla} SET fijado_en = strftime('%Y-%m-%dT%H:%M:%f', 'now'), fijado_por_id = ? WHERE id = ?`).run(usuario.id, id);
      else db.prepare(`UPDATE ${tabla} SET fijado_en = NULL, fijado_por_id = NULL WHERE id = ?`).run(id);
      res.json({ ok: true, fijado: valor });
    });
  }
  app.post("/api/comunidad/publicaciones/:id/fijar", fijar("publicaciones", "publicacion", true));
  app.post("/api/comunidad/publicaciones/:id/desfijar", fijar("publicaciones", "publicacion", false));
  app.post("/api/comunidad/debates/:id/fijar", fijar("debates", "debate", true));
  app.post("/api/comunidad/debates/:id/desfijar", fijar("debates", "debate", false));

  // ── Votar (flecha verde o roja): único y privado ──────────────────────────
  app.post(
    "/api/comunidad/voto",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "comunidad");
      if (!usuario) return;
      const tipo = req.body?.objetoTipo;
      const objetoId = Number(req.body?.objetoId);
      const valor = Number(req.body?.valor);
      if (!["publicacion", "debate", "comentario", "aporte"].includes(tipo)) return res.status(400).json({ error: "Tipo de objeto inválido." });
      if (valor !== 1 && valor !== -1) return res.status(400).json({ error: "El voto solo puede ser a favor o en contra." });
      if (institucionDe(tipo, objetoId) !== usuario.institucionId) return res.status(404).json({ error: "Ese contenido no existe en tu comunidad." });
      const r = aplicarVoto(db, usuario.id, tipo, objetoId, valor);
      res.json({ miVoto: nombreDeVoto(r.miVoto), votosAFavor: r.votosAFavor, votosEnContra: r.votosEnContra });
    })
  );

  // ── Reacciones con emoji ──────────────────────────────────────────────────
  app.post(
    "/api/comunidad/reacciones",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "comunidad");
      if (!usuario) return;
      const tipo = req.body?.objetoTipo;
      const objetoId = Number(req.body?.objetoId);
      const emoji = req.body?.emoji;
      if (!TIPOS_REACCIONABLES.includes(tipo)) return res.status(400).json({ error: "Tipo de objeto inválido." });
      if (!esEmoji(emoji)) return res.status(400).json({ error: "Eso no es un emoji." });
      if (institucionDe(tipo, objetoId) !== usuario.institucionId) return res.status(404).json({ error: "Ese contenido no existe en tu comunidad." });
      const previa = db.prepare("SELECT id FROM reacciones WHERE usuario_id = ? AND objeto_tipo = ? AND objeto_id = ? AND emoji = ?").get(usuario.id, tipo, objetoId, emoji);
      if (previa) db.prepare("DELETE FROM reacciones WHERE id = ?").run(previa.id);
      else {
        const distintas = db.prepare("SELECT COUNT(*) AS n FROM reacciones WHERE usuario_id = ? AND objeto_tipo = ? AND objeto_id = ?").get(usuario.id, tipo, objetoId).n;
        if (distintas >= 10) return res.status(409).json({ error: "Ya pusiste muchas reacciones acá." });
        db.prepare("INSERT INTO reacciones (usuario_id, objeto_tipo, objeto_id, emoji) VALUES (?, ?, ?, ?)").run(usuario.id, tipo, objetoId, emoji);
      }
      res.json({ reacciones: util.reaccionesDe(tipo, [objetoId], usuario.id).get(objetoId) ?? [] });
    })
  );

  // ── El contenido con su conversación ──────────────────────────────────────
  const comentariosDe = db.prepare(
    `SELECT c.*, u.nombre AS autor, u.rol AS autor_rol, u.avatar_url AS autor_avatar, u.email AS autor_email
       FROM comentarios c JOIN usuarios u ON u.id = c.usuario_id
      WHERE c.objeto_tipo = ? AND c.objeto_id = ?
      ORDER BY c.creado_en, c.id`
  );

  /**
   * Las respuestas de un contenido, en lista plana con su padre (la pantalla
   * arma el árbol). Una respuesta borrada que tiene respuestas vivas queda
   * como "[eliminada]" para no romper el hilo, como en Reddit.
   */
  function conversacion(tipo, id, usuario, { anonimizar = null } = {}) {
    const filas = comentariosDe.all(tipo, id);
    const vivos = new Set(filas.filter((c) => !c.eliminado_en).map((c) => c.id));
    const padre = new Map(filas.map((c) => [c.id, c.padre_id]));
    const necesarias = new Set(vivos);
    for (const v of vivos) for (let p = padre.get(v); p; p = padre.get(p)) necesarias.add(p);
    const visibles = filas.filter((c) => necesarias.has(c.id));
    const ids = visibles.map((c) => c.id);
    const votos = util.votosDe("comentario", ids, usuario.id);
    const reacciones = util.reaccionesDe("comentario", ids, usuario.id);
    const adjuntos = util.adjuntosDe("comentario", ids);
    return visibles.map((c) => {
      const borrada = c.eliminado_en !== null;
      const v = votos.get(c.id) ?? { aFavor: 0, enContra: 0, mio: null };
      const anonimo = anonimizar ? anonimizar(c) : false;
      return {
        id: String(c.id),
        padreId: c.padre_id ? String(c.padre_id) : null,
        aporteId: c.aporte_id ? String(c.aporte_id) : null,
        contenido: borrada ? "" : c.contenido,
        eliminado: borrada,
        autorId: borrada || anonimo ? null : String(c.usuario_id),
        autor: borrada ? "[eliminada]" : anonimo ? "Participante" : c.autor,
        autorRol: borrada || anonimo ? null : c.autor_rol,
        autorAvatar: borrada || anonimo ? null : c.autor_avatar ?? null,
        handle: borrada || anonimo ? null : handleDe(c.autor_email),
        esMio: c.usuario_id === usuario.id,
        editado: c.editado_en !== null,
        editable: !borrada && c.usuario_id === usuario.id && util.editable(c.creado_en),
        creadoEn: c.creado_en,
        votosAFavor: v.aFavor,
        votosEnContra: v.enContra,
        miVoto: votoTexto(v.mio),
        reacciones: borrada ? [] : reacciones.get(c.id) ?? [],
        adjuntos: borrada ? [] : adjuntos.get(c.id) ?? [],
      };
    });
  }

  app.get(
    "/api/comunidad/detalle",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "comunidad");
      if (!usuario) return;
      const tipo = req.query?.tipo;
      const objetoId = Number(req.query?.id);
      if (tipo !== "publicacion" && tipo !== "debate") return res.status(400).json({ error: "Tipo de objeto inválido." });

      // Una tendencia NACIONAL de otra escuela se lee porque la aprobó su
      // dirección: solo leer, y sin nombres (sale la idea, no la identidad).
      const propia = institucionDe(tipo, objetoId) === usuario.institucionId;
      const nacional = propia ? null : tendenciaNacionalAprobada(db, tipo, objetoId);
      if (!propia && !nacional) return res.status(404).json({ error: "Ese contenido no existe en tu comunidad." });

      if (nacional) {
        const fila = tipo === "publicacion"
          ? db.prepare("SELECT id, contenido, NULL AS titulo, creado_en FROM publicaciones WHERE id = ?").get(objetoId)
          : db.prepare("SELECT id, descripcion AS contenido, titulo, creado_en FROM debates WHERE id = ?").get(objetoId);
        const v = util.votosDe(tipo, [objetoId], 0).get(objetoId) ?? { aFavor: 0, enContra: 0 };
        return res.json({
          objeto: { tipo, id: String(fila.id), titulo: fila.titulo, contenido: fila.contenido, autorId: "0", autor: `Comunidad de ${nacional.institucion}`, autorRol: null, autorAvatar: null, creadoEn: fila.creado_en, votosAFavor: v.aFavor, votosEnContra: v.enContra, miVoto: null, reacciones: [], adjuntos: [] },
          hilo: [],
          comentarios: conversacion(tipo, objetoId, { id: 0 }).map((c) => ({ ...c, autor: c.eliminado ? c.autor : "Integrante de la comunidad", autorId: null, autorAvatar: null, handle: null, miVoto: null, esMio: false, editable: false })),
          soloLectura: true,
          institucion: nacional.institucion,
        });
      }

      if (tipo === "debate") {
        // Los debates traen su propio detalle (bloques, aportes) desde debates.js;
        // acá, su conversación general.
        const d = db.prepare("SELECT d.*, u.nombre AS autor, u.rol AS autor_rol, u.avatar_url AS autor_avatar FROM debates d JOIN usuarios u ON u.id = d.autor_id WHERE d.id = ?").get(objetoId);
        const v = util.votosDe("debate", [objetoId], usuario.id).get(objetoId) ?? { aFavor: 0, enContra: 0, mio: null };
        return res.json({
          objeto: { tipo, id: String(d.id), titulo: d.titulo, contenido: d.descripcion, autorId: String(d.autor_id), autor: d.autor, autorRol: d.autor_rol, autorAvatar: d.autor_avatar ?? null, creadoEn: d.creado_en, votosAFavor: v.aFavor, votosEnContra: v.enContra, miVoto: votoTexto(v.mio) },
          hilo: [],
          comentarios: conversacion("debate", objetoId, usuario).filter((c) => !c.aporteId),
        });
      }

      const { vistas, filas } = cargar(usuario);
      const objeto = vistas.get(objetoId);
      if (!objeto) return res.status(404).json({ error: "Ese contenido no existe en tu comunidad." });
      marcarVista.run(objetoId, usuario.id);
      // El hilo completo al que pertenece (estilo X): la primera y las que siguen.
      const raiz = objeto.hilo ? Number(objeto.hilo.raizId) : null;
      const hilo = raiz
        ? filas.filter((f) => f.id === raiz || f.hilo_raiz_id === raiz).sort((a, b) => a.hilo_orden - b.hilo_orden).map((f) => vistas.get(f.id))
        : [];
      res.json({
        objeto: { ...objeto, tipo: "publicacion", titulo: null, autorAvatar: objeto.autorAvatar ?? null },
        hilo,
        comentarios: conversacion("publicacion", objetoId, usuario),
      });
    })
  );

  // ── Responder (a la publicación o a otra respuesta) ───────────────────────
  app.post(
    "/api/comunidad/comentarios",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "comunidad");
      if (!usuario) return;
      const tipo = req.body?.objetoTipo;
      const objetoId = Number(req.body?.objetoId);
      const contenido = String(req.body?.contenido ?? "").trim();
      if (tipo !== "publicacion" && tipo !== "debate") return res.status(400).json({ error: "Solo se responden publicaciones y debates." });
      const adj = util.leerAdjuntos(req.body?.adjuntos, usuario.id);
      if (adj.error) return res.status(400).json({ error: adj.error });
      if (!contenido && !adj.ids.length) return res.status(400).json({ error: "La respuesta está vacía." });
      if (contenido.length > MAX_TEXTO) return res.status(400).json({ error: `Una respuesta admite hasta ${MAX_TEXTO} caracteres.` });
      if (adj.ids.length && !util.tiene(usuario, "comunidad.multimedia")) {
        return res.status(403).json({ error: "Tu perfil no puede subir fotos, videos ni archivos (lo decide la dirección en su modo edición)." });
      }
      if (institucionDe(tipo, objetoId) !== usuario.institucionId) return res.status(404).json({ error: "Ese contenido no existe en tu comunidad." });

      let destinatario;
      let titulo;
      if (tipo === "debate") {
        const d = db.prepare("SELECT autor_id, titulo, cierra_en, cerrado_en FROM debates WHERE id = ?").get(objetoId);
        if (d.cerrado_en || (d.cierra_en && d.cierra_en < new Date().toISOString().slice(0, 10))) return res.status(409).json({ error: "El debate está cerrado." });
        destinatario = d.autor_id;
        titulo = d.titulo;
      } else {
        const p = publicacionVisible.get(objetoId, usuario.institucionId, usuario.id);
        if (!p) return res.status(404).json({ error: "Ese contenido no existe en tu comunidad." });
        const { vistas } = cargar(usuario);
        if (!vistas.get(objetoId)?.puedoResponder) return res.status(403).json({ error: "Quien publicó eligió quiénes pueden responder." });
        destinatario = p.autor_id;
        titulo = p.contenido;
      }

      // Un sub-hilo: la respuesta a otra respuesta del MISMO contenido.
      let padreId = null;
      let aporteId = req.body?.aporteId ? Number(req.body.aporteId) : null;
      if (aporteId) {
        const aporte = db.prepare("SELECT usuario_id FROM debate_aportes WHERE id = ? AND debate_id = ? AND eliminado_en IS NULL").get(aporteId, objetoId);
        if (tipo !== "debate" || !aporte) return res.status(400).json({ error: "Ese aporte no es de este debate." });
        destinatario = aporte.usuario_id;
      }
      if (req.body?.padreId) {
        const padre = db.prepare("SELECT id, usuario_id, aporte_id FROM comentarios WHERE id = ? AND objeto_tipo = ? AND objeto_id = ? AND eliminado_en IS NULL").get(Number(req.body.padreId), tipo, objetoId);
        if (!padre) return res.status(400).json({ error: "La respuesta a la que contestás ya no está." });
        padreId = padre.id;
        aporteId = padre.aporte_id;
        destinatario = padre.usuario_id;
      }

      const info = db.prepare(
        "INSERT INTO comentarios (usuario_id, objeto_tipo, objeto_id, contenido, padre_id, aporte_id) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(usuario.id, tipo, objetoId, contenido, padreId, aporteId);
      const id = Number(info.lastInsertRowid);
      util.guardarAdjuntos("comentario", id, adj.ids);
      if (tipo === "debate") {
        db.prepare("INSERT INTO debate_participantes (debate_id, usuario_id, postura) VALUES (?, ?, NULL) ON CONFLICT (debate_id, usuario_id) DO NOTHING").run(objetoId, usuario.id);
      }

      util.avisar(destinatario, usuario, {
        tipo: "respuesta",
        titulo: padreId ? `${usuario.nombre} respondió tu comentario` : aporteId ? `${usuario.nombre} le respondió a tu aporte` : `${usuario.nombre} respondió${tipo === "debate" ? " en tu debate" : " tu publicación"}`,
        cuerpo: contenido || titulo,
        objetoTipo: tipo,
        objetoId,
      });
      for (const m of util.guardarMenciones("comentario", id, contenido, usuario.institucionId)) {
        if (m.id !== destinatario) util.avisar(m.id, usuario, { tipo: "mencion", titulo: `${usuario.nombre} te mencionó`, cuerpo: contenido, objetoTipo: tipo, objetoId });
      }
      const creado = conversacion(tipo, objetoId, usuario).find((c) => c.id === String(id));
      res.status(201).json({ id: String(id), comentario: creado });
    })
  );

  app.put(
    "/api/comunidad/comentarios/:id",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "comunidad");
      if (!usuario) return;
      const id = Number(req.params.id);
      const c = db.prepare("SELECT * FROM comentarios WHERE id = ? AND eliminado_en IS NULL").get(id);
      if (!c || institucionDe("comentario", id) !== usuario.institucionId) return res.status(404).json({ error: "Esa respuesta no existe." });
      if (c.usuario_id !== usuario.id) return res.status(403).json({ error: "Solo quien la escribió puede editarla." });
      if (!util.editable(c.creado_en)) return res.status(409).json({ error: "Una respuesta se puede editar durante los primeros 30 minutos." });
      const contenido = String(req.body?.contenido ?? "").trim();
      if (!contenido || contenido.length > MAX_TEXTO) return res.status(400).json({ error: "La respuesta tiene que tener entre 1 y 1000 caracteres." });
      db.prepare("UPDATE comentarios SET contenido = ?, editado_en = datetime('now') WHERE id = ?").run(contenido, id);
      util.guardarMenciones("comentario", id, contenido, usuario.institucionId);
      res.json({ ok: true });
    })
  );

  // ── Personas ──────────────────────────────────────────────────────────────
  const personaDe = db.prepare(
    "SELECT id, nombre, email, rol, avatar_url, perfil_clave FROM usuarios WHERE id = ? AND institucion_id = ? AND estado = 'activo'"
  );

  app.get(
    "/api/comunidad/usuarios/:id",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "comunidad");
      if (!usuario) return;
      const p = personaDe.get(Number(req.params.id), usuario.institucionId);
      if (!p) return res.status(404).json({ error: "Esa persona no está en tu comunidad." });
      const perfil = util.perfilDe({ rol: p.rol, perfilClave: p.perfil_clave, institucionId: usuario.institucionId });
      const n = (sql, ...args) => db.prepare(sql).get(...args).n;
      res.json({
        id: String(p.id),
        nombre: p.nombre,
        handle: handleDe(p.email),
        rol: p.rol,
        perfil: { nombre: perfil.nombre, color: perfil.color, icono: perfil.icono },
        avatar: p.avatar_url ?? null,
        seguidores: n("SELECT COUNT(*) AS n FROM seguimientos WHERE seguido_id = ?", p.id),
        siguiendo: n("SELECT COUNT(*) AS n FROM seguimientos WHERE seguidor_id = ?", p.id),
        publicaciones: n("SELECT COUNT(*) AS n FROM publicaciones WHERE autor_id = ? AND eliminado_en IS NULL AND hilo_raiz_id IS NULL AND (publicar_en IS NULL OR publicar_en <= datetime('now'))", p.id),
        debates: n("SELECT COUNT(*) AS n FROM debates WHERE autor_id = ? AND eliminado_en IS NULL", p.id),
        votosRecibidos: n("SELECT COALESCE(SUM(v.valor), 0) AS n FROM votos v JOIN publicaciones x ON x.id = v.objeto_id WHERE v.objeto_tipo = 'publicacion' AND x.autor_id = ?", p.id),
        loSigo: Boolean(db.prepare("SELECT 1 FROM seguimientos WHERE seguidor_id = ? AND seguido_id = ?").get(usuario.id, p.id)),
        meSigue: Boolean(db.prepare("SELECT 1 FROM seguimientos WHERE seguidor_id = ? AND seguido_id = ?").get(p.id, usuario.id)),
        silenciado: Boolean(db.prepare("SELECT 1 FROM silenciados WHERE usuario_id = ? AND silenciado_id = ?").get(usuario.id, p.id)),
        esYo: p.id === usuario.id,
      });
    })
  );

  function relacion(tabla, columnaOtro, aviso) {
    return ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "comunidad");
      if (!usuario) return;
      const otro = personaDe.get(Number(req.params.id), usuario.institucionId);
      if (!otro) return res.status(404).json({ error: "Esa persona no está en tu comunidad." });
      if (otro.id === usuario.id) return res.status(400).json({ error: "Eso sería con vos mismo." });
      const columnaYo = tabla === "seguimientos" ? "seguidor_id" : "usuario_id";
      const previo = db.prepare(`SELECT 1 FROM ${tabla} WHERE ${columnaYo} = ? AND ${columnaOtro} = ?`).get(usuario.id, otro.id);
      if (previo) db.prepare(`DELETE FROM ${tabla} WHERE ${columnaYo} = ? AND ${columnaOtro} = ?`).run(usuario.id, otro.id);
      else {
        db.prepare(`INSERT INTO ${tabla} (${columnaYo}, ${columnaOtro}) VALUES (?, ?)`).run(usuario.id, otro.id);
        if (aviso) util.avisar(otro.id, usuario, { tipo: "seguidor", titulo: `${usuario.nombre} empezó a seguirte`, objetoTipo: "usuario", objetoId: usuario.id });
      }
      res.json({ activo: !previo });
    });
  }
  app.post("/api/comunidad/usuarios/:id/seguir", relacion("seguimientos", "seguido_id", true));
  app.post("/api/comunidad/usuarios/:id/silenciar", relacion("silenciados", "silenciado_id", false));

  app.get(
    "/api/comunidad/personas",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "comunidad");
      if (!usuario) return;
      const q = sinTildes(String(req.query.q ?? "").replace(/^@/, "").trim());
      const personas = db.prepare("SELECT id, nombre, email, rol, avatar_url FROM usuarios WHERE institucion_id = ? AND estado = 'activo' AND rol <> 'familia' ORDER BY nombre").all(usuario.institucionId)
        .filter((p) => p.id !== usuario.id && (!q || sinTildes(`${p.nombre} ${handleDe(p.email)}`).includes(q)))
        .slice(0, 8)
        .map((p) => ({ id: String(p.id), nombre: p.nombre, handle: handleDe(p.email), rol: p.rol, avatar: p.avatar_url ?? null }));
      res.json({ personas });
    })
  );

  app.get(
    "/api/comunidad/hashtags",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "comunidad");
      if (!usuario) return;
      const filas = db.prepare(
        "SELECT autor_id, contenido FROM publicaciones WHERE institucion_id = ? AND eliminado_en IS NULL AND (publicar_en IS NULL OR publicar_en <= datetime('now')) AND julianday(COALESCE(publicar_en, creado_en)) >= julianday('now', '-14 days')"
      ).all(usuario.institucionId);
      const tags = new Map();
      for (const f of filas) for (const t of hashtagsEn(f.contenido)) {
        if (!tags.has(t)) tags.set(t, { tag: t, publicaciones: 0, personas: new Set() });
        tags.get(t).publicaciones++;
        tags.get(t).personas.add(f.autor_id);
      }
      res.json({
        hashtags: [...tags.values()]
          .map((t) => ({ tag: t.tag, publicaciones: t.publicaciones, personas: t.personas.size }))
          .sort((a, b) => b.personas - a.personas || b.publicaciones - a.publicaciones || a.tag.localeCompare(b.tag))
          .slice(0, 10),
      });
    })
  );

  app.get(
    "/api/comunidad/sugerencias",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "comunidad");
      if (!usuario) return;
      const sigoYa = new Set(sigo.all(usuario.id).map((x) => x.id));
      const filas = db.prepare(
        `SELECT u.id, u.nombre, u.email, u.rol, u.avatar_url,
                (SELECT COUNT(*) FROM publicaciones p WHERE p.autor_id = u.id AND p.eliminado_en IS NULL) +
                (SELECT COUNT(*) FROM seguimientos s WHERE s.seguido_id = u.id) * 2 AS actividad
           FROM usuarios u
          WHERE u.institucion_id = ? AND u.estado = 'activo' AND u.rol IN ('estudiante','profesor','admin-academico','centro-estudiantes','preceptor','bibliotecario')
          ORDER BY actividad DESC, u.nombre`
      ).all(usuario.institucionId);
      res.json({
        personas: filas.filter((p) => p.id !== usuario.id && !sigoYa.has(p.id)).slice(0, 5)
          .map((p) => ({ id: String(p.id), nombre: p.nombre, handle: handleDe(p.email), rol: p.rol, avatar: p.avatar_url ?? null })),
      });
    })
  );

  // ── Denunciar ─────────────────────────────────────────────────────────────
  app.post(
    "/api/comunidad/denuncias",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "comunidad");
      if (!usuario) return;
      const tipo = req.body?.objetoTipo;
      const objetoId = Number(req.body?.objetoId);
      const motivo = String(req.body?.motivo ?? "").trim();
      if (!["publicacion", "debate", "comentario", "aporte"].includes(tipo)) return res.status(400).json({ error: "Tipo de objeto inválido." });
      if (!motivo) return res.status(400).json({ error: "Contanos el motivo de la denuncia." });
      if (institucionDe(tipo, objetoId) !== usuario.institucionId) return res.status(404).json({ error: "Ese contenido no existe en tu comunidad." });
      db.prepare("INSERT INTO denuncias (denunciante_id, objeto_tipo, objeto_id, motivo) VALUES (?, ?, ?, ?)").run(usuario.id, tipo, objetoId, motivo);
      res.status(201).json({ ok: true });
    })
  );

  // ── Eliminar (borrado suave, 14.4.4 y 14.4.5) ─────────────────────────────
  // Puede eliminar: la dirección y el preceptor (moderan su escuela), el centro
  // de estudiantes SOLO sobre debates, y el autor lo suyo. El resto denuncia.
  function puedeEliminar(usuario, tipo, autorId) {
    if (usuario.id === autorId) return true;
    if (util.esModerador(usuario)) return true;
    if (usuario.rol === "centro-estudiantes" && tipo === "debate") return true;
    return false;
  }
  const TABLAS = { publicacion: ["publicaciones", "autor_id"], debate: ["debates", "autor_id"], comentario: ["comentarios", "usuario_id"] };

  function eliminarContenido(tipo) {
    const [tabla, columna] = TABLAS[tipo];
    return ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "comunidad");
      if (!usuario) return;
      const id = Number(req.params.id);
      if (institucionDe(tipo, id) !== usuario.institucionId) return res.status(404).json({ error: "Ese contenido no existe en tu comunidad." });
      const fila = db.prepare(`SELECT ${columna} AS autor FROM ${tabla} WHERE id = ?`).get(id);
      if (!puedeEliminar(usuario, tipo, fila.autor)) return res.status(403).json({ error: "Tu perfil no puede eliminar este contenido; podés denunciarlo." });
      db.prepare(`UPDATE ${tabla} SET eliminado_en = datetime('now'), eliminado_por = ? WHERE id = ?`).run(usuario.id, id);
      // Si era la primera de un hilo, el hilo entero se va con ella.
      if (tipo === "publicacion") db.prepare("UPDATE publicaciones SET eliminado_en = datetime('now'), eliminado_por = ? WHERE hilo_raiz_id = ? AND eliminado_en IS NULL").run(usuario.id, id);
      res.json({ ok: true });
    });
  }
  app.delete("/api/comunidad/publicaciones/:id", eliminarContenido("publicacion"));
  app.delete("/api/comunidad/debates/:id", eliminarContenido("debate"));
  app.delete("/api/comunidad/comentarios/:id", eliminarContenido("comentario"));

  // ── Bandeja de moderación (14.4.4) ────────────────────────────────────────
  app.get(
    "/api/comunidad/denuncias",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "moderacion-comunidad");
      if (!usuario) return;
      const filas = db.prepare(
        `SELECT de.id, de.objeto_tipo, de.objeto_id, de.motivo, de.creado_en, u.nombre AS denunciante,
                CASE de.objeto_tipo
                  WHEN 'publicacion' THEN (SELECT substr(contenido,1,120) FROM publicaciones WHERE id = de.objeto_id)
                  WHEN 'debate'      THEN (SELECT titulo FROM debates WHERE id = de.objeto_id)
                  WHEN 'comentario'  THEN (SELECT substr(contenido,1,120) FROM comentarios WHERE id = de.objeto_id)
                  WHEN 'aporte'      THEN (SELECT substr(texto,1,120) FROM debate_aportes WHERE id = de.objeto_id)
                END AS extracto,
                CASE de.objeto_tipo
                  WHEN 'publicacion' THEN (SELECT eliminado_en FROM publicaciones WHERE id = de.objeto_id)
                  WHEN 'debate'      THEN (SELECT eliminado_en FROM debates WHERE id = de.objeto_id)
                  WHEN 'comentario'  THEN (SELECT eliminado_en FROM comentarios WHERE id = de.objeto_id)
                  WHEN 'aporte'      THEN (SELECT eliminado_en FROM debate_aportes WHERE id = de.objeto_id)
                END AS objeto_eliminado
           FROM denuncias de JOIN usuarios u ON u.id = de.denunciante_id
          WHERE de.resuelta_en IS NULL
            AND EXISTS (SELECT 1 FROM usuarios ud WHERE ud.id = de.denunciante_id AND ud.institucion_id = ?)
          ORDER BY de.creado_en DESC`
      ).all(usuario.institucionId).map((f) => ({
        id: String(f.id), objetoTipo: f.objeto_tipo, objetoId: String(f.objeto_id), motivo: f.motivo, creadoEn: f.creado_en,
        denunciante: f.denunciante, extracto: f.extracto ?? "(contenido no disponible)", objetoEliminado: f.objeto_eliminado !== null,
      }));
      res.json({ denuncias: filas });
    })
  );

  app.put(
    "/api/comunidad/denuncias/:id",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "moderacion-comunidad");
      if (!usuario) return;
      const denunciaId = Number(req.params.id);
      const resultado = req.body?.resultado;
      if (resultado !== "contenido-eliminado" && resultado !== "descartada") return res.status(400).json({ error: "Resultado inválido." });
      const den = db.prepare("SELECT objeto_tipo AS t, objeto_id AS o, resuelta_en FROM denuncias WHERE id = ?").get(denunciaId);
      if (!den) return res.status(404).json({ error: "Esa denuncia no existe." });
      if (den.resuelta_en) return res.status(409).json({ error: "Esa denuncia ya fue resuelta." });
      if (institucionDe(den.t, den.o) !== usuario.institucionId && resultado === "contenido-eliminado") {
        return res.status(404).json({ error: "Ese contenido ya no está disponible." });
      }
      if (resultado === "contenido-eliminado") {
        const tabla = { publicacion: "publicaciones", debate: "debates", comentario: "comentarios", aporte: "debate_aportes" }[den.t];
        db.prepare(`UPDATE ${tabla} SET eliminado_en = datetime('now'), eliminado_por = ? WHERE id = ? AND eliminado_en IS NULL`).run(usuario.id, den.o);
      }
      db.prepare("UPDATE denuncias SET resuelta_en = datetime('now'), resuelta_por = ?, resultado = ? WHERE id = ?").run(usuario.id, resultado, denunciaId);
      res.json({ ok: true });
    })
  );

  // ── Debates (bloques, aportes, conclusión) ────────────────────────────────
  registrarDebates(app, db, util, { conversacion, PUEDE_PUBLICAR });
}
