# NEXO — Informe Detallado de Errores y Correcciones Pendientes

> **Propósito de este documento.** Este texto está escrito para que **otra inteligencia artificial** lo lea y entienda, con total claridad, cada problema que hoy tiene la aplicación NEXO. El documento tiene **dos orígenes**: por un lado, los problemas que se detectaron **a mano** usando la aplicación, reescritos acá de forma más extensa, ordenada y explicada (qué se ve hoy en pantalla, por qué está mal y qué comportamiento se espera en su lugar); por el otro, los problemas que se encontraron **después, durante una revisión completa del código y del comportamiento de la aplicación**, que se sumaron manteniendo el mismo formato. Cada error de esta segunda tanda lleva la marca ***(detectado en revisión de código)*** junto a su título, para poder distinguirlo de los detectados a mano. El lenguaje es deliberadamente **claro y poco técnico**: se describe lo que el usuario observa y lo que debería ocurrir, más que el detalle interno del código.

---

## 1. Contexto general que la IA lectora necesita entender antes de leer los errores

### 1.1. Qué es NEXO

NEXO es una plataforma educativa pensada para conectar a toda una comunidad escolar dentro de una misma herramienta. Su valor central es **devolver tiempo y calidad a la relación entre docentes y estudiantes**: la tecnología debe volverse casi invisible para que lo pedagógico ocupe el primer plano. Cada decisión de diseño debería preguntarse si acerca al docente y al estudiante en una interacción más significativa, o si solamente agrega otra capa de complejidad tecnológica.

La aplicación está organizada por **perfiles** (tipos de usuario), y cada perfil ve un conjunto distinto de secciones según lo que le corresponde hacer. Los perfiles son:

- **Administrador (el equipo que desarrolla y opera la plataforma, "nosotros").** Solo administra la creación de instituciones y la salud técnica del sistema. **No** debe ver datos internos de cada escuela (ni alumnos, ni materias, ni profesores, ni comunidad).
- **Administración Institucional / Académica (dirección de cada colegio).** Gestiona perfiles, cursos, materias, calendario institucional, biblioteca, reportes y modera la comunidad.
- **Centro de Estudiantes.** Tiene un portal propio de representación estudiantil, con debates, artículos, calendario propio y lectura de quejas anónimas.
- **Bibliotecario/a.** Gestiona la biblioteca digital (institucional y nacional) y una cola de revisión de recursos que los usuarios presentan.
- **Preceptor/a.** Está a cargo de uno o varios cursos, con su comunidad de curso, comunicación con familias y calendario acotado a sus cursos.
- **Profesor/a.** Da una o varias materias en uno o varios cursos: crea tareas, corrige, da clases (aula virtual), lleva su portafolio y planificación.
- **Estudiante.** Cumple tareas, gestiona sus objetivos personales, participa en la comunidad, usa la biblioteca, el chat y la asistencia de IA.
- **Familia.** Recibe comunicados, ve el calendario que le corresponde a su hijo/a y se comunica por chat.
- **Inteligencia Artificial.** Es un servicio transversal (tutor, generador de ejercicios, asistente de planificación, etc.), no un perfil visual.

### 1.2. La arquitectura pensada (para que la IA sepa cómo *debería* ser)

La plataforma se pensó en **tres capas o "tiers"**:

- **Tier 1 — Gestión Institucional:** módulos que configuran la estructura base (instituciones, perfiles, cursos, materias, políticas). Se usan poco pero afectan a todo lo demás.
- **Tier 2 — Módulos Operacionales:** el día a día educativo (portafolio de tareas, calificaciones, comunidad, biblioteca, aula virtual, objetivos, chat, etc.).
- **Tier 3 — Infraestructura/Servicios:** servicios invisibles que los otros módulos usan (gestión de archivos, notificaciones, IA, permisos, papelera de reciclaje, etc.).

También se definió una jerarquía conceptual: **Aplicación → Módulo → Vista → Componente → Funcionalidad → Acción**, más una **capa transversal de Servicios**. Es importante que la IA lectora tenga presente esta jerarquía, porque muchos errores consisten justamente en que **la parte visual (la Vista y los Componentes) existe, pero la parte de lógica (la Funcionalidad, la Acción y el Servicio) no existe o es falsa**.

### 1.3. El estado real de la aplicación hoy (diagnóstico transversal más importante)

Este es el punto que explica la mayoría de los errores y **debe leerse antes que cualquier otro**:

**NEXO hoy es, en la práctica, una maqueta visual muy elaborada, pero casi sin lógica real por detrás.** Concretamente:

1. **Los datos que se ven son inventados y fijos.** Cada pantalla trae adentro una lista de ejemplos escrita a mano (alumnos, tareas, debates, recursos, comunicados, métricas). No provienen de una base de datos ni de lo que hace realmente el usuario. Por eso los números "no cuadran", se repiten entre perfiles o "salen de cualquier lado".

2. **Muchísimos botones no hacen nada.** Una enorme cantidad de botones, al presionarlos, solo dejan una anotación interna invisible o directamente no reaccionan. Para el usuario, el botón "no funciona". Esto aplica a "ver detalle", "descargar", "presentar recurso", "filtrar", "gestionar debates", "asignar curso", "moderar", los menús de tres puntos, etc.

3. **No hay guardado ni persistencia.** Lo poco que sí cambia en pantalla (por ejemplo marcar un hábito, votar) se pierde apenas se cambia de sección o se recarga, porque solo vive en la memoria momentánea de esa pantalla.

4. **No hay comunicación entre perfiles.** Lo que un perfil escribe no le llega a otro. Un artículo del Centro de Estudiantes no aparece en la comunidad de los demás; una queja no le llega a quien debe leerla; un comunicado no dispara un aviso a la familia.

5. **No hay Inteligencia Artificial real.** Donde se promete IA (asistencia, alertas, métodos de estudio), hoy hay respuestas fijas y simuladas.

6. **No hay videollamada ni transmisión real.** El "aula virtual" y la "clase en vivo" son solo una representación visual: no transmiten audio, video ni pizarra compartida de verdad.

7. **Hay muchísima duplicación de piezas.** Cada pantalla trae su propia versión de la tarjeta de debate, de la tarjeta de tendencia, del menú de tres puntos, del calendario, etc. No se comparten desde un lugar común, por lo que se comportan distinto y arreglar algo en un lado no lo arregla en el resto.

Con este marco, cada error de abajo se entiende mejor: en la mayoría de los casos **no es que "esté roto por accidente", sino que la lógica nunca se construyó** y solo existe la apariencia.

### 1.4. Principio rector para toda la reforma: reutilización y una única fuente de verdad

Antes de listar los errores por perfil, hay una instrucción transversal que atraviesa toda la aplicación y que **debe guiar la reescritura completa**:

**Hay que dejar de repetir piezas y pasar a un esquema de componentes compartidos (estilo "monorepo").** Ninguna vista debería tener "su propio" debate, "su propia" tendencia, "su propio" menú de tres puntos ni "su propia" tarjeta de publicación. Todas esas piezas tienen que vivir en una **carpeta común y reutilizable**, y cada pantalla debe tomarlas de ahí. Beneficios esperados: comportamiento idéntico en todos lados, un solo lugar donde corregir cada cosa, y coherencia visual y funcional. Este principio aplica especialmente a: la tarjeta de publicación del feed, la tarjeta de debate, las tarjetas de tendencia, el menú contextual de tres puntos (con acciones que cambian según el perfil), el calendario y las tarjetas de recurso de biblioteca.

### 1.5. Cómo leer cada ficha de error

Para que la IA lectora trabaje cómoda, cada error se presenta con esta estructura:

- **Qué se observa hoy:** el comportamiento actual, tal como lo vive el usuario.
- **Qué se espera en su lugar:** el comportamiento correcto según la visión del producto.
- **Dónde ocurre:** la pantalla o pieza aproximada donde vive el problema, para orientar la búsqueda.

---

## 2. Perfil ESTUDIANTE

El estudiante entra a la aplicación y cae directamente en la **Comunidad**. Desde su menú lateral tiene acceso a: Comunidad, Portafolio, Objetivos, Biblioteca, Chat y Asistencia IA.

### 2.A. Errores generales del perfil Estudiante

**Error 2.A.1 — No existe un botón de configuración.**
- **Qué se observa hoy:** El estudiante no tiene ningún lugar donde entrar a configurar su cuenta o sus preferencias. No hay un botón de "Configuración" accesible.
- **Qué se espera en su lugar:** Debe existir un acceso claro y permanente a la configuración del perfil (ajustes de la cuenta, preferencias, etc.), disponible de forma consistente en toda la aplicación.
- **Dónde ocurre:** En la estructura general del perfil (menú lateral / barra superior).

**Error 2.A.2 — El tono visual y de estilo no es coherente entre pantallas.**
- **Qué se observa hoy:** A medida que el estudiante navega entre secciones, el "tono" de la aplicación cambia: algunas pantallas se ven y se comportan de una manera y otras de otra. La experiencia se siente como si fueran aplicaciones distintas pegadas entre sí, y no como un producto único.
- **Qué se espera en su lugar:** El tono de la aplicación (estilo visual, disposición, encabezados, comportamiento de la navegación interna) debe ser **congruente todo el tiempo**, sin importar en qué sección esté el usuario. Esto está muy ligado al principio de reutilización de la sección 1.4: si todas las pantallas se arman con las mismas piezas comunes, el tono se vuelve coherente naturalmente.
- **Dónde ocurre:** Transversal a todo el perfil (y a toda la aplicación).

### 2.B. Módulo Comunidad (Estudiante)

La Comunidad tiene tres pestañas internas: **Feed**, **Debates** y **Tendencias**.

**Error 2.B.1 — La publicación usa "me gusta" (corazón) en lugar de votos.**
- **Qué se observa hoy:** Cada publicación del feed muestra un corazón de "me gusta" con un número, más un ícono de comentarios y otro de compartir. El modelo de interacción es el de una red social clásica de "likes".
- **Qué se espera en su lugar:** No debe existir "me gusta". La interacción con cada publicación tiene que ser **voto positivo** y **voto negativo** (a favor / en contra). El sistema de votos es central para el producto, porque de ahí se calculan las tendencias (ver Error 2.B.9). El voto debe ser privado y único por usuario y publicación.
- **Dónde ocurre:** Tarjeta de publicación del Feed de Comunidad.

**Error 2.B.2 — No se puede comentar una publicación.**
- **Qué se observa hoy:** Hay un ícono de comentarios con un número al lado, pero al presionarlo no ocurre nada real: no se abre ningún espacio para escribir ni leer comentarios.
- **Qué se espera en su lugar:** El estudiante debe poder **comentar** las publicaciones, y esos comentarios deben guardarse y mostrarse.
- **Dónde ocurre:** Tarjeta de publicación del Feed de Comunidad.

**Error 2.B.3 — Falta la vista de comentarios de cada publicación.**
- **Qué se observa hoy:** No existe una pantalla o panel donde se vean los comentarios de una publicación puntual. El número de comentarios que se muestra es solo decorativo.
- **Qué se espera en su lugar:** Cada publicación debe poder abrirse en detalle para **ver todos sus comentarios** y participar en la conversación.
- **Dónde ocurre:** Falta una vista de detalle de publicación en Comunidad.

**Error 2.B.4 — Publicar es incompleto: no hay verdadera carga de emojis ni de fotos.**
- **Qué se observa hoy:** El recuadro para escribir una publicación muestra íconos de imagen y de emoji, pero son adornos: no abren un selector de emojis ni permiten realmente adjuntar y previsualizar una foto. Publicar, en la práctica, no arma un contenido rico.
- **Qué se espera en su lugar:** El estudiante debe poder **publicar de verdad**, incluyendo la posibilidad de insertar **emojis** y **fotos** (con su selector correspondiente y su previsualización). La publicación resultante debe guardarse y aparecer en el feed.
- **Dónde ocurre:** Formulario de nueva publicación en Comunidad (pestaña Feed).

**Error 2.B.5 — Faltan los tres puntitos (menú de acciones) en cada tarjeta del Feed.**
- **Qué se observa hoy:** Las tarjetas de publicación del feed no tienen un menú de tres puntos con acciones. No se puede denunciar, ni ejecutar ninguna acción contextual sobre una publicación.
- **Qué se espera en su lugar:** Cada tarjeta del feed debe incluir un **menú de tres puntos**, con acciones que dependen del perfil (ver el patrón general en el Error 2.B.8). Para el estudiante, la acción típica es **denunciar** la publicación, no borrarla.
- **Dónde ocurre:** Tarjeta de publicación del Feed de Comunidad.

**Error 2.B.6 — El botón "Participar" en los debates no tiene una lógica real y no habilita el voto determinante.**
- **Qué se observa hoy:** En la pestaña Debates, cada debate muestra dos barras ("A favor" / "En contra") que ya se pueden tocar directamente, y además un botón "Participar" que al presionarlo no produce ningún efecto visible. La acción de "participar" no cambia nada.
- **Qué se espera en su lugar:** El voto del estudiante en un debate debe ser un **voto determinante que se habilita recién cuando el estudiante decide participar**. Es decir: mientras no toque "Participar", el estudiante no tiene su postura activada; al participar, se abre la posibilidad de fijar su posición **a favor o en contra**. "Participar" debe tener un significado concreto: entrar formalmente al debate y recién ahí poder emitir su voto/postura.
- **Dónde ocurre:** Tarjeta de debate (pestaña Debates de Comunidad).

**Error 2.B.7 — No hay vista de comentarios en los debates.**
- **Qué se observa hoy:** Los debates muestran una cantidad de comentarios, pero no existe una pantalla donde leerlos ni sumarse a la discusión.
- **Qué se espera en su lugar:** Cada debate debe poder abrirse para **ver y escribir comentarios**, con el hilo de la discusión completo.
- **Dónde ocurre:** Falta una vista de detalle de debate.

**Error 2.B.8 — El menú de tres puntos de cada debate no ejecuta ninguna acción, y esa acción debe depender del perfil.**
- **Qué se observa hoy:** Cada debate tiene un ícono de tres puntos, pero al presionarlo no se abre ningún menú ni se puede hacer nada.
- **Qué se espera en su lugar:** El menú de tres puntos debe funcionar y ofrecer **acciones que varían según el perfil que lo abre**. Concretamente:
  - **Estudiante y Profesor:** pueden **denunciar** el debate, pero **no** borrarlo.
  - **Preceptor y Dirección (Administración Académica):** pueden **borrar** el debate.
  Este mismo patrón de "acciones según perfil" debe aplicarse de forma consistente a los menús de tres puntos de toda la aplicación (ver principio de reutilización, sección 1.4).
- **Dónde ocurre:** Tarjeta de debate (y, por extensión, todos los menús de tres puntos).

**Error 2.B.9 — La lógica de Tendencias no existe; la interfaz está bien, falta construir la lógica por debajo.**
- **Qué se observa hoy:** La pestaña Tendencias muestra tarjetas con contenidos fijos e inventados (un "debate destacado", un "artículo técnico", una "publicación de comunidad", un "debate activo"). Esos contenidos no surgen de ninguna medición real: son ejemplos escritos a mano.
- **Qué se espera en su lugar:** La distribución visual de Tendencias **está bien y se conserva**, pero hay que construir la **lógica real** por detrás: en Tendencias deben aparecer **los debates y las publicaciones que tienen actualmente más votos positivos**. La tendencia debe calcularse a partir de la actividad real (votos positivos menos negativos, cantidad de menciones, actividad reciente). Es una "sub-lógica" que se apoya en el mismo sistema de votos del feed y los debates.
- **Dónde ocurre:** Pestaña Tendencias de Comunidad.

**Error 2.B.10 — Los nombres del filtro de alcance están equivocados.**
- **Qué se observa hoy:** En Tendencias hay un selector con dos opciones llamadas **"Global"** y **"Mi Red"**.
- **Qué se espera en su lugar:** Esas dos opciones deben renombrarse por lo que realmente significan en un entorno escolar: **"Todas las escuelas"** (en lugar de "Global") y **"Mi escuela"** (en lugar de "Mi Red"). El cambio no es solo de texto: aclara que el alcance es entre instituciones.
- **Dónde ocurre:** Selector de alcance en la pestaña Tendencias.

**Error 2.B.11 — Las tendencias no son pulsables ni expandibles; hoy no funciona nada.**
- **Qué se observa hoy:** Las tarjetas de tendencia se ven, pero no se puede entrar a ninguna: no se abren, no se expanden, no llevan a ningún lado.
- **Qué se espera en su lugar:** Cada tendencia debe ser **pulsable y expandible**: al tocarla, debe abrirse su contenido (el debate o la publicación que está en tendencia), con su detalle completo.
- **Dónde ocurre:** Tarjetas de la pestaña Tendencias.

**Error 2.B.12 — "Participar" dentro de Tendencias tampoco tiene sentido hoy.**
- **Qué se observa hoy:** Dentro de Tendencias hay acciones de "participar" (por ejemplo en el "debate activo") que no producen ningún resultado real.
- **Qué se espera en su lugar:** Igual que en los debates (Error 2.B.6), "participar" debe tener una lógica concreta y coherente: entrar a la discusión y poder aportar. Hoy no hay ninguna lógica detrás.
- **Dónde ocurre:** Pestaña Tendencias.

**Error 2.B.13 — "Configurar mi Feed / mi firma" no tiene sentido y lleva a una sección equivocada.**
- **Qué se observa hoy:** En Tendencias, el botón para configurar el feed (etiquetado como "Configurar mi Feed") lleva al estudiante a la sección de **Objetivos**, que no tiene nada que ver.
- **Qué se espera en su lugar:** Ese botón debe permitir al estudiante **configurar los intereses de su feed**, al estilo de una red social como Twitter/X (elegir qué temas o tipos de contenido le interesan para personalizar sus tendencias). No debe redirigir a Objetivos; debe abrir una configuración real de intereses del feed.
- **Dónde ocurre:** Pie de la pestaña Tendencias.

**Error 2.B.14 — Dentro de Debates no se puede volver al Feed ni ir a Tendencias.**
- **Qué se observa hoy:** Cuando el estudiante entra a la sección de Debates, las pestañas superiores (Feed / Debates / Tendencias) dejan de llevarlo de vuelta: quedan como adornos que no navegan realmente, así que el usuario queda "atrapado" en Debates y no puede volver al Feed ni pasar a Tendencias desde ahí.
- **Qué se espera en su lugar:** Las tres pestañas (Feed, Debates, Tendencias) deben funcionar como una navegación real y consistente **desde cualquiera de las tres**, de modo que siempre se pueda ir y volver entre ellas. Este problema se resuelve naturalmente si las tres pestañas son un único componente de navegación compartido (sección 1.4).
- **Dónde ocurre:** Barra de pestañas del módulo Comunidad, especialmente al estar dentro de Debates.

