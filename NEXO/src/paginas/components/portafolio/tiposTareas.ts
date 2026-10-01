// Presentación de las tareas académicas.
//
// El contenido se mudó a components/shared/tareas/tiposTareas.ts para que lo
// comparta también la vista del profesor (una sola fuente de verdad). Este
// archivo re-exporta desde allá para no romper los imports existentes del
// estudiante (Mis Tareas, Calificaciones, Detalle de materia).
export * from "../shared/tareas/tiposTareas";
