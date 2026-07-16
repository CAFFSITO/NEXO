# NEXO — Plan de reconstrucción paso a paso

> **Para quién es este documento.** Para cualquier persona, sepa o no programar. Explica **en qué orden** corregir los errores de NEXO, **qué instalar** en la computadora (con los comandos exactos para copiar y pegar), **cómo crear la base de datos** que hace que todo funcione de verdad (con el código completo incluido acá), y **cómo apoyarse en una IA** para que escriba el código, sin perder el control de lo que está pasando.
>
> Este plan trabaja en equipo con **`ERRORES_DETALLADOS.md`** (está en esta misma carpeta): ese documento dice *qué está mal* (secciones 2 a 13) y *cómo debe funcionar cada cosa por dentro* (sección 14). Este plan dice *en qué orden hacerlo y con qué herramientas*. Cuando acá se nombra un error (por ejemplo "Error 2.B.2") o una sección (por ejemplo "sección 14.4"), se refiere a ese documento.

---

## 1. Cómo usar este plan

La idea central: **vos dirigís, la IA programa.** No hace falta escribir código a mano; hace falta entender qué se está construyendo, pedirlo en orden y comprobar que quedó bien. Cada etapa de este plan tiene:

- **Objetivo:** qué va a poder hacer la aplicación cuando termine la etapa.
- **Qué pedirle a la IA:** la tarea descrita con tus palabras (este documento no trae textos listos para copiar; trae el *contenido* del pedido, que podés decir como quieras).
- **Instalaciones:** si la etapa necesita instalar algo, está el comando exacto.
- **Cómo comprobar:** una prueba concreta que vos mismo podés hacer para saber si la etapa quedó terminada.

**Las cinco reglas de oro:**

1. **Un paso por vez.** Nunca le pidas a la IA dos etapas juntas. Terminó una, la comprobaste, recién ahí la siguiente.
2. **Guardá una "foto" después de cada paso que funciona** (con la herramienta *git*, se explica en el punto 3.2). Si algo se rompe después, volvés a la última foto y no perdiste nada.
3. **No aceptes datos inventados.** Si en una pantalla aparece un número o un nombre, tiene que salir de la base de datos. Si la IA te muestra una pantalla "linda" con datos de ejemplo escritos adentro, pedile que los saque: ese es exactamente el error de fondo de la aplicación actual.
4. **Los permisos se controlan en el servidor.** Que un botón esté escondido no alcanza: la "cocina" (punto 2) tiene que negarse a servir un plato a quien no le corresponde.
5. **Pedile siempre a la IA dos cosas al final de cada tarea:** que te explique **qué cambió y por qué**, y que te diga **cómo probarlo vos mismo**. Si no podés probarlo, no está terminado.

---

## 2. Los cuatro conceptos que hay que entender (sin tecnicismos)

Para dirigir la obra hay que conocer las cuatro piezas. Con una analogía de restaurante:

**🪟 La vidriera (la aplicación que se ve en el navegador).** Es todo lo que hoy existe de NEXO: las pantallas, los botones, los colores. El problema, como explica el diagnóstico de `ERRORES_DETALLADOS.md`, es que hoy NEXO es **solo** vidriera: los platos exhibidos son de utilería. Cuando alguien "publica un comentario", el comentario no va a ningún lado; cuando recarga la página, desaparece todo.

**🗄️ El archivador (la base de datos).** Un archivo en la computadora donde se guarda **todo de verdad**: cada usuario, cada tarea, cada nota, cada comentario, cada mensaje. Está organizado en **tablas**, que son como planillas: hay una planilla de usuarios, una de tareas, una de comentarios, etc. En este plan la base de datos se llama `nexo.db` y **el código completo para crearla está en el punto 4** — solo hay que copiarlo, pegarlo y ejecutar un comando.

**👨‍🍳 La cocina (el servidor).** Un programa que corre en la computadora, es el único que puede abrir el archivador, y atiende los pedidos de la vidriera: "dame las tareas de Julieta", "guardá este comentario", "¿este usuario puede borrar esta publicación?". La cocina **decide permisos**: si un estudiante pide borrar un debate, la cocina dice que no, aunque la vidriera se lo hubiese permitido. Hoy NEXO no tiene cocina; construirla es el punto 5.

**📨 El mensajero (la conexión en vivo).** Un canal siempre abierto entre la vidriera y la cocina para las cosas que deben llegar al instante: un mensaje de chat, una notificación, lo que pasa dentro de una clase en vivo. Sin el mensajero, habría que recargar la página para ver si llegó algo. Se construye en la etapa 6.

**Ejemplo completo — cómo funciona un comentario cuando todo esté construido:** Julieta escribe "¡Yo tengo los apuntes!" y toca enviar → la vidriera le pasa el texto a la cocina → la cocina verifica que Julieta tiene sesión abierta y permiso para comentar → guarda una fila nueva en la planilla `comentarios` del archivador → le avisa por el mensajero a los que están mirando esa publicación → a Martín le aparece el comentario al instante, y aunque los dos apaguen la computadora, mañana el comentario sigue ahí. Hoy, en cambio, ese botón no hace absolutamente nada (Error 2.B.2).

---

## 3. Preparar la computadora (se hace una sola vez)

### 3.1. Node.js — el motor que ejecuta todo

Node.js es el programa que permite ejecutar tanto la aplicación como la cocina y el creador de la base de datos. Probablemente ya esté instalado (el proyecto lo usa). Para comprobarlo, abrí una **terminal** (en Visual Studio Code: menú *Terminal → New Terminal*; o buscá "PowerShell" en el menú de inicio de Windows) y escribí:

```
node --version
```

Tiene que responder un número de versión **22.5 o mayor** (por ejemplo `v24.18.0`). Si dice que no reconoce el comando o la versión es más vieja, descargalo de **https://nodejs.org** (botón grande "LTS"), instalalo dándole "siguiente" a todo, cerrá y volvé a abrir la terminal, y probá de nuevo.

> ¿Por qué importa la versión? Porque desde la 22.5, Node.js trae **incluido** el manejo de bases de datos SQLite: no hay que instalar nada extra para el archivador.

### 3.2. Git — la máquina de fotos del proyecto

Git guarda "fotos" (llamadas *commits*) del estado del proyecto. Si un cambio rompe algo, se vuelve a la foto anterior. Comprobá si está instalado:

```
git --version
```

Si no está, descargalo de **https://git-scm.com** e instalalo con las opciones por defecto. Después, parado en la carpeta del proyecto, inicializalo (una sola vez):

```
cd C:\NEXO-main\NEXO-main
git init
git add -A
git commit -m "Estado inicial: la maqueta visual antes de la reconstrucción"
```

De ahí en adelante, **después de cada etapa que funcione**, sacá la foto:

```
git add -A
git commit -m "acá escribís qué se terminó, por ejemplo: Etapa 1 lista, login real"
```

Y si algo se rompió y querés volver atrás, pedile a la IA que te ayude a "volver al último commit" — para eso están las fotos.

### 3.3. DB Browser for SQLite — para espiar el archivador (recomendado)

Es un programa gratuito con ventanas para abrir `nexo.db` y ver las planillas con tus propios ojos: los usuarios, los comentarios, las notas. No es obligatorio, pero da muchísima tranquilidad poder verificar que las cosas se están guardando de verdad. Se descarga de **https://sqlitebrowser.org**.

### 3.4. Yarn — el encargado de descargar las piezas

Este proyecto usa **yarn** para descargar e instalar las piezas de código que la aplicación necesita (todos los comandos de este plan lo usan). Comprobá si está instalado:

```
yarn --version
```

Si responde un número, listo. Si dice que no reconoce el comando, activalo con este comando (viene incluido con Node.js) y volvé a probar:

```
corepack enable
```

(Si `corepack enable` da un error de permisos, cerrá la terminal y abrila de nuevo eligiendo "Ejecutar como administrador".)

### 3.5. Poner en marcha la aplicación actual

Para ver la maqueta como está hoy (y comprobar que el entorno funciona):

```
cd C:\NEXO-main\NEXO-main\NEXO
yarn
yarn dev
```

- `yarn` (solo, sin nada más) descarga las piezas que la aplicación ya usa (tarda unos minutos la primera vez; solo hace falta de nuevo si se agregan piezas).
- `yarn dev` la enciende: la terminal muestra una dirección tipo `http://localhost:5173`; abrila en el navegador.

Para apagarla: en la terminal, teclas `Ctrl` + `C`.

---

## 4. Crear la base de datos local (el archivador) — con todo el código

Esta es la pieza que hace que los comentarios, las notas, los mensajes y todo lo demás **existan de verdad**. Son cuatro archivos que se crean copiando y pegando los bloques de código de abajo, y un comando para ejecutar.

### 4.1. Crear la carpeta y los archivos

1. Dentro de `C:\NEXO-main\NEXO-main`, creá una carpeta nueva llamada **`base-de-datos`**.
2. Adentro creá un archivo de texto llamado **`esquema.sql`** y pegale el **Bloque A** (abajo). Este archivo describe todas las planillas del archivador: qué columnas tiene cada una y qué reglas cumple (por ejemplo, "una nota va de 1 a 10" o "una persona solo puede votar una vez cada cosa").
3. Creá **`datos-iniciales.sql`** y pegale el **Bloque B**. Son los datos de ejemplo para probar: un colegio, 18 personas, cursos, tareas con notas, comentarios, chats, eventos. Están hechos **coherentes**: a diferencia de la maqueta actual, acá cada docente tiene un solo nombre y cada trabajo una sola nota (arregla de raíz la sección 13 del informe de errores).
4. Creá **`crear-base.mjs`** y pegale el **Bloque C**. Es el "constructor": lee los dos archivos anteriores y arma la base `nexo.db`.
5. (Opcional) Creá **`README.md`** con el **Bloque D**, una portada breve para quien entre a la carpeta.

> **Consejo:** también podés pedirle a la IA que cree estos cuatro archivos por vos con exactamente este contenido — es un pedido perfecto para delegar.

### 4.2. Bloque A — `esquema.sql` (las planillas del archivador)

