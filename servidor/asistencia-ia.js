// ============================================================================
// NEXO — Asistencia IA real (Etapa 8, sección 14.16, Errores 2.G.1 y 2.G.2)
// ----------------------------------------------------------------------------
//   GET    /api/asistencia-ia/estado     → ¿está configurada y con clave?
//   GET    /api/asistencia-ia/historial  → mi conversación con el tutor
//   POST   /api/asistencia-ia/mensaje     → escribo, el tutor responde de verdad
//   DELETE /api/asistencia-ia/historial   → borrar la conversación (menú, 2.G.2)
//
// Qué corrige (Error 2.G.1): hoy la asistencia responde SIEMPRE lo mismo tras una
// pausa fingida. Acá el servidor arma el pedido —system prompt de `config_ia` +
// el historial de la conversación + el mensaje nuevo—, lo manda al proveedor de
// IA configurado (nivel gratuito) y devuelve la respuesta real.
//
// DÓNDE VIVE LA CLAVE (regla de oro 4 + sección 14.16): la clave de la API se lee
// de una VARIABLE DE ENTORNO del servidor (`process.env.NEXO_IA_CLAVE`), NUNCA en
// la base ni en el código del navegador. Si no está, la asistencia lo dice con
// todas las letras en vez de fallar en silencio; nadie que mire el navegador o la
// base puede verla.
//
// Cómo poner la clave (una sola vez, en la MISMA terminal donde corre el servidor):
//   PowerShell:  $env:NEXO_IA_CLAVE = "la-clave-que-te-dio-el-proveedor"
//   CMD:         set NEXO_IA_CLAVE=la-clave-que-te-dio-el-proveedor
//   Git Bash:    export NEXO_IA_CLAVE="la-clave-que-te-dio-el-proveedor"
// y recién ahí:  node servidor.js
// La clave no se escribe en ningún archivo del proyecto (así no se comparte).
// ============================================================================

import { exigirAcceso, ventanilla } from "./comun.js";

// Cuántos mensajes previos se mandan como contexto. Suficiente para que el tutor
// recuerde el hilo, sin inflar cada pedido (ni el costo del nivel gratuito).
const MAX_HISTORIAL = 20;

