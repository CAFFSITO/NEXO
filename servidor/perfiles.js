// ============================================================================
// NEXO — Ventanillas de Gestión de Perfiles y de Cursos (Etapas 2 y 3)
// ----------------------------------------------------------------------------
// Las dos pantallas con las que la dirección administra el colegio. Hasta la
// Etapa 2 las dos solo LEÍAN: mostraban la lista real, pero el alta y el borrado
// vivían en la memoria de la pantalla y se perdían al recargar.
//
// Ventanillas de lectura:
//   GET  /api/perfiles  → la gente del colegio de quien pregunta
//   GET  /api/cursos    → las divisiones, con sus números calculados
//
// Ventanillas de escritura (Etapa 3, Errores 6.B.3, 6.B.4, 6.B.5, sección 14.17):
//   POST   /api/perfiles              → alta con cuenta y contraseña REALES
//   PATCH  /api/perfiles/:id          → editar nombre, correo, rol, estado
//   POST   /api/perfiles/:id/papelera → baja suave (papelera, restaurable 7 días)
//   POST   /api/perfiles/:id/restaurar→ sacar de la papelera
//
// Todo se decide en la cocina (regla de oro 4): que la pantalla no muestre el
// botón no alcanza; la ventanilla vuelve a comprobar el rol y la institución.
// ============================================================================

import { randomBytes } from "node:crypto";
import { exigirAcceso, ventanilla } from "./comun.js";
import { hashearContrasena, validarContrasena } from "./contrasenas.js";

// Los roles que la dirección de un colegio puede dar de alta DENTRO de su
// institución. Están los ocho de NEXO menos 'administrador': el operador de
// plataforma no pertenece a ninguna escuela y no lo crea una dirección
// (sección 1.1). Familia y Bibliotecario SÍ están, que era justo lo que faltaba
// (Error 6.B.4). Un rol fuera de esta lista lo rechaza el servidor, no la
// pantalla.
const ROLES_QUE_CREA_LA_DIRECCION = new Set([
  "estudiante",
  "profesor",
  "preceptor",
  "admin-academico",
  "centro-estudiantes",
  "bibliotecario",
  "familia",
]);

// Días que un perfil sobrevive en la papelera antes de borrarse para siempre
// (sección 14.17). El mismo número lo muestra la pantalla como "quedan N días".
const DIAS_EN_PAPELERA = 7;

// Contraseña inicial legible que se le entrega a la persona recién creada. No es
// para memorizar: la cambia en su primera entrada desde Configuración. randomBytes
// y no Math.random porque con esto se entra a una cuenta real.
function generarContrasenaInicial() {
  // 9 bytes → 12 caracteres base64url (sin símbolos raros ni relleno).
  return randomBytes(9).toString("base64url");
}

// Qué dice la columna "asignación" de cada rol. Los roles cuya asignación es su
// propio cargo no salen de una consulta: no hay nada que buscar, el rol ES la
// asignación.
const ASIGNACION_FIJA = {
  "admin-academico": "Dirección Académica",
  bibliotecario: "Biblioteca",
  "centro-estudiantes": "Centro de Estudiantes",
};