```sql
-- ============================================================================
-- NEXO — Esquema de la base de datos local (SQLite)
-- ----------------------------------------------------------------------------
-- Este archivo crea TODAS las tablas de la plataforma. Cada tabla corresponde
-- a una función descrita en la sección 14 de ERRORES_DETALLADOS.md.
-- Convenciones:
--   * Nombres en español, en minúsculas, con guion bajo.
--   * Fechas y horas en texto ISO ("2026-07-03" / "2026-07-03T14:30:00").
--   * Borrado suave: columnas eliminado_en / estado 'papelera' donde aplica.
--   * Los valores posibles de cada columna "de opciones" están limitados
--     con CHECK, para que la base rechace datos inválidos.
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ============================================================================
-- 1. NÚCLEO INSTITUCIONAL (sección 14.1)
-- ============================================================================

-- Cada colegio dado de alta por el Administrador de plataforma.
CREATE TABLE instituciones (
    id              INTEGER PRIMARY KEY,
    nombre          TEXT NOT NULL,
    ciclo_lectivo   INTEGER NOT NULL,            -- año lectivo vigente (ej. 2026)
    creado_en       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Todas las personas que pueden iniciar sesión. La contraseña se guarda
-- CIFRADA (hash), nunca en texto plano. El administrador de plataforma
-- tiene institucion_id NULL (no pertenece a ningún colegio).
CREATE TABLE usuarios (
    id              INTEGER PRIMARY KEY,
    institucion_id  INTEGER REFERENCES instituciones(id),
    email           TEXT NOT NULL UNIQUE,
    hash_contrasena TEXT NOT NULL,
    nombre          TEXT NOT NULL,
    rol             TEXT NOT NULL CHECK (rol IN (
                        'estudiante','profesor','preceptor','admin-academico',
                        'centro-estudiantes','bibliotecario','familia','administrador')),
    avatar_url      TEXT,
    estado          TEXT NOT NULL DEFAULT 'activo'
                        CHECK (estado IN ('activo','inactivo','papelera')),
    eliminado_en    TEXT,                        -- cuándo pasó a papelera (14.17)
    eliminado_por   INTEGER REFERENCES usuarios(id),
    creado_en       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sesiones abiertas: la "llave" que el navegador guarda para sobrevivir
-- a las recargas (Error 12.1). El servidor valida el token en cada pedido.
CREATE TABLE sesiones (
    id          INTEGER PRIMARY KEY,
    usuario_id  INTEGER NOT NULL REFERENCES usuarios(id),
    token       TEXT NOT NULL UNIQUE,
    creado_en   TEXT NOT NULL DEFAULT (datetime('now')),
    expira_en   TEXT NOT NULL
);

-- Divisiones del colegio (4°A, 4°B...). El preceptor a cargo lo asigna
-- la dirección (Error 7.A.4): esta columna es LA única fuente de verdad.
CREATE TABLE cursos (
    id              INTEGER PRIMARY KEY,
    institucion_id  INTEGER NOT NULL REFERENCES instituciones(id),
    anio            INTEGER NOT NULL,            -- 1..6
    division        TEXT NOT NULL,               -- "A", "B"...
    preceptor_id    INTEGER REFERENCES usuarios(id),
    UNIQUE (institucion_id, anio, division)
);

-- Materias de la institución.
CREATE TABLE materias (
    id              INTEGER PRIMARY KEY,
    institucion_id  INTEGER NOT NULL REFERENCES instituciones(id),
    nombre          TEXT NOT NULL
);

-- Unidades temáticas de cada materia. Alimenta el selector "Unidad"
-- del formulario de metas (Error 2.D.8).
CREATE TABLE unidades (
    id          INTEGER PRIMARY KEY,
    materia_id  INTEGER NOT NULL REFERENCES materias(id),
    numero      INTEGER NOT NULL,
    titulo      TEXT NOT NULL
);

-- Cátedra = qué profesor da qué materia en qué curso. Resuelve
-- "elegir materia/curso cuando el profesor da varias" (Error 3.C.1).
CREATE TABLE catedras (
    id          INTEGER PRIMARY KEY,
    materia_id  INTEGER NOT NULL REFERENCES materias(id),
    curso_id    INTEGER NOT NULL REFERENCES cursos(id),
    profesor_id INTEGER NOT NULL REFERENCES usuarios(id),
    UNIQUE (materia_id, curso_id)
);

-- Qué estudiante pertenece a qué curso.
CREATE TABLE inscripciones (
    id            INTEGER PRIMARY KEY,
    curso_id      INTEGER NOT NULL REFERENCES cursos(id),
    estudiante_id INTEGER NOT NULL REFERENCES usuarios(id),
    UNIQUE (curso_id, estudiante_id)
);

-- Vínculo familia ↔ estudiante. Define qué ve cada familia
-- (calendario, comunicados, chat con el preceptor del curso del hijo).
CREATE TABLE familiares (
    id                 INTEGER PRIMARY KEY,
    usuario_familia_id INTEGER NOT NULL REFERENCES usuarios(id),
    estudiante_id      INTEGER NOT NULL REFERENCES usuarios(id),
    parentesco         TEXT NOT NULL DEFAULT 'madre/padre',
    UNIQUE (usuario_familia_id, estudiante_id)
);

-- ============================================================================
-- 2. ARCHIVOS (servicio transversal, sección 14.19)
-- ============================================================================

-- Registro único de todo archivo subido (entregas, recursos, adjuntos de
-- chat, evidencias, comunicados). Los demás módulos solo lo referencian.
CREATE TABLE archivos (
    id              INTEGER PRIMARY KEY,
    nombre_original TEXT NOT NULL,
    ruta_local      TEXT NOT NULL,               -- dónde quedó guardado en el servidor
    tipo_mime       TEXT NOT NULL,
    tamano_bytes    INTEGER NOT NULL DEFAULT 0,
    subido_por      INTEGER NOT NULL REFERENCES usuarios(id),
    subido_en       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================================
-- 3. TAREAS ACADÉMICAS (sección 14.7)
-- ============================================================================

-- Tarea asignada por un docente a su cátedra (materia + curso).
CREATE TABLE tareas (
    id              INTEGER PRIMARY KEY,
    catedra_id      INTEGER NOT NULL REFERENCES catedras(id),
    titulo          TEXT NOT NULL,
    consigna        TEXT NOT NULL DEFAULT '',
    fecha_limite    TEXT NOT NULL,               -- fecha REAL con año (Error 2.C.9)
    metodo_estudio  TEXT,                        -- sugerencia del docente
    tipo_asignacion TEXT NOT NULL DEFAULT 'individual'
                        CHECK (tipo_asignacion IN ('individual','grupal')),
    creado_en       TEXT NOT NULL DEFAULT (datetime('now')),
    eliminado_en    TEXT
);

-- Adjuntos que el docente suma a la consigna.
CREATE TABLE tarea_adjuntos (
    id         INTEGER PRIMARY KEY,
    tarea_id   INTEGER NOT NULL REFERENCES tareas(id),
    archivo_id INTEGER NOT NULL REFERENCES archivos(id)
);

-- Entrega de un estudiante. La fecha dice si fue en término o tarde.
-- anulada_en permite deshacer una entrega no corregida (Error 2.C.6).
CREATE TABLE entregas (
    id            INTEGER PRIMARY KEY,
    tarea_id      INTEGER NOT NULL REFERENCES tareas(id),
    estudiante_id INTEGER NOT NULL REFERENCES usuarios(id),
    comentario    TEXT NOT NULL DEFAULT '',
    entregado_en  TEXT NOT NULL DEFAULT (datetime('now')),
    anulada_en    TEXT
);

-- Archivos de cada entrega (Error 2.C.4).
CREATE TABLE entrega_archivos (
    id         INTEGER PRIMARY KEY,
    entrega_id INTEGER NOT NULL REFERENCES entregas(id),
    archivo_id INTEGER NOT NULL REFERENCES archivos(id)
);

-- Corrección del docente. Calificaciones y Mis Tareas leen ESTA tabla:
-- una sola nota por trabajo, nunca más contradicciones (Error 13.1).
CREATE TABLE correcciones (
    id           INTEGER PRIMARY KEY,
    entrega_id   INTEGER NOT NULL UNIQUE REFERENCES entregas(id),
    nota         REAL CHECK (nota BETWEEN 1 AND 10),
    devolucion   TEXT NOT NULL DEFAULT '',
    corregido_en TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Recordatorios personales del estudiante (editables y borrables).
CREATE TABLE tareas_personales (
    id            INTEGER PRIMARY KEY,
    estudiante_id INTEGER NOT NULL REFERENCES usuarios(id),
    titulo        TEXT NOT NULL,
    descripcion   TEXT NOT NULL DEFAULT '',
    fecha_limite  TEXT,
    completada_en TEXT,
    creado_en     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================================
-- 4. OBJETIVOS: METAS, HÁBITOS, COMPETENCIAS (secciones 14.8 a 14.10)
-- ============================================================================

-- Meta personal con profundidad de proyecto (Error 2.D.5).
CREATE TABLE metas (
    id            INTEGER PRIMARY KEY,
    estudiante_id INTEGER NOT NULL REFERENCES usuarios(id),
    titulo        TEXT NOT NULL,
    categoria     TEXT NOT NULL DEFAULT 'personal',
    materia_id    INTEGER REFERENCES materias(id),
    unidad_id     INTEGER REFERENCES unidades(id),   -- elegida de la lista real (Error 2.D.8)
    vence_el      TEXT NOT NULL,                     -- fecha real con año
    estado        TEXT NOT NULL DEFAULT 'en-curso'
                     CHECK (estado IN ('en-curso','completada','archivada')),
    creado_en     TEXT NOT NULL DEFAULT (datetime('now')),
    completada_en TEXT
);

-- Subtareas individuales de una meta: cada una con texto propio,
-- orden y completado independiente (Errores 2.D.6 y 2.D.7).
CREATE TABLE subtareas (
    id            INTEGER PRIMARY KEY,
    meta_id       INTEGER NOT NULL REFERENCES metas(id),
    titulo        TEXT NOT NULL,
    orden         INTEGER NOT NULL DEFAULT 0,
    completada_en TEXT
);

-- Recursos de apoyo asociados a una meta (Error 2.D.9): un recurso de
-- biblioteca, un archivo propio o un enlace externo.
CREATE TABLE meta_recursos (
    id         INTEGER PRIMARY KEY,
    meta_id    INTEGER NOT NULL REFERENCES metas(id),
    recurso_id INTEGER REFERENCES recursos(id),
    archivo_id INTEGER REFERENCES archivos(id),
    enlace_url TEXT,
    titulo     TEXT NOT NULL
);

-- Hábito del estudiante. La racha NO se guarda: se calcula del historial.
CREATE TABLE habitos (
    id            INTEGER PRIMARY KEY,
    estudiante_id INTEGER NOT NULL REFERENCES usuarios(id),
    nombre        TEXT NOT NULL,
    frecuencia    TEXT NOT NULL DEFAULT 'diario'
                     CHECK (frecuencia IN ('diario','semanal')),
    creado_en     TEXT NOT NULL DEFAULT (datetime('now')),
    archivado_en  TEXT                              -- se archiva, no se borra
);

-- Un registro por hábito y por día. Dashboard y sección Hábitos leen
-- esta MISMA tabla: se acabaron las contradicciones (Error 13.5).
CREATE TABLE habito_registros (
    id        INTEGER PRIMARY KEY,
    habito_id INTEGER NOT NULL REFERENCES habitos(id),
    fecha     TEXT NOT NULL,                        -- "2026-07-03"
    UNIQUE (habito_id, fecha)
);

-- Árbol de competencias (Error 2.D.12): padre_id NULL = competencia raíz.
CREATE TABLE competencias (
    id             INTEGER PRIMARY KEY,
    institucion_id INTEGER NOT NULL REFERENCES instituciones(id),
    nombre         TEXT NOT NULL,
    padre_id       INTEGER REFERENCES competencias(id)
);

-- Nivel alcanzado por cada estudiante en cada competencia.
CREATE TABLE competencia_avances (
    id             INTEGER PRIMARY KEY,
    competencia_id INTEGER NOT NULL REFERENCES competencias(id),
    estudiante_id  INTEGER NOT NULL REFERENCES usuarios(id),
    nivel          TEXT NOT NULL DEFAULT 'iniciado'
                      CHECK (nivel IN ('iniciado','en-desarrollo','avanzado','dominado')),
    actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (competencia_id, estudiante_id)
);

-- Evidencias que respaldan el avance (trabajos, proyectos, reflexiones).
CREATE TABLE evidencias (
    id             INTEGER PRIMARY KEY,
    competencia_id INTEGER NOT NULL REFERENCES competencias(id),
    estudiante_id  INTEGER NOT NULL REFERENCES usuarios(id),
    titulo         TEXT NOT NULL,
    descripcion    TEXT NOT NULL DEFAULT '',
    archivo_id     INTEGER REFERENCES archivos(id),
    creado_en      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================================
-- 5. COMUNIDAD: PUBLICACIONES, VOTOS, DEBATES, TENDENCIAS (14.4 a 14.6)
-- ============================================================================

-- Publicación del feed. Borrado suave con registro de quién moderó.
CREATE TABLE publicaciones (
    id             INTEGER PRIMARY KEY,
    institucion_id INTEGER NOT NULL REFERENCES instituciones(id),
    autor_id       INTEGER NOT NULL REFERENCES usuarios(id),
    contenido      TEXT NOT NULL,
    imagen_id      INTEGER REFERENCES archivos(id),
    creado_en      TEXT NOT NULL DEFAULT (datetime('now')),
    eliminado_en   TEXT,
    eliminado_por  INTEGER REFERENCES usuarios(id)
);

-- Debate. Lo crean profesores, centro de estudiantes o dirección.
CREATE TABLE debates (
    id             INTEGER PRIMARY KEY,
    institucion_id INTEGER NOT NULL REFERENCES instituciones(id),
    autor_id       INTEGER NOT NULL REFERENCES usuarios(id),
    titulo         TEXT NOT NULL,
    descripcion    TEXT NOT NULL DEFAULT '',
    cierra_en      TEXT,                            -- NULL = sin fecha de cierre
    creado_en      TEXT NOT NULL DEFAULT (datetime('now')),
    eliminado_en   TEXT,
    eliminado_por  INTEGER REFERENCES usuarios(id)
);

-- "Participar" = fila acá. La postura se fija DESPUÉS de participar
-- (Error 2.B.6) y puede cambiarse mientras el debate esté abierto.
CREATE TABLE debate_participantes (
    id         INTEGER PRIMARY KEY,
    debate_id  INTEGER NOT NULL REFERENCES debates(id),
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    postura    TEXT CHECK (postura IN ('a-favor','en-contra')),  -- NULL = aún sin postura
    unido_en   TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (debate_id, usuario_id)
);

-- Voto único y privado por usuario y objeto (Error 2.B.1).
-- objeto_tipo + objeto_id apuntan a una publicación, debate o comentario.
CREATE TABLE votos (
    id          INTEGER PRIMARY KEY,
    usuario_id  INTEGER NOT NULL REFERENCES usuarios(id),
    objeto_tipo TEXT NOT NULL CHECK (objeto_tipo IN ('publicacion','debate','comentario')),
    objeto_id   INTEGER NOT NULL,
    valor       INTEGER NOT NULL CHECK (valor IN (1, -1)),
    creado_en   TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (usuario_id, objeto_tipo, objeto_id)
);

-- Comentarios de publicaciones y debates (Errores 2.B.2, 2.B.3, 2.B.7).
CREATE TABLE comentarios (
    id           INTEGER PRIMARY KEY,
    usuario_id   INTEGER NOT NULL REFERENCES usuarios(id),
    objeto_tipo  TEXT NOT NULL CHECK (objeto_tipo IN ('publicacion','debate')),
    objeto_id    INTEGER NOT NULL,
    contenido    TEXT NOT NULL,
    creado_en    TEXT NOT NULL DEFAULT (datetime('now')),
    eliminado_en TEXT,
    eliminado_por INTEGER REFERENCES usuarios(id)
);

-- Denuncias del menú de tres puntos (Errores 2.B.5 y 2.B.8).
CREATE TABLE denuncias (
    id             INTEGER PRIMARY KEY,
    denunciante_id INTEGER NOT NULL REFERENCES usuarios(id),
    objeto_tipo    TEXT NOT NULL CHECK (objeto_tipo IN ('publicacion','debate','comentario')),
    objeto_id      INTEGER NOT NULL,
    motivo         TEXT NOT NULL,
    creado_en      TEXT NOT NULL DEFAULT (datetime('now')),
    resuelta_en    TEXT,
    resuelta_por   INTEGER REFERENCES usuarios(id),
    resultado      TEXT CHECK (resultado IN ('contenido-eliminado','descartada'))
);

-- Intereses elegidos por el usuario para su feed (Error 2.B.13).
CREATE TABLE intereses_feed (
    id         INTEGER PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    tema       TEXT NOT NULL,
    UNIQUE (usuario_id, tema)
);

-- ============================================================================
-- 6. BIBLIOTECA Y COLA DE REVISIÓN (sección 14.11)
-- ============================================================================

-- Recurso de biblioteca. alcance: 'institucional' (solo su colegio) o
-- 'nacional' (todas las escuelas). La temática puede ser libre, sin
-- materia asociada (Error 9.A.4).
CREATE TABLE recursos (
    id             INTEGER PRIMARY KEY,
    institucion_id INTEGER REFERENCES instituciones(id), -- NULL si es 100% nacional
    autor_id       INTEGER NOT NULL REFERENCES usuarios(id),
    titulo         TEXT NOT NULL,
    descripcion    TEXT NOT NULL DEFAULT '',
    materia_id     INTEGER REFERENCES materias(id),      -- opcional
    tematica_libre TEXT,                                 -- ej. "inversiones", sin materia
    tipo           TEXT NOT NULL DEFAULT 'documento'
                      CHECK (tipo IN ('documento','guia','video','enlace','libro')),
    archivo_id     INTEGER REFERENCES archivos(id),
    enlace_url     TEXT,
    alcance        TEXT NOT NULL DEFAULT 'institucional'
                      CHECK (alcance IN ('institucional','nacional')),
    estado         TEXT NOT NULL DEFAULT 'en-revision'
                      CHECK (estado IN ('en-revision','aprobado','rechazado','papelera')),
    creado_en      TEXT NOT NULL DEFAULT (datetime('now')),
    eliminado_en   TEXT
);

-- Cola de revisión del bibliotecario: orden de llegada = presentado_en
-- (primero en entrar, primero en revisarse — Error 9.A.2).
CREATE TABLE cola_revision (
    id             INTEGER PRIMARY KEY,
    recurso_id     INTEGER NOT NULL UNIQUE REFERENCES recursos(id),
    presentado_por INTEGER NOT NULL REFERENCES usuarios(id),
    presentado_en  TEXT NOT NULL DEFAULT (datetime('now')),
    estado         TEXT NOT NULL DEFAULT 'pendiente'
                      CHECK (estado IN ('pendiente','aprobado','rechazado')),
    destino        TEXT CHECK (destino IN ('institucional','nacional')),
    motivo_rechazo TEXT,
    decidido_por   INTEGER REFERENCES usuarios(id),
    decidido_en    TEXT
);

-- ============================================================================
-- 7. CHAT (sección 14.2)
-- ============================================================================

-- Conversación: directa (2 personas), grupo-curso (comunidad del curso,
-- Error 7.A.5) o clase (chat de una clase en vivo).
CREATE TABLE conversaciones (
    id        INTEGER PRIMARY KEY,
    tipo      TEXT NOT NULL CHECK (tipo IN ('directa','grupo-curso','clase')),
    curso_id  INTEGER REFERENCES cursos(id),      -- solo para grupo-curso
    clase_id  INTEGER REFERENCES clases_planificadas(id), -- solo para clase
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Miembros de cada conversación. ultimo_leido_en es la clave de los
-- no-leídos: no leídos = mensajes posteriores a esa marca (Error 2.F.5).
CREATE TABLE conversacion_miembros (
    id              INTEGER PRIMARY KEY,
    conversacion_id INTEGER NOT NULL REFERENCES conversaciones(id),
    usuario_id      INTEGER NOT NULL REFERENCES usuarios(id),
    ultimo_leido_en TEXT,
    UNIQUE (conversacion_id, usuario_id)
);

-- Mensajes. El adjunto referencia a archivos (Error 2.F.3).
CREATE TABLE mensajes (
    id              INTEGER PRIMARY KEY,
    conversacion_id INTEGER NOT NULL REFERENCES conversaciones(id),
    autor_id        INTEGER NOT NULL REFERENCES usuarios(id),
    contenido       TEXT NOT NULL DEFAULT '',
    archivo_id      INTEGER REFERENCES archivos(id),
    enviado_en      TEXT NOT NULL DEFAULT (datetime('now')),
    eliminado_en    TEXT
);

-- ============================================================================
-- 8. AULA VIRTUAL Y CLASES EN VIVO (sección 14.3)
-- ============================================================================

-- Clase planificada por el docente (Errores 3.B.9 y 3.B.10).
CREATE TABLE clases_planificadas (
    id          INTEGER PRIMARY KEY,
    catedra_id  INTEGER NOT NULL REFERENCES catedras(id),
    titulo      TEXT NOT NULL,
    fecha_hora  TEXT NOT NULL,                    -- cuándo se dicta
    objetivos   TEXT NOT NULL DEFAULT '',
    materiales  TEXT NOT NULL DEFAULT '',
    estado      TEXT NOT NULL DEFAULT 'planificada'
                   CHECK (estado IN ('planificada','en-vivo','finalizada','cancelada')),
    creado_en   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Etapas de la trayectoria de la clase (Error 3.B.1). Las marcas de
-- inicio/fin las pone el docente en vivo y todos ven el avance real.
CREATE TABLE clase_etapas (
    id                    INTEGER PRIMARY KEY,
    clase_id              INTEGER NOT NULL REFERENCES clases_planificadas(id),
    orden                 INTEGER NOT NULL,
    titulo                TEXT NOT NULL,
    duracion_estimada_min INTEGER,
    iniciada_en           TEXT,
    completada_en         TEXT
);

-- Quién entró y salió de la clase: lista nominal de conectados (Error 3.B.11).
CREATE TABLE clase_asistencias (
    id             INTEGER PRIMARY KEY,
    clase_id       INTEGER NOT NULL REFERENCES clases_planificadas(id),
    estudiante_id  INTEGER NOT NULL REFERENCES usuarios(id),
    conectado_en   TEXT NOT NULL DEFAULT (datetime('now')),
    desconectado_en TEXT
);

-- Estado de comprensión de cada estudiante: el pulso del aula CON nombres
-- (Error 3.B.4). La alerta de ritmo (Error 3.B.5) se calcula de acá con
-- un umbral: si X% está en 'perdido' durante N minutos → alerta.
CREATE TABLE clase_comprension (
    id             INTEGER PRIMARY KEY,
    clase_id       INTEGER NOT NULL REFERENCES clases_planificadas(id),
    estudiante_id  INTEGER NOT NULL REFERENCES usuarios(id),
    estado         TEXT NOT NULL CHECK (estado IN ('entiendo','mas-o-menos','perdido')),
    actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (clase_id, estudiante_id)
);

-- Preguntas de los estudiantes durante la clase (Error 3.B.6, se conserva).
CREATE TABLE clase_preguntas (
    id            INTEGER PRIMARY KEY,
    clase_id      INTEGER NOT NULL REFERENCES clases_planificadas(id),
    estudiante_id INTEGER NOT NULL REFERENCES usuarios(id),
    texto         TEXT NOT NULL,
    creado_en     TEXT NOT NULL DEFAULT (datetime('now')),
    respondida_en TEXT
);

-- Estado guardado de la pizarra digital del docente (Error 2.C.1):
-- cada trazo/acción se registra para transmitir en vivo y revisar después.
CREATE TABLE pizarra_trazos (
    id        INTEGER PRIMARY KEY,
    clase_id  INTEGER NOT NULL REFERENCES clases_planificadas(id),
    secuencia INTEGER NOT NULL,                   -- orden de dibujo
    datos     TEXT NOT NULL,                      -- descripción del trazo (JSON)
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================================
-- 9. DIARIO REFLEXIVO DEL DOCENTE (Errores 3.C.3 y 3.C.4)
-- ============================================================================

CREATE TABLE diario_registros (
    id           INTEGER PRIMARY KEY,
    profesor_id  INTEGER NOT NULL REFERENCES usuarios(id),
    titulo       TEXT NOT NULL,
    contenido    TEXT NOT NULL,
    etiquetas    TEXT NOT NULL DEFAULT '',        -- separadas por coma
    creado_en    TEXT NOT NULL DEFAULT (datetime('now')),
    editado_en   TEXT,
    eliminado_en TEXT                             -- editable y borrable (Error 3.C.3)
);

-- ============================================================================
-- 10. CALENDARIO CON CAPAS DE VISIBILIDAD (sección 14.12)
-- ============================================================================

-- Evento del calendario. El tipo es texto libre (Error 6.E.4) y la base
-- rechaza horarios incoherentes (Error 6.E.5).
CREATE TABLE eventos (
    id             INTEGER PRIMARY KEY,
    institucion_id INTEGER NOT NULL REFERENCES instituciones(id),
    creador_id     INTEGER NOT NULL REFERENCES usuarios(id),
    titulo         TEXT NOT NULL,
    tipo           TEXT NOT NULL DEFAULT 'evento',
    descripcion    TEXT NOT NULL DEFAULT '',
    lugar          TEXT,
    fecha          TEXT NOT NULL,                 -- "2026-07-22"
    hora_inicio    TEXT,                          -- "08:30"
    hora_fin       TEXT,
    creado_en      TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK (hora_fin IS NULL OR hora_inicio IS NULL OR hora_fin > hora_inicio)
);

-- Capas de visibilidad de cada evento (Errores 6.E.9, 7.B.2, 10.B.4).
-- Un evento puede tener varias filas (ej. visible para 4°A y 4°B).
CREATE TABLE evento_visibilidad (
    id            INTEGER PRIMARY KEY,
    evento_id     INTEGER NOT NULL REFERENCES eventos(id),
    alcance       TEXT NOT NULL CHECK (alcance IN (
                     'todos',                 -- toda la comunidad
                     'curso',                 -- alumnos del curso + sus familias
                     'familias-curso',        -- SOLO familias de un curso (alumnos no ven)
                     'familia-de-estudiante', -- SOLO la familia de un alumno puntual
                     'familias-todas',        -- todas las familias (alumnos no ven)
                     'docentes')),            -- solo docentes y dirección
    curso_id      INTEGER REFERENCES cursos(id),      -- para curso / familias-curso
    estudiante_id INTEGER REFERENCES usuarios(id)     -- para familia-de-estudiante
);

-- Feriados (alimentan la tarjeta "Feriados del mes" con datos reales).
CREATE TABLE feriados (
    id     INTEGER PRIMARY KEY,
    fecha  TEXT NOT NULL UNIQUE,                  -- "2026-07-09"
    nombre TEXT NOT NULL
);

-- ============================================================================
-- 11. COMUNICADOS A FAMILIAS (sección 14.13)
-- ============================================================================

-- Comunicado de preceptor/dirección. curso_id NULL = toda la institución.
CREATE TABLE comunicados (
    id             INTEGER PRIMARY KEY,
    institucion_id INTEGER NOT NULL REFERENCES instituciones(id),
    emisor_id      INTEGER NOT NULL REFERENCES usuarios(id),
    curso_id       INTEGER REFERENCES cursos(id),
    titulo         TEXT NOT NULL,
    contenido      TEXT NOT NULL,
    archivo_id     INTEGER REFERENCES archivos(id),
    enviado_en     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Quién leyó cada comunicado y cuándo. El globito de no leídos del menú
-- de la familia (Error 10.A.3) = comunicados destinados sin fila acá.
CREATE TABLE comunicado_lecturas (
    id            INTEGER PRIMARY KEY,
    comunicado_id INTEGER NOT NULL REFERENCES comunicados(id),
    usuario_id    INTEGER NOT NULL REFERENCES usuarios(id),
    leido_en      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (comunicado_id, usuario_id)
);

-- ============================================================================
-- 12. QUEJAS ANÓNIMAS (sección 14.14)
-- ============================================================================

-- SIN columna de autor: el anonimato es estructural, no una promesa
-- (Error 8.B.1). La estadística de evolución compara meses (Error 8.B.4).
CREATE TABLE quejas (
    id             INTEGER PRIMARY KEY,
    institucion_id INTEGER NOT NULL REFERENCES instituciones(id),
    categoria      TEXT NOT NULL DEFAULT 'general',
    contenido      TEXT NOT NULL,
    creado_en      TEXT NOT NULL DEFAULT (datetime('now')),
    vista_en       TEXT,                          -- las no vistas van arriba (Error 8.B.5)
    vista_por      INTEGER REFERENCES usuarios(id),
    estado         TEXT NOT NULL DEFAULT 'nueva'
                      CHECK (estado IN ('nueva','en-tratamiento','resuelta'))
);

-- ============================================================================
-- 13. NOTIFICACIONES (sección 14.15)
-- ============================================================================

CREATE TABLE notificaciones (
    id          INTEGER PRIMARY KEY,
    usuario_id  INTEGER NOT NULL REFERENCES usuarios(id),
    tipo        TEXT NOT NULL,                    -- 'mensaje','correccion','comunicado','recurso','evento','denuncia'...
    titulo      TEXT NOT NULL,
    cuerpo      TEXT NOT NULL DEFAULT '',
    objeto_tipo TEXT,                             -- a qué navegar al tocarla
    objeto_id   INTEGER,
    creado_en   TEXT NOT NULL DEFAULT (datetime('now')),
    leida_en    TEXT
);

-- ============================================================================
-- 14. PLATAFORMA: IA, REPORTES, LOGS (secciones 14.16 y 14.18, y sección 5)
-- ============================================================================

-- Configuración de la Asistencia IA (Error 2.G.1). La clave de la API
-- vive en el servidor (variable de entorno), NUNCA en esta tabla ni en
-- la aplicación del navegador.
CREATE TABLE config_ia (
    id             INTEGER PRIMARY KEY,
    institucion_id INTEGER REFERENCES instituciones(id), -- NULL = configuración global
    system_prompt  TEXT NOT NULL,
    proveedor      TEXT NOT NULL DEFAULT 'google-ai-studio',
    modelo         TEXT NOT NULL DEFAULT '',
    temperatura    REAL NOT NULL DEFAULT 0.7,
    activo         INTEGER NOT NULL DEFAULT 1
);

-- Registro de reportes generados (sección 14.18).
CREATE TABLE reportes_generados (
    id              INTEGER PRIMARY KEY,
    generado_por    INTEGER NOT NULL REFERENCES usuarios(id),
    tipo            TEXT NOT NULL,                -- 'institucional','expediente-alumno','plataforma'
    parametros_json TEXT NOT NULL DEFAULT '{}',   -- qué casillas se marcaron
    archivo_id      INTEGER REFERENCES archivos(id),
    generado_en     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Logs técnicos SIN datos sensibles: lo único que ve el Administrador
-- de plataforma en "Actividad" (Error 5.A.2).
CREATE TABLE logs_sistema (
    id        INTEGER PRIMARY KEY,
    nivel     TEXT NOT NULL CHECK (nivel IN ('info','aviso','error')),
    mensaje   TEXT NOT NULL,
    contexto  TEXT NOT NULL DEFAULT '',
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================================
-- 15. VISTAS (consultas ya armadas)
-- ============================================================================

-- Tendencias (sección 14.6): puntaje de los últimos 7 días por objeto.
-- puntaje = (votos+ − votos−) + 2×posturas nuevas + 1×comentarios nuevos
CREATE VIEW v_tendencias AS
SELECT
    o.objeto_tipo,
    o.objeto_id,
    o.institucion_id,
    o.titulo,
    COALESCE(v.balance, 0) + COALESCE(p.posturas, 0) * 2 + COALESCE(c.cant, 0) AS puntaje
FROM (
    SELECT 'publicacion' AS objeto_tipo, id AS objeto_id, institucion_id,
           substr(contenido, 1, 80) AS titulo
    FROM publicaciones WHERE eliminado_en IS NULL
    UNION ALL
    SELECT 'debate', id, institucion_id, titulo
    FROM debates WHERE eliminado_en IS NULL
) o
LEFT JOIN (
    SELECT objeto_tipo, objeto_id, SUM(valor) AS balance
    FROM votos WHERE creado_en >= datetime('now', '-7 days')
    GROUP BY objeto_tipo, objeto_id
) v ON v.objeto_tipo = o.objeto_tipo AND v.objeto_id = o.objeto_id
LEFT JOIN (
    SELECT debate_id, COUNT(*) AS posturas
    FROM debate_participantes
    WHERE postura IS NOT NULL AND unido_en >= datetime('now', '-7 days')
    GROUP BY debate_id
) p ON o.objeto_tipo = 'debate' AND p.debate_id = o.objeto_id
LEFT JOIN (
    SELECT objeto_tipo, objeto_id, COUNT(*) AS cant
    FROM comentarios
    WHERE eliminado_en IS NULL AND creado_en >= datetime('now', '-7 days')
    GROUP BY objeto_tipo, objeto_id
) c ON c.objeto_tipo = o.objeto_tipo AND c.objeto_id = o.objeto_id;

-- Eventos vigentes (Error 6.E.7): excluye los pasados con más de 1 año.
-- Además, una rutina periódica del servidor debe borrarlos en firme.
CREATE VIEW v_eventos_vigentes AS
SELECT * FROM eventos
WHERE fecha >= date('now', '-1 year');

-- Mensajes no leídos por usuario y conversación (Error 2.F.5).
CREATE VIEW v_no_leidos AS
SELECT
    cm.usuario_id,
    cm.conversacion_id,
    COUNT(m.id) AS no_leidos
FROM conversacion_miembros cm
JOIN mensajes m
  ON m.conversacion_id = cm.conversacion_id
 AND m.autor_id <> cm.usuario_id
 AND m.eliminado_en IS NULL
 AND (cm.ultimo_leido_en IS NULL OR m.enviado_en > cm.ultimo_leido_en)
GROUP BY cm.usuario_id, cm.conversacion_id;

-- ============================================================================
-- 16. ÍNDICES (para que las consultas frecuentes sean rápidas)
-- ============================================================================

CREATE INDEX idx_usuarios_institucion   ON usuarios(institucion_id);
CREATE INDEX idx_mensajes_conversacion  ON mensajes(conversacion_id, enviado_en);
CREATE INDEX idx_votos_objeto           ON votos(objeto_tipo, objeto_id);
CREATE INDEX idx_comentarios_objeto     ON comentarios(objeto_tipo, objeto_id);
CREATE INDEX idx_entregas_tarea         ON entregas(tarea_id);
CREATE INDEX idx_eventos_fecha          ON eventos(fecha);
CREATE INDEX idx_notificaciones_usuario ON notificaciones(usuario_id, leida_en);
CREATE INDEX idx_habito_registros_fecha ON habito_registros(habito_id, fecha);
CREATE INDEX idx_cola_revision_orden    ON cola_revision(estado, presentado_en);
```

