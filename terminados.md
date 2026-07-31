# NEXO — Plan de detalles finales

> **Qué es este documento.** El cierre real de la aplicación: los huecos que quedaron
> después de la Etapa 10 (los seis pendientes del `VERIFICACION_ETAPA_10.md`) más los
> pulidos de interfaz que pediste (sidebar de tendencias, subnavegación de Mis Cursos,
> vista de detalle de materia del estudiante y la vista de materia del profesor con
> gráficos de progreso).
>
> **Cómo se usa.** Cada tarea es **un prompt completo, listo para copiar y pegar** a la
> IA que programa. Se hacen **de a uno, en orden**, y **se prueba cada uno antes de pasar
> al siguiente** (regla de oro del `PLAN_DE_RECONSTRUCCION.md`). Después de cada prompt que
> funcione, sacá la "foto" con git:
>
> ```
> cd C:\NEXO-main\NEXO-main
> git add -A
> git commit -m "Detalle terminado: <lo que hiciste>"
> ```
>
> Trabaja en equipo con `ERRORES_DETALLADOS.md` (qué está mal) y `PLAN_DE_RECONSTRUCCION.md`
> (el esquema de la base, punto 4). Cuando un prompt nombra un error (ej. "Error 6.C.2") o
> una tabla (ej. `diario_registros`), se refiere a esos documentos.

---

## 0. Antes de empezar — lo que hay que instalar

Solo hay **una** instalación nueva en todo este plan, y es para los gráficos de progreso
del profesor (Prompt 9). El resto usa lo que ya tenés.

### 0.1. Recharts (librería de gráficos) — se instala una sola vez

Abrí una terminal y corré:

```
cd C:\NEXO-main\NEXO-main\NEXO
yarn add recharts
```

Tiene que terminar sin errores rojos y dejar `recharts` en el `package.json`. Con esto
alcanza para las líneas y barras de la vista del profesor. (No hace falta instalar nada
más: Node.js y su SQLite integrado ya están, y el servidor no suma dependencias.)

### 0.2. Recordá cómo levantar todo (tres terminales)

```
# Terminal 1 — base de datos (solo cuando un prompt lo pida)
cd C:\NEXO-main\NEXO-main\base-de-datos
node crear-base.mjs --forzar

# Terminal 2 — servidor (la "cocina")
cd C:\NEXO-main\NEXO-main\servidor
node servidor.js        # debe decir: Cocina de NEXO encendida en http://localhost:3000

# Terminal 3 — aplicación (la "vidriera")
cd C:\NEXO-main\NEXO-main\NEXO
yarn dev                # abrí http://localhost:5173
```

> **Sobre la base de datos.** Varios prompts agregan tablas nuevas. Elegiste **recrear con
> `--forzar`**: cada vez que un prompt toque `esquema.sql` o `datos-iniciales.sql`, hay que
> volver a correr `node crear-base.mjs --forzar` y **reiniciar el servidor** (Ctrl+C y de
> nuevo). Eso **borra los datos que hayas cargado a mano** y vuelve al seed de prueba. Por
> eso conviene hacer **primero el Prompt 1 (preparación de la base)**, que junta *todos* los
> cambios de esquema en una sola pasada: así se recrea la base una vez y no en cada tarea.

### 0.3. Cuentas de prueba (contraseña de todas: `nexo1234`)

| Rol | Email |
|---|---|
| Dirección | `direccion@sanmartin.nexo.edu` |
| Profesor | `garcia@sanmartin.nexo.edu` |
| Preceptor | `pereyra@sanmartin.nexo.edu` |
| Estudiante | `julieta@sanmartin.nexo.edu` |
| Familia | `familia.rossi@sanmartin.nexo.edu` |
| Bibliotecario | `biblioteca@sanmartin.nexo.edu` |
| Centro de Estudiantes | `centro@sanmartin.nexo.edu` |
| Administrador plataforma | `sistema@nexo.edu` |

---

## Reglas que van en TODOS los prompts (ya están incluidas en cada uno)

1. **Ningún dato inventado.** Todo sale de `nexo.db` a través del servidor. Si una pantalla
   no tiene datos reales, se muestra vacía y honesta, no con ejemplos escritos a mano.
2. **Los permisos se validan en el servidor**, no escondiendo botones en el frontend.
3. **Reutilizá lo que ya existe** (componentes, servicios, `exigirAcceso`, `usarTendencias`,
   `ModalDetalleTarea`, etc.); no dupliques.
4. **No toques nada fuera de lo que pide la tarea.** No rompas el sistema de navegación.
5. **Al terminar cada tarea, la IA responde tres cosas:** (1) qué archivos cambió y por qué,
   (2) cómo lo pruebo paso a paso con qué cuenta y qué debo ver, (3) qué quedó sin hacer.

---

## Orden recomendado de las tareas

| # | Tarea | Toca base | Depende de |
|---|---|---|---|
| 1 | Preparación de la base de datos (todas las tablas/columnas nuevas + seed) | ✅ | — |
| 2 | Diario del profesor: CRUD real (editar/borrar/persistir) | — | 1 |
| 3 | Competencias: cambiar de nivel y borrar evidencia | — | 1 |
| 4 | Detalle de curso para la dirección (Error 6.C.2) | — | 1 |
| 5 | Papelera de perfiles: purga programada + auditoría (Error 6.B.5) | — | 1 |
| 6 | Votar recursos de la Biblioteca Nacional | — | 1 |
| 7 | Feed de Comunidad: sidebar derecha de tendencias | — | — |
| 8 | Portafolio: subnavegación en "Mis Cursos" | — | — |
| 9 | Detalle de materia del estudiante (horarios, avisos, tareas) | — | 1 |
| 10 | Vista de materia del profesor (avisos, alumnos, gráficos de progreso) | — | 1, 9 |
| 11 | *(Secundario)* Plantillas por institución (Error 5.A.10) | ✅ | 1 |

> Las tareas 7 y 8 no tocan la base y no dependen de nada: si querés una victoria rápida,
> podés hacerlas primero. Las tareas 9 y 10 son las más grandes; 10 se apoya en las tablas y
> el detalle que crea 9.

