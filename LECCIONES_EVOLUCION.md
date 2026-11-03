# Cursos y accionables: implementación de evolución

Actualización: 03/11/2026.

## Circuito integrado

- Módulos y secciones son contenedores que pueden combinarse y anidarse. Una lección puede estar en el nivel principal o dentro de un contenedor. La API rechaza ciclos, padres de otra cátedra y lecciones usadas como contenedores.
- El docente puede reordenar con botones, arrastrar a otro contenedor, soltar antes de una lección o elegir contenedor al editar. Las versiones evitan guardar sobre una edición ajena.
- Se duplican ramas completas como borradores; los prerrequisitos internos se remapean y no se copian los avances. Reutilizar en otra cátedra exige ser su docente o Dirección de la misma institución. Las tareas del curso original se desvinculan al copiar entre cátedras; la interfaz avisa para que el docente elija las correspondientes al destino.
- Cada accionable tiene identidad estable, obligatoriedad configurable y estado/evidencia por estudiante. Editar su título conserva la evidencia; quitarlo archiva su definición y conserva su historial. Los textos previos se migran conservando compatibilidad con `accionables`.
- Un accionable puede vincular una tarea de su cátedra. Su estado procede de la entrega vigente, individual o del equipo, y su nota/devolución proceden de `correcciones`. Se abre el formulario de entrega existente desde la lección. No se guarda una segunda nota.
- Completar una lección puede exigir sus accionables obligatorios. Reabrir uno revoca la realización y la evaluación manual; anular una entrega vinculada revoca dinámicamente la realización efectiva y el acceso a lecciones que la requieran.
- El seguimiento docente muestra estado, evidencia y nota/devolución de los accionables de cada estudiante.
- Archivos PDF se leen en un visor y pueden descargarse; audio, video, imágenes y otros archivos usan su representación correspondiente. Grabación directa y subida convencional se integran en el editor.
- La descarga comprueba todos los ancestros, fecha, publicación, prerrequisitos, inscripción y genoma. La profundidad dejó de estar limitada a padre/abuelo.

## Compatibilidad y contexto IA

Las tablas `curso_acciones` y `curso_accion_progreso` se crean de forma aditiva al registrar el módulo. Los registros anteriores de nodos, medios, capítulos, subtítulos y progreso se conservan. Los accionables heredados se migran como opcionales para no convertir una lección antigua en una obligación nueva de forma silenciosa.

`fuenteLeccionAutorizada(db, usuario, id)` devuelve sólo título, descripción y consignas si el usuario puede acceder a la lección según su rol, institución, genoma y condiciones actuales; devuelve `null` en caso contrario. No incorpora notas ni evidencia privada de otro estudiante. `leccionRealizada` es el criterio compartido de realización efectiva para lecciones, archivos y prácticas vinculadas.

## Verificación

- `node --test --test-concurrency=1 servidor/tests/lecciones.test.js servidor/tests/lecciones-evolucion.test.js`: 4/4 aprobadas. Cubren migración operativa de acciones, estructura profunda, ciclos, reubicación, copia completa entre cátedras, aislamiento, archivos según ancestros, estado/evidencia, tarea/entrega/corrección real y revocación de requisitos.
- TypeScript y ESLint de los componentes pasaron; Vite compiló la interfaz.
- `scripts/verificar-lecciones-evolucion-ui.mjs`: aprobado en Chrome headless. Docente crea/publica lección raíz y vincula una tarea; estudiante completa checkbox, guarda evidencia y entrega desde la lección; recibe nota/devolución desde la corrección real y el docente ve seguimiento. Sin errores JS. Usa base temporal y Playwright mediante `NEXO_PLAYWRIGHT`.

## Límites que siguen explícitos

Las condiciones de acceso siguen siendo fecha y una lección previa, además de la estructura de publicación. No hay constructor de expresiones arbitrarias de liberación ni edición de caracteres en vivo de la estructura. La copia crea una rama independiente; no mantiene sincronización editorial entre cursos. Los medios reales y el rendimiento de dispositivos requieren sus pruebas propias; la prueba de software no acredita eficacia pedagógica de un método.
