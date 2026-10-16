
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
    -- Perfil diseñado por el Maestro dentro del genoma de la escuela (ver 14.D).
    -- NULL = el perfil predeterminado de su rol. El rol sigue siendo el
    -- ARQUETIPO: lo que el servidor sabe custodiar; el perfil lo esculpe.
    perfil_clave    TEXT,
    -- 1 = la cuenta todavía no entró nunca: al entrar ve primero la
    -- configuración de su cuenta, donde puede cambiar la contraseña inicial.
    primer_ingreso  INTEGER NOT NULL DEFAULT 0 CHECK (primer_ingreso IN (0, 1)),
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
    -- Turno y especialidad: de las listas de la escuela (curso_turnos y
    -- curso_especialidades). NULL = cursos cargados antes de que existieran.
    turno_id        INTEGER REFERENCES curso_turnos(id),
    especialidad_id INTEGER REFERENCES curso_especialidades(id),
    UNIQUE (institucion_id, anio, division)
);

-- Los turnos y las especialidades de cada escuela. Arrancan con Mañana, Tarde
-- y Vespertino, y con Informática, Electromecánica y Energías renovables
-- (servidor/gestion-academica.js); la dirección suma los que le falten.
CREATE TABLE curso_turnos (
    id             INTEGER PRIMARY KEY,
    institucion_id INTEGER NOT NULL REFERENCES instituciones(id),
    nombre         TEXT NOT NULL,
    orden          INTEGER NOT NULL DEFAULT 0,
    UNIQUE (institucion_id, nombre)
);
CREATE TABLE curso_especialidades (
    id             INTEGER PRIMARY KEY,
    institucion_id INTEGER NOT NULL REFERENCES instituciones(id),
    nombre         TEXT NOT NULL,
    orden          INTEGER NOT NULL DEFAULT 0,
    UNIQUE (institucion_id, nombre)
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
    tarea_id       INTEGER REFERENCES tareas(id),
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
    publicar_en    TEXT,                            -- fecha-hora ISO programada; NULL = publicar ya
    fijado_en      TEXT,                            -- cuándo se fijó; NULL = no fijado
    fijado_por_id  INTEGER REFERENCES usuarios(id), -- quién la fijó
    cita_id        INTEGER REFERENCES publicaciones(id), -- cita de otra publicación (estilo X)
    hilo_raiz_id   INTEGER REFERENCES publicaciones(id), -- en un hilo: la primera publicación
    hilo_orden     INTEGER NOT NULL DEFAULT 0,
    editado_en     TEXT,
    responden      TEXT NOT NULL DEFAULT 'todos' CHECK (responden IN ('todos','seguidos','mencionados')),
    encuesta_cierra_en TEXT,
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
    fijado_en      TEXT,
    fijado_por_id  INTEGER REFERENCES usuarios(id),
    resultados     TEXT NOT NULL DEFAULT 'siempre' CHECK (resultados IN ('siempre','al-participar','al-cierre')),
    anonimo        INTEGER NOT NULL DEFAULT 0,      -- los aportes no muestran quién los hizo
    cerrado_en     TEXT,                            -- cerrado a mano antes de su fecha
    conclusion     TEXT,
    conclusion_en  TEXT,
    conclusion_por INTEGER REFERENCES usuarios(id),
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
    objeto_tipo TEXT NOT NULL CHECK (objeto_tipo IN ('publicacion','debate','comentario','recurso','aporte')),
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
    padre_id     INTEGER REFERENCES comentarios(id), -- respuesta a otra respuesta (sub-hilo)
    aporte_id    INTEGER,                            -- hilo de un aporte de debate
    editado_en   TEXT,
    creado_en    TEXT NOT NULL DEFAULT (datetime('now')),
    eliminado_en TEXT,
    eliminado_por INTEGER REFERENCES usuarios(id)
);

