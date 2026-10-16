// ============================================================================
// NEXO — Debates con bloques combinables
// ----------------------------------------------------------------------------
// Un debate ya no es solo "a favor o en contra": quien lo crea lo arma con
// BLOQUES de interacción y los combina como quiera:
//
//   postura     → a favor / en contra (y, si se quiere, indeciso)
//   opciones    → una encuesta de una o varias opciones
//   escala      → "¿cuánto estás de acuerdo?" del 1 al 5 (o al 10)
//   ranking     → ordenar opciones por preferencia (conteo Borda)
//   argumentos  → argumentos a favor y en contra, que se votan, se responden
//                 en su propio hilo y pueden "cambiarle la opinión" a alguien (Δ)
//   propuestas  → lluvia de ideas que se vota
//   abierta     → una pregunta con respuestas libres, que se votan y se responden
//
// Además: resultados visibles siempre, al participar o recién al cierre;
// aportes anónimos; cierre manual; conclusión de quien lo abrió; la
// conversación general en hilos y sub-hilos; fijar (en comunidad.js).
//
//   GET    /api/comunidad/debates                    → la lista
//   POST   /api/comunidad/debates                    → crear (con sus bloques)
//   GET    /api/comunidad/debates/:id                → todo: bloques, resultados, aportes, hilos
//   POST   /api/comunidad/debates/:id/responder      → responder un bloque (o quitar la respuesta)
//   POST   /api/comunidad/debates/:id/aportes        → aportar un argumento, propuesta o respuesta
//   POST   /api/comunidad/debates/aportes/:id/convencio → "me hizo cambiar de opinión" (Δ)
//   DELETE /api/comunidad/debates/aportes/:id        → borrar un aporte
//   POST   /api/comunidad/debates/:id/cerrar         → cerrarlo ya
//   PUT    /api/comunidad/debates/:id/conclusion     → la conclusión
//   POST   /api/comunidad/debates/:id/participar     → (compatibilidad) entrar
//   PUT    /api/comunidad/debates/:id/postura        → (compatibilidad) postura
// ============================================================================

import { exigirAcceso, ventanilla } from "./comun.js";
import { handleDe } from "./comunidad-util.js";

const TIPOS = ["postura", "opciones", "escala", "ranking", "argumentos", "propuestas", "abierta"];
const DE_RESPUESTA = new Set(["postura", "opciones", "escala", "ranking"]);
const DE_APORTES = new Set(["argumentos", "propuestas", "abierta"]);
const RESULTADOS = ["siempre", "al-participar", "al-cierre"];
const MAX_BLOQUES = 8;
const MAX_TEXTO = 1000;
const TITULO_POR_DEFECTO = {
  postura: "¿Cuál es tu postura?",
  opciones: "Elegí una opción",
  escala: "¿Cuánto estás de acuerdo?",
  ranking: "Ordená de más a menos importante",
  argumentos: "Argumentos",
  propuestas: "Propuestas",
  abierta: "",
};

const texto = (v, largo) => String(v ?? "").replace(/[\u0000-\u0008\u000b-\u001f]/g, " ").trim().slice(0, largo);
const hoy = () => new Date().toISOString().slice(0, 10);
const json = (t, d) => { try { return JSON.parse(t); } catch { return d; } };

/** Las opciones de un bloque (encuesta o ranking), con id estable. */
function leerOpciones(crudas, minimo, maximo) {
  const lista = (Array.isArray(crudas) ? crudas : [])
    .map((o) => texto(typeof o === "object" && o ? o.texto : o, 80))
    .filter(Boolean);
  const unicas = [...new Set(lista)];
  if (unicas.length < minimo || unicas.length > maximo) return { error: `Este bloque necesita entre ${minimo} y ${maximo} opciones distintas.` };
  return { opciones: unicas.map((t, i) => ({ id: `o${i + 1}`, texto: t })) };
}

