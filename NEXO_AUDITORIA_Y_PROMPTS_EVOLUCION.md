# NEXO: auditoría y secuencia de evolución

Auditoría inicial: 21 de octubre de 2026. Actualizado: 2 de noviembre de 2026. Estado: implementación parcial con revisión funcional. **No está completo al 100%.** La revisión más reciente de todos los bloques, incluidas las brechas de Whop, está en [REVISION_INTEGRAL_100.md](REVISION_INTEGRAL_100.md).

## Cómo usar este archivo desde el mismo chat

Para comenzar alcanza con escribir **«Ejecutá el paso 1 del archivo»**. También se puede copiar el prompt de ese paso. Las decisiones, reglas comunes, alcance y resultados verificables de este documento forman parte de cada prompt.

Al finalizar un paso, **«Continuá con el siguiente paso»** significa ejecutar el próximo pendiente. Si uno quedó incompleto, **«Continuá el paso N»** retoma desde su avance registrado. El agente lee ese registro y el código actual antes de editar, para evitar rehacer trabajo o sobrescribir cambios posteriores.

Los 13 pasos son bloques de entrega, no un límite de trabajo interno. El agente puede resolver subtareas y coordinar especialistas sin pedir nuevos prompts por cada archivo. Cada bloque termina con implementación, verificaciones pertinentes y registro de pendientes; no con otro plan que el usuario deba repartir. Pedir continuar este archivo significa completar el documento; la implementación empieza cuando se solicita ejecutar un paso.

## Decisiones del usuario

- Más → mejor → nuevo. Ampliar las capacidades actuales antes de agregar otras. Todas tienen valor; el orden siguiente responde a dependencias técnicas.
- Replicar capacidades educativas y comunitarias de Whop; sin comercio ni monetización. Apps públicas gratuitas creadas en Maestro, instaladas con «+» por dirección y actualizables sin transferir datos entre comunidades.
- Mantener arquitectura, perfiles, jerarquía y personalización existentes. Recomendaciones modificables por personas. Personalización ampliable de estructura, contenidos, dificultad, ritmo, formatos y presentación.
- Métodos/cartas/prácticas construidos y ejecutados con algoritmos específicos sin IA. La asistencia IA sigue siendo otro servicio, local o institucional privado, que responde y recomienda sin ejecutar acciones.
- Accionables desde checkbox verbo+sustantivo hasta proyectos con múltiples niveles. Composición libre, sin imponer una plantilla pedagógica única.
- Comunicación instantánea significa facilitar la respuesta humana. No introducir respuestas automáticas como sustituto.
- Grabación audio/pantalla/cámara y combinaciones, transcripción y oratoria: uso personal por cualquier perfil habilitado o incorporado a tarea/lección.
- Datos y modelos de IA en dispositivo o servidor privado institucional; ningún fallback silencioso a proveedores externos. Retención configurable por dirección.
- Conectores externos y capacidades nativas equivalentes. Las conexiones explícitas a servicios externos tienen que distinguirse del procesamiento privado de IA.
- Aviso de evidencia al crear/configurar métodos, juegos y apps: evidencia favorable, mixta, limitada, desfavorable o no evaluada, con contexto, fuente y fecha. No inventar una certificación científica binaria.
- Agentes coordinados desde este mismo chat. El usuario no tiene que crear chats, repartir trabajo ni escribir detalles técnicos adicionales.

## Alcance y límites de la auditoría

Tres agentes hicieron revisión estática de los subsistemas de aprendizaje, comunicación y arquitectura. La revisión principal contrastó hallazgos, arranque, service worker, archivos, IA, biblioteca y partes de gestión/cuenta/quejas. Se recorrieron páginas, servicios, rutas, esquema y migraciones relevantes; no se inspeccionó cada rama de cada archivo ni se ejecutó una auditoría visual completa. No se ejecutaron pruebas: esta entrega modifica únicamente este documento.

El árbol de trabajo ya contiene numerosos cambios y archivos nuevos de comunicación. Deben preservarse. Los comentarios históricos y documentos de etapas no son prueba de comportamiento actual: la implementación a veces es mucho más completa que el encabezado del archivo.

Computer Use se inicializó con la habilidad computer-use y abrió el navegador Brave disponible. La captura se detuvo con: «could not determine the current browser URL on Windows with enough confidence to enforce policy». No se inspeccionó la cuenta privada de Whop ni se reintentó el control tras esa detención. La referencia de Whop de esta entrega es documentación pública oficial; no constituye inventario exhaustivo de la cuenta ni de todas las apps de terceros. Una inspección futura permitida debe ampliar la misma matriz de capacidades, sin invalidar ni duplicar lo ya implementado.

## Hallazgos y piezas que se reutilizan