### 2.C. Módulo Portafolio (Estudiante)

El Portafolio del estudiante debería agrupar sus tareas, sus cursos y sus calificaciones. Hoy convive con una sección de "clase en vivo" / aula virtual.

**Error 2.C.1 — La "clase en vivo" tiene una estructura excelente pero no tiene ninguna lógica real de transmisión.**
- **Qué se observa hoy:** Al entrar a los cursos, aparece una sección de "Clase en Vivo ahora" muy bien pensada: te muestra apenas entrás qué está sucediendo en la clase, un botón de envío mientras escribís, y la trayectoria de la clase (los pasos por los que va avanzando). El problema es que todo eso es solo apariencia: no hay transmisión ni videollamada real por detrás.
- **Qué se espera en su lugar:** Hay que construir la **lógica real de transmisión y videollamada** dentro de la aplicación, en la parte de portafolio. Punto importante de diseño: la videollamada debe apoyarse en una **pizarra digital** que sea **accesible desde el portafolio del docente, no del estudiante** (es decir, el docente maneja la pizarra y la clase; el estudiante la ve y participa). La estructura visual actual se conserva; lo que falta es la maquinaria de transmisión.
- **Dónde ocurre:** Sección "Aula Virtual / Clase en Vivo" dentro de Mis Cursos del estudiante.

**Error 2.C.2 — La navegación entre "Mis Tareas" y "Mis Cursos" es inconsistente y no permite volver.**
- **Qué se observa hoy:** Cuando el estudiante abre el Portafolio, solo aparecen sus tareas. Si toca "Mis Cursos", pasa a otra pantalla que tiene una apariencia y una disposición completamente distintas, y desde ahí **ya no puede volver a "Mis Tareas"**. La interfaz cambia todo el tiempo entre una sub-sección y otra.
- **Qué se espera en su lugar:** El Portafolio debe tener una **navegación interna estable y uniforme** entre sus sub-secciones (Mis Cursos, Mis Tareas, Calificaciones), de modo que siempre se pueda ir y volver entre ellas, y que la interfaz mantenga la misma estructura en todas. Hoy "Mis Cursos" no comparte la barra de navegación interna que sí tiene "Mis Tareas".
- **Dónde ocurre:** Sub-navegación del Portafolio del estudiante (Mis Tareas vs. Mis Cursos).

**Error 2.C.3 — La creación de tareas es demasiado pobre; debe ser tan compleja como plantea la arquitectura.**
- **Qué se observa hoy:** La creación de tareas (tanto las personales del estudiante como el modelo general) es mínima: apenas un título y poco más.
- **Qué se espera en su lugar:** La creación de tareas debe ser **mucho más compleja y completa**, siguiendo la documentación/arquitectura del producto (fecha límite, materia, descripción rica, adjuntos, método de estudio sugerido, tipo de asignación, etc.). Se pide construir la funcionalidad "Mis Tareas" de forma completa, no como un simple recordatorio con título.
- **Dónde ocurre:** Formulario de creación de tarea personal y, en general, el módulo de tareas del estudiante.

**Error 2.C.4 — La entrega de las tareas de los cursos debe ser mucho más rica (subir archivos y más).**
- **Qué se observa hoy:** No existe un flujo real de entrega. No se puede adjuntar un archivo ni completar una entrega con los elementos que una tarea académica necesita.
- **Qué se espera en su lugar:** La entrega de una tarea debe ser **compleja y realista**, como se necesita en secundaria y universidad: debe permitir **subir archivos**, escribir comentarios, y demás elementos propios de una entrega. Debe registrarse la entrega y notificar al docente.
- **Dónde ocurre:** Detalle de tarea / flujo de entrega del estudiante.

**Error 2.C.5 — "Ver detalle" de una tarea no funciona.**
- **Qué se observa hoy:** El botón/acción "Ver detalle" de una tarea no abre nada. No hay pantalla de detalle de tarea.
- **Qué se espera en su lugar:** Debe existir una **vista de detalle de tarea** completa (consigna, adjuntos del profesor, método de estudio, sección de entrega, reflexión, etc.), y "Ver detalle" debe llevar ahí.
- **Dónde ocurre:** Lista de tareas del estudiante ("Mis Tareas").

**Error 2.C.6 — No se puede anular la entrega de una tarea ni ver el feedback recibido.**
- **Qué se observa hoy:** Una vez que una tarea figura como entregada, no hay forma de **anular esa entrega**. Tampoco se puede **ver el feedback** (la devolución/corrección del profesor).
- **Qué se espera en su lugar:** El estudiante debe poder **anular una entrega** (cuando corresponda) y **ver la devolución del profesor** (nota, comentarios, correcciones) de forma clara.
- **Dónde ocurre:** Lista/detalle de tareas del estudiante.

**Error 2.C.7 — "Correcciones en camino" no es tocable y debería llevar a la tarea pendiente.**
- **Qué se observa hoy:** El indicador de "correcciones en camino" es meramente informativo: no se puede tocar y no lleva a ningún lado.
- **Qué se espera en su lugar:** "Correcciones en camino" debe ser **pulsable** y llevar directamente a **la tarea correspondiente que está en estado pendiente/de corrección**, para que el estudiante pueda ir ahí de un toque.
- **Dónde ocurre:** Indicadores de estado en el Portafolio del estudiante.

**Error 2.C.8 — No se puede editar una tarea.**
- **Qué se observa hoy:** No existe la posibilidad de editar una tarea ya creada.
- **Qué se espera en su lugar:** El estudiante debe poder **editar sus tareas** (al menos las personales), modificando sus datos.
- **Dónde ocurre:** Lista/detalle de tareas del estudiante.

**Error 2.C.9 — Las fechas de las tareas no tienen año, y eso rompe los avisos de vencimiento.** *(detectado en revisión de código)*
- **Qué se observa hoy:** Las fechas límite de las tareas están escritas como texto suelto sin año ("15 ABR", "10 MAR"), y la aplicación siempre supone que esa fecha pertenece al año en curso. Eso produce comportamientos absurdos: una tarea pensada para enero del año que viene, mirada en diciembre, aparece como "vencida hace 11 meses"; y como los ejemplos cargados a mano son de meses que ya pasaron, hoy varias tareas figuran vencidas hace meses sin que nadie lo haya decidido. Además, el subtítulo de la pantalla dice siempre "Ciclo 2025", escrito a mano (ver Error 13.7).
- **Qué se espera en su lugar:** Las fechas deben ser **fechas completas y reales** (día, mes y año), elegidas con un selector de calendario, y el cálculo de "vence en X días" / "vencida hace X días" debe funcionar correctamente en cualquier época del año, incluido el cambio de año.
- **Dónde ocurre:** Mis Tareas del estudiante (y toda pantalla que muestre fechas del estilo "15 ABR").

### 2.D. Módulo Objetivos (Estudiante)

Objetivos tiene: Dashboard, Mis Metas, Hábitos y Competencias.

**Error 2.D.1 — En el Dashboard, "Mis rachas" (arriba a la derecha) debe estar conectado con Hábitos.**
- **Qué se observa hoy:** En la esquina superior derecha del Dashboard hay una tarjeta "Mis rachas" que muestra hábitos, pero está desconectada de la sección real de Hábitos: es una isla que no lleva ni se sincroniza con Hábitos.
- **Qué se espera en su lugar:** "Mis rachas" debe estar **conectada con la sección Hábitos**: reflejar y enlazar los mismos hábitos, de modo que sea una vista resumida y coherente de lo que pasa en Hábitos.
- **Dónde ocurre:** Dashboard de Objetivos, tarjeta "Mis rachas".

**Error 2.D.2 — Los menús de tres puntos de Objetivos no funcionan.**
- **Qué se observa hoy:** Los íconos de tres puntos / "más opciones" que aparecen en Objetivos (por ejemplo en "Mis rachas") no abren nada ni ejecutan ninguna acción.
- **Qué se espera en su lugar:** Los menús de tres puntos deben **funcionar** y ofrecer acciones reales (editar, archivar, etc.), coherentes con el contenido sobre el que se abren.
- **Dónde ocurre:** Dashboard y tarjetas de Objetivos.

**Error 2.D.3 — No se pueden editar los hábitos ni las metas.**
- **Qué se observa hoy:** No existe la opción de editar un hábito ya creado, ni de editar una meta.
- **Qué se espera en su lugar:** El estudiante debe poder **editar sus hábitos y sus metas** después de crearlos.
- **Dónde ocurre:** Secciones Hábitos y Mis Metas de Objetivos.

**Error 2.D.4 — El botón "+" del Dashboard no sirve y debe eliminarse.**
- **Qué se observa hoy:** En el Dashboard hay un botón flotante "+" (crear objetivo) que al presionarlo no hace absolutamente nada.
- **Qué se espera en su lugar:** Ese botón "+" del Dashboard debe **desaparecer**, porque no cumple ninguna función. (La creación de metas ya vive en la sección Mis Metas.)
- **Dónde ocurre:** Dashboard de Objetivos, botón flotante "+".

**Error 2.D.5 — La gestión de metas debe ser mucho más detallada (nivel proyecto), y "completar" hoy no aporta nada.**
- **Qué se observa hoy:** Las metas son muy simples: título, materia, una fecha escrita a mano y una cantidad de subtareas representada solo por un número. Marcar una meta como completada no produce un efecto significativo.
- **Qué se espera en su lugar:** La gestión de metas debe ser **mucho más detallada**, con la profundidad de una herramienta de tareas tipo Todoist pero con la complejidad de **proyectos**: categorías, subtareas reales, etc. Completar una meta debe tener consecuencias reales (progreso, historial, celebración de logro, vínculo con evidencias/competencias).
- **Dónde ocurre:** Sección Mis Metas de Objetivos.

**Error 2.D.6 — La creación de subtareas debe ser detallada, no solo un número.**
- **Qué se observa hoy:** Al crear una meta, las "subtareas" se definen solamente indicando **cuántas** son (un número), sin poder describir cada una.
- **Qué se espera en su lugar:** La creación de subtareas debe ser **detallada**: cada subtarea debe poder describirse individualmente (nombre, detalle, estado), no reducirse a una cantidad numérica.
- **Dónde ocurre:** Formulario de "Nueva Meta" y detalle de meta.

**Error 2.D.7 — Las tareas/subtareas deben ser editables y completables como en Todoist.**
- **Qué se observa hoy:** No se pueden editar ni marcar individualmente las subtareas de una meta.
- **Qué se espera en su lugar:** Las subtareas deben poder **editarse y completarse una por una**, con la misma naturalidad que en Todoist (marcar como hecha, reordenar, editar el texto).
- **Dónde ocurre:** Detalle de meta.

**Error 2.D.8 — En "Nueva meta", "Vence el" debe ser un calendario y "Unidad" debe conectarse a la base de datos.**
- **Qué se observa hoy:** En el formulario de nueva meta, el campo **"Vence el"** es un campo de texto libre donde hay que escribir la fecha a mano (por ejemplo "15 ABR"). El campo **"Unidad"** también es texto libre.
- **Qué se espera en su lugar:** "Vence el" debe ser un **calendario / selector de fecha** real. "Unidad" debe permitir **elegir la unidad de esa materia** a partir de datos reales, es decir, estar **conectado con la base de datos** de materias y sus unidades, en lugar de ser texto suelto.
- **Dónde ocurre:** Formulario "Nueva Meta" en Objetivos.

**Error 2.D.9 — No se pueden agregar recursos a las metas.**
- **Qué se observa hoy:** Las metas no permiten sumar recursos (materiales de apoyo).
- **Qué se espera en su lugar:** El estudiante debe poder **agregar recursos a cada meta** (documentos, enlaces, materiales) que la acompañen.
- **Dónde ocurre:** Creación/detalle de meta.

**Error 2.D.10 — El "resumen semanal / reporte detallado" debe ser inteligente mediante algoritmos (sin usar IA).**
- **Qué se observa hoy:** El "Resumen Semanal" hace un cálculo muy básico (un promedio simple del progreso), y el enlace "Ver reporte detallado" no lleva a nada.
- **Qué se espera en su lugar:** El resumen semanal y su reporte detallado deben ser **inteligentes**, pero **sin inteligencia artificial**: mediante **algoritmos elaborados** que analicen de verdad el avance (tendencias, cumplimiento, ritmo, comparativas), y un reporte detallado real al que se pueda entrar.
- **Dónde ocurre:** Sección Mis Metas, tarjeta "Resumen Semanal".

**Error 2.D.11 — El "próximo hito" debe calcularse con un algoritmo que detecte lo más próximo a vencer y muestre cuánto falta.**
- **Qué se observa hoy:** Existe una tarjeta de "Próximo Hito", pero la lógica es mínima y hay que reforzarla.
- **Qué se espera en su lugar:** Un algoritmo debe **reconocer cuál es la meta/subtarea más próxima a vencerse**, mostrar **cuántos días faltan** y algún dato adicional útil (urgencia, progreso), de forma confiable y automática.
- **Dónde ocurre:** Sección Mis Metas, tarjeta "Próximo Hito".

**Error 2.D.12 — La gestión de competencias debe ser mucho más compleja, tipo árbol y con evidencias.**
- **Qué se observa hoy:** Las competencias son simples: una tarjeta con un nivel y unas "evidencias" mínimas.
- **Qué se espera en su lugar:** La gestión de competencias debe ser **más compleja, con forma de árbol**, donde el estudiante pueda ir **ejecutando y completando** distintas competencias de manera ramificada, cada una acompañada de **evidencias** (trabajos, proyectos, reflexiones) que respalden su avance.
- **Dónde ocurre:** Sección Competencias de Objetivos.

**Error 2.D.13 — El saludo del "Panel diario" miente: día fijo, saludo fijo y cantidad de tareas inventada.** *(detectado en revisión de código)*
- **Qué se observa hoy:** El panel de bienvenida dice "Buenos días, Julieta 👋. Hoy es martes. Tenés 3 tareas pendientes…". Tres de esas cuatro cosas están escritas a mano: dice "Hoy es martes" **todos los días de la semana**, dice "Buenos días" aunque sean las diez de la noche, y las "3 tareas pendientes" son un número fijo que no sale de Mis Tareas (donde la cantidad real de pendientes es otra). Lo único que sí se calcula de verdad es la cantidad de hábitos por registrar.
- **Qué se espera en su lugar:** El saludo debe usar el **día real**, adaptarse a la **hora real** (buenos días / buenas tardes / buenas noches) y mostrar la **cantidad real de tareas pendientes**, leída de la misma información que usa Mis Tareas.
- **Dónde ocurre:** Dashboard de Objetivos, panel diario de bienvenida.

**Error 2.D.14 — Una meta vencida nunca aparece como vencida: la aplicación la "pasa" al año siguiente.** *(detectado en revisión de código)*
- **Qué se observa hoy:** Cuando la fecha de una meta ya pasó, la aplicación asume que la fecha es del **año que viene**. El resultado: una meta que venció hace meses aparece como "Quedan 286 días" y en estado "En marcha", como si estuviera lejísimos de vencer. En Metas directamente **no existe** el concepto de "meta vencida/atrasada". La tarjeta "Próximo Hito" hereda el problema: puede señalar como "próximo" algo que en realidad ya venció, mostrando que faltan cientos de días. Detalle revelador: la pantalla de Mis Tareas interpreta la **misma fecha** de otra manera (ahí sí se marca vencida), porque cada pantalla tiene su propio calculador de fechas duplicado (ver Error 13.6 y el principio de la sección 1.4).
- **Qué se espera en su lugar:** Una meta cuya fecha pasó debe verse claramente **vencida o atrasada**, y el "Próximo Hito" debe calcularse sobre fechas reales y coherentes en toda la aplicación (un único calculador compartido).
- **Dónde ocurre:** Sección Mis Metas (tarjetas de meta y tarjeta "Próximo Hito").

**Error 2.D.15 — Marcar una meta como completada "completa" solas todas sus subtareas (progreso falso).** *(detectado en revisión de código)*
- **Qué se observa hoy:** Al marcar una meta como completada, el contador de subtareas salta automáticamente al total (por ejemplo, de "3 de 5" a "5 de 5"), aunque esas subtareas nunca se hayan hecho. Y si después se desmarca la meta (vuelve a "en curso"), las subtareas **quedan** en "5 de 5": el progreso inventado no se revierte.
- **Qué se espera en su lugar:** Completar una meta no debe falsificar el estado de sus subtareas. Las subtareas deben completarse una por una (como pide el Error 2.D.7), y el estado de la meta debe reflejar el avance real, no al revés.
- **Dónde ocurre:** Sección Mis Metas, acción de marcar/desmarcar una meta como completada.

**Error 2.D.16 — La tarjeta del pie de Hábitos dice "esta semana", pero no mide ninguna semana.** *(detectado en revisión de código)*
- **Qué se observa hoy:** Al pie de Hábitos, un mensaje dice "Mantuviste N hábitos activos esta semana". En realidad ese número cuenta los hábitos cuya racha total es mayor a cero, sin mirar la semana en absoluto: un hábito con racha vieja cuenta igual.
- **Qué se espera en su lugar:** O la tarjeta mide de verdad la actividad **de la semana en curso**, o el texto debe decir lo que realmente cuenta. El texto y el cálculo tienen que coincidir.
- **Dónde ocurre:** Sección Hábitos, tarjeta de cierre (insight del pie).

### 2.E. Módulo Biblioteca (Estudiante)

**Error 2.E.1 — En "revisión" debe verse solo lo que subió ese estudiante, no lo de todos.**
- **Qué se observa hoy:** La sección de revisión muestra recursos presentados por cualquier estudiante, no solo los del estudiante que está mirando.
- **Qué se espera en su lugar:** En la sección de revisión, cada estudiante debe ver **únicamente los recursos que él mismo presentó**, no los del resto.
- **Dónde ocurre:** Biblioteca del estudiante, estado "en revisión".

**Error 2.E.2 — "Presentar recurso" no funciona.**
- **Qué se observa hoy:** El botón "Presentar recurso" no abre ningún formulario ni inicia ningún flujo.
- **Qué se espera en su lugar:** "Presentar recurso" debe abrir un flujo real para que el estudiante **proponga un recurso** que luego entra a la cola de revisión del bibliotecario/dirección.
- **Dónde ocurre:** Biblioteca del estudiante.

**Error 2.E.3 — El buscador es "discriminatorio" con las tildes.**
- **Qué se observa hoy:** La búsqueda solo encuentra coincidencias exactas: si el usuario escribe una palabra sin tilde (o con distinta acentuación), no aparece el recurso que sí la tiene.
- **Qué se espera en su lugar:** La búsqueda **no debe ser sensible a tildes/acentos**: escribir la palabra con o sin tilde debe encontrar el mismo resultado. Debe ser tolerante a acentos y mayúsculas.
- **Dónde ocurre:** Buscador de la Biblioteca.

