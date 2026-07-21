// ============================================================================
// NEXO — Ventanilla del Administrador de PLATAFORMA ("nosotros", sección 5)
// ----------------------------------------------------------------------------
// El operador de la plataforma es el equipo técnico. Su alcance es MUY acotado
// (sección 5.9): crear instituciones, vigilar la salud del sistema y leer los
// logs no sensibles. NO ve la vida interna de ninguna escuela: ni alumnos, ni
// notas, ni comunidad. Hasta ahora este perfil compartía las pantallas de la
// dirección de un colegio y terminaba mostrando "342 estudiantes" de una escuela
// puntual (Errores 5.A.2, 5.A.4, 5.A.9). Esta ventanilla es su reemplazo limpio.
//
//   GET  /api/plataforma              → instituciones + salud + logs_sistema
//   POST /api/plataforma/instituciones→ dar de alta una escuela con su dirección
//
// Todo lo que devuelve sale de la base. Lo único que este perfil puede ver de una
// escuela es su NOMBRE y sus totales, nunca el detalle de las personas.
// ============================================================================

import { randomBytes } from "node:crypto";
import { usuarioDeLaSesion } from "./sesiones.js";
import { hashearContrasena } from "./contrasenas.js";
import { ventanilla } from "./comun.js";

// Solo el operador de plataforma entra acá. No es una pantalla de un módulo
// escolar, así que se comprueba el rol directo en vez de una página del mapa.
function exigirAdministrador(db, req, res) {
  const usuario = usuarioDeLaSesion(db, req);
  if (!usuario) {
    res.status(401).json({ error: "No hay sesión abierta." });
    return null;
  }
  if (usuario.rol !== "administrador") {
    res.status(403).json({ error: "Solo el administrador de plataforma ve esto." });
    return null;
  }
  return usuario;
}

function generarContrasenaInicial() {
  return randomBytes(9).toString("base64url");
}

export function registrarPlataforma(app, db) {
  // Cada institución con sus totales, contados en la base. Ni un dato personal:
  // cuántas personas, cuántos cursos, no quiénes.
  const listarInstituciones = db.prepare(
    `SELECT i.id,
            i.nombre,
            i.ciclo_lectivo,
            i.creado_en,
            (SELECT COUNT(*) FROM usuarios u
              WHERE u.institucion_id = i.id AND u.estado = 'activo') AS usuarios,
            (SELECT COUNT(*) FROM usuarios u
              WHERE u.institucion_id = i.id AND u.rol = 'estudiante' AND u.estado = 'activo') AS estudiantes,
            (SELECT COUNT(*) FROM usuarios u
              WHERE u.institucion_id = i.id AND u.rol = 'profesor' AND u.estado = 'activo') AS docentes,
            (SELECT COUNT(*) FROM cursos c WHERE c.institucion_id = i.id) AS cursos
       FROM instituciones i
      ORDER BY i.nombre`
  );

  // Indicadores de salud: totales de la plataforma entera, no de una escuela.
  const salud = db.prepare(
    `SELECT
       (SELECT COUNT(*) FROM instituciones) AS instituciones,
       (SELECT COUNT(*) FROM usuarios WHERE estado = 'activo') AS usuarios,
       (SELECT COUNT(*) FROM sesiones WHERE expira_en > datetime('now')) AS sesionesActivas`
  );

  // Los logs del sistema: lo ÚNICO que va en "Actividad" del panel de plataforma
  // (Error 5.A.2). Registros técnicos, sin datos sensibles de ninguna escuela.
  const ultimosLogs = db.prepare(
    `SELECT nivel, mensaje, contexto, creado_en
       FROM logs_sistema
      ORDER BY creado_en DESC
      LIMIT 50`
  );

  app.get(
    "/api/plataforma",
    ventanilla((req, res) => {
      const usuario = exigirAdministrador(db, req, res);
      if (!usuario) return;

      const s = salud.get();
      res.json({
        instituciones: listarInstituciones.all().map((i) => ({
          id: String(i.id),
          nombre: i.nombre,
          cicloLectivo: i.ciclo_lectivo,
          creadoEn: i.creado_en,
          usuarios: i.usuarios,
          estudiantes: i.estudiantes,
          docentes: i.docentes,
          cursos: i.cursos,
        })),
        salud: {
          instituciones: s.instituciones,
          usuarios: s.usuarios,
          sesionesActivas: s.sesionesActivas,
          baseConectada: true,
        },
        logs: ultimosLogs.all().map((l) => ({
          nivel: l.nivel,
          mensaje: l.mensaje,
          contexto: l.contexto,
          creadoEn: l.creado_en,
        })),
      });
    })
  );

  // ── Alta de una institución con su cuenta de dirección (sección 5.A.7) ──────
  const buscarEmail = db.prepare("SELECT id FROM usuarios WHERE email = ?");
  const insertarInstitucion = db.prepare(
    "INSERT INTO instituciones (nombre, ciclo_lectivo) VALUES (?, ?)"
  );
  const insertarDireccion = db.prepare(
    `INSERT INTO usuarios (institucion_id, email, hash_contrasena, nombre, rol)
     VALUES (?, ?, ?, ?, 'admin-academico')`
  );
  const registrarLog = db.prepare(
    `INSERT INTO logs_sistema (nivel, mensaje, contexto) VALUES ('info', ?, 'alta-institucion')`
  );

  app.post("/api/plataforma/instituciones", async (req, res) => {
    try {
      const usuario = exigirAdministrador(db, req, res);
      if (!usuario) return;

      const nombre = String(req.body?.nombre ?? "").trim();
      const cicloLectivo = Number(req.body?.cicloLectivo);
      const dirNombre = String(req.body?.direccionNombre ?? "").trim();
      const dirEmail = String(req.body?.direccionEmail ?? "").trim().toLowerCase();

      if (!nombre) return res.status(400).json({ error: "Escribí el nombre de la institución." });
      if (!Number.isInteger(cicloLectivo) || cicloLectivo < 2000 || cicloLectivo > 2100) {
        return res.status(400).json({ error: "El ciclo lectivo tiene que ser un año válido." });
      }
      if (!dirNombre) return res.status(400).json({ error: "Escribí el nombre de la dirección." });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dirEmail)) {
        return res.status(400).json({ error: "El correo de la dirección no es válido." });
      }
      if (buscarEmail.get(dirEmail)) {
        return res.status(409).json({ error: "Ya existe una cuenta con ese correo." });
      }

      // La escuela y su primera cuenta (la dirección) nacen juntas: sin una
      // dirección que entre, la institución sería una escuela a la que nadie
      // puede administrar. La dirección después crea al resto desde su panel.
      const contrasenaInicial = generarContrasenaInicial();
      const hash = await hashearContrasena(contrasenaInicial);

      const infoInst = insertarInstitucion.run(nombre, cicloLectivo);
      const institucionId = Number(infoInst.lastInsertRowid);
      insertarDireccion.run(institucionId, dirEmail, hash, dirNombre);
      registrarLog.run("Institución creada: " + nombre);

      res.status(201).json({
        id: String(institucionId),
        direccionEmail: dirEmail,
        contrasenaInicial,
        mensaje: "Institución creada. Entregale estas credenciales a la dirección.",
      });
    } catch (error) {
      console.error("Error creando institución", error);
      res.status(500).json({ error: "La cocina no pudo crear la institución." });
    }
  });
}
