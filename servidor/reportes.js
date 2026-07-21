// ============================================================================
// NEXO — Reportes y expedientes (Etapa 8, sección 14.18)
// ----------------------------------------------------------------------------
//   GET  /api/reportes/opciones   → qué casillas hay y qué alumnos existen
//   POST /api/reportes/generar    → arma el documento y devuelve un archivo REAL
//   GET  /api/reportes/historial  → reportes ya generados (para volver a bajarlos)
//
// El pecado que corrige esta pieza (Errores 6.C.4 y 6.F.1 a 6.F.5): hoy el botón
// "Generar PDF" muestra un "generando…" de adorno y no entrega NADA. Acá el
// servidor consulta las tablas reales de `nexo.db`, arma un documento de texto
// con esos datos y lo guarda como un archivo de verdad (reutilizando el almacén
// de archivos.js). La pantalla después lo descarga por /api/archivos/:id.
//
// La dirección elige CON CASILLAS qué incluir (Error 6.F.3). Dos tipos:
//   - institucional: un panorama del colegio (perfiles, cursos, entregas, notas,
//     comunidad, biblioteca, quejas).
//   - expediente-alumno: la ficha de un alumno puntual, que puede incluir hasta
//     sus conversaciones de chat (Error 6.F.5), solo con autorización explícita.
//
// Permiso: página "reportes", exclusiva de la dirección (admin-academico). El
// administrador de PLATAFORMA no entra acá (Error 6.F.2, sección 5).
// ============================================================================

import { exigirAcceso, ventanilla, cursoDeEstudiante } from "./comun.js";
import { guardarArchivoServidor } from "./archivos.js";

// Bloques disponibles para el reporte institucional. La pantalla dibuja una
// casilla por cada uno; el servidor arma solo los que llegan marcados.
const BLOQUES_INSTITUCIONAL = [
  { clave: "perfiles", etiqueta: "Actividad de perfiles" },
  { clave: "cursos", etiqueta: "Cursos e inscripciones" },
  { clave: "entregas", etiqueta: "Entregas de tareas" },
  { clave: "calificaciones", etiqueta: "Calificaciones por materia" },
  { clave: "comunidad", etiqueta: "Participación en la comunidad" },
  { clave: "biblioteca", etiqueta: "Biblioteca y recursos" },
  { clave: "quejas", etiqueta: "Quejas anónimas" },
];

// Bloques del expediente de un alumno. "chats" va aparte: es sensible y por eso
// requiere marcar además la autorización (ver más abajo).
const BLOQUES_EXPEDIENTE = [
  { clave: "academico", etiqueta: "Datos académicos" },
  { clave: "entregas", etiqueta: "Entregas y su estado" },
  { clave: "calificaciones", etiqueta: "Calificaciones" },
  { clave: "objetivos", etiqueta: "Metas y hábitos" },
  { clave: "competencias", etiqueta: "Competencias" },
  { clave: "chats", etiqueta: "Conversaciones de chat (requiere autorización)" },
];

// ── Ayudas de formato ───────────────────────────────────────────────────────
function titulo(texto) {
  return `\n${texto}\n${"─".repeat(texto.length)}`;
}
function fechaLegible(iso) {
  if (!iso) return "—";
  return String(iso).replace("T", " ").slice(0, 16);
}