| Área | Implementación encontrada | Ampliación concreta | Fuentes locales |
|---|---|---|---|
| Arquitectura | React/TS/Vite, Express, WebSocket, SQLite; configuración por institución y migraciones | Evolución compatible del registro de funciones y referencias entre objetos | `NEXO/src/App.tsx`, `NEXO/src/navegacion.tsx`, `servidor/servidor.js`, `servidor/migraciones.js` |
| Maestro | Editor de nodos, algoritmos, simulación/aprobación, flujos, genoma versionado/restaurable | Catálogo extensible, operaciones y pantallas declarativas para apps reales | `servidor/maestro.js`, `servidor/genoma.js`, `servidor/nodos.js`, `servidor/flujos.js`, `NEXO/src/paginas/components/maestro/` |
| Dirección | Modo edición, jerarquía, módulos, parámetros, preview e historial | Instalaciones con «+», múltiples instancias de una app, actualización preservando configuración | `servidor/edicion.js`, `NEXO/src/paginas/ModoEdicionPage.tsx` |
| Chat/anuncios | Directos, grupos curso, clase, audio, adjuntos, respuestas, reacciones, urgentes, confirmaciones, push, grupos uno-a-muchos/muchos-a-uno/muchos-a-muchos | Conversación vinculada a objetos, canales configurables, búsqueda e historial paginado | `servidor/chat.js`, `servidor/anuncios.js`, `servidor/respuestas-anuncios.js`, `servidor/notificaciones.js`, `COMUNICACION.md` |
| Comunidad/debates | Feed, encuestas, citas, hilos, menciones, seguir/silenciar, guardados, votos, moderación, programación; siete tipos de debates | Espacios independientes, mejores conexiones con trabajo educativo y colaboración interinstitucional | `servidor/comunidad.js`, `servidor/debates.js`, `NEXO/src/paginas/components/comunidad/` |
| Tareas | CRUD, cátedras, adjuntos, entrega, devolución y nota; UI compartida | Equipos reales, revisiones, rúbricas y accionables enlazados conservando entregas/calificaciones | `servidor/tareas.js`, `servidor/portafolio.js`, `NEXO/src/paginas/components/shared/tareas/` |
| Aprendizaje | Campo textual `metodo_estudio` | Catálogo y ejecutores específicos por método, intentos y programación de práctica | `servidor/tareas.js`, `base-de-datos/esquema.sql` |
| Metas/hábitos | Subtareas, registros diarios/semanales, archivo y rachas configurables | Accionables compuestos y conexiones; conservar el espacio voluntario de autorregulación | `servidor/objetivos.js`, `NEXO/src/paginas/HabitosPage.tsx`, `NEXO/src/paginas/MisMetasPage.tsx` |
| Competencias | Catálogo, niveles autodeclarados, evidencias vinculables a tareas | Distinguir autoevaluación, evaluación docente y evidencia de desempeño | `servidor/objetivos.js`, `NEXO/src/paginas/CompetenciasPage.tsx` |
| Métricas | Panel institucional, notas/puntualidad/adeudadas por materia, panel docente, reportes TXT | Añadir métricas de nuevas prácticas al mismo tablero; no llamar dominio a clics o notas | `servidor/panel.js`, `servidor/materia.js`, `servidor/reportes.js` |
| Biblioteca | Institucional/nacional, filtros, búsqueda, recursos/libros/enlaces, revisión y votos | Circulación nacional efectiva, colecciones, lectura, organización y reutilización | `servidor/biblioteca.js`, `NEXO/src/paginas/BibliotecaNacionalPage.tsx` |
| Archivos | Almacén común, descargas, previews y reproducción por rangos | Carpetas/colecciones, versiones, carga reanudable, búsqueda y cuotas | `servidor/archivos.js`, `NEXO/src/servicios/archivos.ts` |
| Agenda | Recurrencia, excepciones, destinatarios, avisos, confirmaciones, conflictos, exportación ICS | Reservas/cupos y conexión con sesiones y lecciones; sincronización externa posterior | `servidor/agenda.js`, `servidor/eventos.js`, `servidor/calendario.js` |
| Aula | Planificación, etapas, asistencia, chat, pizarra docente, preguntas, pulso y alerta de ritmo | Participación ampliada, transmisiones, grabaciones reutilizables | `servidor/aula.js`, `NEXO/src/paginas/components/aula-virtual/` |
| Video | WebRTC cámara/micrófono y pantalla; malla, ICE configurable | Pantalla+webcam, oradores/espectadores, infraestructura institucional para escala y OBS | `NEXO/src/servicios/videollamada.ts`, `servidor/tiempo-real.js` |
| Grabación | MediaRecorder para notas de voz en chat y anuncios | Componente compartido de medios, composición, biblioteca local, transcripción y oratoria | `NEXO/src/paginas/components/chat/GrabadorAudio.tsx`, `NEXO/src/paginas/components/anuncios/GrabadorVoz.tsx` |
| IA | Pantalla, historial y conversación con proveedor externo | Mantener interfaz; adaptar ejecución privada y contexto de recursos autorizados | `servidor/asistencia-ia.js`, `NEXO/src/servicios/asistenciaIa.ts`, `NEXO/src/paginas/AsistenciaIAPage.tsx` |
| Offline | Manifest PWA; service worker de push | Almacenamiento local, workers, cola de trabajos y sincronización controlada | `NEXO/public/sw.js`, `NEXO/public/manifest.webmanifest`, `NEXO/src/servicios/api.ts` |
| Gestión | Cursos, perfiles, vínculos, cuenta, primer ingreso, diario docente, quejas y administración | Mantener estos circuitos; reutilizarlos al configurar comunidades y ayuda | `servidor/gestion-academica.js`, `servidor/perfiles.js`, `servidor/cuenta.js`, `servidor/diario.js`, `servidor/quejas.js`, `servidor/plataforma.js` |
| Conectores | No se localizaron conectores implementados de los servicios solicitados; existe exportación ICS | Adaptadores reales con importación/exportación/sincronización y estado verificable | `NEXO/src/servicios/`, `servidor/` |

### Límites comprobados que afectan el diseño

