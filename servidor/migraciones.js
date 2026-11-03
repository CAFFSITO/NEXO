// Actualizaciones aditivas: conservar siempre las bases existentes.
export function migrarBase(db) {
  // Cupo de cada curso (mínimo y máximo de estudiantes) y su aula: el panel de
  // la dirección avisa si un curso está excedido o le faltan estudiantes.
  const columnasCurso = db.prepare("PRAGMA table_info(cursos)").all().map((c) => c.name);
  if (!columnasCurso.includes("cupo_minimo")) db.exec("ALTER TABLE cursos ADD COLUMN cupo_minimo INTEGER");
  if (!columnasCurso.includes("cupo_maximo")) db.exec("ALTER TABLE cursos ADD COLUMN cupo_maximo INTEGER");
  if (!columnasCurso.includes("aula")) db.exec("ALTER TABLE cursos ADD COLUMN aula TEXT");
  db.exec(`CREATE TABLE IF NOT EXISTS usuario_preferencias (
    usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    preferencias TEXT NOT NULL DEFAULT '{}',
    version INTEGER NOT NULL DEFAULT 1,
    actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  const columnas = db.prepare("PRAGMA table_info(evidencias)").all();
  if (!columnas.some((columna) => columna.name === "tarea_id")) {
    db.exec("ALTER TABLE evidencias ADD COLUMN tarea_id INTEGER REFERENCES tareas(id)");
  }

  // Perfil Maestro (sección 14.D del esquema): el perfil diseñado de cada
  // persona, el genoma de cada escuela con sus versiones y el rastro de flujos.
  const columnasUsuario = db.prepare("PRAGMA table_info(usuarios)").all();
  if (!columnasUsuario.some((columna) => columna.name === "perfil_clave")) {
    db.exec("ALTER TABLE usuarios ADD COLUMN perfil_clave TEXT");
  }
  // Primer ingreso: solo lo tienen pendiente las cuentas que se creen de acá en
  // adelante. Las que ya existían ya entraron alguna vez: nacen en 0.
  if (!columnasUsuario.some((columna) => columna.name === "primer_ingreso")) {
    db.exec("ALTER TABLE usuarios ADD COLUMN primer_ingreso INTEGER NOT NULL DEFAULT 0 CHECK (primer_ingreso IN (0, 1))");
  }
  // Entrar con DNI se probó y se descartó: se sigue entrando con el correo (de
  // él sale el @usuario de Comunidad). Si una base llegó a tener la columna, se
  // saca mientras esté vacía; si algo falla, queda ahí sin molestar a nadie.
  if (columnasUsuario.some((columna) => columna.name === "dni")) {
    try {
      db.exec("DROP INDEX IF EXISTS idx_usuarios_dni");
      if (!db.prepare("SELECT 1 FROM usuarios WHERE dni IS NOT NULL LIMIT 1").get()) {
        db.exec("ALTER TABLE usuarios DROP COLUMN dni");
      }
    } catch (error) {
      console.error("No se pudo sacar la columna usuarios.dni (no afecta el uso)", error);
    }
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS instancia_genomas (
        institucion_id  INTEGER PRIMARY KEY REFERENCES instituciones(id),
        genoma          TEXT NOT NULL,
        version         INTEGER NOT NULL DEFAULT 1,
        actualizado_en  TEXT NOT NULL DEFAULT (datetime('now')),
        actualizado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS genoma_versiones (
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
    CREATE TABLE IF NOT EXISTS flujo_ejecuciones (
        id             INTEGER PRIMARY KEY,
        institucion_id INTEGER NOT NULL REFERENCES instituciones(id),
        flujo_id       TEXT NOT NULL,
        disparador     TEXT NOT NULL,
        acciones       INTEGER NOT NULL DEFAULT 0,
        detalle        TEXT NOT NULL DEFAULT '',
        creado_en      TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS tendencias_nacionales (
        id             INTEGER PRIMARY KEY,
        institucion_id INTEGER NOT NULL REFERENCES instituciones(id),
        objeto_tipo    TEXT NOT NULL CHECK (objeto_tipo IN ('publicacion','debate')),
        objeto_id      INTEGER NOT NULL,
        estado         TEXT NOT NULL DEFAULT 'propuesta'
                           CHECK (estado IN ('propuesta','aprobada','rechazada','retirada')),
        puntaje        REAL NOT NULL DEFAULT 0,
        propuesta_en   TEXT NOT NULL DEFAULT (datetime('now')),
        decidido_por   INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
        decidido_en    TEXT,
        UNIQUE (objeto_tipo, objeto_id)
    );
    CREATE TABLE IF NOT EXISTS plataforma_config (
        clave           TEXT PRIMARY KEY,
        valor           TEXT NOT NULL,
        actualizado_en  TEXT NOT NULL DEFAULT (datetime('now')),
        actualizado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tendencias_nacionales ON tendencias_nacionales(estado, institucion_id);
    DROP VIEW IF EXISTS v_eventos_vigentes;
    CREATE INDEX IF NOT EXISTS idx_genoma_versiones  ON genoma_versiones(institucion_id, version);
    CREATE INDEX IF NOT EXISTS idx_flujo_ejecuciones ON flujo_ejecuciones(institucion_id, flujo_id, creado_en);
  `);

  migrarListasDeCurso(db);

  migrarCalendario(db);
  migrarComunidad(db);
  // Anuncios obligatorios (dirección ↔ preceptoría) y suscripciones Web Push:
  // tablas nuevas, nada que convertir.
  db.exec(TABLAS_ANUNCIOS);
  db.exec(TABLAS_RESPUESTAS_ANUNCIOS);
  db.exec(TABLA_REACCIONES_MENSAJES);
  migrarComunicacion(db);
}

