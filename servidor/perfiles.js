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
//   DELETE /api/perfiles/:id          → borrar para siempre (solo desde la papelera)
//   GET    /api/perfiles/opciones     → lo que necesita el formulario de alta
//
// Todo se decide en la cocina (regla de oro 4): que la pantalla no muestre el
// botón no alcanza; la ventanilla vuelve a comprobar el rol y la institución.
// ============================================================================

import { exigirAcceso, nombreDeMateria, ventanilla } from "./comun.js";
import { asegurarComunidadCurso } from "./chat.js";
import { datoDeLista } from "./gestion-academica.js";
import { generarContrasenaInicial, hashearContrasena, validarContrasena } from "./contrasenas.js";
import { algoritmo, leerGenoma } from "./genoma.js";

// Los roles que la dirección de un colegio puede dar de alta DENTRO de su
// institución. Están los ocho de NEXO menos 'administrador': el operador de
// plataforma no pertenece a ninguna escuela y no lo crea una dirección
// (sección 1.1). Familia y Bibliotecario SÍ están, que era justo lo que faltaba
// (Error 6.B.4). Un rol fuera de esta lista lo rechaza el servidor, no la
// pantalla.
const ROLES_QUE_CREA_LA_DIRECCION = new Set([
  "secretaria",
  "estudiante",
  "profesor",
  "preceptor",
  "admin-academico",
  "centro-estudiantes",
  "bibliotecario",
  "familia",
]);

// Días que un perfil sobrevive en la papelera antes de borrarse para siempre
// (sección 14.17): ya no es un número fijo, es el algoritmo «Purga de la
// papelera» del genoma de cada escuela (7 días por defecto; el Maestro puede
// cambiarlo o apagar la purga). El mismo número lo muestra la pantalla como
// "quedan N días".
function plazoPapelera(db, institucionId) {
  const regla = algoritmo(db, institucionId, "perfiles.papelera");
  return regla.activo ? Math.round(regla.parametros.dias) : null;
}

/**
 * El perfil diseñado que se le asigna a alguien. Vacío o igual al rol = el
 * predeterminado (NULL en la base). Si no, tiene que existir en el genoma de la
 * escuela y nacer del MISMO arquetipo que el rol: un perfil de estudiante no se
 * le puede poner a un profesor. `undefined` = el perfil no es válido.
 */
function perfilParaRol(db, institucionId, rol, crudo) {
  const clave = String(crudo ?? "").trim();
  if (!clave || clave === rol) return null;
  const perfil = leerGenoma(db, institucionId).perfiles.find((p) => p.clave === clave);
  if (!perfil || perfil.predeterminado || perfil.arquetipo !== rol) return undefined;
  return clave;
}

const idValido = (valor) => Number.isSafeInteger(Number(valor)) && Number(valor) > 0;

/**
 * La terminación del correo de la escuela ("sinvueltas.org"), para que el alta
 * la traiga escrita. Primero la que definió el Maestro en el genoma; si no hay,
 * la que más usan las cuentas de la escuela. null = no hay de dónde sacarla.
 */