**Error 2.E.4 — "Descargar" no funciona, ni "Ver guía".**
- **Qué se observa hoy:** Las acciones "Descargar" y "Ver guía" de un recurso no producen ningún resultado.
- **Qué se espera en su lugar:** "Descargar" debe **descargar** el recurso realmente, y "Ver guía" debe **abrir la guía** correspondiente.
- **Dónde ocurre:** Tarjeta de recurso en la Biblioteca.

**Error 2.E.5 — "Filtrar" no funciona.**
- **Qué se observa hoy:** El botón de filtros avanzados no aplica ningún filtro.
- **Qué se espera en su lugar:** El filtrado debe **funcionar**: por materia, tipo de recurso, escuela de origen, fecha, autor, etc.
- **Dónde ocurre:** Barra de búsqueda y filtros de la Biblioteca.

**Error 2.E.6 — "Presentar recurso" aparece dos veces.**
- **Qué se observa hoy:** El botón "Presentar recurso" está duplicado en la misma pantalla (aparece arriba y también más abajo).
- **Qué se espera en su lugar:** Debe haber **un solo** acceso para presentar recurso, no dos.
- **Dónde ocurre:** Biblioteca del estudiante (encabezado y pie).

**Error 2.E.7 — La Biblioteca Nacional debe incluir lo institucional aprobado para ir a nacional.**
- **Qué se observa hoy:** Lo institucional y lo nacional están separados sin conexión: un recurso institucional no llega a la biblioteca nacional aunque debiera.
- **Qué se espera en su lugar:** En la Biblioteca Nacional debe aparecer también el contenido institucional **cuando el bibliotecario haya aprobado** que ese recurso presentado pase a ser público/nacional. Es decir, debe existir el camino "recurso institucional aprobado → visible en la nacional".
- **Dónde ocurre:** Biblioteca Institucional y Biblioteca Nacional.

### 2.F. Módulo Chat (Estudiante)

**Error 2.F.1 — El buscador de conversaciones no funciona.**
- **Qué se observa hoy:** Hay un campo "Buscar conversación...", pero es decorativo: escribir ahí no filtra ni encuentra nada.
- **Qué se espera en su lugar:** El buscador debe **filtrar las conversaciones** por nombre/contenido de verdad.
- **Dónde ocurre:** Lista de conversaciones del Chat.

**Error 2.F.2 — No debe aparecer el botón de llamar.**
- **Qué se observa hoy:** En la ventana de conversación aparece un botón de "llamar" (teléfono).
- **Qué se espera en su lugar:** El botón de **llamar debe eliminarse**: no corresponde a la funcionalidad del chat de la plataforma.
- **Dónde ocurre:** Encabezado de la ventana de conversación.

**Error 2.F.3 — El botón de adjuntar archivo no funciona.**
- **Qué se observa hoy:** El botón de adjuntar archivo (clip) no abre ningún selector ni permite enviar archivos.
- **Qué se espera en su lugar:** Adjuntar archivo debe **funcionar**: permitir seleccionar y enviar un archivo dentro del chat.
- **Dónde ocurre:** Barra de escritura de la ventana de conversación.

**Error 2.F.4 — Los mensajes no viajan a ningún lado: nadie responde jamás y todo se pierde.** *(detectado en revisión de código)*
- **Qué se observa hoy:** Al enviar un mensaje, éste aparece en la pantalla propia y nada más. La otra persona **nunca lo recibe** (no existe "el otro lado": las conversaciones son ejemplos fijos) y por lo tanto jamás contesta: la conversación queda congelada para siempre después del último mensaje de ejemplo. Al recargar la aplicación, hasta el propio mensaje enviado desaparece.
- **Qué se espera en su lugar:** Mensajería **real entre perfiles**: lo que escribe un usuario debe llegarle al destinatario, guardarse, y disparar el aviso de no leído correspondiente. Se conecta con la nota transversal de la sección 4.
- **Dónde ocurre:** Módulo Chat (todos los perfiles que lo usan).

**Error 2.F.5 — El contador de mensajes "no leídos" no se borra al leer la conversación.** *(detectado en revisión de código)*
- **Qué se observa hoy:** Una conversación con el globito "2" de no leídos mantiene ese globito aunque el usuario la abra y lea todos los mensajes. La única forma de que desaparezca es **responder algo**: recién al enviar un mensaje el contador se pone en cero. Es decir, leer no cuenta como leer; solo contestar.
- **Qué se espera en su lugar:** Abrir una conversación debe **marcar sus mensajes como leídos** y borrar el contador, como en cualquier mensajería.
- **Dónde ocurre:** Lista de conversaciones del Chat.

**Error 2.F.6 — Hay una conversación de ejemplo con los hablantes cruzados.** *(detectado en revisión de código)*
- **Qué se observa hoy:** En el chat del estudiante con el Prof. García, los roles están invertidos: el **profesor** aparece diciendo "Hola, tengo una duda sobre el material" y el **estudiante** respondiendo "¿Cuál es tu pregunta?", como si el alumno fuera el docente. El diálogo de ejemplo está armado al revés.
- **Qué se espera en su lugar:** Es un dato de ejemplo mal cargado, pero sirve de síntoma: los contenidos ficticios no fueron revisados. Al pasar a datos reales (tema transversal 2 de la sección 11), este tipo de incoherencias debe desaparecer de raíz.
- **Dónde ocurre:** Chat del estudiante, conversación con "Prof. García".

### 2.G. Módulo Asistencia IA (Estudiante)

**Error 2.G.1 — No funciona nada porque no hay IA real; falta una función detallada con lugar para el "system prompt" y demás.**
- **Qué se observa hoy:** El chat de Asistencia muestra una conversación de ejemplo y, cuando el estudiante escribe, responde siempre con un mensaje fijo y genérico después de una pausa simulada. No hay ninguna inteligencia real: es un decorado.
- **Qué se espera en su lugar:** Debe construirse una **función real y detallada de IA**, con un lugar donde configurar el **"system prompt"** (las instrucciones base que guían a la IA) y los parámetros necesarios, de modo que se pueda **conectar y probar con APIs de IA gratuitas**. El objetivo es tener una asistencia que realmente explique, genere ejercicios, guíe el estudio, etc.
- **Dónde ocurre:** Módulo Asistencia IA.

**Error 2.G.2 — Los tres puntitos y el "FAQ" no sirven.**
- **Qué se observa hoy:** El menú de tres puntos y el acceso de ayuda/FAQ de Asistencia IA no hacen nada.
- **Qué se espera en su lugar:** Ambos deben **funcionar**: el menú de opciones debe ofrecer acciones reales y el FAQ/ayuda debe abrir contenido de ayuda útil.
- **Dónde ocurre:** Barra superior del módulo Asistencia IA.

---

## 3. Perfil PROFESOR

El profesor tiene en su menú: Comunidad, Aula Virtual, Gestión de Tareas, Mi Portafolio, Biblioteca y Chat.

### 3.A. Módulo Comunidad (Profesor)

**Error 3.A.1 — La Comunidad del profesor tiene exactamente los mismos problemas que la del estudiante.**
- **Qué se observa hoy:** El profesor usa la misma Comunidad que el estudiante, con todos sus defectos.
- **Qué se espera en su lugar:** Deben resolverse **todos los errores de la sección 2.B** (likes en vez de votos, falta de comentarios, falta de vista de detalle, tres puntitos que no funcionan, tendencias sin lógica, imposibilidad de volver entre pestañas, etc.), teniendo en cuenta que el profesor, en el menú de tres puntos, **puede denunciar pero no borrar** (igual que el estudiante).
- **Dónde ocurre:** Módulo Comunidad (compartido).

**Error 3.A.2 — El profesor debe poder crear debates de forma más compleja.**
- **Qué se observa hoy:** La creación de debates es mínima: básicamente un título en un recuadro.
- **Qué se espera en su lugar:** El profesor debe poder **crear debates de manera más rica y detallada** (con más opciones de configuración que un simple título), acorde a su rol.
- **Dónde ocurre:** Creación de debate en Comunidad.

### 3.B. Módulo Aula Virtual (Profesor)

Esta es una de las secciones más incompletas: se ve muy bien, pero no hay ninguna maquinaria real detrás.

**Error 3.B.1 — La "trayectoria de la clase" no funciona.**
- **Qué se observa hoy:** El panel de trayectoria (los pasos/etapas de la clase) es visual pero no responde a nada real: no refleja el avance verdadero de una clase.
- **Qué se espera en su lugar:** La trayectoria de la clase debe **funcionar de verdad**, reflejando y controlando el avance real de la clase en vivo (etapas, objetivos alcanzados, paso actual).
- **Dónde ocurre:** Panel de trayectoria del Aula Virtual del profesor.

**Error 3.B.2 — No existe un sistema de videollamada.**
- **Qué se observa hoy:** No hay videollamada real: el "aula virtual" es una representación estática (avatares dibujados sobre un pizarrón), sin transmisión de audio ni video.
- **Qué se espera en su lugar:** Debe construirse un **sistema de videollamada real** dentro del aula virtual, con la lógica compleja que eso implica (audio, video, pizarra compartida, participantes conectados). Se relaciona directamente con el Error 2.C.1 (transmisión apoyada en pizarra digital del docente).
- **Dónde ocurre:** Aula Virtual del profesor.

**Error 3.B.3 — La videollamada ocupa toda la pantalla y tapa el menú lateral.**
- **Qué se observa hoy:** La vista del aula virtual se muestra a pantalla completa, sin el menú lateral, de modo que el profesor pierde la navegación general de la aplicación.
- **Qué se espera en su lugar:** La disposición debe permitir **ver el menú lateral** (o una navegación equivalente) mientras se está en el aula; no debe "tragarse" toda la pantalla dejando al usuario sin salida ni contexto.
- **Dónde ocurre:** Disposición general del Aula Virtual del profesor.

**Error 3.B.4 — En el "pulso del aula" hay que saber quién entendió, no solo ver números.**
- **Qué se observa hoy:** El "pulso del aula" muestra cantidades (cuántos entienden, cuántos "más o menos", cuántos perdidos), pero no dice **quién** está en cada estado.
- **Qué se espera en su lugar:** El profesor debe poder saber **qué estudiantes en particular** entendieron, cuáles están dudando y cuáles están perdidos, no solo el número total. La información debe ser nominal y accionable.
- **Dónde ocurre:** Panel "Pulso del Aula".

**Error 3.B.5 — La "alerta de ritmo" debe ser un algoritmo con umbral, no una IA.**
- **Qué se observa hoy:** La alerta de ritmo muestra un texto fijo ("el 20% de la clase está demorando..."), como si fuera inteligencia, pero es solo un mensaje escrito a mano.
- **Qué se espera en su lugar:** La alerta de ritmo debe ser un **algoritmo con un umbral definido**: cuando cierto porcentaje de la clase se atrasa o no comprende, se dispara la alerta automáticamente. **No** debe ser una inteligencia artificial; debe ser una regla clara y medible.
- **Dónde ocurre:** Panel de alertas del Aula Virtual.

**Error 3.B.6 — Las "preguntas pendientes" están bien.**
- **Qué se observa hoy:** La sección de preguntas pendientes de los alumnos funciona de forma aceptable.
- **Qué se espera en su lugar:** Se conserva. (Se registra aquí para dejar constancia de que esta parte no requiere cambios; el resto del aula sí.)
- **Dónde ocurre:** Panel "Preguntas Pendientes".

**Error 3.B.7 — En general no funciona nada, ni siquiera el chat, que depende de la lógica de una videollamada compleja.**
- **Qué se observa hoy:** Los controles del aula (micrófono, cámara, compartir, chat) cambian de estado visual pero no hacen nada real. El "chat de la clase" solo muestra un aviso, sin conversación real.
- **Qué se espera en su lugar:** Toda la maquinaria del aula debe **funcionar de verdad**, y en particular el chat debe integrarse con la lógica de la videollamada compleja (mensajería real durante la clase en vivo).
- **Dónde ocurre:** Barra de controles y chat del Aula Virtual.

**Error 3.B.8 — No hay configuración ni ajustes.**
- **Qué se observa hoy:** El botón de ajustes del aula no abre ninguna configuración.
- **Qué se espera en su lugar:** Debe existir una **configuración/ajustes reales** del aula virtual (dispositivos, opciones de clase, etc.).
- **Dónde ocurre:** Aula Virtual, botón de ajustes.

**Error 3.B.9 — No hay un lugar de planificación de clase.**
- **Qué se observa hoy:** No existe una sección para planificar cuándo y cómo se crea una clase, con su estructura.
- **Qué se espera en su lugar:** Debe haber un **espacio de planificación de clases**: definir la estructura de la clase, sus etapas, materiales y objetivos, y programar cuándo se dará.
- **Dónde ocurre:** Falta un módulo/sección de planificación en el Portafolio/Aula del profesor.

**Error 3.B.10 — Debe existir una lista de clases planificadas, y al llegar la fecha se inicia la videollamada con un clic.**
- **Qué se observa hoy:** No hay lista de clases planificadas ni forma de iniciar una clase desde su programación.
- **Qué se espera en su lugar:** El profesor debe poder ver una **lista de clases planificadas**; cuando llegue la fecha de una clase, al hacer clic sobre ella **se inicia la videollamada** de esa clase.
- **Dónde ocurre:** Planificación / lista de clases del profesor.

**Error 3.B.11 — Hay que saber qué estudiantes están conectados, no solo cuántos.**
- **Qué se observa hoy:** El aula muestra una cantidad de conectados (un número), pero no **quiénes** están conectados.
- **Qué se espera en su lugar:** El profesor debe ver **la lista nominal de estudiantes conectados**, no solamente el total.
- **Dónde ocurre:** Panel de participantes del Aula Virtual.

**Error 3.B.12 — Al salir del aula, manda al portafolio; debería mandar a la comunidad o al listado del aula virtual.**
- **Qué se observa hoy:** Cuando el profesor sale del aula virtual, la aplicación lo lleva a su portafolio.
- **Qué se espera en su lugar:** Al salir, debería llevarlo a **Comunidad** o al **aula virtual donde está la lista de clases**, no al portafolio.
- **Dónde ocurre:** Acción "Salir" del Aula Virtual del profesor.

### 3.C. Módulo Gestión de Tareas (Profesor)

**Error 3.C.1 — La lógica de gestión de tareas es muy pobre: falta saber quién entregó qué, ver entregables por estudiante, editar, subir archivos, poner fecha y elegir materia/curso.**
- **Qué se observa hoy:** La gestión de tareas muestra por cada tarea unos números globales (cuántos al día, tarde, pendientes), pero no permite entrar a ver **qué estudiante entregó cada cosa**, ni **ver los entregables** de cada uno. La creación/edición es limitada.
- **Qué se espera en su lugar:** El profesor debe poder: **saber qué estudiantes entregaron cada tarea**, **ver el entregable de cada estudiante**, **editar** las tareas, **subir archivos**, **poner fecha** de manera cómoda, y **elegir la materia/curso** cuando está asignado a varios cursos. En resumen, una gestión de tareas realista y completa, hoy inexistente.
- **Dónde ocurre:** Módulo Gestión de Tareas del profesor.

**Error 3.C.2 — Hay dos botones para crear una nueva tarea; debe quedar uno solo.**
- **Qué se observa hoy:** En Gestión de Tareas aparecen **dos** botones que hacen lo mismo (crear nueva tarea): uno arriba y otro flotante.
- **Qué se espera en su lugar:** Debe haber **un único** botón para crear tarea.
- **Dónde ocurre:** Gestión de Tareas del profesor.

**Error 3.C.3 — El diario reflexivo debe permitir editar y borrar sus entradas.**
- **Qué se observa hoy:** En el Diario Reflexivo, la acción de editar una entrada no hace nada, y no existe la opción de borrarla.
- **Qué se espera en su lugar:** El profesor debe poder **editar** y **borrar** sus registros/entradas del diario reflexivo.
- **Dónde ocurre:** Diario Reflexivo del profesor.

**Error 3.C.4 — El "registro" nuevo debe ser desplegable, no ocupar toda la pantalla.**
- **Qué se observa hoy:** El formulario para crear un nuevo registro del diario está siempre desplegado, ocupando mucho espacio en la pantalla.
- **Qué se espera en su lugar:** Ese formulario de nuevo registro debe ser **desplegable** (colapsable): mostrarse solo cuando el profesor quiere crear un registro, y estar plegado el resto del tiempo, sin ocupar toda la pantalla.
- **Dónde ocurre:** Diario Reflexivo del profesor (formulario de nuevo registro).

**Error 3.C.5 — La gestión de tareas debe estar dentro del portafolio, no afuera.**
- **Qué se observa hoy:** Gestión de Tareas está como una sección separada, fuera del portafolio docente.
- **Qué se espera en su lugar:** La gestión de tareas debe vivir **dentro del portafolio del profesor**, como una parte integrada de él, no como una sección aparte.
- **Dónde ocurre:** Organización del portafolio docente.

**Error 3.C.6 — En el portafolio docente faltan muchas funciones que sí están en la arquitectura original.**
- **Qué se observa hoy:** El portafolio docente (su tablero principal) es un resumen básico con datos fijos; carece de muchas capacidades previstas.
- **Qué se espera en su lugar:** Debe incorporar las **funciones que la arquitectura definió** para el portafolio docente: diario de práctica reflexiva completo, planificador de clases con asistente, banco de recursos personal, métricas de efectividad de tareas, portafolio digital, etc.
- **Dónde ocurre:** Portafolio Docente (tablero principal).

**Error 3.C.7 — Hay que poder tocar las "tareas asignadas" desde el portafolio.**
- **Qué se observa hoy:** En el tablero del portafolio docente, las tareas listadas ("tareas por revisar") no se pueden tocar: no llevan a ningún lado.
- **Qué se espera en su lugar:** Las tareas asignadas que aparecen en el portafolio deben ser **pulsables** y llevar al detalle de esa tarea (para revisarla, ver entregas, etc.).
- **Dónde ocurre:** Tablero del Portafolio Docente.

**Error 3.C.8 — Las clases deben estar separadas y ser pulsables, al estilo Classroom pero mucho más complejo.**
- **Qué se observa hoy:** No hay una estructura de clases separadas y navegables; el manejo de cursos/clases es plano.
- **Qué se espera en su lugar:** El profesor debe tener sus **clases separadas y pulsables**, con una experiencia inspirada en Google Classroom pero **mucho más compleja** (se sugiere estudiar la documentación de Classroom como referencia para lograrlo).
- **Dónde ocurre:** Organización de cursos/clases del profesor.

