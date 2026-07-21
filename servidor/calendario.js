// ============================================================================
// NEXO — Ventanillas de Calendario y Comunicados (Etapas 2 y 7)
// ----------------------------------------------------------------------------
//   GET    /api/calendario                 → mis eventos + los feriados
//   POST   /api/calendario/eventos         → crear evento (según mi rol)
//   PUT    /api/calendario/eventos/:id     → editar un evento propio
//   DELETE /api/calendario/eventos/:id     → borrar un evento propio
//
//   GET    /api/comunicados                → los comunicados que me tocan (familia)
//   GET    /api/comunicados/enviados       → los que emití, con lectura confirmada
//   POST   /api/comunicados                → emitir un comunicado (preceptor/dirección)
//   POST   /api/comunicados/:id/leer       → registrar que lo leí
//   POST   /api/comunicados/:id/responder  → abrir/retomar el chat privado con el emisor
//
// Lo importante de este archivo es QUIÉN VE QUÉ y QUIÉN PUEDE EDITAR QUÉ. Un
// solo calendario para toda la institución (14.12): visible para todos, editable
// por algunos. Cada evento declara sus capas de visibilidad en
// `evento_visibilidad`; la consulta las respeta para que la "cita con los padres
// de Julieta" no viaje al navegador de todo el colegio (regla de oro 4). Y al
// CREAR, el servidor comprueba que el rol pueda dar esa visibilidad: el preceptor
// solo a su curso (Error 7.B.1), el centro solo eventos propios (Error 8.C.1),
// la dirección cualquiera. Esconder el botón "Nuevo evento" no alcanzaría.
// ============================================================================

import { exigirAcceso, exigirSesion, ventanilla } from "./comun.js";
import { asegurarConversacionDirecta } from "./chat.js";

/** Quiénes son "docentes" a los fines de la visibilidad de un evento. */
const ROLES_DOCENTES = "('profesor','preceptor','admin-academico')";

/** Cuántos eventos por mes puede crear el Centro de Estudiantes (Error 8.B.3). */
const LIMITE_MENSUAL_CENTRO = 5;

