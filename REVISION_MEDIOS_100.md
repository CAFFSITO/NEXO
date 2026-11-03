# Revisión de biblioteca, aula, multimedia e IA privada

Fecha: 02/11/2026. Resultado: **los pasos 4, 5, 9 y 10 no están terminados al 100%**. Esta revisión contrastó el alcance pedido en el chat y en el plan con las rutas, servicios, componentes y pruebas de estos subsistemas. Las pruebas usan bases temporales. No se instalaron modelos ni se conectó infraestructura externa real.

## Correcciones realizadas durante la revisión

1. **Modelo cloud en servidor privado:** `servidor/asistencia-ia.js` aceptaba cualquier nombre de `NEXO_IA_MODELO`. Un Ollama en una IP privada también puede ejecutar un modelo cloud; el origen privado por sí solo no evita ese envío. Ahora se rechazan nombres cloud antes de enviar preguntas/contexto y se filtran de la lista del servidor, igual que en el modo dispositivo. Una prueba verifica cero solicitudes al servicio privado ante un modelo cloud configurado. Esta barrera no acredita la configuración interna de un servidor arbitrario; la institución aún debe mantener Ollama sin cloud y verificar su tráfico.
2. **Texto de versiones no publicadas:** `servidor/biblioteca-organizacion.js` ocultaba los archivos/enlaces históricos a otros lectores, pero devolvía títulos/descripciones de esas versiones, que podían ser borradores nunca aprobados. Ahora el historial completo sólo lo recibe el autor. Los demás siguen recibiendo la versión actual autorizada. La prueba verifica la separación.

## Paso 4: biblioteca y archivos

| Requisito | Estado verificado y límite |
|---|---|
| Biblioteca nacional entre instituciones | Implementada y probada por API: lectura/voto de aprobados; borradores e institucionales aislados. |
| Archivos, versiones y restauración | Implementados; el autor abre versiones anteriores y restaurar vuelve a revisión. Historial protegido durante esta revisión. |
| Carpetas, colecciones y etiquetas | Referencias personales reutilizables implementadas; la interfaz de colecciones permite crear/agregar. No equivale a gestión completa de carpetas anidadas ni carpetas compartidas tipo Drive. |
| Lectura/anotación | PDF, texto e imágenes mediante visor/descarga y notas privadas por referencia textual. No hay lector EPUB, anotación anclada al texto ni colaboración sobre anotaciones. |
| Búsqueda | Busca metadatos, etiquetas, colecciones y notas; no indexa el contenido completo de los libros/archivos. No es búsqueda global de todos los objetos de NEXO. |
| Cargas grandes reanudables | Fragmentos de 5 MB, offset, reserva de cuota, finalización repetible y cancelación probados; el servidor reúne el archivo en memoria al finalizar. Falta medir archivos grandes y concurrencia en hardware real. |
| Vínculos con trabajo académico/comunidad | Tarea, materia y publicación tienen vínculos bidireccionales con revalidación de acceso probados. Proyectos y otros objetos todavía no están cubiertos. |
| Biblioteca local/sincronización explícita | Pendiente. `NEXO/public/sw.js` no cachea la app ni medios; IndexedDB multimedia contiene sólo un borrador por cuenta, no la biblioteca offline. |

Archivos inspeccionados: `servidor/archivos.js`, `servidor/biblioteca.js`, `servidor/biblioteca-organizacion.js`, lector y vistas de biblioteca, servicios de archivos/borrador y service worker.

## Paso 5: aula y transmisión

| Requisito | Estado verificado y límite |
|---|---|
| Clase, agenda y contexto | Planificación, etapas, estado, agenda enlazada, chat, preguntas, pulso y mano levantada implementados; API prueba pertenencia y revocación. |
| Videollamada | Malla WebRTC con límite declarado; no acredita escala ni conectividad en redes reales. |
| Pizarra colaborativa configurable | Parcial: `servidor/aula.js` permite dibujar/limpiar sólo al docente. Los estudiantes la reciben; no hay permiso configurable de coedición. |
| Sesiones comunitarias y todos los perfiles | Parcial: el acceso depende de cátedra/docente/estudiantes inscriptos. No existe un circuito general equivalente para una sesión comunitaria entre perfiles arbitrarios. |
| Transmisión OBS y espectadores | Puente MediaMTX/HLS implementado con token, pertenencia y proxy autenticado; probado sólo contra un servidor simulado. MediaMTX/OBS real no probado. |
| Transmitir desde navegador | Captura existe para grabación y videollamada; publicación navegador→servidor de medios mediante WHIP está pendiente. |
| Oradores múltiples, calidad y reconexión | Mano levantada no convierte la malla en un SFU. No hay SFU, selección de rendiciones ABR ni política completa de reconexión de publicación; HLS tiene botón Reconectar. |
| Reservas/cupos | Existen como bloque de app pública. No están integrados con inscripción/entrada de la clase. |
| Grabación de sesión a lección | Pendiente: no hay grabación institucional automática de la sesión ni conversión directa del aula completa a lección. |