export function registrarPerfiles(app, db) {
  // ── Las personas ──────────────────────────────────────────────────────────
  // Solo las del colegio de quien pregunta: el `institucion_id` del filtro sale
  // de la sesión, no de la dirección web. Si viniera del navegador, cambiar un
  // número en la barra dejaría a la dirección de un colegio leer la gente de
  // otro. El administrador de plataforma no aparece nunca acá porque no
  // pertenece a ningún colegio (su institucion_id es NULL) — que es exactamente
  // lo que pide la sección 1.1: no debe ver los datos internos de una escuela.
  const listarPersonas = db.prepare(
    `SELECT id, nombre, email, rol, estado, avatar_url, eliminado_en
       FROM usuarios
      WHERE institucion_id = ?
      ORDER BY nombre`
  );

  const cursoDe = db.prepare(
    `SELECT c.anio, c.division
       FROM inscripciones i
       JOIN cursos c ON c.id = i.curso_id
      WHERE i.estudiante_id = ?
      ORDER BY c.anio, c.division`
  );

  const catedrasDe = db.prepare(
    `SELECT DISTINCT m.nombre
       FROM catedras ca
       JOIN materias m ON m.id = ca.materia_id
      WHERE ca.profesor_id = ?
      ORDER BY m.nombre`
  );

  const cursosACargoDe = db.prepare(
    `SELECT anio, division FROM cursos
      WHERE preceptor_id = ?
      ORDER BY anio, division`
  );

  const hijosDe = db.prepare(
    `SELECT u.nombre
       FROM familiares f
       JOIN usuarios u ON u.id = f.estudiante_id
      WHERE f.usuario_familia_id = ?
      ORDER BY u.nombre`
  );

  /** Qué hace esta persona en el colegio, leído de la base y no inventado. */
  function asignacionDe(fila) {
    if (Object.hasOwn(ASIGNACION_FIJA, fila.rol)) {
      return ASIGNACION_FIJA[fila.rol];
    }

    if (fila.rol === "estudiante") {
      const cursos = cursoDe.all(fila.id);
      if (cursos.length === 0) return "Sin curso asignado";
      return cursos.map((c) => `${c.anio}° ${c.division}`).join(", ");
    }

    if (fila.rol === "profesor") {
      const materias = catedrasDe.all(fila.id);
      if (materias.length === 0) return "Sin cátedra asignada";
      return materias.map((m) => `Cátedra de ${m.nombre}`).join(", ");
    }

    if (fila.rol === "preceptor") {
      const cursos = cursosACargoDe.all(fila.id);
      if (cursos.length === 0) return "Sin curso a cargo";
      return cursos.map((c) => `${c.anio}° ${c.division}`).join(", ");
    }

    if (fila.rol === "familia") {
      const hijos = hijosDe.all(fila.id);
      if (hijos.length === 0) return "Sin estudiante vinculado";
      return hijos.map((h) => h.nombre).join(", ");
    }

    return "";
  }

  app.get(
    "/api/perfiles",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "perfiles-academicos");
      if (!usuario) return;

      // Antes de listar, sacar de la papelera lo que ya pasó los 7 días
      // (sección 14.17). La misma rutina corre sola cada pocas horas
      // (programarPurgaPapelera), pero se la llama también acá para que la lista
      // se vea al día en el momento en que la dirección la abre.
      purgarPapeleraVencida(db, usuario.institucionId);

      const perfiles = listarPersonas.all(usuario.institucionId).map((fila) => ({
        id: String(fila.id),
        nombre: fila.nombre,
        // El "ID: #48291" y la "Matrícula: DOC-331" que mostraba la tabla no
        // existen: los sorteaba `Math.random()` al crear cada perfil. La base
        // no guarda matrículas. Lo que sí identifica a una persona de forma
        // única y real es su correo, que además es con lo que entra.
        identificador: fila.email,
        email: fila.email,
        rol: fila.rol,
        asignacion: asignacionDe(fila),
        estado: fila.estado,
        avatarUrl: fila.avatar_url ?? undefined,
        eliminadoEn: fila.eliminado_en,
      }));

      res.json({ perfiles });
    })
  );

  // ── Los cursos ────────────────────────────────────────────────────────────
  // Cada número de la tarjeta se cuenta en la base en el momento de preguntar.
  // Antes estaban escritos ("28 estudiantes", "12 materias") y no se movían
  // aunque se inscribiera gente: eran decoración.
  const listarCursos = db.prepare(
    `SELECT c.id,
            c.anio,
            c.division,
            p.nombre AS preceptor,
            (SELECT COUNT(*) FROM inscripciones i WHERE i.curso_id = c.id) AS estudiantes,
            (SELECT COUNT(*) FROM catedras ca WHERE ca.curso_id = c.id)    AS materias
       FROM cursos c
       LEFT JOIN usuarios p ON p.id = c.preceptor_id
      WHERE c.institucion_id = ?
      ORDER BY c.anio, c.division`
  );

  const contarDocentes = db.prepare(
    `SELECT COUNT(*) AS total FROM usuarios
      WHERE institucion_id = ? AND rol = 'profesor' AND estado = 'activo'`
  );

  const contarMaterias = db.prepare(
    "SELECT COUNT(*) AS total FROM materias WHERE institucion_id = ?"
  );

  // Avance del cronograma: cuántas de las tareas del colegio ya pasaron su
  // fecha límite. Reemplaza al "Progreso Académico General: 65%", que era un
  // número escrito a mano. Es una cuenta modesta y honesta: dice qué parte del
  // trabajo planificado ya venció, no cuánto aprendieron los chicos.
  const avanceCronograma = db.prepare(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN t.fecha_limite < date('now') THEN 1 ELSE 0 END) AS vencidas
       FROM tareas t
       JOIN catedras ca ON ca.id = t.catedra_id
       JOIN cursos c    ON c.id = ca.curso_id
      WHERE c.institucion_id = ?
        AND t.eliminado_en IS NULL`
  );

  // Lo que de verdad pasó en los últimos 7 días. Reemplaza a los dos titulares
  // fijos de la tarjeta de reporte ("Optimización de horarios", "Asistencia:
  // 92% global"), que no salían de ningún lado.
  const actividadSemanal = db.prepare(
    `SELECT
       (SELECT COUNT(*) FROM correcciones co
          JOIN entregas e  ON e.id = co.entrega_id
          JOIN tareas t    ON t.id = e.tarea_id
          JOIN catedras ca ON ca.id = t.catedra_id
          JOIN cursos c    ON c.id = ca.curso_id
         WHERE c.institucion_id = ?1
           AND co.corregido_en >= datetime('now', '-7 days')) AS correcciones,
       (SELECT COUNT(*) FROM entregas e
          JOIN tareas t    ON t.id = e.tarea_id
          JOIN catedras ca ON ca.id = t.catedra_id
          JOIN cursos c    ON c.id = ca.curso_id
         WHERE c.institucion_id = ?1
           AND e.anulada_en IS NULL
           AND e.entregado_en >= datetime('now', '-7 days')) AS entregas,
       (SELECT COUNT(*) FROM eventos ev
         WHERE ev.institucion_id = ?1
           AND ev.creado_en >= datetime('now', '-7 days')) AS eventos`
  );

  app.get(
    "/api/cursos",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "cursos-activos");
      if (!usuario) return;

      const institucionId = usuario.institucionId;

      const cursos = listarCursos.all(institucionId).map((fila) => ({
        id: String(fila.id),
        anio: fila.anio,
        division: fila.division,
        preceptor: fila.preceptor ?? null,
        estudiantes: fila.estudiantes,
        materias: fila.materias,
        activo: true,
      }));

      const avance = avanceCronograma.get(institucionId);
      const semana = actividadSemanal.get(institucionId);

      res.json({
        cursos,
        ciclo: {
          // Cuántas personas hay inscriptas en algún curso, sumando los cursos:
          // el mismo número que muestran las tarjetas, no una cuenta aparte que
          // pueda contradecirlas.
          inscripciones: cursos.reduce((suma, c) => suma + c.estudiantes, 0),
          docentes: contarDocentes.get(institucionId).total,
          // La pantalla mostraba "Aulas: cursos × 6". No hay aulas en la base y
          // ese número no significaba nada. Las materias sí existen y sí son
          // parte del estado del ciclo.
          materias: contarMaterias.get(institucionId).total,
          avanceCronograma:
            avance.total === 0
              ? 0
              : Math.round(((avance.vencidas ?? 0) / avance.total) * 100),
        },
        semana: {
          correcciones: semana.correcciones,
          entregas: semana.entregas,
          eventos: semana.eventos,
        },
      });
    })
  );

  // ── Detalle de un curso (solo lectura, Error 6.C.2) ─────────────────────────
  // La dirección abre "Ver detalle" de un curso y ve, en modo lectura, lo que ese
  // curso tiene de verdad: sus cátedras con el profesor real de cada una, sus
  // alumnos inscriptos, su preceptor y las tareas de sus cátedras. Todo se cuenta
  // en la base al momento; nada escrito a mano. El curso tiene que ser del MISMO
  // colegio que quien pregunta (el institucion_id sale de la sesión): pedir el
  // detalle de un curso de otra institución responde 404, no filtra nada.
  const cursoPorId = db.prepare(
    `SELECT c.id, c.anio, c.division, c.institucion_id, p.nombre AS preceptor
       FROM cursos c
       LEFT JOIN usuarios p ON p.id = c.preceptor_id
      WHERE c.id = ?`
  );

  const catedrasDelCurso = db.prepare(
    `SELECT m.nombre AS materia, pr.nombre AS profesor
       FROM catedras ca
       JOIN materias m  ON m.id = ca.materia_id
       JOIN usuarios pr ON pr.id = ca.profesor_id
      WHERE ca.curso_id = ?
      ORDER BY m.nombre`
  );

  const alumnosDelCurso = db.prepare(
    `SELECT u.nombre, u.email
       FROM inscripciones i
       JOIN usuarios u ON u.id = i.estudiante_id
      WHERE i.curso_id = ?
      ORDER BY u.nombre`
  );

  const tareasDelCurso = db.prepare(
    `SELECT t.titulo,
            m.nombre AS materia,
            t.fecha_limite,
            (SELECT COUNT(*) FROM entregas e
              WHERE e.tarea_id = t.id AND e.anulada_en IS NULL) AS cantidad_entregas
       FROM tareas t
       JOIN catedras ca ON ca.id = t.catedra_id
       JOIN materias m  ON m.id = ca.materia_id
      WHERE ca.curso_id = ?
        AND t.eliminado_en IS NULL
      ORDER BY t.fecha_limite DESC`
  );

  app.get(
    "/api/cursos/:id/detalle",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "cursos-activos");
      if (!usuario) return;

      const id = Number(req.params.id);
      const curso = cursoPorId.get(id);
      // Mismo criterio que perfilDelColegio: si no existe o es de otro colegio,
      // 404. La dirección de un colegio no puede espiar los cursos de otro
      // cambiando el número en la URL.
      if (!curso || curso.institucion_id !== usuario.institucionId) {
        return res.status(404).json({ error: "Ese curso no existe en tu institución." });
      }

      res.json({
        curso: { id: String(curso.id), anio: curso.anio, division: curso.division },
        preceptor: curso.preceptor ?? null,
        catedras: catedrasDelCurso.all(id).map((f) => ({
          materia: f.materia,
          profesor: f.profesor,
        })),
        alumnos: alumnosDelCurso.all(id).map((f) => ({
          nombre: f.nombre,
          email: f.email,
        })),
        tareas: tareasDelCurso.all(id).map((f) => ({
          titulo: f.titulo,
          materia: f.materia,
          fechaLimite: f.fecha_limite,
          cantidadEntregas: f.cantidad_entregas,
        })),
      });
    })
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  ESCRITURA (Etapa 3) — alta, edición y papelera de perfiles
  // ══════════════════════════════════════════════════════════════════════════

  const buscarEmail = db.prepare("SELECT id FROM usuarios WHERE email = ?");
  const buscarPerfil = db.prepare(
    `SELECT id, institucion_id, rol, estado, nombre, email FROM usuarios WHERE id = ?`
  );
  const insertarUsuario = db.prepare(
    `INSERT INTO usuarios (institucion_id, email, hash_contrasena, nombre, rol)
     VALUES (?, ?, ?, ?, ?)`
  );
  const editarUsuario = db.prepare(
    `UPDATE usuarios SET nombre = ?, email = ?, rol = ?, estado = ? WHERE id = ?`
  );
  const mandarAPapelera = db.prepare(
    `UPDATE usuarios
        SET estado = 'papelera', eliminado_en = datetime('now'), eliminado_por = ?
      WHERE id = ?`
  );
  const restaurarUsuario = db.prepare(
    `UPDATE usuarios
        SET estado = 'activo', eliminado_en = NULL, eliminado_por = NULL
      WHERE id = ?`
  );
  const borrarSesionesDe = db.prepare("DELETE FROM sesiones WHERE usuario_id = ?");

  // Auditoría de la papelera (Error 6.B.5): cada 'a-papelera', 'restaurado' y
  // 'purgado' deja una fila con quién lo hizo (realizado_por_id; NULL si lo purgó
  // la rutina) y una foto del afectado (nombre · correo) que sobrevive incluso a
  // la purga definitiva del usuario. Restaurar limpia `eliminado_por` del usuario,
  // pero el rastro NO se pierde: queda acá para siempre.
  const registrarMovimiento = db.prepare(
    `INSERT INTO papelera_movimientos
       (usuario_afectado_id, afectado_desc, accion, realizado_por_id)
     VALUES (?, ?, ?, ?)`
  );

  /** Comprueba que el objetivo existe y es del MISMO colegio que quien pide. */
  function perfilDelColegio(id, usuario, res) {
    const fila = buscarPerfil.get(id);
    if (!fila || fila.institucion_id !== usuario.institucionId) {
      res.status(404).json({ error: "Ese perfil no existe en tu institución." });
      return null;
    }
    return fila;
  }

  // ── Alta real (Errores 6.B.3 y 6.B.4) ──────────────────────────────────────
  app.post("/api/perfiles", async (req, res) => {
    try {
      const usuario = exigirAcceso(db, req, res, "perfiles-academicos");
      if (!usuario) return;

      const nombre = String(req.body?.nombre ?? "").trim();
      const email = String(req.body?.email ?? "").trim().toLowerCase();
      const rol = String(req.body?.rol ?? "");

      if (!nombre) return res.status(400).json({ error: "Escribí el nombre y apellido." });
      if (!ROLES_QUE_CREA_LA_DIRECCION.has(rol)) {
        return res.status(400).json({ error: "Ese rol no se puede dar de alta desde acá." });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "El correo no tiene un formato válido." });
      }
      if (buscarEmail.get(email)) {
        return res.status(409).json({ error: "Ya existe una cuenta con ese correo." });
      }

      // Contraseña real, cifrada con scrypt igual que las demás. El identificador
      // (id) lo pone la base sola y es único: se acabó el "ID al azar" que podía
      // repetirse (Error 6.B.3).
      const contrasenaInicial = generarContrasenaInicial();
      const hash = await hashearContrasena(contrasenaInicial);
      const info = insertarUsuario.run(usuario.institucionId, email, hash, nombre, rol);

      res.status(201).json({
        id: String(info.lastInsertRowid),
        email,
        // La contraseña viaja UNA vez, para que la dirección se la entregue a la
        // persona. No se guarda en claro en ningún lado ni se puede volver a ver:
        // si se pierde, se usa "olvidé mi contraseña".
        contrasenaInicial,
        mensaje: "Perfil creado. Entregale estas credenciales a la persona.",
      });
    } catch (error) {
      console.error("Error creando perfil", error);
      res.status(500).json({ error: "La cocina no pudo crear el perfil." });
    }
  });

  // ── Edición (nombre, correo, rol, estado activo/inactivo) ───────────────────
  app.patch("/api/perfiles/:id", (req, res) => {
    const usuario = exigirAcceso(db, req, res, "perfiles-academicos");
    if (!usuario) return;

    const id = Number(req.params.id);
    const fila = perfilDelColegio(id, usuario, res);
    if (!fila) return;

    const nombre = String(req.body?.nombre ?? "").trim();
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const rol = String(req.body?.rol ?? "");
    const estado = String(req.body?.estado ?? "");

    if (!nombre) return res.status(400).json({ error: "El nombre no puede quedar vacío." });
    if (!ROLES_QUE_CREA_LA_DIRECCION.has(rol)) {
      return res.status(400).json({ error: "Ese rol no es válido." });
    }
    // Desde la edición solo se pasa entre activo e inactivo. Mandar a la papelera
    // tiene su propia ventanilla, con su registro de quién y cuándo.
    if (estado !== "activo" && estado !== "inactivo") {
      return res.status(400).json({ error: "Estado inválido." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "El correo no tiene un formato válido." });
    }
    const conEseEmail = buscarEmail.get(email);
    if (conEseEmail && conEseEmail.id !== id) {
      return res.status(409).json({ error: "Ya existe otra cuenta con ese correo." });
    }

    editarUsuario.run(nombre, email, rol, estado, id);
    res.json({ ok: true, mensaje: "Perfil actualizado." });
  });

  // ── Enviar a la papelera (Errores 6.B.1 y 6.B.5) ────────────────────────────
  app.post("/api/perfiles/:id/papelera", (req, res) => {
    const usuario = exigirAcceso(db, req, res, "perfiles-academicos");
    if (!usuario) return;

    const id = Number(req.params.id);
    // Nadie se manda a sí mismo a la papelera: la dirección quedaría afuera de su
    // propio colegio.
    if (id === usuario.id) {
      return res.status(400).json({ error: "No podés enviar tu propio perfil a la papelera." });
    }
    const fila = perfilDelColegio(id, usuario, res);
    if (!fila) return;
    if (fila.estado === "papelera") {
      return res.status(400).json({ error: "Ese perfil ya está en la papelera." });
    }

    // Queda registrado QUIÉN lo mandó y CUÁNDO (eliminado_por / eliminado_en en el
    // usuario) y, además, una fila en el historial auditable (Error 6.B.5).
    mandarAPapelera.run(usuario.id, id);
    registrarMovimiento.run(id, `${fila.nombre} · ${fila.email}`, "a-papelera", usuario.id);
    // Al mandar a la papelera se cierran las sesiones de esa persona: un perfil
    // dado de baja no debería seguir adentro con una pestaña abierta.
    borrarSesionesDe.run(id);
    res.json({ ok: true, mensaje: "Perfil enviado a la papelera." });
  });

  // ── Restaurar desde la papelera ─────────────────────────────────────────────
  app.post("/api/perfiles/:id/restaurar", (req, res) => {
    const usuario = exigirAcceso(db, req, res, "perfiles-academicos");
    if (!usuario) return;

    const id = Number(req.params.id);
    const fila = perfilDelColegio(id, usuario, res);
    if (!fila) return;
    if (fila.estado !== "papelera") {
      return res.status(400).json({ error: "Ese perfil no está en la papelera." });
    }

    // Restaurar limpia `eliminado_por` del usuario (vuelve a ser un perfil activo
    // como cualquier otro), pero el rastro de que estuvo en la papelera NO se
    // pierde: queda esta fila 'restaurado' en el historial (Error 6.B.5).
    restaurarUsuario.run(id);
    registrarMovimiento.run(id, `${fila.nombre} · ${fila.email}`, "restaurado", usuario.id);
    res.json({ ok: true, mensaje: "Perfil restaurado." });
  });

  // ── Historial auditable de un perfil (Error 6.B.5) ──────────────────────────
  // Quién lo mandó a la papelera, quién lo restauró y cuándo. Solo la dirección
  // del MISMO colegio (perfilDelColegio revalida rol e institución). 'Sistema' es
  // la purga automática, que no tiene una persona detrás.
  const movimientosDe = db.prepare(
    `SELECT m.accion, m.realizado_en, u.nombre AS realizado_por
       FROM papelera_movimientos m
       LEFT JOIN usuarios u ON u.id = m.realizado_por_id
      WHERE m.usuario_afectado_id = ?
      ORDER BY m.realizado_en DESC, m.id DESC`
  );

  app.get(
    "/api/perfiles/:id/movimientos",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "perfiles-academicos");
      if (!usuario) return;

      const id = Number(req.params.id);
      const fila = perfilDelColegio(id, usuario, res);
      if (!fila) return;

      res.json({
        movimientos: movimientosDe.all(id).map((m) => ({
          accion: m.accion,
          realizadoEn: m.realizado_en,
          realizadoPor: m.realizado_por ?? "Sistema (purga automática)",
        })),
      });
    })
  );
}

// ── Mantenimiento: purga programada de la papelera (Error 6.B.5, sección 14.17) ──
/**
 * Borra en firme los perfiles que llevan más de DIAS_EN_PAPELERA en la papelera
 * y deja una fila 'purgado' en el historial por cada uno. Mismo espíritu que
 * `limpiarEventosViejos` del calendario: una rutina de mantenimiento que no
 * depende de que nadie abra una pantalla.
 *
 * Cada perfil se purga dentro de su propia transacción: se registra el
 * movimiento, se sueltan sus sesiones y se borra el usuario. La referencia
 * `usuario_afectado_id ON DELETE SET NULL` deja que el DELETE pase sin arrastrar
 * ni bloquear el historial; `afectado_desc` conserva a quién correspondía. Si la
 * persona ya generó actividad que la base protege (entregas, mensajes...), el
 * DELETE falla, la transacción se deshace entera y el perfil queda en la papelera
 * en vez de romper: borrar ese historial es una decisión aparte.
 *
 * `institucionId` opcional acota la purga a un colegio (lo usa la lista al
 * abrirse); sin él, purga las de todas las instituciones (lo usa la rutina).
 */
export function purgarPapeleraVencida(db, institucionId = null) {
  const filtroInst = institucionId === null ? "" : "AND institucion_id = ?";
  const vencidos = db
    .prepare(
      `SELECT id, nombre, email FROM usuarios
        WHERE estado = 'papelera'
          AND eliminado_en IS NOT NULL
          AND eliminado_en <= datetime('now', '-${DIAS_EN_PAPELERA} days')
          ${filtroInst}`
    )
    .all(...(institucionId === null ? [] : [institucionId]));

  if (vencidos.length === 0) return 0;

  const registrar = db.prepare(
    `INSERT INTO papelera_movimientos
       (usuario_afectado_id, afectado_desc, accion, realizado_por_id)
     VALUES (?, ?, 'purgado', NULL)`
  );
  const borrarSesiones = db.prepare("DELETE FROM sesiones WHERE usuario_id = ?");
  const borrarUsuario = db.prepare("DELETE FROM usuarios WHERE id = ?");

  let purgados = 0;
  for (const u of vencidos) {
    try {
      db.exec("BEGIN");
      registrar.run(u.id, `${u.nombre} · ${u.email}`);
      borrarSesiones.run(u.id);
      borrarUsuario.run(u.id);
      db.exec("COMMIT");
      purgados++;
    } catch {
      try {
        db.exec("ROLLBACK");
      } catch {
        // Nada que deshacer si el BEGIN no llegó a abrir.
      }
    }
  }
  return purgados;
}

/**
 * Programa la purga: una pasada al arrancar y otra cada seis horas. El
 * temporizador se desreferencia para no impedir un apagado ordenado. Mismo
 * patrón que `programarLimpiezaEventos` del calendario.
 */
export function programarPurgaPapelera(db) {
  purgarPapeleraVencida(db);
  const SEIS_HORAS = 6 * 60 * 60 * 1000;
  const t = setInterval(() => purgarPapeleraVencida(db), SEIS_HORAS);
  t.unref?.();
  return t;
}
