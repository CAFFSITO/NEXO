# Biblioteca local — 11/11/2026

La biblioteca institucional y nacional permiten guardar una copia autorizada desde el lector. Cada copia contiene metadatos, huella de versión, archivo y anotaciones del servidor. IndexedDB separa las copias y notas por cuenta. Los enlaces externos guardan sólo su descripción; NEXO no descarga ni ejecuta el sitio enlazado.

## Circuito implementado

1. «Guardar o actualizar copia local» consulta una instantánea autorizada, comprueba espacio cuando el navegador ofrece una estimación, descarga el archivo por la API existente y vuelve a comprobar la versión antes de confirmar el guardado. Una descarga incompleta o un cambio durante ella conserva la copia previa.
2. «Mi biblioteca local» abre PDF, audio, video, imágenes raster y texto. El texto y HTML se muestran como texto, sin ejecutar su contenido. Otros formatos pueden descargarse para abrirse con un programa compatible. El lector mantiene el foco de teclado y se cierra con Escape.
3. Se pueden crear notas sin conexión. La cola es explícita y conserva texto, ubicación, UUID y versión de origen. Las notas sincronizadas quedan diferenciadas de las pendientes. Quitar una nota local no borra la del servidor.
4. Al recuperar conexión se comprueban permisos y versiones; las notas se envían sólo al pulsar sincronizar. Los lotes de hasta 100 notas son idempotentes, de modo que perder el acuse y reintentar no crea duplicados. Las notas del servidor no se sobrescriben.
5. Si cambió el original, la sincronización se detiene con 409. La persona puede actualizar la copia o confirmar que sus notas corresponden a la versión actual. Se conserva la versión de origen de cada nota. Si cambia otra vez durante el envío, se detiene el lote y los pendientes siguen locales.
6. Un 403/404 al comprobar el original marca la copia como revocada, elimina sus bytes y descripción en el almacén de NEXO y conserva las notas personales. Los errores de red y la falta de sesión no se interpretan como revocación. Una copia ya exportada físicamente no puede revocarse a distancia.
7. Se puede exportar un HTML autónomo con el archivo incluido y las notas, sin scripts ni recursos remotos; también un JSON de las notas. El respaldo incluye las notas que acaban de sincronizarse aunque el listado local del servidor aún no se haya actualizado.

## Alcance de funcionamiento sin conexión

La interfaz local funciona mientras NEXO ya está cargado en la cuenta correspondiente. Esta entrega no modifica el inicio de sesión ni el service worker para simular una sesión tras una recarga sin servidor. Para abrir el material después sin NEXO, se usa el HTML autónomo exportado. IndexedDB puede ser eliminado por el navegador o por la persona; los respaldos explícitos permiten conservar la lectura fuera de ese almacén.

«Quitar archivo local» libera los bytes pero conserva el registro y las notas. «Quitar copia y notas locales» borra ambos de ese navegador. Ninguna de estas acciones elimina el recurso institucional ni las notas ya confirmadas en el servidor.

## Verificación

- `servidor/tests/biblioteca-local.test.js`: 1/1 aprobada. Instantánea autorizada, aislamiento institucional, UUID idempotente, conflicto por contenido, conflicto de versión y revocación sin pérdida de anotaciones.
- `scripts/verificar-biblioteca-local-ui.mjs`: aprobado en Chrome headless con base temporal. Ejecuta el servicio real dentro del navegador: descarga, lectura y anotación sin red, aislamiento por cuenta, HTML escapado, persistencia al recargar, versión nueva, pérdida del acuse después de guardar en servidor, reintento sin duplicar y revocación de bytes conservando notas.
- ESLint de los cinco archivos de interfaz/servicio cambiados: aprobado. La integración final requiere build global y recorrido visual de sus pantallas con la instantánea conjunta.

No se probaron cuotas agotadas de todos los navegadores, archivos gigantes, almacenamiento privado en todos los dispositivos ni renderizado PDF/audio/video de todos los formatos. Los errores de almacenamiento y red se muestran y no provocan un borrado preventivo de la copia anterior.

## Archivos

`NEXO/src/servicios/bibliotecaLocal.ts`, `components/biblioteca/BibliotecaLocal.tsx`, integración en `LectorRecurso.tsx`, `BibliotecaPage.tsx` y `BibliotecaNacionalPage.tsx`; endpoints y tabla de correspondencias en `servidor/biblioteca-organizacion.js`. Se reutilizan la identidad, el archivo autorizado y las anotaciones existentes. No se modificaron `archivos.js`, `proyectos.js`, el login ni `sw.js`.