-- Denuncias del menú de tres puntos (Errores 2.B.5 y 2.B.8).
CREATE TABLE denuncias (
    id             INTEGER PRIMARY KEY,
    denunciante_id INTEGER NOT NULL REFERENCES usuarios(id),
    objeto_tipo    TEXT NOT NULL CHECK (objeto_tipo IN ('publicacion','debate','comentario','aporte')),
    objeto_id      INTEGER NOT NULL,
    motivo         TEXT NOT NULL,
    creado_en      TEXT NOT NULL DEFAULT (datetime('now')),
    resuelta_en    TEXT,
    resuelta_por   INTEGER REFERENCES usuarios(id),
    resultado      TEXT CHECK (resultado IN ('contenido-eliminado','descartada'))
);

-- ── Comunidad estilo X / Reddit ─────────────────────────────────────────────
-- Adjuntos de cualquier contenido (fotos, videos, archivos). Solo los suben los
-- perfiles con la capacidad "comunidad.multimedia" del genoma.
CREATE TABLE IF NOT EXISTS contenido_adjuntos (
    id          INTEGER PRIMARY KEY,
    objeto_tipo TEXT NOT NULL CHECK (objeto_tipo IN ('publicacion','comentario','debate','aporte')),
    objeto_id   INTEGER NOT NULL,
    archivo_id  INTEGER NOT NULL REFERENCES archivos(id),
    orden       INTEGER NOT NULL DEFAULT 0,
    UNIQUE (objeto_tipo, objeto_id, archivo_id)
);

-- Reacciones con emoji (no hay "me gusta": votar es otra cosa).
CREATE TABLE IF NOT EXISTS reacciones (
    id          INTEGER PRIMARY KEY,
    usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    objeto_tipo TEXT NOT NULL CHECK (objeto_tipo IN ('publicacion','comentario','debate','aporte')),
    objeto_id   INTEGER NOT NULL,
    emoji       TEXT NOT NULL,
    creado_en   TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (usuario_id, objeto_tipo, objeto_id, emoji)
);

-- Reposts (sin texto; una cita es una publicación con cita_id).
CREATE TABLE IF NOT EXISTS reposts (
    id             INTEGER PRIMARY KEY,
    usuario_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    publicacion_id INTEGER NOT NULL REFERENCES publicaciones(id),
    creado_en      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (usuario_id, publicacion_id)
);

-- Guardados (marcadores privados de cada persona).
CREATE TABLE IF NOT EXISTS guardados (
    id             INTEGER PRIMARY KEY,
    usuario_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    publicacion_id INTEGER NOT NULL REFERENCES publicaciones(id),
    creado_en      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (usuario_id, publicacion_id)
);

-- A quién sigue cada persona (pestaña "Siguiendo") y a quién silenció.
CREATE TABLE IF NOT EXISTS seguimientos (
    seguidor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    seguido_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    creado_en   TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (seguidor_id, seguido_id),
    CHECK (seguidor_id <> seguido_id)
);
CREATE TABLE IF NOT EXISTS silenciados (
    usuario_id    INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    silenciado_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    creado_en     TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (usuario_id, silenciado_id)
);

-- Vistas únicas por persona (el contador de "vistas" de cada publicación).
CREATE TABLE IF NOT EXISTS publicacion_vistas (
    publicacion_id INTEGER NOT NULL REFERENCES publicaciones(id),
    usuario_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    visto_en       TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (publicacion_id, usuario_id)
);