- `servidor/biblioteca.js:80-81` exige alcance y además institución propia o nula; aprobar nacional en la consulta de `:389` no cambia institución. Revisar conjuntamente listado, filtros, voto y descarga; el almacén ya contempla recurso nacional en `servidor/archivos.js`.
- `servidor/asistencia-ia.js` despacha Google AI Studio, Groq u OpenRouter y exige clave. Historial reciente + prompt de sistema no equivale a contexto académico recuperado ni IA privada.
- `servidor/genoma.js` mantiene `MODULOS` y `ALGORITMOS` estáticos; normalización recorre entradas conocidas. `App.tsx` registra páginas concretas. Un grafo publicable no basta para una app con interfaz y datos propios.
- Acciones de flujos existentes son avisar/registrar; intérprete numérico con límites de nodos y conexiones. Métodos de aprendizaje requieren estados, entradas tipadas, intentos y programación; no cabe todo como una fórmula numérica.
- `servidor/tiempo-real.js:44` limita la malla de video a 12 participantes por defecto. Aumentar el número no sustituye infraestructura de transmisión. Pantalla reemplaza cámara en el servicio actual.
- `servidor/archivos.js:35` limita multimedia a 100 MB y reúne el cuerpo en memoria; no resuelve videos largos o subidas interrumpidas.
- `NEXO/public/sw.js` atiende push/click; no tiene caché de app ni cola offline.
- `correcciones` mantiene una corrección por entrega; metas tienen subtareas a un nivel, hábitos diario/semanal, competencias cuatro niveles. Las ampliaciones deben migrar estos modelos sin perder historial.
- La asignación grupal existe como tipo, pero la entrega actual se identifica por estudiante. Agregar grupos no debe duplicar entregas individuales ni calificaciones.
- Algunas reglas siguen fijas por rol y año académico. Por ejemplo, `gestion-academica.js` valida año 1–7. Personalización amplia exige distinguir esas restricciones de integridad de las opciones que deben volverse configurables.
- La recuperación de cuenta entrega el código en consola del servidor (`servidor/cuenta.js`, función `entregarCodigo`). La integración de correo puede completar ese canal sin sustituir el sistema de cuentas.

## Relación con los principios

Interacción: conversación social voluntaria y colaboración contextual (2, 5, 7, 11). Organización: referencias únicas, agenda, archivos, jerarquía editable y accionables (1–7). Perfil cognitivo/plasticidad: nivel, conocimientos previos, preferencias, práctica y carga ajustables sin etiquetas de estilos (8–10). Creatividad: explicaciones, conexiones, proyectos, documentos y creación de apps (3, 6–8, 11). Retroalimentación: devolución humana, revisiones, evidencias y comparación de intentos (2, 3, 8, 9). Innovación: transformar esas producciones en acciones y proyectos ejecutables (3, 7, 11). Estos son criterios de diseño; no afirmaciones de eficacia ya demostrada de NEXO.

## Cobertura de las ideas: qué paso responde a cada problema

El material original tiene el título «17 problemas», pero enumera 15. Se conservan esos 15 sin inventar los dos restantes. Las ideas repetidas se integran una sola vez.

| Problema planteado | Trabajo que debe quedar entregado | Pasos |
|---|---|---|
| 1. Comunicación ineficiente | Destinatarios y canales configurables, continuidad de respuestas humanas, búsqueda y acceso al objeto exacto | 1–2, 12 |
| 2. Interacción insuficiente | Espacios sociales, foros y conversaciones dentro de actividades; sesiones y colaboración entre comunidades | 2, 5, 11 |
| 3. Herramientas fragmentadas | Referencias comunes, archivos, documentos, tareas, agenda y conectores dentro del mismo recorrido | 1–7, 12 |
| 4. Diferencias cognitivas ignoradas | Perfil evolutivo con conocimientos previos, atención y motivación declaradas/observadas, ritmo y apoyos ajustables | 1, 8, 10 |
| 5. Sobrecarga cognitiva | Presentación progresiva, segmentación, duración y dificultad editables, pausas y recomendaciones controladas por el usuario | 6–8 |
| 6. Confundir estudiar con aprender | Prácticas con intentos y evidencias de comprensión/aplicación, independientes del tiempo de visualización | 3, 7–8 |
| 7. Olvido | Recuperación activa, calendario de repaso e intervalos ajustados al desempeño | 8 |
| 8. Consumo pasivo | Preguntar, explicar, construir, debatir y producir dentro de las actividades | 2–3, 6–8 |
| 9. Devolución poco útil | Rúbricas, conversación contextual, revisión y siguiente acción con historial de mejoras | 2–3, 9 |
| 10. Falta de visibilidad | Ampliación de paneles actuales con evidencias, prácticas y evolución; misma fuente de datos | 3, 7–10 |
| 11. Hábitos y autonomía | Espacio personal configurable de planificación, reflexión y seguimiento | 3, 8 |
| 12. Creatividad secundaria | Conexiones conceptuales, producción colaborativa, desafíos abiertos y proyectos aplicados | 3, 6–8, 11 |
| 13. Instituciones aisladas | Biblioteca nacional efectiva y espacios compartidos con participación de varias instituciones | 2, 4, 11 |
| 14. IA descontextualizada | Asistencia existente con contexto trazable y ejecución privada configurable | 9–10 |
| 15. Conocimiento sin aplicación | Accionables componibles vinculados a recursos, responsables, evidencias y revisiones | 3, 7–8, 11 |

| Pedido específico | Entrega que lo cubre | Paso principal |
|---|---|---|
| Capacidades educativas/comunitarias de Whop | Matriz de equivalencias, ampliación de módulos y catálogo de apps; completar con inspección de cuenta cuando esté disponible | 2, 4–7, 11, 13 |
| Apps públicas desde nodos | Definición publicable con algoritmo, interfaz y configuración; instalación «+» y actualización sin copiar datos | 1, 11 |
| Cartera docente de métodos | Cartas consultables, buscables y aplicables a una actividad; algoritmo específico por método | 8 |
| Tema y accionables en un mismo módulo | Bloques ordenables libremente, desde explicación hasta acciones y proyectos | 3, 6–7 |
| Subir y separar videos en módulos | Carga reanudable, organización en lecciones y capítulos/segmentos con tiempos, sin duplicar el archivo innecesariamente | 4, 7, 9 |
| Grabar directamente en módulos | Grabador común embebido en la lección con selección de fuentes, edición y guardado | 7, 9 |
| Audio y transcripción locales | Biblioteca personal, procesamiento en dispositivo o institución, búsqueda en transcripción y exportación | 4, 9 |
| Oratoria audio/video/combinada | Análisis por modalidad, rúbrica configurable, ejemplos temporales y comparación de intentos | 9 |
| Advertencias científicas | Ficha contextual visible al elegir/crear/configurar métodos y dinámicas, con fuente, fecha y límites | 1, 8, 11 |