Archivos inspeccionados: `servidor/aula.js`, `servidor/aula-transmision.js`, componentes de sala/transmisión y pruebas de sesiones/transmisión.

## Paso 9: multimedia y oratoria

| Requisito | Estado verificado y límite |
|---|---|
| Audio, cámara, pantalla, pantalla+cámara | Implementados con MediaRecorder y mezcla de micrófono/audio de pantalla cuando el navegador lo entrega. Composición fija 1280×720, cámara en una posición fija; aún no es «super personalizable». |
| Pausa, recuperación y edición | Pausa/reanudación, capítulos y recorte institucional existen. IndexedDB guarda el último archivo terminado y capítulos; no guarda fragmentos durante la grabación, transcripción, subtítulos editados ni métricas. Un cierre inesperado durante la captura puede perderla. |
| Transcripción local | Servidor institucional con whisper.cpp; no hay motor empaquetado en el dispositivo/navegador. Exige ejecutable/modelo y ffmpeg. No hay muestra real transcrita en esta auditoría. |
| Idiomas y subtítulos | SRT analizado y editable, publicación en lección con WebVTT/saltos de audio. El parser limita a 200 segmentos y 500 caracteres por segmento; el comando no ofrece selección de idioma en UI. No se acredita transcripción multilingüe completa. |
| Oratoria audio/video/combinado | Métricas de pausas/volumen via ffmpeg, palabras/muletillas/señales textuales y métricas de luz/cambio de cuadros en navegador. No hay análisis de postura/mirada, alineación de muletillas con tiempo, evaluación de calidad argumentativa ni comparación persistida entre intentos. |
| Uso privado y en tareas/lecciones | EstudioMultimedia se integra con lecciones y adjuntos de tarea; usarlo en biblioteca privada conserva archivo, no una biblioteca local completa de análisis/intentos. |
| Rendimiento y dispositivos | No se midieron memoria/velocidad, cámara/micrófono/pantalla reales ni soporte en varios equipos. Límite HTTP de procesamiento: 100 MB. |

Archivos inspeccionados: `servidor/multimedia-local.js`, `EstudioMultimedia.tsx`, `borradorMultimedia.ts`, integración de tareas y `LeccionesMateria.tsx`.

## Paso 10: IA privada

| Requisito | Estado verificado y límite |
|---|---|
| Servidor local/institucional | Origen privado literal/localhost, rechazo de redirecciones, contexto autorizado, cancelación e historial implementados. Se probó un contrato Ollama simulado. |
| Dispositivo | Navegador llama a Ollama en loopback; historial en memoria y sin fallback. Requiere instalación local, CORS/HTTPS/permisos compatibles. No es inferencia independiente dentro del navegador. |
| Combinación configurable | Selector de modo institucional/dispositivo existe. La dirección institucional y modelo de servidor son variables de entorno; falta configuración intuitiva por institución/perfil y gestión de distribución. |
| Modelos | Lista y selector en dispositivo; servidor tiene modelo fijo por entorno. Sin instalación/descarga/progreso de modelos desde NEXO. Cloud explícito bloqueado durante esta revisión. |
| Contexto educativo amplio | Sólo hasta ocho fuentes de biblioteca aprobada y tareas de estudiante. Usa título/descripción o consigna, no bytes de libros, lecciones, documentos, entregas, rúbricas ni el conjunto de datos pedagógicos solicitado. |
| Privacidad real | NEXO no tiene transporte a proveedor público en estas rutas. No se verificó tráfico de un Ollama real ni configuración sin cloud del host. El despliegue debe comprobar esa propiedad; una IP privada no prueba por sí misma dónde infiere el servicio. |
| Todos los perfiles | El permiso de la pantalla puede personalizarse; el contexto de tareas consulta inscripciones del estudiante. No cubre las fuentes específicas necesarias para todos los roles. |