export function registrarCalendario(app, db, notificaciones) {
  // ── Lectura del calendario (Etapa 2) ──────────────────────────────────────
  // Un evento se ve si ALGUNA de sus capas de visibilidad me alcanza.
  //
  // Los parámetros son ?1 institución, ?2 mi id, ?3 mi rol. El grupo de OR de
  // abajo es, línea por línea, la lista de alcances del esquema.
  const misEventos = db.prepare(
    `SELECT DISTINCT
            e.id, e.titulo, e.tipo, e.descripcion, e.lugar,
            e.fecha, e.hora_inicio, e.hora_fin, e.creado_en,
            e.creador_id,
            u.nombre AS creador,
            u.rol    AS creador_rol
       FROM v_eventos_vigentes e
       JOIN usuarios u ON u.id = e.creador_id
       JOIN evento_visibilidad ev ON ev.evento_id = e.id
      WHERE e.institucion_id = ?1
        AND (
          -- Quien creó el evento siempre lo ve, sea cual sea su alcance. No
          -- está en la tabla de visibilidad y hace falta: la dirección crea la
          -- cita con los padres de Julieta con alcance "solo esa familia", y
          -- sin esta línea el evento desaparece de su propio calendario.
          e.creador_id = ?2

          -- Toda la comunidad.
          OR ev.alcance = 'todos'

          -- El curso: sus estudiantes y también las familias de esos
          -- estudiantes (el esquema lo dice: "alumnos del curso + sus familias").
          OR (ev.alcance = 'curso' AND (
                EXISTS (SELECT 1 FROM inscripciones i
                         WHERE i.curso_id = ev.curso_id AND i.estudiante_id = ?2)
             OR EXISTS (SELECT 1 FROM familiares f
                          JOIN inscripciones i ON i.estudiante_id = f.estudiante_id
                         WHERE f.usuario_familia_id = ?2 AND i.curso_id = ev.curso_id)
          ))

          -- Solo las familias de un curso: el alumno NO lo ve. Por eso pregunta
          -- por el vínculo familiar y no por la inscripción.
          OR (ev.alcance = 'familias-curso' AND EXISTS (
                SELECT 1 FROM familiares f
                  JOIN inscripciones i ON i.estudiante_id = f.estudiante_id
                 WHERE f.usuario_familia_id = ?2 AND i.curso_id = ev.curso_id))

          -- Solo la familia de un alumno puntual.
          OR (ev.alcance = 'familia-de-estudiante' AND EXISTS (
                SELECT 1 FROM familiares f
                 WHERE f.usuario_familia_id = ?2
                   AND f.estudiante_id = ev.estudiante_id))

          -- Todas las familias.
          OR (ev.alcance = 'familias-todas' AND ?3 = 'familia')

          -- Solo el equipo docente.
          OR (ev.alcance = 'docentes' AND ?3 IN ${ROLES_DOCENTES})
        )
      ORDER BY e.fecha, e.hora_inicio`
  );

  // Los feriados no tienen institución ni visibilidad: son del país y los ve
  // todo el mundo. La pantalla traía dos de 2025 escritos a mano.
  const feriados = db.prepare("SELECT fecha, nombre FROM feriados ORDER BY fecha");

  app.get(
    "/api/calendario",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "calendario-institucional");
      if (!usuario) return;

      // "Editable por algunos" (Error 6.E.9): la pantalla necesita saber si
      // ESTE usuario puede crear/editar para mostrar (o no) el botón. La verdad
      // igual la vuelve a decidir el servidor al recibir el POST; esto es solo
      // para no ofrecer una acción que después va a rechazar.
      const puedeEditar = ROLES_EDITAN.includes(usuario.rol);

      res.json({
        puedeEditar,
        eventos: misEventos
          .all(usuario.institucionId, usuario.id, usuario.rol)
          .map((fila) => ({
            id: String(fila.id),
            titulo: fila.titulo,
            // Texto libre a propósito (Error 6.E.4): la pantalla tiene cuatro
            // colores para cuatro tipos, pero el tipo real es lo que escribió
            // quien creó el evento. Sale como está y la pantalla se arregla.
            tipo: fila.tipo,
            descripcion: fila.descripcion,
            lugar: fila.lugar ?? undefined,
            fecha: fila.fecha,
            horaInicio: fila.hora_inicio ?? undefined,
            horaFin: fila.hora_fin ?? undefined,
            creador: fila.creador,
            creadorRol: fila.creador_rol,
            // Solo el dueño (o la dirección) puede tocarlo: la pantalla usa esto
            // para el menú de tres puntos del evento, pero el permiso real se
            // revalida en el PUT/DELETE.
            esMio: fila.creador_id === usuario.id,
          })),
        feriados: feriados.all(),
      });
    })
  );

  // ── Destinos de visibilidad según el rol (para armar el selector) ─────────
  // La pantalla necesita saber QUÉ capas puede ofrecer este usuario y con qué
  // cursos/alumnos, para no mostrar opciones que el servidor va a rechazar. La
  // verdad final igual la decide `validarVisibilidad` al crear (regla de oro 4);
  // esto solo evita ofrecer lo imposible.
  const cursosDeInstitucion = db.prepare(
    "SELECT id, anio, division FROM cursos WHERE institucion_id = ? ORDER BY anio, division"
  );
  const cursosDelPreceptor = db.prepare(
    "SELECT id, anio, division FROM cursos WHERE preceptor_id = ? ORDER BY anio, division"
  );
  const cursosDelProfesor = db.prepare(
    `SELECT DISTINCT c.id, c.anio, c.division
       FROM catedras ca JOIN cursos c ON c.id = ca.curso_id
      WHERE ca.profesor_id = ? ORDER BY c.anio, c.division`
  );
  const estudiantesDeInstitucion = db.prepare(
    `SELECT u.id, u.nombre, c.anio, c.division
       FROM usuarios u
       JOIN inscripciones i ON i.estudiante_id = u.id
       JOIN cursos c ON c.id = i.curso_id
      WHERE u.institucion_id = ? AND u.rol = 'estudiante'
      ORDER BY c.anio, c.division, u.nombre`
  );
  const estudiantesDelPreceptor = db.prepare(
    `SELECT u.id, u.nombre, c.anio, c.division
       FROM usuarios u
       JOIN inscripciones i ON i.estudiante_id = u.id
       JOIN cursos c ON c.id = i.curso_id
      WHERE c.preceptor_id = ? AND u.rol = 'estudiante'
      ORDER BY c.anio, c.division, u.nombre`
  );

  const ETIQUETA_ALCANCE = {
    "todos": "Toda la comunidad",
    "docentes": "Solo docentes y dirección",
    "familias-todas": "Todas las familias",
    "curso": "Un curso (alumnos y familias)",
    "familias-curso": "Solo las familias de un curso",
    "familia-de-estudiante": "La familia de un alumno",
  };
  const REQUIERE = {
    "curso": "curso", "familias-curso": "curso", "familia-de-estudiante": "estudiante",
  };

  // Qué alcances ofrece cada rol (coincide con validarVisibilidad).
  const ALCANCES_POR_ROL = {
    "admin-academico": ["todos", "docentes", "familias-todas", "curso", "familias-curso", "familia-de-estudiante"],
    "preceptor": ["curso", "familias-curso", "familia-de-estudiante"],
    "centro-estudiantes": ["todos"],
    "profesor": ["docentes", "curso"],
  };

  app.get(
    "/api/calendario/destinos",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "calendario-editar");
      if (!usuario) return;

      const alcances = (ALCANCES_POR_ROL[usuario.rol] ?? []).map((a) => ({
        alcance: a,
        label: ETIQUETA_ALCANCE[a],
        requiere: REQUIERE[a] ?? null,
      }));

      let cursosCrudos = [];
      let estudiantesCrudos = [];
      if (usuario.rol === "admin-academico") {
        cursosCrudos = cursosDeInstitucion.all(usuario.institucionId);
        estudiantesCrudos = estudiantesDeInstitucion.all(usuario.institucionId);
      } else if (usuario.rol === "preceptor") {
        cursosCrudos = cursosDelPreceptor.all(usuario.id);
        estudiantesCrudos = estudiantesDelPreceptor.all(usuario.id);
      } else if (usuario.rol === "profesor") {
        cursosCrudos = cursosDelProfesor.all(usuario.id);
      }

      res.json({
        alcances,
        cursos: cursosCrudos.map((c) => ({ id: c.id, nombre: `${c.anio}° ${c.division}` })),
        estudiantes: estudiantesCrudos.map((e) => ({
          id: e.id,
          nombre: e.nombre,
          curso: `${e.anio}° ${e.division}`,
        })),
      });
    })
  );

  // ── Escritura del calendario (Etapa 7) ────────────────────────────────────
  const insertarEvento = db.prepare(
    `INSERT INTO eventos
       (institucion_id, creador_id, titulo, tipo, descripcion, lugar, fecha, hora_inicio, hora_fin)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertarVisibilidad = db.prepare(
    `INSERT INTO evento_visibilidad (evento_id, alcance, curso_id, estudiante_id)
     VALUES (?, ?, ?, ?)`
  );
  const eventoPorId = db.prepare(
    "SELECT * FROM eventos WHERE id = ? AND institucion_id = ?"
  );
  const contarDelCentroEsteMes = db.prepare(
    `SELECT COUNT(*) AS n FROM eventos
      WHERE creador_id = ? AND substr(fecha, 1, 7) = ?`
  );

  app.post(
    "/api/calendario/eventos",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "calendario-editar");
      if (!usuario) return;

      const datos = leerDatosEvento(req.body);
      if (datos.error) return res.status(400).json({ error: datos.error });

      const visibilidades = leerVisibilidades(req.body);
      if (visibilidades.error) return res.status(400).json({ error: visibilidades.error });

      // El corazón del permiso: ¿puede este rol darle ESTA visibilidad? El
      // preceptor solo a su curso, el centro solo 'todos', etc. Se valida cada
      // capa antes de escribir una sola fila.
      for (const v of visibilidades.lista) {
        const problema = validarVisibilidad(db, usuario, v);
        if (problema) return res.status(403).json({ error: problema });
      }

      // Límite mensual del Centro de Estudiantes (Error 8.B.3).
      if (usuario.rol === "centro-estudiantes") {
        const mes = datos.fecha.slice(0, 7);
        const { n } = contarDelCentroEsteMes.get(usuario.id, mes);
        if (n >= LIMITE_MENSUAL_CENTRO) {
          return res.status(403).json({
            error: `El Centro de Estudiantes puede crear hasta ${LIMITE_MENSUAL_CENTRO} eventos por mes.`,
          });
        }
      }

      const info = insertarEvento.run(
        usuario.institucionId, usuario.id,
        datos.titulo, datos.tipo, datos.descripcion, datos.lugar,
        datos.fecha, datos.horaInicio, datos.horaFin
      );
      for (const v of visibilidades.lista) {
        insertarVisibilidad.run(info.lastInsertRowid, v.alcance, v.cursoId, v.estudianteId);
      }

      res.status(201).json({ id: String(info.lastInsertRowid) });
    })
  );

  // Editar solo los datos del evento (título, fecha, horas...). La visibilidad
  // no se reescribe acá para no rehacer la validación de permisos en un PUT;
  // cambiar a quién le llega es borrar y volver a crear.
  const actualizarEvento = db.prepare(
    `UPDATE eventos
        SET titulo = ?, tipo = ?, descripcion = ?, lugar = ?,
            fecha = ?, hora_inicio = ?, hora_fin = ?
      WHERE id = ?`
  );

  app.put(
    "/api/calendario/eventos/:id",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "calendario-editar");
      if (!usuario) return;

      const id = Number(req.params.id);
      const evento = Number.isInteger(id) ? eventoPorId.get(id, usuario.institucionId) : null;
      if (!evento) return res.status(404).json({ error: "Ese evento no existe." });
      if (!puedeTocarEvento(usuario, evento)) {
        return res.status(403).json({ error: "No podés editar este evento." });
      }

      const datos = leerDatosEvento(req.body);
      if (datos.error) return res.status(400).json({ error: datos.error });

      actualizarEvento.run(
        datos.titulo, datos.tipo, datos.descripcion, datos.lugar,
        datos.fecha, datos.horaInicio, datos.horaFin, id
      );
      res.json({ ok: true });
    })
  );

  const borrarVisibilidades = db.prepare(
    "DELETE FROM evento_visibilidad WHERE evento_id = ?"
  );
  const borrarEvento = db.prepare("DELETE FROM eventos WHERE id = ?");

  app.delete(
    "/api/calendario/eventos/:id",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "calendario-editar");
      if (!usuario) return;

      const id = Number(req.params.id);
      const evento = Number.isInteger(id) ? eventoPorId.get(id, usuario.institucionId) : null;
      if (!evento) return res.status(404).json({ error: "Ese evento no existe." });
      if (!puedeTocarEvento(usuario, evento)) {
        return res.status(403).json({ error: "No podés borrar este evento." });
      }

      // Las capas de visibilidad referencian al evento; se borran primero para
      // no dejar filas huérfanas (foreign_keys está en ON).
      borrarVisibilidades.run(id);
      borrarEvento.run(id);
      res.json({ ok: true });
    })
  );

  // ── Comunicados: lectura (familia) ────────────────────────────────────────
  // Le llegan a una familia si son para toda la institución (curso_id NULL) o
  // para el curso de alguno de sus hijos. "Leído" no es una marca en el
  // comunicado sino una fila en `comunicado_lecturas` por persona: el mismo
  // comunicado puede estar leído por una familia y no por otra.
  const misComunicados = db.prepare(
    `SELECT c.id, c.titulo, c.contenido, c.enviado_en, c.emisor_id,
            u.nombre AS emisor,
            u.rol    AS emisor_rol,
            cu.anio, cu.division,
            c.archivo_id,
            a.nombre_original AS archivo,
            l.leido_en
       FROM comunicados c
       JOIN usuarios u       ON u.id = c.emisor_id
       LEFT JOIN cursos cu   ON cu.id = c.curso_id
       LEFT JOIN archivos a  ON a.id = c.archivo_id
       LEFT JOIN comunicado_lecturas l
              ON l.comunicado_id = c.id AND l.usuario_id = ?2
      WHERE c.institucion_id = ?1
        AND (
          c.curso_id IS NULL
          OR EXISTS (SELECT 1 FROM familiares f
                       JOIN inscripciones i ON i.estudiante_id = f.estudiante_id
                      WHERE f.usuario_familia_id = ?2 AND i.curso_id = c.curso_id)
        )
      ORDER BY c.enviado_en DESC`
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
    `INSERT INTO comunicados (institucion_id, emisor_id, curso_id, titulo, contenido, archivo_id)
     VALUES (?, ?, ?, ?, ?, ?)`
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
        usuario.institucionId, usuario.id, cursoId, titulo, contenido, archivoId
      );

      // Aviso a cada familia destinataria: el globito y la notificación (14.15).
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

      res.status(201).json({ id: String(info.lastInsertRowid) });
    })
  );

  // Los comunicados que emití, con cuántas familias los leyeron: la
  // "confirmación de lectura" del 14.13, vista desde quien los mandó.
  const misEnviados = db.prepare(
    `SELECT c.id, c.titulo, c.contenido, c.enviado_en,
            cu.anio, cu.division,
            (SELECT COUNT(*) FROM comunicado_lecturas l WHERE l.comunicado_id = c.id) AS leidos
       FROM comunicados c
       LEFT JOIN cursos cu ON cu.id = c.curso_id
      WHERE c.emisor_id = ?
      ORDER BY c.enviado_en DESC`
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
      }));

      res.json({ comunicados });
    })
  );

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
}

// ── Ayudas de validación de eventos ─────────────────────────────────────────

/** Roles que pueden crear/editar en el calendario (coincide con "calendario-editar"). */
const ROLES_EDITAN = ["admin-academico", "preceptor", "centro-estudiantes", "profesor"];

/**
 * Lee y valida los datos de un evento del cuerpo del pedido. Devuelve
 * `{ error }` con el motivo, o el objeto normalizado listo para guardar.
 * La regla "fin posterior al inicio" (Error 6.E.5) se verifica acá además de
 * en el CHECK del esquema, para devolver un mensaje claro en vez de un error SQL.
 */
function leerDatosEvento(cuerpo) {
  const titulo = String(cuerpo?.titulo ?? "").trim();
  const fecha = String(cuerpo?.fecha ?? "").trim();
  if (!titulo) return { error: "El evento necesita un título." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return { error: "La fecha tiene que ser una fecha real (AAAA-MM-DD)." };
  }

  // Tipo libre (Error 6.E.4): sin lista cerrada de cuatro opciones.
  const tipo = String(cuerpo?.tipo ?? "").trim() || "evento";
  const descripcion = String(cuerpo?.descripcion ?? "").trim();
  const lugar = String(cuerpo?.lugar ?? "").trim() || null;

  const horaInicio = normalizarHora(cuerpo?.horaInicio);
  const horaFin = normalizarHora(cuerpo?.horaFin);
  if (horaInicio === false || horaFin === false) {
    return { error: "Las horas tienen que tener el formato HH:MM." };
  }
  if (horaInicio && horaFin && horaFin <= horaInicio) {
    return { error: "La hora de fin no puede ser anterior o igual a la de inicio." };
  }

  return { titulo, tipo, descripcion, lugar, fecha, horaInicio, horaFin };
}

/** "08:30" → "08:30"; vacío → null; formato inválido → false. */
function normalizarHora(bruto) {
  if (bruto === undefined || bruto === null || bruto === "") return null;
  const hora = String(bruto).trim();
  return /^\d{2}:\d{2}$/.test(hora) ? hora : false;
}

/**
 * Lee la lista de capas de visibilidad del cuerpo. Cada capa es
 * `{ alcance, cursoId?, estudianteId? }`. Comprueba que el alcance sea uno de
 * los del esquema y que traiga el dato que necesita (curso o estudiante).
 */
function leerVisibilidades(cuerpo) {
  const bruto = cuerpo?.visibilidades;
  if (!Array.isArray(bruto) || bruto.length === 0) {
    return { error: "Hay que decir quién puede ver el evento." };
  }

  const ALCANCES = [
    "todos", "curso", "familias-curso",
    "familia-de-estudiante", "familias-todas", "docentes",
  ];
  const lista = [];
  for (const v of bruto) {
    const alcance = String(v?.alcance ?? "");
    if (!ALCANCES.includes(alcance)) {
      return { error: `Alcance de visibilidad desconocido: "${alcance}".` };
    }
    const cursoId = numeroOpcional(v?.cursoId);
    const estudianteId = numeroOpcional(v?.estudianteId);

    if ((alcance === "curso" || alcance === "familias-curso") && !cursoId) {
      return { error: `El alcance "${alcance}" necesita un curso.` };
    }
    if (alcance === "familia-de-estudiante" && !estudianteId) {
      return { error: "El alcance por familia necesita un estudiante." };
    }
    lista.push({ alcance, cursoId, estudianteId });
  }
  return { lista };
}

function numeroOpcional(bruto) {
  if (bruto === undefined || bruto === null || bruto === "") return null;
  const n = Number(bruto);
  return Number.isInteger(n) ? n : null;
}

/**
 * ¿Puede ESTE usuario darle a un evento ESTA capa de visibilidad? Es el permiso
 * de fondo del calendario (14.12 paso 3). Devuelve un mensaje de error si no, o
 * null si está permitido.
 *   - Dirección: cualquier visibilidad de su institución.
 *   - Preceptor: solo su(s) curso(s) —evento del curso, de sus familias o de la
 *     familia de un alumno suyo (Error 7.B.1).
 *   - Centro de estudiantes: solo eventos para 'todos' (Error 8.C.1).
 *   - Profesor: eventos para el equipo docente o para un curso que dicta.
 */
function validarVisibilidad(db, usuario, v) {
  const enInstitucion = (cursoId) =>
    db.prepare("SELECT 1 FROM cursos WHERE id = ? AND institucion_id = ?").get(cursoId, usuario.institucionId);

  if (usuario.rol === "admin-academico") {
    if ((v.alcance === "curso" || v.alcance === "familias-curso") && !enInstitucion(v.cursoId)) {
      return "Ese curso no es de tu institución.";
    }
    if (v.alcance === "familia-de-estudiante") {
      const ok = db
        .prepare("SELECT 1 FROM usuarios WHERE id = ? AND institucion_id = ? AND rol = 'estudiante'")
        .get(v.estudianteId, usuario.institucionId);
      if (!ok) return "Ese estudiante no es de tu institución.";
    }
    return null;
  }

  if (usuario.rol === "preceptor") {
    const esMiCurso = (cursoId) =>
      db.prepare("SELECT 1 FROM cursos WHERE id = ? AND preceptor_id = ?").get(cursoId, usuario.id);
    if (v.alcance === "curso" || v.alcance === "familias-curso") {
      return esMiCurso(v.cursoId) ? null : "Solo podés crear eventos para tus cursos.";
    }
    if (v.alcance === "familia-de-estudiante") {
      const ok = db
        .prepare(
          `SELECT 1 FROM inscripciones i JOIN cursos c ON c.id = i.curso_id
            WHERE i.estudiante_id = ? AND c.preceptor_id = ?`
        )
        .get(v.estudianteId, usuario.id);
      return ok ? null : "Ese estudiante no está en tus cursos.";
    }
    return "El preceptor solo crea eventos visibles para sus cursos.";
  }

  if (usuario.rol === "centro-estudiantes") {
    return v.alcance === "todos"
      ? null
      : "El Centro de Estudiantes crea eventos visibles para toda la comunidad.";
  }

  if (usuario.rol === "profesor") {
    if (v.alcance === "docentes") return null;
    if (v.alcance === "curso") {
      const ok = db
        .prepare("SELECT 1 FROM catedras WHERE curso_id = ? AND profesor_id = ?")
        .get(v.cursoId, usuario.id);
      return ok ? null : "Solo podés crear eventos para los cursos que dictás.";
    }
    return "El profesor crea eventos para sus cursos o para el equipo docente.";
  }

  return "No podés crear eventos en el calendario.";
}

/** Puede tocar (editar/borrar) un evento su creador o la dirección del colegio. */
function puedeTocarEvento(usuario, evento) {
  return evento.creador_id === usuario.id || usuario.rol === "admin-academico";
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

// ── Mantenimiento: borrar eventos viejos (Error 6.E.7) ───────────────────────
/**
 * Elimina en firme los eventos pasados con más de un año (y sus capas de
 * visibilidad). La vista `v_eventos_vigentes` ya los oculta de las lecturas;
 * esto los saca de verdad de la base. Se corre al arrancar y una vez por día.
 * Devuelve el temporizador para poder pararlo en un cierre ordenado.
 */
export function limpiarEventosViejos(db) {
  const viejos = db
    .prepare("SELECT id FROM eventos WHERE fecha < date('now', '-1 year')")
    .all();
  if (viejos.length > 0) {
    const borrarVis = db.prepare("DELETE FROM evento_visibilidad WHERE evento_id = ?");
    const borrarEv = db.prepare("DELETE FROM eventos WHERE id = ?");
    for (const e of viejos) {
      borrarVis.run(e.id);
      borrarEv.run(e.id);
    }
  }
  return viejos.length;
}

export function programarLimpiezaEventos(db) {
  limpiarEventosViejos(db); // una pasada al arrancar
  const UN_DIA = 24 * 60 * 60 * 1000;
  const t = setInterval(() => limpiarEventosViejos(db), UN_DIA);
  t.unref?.(); // que este temporizador no impida que el proceso termine
  return t;
}
