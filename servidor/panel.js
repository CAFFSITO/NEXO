// ============================================================================
// NEXO — Ventanilla del Panel de la dirección (Etapa 2, pantalla 8)
// ----------------------------------------------------------------------------
//   GET /api/panel/institucional → métricas, actividad y pulso, calculados
//
// Este panel era el ejemplo más claro del diagnóstico de la sección 1.3: "342
// estudiantes activos", "+12%", "94% de entregas en término", "participación en
// comunidad 78%", "comprensión promedio 81%". Ninguno de esos números salía de
// ningún lado. El colegio tiene 6 estudiantes cargados, no 342.
//
// Cada cifra de acá se cuenta en la base y está explicada al lado. Las que no
// se pueden calcular con lo que hay, no se inventan: no salen.
// ============================================================================

import { exigirAcceso, ventanilla } from "./comun.js";

export function registrarPanel(app, db) {
  const metricas = db.prepare(
    `SELECT
       (SELECT COUNT(*) FROM usuarios
         WHERE institucion_id = ?1 AND rol = 'estudiante' AND estado = 'activo') AS estudiantes,
       (SELECT COUNT(*) FROM usuarios
         WHERE institucion_id = ?1 AND rol = 'profesor' AND estado = 'activo')   AS docentes,
       (SELECT COUNT(*) FROM usuarios
         WHERE institucion_id = ?1 AND rol = 'familia' AND estado = 'activo')    AS familias,
       (SELECT COUNT(*) FROM cursos WHERE institucion_id = ?1)                   AS cursos`
  );

  // Entregas en término: de todo lo entregado, qué parte llegó antes de la
  // fecha límite. Es la cuenta que la tarjeta decía hacer ("94%") sin hacerla.
  // Se compara `entregado_en` con `fecha_limite`; una entrega del día del
  // vencimiento cuenta como en término (por eso el < va contra el día siguiente).
  const puntualidad = db.prepare(
    `SELECT COUNT(*) AS entregadas,
            SUM(CASE WHEN date(e.entregado_en) <= t.fecha_limite THEN 1 ELSE 0 END) AS en_termino
       FROM entregas e
       JOIN tareas t    ON t.id = e.tarea_id
       JOIN catedras ca ON ca.id = t.catedra_id
       JOIN cursos c    ON c.id = ca.curso_id
      WHERE c.institucion_id = ?1
        AND e.anulada_en IS NULL`
  );

  // Participación en la comunidad: qué porcentaje de la gente del colegio hizo
  // algo en la comunidad (publicar, comentar, votar o entrar a un debate) en
  // los últimos 30 días. La tarjeta decía "78%" sin definir de qué.
  const participacion = db.prepare(
    `SELECT
       (SELECT COUNT(*) FROM usuarios
         WHERE institucion_id = ?1 AND estado = 'activo') AS gente,
       (SELECT COUNT(DISTINCT quien) FROM (
          SELECT p.autor_id AS quien FROM publicaciones p
            WHERE p.institucion_id = ?1
              AND p.creado_en >= datetime('now', '-30 days')
          UNION
          SELECT c.usuario_id FROM comentarios c
            JOIN usuarios u ON u.id = c.usuario_id
           WHERE u.institucion_id = ?1
             AND c.creado_en >= datetime('now', '-30 days')
          UNION
          SELECT v.usuario_id FROM votos v
            JOIN usuarios u ON u.id = v.usuario_id
           WHERE u.institucion_id = ?1
             AND v.creado_en >= datetime('now', '-30 days')
          UNION
          SELECT dp.usuario_id FROM debate_participantes dp
            JOIN usuarios u ON u.id = dp.usuario_id
           WHERE u.institucion_id = ?1
             AND dp.unido_en >= datetime('now', '-30 days')
       )) AS activos`
  );

  // Lo que pasó de verdad, ordenado por cuándo pasó. Reemplaza a los cinco
  // renglones fijos ("Clase iniciada — Matemática Avanzada 5to B, hace 5 min")
  // que decían lo mismo a cualquier hora de cualquier día.
  //
  // Cada rama trae su tipo para que la pantalla sepa qué color e ícono usar sin
  // tener que adivinarlo del texto.
  const actividad = db.prepare(
    `SELECT tipo, titulo, detalle, cuando FROM (
        SELECT 'entrega' AS tipo,
               'Tarea entregada' AS titulo,
               u.nombre || ' entregó "' || t.titulo || '"' AS detalle,
               e.entregado_en AS cuando
          FROM entregas e
          JOIN tareas t    ON t.id = e.tarea_id
          JOIN usuarios u  ON u.id = e.estudiante_id
          JOIN catedras ca ON ca.id = t.catedra_id
          JOIN cursos c    ON c.id = ca.curso_id
         WHERE c.institucion_id = ?1 AND e.anulada_en IS NULL

        UNION ALL
        SELECT 'correccion',
               'Trabajo corregido',
               p.nombre || ' corrigió "' || t.titulo || '"',
               co.corregido_en
          FROM correcciones co
          JOIN entregas e  ON e.id = co.entrega_id
          JOIN tareas t    ON t.id = e.tarea_id
          JOIN catedras ca ON ca.id = t.catedra_id
          JOIN usuarios p  ON p.id = ca.profesor_id
          JOIN cursos c    ON c.id = ca.curso_id
         WHERE c.institucion_id = ?1

        UNION ALL
        SELECT 'debate',
               'Debate abierto',
               u.nombre || ' abrió "' || d.titulo || '"',
               d.creado_en
          FROM debates d
          JOIN usuarios u ON u.id = d.autor_id
         WHERE d.institucion_id = ?1 AND d.eliminado_en IS NULL

        UNION ALL
        SELECT 'recurso',
               'Nuevo recurso en biblioteca',
               r.titulo,
               r.creado_en
          FROM recursos r
         WHERE r.institucion_id = ?1
           AND r.estado = 'aprobado'
           AND r.eliminado_en IS NULL

        UNION ALL
        SELECT 'clase',
               'Clase dictada',
               cl.titulo,
               cl.fecha_hora
          FROM clases_planificadas cl
          JOIN catedras ca ON ca.id = cl.catedra_id
          JOIN cursos c    ON c.id = ca.curso_id
         WHERE c.institucion_id = ?1 AND cl.estado = 'finalizada'
     )
     ORDER BY cuando DESC
     LIMIT 8`
  );

  // Alertas reales, no un aviso escrito a mano sobre un profesor que no existe.
  // Hoy hay dos cosas que la base puede detectar sola y le importan a la
  // dirección: trabajos entregados que nadie corrigió, y denuncias sin resolver.
  const alertas = db.prepare(
    `SELECT
       (SELECT COUNT(*) FROM entregas e
          JOIN tareas t    ON t.id = e.tarea_id
          JOIN catedras ca ON ca.id = t.catedra_id
          JOIN cursos c    ON c.id = ca.curso_id
          LEFT JOIN correcciones co ON co.entrega_id = e.id
         WHERE c.institucion_id = ?1
           AND e.anulada_en IS NULL
           AND co.id IS NULL) AS sin_corregir,
       (SELECT COUNT(*) FROM denuncias de
          JOIN usuarios u ON u.id = de.denunciante_id
         WHERE u.institucion_id = ?1
           AND de.resuelta_en IS NULL) AS denuncias_abiertas,
       (SELECT COUNT(*) FROM cursos
         WHERE institucion_id = ?1 AND preceptor_id IS NULL) AS cursos_sin_preceptor,
       (SELECT COUNT(*) FROM cola_revision cr
          JOIN recursos r ON r.id = cr.recurso_id
         WHERE r.institucion_id = ?1
           AND cr.estado = 'pendiente') AS recursos_en_cola`
  );

  const porcentaje = (parte, total) =>
    total === 0 ? 0 : Math.round((parte / total) * 100);

  app.get(
    "/api/panel/institucional",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "panel-institucional");
      if (!usuario) return;

      // El administrador de plataforma también puede ver esta pantalla, pero no
      // tiene institución: su panel es otro (Etapa 3 los separa del todo, según
      // la sección 1.1). Hasta entonces, no se le inventa un colegio.
      if (usuario.institucionId === null) {
        return res.json({ sinInstitucion: true });
      }

      const id = usuario.institucionId;
      const base = metricas.get(id);
      const punt = puntualidad.get(id);
      const part = participacion.get(id);
      const al = alertas.get(id);

      res.json({
        metricas: {
          estudiantes: base.estudiantes,
          docentes: base.docentes,
          familias: base.familias,
          cursos: base.cursos,
          // null y no 0: "todavía nadie entregó nada" no es "el 0% llegó a
          // tiempo". Un 0% grande y rojo sería una acusación falsa.
          entregasEnTermino:
            punt.entregadas === 0 ? null : porcentaje(punt.en_termino ?? 0, punt.entregadas),
          entregasContadas: punt.entregadas,
        },
        pulso: {
          participacionComunidad: porcentaje(part.activos, part.gente),
          entregasEnTermino:
            punt.entregadas === 0 ? null : porcentaje(punt.en_termino ?? 0, punt.entregadas),
          // La "comprensión promedio: 81%" del pulso no está: se mediría con
          // `clase_comprension`, que solo se llena durante una clase en vivo, y
          // las clases en vivo son la Etapa 9. Antes que mostrar un número
          // inventado, se muestra una tarjeta menos.
        },
        actividad: actividad.all(id).map((fila) => ({
          tipo: fila.tipo,
          titulo: fila.titulo,
          detalle: fila.detalle,
          cuando: fila.cuando,
        })),
        alertas: {
          sinCorregir: al.sin_corregir,
          denunciasAbiertas: al.denuncias_abiertas,
          cursosSinPreceptor: al.cursos_sin_preceptor,
          recursosEnCola: al.recursos_en_cola,
        },
      });
    })
  );
}
