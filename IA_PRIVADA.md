# Asistencia IA privada de NEXO

La asistencia existente utiliza Ollama en el servidor de NEXO. Por defecto se conecta a `http://127.0.0.1:11434`; ningún proveedor público es destino alternativo. El historial sigue en `ia_mensajes`. La columna histórica `config_ia.proveedor` ya no controla el transporte.

## Configuración

1. Instalar y ejecutar Ollama en el **mismo servidor** de NEXO; instalar el modelo `llama3.2`, o definir `NEXO_IA_MODELO` con otro nombre instalado.
2. Para una instancia institucional privada distinta, configurar `NEXO_IA_URL` con su origen, por ejemplo `http://10.0.0.8:11434`. Solo se aceptan IP privadas literales o localhost. El servicio debe exponer la API de Ollama (`/api/chat` y `/api/tags`). No se aceptan redirecciones ni dominios públicos.
3. Si se usa otra máquina, limitar el puerto de Ollama a la red institucional y, preferentemente, usar TLS mediante un proxy privado. NEXO no envía credenciales de proveedores externos.

La pantalla lista los modelos que informa el servidor privado y permite seleccionar hasta ocho fuentes visibles para el estudiante: tareas de sus cursos y recursos aprobados de biblioteca. El servidor comprueba cada fuente nuevamente al enviar la consulta. La respuesta incluye sus referencias; el modelo recibe solo el texto acotado de las fuentes elegidas.

La consulta puede cancelarse. Una respuesta cancelada no se agrega al historial. El tutor no tiene herramientas para modificar notas, tareas u otros registros.

## Modo «Este dispositivo»

La pantalla permite seleccionar un Ollama instalado en **la computadora desde la que se abre NEXO**. El navegador llama directamente a `http://127.0.0.1:11434/api/tags` y `/api/chat`; el servidor de NEXO no recibe la pregunta ni la respuesta. El historial de este modo vive sólo en memoria de la pestaña y se borra al cambiar de modo, cerrar la pestaña o usar «Borrar conversación». Las fuentes seleccionadas se consultan en NEXO con los permisos actuales y luego se envían únicamente al Ollama local. No hay retorno automático al modo institucional si Ollama falla.

Para habilitarlo en cada equipo: instalar Ollama y un modelo local; configurar `OLLAMA_ORIGINS` con el origen exacto desde el que se sirve NEXO (por ejemplo `https://nexo.escuela.edu`) para permitir la petición CORS del navegador; desactivar las funciones cloud de Ollama con `OLLAMA_NO_CLOUD=1`; y reiniciar Ollama. NEXO sólo muestra modelos cuyo nombre no indica `cloud`, pero la configuración local de Ollama sigue siendo responsabilidad del equipo. En Chrome, un NEXO servido desde otra dirección debe usar HTTPS y el navegador puede pedir permiso de acceso a loopback al elegir el modo; si el usuario lo rechaza o una política de red lo impide, la pantalla muestra el fallo. No se detectó `ollama` en el PATH de este host, por lo que aún no hay una prueba de generación real en dispositivo.

La API de contexto local comprueba el acceso del usuario y limita las fuentes a ocho. El modo dispositivo no descarga modelos desde NEXO ni modifica notas, tareas u otros registros. La selección de modelos se lee desde el Ollama local y no desde el servidor institucional. [Configuración oficial de orígenes y modo sin cloud](https://docs.ollama.com/faq); [API de chat](https://docs.ollama.com/api/chat); [lista de modelos](https://docs.ollama.com/api/tags); [permisos de acceso local de Chrome](https://developer.chrome.com/docs/modern-web-guidance/guides/security/local-network-access).

## Alcance actual

El modo `local-servidor` ejecuta el modelo en el servidor donde corre NEXO; el modo `institucional` usa una IP privada configurada explícitamente; «Este dispositivo» usa un Ollama instalado por el usuario en su equipo. Aún no hay inferencia empaquetada dentro del navegador ni distribución/descarga de modelos desde la interfaz. Las listas de modelos son de solo lectura.
