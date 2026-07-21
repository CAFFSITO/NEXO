// ============================================================================
// NEXO — Ventanilla de Chat (Etapa 2, pantalla 6)
// ----------------------------------------------------------------------------
//   GET /api/chat/conversaciones            → mis conversaciones
//   GET /api/chat/conversaciones/:id/mensajes → el hilo de una de ellas
//
// Hasta ahora el chat era el caso más extremo de la maqueta: cinco listas de
// conversaciones escritas a mano, una por rol, con gente que no existe. Incluía
// la conversación del Error 2.F.6, donde el Prof. García decía "Hola, tengo una
// duda sobre el material" y la alumna le contestaba "¿Cuál es tu pregunta?":
// los papeles estaban al revés porque nadie revisó los diálogos inventados.
// Al leer de `mensajes`, esa incoherencia no puede volver: cada mensaje tiene
// un autor de verdad.
//
// Qué NO hace esta etapa: enviar. Escribir un mensaje sigue sin llegarle a
// nadie (Error 2.F.4) y abrir una conversación todavía no borra el globito de
// no leídos (Error 2.F.5), porque las dos cosas son escritura y necesitan al
// mensajero de la Etapa 6. Lo que ya es real es QUÉ conversaciones tenés, con
// quién, qué se dijeron y cuántos mensajes no leíste.
// ============================================================================

import { exigirAcceso, ventanilla } from "./comun.js";

/**
 * Asegura que un curso tenga su "comunidad" (Error 7.A.5): una conversación de
 * tipo grupo-curso con el preceptor y todos los estudiantes inscriptos adentro,
 * como un grupo de WhatsApp del curso. Es idempotente: si ya existe, solo suma
 * los miembros que falten (por ejemplo, un alumno inscripto después). Devuelve
 * el id de la conversación, o null si el curso no existe.
 *
 * Vive acá y no en una migración porque la comunidad de un curso es, por dentro,
 * exactamente una conversación de chat (sección 14.2): se reutiliza la misma
 * pieza en vez de inventar un módulo paralelo.
 */
export function asegurarComunidadCurso(db, cursoId) {
  const curso = db
    .prepare("SELECT id, preceptor_id FROM cursos WHERE id = ?")
    .get(cursoId);
  if (!curso) return null;

  let conv = db
    .prepare(
      "SELECT id FROM conversaciones WHERE tipo = 'grupo-curso' AND curso_id = ?"
    )
    .get(cursoId);

  if (!conv) {
    const info = db
      .prepare(
        "INSERT INTO conversaciones (tipo, curso_id) VALUES ('grupo-curso', ?)"
      )
      .run(cursoId);
    conv = { id: info.lastInsertRowid };
  }

  const sumarMiembro = db.prepare(
    `INSERT OR IGNORE INTO conversacion_miembros (conversacion_id, usuario_id)
     VALUES (?, ?)`
  );
  if (curso.preceptor_id) sumarMiembro.run(conv.id, curso.preceptor_id);
  const inscriptos = db
    .prepare("SELECT estudiante_id FROM inscripciones WHERE curso_id = ?")
    .all(cursoId);
  for (const i of inscriptos) sumarMiembro.run(conv.id, i.estudiante_id);

  return conv.id;
}

/**
 * Asegura que exista la conversación DIRECTA (privada, dos personas) entre
 * `unoId` y `otroId`, y devuelve su id. Es idempotente: si ya se escribieron
 * antes, retoma la misma conversación en vez de abrir una nueva.
 *
 * La usa "responder un comunicado" (14.13): la familia no escribe sobre el
 * comunicado —que verían todas las familias— sino que abre su charla privada
 * con el preceptor (Error 10.A.2). Vive acá, junto a `asegurarComunidadCurso`,
 * porque una respuesta privada es, por dentro, una conversación de chat: se
 * reutiliza la pieza en vez de inventar un canal paralelo (sección 1.4).
 */