### 4.3. Bloque B — `datos-iniciales.sql` (los datos de prueba, coherentes)

> **Atención — este bloque quedó viejo en una sola cosa: las contraseñas.** Se conserva tal como se escribió originalmente, pero en la **etapa 1** las contraseñas se migraron de SHA-256 a **scrypt** (ver la nota de seguridad del punto 4.7). Como scrypt le pone a cada usuario una **sal distinta y al azar**, los hashes reales no se pueden copiar de un documento: se generan una sola vez, al crear la base. **El archivo verdadero es `base-de-datos/datos-iniciales.sql`**, no este bloque. Si ya creaste la base, no hay nada que hacer. Si tenés que rehacerla desde cero y el archivo se perdió, pedile a la IA que lo regenere cifrando `nexo1234` con `servidor/contrasenas.js`. Todo lo demás del bloque (personas, cursos, tareas, notas, chats) sigue siendo exacto.

```sql
-- ============================================================================
-- NEXO — Datos iniciales de demostración (coherentes)
-- ----------------------------------------------------------------------------
-- Este juego de datos reemplaza a los ejemplos contradictorios que hoy viven
-- dentro de las pantallas (sección 13 de ERRORES_DETALLADOS.md). Acá hay UNA
-- sola verdad: cada docente tiene un nombre y una materia, cada curso un
-- preceptor, cada trabajo una nota.
--
-- Contraseña de TODAS las cuentas de demostración: nexo1234
-- (versión original, con hash SHA-256. En la etapa 1 se migró a scrypt: el
--  archivo real usa un hash con sal única por usuario. Ver la nota de arriba.)
--
-- Las fechas de ejemplo giran alrededor de julio de 2026.
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ── Institución ─────────────────────────────────────────────────────────────
INSERT INTO instituciones (id, nombre, ciclo_lectivo) VALUES
  (1, 'Colegio San Martín', 2026);

-- ── Usuarios (contraseña de todos: nexo1234) ───────────────────────────────
INSERT INTO usuarios (id, institucion_id, email, hash_contrasena, nombre, rol, avatar_url) VALUES
  (1,  1, 'direccion@sanmartin.nexo.edu', '813817240df036b36ee5140ffd5667619cff32375927b77fb39498928ceb916d', 'Directora Ana Romero',        'admin-academico',   'https://api.dicebear.com/7.x/avataaars/svg?seed=Romero'),
  (2,  1, 'garcia@sanmartin.nexo.edu',    '813817240df036b36ee5140ffd5667619cff32375927b77fb39498928ceb916d', 'Prof. Diego García',          'profesor',          'https://api.dicebear.com/7.x/avataaars/svg?seed=Garcia'),
  (3,  1, 'lombardi@sanmartin.nexo.edu',  '813817240df036b36ee5140ffd5667619cff32375927b77fb39498928ceb916d', 'Prof. Silvia Lombardi',       'profesor',          NULL),
  (4,  1, 'mendez@sanmartin.nexo.edu',    '813817240df036b36ee5140ffd5667619cff32375927b77fb39498928ceb916d', 'Prof. Hernán Méndez',         'profesor',          NULL),
  (5,  1, 'sosa@sanmartin.nexo.edu',      '813817240df036b36ee5140ffd5667619cff32375927b77fb39498928ceb916d', 'Prof. Carolina Sosa',         'profesor',          NULL),
  (6,  1, 'pereyra@sanmartin.nexo.edu',   '813817240df036b36ee5140ffd5667619cff32375927b77fb39498928ceb916d', 'Carlos Pereyra',              'preceptor',         'https://api.dicebear.com/7.x/avataaars/svg?seed=Pereyra'),
  (7,  1, 'martinez@sanmartin.nexo.edu',  '813817240df036b36ee5140ffd5667619cff32375927b77fb39498928ceb916d', 'Preceptora Laura Martínez',   'preceptor',         NULL),
  (8,  1, 'julieta@sanmartin.nexo.edu',   '813817240df036b36ee5140ffd5667619cff32375927b77fb39498928ceb916d', 'Julieta Rossi',               'estudiante',        'https://api.dicebear.com/7.x/avataaars/svg?seed=Julieta'),
  (9,  1, 'martin@sanmartin.nexo.edu',    '813817240df036b36ee5140ffd5667619cff32375927b77fb39498928ceb916d', 'Martín López',                'estudiante',        NULL),
  (10, 1, 'sofia.chen@sanmartin.nexo.edu','813817240df036b36ee5140ffd5667619cff32375927b77fb39498928ceb916d', 'Sofía Chen',                  'estudiante',        NULL),
  (11, 1, 'lucas@sanmartin.nexo.edu',     '813817240df036b36ee5140ffd5667619cff32375927b77fb39498928ceb916d', 'Lucas Fernández',             'estudiante',        NULL),
  (12, 1, 'valentina@sanmartin.nexo.edu', '813817240df036b36ee5140ffd5667619cff32375927b77fb39498928ceb916d', 'Valentina Gutiérrez',         'estudiante',        NULL),
  (13, 1, 'tomas@sanmartin.nexo.edu',     '813817240df036b36ee5140ffd5667619cff32375927b77fb39498928ceb916d', 'Tomás Ríos',                  'estudiante',        NULL),
  (14, 1, 'familia.rossi@sanmartin.nexo.edu', '813817240df036b36ee5140ffd5667619cff32375927b77fb39498928ceb916d', 'Familia Rossi',           'familia',           'https://api.dicebear.com/7.x/initials/svg?seed=Rossi'),
  (15, 1, 'familia.lopez@sanmartin.nexo.edu', '813817240df036b36ee5140ffd5667619cff32375927b77fb39498928ceb916d', 'Familia López',           'familia',           NULL),
  (16, 1, 'biblioteca@sanmartin.nexo.edu','813817240df036b36ee5140ffd5667619cff32375927b77fb39498928ceb916d', 'Bruno Ledesma',               'bibliotecario',     NULL),
  (17, 1, 'centro@sanmartin.nexo.edu',    '813817240df036b36ee5140ffd5667619cff32375927b77fb39498928ceb916d', 'Centro de Estudiantes',       'centro-estudiantes',NULL),
  (18, NULL, 'sistema@nexo.edu',          '813817240df036b36ee5140ffd5667619cff32375927b77fb39498928ceb916d', 'Administrador de Plataforma', 'administrador',     NULL);

-- ── Cursos (UNA sola verdad de preceptores: Error 13.4) ────────────────────
INSERT INTO cursos (id, institucion_id, anio, division, preceptor_id) VALUES
  (1, 1, 4, 'A', 6),   -- 4°A a cargo de Carlos Pereyra
  (2, 1, 4, 'B', 6),   -- 4°B a cargo de Carlos Pereyra
  (3, 1, 3, 'A', 7),   -- 3°A a cargo de Laura Martínez
  (4, 1, 3, 'B', 7);   -- 3°B a cargo de Laura Martínez

-- ── Materias y unidades ─────────────────────────────────────────────────────
INSERT INTO materias (id, institucion_id, nombre) VALUES
  (1, 1, 'Matemática'), (2, 1, 'Historia'), (3, 1, 'Biología'),
  (4, 1, 'Lengua'),     (5, 1, 'Inglés');

INSERT INTO unidades (id, materia_id, numero, titulo) VALUES
  (1, 1, 1, 'Ecuaciones de segundo grado'),
  (2, 1, 2, 'Funciones'),
  (3, 1, 3, 'Geometría analítica'),
  (4, 2, 1, 'La Revolución de Mayo'),
  (5, 2, 2, 'Las independencias americanas'),
  (6, 3, 1, 'La célula'),
  (7, 3, 2, 'Genética'),
  (8, 4, 1, 'El texto argumentativo'),
  (9, 4, 2, 'Literatura latinoamericana');

-- ── Cátedras (UNA sola verdad de docentes: Error 13.2) ─────────────────────
INSERT INTO catedras (id, materia_id, curso_id, profesor_id) VALUES
  (1, 1, 2, 2),   -- Matemática 4°B — Prof. García
  (2, 1, 1, 2),   -- Matemática 4°A — Prof. García
  (3, 2, 2, 3),   -- Historia 4°B — Prof. Lombardi
  (4, 3, 2, 4),   -- Biología 4°B — Prof. Méndez
  (5, 4, 2, 5);   -- Lengua 4°B — Prof. Sosa

-- ── Inscripciones y familias ────────────────────────────────────────────────
INSERT INTO inscripciones (curso_id, estudiante_id) VALUES
  (2, 8), (2, 9), (2, 10), (2, 11),   -- 4°B
  (1, 12),                            -- 4°A
  (4, 13);                            -- 3°B

INSERT INTO familiares (usuario_familia_id, estudiante_id, parentesco) VALUES
  (14, 8, 'madre/padre'),
  (15, 9, 'madre/padre');

-- ── Archivos ────────────────────────────────────────────────────────────────
INSERT INTO archivos (id, nombre_original, ruta_local, tipo_mime, tamano_bytes, subido_por) VALUES
  (1, 'guia_laboratorio_quimica_v2.pdf', 'almacen/guia_laboratorio_quimica_v2.pdf', 'application/pdf', 482000, 16),
  (2, 'informe_celulas_julieta.pdf',     'almacen/informe_celulas_julieta.pdf',     'application/pdf', 210500, 8),
  (3, 'circular_reunion_julio.pdf',      'almacen/circular_reunion_julio.pdf',      'application/pdf',  95300, 6),
  (4, 'mapa_revolucion_mayo.png',        'almacen/mapa_revolucion_mayo.png',        'image/png',       730000, 3),
  (5, 'apunte_inversiones_basicas.pdf',  'almacen/apunte_inversiones_basicas.pdf',  'application/pdf', 154000, 9),
  (6, 'guia_ecuaciones_2do_grado.pdf',   'almacen/guia_ecuaciones_2do_grado.pdf',   'application/pdf', 320000, 2);

-- ── Tareas académicas ───────────────────────────────────────────────────────
INSERT INTO tareas (id, catedra_id, titulo, consigna, fecha_limite, metodo_estudio, tipo_asignacion) VALUES
  (1, 1, 'Ecuaciones de segundo grado',
      'Resolver la guía de ejercicios 1 a 20. Mostrar el desarrollo completo de cada resolución.',
      '2026-07-10', 'Práctica espaciada', 'individual'),
  (2, 3, 'Línea de tiempo: Revolución de Mayo',
      'Armar una línea de tiempo de 1806 a 1816 con los hechos principales y una fuente por hecho.',
      '2026-06-25', NULL, 'individual'),
  (3, 4, 'Informe: células procariotas',
      'Describir la estructura de la célula procariota y compararla con la eucariota. Extensión: 2 a 4 carillas.',
      '2026-06-20', 'Mapa conceptual previo', 'individual'),
  (4, 5, 'Ensayo argumentativo sobre Cortázar',
      'Escribir un ensayo (800-1200 palabras) tomando posición sobre el fantástico en los cuentos leídos.',
      '2026-07-15', NULL, 'individual');

INSERT INTO tarea_adjuntos (tarea_id, archivo_id) VALUES (2, 4);

-- Entregas y correcciones (UNA sola nota por trabajo: Error 13.1)
INSERT INTO entregas (id, tarea_id, estudiante_id, comentario, entregado_en) VALUES
  (1, 3, 8, 'Profe, agregué un cuadro comparativo al final.', '2026-06-19T20:15:00'),
  (2, 3, 9, 'Perdón por la demora.',                          '2026-06-21T22:40:00'),
  (3, 2, 8, '',                                               '2026-06-24T18:05:00');

INSERT INTO entrega_archivos (entrega_id, archivo_id) VALUES (1, 2);

INSERT INTO correcciones (entrega_id, nota, devolucion, corregido_en) VALUES
  (1, 8.0, 'Muy buena descripción de la estructura celular. Podés profundizar la comparación con las eucariotas en el próximo informe.', '2026-06-26T10:00:00'),
  (3, 6.5, 'La línea de tiempo está completa, pero faltan las fuentes de tres hechos. Repasá las causas económicas.',                    '2026-07-01T09:30:00');

INSERT INTO tareas_personales (estudiante_id, titulo, descripcion, fecha_limite) VALUES
  (8, 'Repasar vocabulario de Inglés', 'Unidades 3 y 4 del cuadernillo.', '2026-07-08');

-- ── Metas, subtareas ────────────────────────────────────────────────────────
INSERT INTO metas (id, estudiante_id, titulo, categoria, materia_id, unidad_id, vence_el, estado, completada_en) VALUES
  (1, 8, 'Preparar examen de Historia',    'académica', 2, 4,    '2026-07-20', 'en-curso',   NULL),
  (2, 8, 'Avanzar nivel B2 de Francés',    'idiomas',   NULL, NULL, '2026-08-30', 'en-curso',   NULL),
  (3, 8, 'Informe de Células Madre',       'académica', 3, 6,    '2026-06-12', 'completada', '2026-06-12T19:00:00');

INSERT INTO subtareas (meta_id, titulo, orden, completada_en) VALUES
  (1, 'Leer capítulos 4 y 5 del manual',        1, '2026-06-28T18:00:00'),
  (1, 'Hacer resumen de causas y consecuencias',2, '2026-06-30T17:30:00'),
  (1, 'Armar línea de tiempo propia',           3, '2026-07-01T19:10:00'),
  (1, 'Resolver el cuestionario de repaso',     4, NULL),
  (1, 'Autoevaluación final',                   5, NULL),
  (2, 'Escuchar un podcast por semana',         1, '2026-06-20T10:00:00'),
  (2, 'Terminar unidad 5 del curso online',     2, '2026-06-27T10:00:00'),
  (2, 'Terminar unidad 6 del curso online',     3, NULL),
  (2, 'Leer un cuento corto en francés',        4, NULL),
  (2, 'Práctica de conversación (2 sesiones)',  5, NULL),
  (2, 'Redactar una carta formal',              6, NULL),
  (2, 'Repasar conectores argumentativos',      7, NULL),
  (2, 'Simulacro de examen B2',                 8, NULL),
  (3, 'Buscar bibliografía',                    1, '2026-06-05T15:00:00'),
  (3, 'Redactar borrador',                      2, '2026-06-08T15:00:00'),
  (3, 'Corregir y pasar en limpio',             3, '2026-06-11T15:00:00');

-- ── Hábitos (la racha se CALCULA de estos registros: Error 13.5) ───────────
INSERT INTO habitos (id, estudiante_id, nombre, frecuencia) VALUES
  (1, 8, 'Lectura diaria',    'diario'),
  (2, 8, 'Repaso de notas',   'diario'),
  (3, 8, 'Meditación',        'diario'),
  (4, 8, 'Ejercicio físico',  'diario');

INSERT INTO habito_registros (habito_id, fecha) VALUES
  -- Lectura diaria
  (1,'2026-06-24'),(1,'2026-06-25'),(1,'2026-06-27'),(1,'2026-06-30'),
  (1,'2026-07-01'),(1,'2026-07-02'),(1,'2026-07-03'),
  -- Repaso de notas
  (2,'2026-06-25'),(2,'2026-06-28'),(2,'2026-07-01'),(2,'2026-07-02'),
  -- Ejercicio físico
  (4,'2026-06-26'),(4,'2026-06-27'),(4,'2026-06-28'),(4,'2026-06-29'),
  (4,'2026-06-30'),(4,'2026-07-01'),(4,'2026-07-02'),(4,'2026-07-03');
  -- Meditación: sin registros (racha 0)

-- ── Competencias (árbol) y avances ──────────────────────────────────────────
INSERT INTO competencias (id, institucion_id, nombre, padre_id) VALUES
  (1, 1, 'Pensamiento Crítico',   NULL),
  (2, 1, 'Análisis de fuentes',   1),
  (3, 1, 'Argumentación',         1),
  (4, 1, 'Colaboración',          NULL),
  (5, 1, 'Trabajo en equipo',     4),
  (6, 1, 'Autogestión',           NULL);

INSERT INTO competencia_avances (competencia_id, estudiante_id, nivel, actualizado_en) VALUES
  (2, 8, 'en-desarrollo', '2026-06-26T10:00:00'),
  (3, 8, 'iniciado',      '2026-06-01T10:00:00'),
  (4, 8, 'avanzado',      '2026-06-15T10:00:00'),
  (6, 8, 'en-desarrollo', '2026-06-20T10:00:00');

INSERT INTO evidencias (competencia_id, estudiante_id, titulo, descripcion, archivo_id) VALUES
  (2, 8, 'Análisis de fuentes primarias de 1810',
      'Trabajo de Historia donde comparé dos actas del Cabildo con lectura crítica.', NULL);

-- ── Comunidad: publicaciones, debates, votos, comentarios ───────────────────
INSERT INTO publicaciones (id, institucion_id, autor_id, contenido, creado_en) VALUES
  (1, 1, 9,  '¿Alguien tiene los apuntes de la clase de Biología de ayer?',                        '2026-07-01T14:20:00'),
  (2, 1, 17, 'La asamblea estudiantil de julio ya tiene fecha: ¡viernes 17/07 en el SUM!',         '2026-07-02T09:00:00'),
  (3, 1, 2,  'Subí a la biblioteca una guía nueva de ecuaciones. Recomendada antes del parcial.',  '2026-07-02T11:45:00'),
  (4, 1, 8,  'Propuesta: armar un grupo de estudio de Historia los miércoles después de clase.',   '2026-07-03T10:30:00');

INSERT INTO debates (id, institucion_id, autor_id, titulo, descripcion, cierra_en, creado_en) VALUES
  (1, 1, 2,  '¿Debería usarse IA para hacer la tarea?',
      'Debate para 4° año: ¿la IA es una herramienta de estudio legítima o un atajo que impide aprender? Fundamentar cada postura.',
      '2026-07-20', '2026-06-28T12:00:00'),
  (2, 1, 17, '¿Hay que renovar el uniforme escolar?',
      'El Centro de Estudiantes quiere conocer la opinión de todos antes de llevar la propuesta a la dirección.',
      NULL, '2026-07-01T16:00:00');

INSERT INTO debate_participantes (debate_id, usuario_id, postura, unido_en) VALUES
  (1, 8,  'a-favor',   '2026-06-29T10:00:00'),
  (1, 9,  'en-contra', '2026-06-29T11:30:00'),
  (1, 10, 'a-favor',   '2026-06-30T09:15:00'),
  (2, 8,  NULL,        '2026-07-02T13:00:00'),
  (2, 11, 'en-contra', '2026-07-02T15:40:00');

INSERT INTO votos (usuario_id, objeto_tipo, objeto_id, valor, creado_en) VALUES
  (8,  'publicacion', 1,  1, '2026-07-01T15:00:00'),
  (10, 'publicacion', 1,  1, '2026-07-01T16:10:00'),
  (9,  'publicacion', 4,  1, '2026-07-03T11:00:00'),
  (11, 'publicacion', 4,  1, '2026-07-03T11:20:00'),
  (12, 'publicacion', 4, -1, '2026-07-03T12:00:00'),
  (8,  'debate',      1,  1, '2026-06-29T10:05:00'),
  (9,  'debate',      1,  1, '2026-06-29T11:35:00'),
  (13, 'debate',      2, -1, '2026-07-02T18:00:00');

INSERT INTO comentarios (usuario_id, objeto_tipo, objeto_id, contenido, creado_en) VALUES
  (10, 'publicacion', 1, 'Yo los tengo, te los paso por chat.',                          '2026-07-01T16:12:00'),
  (8,  'debate',      1, 'Depende: para entender un tema sí, para copiar la tarea no.',  '2026-06-29T10:10:00'),
  (9,  'debate',      1, 'Si la usás para todo, no aprendés nada.',                      '2026-06-29T11:40:00'),
  (2,  'debate',      1, 'Interesante. ¿Y como herramienta de corrección entre pares?',  '2026-06-30T08:50:00');

INSERT INTO denuncias (denunciante_id, objeto_tipo, objeto_id, motivo, creado_en) VALUES
  (11, 'publicacion', 3, 'Me parece publicidad y no una publicación de la comunidad.', '2026-07-02T14:00:00');

INSERT INTO intereses_feed (usuario_id, tema) VALUES
  (8, 'historia'), (8, 'tecnología'), (8, 'deportes');

-- ── Biblioteca y cola de revisión ───────────────────────────────────────────
INSERT INTO recursos (id, institucion_id, autor_id, titulo, descripcion, materia_id, tematica_libre, tipo, archivo_id, enlace_url, alcance, estado, creado_en) VALUES
  (1, 1, 16, 'Guía de Laboratorio de Química v2', 'Protocolos de seguridad y prácticas para el laboratorio.', NULL, 'química',              'guia',      1, NULL, 'institucional', 'aprobado',    '2026-05-10T10:00:00'),
  (2, 1, 3,  'Mapa interactivo: Revolución de Mayo', 'Mapa con los hechos de la Semana de Mayo, para trabajar en clase.', 2, NULL,          'documento', 4, NULL, 'institucional', 'aprobado',    '2026-06-15T09:00:00'),
  (3, 1, 2,  'Guía de ejercicios: ecuaciones de segundo grado', '60 ejercicios con resultados, del básico al avanzado.', 1, NULL,           'guia',      6, NULL, 'institucional', 'aprobado',    '2026-07-02T11:30:00'),
  (4, 1, 9,  'Apunte: inversiones básicas para principiantes', 'Introducción al ahorro y la inversión. No pertenece a ninguna materia.', NULL, 'educación financiera', 'documento', 5, NULL, 'institucional', 'en-revision', '2026-07-02T17:00:00'),
  (5, 1, 5,  'Antología de cuentos de Julio Cortázar', 'Selección de cuentos de dominio público comentados.', 4, NULL,                     'libro',     NULL, 'https://ejemplo.org/antologia-cortazar', 'nacional', 'aprobado', '2026-06-10T08:00:00'),
  (6, 1, 11, 'Memes de matemática', 'Colección de memes.', 1, NULL,                                                                        'documento', NULL, NULL, 'institucional', 'rechazado',   '2026-06-28T20:00:00');

INSERT INTO cola_revision (recurso_id, presentado_por, presentado_en, estado, destino, motivo_rechazo, decidido_por, decidido_en) VALUES
  (2, 3,  '2026-06-15T09:00:00', 'aprobado',  'institucional', NULL, 16, '2026-06-16T10:00:00'),
  (5, 5,  '2026-06-10T08:00:00', 'aprobado',  'nacional',      NULL, 16, '2026-06-11T12:00:00'),
  (6, 11, '2026-06-28T20:00:00', 'rechazado', NULL, 'No es material educativo. Podés compartirlo en la comunidad.', 16, '2026-06-29T09:00:00'),
  (4, 9,  '2026-07-02T17:00:00', 'pendiente', NULL, NULL, NULL, NULL);

-- ── Aula virtual: clases, etapas, asistencia, comprensión ───────────────────
INSERT INTO clases_planificadas (id, catedra_id, titulo, fecha_hora, objetivos, materiales, estado) VALUES
  (1, 1, 'Ecuaciones: repaso general antes del parcial', '2026-07-06T10:00:00',
      'Repasar resolución por fórmula y por factoreo; despejar dudas del cuestionario.',
      'Guía de ejercicios (recurso de biblioteca), pizarra digital.', 'planificada'),
  (2, 4, 'La célula: cierre de unidad', '2026-06-18T08:30:00',
      'Cerrar la comparación procariota/eucariota y presentar la unidad de Genética.',
      'Láminas de la unidad 1.', 'finalizada');

INSERT INTO clase_etapas (clase_id, orden, titulo, duracion_estimada_min, iniciada_en, completada_en) VALUES
  (1, 1, 'Repaso de fórmula general',      20, NULL, NULL),
  (1, 2, 'Ejercicios en pizarra',          30, NULL, NULL),
  (1, 3, 'Dudas y cierre',                 10, NULL, NULL),
  (2, 1, 'Repaso comparativo',             25, '2026-06-18T08:30:00', '2026-06-18T08:55:00'),
  (2, 2, 'Puesta en común de informes',    25, '2026-06-18T08:55:00', '2026-06-18T09:20:00'),
  (2, 3, 'Presentación: Genética',         10, '2026-06-18T09:20:00', '2026-06-18T09:32:00');

INSERT INTO clase_asistencias (clase_id, estudiante_id, conectado_en, desconectado_en) VALUES
  (2, 8,  '2026-06-18T08:29:00', '2026-06-18T09:33:00'),
  (2, 9,  '2026-06-18T08:31:00', '2026-06-18T09:33:00'),
  (2, 10, '2026-06-18T08:30:00', '2026-06-18T09:20:00');

INSERT INTO clase_comprension (clase_id, estudiante_id, estado, actualizado_en) VALUES
  (2, 8,  'entiendo',    '2026-06-18T09:00:00'),
  (2, 9,  'mas-o-menos', '2026-06-18T09:05:00'),
  (2, 10, 'entiendo',    '2026-06-18T08:50:00');

INSERT INTO clase_preguntas (clase_id, estudiante_id, texto, creado_en, respondida_en) VALUES
  (2, 9, '¿La bacteria tiene núcleo o no?', '2026-06-18T08:47:00', '2026-06-18T08:52:00');

INSERT INTO pizarra_trazos (clase_id, secuencia, datos) VALUES
  (2, 1, '{"tipo":"texto","x":40,"y":30,"contenido":"Procariota vs. Eucariota"}'),
  (2, 2, '{"tipo":"linea","desde":[40,60],"hasta":[400,60]}');

-- ── Diario reflexivo del docente ────────────────────────────────────────────
INSERT INTO diario_registros (profesor_id, titulo, contenido, etiquetas, creado_en) VALUES
  (2, 'El repaso espaciado funcionó', 'El grupo que siguió el método de práctica espaciada resolvió mejor los ejercicios combinados. Repetir la estrategia antes del próximo parcial.', 'metodología,matemática', '2026-06-30T18:00:00'),
  (2, 'Dudas recurrentes con el discriminante', 'Varios estudiantes confunden el signo del discriminante. Preparar un ejemplo visual para la clase del 06/07.', 'planificación', '2026-07-02T19:30:00');

-- ── Calendario: eventos, visibilidad y feriados ─────────────────────────────
INSERT INTO eventos (id, institucion_id, creador_id, titulo, tipo, descripcion, lugar, fecha, hora_inicio, hora_fin) VALUES
  (1, 1, 1,  'Feria de Ciencias',                    'evento institucional', 'Presentación de proyectos de todos los cursos.', 'Toda la institución', '2026-07-22', '09:00', '13:00'),
  (2, 1, 6,  'Reunión de padres — 4°B',              'reunión',              'Reunión informativa de mitad de ciclo.',          'Aula de 4°B',        '2026-07-28', '17:00', '18:30'),
  (3, 1, 1,  'Cita con los padres de Julieta Rossi', 'cita',                 'Entrevista con la dirección.',                    'Dirección',          '2026-07-08', '09:00', '09:30'),
  (4, 1, 17, 'Asamblea estudiantil',                 'asamblea',             'Asamblea abierta organizada por el Centro de Estudiantes.', 'SUM',     '2026-07-17', '13:30', '15:00'),
  (5, 1, 1,  'Acto por el Día de la Independencia',  'acto',                 'Acto conmemorativo del 9 de Julio.',              'Patio central',      '2026-07-07', '10:00', '11:00');

INSERT INTO evento_visibilidad (evento_id, alcance, curso_id, estudiante_id) VALUES
  (1, 'todos',                 NULL, NULL),
  (2, 'familias-curso',        2,    NULL),   -- solo familias de 4°B; los alumnos no lo ven
  (3, 'familia-de-estudiante', NULL, 8),      -- solo la familia de Julieta
  (4, 'todos',                 NULL, NULL),
  (5, 'todos',                 NULL, NULL);

INSERT INTO feriados (fecha, nombre) VALUES
  ('2026-06-20', 'Paso a la Inmortalidad del Gral. Manuel Belgrano'),
  ('2026-07-09', 'Día de la Independencia'),
  ('2026-08-17', 'Paso a la Inmortalidad del Gral. José de San Martín'),
  ('2026-10-12', 'Día del Respeto a la Diversidad Cultural');

-- ── Chat: conversaciones, miembros, mensajes ────────────────────────────────
INSERT INTO conversaciones (id, tipo, curso_id, clase_id) VALUES
  (1, 'directa',     NULL, NULL),   -- Julieta ↔ Martín
  (2, 'directa',     NULL, NULL),   -- Julieta ↔ Prof. García
  (3, 'directa',     NULL, NULL),   -- Familia Rossi ↔ Preceptor Pereyra
  (4, 'grupo-curso', 2,    NULL);   -- Comunidad del curso 4°B

INSERT INTO conversacion_miembros (conversacion_id, usuario_id, ultimo_leido_en) VALUES
  (1, 8,  '2026-07-02T14:00:00'),
  (1, 9,  '2026-07-03T13:50:00'),
  (2, 8,  '2026-07-01T11:05:00'),
  (2, 2,  '2026-07-01T11:05:00'),
  (3, 14, '2026-07-02T08:00:00'),
  (3, 6,  '2026-07-03T14:05:00'),
  (4, 6,  '2026-07-03T12:00:00'),
  (4, 8,  '2026-07-03T12:00:00'),
  (4, 9,  '2026-07-02T18:00:00'),
  (4, 10, '2026-07-03T12:00:00'),
  (4, 11, '2026-07-01T09:00:00');

INSERT INTO mensajes (conversacion_id, autor_id, contenido, enviado_en) VALUES
  (1, 9, 'Hola, ¿cómo estás?',                                   '2026-07-02T13:45:00'),
  (1, 8, 'Bien, ¿y vos?',                                        '2026-07-02T13:46:00'),
  (1, 9, '¿Ya entendiste la tarea de Historia?',                 '2026-07-03T14:30:00'),
  (2, 8, 'Hola profe, tengo una duda sobre el material.',        '2026-07-01T10:45:00'),
  (2, 2, '¿Cuál es tu pregunta?',                                '2026-07-01T10:46:00'),
  (2, 8, '¿Entra la unidad 2 en el parcial?',                    '2026-07-01T10:50:00'),
  (2, 2, 'Sí, entra. Cualquier duda, consultame.',               '2026-07-01T11:00:00'),
  (3, 14, 'Buenas, consulta por la inasistencia de ayer.',       '2026-07-02T13:20:00'),
  (3, 6,  'Buenas. Quedó justificada, y le confirmo la reunión del 28.', '2026-07-03T14:00:00'),
  (4, 6,  'Recuerden que mañana hay acto a las 10.',             '2026-07-03T11:55:00'),
  (4, 10, '¿Hay que ir con uniforme completo?',                  '2026-07-03T11:58:00'),
  (4, 6,  'Sí, uniforme completo.',                              '2026-07-03T12:00:00');

-- ── Comunicados a familias y lecturas ───────────────────────────────────────
INSERT INTO comunicados (id, institucion_id, emisor_id, curso_id, titulo, contenido, archivo_id, enviado_en) VALUES
  (1, 1, 6, 2,    'Reunión de padres — 4°B',
      'Los esperamos el martes 28/07 a las 17:00 en el aula de 4°B. Adjuntamos la circular con los temas.', 3, '2026-07-01T09:00:00'),
  (2, 1, 1, NULL, 'Acto por el Día de la Independencia',
      'El acto se realizará el martes 07/07 a las 10:00 en el patio central. Las familias están invitadas.', NULL, '2026-07-02T10:00:00');

INSERT INTO comunicado_lecturas (comunicado_id, usuario_id, leido_en) VALUES
  (2, 14, '2026-07-02T12:30:00');

-- ── Quejas anónimas (SIN autor) ─────────────────────────────────────────────
INSERT INTO quejas (institucion_id, categoria, contenido, creado_en, vista_en, vista_por, estado) VALUES
  (1, 'infraestructura', 'Los ventiladores del aula de 4°B no funcionan desde hace dos semanas.', '2026-06-10T10:00:00', '2026-06-11T09:00:00', 17, 'en-tratamiento'),
  (1, 'convivencia',     'En los recreos siempre se ocupa la cancha el mismo grupo. ¿Se puede armar un cronograma?', '2026-07-01T13:00:00', NULL, NULL, 'nueva'),
  (1, 'servicios',       'Los precios de la cantina subieron mucho este mes.', '2026-07-02T12:00:00', NULL, NULL, 'nueva');

-- ── Notificaciones ──────────────────────────────────────────────────────────
INSERT INTO notificaciones (usuario_id, tipo, titulo, cuerpo, objeto_tipo, objeto_id, creado_en, leida_en) VALUES
  (8,  'correccion', 'Tenés una devolución nueva',      'Historia — Línea de tiempo: nota 6,5.',                    'tarea',      2, '2026-07-01T09:31:00', NULL),
  (14, 'comunicado', 'Comunicado nuevo de 4°B',         'Reunión de padres — 4°B.',                                 'comunicado', 1, '2026-07-01T09:01:00', NULL),
  (9,  'recurso',    'Tu recurso está en revisión',     'Apunte: inversiones básicas para principiantes.',          'recurso',    4, '2026-07-02T17:01:00', '2026-07-02T18:00:00'),
  (16, 'recurso',    'Nuevo recurso para revisar',      'Apunte: inversiones básicas — presentado por Martín López.', 'recurso',  4, '2026-07-02T17:01:00', NULL);

-- ── Configuración de la Asistencia IA ───────────────────────────────────────
INSERT INTO config_ia (id, institucion_id, system_prompt, proveedor, modelo, temperatura, activo) VALUES
  (1, NULL,
   'Sos el tutor académico de NEXO para estudiantes de secundaria. Explicá paso a paso, con ejemplos simples y en español rioplatense. Guiá al estudiante para que llegue solo a la respuesta: no resuelvas la tarea por él. Si te piden hacer la tarea completa, proponé en cambio un plan de estudio. Adaptá la dificultad al nivel que muestre el estudiante.',
   'google-ai-studio', 'gemini-flash', 0.7, 1);

-- ── Logs del sistema (lo ÚNICO que ve el Administrador de plataforma) ───────
INSERT INTO logs_sistema (nivel, mensaje, contexto, creado_en) VALUES
  ('info',  'Institución creada: Colegio San Martín', 'alta-institucion', '2026-03-01T09:00:00'),
  ('info',  'Copia de seguridad diaria completada',   'respaldo',         '2026-07-03T03:00:00'),
  ('aviso', 'Se registraron 3 intentos de inicio de sesión fallidos', 'seguridad', '2026-07-02T21:14:00');
```

