// ============================================================================
// NEXO — Aula Virtual y clases en vivo (Etapa 9, sección 14.3)
// ----------------------------------------------------------------------------
// Toda la lógica PROPIA de NEXO alrededor de la videollamada. El video y el
// audio los resuelve Jitsi en el navegador (motor externo gratuito); acá vive
// lo nuestro, que es lo que Jitsi no sabe: planificación, etapas, quién está
// conectado, la pizarra del docente, el pulso con nombres, la alerta de ritmo
// y el chat de la clase (que se reusa del chat de la Etapa 6).
//
// Ventanillas:
//   Planificación (docente, Errores 3.B.9 y 3.B.10)
//     GET  /api/aula/catedras            → mis cátedras (materia + curso) para planificar
//     GET  /api/aula/clases              → mis clases planificadas, con estado y si son iniciables
//     POST /api/aula/clases              → crear una clase con sus etapas
//     POST /api/aula/clases/:id/iniciar  → pasa a "en-vivo" y abre la sala
//     POST /api/aula/clases/:id/finalizar→ pasa a "finalizada"
//     PUT  /api/aula/clases/:id/umbral   → ajustar el umbral de la alerta de ritmo (3.B.5)
//
//   Estudiante
//     GET  /api/aula/mis-clases          → clases en vivo / próximas de mi curso
//
//   Sala en vivo (docente y estudiantes de la clase)
//     GET  /api/aula/clases/:id          → detalle: etapas, estado, sala, conversación
//     POST /api/aula/clases/:id/entrar   → registra asistencia y devuelve la sala Jitsi (3.B.2, 3.B.11)
//     POST /api/aula/clases/:id/salir    → marca la hora de salida
//     GET  /api/aula/clases/:id/conectados → lista NOMINAL de conectados (3.B.11)
//
//   Trayectoria (docente, Error 3.B.1)
//     POST /api/aula/clases/:id/etapas/:etapaId  { accion: 'iniciar'|'completar' }
//
//   Pizarra (docente dibuja, todos ven, Error 2.C.1)
//     GET  /api/aula/clases/:id/pizarra          → todos los trazos (para el que entra tarde)
//     POST /api/aula/clases/:id/pizarra          → un trazo nuevo (solo docente)
//     POST /api/aula/clases/:id/pizarra/limpiar  → borra la pizarra (solo docente)
//
//   Pulso y alerta (Errores 3.B.4 y 3.B.5)
//     POST /api/aula/clases/:id/comprension { estado }  → el estudiante marca cómo va
//     GET  /api/aula/clases/:id/pulso                   → totales + NOMBRES por estado (docente)
//
//   Preguntas (Error 3.B.6, se conserva)
//     POST /api/aula/clases/:id/preguntas { texto }     → el estudiante pregunta
//     POST /api/aula/preguntas/:id/responder            → el docente la marca respondida
//
// Permiso: se decide en la cocina, no escondiendo botones (regla de oro 4). El
// portero de sala es `accesoAClase`: entra el docente dueño de la cátedra o un
// estudiante inscripto en su curso; nadie más, aunque escriba el número a mano.
// ============================================================================

import { exigirSesion, ventanilla } from "./comun.js";
import { asegurarConversacionClase } from "./chat.js";

// Cada cuánto el servidor revisa el ritmo de las clases en vivo (14.3, paso 6).
const INTERVALO_ALERTA_MS = 30_000; // medio minuto

