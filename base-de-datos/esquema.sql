
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

-- Códigos de un solo uso de "olvidé mi contraseña" (Error 12.5, sección 14.1
-- punto 6). El código se guarda CIFRADO, igual que una contraseña: quien llegue
-- a leer la base no puede usarlo para apropiarse de una cuenta. Se cuentan los
-- intentos fallidos para poder cortar la adivinación: seis dígitos se adivinan
-- solos si se permiten intentos infinitos.
CREATE TABLE codigos_recuperacion (
    id          INTEGER PRIMARY KEY,
    usuario_id  INTEGER NOT NULL REFERENCES usuarios(id),
    hash_codigo TEXT NOT NULL,
    creado_en   TEXT NOT NULL DEFAULT (datetime('now')),
    expira_en   TEXT NOT NULL,
    usado_en    TEXT,                            -- un solo uso: se marca al canjearlo
    intentos    INTEGER NOT NULL DEFAULT 0
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
-- objeto_tipo + objeto_id apuntan a una publicación, debate, comentario o
-- recurso de biblioteca (voto de recurso: reutiliza esta misma tabla).
CREATE TABLE votos (
    id          INTEGER PRIMARY KEY,
    usuario_id  INTEGER NOT NULL REFERENCES usuarios(id),
    objeto_tipo TEXT NOT NULL CHECK (objeto_tipo IN ('publicacion','debate','comentario','recurso')),
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

-- Historial de la Asistencia IA por estudiante (sección 14.16, Error 2.G.1).
-- Es la conversación con el tutor: un renglón por mensaje. La CLAVE de la API
-- NO vive acá (vive en una variable de entorno del servidor); esto solo guarda
-- lo que se dijeron. El servidor la crea con CREATE TABLE IF NOT EXISTS al
-- arrancar, así una base ya existente la suma sin regenerarse.
CREATE TABLE ia_mensajes (
    id         INTEGER PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    rol        TEXT NOT NULL CHECK (rol IN ('user','ai')),
    contenido  TEXT NOT NULL,
    creado_en  TEXT NOT NULL DEFAULT (datetime('now'))
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
-- 14.B. DETALLE DE MATERIA: HORARIOS Y AVISOS DE CÁTEDRA (detalles finales)
-- ----------------------------------------------------------------------------
-- Lo que el alumno ve al entrar a una materia y el profesor usa para comunicarse
-- con su curso: los días/horas en que se dicta, los avisos del docente y las
-- reacciones y respuestas de los alumnos a esos avisos.
-- ============================================================================

-- Días y horas en que se dicta cada cátedra (materia + curso).
CREATE TABLE catedra_horarios (
    id          INTEGER PRIMARY KEY,
    catedra_id  INTEGER NOT NULL REFERENCES catedras(id),
    dia_semana  TEXT NOT NULL CHECK (dia_semana IN
                    ('lunes','martes','miercoles','jueves','viernes','sabado')),
    hora_inicio TEXT NOT NULL,                    -- "08:30"
    hora_fin    TEXT NOT NULL,                    -- "10:00"
    aula        TEXT,
    CHECK (hora_fin > hora_inicio),               -- la base rechaza bloques incoherentes
    UNIQUE (catedra_id, dia_semana, hora_inicio)  -- sin repetir el mismo bloque
);

-- Aviso/mensaje que el profesor publica para su cátedra. Lo ven los alumnos
-- inscriptos en ese curso. Editable y borrable (borrado suave).
CREATE TABLE catedra_avisos (
    id           INTEGER PRIMARY KEY,
    catedra_id   INTEGER NOT NULL REFERENCES catedras(id),
    autor_id     INTEGER NOT NULL REFERENCES usuarios(id),
    titulo       TEXT,
    contenido    TEXT NOT NULL,
    archivo_id   INTEGER REFERENCES archivos(id),          -- adjunto opcional
    creado_en    TEXT NOT NULL DEFAULT (datetime('now')),
    editado_en   TEXT,
    eliminado_en TEXT
);

-- Reacción de un alumno a un aviso, con un set FIJO de emojis. Una por
-- persona y aviso (se puede cambiar de emoji, no acumular).
CREATE TABLE aviso_reacciones (
    id         INTEGER PRIMARY KEY,
    aviso_id   INTEGER NOT NULL REFERENCES catedra_avisos(id),
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    emoji      TEXT NOT NULL CHECK (emoji IN ('👍','❤️','🎉','😮','✅')),
    creado_en  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (aviso_id, usuario_id)
);

-- Respuestas de texto a un aviso (tabla propia para no tocar el CHECK de
-- comentarios de la comunidad). Borrado suave.
CREATE TABLE aviso_respuestas (
    id           INTEGER PRIMARY KEY,
    aviso_id     INTEGER NOT NULL REFERENCES catedra_avisos(id),
    usuario_id   INTEGER NOT NULL REFERENCES usuarios(id),
    contenido    TEXT NOT NULL,
    creado_en    TEXT NOT NULL DEFAULT (datetime('now')),
    eliminado_en TEXT
);

-- Auditoría de la papelera de perfiles (Error 6.B.5): historial completo de
-- quién mandó a papelera, quién restauró y qué purgó el sistema.
-- realizado_por_id es NULL cuando la purga la hace la rutina automática.
--
-- El punto fino: una purga BORRA de verdad al usuario (sección 14.17). Para que
-- el rastro sobreviva a ese borrado, la referencia es ON DELETE SET NULL (no
-- bloquea el DELETE ni deja una fila huérfana) y se guarda `afectado_desc` con
-- el nombre y correo de la persona al momento del movimiento: así el historial
-- de un perfil purgado sigue diciendo A QUIÉN se purgó aunque su fila ya no exista.
CREATE TABLE papelera_movimientos (
    id                  INTEGER PRIMARY KEY,
    usuario_afectado_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    afectado_desc       TEXT NOT NULL,
    accion              TEXT NOT NULL CHECK (accion IN ('a-papelera','restaurado','purgado')),
    realizado_por_id    INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    realizado_en        TEXT NOT NULL DEFAULT (datetime('now'))
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
CREATE INDEX idx_catedra_horarios       ON catedra_horarios(catedra_id);
CREATE INDEX idx_catedra_avisos_catedra ON catedra_avisos(catedra_id, creado_en);
CREATE INDEX idx_aviso_reacciones_aviso ON aviso_reacciones(aviso_id);
CREATE INDEX idx_aviso_respuestas_aviso ON aviso_respuestas(aviso_id);
CREATE INDEX idx_papelera_mov_afectado  ON papelera_movimientos(usuario_afectado_id, realizado_en);