export function asegurarConversacionDirecta(db, unoId, otroId) {
  if (unoId === otroId) return null;

  // Una directa cuyos DOS únicos miembros son estos dos. El conteo = 2 evita
  // confundirla con un grupo que casualmente los contenga a ambos.
  const existente = db
    .prepare(
      `SELECT c.id
         FROM conversaciones c
        WHERE c.tipo = 'directa'
          AND EXISTS (SELECT 1 FROM conversacion_miembros m
                       WHERE m.conversacion_id = c.id AND m.usuario_id = ?)
          AND EXISTS (SELECT 1 FROM conversacion_miembros m
                       WHERE m.conversacion_id = c.id AND m.usuario_id = ?)
          AND (SELECT COUNT(*) FROM conversacion_miembros m
                WHERE m.conversacion_id = c.id) = 2
        LIMIT 1`
    )
    .get(unoId, otroId);
  if (existente) return existente.id;

  const info = db
    .prepare("INSERT INTO conversaciones (tipo) VALUES ('directa')")
    .run();
  const sumar = db.prepare(
    `INSERT OR IGNORE INTO conversacion_miembros (conversacion_id, usuario_id)
     VALUES (?, ?)`
  );
  sumar.run(info.lastInsertRowid, unoId);
  sumar.run(info.lastInsertRowid, otroId);
  return info.lastInsertRowid;
}

/**
 * Asegura la conversación de la CLASE en vivo (Error 3.B.7, sección 14.3 paso 8):
 * una conversación de tipo "clase" ligada a `claseId`, con el docente de la
 * cátedra y todos los estudiantes inscriptos adentro. Es idempotente: si ya
 * existe, solo suma los miembros que falten (por ejemplo, `sumarUsuarioId`, un
 * alumno que entró más tarde). Devuelve el id de la conversación.
 *
 * Vive acá y no en el aula porque el chat de la clase NO es un canal nuevo: es
 * exactamente una conversación de chat (14.2), así que se reutiliza la pieza en
 * vez de duplicarla (sección 1.4). Al reusarla, "enviar", "marcar leído" y los
 * no-leídos ya funcionan sin escribir una línea más.
 */
export function asegurarConversacionClase(db, claseId, sumarUsuarioId) {
  const clase = db
    .prepare(
      `SELECT cp.id, c.profesor_id, c.curso_id
         FROM clases_planificadas cp
         JOIN catedras c ON c.id = cp.catedra_id
        WHERE cp.id = ?`
    )
    .get(claseId);
  if (!clase) return null;

  let conv = db
    .prepare("SELECT id FROM conversaciones WHERE tipo = 'clase' AND clase_id = ?")
    .get(claseId);
  if (!conv) {
    const info = db
      .prepare("INSERT INTO conversaciones (tipo, clase_id) VALUES ('clase', ?)")
      .run(claseId);
    conv = { id: info.lastInsertRowid };
  }

  const sumarMiembro = db.prepare(
    `INSERT OR IGNORE INTO conversacion_miembros (conversacion_id, usuario_id) VALUES (?, ?)`
  );
  if (clase.profesor_id) sumarMiembro.run(conv.id, clase.profesor_id);
  const inscriptos = db
    .prepare("SELECT estudiante_id FROM inscripciones WHERE curso_id = ?")
    .all(clase.curso_id);
  for (const i of inscriptos) sumarMiembro.run(conv.id, i.estudiante_id);
  if (sumarUsuarioId) sumarMiembro.run(conv.id, sumarUsuarioId);

  return conv.id;
}

