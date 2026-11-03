// ============================================================================
// NEXO — Anuncios obligatorios (dirección ↔ preceptoría)
// ----------------------------------------------------------------------------
// El problema que resuelve: en la escuela los avisos entre la dirección y los
// preceptores se pierden. Un anuncio permite responder en un hilo privado y es una
// tarjeta que le aparece encima de todo a cada destinatario, que tiene que leer
// hasta el final y marcar como leída para poder seguir usando NEXO. Además le
// suena el celular o la computadora (push) y, si no la lee, se le insiste.
//
// A quién se manda:
//   · a un GRUPO DE DIFUSIÓN, que arma la dirección (o el Maestro). Tres tipos:
//       uno-a-muchos    → solo el emisor manda; les llega a los receptores
//       muchos-a-uno    → cualquiera de los emisores manda; le llega al receptor
//       muchos-a-muchos → cualquier miembro manda; les llega a los demás
//   · o directo a una o más personas puntuales.
// Participan los perfiles de ROLES_POR_PAGINA.anuncios (hoy preceptores y
// dirección). Sumar a los profesores es agregarlos en permisos.js.
//
// Quien manda ve, aviso por aviso, quién lo leyó, a qué hora y su reacción.
//
// Ventanillas (todas validan permiso por fila: solo lo propio):
//   GET  /api/anuncios/pendientes       → mis avisos sin leer (el más nuevo primero)
//   POST /api/anuncios/:id/leer         → marcar leído
//   PUT  /api/anuncios/:id/reaccion     → reaccionar con un emoji (ya leído)
//   GET  /api/anuncios/leidos           → la casilla de leídos
//   GET  /api/anuncios/enviados         → lo que mandé, con quién lo leyó
//   GET  /api/anuncios/destinos         → a qué grupos y personas puedo mandar
//   POST /api/anuncios                  → mandar un aviso (texto, archivos y notas de voz)
//   DELETE /api/anuncios/:id            → borrar para todos un aviso que mandé
//   GET/POST /api/anuncios/grupos, PUT/DELETE /api/anuncios/grupos/:id
//                                       → la dirección (o el Maestro) arma los grupos
// ============================================================================

import { exigirAcceso, ventanilla } from "./comun.js";
import { usuarioDeLaSesion } from "./sesiones.js";
import { ROLES_POR_PAGINA, puedeVer } from "./permisos.js";
import { leerGenoma } from "./genoma.js";

export const TIPOS_GRUPO = ["uno-a-muchos", "muchos-a-uno", "muchos-a-muchos"];
/** Las reacciones posibles después de marcar leído (la misma fila de la tarjeta). */
export const EMOJIS_ANUNCIO = ["👍", "❤️", "👏", "🙏", "✅", "😮", "😂", "👀"];
/**
 * El color de las tarjetas que no son de un grupo (mensaje directo) cuando la
 * escuela no tiene uno propio. Si lo tiene, es el ACENTO del diseño de la
 * escuela (genoma): los avisos siguen la colorimetría que eligió.
 */
export const COLOR_DIRECTO = "#7c3aed";
const HEX = /^#[0-9a-f]{6}$/i;

const MAX_CUERPO = 5000;
// Archivos por aviso (de cualquier tipo, ya subidos a /api/archivos por quien
// manda) y lo más larga que puede ser una nota de voz.
const MAX_ADJUNTOS = 10;
const MAX_VOZ_MS = 10 * 60 * 1000;
const MAX_MIEMBROS = 300;
const MAX_PERSONAS_DIRECTO = 50;
// Un tope para que un error (o un enojo) no inunde a todos de tarjetas.
const MAX_ENVIOS_POR_VENTANA = 30;
// Insistencia push mientras el aviso siga sin leer: cada 10 minutos, hasta 6
// veces (una hora). De noche (21 a 7, hora del servidor) no se insiste: el
// primer aviso igual suena, y al día siguiente se retoma.
const MINUTOS_ENTRE_INSISTENCIAS = 10;
const MAX_INSISTENCIAS = 6;
const SILENCIO_DESDE = 21;
const SILENCIO_HASTA = 7;

const aISO = (valor) => (valor ? String(valor).replace(" ", "T") + "Z" : null);
const recortar = (texto, largo) => (texto.length > largo ? texto.slice(0, largo - 1).trimEnd() + "…" : texto);