---

# PROMPT 1 — Preparación de la base de datos (tablas y datos nuevos)

```
Tarea: agregar a la base de datos de NEXO todas las tablas y columnas nuevas que
necesitan los detalles finales, más datos de ejemplo coherentes para probarlas. NO
construyas todavía ningún endpoint ni pantalla: esta tarea es SOLO el esquema y el seed.

Contexto que tenés que leer antes de tocar nada:
- base-de-datos/esquema.sql  (cómo están definidas hoy las tablas; respetá el estilo:
  nombres en español, minúsculas con guion bajo, fechas ISO en texto, CHECK para
  opciones, borrado suave con eliminado_en donde aplica).
- base-de-datos/datos-iniciales.sql  (de dónde salen las cuentas de prueba, cátedras,
  cursos, inscripciones y tareas; sembrá los datos nuevos usando esos MISMOS ids y
  personas, sin inventar cátedras ni alumnos que no existan).
- base-de-datos/crear-base.mjs  (el constructor; no hace falta cambiarlo).

Agregá al esquema estas tablas/cambios nuevos (y NADA más):

1. catedra_horarios — los días y horas en que se dicta cada materia.
   Columnas: id, catedra_id (REFERENCES catedras), dia_semana TEXT NOT NULL CHECK
   (dia_semana IN ('lunes','martes','miercoles','jueves','viernes','sabado')),
   hora_inicio TEXT NOT NULL ('08:30'), hora_fin TEXT NOT NULL, aula TEXT.
   CHECK (hora_fin > hora_inicio). Índice o UNIQUE razonable para no repetir el mismo
   bloque en la misma cátedra.

2. catedra_avisos — los avisos/mensajes que el profesor publica para su cátedra
   (materia+curso). Los ven los alumnos inscriptos en ese curso.
   Columnas: id, catedra_id (REFERENCES catedras), autor_id (REFERENCES usuarios),
   titulo TEXT, contenido TEXT NOT NULL, archivo_id (REFERENCES archivos, opcional),
   creado_en TEXT DEFAULT (datetime('now')), editado_en TEXT, eliminado_en TEXT
   (borrado suave, editable y borrable).

3. aviso_reacciones — reacción de un usuario a un aviso, con un set FIJO de emojis.
   Columnas: id, aviso_id (REFERENCES catedra_avisos), usuario_id (REFERENCES usuarios),
   emoji TEXT NOT NULL CHECK (emoji IN ('👍','❤️','🎉','😮','✅')),
   creado_en TEXT DEFAULT (datetime('now')),
   UNIQUE (aviso_id, usuario_id)  -- una reacción por persona y aviso, se puede cambiar.

4. aviso_respuestas — respuestas de texto a un aviso (mismo patrón que la tabla
   comentarios, pero tabla propia para no tocar el CHECK de comentarios de la comunidad).
   Columnas: id, aviso_id (REFERENCES catedra_avisos), usuario_id (REFERENCES usuarios),
   contenido TEXT NOT NULL, creado_en TEXT DEFAULT (datetime('now')), eliminado_en TEXT.

5. Voto de recursos de biblioteca: NO crees una tabla nueva. Reutilizá la tabla votos
   existente sumando 'recurso' a su CHECK de objeto_tipo, es decir:
   objeto_tipo IN ('publicacion','debate','comentario','recurso'). Así el voto sigue
   siendo único por usuario y objeto (UNIQUE ya existente) y no duplicamos lógica.

6. Auditoría de papelera: tabla papelera_movimientos para registrar el historial completo
   de quién mandó a la papelera, quién restauró y qué se purgó (Error 6.B.5).
   Columnas: id, usuario_afectado_id (REFERENCES usuarios), accion TEXT NOT NULL CHECK
   (accion IN ('a-papelera','restaurado','purgado')), realizado_por_id (REFERENCES
   usuarios, puede ser NULL cuando lo purga el sistema), realizado_en TEXT DEFAULT
   (datetime('now')).

Después, en datos-iniciales.sql, sembrá datos de ejemplo COHERENTES con lo que ya existe:
- Horarios reales para las cátedras del profesor de prueba (garcia@) y para las materias
  del curso de julieta@ (2 o 3 bloques por materia, en días distintos).
- 2 o 3 avisos de catedra_avisos escritos por el profesor real dueño de esa cátedra,
  dirigidos al curso de julieta@, con fechas recientes.
- Algunas reacciones y una o dos respuestas de alumnos reales de ese curso a esos avisos.
- Uno o dos votos de recurso (objeto_tipo='recurso') de usuarios reales sobre recursos
  nacionales existentes, para que el conteo no arranque siempre en cero.
No inventes personas, cátedras ni cursos: usá los ids que ya están en el seed.

Reglas innegociables:
- Ningún dato inventado fuera del seed de prueba; los datos sembrados tienen que
  referenciar ids reales que ya existen en datos-iniciales.sql.
- Respetá el estilo del esquema actual (CHECK, borrado suave, fechas ISO).
- No borres ni renombres tablas ni columnas existentes; solo agregá.

Cuando termines, decime:
1. Qué archivos cambiaste y qué tablas/columnas/seed agregaste, con una línea por cada una.
2. Cómo lo pruebo yo: los comandos exactos para recrear la base
   (node crear-base.mjs --forzar) y una consulta SQL simple por tabla nueva (con DB
   Browser for SQLite o el comando que prefieras) para ver que las filas de ejemplo están.
3. Qué quedó sin hacer, si algo quedó.
```

**Después de este prompt, recreá la base y reiniciá el servidor:**

```
cd C:\NEXO-main\NEXO-main\base-de-datos
node crear-base.mjs --forzar
# luego Ctrl+C en la terminal del servidor y  node servidor.js  de nuevo
```

---

# PROMPT 2 — Diario del profesor: CRUD real (Errores 3.C.3 y 3.C.6)