/** Un bloque, validado y con su configuración limpia. */
export function normalizarBloque(crudo) {
  const tipo = String(crudo?.tipo ?? "");
  if (!TIPOS.includes(tipo)) return { error: `Tipo de bloque desconocido: «${tipo}».` };
  const titulo = texto(crudo.titulo, 160) || TITULO_POR_DEFECTO[tipo];
  if (!titulo) return { error: "La pregunta abierta necesita su pregunta." };
  const c = crudo.config && typeof crudo.config === "object" ? crudo.config : {};
  let config = {};
  if (tipo === "postura") config = { neutral: c.neutral === true };
  if (tipo === "opciones") {
    const o = leerOpciones(c.opciones, 2, 10);
    if (o.error) return o;
    const multiple = c.multiple === true;
    config = { opciones: o.opciones, multiple };
    if (multiple) config.maximo = Math.max(1, Math.min(o.opciones.length, Math.round(Number(c.maximo) || o.opciones.length)));
  }
  if (tipo === "escala") {
    const minimo = Math.round(Number(c.minimo ?? 1));
    const maximo = Math.round(Number(c.maximo ?? 5));
    if (!Number.isFinite(minimo) || !Number.isFinite(maximo) || minimo < 0 || maximo > 10 || maximo - minimo < 2) {
      return { error: "La escala va de un mínimo a un máximo (como mucho de 0 a 10, con al menos 3 valores)." };
    }
    config = { minimo, maximo, etiquetaMin: texto(c.etiquetaMin, 30) || "Nada", etiquetaMax: texto(c.etiquetaMax, 30) || "Totalmente" };
  }
  if (tipo === "ranking") {
    const o = leerOpciones(c.opciones, 3, 8);
    if (o.error) return o;
    config = { opciones: o.opciones };
  }
  if (tipo === "propuestas") config = { maximoPorPersona: Math.max(1, Math.min(10, Math.round(Number(c.maximoPorPersona) || 3))) };
  return { tipo, titulo, config };
}

/** Valida la respuesta de una persona a un bloque. Devuelve { valor } o { error }. */
function leerRespuesta(bloque, crudo) {
  const c = bloque.config;
  if (crudo === null || crudo === undefined) return { valor: null };
  if (bloque.tipo === "postura") {
    const validas = ["a-favor", "en-contra", ...(c.neutral ? ["neutral"] : [])];
    return validas.includes(crudo) ? { valor: crudo } : { error: "Esa postura no es una de las opciones." };
  }
  if (bloque.tipo === "opciones") {
    const ids = new Set(c.opciones.map((o) => o.id));
    if (!c.multiple) return ids.has(crudo) ? { valor: crudo } : { error: "Esa opción no es de este bloque." };
    const elegidas = Array.isArray(crudo) ? [...new Set(crudo.map(String))] : [];
    if (!elegidas.length || elegidas.some((x) => !ids.has(x))) return { error: "Elegí opciones de este bloque." };
    if (elegidas.length > c.maximo) return { error: `Podés elegir hasta ${c.maximo} opciones.` };
    return { valor: elegidas };
  }
  if (bloque.tipo === "escala") {
    const n = Number(crudo);
    return Number.isInteger(n) && n >= c.minimo && n <= c.maximo ? { valor: n } : { error: `Elegí un valor entre ${c.minimo} y ${c.maximo}.` };
  }
  if (bloque.tipo === "ranking") {
    const ids = c.opciones.map((o) => o.id);
    const orden = Array.isArray(crudo) ? crudo.map(String) : [];
    const completo = orden.length === ids.length && new Set(orden).size === ids.length && orden.every((x) => ids.includes(x));
    return completo ? { valor: orden } : { error: "Ordená todas las opciones." };
  }
  return { error: "Este bloque se responde con aportes, no con una respuesta." };
}

/** Los resultados de un bloque de respuesta, a partir de todas las respuestas. */
export function resultadosDe(bloque, respuestas) {
  const c = bloque.config;
  const total = respuestas.length;
  if (bloque.tipo === "postura") {
    const cuenta = (v) => respuestas.filter((r) => r === v).length;
    const aFavor = cuenta("a-favor");
    const enContra = cuenta("en-contra");
    const decididos = aFavor + enContra;
    return { total, aFavor, enContra, neutral: cuenta("neutral"), consenso: decididos ? Math.abs(aFavor - enContra) / decididos : null };
  }
  if (bloque.tipo === "opciones") {
    const conteo = Object.fromEntries(c.opciones.map((o) => [o.id, 0]));
    for (const r of respuestas) for (const id of Array.isArray(r) ? r : [r]) if (id in conteo) conteo[id]++;
    return { total, opciones: c.opciones.map((o) => ({ id: o.id, texto: o.texto, votos: conteo[o.id] })) };
  }
  if (bloque.tipo === "escala") {
    const valores = respuestas.filter((r) => Number.isInteger(r));
    const distribucion = [];
    for (let v = c.minimo; v <= c.maximo; v++) distribucion.push({ valor: v, cantidad: valores.filter((x) => x === v).length });
    if (!valores.length) return { total, distribucion, promedio: null, mediana: null, consenso: null };
    const promedio = valores.reduce((s, v) => s + v, 0) / valores.length;
    const ordenados = [...valores].sort((a, b) => a - b);
    const medio = Math.floor(ordenados.length / 2);
    const mediana = ordenados.length % 2 ? ordenados[medio] : (ordenados[medio - 1] + ordenados[medio]) / 2;
    const desvio = Math.sqrt(valores.reduce((s, v) => s + (v - promedio) ** 2, 0) / valores.length);
    const desvioMaximo = (c.maximo - c.minimo) / 2;
    return { total, distribucion, promedio: Math.round(promedio * 100) / 100, mediana, consenso: Math.max(0, 1 - desvio / desvioMaximo) };
  }
  if (bloque.tipo === "ranking") {
    // Conteo Borda: con n opciones, el primer lugar suma n-1 puntos y el último 0.
    const n = c.opciones.length;
    const puntos = Object.fromEntries(c.opciones.map((o) => [o.id, 0]));
    const posiciones = Object.fromEntries(c.opciones.map((o) => [o.id, 0]));
    for (const orden of respuestas) {
      if (!Array.isArray(orden)) continue;
      orden.forEach((id, i) => { if (id in puntos) { puntos[id] += n - 1 - i; posiciones[id] += i + 1; } });
    }
    return {
      total,
      opciones: c.opciones
        .map((o) => ({ id: o.id, texto: o.texto, puntos: puntos[o.id], posicionPromedio: total ? Math.round((posiciones[o.id] / total) * 10) / 10 : null }))
        .sort((a, b) => b.puntos - a.puntos || a.texto.localeCompare(b.texto)),
    };
  }
  return null;
}