export const TABLA_REACCIONES_MENSAJES = `CREATE TABLE IF NOT EXISTS mensaje_reacciones (
  mensaje_id INTEGER NOT NULL REFERENCES mensajes(id) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  PRIMARY KEY(mensaje_id, usuario_id)
);`;

export const TABLAS_RESPUESTAS_ANUNCIOS = `
CREATE TABLE IF NOT EXISTS anuncio_respuestas (
  id INTEGER PRIMARY KEY,
  anuncio_id INTEGER NOT NULL REFERENCES anuncios(id) ON DELETE CASCADE,
  destinatario_id INTEGER NOT NULL REFERENCES usuarios(id),
  autor_id INTEGER NOT NULL REFERENCES usuarios(id),
  cuerpo TEXT NOT NULL DEFAULT '',
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_anuncio_respuestas_hilo ON anuncio_respuestas(anuncio_id, destinatario_id, id);
CREATE TABLE IF NOT EXISTS anuncio_respuesta_adjuntos (
  respuesta_id INTEGER NOT NULL REFERENCES anuncio_respuestas(id) ON DELETE CASCADE,
  archivo_id INTEGER NOT NULL REFERENCES archivos(id),
  orden INTEGER NOT NULL,
  PRIMARY KEY (respuesta_id, archivo_id)
);`;