### 4.4. Bloque C — `crear-base.mjs` (el constructor)

```js
// ============================================================================
// NEXO — Script de creación de la base de datos local
// ----------------------------------------------------------------------------
// Crea el archivo nexo.db (SQLite) aplicando esquema.sql y datos-iniciales.sql.
// No necesita instalar nada: usa el módulo SQLite integrado de Node.js 22.5+.
//
//   Uso:             node crear-base.mjs
//   Recrear de cero: node crear-base.mjs --forzar   (borra la base existente)
// ============================================================================

import { DatabaseSync } from "node:sqlite";
import { readFileSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const carpeta = dirname(fileURLToPath(import.meta.url));
const rutaBase = join(carpeta, "nexo.db");
const forzar = process.argv.includes("--forzar");

// ── 1. Si la base ya existe, no la pisamos salvo pedido explícito ──────────
if (existsSync(rutaBase)) {
  if (!forzar) {
    console.error(
      "La base ya existe en " + rutaBase + "\n" +
      "Para recrearla desde cero ejecutá:  node crear-base.mjs --forzar\n" +
      "(Atención: eso borra todos los datos cargados.)"
    );
    process.exit(1);
  }
  rmSync(rutaBase);
  console.log("Base anterior eliminada (--forzar).");
}

// ── 2. Crear la base y aplicar esquema + datos ──────────────────────────────
const db = new DatabaseSync(rutaBase);

try {
  const esquema = readFileSync(join(carpeta, "esquema.sql"), "utf8");
  const datos = readFileSync(join(carpeta, "datos-iniciales.sql"), "utf8");

  console.log("Creando tablas (esquema.sql)...");
  db.exec(esquema);

  console.log("Cargando datos iniciales (datos-iniciales.sql)...");
  db.exec(datos);
} catch (error) {
  db.close();
  rmSync(rutaBase, { force: true }); // no dejar una base a medio crear
  console.error("Error creando la base: " + error.message);
  process.exit(1);
}

// ── 3. Resumen de verificación ──────────────────────────────────────────────
const tablas = db
  .prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  )
  .all();

console.log("\nBase creada correctamente: " + rutaBase);
console.log("Tablas (" + tablas.length + ") y filas cargadas:\n");

for (const { name } of tablas) {
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM "${name}"`).get();
  console.log("  " + String(name).padEnd(24) + " " + total);
}