**Error 3.C.9 — Hay que saber qué se revisó y qué queda por revisar, discriminado por alumno y por materia.**
- **Qué se observa hoy:** No hay una forma detallada de saber, entrega por entrega, qué revisó el profesor y qué le falta.
- **Qué se espera en su lugar:** El profesor debe poder ver claramente **qué corrigió y qué le queda por corregir**, con un desglose **por alumno** y **por materia**, de manera detallada.
- **Dónde ocurre:** Gestión de Tareas / correcciones del profesor.

### 3.D. Módulo Biblioteca (Profesor)

**Error 3.D.1 — Al entrar a la biblioteca, la pestaña aparece desplegada/scrolleada hacia abajo.**
- **Qué se observa hoy:** Cuando el profesor entra a su biblioteca, la vista aparece corrida hacia abajo (la pestaña "desplegada toda hacia abajo"), en lugar de empezar arriba.
- **Qué se espera en su lugar:** La biblioteca debe abrirse **desde el principio (arriba)**, con la vista en su posición inicial correcta.
- **Dónde ocurre:** Biblioteca del profesor (posición inicial de la vista).

**Error 3.D.2 — La biblioteca del profesor tiene lo mismo que la del estudiante, y eso está bien.**
- **Qué se observa hoy:** La biblioteca del profesor comparte funcionalidades con la del estudiante.
- **Qué se espera en su lugar:** Está **correcto** que el profesor pueda hacer lo mismo que un estudiante en la biblioteca. Se conserva ese alcance. (Ojo: esto significa que también **hereda los errores de biblioteca de la sección 2.E**, que deben corregirse.)
- **Dónde ocurre:** Biblioteca del profesor.

---

## 4. La interacción entre perfiles (nota transversal para la IA lectora)

Antes de entrar a los perfiles administrativos, hay que remarcar un tema de fondo que atraviesa a todos: **hoy los perfiles casi no interactúan entre sí**. Lo que hace un perfil no repercute en los demás. Ejemplos que aparecen a lo largo de este informe: los artículos del Centro de Estudiantes no llegan a la comunidad de los demás; las quejas de un estudiante no viajan al portal del Centro de Estudiantes ni a Dirección; un comunicado del preceptor no dispara un aviso a la familia; una modificación con "token temporal" de la dirección no se envía a aceptación del profesor; etc. La reforma debe construir esa **circulación real de información entre perfiles**, respetando los permisos de cada uno. Este punto es central y conviene tenerlo presente al leer cada error de los perfiles administrativos.

---

## 5. Perfil ADMINISTRADOR (el equipo que opera la plataforma — "nosotros")

**Aclaración clave sobre este perfil.** El Administrador es el equipo técnico que crea y sostiene la plataforma. Su alcance debe ser **muy acotado**: **crear instituciones** (darlas de alta con su cuenta y contraseña) y **vigilar la salud técnica del sistema** con logs no sensibles. **No** administra la vida interna de cada escuela (ni alumnos, ni docentes, ni materias, ni comunidad, ni asistencias). Todo eso le corresponde a la dirección de cada colegio (Administración Académica). El problema de fondo es que **hoy este perfil está mezclado con el de la dirección del colegio** y muestra información que no le corresponde.

### 5.A. Panel Principal (Administrador)

**Error 5.A.1 — El Panel Principal no está en el menú lateral, pero es la primera pantalla que aparece.**
- **Qué se observa hoy:** Al ingresar con este perfil, la primera pantalla que se ve es un panel principal, pero ese panel **no figura como opción en el menú lateral**, lo que resulta incoherente.
- **Qué se espera en su lugar:** Debe resolverse la incoherencia: si el panel principal es la pantalla de inicio, debe tener su lugar claro y accesible en la navegación (y ser el panel correcto para este perfil, ver los siguientes errores).
- **Dónde ocurre:** Navegación e inicio del perfil Administrador.

**Error 5.A.2 — En "Actividad de hoy" deben aparecer logs, no eventos escolares específicos (y hoy eso es peligroso).**
- **Qué se observa hoy:** La "Actividad de hoy" muestra cosas como "Clase iniciada", "Debate abierto", "Nuevo recurso de biblioteca", "Alerta de inasistencia". Es decir, actividad **interna y sensible de una escuela puntual**, que este perfil no debería ver.
- **Qué se espera en su lugar:** En su lugar deben aparecer **logs del sistema** (registros técnicos de lo que ocurre en la plataforma, sin datos sensibles). Mostrar actividad escolar concreta (quién faltó, qué clase empezó, etc.) a este perfil es **peligroso** y no corresponde: esa información es de la dirección de la escuela, no del equipo que opera la plataforma.
- **Dónde ocurre:** Panel Principal del Administrador, sección "Actividad de hoy".

**Error 5.A.3 — No anda nada en el panel.**
- **Qué se observa hoy:** Los elementos del panel no tienen funcionalidad real.
- **Qué se espera en su lugar:** El panel debe **funcionar de verdad** (con datos y acciones reales), una vez redefinido su contenido según el alcance correcto del perfil.
- **Dónde ocurre:** Panel Principal del Administrador.

**Error 5.A.4 — No deben aparecer datos escolares específicos ni métricas que no le sirven a este perfil.**
- **Qué se observa hoy:** El panel muestra "estudiantes activos", "docentes", "tareas entregadas en término", "participación en comunidad", "comprensión promedio", alertas de que faltó un profesor, etc. Todo eso pertenece a la dirección del colegio.
- **Qué se espera en su lugar:** Este perfil **no** debe ver: cantidad de docentes, cantidad de estudiantes, tareas entregadas a término, participación en comunidad ni comprensión promedio, ni alertas escolares puntuales (como que faltó un profesor). Lo que sí le sirve es, por ejemplo, la **cantidad de instituciones** y los indicadores de **salud del sistema**. Todo lo que sea vida escolar interna es responsabilidad del director/administración de cada escuela, no de este perfil.
- **Dónde ocurre:** Métricas y alertas del Panel Principal del Administrador.

**Error 5.A.5 — No debe poder ver el calendario.**
- **Qué se observa hoy:** El perfil tiene acceso al calendario (a través de accesos rápidos).
- **Qué se espera en su lugar:** El Administrador **no** debe poder ver el calendario institucional: no le corresponde.
- **Dónde ocurre:** Accesos del Panel Principal / navegación del Administrador.

**Error 5.A.6 — Sí puede exportar reportes (esto es correcto y necesario).**
- **Qué se observa hoy:** Existe la posibilidad de exportar reportes.
- **Qué se espera en su lugar:** Se **conserva**: exportar reportes es una capacidad válida y necesaria para este perfil (con datos anonimizados / no sensibles).
- **Dónde ocurre:** Panel Principal del Administrador.

**Error 5.A.7 — "Instituciones" debe gestionar instituciones en general, no cursos ni materias.**
- **Qué se observa hoy:** La sección "Instituciones" de este perfil termina mostrando la gestión interna de una escuela (pestañas de Cursos, Materias, Perfiles), como si fuera la dirección del colegio.
- **Qué se espera en su lugar:** "Instituciones" debe permitir **gestionar las instituciones en general**: crearlas con su **cuenta y contraseña** y poco más. La gestión de cursos, materias, profesores, etc., **la hace cada institución dentro de su propio perfil** (el de la dirección/administración de esa escuela). Este perfil no debe entrar a administrar la estructura interna de las escuelas.
- **Dónde ocurre:** Sección "Instituciones" del Administrador.

**Error 5.A.8 — "Actividades" no funciona.**
- **Qué se observa hoy:** La sección "Actividades" no tiene funcionalidad real (además, hoy reutiliza el mismo panel que la dirección del colegio).
- **Qué se espera en su lugar:** "Actividades" debe **funcionar** y mostrar métricas de uso propias del rol de operador de la plataforma (uso por institución, módulos más usados, etc.), no la actividad escolar interna.
- **Dónde ocurre:** Sección "Actividades" del Administrador.

**Error 5.A.9 — La lógica del perfil está completamente rota: mezcla "administrador de la escuela" con "nosotros".**
- **Qué se observa hoy:** El perfil funciona como una **mezcla** entre el administrador del colegio (director) y el equipo que opera la plataforma. Termina mostrando información y capacidades que corresponden a la dirección de la escuela.
- **Qué se espera en su lugar:** Este perfil debe ser **exclusivamente** el de los administradores de las **instituciones a nivel plataforma** (darlas de alta, monitorear la salud del sistema, ver logs no sensibles, exportar reportes, ver cantidad de instituciones). **No** le corresponde la administración de materias, profesores, cursos ni la vida escolar. Hay que separar claramente los dos roles que hoy están confundidos.
- **Dónde ocurre:** Todo el perfil Administrador (definición de alcance y contenidos).

**Error 5.A.10 — (Secundario) Debe existir la creación de plantillas personalizadas por institución.**
- **Qué se observa hoy:** No existe la posibilidad de crear plantillas personalizadas para cada institución.
- **Qué se espera en su lugar:** Debería poder **crear plantillas personalizadas para cada institución por separado**, para que cada perfil pueda verla según sus necesidades. Se marca como **secundario** (deseable, no urgente).
- **Dónde ocurre:** Gestión de instituciones (funcionalidad futura).

**Error 5.A.11 — El buscador del panel no busca, la campana de notificaciones no notifica y el encabezado nombra a una escuela puntual.** *(detectado en revisión de código)*
- **Qué se observa hoy:** En la barra superior del panel hay un buscador ("Buscar expedientes, alumnos…") que acepta texto pero **no busca ni filtra absolutamente nada**: lo escrito se guarda internamente y no pasa nada más. La campana de notificaciones y el botón de ayuda de esa misma barra tampoco hacen nada al presionarlos. Además, el encabezado dice fijo "Colegio San Martín — Ciclo 2025": el operador de la plataforma ve el panel de **una escuela concreta**, otro síntoma de la mezcla de roles descripta en el Error 5.A.9.
- **Qué se espera en su lugar:** El buscador debe buscar de verdad (o no estar), la campana debe mostrar notificaciones reales y la ayuda debe abrir ayuda. El texto institucional debe corresponder al perfil que mira el panel, no estar clavado en una escuela y un año.
- **Dónde ocurre:** Barra superior del Panel Principal (que hoy comparten el Administrador y la Dirección).

---

## 6. Perfil ADMINISTRACIÓN ACADÉMICA (dirección del colegio)

Este perfil es la dirección de cada institución. En su menú tiene: Comunidad, Gestión de Perfiles, Gestión de Cursos, Biblioteca, Calendario y Reportes.

### 6.A. Módulo Comunidad (Administración Académica)

**Error 6.A.1 — La Comunidad está igual de rota que en el resto de los perfiles.**
- **Qué se observa hoy:** Comparte la misma Comunidad con todos sus defectos.
- **Qué se espera en su lugar:** Deben corregirse **todos los errores de la sección 2.B**, con las capacidades que le corresponden a la dirección.
- **Dónde ocurre:** Módulo Comunidad (compartido).

**Error 6.A.2 — La dirección debe poder borrar publicaciones de la comunidad.**
- **Qué se observa hoy:** No hay una acción real para que la dirección elimine publicaciones.
- **Qué se espera en su lugar:** La administración debe poder **borrar publicaciones** de la comunidad (a través del menú de tres puntos, con permisos de moderación). Esto se conecta con el patrón de acciones por perfil del Error 2.B.8.
- **Dónde ocurre:** Comunidad, acciones de moderación de la dirección.

### 6.B. Módulo Gestión de Perfiles (Administración Académica)

**Error 6.B.1 — El borrado de perfiles debe ser muy seguro, como plantea la arquitectura.**
- **Qué se observa hoy:** No hay una lógica de borrado segura y reversible de perfiles.
- **Qué se espera en su lugar:** El borrado de perfiles debe seguir la lógica **segura** definida en la arquitectura: **papelera de reciclaje** con borrado suave (por ejemplo, 7 días para restaurar antes de la eliminación definitiva), y que solo la dirección pueda enviar a papelera (no vaciarla), etc.
- **Dónde ocurre:** Gestión de Perfiles (borrado) y Papelera de Reciclaje.

**Error 6.B.2 — Al entrar a cada perfil, debe verse toda su actividad en detalle.**
- **Qué se observa hoy:** No se puede entrar a un perfil y revisar su actividad detallada.
- **Qué se espera en su lugar:** Al abrir un perfil, la dirección debe poder ver **toda la actividad de esa persona a detalle**: los mensajes que mandó y con quién, qué hizo, y las sanciones/"multas" que tiene (por ejemplo, si se le borró alguna publicación). Es un historial completo y auditable de ese perfil.
- **Dónde ocurre:** Detalle de perfil en Gestión de Perfiles.

**Error 6.B.3 — Crear un perfil no crea una cuenta: la persona dada de alta jamás podrá entrar a la aplicación.** *(detectado en revisión de código)*
- **Qué se observa hoy:** El botón "Nuevo perfil" agrega una fila a la tabla, pero eso es todo: **no se genera ningún usuario ni contraseña reales**. La aplicación completa tiene solamente **ocho cuentas fijas escritas adentro del propio programa** (una por rol de demostración, ver Error 12.4), así que cualquier persona "creada" desde esta pantalla nunca va a poder iniciar sesión. Además, el número de identificación (ID o matrícula) del perfil nuevo se **inventa al azar**, con lo cual podría repetirse con el de otro perfil existente.
- **Qué se espera en su lugar:** El alta de un perfil debe crear una **cuenta real** (credenciales que la persona pueda usar para entrar, como promete el propio texto del login: "Tus credenciales fueron enviadas por la administración de tu institución"), y los identificadores deben ser **únicos y garantizados**, no números al azar.
- **Dónde ocurre:** Gestión de Perfiles, alta de perfil.

**Error 6.B.4 — La dirección no puede dar de alta perfiles de Familia ni de Bibliotecario.** *(detectado en revisión de código)*
- **Qué se observa hoy:** Al crear o editar un perfil, la lista de roles disponibles ofrece solamente Estudiante, Profesor, Preceptor, Admin y Centro de Estudiantes. Los roles **Familia** y **Bibliotecario** —que existen en la plataforma y tienen sus propias pantallas— no se pueden asignar: no hay forma de dar de alta a una familia ni a un bibliotecario.
- **Qué se espera en su lugar:** El formulario debe permitir crear perfiles de **todos los roles reales de la plataforma**, incluyendo Familia (idealmente vinculada a su hijo/a y curso) y Bibliotecario.
- **Dónde ocurre:** Gestión de Perfiles, formulario de alta/edición (selector de rol).

**Error 6.B.5 — La papelera de perfiles existe a medias: se puede mandar y restaurar, pero los "7 días" no existen.** *(detectado en revisión de código)*
- **Qué se observa hoy:** Complemento del Error 6.B.1: enviando un perfil a la papelera éste desaparece de la lista y puede restaurarse, o sea que el primer paso del borrado seguro sí está construido visualmente. Pero ahí termina: **no hay ningún contador de 7 días**, nada elimina definitivamente lo que está en la papelera, no se registra quién lo mandó ahí, y como nada se guarda de verdad (sección 12), recargar la aplicación "revive" todos los perfiles borrados.
- **Qué se espera en su lugar:** El ciclo completo que define la arquitectura: papelera con **plazo visible de 7 días**, eliminación definitiva al vencer el plazo, registro de quién borró y quién restauró, y persistencia real de todo el proceso.
- **Dónde ocurre:** Gestión de Perfiles, papelera.

### 6.C. Módulo Gestión de Cursos (Administración Académica)

**Error 6.C.1 — Tiene el mismo problema que la "gestión de instituciones" del Administrador: está completamente roto.**
- **Qué se observa hoy:** La Gestión de Cursos comparte el mismo contenido y los mismos defectos que la vista de gestión que usa el Administrador (es la misma pieza reutilizada mal), y está rota.
- **Qué se espera en su lugar:** Debe funcionar como una **gestión de cursos real** para la dirección del colegio, separada del alcance del Administrador (que no debería administrar cursos). Ver también el principio de separación de roles de la sección 5.
- **Dónde ocurre:** Gestión de Cursos.

**Error 6.C.2 — No se puede "ver detalle"; y el detalle debe permitir ver tareas sin poder eliminarlas.**
- **Qué se observa hoy:** El botón "ver detalle" de un curso no hace nada.
- **Qué se espera en su lugar:** "Ver detalle" debe **funcionar** y dejar a la dirección **ver los detalles de las tareas y demás contenidos del curso, sin poder eliminarlos**, porque esas tareas les pertenecen a los profesores. Es un acceso de lectura, no de borrado.
- **Dónde ocurre:** Gestión de Cursos, detalle de curso.

**Error 6.C.3 — "Estado del ciclo lectivo" muestra datos inventados y no debería estar.**
- **Qué se observa hoy:** La tarjeta "Estado del Ciclo Lectivo" muestra números que **salen de cualquier lado** (por ejemplo, cantidades de docentes o aulas calculadas de forma arbitraria), sin sentido real.
- **Qué se espera en su lugar:** Esa tarjeta **no debería estar**, porque muestra datos sin fundamento y hace referencia a cosas como suscripciones que la plataforma no administra. Debe quitarse o reemplazarse por información real y pertinente.
- **Dónde ocurre:** Gestión de Cursos, tarjeta "Estado del Ciclo Lectivo".

**Error 6.C.4 — "Generar reporte PDF" simula que trabaja pero nunca entrega ningún archivo.** *(detectado en revisión de código)*
- **Qué se observa hoy:** El botón del reporte semanal muestra un estado de "generando…" durante un segundo y medio y después vuelve a la normalidad, **sin descargar ni abrir ningún PDF**. Es una actuación: la pausa está puesta a propósito para aparentar que un sistema está generando el documento, pero no existe ningún documento. Ojo: esto matiza el Error 5.A.6, que daba por buena la capacidad de exportar reportes; en realidad hoy la exportación tampoco funciona en ninguna pantalla.
- **Qué se espera en su lugar:** Generar el reporte debe producir un **archivo real y descargable** con datos reales. Si la generación demora, el estado "generando" está bien, pero debe terminar en un archivo concreto.
- **Dónde ocurre:** Gestión de Cursos, tarjeta "Reporte Semanal" (y cualquier botón de exportación de reportes).

### 6.D. Módulo Biblioteca (Administración Académica)

**Error 6.D.1 — La biblioteca está bien en su alcance, pero arrastra los errores del resto de los perfiles.**
- **Qué se observa hoy:** La biblioteca de la dirección funciona en su concepto, pero tiene los mismos defectos de biblioteca que los demás perfiles.
- **Qué se espera en su lugar:** Se conserva el alcance, pero deben corregirse los **errores de biblioteca de la sección 2.E** (búsqueda sensible a tildes, filtros que no filtran, descargas que no descargan, etc.).
- **Dónde ocurre:** Biblioteca de la dirección.