```
Tarea: hacer que el "Diario reflexivo" del profesor funcione de verdad: crear, editar,
borrar y que los registros SOBREVIVAN a la recarga, contra nexo.db a través del servidor.
Hoy el diario vive solo en la memoria de la pantalla (no existe /api/diario), aunque la
tabla diario_registros ya está en el esquema.

Contexto que tenés que leer antes de tocar nada:
- base-de-datos/esquema.sql → tabla diario_registros (id, profesor_id, titulo, contenido,
  etiquetas, creado_en, editado_en, eliminado_en). Ya existe; NO la cambies.
- servidor/objetivos.js → tomalo de MODELO de cómo se registra un módulo de escritura:
  cómo usa exigirAcceso/exigirSesion (servidor/comun.js), cómo valida permisos por fila,
  y el patrón app.get/post/put/delete con db.prepare.
- servidor/servidor.js → cómo se importa y se llama a cada registrarX(app, db). Tenés que
  sumar el tuyo igual que los demás.
- servidor/permisos.js → ROLES_POR_PAGINA: registrá la página del diario para rol
  'profesor' (y 'admin-academico' si corresponde), para que exigirAcceso funcione.
- NEXO/src/paginas/DiarioReflexivoProfesorPage.tsx → la pantalla; hoy arranca vacía y
  honesta. Tenés que conectarla al servidor.
- NEXO/src/servicios/objetivos.ts o tareas.ts → tomalos de MODELO de cómo el frontend
  llama a la api (apiGet/apiPost del servicio NEXO/src/servicios/api.ts).

Construí:
1. Un módulo nuevo servidor/diario.js con registrarDiario(app, db) que exponga:
   - GET  /api/diario           → mis registros no borrados (los del profesor de la sesión),
                                   más nuevos primero.
   - POST /api/diario           → crear (titulo, contenido, etiquetas).
   - PUT  /api/diario/:id       → editar; setea editado_en; solo el autor.
   - DELETE /api/diario/:id     → borrado suave (eliminado_en); solo el autor.
   Todos exigen sesión de profesor y validan que el registro sea del profesor que pide
   (permiso por fila en el servidor, no en el frontend).
2. Sumá el registrarDiario en servidor/servidor.js (import + llamada, como los demás).
3. Un servicio NEXO/src/servicios/diario.ts con las funciones que llaman a esos endpoints.
4. Conectá DiarioReflexivoProfesorPage.tsx: listar desde /api/diario, y que crear/editar/
   borrar usen el servicio y refresquen la lista. Reutilizá los componentes que ya tiene la
   página (FormularioNuevoRegistro, TarjetaRegistro) en vez de crear nuevos.

Reglas innegociables:
- Ningún dato inventado: los registros salen de nexo.db.
- Permisos en el servidor (que el diario es de quien lo escribió: nadie edita/borra el de
  otro), no escondiendo botones.
- Reutilizá el patrón de los módulos existentes; no dupliques helpers.
- No toques el sistema de navegación.

Cuando termines, decime:
1. Qué archivos cambiaste/creaste y por qué.
2. Cómo lo pruebo yo, paso a paso: entrá con garcia@sanmartin.nexo.edu, creá un registro,
   recargá (F5) y verificá que sigue; editalo; borralo; y comprobá que con OTRA cuenta de
   profesor no aparecen los registros de garcia@.
3. Qué quedó sin hacer, si algo quedó.
```

---

# PROMPT 3 — Competencias: cambiar de nivel y borrar evidencia (Error 2.D.12)

```
Tarea: agregar la ESCRITURA que le falta a Competencias. Hoy se ven en árbol con sus
evidencias (lectura, /api/objetivos), pero cambiar de nivel y borrar una evidencia no
escriben nada. Hay que hacer que persistan contra nexo.db.

Contexto que tenés que leer antes de tocar nada:
- servidor/objetivos.js → ahí ya está la LECTURA de competencias (competencia_avances +
  evidencias). Agregá los endpoints de escritura en ESTE mismo módulo, siguiendo su estilo.
- base-de-datos/esquema.sql → tablas competencia_avances (nivel CHECK IN
  ('iniciado','en-desarrollo','avanzado','dominado'), UNIQUE(competencia_id, estudiante_id))
  y evidencias. NO cambies el esquema.
- NEXO/src/paginas/CompetenciasPage.tsx y NEXO/src/servicios/objetivos.ts → la pantalla y
  el servicio a conectar.

Construí, dentro de servidor/objetivos.js:
- PUT /api/objetivos/competencias/:id/nivel  → cambia el nivel del estudiante de la sesión
  en esa competencia (upsert sobre competencia_avances respetando el UNIQUE; valida que
  nivel esté en el set permitido; actualiza actualizado_en). Solo el propio estudiante.
- DELETE /api/objetivos/evidencias/:id  → borra una evidencia. Solo si es del estudiante
  de la sesión (permiso por fila en el servidor).
Si querés, POST para agregar evidencia si todavía no existiera, siguiendo el mismo patrón.

Conectá CompetenciasPage.tsx y objetivos.ts: el control de nivel (subir/bajar o elegir) y
el botón de borrar evidencia deben llamar a esos endpoints y refrescar desde /api/objetivos.

Reglas innegociables:
- Ningún dato inventado; el nivel y las evidencias salen de nexo.db.
- El servidor valida que cada estudiante solo toca SUS competencias y evidencias.
- Reutilizá el módulo objetivos.js y el servicio existentes; no crees paralelos.
- No toques el sistema de navegación.

Cuando termines, decime:
1. Qué archivos cambiaste y por qué.
2. Cómo lo pruebo yo: entrá con julieta@sanmartin.nexo.edu, cambiá el nivel de una
   competencia, recargá y verificá que quedó; borrá una evidencia y verificá que no vuelve;
   comprobá que no podés borrar la evidencia de otro alumno.
3. Qué quedó sin hacer, si algo quedó.
```

---

# PROMPT 4 — Detalle de curso para la dirección (Error 6.C.2)