const vistas = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'view' ORDER BY name")
  .all();
console.log("\nVistas: " + vistas.map((v) => v.name).join(", "));

db.close();
console.log("\nListo. Abrí el archivo nexo.db con DB Browser for SQLite para explorarlo.");
```

### 4.5. Bloque D — `README.md` de la carpeta (opcional)

```markdown
# NEXO — Base de datos local

Base SQLite de toda la plataforma. Para crearla: `node crear-base.mjs`
(necesita Node.js 22.5+; no hay que instalar nada más).

Las instrucciones completas, el orden de trabajo y la explicación de cada
tabla están en `../PLAN_DE_RECONSTRUCCION.md` y en la sección 14 de
`../ERRORES_DETALLADOS.md`.

Cuentas de prueba: ver PLAN_DE_RECONSTRUCCION.md, punto 4.7.
Contraseña de todas: nexo1234
```

### 4.6. Ejecutar y comprobar

En la terminal:

```
cd C:\NEXO-main\NEXO-main\base-de-datos
node crear-base.mjs
```

Si todo salió bien, vas a ver una lista de **53 tablas** con la cantidad de filas cargadas en cada una (18 usuarios, 12 mensajes, 4 comentarios, 5 eventos…) y el mensaje final "Listo". En la carpeta apareció el archivo **`nexo.db`**: ese es el archivador. Abrilo con DB Browser for SQLite (pestaña *Browse Data*) y mirá la tabla `comentarios` o `usuarios` para verlo con tus ojos.

Si en algún momento querés **volver a empezar con datos limpios**:

```
node crear-base.mjs --forzar
```

### 4.7. Las cuentas de prueba

Todas con contraseña **`nexo1234`**:

| Correo | Quién es |
|---|---|
| `direccion@sanmartin.nexo.edu` | La dirección del colegio |
| `garcia@sanmartin.nexo.edu` | Profesor de Matemática (4°A y 4°B) |
| `pereyra@sanmartin.nexo.edu` | Preceptor de 4°A y 4°B |
| `julieta@sanmartin.nexo.edu` | Estudiante de 4°B |
| `familia.rossi@sanmartin.nexo.edu` | La familia de Julieta |
| `biblioteca@sanmartin.nexo.edu` | El bibliotecario |
| `centro@sanmartin.nexo.edu` | El Centro de Estudiantes |
| `sistema@nexo.edu` | El administrador de la plataforma |

> **Nota de seguridad — ya resuelta en la etapa 1.** Originalmente estos datos de prueba usaban un cifrado básico (SHA-256), suficiente para desarrollar pero **no** para contraseñas: SHA-256 está hecho para ser rapidísimo, y esa es justo la propiedad que le sirve a quien roba la base y quiere probar millones de claves por segundo. Al construir el ingreso real se migraron las 18 cuentas a **scrypt**, que está diseñado para ser lento y consumir mucha memoria, con una **sal distinta para cada usuario** (por eso los 18 hashes son diferentes aunque la contraseña sea la misma). Viene incluido en Node: no hubo que instalar nada. El único lugar del proyecto que cifra y verifica contraseñas es **`servidor/contrasenas.js`**; si algún día hay que endurecer el cifrado, se toca ahí y en ningún otro lado.
>
> **Lo que sigue vigente como regla:** ninguna clave secreta puede quedar dentro del código que ve el navegador. La lista de ocho cuentas con la contraseña al lado que vivía en `NEXO/src/navegacion.tsx` (Error 12.4) se eliminó en la etapa 1 — que no vuelva.

### 4.8. Qué planilla hace funcionar cada cosa (mapa rápido)

| Para que funcione… | …los datos viven en |
|---|---|
| Iniciar sesión y no salir volando al recargar | `usuarios`, `sesiones` |
| **Los comentarios** | `comentarios` (y `votos` para votarlos) |
| Publicaciones, votos y debates | `publicaciones`, `votos`, `debates`, `debate_participantes` |
| Tendencias | la vista `v_tendencias` (se calcula sola) |
| Tareas, entregas y notas (una sola nota por trabajo) | `tareas`, `entregas`, `correcciones` |
| Metas, subtareas y hábitos | `metas`, `subtareas`, `habitos`, `habito_registros` |
| El chat y los "no leídos" | `conversaciones`, `mensajes`, vista `v_no_leidos` |
| Biblioteca y cola de revisión | `recursos`, `cola_revision` |
| Calendario con "quién ve qué" | `eventos`, `evento_visibilidad`, `feriados` |
| Comunicados a familias con confirmación de lectura | `comunicados`, `comunicado_lecturas` |
| Quejas anónimas (sin columna de autor, a propósito) | `quejas` |
| Notificaciones y globitos | `notificaciones` |
| Clases en vivo (asistencia, pulso, pizarra) | `clases_planificadas`, `clase_*`, `pizarra_trazos` |

---

## 5. Crear el servidor (la cocina)

La cocina es un programa aparte de la aplicación. Vive en una carpeta nueva `servidor/` dentro del proyecto.

**Instalaciones (comandos exactos):**

```
cd C:\NEXO-main\NEXO-main
mkdir servidor
cd servidor
yarn init -y
yarn add express
yarn add ws
```

- **express** es la pieza más usada del mundo para armar cocinas en Node: recibe pedidos y responde.
- **ws** es el mensajero (la conexión en vivo); se usa recién en la etapa 6, pero conviene dejarlo instalado.

**Qué pedirle a la IA:** que cree, dentro de `servidor/`, un programa que (1) abra la base `base-de-datos/nexo.db` usando el módulo SQLite integrado de Node (`node:sqlite`) con las reglas de integridad activadas, (2) atienda pedidos en la dirección local (puerto 3000), y (3) tenga una primera "ventanilla" de prueba en `/api/salud` que responda que está viva. Pedile también que configure la aplicación (el proyecto de la carpeta `NEXO/`) para que todos los pedidos que empiecen con `/api` lleguen al servidor (esto se hace con una línea en la configuración de Vite, la IA sabe cuál).

**Cómo comprobar:** con el servidor encendido (`node servidor.js` o el comando que la IA te indique) y la aplicación encendida (`yarn dev` en `NEXO/`), entrá en el navegador a `http://localhost:5173` y pedile a la IA una forma visible de verificar que la app "ve" al servidor. A partir de acá, **siempre vas a tener dos terminales abiertas**: una con la cocina y otra con la vidriera.

