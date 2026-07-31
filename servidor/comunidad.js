// ============================================================================
// NEXO — Ventanillas de Comunidad (Etapa 2, pantalla 4)
// ----------------------------------------------------------------------------
// Las tres pestañas del módulo: Feed, Debates y Tendencias.
//
//   GET /api/comunidad/publicaciones → el feed
//   GET /api/comunidad/debates       → los debates con sus posturas
//   GET /api/comunidad/tendencias    → lo que más se movió, calculado
//
// Todo se filtra por la institución de quien pregunta: una escuela no ve el
// feed de otra. El único alcance entre escuelas es el de Tendencias, y es
// explícito (ver más abajo).
//
// Qué NO hace esta etapa: votar, comentar y participar siguen sin funcionar
// (Errores 2.B.1, 2.B.2, 2.B.6). Eso es la Etapa 5. Lo que cambia hoy es que
// los números que se muestran existen: los "45 me gusta" del Prof. García y los
// "152 a favor" del debate sobre salud mental estaban escritos a mano, igual
// que las personas que los decían ("Juan Pérez", "Marco Solís", que no son de
// este colegio ni de ningún otro).
// ============================================================================

import { exigirAcceso, ventanilla, aplicarVoto, nombreDeVoto } from "./comun.js";

export function registrarComunidad(app, db) {
  // ── Feed ──────────────────────────────────────────────────────────────────
  // Los votos y los comentarios se cuentan de sus tablas en el momento. La
  // tarjeta mostraba tres números ("likes", "comentarios", "compartidos");
  // "compartidos" no existe en la base ni en el producto: no hay forma de
  // compartir una publicación en NEXO, así que ese número no se manda.
  const publicaciones = db.prepare(
    `SELECT p.id,
            p.contenido,
            p.creado_en,
            p.imagen_id,
            p.autor_id,
            u.nombre     AS autor,
            u.rol        AS autor_rol,
            u.avatar_url AS autor_avatar,
            (SELECT COUNT(*) FROM votos v
              WHERE v.objeto_tipo = 'publicacion' AND v.objeto_id = p.id
                AND v.valor = 1) AS votos_a_favor,
            (SELECT COUNT(*) FROM votos v
              WHERE v.objeto_tipo = 'publicacion' AND v.objeto_id = p.id
                AND v.valor = -1) AS votos_en_contra,
            (SELECT COUNT(*) FROM comentarios c
              WHERE c.objeto_tipo = 'publicacion' AND c.objeto_id = p.id
                AND c.eliminado_en IS NULL) AS comentarios,
            (SELECT v.valor FROM votos v
              WHERE v.objeto_tipo = 'publicacion' AND v.objeto_id = p.id
                AND v.usuario_id = ?2) AS mi_voto
       FROM publicaciones p
       JOIN usuarios u ON u.id = p.autor_id
      WHERE p.institucion_id = ?1
        AND p.eliminado_en IS NULL
      ORDER BY p.creado_en DESC`
  );

  app.get(
    "/api/comunidad/publicaciones",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "comunidad");
      if (!usuario) return;

      res.json({
        publicaciones: publicaciones
          .all(usuario.institucionId, usuario.id)
          .map((fila) => ({
            id: String(fila.id),
            autorId: String(fila.autor_id),
            autor: fila.autor,
            autorRol: fila.autor_rol,
            autorAvatar: fila.autor_avatar ?? undefined,
            contenido: fila.contenido,
            creadoEn: fila.creado_en,
            tieneImagen: fila.imagen_id !== null,
            votosAFavor: fila.votos_a_favor,
            votosEnContra: fila.votos_en_contra,
            comentarios: fila.comentarios,
            // El voto propio es privado: cada quien recibe el suyo y nada más
            // (Error 2.B.1 pide que el voto sea privado y único por persona).
            miVoto: fila.mi_voto === 1 ? "a-favor" : fila.mi_voto === -1 ? "en-contra" : null,
          })),
      });
    })
  );

  // ── Debates ───────────────────────────────────────────────────────────────
  // Ojo con la diferencia, que es la razón de dos tablas y no una:
  //   · `debate_participantes.postura` = la posición de quien entró al debate.
  //     Es lo que dibujan las barras "A favor / En contra".
  //   · `votos` sobre un debate = si el debate te parece bueno o no.
  //     Es lo que alimenta Tendencias.
  // Son dos preguntas distintas: se puede estar en contra de la propuesta de un
  // debate y a la vez pensar que es un debate excelente.
  const debates = db.prepare(
    `SELECT d.id,
            d.titulo,
            d.descripcion,
            d.cierra_en,
            d.creado_en,
            d.autor_id,
            u.nombre AS autor,
            u.rol    AS autor_rol,
            (SELECT COUNT(*) FROM debate_participantes dp
              WHERE dp.debate_id = d.id AND dp.postura = 'a-favor')   AS a_favor,
            (SELECT COUNT(*) FROM debate_participantes dp
              WHERE dp.debate_id = d.id AND dp.postura = 'en-contra') AS en_contra,
            (SELECT COUNT(*) FROM debate_participantes dp
              WHERE dp.debate_id = d.id) AS participantes,
            (SELECT COUNT(*) FROM comentarios c
              WHERE c.objeto_tipo = 'debate' AND c.objeto_id = d.id
                AND c.eliminado_en IS NULL) AS comentarios,
            (SELECT dp.postura FROM debate_participantes dp
              WHERE dp.debate_id = d.id AND dp.usuario_id = ?2) AS mi_postura,
            EXISTS (SELECT 1 FROM debate_participantes dp
                     WHERE dp.debate_id = d.id AND dp.usuario_id = ?2) AS estoy_participando
       FROM debates d
       JOIN usuarios u ON u.id = d.autor_id
      WHERE d.institucion_id = ?1
        AND d.eliminado_en IS NULL
      ORDER BY d.creado_en DESC`
  );

  app.get(
    "/api/comunidad/debates",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "debates");
      if (!usuario) return;

      res.json({
        debates: debates.all(usuario.institucionId, usuario.id).map((fila) => ({
          id: String(fila.id),
          titulo: fila.titulo,
          descripcion: fila.descripcion,
          autorId: String(fila.autor_id),
          autor: fila.autor,
          autorRol: fila.autor_rol,
          creadoEn: fila.creado_en,
          cierraEn: fila.cierra_en ?? null,
          // Abierto o cerrado no se guarda: se deduce de la fecha de cierre.
          // Un debate sin fecha de cierre no se cierra nunca.
          abierto: fila.cierra_en === null || fila.cierra_en >= new Date().toISOString().slice(0, 10),
          votosAFavor: fila.a_favor,
          votosEnContra: fila.en_contra,
          participantes: fila.participantes,
          comentarios: fila.comentarios,
          estoyParticipando: fila.estoy_participando === 1,
          miPostura: fila.mi_postura ?? null,
        })),
      });
    })
  );

  // ── Tendencias ────────────────────────────────────────────────────────────
  // No se calcula acá: la cuenta vive en la vista `v_tendencias` del esquema
  // (puntaje = balance de votos + 2×posturas + comentarios, de los últimos 7
  // días). Que la fórmula viva en la base y no en este archivo es a propósito:
  // es la definición de "tendencia" del producto, no un detalle de esta
  // ventanilla.
  //
  // El alcance ("Todas las escuelas" / "Mi escuela") reemplaza a los nombres
  // viejos "Global" y "Mi Red" (Error 2.B.10). Se valida contra una lista
  // cerrada: lo que llega por la dirección web es texto escrito por cualquiera.
  const tendenciasDeMiEscuela = db.prepare(
    `SELECT t.objeto_tipo, t.objeto_id, t.titulo, t.puntaje, i.nombre AS institucion
       FROM v_tendencias t
       JOIN instituciones i ON i.id = t.institucion_id
      WHERE t.institucion_id = ?
        AND t.puntaje > 0
      ORDER BY t.puntaje DESC, t.objeto_id DESC
      LIMIT 20`
  );

  const tendenciasDeTodas = db.prepare(
    `SELECT t.objeto_tipo, t.objeto_id, t.titulo, t.puntaje, i.nombre AS institucion
       FROM v_tendencias t
       JOIN instituciones i ON i.id = t.institucion_id
      WHERE t.puntaje > 0
      ORDER BY t.puntaje DESC, t.objeto_id DESC
      LIMIT 20`
  );

  app.get(
    "/api/comunidad/tendencias",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "tendencias");
      if (!usuario) return;

      const alcance = req.query?.alcance === "todas-las-escuelas" ? "todas-las-escuelas" : "mi-escuela";

      const filas =
        alcance === "todas-las-escuelas"
          ? tendenciasDeTodas.all()
          : tendenciasDeMiEscuela.all(usuario.institucionId);

      res.json({
        alcance,
        tendencias: filas.map((fila) => ({
          tipo: fila.objeto_tipo,
          id: String(fila.objeto_id),
          titulo: fila.titulo,
          puntaje: fila.puntaje,
          institucion: fila.institucion,
        })),
      });
    })
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ESCRITURA (Etapa 5, secciones 14.4 y 14.5)
  // ----------------------------------------------------------------------------
  // Hasta acá Comunidad solo leía. Ahora se puede publicar, votar, comentar,
  // participar en un debate, denunciar y —si el rol lo permite— eliminar. Todo
  // pasa por permisos del servidor: la vidriera nunca decide quién puede qué.
  // ══════════════════════════════════════════════════════════════════════════

  // Roles con permiso de PUBLICACIÓN en la comunidad general. Preceptor y
  // bibliotecario tienen acceso de solo lectura (misma regla que la vidriera,
  // pero acá es la que manda). El chequeo de página ya dejó pasar a los seis
  // roles con acceso a comunidad; este segundo filtro separa lectura de escritura.
  const PUEDE_PUBLICAR = new Set([
    "estudiante", "profesor", "admin-academico", "centro-estudiantes",
  ]);

  // La institución de un objeto votable/denunciable/comentable. Un comentario no
  // guarda institución: hereda la de su publicación o debate padre. Sirve para
  // impedir votar o comentar el contenido de otra escuela pasando un id al azar.
  function institucionDe(tipo, id) {
    if (tipo === "publicacion") {
      const r = db.prepare(
        "SELECT institucion_id AS ins FROM publicaciones WHERE id = ? AND eliminado_en IS NULL"
      ).get(id);
      return r ? r.ins : null;
    }
    if (tipo === "debate") {
      const r = db.prepare(
        "SELECT institucion_id AS ins FROM debates WHERE id = ? AND eliminado_en IS NULL"
      ).get(id);
      return r ? r.ins : null;
    }
    if (tipo === "comentario") {
      const c = db.prepare(
        "SELECT objeto_tipo AS t, objeto_id AS o FROM comentarios WHERE id = ? AND eliminado_en IS NULL"
      ).get(id);
      return c ? institucionDe(c.t, c.o) : null;
    }
    return null;
  }

  // ── Publicar (Error 2.B.4: publicar de verdad; el feed lo lee de la base) ───
  app.post(
    "/api/comunidad/publicaciones",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "comunidad");
      if (!usuario) return;
      if (!PUEDE_PUBLICAR.has(usuario.rol)) {
        return res.status(403).json({ error: "Tu perfil tiene solo lectura en la comunidad." });
      }

      const contenido = String(req.body?.contenido ?? "").trim();
      const imagenId = req.body?.imagenId != null ? Number(req.body.imagenId) : null;
      if (!contenido) return res.status(400).json({ error: "La publicación está vacía." });

      // El archivo de imagen, si viene, tiene que haberlo subido esta persona.
      let imagen = null;
      if (imagenId) {
        const propia = db.prepare(
          "SELECT id FROM archivos WHERE id = ? AND subido_por = ?"
        ).get(imagenId, usuario.id);
        if (propia) imagen = imagenId;
      }

      const info = db.prepare(
        `INSERT INTO publicaciones (institucion_id, autor_id, contenido, imagen_id)
         VALUES (?, ?, ?, ?)`
      ).run(usuario.institucionId, usuario.id, contenido, imagen);

      res.status(201).json({ id: String(info.lastInsertRowid) });
    })
  );

  // ── Crear debate (Error 3.A.2: creación rica) ──────────────────────────────
  // Lo crean los perfiles participativos. La postura se fija después, y solo
  // participando (14.5): crear el debate no fija ninguna posición.
  app.post(
    "/api/comunidad/debates",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "debates");
      if (!usuario) return;
      if (!PUEDE_PUBLICAR.has(usuario.rol)) {
        return res.status(403).json({ error: "Tu perfil no puede crear debates." });
      }

      const titulo = String(req.body?.titulo ?? "").trim();
      const descripcion = String(req.body?.descripcion ?? "").trim();
      const cierraEnBruto = String(req.body?.cierraEn ?? "").slice(0, 10);
      if (!titulo) return res.status(400).json({ error: "El debate necesita una pregunta." });
      const cierraEn = /^\d{4}-\d{2}-\d{2}$/.test(cierraEnBruto) ? cierraEnBruto : null;

      const info = db.prepare(
        `INSERT INTO debates (institucion_id, autor_id, titulo, descripcion, cierra_en)
         VALUES (?, ?, ?, ?, ?)`
      ).run(usuario.institucionId, usuario.id, titulo, descripcion, cierraEn);

      res.status(201).json({ id: String(info.lastInsertRowid) });
    })
  );

  // ── Votar (Error 2.B.1): único y privado, con regla de alternancia ─────────
  // Tocar el mismo sentido que ya tenía el voto lo QUITA; tocar el otro lo
  // cambia; sin voto previo, lo crea. Un solo voto por persona y objeto lo
  // garantiza el índice UNIQUE de la tabla `votos`.
  app.post(
    "/api/comunidad/voto",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "comunidad");
      if (!usuario) return;

      const tipo = req.body?.objetoTipo;
      const objetoId = Number(req.body?.objetoId);
      const valor = Number(req.body?.valor);
      if (!["publicacion", "debate", "comentario"].includes(tipo)) {
        return res.status(400).json({ error: "Tipo de objeto inválido." });
      }
      if (valor !== 1 && valor !== -1) {
        return res.status(400).json({ error: "El voto solo puede ser a favor o en contra." });
      }
      // El objeto tiene que existir y ser de mi escuela.
      if (institucionDe(tipo, objetoId) !== usuario.institucionId) {
        return res.status(404).json({ error: "Ese contenido no existe en tu comunidad." });
      }

      // La regla de voto vive en comun.js (aplicarVoto): poner / cambiar / sacar,
      // única por persona y objeto. Acá ya validamos que el objeto es de mi
      // escuela; la biblioteca reutiliza la misma función con su propia regla de
      // visibilidad.
      const resultado = aplicarVoto(db, usuario.id, tipo, objetoId, valor);

      res.json({
        miVoto: nombreDeVoto(resultado.miVoto),
        votosAFavor: resultado.votosAFavor,
        votosEnContra: resultado.votosEnContra,
      });
    })
  );

  // ── Detalle con hilo de comentarios (Errores 2.B.2, 2.B.3, 2.B.7) ──────────
  // La misma ventanilla sirve para una publicación o un debate: abre el objeto
  // y todos sus comentarios, con el voto (privado) de quien pregunta en cada uno.
  app.get(
    "/api/comunidad/detalle",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "comunidad");
      if (!usuario) return;

      const tipo = req.query?.tipo;
      const objetoId = Number(req.query?.id);
      if (tipo !== "publicacion" && tipo !== "debate") {
        return res.status(400).json({ error: "Tipo de objeto inválido." });
      }
      if (institucionDe(tipo, objetoId) !== usuario.institucionId) {
        return res.status(404).json({ error: "Ese contenido no existe en tu comunidad." });
      }

      let objeto;
      if (tipo === "publicacion") {
        const p = db.prepare(
          `SELECT p.id, p.contenido, p.creado_en, p.autor_id, u.nombre AS autor, u.rol AS autor_rol,
                  u.avatar_url AS autor_avatar,
                  (SELECT COUNT(*) FROM votos v WHERE v.objeto_tipo='publicacion' AND v.objeto_id=p.id AND v.valor=1)  AS a_favor,
                  (SELECT COUNT(*) FROM votos v WHERE v.objeto_tipo='publicacion' AND v.objeto_id=p.id AND v.valor=-1) AS en_contra,
                  (SELECT v.valor FROM votos v WHERE v.objeto_tipo='publicacion' AND v.objeto_id=p.id AND v.usuario_id=?) AS mi_voto
             FROM publicaciones p JOIN usuarios u ON u.id = p.autor_id
            WHERE p.id = ?`
        ).get(usuario.id, objetoId);
        objeto = {
          tipo, id: String(p.id), titulo: null, contenido: p.contenido,
          autorId: String(p.autor_id),
          autor: p.autor, autorRol: p.autor_rol, autorAvatar: p.autor_avatar ?? null,
          creadoEn: p.creado_en,
          votosAFavor: p.a_favor, votosEnContra: p.en_contra,
          miVoto: p.mi_voto === 1 ? "a-favor" : p.mi_voto === -1 ? "en-contra" : null,
        };
      } else {
        const d = db.prepare(
          `SELECT d.id, d.titulo, d.descripcion, d.creado_en, d.autor_id, u.nombre AS autor, u.rol AS autor_rol,
                  u.avatar_url AS autor_avatar,
                  (SELECT COUNT(*) FROM votos v WHERE v.objeto_tipo='debate' AND v.objeto_id=d.id AND v.valor=1)  AS a_favor,
                  (SELECT COUNT(*) FROM votos v WHERE v.objeto_tipo='debate' AND v.objeto_id=d.id AND v.valor=-1) AS en_contra,
                  (SELECT v.valor FROM votos v WHERE v.objeto_tipo='debate' AND v.objeto_id=d.id AND v.usuario_id=?) AS mi_voto
             FROM debates d JOIN usuarios u ON u.id = d.autor_id
            WHERE d.id = ?`
        ).get(usuario.id, objetoId);
        objeto = {
          tipo, id: String(d.id), titulo: d.titulo, contenido: d.descripcion,
          autorId: String(d.autor_id),
          autor: d.autor, autorRol: d.autor_rol, autorAvatar: d.autor_avatar ?? null,
          creadoEn: d.creado_en,
          votosAFavor: d.a_favor, votosEnContra: d.en_contra,
          miVoto: d.mi_voto === 1 ? "a-favor" : d.mi_voto === -1 ? "en-contra" : null,
        };
      }

      const comentarios = db.prepare(
        `SELECT c.id, c.contenido, c.creado_en, u.nombre AS autor, u.rol AS autor_rol,
                u.avatar_url AS autor_avatar,
                (SELECT COUNT(*) FROM votos v WHERE v.objeto_tipo='comentario' AND v.objeto_id=c.id AND v.valor=1)  AS a_favor,
                (SELECT COUNT(*) FROM votos v WHERE v.objeto_tipo='comentario' AND v.objeto_id=c.id AND v.valor=-1) AS en_contra,
                (SELECT v.valor FROM votos v WHERE v.objeto_tipo='comentario' AND v.objeto_id=c.id AND v.usuario_id=?) AS mi_voto
           FROM comentarios c JOIN usuarios u ON u.id = c.usuario_id
          WHERE c.objeto_tipo = ? AND c.objeto_id = ? AND c.eliminado_en IS NULL
          ORDER BY c.creado_en`
      ).all(usuario.id, tipo, objetoId).map((c) => ({
        id: String(c.id),
        contenido: c.contenido,
        autor: c.autor,
        autorRol: c.autor_rol,
        autorAvatar: c.autor_avatar ?? null,
        creadoEn: c.creado_en,
        votosAFavor: c.a_favor,
        votosEnContra: c.en_contra,
        miVoto: c.mi_voto === 1 ? "a-favor" : c.mi_voto === -1 ? "en-contra" : null,
      }));

      res.json({ objeto, comentarios });
    })
  );

  // ── Comentar (Error 2.B.2): guarda la fila y la devuelve para pintarla ─────
  app.post(
    "/api/comunidad/comentarios",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "comunidad");
      if (!usuario) return;

      const tipo = req.body?.objetoTipo;
      const objetoId = Number(req.body?.objetoId);
      const contenido = String(req.body?.contenido ?? "").trim();
      if (tipo !== "publicacion" && tipo !== "debate") {
        return res.status(400).json({ error: "Solo se comentan publicaciones y debates." });
      }
      if (!contenido) return res.status(400).json({ error: "El comentario está vacío." });
      if (institucionDe(tipo, objetoId) !== usuario.institucionId) {
        return res.status(404).json({ error: "Ese contenido no existe en tu comunidad." });
      }
      // Un debate cerrado se lee pero no se comenta (14.5 paso 4).
      if (tipo === "debate") {
        const d = db.prepare("SELECT cierra_en FROM debates WHERE id = ?").get(objetoId);
        if (d.cierra_en && d.cierra_en < new Date().toISOString().slice(0, 10)) {
          return res.status(409).json({ error: "El debate está cerrado." });
        }
      }

      const info = db.prepare(
        `INSERT INTO comentarios (usuario_id, objeto_tipo, objeto_id, contenido)
         VALUES (?, ?, ?, ?)`
      ).run(usuario.id, tipo, objetoId, contenido);

      res.status(201).json({ id: String(info.lastInsertRowid) });
    })
  );

  // ── Participar (Error 2.B.6 / 14.5): entrar formalmente al debate ──────────
  // Crea la fila SIN postura. Recién con la fila creada se habilita fijar postura.
  app.post(
    "/api/comunidad/debates/:id/participar",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "debates");
      if (!usuario) return;

      const debateId = Number(req.params.id);
      if (institucionDe("debate", debateId) !== usuario.institucionId) {
        return res.status(404).json({ error: "Ese debate no existe en tu comunidad." });
      }
      const d = db.prepare("SELECT cierra_en FROM debates WHERE id = ?").get(debateId);
      if (d.cierra_en && d.cierra_en < new Date().toISOString().slice(0, 10)) {
        return res.status(409).json({ error: "El debate está cerrado." });
      }

      // Idempotente: participar dos veces no rompe ni duplica (UNIQUE debate+usuario).
      db.prepare(
        `INSERT INTO debate_participantes (debate_id, usuario_id, postura)
         VALUES (?, ?, NULL)
         ON CONFLICT (debate_id, usuario_id) DO NOTHING`
      ).run(debateId, usuario.id);

      res.status(201).json({ ok: true });
    })
  );

  // ── Fijar / cambiar postura (14.5 paso 2): exige haber participado ─────────
  app.put(
    "/api/comunidad/debates/:id/postura",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "debates");
      if (!usuario) return;

      const debateId = Number(req.params.id);
      const postura = req.body?.postura;
      if (postura !== "a-favor" && postura !== "en-contra") {
        return res.status(400).json({ error: "La postura solo puede ser a favor o en contra." });
      }
      if (institucionDe("debate", debateId) !== usuario.institucionId) {
        return res.status(404).json({ error: "Ese debate no existe en tu comunidad." });
      }
      const d = db.prepare("SELECT cierra_en FROM debates WHERE id = ?").get(debateId);
      if (d.cierra_en && d.cierra_en < new Date().toISOString().slice(0, 10)) {
        return res.status(409).json({ error: "El debate está cerrado." });
      }
      // La postura solo se fija si ya participó: no se puede votar sin entrar.
      const participa = db.prepare(
        "SELECT id FROM debate_participantes WHERE debate_id = ? AND usuario_id = ?"
      ).get(debateId, usuario.id);
      if (!participa) {
        return res.status(409).json({ error: "Primero tenés que participar en el debate." });
      }

      db.prepare(
        "UPDATE debate_participantes SET postura = ? WHERE debate_id = ? AND usuario_id = ?"
      ).run(postura, debateId, usuario.id);

      res.json({ ok: true });
    })
  );

  // ── Denunciar (Errores 2.B.5 y 2.B.8): estudiante/profesor denuncian ───────
  app.post(
    "/api/comunidad/denuncias",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "comunidad");
      if (!usuario) return;

      const tipo = req.body?.objetoTipo;
      const objetoId = Number(req.body?.objetoId);
      const motivo = String(req.body?.motivo ?? "").trim();
      if (!["publicacion", "debate", "comentario"].includes(tipo)) {
        return res.status(400).json({ error: "Tipo de objeto inválido." });
      }
      if (!motivo) return res.status(400).json({ error: "Contanos el motivo de la denuncia." });
      if (institucionDe(tipo, objetoId) !== usuario.institucionId) {
        return res.status(404).json({ error: "Ese contenido no existe en tu comunidad." });
      }

      db.prepare(
        `INSERT INTO denuncias (denunciante_id, objeto_tipo, objeto_id, motivo)
         VALUES (?, ?, ?, ?)`
      ).run(usuario.id, tipo, objetoId, motivo);

      res.status(201).json({ ok: true });
    })
  );

  // ── Eliminar contenido (borrado suave, 14.4.4 y 14.4.5) ────────────────────
  // Puede eliminar: la dirección y el preceptor (moderan su escuela), el centro
  // de estudiantes SOLO sobre debates, y el autor sobre su propio contenido.
  // Estudiante y profesor comunes no eliminan: denuncian.
  function puedeEliminar(usuario, tipo, autorId) {
    if (usuario.id === autorId) return true;              // el autor borra lo suyo
    if (usuario.rol === "admin-academico") return true;   // dirección
    if (usuario.rol === "preceptor") return true;         // preceptor de la escuela
    if (usuario.rol === "centro-estudiantes" && tipo === "debate") return true;
    return false;
  }

  function autorDe(tipo, id) {
    const tabla = tipo === "publicacion" ? "publicaciones"
      : tipo === "debate" ? "debates"
      : tipo === "comentario" ? "comentarios" : null;
    if (!tabla) return null;
    const col = tipo === "comentario" ? "usuario_id" : "autor_id";
    const r = db.prepare(
      `SELECT ${col} AS autor, eliminado_en FROM ${tabla} WHERE id = ?`
    ).get(id);
    return r ?? null;
  }

  function eliminarContenido(tipo) {
    const tabla = tipo === "publicacion" ? "publicaciones"
      : tipo === "debate" ? "debates" : "comentarios";
    return ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "comunidad");
      if (!usuario) return;

      const id = Number(req.params.id);
      if (institucionDe(tipo, id) !== usuario.institucionId) {
        return res.status(404).json({ error: "Ese contenido no existe en tu comunidad." });
      }
      const fila = autorDe(tipo, id);
      if (!fila || fila.eliminado_en) {
        return res.status(404).json({ error: "Ese contenido no existe." });
      }
      if (!puedeEliminar(usuario, tipo, fila.autor)) {
        return res.status(403).json({ error: "Tu perfil no puede eliminar este contenido; podés denunciarlo." });
      }

      db.prepare(
        `UPDATE ${tabla} SET eliminado_en = datetime('now'), eliminado_por = ? WHERE id = ?`
      ).run(usuario.id, id);
      res.json({ ok: true });
    });
  }

  app.delete("/api/comunidad/publicaciones/:id", eliminarContenido("publicacion"));
  app.delete("/api/comunidad/debates/:id", eliminarContenido("debate"));
  app.delete("/api/comunidad/comentarios/:id", eliminarContenido("comentario"));

  // ── Bandeja de moderación (14.4.4): las denuncias pendientes ───────────────
  // Solo la dirección y el preceptor. La página `moderacion-comunidad` de
  // permisos.js decide quién entra.
  app.get(
    "/api/comunidad/denuncias",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "moderacion-comunidad");
      if (!usuario) return;

      // Cada denuncia con un extracto del contenido señalado, para poder decidir
      // sin salir de la bandeja. Solo las de esta institución y sin resolver.
      const filas = db.prepare(
        `SELECT de.id, de.objeto_tipo, de.objeto_id, de.motivo, de.creado_en,
                u.nombre AS denunciante,
                CASE de.objeto_tipo
                  WHEN 'publicacion' THEN (SELECT substr(contenido,1,120) FROM publicaciones WHERE id = de.objeto_id)
                  WHEN 'debate'      THEN (SELECT titulo FROM debates WHERE id = de.objeto_id)
                  WHEN 'comentario'  THEN (SELECT substr(contenido,1,120) FROM comentarios WHERE id = de.objeto_id)
                END AS extracto,
                CASE de.objeto_tipo
                  WHEN 'publicacion' THEN (SELECT eliminado_en FROM publicaciones WHERE id = de.objeto_id)
                  WHEN 'debate'      THEN (SELECT eliminado_en FROM debates WHERE id = de.objeto_id)
                  WHEN 'comentario'  THEN (SELECT eliminado_en FROM comentarios WHERE id = de.objeto_id)
                END AS objeto_eliminado
           FROM denuncias de
           JOIN usuarios u ON u.id = de.denunciante_id
          WHERE de.resuelta_en IS NULL
            AND EXISTS (
              SELECT 1 FROM usuarios ud WHERE ud.id = de.denunciante_id
                AND ud.institucion_id = ?
            )
          ORDER BY de.creado_en DESC`
      ).all(usuario.institucionId).map((f) => ({
        id: String(f.id),
        objetoTipo: f.objeto_tipo,
        objetoId: String(f.objeto_id),
        motivo: f.motivo,
        creadoEn: f.creado_en,
        denunciante: f.denunciante,
        extracto: f.extracto ?? "(contenido no disponible)",
        objetoEliminado: f.objeto_eliminado !== null,
      }));

      res.json({ denuncias: filas });
    })
  );

  // ── Resolver una denuncia (14.4.4): eliminar el contenido o descartar ──────
  app.put(
    "/api/comunidad/denuncias/:id",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "moderacion-comunidad");
      if (!usuario) return;

      const denunciaId = Number(req.params.id);
      const resultado = req.body?.resultado;
      if (resultado !== "contenido-eliminado" && resultado !== "descartada") {
        return res.status(400).json({ error: "Resultado inválido." });
      }

      const den = db.prepare(
        "SELECT objeto_tipo AS t, objeto_id AS o, resuelta_en FROM denuncias WHERE id = ?"
      ).get(denunciaId);
      if (!den) return res.status(404).json({ error: "Esa denuncia no existe." });
      if (den.resuelta_en) return res.status(409).json({ error: "Esa denuncia ya fue resuelta." });
      if (institucionDe(den.t, den.o) !== usuario.institucionId && resultado === "contenido-eliminado") {
        // Si el contenido ya no está o es de otra escuela, no se puede eliminar;
        // se puede descartar igual.
        return res.status(404).json({ error: "Ese contenido ya no está disponible." });
      }

      if (resultado === "contenido-eliminado") {
        const tabla = den.t === "publicacion" ? "publicaciones"
          : den.t === "debate" ? "debates" : "comentarios";
        db.prepare(
          `UPDATE ${tabla} SET eliminado_en = datetime('now'), eliminado_por = ?
            WHERE id = ? AND eliminado_en IS NULL`
        ).run(usuario.id, den.o);
      }

      db.prepare(
        `UPDATE denuncias
            SET resuelta_en = datetime('now'), resuelta_por = ?, resultado = ?
          WHERE id = ?`
      ).run(usuario.id, resultado, denunciaId);

      res.json({ ok: true });
    })
  );
}