export function registrarAsistenciaIA(app, db) {
  // La tabla del historial se crea si falta (no exige regenerar la base entera:
  // así una base que ya tiene datos de etapas anteriores no se pierde). También
  // está declarada en esquema.sql para las bases nuevas.
  db.exec(`
    CREATE TABLE IF NOT EXISTS ia_mensajes (
      id         INTEGER PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      rol        TEXT NOT NULL CHECK (rol IN ('user','ai')),
      contenido  TEXT NOT NULL,
      creado_en  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const configDe = db.prepare(
    `SELECT system_prompt, proveedor, modelo, temperatura, activo
       FROM config_ia
      WHERE (institucion_id = ? OR institucion_id IS NULL) AND activo = 1
      ORDER BY (institucion_id IS NULL) ASC
      LIMIT 1`
  );
  const historialDe = db.prepare(
    `SELECT id, rol, contenido, creado_en FROM ia_mensajes
      WHERE usuario_id = ? ORDER BY id`
  );
  const ultimosDe = db.prepare(
    `SELECT rol, contenido FROM ia_mensajes
      WHERE usuario_id = ? ORDER BY id DESC LIMIT ?`
  );
  const guardarMensaje = db.prepare(
    "INSERT INTO ia_mensajes (usuario_id, rol, contenido) VALUES (?, ?, ?)"
  );
  const borrarHistorial = db.prepare("DELETE FROM ia_mensajes WHERE usuario_id = ?");

  // ── Estado: ¿la puedo usar? ────────────────────────────────────────────────
  app.get(
    "/api/asistencia-ia/estado",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "asistencia-ia");
      if (!usuario) return;
      const cfg = configDe.get(usuario.institucionId);
      res.json({
        configurada: Boolean(cfg),
        proveedor: cfg?.proveedor ?? null,
        modelo: cfg?.modelo ?? null,
        // No devuelve la clave (jamás sale del servidor): solo si EXISTE.
        clavePresente: Boolean(process.env.NEXO_IA_CLAVE),
      });
    })
  );

  // ── Historial ──────────────────────────────────────────────────────────────
  app.get(
    "/api/asistencia-ia/historial",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "asistencia-ia");
      if (!usuario) return;
      res.json({
        mensajes: historialDe.all(usuario.id).map((m) => ({
          id: String(m.id),
          rol: m.rol,
          contenido: m.contenido,
          creadoEn: m.creado_en,
        })),
      });
    })
  );

  // ── Mensaje nuevo ───────────────────────────────────────────────────────────
  app.post("/api/asistencia-ia/mensaje", async (req, res) => {
    try {
      const usuario = exigirAcceso(db, req, res, "asistencia-ia");
      if (!usuario) return;

      const contenido = String(req.body?.contenido ?? "").trim();
      if (!contenido) return res.status(400).json({ error: "El mensaje está vacío." });

      const cfg = configDe.get(usuario.institucionId);
      if (!cfg) {
        return res
          .status(503)
          .json({ error: "La asistencia IA no está configurada en este momento." });
      }
      if (!process.env.NEXO_IA_CLAVE) {
        return res.status(503).json({
          error:
            "Falta la clave de la IA en el servidor. Quien administra debe definir " +
            "la variable de entorno NEXO_IA_CLAVE con la clave del proveedor y reiniciar.",
        });
      }

      // El mensaje del alumno se guarda ANTES de llamar al proveedor: si la
      // respuesta falla, igual queda registrado lo que preguntó.
      guardarMensaje.run(usuario.id, "user", contenido);

      // Historial reciente (viejo → nuevo) para darle contexto al modelo.
      const previos = ultimosDe.all(usuario.id, MAX_HISTORIAL).reverse();

      let respuesta;
      try {
        respuesta = await pedirAlProveedor(cfg, previos);
      } catch (fallo) {
        console.error("Fallo llamando al proveedor de IA:", fallo?.message ?? fallo);
        return res.status(502).json({
          error:
            "El proveedor de IA no respondió. Revisá la clave (NEXO_IA_CLAVE) y el " +
            "modelo configurado en config_ia.",
        });
      }

      guardarMensaje.run(usuario.id, "ai", respuesta);
      res.json({ respuesta });
    } catch (error) {
      console.error("Error atendiendo POST /api/asistencia-ia/mensaje");
      console.error(error);
      res.status(500).json({ error: "La cocina no pudo preparar este pedido." });
    }
  });

  // ── Borrar conversación (acción real del menú, Error 2.G.2) ─────────────────
  app.delete(
    "/api/asistencia-ia/historial",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "asistencia-ia");
      if (!usuario) return;
      borrarHistorial.run(usuario.id);
      res.json({ ok: true });
    })
  );
}

// ============================================================================
// Puente con el proveedor de IA. Soporta tres opciones con nivel gratuito. El
// `proveedor` sale de config_ia; la CLAVE, siempre de process.env.NEXO_IA_CLAVE.
// ============================================================================
async function pedirAlProveedor(cfg, historial) {
  const clave = process.env.NEXO_IA_CLAVE;
  const proveedor = cfg.proveedor;
  const temperatura = typeof cfg.temperatura === "number" ? cfg.temperatura : 0.7;

  if (proveedor === "google-ai-studio") {
    return await pedirAGoogle(cfg, historial, clave, temperatura);
  }
  // Groq y OpenRouter hablan el mismo dialecto que OpenAI (chat/completions).
  if (proveedor === "groq" || proveedor === "openrouter") {
    return await pedirAOpenAICompat(proveedor, cfg, historial, clave, temperatura);
  }
  throw new Error(`Proveedor de IA no soportado: ${proveedor}`);
}

// ── Google AI Studio (Gemini) ────────────────────────────────────────────────
async function pedirAGoogle(cfg, historial, clave, temperatura) {
  const modelo = cfg.modelo && cfg.modelo.trim() ? cfg.modelo.trim() : "gemini-1.5-flash";
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;

  // Gemini usa "user"/"model" y el system prompt va aparte (system_instruction).
  const contents = historial.map((m) => ({
    role: m.rol === "ai" ? "model" : "user",
    parts: [{ text: m.contenido }],
  }));

  const cuerpo = {
    system_instruction: { parts: [{ text: cfg.system_prompt }] },
    contents,
    generationConfig: { temperature: temperatura },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": clave },
    body: JSON.stringify(cuerpo),
  });
  if (!resp.ok) {
    const detalle = await resp.text().catch(() => "");
    throw new Error(`Google respondió ${resp.status}: ${detalle.slice(0, 300)}`);
  }
  const datos = await resp.json();
  const texto = datos?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text)
    .join("")
    .trim();
  if (!texto) throw new Error("Google no devolvió texto.");
  return texto;
}

// ── OpenAI-compatibles (Groq / OpenRouter) ───────────────────────────────────
async function pedirAOpenAICompat(proveedor, cfg, historial, clave, temperatura) {
  const url =
    proveedor === "groq"
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://openrouter.ai/api/v1/chat/completions";
  const modelo =
    cfg.modelo && cfg.modelo.trim()
      ? cfg.modelo.trim()
      : proveedor === "groq"
      ? "llama-3.1-8b-instant"
      : "meta-llama/llama-3.1-8b-instruct:free";

  const messages = [
    { role: "system", content: cfg.system_prompt },
    ...historial.map((m) => ({
      role: m.rol === "ai" ? "assistant" : "user",
      content: m.contenido,
    })),
  ];

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${clave}`,
    },
    body: JSON.stringify({ model: modelo, messages, temperature: temperatura }),
  });
  if (!resp.ok) {
    const detalle = await resp.text().catch(() => "");
    throw new Error(`${proveedor} respondió ${resp.status}: ${detalle.slice(0, 300)}`);
  }
  const datos = await resp.json();
  const texto = datos?.choices?.[0]?.message?.content?.trim();
  if (!texto) throw new Error(`${proveedor} no devolvió texto.`);
  return texto;
}
