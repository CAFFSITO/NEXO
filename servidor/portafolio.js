// ============================================================================
// NEXO — Ventanilla del Portafolio del estudiante (Etapa 2, pantalla 2)
// ----------------------------------------------------------------------------
// Acá muere el Error 13.1. Hasta ahora Mis Tareas decía que Biología estaba
// 9.5 y Calificaciones, mirando el mismo trabajo, decía 8.0. No era un error de
// cálculo: eran dos listas inventadas, escritas a mano en dos archivos
// distintos, que nunca se habían mirado entre sí.
//
// Por eso hay UNA sola ventanilla y no dos:
//
//   GET /api/portafolio → { tareas, personales }
//
// Mis Tareas y Calificaciones piden lo mismo y muestran lo mismo con distinta
// forma. La nota sale de `correcciones`, que tiene `entrega_id` UNIQUE: la base
// misma impide que un trabajo tenga dos notas. Ya no hay dónde contradecirse.
//
// Las fechas salen completas, con año ("2026-07-10"). Las de antes eran texto
// suelto sin año ("15 ABR") y la aplicación suponía que eran del año en curso
// (Error 2.C.9).
// ============================================================================

import { exigirAcceso, ventanilla } from "./comun.js";

export function registrarPortafolio(app, db) {
  // Las tareas de las cátedras del curso del estudiante, con su entrega y su
  // corrección si existen. Un LEFT JOIN y no un JOIN: una tarea sin entregar
  // también es una tarea (es, de hecho, la que más importa).
  //
  // `e.anulada_en IS NULL` va en el JOIN y no en el WHERE: si fuera al WHERE,
  // una entrega anulada haría desaparecer la tarea entera de la pantalla, en
  // vez de mostrarla como lo que vuelve a ser, una tarea sin entregar.
  const tareasDe = db.prepare(
    `SELECT t.id,
            t.titulo,
            t.consigna,
            t.fecha_limite,
            t.metodo_estudio,
            t.tipo_asignacion,
            m.nombre  AS materia,
            p.nombre  AS profesor,
            e.id            AS entrega_id,
            e.entregado_en,
            e.comentario    AS comentario_entrega,
            co.nota,
            co.devolucion,
            co.corregido_en
       FROM inscripciones i
       JOIN catedras ca ON ca.curso_id = i.curso_id
       JOIN tareas t    ON t.catedra_id = ca.id AND t.eliminado_en IS NULL
       JOIN materias m  ON m.id = ca.materia_id
       JOIN usuarios p  ON p.id = ca.profesor_id
       LEFT JOIN entregas e
              ON e.tarea_id = t.id
             AND e.estudiante_id = i.estudiante_id
             AND e.anulada_en IS NULL
       LEFT JOIN correcciones co ON co.entrega_id = e.id
      WHERE i.estudiante_id = ?
      ORDER BY t.fecha_limite`
  );

  const personalesDe = db.prepare(
    `SELECT id, titulo, descripcion, fecha_limite, completada_en
       FROM tareas_personales
      WHERE estudiante_id = ?
      ORDER BY completada_en IS NOT NULL, fecha_limite`
  );

  /**
   * En qué estado está una tarea, mirando SOLO lo que hay en la base.
   *
   * "vencida" no se calcula acá: depende del día en que se mire y esa cuenta la
   * hace la pantalla con el calculador único (`servicios/fechas.ts`). Si el
   * servidor la mandara ya resuelta, una pestaña abierta desde ayer mostraría
   * "pendiente" para siempre.
   *
   * "en-progreso" tampoco existe en la base: era un estado inventado de los
   * datos de ejemplo. Una tarea está entregada o no lo está.
   */
  function estadoDe(fila) {
    return fila.entrega_id ? "entregada" : "pendiente";
  }

  app.get(
    "/api/portafolio",
    ventanilla((req, res) => {
      // Se pide el permiso de Mis Tareas porque es la misma gente: el
      // Portafolio entero (Mis Tareas y Calificaciones) es del estudiante y de
      // nadie más. Si algún día Calificaciones se le abre a la familia, ahí sí
      // habrá que separar las dos preguntas, y se separan en permisos.js.
      const usuario = exigirAcceso(db, req, res, "mis-tareas-estudiante");
      if (!usuario) return;

      const tareas = tareasDe.all(usuario.id).map((fila) => ({
        id: String(fila.id),
        materia: fila.materia,
        titulo: fila.titulo,
        consigna: fila.consigna,
        profesor: fila.profesor,
        fechaLimite: fila.fecha_limite,
        estado: estadoDe(fila),
        metodoEstudio: fila.metodo_estudio ?? undefined,
        tipoAsignacion: fila.tipo_asignacion,
        entregadoEn: fila.entregado_en ?? null,
        comentarioEntrega: fila.comentario_entrega ?? null,
        // La nota y la devolución salen de `correcciones` y de ningún otro
        // lado. null = todavía sin corregir, que NO es lo mismo que un cero.
        nota: fila.nota ?? null,
        devolucion: fila.devolucion ?? "",
        corregidoEn: fila.corregido_en ?? null,
      }));

      const personales = personalesDe.all(usuario.id).map((fila) => ({
        id: String(fila.id),
        titulo: fila.titulo,
        descripcion: fila.descripcion,
        fechaLimite: fila.fecha_limite ?? null,
        completada: fila.completada_en !== null,
      }));

      res.json({ tareas, personales });
    })
  );
}
