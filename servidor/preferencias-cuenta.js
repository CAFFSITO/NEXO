import { exigirSesion, ventanilla } from "./comun.js";
import { leerGenoma, perfilDeUsuario } from "./genoma.js";
import { normalizarPreferencias, resolverPersonalizacion } from "./personalizacion.js";

export function preferenciasDeCuenta(db, usuario) {
  const fila = db.prepare("SELECT preferencias, version FROM usuario_preferencias WHERE usuario_id = ?").get(usuario.id);
  let preferencias = {};
  try { preferencias = normalizarPreferencias(JSON.parse(fila?.preferencias ?? "{}"), { estricto: false }); } catch { /* Una fila antigua inválida hereda. */ }
  const genoma = usuario.institucionId == null ? null : leerGenoma(db, usuario.institucionId);
  const clave = genoma ? perfilDeUsuario(genoma, usuario).clave : "maestro";
  return { preferencias, efectivas: resolverPersonalizacion(genoma?.personalizacion, clave, preferencias), version: fila?.version ?? 0 };
}

export function registrarPreferenciasCuenta(app, db) {
  app.get("/api/cuenta/preferencias", ventanilla((req, res) => {
    const usuario = exigirSesion(db, req, res);
    if (usuario) res.json(preferenciasDeCuenta(db, usuario));
  }));
  app.put("/api/cuenta/preferencias", ventanilla((req, res) => {
    const usuario = exigirSesion(db, req, res);
    if (!usuario) return;
    if (!Number.isSafeInteger(req.body?.version) || req.body.version < 0) return res.status(400).json({ error: "Falta una versión válida de tus preferencias." });
    if (req.body.preferencias == null) return res.status(400).json({ error: "Incluí tus preferencias; usá un objeto vacío para volver a heredar." });
    let preferencias;
    try { preferencias = normalizarPreferencias(req.body?.preferencias); }
    catch (error) { return res.status(400).json({ error: error.message }); }
    db.exec("BEGIN IMMEDIATE");
    try {
      const actual = db.prepare("SELECT version FROM usuario_preferencias WHERE usuario_id = ?").get(usuario.id);
      if ((actual?.version ?? 0) !== req.body.version) {
        db.exec("ROLLBACK");
        return res.status(409).json({ error: "Tus preferencias cambiaron en otra ventana. Recargá antes de guardar." });
      }
      db.prepare(`INSERT INTO usuario_preferencias (usuario_id, preferencias, version) VALUES (?, ?, ?)
        ON CONFLICT(usuario_id) DO UPDATE SET preferencias=excluded.preferencias, version=excluded.version, actualizado_en=datetime('now')`)
        .run(usuario.id, JSON.stringify(preferencias), req.body.version + 1);
      db.exec("COMMIT");
    } catch (error) { db.exec("ROLLBACK"); throw error; }
    res.json(preferenciasDeCuenta(db, usuario));
  }));
}