/** Texto del aviso: conserva los saltos de línea y saca el resto de caracteres de control. */
function limpiarCuerpo(valor) {
  return String(valor ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

const limpiarLinea = (valor, largo) => String(valor ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, largo);

/** Lista de ids (números o textos) → enteros únicos, o null si algo no es un id. */
function idsDe(valor) {
  if (valor === undefined || valor === null) return [];
  if (!Array.isArray(valor)) return null;
  const ids = valor.map((v) => Number(v));
  if (ids.some((n) => !Number.isInteger(n) || n <= 0)) return null;
  return [...new Set(ids)];
}

function persona(f, prefijo = "") {
  const id = f[prefijo + "id"];
  if (id === null || id === undefined) return null;
  return { id: String(id), nombre: f[prefijo + "nombre"], rol: f[prefijo + "rol"], avatarUrl: f[prefijo + "avatar"] ?? null };
}

function vistaAdjunto(f) {
  return {
    id: String(f.id),
    nombre: f.nombre_original,
    tipo: f.tipo_mime,
    tamano: f.tamano_bytes,
    voz: f.es_voz === 1,
    duracionMs: f.duracion_ms ?? null,
  };
}

/**
 * Los adjuntos que pidió quien manda: [{ id, voz?, duracionMs? }]. Cada archivo
 * tiene que ser suyo (lo acaba de subir). Devuelve la lista o un texto de error.
 */
function leerAdjuntos(valor, archivoPropio, usuarioId) {
  if (valor === undefined || valor === null) return [];
  if (!Array.isArray(valor) || valor.length > MAX_ADJUNTOS) return `Un aviso puede llevar hasta ${MAX_ADJUNTOS} archivos.`;
  const lista = [];
  for (const a of valor) {
    const id = Number(a?.id);
    const archivo = Number.isInteger(id) && id > 0 ? archivoPropio.get(id, usuarioId) : undefined;
    if (!archivo) return "Uno de los archivos no se subió bien. Sacalo y volvé a adjuntarlo.";
    if (lista.some((x) => x.id === id)) continue;
    const voz = a?.voz === true;
    if (voz && !archivo.tipo_mime.startsWith("audio/")) return "La nota de voz no es un audio.";
    const duracion = Number(a?.duracionMs);
    lista.push({ id, voz, duracionMs: voz && Number.isFinite(duracion) && duracion > 0 ? Math.min(Math.round(duracion), MAX_VOZ_MS) : null });
  }
  return lista;
}

function vistaAnuncio(f, colorDirecto = COLOR_DIRECTO) {
  return {
    id: String(f.id),
    cuerpo: f.cuerpo,
    creadoEn: aISO(f.creado_en),
    autor: persona(f, "autor_"),
    grupo: f.grupo_id ? { id: String(f.grupo_id), nombre: f.grupo_nombre, tipo: f.grupo_tipo, color: f.grupo_color } : null,
    color: f.grupo_id ? f.grupo_color : colorDirecto,
  };
}

const COLUMNAS_ANUNCIO = `a.id, a.cuerpo, a.creado_en, a.grupo_id, a.institucion_id,
       u.id AS autor_id, u.nombre AS autor_nombre, u.rol AS autor_rol, u.avatar_url AS autor_avatar,
       g.nombre AS grupo_nombre, g.tipo AS grupo_tipo, g.color AS grupo_color`;
const UNION_ANUNCIO = `LEFT JOIN usuarios u ON u.id = a.autor_id
  LEFT JOIN anuncio_grupos g ON g.id = a.grupo_id`;

/**
 * ¿Puede esta persona mandar a este grupo, según su papel? Y si puede, ¿a
 * quiénes les llega? La regla de los tres tipos vive solo acá.
 */
export function destinatariosSegunTipo(tipo, miembros, autorId) {
  const papel = miembros.find((m) => m.usuarioId === autorId)?.papel;
  if (tipo === "uno-a-muchos" || tipo === "muchos-a-uno") {
    if (papel !== "emisor") return null;
    return miembros.filter((m) => m.papel === "receptor").map((m) => m.usuarioId);
  }
  if (tipo === "muchos-a-muchos") {
    if (papel !== "miembro") return null;
    return miembros.filter((m) => m.usuarioId !== autorId).map((m) => m.usuarioId);
  }
  return null;
}

/**
 * Valida la composición de un grupo según su tipo. Devuelve los miembros con su
 * papel o un texto de error. `elegibles` = ids que pueden participar.
 */
export function armarMiembros(tipo, { emisores, receptores, miembros }, elegibles) {
  if (!TIPOS_GRUPO.includes(tipo)) return "Elegí un tipo de grupo válido.";
  if (emisores === null || receptores === null || miembros === null) return "La lista de personas no es válida.";
  let lista;
  if (tipo === "muchos-a-muchos") {
    if (miembros.length < 2) return "Un grupo de todos con todos necesita al menos dos personas.";
    lista = miembros.map((id) => ({ usuarioId: id, papel: "miembro" }));
  } else {
    if (tipo === "uno-a-muchos" && emisores.length !== 1) return "Un grupo de uno a muchos tiene exactamente una persona que envía.";
    if (tipo === "muchos-a-uno" && receptores.length !== 1) return "Un grupo de muchos a uno tiene exactamente una persona que recibe.";
    if (!emisores.length) return "Elegí quién envía.";
    if (!receptores.length) return "Elegí quién recibe.";
    if (emisores.some((id) => receptores.includes(id))) return "Una misma persona no puede enviar y recibir en este tipo de grupo.";
    lista = [
      ...emisores.map((id) => ({ usuarioId: id, papel: "emisor" })),
      ...receptores.map((id) => ({ usuarioId: id, papel: "receptor" })),
    ];
  }
  if (lista.length > MAX_MIEMBROS) return `Un grupo puede tener hasta ${MAX_MIEMBROS} personas.`;
  if (lista.some((m) => !elegibles.has(m.usuarioId))) return "Hay personas que no pueden estar en este grupo (solo secretaría, preceptores y directivos de la escuela).";
  return lista;
}

/** "🎤 Mensaje de voz" / "📎 2 archivos": lo que dice el push si el aviso no trae texto. */
function resumenAdjuntos(adjuntos) {
  if (adjuntos.some((a) => a.voz)) return "🎤 Mensaje de voz";
  return adjuntos.length === 1 ? `📎 ${adjuntos[0].nombre}` : `📎 ${adjuntos.length} archivos`;
}

function enHorarioDeSilencio(fecha = new Date()) {
  const hora = fecha.getHours();
  return SILENCIO_DESDE > SILENCIO_HASTA
    ? hora >= SILENCIO_DESDE || hora < SILENCIO_HASTA
    : hora >= SILENCIO_DESDE && hora < SILENCIO_HASTA;
}

export function registrarAnuncios(app, db, mensajero, push) {
  const roles = ROLES_POR_PAGINA.anuncios;
  const marcasRoles = roles.map(() => "?").join(", ");

  // ── Consultas ───────────────────────────────────────────────────────────────
  const institucion = db.prepare("SELECT id FROM instituciones WHERE id = ?");
  const elegibles = db.prepare(
    `SELECT id, nombre, rol, avatar_url AS avatar FROM usuarios
      WHERE institucion_id = ? AND estado = 'activo' AND rol IN (${marcasRoles})
      ORDER BY CASE rol WHEN 'admin-academico' THEN 0 ELSE 1 END, nombre`
  );
  const pendientes = db.prepare(
    `SELECT ${COLUMNAS_ANUNCIO}, d.reaccion
       FROM anuncio_destinatarios d
       JOIN anuncios a ON a.id = d.anuncio_id
       ${UNION_ANUNCIO}
      WHERE d.usuario_id = ? AND d.leido_en IS NULL
      ORDER BY a.id DESC
      LIMIT 200`
  );
  const cuantosPendientes = db.prepare(
    "SELECT COUNT(*) AS n FROM anuncio_destinatarios WHERE usuario_id = ? AND leido_en IS NULL"
  );
  const leidos = db.prepare(
    `SELECT ${COLUMNAS_ANUNCIO}, d.leido_en, d.reaccion
       FROM anuncio_destinatarios d
       JOIN anuncios a ON a.id = d.anuncio_id
       ${UNION_ANUNCIO}
      WHERE d.usuario_id = ? AND d.leido_en IS NOT NULL
        AND (? IS NULL OR a.id < ?)
        AND (? = '' OR a.cuerpo LIKE ? ESCAPE '\\' OR u.nombre LIKE ? ESCAPE '\\' OR g.nombre LIKE ? ESCAPE '\\')
      ORDER BY a.id DESC
      LIMIT ?`
  );
  const enviados = db.prepare(
    `SELECT ${COLUMNAS_ANUNCIO}
       FROM anuncios a
       ${UNION_ANUNCIO}
      WHERE a.autor_id = ? AND (? IS NULL OR a.id < ?)
      ORDER BY a.id DESC
      LIMIT ?`
  );
  const destinatariosDe = db.prepare(
    `SELECT d.leido_en, d.reaccion, u.id, u.nombre, u.rol, u.avatar_url AS avatar,
            (SELECT COUNT(*) FROM anuncio_respuestas r WHERE r.anuncio_id = d.anuncio_id AND r.destinatario_id = d.usuario_id) AS respuestas
       FROM anuncio_destinatarios d
       JOIN usuarios u ON u.id = d.usuario_id
      WHERE d.anuncio_id = ?
      ORDER BY d.leido_en IS NULL, d.leido_en, u.nombre`
  );
  const miDestino = db.prepare(
    `SELECT d.leido_en, d.reaccion, a.autor_id
       FROM anuncio_destinatarios d JOIN anuncios a ON a.id = d.anuncio_id
      WHERE d.anuncio_id = ? AND d.usuario_id = ?`
  );
  const marcarLeido = db.prepare(
    "UPDATE anuncio_destinatarios SET leido_en = datetime('now') WHERE anuncio_id = ? AND usuario_id = ? AND leido_en IS NULL"
  );
  const reaccionar = db.prepare(
    "UPDATE anuncio_destinatarios SET reaccion = ?, reaccion_en = datetime('now'), leido_en = CASE WHEN ? IS NOT NULL THEN COALESCE(leido_en, datetime('now')) ELSE leido_en END WHERE anuncio_id = ? AND usuario_id = ?"
  );

  const grupo = db.prepare("SELECT * FROM anuncio_grupos WHERE id = ? AND archivado_en IS NULL");
  const gruposDeInstitucion = db.prepare(
    `SELECT g.*, c.nombre AS creador_nombre,
            (SELECT COUNT(*) FROM anuncios a WHERE a.grupo_id = g.id) AS enviados
       FROM anuncio_grupos g LEFT JOIN usuarios c ON c.id = g.creado_por
      WHERE g.institucion_id = ? AND g.archivado_en IS NULL
      ORDER BY g.creado_en, g.id`
  );
  // lower() de SQLite solo entiende letras sin tilde: el nombre se compara acá.
  const nombresActivos = db.prepare(
    "SELECT id, nombre FROM anuncio_grupos WHERE institucion_id = ? AND archivado_en IS NULL"
  );
  const comparable = (texto) => texto.toLocaleLowerCase("es").replace(/\s+/g, " ");
  const nombreRepetido = (institucionId, nombre, grupoId) =>
    nombresActivos.all(institucionId).some((g) => g.id !== grupoId && comparable(g.nombre) === comparable(nombre));
  // Solo cuentan los miembros que siguen activos y pueden participar: si alguien
  // pasó a la papelera o cambió de rol, deja de recibir sin tocar el grupo.
  const miembrosDe = db.prepare(
    `SELECT m.usuario_id, m.papel, u.nombre, u.rol, u.avatar_url AS avatar
       FROM anuncio_grupo_miembros m JOIN usuarios u ON u.id = m.usuario_id
      WHERE m.grupo_id = ? AND u.estado = 'activo' AND rol IN (${marcasRoles})
      ORDER BY u.nombre`
  );
  const misGrupos = db.prepare(
    `SELECT g.* FROM anuncio_grupo_miembros m JOIN anuncio_grupos g ON g.id = m.grupo_id
      WHERE m.usuario_id = ? AND g.institucion_id = ? AND g.archivado_en IS NULL
      ORDER BY g.nombre`
  );
  const insertarGrupo = db.prepare(
    `INSERT INTO anuncio_grupos (institucion_id, nombre, descripcion, tipo, color, creado_por)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const actualizarGrupo = db.prepare(
    `UPDATE anuncio_grupos SET nombre = ?, descripcion = ?, tipo = ?, color = ?, actualizado_en = datetime('now')
      WHERE id = ?`
  );
  const archivarGrupo = db.prepare("UPDATE anuncio_grupos SET archivado_en = datetime('now') WHERE id = ?");
  const vaciarMiembros = db.prepare("DELETE FROM anuncio_grupo_miembros WHERE grupo_id = ?");
  const insertarMiembro = db.prepare("INSERT INTO anuncio_grupo_miembros (grupo_id, usuario_id, papel) VALUES (?, ?, ?)");

  const insertarAnuncio = db.prepare(
    "INSERT INTO anuncios (institucion_id, autor_id, grupo_id, cuerpo) VALUES (?, ?, ?, ?)"
  );
  const insertarDestino = db.prepare(
    "INSERT INTO anuncio_destinatarios (anuncio_id, usuario_id) VALUES (?, ?)"
  );
  const unAnuncio = db.prepare(`SELECT ${COLUMNAS_ANUNCIO} FROM anuncios a ${UNION_ANUNCIO} WHERE a.id = ?`);
  const adjuntosDe = db.prepare(
    `SELECT ar.id, ar.nombre_original, ar.tipo_mime, ar.tamano_bytes, aa.es_voz, aa.duracion_ms
       FROM anuncio_adjuntos aa JOIN archivos ar ON ar.id = aa.archivo_id
      WHERE aa.anuncio_id = ?
      ORDER BY aa.orden`
  );
  const archivoPropio = db.prepare("SELECT id, tipo_mime FROM archivos WHERE id = ? AND subido_por = ?");
  const insertarAdjunto = db.prepare(
    "INSERT INTO anuncio_adjuntos (anuncio_id, archivo_id, orden, es_voz, duracion_ms) VALUES (?, ?, ?, ?, ?)"
  );
  /** Los colores del diseño de la escuela (sin repetir), el acento primero. */
  const paletaDe = (institucionId) => {
    const t = leerGenoma(db, institucionId).tema ?? {};
    return [...new Set([t.acento, t.primario, t.secundario, t.terciario].filter((c) => HEX.test(String(c ?? ""))).map((c) => c.toLowerCase()))];
  };
  const colorDirectoDe = (institucionId) => paletaDe(institucionId)[0] ?? COLOR_DIRECTO;
  /** El aviso con sus archivos: así lo reciben todas las pantallas. */
  const vista = (f) => ({ ...vistaAnuncio(f, colorDirectoDe(f.institucion_id)), adjuntos: adjuntosDe.all(f.id).map(vistaAdjunto) });
  // Borrar para todos: solo quien lo mandó. Se borra a mano lo que cuelga del
  // aviso (no depende de que las claves foráneas estén prendidas).
  const anuncioMio = db.prepare("SELECT id FROM anuncios WHERE id = ? AND autor_id = ?");
  const quienesLoRecibieron = db.prepare("SELECT usuario_id FROM anuncio_destinatarios WHERE anuncio_id = ?");
  const borrarDestinos = db.prepare("DELETE FROM anuncio_destinatarios WHERE anuncio_id = ?");
  const borrarAdjuntos = db.prepare("DELETE FROM anuncio_adjuntos WHERE anuncio_id = ?");
  const borrarAnuncio = db.prepare("DELETE FROM anuncios WHERE id = ?");
  const enviosRecientes = db.prepare(
    "SELECT COUNT(*) AS n FROM anuncios WHERE autor_id = ? AND creado_en > datetime('now', '-10 minutes')"
  );
  const anotarPush = db.prepare(
    "UPDATE anuncio_destinatarios SET ultimo_push_en = datetime('now') WHERE anuncio_id = ? AND usuario_id = ?"
  );

  const idsElegibles = (institucionId) => new Set(elegibles.all(institucionId, ...roles).map((f) => f.id));
  const cursosACargo = db.prepare(
    `SELECT c.preceptor_id, c.anio, c.division, t.nombre AS turno, e.nombre AS especialidad
       FROM cursos c
       LEFT JOIN curso_turnos t ON t.id = c.turno_id
       LEFT JOIN curso_especialidades e ON e.id = c.especialidad_id
      WHERE c.institucion_id = ? AND c.preceptor_id IS NOT NULL
      ORDER BY c.anio, c.division`
  );
  /**
   * Quienes pueden participar, y a cada preceptor sus cursos a cargo con su turno
   * y especialidad: así, al armar un grupo, se sabe de qué turno es cada uno.
   */
  const personasElegibles = (institucionId) => {
    const porPreceptor = new Map();
    for (const c of cursosACargo.all(institucionId)) {
      const lista = porPreceptor.get(c.preceptor_id) ?? [];
      lista.push({ nombre: `${c.anio}° ${c.division}`, anio: c.anio, turno: c.turno ?? null, especialidad: c.especialidad ?? null });
      porPreceptor.set(c.preceptor_id, lista);
    }
    return elegibles.all(institucionId, ...roles).map((f) => {
      const p = persona(f);
      const cursos = porPreceptor.get(f.id);
      return cursos ? { ...p, cursos } : p;
    });
  };
  const miembrosVivos = (grupoId) =>
    miembrosDe.all(grupoId, ...roles).map((m) => ({ usuarioId: m.usuario_id, papel: m.papel, persona: persona({ ...m, id: m.usuario_id }) }));

  function vistaEnviado(fila) {
    const destinatarios = destinatariosDe.all(fila.id).map((d) => ({
      persona: persona(d),
      leidoEn: aISO(d.leido_en),
      reaccion: d.reaccion,
      respuestas: d.respuestas,
    }));
    return {
      ...vista(fila),
      destinatarios,
      leidos: destinatarios.filter((d) => d.leidoEn).length,
      total: destinatarios.length,
    };
  }

  function vistaGrupo(g) {
    const miembros = miembrosVivos(g.id);
    const conPapel = (papel) => miembros.filter((m) => m.papel === papel).map((m) => m.persona);
    return {
      id: String(g.id),
      nombre: g.nombre,
      descripcion: g.descripcion,
      tipo: g.tipo,
      color: g.color,
      creadoEn: aISO(g.creado_en),
      creadoPor: g.creador_nombre ?? null,
      enviados: g.enviados ?? 0,
      emisores: conPapel("emisor"),
      receptores: conPapel("receptor"),
      miembros: conPapel("miembro"),
    };
  }

  /** El aviso push de un anuncio recién llegado (o de la insistencia). */
  function datosPush(usuarioId, anuncio, insistencia = false) {
    const total = cuantosPendientes.get(usuarioId).n;
    const quien = anuncio.autor?.nombre ?? "NEXO";
    const donde = anuncio.grupo?.nombre ?? "Mensaje directo";
    const texto = anuncio.cuerpo || resumenAdjuntos(anuncio.adjuntos ?? []);
    return {
      tipo: "anuncio",
      titulo: insistencia
        ? `⏰ ${total === 1 ? "Tenés un aviso sin leer" : `Tenés ${total} avisos sin leer`}`
        : `📣 ${quien} · ${donde}`,
      cuerpo: insistencia ? `${quien}: ${recortar(texto.replace(/\s+/g, " "), 140)}` : recortar(texto, 220),
      pendientes: total,
      url: "/anuncios",
      tag: "nexo-anuncios",
    };
  }

  // ── Recibir ─────────────────────────────────────────────────────────────────
  app.get(
    "/api/anuncios/pendientes",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "anuncios");
      if (!usuario) return;
      res.json({
        anuncios: pendientes.all(usuario.id).map((f) => ({ ...vista(f), reaccion: f.reaccion })),
        total: cuantosPendientes.get(usuario.id).n,
        emojis: EMOJIS_ANUNCIO,
      });
    })
  );

  app.post(
    "/api/anuncios/:id/leer",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "anuncios");
      if (!usuario) return;
      const id = Number(req.params.id);
      const destino = Number.isInteger(id) ? miDestino.get(id, usuario.id) : undefined;
      if (!destino) return res.status(404).json({ error: "Ese aviso no existe." });
      if (marcarLeido.run(id, usuario.id).changes > 0) {
        if (destino.autor_id) mensajero.emitirA(destino.autor_id, { tipo: "anuncio-lectura", anuncioId: String(id) });
        // Sus otros navegadores (el celular, otra pestaña) sacan la tarjeta.
        mensajero.emitirA(usuario.id, { tipo: "anuncio-leido", anuncioId: String(id) });
      }
      const actual = miDestino.get(id, usuario.id);
      res.json({ leidoEn: aISO(actual.leido_en), pendientes: cuantosPendientes.get(usuario.id).n });
    })
  );

  app.put(
    "/api/anuncios/:id/reaccion",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "anuncios");
      if (!usuario) return;
      const id = Number(req.params.id);
      const destino = Number.isInteger(id) ? miDestino.get(id, usuario.id) : undefined;
      if (!destino) return res.status(404).json({ error: "Ese aviso no existe." });
      const emoji = req.body?.emoji ?? null;
      if (emoji !== null && !EMOJIS_ANUNCIO.includes(emoji)) {
        return res.status(400).json({ error: "Esa reacción no está disponible." });
      }
      reaccionar.run(emoji, emoji, id, usuario.id);
      if (emoji !== null && !destino.leido_en) mensajero.emitirA(usuario.id, { tipo: "anuncio-leido", anuncioId: String(id) });
      if (destino.autor_id) mensajero.emitirA(destino.autor_id, { tipo: "anuncio-lectura", anuncioId: String(id) });
      res.json({ reaccion: emoji });
    })
  );

  app.get(
    "/api/anuncios/leidos",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "anuncios");
      if (!usuario) return;
      const antes = Number.isInteger(Number(req.query.antes)) && req.query.antes ? Number(req.query.antes) : null;
      const q = limpiarLinea(req.query.q, 80);
      const patron = "%" + q.replace(/[\\%_]/g, (c) => "\\" + c) + "%";
      const POR_PAGINA = 30;
      const filas = leidos.all(usuario.id, antes, antes, q, patron, patron, patron, POR_PAGINA + 1);
      res.json({
        anuncios: filas.slice(0, POR_PAGINA).map((f) => ({ ...vista(f), leidoEn: aISO(f.leido_en), reaccion: f.reaccion })),
        hayMas: filas.length > POR_PAGINA,
        emojis: EMOJIS_ANUNCIO,
      });
    })
  );

  app.get(
    "/api/anuncios/enviados",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "anuncios");
      if (!usuario) return;
      const antes = Number.isInteger(Number(req.query.antes)) && req.query.antes ? Number(req.query.antes) : null;
      const POR_PAGINA = 20;
      const filas = enviados.all(usuario.id, antes, antes, POR_PAGINA + 1);
      res.json({ anuncios: filas.slice(0, POR_PAGINA).map(vistaEnviado), hayMas: filas.length > POR_PAGINA });
    })
  );

  // ── Mandar ──────────────────────────────────────────────────────────────────
  app.get(
    "/api/anuncios/destinos",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "anuncios");
      if (!usuario) return;
      const grupos = [];
      for (const g of misGrupos.all(usuario.id, usuario.institucionId)) {
        const miembros = miembrosVivos(g.id);
        const llegan = destinatariosSegunTipo(g.tipo, miembros, usuario.id);
        if (!llegan) continue; // en este grupo solo recibe
        grupos.push({
          id: String(g.id),
          nombre: g.nombre,
          descripcion: g.descripcion,
          tipo: g.tipo,
          color: g.color,
          destinatarios: miembros.filter((m) => llegan.includes(m.usuarioId)).map((m) => m.persona),
        });
      }
      res.json({
        grupos,
        personas: personasElegibles(usuario.institucionId).filter((p) => p.id !== String(usuario.id)),
        colorDirecto: colorDirectoDe(usuario.institucionId),
        maxCuerpo: MAX_CUERPO,
        maxAdjuntos: MAX_ADJUNTOS,
        maxPersonas: MAX_PERSONAS_DIRECTO,
      });
    })
  );

  app.post(
    "/api/anuncios",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "anuncios");
      if (!usuario) return;

      const cuerpo = limpiarCuerpo(req.body?.cuerpo);
      const adjuntos = leerAdjuntos(req.body?.adjuntos, archivoPropio, usuario.id);
      if (typeof adjuntos === "string") return res.status(400).json({ error: adjuntos });
      if (!cuerpo && !adjuntos.length) return res.status(400).json({ error: "Escribí el aviso, grabá un audio o adjuntá un archivo antes de enviarlo." });
      if (cuerpo.length > MAX_CUERPO) return res.status(400).json({ error: `El aviso puede tener hasta ${MAX_CUERPO} caracteres.` });
      if (enviosRecientes.get(usuario.id).n >= MAX_ENVIOS_POR_VENTANA) {
        return res.status(429).json({ error: "Mandaste muchos avisos seguidos. Esperá unos minutos." });
      }

      let grupoId = null;
      let llegan;
      const pedidoGrupo = req.body?.grupoId;
      if (pedidoGrupo !== undefined && pedidoGrupo !== null && pedidoGrupo !== "") {
        const g = grupo.get(Number(pedidoGrupo));
        if (!g || g.institucion_id !== usuario.institucionId) return res.status(404).json({ error: "Ese grupo no existe." });
        llegan = destinatariosSegunTipo(g.tipo, miembrosVivos(g.id), usuario.id);
        if (!llegan) return res.status(403).json({ error: "En este grupo no podés enviar avisos: solo los recibís." });
        grupoId = g.id;
      } else {
        const personas = idsDe(req.body?.personas);
        if (!personas || !personas.length) return res.status(400).json({ error: "Elegí un grupo o al menos una persona." });
        if (personas.length > MAX_PERSONAS_DIRECTO) {
          return res.status(400).json({ error: `Un aviso directo llega a hasta ${MAX_PERSONAS_DIRECTO} personas. Para más, usá un grupo.` });
        }
        const validos = idsElegibles(usuario.institucionId);
        if (personas.some((id) => id === usuario.id || !validos.has(id))) {
          return res.status(400).json({ error: "Solo podés mandar avisos a secretaría, preceptores y directivos de tu escuela." });
        }
        llegan = personas;
      }
      if (!llegan.length) return res.status(400).json({ error: "Este grupo todavía no tiene a quién llegarle." });

      let anuncioId;
      db.exec("BEGIN");
      try {
        anuncioId = Number(insertarAnuncio.run(usuario.institucionId, usuario.id, grupoId, cuerpo).lastInsertRowid);
        for (const destino of llegan) insertarDestino.run(anuncioId, destino);
        adjuntos.forEach((a, orden) => insertarAdjunto.run(anuncioId, a.id, orden, a.voz ? 1 : 0, a.duracionMs));
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }

      const anuncio = vista(unAnuncio.get(anuncioId));
      for (const destino of llegan) {
        mensajero.emitirA(destino, { tipo: "anuncio", anuncioId: String(anuncioId) });
        if (push.tieneSuscripcion(destino)) {
          anotarPush.run(anuncioId, destino);
          void push.enviarAUsuario(destino, datosPush(destino, anuncio));
        }
      }
      res.status(201).json({ anuncio: vistaEnviado(unAnuncio.get(anuncioId)) });
    })
  );

  app.delete(
    "/api/anuncios/:id",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "anuncios");
      if (!usuario) return;
      const id = Number(req.params.id);
      // Uno ajeno, para quien pide, no existe (no se le dice que es de otro).
      if (!Number.isInteger(id) || !anuncioMio.get(id, usuario.id)) return res.status(404).json({ error: "Ese aviso no existe." });
      const llegaron = quienesLoRecibieron.all(id).map((f) => f.usuario_id);
      db.exec("BEGIN");
      try {
        borrarDestinos.run(id);
        borrarAdjuntos.run(id);
        borrarAnuncio.run(id);
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
      // Desaparece en vivo: de la tarjeta que tenga encima quien no lo leyó, de
      // la casilla de quien ya lo leyó y de los otros navegadores de quien lo
      // mandó. Sus archivos dejan de poder bajarse (la regla 8 ya no los ve).
      const evento = { tipo: "anuncio-borrado", anuncioId: String(id) };
      for (const destino of llegaron) mensajero.emitirA(destino, evento);
      mensajero.emitirA(usuario.id, evento);
      res.json({ ok: true, mensaje: "Listo, el aviso se borró para todos." });
    })
  );

  // ── Grupos de difusión (la dirección o el Maestro) ──────────────────────────
  /**
   * Quién arma grupos y de qué escuela: la dirección, de la suya; el Maestro, de
   * la que elija (no pertenece a ninguna). Contesta el error si no corresponde.
   */
  function gestor(req, res, institucionPedida) {
    const usuario = usuarioDeLaSesion(db, req);
    if (!usuario) {
      res.status(401).json({ error: "No hay sesión abierta." });
      return null;
    }
    if (puedeVer(usuario.rol, "anuncios-maestro")) {
      const id = Number(institucionPedida);
      if (!Number.isInteger(id) || !institucion.get(id)) {
        res.status(400).json({ error: "Elegí una institución." });
        return null;
      }
      return { usuario, institucionId: id };
    }
    const direccion = exigirAcceso(db, req, res, "anuncios-grupos");
    return direccion ? { usuario: direccion, institucionId: direccion.institucionId } : null;
  }

  /** Lee y valida el cuerpo de un grupo. Devuelve los datos o un texto de error. */
  function leerGrupo(cuerpo, institucionId, grupoId = 0) {
    const nombre = limpiarLinea(cuerpo?.nombre, 60);
    if (!nombre) return "Poné un nombre al grupo.";
    if (nombreRepetido(institucionId, nombre, grupoId)) return "Ya hay un grupo con ese nombre.";
    const color = String(cuerpo?.color ?? "").toLowerCase();
    if (!/^#[0-9a-f]{6}$/.test(color)) return "Elegí un color para el grupo.";
    const tipo = String(cuerpo?.tipo ?? "");
    const miembros = armarMiembros(tipo, {
      emisores: idsDe(cuerpo?.emisores),
      receptores: idsDe(cuerpo?.receptores),
      miembros: idsDe(cuerpo?.miembros),
    }, idsElegibles(institucionId));
    if (typeof miembros === "string") return miembros;
    return { nombre, descripcion: limpiarLinea(cuerpo?.descripcion, 200), tipo, color, miembros };
  }

  function guardarMiembros(grupoId, miembros) {
    vaciarMiembros.run(grupoId);
    for (const m of miembros) insertarMiembro.run(grupoId, m.usuarioId, m.papel);
  }

  app.get(
    "/api/anuncios/grupos",
    ventanilla((req, res) => {
      const g = gestor(req, res, req.query.institucion);
      if (!g) return;
      res.json({
        grupos: gruposDeInstitucion.all(g.institucionId).map(vistaGrupo),
        personas: personasElegibles(g.institucionId),
        colorDirecto: colorDirectoDe(g.institucionId),
        // Los colores del diseño de ESA escuela (también cuando arma el Maestro).
        paleta: paletaDe(g.institucionId),
      });
    })
  );

  app.post(
    "/api/anuncios/grupos",
    ventanilla((req, res) => {
      const g = gestor(req, res, req.body?.institucionId);
      if (!g) return;
      const datos = leerGrupo(req.body, g.institucionId);
      if (typeof datos === "string") return res.status(400).json({ error: datos });
      let id;
      db.exec("BEGIN");
      try {
        id = Number(insertarGrupo.run(g.institucionId, datos.nombre, datos.descripcion, datos.tipo, datos.color, g.usuario.id).lastInsertRowid);
        guardarMiembros(id, datos.miembros);
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
      const fila = gruposDeInstitucion.all(g.institucionId).find((x) => x.id === id);
      res.status(201).json({ grupo: vistaGrupo(fila) });
    })
  );

  /** El grupo pedido, si existe y quien pide lo puede administrar. */
  function grupoAdministrable(req, res) {
    const fila = grupo.get(Number(req.params.id));
    const usuario = usuarioDeLaSesion(db, req);
    if (!fila && usuario && puedeVer(usuario.rol, "anuncios-maestro")) {
      res.status(404).json({ error: "Ese grupo no existe." });
      return null;
    }
    // Al Maestro se le toma la escuela del grupo; a la dirección se le exige que
    // sea la suya (un grupo de otra escuela, para ella, no existe).
    const g = gestor(req, res, fila?.institucion_id);
    if (!g) return null;
    if (!fila || fila.institucion_id !== g.institucionId) {
      res.status(404).json({ error: "Ese grupo no existe." });
      return null;
    }
    return { g, fila };
  }

  app.put(
    "/api/anuncios/grupos/:id",
    ventanilla((req, res) => {
      const encontrado = grupoAdministrable(req, res);
      if (!encontrado) return;
      const { g, fila } = encontrado;
      const datos = leerGrupo(req.body, g.institucionId, fila.id);
      if (typeof datos === "string") return res.status(400).json({ error: datos });
      db.exec("BEGIN");
      try {
        actualizarGrupo.run(datos.nombre, datos.descripcion, datos.tipo, datos.color, fila.id);
        guardarMiembros(fila.id, datos.miembros);
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
      const actualizada = gruposDeInstitucion.all(g.institucionId).find((x) => x.id === fila.id);
      res.json({ grupo: vistaGrupo(actualizada) });
    })
  );

  app.delete(
    "/api/anuncios/grupos/:id",
    ventanilla((req, res) => {
      const encontrado = grupoAdministrable(req, res);
      if (!encontrado) return;
      // Se archiva: deja de aparecer para mandar, pero los avisos que ya se
      // mandaron conservan su nombre y su color.
      archivarGrupo.run(encontrado.fila.id);
      res.json({ ok: true });
    })
  );

  // ── Insistencia push ────────────────────────────────────────────────────────
  const paraInsistir = db.prepare(
    `SELECT d.usuario_id, MAX(d.anuncio_id) AS ultimo
       FROM anuncio_destinatarios d
      WHERE d.leido_en IS NULL AND d.insistencias < ?
        AND (d.ultimo_push_en IS NULL OR d.ultimo_push_en <= datetime('now', ?))
        AND EXISTS (SELECT 1 FROM push_suscripciones s WHERE s.usuario_id = d.usuario_id)
      GROUP BY d.usuario_id`
  );
  const anotarInsistencia = db.prepare(
    `UPDATE anuncio_destinatarios
        SET insistencias = insistencias + (ultimo_push_en IS NOT NULL), ultimo_push_en = datetime('now')
      WHERE usuario_id = ? AND leido_en IS NULL AND insistencias < ?
        AND (ultimo_push_en IS NULL OR ultimo_push_en <= datetime('now', ?))`
  );

  /** Una pasada: a cada persona con avisos sin leer, un push que lo recuerda. */
  function insistir(ahora = new Date()) {
    if (enHorarioDeSilencio(ahora)) return 0;
    const ventana = `-${MINUTOS_ENTRE_INSISTENCIAS} minutes`;
    let avisados = 0;
    for (const fila of paraInsistir.all(MAX_INSISTENCIAS, ventana)) {
      anotarInsistencia.run(fila.usuario_id, MAX_INSISTENCIAS, ventana);
      const anuncio = vista(unAnuncio.get(fila.ultimo));
      void push.enviarAUsuario(fila.usuario_id, datosPush(fila.usuario_id, anuncio, true));
      avisados++;
    }
    return avisados;
  }

  return {
    insistir,
    programar() {
      const reloj = setInterval(() => {
        try {
          insistir();
        } catch (error) {
          console.error("No se pudo insistir con los avisos pendientes", error);
        }
      }, 60_000);
      reloj.unref();
    },
  };
}
