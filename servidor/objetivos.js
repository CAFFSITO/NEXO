// ============================================================================
// NEXO — Ventanilla de Objetivos (Etapa 2, pantalla 3)
// ----------------------------------------------------------------------------
// Acá muere el Error 13.5. El Dashboard mostraba tres hábitos y decía que la
// racha de "Lectura diaria" era de 7 días; la sección Hábitos mostraba cuatro y
// decía que la misma racha era de 8. Las dos listas estaban escritas a mano en
// archivos distintos y ninguna miraba a la otra.
//
//   GET /api/objetivos → { metas, habitos, competencias }
//
// Una sola ventanilla para las tres pantallas del módulo: si Dashboard y
// Hábitos piden lo mismo, no tienen forma de contradecirse.
//
// La racha NO se guarda en ninguna columna: se cuenta de `habito_registros`,
// que es la lista de los días en que la persona registró el hábito (así lo pide
// el esquema). Una racha guardada es una racha que se puede editar sin haber
// hecho nada; una racha contada solo puede decir la verdad.
// ============================================================================

import { exigirAcceso, ventanilla, hoyISO } from "./comun.js";

/** Cuántos días trae el historial que dibuja cada tarjeta de hábito. */
const DIAS_DE_HISTORIAL = 10;

/** Resta días a una fecha ISO sin pasar por husos horarios. */
function restarDias(iso, dias) {
  const [anio, mes, dia] = iso.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, dia - dias);
  const mm = String(fecha.getMonth() + 1).padStart(2, "0");
  const dd = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mm}-${dd}`;
}

/**
 * La racha: cuántos días seguidos viene cumpliéndose el hábito, contando hacia
 * atrás desde hoy.
 *
 * Si todavía no se registró hoy, la racha se cuenta desde ayer y no se corta:
 * a las 9 de la mañana nadie perdió una racha de 20 días por no haber leído
 * todavía. Pero si tampoco hay registro de ayer, la racha es 0: ahí sí se
 * cortó. Esa es toda la regla.
 */
function calcularRacha(fechasCumplidas, hoy) {
  const cumplidas = new Set(fechasCumplidas);

  let dia = cumplidas.has(hoy) ? hoy : restarDias(hoy, 1);
  if (!cumplidas.has(dia)) return 0;

  let racha = 0;
  while (cumplidas.has(dia)) {
    racha += 1;
    dia = restarDias(dia, 1);
  }
  return racha;
}

export function registrarObjetivos(app, db) {
  // ── Metas y sus subtareas ────────────────────────────────────────────────
  // El progreso se cuenta de `subtareas`, una por una. La pantalla lo traía
  // escrito ("progreso: 60") junto a "3 de 5", dos números que podían no tener
  // nada que ver entre sí.
  const metasDe = db.prepare(
    `SELECT me.id,
            me.titulo,
            me.categoria,
            me.vence_el,
            me.estado,
            me.completada_en,
            me.materia_id,
            me.unidad_id,
            m.nombre  AS materia,
            un.titulo AS unidad,
            (SELECT COUNT(*) FROM subtareas s WHERE s.meta_id = me.id) AS subtareas_total,
            (SELECT COUNT(*) FROM subtareas s
              WHERE s.meta_id = me.id AND s.completada_en IS NOT NULL) AS subtareas_hechas
       FROM metas me
       LEFT JOIN materias m  ON m.id = me.materia_id
       LEFT JOIN unidades un ON un.id = me.unidad_id
      WHERE me.estudiante_id = ?
        AND me.estado <> 'archivada'
      ORDER BY me.vence_el`
  );

  const subtareasDe = db.prepare(
    `SELECT id, meta_id, titulo, orden, completada_en
       FROM subtareas
      WHERE meta_id = ?
      ORDER BY orden`
  );

  // ── Hábitos y sus registros ──────────────────────────────────────────────
  const habitosDe = db.prepare(
    `SELECT id, nombre, frecuencia
       FROM habitos
      WHERE estudiante_id = ?
        AND archivado_en IS NULL
      ORDER BY creado_en`
  );

  const registrosDe = db.prepare(
    `SELECT fecha FROM habito_registros
      WHERE habito_id = ?
      ORDER BY fecha DESC`
  );

  // ── Competencias ─────────────────────────────────────────────────────────
  // Solo las que el estudiante empezó: una competencia sin avance no es un
  // dato que mostrar, es una competencia que todavía no arrancó.
  const competenciasDe = db.prepare(
    `SELECT c.id,
            c.nombre,
            c.padre_id,
            pa.nombre AS padre,
            a.nivel,
            a.actualizado_en
       FROM competencia_avances a
       JOIN competencias c   ON c.id = a.competencia_id
       LEFT JOIN competencias pa ON pa.id = c.padre_id
      WHERE a.estudiante_id = ?
      ORDER BY COALESCE(pa.nombre, c.nombre), c.nombre`
  );

  const evidenciasDe = db.prepare(
    `SELECT id, titulo, descripcion
       FROM evidencias
      WHERE competencia_id = ? AND estudiante_id = ?
      ORDER BY creado_en`
  );

  app.get(
    "/api/objetivos",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "objetivos-dashboard");
      if (!usuario) return;

      const hoy = hoyISO();

      // ── Metas ──
      const metas = metasDe.all(usuario.id).map((fila) => ({
        id: String(fila.id),
        titulo: fila.titulo,
        // La pantalla mostraba la categoría en mayúsculas ("HISTORIA",
        // "IDIOMAS"). Eso es cosa del diseño, no del dato: sale como está.
        categoria: fila.categoria,
        materiaId: fila.materia_id !== null ? String(fila.materia_id) : null,
        unidadId: fila.unidad_id !== null ? String(fila.unidad_id) : null,
        materia: fila.materia ?? null,
        unidad: fila.unidad ?? null,
        venceEl: fila.vence_el,
        estado: fila.estado,
        completadaEn: fila.completada_en ?? null,
        subtareasTotal: fila.subtareas_total,
        subtareasHechas: fila.subtareas_hechas,
        // Cada subtarea con su nombre y su estado, como pide el Error 2.D.6:
        // la pantalla solo sabía cuántas eran.
        subtareas: subtareasDe.all(fila.id).map((s) => ({
          id: String(s.id),
          titulo: s.titulo,
          orden: s.orden,
          completada: s.completada_en !== null,
        })),
      }));

      // ── Hábitos ──
      const habitos = habitosDe.all(usuario.id).map((fila) => {
        const fechas = registrosDe.all(fila.id).map((r) => r.fecha);
        const cumplidas = new Set(fechas);

        // El historial que dibuja la tarjeta: un casillero por día, del más
        // viejo al más nuevo, siendo el último el de hoy.
        const historial = [];
        for (let i = DIAS_DE_HISTORIAL - 1; i >= 0; i--) {
          const dia = restarDias(hoy, i);
          historial.push({ fecha: dia, cumplido: cumplidas.has(dia) });
        }

        return {
          id: String(fila.id),
          nombre: fila.nombre,
          frecuencia: fila.frecuencia,
          rachaDias: calcularRacha(fechas, hoy),
          cumplidoHoy: cumplidas.has(hoy),
          historial,
          // Cuántas veces se registró en los últimos 7 días. Es lo que necesita
          // la tarjeta del pie de Hábitos para dejar de mentir: decía
          // "mantuviste N hábitos activos ESTA SEMANA" contando hábitos con
          // racha mayor a cero, sin mirar ninguna semana (Error 2.D.16).
          registrosUltimaSemana: fechas.filter((f) => f >= restarDias(hoy, 6)).length,
        };
      });

      // ── Competencias ──
      const competencias = competenciasDe.all(usuario.id).map((fila) => ({
        id: String(fila.id),
        nombre: fila.nombre,
        padre: fila.padre ?? null,
        nivel: fila.nivel,
        actualizadoEn: fila.actualizado_en,
        // Las evidencias con su título, no solo cuántas: la tarjeta las lista
        // una por una (Error 2.D.12).
        evidencias: evidenciasDe.all(fila.id, usuario.id).map((e) => ({
          id: String(e.id),
          titulo: e.titulo,
          descripcion: e.descripcion,
        })),
      }));

      res.json({ metas, habitos, competencias, hoy });
    })
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ESCRITURA (Etapa 5, secciones 14.8 y 14.9)
  // ----------------------------------------------------------------------------
  // Antes crear una meta o marcar un hábito solo vivía en la memoria de la
  // pantalla: cambiar de sección lo borraba. Ahora todo viaja a la base. Cada
  // ventanilla comprueba que la meta / subtarea / hábito sea de QUIEN pide: un
  // estudiante no toca los objetivos de otro (permiso de fila, en el servidor).
  // ══════════════════════════════════════════════════════════════════════════

  const metaPropia = db.prepare(
    "SELECT id, estado FROM metas WHERE id = ? AND estudiante_id = ?"
  );
  const subtareaPropia = db.prepare(
    `SELECT s.id, s.meta_id
       FROM subtareas s JOIN metas m ON m.id = s.meta_id
      WHERE s.id = ? AND m.estudiante_id = ?`
  );
  const habitoPropio = db.prepare(
    "SELECT id FROM habitos WHERE id = ? AND estudiante_id = ? AND archivado_en IS NULL"
  );
  // Una competencia solo se puede tocar si es de la escuela del estudiante; una
  // evidencia solo si es suya (permiso de fila, en el servidor).
  const competenciaEnEscuela = db.prepare(
    "SELECT id FROM competencias WHERE id = ? AND institucion_id = ?"
  );
  const evidenciaPropia = db.prepare(
    "SELECT id FROM evidencias WHERE id = ? AND estudiante_id = ?"
  );

  const esFecha = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);

  // La misma escala que el CHECK de competencia_avances. Si el cliente manda un
  // nivel de fantasía ("experto", "inicial"), se rechaza antes de tocar la base.
  const NIVELES_COMPETENCIA = new Set([
    "iniciado",
    "en-desarrollo",
    "avanzado",
    "dominado",
  ]);

  // ── Materias y sus unidades (Error 2.D.8): para el formulario de nueva meta ─
  // El campo "Unidad" deja de ser texto libre y pasa a elegirse de la lista real
  // de la materia. Sale de la institución del estudiante, no de una lista a mano.
  app.get(
    "/api/objetivos/materias",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "objetivos-metas");
      if (!usuario) return;

      const materias = db.prepare(
        `SELECT id, nombre FROM materias WHERE institucion_id = ? ORDER BY nombre`
      ).all(usuario.institucionId);

      const unidadesDe = db.prepare(
        "SELECT id, numero, titulo FROM unidades WHERE materia_id = ? ORDER BY numero"
      );

      res.json({
        materias: materias.map((m) => ({
          id: String(m.id),
          nombre: m.nombre,
          unidades: unidadesDe.all(m.id).map((u) => ({
            id: String(u.id),
            numero: u.numero,
            titulo: u.titulo,
          })),
        })),
      });
    })
  );

  // ── Crear meta (Errores 2.D.5, 2.D.6, 2.D.8) ───────────────────────────────
  // Con subtareas descriptas una por una (no un número), fecha real con año y
  // unidad elegida de la base. La materia y la unidad tienen que ser de la
  // institución del estudiante y coherentes entre sí.
  app.post(
    "/api/objetivos/metas",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "objetivos-metas");
      if (!usuario) return;

      const titulo = String(req.body?.titulo ?? "").trim();
      const categoria = String(req.body?.categoria ?? "personal").trim() || "personal";
      const venceEl = String(req.body?.venceEl ?? "").slice(0, 10);
      const materiaId = req.body?.materiaId != null ? Number(req.body.materiaId) : null;
      const unidadId = req.body?.unidadId != null ? Number(req.body.unidadId) : null;
      const subtareas = Array.isArray(req.body?.subtareas) ? req.body.subtareas : [];

      if (!titulo) return res.status(400).json({ error: "La meta necesita un título." });
      if (!esFecha(venceEl)) {
        return res.status(400).json({ error: "Elegí una fecha de vencimiento válida." });
      }
      if (materiaId !== null) {
        const m = db.prepare(
          "SELECT id FROM materias WHERE id = ? AND institucion_id = ?"
        ).get(materiaId, usuario.institucionId);
        if (!m) return res.status(400).json({ error: "Esa materia no existe en tu escuela." });
      }
      if (unidadId !== null) {
        const u = db.prepare(
          "SELECT id FROM unidades WHERE id = ? AND materia_id = ?"
        ).get(unidadId, materiaId);
        if (!u) return res.status(400).json({ error: "Esa unidad no pertenece a la materia elegida." });
      }

      const info = db.prepare(
        `INSERT INTO metas (estudiante_id, titulo, categoria, materia_id, unidad_id, vence_el)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(usuario.id, titulo, categoria, materiaId, unidadId, venceEl);

      const metaId = info.lastInsertRowid;
      const insertarSub = db.prepare(
        "INSERT INTO subtareas (meta_id, titulo, orden) VALUES (?, ?, ?)"
      );
      let orden = 0;
      for (const bruto of subtareas) {
        const t = String(bruto ?? "").trim();
        if (t) insertarSub.run(metaId, t, orden++);
      }

      res.status(201).json({ id: String(metaId) });
    })
  );

  // ── Editar una meta (Error 2.D.3) ──────────────────────────────────────────
  app.put(
    "/api/objetivos/metas/:id",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "objetivos-metas");
      if (!usuario) return;
      if (!metaPropia.get(Number(req.params.id), usuario.id)) {
        return res.status(404).json({ error: "Esa meta no existe." });
      }

      const titulo = String(req.body?.titulo ?? "").trim();
      const categoria = String(req.body?.categoria ?? "personal").trim() || "personal";
      const venceEl = String(req.body?.venceEl ?? "").slice(0, 10);
      const materiaId = req.body?.materiaId != null ? Number(req.body.materiaId) : null;
      const unidadId = req.body?.unidadId != null ? Number(req.body.unidadId) : null;
      if (!titulo) return res.status(400).json({ error: "La meta necesita un título." });
      if (!esFecha(venceEl)) {
        return res.status(400).json({ error: "Elegí una fecha de vencimiento válida." });
      }

      db.prepare(
        `UPDATE metas SET titulo = ?, categoria = ?, materia_id = ?, unidad_id = ?, vence_el = ?
          WHERE id = ?`
      ).run(titulo, categoria, materiaId, unidadId, venceEl, Number(req.params.id));
      res.json({ ok: true });
    })
  );

  // ── Archivar una meta (no se borra: se conserva historial) ─────────────────
  app.delete(
    "/api/objetivos/metas/:id",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "objetivos-metas");
      if (!usuario) return;
      if (!metaPropia.get(Number(req.params.id), usuario.id)) {
        return res.status(404).json({ error: "Esa meta no existe." });
      }
      db.prepare("UPDATE metas SET estado = 'archivada' WHERE id = ?").run(Number(req.params.id));
      res.json({ ok: true });
    })
  );

  // ── Completar / reabrir una meta (Error 2.D.15) ────────────────────────────
  // Completar NO marca las subtareas solas. Si quedan subtareas sin hacer, se
  // rechaza salvo que el estudiante confirme (`forzar`), y en ese caso se
  // completan de verdad (con fecha), no con un número inventado que después no
  // se revierte. Reabrir vuelve la meta a en-curso sin tocar las subtareas.
  app.put(
    "/api/objetivos/metas/:id/estado",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "objetivos-metas");
      if (!usuario) return;
      const meta = metaPropia.get(Number(req.params.id), usuario.id);
      if (!meta) return res.status(404).json({ error: "Esa meta no existe." });

      const completada = Boolean(req.body?.completada);
      const forzar = Boolean(req.body?.forzar);

      if (!completada) {
        db.prepare(
          "UPDATE metas SET estado = 'en-curso', completada_en = NULL WHERE id = ?"
        ).run(meta.id);
        return res.json({ ok: true, estado: "en-curso" });
      }

      const pendientes = db.prepare(
        "SELECT COUNT(*) AS n FROM subtareas WHERE meta_id = ? AND completada_en IS NULL"
      ).get(meta.id).n;

      if (pendientes > 0 && !forzar) {
        // No se falsifica el progreso: se avisa y se pide confirmación (2.D.15).
        return res.status(409).json({
          error: "La meta tiene subtareas sin completar.",
          requiereConfirmacion: true,
          pendientes,
        });
      }
      if (pendientes > 0 && forzar) {
        db.prepare(
          "UPDATE subtareas SET completada_en = datetime('now') WHERE meta_id = ? AND completada_en IS NULL"
        ).run(meta.id);
      }

      db.prepare(
        "UPDATE metas SET estado = 'completada', completada_en = datetime('now') WHERE id = ?"
      ).run(meta.id);
      res.json({ ok: true, estado: "completada" });
    })
  );

  // ── Subtareas (Errores 2.D.6 y 2.D.7): agregar, editar/completar, borrar ────
  app.post(
    "/api/objetivos/metas/:id/subtareas",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "objetivos-metas");
      if (!usuario) return;
      if (!metaPropia.get(Number(req.params.id), usuario.id)) {
        return res.status(404).json({ error: "Esa meta no existe." });
      }
      const titulo = String(req.body?.titulo ?? "").trim();
      if (!titulo) return res.status(400).json({ error: "La subtarea necesita un texto." });

      const orden = db.prepare(
        "SELECT COALESCE(MAX(orden) + 1, 0) AS n FROM subtareas WHERE meta_id = ?"
      ).get(Number(req.params.id)).n;

      const info = db.prepare(
        "INSERT INTO subtareas (meta_id, titulo, orden) VALUES (?, ?, ?)"
      ).run(Number(req.params.id), titulo, orden);
      res.status(201).json({ id: String(info.lastInsertRowid) });
    })
  );

  app.put(
    "/api/objetivos/subtareas/:id",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "objetivos-metas");
      if (!usuario) return;
      if (!subtareaPropia.get(Number(req.params.id), usuario.id)) {
        return res.status(404).json({ error: "Esa subtarea no existe." });
      }

      // Se puede cambiar el texto, el estado de completado, o ambos.
      if (typeof req.body?.titulo === "string") {
        const titulo = req.body.titulo.trim();
        if (!titulo) return res.status(400).json({ error: "La subtarea no puede quedar vacía." });
        db.prepare("UPDATE subtareas SET titulo = ? WHERE id = ?").run(titulo, Number(req.params.id));
      }
      if (req.body?.completada !== undefined) {
        db.prepare("UPDATE subtareas SET completada_en = ? WHERE id = ?").run(
          req.body.completada ? new Date().toISOString() : null,
          Number(req.params.id)
        );
      }
      res.json({ ok: true });
    })
  );

  app.delete(
    "/api/objetivos/subtareas/:id",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "objetivos-metas");
      if (!usuario) return;
      if (!subtareaPropia.get(Number(req.params.id), usuario.id)) {
        return res.status(404).json({ error: "Esa subtarea no existe." });
      }
      db.prepare("DELETE FROM subtareas WHERE id = ?").run(Number(req.params.id));
      res.json({ ok: true });
    })
  );

  // ── Hábitos (Error 2.D.3 y 14.9): crear, editar, archivar, marcar el día ────
  app.post(
    "/api/objetivos/habitos",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "objetivos-habitos");
      if (!usuario) return;
      const nombre = String(req.body?.nombre ?? "").trim();
      const frecuencia = req.body?.frecuencia === "semanal" ? "semanal" : "diario";
      if (!nombre) return res.status(400).json({ error: "El hábito necesita un nombre." });

      const info = db.prepare(
        "INSERT INTO habitos (estudiante_id, nombre, frecuencia) VALUES (?, ?, ?)"
      ).run(usuario.id, nombre, frecuencia);
      res.status(201).json({ id: String(info.lastInsertRowid) });
    })
  );

  app.put(
    "/api/objetivos/habitos/:id",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "objetivos-habitos");
      if (!usuario) return;
      if (!habitoPropio.get(Number(req.params.id), usuario.id)) {
        return res.status(404).json({ error: "Ese hábito no existe." });
      }
      const nombre = String(req.body?.nombre ?? "").trim();
      const frecuencia = req.body?.frecuencia === "semanal" ? "semanal" : "diario";
      if (!nombre) return res.status(400).json({ error: "El hábito necesita un nombre." });
      db.prepare("UPDATE habitos SET nombre = ?, frecuencia = ? WHERE id = ?")
        .run(nombre, frecuencia, Number(req.params.id));
      res.json({ ok: true });
    })
  );

  app.delete(
    "/api/objetivos/habitos/:id",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "objetivos-habitos");
      if (!usuario) return;
      if (!habitoPropio.get(Number(req.params.id), usuario.id)) {
        return res.status(404).json({ error: "Ese hábito no existe." });
      }
      db.prepare("UPDATE habitos SET archivado_en = datetime('now') WHERE id = ?")
        .run(Number(req.params.id));
      res.json({ ok: true });
    })
  );

  // Marcar / desmarcar el hábito HOY. Inserta o borra el registro de hoy; la
  // racha se recalcula sola de `habito_registros` (nunca se guarda a mano, 14.9).
  app.put(
    "/api/objetivos/habitos/:id/registro",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "objetivos-habitos");
      if (!usuario) return;
      if (!habitoPropio.get(Number(req.params.id), usuario.id)) {
        return res.status(404).json({ error: "Ese hábito no existe." });
      }
      const hoy = hoyISO();
      const cumplido = Boolean(req.body?.cumplido);
      if (cumplido) {
        db.prepare(
          `INSERT INTO habito_registros (habito_id, fecha) VALUES (?, ?)
           ON CONFLICT (habito_id, fecha) DO NOTHING`
        ).run(Number(req.params.id), hoy);
      } else {
        db.prepare("DELETE FROM habito_registros WHERE habito_id = ? AND fecha = ?")
          .run(Number(req.params.id), hoy);
      }
      res.json({ ok: true, cumplidoHoy: cumplido });
    })
  );

  // ── Competencias: cambiar de nivel y borrar evidencia (Error 2.D.12) ───────
  // La lectura del árbol de competencias ya vive arriba (GET /api/objetivos).
  // Faltaba la escritura: hasta ahora subir/bajar de nivel y borrar una
  // evidencia solo tocaban la memoria de la pantalla y se perdían al cambiar de
  // sección. Ahora persisten, y el servidor comprueba que cada estudiante solo
  // toque SUS competencias y evidencias.

  // Upsert sobre competencia_avances respetando UNIQUE(competencia_id,
  // estudiante_id): si el estudiante todavía no había marcado nivel en esa
  // competencia se crea la fila; si ya existía, se actualiza. En los dos casos
  // la fila es la del estudiante de la sesión, así que nadie mueve el nivel de
  // otro.
  app.put(
    "/api/objetivos/competencias/:id/nivel",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "competencias");
      if (!usuario) return;

      const nivel = String(req.body?.nivel ?? "");
      if (!NIVELES_COMPETENCIA.has(nivel)) {
        return res.status(400).json({ error: "Ese nivel no es válido." });
      }
      if (!competenciaEnEscuela.get(Number(req.params.id), usuario.institucionId)) {
        return res.status(404).json({ error: "Esa competencia no existe en tu escuela." });
      }

      db.prepare(
        `INSERT INTO competencia_avances (competencia_id, estudiante_id, nivel, actualizado_en)
              VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT (competencia_id, estudiante_id)
         DO UPDATE SET nivel = excluded.nivel, actualizado_en = datetime('now')`
      ).run(Number(req.params.id), usuario.id, nivel);

      res.json({ ok: true, nivel });
    })
  );

  // Borrar una evidencia. Solo si es del estudiante de la sesión: la fila lleva
  // estudiante_id, así que el permiso se decide por fila y no escondiendo el
  // botón. Si la evidencia no es suya (o no existe) responde 404, no 200.
  app.delete(
    "/api/objetivos/evidencias/:id",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "competencias");
      if (!usuario) return;
      if (!evidenciaPropia.get(Number(req.params.id), usuario.id)) {
        return res.status(404).json({ error: "Esa evidencia no existe." });
      }
      db.prepare("DELETE FROM evidencias WHERE id = ?").run(Number(req.params.id));
      res.json({ ok: true });
    })
  );

  // ── Resumen semanal + próximo hito (Errores 2.D.10 y 2.D.11 / 14.8) ────────
  // Algoritmo, no IA: compara la semana en curso (últimos 7 días) con la
  // anterior contando subtareas completadas y metas terminadas, y busca la meta
  // en curso más próxima a vencer. Si todo venció, muestra la más atrasada
  // (nunca la empuja al año siguiente, Error 2.D.14).
  app.get(
    "/api/objetivos/resumen",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "objetivos-metas");
      if (!usuario) return;

      const hoy = hoyISO();
      const inicioSemana = restarDias(hoy, 6);       // hoy y los 6 días previos
      const inicioSemanaPrevia = restarDias(hoy, 13);

      // Subtareas completadas en cada ventana (comparo por la parte de fecha).
      const subtareasSemana = db.prepare(
        `SELECT COUNT(*) AS n FROM subtareas s
           JOIN metas m ON m.id = s.meta_id
          WHERE m.estudiante_id = ? AND s.completada_en IS NOT NULL
            AND substr(s.completada_en, 1, 10) >= ?`
      ).get(usuario.id, inicioSemana).n;

      const subtareasPrevias = db.prepare(
        `SELECT COUNT(*) AS n FROM subtareas s
           JOIN metas m ON m.id = s.meta_id
          WHERE m.estudiante_id = ? AND s.completada_en IS NOT NULL
            AND substr(s.completada_en, 1, 10) >= ? AND substr(s.completada_en, 1, 10) < ?`
      ).get(usuario.id, inicioSemanaPrevia, inicioSemana).n;

      const metasTerminadas = db.prepare(
        `SELECT COUNT(*) AS n FROM metas
          WHERE estudiante_id = ? AND completada_en IS NOT NULL
            AND substr(completada_en, 1, 10) >= ?`
      ).get(usuario.id, inicioSemana).n;

      // Próximo hito: la meta en curso con vencimiento más cercano (o la más
      // atrasada si todas vencieron). El orden por fecha lo resuelve el ORDER BY.
      const proxima = db.prepare(
        `SELECT id, titulo, vence_el FROM metas
          WHERE estudiante_id = ? AND estado = 'en-curso'
          ORDER BY vence_el ASC LIMIT 1`
      ).get(usuario.id);

      const diff = subtareasSemana - subtareasPrevias;
      let mensaje;
      if (subtareasSemana === 0 && subtareasPrevias === 0) {
        mensaje = "Todavía no completaste subtareas esta semana. Empezá por la más chica.";
      } else if (diff > 0) {
        mensaje = `Completaste ${subtareasSemana} subtarea${subtareasSemana === 1 ? "" : "s"} esta semana, ${diff} más que la semana pasada. ¡Vas en subida!`;
      } else if (diff < 0) {
        mensaje = `Completaste ${subtareasSemana} subtarea${subtareasSemana === 1 ? "" : "s"} esta semana, ${Math.abs(diff)} menos que la anterior. Retomá el ritmo.`;
      } else {
        mensaje = `Mantuviste el ritmo: ${subtareasSemana} subtarea${subtareasSemana === 1 ? "" : "s"} esta semana, igual que la anterior.`;
      }

      res.json({
        semana: {
          subtareasCompletadas: subtareasSemana,
          subtareasSemanaPrevia: subtareasPrevias,
          metasTerminadas,
          ritmoPorDia: Math.round((subtareasSemana / 7) * 10) / 10,
          mensaje,
        },
        proximoHito: proxima
          ? { id: String(proxima.id), titulo: proxima.titulo, venceEl: proxima.vence_el }
          : null,
        hoy,
      });
    })
  );
}