// Conserva cuentas, claves, sesiones y relaciones al ampliar el CHECK del rol.
export function migrarComunicacion(db) {
  const tabla = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'usuarios'").get();
  if (!tabla.sql.includes("'secretaria'")) {
    const objetos = db.prepare("SELECT sql FROM sqlite_master WHERE tbl_name = 'usuarios' AND type IN ('index', 'trigger') AND sql IS NOT NULL").all();
    const columnas = db.prepare("PRAGMA table_info(usuarios)").all().map((c) => `"${c.name}"`).join(", ");
    db.exec("PRAGMA foreign_keys = OFF; PRAGMA legacy_alter_table = ON; BEGIN");
    try {
      db.exec(tabla.sql.replace(/CREATE TABLE\s+"?usuarios"?/i, 'CREATE TABLE usuarios_nueva').replace("'preceptor'", "'preceptor','secretaria'"));
      db.exec(`INSERT INTO usuarios_nueva (${columnas}) SELECT ${columnas} FROM usuarios`);
      db.exec("DROP TABLE usuarios; ALTER TABLE usuarios_nueva RENAME TO usuarios");
      for (const objeto of objetos) db.exec(objeto.sql);
      if (db.prepare("PRAGMA foreign_key_check").all().length) throw new Error("La migración de Secretaría dejó relaciones inválidas.");
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    } finally {
      db.exec("PRAGMA legacy_alter_table = OFF; PRAGMA foreign_keys = ON");
    }
  }
  const agregar = (tabla, nombre, definicion) => {
    if (!db.prepare(`PRAGMA table_info(${tabla})`).all().some((c) => c.name === nombre)) {
      db.exec(`ALTER TABLE ${tabla} ADD COLUMN ${nombre} ${definicion}`);
    }
  };
  agregar("mensajes", "prioridad", "TEXT NOT NULL DEFAULT 'estandar' CHECK (prioridad IN ('estandar','urgente'))");
  agregar("mensajes", "respuesta_a", "INTEGER REFERENCES mensajes(id) ON DELETE SET NULL");
  agregar("notificaciones", "prioridad", "TEXT NOT NULL DEFAULT 'estandar' CHECK (prioridad IN ('estandar','urgente'))");
  agregar("notificaciones", "mensaje_id", "INTEGER REFERENCES mensajes(id) ON DELETE CASCADE");
  agregar("notificaciones", "ultimo_push_en", "TEXT");
  db.exec("CREATE INDEX IF NOT EXISTS idx_notificaciones_mensajes_pendientes ON notificaciones(usuario_id, leida_en, prioridad) WHERE mensaje_id IS NOT NULL");
}

/**
 * Turno y especialidad de los cursos: listas de cada escuela (se pueden sumar
 * turnos y especialidades) en vez de una lista fija. Los cursos que ya tenían
 * turno o especialidad como texto ('manana', 'informatica'...) pasan a apuntar a
 * la fila con ese nombre en la lista de su escuela, y las columnas de texto se
 * sacan. Los cursos que ya existían sin dato quedan sin dato.
 */
