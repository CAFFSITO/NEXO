// ============================================================================
// NEXO — Ventanilla de ingreso y sesiones (Etapa 1, secciones 14.1 y 12.4)
// ----------------------------------------------------------------------------
// Acá vive la única forma de entrar a NEXO. Reemplaza a las ocho cuentas de
// juguete que hasta ahora viajaban dentro del código del navegador, donde
// cualquiera podía leerlas (Error 12.4).
//
// Las tres ventanillas:
//   POST   /api/sesion  → entrar (correo + contraseña)
//   GET    /api/sesion  → "¿sigo adentro?" (lo pregunta la app al recargar)
//   DELETE /api/sesion  → salir
//
// La llave de sesión viaja en una cookie httpOnly: el JavaScript de la página
// NO puede leerla, así que un ataque de scripting (XSS) no puede robársela.
// El navegador la manda sola en cada pedido.
// ============================================================================

import { randomBytes } from "node:crypto";
import { verificarContrasena, hashearContrasena } from "./contrasenas.js";

const NOMBRE_COOKIE = "nexo_sesion";
const DIAS_DE_VIDA = 7;

// Hash señuelo: se usa cuando el correo no existe, para gastar el mismo tiempo
// que gastaría una verificación real. Sin esto, un atacante mide cuánto tarda
// la respuesta y descubre qué correos están dados de alta.
const HASH_SENUELO = await hashearContrasena(randomBytes(32).toString("hex"));

// ── Cookies ─────────────────────────────────────────────────────────────────

// Express sabe ESCRIBIR cookies (res.cookie) pero no leerlas. Como solo hay una
// que nos importe y su valor es hexadecimal (sin caracteres raros), alcanza con
// esto y evitamos sumar una dependencia.
function leerToken(req) {
  const crudo = req.headers.cookie;
  if (!crudo) return null;
  for (const parte of crudo.split(";")) {
    const corte = parte.indexOf("=");
    if (corte === -1) continue;
    if (parte.slice(0, corte).trim() === NOMBRE_COOKIE) {
      return parte.slice(corte + 1).trim();
    }
  }
  return null;
}

const OPCIONES_COOKIE = {
  httpOnly: true,   // el JavaScript de la página no puede leerla
  sameSite: "lax",  // no se manda desde otros sitios: frena ataques CSRF
  path: "/",
  // secure exigiría HTTPS y en desarrollo la app corre en http://localhost.
  // Al publicar de verdad, esto tiene que pasar a true.
  secure: false,
};

// ── Armado del usuario que ve la aplicación ─────────────────────────────────

// La app necesita saber el curso del estudiante y la materia del profesor.
// Se derivan de la base (inscripciones y cátedras): no se inventan ni se
// escriben a mano en ninguna pantalla.
function describirUsuario(db, fila) {
  const usuario = {
    id: fila.id,
    nombre: fila.nombre,
    rol: fila.rol,
    avatarUrl: fila.avatar_url ?? undefined,
  };

  if (fila.rol === "estudiante") {
    const curso = db
      .prepare(
        `SELECT c.anio, c.division
           FROM inscripciones i
           JOIN cursos c ON c.id = i.curso_id
          WHERE i.estudiante_id = ?
          LIMIT 1`
      )
      .get(fila.id);
    if (curso) usuario.curso = `${curso.anio}° ${curso.division}`;
  }

  if (fila.rol === "profesor") {
    const materias = db
      .prepare(
        `SELECT DISTINCT m.nombre
           FROM catedras ca
           JOIN materias m ON m.id = ca.materia_id
          WHERE ca.profesor_id = ?
          ORDER BY m.nombre`
      )
      .all(fila.id);
    if (materias.length > 0) {
      usuario.materia = materias.map((m) => m.nombre).join(", ");
    }
  }

  return usuario;
}

// ── Registro de las ventanillas ─────────────────────────────────────────────

