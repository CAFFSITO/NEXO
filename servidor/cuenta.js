// ============================================================================
// NEXO — Cuenta propia: datos, cambio de contraseña y recuperación
// (Etapa 1 punto 6; Errores 2.A.1 y 12.5; sección 14.1 punto 6)
// ----------------------------------------------------------------------------
// Hasta acá, "Olvidé mi contraseña" no hacía nada y no existía ninguna pantalla
// para cambiar la clave: una vez adentro, la contraseña que te dio la escuela
// era para siempre. Estas cuatro ventanillas son el flujo completo.
//
//   GET  /api/cuenta                 → mis datos, leídos de `usuarios`
//   PUT  /api/cuenta/contrasena      → cambiarla sabiendo la actual (con sesión)
//   POST /api/recuperacion           → pedir un código de un solo uso (sin sesión)
//   POST /api/recuperacion/confirmar → canjear el código por una contraseña nueva
//
// ── CÓMO LLEGA EL CÓDIGO A LA PERSONA ──────────────────────────────────────
// NEXO todavía no tiene por dónde mandar un correo (no hay servicio de mail
// configurado, y no es parte de esta etapa). Así que el código se imprime en la
// TERMINAL DEL SERVIDOR. Es deliberado y tiene dos consecuencias que conviene
// tener claras:
//   * Sirve para probar el flujo entero hoy mismo, de punta a punta.
//   * Hoy solo puede recuperar su contraseña quien vea esa terminal, es decir,
//     la persona que opera el servidor. Cuando exista el envío de correos, se
//     cambia SOLO la función `entregarCodigo` de este archivo y nada más.
// Lo que el código NO hace nunca es viajar en la respuesta HTTP: si lo hiciera,
// cualquiera podría pedir el código de cualquier cuenta y entrar con ella.
// ============================================================================

import { randomInt } from "node:crypto";
import {
  hashearContrasena,
  verificarContrasena,
  validarContrasena,
} from "./contrasenas.js";
import { usuarioDeLaSesion, leerToken } from "./sesiones.js";

const MINUTOS_DE_VIDA = 30;   // cuánto dura un código antes de vencer
const INTENTOS_MAXIMOS = 5;   // fallos permitidos antes de quemar el código

// Un código de 6 dígitos. randomInt y no Math.random: Math.random es predecible
// y acá lo que está en juego es entrar a la cuenta de otra persona.
function generarCodigo() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

// El único punto del programa que sabe cómo se le hace llegar el código a la
// persona. Hoy es la terminal (ver el encabezado); mañana será un correo.
function entregarCodigo(usuario, codigo) {
  console.log(
    "\n─────────────────────────────────────────────────────────\n" +
    "  Código de recuperación para " + usuario.nombre + "\n" +
    "  (" + usuario.email + ")\n\n" +
    "        " + codigo + "\n\n" +
    "  Vence en " + MINUTOS_DE_VIDA + " minutos y sirve una sola vez.\n" +
    "─────────────────────────────────────────────────────────\n"
  );
}

