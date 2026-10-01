# Integración de NEXO — 1 de octubre de 2026

## Cambios comprobables

- Se restauró la carga de la configuración de Tailwind 4. Los colores existentes vuelven a aplicarse correctamente en toda la aplicación.
- Nuevo acceso, menú por rol, buscador de secciones, navegación móvil y encabezado compartido. Las pantallas se cargan por separado para reducir la descarga inicial.
- Manejo común de carga, errores, pérdida de conexión, vencimiento y cierre de sesión. Los formularios conservan su contenido cuando falla una operación.
- Gestión académica persistente: cursos, materias, docentes, preceptores, inscripciones y vínculos de familias con estudiantes.
- Competencias con catálogo completo y evidencias propias, opcionalmente relacionadas con una tarea entregada. Edición y archivo de hábitos. Descripción y fecha en tareas personales.
- Chat con selección de contactos, apertura de conversaciones, archivos y actualización en vivo. Dirección puede recibir y responder las consultas privadas de las familias.
- Los comunicados familiares muestran su contenido y conservan sus adjuntos después de leídos. Responder abre el hilo del emisor correcto.
- Filtros de biblioteca, publicaciones y debates; acciones de notificaciones, navegación y avisos de materia conectadas a datos persistentes.
- La asistencia IA tiene espera limitada y guarda pregunta/respuesta juntas cuando el proveedor responde correctamente.
- Arranque conjunto con `npm run dev`; validación con `npm run check`.
- Preceptoría muestra mensajes recientes de sus cursos y eventos reales. El centro de estudiantes abre el artículo elegido y filtra eventos por mes.
- Aula virtual: planificación con fechas verificadas, asistencia idempotente, errores visibles y pizarra que deduplica los trazos recibidos del servidor.
- Diálogos de publicaciones y tareas con foco contenido, cierre con Escape y restauración del foco.

## Validación realizada

- ESLint sin errores ni advertencias.
- TypeScript y compilación de producción correctos, con división del JavaScript por pantalla.
- 68 pruebas aprobadas: integración y tratamiento de fechas.
- Matriz de permisos de todas las pantallas para los ocho roles, 46 contratos de lectura y respuestas de error JSON.
- Creación de cursos, asignación docente, rechazo de duplicados y matrícula conflictiva.
- Creación, edición y persistencia de tareas personales y hábitos; alta y eliminación de evidencias.
- Docente crea tarea → estudiante entrega → docente corrige → portafolio muestra la misma nota → estudiante recibe la notificación.
- Familia lee comunicado → abre conversación privada → Dirección recibe la respuesta; un tercero no puede leer el hilo.
- Referencias de otra institución rechazadas en cursos, vínculos familiares y contactos.
- Aula: crear y comenzar una clase, impedir inicio anticipado, ingresar sin duplicar asistencia, completar etapas, registrar comprensión, responder preguntas y cerrar asistencia al finalizar.
- Pruebas de navegador: ingreso y cambio de sesión con los ocho perfiles; comunidad en escritorio (1440 px) y revisión móvil (390 px) de portafolio, competencias, hábitos, biblioteca, chat, calendario, cursos, perfiles, panel, reportes y comunicados. Se revisaron formularios de tareas, evidencias y organización de cursos.

Las pruebas de escritura usan una base temporal con datos de ejemplo. No reinicializan la base existente. Las migraciones de la aplicación agregan la columna necesaria para relacionar evidencias con tareas.

## Alcance de la verificación

Esto documenta los recorridos ejecutados, no garantiza ausencia total de errores. La respuesta de un proveedor real de IA requiere `NEXO_IA_CLAVE`; no se probó con una credencial externa. La videollamada entre equipos requiere comprobar cámaras, micrófonos, HTTPS y conectividad STUN/TURN en la red de destino. No se realizó una prueba de carga ni un despliegue de producción.

La guía de instalación y las variables de entorno están en `COMO_CORRER_LA_APP.md`.