```
Tarea: que el botón "Ver detalle" de un curso en la gestión de la dirección abra una vista
de solo lectura con lo que tiene ese curso: sus materias/cátedras (y qué profesor da cada
una), sus alumnos inscriptos, su preceptor y las tareas de sus cátedras. Todo real, desde
nexo.db, en modo lectura (la dirección no edita desde acá).

Contexto que tenés que leer antes de tocar nada:
- servidor/perfiles.js → ahí vive la gestión de cursos de la dirección; fijate cómo lista
  cursos y cómo valida que quien pide sea rol dirección (admin-academico) con exigirAcceso.
  Sumá el endpoint de detalle en el módulo que corresponda (perfiles.js o panel.js, el que
  ya sirva /api/cursos).
- base-de-datos/esquema.sql → cursos, catedras, materias, inscripciones, usuarios, tareas.
- NEXO/src/paginas/PanelInstitucionalPage.tsx / PerfilesAcademicosPage.tsx y
  NEXO/src/paginas/components/cursos/ (TarjetaCurso, PanelCursos) → desde dónde se dispara
  "Ver detalle". Reutilizá esos componentes; no dupliques la grilla de cursos.
- NEXO/src/servicios/perfiles.ts o panel.ts → el servicio del frontend.

Construí:
- GET /api/cursos/:id/detalle  → devuelve, para ese curso de la institución de la sesión:
  { curso (año/división), preceptor, catedras: [{materia, profesor}], alumnos: [...],
    tareas: [{titulo, materia, fecha_limite, cantidad_entregas}] }. Solo rol dirección de
    la MISMA institución (permiso en el servidor; nunca datos de otro colegio).
- El servicio del frontend para llamarlo.
- Una vista/modal de detalle de curso en modo lectura, disparada por "Ver detalle".
  Reutilizá el estilo de las otras vistas de la dirección; no inventes números (si un curso
  no tiene tareas, se muestra vacío).

Reglas innegociables:
- Ningún dato inventado; todo del curso real.
- El servidor valida rol dirección y misma institución; nada de otro colegio.
- Reutilizá los componentes de cursos existentes; no dupliques.
- No toques el sistema de navegación.

Cuando termines, decime:
1. Qué archivos cambiaste/creaste y por qué.
2. Cómo lo pruebo yo: entrá con direccion@sanmartin.nexo.edu, gestión de cursos, "Ver
   detalle" de un curso, y verificá que se ven sus materias con sus profesores reales, sus
   alumnos y sus tareas; comprobá que no aparece nada de otra institución.
3. Qué quedó sin hacer, si algo quedó.
```

---

# PROMPT 5 — Papelera de perfiles: purga programada + auditoría (Error 6.B.5)

```
Tarea: completar la papelera de perfiles. OJO: gran parte ya existe en servidor/perfiles.js
(enviar a papelera, restaurar, y una purga de más de 7 días que hoy corre "al listar"). Lo
que falta según el Error 6.B.5 es: (a) que la purga de 7 días sea AUTOMÁTICA/programada, no
solo cuando alguien abre la lista, y (b) el registro completo y auditable de quién borró,
quién restauró y qué se purgó (hoy restaurar borra eliminado_por y se pierde el rastro).

Contexto que tenés que leer antes de tocar nada:
- servidor/perfiles.js → leé TODO el manejo de papelera actual: la constante
  DIAS_EN_PAPELERA, la consulta de purga, y los endpoints POST /api/perfiles/:id/papelera y
  POST /api/perfiles/:id/restaurar. No rehagas lo que ya anda; completalo.
- servidor/calendario.js → función programarLimpiezaEventos + cómo se la llama desde
  servidor/servidor.js. Es EXACTAMENTE el patrón de "rutina periódica" que hay que copiar
  para la purga de papelera (un setInterval que corre cada X horas).
- base-de-datos/esquema.sql → tabla papelera_movimientos (creada en el Prompt 1:
  usuario_afectado_id, accion 'a-papelera'|'restaurado'|'purgado', realizado_por_id,
  realizado_en). Usala para el historial.
- NEXO/src/paginas/PerfilesAcademicosPage.tsx → mostrá, en cada perfil en papelera, cuántos
  días le quedan antes de la purga (calculado desde eliminado_en + DIAS_EN_PAPELERA).

Construí:
1. Una función programarPurgaPapelera(db) en perfiles.js (o donde tenga más sentido) con el
   mismo patrón que programarLimpiezaEventos: cada cierto tiempo, purga los perfiles con más
   de DIAS_EN_PAPELERA en papelera y registra una fila 'purgado' en papelera_movimientos.
   Llamala desde servidor/servidor.js al arrancar, igual que se llama a programarLimpiezaEventos.
2. En los endpoints de papelera y restaurar, insertá una fila en papelera_movimientos con la
   acción, el afectado y realizado_por_id (el de la sesión). Al restaurar, NO pierdas el
   rastro: conservá el historial en papelera_movimientos aunque limpies eliminado_por del
   usuario.
3. En PerfilesAcademicosPage.tsx, mostrá "quedan N días" en cada perfil en papelera.
4. (Opcional) GET /api/perfiles/:id/movimientos para ver el historial auditable de ese perfil.

Reglas innegociables:
- Ningún dato inventado.
- Permisos en el servidor: solo rol dirección de la misma institución purga/restaura/audita.
- Reutilizá el patrón de programarLimpiezaEventos; no inventes un mecanismo nuevo.
- No dupliques lo que perfiles.js ya hace; completá.
- No toques el sistema de navegación.

Cuando termines, decime:
1. Qué archivos cambiaste y por qué.
2. Cómo lo pruebo yo: entrá con direccion@, mandá un perfil a la papelera, mirá que aparece
   "quedan 7 días" y que se registró el movimiento; restauralo y verificá que el historial
   quedó guardado. (Para probar la purga sin esperar 7 días, la IA debe indicarme cómo bajar
   temporalmente DIAS_EN_PAPELERA o forzar la rutina una vez.)
3. Qué quedó sin hacer, si algo quedó.
```
---

# PROMPT 6 — Votar recursos de la Biblioteca Nacional