export function registrarReportes(app, db, carpeta) {
  // ── Consultas reutilizadas ────────────────────────────────────────────────
  const institucion = db.prepare(
    "SELECT id, nombre, ciclo_lectivo FROM instituciones WHERE id = ?"
  );
  const alumnosDeInstitucion = db.prepare(
    `SELECT u.id, u.nombre
       FROM usuarios u
      WHERE u.institucion_id = ? AND u.rol = 'estudiante' AND u.estado = 'activo'
      ORDER BY u.nombre`
  );
  const cursosDeInstitucion = db.prepare(
    "SELECT id, anio, division FROM cursos WHERE institucion_id = ? ORDER BY anio, division"
  );

  // ── Opciones para dibujar la pantalla ─────────────────────────────────────
  app.get(
    "/api/reportes/opciones",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "reportes");
      if (!usuario) return;

      // El curso de cada alumno, para poder mostrar "Julieta — 4° B" al elegir.
      const alumnos = alumnosDeInstitucion.all(usuario.institucionId).map((a) => {
        const curso = cursoDeEstudiante(db, a.id);
        return { id: String(a.id), nombre: a.nombre, curso: curso?.nombre ?? "—" };
      });

      res.json({
        bloquesInstitucional: BLOQUES_INSTITUCIONAL,
        bloquesExpediente: BLOQUES_EXPEDIENTE,
        cursos: cursosDeInstitucion
          .all(usuario.institucionId)
          .map((c) => ({ id: String(c.id), nombre: `${c.anio}° ${c.division}` })),
        alumnos,
      });
    })
  );

  // ── Generar ───────────────────────────────────────────────────────────────
  app.post(
    "/api/reportes/generar",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "reportes");
      if (!usuario) return;

      const tipo = String(req.body?.tipo ?? "");
      const bloques = req.body?.bloques ?? {};
      const marcado = (clave) => bloques[clave] === true;

      const inst = institucion.get(usuario.institucionId);
      if (!inst) return res.status(400).json({ error: "Institución no encontrada." });

      let lineas;
      let nombreArchivo;

      if (tipo === "institucional") {
        const elegidos = BLOQUES_INSTITUCIONAL.filter((b) => marcado(b.clave));
        if (elegidos.length === 0) {
          return res
            .status(400)
            .json({ error: "Marcá al menos un bloque para el reporte." });
        }
        lineas = armarInstitucional(db, inst, elegidos, usuario);
        nombreArchivo = `reporte-institucional-${inst.ciclo_lectivo}.txt`;
      } else if (tipo === "expediente-alumno") {
        const estudianteId = Number(req.body?.estudianteId);
        // El alumno tiene que ser de ESTA institución: la dirección no arma
        // expedientes de alumnos de otro colegio (permiso de fila, regla de oro 4).
        const alumno = db
          .prepare(
            "SELECT id, nombre, email FROM usuarios WHERE id = ? AND institucion_id = ? AND rol = 'estudiante'"
          )
          .get(estudianteId, usuario.institucionId);
        if (!alumno) {
          return res
            .status(404)
            .json({ error: "Ese alumno no existe en tu institución." });
        }
        const elegidos = BLOQUES_EXPEDIENTE.filter((b) => marcado(b.clave));
        if (elegidos.length === 0) {
          return res
            .status(400)
            .json({ error: "Marcá al menos un bloque para el expediente." });
        }
        // Las conversaciones son datos sensibles: solo se incluyen si además de
        // marcar la casilla se confirma la autorización (Error 6.F.5).
        const incluirChats = marcado("chats") && req.body?.autorizaChats === true;
        lineas = armarExpediente(db, inst, alumno, elegidos, incluirChats, usuario);
        nombreArchivo = `expediente-${alumno.nombre.replace(/\s+/g, "-").toLowerCase()}.txt`;
      } else {
        return res.status(400).json({ error: "Tipo de reporte desconocido." });
      }

      const contenido = lineas.join("\n") + "\n";
      const bytes = Buffer.from(contenido, "utf-8");

      // Se guarda como archivo real (mismo almacén que las subidas). Quien lo
      // generó es el dueño → puede bajarlo por /api/archivos/:id (archivos.js).
      const guardado = guardarArchivoServidor(db, carpeta, {
        nombreOriginal: nombreArchivo,
        tipoMime: "text/plain",
        bytes,
        subidoPor: usuario.id,
      });

      // Queda registrado quién lo generó, cuándo y con qué casillas (14.18).
      db.prepare(
        `INSERT INTO reportes_generados (generado_por, tipo, parametros_json, archivo_id)
         VALUES (?, ?, ?, ?)`
      ).run(usuario.id, tipo, JSON.stringify(req.body?.bloques ?? {}), guardado.id);

      res.status(201).json({
        archivoId: String(guardado.id),
        nombreArchivo: guardado.nombreOriginal,
        tamanoBytes: guardado.tamanoBytes,
      });
    })
  );

  // ── Historial ─────────────────────────────────────────────────────────────
  // Los reportes generados por gente de esta institución, para volver a bajarlos.
  const historial = db.prepare(
    `SELECT r.id, r.tipo, r.generado_en, r.archivo_id, u.nombre AS generado_por
       FROM reportes_generados r
       JOIN usuarios u ON u.id = r.generado_por
      WHERE u.institucion_id = ?
      ORDER BY r.generado_en DESC, r.id DESC
      LIMIT 30`
  );

  app.get(
    "/api/reportes/historial",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "reportes");
      if (!usuario) return;

      res.json({
        reportes: historial.all(usuario.institucionId).map((r) => ({
          id: String(r.id),
          tipo: r.tipo,
          generadoPor: r.generado_por,
          generadoEn: r.generado_en,
          archivoId: r.archivo_id === null ? null : String(r.archivo_id),
        })),
      });
    })
  );
}