export function registrarAula(app, db, mensajero, notificaciones) {
  // ── Migración suave: umbral de la alerta configurable por el docente ────────
  // El esquema base no trae estas dos columnas; la alerta de ritmo (3.B.5) las
  // necesita para ser una regla con umbral CONFIGURABLE y no un número fijo. Se
  // agregan una vez, sin romper una base ya creada (SQLite no tiene ADD COLUMN
  // IF NOT EXISTS, así que se mira primero qué columnas hay).
  const columnas = db.prepare("PRAGMA table_info(clases_planificadas)").all();
  const tiene = (nombre) => columnas.some((c) => c.name === nombre);
  if (!tiene("umbral_alerta_pct")) {
    db.exec("ALTER TABLE clases_planificadas ADD COLUMN umbral_alerta_pct INTEGER NOT NULL DEFAULT 20");
  }
  if (!tiene("umbral_alerta_min")) {
    db.exec("ALTER TABLE clases_planificadas ADD COLUMN umbral_alerta_min INTEGER NOT NULL DEFAULT 3");
  }

  // ── Consultas preparadas reutilizadas ──────────────────────────────────────
  const claseConCatedra = db.prepare(
    `SELECT cp.*, c.profesor_id, c.curso_id, c.materia_id,
            m.nombre AS materia, cu.anio, cu.division, cu.institucion_id
       FROM clases_planificadas cp
       JOIN catedras c   ON c.id = cp.catedra_id
       JOIN materias m   ON m.id = c.materia_id
       JOIN cursos cu    ON cu.id = c.curso_id
      WHERE cp.id = ?`
  );
  const estaInscriptoEn = db.prepare(
    "SELECT 1 FROM inscripciones WHERE curso_id = ? AND estudiante_id = ?"
  );
  const etapasDe = db.prepare(
    `SELECT id, orden, titulo, duracion_estimada_min, iniciada_en, completada_en
       FROM clase_etapas WHERE clase_id = ? ORDER BY orden`
  );
  const conectadosDe = db.prepare(
    `SELECT DISTINCT a.estudiante_id AS id, u.nombre, u.avatar_url
       FROM clase_asistencias a
       JOIN usuarios u ON u.id = a.estudiante_id
      WHERE a.clase_id = ? AND a.desconectado_en IS NULL
      ORDER BY u.nombre`
  );

  /**
   * Portero de la sala. Devuelve { usuario, clase, esDocente } o null (ya habiendo
   * contestado). El docente dueño de la cátedra entra como docente; un estudiante
   * inscripto en el curso entra como estudiante; nadie más pasa. Así el permiso de
   * FILA (esta clase, no "cualquier aula") se decide en el servidor.
   */
  function accesoAClase(req, res, claseId) {
    const usuario = exigirSesion(db, req, res);
    if (!usuario) return null;

    const id = Number(claseId);
    const clase = Number.isInteger(id) ? claseConCatedra.get(id) : null;
    if (!clase) {
      res.status(404).json({ error: "Esa clase no existe." });
      return null;
    }

    if (clase.profesor_id === usuario.id) {
      return { usuario, clase, esDocente: true };
    }
    if (usuario.rol === "estudiante" && estaInscriptoEn.get(clase.curso_id, usuario.id)) {
      return { usuario, clase, esDocente: false };
    }
    res.status(403).json({ error: "No sos parte de esta clase." });
    return null;
  }

  /** Los ids a los que hay que empujar un evento de la clase: el docente + los
   *  estudiantes conectados en este momento. */
  function destinatariosClase(clase) {
    const ids = [clase.profesor_id];
    for (const c of conectadosDe.all(clase.id)) ids.push(c.id);
    return ids;
  }

  /** Nombre determinista de la sala Jitsi: igual para todos los de la clase, y
   *  con la institución adelante para que no choque con salas de otras escuelas. */
  function salaDeClase(clase) {
    return `nexo-inst${clase.institucion_id}-clase${clase.id}`;
  }

  function etiquetaClase(clase) {
    return `${clase.materia} ${clase.anio}°${clase.division}`;
  }

  // ── Planificación: mis cátedras ────────────────────────────────────────────
  app.get(
    "/api/aula/catedras",
    ventanilla((req, res) => {
      const usuario = exigirSesion(db, req, res);
      if (!usuario) return;
      if (usuario.rol !== "profesor") {
        return res.status(403).json({ error: "Solo un docente planifica clases." });
      }
      const catedras = db
        .prepare(
          `SELECT c.id, m.nombre AS materia, cu.anio, cu.division
             FROM catedras c
             JOIN materias m ON m.id = c.materia_id
             JOIN cursos cu  ON cu.id = c.curso_id
            WHERE c.profesor_id = ?
            ORDER BY m.nombre, cu.anio, cu.division`
        )
        .all(usuario.id)
        .map((c) => ({
          id: c.id,
          etiqueta: `${c.materia} · ${c.anio}°${c.division}`,
        }));
      res.json({ catedras });
    })
  );

  // ── Planificación: mis clases planificadas (Errores 3.B.9, 3.B.10) ──────────
  app.get(
    "/api/aula/clases",
    ventanilla((req, res) => {
      const usuario = exigirSesion(db, req, res);
      if (!usuario) return;
      if (usuario.rol !== "profesor") {
        return res.status(403).json({ error: "Solo un docente ve sus clases planificadas." });
      }
      const ahora = new Date().toISOString();
      const clases = db
        .prepare(
          `SELECT cp.id, cp.titulo, cp.fecha_hora, cp.estado,
                  m.nombre AS materia, cu.anio, cu.division
             FROM clases_planificadas cp
             JOIN catedras c ON c.id = cp.catedra_id
             JOIN materias m ON m.id = c.materia_id
             JOIN cursos cu  ON cu.id = c.curso_id
            WHERE c.profesor_id = ?
            ORDER BY cp.fecha_hora DESC`
        )
        .all(usuario.id)
        .map((cp) => ({
          id: String(cp.id),
          titulo: cp.titulo,
          fechaHora: cp.fecha_hora,
          estado: cp.estado,
          materiaCurso: `${cp.materia} ${cp.anio}°${cp.division}`,
          // "Iniciar" aparece cuando llegó la fecha y todavía no terminó (3.B.10):
          // que el botón esté o no es una decisión del servidor, no del reloj de
          // la vidriera. Ya en vivo, el botón dice "Entrar".
          iniciable: cp.estado === "planificada" && cp.fecha_hora <= ahora,
          enVivo: cp.estado === "en-vivo",
        }));
      res.json({ clases });
    })
  );

  // ── Planificación: crear una clase con sus etapas ───────────────────────────
  const insertarClase = db.prepare(
    `INSERT INTO clases_planificadas (catedra_id, titulo, fecha_hora, objetivos, materiales)
     VALUES (?, ?, ?, ?, ?)`
  );
  const insertarEtapa = db.prepare(
    `INSERT INTO clase_etapas (clase_id, orden, titulo, duracion_estimada_min)
     VALUES (?, ?, ?, ?)`
  );
  app.post(
    "/api/aula/clases",
    ventanilla((req, res) => {
      const usuario = exigirSesion(db, req, res);
      if (!usuario) return;
      if (usuario.rol !== "profesor") {
        return res.status(403).json({ error: "Solo un docente planifica clases." });
      }

      const catedraId = Number(req.body?.catedraId);
      const titulo = String(req.body?.titulo ?? "").trim();
      const fechaHora = String(req.body?.fechaHora ?? "").trim();
      const objetivos = String(req.body?.objetivos ?? "").trim();
      const materiales = String(req.body?.materiales ?? "").trim();
      const etapas = Array.isArray(req.body?.etapas) ? req.body.etapas : [];

      // La cátedra tiene que ser DEL docente: no puede planificar una clase de la
      // materia de otro pasando un id ajeno.
      const catedra = Number.isInteger(catedraId)
        ? db.prepare("SELECT profesor_id FROM catedras WHERE id = ?").get(catedraId)
        : null;
      if (!catedra || catedra.profesor_id !== usuario.id) {
        return res.status(403).json({ error: "Esa cátedra no es tuya." });
      }
      if (!titulo) return res.status(400).json({ error: "Falta el título de la clase." });
      if (!fechaHora) return res.status(400).json({ error: "Falta la fecha y hora." });

      const info = insertarClase.run(catedraId, titulo, fechaHora, objetivos, materiales);
      const claseId = info.lastInsertRowid;

      let orden = 1;
      for (const e of etapas) {
        const t = String(e?.titulo ?? "").trim();
        if (!t) continue;
        const dur = Number(e?.duracion);
        insertarEtapa.run(claseId, orden++, t, Number.isInteger(dur) && dur > 0 ? dur : null);
      }

      res.status(201).json({ id: String(claseId) });
    })
  );

  // ── Ajustar el umbral de la alerta de ritmo (3.B.5) ─────────────────────────
  app.put(
    "/api/aula/clases/:id/umbral",
    ventanilla((req, res) => {
      const acc = accesoAClase(req, res, req.params.id);
      if (!acc) return;
      if (!acc.esDocente) return res.status(403).json({ error: "Solo el docente configura la alerta." });

      const pct = Number(req.body?.pct);
      const min = Number(req.body?.min);
      if (!Number.isInteger(pct) || pct < 1 || pct > 100) {
        return res.status(400).json({ error: "El porcentaje del umbral debe ir de 1 a 100." });
      }
      if (!Number.isInteger(min) || min < 0 || min > 60) {
        return res.status(400).json({ error: "Los minutos del umbral deben ir de 0 a 60." });
      }
      db.prepare(
        "UPDATE clases_planificadas SET umbral_alerta_pct = ?, umbral_alerta_min = ? WHERE id = ?"
      ).run(pct, min, acc.clase.id);
      res.json({ ok: true });
    })
  );

  // ── Estudiante: las clases de mi curso (para entrar) ────────────────────────
  app.get(
    "/api/aula/mis-clases",
    ventanilla((req, res) => {
      const usuario = exigirSesion(db, req, res);
      if (!usuario) return;
      if (usuario.rol !== "estudiante") {
        return res.status(403).json({ error: "Esta lista es de estudiantes." });
      }
      const clases = db
        .prepare(
          `SELECT cp.id, cp.titulo, cp.fecha_hora, cp.estado,
                  m.nombre AS materia, cu.anio, cu.division, u.nombre AS docente
             FROM clases_planificadas cp
             JOIN catedras c ON c.id = cp.catedra_id
             JOIN materias m ON m.id = c.materia_id
             JOIN cursos cu  ON cu.id = c.curso_id
             JOIN usuarios u ON u.id = c.profesor_id
             JOIN inscripciones i ON i.curso_id = cu.id AND i.estudiante_id = ?
            WHERE cp.estado IN ('planificada','en-vivo')
            ORDER BY (cp.estado = 'en-vivo') DESC, cp.fecha_hora`
        )
        .all(usuario.id)
        .map((cp) => ({
          id: String(cp.id),
          titulo: cp.titulo,
          fechaHora: cp.fecha_hora,
          estado: cp.estado,
          materiaCurso: `${cp.materia} ${cp.anio}°${cp.division}`,
          docente: cp.docente,
          enVivo: cp.estado === "en-vivo",
        }));
      res.json({ clases });
    })
  );

  // ── Detalle de una clase (docente y estudiantes de la clase) ────────────────
  app.get(
    "/api/aula/clases/:id",
    ventanilla((req, res) => {
      const acc = accesoAClase(req, res, req.params.id);
      if (!acc) return;
      const { clase, esDocente } = acc;
      res.json({
        clase: {
          id: String(clase.id),
          titulo: clase.titulo,
          materiaCurso: etiquetaClase(clase),
          docente: db.prepare("SELECT nombre FROM usuarios WHERE id = ?").get(clase.profesor_id)?.nombre ?? "",
          fechaHora: clase.fecha_hora,
          estado: clase.estado,
          objetivos: clase.objetivos,
          materiales: clase.materiales,
          sala: salaDeClase(clase),
          umbralPct: clase.umbral_alerta_pct,
          umbralMin: clase.umbral_alerta_min,
          esDocente,
        },
        etapas: etapasDe.all(clase.id).map(formatearEtapa),
      });
    })
  );

  // ── Iniciar la clase (docente) — Error 3.B.10 ───────────────────────────────
  app.post(
    "/api/aula/clases/:id/iniciar",
    ventanilla((req, res) => {
      const acc = accesoAClase(req, res, req.params.id);
      if (!acc) return;
      if (!acc.esDocente) return res.status(403).json({ error: "Solo el docente inicia la clase." });
      const { clase } = acc;
      if (clase.estado === "finalizada" || clase.estado === "cancelada") {
        return res.status(409).json({ error: "Esta clase ya terminó." });
      }
      db.prepare("UPDATE clases_planificadas SET estado = 'en-vivo' WHERE id = ?").run(clase.id);

      // El chat de la clase (3.B.7) es una conversación normal del chat de la
      // Etapa 6, de tipo "clase": se reutiliza la pieza, no se inventa un canal.
      const conversacionId = asegurarConversacionClase(db, clase.id);

      res.json({ ok: true, sala: salaDeClase(clase), conversacionId: String(conversacionId) });
    })
  );

  // ── Finalizar la clase (docente) — Error 3.B.12 flujo de salida ─────────────
  app.post(
    "/api/aula/clases/:id/finalizar",
    ventanilla((req, res) => {
      const acc = accesoAClase(req, res, req.params.id);
      if (!acc) return;
      if (!acc.esDocente) return res.status(403).json({ error: "Solo el docente finaliza la clase." });
      const { clase } = acc;

      db.prepare("UPDATE clases_planificadas SET estado = 'finalizada' WHERE id = ?").run(clase.id);
      // Todos los que quedaron conectados se marcan como salidos ahora.
      db.prepare(
        "UPDATE clase_asistencias SET desconectado_en = datetime('now') WHERE clase_id = ? AND desconectado_en IS NULL"
      ).run(clase.id);

      // Avisar en vivo a los estudiantes conectados: la clase terminó.
      mensajero.emitirAVarios(destinatariosClase(clase), {
        tipo: "aula-estado", claseId: String(clase.id), estado: "finalizada",
      });
      res.json({ ok: true });
    })
  );

  // ── Entrar a la sala: registrar asistencia (Errores 3.B.2, 3.B.11) ──────────
  app.post(
    "/api/aula/clases/:id/entrar",
    ventanilla((req, res) => {
      const acc = accesoAClase(req, res, req.params.id);
      if (!acc) return;
      const { usuario, clase, esDocente } = acc;

      if (clase.estado !== "en-vivo") {
        return res.status(409).json({ error: "La clase todavía no está en vivo." });
      }

      let conversacionId;
      if (!esDocente) {
        // Nueva fila de asistencia por entrada (14.3, paso 2): un mismo alumno
        // puede entrar y salir varias veces; cada tramo queda registrado.
        db.prepare(
          "INSERT INTO clase_asistencias (clase_id, estudiante_id) VALUES (?, ?)"
        ).run(clase.id, usuario.id);
        // Sumarlo al chat de la clase (por si entró después de que se creó).
        conversacionId = asegurarConversacionClase(db, clase.id, usuario.id);
        // El docente ve entrar a alguien: se refresca la lista nominal.
        mensajero.emitirA(clase.profesor_id, {
          tipo: "aula-conectados", claseId: String(clase.id),
        });
      } else {
        conversacionId = asegurarConversacionClase(db, clase.id);
      }

      res.json({
        ok: true,
        sala: salaDeClase(clase),
        conversacionId: String(conversacionId),
        nombre: usuario.nombre,
        esDocente,
      });
    })
  );

  // ── Salir de la sala ────────────────────────────────────────────────────────
  app.post(
    "/api/aula/clases/:id/salir",
    ventanilla((req, res) => {
      const acc = accesoAClase(req, res, req.params.id);
      if (!acc) return;
      const { usuario, clase, esDocente } = acc;
      if (!esDocente) {
        db.prepare(
          `UPDATE clase_asistencias SET desconectado_en = datetime('now')
            WHERE clase_id = ? AND estudiante_id = ? AND desconectado_en IS NULL`
        ).run(clase.id, usuario.id);
        mensajero.emitirA(clase.profesor_id, {
          tipo: "aula-conectados", claseId: String(clase.id),
        });
      }
      res.json({ ok: true });
    })
  );

  // ── Lista nominal de conectados (Error 3.B.11) ──────────────────────────────
  app.get(
    "/api/aula/clases/:id/conectados",
    ventanilla((req, res) => {
      const acc = accesoAClase(req, res, req.params.id);
      if (!acc) return;
      const conectados = conectadosDe.all(acc.clase.id).map((c) => ({
        id: c.id, nombre: c.nombre, avatarUrl: c.avatar_url ?? undefined,
      }));
      res.json({ conectados });
    })
  );

  // ── Trayectoria: iniciar / completar una etapa (Error 3.B.1) ────────────────
  app.post(
    "/api/aula/clases/:id/etapas/:etapaId",
    ventanilla((req, res) => {
      const acc = accesoAClase(req, res, req.params.id);
      if (!acc) return;
      if (!acc.esDocente) return res.status(403).json({ error: "Solo el docente marca la trayectoria." });

      const etapaId = Number(req.params.etapaId);
      const etapa = Number.isInteger(etapaId)
        ? db.prepare("SELECT * FROM clase_etapas WHERE id = ? AND clase_id = ?").get(etapaId, acc.clase.id)
        : null;
      if (!etapa) return res.status(404).json({ error: "Esa etapa no es de esta clase." });

      const accion = String(req.body?.accion ?? "");
      if (accion === "iniciar") {
        db.prepare(
          "UPDATE clase_etapas SET iniciada_en = datetime('now'), completada_en = NULL WHERE id = ?"
        ).run(etapaId);
      } else if (accion === "completar") {
        db.prepare(
          `UPDATE clase_etapas
              SET completada_en = datetime('now'),
                  iniciada_en = COALESCE(iniciada_en, datetime('now'))
            WHERE id = ?`
        ).run(etapaId);
      } else {
        return res.status(400).json({ error: "Acción de etapa desconocida." });
      }

      const etapas = etapasDe.all(acc.clase.id).map(formatearEtapa);
      // Todos ven avanzar la trayectoria en vivo, no un dibujo fijo (3.B.1).
      mensajero.emitirAVarios(destinatariosClase(acc.clase), {
        tipo: "aula-etapas", claseId: String(acc.clase.id), etapas,
      });
      res.json({ etapas });
    })
  );

  // ── Pizarra: leer todos los trazos (para el que entra tarde) ────────────────
  app.get(
    "/api/aula/clases/:id/pizarra",
    ventanilla((req, res) => {
      const acc = accesoAClase(req, res, req.params.id);
      if (!acc) return;
      const trazos = db
        .prepare("SELECT secuencia, datos FROM pizarra_trazos WHERE clase_id = ? ORDER BY secuencia")
        .all(acc.clase.id)
        .map((t) => ({ secuencia: t.secuencia, datos: JSON.parse(t.datos) }));
      res.json({ trazos });
    })
  );

  // ── Pizarra: un trazo nuevo — SOLO el docente dibuja (Error 2.C.1) ──────────
  app.post(
    "/api/aula/clases/:id/pizarra",
    ventanilla((req, res) => {
      const acc = accesoAClase(req, res, req.params.id);
      if (!acc) return;
      // La regla de "solo el docente dibuja" se cumple en la cocina: aunque un
      // estudiante arme el pedido a mano, la pizarra lo rechaza (regla de oro 4).
      if (!acc.esDocente) return res.status(403).json({ error: "Solo el docente dibuja en la pizarra." });

      const datos = req.body?.datos;
      if (datos === undefined || datos === null) {
        return res.status(400).json({ error: "Falta el trazo." });
      }
      const proxima =
        (db.prepare("SELECT MAX(secuencia) AS m FROM pizarra_trazos WHERE clase_id = ?").get(acc.clase.id)?.m ?? 0) + 1;
      db.prepare(
        "INSERT INTO pizarra_trazos (clase_id, secuencia, datos) VALUES (?, ?, ?)"
      ).run(acc.clase.id, proxima, JSON.stringify(datos));

      // Todos ven el trazo reproducirse en vivo (14.3, paso 3).
      mensajero.emitirAVarios(destinatariosClase(acc.clase), {
        tipo: "aula-trazo", claseId: String(acc.clase.id), trazo: { secuencia: proxima, datos },
      });
      res.json({ secuencia: proxima });
    })
  );

  // ── Pizarra: limpiar (solo docente) ─────────────────────────────────────────
  app.post(
    "/api/aula/clases/:id/pizarra/limpiar",
    ventanilla((req, res) => {
      const acc = accesoAClase(req, res, req.params.id);
      if (!acc) return;
      if (!acc.esDocente) return res.status(403).json({ error: "Solo el docente borra la pizarra." });
      db.prepare("DELETE FROM pizarra_trazos WHERE clase_id = ?").run(acc.clase.id);
      mensajero.emitirAVarios(destinatariosClase(acc.clase), {
        tipo: "aula-pizarra-limpia", claseId: String(acc.clase.id),
      });
      res.json({ ok: true });
    })
  );

  // ── Pulso: el estudiante marca cómo va (Error 3.B.4) ────────────────────────
  const upsertComprension = db.prepare(
    `INSERT INTO clase_comprension (clase_id, estudiante_id, estado, actualizado_en)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT (clase_id, estudiante_id)
     DO UPDATE SET estado = excluded.estado, actualizado_en = datetime('now')`
  );
  app.post(
    "/api/aula/clases/:id/comprension",
    ventanilla((req, res) => {
      const acc = accesoAClase(req, res, req.params.id);
      if (!acc) return;
      if (acc.esDocente) return res.status(403).json({ error: "El pulso lo marcan los estudiantes." });

      const estado = String(req.body?.estado ?? "");
      if (!["entiendo", "mas-o-menos", "perdido"].includes(estado)) {
        return res.status(400).json({ error: "Estado de comprensión inválido." });
      }
      upsertComprension.run(acc.clase.id, acc.usuario.id, estado);
      // El docente ve el pulso cambiar al instante, con nombre (3.B.4).
      mensajero.emitirA(acc.clase.profesor_id, {
        tipo: "aula-pulso", claseId: String(acc.clase.id),
      });
      res.json({ ok: true });
    })
  );

  // ── Pulso: totales + NOMBRES por estado (docente, Error 3.B.4) ──────────────
  app.get(
    "/api/aula/clases/:id/pulso",
    ventanilla((req, res) => {
      const acc = accesoAClase(req, res, req.params.id);
      if (!acc) return;
      if (!acc.esDocente) return res.status(403).json({ error: "El pulso lo ve el docente." });
      res.json(pulsoDeClase(db, acc.clase));
    })
  );

  // ── Preguntas pendientes (Error 3.B.6, se conserva) ─────────────────────────
  app.post(
    "/api/aula/clases/:id/preguntas",
    ventanilla((req, res) => {
      const acc = accesoAClase(req, res, req.params.id);
      if (!acc) return;
      if (acc.esDocente) return res.status(403).json({ error: "Las preguntas las hacen los estudiantes." });
      const texto = String(req.body?.texto ?? "").trim();
      if (!texto) return res.status(400).json({ error: "La pregunta está vacía." });

      db.prepare(
        "INSERT INTO clase_preguntas (clase_id, estudiante_id, texto) VALUES (?, ?, ?)"
      ).run(acc.clase.id, acc.usuario.id, texto);
      mensajero.emitirA(acc.clase.profesor_id, {
        tipo: "aula-pregunta", claseId: String(acc.clase.id),
      });
      res.json({ ok: true });
    })
  );

  app.get(
    "/api/aula/clases/:id/preguntas",
    ventanilla((req, res) => {
      const acc = accesoAClase(req, res, req.params.id);
      if (!acc) return;
      if (!acc.esDocente) return res.status(403).json({ error: "Las preguntas pendientes las ve el docente." });
      const preguntas = db
        .prepare(
          `SELECT p.id, p.texto, p.creado_en, u.nombre AS autor
             FROM clase_preguntas p
             JOIN usuarios u ON u.id = p.estudiante_id
            WHERE p.clase_id = ? AND p.respondida_en IS NULL
            ORDER BY p.creado_en`
        )
        .all(acc.clase.id)
        .map((p) => ({ id: String(p.id), texto: p.texto, autor: p.autor, creadoEn: p.creado_en }));
      res.json({ preguntas });
    })
  );

  app.post(
    "/api/aula/preguntas/:id/responder",
    ventanilla((req, res) => {
      const usuario = exigirSesion(db, req, res);
      if (!usuario) return;
      const pid = Number(req.params.id);
      const fila = Number.isInteger(pid)
        ? db
            .prepare(
              `SELECT p.id, c.profesor_id
                 FROM clase_preguntas p
                 JOIN clases_planificadas cp ON cp.id = p.clase_id
                 JOIN catedras c ON c.id = cp.catedra_id
                WHERE p.id = ?`
            )
            .get(pid)
        : null;
      if (!fila) return res.status(404).json({ error: "Esa pregunta no existe." });
      if (fila.profesor_id !== usuario.id) {
        return res.status(403).json({ error: "Solo el docente de la clase responde." });
      }
      db.prepare("UPDATE clase_preguntas SET respondida_en = datetime('now') WHERE id = ?").run(pid);
      res.json({ ok: true });
    })
  );

  // ── Alerta de ritmo: una REGLA con umbral, no una IA (Error 3.B.5) ──────────
  // Cada medio minuto se recorre cada clase en vivo y se calcula qué porcentaje
  // del curso está en "perdido"/"más o menos". Si supera el umbral del docente
  // durante más del tiempo mínimo, se le empuja la alerta UNA vez (no se repite
  // hasta que el ritmo se recupere). Todo aritmética; nada de inteligencia.
  const desde = new Map(); // claseId -> instante (ms) en que empezó a superarse el umbral
  const yaAvisado = new Set(); // claseId con alerta ya empujada, para no spamear

  const timer = setInterval(() => {
    let clasesVivas;
    try {
      clasesVivas = db.prepare("SELECT id FROM clases_planificadas WHERE estado = 'en-vivo'").all();
    } catch {
      return;
    }
    const ahora = Date.now();
    const vivas = new Set(clasesVivas.map((c) => c.id));
    // Olvidar el estado de clases que ya no están en vivo.
    for (const id of desde.keys()) if (!vivas.has(id)) desde.delete(id);
    for (const id of yaAvisado) if (!vivas.has(id)) yaAvisado.delete(id);

    for (const { id } of clasesVivas) {
      const clase = claseConCatedra.get(id);
      if (!clase) continue;
      const p = pulsoDeClase(db, clase);
      const superado = p.total > 0 && p.pctEnRiesgo >= clase.umbral_alerta_pct;

      if (!superado) {
        desde.delete(id);
        yaAvisado.delete(id);
        continue;
      }
      if (!desde.has(id)) desde.set(id, ahora);
      const minutos = (ahora - desde.get(id)) / 60000;
      if (minutos >= clase.umbral_alerta_min && !yaAvisado.has(id)) {
        yaAvisado.add(id);
        mensajero.emitirA(clase.profesor_id, {
          tipo: "aula-alerta",
          claseId: String(id),
          pct: p.pctEnRiesgo,
          mensaje: `El ${p.pctEnRiesgo}% de la clase viene demorado (${p.perdido.length + p.masOMenos.length} de ${p.total}).`,
        });
      }
    }
  }, INTERVALO_ALERTA_MS);
  // El temporizador no debe impedir que el proceso se apague (Ctrl+C).
  if (typeof timer.unref === "function") timer.unref();
}