---

## 6. El orden para corregir los errores (10 etapas)

El orden importa: cada etapa usa lo que construyó la anterior. Referencias como "2.B.2" o "14.4" apuntan a `ERRORES_DETALLADOS.md`.

### Etapa 1 — Los cimientos: entrar de verdad y no perderse

**Objetivo:** que exista el ingreso real con las cuentas de la base, que recargar la página no te saque, que el botón "Atrás" funcione y que cada pantalla tenga su propia dirección web.

**Instalación:** dentro de la carpeta `NEXO`:

```
cd C:\NEXO-main\NEXO-main\NEXO
yarn add react-router-dom
```

(Es el "enrutador": la pieza que le da una dirección propia a cada pantalla.)

**Qué pedirle a la IA (en este orden, de a uno):**
1. ~~Ventanilla de ingreso en el servidor: recibir correo y contraseña, compararlos contra la tabla `usuarios`, y si coinciden crear una fila en `sesiones` con una llave que el navegador guarda (sección 14.1). Eliminar del código de la aplicación la lista de cuentas escrita adentro (Error 12.4).~~ **HECHO.** Vive en `servidor/sesiones.js` (`POST`/`GET`/`DELETE /api/sesion`) y `NEXO/src/servicios/sesion.ts`. La llave viaja en una cookie **httpOnly**, que el JavaScript de la página no puede leer: ni siquiera nuestro propio código la toca. Las ocho cuentas de juguete se borraron de `navegacion.tsx`; **los correos viejos tipo `estudiante@nexo.edu` ya no existen**, ahora se entra con los del punto 4.7.
2. ~~Que al recargar la página la aplicación revalide la llave guardada y te deje donde estabas (Error 12.1).~~ **HECHO a medias, y no por descuido:** F5 ya no te expulsa, pero te deja en el **inicio de tu rol**, no en la pantalla exacta donde estabas. Eso no se puede arreglar todavía: sin direcciones propias no hay forma de saber dónde estabas. Lo completa el punto 3.
3. Reemplazar la navegación interna por el enrutador, conservando las direcciones que ya existen (Errores 12.2 y 12.3). **← acá vas.**
4. Que el servidor controle qué rol puede pedir qué cosa, y que la aplicación muestre un mensaje claro cuando no hay permiso, en vez del salto mudo (Error 12.6).
5. Arreglar el menú lateral para que marque exactamente una sección activa (Error 12.7) y que ningún botón apunte a pantallas inexistentes (Error 12.8).
6. Una pantalla de configuración de cuenta con cambio de contraseña y el flujo de "olvidé mi contraseña" (Errores 2.A.1 y 12.5).