La colaboración interinstitucional del paso 2 debe incluir espacios compartidos explícitos con miembros de varias instituciones, manteniendo sus identidades y sus espacios propios. El paso 11 permite distribuir las apps que implementan esos espacios; instalar la app por sí solo no comparte conversaciones ni recursos.

## Capacidades nativas y conectores: dos entregas por herramienta

Esta tabla fija el alcance funcional mínimo. El agente del paso 12 debe registrar por separado qué operación soporta la API vigente, qué implementó y qué pudo comprobar con una cuenta conectada.

| Referencia | Capacidad dentro de NEXO | Conector del paso 12 |
|---|---|---|
| Drive | Carpetas, archivos, versiones, búsqueda y referencias compartidas (4) | Archivos/carpetas y cambios externos donde estén disponibles |
| Notion | Páginas, bloques, tablas con propiedades, vistas configurables y relaciones entre objetos (6) | Páginas, bloques y bases/fuentes de datos admitidas por su API |
| WhatsApp | Conversaciones, grupos, audio, archivos y avisos (2) | Mensajería soportada por la API oficial de la cuenta conectada; alcance documentado |
| Whop | Cursos, comunidades, apps y sesiones componibles (2, 5, 7, 11) | No se pidió conectar Whop: se usa como referencia funcional |
| Gmail | Bandeja integrada de correo, hilos, búsqueda, borradores y adjuntos; enlazar correos con tareas/recursos sin tratarlos como chats internos (12) | Leer/sincronizar y enviar correo por acciones humanas explícitas; estado real de envío |
| Todoist | Tareas, subtareas, responsables, fechas, filtros y recurrencia configurable (3) | Proyectos, tareas y cambios con correspondencia de identidades |
| Google Calendar | Agenda, recurrencia, excepciones, reservas y avisos (5) | Importación/exportación y sincronización de eventos; conservar ICS |
| Meet | Sesiones audiovisuales y colaboración (5) | Enlaces, sesiones y recursos admitidos por la API; distinguirlos del motor de video propio |
| Classroom | Cursos, participantes, materiales, tareas, entregas y devoluciones (3, 7) | Objetos y operaciones académicas permitidos por la cuenta/API |
| Google Docs | Edición colaborativa, comentarios, historial y exportación (6) | Documentos y transformaciones compatibles, conservando origen y formato cuando sea posible |
| Google Forms | Formularios/cuestionarios, lógica, respuestas y resultados (6) | Formularios y respuestas soportados, sin prometer equivalencia automática de todos los tipos |
| Libros | Catálogo, lectura, marcadores, anotaciones y vínculo con estudio (4, 8) | Importación de formatos y catálogos concretos; «Libros» no identifica un proveedor único |

Las tablas de contenido del paso 6 necesitan propiedades tipadas, filtros, orden, vistas y relaciones para cubrir organización tipo Notion. La recurrencia de tareas del paso 3 debe reutilizar las reglas temporales de la agenda cuando corresponda. El correo del paso 12 requiere una interfaz de correo completa integrada en NEXO, además de conectar credenciales.

## Reglas comunes para ejecutar cualquier paso

Cada prompt usa este documento y las decisiones del chat. El agente principal implementa e integra; delega investigaciones/revisiones y partes independientes con responsabilidades claras. Un solo responsable integra esquema, migraciones, registro, navegación y contratos compartidos. No hace falta que el usuario copie reglas extra.

Antes de editar, leer la versión actual del subsistema y sus cambios locales. Reutilizar primero. Mantener fuentes únicas y compatibilidad; migraciones aditivas, sin regenerar ni borrar la base. Ninguna nueva capacidad queda como botón decorativo: frontend, backend, datos, configuración y estados reales se entregan juntos. En cada método/app constan problema y principios pertinentes. Mantener separación de datos institucionales y capacidades existentes como parte de que la app funcione correctamente.

Verificar lo cambiado con pruebas de comportamiento pertinentes, lint/build y recorridos integrados. Usar datos de prueba aislados; no ejecutar cargas destructivas contra la base del usuario. Registrar qué se verificó realmente y qué depende de equipos/accesos no disponibles. Al finalizar, actualizar este documento con avance y pendientes concretos. No marcar una integración completada por tener una maqueta o una API simulada. Los servicios externos requieren conexión real para verificar extremo a extremo; los bloqueos no impiden desarrollar el resto.

## Prompts: 13 pasos, ordenados por dependencia

### 1. Ampliar la personalización existente

> Ejecutá el paso 1 de NEXO_AUDITORIA_Y_PROMPTS_EVOLUCION.md con un agente de arquitectura y otro de revisión. Ampliá Maestro, genoma y Modo edición: convertí las restricciones funcionales fijas pertinentes en configuración intuitiva por institución, perfil y usuario; preservá jerarquías, algoritmos, versiones y restauración. Prepará un registro extensible compatible para las capacidades posteriores, sin reconstruir la app. Incorporá la ficha de evidencia para métodos, juegos y apps y la retención controlada por dirección. Respetá los cambios locales existentes y entregá el circuito completo verificado.

Resultado verificable: configuración nueva y genomas previos conviven; guardar/restaurar no elimina módulos, perfiles ni datos. Fichas distinguen evidencia conocida de funciones todavía no evaluadas. Dependencia de todos los pasos siguientes.

