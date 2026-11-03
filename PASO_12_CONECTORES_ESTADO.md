# Paso 12 — conexiones externas: estado comprobable

NEXO conserva sus archivos, documentos, formularios, calendario, tareas, chat y aula propios. Las cuentas externas son optativas y se gestionan en **Configuración → Conexiones externas**. Este módulo no participa del procesamiento de IA privada.

## Implementado en este paso

- Cuentas separadas por usuario e institución; secretos cifrados con AES-256-GCM mediante `NEXO_CONECTORES_KEY`. Los tokens no salen en las respuestas de la API.
- OAuth de Google por servicio, con `state` de un solo uso, caducidad, ámbitos mínimos solicitados por separado y renovación mediante refresh token. Requiere `NEXO_GOOGLE_CLIENT_ID`, `NEXO_GOOGLE_CLIENT_SECRET` y `NEXO_GOOGLE_REDIRECT_URI` registrados en Google Cloud.
- Token de integración interna de Notion y token personal de Todoist. Sus claves se ingresan desde la cuenta del usuario; no hay claves en el código.
- Lectura paginada o por ID de las APIs indicadas abajo. NEXO guarda una bandeja de referencias externas separada por cuenta, servicio e ID; una huella detecta cambios y evita duplicados. Hay reintentos acotados ante 429 y errores 5xx.
- Importación manual e idempotente de eventos de Calendar y Meet, tareas de Todoist y Classroom, enlaces de Drive a la biblioteca y documentos/formularios compatibles de Docs, Forms y Notion. La creación y la correspondencia de IDs se confirman en una transacción local. Los convertidores rechazan estructuras que NEXO no pueda representar sin pérdida. Si cambia el original después, la bandeja informa el cambio; **aún no se sobrescribe automáticamente** el objeto nativo.
- Exportación manual de eventos propios a Calendar y tareas personales de estudiantes a Todoist. La correspondencia de IDs y las huellas permiten repetir la acción sin duplicar y rechazar una actualización si el destino cambió. La pantalla muestra los elementos propios exportables y permite reconciliarlos. No hay exportación automática ni prueba contra cuentas externas reales.

## Matriz real por servicio

| Servicio | Lectura implementada | Importación nativa | Exportación y cambios bidireccionales | Estado de prueba externa |
|---|---|---|---|---|
| Drive | Archivos y metadatos, paginados | Enlace HTTPS como recurso institucional en revisión; bytes y permisos no se copian | Pendiente | Sin credenciales de usuario |
| Docs | Documento por ID | Bloques de texto, títulos y listas compatibles; rechaza otros elementos | Pendiente | Sin credenciales de usuario |
| Forms | Formulario por ID | Preguntas de texto, fecha y selección compatibles; rechaza otros elementos | Pendiente | Sin credenciales de usuario |
| Gmail | Lista paginada y lectura de texto plano de mensajes sincronizados | No crea correo nativo; conserva sólo referencia externa | Pendiente; tampoco envía mensajes | Sin credenciales de usuario |
| Calendar | Eventos del calendario principal, paginados | Sí, evento personal individual | Evento propio a calendario principal; reenvío sin duplicar y conflicto si cambió el destino. Recurrencia no exportada | Sin credenciales de usuario |
| Meet | Espacio de reunión por ID o código | Evento con fecha indicada por el usuario; no transmite la reunión dentro de NEXO | Pendiente | Sin credenciales de usuario |
| Classroom | Cursos y trabajos visibles, paginados | Trabajos de tipo tarea a una cátedra propia del docente; no copia entregas | Pendiente | Sin credenciales de usuario |
| Notion | Páginas y bases visibles mediante búsqueda, paginadas | Páginas con párrafos, títulos y listas simples; rechaza bloques anidados y tipos no representados | Pendiente | Sin token de usuario |
| Todoist | Tareas activas, paginadas | Sí, tarea personal individual para estudiantes | Tarea personal propia; comando con ID estable y comprobación de cambio remoto | Sin token de usuario |
| WhatsApp | No: Cloud API no ofrece una lectura histórica personal equivalente | No | Webhooks y envío Business pendientes | Falta cuenta Business, token y configuración de webhooks |

**Alcance de “sincronizar” hoy:** consulta una página de la fuente y actualiza su **bandeja de referencias**. Los indicadores `nuevos` y `cambios` se refieren a esa bandeja. La interfaz permite continuar con el cursor cuando la API devuelve otra página. En Docs, Forms y Meet hay que indicar el ID; Classroom lista primero cursos y luego trabajos de un curso. La importación y la exportación requieren acciones separadas. No hay tareas en segundo plano, webhooks, eliminación propagada, conciliación general bidireccional ni importación masiva; tampoco pruebas con cuentas externas reales.

La lectura de Gmail busca el mensaje por su ID en la cuenta conectada y muestra sólo su parte de texto plano en la pestaña. No se guarda el cuerpo en NEXO; los mensajes exclusivamente HTML se resumen con el fragmento que devuelve Gmail. No hay envío, adjuntos ni sincronización de hilos completos.

**Limitación de cuentas:** una conexión por proveedor y usuario. La ampliación a varias cuentas Google/Notion/Todoist de una persona requiere identidad de cuenta externa verificada, selector y migración de la clave única. Una cuenta Google puede acumular permisos de varios servicios, pero cada ámbito se autoriza por separado.

**Configuración necesaria antes de probar en vivo:** clave de cifrado estable de 32 bytes en base64; cliente OAuth Google Web y URI de retorno exacta `https://<dominio>/api/conectores/google/callback`; activación de las APIs y pantalla de consentimiento con los ámbitos pedidos; tokens de Notion/Todoist de cuentas reales. Google puede requerir verificación adicional según el ámbito solicitado. Ninguna de estas credenciales estaba disponible en el entorno de desarrollo; por eso las pruebas automáticas verifican aislamiento, cifrado, catálogo y ausencia de conexiones, pero **no demuestran una conexión con esos servicios**.

## Referencias oficiales de API

- [Google OAuth para servidor web](https://developers.google.com/identity/protocols/oauth2/web-server), [Drive files.list](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list), [Docs documents.get](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/get), [Forms API](https://developers.google.com/workspace/forms/api/reference/rest/v1/forms), [Gmail messages.list](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list), [Calendar events.list](https://developers.google.com/workspace/calendar/api/v3/reference/events/list), [Meet spaces.get](https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces/get), [Classroom courses.list](https://developers.google.com/workspace/classroom/reference/rest/v1/courses/list).
- [Notion API](https://developers.notion.com/reference/intro), [Todoist API v1](https://developer.todoist.com/api/v1/), [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api/).