function dominioDeLaEscuela(db, institucionId) {
  const delGenoma = String(leerGenoma(db, institucionId).identidad?.dominio ?? "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
  if (delGenoma) return delGenoma;
  const masUsado = db
    .prepare(
      `SELECT lower(substr(email, instr(email, '@') + 1)) AS dominio, COUNT(*) AS n
         FROM usuarios
        WHERE institucion_id = ? AND instr(email, '@') > 0 AND estado <> 'papelera'
        GROUP BY dominio
        ORDER BY n DESC
        LIMIT 1`
    )
    .get(institucionId);
  return masUsado?.dominio || null;
}

/**
 * Los cursos que se le asignan a alguien al darlo de alta, ya validados.
 * Cada asignación es { cursoId } y, para un profesor, { cursoId, materiaId }:
 * en la base un profesor se une a un curso por una cátedra (qué materia da ahí).
 * Devuelve { lista } o { error } con el motivo para mostrar tal cual.
 */
function leerAsignaciones(db, institucionId, rol, crudo) {
  if (crudo == null) return { lista: [] };
  if (!Array.isArray(crudo) || crudo.length > 60) return { error: "Los cursos elegidos no son válidos." };
  if (crudo.length === 0) return { lista: [] };
  if (!["estudiante", "preceptor", "profesor"].includes(rol)) {
    return { error: "Ese rol no lleva cursos asignados." };
  }
  if (rol === "estudiante" && crudo.length > 1) {
    return { error: "Un estudiante va en un solo curso." };
  }

  const curso = db.prepare("SELECT id, anio, division FROM cursos WHERE id = ? AND institucion_id = ?");
  const materia = db.prepare("SELECT id FROM materias WHERE id = ? AND institucion_id = ?");
  const vistos = new Set();
  const lista = [];
  for (const a of crudo) {
    const c = idValido(a?.cursoId) ? curso.get(Number(a.cursoId), institucionId) : null;
    if (!c) return { error: "Uno de los cursos elegidos no existe en tu institución." };
    let materiaId = null;
    if (rol === "profesor") {
      if (!idValido(a?.materiaId) || !materia.get(Number(a.materiaId), institucionId)) {
        return { error: `Elegí qué materia da en ${c.anio}° ${c.division}.` };
      }
      materiaId = Number(a.materiaId);
    }
    const clave = `${c.id}:${materiaId}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    lista.push({ cursoId: c.id, materiaId });
  }
  return { lista };
}

/**
 * Borra un perfil para siempre y deja libre su correo. Lo usan el botón
 * "Borrar definitivamente" de la papelera y la purga automática.
 *
 * Si la persona nunca hizo nada en NEXO, su fila se borra de verdad. Si ya tiene
 * actividad que otros necesitan (entregas, mensajes, la cátedra con las tareas de
 * un curso), borrar la fila arrastraría datos ajenos, así que la base lo frena;
 * en ese caso la cuenta queda anónima: "Cuenta eliminada", sin escuela, sin forma
 * de entrar y con un correo de relleno. Para la dirección el efecto es el mismo:
 * la persona desaparece de la lista y el correo se puede volver a usar.
 *
 * `realizadoPorId` = quién la borró (null = la purga automática). Devuelve
 * "borrado" o "anonimizado".
 */
export function borrarPerfilEnFirme(db, u, realizadoPorId) {
  db.exec("BEGIN");
  try {
    db.prepare(
      `INSERT INTO papelera_movimientos (usuario_afectado_id, afectado_desc, accion, realizado_por_id)
       VALUES (?, ?, 'purgado', ?)`
    ).run(u.id, `${u.nombre} · ${u.email}`, realizadoPorId);
    // Lo que solo existe para que la persona entre o reciba avisos.
    db.prepare("DELETE FROM sesiones WHERE usuario_id = ?").run(u.id);
    db.prepare("DELETE FROM codigos_recuperacion WHERE usuario_id = ?").run(u.id);
    db.prepare("DELETE FROM push_suscripciones WHERE usuario_id = ?").run(u.id);
    // Sus lugares en la escuela quedan libres para otra persona.
    db.prepare("DELETE FROM inscripciones WHERE estudiante_id = ?").run(u.id);
    db.prepare("DELETE FROM familiares WHERE usuario_familia_id = ? OR estudiante_id = ?").run(u.id, u.id);
    db.prepare("UPDATE cursos SET preceptor_id = NULL WHERE preceptor_id = ?").run(u.id);
    // Sus cátedras sin nada colgando (ni tareas ni clases) se sueltan. Las que ya
    // tienen trabajo de los chicos las protege la base (nada referencia a una
    // cátedra en cascada): se quedan, para reasignarlas en Cursos.
    for (const { id } of db.prepare("SELECT id FROM catedras WHERE profesor_id = ?").all(u.id)) {
      db.exec("SAVEPOINT soltar_catedra");
      try {
        db.prepare("DELETE FROM catedras WHERE id = ?").run(id);
        db.exec("RELEASE soltar_catedra");
      } catch {
        db.exec("ROLLBACK TO soltar_catedra");
        db.exec("RELEASE soltar_catedra");
      }
    }
    // Sale de la lista de profesores de cada materia que ya no da en ningún curso.
    db.prepare(
      `DELETE FROM materia_profesores WHERE profesor_id = ?1
         AND NOT EXISTS (SELECT 1 FROM catedras ca WHERE ca.profesor_id = ?1 AND ca.materia_id = materia_profesores.materia_id)`
    ).run(u.id);

    let resultado = "borrado";
    db.exec("SAVEPOINT borrar_usuario");
    try {
      db.prepare("DELETE FROM usuarios WHERE id = ?").run(u.id);
      db.exec("RELEASE borrar_usuario");
    } catch {
      db.exec("ROLLBACK TO borrar_usuario");
      db.exec("RELEASE borrar_usuario");
      // hash '!' no es un formato válido: verificarContrasena siempre da false.
      db.prepare(
        `UPDATE usuarios
            SET email = ?, nombre = 'Cuenta eliminada', hash_contrasena = '!',
                avatar_url = NULL, institucion_id = NULL, perfil_clave = NULL, primer_ingreso = 0
          WHERE id = ?`
      ).run(`eliminada-${u.id}@cuenta-eliminada.invalid`, u.id);
      resultado = "anonimizado";
    }
    db.exec("COMMIT");
    return resultado;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // Nada que deshacer si el BEGIN no llegó a abrir.
    }
    throw error;
  }
}

// Qué dice la columna "asignación" de cada rol. Los roles cuya asignación es su
// propio cargo no salen de una consulta: no hay nada que buscar, el rol ES la
// asignación.
const ASIGNACION_FIJA = {
  secretaria: "Secretaría institucional",
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
    `SELECT id, nombre, email, rol, estado, avatar_url, eliminado_en, perfil_clave
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
        // El perfil que el Maestro diseñó y la dirección le asignó (null = el
        // predeterminado de su rol).
        perfilClave: fila.perfil_clave ?? null,
      }));

      // Cuántos días dura la papelera en ESTA escuela (null = no se purga sola).
      res.json({ perfiles, diasPapelera: plazoPapelera(db, usuario.institucionId) });
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
            t.id AS turno_id, t.nombre AS turno,
            e.id AS especialidad_id, e.nombre AS especialidad,
            p.nombre AS preceptor,
            c.cupo_minimo, c.cupo_maximo, c.aula,
            (SELECT COUNT(*) FROM inscripciones i WHERE i.curso_id = c.id) AS estudiantes,
            (SELECT COUNT(*) FROM catedras ca WHERE ca.curso_id = c.id)    AS materias
       FROM cursos c
       LEFT JOIN usuarios p ON p.id = c.preceptor_id
       LEFT JOIN curso_turnos t ON t.id = c.turno_id
       LEFT JOIN curso_especialidades e ON e.id = c.especialidad_id
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
        turno: datoDeLista(fila.turno_id, fila.turno),
        especialidad: datoDeLista(fila.especialidad_id, fila.especialidad),
        preceptor: fila.preceptor ?? null,
        estudiantes: fila.estudiantes,
        materias: fila.materias,
        cupoMinimo: fila.cupo_minimo ?? null,
        cupoMaximo: fila.cupo_maximo ?? null,
        aula: fila.aula ?? null,
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
    `SELECT c.id, c.anio, c.division, t.id AS turno_id, t.nombre AS turno, e.id AS especialidad_id, e.nombre AS especialidad,
            c.institucion_id, c.preceptor_id, p.nombre AS preceptor, c.cupo_minimo, c.cupo_maximo, c.aula
       FROM cursos c
       LEFT JOIN usuarios p ON p.id = c.preceptor_id
       LEFT JOIN curso_turnos t ON t.id = c.turno_id
       LEFT JOIN curso_especialidades e ON e.id = c.especialidad_id
      WHERE c.id = ?`
  );

  const catedrasDelCurso = db.prepare(
    `SELECT ca.id, ca.materia_id, ca.profesor_id, m.nombre AS materia, m.anio AS materia_anio, pr.nombre AS profesor
       FROM catedras ca
       JOIN materias m  ON m.id = ca.materia_id
       JOIN usuarios pr ON pr.id = ca.profesor_id
      WHERE ca.curso_id = ?
      ORDER BY m.nombre COLLATE NOCASE, ca.id`
  );

  const alumnosDelCurso = db.prepare(
    `SELECT u.id, u.nombre, u.email
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
        curso: {
          id: String(curso.id),
          anio: curso.anio,
          division: curso.division,
          turno: datoDeLista(curso.turno_id, curso.turno),
          especialidad: datoDeLista(curso.especialidad_id, curso.especialidad),
          cupoMinimo: curso.cupo_minimo ?? null,
          cupoMaximo: curso.cupo_maximo ?? null,
          aula: curso.aula ?? null,
        },
        preceptor: curso.preceptor ?? null,
        preceptorId: curso.preceptor_id == null ? null : String(curso.preceptor_id),
        catedras: catedrasDelCurso.all(id).map((f) => ({
          id: String(f.id),
          materiaId: String(f.materia_id),
          profesorId: String(f.profesor_id),
          materia: f.materia,
          materiaAnio: f.materia_anio ?? null,
          profesor: f.profesor,
        })),
        alumnos: alumnosDelCurso.all(id).map((f) => ({
          id: String(f.id),
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

  const buscarEmail = db.prepare("SELECT id, nombre, estado, institucion_id FROM usuarios WHERE email = ?");

  /**
   * El motivo de un correo ocupado, dicho de forma que la dirección sepa qué
   * hacer: si el dueño está en la papelera de su escuela, el camino es borrarlo
   * definitivamente desde ahí.
   */
  function correoOcupado(duenio, usuario, otra = false) {
    if (duenio.estado === "papelera" && duenio.institucion_id === usuario.institucionId) {
      return `Ese correo es de ${duenio.nombre}, que está en la papelera. Para volver a usarlo, borralo definitivamente desde la papelera.`;
    }
    return otra ? "Ya existe otra cuenta con ese correo." : "Ya existe una cuenta con ese correo.";
  }
  const buscarPerfil = db.prepare(
    `SELECT id, institucion_id, rol, estado, nombre, email FROM usuarios WHERE id = ?`
  );
  const insertarUsuario = db.prepare(
    `INSERT INTO usuarios (institucion_id, email, hash_contrasena, nombre, rol, perfil_clave, primer_ingreso)
     VALUES (?, ?, ?, ?, ?, ?, 1)`
  );
  const editarUsuario = db.prepare(
    `UPDATE usuarios SET nombre = ?, email = ?, rol = ?, estado = ?, perfil_clave = ? WHERE id = ?`
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

  // ── Lo que necesita el formulario de alta ───────────────────────────────────
  // La terminación del correo de la escuela y los cursos y materias reales, con
  // quién los tiene hoy: así la dirección ve ANTES de guardar si asignar un curso
  // le saca el lugar a otra persona (un curso tiene un solo preceptor y cada
  // materia de un curso, un solo profesor).
  const cursosDelColegio = db.prepare(
    `SELECT c.id, c.anio, c.division, t.id AS turno_id, t.nombre AS turno, e.id AS especialidad_id, e.nombre AS especialidad, p.nombre AS preceptor
       FROM cursos c
       LEFT JOIN usuarios p ON p.id = c.preceptor_id
       LEFT JOIN curso_turnos t ON t.id = c.turno_id
       LEFT JOIN curso_especialidades e ON e.id = c.especialidad_id
      WHERE c.institucion_id = ?
      ORDER BY c.anio, c.division`
  );
  const materiasDelColegio = db.prepare(
    "SELECT id, nombre, anio FROM materias WHERE institucion_id = ? ORDER BY nombre, COALESCE(anio, 0)"
  );
  const catedrasDelColegio = db.prepare(
    `SELECT ca.curso_id, ca.materia_id, u.nombre AS profesor
       FROM catedras ca
       JOIN cursos c   ON c.id = ca.curso_id
       JOIN usuarios u ON u.id = ca.profesor_id
      WHERE c.institucion_id = ?`
  );

  app.get(
    "/api/perfiles/opciones",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "perfiles-academicos");
      if (!usuario) return;

      res.json({
        dominio: dominioDeLaEscuela(db, usuario.institucionId),
        cursos: cursosDelColegio.all(usuario.institucionId).map((c) => ({
          id: String(c.id),
          nombre: `${c.anio}° ${c.division}`,
          // "Mañana · Informática": ayuda a distinguir cursos al asignarlos.
          detalle: [c.turno, c.especialidad].filter(Boolean).join(" · ") || null,
          // Para mostrarlos agrupados por turno, ciclo y especialidad.
          anio: c.anio,
          turno: datoDeLista(c.turno_id, c.turno),
          especialidad: datoDeLista(c.especialidad_id, c.especialidad),
          preceptor: c.preceptor ?? null,
        })),
        // "Matemática · 1° año": la misma materia puede estar cargada para varios años.
        materias: materiasDelColegio.all(usuario.institucionId).map((m) => ({ id: String(m.id), nombre: nombreDeMateria(m) })),
        catedras: catedrasDelColegio.all(usuario.institucionId).map((c) => ({
          cursoId: String(c.curso_id),
          materiaId: String(c.materia_id),
          profesor: c.profesor,
        })),
      });
    })
  );

  // ── Alta real (Errores 6.B.3 y 6.B.4) ──────────────────────────────────────
  const inscribir = db.prepare("INSERT INTO inscripciones (curso_id, estudiante_id) VALUES (?, ?)");
  const ponerPreceptor = db.prepare("UPDATE cursos SET preceptor_id = ? WHERE id = ?");
  // Igual que "Cursos y materias": si esa materia de ese curso ya tenía profesor,
  // pasa a la persona nueva (el formulario lo avisa antes de guardar).
  const darCatedra = db.prepare(
    `INSERT INTO catedras (curso_id, materia_id, profesor_id) VALUES (?, ?, ?)
     ON CONFLICT(materia_id, curso_id) DO UPDATE SET profesor_id = excluded.profesor_id`
  );
  // Y queda en la lista de profesores de esa materia (sección Materias).
  const darMateria = db.prepare("INSERT OR IGNORE INTO materia_profesores (materia_id, profesor_id) VALUES (?, ?)");

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
      const duenio = buscarEmail.get(email);
      if (duenio) {
        return res.status(409).json({ error: correoOcupado(duenio, usuario) });
      }
      const perfilClave = perfilParaRol(db, usuario.institucionId, rol, req.body?.perfilClave);
      if (perfilClave === undefined) {
        return res.status(400).json({ error: "Ese perfil no existe en tu institución o no corresponde a ese rol." });
      }
      // Cursos asignados desde el alta (opcional): el del estudiante, los del
      // preceptor, y los del profesor con la materia que da en cada uno.
      const asignaciones = leerAsignaciones(db, usuario.institucionId, rol, req.body?.asignaciones);
      if (asignaciones.error) return res.status(400).json({ error: asignaciones.error });

      // Contraseña real, cifrada con scrypt igual que las demás. El identificador
      // (id) lo pone la base sola y es único: se acabó el "ID al azar" que podía
      // repetirse (Error 6.B.3).
      const contrasenaInicial = generarContrasenaInicial(nombre);
      const hash = await hashearContrasena(contrasenaInicial);

      // La cuenta y sus cursos nacen juntos: si algo falla, no queda una persona
      // a medio asignar.
      let info;
      db.exec("BEGIN");
      try {
        info = insertarUsuario.run(usuario.institucionId, email, hash, nombre, rol, perfilClave);
        const nuevoId = Number(info.lastInsertRowid);
        for (const a of asignaciones.lista) {
          if (rol === "estudiante") inscribir.run(a.cursoId, nuevoId);
          if (rol === "preceptor") ponerPreceptor.run(nuevoId, a.cursoId);
          if (rol === "profesor") {
            darCatedra.run(a.cursoId, a.materiaId, nuevoId);
            darMateria.run(a.materiaId, nuevoId);
          }
          // El chat del curso suma a quien entra y saca al preceptor anterior.
          if (rol !== "profesor") asegurarComunidadCurso(db, a.cursoId);
        }
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }

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
      return res.status(409).json({ error: correoOcupado(conEseEmail, usuario, true) });
    }
    const perfilClave = perfilParaRol(db, usuario.institucionId, rol, req.body?.perfilClave);
    if (perfilClave === undefined) {
      return res.status(400).json({ error: "Ese perfil no existe en tu institución o no corresponde a ese rol." });
    }

    editarUsuario.run(nombre, email, rol, estado, perfilClave, id);
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

  // ── Borrar para siempre (desde la papelera) ─────────────────────────────────
  // Sin esto, un perfil borrado por error seguía ocupando su correo hasta que la
  // purga automática pasara, y la dirección no podía volver a crearlo. Solo se
  // borra lo que ya está en la papelera: el camino es siempre papelera → borrar.
  app.delete(
    "/api/perfiles/:id",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "perfiles-academicos");
      if (!usuario) return;

      const id = Number(req.params.id);
      const fila = perfilDelColegio(id, usuario, res);
      if (!fila) return;
      if (fila.estado !== "papelera") {
        return res.status(400).json({ error: "Primero mandá el perfil a la papelera; desde ahí se borra definitivamente." });
      }

      borrarPerfilEnFirme(db, fila, usuario.id);
      res.json({
        ok: true,
        mensaje: `${fila.nombre} se borró definitivamente. El correo ${fila.email} ya se puede usar para un perfil nuevo.`,
      });
    })
  );

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
 * Borra en firme los perfiles que llevan en la papelera más días que el plazo de
 * su escuela (algoritmo «Purga de la papelera» del genoma; si está apagado, esa
 * escuela no purga nada)
 * y deja una fila 'purgado' en el historial por cada uno. Mismo espíritu que
 * `limpiarEventosViejos` del calendario: una rutina de mantenimiento que no
 * depende de que nadie abra una pantalla.
 *
 * Cada perfil se purga con `borrarPerfilEnFirme`, lo mismo que el botón "Borrar
 * definitivamente": en su propia transacción, con su fila 'purgado' en el
 * historial (`afectado_desc` conserva a quién correspondía). Si la persona ya
 * generó actividad que la base protege (entregas, mensajes...), su cuenta queda
 * anónima en vez de borrada, así la papelera cumple lo que promete ("se borra")
 * sin llevarse datos de otros.
 *
 * `institucionId` opcional acota la purga a un colegio (lo usa la lista al
 * abrirse); sin él, purga las de todas las instituciones (lo usa la rutina).
 */
export function purgarPapeleraVencida(db, institucionId = null) {
  const filtroInst = institucionId === null ? "" : "AND institucion_id = ?";
  const plazos = new Map();
  const vencidos = db
    .prepare(
      `SELECT id, nombre, email, institucion_id,
              julianday('now') - julianday(eliminado_en) AS dias
         FROM usuarios
        WHERE estado = 'papelera'
          AND eliminado_en IS NOT NULL
          ${filtroInst}`
    )
    .all(...(institucionId === null ? [] : [institucionId]))
    .filter((u) => {
      if (u.institucion_id === null) return false;
      if (!plazos.has(u.institucion_id)) plazos.set(u.institucion_id, plazoPapelera(db, u.institucion_id));
      const plazo = plazos.get(u.institucion_id);
      return plazo !== null && u.dias >= plazo;
    });

  if (vencidos.length === 0) return 0;

  let purgados = 0;
  for (const u of vencidos) {
    try {
      borrarPerfilEnFirme(db, u, null);
      purgados++;
    } catch (error) {
      // Uno que falle no frena a los demás; queda en la papelera para la próxima.
      console.error("No se pudo purgar el perfil " + u.id, error);
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
