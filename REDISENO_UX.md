# Rediseño de UX/UI (noviembre 2026)

Mismas funciones y mismos objetivos; cambia cómo se ve y cómo se organiza. La referencia es el promedio de las aplicaciones que la gente ya usa (WhatsApp, Google Classroom, Teams, Slack): claro por defecto, un color de marca, superficies neutras y la navegación donde se espera.

## Navegación

- **Computadora:** menú lateral fijo. Arriba, la escuela (logo y nombre) y un buscador (`Ctrl K`, se recorre con flechas). Si el menú tiene 8 ítems o más, se ordena en categorías fijas: General, Comunicación, Recursos y Gestión (`categorizar` en `navegacionItems.ts`). Las secciones propias de la escuela (genoma) siguen mandando. Abajo, la cuenta: abre un menú con Mi cuenta, Notificaciones, Apariencia y Cerrar sesión.
- **Celular:** barra inferior con las 4 secciones principales del perfil y **Más**, que abre el menú completo como una hoja desde abajo (`pestanasInferiores`). Arriba, el título, la búsqueda, la campana y la foto de la cuenta.
- **Barra superior (`TopBar`):** el título de la pantalla, el buscador y la campana. Las pestañas del módulo van subrayadas en una segunda fila.
- Antes se encendían dos ítems del menú a la vez (por ejemplo, Mi aprendizaje y Métodos de estudio). Ahora se enciende uno solo.

## Sistema visual

- **Modos:** Claro (por defecto), Oscuro y Automático. Se eligen por dispositivo, desde el menú de la cuenta o desde Configuración (`servicios/tema.ts`, `servicios/useModo.ts`). `index.html` fija el modo antes de dibujar, así la página no parpadea.
- **Paleta de la escuela:** el acento y sus acompañantes se adaptan a cada modo con contraste WCAG. El fondo y la superficie del genoma se aplican en modo oscuro. La paleta de fábrica es índigo (`TEMA_BASE`, igual en `servidor/genoma.js`). Las escuelas que tenían guardada la paleta violeta anterior pasan a la nueva.
- **Tokens:** `index.css` define `--nexo-*` para los dos modos. Tailwind los usa por nombre: `bg-surface-container-low`, `text-on-surface`, `text-primary`, `bg-acento`, `border-linea`, etc.
- **Clases heredadas del diseño oscuro:** `estilos/paleta-modos.css` (lo genera `scripts/generar-paleta-modos.mjs`) espeja la paleta de Tailwind en modo claro. En las clases, `white` es la **tinta** del tema (casi negra en claro, blanca en oscuro). El blanco de verdad se escribe `blanco`: `bg-blanco` o `text-blanco`.
- **Componentes base:** `nx-btn` (`-primario`, `-secundario`, `-fantasma`, `-peligro`, `-chico`), `nx-campo`, `nx-tarjeta`, `nexo-icon-button`. Hay una sola tipografía (Inter), los radios son de 8 a 14 px y no hay brillos "neón".
- **Estudio del Maestro:** es un espacio de creación y queda siempre oscuro (`.maestro` usa los tokens oscuros).

## Anuncios, con la forma de WhatsApp

- **Antes:** cuatro pestañas (Nuevo aviso, Leídos, Enviados, Grupos) y un formulario en pasos.
- **Ahora:** una lista de chats y una conversación.
  - Chats: uno por grupo de difusión, uno por persona y uno por cada lista armada a mano (`components/anuncios/chats.ts`).
  - Tildes: ✓ entregado, ✓✓ leído por alguien, ✓✓ azul leído por todos, y "2/5" en los grupos.
  - Menú de cada mensaje: info de lectura, responder en privado, reaccionar, copiar y eliminar para todos.
  - Lápiz → **Nuevo aviso**: un grupo, una persona o varias personas.
  - Menú ⋮ → **Grupos de difusión** (dirección) y **Alertas de este dispositivo**.
  - Panel derecho: info del grupo (quién envía y quién recibe, editar), info del aviso (quién lo leyó y a qué hora) y las respuestas privadas.
  - Un solo campo para escribir, con clip y micrófono (mantener apretado). Para enviar: `Ctrl + Enter`.
