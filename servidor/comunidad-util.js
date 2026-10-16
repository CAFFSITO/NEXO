// ============================================================================
// NEXO — Ayudas compartidas de la Comunidad (feed y debates)
// ----------------------------------------------------------------------------
// Lo que el feed y los debates hacen igual: menciones (@usuario) y hashtags
// (#tema), adjuntos (fotos, videos, archivos), reacciones con emoji, de qué
// escuela es cada contenido, quién tiene las capacidades que reparte la
// dirección (subir multimedia, fijar) y los avisos.
// ============================================================================

import { leerGenoma, perfilDeUsuario, resolucionDe } from "./genoma.js";

/** El @usuario de cada persona: la parte local de su correo (julieta@… → @julieta). */
export const handleDe = (email) => String(email ?? "").split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "") || "usuario";

const MENCION = /(^|[^\p{L}\p{N}_@.])@([a-z0-9][a-z0-9._-]{1,39})/giu;
const HASHTAG = /(^|[^\p{L}\p{N}_&#])#([\p{L}\p{N}_]{2,40})/gu;
const sinTildes = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Los @handles de un texto (sin el punto final de una oración). */
export function handlesEn(texto) {
  return [...String(texto ?? "").matchAll(MENCION)].map((m) => m[2].replace(/[._-]+$/, "").toLowerCase());
}

/** Los #temas de un texto, normalizados (sin tildes, en minúscula). */
export function hashtagsEn(texto) {
  return [...new Set([...String(texto ?? "").matchAll(HASHTAG)].map((m) => sinTildes(m[2])))];
}

export const normalizarTag = (t) => sinTildes(String(t ?? "").replace(/^#/, "")).replace(/[^\p{L}\p{N}_]/gu, "").slice(0, 40);

/** Un emoji válido para reaccionar: corto y con al menos un pictograma. */
export const esEmoji = (e) => typeof e === "string" && e.length > 0 && e.length <= 16 && /\p{Extended_Pictographic}/u.test(e) && !/[<>&"'\s]/.test(e);

/** "imagen", "video", "audio" o "archivo", según el tipo. */
export function claseDeArchivo(mime) {
  if (/^image\/(png|jpeg|gif|webp)$/.test(mime)) return "imagen";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "archivo";
}

export const TIPOS_REACCIONABLES = ["publicacion", "comentario", "debate", "aporte"];
export const MAX_ADJUNTOS = 6;
/** Cuánto tiempo se puede editar lo propio. */
export const MINUTOS_EDICION = 30;

export function crearUtilComunidad(db, notificaciones) {
  const personasDe = db.prepare(
    "SELECT id, nombre, email, rol, avatar_url, perfil_clave FROM usuarios WHERE institucion_id = ? AND estado = 'activo'"
  );

  /** La escuela de un contenido vivo (null si no está). */
  function institucionDe(tipo, id) {
    if (tipo === "publicacion") return db.prepare("SELECT institucion_id AS i FROM publicaciones WHERE id = ? AND eliminado_en IS NULL").get(id)?.i ?? null;
    if (tipo === "debate") return db.prepare("SELECT institucion_id AS i FROM debates WHERE id = ? AND eliminado_en IS NULL").get(id)?.i ?? null;
    if (tipo === "aporte") {
      return db.prepare(
        "SELECT d.institucion_id AS i FROM debate_aportes a JOIN debates d ON d.id = a.debate_id WHERE a.id = ? AND a.eliminado_en IS NULL AND d.eliminado_en IS NULL"
      ).get(id)?.i ?? null;
    }
    if (tipo === "comentario") {
      const c = db.prepare("SELECT objeto_tipo AS t, objeto_id AS o FROM comentarios WHERE id = ? AND eliminado_en IS NULL").get(id);
      return c ? institucionDe(c.t, c.o) : null;
    }
    return null;
  }

  /** Las personas de una escuela por @handle (para resolver menciones). */
  function porHandle(institucionId) {
    const mapa = new Map();
    for (const p of personasDe.all(institucionId)) mapa.set(handleDe(p.email), p);
    return mapa;
  }

  /** Quiénes de la escuela aparecen mencionados en un texto. */
  function mencionadosEn(texto, institucionId) {
    const mapa = porHandle(institucionId);
    return [...new Set(handlesEn(texto))].map((h) => mapa.get(h)).filter(Boolean);
  }

  const borrarMenciones = db.prepare("DELETE FROM menciones WHERE objeto_tipo = ? AND objeto_id = ?");
  const insertarMencion = db.prepare("INSERT OR IGNORE INTO menciones (objeto_tipo, objeto_id, usuario_id) VALUES (?, ?, ?)");
  /** Guarda las menciones de un contenido y devuelve las personas NUEVAS (para avisarles). */
  function guardarMenciones(tipo, id, texto, institucionId) {
    const previas = new Set(db.prepare("SELECT usuario_id FROM menciones WHERE objeto_tipo = ? AND objeto_id = ?").all(tipo, id).map((m) => m.usuario_id));
    const personas = mencionadosEn(texto, institucionId);
    borrarMenciones.run(tipo, id);
    for (const p of personas) insertarMencion.run(tipo, id, p.id);
    return personas.filter((p) => !previas.has(p.id));
  }

  /** Adjuntos de varios contenidos de un tipo: Map(id → [archivo]). */
  function adjuntosDe(tipo, ids) {
    const mapa = new Map();
    if (!ids.length) return mapa;
    const filas = db.prepare(
      `SELECT ca.objeto_id, a.id, a.nombre_original, a.tipo_mime, a.tamano_bytes
         FROM contenido_adjuntos ca JOIN archivos a ON a.id = ca.archivo_id
        WHERE ca.objeto_tipo = ? AND ca.objeto_id IN (${ids.map(() => "?").join(",")})
        ORDER BY ca.objeto_id, ca.orden`
    ).all(tipo, ...ids);
    for (const f of filas) {
      if (!mapa.has(f.objeto_id)) mapa.set(f.objeto_id, []);
      mapa.get(f.objeto_id).push({ id: String(f.id), nombre: f.nombre_original, tipo: f.tipo_mime, tamano: f.tamano_bytes, clase: claseDeArchivo(f.tipo_mime) });
    }
    return mapa;
  }

  const archivoPropio = db.prepare("SELECT id, tipo_mime FROM archivos WHERE id = ? AND subido_por = ?");
  const insertarAdjunto = db.prepare("INSERT OR IGNORE INTO contenido_adjuntos (objeto_tipo, objeto_id, archivo_id, orden) VALUES (?, ?, ?, ?)");
  /** Valida una lista de adjuntos (propios, como mucho 6). Devuelve { ids } o { error }. */
  function leerAdjuntos(crudos, usuarioId) {
    if (crudos === undefined || crudos === null) return { ids: [] };
    if (!Array.isArray(crudos)) return { error: "La lista de adjuntos no es válida." };
    const ids = [...new Set(crudos.map(Number))];
    if (ids.length > MAX_ADJUNTOS) return { error: `Se pueden adjuntar hasta ${MAX_ADJUNTOS} archivos.` };
    for (const id of ids) if (!Number.isInteger(id) || !archivoPropio.get(id, usuarioId)) return { error: "Uno de los adjuntos no es tuyo o no existe." };
    return { ids };
  }
  const guardarAdjuntos = (tipo, id, ids) => ids.forEach((archivoId, i) => insertarAdjunto.run(tipo, id, archivoId, i));

  /** Reacciones de varios contenidos de un tipo: Map(id → [{ emoji, cantidad, mia }]). */
  function reaccionesDe(tipo, ids, usuarioId) {
    const mapa = new Map();
    if (!ids.length) return mapa;
    const filas = db.prepare(
      `SELECT objeto_id, emoji, COUNT(*) AS cantidad, MAX(usuario_id = ?) AS mia, MIN(creado_en) AS primera
         FROM reacciones WHERE objeto_tipo = ? AND objeto_id IN (${ids.map(() => "?").join(",")})
        GROUP BY objeto_id, emoji ORDER BY objeto_id, cantidad DESC, primera`
    ).all(usuarioId, tipo, ...ids);
    for (const f of filas) {
      if (!mapa.has(f.objeto_id)) mapa.set(f.objeto_id, []);
      mapa.get(f.objeto_id).push({ emoji: f.emoji, cantidad: f.cantidad, mia: f.mia === 1 });
    }
    return mapa;
  }

  /** Votos de varios contenidos de un tipo: Map(id → { aFavor, enContra, mio }). */
  function votosDe(tipo, ids, usuarioId) {
    const mapa = new Map();
    if (!ids.length) return mapa;
    const filas = db.prepare(
      `SELECT objeto_id, SUM(valor = 1) AS a_favor, SUM(valor = -1) AS en_contra, MAX(CASE WHEN usuario_id = ? THEN valor END) AS mio
         FROM votos WHERE objeto_tipo = ? AND objeto_id IN (${ids.map(() => "?").join(",")}) GROUP BY objeto_id`
    ).all(usuarioId, tipo, ...ids);
    for (const f of filas) mapa.set(f.objeto_id, { aFavor: f.a_favor ?? 0, enContra: f.en_contra ?? 0, mio: f.mio ?? null });
    return mapa;
  }

  /** El perfil del genoma de una persona (con su clave). */
  const perfilDe = (usuario) => perfilDeUsuario(leerGenoma(db, usuario.institucionId), usuario);
  /** ¿Tiene esta capacidad (y su módulo está a la vista)? */
  const tiene = (usuario, capacidad) => resolucionDe(db, usuario).capacidades.has(capacidad);
  const esModerador = (usuario) => usuario.rol === "admin-academico" || usuario.rol === "preceptor";

  /** Avisar a alguien (nunca a uno mismo). */
  function avisar(usuarioId, autor, { tipo, titulo, cuerpo = "", objetoTipo, objetoId }) {
    if (!notificaciones || usuarioId === autor.id) return;
    notificaciones.crear({ usuarioId, tipo, titulo, cuerpo: String(cuerpo).slice(0, 140), objetoTipo, objetoId: Number(objetoId) });
  }

  /** Puede editar lo propio durante los primeros minutos. */
  function editable(creadoEn) {
    const t = Date.parse(String(creadoEn).includes("T") ? creadoEn : String(creadoEn).replace(" ", "T") + "Z");
    return Number.isFinite(t) && Date.now() - t <= MINUTOS_EDICION * 60 * 1000;
  }

  return { institucionDe, porHandle, mencionadosEn, guardarMenciones, adjuntosDe, leerAdjuntos, guardarAdjuntos, reaccionesDe, votosDe, perfilDe, tiene, esModerador, avisar, editable };
}