```
Tarea: que se pueda votar (a favor / en contra) un recurso de la Biblioteca Nacional y que
el voto PERSISTA, único por usuario y recurso, contra nexo.db. Hoy el gesto existe pero los
votos arrancan siempre en cero y no se guardan.

Contexto que tenés que leer antes de tocar nada:
- base-de-datos/esquema.sql → tabla votos. En el Prompt 1 se sumó 'recurso' a su CHECK de
  objeto_tipo, así que un voto de recurso es una fila en votos con objeto_tipo='recurso',
  objeto_id=recurso.id, valor 1 o -1, UNIQUE(usuario_id, objeto_tipo, objeto_id). NO crees
  una tabla nueva.
- servidor/comunidad.js → ahí ya está la lógica de votar publicaciones/debates con esa misma
  tabla votos (poner, cambiar y sacar el voto). COPIÁ ese patrón; idealmente extraé o reutilizá
  la misma función para no duplicar la regla de voto.
- servidor/biblioteca.js → el módulo de biblioteca; sumá acá el endpoint de voto de recurso y
  hacé que la lectura de recursos devuelva el conteo real de votos y el voto del usuario actual.
- NEXO/src/paginas/BibliotecaNacionalPage.tsx → hoy pone votosPositivos/votosNegativos en 0 a
  propósito (hay un comentario que lo explica). Conectalo al conteo real y al voto propio.
- NEXO/src/servicios/biblioteca.ts → el servicio del frontend.

Construí:
- POST /api/biblioteca/recursos/:id/voto  → body { valor: 1 | -1 }; pone/cambia/saca el voto
  del usuario de la sesión (mismo comportamiento que el voto de comunidad). Solo usuarios con
  permiso de ver ese recurso.
- Que la lectura de recursos (la que ya usa la Biblioteca Nacional) devuelva votosPositivos,
  votosNegativos y miVoto reales, calculados de la tabla votos.
- Conectá la página y el servicio: los botones ▲/▼ muestran el estado real y persisten tras
  recargar.

Reglas innegociables:
- Ningún dato inventado; los conteos salen de la tabla votos.
- El voto es único por usuario y recurso (lo garantiza el UNIQUE); validado en el servidor.
- Reutilizá la lógica de voto de comunidad.js; no dupliques la regla.
- No toques el sistema de navegación.

Cuando termines, decime:
1. Qué archivos cambiaste y por qué.
2. Cómo lo pruebo yo: entrá con julieta@, votá un recurso nacional, recargá (F5) y verificá
   que el voto sigue; cambialo y sacalo; entrá con otra cuenta y verificá que el conteo suma
   los dos y que cada uno vota una sola vez.
3. Qué quedó sin hacer, si algo quedó.
```

---

# PROMPT 7 — Feed de Comunidad: barra lateral derecha de tendencias

```
Tarea: en el Feed de Comunidad hay un espacio desaprovechado a la derecha. Poné ahí una
barra lateral (sidebar) que sea una PREVISUALIZACIÓN de tendencias (un resumen con los
hashtags/temas y las publicaciones o debates en tendencia). Al hacer clic en esa barra (o en
un ítem o en un "ver todo"), navega a la pestaña Tendencias.

Contexto que tenés que leer antes de tocar nada:
- NEXO/src/servicios/comunidad.ts → ya existe el hook/función que trae las tendencias reales
  (usa /api/comunidad/tendencias?alcance=...). REUTILIZALO; no pidas los datos de otra forma.
- NEXO/src/paginas/TendenciasPage.tsx → cómo se muestran hoy las tendencias y a qué ruta
  navegan (/comunidad/tendencias). La sidebar debe llevar ahí.
- NEXO/src/paginas/ComunidadPage.tsx → el layout del Feed. Acá va la columna derecha. NO
  rompas la navegación de pestañas Feed/Debates/Tendencias que ya funciona.
- NEXO/src/paginas/components/comunidad/ → componentes reutilizables del módulo.

Construí:
- Un componente de sidebar de tendencias (ej. NEXO/src/paginas/components/comunidad/
  SidebarTendencias.tsx) que use el mismo servicio de tendencias, muestre un resumen (top N
  temas/publicaciones/debates por votos reales) y, al clickearse, navegue a
  /comunidad/tendencias. Si no hay tendencias, se muestra vacío y honesto (no invents).
- Ubicalo en la columna derecha del Feed en ComunidadPage.tsx, aprovechando el espacio que
  hoy queda vacío, sin romper el layout responsivo (en pantallas chicas puede ocultarse o ir
  abajo, no debe generar scroll horizontal).

Reglas innegociables:
- Ningún dato inventado: las tendencias salen del mismo endpoint real que ya se usa.
- Reutilizá el servicio de tendencias y los componentes del módulo; no dupliques.
- No toques el sistema de navegación de pestañas ni las rutas; solo agregás la sidebar.

Cuando termines, decime:
1. Qué archivos cambiaste/creaste y por qué.
2. Cómo lo pruebo yo: entrá con julieta@ al Feed, mirá la sidebar derecha con las tendencias
   reales, hacé clic y verificá que me lleva a Tendencias; probá en ventana angosta que no
   rompe el layout.
3. Qué quedó sin hacer, si algo quedó.
```

---

# PROMPT 8 — Portafolio: subnavegación (top-bar) en "Mis Cursos"