function migrarListasDeCurso(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS curso_turnos (
        id             INTEGER PRIMARY KEY,
        institucion_id INTEGER NOT NULL REFERENCES instituciones(id),
        nombre         TEXT NOT NULL,
        orden          INTEGER NOT NULL DEFAULT 0,
        UNIQUE (institucion_id, nombre)
    );
    CREATE TABLE IF NOT EXISTS curso_especialidades (
        id             INTEGER PRIMARY KEY,
        institucion_id INTEGER NOT NULL REFERENCES instituciones(id),
        nombre         TEXT NOT NULL,
        orden          INTEGER NOT NULL DEFAULT 0,
        UNIQUE (institucion_id, nombre)
    );
  `);
  const columnas = db.prepare("PRAGMA table_info(cursos)").all().map((c) => c.name);
  if (!columnas.includes("turno_id")) db.exec("ALTER TABLE cursos ADD COLUMN turno_id INTEGER REFERENCES curso_turnos(id)");
  if (!columnas.includes("especialidad_id")) db.exec("ALTER TABLE cursos ADD COLUMN especialidad_id INTEGER REFERENCES curso_especialidades(id)");

  // Las columnas de texto de la primera versión (un solo día de vida).
  const viejas = [
    { columna: "turno", tabla: "curso_turnos", destino: "turno_id", nombres: { manana: "Mañana", tarde: "Tarde" }, iniciales: ["Mañana", "Tarde", "Vespertino"] },
    { columna: "especialidad", tabla: "curso_especialidades", destino: "especialidad_id", nombres: { informatica: "Informática", electromecanica: "Electromecánica", "energias-renovables": "Energías renovables" }, iniciales: ["Informática", "Electromecánica", "Energías renovables"] },
  ];
  for (const v of viejas) {
    if (!columnas.includes(v.columna)) continue;
    const conDato = db.prepare(`SELECT id, institucion_id, ${v.columna} AS valor FROM cursos WHERE ${v.columna} IS NOT NULL`).all();
    for (const c of conDato) {
      const nombre = v.nombres[c.valor];
      if (!nombre) continue;
      // La lista entera de esa escuela (no solo el valor que tenía este curso),
      // con los mismos iniciales que usa servidor/gestion-academica.js.
      v.iniciales.forEach((n, orden) => db.prepare(`INSERT OR IGNORE INTO ${v.tabla} (institucion_id, nombre, orden) VALUES (?, ?, ?)`).run(c.institucion_id, n, orden));
      const fila = db.prepare(`SELECT id FROM ${v.tabla} WHERE institucion_id = ? AND nombre = ?`).get(c.institucion_id, nombre);
      db.prepare(`UPDATE cursos SET ${v.destino} = ? WHERE id = ?`).run(fila.id, c.id);
    }
    try {
      db.exec(`ALTER TABLE cursos DROP COLUMN ${v.columna}`);
    } catch (error) {
      console.error(`No se pudo sacar la columna cursos.${v.columna} (no afecta el uso)`, error);
    }
  }
}

// Anuncios: grupos de difusión, anuncios, a quién le llegaron (lectura,
// reacción e insistencias push) y los navegadores suscriptos a push. Las mismas
// tablas que la sección 14.E de esquema.sql.
const TABLAS_ANUNCIOS = `-- Grupos de difusión. El tipo decide quién habla y quién escucha:
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
`;

// Comunidad estilo X / Reddit y debates por bloques: columnas nuevas, tablas
// nuevas, votos y denuncias que ahora aceptan "aporte", y los debates viejos
// convertidos a un bloque de postura (con las posturas que ya tenían).
const TABLAS_COMUNIDAD = `-- ── Comunidad estilo X / Reddit ─────────────────────────────────────────────
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
CREATE INDEX IF NOT EXISTS idx_respuestas_bloque ON debate_respuestas(bloque_id);`;
const TABLA_VOTOS = `CREATE TABLE votos (
    id          INTEGER PRIMARY KEY,
    usuario_id  INTEGER NOT NULL REFERENCES usuarios(id),
    objeto_tipo TEXT NOT NULL CHECK (objeto_tipo IN ('publicacion','debate','comentario','recurso','aporte')),
    objeto_id   INTEGER NOT NULL,
    valor       INTEGER NOT NULL CHECK (valor IN (1, -1)),
    creado_en   TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (usuario_id, objeto_tipo, objeto_id)
);`;
const TABLA_DENUNCIAS = `CREATE TABLE denuncias (
    id             INTEGER PRIMARY KEY,
    denunciante_id INTEGER NOT NULL REFERENCES usuarios(id),
    objeto_tipo    TEXT NOT NULL CHECK (objeto_tipo IN ('publicacion','debate','comentario','aporte')),
    objeto_id      INTEGER NOT NULL,
    motivo         TEXT NOT NULL,
    creado_en      TEXT NOT NULL DEFAULT (datetime('now')),
    resuelta_en    TEXT,
    resuelta_por   INTEGER REFERENCES usuarios(id),
    resultado      TEXT CHECK (resultado IN ('contenido-eliminado','descartada'))
);`;

function agregarColumnas(db, tabla, columnas) {
  const existentes = new Set(db.prepare(`PRAGMA table_info(${tabla})`).all().map((c) => c.name));
  for (const [nombre, definicion] of columnas) {
    if (!existentes.has(nombre)) db.exec(`ALTER TABLE ${tabla} ADD COLUMN ${nombre} ${definicion}`);
  }
}

/** Rehace una tabla cuyo CHECK cambió, copiando sus filas (una sola vez). */
function rehacerTabla(db, tabla, definicion, columnas) {
  const actual = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?").get(tabla)?.sql ?? "";
  if (actual.includes("'aporte'")) return;
  // Las vistas que leen esta tabla se guardan y se vuelven a crear después:
  // SQLite no deja renombrar una tabla mientras una vista apunta a la vieja.
  const vistas = db.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'view'").all()
    .filter((v) => new RegExp(`\b${tabla}\b`).test(v.sql));
  db.exec("PRAGMA foreign_keys = OFF");
  db.exec("BEGIN");
  try {
    for (const v of vistas) db.exec(`DROP VIEW ${v.name}`);
    db.exec(definicion.replace(`CREATE TABLE ${tabla}`, `CREATE TABLE ${tabla}_nueva`));
    db.exec(`INSERT INTO ${tabla}_nueva (${columnas}) SELECT ${columnas} FROM ${tabla}`);
    db.exec(`DROP TABLE ${tabla}`);
    db.exec(`ALTER TABLE ${tabla}_nueva RENAME TO ${tabla}`);
    for (const v of vistas) db.exec(v.sql);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.exec("PRAGMA foreign_keys = ON");
  }
}

function migrarComunidad(db) {
  // La vista vieja de tendencias quedó obsoleta (ahora es un algoritmo del
  // genoma, ver tendencias.js) y además ataría a la tabla de votos.
  db.exec("DROP VIEW IF EXISTS v_tendencias");
  agregarColumnas(db, "publicaciones", [
    ["cita_id", "INTEGER REFERENCES publicaciones(id)"],
    ["hilo_raiz_id", "INTEGER REFERENCES publicaciones(id)"],
    ["hilo_orden", "INTEGER NOT NULL DEFAULT 0"],
    ["editado_en", "TEXT"],
    ["responden", "TEXT NOT NULL DEFAULT 'todos' CHECK (responden IN ('todos','seguidos','mencionados'))"],
    ["encuesta_cierra_en", "TEXT"],
  ]);
  agregarColumnas(db, "debates", [
    ["fijado_en", "TEXT"],
    ["fijado_por_id", "INTEGER REFERENCES usuarios(id)"],
    ["resultados", "TEXT NOT NULL DEFAULT 'siempre' CHECK (resultados IN ('siempre','al-participar','al-cierre'))"],
    ["anonimo", "INTEGER NOT NULL DEFAULT 0"],
    ["cerrado_en", "TEXT"],
    ["conclusion", "TEXT"],
    ["conclusion_en", "TEXT"],
    ["conclusion_por", "INTEGER REFERENCES usuarios(id)"],
  ]);
  agregarColumnas(db, "comentarios", [
    ["padre_id", "INTEGER REFERENCES comentarios(id)"],
    ["aporte_id", "INTEGER"],
    ["editado_en", "TEXT"],
  ]);
  rehacerTabla(db, "votos", TABLA_VOTOS, "id, usuario_id, objeto_tipo, objeto_id, valor, creado_en");
  rehacerTabla(db, "denuncias", TABLA_DENUNCIAS, "id, denunciante_id, objeto_tipo, objeto_id, motivo, creado_en, resuelta_en, resuelta_por, resultado");
  db.exec(TABLAS_COMUNIDAD);

  // Un debate sin bloques (los de antes) pasa a tener uno de postura, con las
  // posturas que ya había tomado cada participante.
  const sinBloques = db.prepare(
    "SELECT d.id FROM debates d WHERE NOT EXISTS (SELECT 1 FROM debate_bloques b WHERE b.debate_id = d.id)"
  ).all();
  if (sinBloques.length) {
    const bloque = db.prepare("INSERT INTO debate_bloques (debate_id, tipo, orden, titulo, config) VALUES (?, 'postura', 0, '¿Cuál es tu postura?', '{}')");
    const posturas = db.prepare("SELECT usuario_id, postura, unido_en FROM debate_participantes WHERE debate_id = ? AND postura IS NOT NULL");
    const respuesta = db.prepare("INSERT OR IGNORE INTO debate_respuestas (bloque_id, usuario_id, valor, actualizado_en) VALUES (?, ?, ?, ?)");
    db.exec("BEGIN");
    try {
      for (const { id } of sinBloques) {
        const bloqueId = Number(bloque.run(id).lastInsertRowid);
        for (const p of posturas.all(id)) respuesta.run(bloqueId, p.usuario_id, JSON.stringify(p.postura), p.unido_en);
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}

// Calendario con jerarquía (sección 14.12): eventos de varios días, que se
// repiten, con recordatorios, confirmaciones y destinos por nivel, perfil,
// curso o persona. Una base vieja se rehace una sola vez, sin perder eventos.
const TABLA_EVENTOS = `-- Evento del calendario. El tipo (categoría) es texto libre (Error 6.E.4) y la
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
);`;
const TABLAS_CALENDARIO = `-- A quién le aparece cada evento (la jerarquía la valida el servidor al crear):
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
CREATE INDEX IF NOT EXISTS idx_eventos_institucion ON eventos(institucion_id, fecha);`;

function migrarCalendario(db) {
  const columnas = db.prepare("PRAGMA table_info(eventos)").all();
  if (!columnas.some((c) => c.name === "recurrencia")) {
    const habiaVisibilidad = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'evento_visibilidad'").get();
    // Las claves foráneas se apagan para poder reemplazar la tabla (no se
    // puede dentro de una transacción) y se vuelven a prender al final.
    db.exec("PRAGMA foreign_keys = OFF");
    db.exec("BEGIN");
    try {
      db.exec("DROP VIEW IF EXISTS v_eventos_vigentes");
      db.exec(TABLA_EVENTOS.replace("CREATE TABLE eventos", "CREATE TABLE eventos_nueva"));
      db.exec(`INSERT INTO eventos_nueva (id, institucion_id, creador_id, titulo, tipo, descripcion, lugar, fecha, hora_inicio, hora_fin, creado_en)
               SELECT id, institucion_id, creador_id, titulo, tipo, descripcion, lugar, fecha, hora_inicio, hora_fin, creado_en FROM eventos`);
      const capas = habiaVisibilidad ? db.prepare("SELECT evento_id, alcance, curso_id, estudiante_id FROM evento_visibilidad").all() : [];
      if (habiaVisibilidad) db.exec("DROP TABLE evento_visibilidad");
      db.exec("DROP TABLE eventos");
      db.exec("ALTER TABLE eventos_nueva RENAME TO eventos");
      db.exec(TABLAS_CALENDARIO);
      const destino = db.prepare("INSERT INTO evento_destinos (evento_id, tipo, valor, curso_id, rol, usuario_id) VALUES (?, ?, ?, ?, ?, ?)");
      for (const c of capas) {
        if (c.alcance === "todos") destino.run(c.evento_id, "todos", null, null, null, null);
        if (c.alcance === "curso") {
          destino.run(c.evento_id, "curso", null, c.curso_id, "estudiante", null);
          destino.run(c.evento_id, "curso", null, c.curso_id, "familia", null);
        }
        if (c.alcance === "familias-curso") destino.run(c.evento_id, "curso", null, c.curso_id, "familia", null);
        if (c.alcance === "familia-de-estudiante") destino.run(c.evento_id, "familia-de", null, null, null, c.estudiante_id);
        if (c.alcance === "familias-todas") destino.run(c.evento_id, "perfil", "familia", null, null, null);
        if (c.alcance === "docentes") {
          for (const p of ["profesor", "preceptor", "admin-academico"]) destino.run(c.evento_id, "perfil", p, null, null, null);
        }
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    } finally {
      db.exec("PRAGMA foreign_keys = ON");
    }
  }
  db.exec(TABLAS_CALENDARIO);
  db.exec("CREATE INDEX IF NOT EXISTS idx_eventos_fecha ON eventos(fecha)");
}