- **Sin cambios:** la capa obligatoria de avisos sin leer funciona igual y ahora se ve más sobria. Los enlaces `/anuncios?respuesta=…&destinatarioId=…` abren directamente la conversación privada.
- **Mensajes:** usa el mismo lenguaje visual. La búsqueda en el historial se abre con la lupa de la conversación. Urgente es un botón dentro del campo. `Enter` envía y `Shift + Enter` hace un salto de línea.
- **Celular:** una conversación abierta ocupa toda la pantalla y esconde las barras (`servicios/inmersivo.ts`).

## Herramientas

- `scripts/capturas-ui.mjs [carpeta] [--tema=oscuro] [--movil] [--pendientes] [--solo=/ruta]`: saca capturas por rol sobre una base temporal (necesita `NEXO/dist` y Playwright en `NEXO_PLAYWRIGHT`).
- `scripts/migrar-css-tema.mjs` y `scripts/migrar-clases-tema.mjs`: hicieron la migración única de colores fijos a tokens. Sirven de referencia para código nuevo que llegue con colores fijos.
- **Verificación hecha:** `tsc`, ESLint, `vite build`, los tests del servidor, `auditar-pantallas-ui` (110 pantallas por rol, sin fallos) y todos los `verificar-*-ui`. `verificar-comunicacion-ui` se actualizó: ahora abre la búsqueda de la conversación con la lupa.

## Segunda ronda (noviembre 2026)