### 6.E. Módulo Calendario (Administración Académica)

Esta sección es especialmente importante porque el calendario debe ser una pieza **compartida por todos los perfiles**, pero con permisos de edición diferenciados.

**Error 6.E.1 — El calendario no aparece en los demás perfiles y debería, en modo solo lectura, dentro de Comunidad.**
- **Qué se observa hoy:** El calendario institucional solo lo ven algunos perfiles; a otros (por ejemplo estudiantes y profesores) no les aparece.
- **Qué se espera en su lugar:** El calendario debe **aparecer para los demás perfiles también**, pero **sin poder editarlo** (solo lectura). Además, debe estar ubicado **dentro de Comunidad**. La regla general: el calendario es **visible para todos**, pero **solo algunos pueden editarlo** (ver Error 6.E.9 y el patrón del preceptor 7.B.2).
- **Dónde ocurre:** Ubicación y visibilidad del Calendario.

**Error 6.E.2 — En el calendario no deben aparecer parciales de materias, sino eventos institucionales.**
- **Qué se observa hoy:** El calendario incluye eventos como "Parciales de Matemática 4°B", es decir, evaluaciones de una materia puntual.
- **Qué se espera en su lugar:** En este calendario institucional **no** deben aparecer parciales de materias. Lo que corresponde son eventos que afectan a **toda la institución** (por ejemplo, conferencias, ferias, actos) o cosas que agrega el **Centro de Estudiantes**. Los parciales de una materia son de otro ámbito.
- **Dónde ocurre:** Contenido del Calendario Institucional.

**Error 6.E.3 — Las vistas Mes/Semana deben comportarse como Google Calendar.**
- **Qué se observa hoy:** La vista "Semana" no es una verdadera grilla semanal: reutiliza una lista de agenda. No hay una experiencia real de calendario detallado por mes y por semana.
- **Qué se espera en su lugar:** Las vistas de **mes y semana** deben verse y funcionar como en **Google Calendar**, permitiendo ver el detalle de forma clara (se sugiere estudiar la documentación de Google Calendar como referencia).
- **Dónde ocurre:** Vistas Mes/Semana del Calendario.

**Error 6.E.4 — El tipo de evento no debe estar limitado a cuatro opciones fijas.**
- **Qué se observa hoy:** Al crear un evento, el tipo se elige entre **cuatro opciones fijas** (examen, conferencia, evento, reunión).
- **Qué se espera en su lugar:** El tipo de evento **no** debe estar restringido a cuatro categorías fijas: quien crea el evento (la dirección) debe poder **elegir/definir el tipo de evento** libremente, sin depender de una lista cerrada.
- **Dónde ocurre:** Formulario de nuevo evento del Calendario.

**Error 6.E.5 — La hora de fin no puede ser anterior a la hora de inicio.**
- **Qué se observa hoy:** Al crear un evento con horarios, el formulario **no valida** que la hora de fin sea posterior a la de inicio: se puede poner una hora de fin menor que la de inicio.
- **Qué se espera en su lugar:** El formulario debe **impedir** que la hora de fin sea menor que la de inicio (validación de coherencia horaria).
- **Dónde ocurre:** Formulario de nuevo evento del Calendario.

**Error 6.E.6 — El "módulo de planificación anual sincronizado con el Ministerio" no debe existir.**
- **Qué se observa hoy:** En el calendario aparece una tarjeta que promete un "Módulo de Planificación Anual — Sincronizado con el Ministerio".
- **Qué se espera en su lugar:** Ese módulo **no debe estar**: es inexistente (no hay tal sincronización con el Ministerio). Debe quitarse para no prometer algo que no existe.
- **Dónde ocurre:** Calendario, tarjeta de "Planificación Anual".

**Error 6.E.7 — Los eventos pasados de más de un año deben borrarse automáticamente.**
- **Qué se observa hoy:** No hay ninguna limpieza automática de eventos viejos.
- **Qué se espera en su lugar:** Los eventos que **ya pasaron y tienen más de un año de antigüedad** deben **eliminarse automáticamente** del calendario (no deben seguir apareciendo).
- **Dónde ocurre:** Lógica de mantenimiento del Calendario.

**Error 6.E.8 — El orden debe ser cronológico: primero lo más reciente, luego lo menos reciente.**
- **Qué se observa hoy:** El orden de los eventos no sigue la lógica esperada.
- **Qué se espera en su lugar:** Debe estar **en orden**, mostrando **primero los eventos más recientes y, más abajo, los menos recientes**.
- **Dónde ocurre:** Ordenamiento de eventos del Calendario.

**Error 6.E.9 — El calendario, en general (dirección, preceptor y profesor), está roto: falta la lógica de eventos visibles/editables según perfil.**
- **Qué se observa hoy:** El calendario no distingue quién puede ver qué ni quién puede editar qué. Es el mismo para todos, sin capas de permisos.
- **Qué se espera en su lugar:** Debe existir una lógica **mucho más detallada** de visibilidad y edición: cada perfil puede **agregar tipos de eventos visibles solo para ciertos destinatarios**. Por ejemplo, el **preceptor** puede agregar eventos visibles **solo para su curso**; el **director** puede agregar eventos visibles **para determinados cursos o para todos**. El calendario debe ser **visible para todos los perfiles**, pero **solo algunos podrán editarlo**. Esta regla es la base del comportamiento correcto del calendario en toda la aplicación.
- **Dónde ocurre:** Lógica de permisos del Calendario (transversal: dirección, preceptor, profesor).

**Error 6.E.10 — El calendario está clavado en abril de 2025: siempre abre ahí, "Próximos eventos" queda vacío para siempre y el "hoy" no se ve nunca.** *(detectado en revisión de código)*
- **Qué se observa hoy:** Sin importar la fecha real, el calendario abre siempre en **abril de 2025**. Todos los eventos de ejemplo y los únicos dos feriados cargados viven en ese mes: navegando a cualquier otro mes no hay ni eventos ni feriados. Peor: el panel de "Próximos eventos" sí compara contra la **fecha real de hoy**, y como todos los eventos de ejemplo ya pasaron, ese panel queda **vacío para siempre**. Y el resaltado del día de "hoy" en la grilla no se ve nunca, porque el día real actual no está en abril de 2025.
- **Qué se espera en su lugar:** El calendario debe abrir en el **mes actual real**, los feriados deben existir para todo el año (idealmente desde una fuente real de feriados), y "Próximos eventos" debe mostrar los eventos reales que vienen. La mezcla actual —una parte congelada en 2025 y otra parte mirando la fecha real— debe unificarse en una sola lógica coherente.
- **Dónde ocurre:** Calendario Institucional (mes inicial, feriados, panel "Próximos eventos", resaltado de "hoy").

### 6.F. Módulo Reportes (Administración Académica)

**Error 6.F.1 — Reportes está roto, igual que el panel de administración del sistema.**
- **Qué se observa hoy:** La sección de Reportes reutiliza el mismo panel que el Administrador del sistema y está rota (muestra el panel institucional en lugar de una verdadera herramienta de reportes).
- **Qué se espera en su lugar:** Reportes debe ser una **herramienta de reportes real** para la dirección, distinta del panel del Administrador.
- **Dónde ocurre:** Módulo Reportes.

**Error 6.F.2 — Está bien que Reportes esté acá, pero no debe estar en el otro perfil.**
- **Qué se observa hoy:** La capacidad de reportes aparece mezclada entre este perfil y el del Administrador.
- **Qué se espera en su lugar:** Reportes **corresponde a este perfil (dirección)**, y **no** al del Administrador del sistema. Hay que ubicar cada cosa en su perfil correcto.
- **Dónde ocurre:** Asignación de Reportes por perfil.

**Error 6.F.3 — La generación de reportes debe ser específica, con casillas de selección (checkboxes).**
- **Qué se observa hoy:** No hay una generación de reportes configurable.
- **Qué se espera en su lugar:** La generación de reportes debe ser **específica**, permitiendo elegir con **casillas de selección** qué se incluye en cada reporte.
- **Dónde ocurre:** Generación de reportes.

**Error 6.F.4 — Faltan muchas ventanas y funciones lógicas.**
- **Qué se observa hoy:** El módulo está incompleto: faltan pantallas y funcionalidades.
- **Qué se espera en su lugar:** Deben construirse las **ventanas y funciones lógicas faltantes** para que Reportes sea un módulo completo.
- **Dónde ocurre:** Módulo Reportes.

**Error 6.F.5 — Los expedientes de alumnos deben ser detallados, con casillas de selección, y exportables (incluyendo chats).**
- **Qué se observa hoy:** No existe la posibilidad de armar expedientes detallados de alumnos.
- **Qué se espera en su lugar:** Debe poder **armarse un expediente de cualquier alumno**, detallado y configurable con **casillas de selección**. Un expediente podría incluir, por ejemplo, **todos los chats que tuvo un alumno**, exportables en formato **texto (.txt) o PDF**.
- **Dónde ocurre:** Expedientes de alumnos dentro de Reportes.

---

## 7. Perfil PRECEPTOR/A

El preceptor está a cargo de uno o varios cursos. En su menú tiene: Comunidad, Mi Curso, Chat y Calendario.

### 7.A. Módulo Comunidad / Mi Curso (Preceptor)

**Error 7.A.1 — El preceptor debe poder publicar en la comunidad.**
- **Qué se observa hoy:** El preceptor no tiene la capacidad de publicar; su rol quedó como de solo lectura.
- **Qué se espera en su lugar:** El preceptor debe poder **publicar** (escribir artículos/posteos), dentro de lo que le corresponde (su curso y la comunidad general con sus propios artículos).
- **Dónde ocurre:** Comunidad y comunidad de su curso.

**Error 7.A.2 — El preceptor debe poder borrar.**
- **Qué se observa hoy:** No tiene una acción real de borrado.
- **Qué se espera en su lugar:** El preceptor debe poder **borrar** publicaciones (por ejemplo dentro de la comunidad de su curso, según sus permisos de moderación).
- **Dónde ocurre:** Comunidad de su curso (moderación).

**Error 7.A.3 — "Moderar curso" no funciona; ahí deben aparecer los chats de cada estudiante.**
- **Qué se observa hoy:** El botón "Moderar curso" no hace nada.
- **Qué se espera en su lugar:** "Moderar curso" debe **funcionar** y mostrar los **chats de cada estudiante** y las conversaciones **entre ellos**, para que el preceptor pueda moderar la convivencia del curso.
- **Dónde ocurre:** Mi Curso (moderación) del preceptor.

**Error 7.A.4 — "Asignar nuevo curso" no debe estar (lo hace el director).**
- **Qué se observa hoy:** En la vista de cursos del preceptor aparece un botón "Asignar nuevo curso".
- **Qué se espera en su lugar:** Ese botón **no debe existir** en este perfil: asignar cursos es tarea del director/dirección, no del preceptor.
- **Dónde ocurre:** Vista "Mis Cursos" del preceptor.

**Error 7.A.5 — No existe la comunidad de cada curso, y debería (como grupos de WhatsApp).**
- **Qué se observa hoy:** No hay una comunidad propia por curso; el curso no tiene su espacio de conversación.
- **Qué se espera en su lugar:** Debe existir la **comunidad de cada curso**, funcionando **como grupos de WhatsApp** (un espacio de mensajería/participación por curso), moderado por el preceptor.
- **Dónde ocurre:** Comunidad del curso (inexistente hoy).

### 7.B. Módulo Calendario (Preceptor)

**Error 7.B.1 — El calendario del preceptor es idéntico al de la dirección; debe poder agregar eventos solo para su curso.**
- **Qué se observa hoy:** El preceptor ve el mismo calendario que la Administración Académica, sin distinción.
- **Qué se espera en su lugar:** El preceptor debe poder **agregar eventos, pero solo visibles para su(s) curso(s)**. No debe compartir el mismo nivel de edición que la dirección.
- **Dónde ocurre:** Calendario del preceptor.

**Error 7.B.2 — (Regla general del calendario) Cada perfil agrega eventos con distinta visibilidad; visible para todos, editable por algunos.**
- **Qué se observa hoy:** El calendario del preceptor, del profesor y de la administración está roto porque no distingue visibilidad ni permisos.
- **Qué se espera en su lugar:** Esta es la misma regla del Error 6.E.9, vista desde el preceptor: el calendario debe tener una lógica detallada donde **el preceptor agrega eventos visibles solo para su curso** y **el director agrega eventos visibles para ciertos cursos o para todos**. Debe ser **visible para todos los perfiles** pero **editable solo por algunos**.
- **Dónde ocurre:** Lógica de permisos del Calendario (transversal).

---

## 8. Perfil CENTRO DE ESTUDIANTES

El Centro de Estudiantes tiene: Comunidad, Nuestro Portal y Calendario.

### 8.A. Módulo Comunidad (Centro de Estudiantes)

**Error 8.A.1 — El Centro de Estudiantes debe poder crear debates específicos.**
- **Qué se observa hoy:** No tiene una capacidad diferenciada de crear/gestionar debates.
- **Qué se espera en su lugar:** El Centro de Estudiantes debe poder **crear debates específicos** (y, según la arquitectura, también aprobarlos, moderarlos y eliminarlos), como parte de su rol de representación estudiantil.
- **Dónde ocurre:** Comunidad / gestión de debates del Centro de Estudiantes.

### 8.B. Nuestro Portal (Centro de Estudiantes)

**Error 8.B.1 — Desde el perfil Estudiante no existe el botón de "quejas" que deriva al portal del Centro de Estudiantes.**
- **Qué se observa hoy:** El estudiante no tiene forma de enviar una queja/sugerencia que llegue al portal del Centro de Estudiantes. Ese canal no existe.
- **Qué se espera en su lugar:** Debe existir, desde el perfil del estudiante, un **botón de quejas/sugerencias anónimas** que **derive esas quejas al portal del Centro de Estudiantes** (y a la dirección, según corresponda). Es el origen del sistema de retroalimentación estudiantil.
- **Dónde ocurre:** Perfil Estudiante (canal de quejas) → Portal del Centro de Estudiantes.

**Error 8.B.2 — Los artículos que se escriben en el portal no llegan a ningún lado.**
- **Qué se observa hoy:** Los artículos que publica el Centro de Estudiantes quedan solo en su propia pantalla: **no aparecen en los demás perfiles**.
- **Qué se espera en su lugar:** Los artículos del Centro de Estudiantes deben **circular hacia los demás perfiles** (aparecer en la comunidad correspondiente), no quedar aislados. Se conecta con la nota transversal de la sección 4 (interacción entre perfiles).
- **Dónde ocurre:** Publicación de artículos del Centro de Estudiantes.

**Error 8.B.3 — No se puede crear evento ni crear nuevo artículo.**
- **Qué se observa hoy:** Los botones "Crear evento" y "Nuevo artículo" no abren nada ni guardan nada.
- **Qué se espera en su lugar:** Ambos deben **funcionar**: crear eventos (dentro del límite que define la dirección, por ejemplo 1 a 5 por mes) y crear/publicar artículos reales.
- **Dónde ocurre:** Portal del Centro de Estudiantes.

**Error 8.B.4 — Debe existir la lógica de porcentajes de cómo aumentaron las quejas.**
- **Qué se observa hoy:** Los indicadores de quejas muestran cantidades fijas, sin ninguna medición de evolución.
- **Qué se espera en su lugar:** Debe existir una **lógica real que calcule cómo aumentaron (o disminuyeron) las quejas** en el tiempo, expresada en porcentajes/tendencias, a partir de datos reales.
- **Dónde ocurre:** Panel/estadísticas de quejas del Centro de Estudiantes.

**Error 8.B.5 — Las quejas no vistas deben aparecer arriba de todo.**
- **Qué se observa hoy:** Las quejas no se ordenan priorizando las no leídas.
- **Qué se espera en su lugar:** Las quejas **no vistas** deben ubicarse **arriba de todo**, para que lo pendiente de leer tenga prioridad visual.
- **Dónde ocurre:** Lista de quejas del Centro de Estudiantes (y de la dirección).

### 8.C. Módulo Calendario (Centro de Estudiantes)

**Error 8.C.1 — El calendario del Centro de Estudiantes no debe ser igual al de los demás perfiles.**
- **Qué se observa hoy:** El Centro de Estudiantes ve el mismo calendario genérico que otros perfiles.
- **Qué se espera en su lugar:** El Centro de Estudiantes debe tener su **calendario propio** de actividades (asambleas, talleres, eventos), **editable por ellos** dentro de sus límites y **visible para toda la comunidad**, pero **diferenciado** del calendario institucional general. No debe comportarse igual que el del resto.
- **Dónde ocurre:** Calendario del Centro de Estudiantes.

---

## 9. Perfil BIBLIOTECARIO/A

El bibliotecario tiene: Inicio, Cola de Revisión, Comunidad, Chat y Notificaciones.

### 9.A. Inicio (Bibliotecario)

**Error 9.A.1 — No se puede ir a la Cola de Revisión.**
- **Qué se observa hoy:** Al intentar ir a "Cola de Revisión", no se llega a una verdadera cola: termina llevando al mismo panel de inicio. El acceso a la cola no funciona.
- **Qué se espera en su lugar:** Debe existir una **pantalla real de Cola de Revisión** y el acceso desde el inicio debe **llevar ahí** correctamente.
- **Dónde ocurre:** Inicio del Bibliotecario / navegación a Cola de Revisión.

**Error 9.A.2 — Debe existir una lógica detrás de la cola de revisión (hoy es inexistente).**
- **Qué se observa hoy:** La cola de revisión muestra unos elementos de ejemplo, pero no hay ninguna lógica: no se puede revisar, aprobar ni rechazar de verdad.
- **Qué se espera en su lugar:** Debe construirse la **lógica completa de la cola de revisión**, con orden **por llegada (primero en entrar, primero en revisarse)**, y acciones reales de **aceptar** (mover a la biblioteca institucional y/o nacional) o **rechazar** (con aviso al que lo presentó).
- **Dónde ocurre:** Cola de Revisión del Bibliotecario.

**Error 9.A.3 — La biblioteca del bibliotecario es completamente diferente a la del resto de los perfiles.**
- **Qué se observa hoy:** La biblioteca que ve el bibliotecario tiene una estructura totalmente distinta de la que ven los demás perfiles, lo que rompe la coherencia.
- **Qué se espera en su lugar:** Debe unificarse el criterio para que la experiencia de biblioteca sea **coherente entre perfiles** (reutilizando las mismas piezas comunes, sección 1.4), respetando las capacidades extra del bibliotecario, pero sin que sea "otra aplicación".
- **Dónde ocurre:** Biblioteca del Bibliotecario.

