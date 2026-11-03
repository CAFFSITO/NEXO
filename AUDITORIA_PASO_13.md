# Paso 13 — integración y estado comprobado

Actualizada: 02/11/2026. Esta auditoría registra lo observado en el árbol de trabajo compartido. La revisión posterior de todos los bloques está en [REVISION_INTEGRAL_100.md](REVISION_INTEGRAL_100.md), con hallazgos que amplían los límites de esta matriz. **La entrega sigue parcial; no está al 100%.**

## Verificaciones ejecutadas

| Control | Resultado | Alcance |
|---|---|---|
| `npm test` | 227/227 aprobadas tras las últimas correcciones | API y datos con bases temporales; incluye cloud, formularios encadenados, genoma de lecciones, avances de apps y privacidad de versiones históricas. |
| `npm run lint` | Aprobado tras corregir errores de integración y el selector de conectores | Se usa el componente `Selector` común y se eliminaron actualizaciones de estado sincrónicas en efectos. |
| `npm run build` | Aprobado tras las correcciones | TypeScript y Vite; no mide rendimiento de equipos reales. |
| `node --test servidor/tests/integracion-paso13.test.js` | 1/1 aprobada | Ejecuta migración dos veces sobre esquema y datos iniciales; preserva cuentas/instituciones, estructura de tablas, claves foráneas e integridad. |
| `scripts/verificar-personalizacion-ui.mjs` | Aprobado en Chrome headless | Guardar, recargar, heredar, ancho móvil y ausencia de errores JS. Se usó Playwright efímero mediante `NEXO_PLAYWRIGHT`. |
| `scripts/verificar-comunicacion-ui.mjs` | Aprobado en Chrome headless | Canales, historial largo y búsqueda, foro, ayuda, enlaces contextuales, ancho móvil y ausencia de errores JS. |
| `scripts/verificar-roles-ui.mjs` | 8/8 perfiles abren su pantalla; ancho móvil 390/390 | Dirección, docente, preceptoría, estudiante, familia, biblioteca, centro y Maestro. Se corrigió desborde horizontal en Mis Cursos del estudiante; sin errores JS en esas pantallas. |
| `scripts/verificar-flujos-nuevos-ui.mjs` | Aprobado en Chrome headless | Maestro publica app, Dirección la instala, estudiante conserva avance al recargar y docente delegado guarda evidencia y completa un paso. El script lee los avisos obligatorios cuando aparecen. |
| `scripts/auditar-pantallas-ui.mjs` | 103 aperturas por pantalla y rol, sin errores JS ni 5xx inesperados | Ocho roles de la base temporal, una ruta por pantalla. La falta de motor IA produjo un 503 esperado que queda registrado como dependencia, no como integración comprobada. No verifica cada acción, alias o combinación de genoma. Resultados en `AUDITORIA_PANTALLAS_RESULTADOS.json`. |
| `git diff --check` | Sin errores de espacios | Git informó únicamente conversión futura LF/CRLF en archivos existentes. |

Las pruebas usan una base temporal; no reinicializan ni migran la base de uso del usuario. Para los scripts de navegador se definió `NEXO_PLAYWRIGHT=file:///C:/Users/sofia/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs` porque Playwright no es dependencia del proyecto. El tercer recorrido comprueba apertura de ruta, no todas las acciones de cada rol. No prueban cámara, micrófono ni red institucional.

## Matriz de los 13 pasos

| Paso | Estado observado | Evidencia y límite concreto |
|---|---|---|
| 1. Personalización | Verificado en los flujos de preferencias | Pruebas API y smoke UI con persistencia, herencia y móvil. No hay pruebas visuales de todas las combinaciones de genoma y roles. |
| 2. Comunicación | Verificado en los flujos principales | Suite API y smoke UI de chat, foro, ayuda y vínculos de tarea/entrega/meta. No se probó entrega push en dispositivos reales. |
| 3. Tareas/accionables | Implementado con alcance declarado | `APRENDIZAJE.md` y pruebas de versiones, rúbricas, equipos, revisión, métricas, pasos delegados y tareas personales recurrentes. Faltan recurrencia docente y parámetros avanzados de agenda en el formulario personal. |
| 4. Biblioteca/archivos | Implementado parcialmente | `BIBLIOTECA_ARCHIVOS.md` y pruebas de circulación, versiones, carga reanudable, cuota opcional y vínculos bidireccionales con tarea/materia/publicación. El autor puede leer/descargar versiones históricas sin exponer borradores. Faltan proyectos y copia offline. |
| 5. Aula/transmisiones | Implementado parcialmente | Aula, solicitudes de palabra, evento vinculado y puente opcional MediaMTX: OBS docente y HLS autenticado por clase/rol con prueba de contrato. `AULA_MEDIA.md`: falta despliegue real, navegador→WHIP, SFU multi-orador y pruebas de carga/dispositivos. |
| 6. Documentos/formularios | Implementado con alcance declarado | Documentos nativos, plantillas, comentarios, versiones, colaboradores y formularios con condiciones. Prueba de dos usuarios/WebSocket: bloques distintos se fusionan; mismo bloque conserva borrador y responde 409. Sin CRDT ni cursores compartidos en vivo. |
| 7. Cursos/lecciones | Implementado, verificación API | Módulos, secciones, lecciones, medios, documento, accionables, prerrequisitos y progreso. No se hizo recorrido manual completo de autor y estudiante en esta auditoría. |
| 8. Métodos de estudio | Implementado parcialmente | Algoritmos deterministas y ficha de evidencia; la interfaz fue corregida para respetar `Selector` y conservar el borrador al cargar el perfil. El catálogo no demuestra que cubra todos los métodos existentes. |
| 9. Multimedia local | Implementado parcialmente | `MULTIMEDIA_LOCAL.md`: captura, borrador, recorte, capítulos, subtítulos sincronizados editables y señales deterministas de estructura textual; whisper.cpp/modelo no instalados aquí. Faltan comparación de intentos y prueba en dispositivos. |
| 10. IA privada | Implementado parcialmente | `IA_PRIVADA.md`: Ollama institucional y modo «Este dispositivo» vía loopback, contexto verificado, cancelación y sin proveedor externo alternativo. Falta instalación de modelos desde NEXO y generación real comprobada en un equipo con Ollama. |
| 11. Apps públicas | Implementado parcialmente | `apps-publicas.test.js` comprueba publicación, dos instituciones, varias copias, actualización/reversión, aislamiento y reservas con cupos. Los bloques texto, enlace, accionable, embed, encuesta, juego, bienvenida y reserva tienen interfaz; la equivalencia del catálogo comunitario completo de Whop no está acreditada. |
| 12. Conectores | Implementado parcialmente | API, pantalla, catálogo, lectura de nueve servicios, importación conservadora de ocho y exportación manual Calendar/Todoist. Pruebas simuladas de adaptadores y permisos; sin cuentas/API configuradas no se puede acreditar sincronización real. Ver matriz del paso 12. |
| 13. Integración | Parcial | Compilación, lint, 227 pruebas, migración repetida, tres recorridos funcionales UI y apertura de pantalla para los ocho roles pasan en la instantánea indicada. Faltan acciones completas por cada rol, auditoría de todas las combinaciones por comunidad, carga, accesibilidad completa y dispositivos reales. |

