# Revisión de aprendizaje: pasos 3, 6, 7 y 8

Fecha: 02/11/2026. Revisión del código del árbol de trabajo, contratos API y pruebas aisladas. No acredita una revisión manual de cada combinación visual ni una validación pedagógica de eficacia. Estos cuatro pasos no están terminados al 100% del pedido.

## Paso 3: tareas, accionables y seguimiento

| Requisito | Estado comprobado | Evidencia y brecha |
|---|---|---|
| Entregar, devolver y mejorar sin perder versiones | Implementado y probado por API | `servidor/tareas.js`, `servidor/portafolio.js`, `servidor/tests/aprendizaje-evolucion.test.js`: la nueva entrega sustituye la vigente para la nota, conserva la nota/devolución histórica. |
| Rúbrica, revisión entre pares y equipos | Implementado y probado por API | Criterios descriptivos y devolución por criterio; revisores asignados del curso; una entrega compartida por integrantes de equipo, con permisos de archivos. No hay constructor completo de rúbricas ponderadas ni múltiples tipos de escala. |
| Proyectos anidados, responsables, dependencias y evidencia | Parcial | `servidor/objetivos.js` tiene pasos anidados, dependencia, responsable institucional y evidencia textual/archivo. La meta pertenece al estudiante; el delegado de cualquier perfil puede actualizar sólo su paso. No hay un objeto general de proyecto editable por todos los perfiles ni vinculación de proyectos con bibliotecas/lecciones. |
| Recurrencia | Parcial | Tareas personales recurrentes crean la próxima ocurrencia al completar la actual. Tareas docentes no tienen recurrencia. |
| Métricas de progreso | Implementado con alcance limitado | Conteos de tareas/entregas/correcciones/revisiones; no constituyen una medición automática de dominio conceptual ni diagnóstico cognitivo. |
| Hábitos y autonomía | Espacio existente | `objetivos.js` conserva hábitos y seguimiento personal. Su presencia no garantiza que se forme un hábito. |

## Paso 6: documentos, páginas y formularios

| Requisito | Estado comprobado | Evidencia y brecha |
|---|---|---|
| Crear, publicar, copiar, comentar y restaurar | Implementado y probado por API | `servidor/documentos.js`, `NEXO/src/paginas/DocumentosPage.tsx`, `servidor/tests/documentos.test.js`. |
| Coedición sin perder cambios | Parcial | Fusión al guardar bloques distintos y aviso WebSocket; mismo bloque devuelve conflicto y preserva borrador local. No hay edición de caracteres en vivo ni cursores compartidos. |
| Editor común de bloques enriquecidos | Parcial importante | La API acepta `texto`, `titulo`, `lista`, `tabla`, `enlace`, `archivo`, `accionable`, `pregunta`. En `DocumentosPage.tsx` el lector representa todos los tipos no pregunta con un párrafo de `texto`; la UI no construye tablas reales, enlaces interactivos, adjuntos de archivo ni checkboxes accionables. Los nombres de tipo disponibles no equivalen a las capacidades completas solicitadas. |
| Formularios condicionales | Implementado con correcciones de esta revisión | Preguntas de texto, número, selección, selección múltiple y fecha; condiciones hacia preguntas anteriores. Se corrigió la cadena de visibilidad para ocultar también descendientes y descartar valores de ramas ocultas. |
| Cuestionarios con intentos y resultados configurables | Parcial | Respuestas persistidas y consultables por editores; no hay respuestas correctas/puntaje, límites de intentos, rúbrica de cuestionario ni feedback por opción en este módulo. |
| Reutilizar como bloques de lección/apps | Parcial | Una lección enlaza un documento/formulario; no se inserta el editor dentro de la lección. Apps públicas usan su propia definición de bloques. |
| Colaboradores intuitivos | Parcial | Se invita con ID numérico; falta buscador de personas, retiro de colaboración y permisos diferenciados. |

## Paso 7: cursos y lecciones

| Requisito | Estado comprobado | Evidencia y brecha |
|---|---|---|
| Módulos, subsecciones, lecciones, borradores y publicación | Implementado y probado por API | `servidor/lecciones.js`, `NEXO/src/paginas/components/cursos/LeccionesMateria.tsx`, `servidor/tests/lecciones.test.js`. |
| Estructura libre, arrastrar, reorganizar y reutilizar | Parcial | Jerarquía obligatoria módulo → sección → lección. UI usa subir/bajar; sólo duplica lecciones dentro de la misma cátedra. No hay arrastrar, duplicar ramas completas ni reutilizar entre cursos. |
| Medios y grabación directa | Integrado con límites | La lección guarda un archivo, capítulos y subtítulos; abre `EstudioMultimedia` en el editor. No acredita cámaras/micrófonos reales ni subidas grandes en todos los dispositivos. El lector trata todo archivo no audio como video; PDF debe abrirse por otras capacidades. |
| Accionables debajo del tema | Parcial importante | `accionables` es un arreglo de textos representado como lista. No guarda avance por accionable ni enlaza tareas/entregas/evidencias. Marcar la lección realizada no demuestra completar cada accionable. |
| Prerrequisitos y liberación | Implementado con límites | Fecha y una lección previa; visibilidad respeta ancestros. No hay reglas arbitrarias por evidencia/resultado ni condiciones múltiples. |
| Visualización, realización y evaluación separadas | Implementado por API | Visto/realizado por estudiante y evaluación marcada por docente; no hay vínculo automático entre evaluación de lección y calificación/rúbrica de tarea. |
| Genoma y personalización | Corregido en esta revisión | Lecciones verifica módulo de portafolio del estudiante, portafolio docente o cursos de Dirección antes de leer/escribir. Prácticas vinculadas también respetan el módulo de origen. |