### 2. Potenciar comunicación y comunidad

> Ejecutá el paso 2 con agentes de comunicación y experiencia de uso. Ampliá chat, anuncios, respuestas, comunidad y debates existentes: canales configurables, búsqueda e historial paginado, conversaciones vinculadas a tareas, entregas, metas y proyectos, y navegación directa entre conversación y objeto. Conservá audio, adjuntos, reacciones, urgentes, confirmaciones, moderación y el bus de tiempo real. Incorporá foros independientes y circuitos de ayuda/sugerencias reutilizando las piezas actuales y preservando las quejas anónimas. Facilitá respuestas humanas rápidas y espacios sociales voluntarios; verificá todos los perfiles afectados.

Resultado: una conversación contextual persiste y se abre desde ambos extremos; una queja anónima no se convierte accidentalmente en ticket identificado. Depende de 1; los contextos futuros se registran después sin rediseño.

### 3. Potenciar tareas, accionables y seguimiento

> Ejecutá el paso 3 con agentes de aprendizaje y datos. Extendé tareas, metas, subtareas, hábitos, competencias y portafolios para crear accionables desde un checkbox hasta proyectos anidados con responsables, dependencias, evidencias y entregas de equipos. Agregá rúbricas, revisión entre pares configurable e historial de devoluciones y nuevas versiones de entrega. Mejorá los tableros actuales con esos datos, distinguiendo actividad, autoevaluación y aprendizaje demostrado. Conservá calificaciones y registros existentes como fuente única; mantené hábitos como espacio configurable de trabajo personal.

Resultado: docente devuelve, estudiante mejora, ambas versiones siguen accesibles, y tablero/portafolio muestran el mismo estado. Dependencias: 1–2.

### 4. Potenciar archivos y bibliotecas

> Ejecutá el paso 4 con agentes de almacenamiento y biblioteca. Evolucioná el almacén y las bibliotecas actuales: carpetas y colecciones, etiquetas, versiones, búsqueda unificada, lector de libros/documentos, anotaciones, referencias compartidas y cargas grandes reanudables. Corregí el alcance nacional para que recursos publicados circulen entre instituciones conservando autoría, revisión y votos. Conectá recursos con tareas, materias, comunidad y proyectos. Prepará almacenamiento local y sincronización explícita para los medios posteriores; verificá que una interrupción no pierda una carga ni duplique archivos.

Resultado: publicación nacional visible desde otra institución; versión anterior recuperable; lectura/anotación y carga reanudable usan el almacén común. Dependencias: 1–3.

### 5. Potenciar aula, eventos y transmisiones

> Ejecutá el paso 5 con agentes de tiempo real y multimedia. Ampliá el aula WebRTC y la agenda existentes: sesiones comunitarias, oradores y espectadores, solicitudes de palabra, chat, reacciones, preguntas, pizarra colaborativa configurable, reservas/cupos, recordatorios y conexión con materiales. Sumá transmisión desde navegador y OBS mediante infraestructura institucional adecuada, conservando las clases actuales. Resolvé reconexión y calidad adaptable; no intentes escalar la malla actual aumentando solamente su límite. Dejá la sesión preparada para incorporar grabación y convertirla en lección en los pasos siguientes.

Resultado: clase existente preservada y transmisión separa audiencia de participantes activos; agenda y acceso apuntan a la misma sesión. Dependencias: 1–4. Capacidad declarada según pruebas reales, no número ilimitado ficticio.

### 6. Documentos, páginas y formularios nativos

> Ejecutá el paso 6 con agentes de edición colaborativa y formularios. Incorporá a la organización existente un editor común de bloques para documentos, páginas, tablas, listas, enlaces, medios y accionables, con coedición, comentarios, historial y plantillas. Sumá formularios y cuestionarios configurables con validaciones, ramificación, tipos de respuesta, intentos y resultados. Reutilizá archivos, tareas, debates, identidad y notificaciones actuales. Estas capacidades deben funcionar por sí mismas y como bloques reutilizables de lecciones y apps, sin crear almacenes o editores paralelos.

Resultado: dos participantes colaboran sin perder cambios; formulario guarda respuestas y permite reutilización en otro contexto. Dependencias: 1–4.

### 7. Cursos y lecciones componibles

> Ejecutá el paso 7 con un agente especializado en Whop y otro en aprendizaje. Extendé materias/unidades con cursos, módulos, subsecciones y lecciones de estructura libre: arrastrar, reorganizar, duplicar, publicar y reutilizar. Combiná texto, video, PDF, archivos, formularios, práctica, conversaciones y accionables del tamaño que el usuario elija. Incorporá borradores, liberación por fecha o condición, prerrequisitos configurables y estados separados de visualización, realización y evaluación. Usá los motores existentes y el editor común; dejá integrada la entrada para grabar directamente dentro de cada lección.

Resultado: curso completo creado/editado por el usuario, navegación de lecciones y actividades reales; notas y tareas siguen compartiendo fuente. Dependencias: 2–6. Referencia pública de Whop descrita abajo; inspección privada aún pendiente.

### 8. Métodos de estudio y adaptación sin IA

> Ejecutá el paso 8 con agentes de investigación pedagógica y algoritmos. Construí la cartera de cartas y un catálogo ampliable de métodos, cada uno con algoritmo propio, pasos, entradas, parámetros, estados y resultados. Implementá recuperación activa, espaciado, intercalado, autoexplicación, interrogación elaborativa, ejemplos resueltos, práctica progresiva, mapas/conexiones y trabajo creativo/cooperativo, ampliando el catálogo según fuentes verificadas. Generá actividades mediante reglas y contenido estructurado, sin IA. Integrá perfil cognitivo evolutivo, recomendaciones explicables/editables y control de carga; conectá prácticas con lecciones, agenda y métricas existentes.