**Error 9.A.4 — La creación de recursos no existe, y en todos los perfiles debe ser compleja y flexible.**
- **Qué se observa hoy:** No existe un flujo real para crear/subir recursos.
- **Qué se espera en su lugar:** La **creación de recursos** debe existir y ser **compleja** en todos los perfiles. Además debe ser **flexible en cuanto a la temática**: un recurso puede tratar de algo que **no** está atado a ninguna materia de la escuela (por ejemplo, un recurso de negocios o de inversiones que no corresponde a ninguna materia), y eso **está bien**. La categorización **no** debe ser fija/obligatoria. (Se aclara que esto último es una idea/orientación, no una regla cerrada.)
- **Dónde ocurre:** Creación de recursos (todos los perfiles, especialmente Bibliotecario).

### 9.B. Cola de Revisión (Bibliotecario)

**Error 9.B.1 — La Cola de Revisión no funciona.**
- **Qué se observa hoy:** La sección no ejecuta ninguna acción real (revisar un elemento no hace nada).
- **Qué se espera en su lugar:** La Cola de Revisión debe **funcionar** por completo, según la lógica descrita en el Error 9.A.2. Además, el bibliotecario debe poder decidir si los recursos aceptados quedan **privados (institucionales)** o **públicos (nacionales)**.
- **Dónde ocurre:** Cola de Revisión del Bibliotecario.

### 9.C. Comunidad (Bibliotecario)

**Error 9.C.1 — La Comunidad tiene los mismos errores que en el resto de los perfiles.**
- **Qué se observa hoy:** Misma comunidad, mismos defectos.
- **Qué se espera en su lugar:** Corregir los **errores de la sección 2.B**, con el alcance del bibliotecario (que gestiona sus propios artículos).
- **Dónde ocurre:** Módulo Comunidad (compartido).

### 9.D. Notificaciones (Bibliotecario)

**Error 9.D.1 — Notificaciones no funciona.**
- **Qué se observa hoy:** La opción "Notificaciones" del menú no lleva a ninguna pantalla (no hay una sección de notificaciones construida).
- **Qué se espera en su lugar:** Debe existir una **sección de Notificaciones real y funcional** para el bibliotecario.
- **Dónde ocurre:** Menú lateral del Bibliotecario, opción Notificaciones.

**Error 9.D.2 — La biblioteca nacional e institucional debe ser otro módulo en el menú lateral (exclusivo del bibliotecario).**
- **Qué se observa hoy:** El acceso a la biblioteca nacional e institucional no está bien separado como módulo propio en la navegación del bibliotecario.
- **Qué se espera en su lugar:** Debe existir un **módulo aparte en el menú lateral** para la **biblioteca nacional e institucional**, **solo para el bibliotecario**, como una sección diferenciada de su panel.
- **Dónde ocurre:** Menú lateral del Bibliotecario.

---

## 10. Perfil FAMILIA

La familia tiene: Comunicados, Calendario y Chat.

### 10.A. Módulo Comunicados (Familia)

**Error 10.A.1 — Los comunicados deben ser más simples, como un chat con el preceptor por WhatsApp.**
- **Qué se observa hoy:** Los comunicados se presentan como tarjetas/artículos, con un formato relativamente formal.
- **Qué se espera en su lugar:** Los comunicados deben ser **más simples**, con una lógica parecida a la de **chatear con el preceptor por WhatsApp**: algo directo, conversacional y liviano.
- **Dónde ocurre:** Módulo Comunicados de la Familia.

**Error 10.A.2 — Debe poder responderse por privado al preceptor, sin que otras familias lo vean.**
- **Qué se observa hoy:** No hay forma de responder de manera privada a un comunicado.
- **Qué se espera en su lugar:** Debe existir la posibilidad de **responder en privado al preceptor**: si un padre escribe, **otro padre no debe ver** lo que ese padre escribió. Cada conversación familia–preceptor es privada.
- **Dónde ocurre:** Comunicados / respuesta privada de la Familia.

**Error 10.A.3 — No se pueden abrir las tarjetas de cada comunicado por separado, ni hay aviso de no leídos en el menú (el "1" rojo estilo WhatsApp).**
- **Qué se observa hoy:** No se puede abrir cada comunicado individualmente en su propia vista. Además, cuando hay un comunicado sin leer, **no aparece en el menú lateral** un indicador (como el globito "1" rojo de WhatsApp cuando llega un mensaje).
- **Qué se espera en su lugar:** Cada comunicado debe poder **abrirse por separado** en su detalle, y cuando haya comunicados sin leer, el menú lateral debe mostrar un **indicador rojo con el número** de no leídos, igual que en WhatsApp.
- **Dónde ocurre:** Comunicados de la Familia y menú lateral.

### 10.B. Módulo Calendario (Familia)

**Error 10.B.1 — El calendario está con fallas: la familia no debe poder editarlo.**
- **Qué se observa hoy:** El calendario de la familia presenta comportamientos incorrectos (está "bugueado").
- **Qué se espera en su lugar:** La familia debe ver el calendario **solo en lectura**: **no tiene por qué editar** el calendario. Debe quedar claramente en modo consulta.
- **Dónde ocurre:** Calendario de la Familia.

**Error 10.B.2 — Tiene los mismos errores que el resto de los calendarios.**
- **Qué se observa hoy:** Arrastra los defectos generales del calendario.
- **Qué se espera en su lugar:** Deben corregirse los **errores de calendario descritos en la sección 6.E**, aplicados al caso de la familia (visualización, orden, tipos de evento, etc.).
- **Dónde ocurre:** Calendario de la Familia.

**Error 10.B.3 — Debe ver solo lo que le corresponde al curso de su hijo, con un calendario diferenciado.**
- **Qué se observa hoy:** La familia ve un calendario genérico, no acotado al curso de su hijo/a.
- **Qué se espera en su lugar:** La familia debe ver **solo las cosas que le corresponden al curso de su hijo/a**, no las de otros cursos. Debe ser un **calendario diferenciado**, alineado con el de sus hijos.
- **Dónde ocurre:** Calendario de la Familia (filtrado por curso).

**Error 10.B.4 — El calendario debe tener una capa especial que los alumnos no ven, con reglas de visibilidad familia/alumno.**
- **Qué se observa hoy:** No existe una diferenciación de visibilidad entre lo que ve la familia y lo que ve el alumno.
- **Qué se espera en su lugar:** El calendario debe tener una **función especial que los alumnos no pueden ver**, para cosas que se suben **solo para la familia**. Reglas concretas:
  - Una **cita con los padres de un alumno puntual** (por ejemplo, "cita con los padres de Pepito") **solo la ven los padres de ese alumno**.
  - Una **cita con los padres en general** la ven **todos los padres, pero no los alumnos**.
  - Un evento como **"examen de Biología"** sí lo pueden ver las familias (para saber que su hijo tiene un examen), y también los alumnos.
  Es decir, se necesitan niveles de visibilidad: solo una familia, todas las familias, o familias + alumnos.
- **Dónde ocurre:** Lógica de visibilidad del Calendario para Familia y Alumno.

**Error 10.B.5 — El calendario especial para la familia existe construido, pero es una pantalla fantasma: nadie puede llegar a él.** *(detectado en revisión de código)*
- **Qué se observa hoy:** Dentro del código de la aplicación existe una pantalla de calendario **hecha especialmente para la familia** (con su grilla mensual propia, leyenda de colores y tarjetas de evento pensadas para padres). Sin embargo, el botón "Calendario" del menú de la familia lleva al **calendario institucional genérico** (el mismo de la dirección), y **ninguna ruta de la aplicación** conduce a la pantalla familiar: quedó construida y desconectada, invisible para cualquier usuario. Se trabajó dos veces el mismo calendario y se enchufó el equivocado.
- **Qué se espera en su lugar:** Decidir cuál de las dos versiones vale (según los Errores 10.B.3 y 10.B.4, la correcta es la **diferenciada para la familia**) y conectar el menú a esa pantalla, eliminando o reciclando la otra para no mantener dos calendarios en paralelo (principio de la sección 1.4).
- **Dónde ocurre:** Menú lateral de la Familia (botón "Calendario") y pantalla de calendario familiar sin conectar.

### 10.C. Módulo Chat (Familia)

**Error 10.C.1 — El chat no funciona y es igual al del resto.**
- **Qué se observa hoy:** El chat de la familia es el mismo que el de los demás perfiles y arrastra sus defectos (buscador que no busca, botón de llamar que no debería estar, adjuntar archivo que no funciona).
- **Qué se espera en su lugar:** Deben corregirse los **errores de chat de la sección 2.F**, adaptados al caso de la familia (que conversa con el preceptor y con la institución).
- **Dónde ocurre:** Módulo Chat (compartido).

**Error 10.C.2 — El chat especial para la familia también existe construido y también es una pantalla fantasma.** *(detectado en revisión de código)*
- **Qué se observa hoy:** Igual que con el calendario (Error 10.B.5): en el código existe una pantalla de chat **hecha especialmente para la familia** (con su propia lista de conversaciones y ventana adaptada), pero el botón "Chat" del menú de la familia lleva al **chat genérico** que comparten todos los perfiles. Ninguna ruta de la aplicación llega a la versión familiar: es una segunda pantalla fantasma, construida y nunca conectada.
- **Qué se espera en su lugar:** Decidir cuál versión vale, conectarla desde el menú y eliminar la duplicada. Si el chat de la familia debe ser distinto (conversaciones solo con el preceptor y la institución, ver Error 10.C.1), esa lógica debe vivir en el **componente compartido** con configuración por perfil, no en una copia paralela (sección 1.4).
- **Dónde ocurre:** Menú lateral de la Familia (botón "Chat") y pantalla de chat familiar sin conectar.

---

## 11. Resumen de temas transversales (para que la IA lectora priorice)

Muchos errores individuales son manifestaciones de unos pocos problemas de fondo. Agruparlos ayuda a planificar la reforma:

1. **Falta de lógica real / botones que no hacen nada.** Gran parte de la aplicación es apariencia sin funcionamiento. Aplica a: ver detalle, descargar, presentar recurso, filtrar, moderar, asignar, gestionar debates, menús de tres puntos, colas de revisión, notificaciones, etc.

2. **Datos inventados y fijos en lugar de datos reales.** Métricas, listas y estadísticas están escritas a mano. Por eso "salen de cualquier lado", se repiten entre perfiles y no reflejan la realidad. Hay que conectar todo a datos reales y persistentes.

3. **Falta de interacción entre perfiles.** Lo que hace un perfil no llega a los demás (artículos, quejas, comunicados, aprobaciones, tokens temporales). Hay que construir esa circulación con permisos.

4. **Duplicación de piezas en lugar de componentes compartidos.** Cada vista reinventa el debate, la tendencia, el menú de tres puntos, el calendario, la tarjeta de recurso. Hay que centralizarlos en una carpeta común y reutilizarlos (esquema tipo monorepo). Esto también arregla la incoherencia de tono y los problemas de navegación entre pestañas.

5. **Sistema de comunidad mal modelado.** Corazones/"me gusta" en vez de votos positivos/negativos; sin comentarios; sin vistas de detalle; tendencias sin lógica; participación sin sentido; menús de acciones ausentes o inertes.

6. **Calendario sin capas de permisos.** Debe ser visible para todos y editable solo por algunos, con eventos de visibilidad diferenciada por perfil y por curso (dirección, preceptor, profesor, centro de estudiantes, familia), más limpieza automática de eventos viejos y orden cronológico.

7. **Aula virtual sin maquinaria real.** No hay videollamada, transmisión, pizarra compartida, lista de conectados, planificación de clases ni chat real. Está toda la apariencia, falta todo el motor.

8. **IA inexistente.** Donde se promete IA (asistencia, alertas, métodos de estudio) hay respuestas simuladas. Debe construirse una integración real y configurable. En cambio, donde se pide "inteligencia sin IA" (resumen semanal, próximo hito, alerta de ritmo), deben usarse **algoritmos con reglas y umbrales**, no IA.

9. **Confusión de roles Administrador vs. Dirección.** El perfil del equipo que opera la plataforma está mezclado con el de la dirección del colegio, mostrando datos escolares sensibles que no le corresponden. Hay que separar tajantemente ambos alcances.

10. **Biblioteca incompleta.** Búsqueda sensible a tildes, filtros que no filtran, descargas y guías que no abren, botones duplicados, cola de revisión sin lógica, y falta el camino "institucional aprobado → nacional".

11. **Plataforma sin memoria, sin direcciones y sin cuentas reales.** Recargar la página cierra la sesión y borra todo, el botón "atrás" del navegador saca de la aplicación, ninguna sección tiene dirección propia, y solo existen ocho cuentas fijas con la misma contraseña. Ver la sección 12 completa.

12. **La demostración se contradice a sí misma.** Los datos de ejemplo cuentan historias incompatibles entre pantallas: notas distintas para el mismo trabajo, docentes que cambian de nombre y de materia, tres tamaños de escuela diferentes, preceptores que se pisan entre sí. Ver la sección 13 completa.

---

## 12. Errores de plataforma, sesión y cuentas (transversales)

> Toda esta sección proviene de la **revisión de código**. Son problemas que no pertenecen a un perfil ni a un módulo puntual, sino a la base sobre la que está montada toda la aplicación. Son especialmente importantes porque afectan a **todos los usuarios en todas las pantallas**, y porque varios de ellos explican comportamientos que a primera vista parecen errores sueltos.

**Error 12.1 — Recargar la página cierra la sesión y borra absolutamente todo.**
- **Qué se observa hoy:** Si el usuario aprieta F5 (o el navegador recarga solo la pestaña), la aplicación vuelve a la pantalla de inicio de sesión como si nunca hubiera entrado. Todo lo que había hecho —hábitos marcados, mensajes enviados, eventos creados, perfiles dados de alta— desaparece sin aviso.
- **Qué se espera en su lugar:** La sesión debe **sobrevivir a la recarga** (el usuario sigue logueado donde estaba) y el trabajo hecho debe estar **guardado de verdad**, no en la memoria momentánea de la pestaña.
- **Dónde ocurre:** Toda la aplicación.

**Error 12.2 — El botón "Atrás" del navegador no funciona con la aplicación: en vez de volver a la pantalla anterior, saca al usuario del sitio.**
- **Qué se observa hoy:** Navegar dentro de NEXO no queda registrado en el historial del navegador. Si el usuario aprieta "Atrás" esperando volver de Debates al Feed, el navegador lo saca **directamente de NEXO** (a la página en la que estaba antes de entrar). "Adelante" tampoco funciona.
- **Qué se espera en su lugar:** El botón "Atrás" y "Adelante" del navegador deben comportarse como en cualquier sitio: moverse por las pantallas visitadas dentro de la aplicación.
- **Dónde ocurre:** Toda la aplicación (navegación interna).

**Error 12.3 — Ninguna sección tiene dirección propia: no se puede guardar, compartir ni volver a un enlace.**
- **Qué se observa hoy:** La dirección que se ve en el navegador es siempre la misma, esté el usuario donde esté. Consecuencias concretas: no se puede **guardar como favorito** una sección, no se puede **compartir un enlace** ("mirá este debate"), y no se puede abrir la aplicación directamente en una pantalla puntual. Este error es la causa de fondo del 12.1 y el 12.2.
- **Qué se espera en su lugar:** Cada pantalla debe tener su **dirección propia** (por ejemplo `/comunidad/debates`), de modo que recargar, compartir y navegar con el historial funcione con normalidad.
- **Dónde ocurre:** Toda la aplicación.

**Error 12.4 — Solo existen ocho cuentas fijas, todas con la misma contraseña, escritas adentro del propio programa.**
- **Qué se observa hoy:** La aplicación tiene exactamente **ocho usuarios posibles** (uno por rol: estudiante@nexo.edu, profesor@nexo.edu, etc.), todos con la **misma contraseña**, y esa lista viaja **dentro del código que se descarga al navegador**: cualquier persona con conocimientos mínimos puede leer todas las cuentas y contraseñas. No existen usuarios reales: todos los estudiantes del colegio serían "Julieta Rossi". Esto explica por qué crear perfiles desde la dirección no sirve para entrar (Error 6.B.3).
- **Qué se espera en su lugar:** Un sistema de cuentas **real**: usuarios individuales creados por la institución, contraseñas propias y secretas (guardadas de forma segura en un servidor, nunca dentro de la aplicación), y validación del lado del servidor.
- **Dónde ocurre:** Inicio de sesión y base de usuarios de toda la plataforma.

**Error 12.5 — "Olvidé mi contraseña" y "¿Problemas para ingresar?" no hacen nada, y no existe forma de cambiar la contraseña.**
- **Qué se observa hoy:** En la pantalla de inicio de sesión, el enlace "Olvidé mi contraseña" no produce ningún efecto visible, y "¿Problemas para ingresar?" es un enlace vacío que no lleva a ningún lado. Una vez adentro, tampoco existe ninguna pantalla para cambiar la contraseña (se conecta con el Error 2.A.1: no hay configuración de cuenta en ningún perfil).
- **Qué se espera en su lugar:** Un flujo real de **recuperación de contraseña**, una página de **ayuda de acceso**, y la posibilidad de **cambiar la contraseña** desde la configuración del perfil.
- **Dónde ocurre:** Pantalla de inicio de sesión y configuración de cuenta (inexistente).

**Error 12.6 — Cuando alguien intenta entrar a una sección sin permiso, la aplicación lo "teletransporta" a su inicio sin ninguna explicación.**
- **Qué se observa hoy:** Si un usuario toca algo que lleva a una pantalla que su rol no puede ver, la aplicación lo manda en silencio a su pantalla de inicio. No aparece ningún mensaje: el usuario toca un botón y aparece en otro lado sin entender por qué, como si la aplicación estuviera fallada.
- **Qué se espera en su lugar:** Si una acción no está permitida para un rol, o bien **no se le muestra el botón**, o bien se le explica con un mensaje claro ("No tenés permiso para ver esta sección"). Nunca un salto mudo.
- **Dónde ocurre:** Control de acceso de toda la navegación.

**Error 12.7 — El menú lateral puede marcar dos secciones como activas a la vez (o ninguna).**
- **Qué se observa hoy:** El resaltado del menú se decide comparando cómo **empieza** el nombre interno de la ruta, y eso produce errores visibles: cuando el profesor está en el Aula Virtual, se iluminan a la vez "Aula Virtual" **y** "Mi Portafolio"; cuando la dirección está en el Calendario, se iluminan "Calendario" **y** "Comunidad"; y cuando el estudiante pasa de Mis Tareas a Mis Cursos, el ítem "Portafolio" directamente **se apaga**, como si no estuviera en ninguna sección.
- **Qué se espera en su lugar:** El menú debe marcar **exactamente una** sección activa: la que corresponde a la pantalla que el usuario está viendo, siempre.
- **Dónde ocurre:** Menú lateral (todos los perfiles).