La inspección privada de Whop no forma parte de esta subauditoría; la equivalencia completa no queda acreditada por tener estos nombres y endpoints.

## Paso 8: métodos de estudio y adaptación sin IA

| Requisito | Estado comprobado | Evidencia y brecha |
|---|---|---|
| Cartera docente y métodos sin IA | Implementado parcialmente | `servidor/estudio.js` tiene diez métodos; `MetodosEstudioPage.tsx` muestra cartas y permite prácticas privadas/compartidas/vinculadas a lección. Generación por reglas desde banco escrito por personas. |
| Algoritmo especializado por función | Parcial importante | Cada método tiene consigna/pasos distintos; varios comparten la selección secuencial del concepto. «Cooperativa» es una instrucción, sin asignación de parejas/turnos/feedback coordinado. «Mapa» no tiene editor de grafo. «Ejemplo resuelto» usa el campo de ejemplo o definición; la UI de banco sólo pide concepto/definición, sin campo de ejemplo ni pasos resueltos. |
| Repetición espaciada | Parcial importante | El intervalo se calcula por práctica a partir de calidad autoevaluada y racha; no se programa memoria individual de cada concepto del banco. El próximo concepto rota por número de intento, sin seleccionar según vencimientos/dominio individuales. |
| Perfil cognitivo evolutivo | Parcial | Cuatro escalas autoevaluadas, historial y recomendación explicable. No es evaluación objetiva de atención, velocidad de procesamiento o conocimientos previos. El ritmo/motivación se almacenan, pero no modifican el generador. |
| Carga cognitiva | Parcial | Atención declarada baja reduce los pasos inicialmente visibles; se pueden desplegar todos. No adapta cantidad/complejidad del contenido por desempeño. |
| Agenda | Existe integración manual | «Agregar a mi calendario» desde último intento; no existe correspondencia persistente para evitar repetir el mismo evento entre recargas ni reprogramación de un repaso creado previamente. |
| Métricas y resultado | Parcial | Intentos individuales, calidad autoevaluada y fecha próxima. No hay tablero docente de dominio por concepto/objetivo ni evaluación externa de comprensión/transferencia. |
| Evidencia científica | Parcial | Fichas con fuentes y límites, personalizables desde genoma; no cubren todas las técnicas existentes ni constituyen aprobación de cada implementación de NEXO. |

## Correcciones realizadas y verificación

- `servidor/documentos.js`: valida texto/opciones para evitar objetos que rompen el lector React; valida fechas reales; rechaza respuestas a claves ajenas; sólo persiste preguntas visibles, respetando condiciones encadenadas.
- `NEXO/src/paginas/DocumentosPage.tsx`: al responder oculta pregunta completa y descendientes de una rama inactiva, además del campo de entrada.
- `servidor/lecciones.js`: usa el control de acceso de pantalla correspondiente al rol antes de acceder a la cátedra.
- `servidor/estudio.js`: prácticas ligadas dejan de ofrecer una vía alternativa a lecciones cuyo módulo fue ocultado.
- Tanda de aprendizaje/documentos/conversores/estudio/lecciones/recurrencia: 15/15 pruebas aprobadas después de corregir formularios.
- Tanda posterior lecciones/estudio: 5/5 aprobadas con la nueva prueba de ocultación por estudiante, docente y Dirección, y bloqueo de prácticas ligadas.
- Lint/build globales deben repetirse por el integrador al terminar los cambios compartidos.

Para cerrar estos pasos faltan las capacidades descritas como parciales, recorridos completos autor→estudiante→revisor→docente, verificación visual/accesible del editor y una definición verificable del catálogo pedagógico que se considera incluido. No corresponde etiquetarlos como terminados al 100%.

## Qué se puede completar y qué exige recursos externos

Las brechas de editor real de tablas/enlaces/archivos/accionables, preguntas puntuables, permisos de colaboradores, estructura flexible de cursos, accionables con estado, recurrencia docente, algoritmo por concepto, agenda idempotente y coordinación cooperativa son trabajo implementable en el repositorio. No dependen de credenciales de Whop y no deben presentarse como bloqueadas por un proveedor externo.

La inspección privada comparativa de Whop requiere una sesión de navegador accesible. La grabación con hardware real requiere permiso y dispositivo. Afirmar eficacia de aprendizaje requiere evaluación con personas y criterios; las pruebas de software no sustituyen esa medición. Ninguna de estas dependencias impide avanzar en las brechas de código anteriores.

## Contraste de los cinco principios

- **Interacción:** comentarios, colaboración y revisión de pares existen; la dinámica cooperativa del motor de estudio todavía es una consigna sin coordinación funcional.
- **Organización:** tareas, metas y lecciones tienen estructura y estado; el vínculo entre accionable de lección y tarea/evidencia sigue incompleto.
- **Perfil cognitivo y plasticidad:** hay autoevaluación editable, recomendación y pasos por bloques; falta adaptar dificultad y memoria por concepto a desempeño verificable.
- **Creatividad:** prácticas creativas, documentos y versiones permiten producir; falta un proyecto general conectado a recursos, equipo y evidencia en todos los perfiles.
- **Retroalimentación:** rúbricas, pares, versiones y comentarios funcionan; las prácticas se autoevalúan y los cuestionarios nativos aún carecen de devolución por respuesta.

La cadena problema → actividad → evidencia → devolución → mejora puede recorrerse en tareas con nuevas versiones. Todavía no está unificada para los accionables de lecciones, cada técnica de estudio y los demás tipos de producción.