```
Tarea: arreglar que, en el Portafolio del estudiante, al entrar a "Mis Cursos" NO se puede
volver a "Mis Tareas" ni a "Mis Calificaciones" porque esa pantalla no tiene la barra de
subnavegación que sí tienen las otras. Hay que agregarle la MISMA subnavegación compartida.

Contexto que tenés que leer antes de tocar nada:
- NEXO/src/paginas/MisTareasEstudiantePage.tsx y CalificacionesPage.tsx → mirá qué componente
  de subnavegación usan (la barra Mis Tareas / Mis Cursos / Calificaciones) y cómo lo montan.
- NEXO/src/paginas/MisCursosEstudiantePage.tsx → esta es la que le FALTA la barra. Agregásela
  reutilizando el MISMO componente, no una copia.
- NEXO/src/navegacion.tsx → cómo se define qué ítem del menú/subnav queda activo por ruta
  (MAPA_RUTAS). Asegurate de que "Portafolio" siga encendido en las tres sub-pantallas.

Construí:
- Usá el componente de subnavegación existente en MisCursosEstudiantePage.tsx, de modo que
  desde Mis Cursos se pueda ir y volver a Mis Tareas y Calificaciones, con el mismo aspecto y
  comportamiento que en las otras dos. Si ese componente hoy está embebido en una sola página,
  extraelo a components/portafolio/ para compartirlo (sin cambiar cómo se ve en las otras).

Reglas innegociables:
- Reutilizá el componente de subnavegación; no dupliques uno nuevo con otro estilo.
- No cambies datos ni endpoints: es solo navegación.
- La sección "Portafolio" del menú lateral debe quedar activa en las tres sub-pantallas.
- No toques nada más del sistema de navegación.

Cuando termines, decime:
1. Qué archivos cambiaste y por qué.
2. Cómo lo pruebo yo: entrá con julieta@, andá a Portafolio → Mis Cursos, y verificá que
   desde ahí puedo volver a Mis Tareas y a Calificaciones con la barra de arriba, y que
   "Portafolio" queda marcado en el menú en las tres.
3. Qué quedó sin hacer, si algo quedó.
```

---

# PROMPT 9 — Detalle de materia del estudiante (horarios, avisos, tareas)

```
Tarea: hoy, al hacer clic en la card de una materia en "Mis Cursos", te lleva directo a "Mis
Tareas". En su lugar debe abrirse una VISTA DE DETALLE DE LA MATERIA para el estudiante, con:
el profesor de la materia, los horarios y días en que se dicta, los avisos/mensajes del
profesor (que el alumno puede reaccionar con un emoji o responder) y las tareas de esa
materia. Todo real, desde nexo.db.

Contexto que tenés que leer antes de tocar nada:
- base-de-datos/esquema.sql → tablas creadas en el Prompt 1: catedra_horarios (día/hora),
  catedra_avisos (aviso del profe), aviso_reacciones (emoji: 👍 ❤️ 🎉 😮 ✅, uno por usuario),
  aviso_respuestas (respuestas de texto). Y las existentes: catedras (materia+curso+profesor),
  materias, usuarios, tareas, inscripciones.
- NEXO/src/paginas/MisCursosEstudiantePage.tsx y components/portafolio/TarjetaCurso.tsx → de
  dónde sale el clic en la card de materia. Ese clic ahora abre el detalle de la materia, no
  Mis Tareas.
- servidor/portafolio.js → cómo /api/portafolio arma los cursos/materias del estudiante con
  permiso (exigirAcceso, inscripciones). Sumá acá (o en un módulo materia.js nuevo, como
  prefieras siguiendo el patrón) los endpoints de detalle de materia.
- servidor/comunidad.js → patrón de comentarios/votos, por si querés reutilizar la forma de
  responder/reaccionar (pero usá las tablas aviso_respuestas / aviso_reacciones).
- NEXO/src/servicios/portafolio.ts → el servicio del frontend.

Construí en el servidor:
- GET /api/materias/:catedraId/detalle → para el estudiante inscripto en el curso de esa
  cátedra: { materia, profesor, horarios: [{dia, hora_inicio, hora_fin, aula}],
  tareas: [...de esa cátedra...] }. Valida en el servidor que el estudiante esté inscripto en
  ese curso; si no, 403.
- GET /api/materias/:catedraId/avisos → los avisos de esa cátedra (no borrados), cada uno con
  su conteo de reacciones por emoji, mi reacción, y sus respuestas.
- POST /api/materias/avisos/:avisoId/reaccion → body { emoji }; pone/cambia/saca mi reacción
  (respetando el UNIQUE de aviso_reacciones). Solo alumnos del curso de esa cátedra.
- POST /api/materias/avisos/:avisoId/respuesta → body { contenido }; crea una respuesta mía.
  Solo alumnos del curso de esa cátedra.
Sumá el registrarX correspondiente en servidor/servidor.js y su página en permisos.js si hace
falta.

Construí en el frontend:
- Una vista de detalle de materia (ej. NEXO/src/paginas/DetalleMateriaPage.tsx + ruta propia,
  o un panel dentro de Portafolio) que muestre profesor, la grilla de horarios/días, la lista
  de avisos con sus reacciones (botones de emoji del set fijo) y respuestas, y las tareas de
  la materia. Reutilizá ModalDetalleTarea / TarjetaTarea para las tareas; no dupliques.
- Cambiá el clic de la card de materia para que abra este detalle (no Mis Tareas).
- Mantené la subnavegación del Portafolio visible (coordiná con el Prompt 8).

Reglas innegociables:
- Ningún dato inventado: profesor, horarios, avisos y tareas salen de nexo.db. Si una materia
  no tiene avisos o tareas, se ve vacía y honesta.
- Permisos en el servidor: solo alumnos inscriptos en ese curso ven el detalle, reaccionan y
  responden; se valida por fila, no escondiendo botones.
- Reutilizá componentes existentes (tareas, tarjetas) y el patrón de comunidad para
  reacciones/respuestas; no dupliques.
- No rompas el sistema de navegación existente.

Cuando termines, decime:
1. Qué archivos cambiaste/creaste y por qué.
2. Cómo lo pruebo yo: entrá con julieta@, Portafolio → Mis Cursos, hacé clic en una materia y
   verificá que veo profesor, horarios/días, los avisos del profe, y sus tareas; reaccioná a
   un aviso con un emoji y respondé; recargá (F5) y verificá que persiste; comprobá que un
   alumno de otro curso no puede ver ese detalle.
3. Qué quedó sin hacer, si algo quedó.
```

---

# PROMPT 10 — Vista de materia del profesor (avisos, alumnos, gráficos de progreso)