**Error 12.8 — Los botones cuya ruta no existe fallan en silencio total.**
- **Qué se observa hoy:** Cuando un botón apunta a una pantalla que no está registrada en el mapa interno de navegación, al presionarlo **no pasa nada de nada**: la aplicación solo deja una anotación técnica invisible para el usuario. Este es el mecanismo escondido detrás de varios "botones muertos" del informe (por ejemplo, "Notificaciones" del bibliotecario, Error 9.D.1: su ruta directamente no existe en el mapa).
- **Qué se espera en su lugar:** No deberían existir botones que apunten a rutas inexistentes. Mientras se reconstruye, cualquier destino faltante debería mostrar al menos un aviso visible ("Esta sección está en construcción"), nunca silencio.
- **Dónde ocurre:** Núcleo de navegación (afecta a botones de varios perfiles).

---

## 13. Los datos de ejemplo se contradicen entre pantallas (transversal)

> Toda esta sección proviene de la **revisión de código**. Ya se dijo que los datos son inventados y fijos (tema transversal 2). Lo que se documenta acá es algo más específico y más grave para la credibilidad de la demostración: **las distintas pantallas cuentan historias incompatibles entre sí**, porque cada una trae su propia copia de los datos de ejemplo y nadie las mantuvo coherentes. Es la consecuencia directa de la duplicación de piezas (sección 1.4) aplicada a los datos. Estos casos concretos sirven de guía para la reconstrucción: con una única fuente de datos real, todos deben desaparecer.

**Error 13.1 — El mismo trabajo tiene dos notas distintas según la pantalla.**
- **Qué se observa hoy:** En Mis Tareas, el trabajo de Biología ("Células Procariontes") figura entregado **con nota 9,5**. En Calificaciones, ese mismo trabajo ("Células procariotas") figura **con nota 8,0**. Además, Calificaciones muestra un 9,5 en **Matemática** con una devolución elogiosa, pero en Mis Tareas la única tarea de Matemática está **pendiente, sin entregar**: hay nota para un trabajo que nunca se entregó. Y el ensayo de Lengua figura "Entregado ayer" en Calificaciones, mientras en Mis Tareas está "En progreso", sin entregar.
- **Qué se espera en su lugar:** Tareas y Calificaciones deben leer **la misma información**: una entrega y su nota existen una sola vez, y todas las pantallas muestran lo mismo.
- **Dónde ocurre:** Mis Tareas vs. Calificaciones (Estudiante).

**Error 13.2 — Los docentes cambian de nombre y de materia según la pantalla.**
- **Qué se observa hoy:** El profesor de Matemática es **"Prof. García"** en el inicio de sesión, en el chat y en Gestión de Perfiles, pero la tarea de Matemática en Mis Tareas la asigna un **"Prof. Gómez"** que no existe en ningún otro lado. **"Prof. Méndez"** da Lengua según Mis Tareas, pero figura con "Cátedra de Biología" en Gestión de Perfiles. La tarea de Biología es de un **"Prof. López"** que no aparece en la lista de perfiles de la institución. Y la tarea de Historia la asigna "Prof. García" (¿el de Matemática?), cuando el profesor de Historia en Gestión de Perfiles es "Prof. Lombardi".
- **Qué se espera en su lugar:** Cada docente debe existir **una sola vez** (nombre, materia, cursos) y toda pantalla que lo nombre debe tomar el dato de esa única fuente.
- **Dónde ocurre:** Mis Tareas, Chat, Gestión de Perfiles, Calificaciones.

**Error 13.3 — La escuela tiene tres tamaños distintos según qué pantalla administrativa se mire.**
- **Qué se observa hoy:** El Panel Principal dice **342 estudiantes activos y 28 docentes**. Gestión de Cursos suma **105 inscripciones** (sus cuatro cursos) y dice **86 docentes**, además de calcular las "aulas" multiplicando cursos por seis (4 cursos = 24 aulas, un número sin sentido, ya señalado en el Error 6.C.3). Gestión de Perfiles, que debería listar a toda la comunidad, conoce **4 estudiantes y 3 profesores** en total. Tres pantallas de la misma dirección describen tres escuelas incompatibles.
- **Qué se espera en su lugar:** Un único padrón real de personas y cursos del que **todas** las métricas se deriven. Si el panel dice 342 estudiantes, la lista de perfiles debe poder mostrarlos.
- **Dónde ocurre:** Panel Principal, Gestión de Cursos y Gestión de Perfiles (Dirección).

**Error 13.4 — Los preceptores y los cursos se contradicen entre la dirección y el preceptor.**
- **Qué se observa hoy:** Para Gestión de Cursos (dirección), 4°B está a cargo de la **"Preceptora Martínez"** y tiene **30** estudiantes, y 3°B está **sin preceptor** con **22** estudiantes. Para la vista del preceptor logueado (**Carlos Pereyra**), 4°B es suyo y tiene **28** estudiantes, y 3°B también es suyo con **30** estudiantes. Ningún curso coincide ni en responsable ni en cantidad de alumnos. De paso: Carlos Pereyra —el preceptor con el que se puede iniciar sesión, y que firma comunicados a las familias— **no existe** en Gestión de Perfiles.
- **Qué se espera en su lugar:** La asignación preceptor–curso debe ser **una sola** (la que define la dirección, ver Error 7.A.4) y la vista del preceptor debe leerla de ahí, junto con las cantidades reales de estudiantes.
- **Dónde ocurre:** Gestión de Cursos (Dirección) vs. Mis Cursos (Preceptor) vs. Gestión de Perfiles.

**Error 13.5 — Los hábitos del Dashboard y los de la sección Hábitos no son los mismos.**
- **Qué se observa hoy:** El Dashboard de Objetivos muestra **3 hábitos** ("Lectura diaria" con racha 7, "Repaso de notas" sin cumplir hoy, "Meditación"); la sección Hábitos muestra **4** (aparece "Ejercicio físico" con racha 12, que el Dashboard no conoce), "Lectura diaria" tiene racha **8** en vez de 7, y "Repaso de notas" figura **cumplido hoy**. Marcar un hábito en una pantalla **no cambia nada** en la otra. Encima, dos hábitos se contradicen a sí mismos: figuran "cumplidos hoy" pero su propio historial de los últimos diez días muestra el día de hoy **sin cumplir**. Todo esto es la evidencia concreta del Error 2.D.1 ("Mis rachas" desconectada de Hábitos).
- **Qué se espera en su lugar:** Una **única lista de hábitos** con su historial, que el Dashboard resuma y la sección Hábitos gestione; marcar un hábito en cualquier lado debe verse reflejado en todos lados, al instante.
- **Dónde ocurre:** Dashboard de Objetivos vs. sección Hábitos (Estudiante).

**Error 13.6 — La misma fecha significa cosas distintas según la pantalla, porque hay dos calculadores de fechas duplicados.**
- **Qué se observa hoy:** Mis Tareas y Mis Metas usan cada una **su propia copia** de la lógica que convierte "15 ABR" en días restantes, y las copias se comportan distinto: en Tareas, una fecha pasada se marca **vencida**; en Metas, la misma fecha pasada salta al año siguiente y muestra que **faltan cientos de días** (Error 2.D.14). El usuario ve la misma fecha con dos veredictos opuestos según la pantalla.
- **Qué se espera en su lugar:** Un **único** módulo compartido de manejo de fechas para toda la aplicación (principio de la sección 1.4), con un comportamiento definido y coherente para las fechas vencidas.
- **Dónde ocurre:** Mis Tareas vs. Mis Metas (y cualquier otra pantalla que calcule vencimientos).

**Error 13.7 — El año lectivo está congelado en 2025 en toda la aplicación.**
- **Qué se observa hoy:** Los textos "Ciclo 2025", "Familia · Ciclo 2025", "Colegio San Martín — Ciclo 2025" y "Misión Académica 2025" están escritos a mano en distintas pantallas y menús. La aplicación va a seguir diciendo "Ciclo 2025" dentro de cinco años. Se conecta con el calendario clavado en abril de 2025 (Error 6.E.10).
- **Qué se espera en su lugar:** El ciclo lectivo debe ser un **dato real de la institución** (configurado por la dirección o derivado de la fecha), mostrado desde una única fuente, nunca texto fijo repetido en cada pantalla.
- **Dónde ocurre:** Encabezados y menús de varios perfiles (Estudiante, Familia, Preceptor, Dirección, Administrador).

---

## 14. Especificación funcional: la lógica que debe existir detrás de cada función nueva o a arreglar

> Hasta acá el documento describe **qué está mal**. Esta sección describe **cómo debe funcionar cada cosa por dentro** cuando se reconstruya. Está pensada como guía de diseño para la IA que haga la reforma: para cada función se explica el concepto, la lógica paso a paso, las reglas que hay que respetar y **dónde se guarda cada cosa** en la base de datos local que acompaña a este documento (carpeta `base-de-datos/`, ver su `README.md`). Los nombres entre comillas simples tipo `tabla` refieren a tablas de esa base.

### 14.1. Cuentas, sesión y navegación (la base de todo lo demás)

**Concepto.** Hoy la aplicación tiene ocho cuentas de juguete escritas adentro del programa (Error 12.4) y una navegación que no usa direcciones (Errores 12.1 a 12.3). Antes de construir cualquier otra función, hay que instalar esta base, porque todas las demás dependen de "saber quién sos" y "poder volver a donde estabas".

**Lógica paso a paso.**
1. Las personas reales viven en la tabla `usuarios`: cada una con su institución, su correo, su **contraseña guardada de forma cifrada** (nunca el texto real) y su rol. Las cuentas las crea la dirección desde Gestión de Perfiles (Error 6.B.3): al dar de alta un perfil se crea el usuario y se le genera una contraseña inicial que la institución le entrega.
2. Al iniciar sesión, la aplicación manda correo y contraseña al servidor; el servidor compara contra lo guardado y, si coincide, crea una fila en `sesiones` con un **token** (una llave larga al azar) y una fecha de vencimiento. El navegador guarda esa llave.
3. En cada pedido posterior ("dame mis tareas", "mandá este mensaje"), la aplicación acompaña la llave; el servidor busca la sesión, sabe quién es el usuario y **qué rol tiene**, y decide si puede hacer lo que pide. Los permisos se controlan **en el servidor**, no en la pantalla: esconder un botón no alcanza.
4. Al recargar la página, la aplicación encuentra la llave guardada, le pregunta al servidor "¿esta sesión sigue viva?" y, si sí, entra directo a donde estaba. Eso resuelve el Error 12.1.
5. Cada pantalla tiene su **dirección propia** (`/comunidad/debates`, `/portafolio/mis-tareas`, etc.) usando un enrutador real. Con eso el botón "Atrás" del navegador, los favoritos y los enlaces compartidos funcionan solos (Errores 12.2 y 12.3).
6. "Olvidé mi contraseña" genera un código de un solo uso, lo registra, y permite definir una contraseña nueva. Cambiar la contraseña desde la configuración del perfil hace lo mismo pero pidiendo primero la contraseña actual.

**Reglas.** Un correo = un usuario. Las sesiones vencen y se renuevan. Si el rol no puede ver una pantalla, el servidor responde "no autorizado" y la aplicación muestra un mensaje claro (Error 12.6), nunca un salto mudo.

### 14.2. Chat (mensajería entre perfiles)

**Concepto.** El chat es una **conversación persistente entre dos o más usuarios**, con no-leídos reales, adjuntos y moderación del preceptor. Hoy nada de eso existe (Errores 2.F.1 a 2.F.6).

**Lógica paso a paso.**
1. Una conversación es una fila en `conversaciones` (tipo "directa" entre dos personas, "grupo-curso" para la comunidad de un curso, o "clase" para el chat de una clase en vivo). Quiénes participan vive en `conversacion_miembros`; cada mensaje es una fila en `mensajes` con su autor, su texto, su hora y —si corresponde— su archivo adjunto.
2. **Enviar un mensaje**: la aplicación lo manda al servidor; el servidor lo guarda en `mensajes` y avisa a los demás miembros. El aviso llega por dos caminos: si el destinatario tiene la aplicación abierta, por una **conexión permanente** (el navegador mantiene un "tubo" abierto con el servidor y los mensajes nuevos entran solos, sin recargar); si no la tiene abierta, queda una notificación pendiente (ver 14.15).
3. **No leídos**: cada miembro tiene en `conversacion_miembros` la marca de **hasta cuándo leyó** (`ultimo_leido_en`). La cantidad de no leídos es "mensajes posteriores a esa marca". **Abrir la conversación actualiza la marca** — eso arregla el Error 2.F.5 — y el globito del menú lateral suma los no leídos de todas las conversaciones.
4. **Adjuntos**: el clip abre el selector de archivos; el archivo se sube al servidor, queda registrado en `archivos` y el mensaje lo referencia. El receptor lo descarga desde ahí.
5. **El buscador de conversaciones** filtra sobre los nombres de los miembros y el contenido de los últimos mensajes, sin distinguir mayúsculas ni tildes (misma normalización que la biblioteca, ver 14.11).
6. **Moderación del preceptor** (Error 7.A.3): las conversaciones entre estudiantes de su curso son visibles para el preceptor desde "Moderar curso" (regla de convivencia conocida por todos). Las conversaciones familia–preceptor y familia–dirección son privadas entre sus miembros.
7. **Sin llamadas**: el chat no tiene botón de llamar (Error 2.F.2); la voz y el video viven solamente en el aula virtual (14.3).

### 14.3. Videollamadas y Aula Virtual (la función más compleja)

**Concepto.** El aula virtual es una **clase en vivo**: video y audio del docente, pizarra digital que maneja el docente, alumnos que ven, preguntan y marcan cuánto entienden, y una trayectoria de etapas que ordena la clase. Hoy es solo un decorado (Errores 2.C.1, 3.B.1 a 3.B.12).

**Cómo funciona una videollamada por dentro (explicado simple).** Una videollamada tiene dos partes:
- La **señalización**: una "central telefónica" que presenta a los participantes entre sí ("Julieta entró a la sala 4B-Matemática, estas son sus señas para conectarse"). Es el mismo tipo de conexión permanente del chat.
- El **viaje del video y el audio**: una vez presentados, los navegadores se conectan usando la tecnología estándar de los navegadores para video en vivo (WebRTC). Con pocas personas los videos viajan directo entre navegadores; con un curso entero conviene un **servidor repetidor** que recibe el video una vez y lo reparte a todos.

**Recomendación práctica.** No conviene construir esa maquinaria desde cero: existen motores de videollamada listos para incrustar (por ejemplo Jitsi Meet, que es gratuito y de código abierto, o servicios como LiveKit). La lógica propia de NEXO —planificación, trayectoria, pulso, pizarra, permisos— sí es nuestra y se construye alrededor del motor.

**Lógica paso a paso.**
1. **Planificación** (Errores 3.B.9 y 3.B.10): el docente crea una clase en `clases_planificadas` (curso y materia, título, fecha y hora, objetivos, materiales) y define sus **etapas** en `clase_etapas` ("Repaso", "Tema nuevo", "Ejercicios", con duración estimada). La lista de clases planificadas se ve en su portafolio; cuando llega la fecha, la clase muestra el botón "Iniciar" y un clic abre la sala.
2. **Sala en vivo**: al iniciar, la clase pasa a estado "en vivo". Cada estudiante que entra queda registrado en `clase_asistencias` (hora de entrada y salida): con eso el docente ve **la lista nominal de conectados**, no un número (Error 3.B.11).
3. **Pizarra digital** (Error 2.C.1): es un lienzo de dibujo cuyo contenido **solo el docente puede modificar** desde su portafolio; cada trazo se transmite por la conexión permanente y los estudiantes lo ven reproducirse en vivo. El estado de la pizarra se guarda para poder revisarla después de la clase.
4. **Trayectoria** (Error 3.B.1): el docente marca "empezamos tal etapa" y "terminamos tal etapa"; las marcas se guardan en `clase_etapas` y todos ven el avance real, no un dibujo fijo.
5. **Pulso del aula** (Error 3.B.4): cada estudiante tiene tres botones (entiendo / más o menos / perdido); su elección se guarda en `clase_comprension` con su nombre. El docente ve los totales **y también quién está en cada estado**.
6. **Alerta de ritmo** (Error 3.B.5): es una **regla con umbral, no una IA**: cada medio minuto el servidor calcula qué porcentaje del curso está en "perdido" o "más o menos"; si supera un umbral configurable (por ejemplo 20%) durante más de un tiempo mínimo (por ejemplo 3 minutos), se dispara la alerta al docente. Los valores del umbral son configurables por el docente.
7. **Preguntas pendientes** (Error 3.B.6, se conserva): las preguntas van a `clase_preguntas` con autor y hora; el docente las marca respondidas.
8. **Chat de la clase** (Error 3.B.7): es una conversación normal (14.2) de tipo "clase", ligada a esa clase, que existe mientras dura y queda como registro después.
9. **Disposición y salida** (Errores 3.B.3 y 3.B.12): el aula convive con el menú lateral (no se traga la pantalla); al salir, el docente vuelve a la **lista de clases del aula virtual** y el estudiante a su curso. Al terminar, la clase pasa a "finalizada" y sus datos (asistencia, comprensión, preguntas) quedan disponibles para las métricas del portafolio docente.

### 14.4. Comunidad: votos, comentarios, denuncias y moderación

**Concepto.** La comunidad se apoya en tres piezas que hoy no existen: el **voto** (a favor/en contra, reemplaza al "me gusta", Error 2.B.1), el **comentario** (Errores 2.B.2, 2.B.3 y 2.B.7) y el **menú de acciones según el perfil** (Errores 2.B.5, 2.B.8 y 6.A.2).

**Lógica paso a paso.**
1. Las publicaciones viven en `publicaciones` (autor, texto, imagen opcional, institución). Publicar guarda la fila; el selector de emojis inserta el emoji en el texto y la foto se sube como archivo y se previsualiza antes de publicar (Error 2.B.4).
2. **Votos**: cada voto es una fila en `votos` con el usuario, el objeto votado (publicación, debate o comentario) y el valor +1 o −1. Hay una **regla de unicidad**: un usuario tiene a lo sumo un voto por objeto; votar de nuevo lo cambia, tocar el mismo sentido lo quita. El voto es **privado** (nadie ve quién votó qué; solo se muestran los totales).
3. **Comentarios**: viven en `comentarios`, ligados a una publicación o debate. Tocar el contador abre la **vista de detalle** del objeto con su hilo completo, donde también se puede escribir. Los comentarios también se pueden votar y denunciar.
4. **Menú de tres puntos**: es **un único componente compartido** que recibe el rol del usuario y el objeto, y muestra las acciones permitidas: estudiante y profesor → **denunciar**; preceptor (en su curso), dirección y centro de estudiantes (en debates propios) → **eliminar**. Denunciar crea una fila en `denuncias` (quién, qué, motivo); las denuncias pendientes le aparecen a quien modera (dirección/preceptor), que las resuelve eliminando el contenido o descartando la denuncia, y todo queda registrado.
5. **Eliminar es borrado suave**: el contenido se marca eliminado (quién y cuándo) y deja de mostrarse, pero queda auditable en el historial del perfil (Error 6.B.2).