/** Da forma a una etapa para la vidriera, deduciendo su estado de las marcas. */
function formatearEtapa(e) {
  const estado = e.completada_en ? "completado" : e.iniciada_en ? "en-progreso" : "pendiente";
  return {
    id: String(e.id),
    orden: e.orden,
    titulo: e.titulo,
    duracion: e.duracion_estimada_min ?? null,
    estado,
  };
}

/**
 * El pulso de una clase: totales y NOMBRES por estado (3.B.4), más el porcentaje
 * "en riesgo" (perdido + más o menos) sobre el total de quienes marcaron algo,
 * que es la base de la alerta de ritmo (3.B.5). Se usa desde la ventanilla y
 * desde el temporizador de la alerta: una sola definición, no dos que discrepen.
 */
function pulsoDeClase(db, clase) {
  const filas = db
    .prepare(
      `SELECT cc.estado, u.nombre, u.id
         FROM clase_comprension cc
         JOIN usuarios u ON u.id = cc.estudiante_id
        WHERE cc.clase_id = ?
        ORDER BY u.nombre`
    )
    .all(clase.id);

  const entiendo = [];
  const masOMenos = [];
  const perdido = [];
  for (const f of filas) {
    const persona = { id: f.id, nombre: f.nombre };
    if (f.estado === "entiendo") entiendo.push(persona);
    else if (f.estado === "mas-o-menos") masOMenos.push(persona);
    else perdido.push(persona);
  }
  const total = filas.length;
  const enRiesgo = masOMenos.length + perdido.length;
  const pctEnRiesgo = total > 0 ? Math.round((enRiesgo / total) * 100) : 0;

  return { total, entiendo, masOMenos, perdido, pctEnRiesgo };
}