## Cobertura educativa y comunitaria de Whop

| Capacidad equivalente | Estado en NEXO | Evidencia o límite |
|---|---|---|
| Cursos, capítulos, lecciones, materiales y accionables | Implementada con alcance propio | `servidor/lecciones.js`, interfaz de materia y pruebas de lecciones. |
| Chat, foros y ayuda privada | Implementada en flujos principales | API de canales y smoke UI de comunicación. |
| Archivos y biblioteca | Implementada parcialmente | Carga reanudable, carpetas, lector, circulación y versiones anteriores para autor; falta copia offline. |
| Eventos | Implementada con agenda nativa | Recurrencia, destinos y clases vinculadas; pruebas de calendario en suite. |
| Transmisiones | Parcial | Aula WebRTC de grupo pequeño y puente opcional OBS→MediaMTX→HLS con control de acceso; sin despliegue ni escala real probada. |
| Apps públicas gratuitas | Parcial | Publicación, instalación y avance persistente probados por API y navegador; aislamiento probado por API. Catálogo comunitario completo pendiente. |
| Enlaces, páginas embebidas, bienvenida y juegos | Parcial | Bloques renderizados y con estado cuando corresponde; no se recorrieron todas las instancias desde navegador. |
| Sugerencias, reservas y dinámicas comunitarias adicionales | Parcial o sin evidencia funcional suficiente | No afirmar equivalencia plena hasta recorrer creación, uso y persistencia por comunidad. |

## Criterio de los cinco principios

- **Interacción:** chat, foros, ayuda, aula y colaboración existen; se probaron rutas principales de comunicación.
- **Organización:** navegación, tareas, biblioteca, agenda, cursos y apps por comunidad existen; la fragmentación entre ellos aún requiere recorrido integrado completo.
- **Perfil cognitivo y plasticidad:** preferencias y perfil editable, carga por bloques y recomendaciones deterministas existen; no se prueba eficacia individual por sólo implementar opciones.
- **Creatividad:** documentos, comunidad, apps y producciones permiten crear; no se comprobó una trayectoria completa de creación a publicación en todos los roles.
- **Retroalimentación:** rúbricas, revisión entre pares, devoluciones y métricas existen; la velocidad depende de personas y notificaciones, no equivale a respuesta humana automática.

La innovación práctica se ve en accionables, entregas y proyectos, pero la trazabilidad completa problema → actividad → evidencia → cambio siguiente no está demostrada para todas las funciones. Las fichas de evidencia deben distinguir respaldo, incertidumbre y configuración local; una categoría como gamificación no recibe aprobación o rechazo científico universal.

## Pendientes verificables para el cierre

1. Repetir la suite tras cambios pertinentes posteriores. La instantánea del 02/11 pasó 227 pruebas, lint y build.
2. Ampliar el recorrido real a acciones completas de los ocho perfiles y dos comunidades: actualizar una app sin perder datos, crear contenido, estudiar, entregar, revisar, devolver y consultar métricas. La apertura de sus pantallas y el flujo publicar→instalar→usar ya fueron comprobados.
3. Probar procesamiento local con modelo whisper.cpp y Ollama disponibles, además de cámara/pantalla/micrófono, redes de institución y dispositivos de destino.
4. Probar conectores con credenciales y cuentas autorizadas; registrar por servicio importación/exportación, identidad, reintentos y conflictos. Las pruebas simuladas no sustituyen esto.
5. Medir carga, reconexión, accesibilidad de teclado/lector y comportamiento móvil en las pantallas nuevas; los smoke UI cubren sólo sus propios recorridos.
6. Completar las capacidades implementables listadas en los pasos 3, 4, 5, 9, 10 y 11 antes de declarar esos pasos terminados; las dependencias externas exactas están descritas en sus documentos.