**Cómo comprobar:** entrás con `julieta@sanmartin.nexo.edu` / `nexo1234`, apretás F5 y seguís adentro; pegás la dirección de Debates en el navegador y cae ahí; el botón "Atrás" te lleva a la pantalla anterior de NEXO. Foto de git.

### Etapa 2 — Que todas las pantallas digan la verdad

**Objetivo:** eliminar todos los datos inventados que hoy viven dentro de las pantallas y que todo se lea de la base a través del servidor. Nada nuevo de funciones: solo que lo que se ve sea real.

**Qué pedirle a la IA:** ventanillas de lectura en el servidor para cada módulo (la tabla del punto 4.8 dice qué planilla alimenta cada pantalla), y después, pantalla por pantalla y en este orden, reemplazar los datos escritos a mano por pedidos a esas ventanillas: (1) Gestión de Perfiles y de Cursos, (2) Mis Tareas y Calificaciones — que lean **la misma tabla** `correcciones`, matando el Error 13.1—, (3) Objetivos completo — Dashboard y Hábitos leyendo lo mismo (13.5), saludo con el día y la hora reales (2.D.13)—, (4) Comunidad, (5) Biblioteca, (6) Chat, (7) Calendario — que abra en el mes actual (6.E.10)— y comunicados, (8) el panel de la dirección con cifras calculadas. Pedile también que elimine todos los "Ciclo 2025" fijos (13.7).