### 14.5. Debates y participación

**Concepto.** "Participar" hoy no significa nada (Error 2.B.6). La lógica correcta: participar es **entrar formalmente al debate**, y recién eso habilita fijar postura.

**Lógica paso a paso.**
1. Un debate vive en `debates` (autor, título, descripción, fecha de cierre opcional). Pueden crearlos profesores (con configuración rica: consigna, reglas, cierre — Error 3.A.2), el centro de estudiantes (Error 8.A.1) y la dirección.
2. Tocar "Participar" crea una fila en `debate_participantes` (usuario + debate, sin postura todavía). A partir de ahí el usuario ve habilitadas las opciones **"a favor" / "en contra"**; elegir una guarda su postura en esa misma fila (puede cambiarla mientras el debate esté abierto). Quien no participó ve las barras de resultado pero no puede votarlas directamente.
3. Las barras muestran el porcentaje real calculado sobre las posturas guardadas. Los comentarios del debate usan la misma pieza de comentarios de 14.4.
4. Al llegar la fecha de cierre (si tiene), el debate se cierra: se puede leer pero no cambiar posturas ni comentar.

### 14.6. Tendencias (el algoritmo, sin IA)

**Concepto.** Tendencias muestra **lo que realmente se destaca**, calculado con un puntaje simple y explicable (Error 2.B.9).

**Lógica.** Para cada publicación y debate se calcula un puntaje sobre una **ventana móvil de los últimos 7 días**:

> puntaje = (votos positivos − votos negativos) + 2 × (posturas nuevas en debates) + 1 × (comentarios nuevos)

Se ordena de mayor a menor y se muestran los primeros N. El selector de alcance filtra: **"Mi escuela"** = solo contenido de la institución del usuario; **"Todas las escuelas"** = todo el contenido nacional (Error 2.B.10). Cada tarjeta de tendencia es **pulsable** y abre el detalle real del contenido (Error 2.B.11). "Configurar mi Feed" abre la elección de intereses del usuario (guardados en `intereses_feed`), que ponderan qué tendencias se le muestran primero (Error 2.B.13). La base incluye una vista `v_tendencias` que ya calcula este puntaje.

### 14.7. Tareas académicas: creación, entrega y corrección

**Concepto.** El ciclo completo profesor → estudiante → profesor que hoy no existe (Errores 2.C.3 a 2.C.8, 3.C.1, 3.C.9).

**Lógica paso a paso.**
1. **Creación (docente)**: una tarea vive en `tareas`, ligada a una **cátedra** (la combinación materia + curso + profesor de la tabla `catedras`, que resuelve "elegir materia y curso cuando doy varias"). Campos: título, consigna rica, **fecha límite real** (con selector de calendario, no texto), método de estudio sugerido, tipo de asignación y adjuntos del profesor.
2. **Vista del estudiante**: "Ver detalle" abre la tarea completa (consigna, adjuntos, método, estado de entrega). Los estados se calculan con **una única lógica compartida de fechas** (arregla 2.C.9 y 13.6): pendiente, en progreso, entregada, vencida.
3. **Entrega**: el estudiante adjunta uno o más archivos y un comentario; se crea una fila en `entregas` con fecha y hora (así se sabe si fue en término o tarde). Puede **anular la entrega** mientras no esté corregida (la anulación queda registrada). Cada entrega notifica al docente.
4. **Corrección (docente)**: por cada tarea, el docente ve la lista de su curso con el estado de cada estudiante (entregó / tarde / no entregó), abre cada entregable, y carga en `correcciones` la **nota y la devolución**. Lo corregido y lo pendiente se distingue por alumno y por materia (Error 3.C.9). La corrección notifica al estudiante, cuya pantalla de Calificaciones lee **estas mismas filas** (así nunca más dos notas distintas para el mismo trabajo, Error 13.1).
5. **"Correcciones en camino"** (Error 2.C.7): es pulsable y lleva a la tarea entregada aún sin corrección.
6. **Tareas personales** del estudiante: viven aparte en `tareas_personales`, con título, descripción, fecha y completado; son recordatorios propios, editables y borrables.

### 14.8. Metas, subtareas y los algoritmos "inteligentes sin IA"

**Concepto.** Metas con profundidad de proyecto (Errores 2.D.5 a 2.D.11) y análisis hechos con **reglas claras**, no con IA (Error 2.D.10).

**Lógica paso a paso.**
1. Una meta vive en `metas` (título, categoría, materia opcional conectada a `materias`, **unidad elegida de la lista real** de `unidades` de esa materia — Error 2.D.8—, fecha de vencimiento real elegida con calendario, estado). Sus subtareas viven en `subtareas`, **cada una con su propio texto, orden y completado individual** (Errores 2.D.6 y 2.D.7). Los recursos de apoyo se asocian en `meta_recursos` (Error 2.D.9).
2. **Progreso de una meta** = subtareas completadas / totales. Completar la meta requiere completar sus subtareas (o confirmar explícitamente que se completen todas); nunca se marcan solas sin avisar (Error 2.D.15).
3. **Resumen semanal (algoritmo)**: compara la semana en curso con la anterior contando subtareas completadas, metas terminadas y ritmo (completadas por día). Produce frases del estilo "completaste 7 subtareas, 3 más que la semana pasada; a este ritmo terminás 'Historia' antes del vencimiento". "Ver reporte detallado" abre el desglose por meta y por día.
4. **Próximo hito (algoritmo)**: entre metas y subtareas en curso con fecha futura, la de vencimiento más cercano; muestra días restantes y urgencia. Si todo está vencido, muestra la **más atrasada** marcada "vencida hace X días" — nunca la pasa al año siguiente (Error 2.D.14).

### 14.9. Hábitos y rachas

**Concepto.** Un hábito es una promesa diaria; la racha se **calcula del historial**, no se guarda a mano (Errores 2.D.1, 2.D.3, 13.5).

**Lógica.** Cada hábito vive en `habitos` y cada día marcado en `habito_registros` (hábito + fecha + cumplido). Marcar el día de hoy inserta o borra **el registro de hoy**; la racha es "cuántos días seguidos hacia atrás hay registros cumplidos, terminando hoy o ayer". Como el Dashboard y la sección Hábitos leen **la misma tabla**, la desconexión y las contradicciones desaparecen solas. Los hábitos se editan y archivan (no se borran, para conservar historial).

### 14.10. Competencias en árbol con evidencias

**Concepto.** Las competencias forman un **árbol** (Error 2.D.12): competencias grandes con ramas.

**Lógica.** `competencias` guarda el árbol (cada fila puede tener una competencia padre). El avance de cada estudiante por competencia vive en `competencia_avances` (nivel: iniciado / en desarrollo / avanzado / dominado). Para subir de nivel se adjuntan **evidencias** (`evidencias`: trabajos, proyectos, reflexiones, con archivo opcional). Una rama se considera avanzada cuando sus hijas alcanzan cierto nivel. El resumen del Dashboard lee estos mismos avances.

### 14.11. Biblioteca y cola de revisión

**Concepto.** Un circuito editorial: cualquiera **presenta** un recurso, el bibliotecario **revisa** en orden de llegada y decide si queda institucional o pasa a nacional (Errores 2.E.1 a 2.E.7, 9.A.1 a 9.B.1).

**Lógica paso a paso.**
1. Un recurso vive en `recursos` (título, descripción, autor, materia opcional **o temática libre** —Error 9.A.4—, tipo, archivo, alcance institucional o nacional).
2. **Presentar recurso** (un solo botón, Error 2.E.6) abre el formulario completo; al enviarlo se crea el recurso "en revisión" y una fila en `cola_revision` con la fecha de presentación. Cada usuario ve en "revisión" **solo lo suyo** (Error 2.E.1); el bibliotecario ve toda la cola **ordenada por llegada** (el más viejo primero).
3. **Revisar**: el bibliotecario abre el elemento, lo examina y decide: **aprobar como institucional**, **aprobar como nacional** (visible para todas las escuelas — camino del Error 2.E.7) o **rechazar con motivo**. La decisión queda registrada (quién, cuándo, qué) y **notifica al que lo presentó**.
4. **Búsqueda sin discriminación de tildes** (Error 2.E.3): antes de comparar, tanto lo escrito como los títulos se **normalizan**: minúsculas y sin acentos ("biología" = "biologia" = "BIOLOGÍA"). Los filtros (materia, tipo, escuela, fecha, autor) filtran de verdad sobre las columnas reales.
5. **Descargar** entrega el archivo desde `archivos`; "Ver guía" abre el documento asociado. Las estadísticas del panel del bibliotecario (recursos totales, pendientes, aprobados del mes) se calculan de estas tablas.

### 14.12. Calendario con capas de visibilidad

**Concepto.** **Un solo calendario** para toda la institución, visible para todos, editable por algunos, donde cada evento declara **quiénes pueden verlo** (Errores 6.E.1 a 6.E.9, 7.B.1, 8.C.1, 10.B.1 a 10.B.4).

**Lógica paso a paso.**
1. Un evento vive en `eventos` (creador, título, **tipo libre** —Error 6.E.4—, fecha y horas con la regla "fin posterior al inicio" verificada al guardar —Error 6.E.5—, lugar, descripción). Su visibilidad vive en `evento_visibilidad`: una o más filas que dicen a quién le aparece.
2. **Capas de visibilidad** (cubren todos los casos del Error 10.B.4): todos; un curso puntual (alumnos + sus familias); solo las familias de un curso; solo la familia de un estudiante puntual ("cita con los padres de Pepito"); todas las familias; solo docentes; eventos del centro de estudiantes (visibles para todos, marcados con su origen).
3. **Permisos de edición**: la dirección crea eventos con cualquier visibilidad; el preceptor solo para sus cursos; el centro de estudiantes solo eventos propios (con el límite mensual que fije la dirección, Error 8.B.3); profesores proponen; estudiantes y familias **solo leen**.
4. **Qué ve cada uno**: al pedir el calendario, el servidor arma la lista según el rol, curso e hijos del usuario. La familia Rossi ve: eventos de todos + eventos del curso de Julieta + eventos "solo familias" que la incluyan. Julieta ve lo mismo **menos** las capas de familia.
5. **Mantenimiento**: los eventos pasados con más de un año se eliminan automáticamente (la vista `v_eventos_vigentes` ya los excluye y una rutina periódica los borra — Error 6.E.7); el orden es cronológico (Error 6.E.8); el calendario abre en el **mes actual real** (Error 6.E.10); las vistas mes/semana funcionan como una grilla real tipo Google Calendar (Error 6.E.3).

### 14.13. Comunicados y comunicación con familias

**Concepto.** Un comunicado es un mensaje **de uno hacia muchos** con confirmación de lectura, y la respuesta de cada familia es **privada** (Errores 10.A.1 a 10.A.3).

**Lógica.** El preceptor o la dirección crean el comunicado en `comunicados` (destino: un curso o toda la institución, con adjunto opcional). Cada familia destinataria lo recibe con su **notificación y su globito** de no leído en el menú (el número = comunicados sin fila en `comunicado_lecturas`). Abrir el comunicado en su vista de detalle registra la lectura. "Responder" **no escribe en el comunicado**: abre (o retoma) la **conversación privada** familia–preceptor del chat (14.2), así ninguna otra familia ve la respuesta (Error 10.A.2). El tono conversacional pedido en el Error 10.A.1 sale naturalmente de esta integración con el chat.

### 14.14. Quejas anónimas y su estadística

**Concepto.** Un canal donde el estudiante levanta la mano sin dar su nombre, y que llega a quien corresponde (Errores 8.B.1, 8.B.4, 8.B.5).

**Lógica.** El botón de quejas/sugerencias del perfil estudiante crea una fila en `quejas` con el texto, la categoría y la fecha — **sin ninguna columna de autor**: el anonimato es estructural, no una promesa. Las quejas aparecen en el portal del Centro de Estudiantes y en la dirección, **las no vistas arriba de todo** (Error 8.B.5); abrirlas registra quién y cuándo las vio. La estadística de evolución es un cálculo simple: quejas de este mes contra el anterior, expresado en porcentaje, con su desglose por categoría (Error 8.B.4).

### 14.15. Notificaciones (servicio transversal)

**Concepto.** Una sola pieza que todos los módulos usan para avisar (Error 9.D.1 y todos los "no me enteré").

**Lógica.** Cuando pasa algo que le importa a alguien —mensaje nuevo, corrección cargada, comunicado, recurso aprobado o rechazado, evento nuevo visible para vos, denuncia resuelta— el módulo correspondiente crea una fila en `notificaciones` (destinatario, tipo, título, referencia a la cosa). La campana muestra las no leídas; tocar una navega al objeto y la marca leída; el globito del menú lateral suma no leídas por sección. Si el usuario está conectado, la notificación además llega en vivo por la conexión permanente.

### 14.16. Asistencia IA real

**Concepto.** Reemplazar la respuesta fija por una IA real **configurable** (Error 2.G.1).

**Lógica.** La configuración vive en `config_ia`: el **system prompt** (las instrucciones base: "sos un tutor de secundaria, explicá paso a paso, no des la respuesta directa…"), el proveedor elegido, el modelo y los parámetros. Cuando el estudiante escribe, el servidor arma el pedido —system prompt + historial de la conversación + mensaje nuevo—, lo manda a la API del proveedor configurado y devuelve la respuesta al chat. Existen proveedores con niveles gratuitos aptos para probar (por ejemplo Google AI Studio, Groq u OpenRouter); la clave de acceso se guarda **en el servidor**, jamás dentro de la aplicación del navegador. El historial se guarda como cualquier conversación, y el FAQ/ayuda y el menú de opciones de la pantalla deben funcionar (Error 2.G.2). Donde el informe pide "inteligencia sin IA" (resumen semanal 14.8, alerta de ritmo 14.3), se usan los algoritmos descritos, no este servicio.

### 14.17. Papelera de reciclaje (servicio transversal)

**Concepto.** Nada importante se borra de una: primero pasa por la papelera (Errores 6.B.1, 6.B.5).

**Lógica.** Borrar un perfil, un recurso o un contenido moderado lo **marca** (estado "papelera", con quién y cuándo) en su propia tabla; deja de verse en la aplicación pero sigue existiendo. Durante **7 días** puede restaurarse desde la vista de papelera (visible el contador de días restantes). Una rutina periódica elimina definitivamente lo vencido. Solo la dirección manda a la papelera perfiles; nadie la "vacía" a mano.

### 14.18. Reportes y expedientes

**Concepto.** La dirección arma reportes eligiendo **con casillas** qué incluir, y puede exportar expedientes reales (Errores 6.F.1 a 6.F.5).

**Lógica.** La pantalla de reportes ofrece casillas por bloque (asistencia, entregas, participación en comunidad, calificaciones por curso/materia, actividad de perfiles, quejas). Al generar, el servidor consulta las tablas reales, arma el documento y **entrega un archivo de verdad** (PDF o texto — nunca más el "generando…" vacío del Error 6.C.4), y lo registra en `reportes_generados` (quién, cuándo, con qué parámetros). El **expediente de un alumno** es un caso especial: casillas para incluir datos académicos, entregas, sanciones y —con la debida autorización— sus conversaciones, exportado a .txt o PDF (Error 6.F.5). El Administrador de plataforma solo exporta reportes **agregados y anónimos** (cantidad de instituciones, uso por módulo), nunca vida escolar interna (sección 5).

### 14.19. Gestión de archivos (servicio transversal)

**Concepto.** Todos los módulos suben y bajan archivos (entregas, recursos, adjuntos de chat, evidencias, comunicados); debe existir **una sola pieza** que lo resuelva.

**Lógica.** Subir un archivo lo guarda en el disco del servidor (o en un servicio de almacenamiento) y registra en `archivos` su nombre, tipo, tamaño, quién lo subió y dónde quedó. Los demás módulos **solo referencian** ese registro. Reglas: límite de tamaño, tipos permitidos según contexto, y verificación de permisos al descargar (el archivo de una entrega lo ven el autor y su docente, no cualquiera).

---

## 15. Nota final para la IA lectora

Este documento reúne **dos tandas de problemas**: los detectados a mano usando la aplicación, reformulados y explicados en profundidad, y los detectados después durante una revisión completa del código (las fichas marcadas como *detectado en revisión de código* y las secciones 12 y 13 completas). Cada ficha indica qué se ve hoy, qué debería verse y dónde ocurre, con lenguaje deliberadamente claro. La recomendación es abordar primero los **temas transversales de la sección 11** (que resuelven muchos síntomas de una sola vez) y, dentro de ellos, priorizar: (a) reutilización de componentes comunes, (b) conexión a datos reales y persistentes, (c) circulación de información entre perfiles y (d) separación correcta de permisos por rol. A esa lista se suma la **base de plataforma de la sección 12** (direcciones propias por pantalla, sesión que sobrevive a la recarga y cuentas de usuario reales), que conviene resolver antes que nada, porque todo lo demás se apoya sobre ella; y los casos concretos de la **sección 13** sirven como lista de verificación: cuando los datos sean reales y únicos, ninguna de esas contradicciones debería poder existir. Con esa base, cada error puntual por perfil se corrige de forma mucho más limpia y coherente.

Para el momento de construir, la **sección 14** es la especificación funcional: describe la lógica interna de cada función nueva o a arreglar (videollamadas, chat, votos, calendario con capas, cola de revisión, algoritmos sin IA, etc.) y nombra las tablas concretas donde vive cada cosa. Esas tablas ya existen: la carpeta **`base-de-datos/`** de este mismo repositorio contiene la base de datos local completa de la plataforma (esquema, datos iniciales coherentes y script de creación), junto con un `README.md` que explica cómo levantarla y cómo conectarla con la aplicación cuando se resuelvan los errores.

Por último, el **orden de ejecución de todo el trabajo** —qué se hace primero, qué depende de qué y cómo verificar cada paso— está en **`PLAN_DE_RECONSTRUCCION.md`**, en este mismo directorio: son 10 etapas secuenciales (de la base de plataforma al aula virtual) que cubren todos los errores de este informe. La IA que ejecute la reforma debería empezar por ahí.