- **Menú lateral:** se cierra del todo (botón en su cabecera o `Ctrl + \`) y se vuelve a abrir con el botón de arriba a la izquierda. Para cambiarle el ancho, se arrastra la línea divisoria (entre 200 y 420 px; doble clic vuelve al ancho de siempre). Si se arrastra casi hasta el borde, se cierra. Todo se recuerda en el dispositivo (`servicios/menuLateral.ts`).
- **Sin brillos:** se quitaron las manchas de luz, las sombras de color, los halos y los fondos con luz del login y del Estudio del Maestro (`scripts/quitar-brillos.mjs`). Quedan solo las sombras neutras y los anillos de foco.
- **Íconos:** los nombres eran válidos (`scripts/auditar-iconos.mjs`). El problema era la fuente: se descargaba de Google con `display=swap` y, mientras no llegaba (o sin internet), cada ícono se veía como una palabra cortada. Ahora las fuentes viajan con NEXO (`public/fuentes`, `font-display: block`).
- **Textos cortados:** `scripts/auditar-cortes-ui.mjs` recorre cada pantalla de cada rol en 1440, 1024 y 390 px. Los títulos ya no se cortan con "…", los textos bajan hasta 3 renglones y en tablet la barra superior le deja lugar al título.
- **Fotos de perfil:** sin contorno de color. Cada persona sube o quita su foto desde Configuración → Mis datos. Se recorta cuadrada en el navegador y el servidor solo acepta JPG, PNG o WebP verificados por contenido (`PUT/DELETE /api/cuenta/avatar`, `GET /api/avatares/:id`).
- **Comunidad:** no se puede seguir a personas (ni en la interfaz ni en el servidor: `410`). Se quitó el enlace suelto "Explorar canales y foros" (los canales están en Mensajes) y se sumó "Nuevo debate" en el Feed.
- **Proyectos compartidos:** salió de la interfaz (menús, ruta, pantallas y recuadros "vinculados"). El servidor lo conserva.
- **Ingreso:** estudiantes, docentes y preceptores sin curso asignado no pueden iniciar sesión. Ven un mensaje claro (`servidor/sesiones.js`).
- **Permisos después de Modo edición:** el navegador ya no recuerda los "no tenés permiso", y olvida lo recordado cada vez que cambia la configuración de la escuela. Desocultar un módulo funciona al instante.
- **Cursos:** cada curso tiene cupo mínimo, cupo máximo y aula (columnas aditivas). La lista es una tabla con indicadores que también filtran (excedidos, debajo del mínimo, sin preceptor) y con filtros por año y turno. Tocar un curso abre un solo detalle. El panel de la dirección muestra el cupo de los cursos.
- **Documentos y formularios:** tienen un inicio con "Documento en blanco", "Formulario en blanco" y "Desde una plantilla", más la lista con buscador y filtros. El editor es una hoja con bloques que tienen nombre e ícono (se suben, bajan y quitan). Arriba están el título, el estado y Guardar; al costado, los paneles Compartir, Historial, Comentarios, Respuestas y Evaluación.
- **Tarjetas y botones:** radios moderados, botones rectangulares en lugar de píldoras y sin "rebotes" al tocar (`scripts/migrar-tarjetas.mjs`).

## Tercera ronda: colores desde el logo (noviembre 2026)

- **Qué hace:** se suelta (o se elige, o se pega con `Ctrl + V`) el logo de la escuela y NEXO arma la paleta de toda la app con sus colores. Antes de aplicarla se ven los colores encontrados, la paleta propuesta y un NEXO en miniatura en modo claro y oscuro.
- **Dónde:**
  - **Maestro, al crear la escuela:** Forja → paso Paleta, arriba de la rueda de colores. Después se puede seguir retocando con la rueda o color por color.
  - **Dirección, con la escuela ya creada:** Modo edición → pestaña **Colores**. Ahí también se ajusta cada color a mano, se vuelve a los colores guardados o a los de NEXO. Como todo el modo edición, va al borrador y se aplica a toda la escuela al guardar (queda en el historial como "Nuevos colores de la escuela").
- **El algoritmo** (`servicios/paletaImagen.ts`, todo en el navegador: la imagen no se sube):
  1. Achica la imagen a unos 100 px, sin suavizado, y descarta lo transparente.
  2. Si el borde es casi todo de un color neutro (blanco, negro, gris, crema), lo toma como fondo y no lo cuenta. Un fondo de color sí cuenta: es parte de la marca.
  3. Agrupa los colores con k-means en el espacio Lab, junta los grupos casi iguales y descarta los colores "mezcla" que dejan los bordes suavizados.
  4. El color principal es el grupo con más presencia y más color, llevado a una luz que sirva para un botón. Secundario y avisos salen de otros tonos del logo; si el logo tiene un solo color, se derivan por armonía.
  5. Fondo y tarjetas del modo oscuro: el mismo tono, muy oscuro. Un logo en blanco y negro recibe una paleta sobria en azul grisáceo.
- **Servidor:** `PUT /api/instancia/edicion` acepta `tema` con los seis colores (`servidor/edicion.js`). La redondez y el movimiento siguen siendo del Maestro. Un color mal escrito o un fondo claro se rechazan con un mensaje claro (antes la normalización los cambiaba en silencio).
- **Error corregido en el modo claro:** cuando el color de una escuela no llegaba al contraste mínimo sobre blanco, NEXO lo aclaraba en lugar de oscurecerlo y terminaba casi blanco (`ajustarContraste` en `servicios/tema.ts`). Con la paleta de fábrica no se notaba.
- **Verificación:** `tsc`, ESLint, `vite build`, los 245 tests del servidor (incluye uno nuevo de colores en `edicion.test.js`), `verificar-roles-ui`, `verificar-flujos-nuevos-ui`, `verificar-estudio-ui` y `verificar-personalizacion-ui`. Se probó con logos PNG, JPG, SVG, con fondo transparente, blanco, crema y de color, y en blanco y negro.

## Cuarta ronda: íconos, carga entre pantallas y zoom (noviembre 2026)

- **Íconos corridos:** la regla base de los íconos fijaba el ancho en "1 ícono" y les ganaba a todas las clases de Tailwind. Un recuadro `h-12 w-12` con el ícono adentro quedaba de 22 px de ancho (el logo de la pantalla de carga se veía como una píldora, la campana del aviso de alertas aparecía cortada) y ningún `text-lg`, `text-4xl` ni `hidden` de un ícono tenía efecto. Ahora el tamaño, el ancho y la forma van en `@layer base` y lo esencial (la fuente, que nunca se desborde) queda fijo. Los íconos usan `box-sizing: content-box`: si un recuadro les pone relleno, va por fuera del dibujo.
- **Carga entre pantallas:**
  - Cada cambio de pantalla esperaba al servidor para confirmar el permiso y, mientras tanto, tapaba todo con el logo. Ahora lo ya permitido se usa al instante (`accesoRecordado`).
  - Después de entrar, en los ratos libres, NEXO trae el código y el permiso de las pantallas del menú de esa persona (no lo hace si el dispositivo pide ahorrar datos).
  - La navegación va en una transición de React: si la pantalla nueva todavía no llegó, la anterior queda a la vista con una barra fina arriba. Si hay que esperar sin pantalla anterior, el menú lateral queda donde estaba y el "Abriendo…" aparece solo si la espera se alarga.
  - El reinicio del cartel de error por ruta ya no desarma la aplicación en cada navegación (`ErrorBoundary` con `ruta`).
- **Cargadores que no se movían:** con "reducir animaciones" del sistema (o de NEXO) se apagaban todas las animaciones, también las de carga. Ahora los indicadores de carga (`nx-barra-carga`, `nx-progreso-ruta`, `nx-giro`, `animate-spin`) siguen moviéndose, como en Windows o Android.
- **Zoom:** con el navegador al 110 %–200 %, la pantalla mide menos píxeles y algunos textos quedaban en columnas de pocas letras.
  - El árbol del Modo edición ya no aplasta el nombre del módulo: el estado ("Oculto para toda la escuela") va en el renglón de abajo y los botones bajan si no entran.
  - Las columnas del Modo edición y de la pestaña Colores se arman según el espacio real (container queries `@container`), no según el ancho de la ventana.
  - El nombre largo de la escuela en el menú lateral ya no se corta.
  - `scripts/auditar-zoom-ui.mjs` recorre cada pantalla de cada rol en 1280, 1093, 960, 820 y 683 px y lista textos aplastados, textos que se pisan y páginas que se corren de costado.
- **Modo edición:** sin el borde animado en degradé; las pestañas bajan de renglón en lugar de cortarse.
- **Textos:** los títulos con Mayúsculas Al Estilo Inglés pasan a cómo se escribe en español ("Tareas asignadas", "Próximas clases", "Mis cursos").
- **Aviso "Activá las alertas":** aparece solo en la pantalla de inicio de cada persona. Antes flotaba en todas las pantallas y tapaba contenido.
- **Más arreglos de zoom:** el buscador de la barra superior ya no se parte en dos renglones (si no entra, se corta con "…" y el atajo `Ctrl K` se esconde) y el título del mes del Calendario tiene un ancho mínimo.
- **Brillos que quedaban:** se quitaron siete halos de color escritos directamente en el código del Estudio del Maestro (`textShadow`/`boxShadow` difusos).
- **Asistencia académica:** las opciones de la consulta (dónde ejecutar la IA, fuentes) van alineadas con el cuadro para escribir y usan los campos de NEXO.
- **Resultado de la auditoría de zoom:** de 369 hallazgos a 6, y los 6 son falsos positivos (contenido oculto dentro de una lista con scroll y dos frases del mismo párrafo). No hay textos aplastados ni pantallas que se corran de costado.
- **Verificación:** `tsc`, ESLint, `vite build`, 245 tests del servidor, `auditar-pantallas-ui` (103 pantallas, sin fallos) y todos los `verificar-*-ui`.