// ============================================================================
// Armado del REPORTE INSTITUCIONAL — todo sale de nexo.db
// ============================================================================
function armarInstitucional(db, inst, bloques, usuario) {
  const L = [];
  L.push("REPORTE INSTITUCIONAL — NEXO");
  L.push(`Institución: ${inst.nombre}  ·  Ciclo lectivo: ${inst.ciclo_lectivo}`);
  L.push(`Generado: ${fechaLegible(new Date().toISOString())}  ·  Por: ${usuario.nombre}`);
  L.push(`Bloques incluidos: ${bloques.map((b) => b.etiqueta).join(", ")}`);

  for (const b of bloques) {
    L.push(titulo(b.etiqueta.toUpperCase()));
    if (b.clave === "perfiles") {
      const filas = db
        .prepare(
          `SELECT rol, COUNT(*) AS n FROM usuarios
            WHERE institucion_id = ? AND estado = 'activo'
            GROUP BY rol ORDER BY n DESC`
        )
        .all(inst.id);
      if (filas.length === 0) L.push("  Sin perfiles activos.");
      for (const f of filas) L.push(`  ${f.rol.padEnd(20)} ${f.n}`);
    } else if (b.clave === "cursos") {
      const filas = db
        .prepare(
          `SELECT c.anio, c.division, COUNT(i.id) AS inscriptos
             FROM cursos c
             LEFT JOIN inscripciones i ON i.curso_id = c.id
            WHERE c.institucion_id = ?
            GROUP BY c.id ORDER BY c.anio, c.division`
        )
        .all(inst.id);
      if (filas.length === 0) L.push("  Sin cursos cargados.");
      for (const f of filas)
        L.push(`  ${f.anio}° ${f.division}: ${f.inscriptos} alumno(s) inscripto(s)`);
    } else if (b.clave === "entregas") {
      const t = db
        .prepare(
          `SELECT COUNT(*) AS n FROM tareas t
             JOIN catedras ca ON ca.id = t.catedra_id
             JOIN cursos c ON c.id = ca.curso_id
            WHERE c.institucion_id = ? AND t.eliminado_en IS NULL`
        )
        .get(inst.id);
      const e = db
        .prepare(
          `SELECT COUNT(*) AS n FROM entregas en
             JOIN tareas t ON t.id = en.tarea_id
             JOIN catedras ca ON ca.id = t.catedra_id
             JOIN cursos c ON c.id = ca.curso_id
            WHERE c.institucion_id = ? AND en.anulada_en IS NULL`
        )
        .get(inst.id);
      const corr = db
        .prepare(
          `SELECT COUNT(*) AS n FROM correcciones co
             JOIN entregas en ON en.id = co.entrega_id
             JOIN tareas t ON t.id = en.tarea_id
             JOIN catedras ca ON ca.id = t.catedra_id
             JOIN cursos c ON c.id = ca.curso_id
            WHERE c.institucion_id = ?`
        )
        .get(inst.id);
      L.push(`  Tareas asignadas: ${t.n}`);
      L.push(`  Entregas realizadas: ${e.n}`);
      L.push(`  Entregas corregidas: ${corr.n}`);
      L.push(`  Entregas pendientes de corrección: ${Math.max(e.n - corr.n, 0)}`);
    } else if (b.clave === "calificaciones") {
      const gen = db
        .prepare(
          `SELECT ROUND(AVG(co.nota), 2) AS prom, COUNT(co.nota) AS n
             FROM correcciones co
             JOIN entregas en ON en.id = co.entrega_id
             JOIN tareas t ON t.id = en.tarea_id
             JOIN catedras ca ON ca.id = t.catedra_id
             JOIN cursos c ON c.id = ca.curso_id
            WHERE c.institucion_id = ? AND co.nota IS NOT NULL`
        )
        .get(inst.id);
      L.push(`  Promedio general: ${gen.prom ?? "—"} (sobre ${gen.n} nota[s])`);
      const porMateria = db
        .prepare(
          `SELECT m.nombre AS materia, ROUND(AVG(co.nota), 2) AS prom, COUNT(co.nota) AS n
             FROM correcciones co
             JOIN entregas en ON en.id = co.entrega_id
             JOIN tareas t ON t.id = en.tarea_id
             JOIN catedras ca ON ca.id = t.catedra_id
             JOIN cursos c ON c.id = ca.curso_id
             JOIN materias m ON m.id = ca.materia_id
            WHERE c.institucion_id = ? AND co.nota IS NOT NULL
            GROUP BY m.id ORDER BY m.nombre`
        )
        .all(inst.id);
      if (porMateria.length === 0) L.push("  Todavía no hay notas cargadas.");
      for (const f of porMateria)
        L.push(`  ${f.materia.padEnd(24)} promedio ${f.prom} (${f.n} nota[s])`);
    } else if (b.clave === "comunidad") {
      const pub = db
        .prepare(
          "SELECT COUNT(*) AS n FROM publicaciones WHERE institucion_id = ? AND eliminado_en IS NULL"
        )
        .get(inst.id);
      const deb = db
        .prepare(
          "SELECT COUNT(*) AS n FROM debates WHERE institucion_id = ? AND eliminado_en IS NULL"
        )
        .get(inst.id);
      const com = db
        .prepare(
          `SELECT COUNT(*) AS n FROM comentarios cm
             JOIN usuarios u ON u.id = cm.usuario_id
            WHERE u.institucion_id = ? AND cm.eliminado_en IS NULL`
        )
        .get(inst.id);
      const vot = db
        .prepare(
          `SELECT COUNT(*) AS n FROM votos v
             JOIN usuarios u ON u.id = v.usuario_id
            WHERE u.institucion_id = ?`
        )
        .get(inst.id);
      L.push(`  Publicaciones: ${pub.n}`);
      L.push(`  Debates: ${deb.n}`);
      L.push(`  Comentarios: ${com.n}`);
      L.push(`  Votos emitidos: ${vot.n}`);
    } else if (b.clave === "biblioteca") {
      const filas = db
        .prepare(
          `SELECT estado, COUNT(*) AS n FROM recursos
            WHERE institucion_id = ? GROUP BY estado`
        )
        .all(inst.id);
      if (filas.length === 0) L.push("  Sin recursos cargados.");
      for (const f of filas) L.push(`  ${f.estado.padEnd(14)} ${f.n}`);
    } else if (b.clave === "quejas") {
      const total = db
        .prepare("SELECT COUNT(*) AS n FROM quejas WHERE institucion_id = ?")
        .get(inst.id);
      const mes = db
        .prepare(
          "SELECT COUNT(*) AS n FROM quejas WHERE institucion_id = ? AND strftime('%Y-%m', creado_en) = strftime('%Y-%m','now')"
        )
        .get(inst.id);
      const sinVer = db
        .prepare(
          "SELECT COUNT(*) AS n FROM quejas WHERE institucion_id = ? AND vista_en IS NULL"
        )
        .get(inst.id);
      L.push(`  Total histórico: ${total.n}`);
      L.push(`  Este mes: ${mes.n}`);
      L.push(`  Sin leer: ${sinVer.n}`);
    }
  }
  L.push("\n" + "═".repeat(60));
  L.push("Documento generado por NEXO a partir de datos reales de la base.");
  return L;
}

