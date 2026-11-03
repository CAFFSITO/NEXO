# Biblioteca y archivos: evolución del paso 4

La implementación conserva `recursos`, `archivos` y la cola editorial existentes. Las carpetas y colecciones guardan referencias; no copian ni mueven bytes ni rompen adjuntos usados en tareas y comunidad.

## Entregado

- Los recursos nacionales aprobados circulan entre instituciones en listado, votos y descarga; los borradores y recursos institucionales conservan su ámbito.
- Lector de PDF, texto e imagen, descarga del original, anotaciones privadas por página/minuto/sección, colecciones personales y etiquetas editables por autor.
- Búsqueda conjunta de recursos visibles, etiquetas, colecciones y anotaciones propias; búsqueda separada de archivos propios por nombre. Los resultados nacionales abren su recurso en el lector nacional.
- Historial de versiones de recursos. El autor puede publicar una versión nueva o restaurar una anterior. Ambas operaciones vuelven a la cola de revisión; un recurso nacional se retira mientras se revisa la nueva versión.
- El autor puede abrir y descargar directamente los archivos de versiones anteriores desde el lector. Los enlaces y archivos históricos no se exponen a otros lectores porque podrían corresponder a un borrador no aprobado.
- Carpetas personales de archivos con referencias reutilizables; cada archivo conserva su ID. El panel está al pie de Biblioteca institucional.
- La dirección puede fijar una cuota institucional opcional desde Biblioteca. Se mide almacenamiento usado y reservado por cargas incompletas; sin configuración no hay cuota institucional. Las cargas completas e iniciadas respetan el límite y cancelar una carga libera su reserva.
- Los recursos aprobados se vinculan por referencia con tareas, materias y publicaciones administradas por la persona. El lector muestra los vínculos visibles y permite crearlos o quitarlos; los detalles de tarea, materia y publicación muestran los recursos asociados. Cada lectura revalida tanto el acceso al destino como la visibilidad del recurso, sin copiar archivos ni revelar borradores o contenido retirado. Prueba dirigida `biblioteca-vinculos.test.js` cubre ambos sentidos, permisos por rol e institución y desaparición de un destino o recurso.
- Cargas de más de 5 MB por fragmentos de 5 MB. El navegador conserva el identificador y consulta la posición recibida tras un corte. Finalizar dos veces devuelve el mismo archivo; la respuesta perdida no duplica el registro. Existe cancelación explícita de una carga pendiente. Al iniciar, se borran cargas pendientes de más de siete días y recibos completados de más de treinta.

## Verificación

`node --test servidor/tests/biblioteca-nacional.test.js servidor/tests/archivo-cargas.test.js`: 2/2 aprobadas. Cubren dos instituciones, aislamiento de borradores/notas/carpetas, búsqueda por etiqueta, cola de versiones, reanudación, offset repetido e idempotencia de finalización.

La compilación frontend pasó antes de que comenzara la edición concurrente de `DocumentosPage.tsx` (paso 6). En la última ejecución falló por diez errores de ese archivo, sin errores reportados en los archivos del paso 4.

## Pendientes del alcance amplio del paso 4

- Proyectos sin una entidad única y estable en el esquema aún no se vinculan por este circuito. La relación actual cubre tareas, materias y publicaciones.
- Sincronización local explícita. El almacén conserva los medios en el servidor; el cliente reanuda cargas, pero no mantiene una copia offline completa.