export function registrarDebates(app, db, util, { conversacion, PUEDE_PUBLICAR }) {
  const debatesDe = db.prepare(
    `SELECT d.*, u.nombre AS autor, u.rol AS autor_rol, u.avatar_url AS autor_avatar, u.email AS autor_email
       FROM debates d JOIN usuarios u ON u.id = d.autor_id
      WHERE d.institucion_id = ? AND d.eliminado_en IS NULL`
  );
  const debatePorId = db.prepare(
    `SELECT d.*, u.nombre AS autor, u.rol AS autor_rol, u.avatar_url AS autor_avatar, u.email AS autor_email
       FROM debates d JOIN usuarios u ON u.id = d.autor_id
      WHERE d.id = ? AND d.institucion_id = ? AND d.eliminado_en IS NULL`
  );
  const bloquesDe = db.prepare("SELECT * FROM debate_bloques WHERE debate_id = ? ORDER BY orden, id");
  const bloquesDeEscuela = db.prepare("SELECT b.* FROM debate_bloques b JOIN debates d ON d.id = b.debate_id WHERE d.institucion_id = ? ORDER BY b.debate_id, b.orden, b.id");
  const respuestasDeBloque = db.prepare("SELECT usuario_id, valor FROM debate_respuestas WHERE bloque_id = ?");
  const respuestasDeEscuela = db.prepare("SELECT r.bloque_id, r.usuario_id, r.valor FROM debate_respuestas r JOIN debate_bloques b ON b.id = r.bloque_id JOIN debates d ON d.id = b.debate_id WHERE d.institucion_id = ?");
  const aportesDe = db.prepare(
    `SELECT a.*, u.nombre AS autor, u.rol AS autor_rol, u.avatar_url AS autor_avatar, u.email AS autor_email,
            (SELECT COUNT(*) FROM debate_convencidos c WHERE c.aporte_id = a.id) AS convencidos,
            EXISTS (SELECT 1 FROM debate_convencidos c WHERE c.aporte_id = a.id AND c.usuario_id = ?2) AS me_convencio,
            (SELECT COUNT(*) FROM comentarios k WHERE k.aporte_id = a.id AND k.eliminado_en IS NULL) AS respuestas
       FROM debate_aportes a JOIN usuarios u ON u.id = a.usuario_id
      WHERE a.debate_id = ?1 AND a.eliminado_en IS NULL
      ORDER BY a.creado_en, a.id`
  );
  const participantesDe = db.prepare(
    `SELECT COUNT(DISTINCT u) AS n FROM (
       SELECT usuario_id AS u FROM debate_participantes WHERE debate_id = ?1
       UNION SELECT r.usuario_id FROM debate_respuestas r JOIN debate_bloques b ON b.id = r.bloque_id WHERE b.debate_id = ?1
       UNION SELECT usuario_id FROM debate_aportes WHERE debate_id = ?1 AND eliminado_en IS NULL)`
  );
  const participoEn = db.prepare(
    `SELECT EXISTS (SELECT 1 FROM debate_participantes WHERE debate_id = ?1 AND usuario_id = ?2)
         OR EXISTS (SELECT 1 FROM debate_respuestas r JOIN debate_bloques b ON b.id = r.bloque_id WHERE b.debate_id = ?1 AND r.usuario_id = ?2)
         OR EXISTS (SELECT 1 FROM debate_aportes WHERE debate_id = ?1 AND usuario_id = ?2 AND eliminado_en IS NULL) AS si`
  );
  const contarComentarios = db.prepare("SELECT COUNT(*) AS n FROM comentarios WHERE objeto_tipo = 'debate' AND objeto_id = ? AND eliminado_en IS NULL");
  const contarAportes = db.prepare("SELECT COUNT(*) AS n FROM debate_aportes WHERE debate_id = ? AND eliminado_en IS NULL");
  const contarConvencidos = db.prepare("SELECT COUNT(*) AS n FROM debate_convencidos c JOIN debate_aportes a ON a.id = c.aporte_id WHERE a.debate_id = ? AND a.eliminado_en IS NULL");
  const marcarParticipacion = db.prepare("INSERT INTO debate_participantes (debate_id, usuario_id, postura) VALUES (?, ?, NULL) ON CONFLICT (debate_id, usuario_id) DO NOTHING");

  const abierto = (d) => d.cerrado_en === null && (d.cierra_en === null || d.cierra_en >= hoy());
  const preparar = (b) => ({ ...b, config: json(b.config, {}) });
  const esModeradorDe = (usuario, d) => util.esModerador(usuario) || usuario.id === d.autor_id;
  /** ¿Esta persona ve los resultados de este bloque ya? */
  const veResultados = (d, yaRespondio, usuario) =>
    d.resultados === "siempre" || !abierto(d) || util.esModerador(usuario) ||
    (d.resultados === "al-participar" && (yaRespondio || usuario.id === d.autor_id));

  /** Lo de la lista (y la cabecera del detalle). */
  function resumen(d, usuario, { bloques, respuestasPorBloque, votos, reacciones, adjuntos }) {
    const postura = bloques.find((b) => b.tipo === "postura");
    const respuestasPostura = postura ? respuestasPorBloque.get(postura.id) ?? [] : [];
    const miPostura = respuestasPostura.find((r) => r.usuario_id === usuario.id);
    const visible = postura && veResultados(d, Boolean(miPostura), usuario);
    const conteo = postura ? resultadosDe(postura, respuestasPostura.map((r) => json(r.valor, null))) : null;
    const v = votos.get(d.id) ?? { aFavor: 0, enContra: 0, mio: null };
    const estado = abierto(d);
    return {
      id: String(d.id),
      titulo: d.titulo,
      descripcion: d.descripcion,
      autorId: String(d.autor_id),
      autor: d.autor,
      autorRol: d.autor_rol,
      autorAvatar: d.autor_avatar ?? undefined,
      handle: handleDe(d.autor_email),
      creadoEn: d.creado_en,
      cierraEn: d.cierra_en ?? null,
      abierto: estado,
      cerradoEn: d.cerrado_en ?? null,
      fijado: d.fijado_en !== null,
      fijadoEn: d.fijado_en,
      resultados: d.resultados,
      anonimo: d.anonimo === 1,
      bloques: bloques.map((b) => ({ id: String(b.id), tipo: b.tipo, titulo: b.titulo })),
      participantes: participantesDe.get(d.id).n,
      comentarios: contarComentarios.get(d.id).n,
      aportes: contarAportes.get(d.id).n,
      cambiosDeOpinion: contarConvencidos.get(d.id).n,
      conclusion: d.conclusion ? { texto: d.conclusion, en: d.conclusion_en } : null,
      // Compatibilidad: lo que antes era la barra a favor / en contra.
      votosAFavor: visible ? conteo.aFavor : 0,
      votosEnContra: visible ? conteo.enContra : 0,
      consenso: visible ? conteo.consenso : null,
      estoyParticipando: Boolean(participoEn.get(d.id, usuario.id).si),
      miPostura: miPostura ? json(miPostura.valor, null) : null,
      apoyo: { aFavor: v.aFavor, enContra: v.enContra, miVoto: v.mio === 1 ? "a-favor" : v.mio === -1 ? "en-contra" : null },
      reacciones: reacciones.get(d.id) ?? [],
      adjuntos: adjuntos.get(d.id) ?? [],
      puedoGestionar: esModeradorDe(usuario, d),
    };
  }

  // ── Lista ─────────────────────────────────────────────────────────────────
  app.get(
    "/api/comunidad/debates",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "debates");
      if (!usuario) return;
      const filas = debatesDe.all(usuario.institucionId);
      const ids = filas.map((d) => d.id);
      const bloques = new Map();
      for (const b of bloquesDeEscuela.all(usuario.institucionId)) {
        if (!bloques.has(b.debate_id)) bloques.set(b.debate_id, []);
        bloques.get(b.debate_id).push(preparar(b));
      }
      const respuestasPorBloque = new Map();
      for (const r of respuestasDeEscuela.all(usuario.institucionId)) {
        if (!respuestasPorBloque.has(r.bloque_id)) respuestasPorBloque.set(r.bloque_id, []);
        respuestasPorBloque.get(r.bloque_id).push(r);
      }
      const extras = {
        respuestasPorBloque,
        votos: util.votosDe("debate", ids, usuario.id),
        reacciones: util.reaccionesDe("debate", ids, usuario.id),
        adjuntos: util.adjuntosDe("debate", ids),
      };
      const debates = filas
        .map((d) => resumen(d, usuario, { ...extras, bloques: bloques.get(d.id) ?? [] }))
        .sort((a, b) =>
          Number(b.fijado) - Number(a.fijado) ||
          String(b.fijadoEn ?? "").localeCompare(String(a.fijadoEn ?? "")) ||
          Number(b.abierto) - Number(a.abierto) ||
          String(b.creadoEn).localeCompare(String(a.creadoEn)));
      res.json({ debates });
    })
  );

  // ── Crear ─────────────────────────────────────────────────────────────────
  app.post(
    "/api/comunidad/debates",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "debates");
      if (!usuario) return;
      if (!PUEDE_PUBLICAR.has(usuario.rol)) return res.status(403).json({ error: "Tu perfil no puede crear debates." });
      const c = req.body ?? {};
      const titulo = texto(c.titulo, 200);
      if (!titulo) return res.status(400).json({ error: "El debate necesita una pregunta." });
      const descripcion = texto(c.descripcion, 4000);
      const cierraEn = /^\d{4}-\d{2}-\d{2}$/.test(String(c.cierraEn ?? "")) ? String(c.cierraEn) : null;
      if (cierraEn && cierraEn < hoy()) return res.status(400).json({ error: "La fecha de cierre ya pasó." });
      const resultados = RESULTADOS.includes(c.resultados) ? c.resultados : "siempre";
      const crudos = Array.isArray(c.bloques) && c.bloques.length ? c.bloques : [{ tipo: "postura" }];
      if (crudos.length > MAX_BLOQUES) return res.status(400).json({ error: `Un debate admite hasta ${MAX_BLOQUES} bloques.` });
      const bloques = [];
      for (const b of crudos) {
        const n = normalizarBloque(b);
        if (n.error) return res.status(400).json({ error: n.error });
        bloques.push(n);
      }
      const adj = util.leerAdjuntos(c.adjuntos, usuario.id);
      if (adj.error) return res.status(400).json({ error: adj.error });
      if (adj.ids.length && !util.tiene(usuario, "comunidad.multimedia")) {
        return res.status(403).json({ error: "Tu perfil no puede subir fotos, videos ni archivos (lo decide la dirección en su modo edición)." });
      }

      db.exec("BEGIN");
      let id;
      try {
        id = Number(db.prepare(
          "INSERT INTO debates (institucion_id, autor_id, titulo, descripcion, cierra_en, resultados, anonimo) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).run(usuario.institucionId, usuario.id, titulo, descripcion, cierraEn, resultados, c.anonimo === true ? 1 : 0).lastInsertRowid);
        const insertar = db.prepare("INSERT INTO debate_bloques (debate_id, tipo, orden, titulo, config) VALUES (?, ?, ?, ?, ?)");
        bloques.forEach((b, i) => insertar.run(id, b.tipo, i, b.titulo, JSON.stringify(b.config)));
        util.guardarAdjuntos("debate", id, adj.ids);
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
      for (const m of util.guardarMenciones("debate", id, `${titulo} ${descripcion}`, usuario.institucionId)) {
        util.avisar(m.id, usuario, { tipo: "mencion", titulo: `${usuario.nombre} te mencionó en un debate`, cuerpo: titulo, objetoTipo: "debate", objetoId: id });
      }
      res.status(201).json({ id: String(id) });
    })
  );

  // ── Detalle ───────────────────────────────────────────────────────────────
  function detalle(d, usuario) {
    const bloques = bloquesDe.all(d.id).map(preparar);
    const anonimo = d.anonimo === 1;
    const ocultarAutor = (autorId) => anonimo && autorId !== usuario.id && !util.esModerador(usuario);
    const respuestasPorBloque = new Map(bloques.map((b) => [b.id, respuestasDeBloque.all(b.id)]));
    const aportes = aportesDe.all(d.id, usuario.id);
    const idsAportes = aportes.map((a) => a.id);
    const votosAportes = util.votosDe("aporte", idsAportes, usuario.id);
    const reaccionesAportes = util.reaccionesDe("aporte", idsAportes, usuario.id);
    const adjuntosAportes = util.adjuntosDe("aporte", idsAportes);
    const estado = abierto(d);

    const vistaBloques = bloques.map((b) => {
      const base = { id: String(b.id), tipo: b.tipo, titulo: b.titulo, config: b.config };
      if (DE_RESPUESTA.has(b.tipo)) {
        const todas = respuestasPorBloque.get(b.id);
        const mia = todas.find((r) => r.usuario_id === usuario.id);
        const visibles = veResultados(d, Boolean(mia), usuario);
        return {
          ...base,
          miRespuesta: mia ? json(mia.valor, null) : null,
          respondieron: todas.length,
          resultadosVisibles: visibles,
          resultados: visibles ? resultadosDe(b, todas.map((r) => json(r.valor, null))) : null,
        };
      }
      const propios = aportes.filter((a) => a.bloque_id === b.id);
      return {
        ...base,
        misAportes: propios.filter((a) => a.usuario_id === usuario.id).length,
        aportes: propios.map((a) => {
          const v = votosAportes.get(a.id) ?? { aFavor: 0, enContra: 0, mio: null };
          const oculto = ocultarAutor(a.usuario_id);
          return {
            id: String(a.id),
            lado: a.lado,
            texto: a.texto,
            autorId: oculto ? null : String(a.usuario_id),
            autor: oculto ? "Participante" : a.autor,
            autorRol: oculto ? null : a.autor_rol,
            autorAvatar: oculto ? null : a.autor_avatar ?? null,
            handle: oculto ? null : handleDe(a.autor_email),
            esMio: a.usuario_id === usuario.id,
            creadoEn: a.creado_en,
            votosAFavor: v.aFavor,
            votosEnContra: v.enContra,
            miVoto: v.mio === 1 ? "a-favor" : v.mio === -1 ? "en-contra" : null,
            convencidos: a.convencidos,
            meConvencio: a.me_convencio === 1,
            respuestas: a.respuestas,
            reacciones: reaccionesAportes.get(a.id) ?? [],
            adjuntos: adjuntosAportes.get(a.id) ?? [],
            puedoBorrar: a.usuario_id === usuario.id || esModeradorDe(usuario, d) || usuario.rol === "centro-estudiantes",
          };
        }),
      };
    });

    const extras = {
      respuestasPorBloque,
      votos: util.votosDe("debate", [d.id], usuario.id),
      reacciones: util.reaccionesDe("debate", [d.id], usuario.id),
      adjuntos: util.adjuntosDe("debate", [d.id]),
    };
    const cabecera = resumen(d, usuario, { ...extras, bloques });
    const respuestasTotales = [...respuestasPorBloque.values()].reduce((s, l) => s + l.length, 0);
    return {
      debate: {
        ...cabecera,
        conclusion: d.conclusion ? { texto: d.conclusion, en: d.conclusion_en, por: d.conclusion_por ? String(d.conclusion_por) : null } : null,
        puedoAportar: estado,
        puedoCerrar: estado && esModeradorDe(usuario, d),
        puedoConcluir: esModeradorDe(usuario, d),
        puedoEliminar: esModeradorDe(usuario, d) || usuario.rol === "centro-estudiantes",
      },
      bloques: vistaBloques,
      estadisticas: {
        participantes: cabecera.participantes,
        respuestas: respuestasTotales,
        aportes: aportes.length,
        cambiosDeOpinion: cabecera.cambiosDeOpinion,
        comentarios: cabecera.comentarios,
      },
      comentarios: conversacion("debate", d.id, usuario, { anonimizar: (c) => ocultarAutor(c.usuario_id) }),
    };
  }

  /** El debate de la escuela de quien pide, o responde 404. */
  function buscar(req, res, usuario, id = Number(req.params.id)) {
    const d = Number.isInteger(id) ? debatePorId.get(id, usuario.institucionId) : null;
    if (!d) res.status(404).json({ error: "Ese debate no existe en tu comunidad." });
    return d ?? null;
  }

  app.get(
    "/api/comunidad/debates/:id",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "debates");
      if (!usuario) return;
      const d = buscar(req, res, usuario);
      if (!d) return;
      res.json(detalle(d, usuario));
    })
  );

  // ── Responder un bloque ───────────────────────────────────────────────────
  const guardarRespuesta = db.prepare(
    `INSERT INTO debate_respuestas (bloque_id, usuario_id, valor) VALUES (?, ?, ?)
     ON CONFLICT (bloque_id, usuario_id) DO UPDATE SET valor = excluded.valor, actualizado_en = datetime('now')`
  );
  const borrarRespuesta = db.prepare("DELETE FROM debate_respuestas WHERE bloque_id = ? AND usuario_id = ?");

  function responder(usuario, d, bloque, crudo) {
    const r = leerRespuesta(bloque, crudo);
    if (r.error) return r;
    if (r.valor === null) borrarRespuesta.run(bloque.id, usuario.id);
    else guardarRespuesta.run(bloque.id, usuario.id, JSON.stringify(r.valor));
    marcarParticipacion.run(d.id, usuario.id);
    return r;
  }

  app.post(
    "/api/comunidad/debates/:id/responder",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "debates");
      if (!usuario) return;
      const d = buscar(req, res, usuario);
      if (!d) return;
      if (!abierto(d)) return res.status(409).json({ error: "El debate está cerrado." });
      const bloque = bloquesDe.all(d.id).map(preparar).find((b) => b.id === Number(req.body?.bloqueId));
      if (!bloque || !DE_RESPUESTA.has(bloque.tipo)) return res.status(400).json({ error: "Ese bloque no es de este debate o no se responde así." });
      const r = responder(usuario, d, bloque, req.body?.valor);
      if (r.error) return res.status(400).json({ error: r.error });
      res.json(detalle(d, usuario));
    })
  );

  // Compatibilidad con la pantalla anterior: participar y postura.
  app.post(
    "/api/comunidad/debates/:id/participar",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "debates");
      if (!usuario) return;
      const d = buscar(req, res, usuario);
      if (!d) return;
      if (!abierto(d)) return res.status(409).json({ error: "El debate está cerrado." });
      marcarParticipacion.run(d.id, usuario.id);
      res.status(201).json({ ok: true });
    })
  );
  app.put(
    "/api/comunidad/debates/:id/postura",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "debates");
      if (!usuario) return;
      const d = buscar(req, res, usuario);
      if (!d) return;
      if (!abierto(d)) return res.status(409).json({ error: "El debate está cerrado." });
      const bloque = bloquesDe.all(d.id).map(preparar).find((b) => b.tipo === "postura");
      if (!bloque) return res.status(400).json({ error: "Este debate no tiene un bloque de postura." });
      const r = responder(usuario, d, bloque, req.body?.postura);
      if (r.error) return res.status(400).json({ error: r.error });
      res.json({ ok: true });
    })
  );

  // ── Aportes (argumentos, propuestas, respuestas abiertas) ─────────────────
  app.post(
    "/api/comunidad/debates/:id/aportes",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "debates");
      if (!usuario) return;
      const d = buscar(req, res, usuario);
      if (!d) return;
      if (!abierto(d)) return res.status(409).json({ error: "El debate está cerrado." });
      const bloque = bloquesDe.all(d.id).map(preparar).find((b) => b.id === Number(req.body?.bloqueId));
      if (!bloque || !DE_APORTES.has(bloque.tipo)) return res.status(400).json({ error: "Ese bloque no es de este debate o no recibe aportes." });
      const contenido = texto(req.body?.texto, MAX_TEXTO + 1);
      if (!contenido) return res.status(400).json({ error: "El aporte está vacío." });
      if (contenido.length > MAX_TEXTO) return res.status(400).json({ error: `Un aporte admite hasta ${MAX_TEXTO} caracteres.` });
      let lado = null;
      if (bloque.tipo === "argumentos") {
        lado = req.body?.lado;
        if (lado !== "a-favor" && lado !== "en-contra") return res.status(400).json({ error: "Un argumento es a favor o en contra." });
      }
      if (bloque.tipo === "propuestas") {
        const mias = db.prepare("SELECT COUNT(*) AS n FROM debate_aportes WHERE bloque_id = ? AND usuario_id = ? AND eliminado_en IS NULL").get(bloque.id, usuario.id).n;
        if (mias >= bloque.config.maximoPorPersona) return res.status(409).json({ error: `Cada persona puede sumar hasta ${bloque.config.maximoPorPersona} propuestas.` });
      }
      const adj = util.leerAdjuntos(req.body?.adjuntos, usuario.id);
      if (adj.error) return res.status(400).json({ error: adj.error });
      if (adj.ids.length && !util.tiene(usuario, "comunidad.multimedia")) {
        return res.status(403).json({ error: "Tu perfil no puede subir fotos, videos ni archivos (lo decide la dirección en su modo edición)." });
      }
      const id = Number(db.prepare("INSERT INTO debate_aportes (debate_id, bloque_id, usuario_id, lado, texto) VALUES (?, ?, ?, ?, ?)")
        .run(d.id, bloque.id, usuario.id, lado, contenido).lastInsertRowid);
      util.guardarAdjuntos("aporte", id, adj.ids);
      marcarParticipacion.run(d.id, usuario.id);
      const nombreAporte = bloque.tipo === "argumentos" ? "un argumento" : bloque.tipo === "propuestas" ? "una propuesta" : "una respuesta";
      util.avisar(d.autor_id, usuario, { tipo: "debate", titulo: d.anonimo ? `Sumaron ${nombreAporte} en tu debate` : `${usuario.nombre} sumó ${nombreAporte} en tu debate`, cuerpo: contenido, objetoTipo: "debate", objetoId: d.id });
      for (const m of util.guardarMenciones("aporte", id, contenido, usuario.institucionId)) {
        util.avisar(m.id, usuario, { tipo: "mencion", titulo: `${usuario.nombre} te mencionó en un debate`, cuerpo: contenido, objetoTipo: "debate", objetoId: d.id });
      }
      res.status(201).json({ id: String(id), ...detalle(d, usuario) });
    })
  );

  const aportePorId = db.prepare(
    "SELECT a.*, d.institucion_id FROM debate_aportes a JOIN debates d ON d.id = a.debate_id WHERE a.id = ? AND a.eliminado_en IS NULL AND d.eliminado_en IS NULL"
  );

  app.post(
    "/api/comunidad/debates/aportes/:id/convencio",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "debates");
      if (!usuario) return;
      const a = aportePorId.get(Number(req.params.id));
      if (!a || a.institucion_id !== usuario.institucionId) return res.status(404).json({ error: "Ese aporte no existe en tu comunidad." });
      const d = debatePorId.get(a.debate_id, usuario.institucionId);
      if (!abierto(d)) return res.status(409).json({ error: "El debate está cerrado." });
      if (a.usuario_id === usuario.id) return res.status(400).json({ error: "Tu propio aporte no te puede cambiar de opinión." });
      const previo = db.prepare("SELECT 1 FROM debate_convencidos WHERE aporte_id = ? AND usuario_id = ?").get(a.id, usuario.id);
      if (previo) db.prepare("DELETE FROM debate_convencidos WHERE aporte_id = ? AND usuario_id = ?").run(a.id, usuario.id);
      else {
        db.prepare("INSERT INTO debate_convencidos (aporte_id, usuario_id) VALUES (?, ?)").run(a.id, usuario.id);
        marcarParticipacion.run(d.id, usuario.id);
        util.avisar(a.usuario_id, usuario, { tipo: "debate", titulo: "Tu aporte le hizo cambiar de opinión a alguien (Δ)", cuerpo: a.texto, objetoTipo: "debate", objetoId: d.id });
      }
      const total = db.prepare("SELECT COUNT(*) AS n FROM debate_convencidos WHERE aporte_id = ?").get(a.id).n;
      res.json({ activo: !previo, convencidos: total });
    })
  );

  app.delete(
    "/api/comunidad/debates/aportes/:id",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "debates");
      if (!usuario) return;
      const a = aportePorId.get(Number(req.params.id));
      if (!a || a.institucion_id !== usuario.institucionId) return res.status(404).json({ error: "Ese aporte no existe en tu comunidad." });
      const d = debatePorId.get(a.debate_id, usuario.institucionId);
      if (a.usuario_id !== usuario.id && !esModeradorDe(usuario, d) && usuario.rol !== "centro-estudiantes") {
        return res.status(403).json({ error: "Tu perfil no puede borrar este aporte; podés denunciarlo." });
      }
      db.prepare("UPDATE debate_aportes SET eliminado_en = datetime('now'), eliminado_por = ? WHERE id = ?").run(usuario.id, a.id);
      res.json({ ok: true });
    })
  );

  // ── Cerrar y concluir ─────────────────────────────────────────────────────
  const participantesParaAvisar = db.prepare(
    `SELECT usuario_id AS id FROM debate_participantes WHERE debate_id = ?1
     UNION SELECT usuario_id FROM debate_aportes WHERE debate_id = ?1 AND eliminado_en IS NULL
     UNION SELECT r.usuario_id FROM debate_respuestas r JOIN debate_bloques b ON b.id = r.bloque_id WHERE b.debate_id = ?1`
  );
  const avisarParticipantes = (usuario, d, titulo) => {
    for (const { id } of participantesParaAvisar.all(d.id)) util.avisar(id, usuario, { tipo: "debate", titulo, cuerpo: d.titulo, objetoTipo: "debate", objetoId: d.id });
  };

  app.post(
    "/api/comunidad/debates/:id/cerrar",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "debates");
      if (!usuario) return;
      const d = buscar(req, res, usuario);
      if (!d) return;
      if (!esModeradorDe(usuario, d)) return res.status(403).json({ error: "Solo quien abrió el debate (o la dirección) lo puede cerrar." });
      if (!abierto(d)) return res.status(409).json({ error: "El debate ya está cerrado." });
      db.prepare("UPDATE debates SET cerrado_en = datetime('now') WHERE id = ?").run(d.id);
      avisarParticipantes(usuario, d, "Se cerró un debate en el que participaste: ya podés ver los resultados");
      res.json(detalle(debatePorId.get(d.id, usuario.institucionId), usuario));
    })
  );

  app.put(
    "/api/comunidad/debates/:id/conclusion",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "debates");
      if (!usuario) return;
      const d = buscar(req, res, usuario);
      if (!d) return;
      if (!esModeradorDe(usuario, d)) return res.status(403).json({ error: "Solo quien abrió el debate (o la dirección) escribe la conclusión." });
      const conclusion = texto(req.body?.texto, 4000);
      db.prepare("UPDATE debates SET conclusion = ?, conclusion_en = CASE WHEN ? = '' THEN NULL ELSE datetime('now') END, conclusion_por = ? WHERE id = ?")
        .run(conclusion || null, conclusion, conclusion ? usuario.id : null, d.id);
      if (conclusion && !d.conclusion) avisarParticipantes(usuario, d, "Un debate en el que participaste tiene conclusión");
      res.json(detalle(debatePorId.get(d.id, usuario.institucionId), usuario));
    })
  );
}
