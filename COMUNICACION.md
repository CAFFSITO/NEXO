# Comunicación entre perfiles

Desde **Perfiles académicos**, Dirección puede crear una cuenta con el rol **Secretaría**. Tiene acceso a Mensajes, Anuncios, Calendario y su propia configuración. Puede iniciar conversaciones con Dirección, Preceptoría y otras cuentas de Secretaría de la misma institución. No recibe permisos para administrar perfiles ni acceder al panel de Dirección.

En **Mensajes**, cada envío admite texto, un archivo o una nota de voz; el texto también puede acompañar al adjunto. **Responder** vincula el envío con el mensaje original. Los audios se escuchan antes de enviarse y dentro del chat. Cada texto se puede copiar o descargar como `.txt`; los adjuntos y audios se descargan y sus enlaces se pueden copiar. El enlace conserva los permisos: solamente pueden abrirlo las personas autorizadas.

La grabación usa el micrófono del navegador, se puede cancelar y termina automáticamente a los cinco minutos. Si el navegador no permite grabar, se puede adjuntar un audio existente. Se mantienen los límites del almacén: 15 MB para documentos y 100 MB para audio y video.

## Responder desde el mensaje recibido

Al recibir un aviso, la caja **Responder…** aparece directamente debajo del mensaje, junto al clip para adjuntar y el botón para grabar audio. Usa los colores elegidos en Personalización, incluidos fondo, texto, borde y botón de envío. Las opciones **Hecho**, **No**, **Sí** y **Recibido** completan el texto; la flecha **Enviar respuesta** confirma el envío. Se pueden adjuntar hasta cinco archivos o audios y combinar texto con adjuntos. Las respuestas aparecen en el historial del mismo aviso. **Marcar como leído** y la fila de emojis permanecen visibles. Reaccionar con un emoji confirma automáticamente la lectura; quitar la reacción no vuelve a marcarlo pendiente. Responder con texto o adjuntos conserva la confirmación de lectura como acción independiente.

Se acepta cualquier extensión, incluidos documentos, planillas, fotos, videos, comprimidos, archivos técnicos y JSON. Los formatos desconocidos y el contenido activo (por ejemplo HTML, SVG o programas) se entregan como descarga binaria, sin ejecutarse dentro de NEXO. Se mantienen los límites de 15 MB por archivo y 100 MB por audio/video compatible.

El emisor recibe una notificación y puede abrir el intercambio o consultarlo en **Anuncios → Enviados → Respuestas**, junto a cada destinatario. El destinatario puede seguir respondiendo desde **Leídos**. Los textos se pueden copiar y los adjuntos y audios se pueden descargar. Otros destinatarios de la misma difusión no pueden consultar ese intercambio ni descargar sus archivos.

Los avisos emergentes del chat muestran la misma caja de respuesta desde el inicio, con texto, un archivo o audio, reacciones y **Marcar como leído**. Las reacciones quedan guardadas en el mensaje original y confirman su notificación, incluso si es urgente, deteniendo los recordatorios. Al componer la respuesta se pausa el sonido del aviso. En el chat, las opciones rápidas aparecen al pulsar **Responder** sobre un mensaje.

## Prioridades y recepción

- **Estándar:** con NEXO abierto, aviso visual por 30 segundos y sonido por 8 segundos. Se puede cerrar el aviso; la notificación permanece en la bandeja hasta leerla. Abrir el chat visible marca los avisos estándar como leídos.
- **Urgente:** con NEXO abierto, aviso y timbre repetido hasta **Confirmar lectura**, con vibración donde esté disponible. Abrir el chat o enviar una respuesta no confirma automáticamente los urgentes. Con NEXO cerrado, el servidor vuelve a enviar un recordatorio push aproximadamente cada minuto mientras quede pendiente. Cuando hay varios urgentes para una persona, se recuerda uno por pasada para evitar una ráfaga.
- La confirmación se guarda en el servidor y se sincroniza entre sesiones abiertas. Los recordatorios sobreviven al reinicio del servidor. Un push atrasado se descarta cuando el navegador puede comprobar que ya fue leído.

En Mensajes → **Configurar alertas de este dispositivo**, cada persona puede activar y probar las notificaciones push. Hay que habilitarlas por dispositivo. El micrófono y las notificaciones requieren HTTPS, salvo el desarrollo en localhost. El sonido dentro de la página necesita una interacción previa de la persona.

El navegador y el sistema operativo deciden cómo presentar el push, cuánto dura y si puede sonar o vibrar. Esta aplicación web no puede garantizar una alarma continua con el teléfono bloqueado, vencer el modo silencio/No molestar ni obligar al navegador a ejecutarse en segundo plano. La persistencia solicitada se implementa con notificaciones que requieren interacción y recordatorios desde el servidor; no con temporizadores del service worker.

## Verificación

`npm run check` ejecuta lint, compilación y pruebas. `servidor/tests/comunicacion.test.js` cubre la migración de bases anteriores, alta y permisos de Secretaría, aislamiento institucional, respuestas y adjuntos, validación de prioridad, confirmación, recordatorios y comportamiento del service worker. Las pruebas utilizan bases y archivos temporales.

`servidor/tests/respuestas-anuncios.test.js` verifica respuestas privadas a los avisos, texto y adjuntos, permisos de descarga, notificaciones y validación de envíos.

La migración se aplica al iniciar el servidor; conserva usuarios, contraseñas, sesiones y mensajes existentes. No crea una cuenta de Secretaría con credenciales compartidas: Dirección da de alta a cada persona.
