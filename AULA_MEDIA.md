# Aula y transmisión institucional

La sala WebRTC en malla de NEXO sigue disponible para quienes participan con cámara o micrófono. El límite de esa sala es de 12 conexiones. La transmisión institucional opcional usa un servidor de medios MediaMTX propio: OBS publica por RTMP y NEXO entrega HLS a espectadores a través de un proxy autenticado. Chat, pizarra, preguntas, solicitudes de palabra y el evento de agenda siguen siendo los de la misma clase.

## Configuración

En el servidor de NEXO se requieren:

- `NEXO_MEDIA_HLS_ORIGIN=http://127.0.0.1:8888` (MediaMTX en el mismo host o IP privada institucional).
- `NEXO_MEDIA_RTMP_ORIGIN=rtmp://127.0.0.1:1935` (dirección que utilizará OBS; cambiarla por la IP privada a la que pueda llegar el equipo docente).
- `NEXO_MEDIA_TOKEN_SECRET`: cadena aleatoria estable de al menos 32 caracteres para firmar credenciales por clase.
- `NEXO_MEDIA_AUTH_SECRET`: otra cadena aleatoria estable de al menos 32 caracteres, utilizada sólo entre MediaMTX y NEXO.

En MediaMTX se configura `authMethod: http` y `authHTTPAddress: http://127.0.0.1:<puerto-nexo>/api/aula/transmision/autorizacion?clave=<NEXO_MEDIA_AUTH_SECRET>`. Si MediaMTX está en otra máquina, el acceso a esta dirección debe limitarse a su red privada; para el tramo entre servidores se debe usar TLS. El puerto HLS debe quedar accesible para el servidor NEXO. El cliente web no habla directamente con MediaMTX. No se debe habilitar un usuario anónimo con permiso de lectura o publicación en MediaMTX.

La configuración sólo se activa cuando están presentes y son válidos los cuatro valores. Las direcciones del servidor de medios deben usar `localhost` o una IP privada literal. Si faltan, la UI explica que la transmisión institucional no está configurada y conserva el modo de videollamada existente.

## Uso y control

- El docente inicia la clase en NEXO y abre **Ver transmisión → Configurar OBS**. Copia la dirección RTMP completa como servidor en OBS y deja la clave vacía. La dirección contiene una credencial temporal de publicación. El estudiante jamás recibe esa dirección.
- Cualquier integrante autorizado de esa clase puede elegir **Ver transmisión**. NEXO verifica su sesión y pertenencia antes de servir cada lista y segmento HLS. El reproductor usa HLS nativo o `hls.js` según navegador. No solicita cámara ni micrófono.
- MediaMTX pregunta a NEXO antes de aceptar publicar o leer. NEXO verifica firma, caducidad, ruta exacta, acción, usuario activo, institución, inscripción y clase en vivo. Sólo el docente dueño publica. Finalizar la clase revoca el acceso aunque la credencial no haya llegado a su vencimiento de dos horas.
- El proxy HLS acepta únicamente archivos de medios de la ruta fija de esa clase, exige un tipo de contenido compatible, limita listas a 1 MB y segmentos a 32 MB, y no sigue redirecciones. Las credenciales de lectura se generan en el servidor para cada solicitud, sin exponerlas en la página.

## Verificación y límites

`node --test servidor/tests/aula-transmision.test.js` comprueba con un servidor de medios simulado: emisión para docente, ausencia de credencial de OBS en estudiante, aislamiento de clase, proxy HLS, rechazo de ruta/acción/clave erróneas y revocación al finalizar. Build y lint focal aprobaron. **No se instaló ni se probó MediaMTX real en este equipo**; antes de habilitarlo hay que ensayar OBS, reproducción, latencia, CPU/red, reconexión, revocación y cantidad de espectadores en infraestructura institucional. El proxy HLS mejora el control de acceso, pero puede requerir capacidad de red o caché privada para audiencias grandes. HLS tiene más latencia que WebRTC. La publicación desde navegador hacia MediaMTX mediante WHIP, SFU de múltiples oradores, grabación institucional automática y adaptación de calidad por rendiciones siguen pendientes.

Referencias oficiales: [MediaMTX, autenticación HTTP](https://mediamtx.org/docs/features/authentication), [OBS y RTMP](https://mediamtx.org/docs/publish/obs-studio), [lectura HLS en navegador](https://mediamtx.org/docs/read/web-browsers).