Resultado: algoritmos realmente distintos, prácticas e intervalos reproducibles, historial de intentos y cartera consultable por docente. Añadir familias identificadas en la investigación —incluidas técnicas con evidencia limitada— con ficha específica. No afirmar «todos los métodos existentes» a partir de una lista cerrada. Un motor sin IA no inventa explicaciones fiables de cualquier texto: usa bancos, plantillas, reglas, definiciones y selecciones trazables, con edición humana. No etiquetar cerebros por canal visual/auditivo/motor. Dependencias: 3, 6–7.

### 9. Estudio multimedia local, transcripción y oratoria

> Ejecutá el paso 9 con agentes de multimedia y procesamiento local. Reutilizá los grabadores existentes para audio, cámara, pantalla y composiciones configurables, con pausa, recuperación, recorte, capítulos y subtítulos. Integrá biblioteca local y transcripción multilingüe en dispositivo o servidor institucional, seleccionando motores según mediciones reales. Sumá análisis de ritmo, pausas, muletillas, volumen, estructura y aspectos visuales observables, con marcas de tiempo, límites y evolución entre intentos. Permití uso privado o como tarea/lección; integrá grabación de sesiones y publicación desde el mismo flujo.

Resultado: grabar → recuperar → editar → transcribir → analizar → adjuntar/publicar, sin exportación intermedia obligatoria ni envío de audio a terceros. Medir memoria/velocidad en equipos disponibles; detección de capacidades y alternativas por plataforma. No prometer diarización, acentos, precisión o pantalla móvil universales sin soporte comprobado. Reconocimiento de voz y visión pueden usar modelos locales; la prohibición de IA se mantiene para el motor pedagógico del paso 8. No inferir personalidad, inteligencia, emociones o aprendizaje a partir del rostro/voz. Dependencias: 4–8.

Estado de ejecución (octubre de 2026): `EstudioMultimedia` graba audio, cámara, pantalla o composición pantalla/cámara, con pausa, borrador recuperable en IndexedDB y recorte mediante ffmpeg institucional. Capítulos y subtítulos editables se guardan con la lección y permiten navegar el medio publicado. El análisis acústico/visual informa métricas técnicas; un análisis textual determinista marca señales de estructura, sin inferencias personales. La transcripción institucional usa whisper.cpp configurado localmente. En este host faltan `whisper-cli` y modelo, por lo que no se comprobó una transcripción real. Tampoco se midieron rendimiento, dispositivos diversos o comparación entre intentos. Ver `MULTIMEDIA_LOCAL.md`.

### 10. Convertir la asistencia IA existente en privada

> Ejecutá el paso 10 con agentes de inferencia local e integración. Evolucioná la pantalla y servicio de Asistencia IA existentes para ejecutar en dispositivo, servidor privado institucional o combinación configurable. Incorporá gestión local de modelos, progreso/cancelación y contexto trazable de materiales, tareas, biblioteca y datos habilitados. Ofrecé tutoría, explicaciones adaptadas, resumen, preguntas y propuestas de mejora sin ejecutar acciones ni modificar datos académicos por su cuenta. Eliminá la dependencia obligatoria de proveedores externos y cualquier fallback externo; verificá el tráfico de red y conservá el historial compatible.

Resultado: asistencia responde con contexto en el modo configurado y explica sus fuentes; sin llamadas a proveedores externos ni acciones autónomas. No convertir sugerencias en ejecución automática de flujos. Reutilizar workers/almacenamiento del 9. Dependencias: 4, 7–9.

### 11. Apps públicas creadas en Maestro

> Ejecutá el paso 11 con agentes de plataforma y revisión de compatibilidad. Extendé Maestro para construir y publicar apps gratuitas con algoritmos, bloques visuales, configuración y operaciones declarativas. Agregá catálogo y botón «+» en la gestión de cada comunidad, instalación de varias instancias, vista previa, versiones, actualizaciones y reversión. Separá definición de app, configuración local y datos: publicar o instalar nunca copia datos de otra comunidad. Conservá personalizaciones al actualizar. Publicá las capacidades educativas anteriores como apps reutilizables y completá equivalentes comunitarios de Whop: enlaces, páginas embebidas, ayuda, sugerencias, reservas, bienvenida y juegos configurables con ficha de evidencia.

Resultado: Maestro publica, dos comunidades instalan, cada una genera datos distintos, una actualiza y conserva sus datos/configuración. Extender normalización, registro y navegación conjuntamente. Apps con datos/estado y UI real, no solamente exportación de grafos. Ampliar catálogo educativo/comunitario descubierto (directorios, propuestas/proyectos, tablones de oportunidades, desafíos y dinámicas gratuitas) sin comercio. Dependencias: 1–10.

Estado de ejecución (octubre de 2026): implementado con alcance parcial. Maestro publica apps gratuitas declarativas; Dirección instala copias y actualiza o revierte la definición sin importar datos de otras comunidades. Los bloques disponibles son texto, enlace nativo, accionable, página embebida, encuesta, juego, bienvenida y reserva con cupos. Hay vista previa y datos por usuario/instalación; no se ejecuta código arbitrario. Las valoraciones científicas declaradas por el creador se muestran como no verificadas por NEXO. La prueba `servidor/tests/apps-publicas.test.js` cubre dos instituciones, copias, aislamiento, actualización, reservas y conteos. Pendientes: equivalencia funcional de todo el catálogo comunitario de Whop y recorrido manual de cada bloque con cuenta real. Ver `APPS_PUBLICAS.md`.

### 12. Conectores con las herramientas externas