Archivos inspeccionados: `servidor/asistencia-ia.js`, `AsistenciaIAPage.tsx`, `asistenciaIa.ts`, `asistenciaDispositivo.ts` y pruebas de privacidad.

## Verificación ejecutada

- 10/10 pruebas dirigidas aprobadas: archivos/cargas, IA privada, aula/sesiones, transmisión, biblioteca nacional/vínculos y parser SRT.
- `biblioteca-nacional.test.js` repetida después del cambio de historial: 1/1 aprobada.
- No se ejecutaron instalaciones ni inferencia real, MediaMTX/OBS real, dispositivos multimedia ni carga de producción. El resultado de estas pruebas no permite declarar el alcance completo como terminado.

## Criterio para cerrar estos cuatro pasos

Completar las capacidades faltantes de cada tabla y añadir recorridos de sus flujos reales. Después ejecutar pruebas con modelos locales y servidor de medios propios, un archivo grande, cortes de red y equipos de destino. Para la privacidad se necesita comprobar tanto el transporte de NEXO como el comportamiento del servidor/modelo que recibe los datos. Ningún resultado anterior reemplaza estas verificaciones.

## Los cinco principios por subsistema

| Subsistema | Interacción | Organización | Perfil cognitivo/plasticidad | Creatividad | Retroalimentación |
|---|---|---|---|---|---|
| Biblioteca | Compartir recursos nacionales y vínculos; faltan notas colaborativas. | Colecciones, etiquetas, versiones y cargas; falta offline y búsqueda por contenido. | Lectura y anotación flexibles; no hay adaptación del texto ni lector EPUB. | Producción/publicación de recursos y notas propias. | Revisión editorial/votos; no prueban aprendizaje ni calidad pedagógica. |
| Aula | Chat, preguntas, mano y llamada; comunidad general pendiente. | Agenda, etapas y materiales; reservas de apps todavía separadas. | Pulso y alerta al docente; no adaptan por sí solos contenido/ritmo de cada persona. | Pizarra docente y participación oral; coedición configurable pendiente. | Pulso/preguntas/acciones docentes; rapidez humana no garantizada por el transporte. |
| Multimedia | Producciones compartidas por tarea/lección; colaboración del editor pendiente. | Archivo, capítulos y subtítulos; historial de análisis/comparación pendiente. | Formatos de captura diversos; composición y adaptación limitadas. | Crear grabación propia y editarla; no hay editor audiovisual completo. | Métricas técnicas y texto; falta ciclo de intentos y comparación persistida. |
| IA privada | Tutoría por chat; no sustituye intercambio social. | Historial y fuentes seleccionadas; contexto amplio y gestión modelos pendientes. | Se puede pedir explicación adaptada; no hay motor de adaptación validado por aprendizaje observado. | Propuestas generadas para revisión humana. | Respuestas contextuales citadas; calidad no acreditada con modelo real ni cierre pedagógico sobre acciones posteriores. |

## Funcionalidades faltantes implementables frente a dependencias externas

**Código/producto todavía pendiente:** biblioteca offline y búsqueda de contenido; proyectos; pizarra con permisos colaborativos; sesiones para comunidades; enlace de cupos al aula; publicación WHIP y SFU; grabación de aula a lección; composición multimedia configurable; persistencia completa/incremental del borrador; catálogo local de grabaciones/análisis; comparación de intentos; marcas de tiempo del análisis; ampliar subtítulos; inferencia empaquetada/distribución de modelos; configuración institucional desde UI y contexto IA de documentos/lecciones/otros perfiles. Tener Ollama, whisper.cpp o MediaMTX disponibles no agrega estas funciones automáticamente.

**Dependencias externas para verificar lo ya implementado:** ejecutable/modelo whisper.cpp y ffmpeg; Ollama con modelo instalado y cloud deshabilitado; MediaMTX y OBS en infraestructura institucional; acceso de navegador a loopback/CORS/HTTPS; dispositivos de captura y redes de destino. Su ausencia bloquea las pruebas reales de esos motores, pero no impide desarrollar las funciones anteriores. Los límites de rendimiento/escala requieren mediciones y no quedan resueltos por instalar esas herramientas.
