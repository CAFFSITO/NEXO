import { exigirAcceso, ventanilla } from "./comun.js";
import { leerGenoma } from "./genoma.js";

// Solo estas categorías tienen ejecutor. Los trabajos de papelera/calendario
// conservan sus propios algoritmos. Ningún valor predeterminado borra registros.
const CATEGORIAS = {
  historialIa: { tabla: "ia_mensajes", fecha: "creado_en" },
  notificacionesLeidas: { tabla: "notificaciones", fecha: "leida_en" },
};

export function revisarRetencion(db, institucionId, ejecutar = false) {
  const reglas = leerGenoma(db, institucionId).personalizacion.retencion;
  const resultado = {};
  if (ejecutar) db.exec("BEGIN IMMEDIATE");
  try {
    for (const [clave, { tabla, fecha }] of Object.entries(CATEGORIAS)) {
      const regla = reglas[clave];
      if (regla.modo !== "eliminar") { resultado[clave] = { ...regla, registros: 0 }; continue; }
      const donde = `usuario_id IN (SELECT id FROM usuarios WHERE institucion_id = ?)
        AND ${fecha} IS NOT NULL AND julianday(${fecha}) < julianday('now', ?)`;
      const args = [institucionId, `-${regla.dias} days`];
      const registros = ejecutar
        ? db.prepare(`DELETE FROM ${tabla} WHERE ${donde}`).run(...args).changes
        : db.prepare(`SELECT COUNT(*) AS n FROM ${tabla} WHERE ${donde}`).get(...args).n;
      resultado[clave] = { ...regla, registros: Number(registros) };
    }
    if (ejecutar) db.exec("COMMIT");
  } catch (error) { if (ejecutar) db.exec("ROLLBACK"); throw error; }
  return resultado;
}

export function registrarRetencion(app, db) {
  app.get("/api/instancia/retencion", ventanilla((req, res) => {
    const usuario = exigirAcceso(db, req, res, "modulos-institucion");
    if (usuario) res.json({ categorias: revisarRetencion(db, usuario.institucionId), intervaloMinutos: 60 });
  }));
  const ejecutar = () => {
    for (const { id } of db.prepare("SELECT id FROM instituciones").all()) {
      try { revisarRetencion(db, id, true); }
      catch (error) { console.error("No se pudo aplicar conservación institucional", id, error.message); }
    }
  };
  const timer = setInterval(ejecutar, 60 * 60 * 1000);
  timer.unref();
  return { ejecutar, detener: () => clearInterval(timer) };
}