> Ejecutá el paso 12 con agentes por familia de integración. Implementá conectores de Drive, Docs, Forms, Gmail, Calendar, Meet, Classroom, Notion, Todoist y WhatsApp sobre las capacidades nativas de NEXO. Incluí importación, exportación y sincronización donde las APIs oficiales lo permitan, con correspondencia de IDs, reintentos, conflictos y prevención de duplicados. Integrá correo y recuperación de cuenta donde corresponda. Diferenciá conexión externa de procesamiento privado de IA. Completá lo ejecutable y dejá explícito cualquier requisito de cuenta/API que impida probar un conector real, sin presentar simulaciones como integración terminada.

Resultado: matriz por servicio con objetos/operaciones y estado real; cada conector probado mantiene identidades y no duplica datos al repetir la operación. No asumir acceso a chats personales WhatsApp ni equivalencia total de APIs con interfaces. No usar automatización de sesiones como backend permanente. Las credenciales/conexiones que falten se configuran cuando sean necesarias; el usuario no necesita otro chat. Dependencias: 2–7, 11.

### 13. Integración y cierre de toda la experiencia

> Ejecutá el paso 13 con agentes de integración, experiencia de uso y revisión independiente. Recorré los flujos completos de todos los perfiles y comunidades, desde personalizar e instalar una app hasta crear contenido, estudiar, colaborar, entregar, devolver y revisar progreso. Corregí duplicaciones, incoherencias, pérdida de datos, problemas de rendimiento y desconexiones entre módulos. Verificá migraciones, actualizaciones, funcionamiento local, sincronización, accesibilidad y dispositivos disponibles. Contrastá la matriz completa de ideas/Whop con lo entregado; terminá los pendientes implementables y dejá únicamente bloqueos externos concretos, sin declarar cobertura no comprobada.

Resultado: cada idea y capacidad tiene evidencia de ejecución o bloqueo identificado. El cierre se apoya en pruebas por paso y recorridos integrados, no sustituye la verificación incremental. Dependencias: todos.

## Referencias públicas contrastadas

Whop (referencia funcional, no acceso a código ni datos privados):

- Apps e instancias: https://whop.com/blog/add-apps-to-whop/
- Cursos, capítulos, lecciones multimedia/PDF, cuestionarios, orden y liberación: https://whop.com/blog/whop-courses/
- Foros configurables e hilos: https://whop.com/blog/forums-app-whop/
- Eventos, recurrencia, inscripción/cupo y enlace de reunión: https://whop.com/blog/events-app-whop/
- Transmisión navegador/OBS, pantalla, solicitudes de palabra y chat: https://whop.com/blog/livestream-on-whop/
- Videollamadas: https://whop.com/blog/video-calls-app-whop/
- Archivos: https://whop.com/blog/whop-files-app/
- Ayuda privada por tickets: https://whop.com/blog/help-desk-app-whop/
- Sugerencias: https://whop.com/blog/suggestions-app-whop/
- Enlaces: https://whop.com/blog/links-app-whop/
- Sitios embebidos: https://whop.com/blog/website-embed-app/
- Catálogo y descubrimiento de funciones adicionales: https://whop.com/discover/apps/ y https://whop.com/blog/sitemap/

Pedagogía: Dunlosky et al. (2013) distingue utilidad y condiciones de técnicas, no una aprobación universal: https://journals.sagepub.com/stoken/rbtfl/Z10jaVH/60XQM/full . Sailer y Homner (2020) sintetizan efectos de gamificación según resultados y diseño; no respalda rechazarla como categoría completa: https://link.springer.com/article/10.1007/s10648-019-09498-w . El catálogo debe contrastar investigaciones adicionales y actualizaciones por método.

Procesamiento local: comparar Transformers.js (WASM/WebGPU) y whisper.cpp (CPU/GPU/nativo/WASM) sobre equipos y muestras reales, no elegir «el más eficiente» por publicidad. https://huggingface.co/docs/transformers.js/en/index ; https://huggingface.co/docs/transformers.js/guides/webgpu ; https://github.com/ggml-org/whisper.cpp . La captura de pantalla web tiene disponibilidad y restricciones por navegador: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia . La aplicación actual no incluye empaquetado nativo comprobado.

Conectores: https://developers.google.com/workspace/products ; https://developers.google.com/workspace/classroom/guides/manage-coursework ; https://developers.notion.com/reference/intro ; https://developer.todoist.com/ . El acceso a la página de Meta consultada devolvió 429; verificar sus capacidades vigentes antes de implementar WhatsApp.

## Estado de ejecución

Actualización 02/11/2026: los 13 bloques tienen implementación o auditoría con alcance declarado; permanecen funciones de producto pendientes. Se preservan los cambios locales anteriores a esta tarea. Las filas no constituyen aceptación completa de cada requisito.

