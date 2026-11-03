# Paso 3: tareas, accionables y seguimiento

## Capacidades integradas

- La tarea docente admite una rúbrica de criterios descriptivos. La corrección conserva la nota única y añade devolución específica por criterio.
- Una entrega corregida se puede mejorar mediante una nueva versión. Docente y estudiante pueden consultar el historial con entrega, archivos, nota y devolución de cada versión anterior; el portafolio usa únicamente la versión vigente para su nota.
- El docente asigna revisores del mismo curso a una entrega. El revisor lee el texto y los adjuntos autorizados y deja una devolución descriptiva, sin calificar. El estudiante y el docente la ven en la entrega. No se puede acceder a una revisión sin estar asignado.
- En una tarea grupal el docente crea equipos con estudiantes del curso. Una entrega y una corrección pertenecen al equipo; todos sus integrantes ven la misma versión vigente, nota, devolución, archivos e historial. Las métricas cuentan estudiantes cubiertos sin duplicar la corrección. Un integrante del equipo no puede ser su revisor.
- Los pasos de una meta pueden anidarse, depender de otro paso y guardar evidencia textual. No se puede completar un paso antes de su dependencia ni crear ciclos. Al reabrir un paso, se exige reabrir primero los pasos completados que dependen de él. Al borrar un paso, sus hijos pasan a su padre y las dependencias hacia él se eliminan.
- El dueño de una meta puede asignar un paso a una persona activa de su institución. La persona asignada ve sólo ese paso en su cuenta, registra avance y adjunta evidencia; el archivo lo descargan sólo ella y el dueño. Los pasos también admiten un archivo de evidencia propio.
- Las tareas personales admiten repetición diaria, semanal, mensual o anual con las reglas del calendario. La siguiente ocurrencia se crea al completar la actual, una sola vez; la interfaz permite ajustar intervalo, cantidad, fecha final, días hábiles y feriados.
- El tablero del docente cuenta entregas por corregir, estudiantes sin entregar, nuevas versiones y revisiones de pares pendientes. El del estudiante distingue por entregar, esperando devolución, con devolución y tareas personales hechas. Los conteos provienen de la misma base que tareas y calificaciones.

## Compatibilidad y datos

Las columnas y la tabla nuevas se agregan de forma aditiva al abrir el servidor; el esquema inicial incluye las mismas definiciones. No se modifican notas históricas ni se borra ninguna versión. La descarga de adjuntos de una entrega también contempla al revisor asignado mientras la entrega esté activa y siga inscripto.

## Verificación

- `node --test servidor/tests/aprendizaje-evolucion.test.js`: 3 pruebas pasan. Cubren versiones, nota vigente, rúbrica, revisión entre pares, acceso, métricas, equipos, descarga de adjuntos, jerarquía, dependencias, asignación y evidencia. `servidor/tests/tareas-recurrentes.test.js` verifica la siguiente ocurrencia y la idempotencia.
- `node --test servidor/tests/integracion.test.js`: 66 pruebas pasaron tras integrar versiones y pares.
- `npm run build` en `NEXO`: pasó el 28 de octubre con la interfaz de equipos integrada.

## Alcance todavía pendiente del prompt original

La delegación y la recurrencia se aplican a pasos de metas y tareas personales, respectivamente. Todavía no hay recurrencia de tareas docentes ni edición avanzada de todos los parámetros de agenda (por ejemplo, varios días concretos de una semana) en el formulario personal.