export function registrarCuenta(app, db) {
  // ── Consultas preparadas ──────────────────────────────────────────────────
  const datosDeCuenta = db.prepare(
    `SELECT u.email, u.creado_en, i.nombre AS institucion
       FROM usuarios u
       LEFT JOIN instituciones i ON i.id = u.institucion_id
      WHERE u.id = ?`
  );
  const hashDeUsuario = db.prepare(
    "SELECT hash_contrasena FROM usuarios WHERE id = ?"
  );
  const buscarActivoPorEmail = db.prepare(
    `SELECT id, nombre, email, hash_contrasena
       FROM usuarios
      WHERE email = ? AND estado = 'activo'`
  );
  const guardarHash = db.prepare(
    "UPDATE usuarios SET hash_contrasena = ? WHERE id = ?"
  );

  const cerrarOtrasSesiones = db.prepare(
    "DELETE FROM sesiones WHERE usuario_id = ? AND token <> ?"
  );
  const cerrarTodasLasSesiones = db.prepare(
    "DELETE FROM sesiones WHERE usuario_id = ?"
  );

  const anularCodigosPendientes = db.prepare(
    `UPDATE codigos_recuperacion
        SET usado_en = datetime('now')
      WHERE usuario_id = ? AND usado_en IS NULL`
  );
  const guardarCodigo = db.prepare(
    `INSERT INTO codigos_recuperacion (usuario_id, hash_codigo, expira_en)
     VALUES (?, ?, datetime('now', '+${MINUTOS_DE_VIDA} minutes'))`
  );
  const codigoVigenteDe = db.prepare(
    `SELECT id, hash_codigo, intentos
       FROM codigos_recuperacion
      WHERE usuario_id = ?
        AND usado_en IS NULL
        AND expira_en > datetime('now')
      ORDER BY id DESC
      LIMIT 1`
  );
  const sumarIntento = db.prepare(
    "UPDATE codigos_recuperacion SET intentos = intentos + 1 WHERE id = ?"
  );
  const quemarCodigo = db.prepare(
    "UPDATE codigos_recuperacion SET usado_en = datetime('now') WHERE id = ?"
  );

  // ── Mis datos de cuenta ───────────────────────────────────────────────────
  // Todo sale de la base. La pantalla de configuración no escribe ni un dato a
  // mano: si el curso de Julieta cambia en `inscripciones`, cambia acá.
  app.get("/api/cuenta", (req, res) => {
    const usuario = usuarioDeLaSesion(db, req);
    if (!usuario) return res.status(401).json({ error: "No hay sesión abierta." });

    const fila = datosDeCuenta.get(usuario.id);
    if (!fila) return res.status(401).json({ error: "No hay sesión abierta." });

    res.json({
      cuenta: {
        nombre: usuario.nombre,
        rol: usuario.rol,
        avatarUrl: usuario.avatarUrl ?? null,
        curso: usuario.curso ?? null,
        materia: usuario.materia ?? null,
        email: fila.email,
        institucion: fila.institucion ?? null,
        creadoEn: fila.creado_en,
      },
    });
  });

  // ── Cambiar la contraseña sabiendo la actual ──────────────────────────────
  app.put("/api/cuenta/contrasena", async (req, res) => {
    const usuario = usuarioDeLaSesion(db, req);
    if (!usuario) return res.status(401).json({ error: "No hay sesión abierta." });

    const actual = String(req.body?.actual ?? "");
    const nueva = String(req.body?.nueva ?? "");

    if (!actual) {
      return res.status(400).json({ error: "Escribí tu contraseña actual." });
    }

    const fila = hashDeUsuario.get(usuario.id);

    // Pedir la contraseña actual no es burocracia: sin esto, cualquiera que
    // agarre una sesión abierta (una pestaña sin cerrar) se apropia de la cuenta
    // cambiándole la clave a su dueño.
    if (!(await verificarContrasena(actual, fila.hash_contrasena))) {
      return res.status(403).json({ error: "La contraseña actual no es correcta." });
    }

    const problema = validarContrasena(nueva);
    if (problema) return res.status(400).json({ error: problema });

    if (await verificarContrasena(nueva, fila.hash_contrasena)) {
      return res
        .status(400)
        .json({ error: "La contraseña nueva tiene que ser distinta de la actual." });
    }

    guardarHash.run(await hashearContrasena(nueva), usuario.id);

    // Quien cambia su contraseña suele estar echando a alguien: se cierran las
    // demás sesiones y se anula cualquier código de recuperación pendiente, que
    // si no seguiría sirviendo para volver a entrar.
    cerrarOtrasSesiones.run(usuario.id, leerToken(req) ?? "");
    anularCodigosPendientes.run(usuario.id);

    res.json({
      ok: true,
      mensaje:
        "Listo: tu contraseña cambió. Las sesiones abiertas en otros dispositivos se cerraron.",
    });
  });

  // ── Pedir un código de recuperación ───────────────────────────────────────
  app.post("/api/recuperacion", async (req, res) => {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    if (!email) return res.status(400).json({ error: "Escribí tu correo institucional." });

    const usuario = buscarActivoPorEmail.get(email);

    // Se genera y se cifra el código EXISTA O NO la cuenta, y la respuesta es
    // siempre la misma. Si contestáramos distinto (o más rápido) cuando el
    // correo no existe, cualquiera podría averiguar quién tiene cuenta en NEXO
    // probando direcciones.
    const codigo = generarCodigo();
    const hash = await hashearContrasena(codigo);

    if (usuario) {
      anularCodigosPendientes.run(usuario.id); // vale el último, no cinco a la vez
      guardarCodigo.run(usuario.id, hash);
      entregarCodigo(usuario, codigo);
    }

    res.json({
      ok: true,
      mensaje:
        "Si ese correo tiene una cuenta activa en NEXO, se generó un código de un solo uso. " +
        "Vence en " + MINUTOS_DE_VIDA + " minutos.",
    });
  });

  // ── Canjear el código por una contraseña nueva ────────────────────────────
  app.post("/api/recuperacion/confirmar", async (req, res) => {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const codigo = String(req.body?.codigo ?? "").trim();
    const nueva = String(req.body?.nueva ?? "");

    if (!email || !codigo) {
      return res.status(400).json({ error: "Escribí tu correo y el código que recibiste." });
    }

    const problema = validarContrasena(nueva);
    if (problema) return res.status(400).json({ error: problema });

    const usuario = buscarActivoPorEmail.get(email);
    const fila = usuario ? codigoVigenteDe.get(usuario.id) : null;

    // Correo inexistente, código vencido, código ya usado y código equivocado
    // dan todos la MISMA respuesta: quien prueba a ciegas no aprende nada.
    const rechazo = { error: "El código no es válido o ya venció. Pedí uno nuevo." };

    if (!fila) return res.status(400).json(rechazo);

    if (fila.intentos >= INTENTOS_MAXIMOS) {
      quemarCodigo.run(fila.id);
      return res.status(400).json(rechazo);
    }

    if (!(await verificarContrasena(codigo, fila.hash_codigo))) {
      sumarIntento.run(fila.id);
      // Al llegar al tope, el código muere: seis dígitos son 999.999
      // posibilidades y sin este freno se adivinan probando.
      if (fila.intentos + 1 >= INTENTOS_MAXIMOS) quemarCodigo.run(fila.id);
      return res.status(400).json(rechazo);
    }

    guardarHash.run(await hashearContrasena(nueva), usuario.id);
    quemarCodigo.run(fila.id); // de un solo uso: no se puede canjear dos veces

    // Todas las sesiones abajo, incluidas las de quien haya entrado con la
    // contraseña vieja: la recuperación existe justamente para esos casos.
    cerrarTodasLasSesiones.run(usuario.id);

    res.json({
      ok: true,
      mensaje: "Tu contraseña quedó cambiada. Ya podés iniciar sesión con la nueva.",
    });
  });
}