**Cómo comprobar:** los números coinciden entre pantallas (misma cantidad de alumnos en todos lados, una sola nota para Biología); si agregás una fila en la base con DB Browser, aparece en la pantalla al recargar. Foto de git.

### Etapa 3 — La gestión del colegio

**Objetivo:** que la dirección pueda crear personas que **de verdad pueden entrar**, que el borrado sea seguro, y que el administrador de plataforma deje de ver la vida interna del colegio.

**Qué pedirle a la IA:** el alta de perfiles que crea usuario y contraseña reales, con todos los roles incluidos Familia y Bibliotecario (Errores 6.B.3 y 6.B.4); la papelera con contador de 7 días, restauración y eliminación definitiva (6.B.5, sección 14.17); y la separación tajante de los dos paneles administrativos: el de plataforma solo instituciones, salud y la tabla `logs_sistema` (sección 5 completa), el de la dirección con sus métricas reales.

**Cómo comprobar:** creás un estudiante desde la dirección, cerrás sesión y entrás con esa cuenta nueva; la cuenta `sistema@nexo.edu` no ve ni un solo dato escolar. Foto de git.

### Etapa 4 — Las tareas: el primer circuito completo

**Objetivo:** el ciclo profesor crea → estudiante entrega → profesor corrige → estudiante ve su nota, con archivos de verdad.

**Qué pedirle a la IA:** primero el servicio de archivos (subir, guardar en una carpeta `almacen/` del servidor, registrar en la tabla `archivos`, y descargar solo con permiso — sección 14.19). Después el módulo de tareas completo según la sección 14.7: creación rica con fecha de calendario, detalle de tarea, entrega con archivos adjuntos y anulación, panel de corrección con la lista del curso, nota y devolución, y "correcciones en camino" tocable (Errores 2.C.3 a 2.C.8, 3.C.1, 3.C.9).

**Cómo comprobar:** con dos navegadores a la vez (uno como García, otro como Julieta): el profesor crea una tarea, la alumna la entrega con un archivo, el profesor la abre y le pone nota, y la nota aparece en Calificaciones de Julieta. Foto de git.

### Etapa 5 — La comunidad y los objetivos

**Objetivo:** votos, **comentarios funcionando**, debates con participación real, tendencias calculadas, y metas/hábitos con toda su profundidad.

**Qué pedirle a la IA:** los votos a favor/en contra únicos y privados que reemplazan al corazón (2.B.1); los comentarios con su vista de detalle (2.B.2, 2.B.3, 2.B.7) usando la tabla `comentarios`; el menú de tres puntos **compartido** con acciones según el rol y las denuncias con bandeja de moderación (2.B.5, 2.B.8, sección 14.4); "Participar" que habilita la postura (2.B.6, sección 14.5); las tendencias leyendo la vista `v_tendencias` con el alcance "Mi escuela / Todas las escuelas" (2.B.9 a 2.B.13); y en Objetivos: subtareas individuales, fechas con calendario, unidades desde la base, el resumen semanal y el próximo hito calculados con reglas (2.D.5 a 2.D.11, secciones 14.8 y 14.9).

**Cómo comprobar:** con dos navegadores, uno comenta una publicación y el otro lo ve; votás dos veces y el voto no se duplica; una meta vencida dice "vencida", no "faltan 300 días". Foto de git.

### Etapa 6 — El chat y las notificaciones (entra el mensajero)

**Objetivo:** mensajería instantánea real y avisos que llegan solos.

**Qué pedirle a la IA:** el canal en vivo con la pieza `ws` ya instalada; el envío de mensajes que guarda en `mensajes` y entrega al instante; los no-leídos que se borran al abrir la conversación (2.F.4, 2.F.5, sección 14.2); el buscador de conversaciones y los adjuntos (2.F.1, 2.F.3); quitar el botón de llamar (2.F.2); el servicio de notificaciones transversal con la campana y los globitos (sección 14.15, Error 9.D.1); y la comunidad de cada curso tipo grupo, con la moderación del preceptor (7.A.3, 7.A.5).

**Cómo comprobar:** dos navegadores chateando en vivo sin recargar; el globito aparece en uno cuando el otro escribe, y desaparece al abrir la conversación. Foto de git.

### Etapa 7 — Calendario, biblioteca, familias y quejas

**Objetivo:** el calendario único con capas de "quién ve qué", la biblioteca con su circuito de revisión, los comunicados con respuesta privada y el canal anónimo de quejas.

**Qué pedirle a la IA:** el calendario según la sección 14.12 completa (visibilidades de la tabla `evento_visibilidad`, permisos de edición por rol, vistas mes/semana reales, limpieza automática de eventos viejos — Errores 6.E.1 a 6.E.10, 7.B.1, 8.C.1, 10.B.1 a 10.B.5); la biblioteca según la 14.11 (búsqueda que ignora tildes, filtros reales, presentar recurso, cola de revisión por orden de llegada con aprobar/rechazar y aviso — Errores 2.E.1 a 2.E.7 y sección 9); los comunicados con lectura confirmada y respuesta que abre el chat privado (10.A.1 a 10.A.3, sección 14.13); y las quejas anónimas con las no vistas arriba y su estadística mensual (8.B.1 a 8.B.5, sección 14.14).

**Cómo comprobar:** la "cita con los padres de Julieta" la ve la familia Rossi y **no** la ve Julieta; un recurso presentado por un alumno aparece en la cola del bibliotecario, y al aprobarlo como nacional lo ven todos; una queja enviada no permite saber quién la escribió ni mirando la base. Foto de git.

### Etapa 8 — Reportes e inteligencia artificial

**Objetivo:** reportes que descargan archivos de verdad y una asistencia IA real.

**Qué pedirle a la IA:** la generación de reportes con casillas que termina en un archivo descargable, nunca en un "generando…" vacío (6.C.4, 6.F.1 a 6.F.5, sección 14.18); y la Asistencia IA conectada a un proveedor con nivel gratuito (por ejemplo Google AI Studio, Groq u OpenRouter): el servidor arma el pedido con las instrucciones base guardadas en la tabla `config_ia` más la conversación, y la **clave de acceso vive en el servidor**, jamás en el código del navegador (2.G.1, sección 14.16). Para conseguir la clave: se crea una cuenta gratuita en el proveedor elegido y se copia la clave que te dan; pedile a la IA que te indique dónde ponerla (en una "variable de entorno" del servidor, nunca en un archivo que se comparta).

**Cómo comprobar:** generás un reporte y se descarga un archivo con datos reales; le hacés dos preguntas distintas a la asistencia y responde distinto, y si le pedís que haga la tarea entera, se niega y propone un plan (eso dicen sus instrucciones base). Foto de git.

### Etapa 9 — El aula virtual y las videollamadas (lo más difícil, al final)

**Objetivo:** clases en vivo con video, pizarra del docente, pulso con nombres y planificación.

**Instalación:** dentro de `NEXO`:

```
yarn add @jitsi/react-sdk
```

(Jitsi es un motor de videollamadas gratuito y de código abierto que se incrusta dentro de la aplicación: el video y el audio los resuelve él, y nosotros construimos alrededor todo lo propio de NEXO.)

**Qué pedirle a la IA (de a uno):** la planificación de clases con etapas y la lista con el botón "Iniciar" (3.B.9, 3.B.10); la sala en vivo incrustando Jitsi, conviviendo con el menú lateral y registrando quién entra en `clase_asistencias` (3.B.2, 3.B.3, 3.B.11); la pizarra que solo dibuja el docente y todos ven, guardada en `pizarra_trazos` (2.C.1); el pulso con nombres y la alerta de ritmo con umbral configurable — una regla matemática, no una IA (3.B.4, 3.B.5); la trayectoria avanzando en vivo (3.B.1); y el chat de clase reutilizando el chat de la etapa 6 (3.B.7). Todo está especificado en la sección 14.3.

**Cómo comprobar:** dos navegadores en la misma clase se ven y escuchan; el docente dibuja y el estudiante lo ve aparecer; el estudiante marca "perdido" y al docente le llega la alerta con el nombre. Foto de git.

### Etapa 10 — Limpieza y verificación final

**Objetivo:** cerrar el proyecto contra el informe de errores.

**Qué pedirle a la IA:** eliminar componentes duplicados y código muerto (incluidas las pantallas fantasma de la familia, 10.B.5 y 10.C.2, si no se integraron antes); y después recorrer juntos `ERRORES_DETALLADOS.md` **ficha por ficha** (secciones 2 a 13), marcando cada error como resuelto con una prueba manual. Las contradicciones de la sección 13 tienen que ser **imposibles**, no solo estar arregladas: como todas las pantallas leen las mismas tablas, no puede volver a haber dos notas para un trabajo.

**Cómo comprobar:** el recorrido completo por los 8 perfiles sin encontrar un solo botón muerto; F5, "Atrás" y enlaces compartidos funcionando en cualquier pantalla. Última foto de git.

---

## 7. Cómo apalancarse de la IA (método de trabajo)

No hacen falta textos mágicos; hace falta **método**. Estas son las prácticas que hacen la diferencia:

1. **Dale siempre el contexto al empezar una sesión nueva.** Las IA no recuerdan conversaciones anteriores: al abrir una sesión, indicale que lea `ERRORES_DETALLADOS.md` y este plan, y decile en qué etapa están. Con esos dos documentos, cualquier IA competente sabe exactamente dónde está parada.
2. **Pedí por número de error y por sección.** "Resolvé el Error 2.B.2 siguiendo la lógica de la sección 14.4" es un pedido perfecto: el error dice qué está mal y la sección dice cómo debe funcionar. No hace falta que expliques nada más.
3. **Una tarea por pedido.** Los pedidos gigantes ("arreglá toda la comunidad") producen resultados a medias. Los pedidos acotados ("que el contador de comentarios abra la vista de detalle") producen resultados verificables.
4. **Exigí la prueba.** Terminada cada tarea, pedile: "explicame qué cambiaste y decime paso a paso cómo lo pruebo yo". Y probalo de verdad. Si no funciona, describí exactamente qué viste ("toqué el botón y no pasó nada", "la terminal mostró este texto en rojo") — cuanto más literal seas con lo que ves, mejor lo arregla.
5. **Cuando algo se rompe, no acumules parches.** Si después de dos o tres intentos sigue roto, pedile a la IA volver al último commit de git (la última foto) y encarar el problema de nuevo con otro enfoque.
6. **Desconfiá de las pantallas que se ven perfectas de entrada.** Preguntale de dónde salen los datos que se ven. Si la respuesta no es "de la base de datos, a través del servidor", es utilería otra vez.
7. **Los errores en rojo de la terminal no son un drama: son información.** Copialos y pegáselos completos a la IA; casi siempre el texto del error dice exactamente qué falta.
8. **Vos tenés el mapa.** La IA escribe el código mil veces más rápido que cualquier persona, pero no sabe cuál es la visión de NEXO ni en qué orden conviene avanzar — eso está en estos dos documentos, y el que los tiene en la mano sos vos.

---

## 8. Resumen: el camino completo de un vistazo

| Paso | Qué se logra | Comandos / instalaciones nuevas |
|---|---|---|
| 3. Preparación | Motor, fotos y visor listos | Node.js 22.5+, Git, DB Browser, yarn (`corepack enable`); `yarn` y `yarn dev` en `NEXO/` |
| 4. Base de datos | El archivador `nexo.db` con las 53 planillas y datos coherentes | copiar los bloques A-D; `node crear-base.mjs` |
| 5. Servidor | La cocina que atiende pedidos | `mkdir servidor` → `yarn init -y` → `yarn add express ws` |
| Etapa 1 | Ingreso real, recarga sin perder sesión, direcciones por pantalla | `yarn add react-router-dom` (en `NEXO/`) |
| Etapa 2 | Todas las pantallas leen datos reales | — |
| Etapa 3 | Altas reales, papelera, roles separados | — |
| Etapa 4 | Circuito completo de tareas con archivos | — |
| Etapa 5 | Votos, **comentarios**, debates, tendencias, metas y hábitos | — |
| Etapa 6 | Chat en vivo y notificaciones | (usa `ws`, ya instalado) |
| Etapa 7 | Calendario con capas, biblioteca, comunicados, quejas | — |
| Etapa 8 | Reportes descargables y asistencia IA real | clave gratuita del proveedor de IA, guardada en el servidor |
| Etapa 9 | Aula virtual con videollamadas | `yarn add @jitsi/react-sdk` (en `NEXO/`) |
| Etapa 10 | Verificación ficha por ficha contra el informe | — |

Al terminar la etapa 10, cada error de `ERRORES_DETALLADOS.md` tiene que poder marcarse como resuelto con una prueba hecha por vos. Ese es el criterio de "aplicación terminada".
