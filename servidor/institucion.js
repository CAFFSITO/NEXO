// ============================================================================
// NEXO — Ventanilla de la institución (Etapa 2, Error 13.7)
// ----------------------------------------------------------------------------
// Media aplicación tiene un encabezado que dice "Colegio San Martín — Ciclo
// 2025", con las dos cosas escritas a mano en la pantalla. El colegio está
// escrito a mano en seis archivos distintos, y el año está mintiendo desde el
// 1 de enero de 2026: los datos de la base son del ciclo 2026.
//
// Un año escrito a mano no se arregla escribiendo otro año a mano. El ciclo
// lectivo vive en `instituciones.ciclo_lectivo` y cambia todos los años; el
// nombre del colegio cambia en cuanto haya un segundo colegio. Los dos salen
// de acá.
//
//   GET /api/institucion  → { nombre, cicloLectivo }
//
// El administrador de plataforma no pertenece a ningún colegio (su
// `institucion_id` es NULL, ver el esquema): para él la respuesta es la
// plataforma, no una escuela. No es un caso raro: es el único usuario cuyo
// encabezado NO debe hablar de una institución.
// ============================================================================

import { exigirSesion, ventanilla } from "./comun.js";

export function registrarInstitucion(app, db) {
  const buscar = db.prepare(
    "SELECT nombre, ciclo_lectivo FROM instituciones WHERE id = ?"
  );

  app.get(
    "/api/institucion",
    ventanilla((req, res) => {
      const usuario = exigirSesion(db, req, res);
      if (!usuario) return;

      if (usuario.institucionId === null) {
        return res.json({ nombre: "NEXO", cicloLectivo: null });
      }

      const fila = buscar.get(usuario.institucionId);
      if (!fila) {
        return res.status(404).json({ error: "No encuentro tu institución." });
      }

      res.json({ nombre: fila.nombre, cicloLectivo: fila.ciclo_lectivo });
    })
  );
}