```
Tarea: construir la vista de la materia para el PROFESOR. El profesor puede: publicar avisos
para su cátedra (los mismos catedra_avisos que ve el alumno), ver quiénes reaccionaron y las
respuestas a cada aviso, ver la lista de alumnos de la materia, y hacer clic en cada alumno
para ver cómo le está yendo con GRÁFICOS (líneas/barras) de cómo progresó en las tareas de la
materia a lo largo del tiempo, más las tareas que tiene hechas o que adeuda. IMPORTANTE: esos
gráficos son SOLO para el profesor, nunca para el alumno, y eso se valida en el servidor.

Requiere Recharts instalado (ver punto 0.1 de este plan: yarn add recharts en NEXO/).

Contexto que tenés que leer antes de tocar nada:
- El Prompt 9 (detalle de materia del estudiante) y sus endpoints/tablas: catedra_avisos,
  aviso_reacciones, aviso_respuestas, catedra_horarios. Reutilizá lo que ya construyó.
- servidor/portafolio.js y servidor/tareas.js → cómo salen las tareas, entregas y correcciones
  (tabla correcciones tiene la nota real y corregido_en: esa es la serie temporal del
  progreso). Cómo se valida quién es el profesor dueño de una cátedra.
- base-de-datos/esquema.sql → catedras (profesor_id), tareas, entregas, correcciones (nota,
  corregido_en), inscripciones. La nota va de 1 a 10 (CHECK).
- NEXO/src/paginas/GestionTareasProfesorPage.tsx y components/portafolio-docente/ → estilo de
  las vistas del profesor; reutilizá lo que puedas (ModalPanelCorreccion, tarjetas).
- NEXO/src/servicios/portafolio.ts / tareas.ts → servicios del frontend.

Construí en el servidor:
- POST /api/materias/:catedraId/avisos → el profesor DUEÑO de esa cátedra publica un aviso
  (contenido, titulo opcional, archivo opcional). PUT/DELETE para editar/borrar su aviso
  (borrado suave). Validá en el servidor que autor_id sea el profesor de esa cátedra.
- GET /api/materias/:catedraId/avisos/:avisoId/detalle → quiénes reaccionaron (con qué emoji)
  y las respuestas, para que el profe las vea. Solo el profesor de la cátedra.
- GET /api/materias/:catedraId/alumnos → la lista de alumnos inscriptos en el curso de esa
  cátedra. Solo el profesor de la cátedra.
- GET /api/materias/:catedraId/alumnos/:alumnoId/progreso → SOLO para el profesor de la
  cátedra (o dirección): { serie: [{fecha: corregido_en, nota}], entregadas: [...],
  adeudadas: [...tareas de la cátedra sin entrega de ese alumno...] }. Si lo pide el propio
  alumno u otro rol, responde 403: el progreso analítico es del docente. Nada de datos
  inventados: la serie sale de correcciones reales.

Construí en el frontend:
- Una vista de materia del profesor (reutilizando el detalle del Prompt 9 donde tenga sentido)
  con: el compositor de avisos, la lista de avisos con "ver reacciones/respuestas", la lista
  de alumnos, y al clickear un alumno un panel con:
  - Un gráfico de LÍNEA (evolución de las notas en el tiempo) y/o de BARRAS (nota por tarea)
    hecho con Recharts. Poné el/los gráfico(s) en un componente compartido, ej.
    NEXO/src/paginas/components/portafolio-docente/GraficoProgresoAlumno.tsx.
  - La lista de tareas ENTREGADAS y ADEUDADAS de ese alumno en la materia.
  Estos gráficos se muestran SOLO en la vista del profesor; la vista del alumno (Prompt 9) NO
  los tiene.
- Que el gráfico sea legible y responsivo (usá ResponsiveContainer de Recharts; que no genere
  scroll horizontal). Si el alumno no tiene notas todavía, mostrá un estado vacío honesto, no
  una línea inventada.

Reglas innegociables:
- Ningún dato inventado: avisos, alumnos y la serie de notas salen de nexo.db (tabla
  correcciones). Sin notas → gráfico vacío.
- Permisos en el servidor: solo el profesor dueño de la cátedra (o dirección) publica avisos y
  ve el progreso de un alumno; el alumno NO puede pedir su propio /progreso (403). No alcanza
  con esconder el gráfico en el frontend.
- Reutilizá el detalle de materia del Prompt 9, las tablas de avisos ya creadas y los
  componentes del profesor; no dupliques.
- No rompas el sistema de navegación.

Cuando termines, decime:
1. Qué archivos cambiaste/creaste y por qué.
2. Cómo lo pruebo yo: entrá con garcia@, abrí una de sus materias, publicá un aviso y verificá
   que julieta@ lo ve (y que garcia@ ve quién reaccionó/respondió); hacé clic en un alumno y
   mirá el gráfico de progreso y sus tareas hechas/adeudadas. Después entrá con julieta@ y
   verificá que NO existe ningún gráfico de progreso para ella y que, si intento pedir el
   endpoint /progreso como alumno, el servidor lo rechaza (403).
3. Qué quedó sin hacer, si algo quedó.
```



---

# PROMPT 11 — (Secundario) Plantillas por institución (Error 5.A.10)

> El propio informe marca esto como **secundario**. Hacelo solo si querés cerrar el 100%.