| Pasos | Estado | Evidencia o pendiente |
|---|---|---|
| 1 | Verificado | Preferencias heredadas institución → perfil → cuenta, aplicadas a lectura/densidad/movimiento; rango académico configurable; fichas de evidencia y registro declarativo extensible; retención institucional explícita de historial IA/notificaciones leídas; versiones/restauración conservadas. |
| 2 | Verificado | Canales configurables, foros con temas, ayuda privada, sugerencias, historial paginado/buscable, mensajes contextuales en tarea/entrega/meta y navegación bidireccional. Suite backend 192/192 y recorrido Chrome con base temporal; comentarios/quejas y recursos anteriores preservados. |
| 3 | Implementado con alcance declarado | Versiones de entregas, rúbricas, revisión entre pares, equipos, subtareas anidadas, delegación entre perfiles, evidencia adjunta, recurrencia de tareas personales y tableros. Pruebas dirigidas aprobadas; recurrencia docente y parámetros avanzados de agenda no están cubiertos. |
| 4 | Implementado parcialmente | Circulación nacional, lector, anotaciones, colecciones, etiquetas, búsqueda, historial/restauración y lectura de versiones anteriores por el autor, carpetas, cargas reanudables, cuotas opcionales y vínculos bidireccionales con tareas, materias y publicaciones. Pruebas dirigidas aprobadas. Faltan proyectos y copia offline. |
| 5 | Implementado parcialmente | Solicitudes de palabra, agenda vinculada y puente opcional a MediaMTX con autorización por clase/rol, OBS docente y HLS autenticado. Contrato probado con medios simulados; falta servidor real, navegador→WHIP, SFU multi-orador y pruebas de carga/dispositivos. Ver `AULA_MEDIA.md`. |
| 6 | Implementado con alcance declarado | Documentos y formularios nativos, bloques, comentarios, plantillas, versiones/restauración, colaboradores y respuestas condicionales. Cambios simultáneos en bloques distintos se fusionan por versión y notifican a colaboradores; mismo bloque conserva borrador y devuelve 409. Sin CRDT ni cursores en vivo. Pruebas dirigidas aprobadas. |
| 7 | Implementado con alcance declarado | Módulos, subsecciones, lecciones, materiales, actividades, prerrequisitos, publicación y progreso; prueba API y build aprobados. |
| 8 | Implementado parcialmente | Diez algoritmos deterministas distintos, práctica, perfil evolutivo y fichas de evidencia; catálogo abierto, sin afirmar que abarque todos los métodos existentes. |
| 9 | Implementado parcialmente | Grabación de audio/cámara/pantalla, borrador local, recorte, capítulos y subtítulos editables/navegables en lecciones, más análisis técnico y estructura textual determinista. Transcripción requiere instalar whisper.cpp y modelo; faltan pruebas de generación y dispositivos. |
| 10 | Implementado parcialmente | Ollama en servidor privado y modo de dispositivo mediante Ollama en loopback del navegador, contexto autorizado y cancelación; falta instalación de modelos desde NEXO y prueba real en un equipo con Ollama. |
| 11 | Implementado parcialmente | Publicación versionada, instalación, actualización/reversión con datos aislados; bloques de texto, enlace a capacidades nativas, accionable, embed, encuesta, juego, bienvenida y reservas con cupos. Pruebas API; no equivale al catálogo Whop completo. |
| 12 | Implementado parcialmente | Catálogo de diez servicios, lectura y bandeja de nueve, importaciones nativas conservadoras de ocho y exportación manual Calendar/Todoist con IDs y conflictos. Sin credenciales no se comprobaron cuentas externas; WhatsApp Business sigue pendiente. Ver `PASO_12_CONECTORES_ESTADO.md`. |
| 13 | Auditoría parcial | Suite backend 227/227, lint y build aprobados; Chrome recorrió personalización, comunicación, ocho rutas de rol y publicar→instalar→usar una app, además de avance delegado con evidencia. Faltan funciones de producto, dispositivos y servicios externos reales. Ver `REVISION_INTEGRAL_100.md` y `AUDITORIA_PASO_13.md`. |
| Auditoría estática | Realizada con alcance declarado | Hallazgos y fuentes locales en este archivo |
| Revisión funcional de la app en ejecución | Parcial: paso 1 comprobado | Navegador Chrome aislado con base temporal: guardar preferencias, recargar, restablecer herencia y ancho móvil; sin errores JS. Resto por subsistema y cierre integrado. |
| Whop público | Consultado | Referencias oficiales registradas |
| Cuenta privada de Whop | Sin inspeccionar | La sesión de Computer Use no expuso pestañas ni extensión de un navegador con Whop; sólo aparecieron navegadores internos vacíos. La inspección anterior se había detenido por imposibilidad de determinar la URL. |

Al ejecutar cada paso, separar su fila de «1–13» y registrar: estado, capacidades entregadas, archivos relevantes, verificaciones realizadas y pendientes. Estados: pendiente, en curso, implementado sin verificación completa, verificado o bloqueado por dependencia externa. Un paso con integración externa sin probar conserva ese pendiente aunque su código esté completo.

La cobertura se actualiza también al incorporar nuevos métodos o apps descubiertos. Toda función identificada recibe un destino dentro de estos bloques; añadir capacidades internas no obliga al usuario a escribir más prompts.

### Verificación del paso 1

- Backend: suite general de 177 pruebas aprobada; después se agregó una prueba de rechazo de extensiones sobredimensionadas, y las 18 pruebas de personalización pasaron. Se usaron bases temporales, sin modificar datos de la instalación.
- Se verificaron herencia sin contaminación entre cuentas, conflictos de versiones, restauración, extensiones preservadas, creación de cursos fuera del antiguo rango 1–7, aislamiento institucional y retención real/idempotente. La retención conserva por defecto y se ejecuta cada hora solo cuando dirección configura un plazo.
- Frontend: compilación de producción y lint dirigido aprobados. `scripts/verificar-personalizacion-ui.mjs` comprueba el circuito real de preferencias en Chrome headless; requiere Playwright y compilación previa. La variable `NEXO_PLAYWRIGHT` permite indicar la ruta del paquete sin agregarlo a las dependencias de producción.
- Archivos principales: `servidor/personalizacion.js`, `servidor/preferencias-cuenta.js`, `servidor/retencion.js`, integración en genoma/edición/instancia; `NEXO/src/servicios/personalizacion.ts`, `aplicarPreferencias.ts`, panel compartido en Maestro/Modo edición y preferencias de cuenta.
- Alcance: el registro preserva definiciones declarativas y muestra capacidades futuras como previstas; no afirma que métodos, IA privada ni apps públicas de los pasos posteriores ya estén implementados. Las fichas documentan evidencia y límites; no representan una aprobación científica automática.