export function registrarSesiones(app, db) {
  const buscarPorEmail = db.prepare(
    `SELECT id, nombre, rol, avatar_url, hash_contrasena, estado
       FROM usuarios
      WHERE email = ?`
  );
  const buscarPorToken = db.prepare(
    `SELECT u.id, u.nombre, u.rol, u.avatar_url, u.estado
       FROM sesiones s
       JOIN usuarios u ON u.id = s.usuario_id
      WHERE s.token = ?
        AND s.expira_en > datetime('now')`
  );
  const crearSesion = db.prepare(
    `INSERT INTO sesiones (usuario_id, token, expira_en)
     VALUES (?, ?, datetime('now', '+${DIAS_DE_VIDA} days'))`
  );
  const borrarSesion = db.prepare("DELETE FROM sesiones WHERE token = ?");
  const limpiarVencidas = db.prepare(
    "DELETE FROM sesiones WHERE expira_en <= datetime('now')"
  );

  // ── Entrar ────────────────────────────────────────────────────────────────
  app.post("/api/sesion", async (req, res) => {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const contrasena = String(req.body?.contrasena ?? "");

    if (!email || !contrasena) {
      return res.status(400).json({ error: "Falta el correo o la contraseña." });
    }

    const fila = buscarPorEmail.get(email);

    // Correo inexistente, cuenta dada de baja y contraseña equivocada devuelven
    // TODOS el mismo mensaje y tardan lo mismo: quien prueba claves no aprende
    // nada sobre qué cuentas existen.
    const hashAComparar = fila?.hash_contrasena ?? HASH_SENUELO;
    const coincide = await verificarContrasena(contrasena, hashAComparar);

    if (!fila || !coincide || fila.estado !== "activo") {
      return res.status(401).json({ error: "Correo o contraseña incorrectos." });
    }

    limpiarVencidas.run(); // higiene: no acumular sesiones muertas

    const token = randomBytes(32).toString("hex");
    crearSesion.run(fila.id, token);

    res.cookie(NOMBRE_COOKIE, token, {
      ...OPCIONES_COOKIE,
      maxAge: DIAS_DE_VIDA * 24 * 60 * 60 * 1000,
    });
    res.json({ usuario: describirUsuario(db, fila) });
  });

  // ── ¿Sigo adentro? (lo pregunta la app al recargar la página) ─────────────
  app.get("/api/sesion", (req, res) => {
    const token = leerToken(req);
    if (!token) return res.status(401).json({ error: "No hay sesión abierta." });

    const fila = buscarPorToken.get(token);
    if (!fila || fila.estado !== "activo") {
      res.clearCookie(NOMBRE_COOKIE, OPCIONES_COOKIE);
      return res.status(401).json({ error: "La sesión venció o no es válida." });
    }

    res.json({ usuario: describirUsuario(db, fila) });
  });

  // ── Salir ─────────────────────────────────────────────────────────────────
  app.delete("/api/sesion", (req, res) => {
    const token = leerToken(req);
    if (token) borrarSesion.run(token);
    res.clearCookie(NOMBRE_COOKIE, OPCIONES_COOKIE);
    res.json({ ok: true });
  });
}

// ── Para el resto del servidor ──────────────────────────────────────────────
// Devuelve el usuario de la sesión, o null. Las próximas ventanillas
// ("dame mis tareas", "guardá este comentario") lo usan para saber QUIÉN pide
// y decidir permisos en el servidor, no en la pantalla (regla de oro 4).
export function usuarioDeLaSesion(db, req) {
  const token = leerToken(req);
  if (!token) return null;

  const fila = db
    .prepare(
      `SELECT u.id, u.nombre, u.rol, u.avatar_url, u.estado, u.institucion_id
         FROM sesiones s
         JOIN usuarios u ON u.id = s.usuario_id
        WHERE s.token = ?
          AND s.expira_en > datetime('now')`
    )
    .get(token);

  if (!fila || fila.estado !== "activo") return null;
  return { ...describirUsuario(db, fila), institucionId: fila.institucion_id };
}