```
Tarea: dar al Administrador de plataforma la posibilidad de definir "plantillas por
institución": un conjunto base (materias sugeridas, competencias base, tipos de evento, etc.)
que se puede aplicar al dar de alta o configurar una institución, para no cargar todo a mano.

Contexto que tenés que leer antes de tocar nada:
- servidor/plataforma.js → el módulo del Administrador de plataforma (rol 'administrador'):
  cómo da de alta instituciones y qué permisos valida. La plantilla vive acá.
- servidor/institucion.js y base-de-datos/esquema.sql → estructura de instituciones,
  materias, competencias.
- NEXO/src/paginas/GestionInstitucionesPage.tsx → la pantalla del administrador donde se
  gestionan instituciones.

Decidí y proponeme primero (antes de codear) el modelo mínimo: una tabla plantillas +
plantilla_items (o JSON por plantilla) y un endpoint para crear una plantilla y otro para
aplicarla a una institución. Mantenelo chico y honesto.

Construí, tras acordar el modelo:
- La(s) tabla(s) en esquema.sql (recordá que tras tocar el esquema hay que recrear la base
  con node crear-base.mjs --forzar).
- Los endpoints en plataforma.js: crear plantilla, listar, aplicar a una institución. Solo
  rol 'administrador' (permiso en el servidor).
- La UI en GestionInstitucionesPage.tsx para crear una plantilla y aplicarla.

Reglas innegociables:
- Ningún dato inventado.
- Permisos en el servidor: solo el Administrador de plataforma.
- Reutilizá el módulo plataforma.js; no dupliques.
- El Administrador NO debe ver datos internos de un colegio (alumnos, notas, comunidad):
  las plantillas son estructura, no contenido.
- No toques el sistema de navegación.

Cuando termines, decime:
1. Qué archivos cambiaste/creaste y por qué.
2. Cómo lo pruebo yo: entrá con sistema@nexo.edu, creá una plantilla y aplicala a una
   institución; verificá que la estructura quedó aplicada y que sigo sin ver datos internos
   del colegio.
3. Qué quedó sin hacer, si algo quedó.
```

---

# SEGUNDA TANDA — Errores nuevos encontrados después de la Etapa 10 (Prompts 12–17)

> **De dónde sale esto.** Probando la app aparecieron errores que no estaban en
> `ERRORES_DETALLADOS.md`: no se puede postear con fecha programada, los "fijados" no
> existen de verdad en la base (nadie puede sacarlos), cada perfil tiene su propia
> versión de los mismos elementos (las tareas del profesor no usan los componentes
> estilo Todoist que ya tiene el estudiante), el calendario no le aparece a todos los
> que debería, los modales de creación (tareas, eventos) tildan la computadora, y el
> aula virtual depende de Jitsi (un servicio externo que se puede romper o cortar).
>
> **Regla nueva que va en TODOS los prompts de esta tanda:** el frontend está muy roto
> y tiene que avanzar **a la par** del backend. Ningún prompt entrega "el endpoint
> anda pero la pantalla después": cada prompt termina con la pantalla conectada,
> probada con las cuentas de prueba, y sin regresiones visuales en los otros roles.

## Orden recomendado de la segunda tanda

| # | Tarea | Toca base | Depende de |
|---|---|---|---|
| 12 | Preparación de base 2: publicación programada + fijados reales | ✅ | 1 |
| 13 | Comunidad: postear con fecha, permisos de dirección/centro, sacar fijados | — | 12 |
| 14 | Calendario: que los eventos le aparezcan a todos los que corresponde | — | — |
| 15 | Unificación de UI: las tareas del profesor usan los componentes del estudiante | — | — |
| 16 | Rendimiento: los modales de creación no pueden tildar la computadora | — | — |
| 17 | Videollamadas propias (WebRTC sin servicio externo, chau Jitsi) | — | — |

> El 16 (rendimiento) se puede hacer primero si la máquina se tilda tanto que molesta
> para probar el resto. El 17 es el más grande de todos; dejalo para el final.

---

# PROMPT 12 — Preparación de base 2: publicación programada + fijados reales

```
Tarea: agregar a la base de datos lo que necesitan los arreglos de la segunda tanda:
publicar con fecha programada y que los "fijados" existan de verdad en la base (hoy
son decoración del frontend: no hay ninguna columna fijado en el esquema, por eso
nadie puede sacarlos). NO construyas todavía endpoints ni pantallas: SOLO esquema y
seed, igual que el Prompt 1.

Contexto que tenés que leer antes de tocar nada:
- base-de-datos/esquema.sql → tablas publicaciones, debates, comunicados (o la tabla
  real donde viven los comunicados de la dirección: buscala, no asumas el nombre).
  Respetá el estilo: nombres en español, fechas ISO en texto, CHECK, borrado suave.
- base-de-datos/datos-iniciales.sql → cuentas y contenido de prueba existentes; el
  seed nuevo referencia esos MISMOS ids.
- NEXO/src/paginas/components/familia-comunicados/TarjetaComunicado.tsx y
  NEXO/src/paginas/TendenciasPage.tsx → dónde el frontend hoy muestra "fijado" sin
  que exista en la base; eso es lo que esta tanda vuelve real.

Agregá al esquema (y NADA más):

1. Publicación programada: columna publicar_en TEXT (fecha-hora ISO, NULL = publicar
   ya) en publicaciones y en la tabla de comunicados. Regla: una fila con publicar_en
   en el futuro NO aparece en ningún listado hasta que llegue su hora (eso lo harán
   las consultas del Prompt 13; acá solo va la columna).
2. Fijados reales: columnas fijado_en TEXT y fijado_por_id (REFERENCES usuarios) en
   publicaciones y en la tabla de comunicados. NULL = no fijado. Quién puede fijar y
   desfijar lo valida el servidor en el Prompt 13.

Después, en datos-iniciales.sql:
- Un comunicado o publicación FIJADA por la dirección real (direccion@sanmartin),
  para que el botón "desfijar" tenga algo que desfijar al probar.
- Una publicación con publicar_en en el futuro (ej. dentro de 2 días), para verificar
  que NO aparece en el feed hasta esa fecha.

Reglas innegociables:
- Ningún dato inventado fuera del seed; referenciá ids que ya existen.
- No borres ni renombres nada existente; solo agregá columnas y seed.
- Respetá el estilo del esquema actual.

Cuando termines, decime:
1. Qué archivos cambiaste y qué columnas/seed agregaste, una línea por cada una.
2. Cómo lo pruebo yo: node crear-base.mjs --forzar y una consulta SQL por cambio
   (ver la fila fijada y la programada).
3. Qué quedó sin hacer, si algo quedó.
```

**Después de este prompt, recreá la base (`node crear-base.mjs --forzar`) y reiniciá el
servidor.** Ojo: como en el Prompt 1, esto borra lo que hayas cargado a mano.

---