-- Encuestas dentro de una publicación (un voto por persona).
CREATE TABLE IF NOT EXISTS encuesta_opciones (
    id             INTEGER PRIMARY KEY,
    publicacion_id INTEGER NOT NULL REFERENCES publicaciones(id),
    texto          TEXT NOT NULL,
    orden          INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS encuesta_votos (
    publicacion_id INTEGER NOT NULL REFERENCES publicaciones(id),
    usuario_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    opcion_id      INTEGER NOT NULL REFERENCES encuesta_opciones(id),
    creado_en      TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (publicacion_id, usuario_id)
);

-- Menciones (@usuario) de cada contenido: avisos y pestaña de menciones.
CREATE TABLE IF NOT EXISTS menciones (
    objeto_tipo TEXT NOT NULL,
    objeto_id   INTEGER NOT NULL,
    usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    PRIMARY KEY (objeto_tipo, objeto_id, usuario_id)
);

-- ── Debates con bloques combinables ─────────────────────────────────────────
-- Cada debate se arma con bloques de interacción: postura, opciones (encuesta),
-- escala, ranking, argumentos, propuestas y pregunta abierta. Los cuatro
-- primeros guardan UNA respuesta por persona (debate_respuestas); los otros
-- tres juntan aportes que se votan y tienen su propio hilo (debate_aportes).
CREATE TABLE IF NOT EXISTS debate_bloques (
    id        INTEGER PRIMARY KEY,
    debate_id INTEGER NOT NULL REFERENCES debates(id),
    tipo      TEXT NOT NULL CHECK (tipo IN ('postura','opciones','escala','ranking','argumentos','propuestas','abierta')),
    orden     INTEGER NOT NULL DEFAULT 0,
    titulo    TEXT NOT NULL DEFAULT '',
    config    TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS debate_respuestas (
    id             INTEGER PRIMARY KEY,
    bloque_id      INTEGER NOT NULL REFERENCES debate_bloques(id) ON DELETE CASCADE,
    usuario_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    valor          TEXT NOT NULL,
    actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (bloque_id, usuario_id)
);
CREATE TABLE IF NOT EXISTS debate_aportes (
    id            INTEGER PRIMARY KEY,
    debate_id     INTEGER NOT NULL REFERENCES debates(id),
    bloque_id     INTEGER NOT NULL REFERENCES debate_bloques(id) ON DELETE CASCADE,
    usuario_id    INTEGER NOT NULL REFERENCES usuarios(id),
    lado          TEXT,                         -- a-favor / en-contra en "argumentos"
    texto         TEXT NOT NULL,
    creado_en     TEXT NOT NULL DEFAULT (datetime('now')),
    editado_en    TEXT,
    eliminado_en  TEXT,
    eliminado_por INTEGER REFERENCES usuarios(id)
);
-- "Me hizo cambiar de opinión" (Δ): un aporte que convenció a alguien.
CREATE TABLE IF NOT EXISTS debate_convencidos (
    aporte_id  INTEGER NOT NULL REFERENCES debate_aportes(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    creado_en  TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (aporte_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_adjuntos_objeto   ON contenido_adjuntos(objeto_tipo, objeto_id);
CREATE INDEX IF NOT EXISTS idx_reacciones_objeto ON reacciones(objeto_tipo, objeto_id);
CREATE INDEX IF NOT EXISTS idx_reposts_pub       ON reposts(publicacion_id);
CREATE INDEX IF NOT EXISTS idx_bloques_debate    ON debate_bloques(debate_id);
CREATE INDEX IF NOT EXISTS idx_aportes_bloque    ON debate_aportes(bloque_id);
CREATE INDEX IF NOT EXISTS idx_respuestas_bloque ON debate_respuestas(bloque_id);

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
-- 10. CALENDARIO CON JERARQUÍA DE EVENTOS (sección 14.12)
-- ============================================================================

-- Evento del calendario. El tipo (categoría) es texto libre (Error 6.E.4) y la
-- base rechaza horarios incoherentes (Error 6.E.5). Un evento puede durar
-- varios días (fecha_fin) y repetirse (recurrencia: regla JSON que expande el
-- servidor, ver servidor/agenda.js). Quién lo ve vive en evento_destinos: sin
-- filas, es un evento PERSONAL (solo lo ve quien lo creó).
CREATE TABLE eventos (
    id                INTEGER PRIMARY KEY,
    institucion_id    INTEGER NOT NULL REFERENCES instituciones(id),
    creador_id        INTEGER NOT NULL REFERENCES usuarios(id),
    titulo            TEXT NOT NULL,
    tipo              TEXT NOT NULL DEFAULT 'evento',
    descripcion       TEXT NOT NULL DEFAULT '',
    lugar             TEXT,
    enlace            TEXT,                          -- videollamada o página
    color             TEXT,                          -- "#rrggbb" propio (NULL = el de su categoría)
    fecha             TEXT NOT NULL,                 -- inicio "2026-07-22"
    fecha_fin         TEXT,                          -- fin (NULL = el mismo día)
    hora_inicio       TEXT,                          -- "08:30" (NULL = todo el día)
    hora_fin          TEXT,
    recurrencia       TEXT,                          -- regla JSON (NULL = no se repite)
    recordatorios     TEXT NOT NULL DEFAULT '[]',    -- minutos antes, para todos los que lo ven
    obligatorio       INTEGER NOT NULL DEFAULT 0,    -- nadie lo puede ocultar de su calendario
    pide_confirmacion INTEGER NOT NULL DEFAULT 0,    -- sí / quizás / no de cada destinatario
    archivo_id        INTEGER REFERENCES archivos(id),
    creado_en         TEXT NOT NULL DEFAULT (datetime('now')),
    actualizado_en    TEXT,
    CHECK (fecha_fin IS NULL OR fecha_fin >= fecha),
    CHECK (hora_fin IS NULL OR hora_inicio IS NULL
           OR (fecha_fin IS NOT NULL AND fecha_fin > fecha) OR hora_fin > hora_inicio)
);

-- A quién le aparece cada evento (la jerarquía la valida el servidor al crear):
--   todos       → toda la escuela (solo el nivel de arriba)
--   nivel       → todos los perfiles de un nivel de la jerarquía (valor = id)
--   perfil      → un perfil del genoma (valor = clave)
--   curso       → un curso, para un rol: estudiante, familia, profesor o preceptor
--   persona     → una persona puntual (usuario_id)
--   familia-de  → la familia de un estudiante puntual (usuario_id = el estudiante)
CREATE TABLE IF NOT EXISTS evento_destinos (
    id         INTEGER PRIMARY KEY,
    evento_id  INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    tipo       TEXT NOT NULL CHECK (tipo IN ('todos','nivel','perfil','curso','persona','familia-de')),
    valor      TEXT,
    curso_id   INTEGER REFERENCES cursos(id) ON DELETE CASCADE,
    rol        TEXT CHECK (rol IS NULL OR rol IN ('estudiante','familia','profesor','preceptor')),
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Una ocurrencia de un evento que se repite, cancelada o cambiada ("solo este").
CREATE TABLE IF NOT EXISTS evento_excepciones (
    id        INTEGER PRIMARY KEY,
    evento_id INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    fecha     TEXT NOT NULL,                    -- la fecha original de la ocurrencia
    cancelada INTEGER NOT NULL DEFAULT 0,
    cambios   TEXT NOT NULL DEFAULT '{}',       -- título, horas, lugar o fecha nuevos
    UNIQUE (evento_id, fecha)
);

-- Lo de cada persona con un evento: su confirmación, si lo ocultó y sus
-- propios recordatorios (NULL = los del evento).
CREATE TABLE IF NOT EXISTS evento_participantes (
    evento_id     INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    usuario_id    INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    respuesta     TEXT CHECK (respuesta IS NULL OR respuesta IN ('si','quizas','no')),
    respondido_en TEXT,
    oculto        INTEGER NOT NULL DEFAULT 0,
    recordatorios TEXT,
    PRIMARY KEY (evento_id, usuario_id)
);

-- Recordatorios ya enviados: uno por persona, ocurrencia y anticipación.
CREATE TABLE IF NOT EXISTS evento_avisos (
    evento_id  INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    fecha      TEXT NOT NULL,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    minutos    INTEGER NOT NULL,
    enviado_en TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (evento_id, fecha, usuario_id, minutos)
);

CREATE INDEX IF NOT EXISTS idx_evento_destinos  ON evento_destinos(evento_id);
CREATE INDEX IF NOT EXISTS idx_evento_excepciones ON evento_excepciones(evento_id);
CREATE INDEX IF NOT EXISTS idx_eventos_institucion ON eventos(institucion_id, fecha);

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
    publicar_en    TEXT,                            -- fecha-hora ISO programada; NULL = publicar ya
    fijado_en      TEXT,                            -- cuándo se fijó; NULL = no fijado
    fijado_por_id  INTEGER REFERENCES usuarios(id), -- quién lo fijó
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
-- 14.C. PLANTILLAS DE PLATAFORMA (detalles finales)
-- ----------------------------------------------------------------------------
-- Un conjunto base de ESTRUCTURA (materias sugeridas, competencias base) que el
-- Administrador de plataforma define una vez y APLICA al configurar una escuela,
-- para no cargar todo a mano. Son de la plataforma, no de una institución: por
-- eso `plantillas` no tiene institucion_id. Aplicarlas inserta filas reales en
-- `materias` / `competencias` de la institución elegida.
--
-- Estructura, nunca contenido: una plantilla trae "Matemática" como materia, no
-- alumnos ni notas. El operador de plataforma sigue sin ver la vida interna de
-- ninguna escuela (sección 5.9).
CREATE TABLE plantillas (
    id        INTEGER PRIMARY KEY,
    nombre    TEXT NOT NULL,
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Cada ítem de una plantilla: qué es (materia o competencia) y cómo se llama.
-- El CHECK acota los tipos a los que hoy mapean a una tabla real; deja lugar a
-- sumar más adelante sin romper lo existente.
CREATE TABLE plantilla_items (
    id           INTEGER PRIMARY KEY,
    plantilla_id INTEGER NOT NULL REFERENCES plantillas(id),
    tipo         TEXT NOT NULL CHECK (tipo IN ('materia','competencia')),
    nombre       TEXT NOT NULL
);

-- ============================================================================
-- 14.D. INSTANCIAS DEL MAESTRO: GENOMA, VERSIONES Y FLUJOS
-- ----------------------------------------------------------------------------
-- El perfil Maestro diseña cada escuela como una instancia independiente: qué
-- módulos se ven y en qué orden, qué funciones de cada uno están habilitadas,
-- cómo se comportan sus algoritmos, sus colores, sus perfiles propios y sus
-- flujos de nodos. Todo eso es el GENOMA (un documento JSON validado por
-- servidor/genoma.js). Sin fila acá, la escuela usa el genoma por defecto.
-- ============================================================================

CREATE TABLE instancia_genomas (
    institucion_id  INTEGER PRIMARY KEY REFERENCES instituciones(id),
    genoma          TEXT NOT NULL,
    version         INTEGER NOT NULL DEFAULT 1,
    actualizado_en  TEXT NOT NULL DEFAULT (datetime('now')),
    actualizado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Cada versión guardada: el Maestro puede volver a cualquiera. autor_rol dice
-- si el cambio lo hizo el Maestro o la dirección (que solo puede desocultar).
CREATE TABLE genoma_versiones (
    id             INTEGER PRIMARY KEY,
    institucion_id INTEGER NOT NULL REFERENCES instituciones(id),
    version        INTEGER NOT NULL,
    genoma         TEXT NOT NULL,
    nota           TEXT NOT NULL DEFAULT '',
    autor_rol      TEXT NOT NULL DEFAULT 'maestro'
                       CHECK (autor_rol IN ('maestro','direccion','sistema')),
    creado_por     INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    creado_en      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (institucion_id, version)
);

-- Rastro de los flujos de nodos que efectivamente actuaron (avisaron o
-- registraron). Sin personas: solo qué flujo, qué lo disparó y qué valores.
CREATE TABLE flujo_ejecuciones (
    id             INTEGER PRIMARY KEY,
    institucion_id INTEGER NOT NULL REFERENCES instituciones(id),
    flujo_id       TEXT NOT NULL,
    disparador     TEXT NOT NULL,
    acciones       INTEGER NOT NULL DEFAULT 0,
    detalle        TEXT NOT NULL DEFAULT '',
    creado_en      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tendencias que salen de una escuela a lo NACIONAL. El algoritmo de la
-- escuela propone (estado 'propuesta') lo mejor de su ranking; solo la
-- DIRECCIÓN de esa escuela lo aprueba ('aprobada'), lo descarta ('rechazada') o
-- lo retira después ('retirada'). El ranking nacional solo mira las aprobadas.
-- Un objeto se decide una sola vez: UNIQUE(objeto_tipo, objeto_id).
CREATE TABLE tendencias_nacionales (
    id             INTEGER PRIMARY KEY,
    institucion_id INTEGER NOT NULL REFERENCES instituciones(id),
    objeto_tipo    TEXT NOT NULL CHECK (objeto_tipo IN ('publicacion','debate')),
    objeto_id      INTEGER NOT NULL,
    estado         TEXT NOT NULL DEFAULT 'propuesta'
                       CHECK (estado IN ('propuesta','aprobada','rechazada','retirada')),
    puntaje        REAL NOT NULL DEFAULT 0,      -- puntaje en su escuela al proponerse
    propuesta_en   TEXT NOT NULL DEFAULT (datetime('now')),
    decidido_por   INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    decidido_en    TEXT,
    UNIQUE (objeto_tipo, objeto_id)
);

-- Configuración de la PLATAFORMA (no de una escuela) que diseña el Maestro: por
-- ahora, el algoritmo de las tendencias nacionales (clave 'tendencias-nacionales').
CREATE TABLE plataforma_config (
    clave           TEXT PRIMARY KEY,
    valor           TEXT NOT NULL,
    actualizado_en  TEXT NOT NULL DEFAULT (datetime('now')),
    actualizado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

-- ============================================================================
-- 14.E. ANUNCIOS: AVISOS OBLIGATORIOS ENTRE LA DIRECCIÓN Y LA PRECEPTORÍA
-- ----------------------------------------------------------------------------
-- Un anuncio NO es un chat: es una tarjeta que le aparece encima de todo a cada
-- destinatario y que tiene que marcar como leída para seguir usando NEXO. Se
-- manda a un GRUPO DE DIFUSIÓN (lo arman la dirección o el Maestro) o a personas
-- puntuales. No se responde: se marca leído y, si se quiere, se reacciona con un
-- emoji. Quien lo mandó ve quién lo leyó, cuándo y cómo reaccionó. Las reglas
-- las custodia servidor/anuncios.js.
-- ============================================================================

-- Grupos de difusión. El tipo decide quién habla y quién escucha:
--   uno-a-muchos    → un emisor, muchos receptores (la directora a preceptores)
--   muchos-a-uno    → muchos emisores, un receptor (todos le escriben a la directora)
--   muchos-a-muchos → todos los miembros envían y reciben
-- No se borran: se archivan, así los anuncios viejos conservan su color.
CREATE TABLE IF NOT EXISTS anuncio_grupos (
    id             INTEGER PRIMARY KEY,
    institucion_id INTEGER NOT NULL REFERENCES instituciones(id),
    nombre         TEXT NOT NULL,
    descripcion    TEXT NOT NULL DEFAULT '',
    tipo           TEXT NOT NULL
                       CHECK (tipo IN ('uno-a-muchos','muchos-a-uno','muchos-a-muchos')),
    color          TEXT NOT NULL,
    creado_por     INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    creado_en      TEXT NOT NULL DEFAULT (datetime('now')),
    actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),
    archivado_en   TEXT
);

-- Quién está en cada grupo y con qué papel ('miembro' solo en muchos-a-muchos).
CREATE TABLE IF NOT EXISTS anuncio_grupo_miembros (
    grupo_id   INTEGER NOT NULL REFERENCES anuncio_grupos(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    papel      TEXT NOT NULL CHECK (papel IN ('emisor','receptor','miembro')),
    PRIMARY KEY (grupo_id, usuario_id)
);

-- Cada anuncio. grupo_id NULL = directo a una o más personas puntuales. Si el
-- autor se purga de la papelera, el anuncio queda (sin autor) para quien lo leyó.
CREATE TABLE IF NOT EXISTS anuncios (
    id             INTEGER PRIMARY KEY,
    institucion_id INTEGER NOT NULL REFERENCES instituciones(id),
    autor_id       INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    grupo_id       INTEGER REFERENCES anuncio_grupos(id),
    cuerpo         TEXT NOT NULL,
    creado_en      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- A quién le llegó cada anuncio, cuándo lo leyó, cómo reaccionó y cuántas veces
-- se le insistió por notificación push mientras no lo leía.
CREATE TABLE IF NOT EXISTS anuncio_destinatarios (
    anuncio_id     INTEGER NOT NULL REFERENCES anuncios(id) ON DELETE CASCADE,
    usuario_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    leido_en       TEXT,
    reaccion       TEXT,
    reaccion_en    TEXT,
    insistencias   INTEGER NOT NULL DEFAULT 0,
    ultimo_push_en TEXT,
    PRIMARY KEY (anuncio_id, usuario_id)
);

-- Archivos que viajan con un aviso (cualquier tipo, y notas de voz grabadas en
-- NEXO). Los baja quien lo mandó y quien lo recibió (servidor/archivos.js).
CREATE TABLE IF NOT EXISTS anuncio_adjuntos (
    anuncio_id  INTEGER NOT NULL REFERENCES anuncios(id) ON DELETE CASCADE,
    archivo_id  INTEGER NOT NULL REFERENCES archivos(id),
    orden       INTEGER NOT NULL DEFAULT 0,
    -- 1 = nota de voz grabada manteniendo apretado el micrófono.
    es_voz      INTEGER NOT NULL DEFAULT 0 CHECK (es_voz IN (0, 1)),
    duracion_ms INTEGER,
    PRIMARY KEY (anuncio_id, archivo_id)
);

-- Suscripciones Web Push de cada navegador (celular o computadora). El servidor
-- cifra cada aviso con las claves de ESE navegador (p256dh y auth): el servicio
-- de push que lo transporta no puede leerlo.
CREATE TABLE IF NOT EXISTS push_suscripciones (
    id         INTEGER PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    endpoint   TEXT NOT NULL UNIQUE,
    p256dh     TEXT NOT NULL,
    auth       TEXT NOT NULL,
    agente     TEXT NOT NULL DEFAULT '',
    creado_en  TEXT NOT NULL DEFAULT (datetime('now')),
    usado_en   TEXT
);

CREATE INDEX IF NOT EXISTS idx_anuncio_grupos_inst      ON anuncio_grupos(institucion_id, archivado_en);
CREATE INDEX IF NOT EXISTS idx_anuncio_miembros_usuario ON anuncio_grupo_miembros(usuario_id);
CREATE INDEX IF NOT EXISTS idx_anuncios_autor           ON anuncios(autor_id, id);
CREATE INDEX IF NOT EXISTS idx_anuncio_dest_usuario     ON anuncio_destinatarios(usuario_id, leido_en);
CREATE INDEX IF NOT EXISTS idx_anuncio_adjuntos_archivo ON anuncio_adjuntos(archivo_id);
CREATE INDEX IF NOT EXISTS idx_push_usuario             ON push_suscripciones(usuario_id);

-- ============================================================================
-- 15. VISTAS (consultas ya armadas)
-- ============================================================================

-- Tendencias (sección 14.6): ya no es una vista. El puntaje es un algoritmo
-- del genoma de cada escuela y otro de la plataforma para lo nacional; los
-- calcula servidor/tendencias.js (ver servidor/genoma.js, ALGORITMOS).

-- Eventos vigentes (Error 6.E.7): ya no es una vista. Un evento que se repite
-- sigue vigente aunque haya empezado hace años; lo decide servidor/agenda.js y
-- la limpieza periódica del calendario (algoritmo «Limpieza de eventos viejos»).

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
CREATE INDEX idx_plantilla_items        ON plantilla_items(plantilla_id);
CREATE INDEX idx_genoma_versiones       ON genoma_versiones(institucion_id, version);
CREATE INDEX idx_flujo_ejecuciones      ON flujo_ejecuciones(institucion_id, flujo_id, creado_en);
CREATE INDEX idx_tendencias_nacionales  ON tendencias_nacionales(estado, institucion_id);