export function registrarChat(app, db, mensajero, notificaciones) {
  // Mis conversaciones, con su último mensaje y sus no leídos.
  //
  // Los no leídos salen de la vista `v_no_leidos` del esquema, que los define
  // como "mensajes de otros posteriores a mi última lectura". No es un número
  // guardado que alguien tenga que acordarse de bajar: es una comparación de
  // fechas, así que no puede quedar pegado en "2" para siempre.
  const misConversaciones = db.prepare(
    `SELECT c.id,
            c.tipo,
            c.curso_id,
            cu.anio,
            cu.division,
            COALESCE(nl.no_leidos, 0) AS no_leidos,
            um.enviado_en   AS ultimo_en,
            um.contenido    AS ultimo_contenido,
            um.archivo_id   AS ultimo_archivo
       FROM conversacion_miembros yo
       JOIN conversaciones c ON c.id = yo.conversacion_id
       LEFT JOIN cursos cu   ON cu.id = c.curso_id
       LEFT JOIN v_no_leidos nl
              ON nl.conversacion_id = c.id AND nl.usuario_id = yo.usuario_id
       LEFT JOIN mensajes um
              ON um.id = (SELECT m.id FROM mensajes m
                           WHERE m.conversacion_id = c.id
                             AND m.eliminado_en IS NULL
                           ORDER BY m.enviado_en DESC, m.id DESC
                           LIMIT 1)
      WHERE yo.usuario_id = ?
      ORDER BY um.enviado_en DESC NULLS LAST, c.id`
  );

  // Con quién hablo en una conversación directa: el otro miembro. El nombre de
  // la conversación no se guarda, se deduce de quiénes están adentro.
  const otrosMiembros = db.prepare(
    `SELECT u.id, u.nombre, u.rol, u.avatar_url
       FROM conversacion_miembros cm
       JOIN usuarios u ON u.id = cm.usuario_id
      WHERE cm.conversacion_id = ?
        AND cm.usuario_id <> ?
      ORDER BY u.nombre`
  );

  /** Cómo se llama una conversación en la lista, según su tipo. */
  function nombrarConversacion(fila, otros) {
    if (fila.tipo === "grupo-curso") {
      return fila.anio ? `Comunidad ${fila.anio}° ${fila.division}` : "Comunidad del curso";
    }
    if (fila.tipo === "clase") return "Chat de la clase";
    if (otros.length === 0) return "Conversación vacía";
    return otros.map((o) => o.nombre).join(", ");
  }

  app.get(
    "/api/chat/conversaciones",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "chat");
      if (!usuario) return;

      const conversaciones = misConversaciones.all(usuario.id).map((fila) => {
        const otros = otrosMiembros.all(fila.id, usuario.id);

        return {
          id: String(fila.id),
          tipo: fila.tipo,
          nombre: nombrarConversacion(fila, otros),
          // Solo en las directas hay "un" avatar: en un grupo no hay una cara.
          avatarUrl: fila.tipo === "directa" ? otros[0]?.avatar_url ?? undefined : undefined,
          participantes: otros.map((o) => ({ id: o.id, nombre: o.nombre, rol: o.rol })),
          ultimoMensaje: fila.ultimo_contenido ?? (fila.ultimo_archivo ? "Archivo adjunto" : ""),
          ultimoEn: fila.ultimo_en ?? null,
          noLeidos: fila.no_leidos,
        };
      });

      res.json({ conversaciones });
    })
  );

  // ── El hilo de una conversación ───────────────────────────────────────────
  // La pregunta importante de esta ventanilla no es "¿qué mensajes hay?" sino
  // "¿sos miembro de esta conversación?". Sin esa comprobación, cambiar el
  // número de la dirección web dejaría leer la conversación de dos personas
  // cualesquiera. Por eso el filtro es por membresía y no por el id a secas.
  const soyMiembro = db.prepare(
    `SELECT 1 FROM conversacion_miembros
      WHERE conversacion_id = ? AND usuario_id = ?`
  );

  const mensajesDe = db.prepare(
    `SELECT m.id,
            m.autor_id,
            m.contenido,
            m.enviado_en,
            u.nombre     AS autor,
            u.avatar_url AS autor_avatar,
            a.nombre_original AS archivo
       FROM mensajes m
       JOIN usuarios u      ON u.id = m.autor_id
       LEFT JOIN archivos a ON a.id = m.archivo_id
      WHERE m.conversacion_id = ?
        AND m.eliminado_en IS NULL
      ORDER BY m.enviado_en, m.id`
  );

  app.get(
    "/api/chat/conversaciones/:id/mensajes",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "chat");
      if (!usuario) return;

      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: "Esa conversación no existe." });
      }

      if (!soyMiembro.get(id, usuario.id)) {
        // "No sos parte de esta conversación" y no "no existe": la persona ya
        // sabe que existe, la está mirando. Mentirle no protege nada.
        return res
          .status(403)
          .json({ error: "No sos parte de esta conversación." });
      }

      const mensajes = mensajesDe.all(id).map((fila) => ({
        id: String(fila.id),
        autorId: fila.autor_id,
        autor: fila.autor,
        autorAvatar: fila.autor_avatar ?? undefined,
        // "mío" o "de otro" se decide comparando con quien pregunta, acá. La
        // pantalla no puede decidirlo: los mensajes de ejemplo traían un
        // "sender" escrito a mano, y por eso el profesor hablaba como alumna.
        mio: fila.autor_id === usuario.id,
        contenido: fila.contenido,
        archivo: fila.archivo ?? null,
        enviadoEn: fila.enviado_en,
      }));

      res.json({ mensajes });
    })
  );

  // ── Enviar un mensaje (Error 2.F.4: antes no viajaba a ningún lado) ─────────
  // Guarda la fila en `mensajes`, marca la conversación como leída para quien
  // escribe (su propio mensaje no le cuenta como no leído), avisa en vivo a los
  // demás miembros por el mensajero y les deja una notificación pendiente.
  const miembrosDe = db.prepare(
    "SELECT usuario_id FROM conversacion_miembros WHERE conversacion_id = ?"
  );
  const insertarMensaje = db.prepare(
    `INSERT INTO mensajes (conversacion_id, autor_id, contenido, archivo_id)
     VALUES (?, ?, ?, ?)`
  );
  const marcarLeidaAhora = db.prepare(
    `UPDATE conversacion_miembros
        SET ultimo_leido_en = datetime('now')
      WHERE conversacion_id = ? AND usuario_id = ?`
  );
  const archivoPropio = db.prepare(
    "SELECT id FROM archivos WHERE id = ? AND subido_por = ?"
  );
  const datosConversacion = db.prepare(
    "SELECT tipo, curso_id FROM conversaciones WHERE id = ?"
  );

  app.post(
    "/api/chat/conversaciones/:id/mensajes",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "chat");
      if (!usuario) return;

      const id = Number(req.params.id);
      if (!Number.isInteger(id) || !soyMiembro.get(id, usuario.id)) {
        return res.status(403).json({ error: "No sos parte de esta conversación." });
      }

      const contenido = String(req.body?.contenido ?? "").trim();
      const archivoBruto = req.body?.archivoId;
      let archivoId = null;
      if (archivoBruto !== undefined && archivoBruto !== null && archivoBruto !== "") {
        archivoId = Number(archivoBruto);
        // El adjunto tiene que ser un archivo que subió ESTA persona: no puede
        // colgar de su mensaje el archivo de otro pasando un número al azar.
        if (!Number.isInteger(archivoId) || !archivoPropio.get(archivoId, usuario.id)) {
          return res.status(400).json({ error: "Ese adjunto no es válido." });
        }
      }

      // Un mensaje vacío sin adjunto no es un mensaje.
      if (!contenido && archivoId === null) {
        return res.status(400).json({ error: "El mensaje está vacío." });
      }

      const info = insertarMensaje.run(id, usuario.id, contenido, archivoId);
      marcarLeidaAhora.run(id, usuario.id);

      const fila = mensajesDe.all(id).find((m) => m.id === Number(info.lastInsertRowid));
      const mensaje = {
        id: String(info.lastInsertRowid),
        autorId: usuario.id,
        autor: usuario.nombre,
        autorAvatar: usuario.avatarUrl,
        contenido,
        archivo: fila?.archivo ?? null,
        enviadoEn: fila?.enviado_en ?? new Date().toISOString(),
      };

      // Avisar a los demás miembros: en vivo por el mensajero (si están mirando,
      // el mensaje entra solo) y con una notificación pendiente (si no).
      const conv = datosConversacion.get(id);
      const titulo =
        conv?.tipo === "grupo-curso"
          ? "Mensaje nuevo en la comunidad del curso"
          : `Mensaje de ${usuario.nombre}`;

      for (const m of miembrosDe.all(id)) {
        if (m.usuario_id === usuario.id) continue;
        mensajero.emitirA(m.usuario_id, {
          tipo: "mensaje",
          conversacionId: String(id),
          mensaje: { ...mensaje, mio: false },
        });
        notificaciones.crear({
          usuarioId: m.usuario_id,
          tipo: "mensaje",
          titulo,
          cuerpo: contenido || "Archivo adjunto",
          objetoTipo: "conversacion",
          objetoId: id,
        });
      }

      // Al que escribe le devolvemos el mensaje ya con "mio: true".
      res.status(201).json({ mensaje: { ...mensaje, mio: true } });
    })
  );

  // ── Marcar una conversación como leída (Error 2.F.5) ────────────────────────
  // Abrir la conversación mueve la marca `ultimo_leido_en` a ahora; como los no
  // leídos son "mensajes posteriores a esa marca", el globito se pone en cero.
  // Leer ahora cuenta como leer: ya no hace falta responder para bajarlo.
  app.post(
    "/api/chat/conversaciones/:id/leer",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "chat");
      if (!usuario) return;

      const id = Number(req.params.id);
      if (!Number.isInteger(id) || !soyMiembro.get(id, usuario.id)) {
        return res.status(403).json({ error: "No sos parte de esta conversación." });
      }
      marcarLeidaAhora.run(id, usuario.id);
      res.json({ ok: true });
    })
  );

  // ── Comunidad del curso: entrar al grupo (Error 7.A.5) ──────────────────────
  // Asegura que el curso tenga su grupo y que quien pide sea miembro (preceptor
  // a cargo o alumno inscripto). Devuelve el id de la conversación para abrirla.
  app.post(
    "/api/chat/curso/:cursoId/comunidad",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "chat");
      if (!usuario) return;

      const cursoId = Number(req.params.cursoId);
      const curso = Number.isInteger(cursoId)
        ? db.prepare("SELECT preceptor_id FROM cursos WHERE id = ?").get(cursoId)
        : null;
      if (!curso) return res.status(404).json({ error: "Ese curso no existe." });

      const inscripto = db
        .prepare("SELECT 1 FROM inscripciones WHERE curso_id = ? AND estudiante_id = ?")
        .get(cursoId, usuario.id);
      if (curso.preceptor_id !== usuario.id && !inscripto) {
        return res.status(403).json({ error: "No pertenecés a ese curso." });
      }

      const convId = asegurarComunidadCurso(db, cursoId);
      res.json({ conversacionId: String(convId) });
    })
  );

  // ── Moderación del preceptor (Error 7.A.3) ──────────────────────────────────
  // Los cursos a cargo del preceptor. Cada uno trae su comunidad (grupo-curso)
  // asegurada, para poder abrirla al moderar.
  app.get(
    "/api/chat/mis-cursos-preceptor",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "mis-cursos-preceptor");
      if (!usuario) return;

      const cursos = db
        .prepare(
          `SELECT c.id, c.anio, c.division,
                  (SELECT COUNT(*) FROM inscripciones i WHERE i.curso_id = c.id) AS estudiantes
             FROM cursos c
            WHERE c.preceptor_id = ?
            ORDER BY c.anio, c.division`
        )
        .all(usuario.id)
        .map((c) => ({
          id: String(c.id),
          nombre: `${c.anio}° ${c.division}`,
          estudiantes: c.estudiantes,
          comunidadId: String(asegurarComunidadCurso(db, c.id)),
        }));

      res.json({ cursos });
    })
  );

  // Las conversaciones a moderar de un curso: la comunidad del curso y las
  // charlas directas entre dos estudiantes de ese curso. La regla de convivencia
  // (14.2 paso 6) es que esas charlas son visibles para el preceptor; las de
  // familia–preceptor o familia–dirección NO aparecen acá (son privadas).
  app.get(
    "/api/chat/moderacion/:cursoId",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "mis-cursos-preceptor");
      if (!usuario) return;

      const cursoId = Number(req.params.cursoId);
      const curso = Number.isInteger(cursoId)
        ? db.prepare("SELECT preceptor_id FROM cursos WHERE id = ?").get(cursoId)
        : null;
      if (!curso) return res.status(404).json({ error: "Ese curso no existe." });
      if (curso.preceptor_id !== usuario.id) {
        return res.status(403).json({ error: "Ese curso no está a tu cargo." });
      }

      const conversaciones = conversacionesModerables(db, cursoId).map((c) => {
        const otros = db
          .prepare(
            `SELECT u.nombre FROM conversacion_miembros cm
               JOIN usuarios u ON u.id = cm.usuario_id
              WHERE cm.conversacion_id = ?
              ORDER BY u.nombre`
          )
          .all(c.id);
        const ultimo = db
          .prepare(
            `SELECT contenido, archivo_id FROM mensajes
              WHERE conversacion_id = ? AND eliminado_en IS NULL
              ORDER BY enviado_en DESC, id DESC LIMIT 1`
          )
          .get(c.id);
        return {
          id: String(c.id),
          tipo: c.tipo,
          nombre:
            c.tipo === "grupo-curso"
              ? "Comunidad del curso"
              : otros.map((o) => o.nombre).join(" ↔ "),
          ultimoMensaje: ultimo?.contenido ?? (ultimo?.archivo_id ? "Archivo adjunto" : ""),
        };
      });

      res.json({ conversaciones });
    })
  );

  // Leer el hilo de una conversación que se está MODERANDO. Es una ventanilla
  // aparte de la de miembros: el preceptor no es miembro de la charla entre dos
  // alumnos, pero sí puede moderarla si es de su curso. La regla se decide acá.
  app.get(
    "/api/chat/moderacion/:cursoId/:conversacionId/mensajes",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "mis-cursos-preceptor");
      if (!usuario) return;

      const cursoId = Number(req.params.cursoId);
      const convId = Number(req.params.conversacionId);
      const curso = Number.isInteger(cursoId)
        ? db.prepare("SELECT preceptor_id FROM cursos WHERE id = ?").get(cursoId)
        : null;
      if (!curso || curso.preceptor_id !== usuario.id) {
        return res.status(403).json({ error: "Ese curso no está a tu cargo." });
      }

      // La conversación pedida tiene que estar entre las moderables del curso:
      // si no, el preceptor no puede leerla (aunque sepa el número).
      const moderable = conversacionesModerables(db, cursoId).some((c) => c.id === convId);
      if (!moderable) {
        return res.status(403).json({ error: "Esa conversación no es de tu curso." });
      }

      const mensajes = mensajesDe.all(convId).map((fila) => ({
        id: String(fila.id),
        autorId: fila.autor_id,
        autor: fila.autor,
        mio: false, // el preceptor modera: ningún mensaje es "suyo"
        contenido: fila.contenido,
        archivo: fila.archivo ?? null,
        enviadoEn: fila.enviado_en,
      }));

      res.json({ mensajes });
    })
  );
}

/**
 * Las conversaciones que un preceptor puede moderar de un curso: la comunidad
 * (grupo-curso) y las charlas directas donde TODOS los miembros son estudiantes
 * inscriptos en ese curso. Una directa alumno–profesor o familia–preceptor no
 * entra: solo las de convivencia entre estudiantes (14.2, paso 6).
 */
function conversacionesModerables(db, cursoId) {
  return db
    .prepare(
      `SELECT c.id, c.tipo
         FROM conversaciones c
        WHERE (c.tipo = 'grupo-curso' AND c.curso_id = ?)
           OR (
             c.tipo = 'directa'
             AND NOT EXISTS (
               -- ningún miembro queda fuera del curso: todos inscriptos en él
               SELECT 1 FROM conversacion_miembros cm
                WHERE cm.conversacion_id = c.id
                  AND cm.usuario_id NOT IN (
                    SELECT estudiante_id FROM inscripciones WHERE curso_id = ?
                  )
             )
             AND EXISTS (
               SELECT 1 FROM conversacion_miembros cm WHERE cm.conversacion_id = c.id
             )
           )
        ORDER BY (c.tipo = 'grupo-curso') DESC, c.id`
    )
    .all(cursoId, cursoId);
}