// ============================================================================
// Armado del EXPEDIENTE de un alumno — todo sale de nexo.db (Error 6.F.5)
// ============================================================================
function armarExpediente(db, inst, alumno, bloques, incluirChats, usuario) {
  const L = [];
  const curso = cursoDeEstudiante(db, alumno.id);
  L.push("EXPEDIENTE DEL ALUMNO — NEXO");
  L.push(`Institución: ${inst.nombre}  ·  Ciclo lectivo: ${inst.ciclo_lectivo}`);
  L.push(`Alumno: ${alumno.nombre}  ·  Curso: ${curso?.nombre ?? "—"}`);
  L.push(`Generado: ${fechaLegible(new Date().toISOString())}  ·  Por: ${usuario.nombre}`);

  for (const b of bloques) {
    if (b.clave === "chats") continue; // se maneja al final, aparte
    L.push(titulo(b.etiqueta.toUpperCase()));
    if (b.clave === "academico") {
      L.push(`  Nombre: ${alumno.nombre}`);
      L.push(`  Email: ${alumno.email}`);
      L.push(`  Curso: ${curso?.nombre ?? "—"}`);
      const materias = curso
        ? db
            .prepare(
              `SELECT m.nombre AS materia, u.nombre AS profesor
                 FROM catedras ca
                 JOIN materias m ON m.id = ca.materia_id
                 JOIN usuarios u ON u.id = ca.profesor_id
                WHERE ca.curso_id = ? ORDER BY m.nombre`
            )
            .all(curso.id)
        : [];
      if (materias.length === 0) L.push("  Sin materias asociadas.");
      for (const m of materias) L.push(`  · ${m.materia} — ${m.profesor}`);
    } else if (b.clave === "entregas") {
      const filas = db
        .prepare(
          `SELECT t.titulo, en.entregado_en, en.anulada_en, co.nota
             FROM entregas en
             JOIN tareas t ON t.id = en.tarea_id
             LEFT JOIN correcciones co ON co.entrega_id = en.id
            WHERE en.estudiante_id = ?
            ORDER BY en.entregado_en DESC`
        )
        .all(alumno.id);
      if (filas.length === 0) L.push("  Sin entregas registradas.");
      for (const f of filas) {
        const estado = f.anulada_en
          ? "ANULADA"
          : f.nota != null
          ? `corregida (nota ${f.nota})`
          : "entregada, sin corregir";
        L.push(`  · ${f.titulo} — ${fechaLegible(f.entregado_en)} — ${estado}`);
      }
    } else if (b.clave === "calificaciones") {
      const filas = db
        .prepare(
          `SELECT t.titulo, m.nombre AS materia, co.nota, co.devolucion
             FROM correcciones co
             JOIN entregas en ON en.id = co.entrega_id
             JOIN tareas t ON t.id = en.tarea_id
             JOIN catedras ca ON ca.id = t.catedra_id
             JOIN materias m ON m.id = ca.materia_id
            WHERE en.estudiante_id = ? AND co.nota IS NOT NULL
            ORDER BY m.nombre`
        )
        .all(alumno.id);
      if (filas.length === 0) L.push("  Sin calificaciones.");
      for (const f of filas)
        L.push(`  · ${f.materia} — ${f.titulo}: ${f.nota}`);
      const prom = db
        .prepare(
          `SELECT ROUND(AVG(co.nota), 2) AS p FROM correcciones co
             JOIN entregas en ON en.id = co.entrega_id
            WHERE en.estudiante_id = ? AND co.nota IS NOT NULL`
        )
        .get(alumno.id);
      if (prom.p != null) L.push(`  Promedio general: ${prom.p}`);
    } else if (b.clave === "objetivos") {
      const metas = db
        .prepare(
          `SELECT estado, COUNT(*) AS n FROM metas WHERE estudiante_id = ? GROUP BY estado`
        )
        .all(alumno.id);
      const hab = db
        .prepare(
          "SELECT COUNT(*) AS n FROM habitos WHERE estudiante_id = ? AND archivado_en IS NULL"
        )
        .get(alumno.id);
      if (metas.length === 0) L.push("  Sin metas cargadas.");
      for (const m of metas) L.push(`  Metas ${m.estado}: ${m.n}`);
      L.push(`  Hábitos activos: ${hab.n}`);
    } else if (b.clave === "competencias") {
      const filas = db
        .prepare(
          `SELECT c.nombre, av.nivel
             FROM competencia_avances av
             JOIN competencias c ON c.id = av.competencia_id
            WHERE av.estudiante_id = ? ORDER BY c.nombre`
        )
        .all(alumno.id);
      if (filas.length === 0) L.push("  Sin avances de competencias.");
      for (const f of filas) L.push(`  · ${f.nombre}: ${f.nivel}`);
    }
  }

  // ── Conversaciones (sensible: solo con autorización explícita) ─────────────
  if (bloques.some((b) => b.clave === "chats")) {
    L.push(titulo("CONVERSACIONES DE CHAT"));
    if (!incluirChats) {
      L.push(
        "  No se incluyeron: falta la confirmación de autorización para exportar"
      );
      L.push("  las conversaciones privadas del alumno.");
    } else {
      const convs = db
        .prepare(
          `SELECT cv.id, cv.tipo
             FROM conversaciones cv
             JOIN conversacion_miembros cm ON cm.conversacion_id = cv.id
            WHERE cm.usuario_id = ?
            ORDER BY cv.id`
        )
        .all(alumno.id);
      if (convs.length === 0) L.push("  El alumno no tiene conversaciones.");
      for (const cv of convs) {
        const otros = db
          .prepare(
            `SELECT u.nombre FROM conversacion_miembros cm
               JOIN usuarios u ON u.id = cm.usuario_id
              WHERE cm.conversacion_id = ? AND cm.usuario_id <> ?`
          )
          .all(cv.id, alumno.id)
          .map((o) => o.nombre)
          .join(", ");
        L.push(`\n  Conversación #${cv.id} (${cv.tipo}) con: ${otros || "—"}`);
        const msgs = db
          .prepare(
            `SELECT u.nombre AS autor, m.contenido, m.enviado_en, m.eliminado_en
               FROM mensajes m JOIN usuarios u ON u.id = m.autor_id
              WHERE m.conversacion_id = ?
              ORDER BY m.enviado_en`
          )
          .all(cv.id);
        if (msgs.length === 0) L.push("    (sin mensajes)");
        for (const m of msgs) {
          if (m.eliminado_en) {
            L.push(`    [${fechaLegible(m.enviado_en)}] ${m.autor}: (mensaje eliminado)`);
          } else {
            L.push(`    [${fechaLegible(m.enviado_en)}] ${m.autor}: ${m.contenido}`);
          }
        }
      }
    }
  }

  L.push("\n" + "═".repeat(60));
  L.push("Expediente confidencial. Generado por NEXO desde la base de datos real.");
  return L;
}
