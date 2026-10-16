// ============================================================================
// NEXO — Tendencias de la escuela y tendencias nacionales
// ----------------------------------------------------------------------------
// Dos rankings con una misma materia prima:
//
//   · INSTITUCIONAL: qué se está moviendo ahora en MI escuela. Lo puntúa el
//     algoritmo «Tendencias de la escuela» del genoma (el Maestro lo calibra o
//     lo reescribe con nodos).
//   · NACIONAL: lo mejor de todas las escuelas, pero SOLO lo que la dirección de
//     cada escuela aprobó para salir. Lo puntúa un único algoritmo de plataforma
//     («Tendencias nacionales»), igual para todas: ninguna escuela puede inflar
//     sus números para ganar la tabla.
//
// El camino de algo institucional a lo nacional:
//   1. El algoritmo de la escuela lo pone en su top (las «candidatas» del
//      genoma) con un puntaje mayor al umbral → queda PROPUESTO y la dirección
//      recibe un aviso.
//   2. La dirección lo APRUEBA (sale a lo nacional), lo DESCARTA o, si ya salió,
//      lo RETIRA. Puede también aprobar cualquier contenido de su escuela que vea
//      en tendencias. Nadie más puede: el permiso lo decide el servidor.
//   3. En lo nacional, las demás escuelas lo ven en modo lectura y sin nombres
//      de personas (lo que sale es la idea, no la identidad de un estudiante).
//
// La materia prima (las «señales» de cada publicación o debate) sale de la base
// en la ventana de días del algoritmo y cuenta solo lo que hicieron OTRAS
// personas: el autor que se vota o se comenta a sí mismo no suma.
//
//   GET  /api/comunidad/tendencias?alcance=mi-escuela|nacional
//   GET  /api/comunidad/tendencias/direccion   → propuestas, aprobadas, descartadas
//   POST /api/comunidad/tendencias/nacional    → { tipo, id, decision }
// ============================================================================

import { exigirAcceso, ventanilla, antiguedadEnHoras } from "./comun.js";
import { algoritmo, algoritmoNacional } from "./genoma.js";

const LARGO_LISTA = 20;
const ROLES_DE_COMUNIDAD = ["estudiante", "profesor", "admin-academico", "preceptor", "centro-estudiantes", "bibliotecario"];
const DECISIONES = ["aprobar", "rechazar", "retirar"];
const redondear = (x) => Math.round(x * 10) / 10;

export function crearMotorTendencias(db, notificaciones) {
  // Publicaciones (ya publicadas) y debates vivos, de una escuela o de todas.
  const objetos = db.prepare(
    `SELECT 'publicacion' AS tipo, p.id, p.institucion_id, i.nombre AS institucion,
            substr(p.contenido, 1, 140) AS titulo, p.autor_id,
            COALESCE(p.publicar_en, p.creado_en) AS creado_en
       FROM publicaciones p JOIN instituciones i ON i.id = p.institucion_id
      WHERE p.eliminado_en IS NULL
        AND (p.publicar_en IS NULL OR p.publicar_en <= datetime('now'))
        AND (?1 IS NULL OR p.institucion_id = ?1)
     UNION ALL
     SELECT 'debate', d.id, d.institucion_id, i.nombre, d.titulo, d.autor_id, d.creado_en
       FROM debates d JOIN instituciones i ON i.id = d.institucion_id
      WHERE d.eliminado_en IS NULL
        AND (?1 IS NULL OR d.institucion_id = ?1)`
  );

  // Toda interacción de la ventana: votos, comentarios y posturas en debates
  // (las respuestas a los bloques cuentan como posturas; los aportes, como
  // comentarios).
  // julianday() entiende las dos formas de fecha de la base (con 'T' y sin).
  const interacciones = db.prepare(
    `SELECT v.objeto_tipo AS tipo, v.objeto_id AS id, v.usuario_id, v.valor, v.creado_en AS cuando, 'voto' AS clase
       FROM votos v
      WHERE v.objeto_tipo IN ('publicacion', 'debate') AND julianday(v.creado_en) >= julianday('now', ?1)
     UNION ALL
     SELECT c.objeto_tipo, c.objeto_id, c.usuario_id, 0, c.creado_en, 'comentario'
       FROM comentarios c
      WHERE c.eliminado_en IS NULL AND julianday(c.creado_en) >= julianday('now', ?1)
     UNION ALL
     SELECT 'debate', b.debate_id, r.usuario_id, 0, r.actualizado_en, 'postura'
       FROM debate_respuestas r JOIN debate_bloques b ON b.id = r.bloque_id
      WHERE julianday(r.actualizado_en) >= julianday('now', ?1)
     UNION ALL
     SELECT 'debate', a.debate_id, a.usuario_id, 0, a.creado_en, 'comentario'
       FROM debate_aportes a
      WHERE a.eliminado_en IS NULL AND julianday(a.creado_en) >= julianday('now', ?1)`
  );

  const comunidadDe = db.prepare(
    `SELECT COUNT(*) AS n FROM usuarios
      WHERE institucion_id = ? AND estado = 'activo'
        AND rol IN (${ROLES_DE_COMUNIDAD.map(() => "?").join(",")})`
  );
  const aprobadas = db.prepare(
    "SELECT objeto_tipo, objeto_id FROM tendencias_nacionales WHERE estado = 'aprobada'"
  );
  const estadosDe = db.prepare(
    "SELECT id, objeto_tipo, objeto_id, estado FROM tendencias_nacionales WHERE institucion_id = ?"
  );

  /**
   * Las señales de cada objeto con actividad en la ventana. `filtro` acota qué
   * objetos entran (por ejemplo, solo los aprobados para lo nacional).
   */
  function senales({ institucionId = null, ventanaDias, vidaMedia, filtro = null }) {
    const porClave = new Map();
    for (const o of objetos.all(institucionId)) {
      if (filtro && !filtro(o)) continue;
      porClave.set(o.tipo + ":" + o.id, { ...o, aFavor: 0, enContra: 0, comentarios: 0, posturas: 0, pulso: 0, personas: new Set() });
    }
    if (porClave.size === 0) return [];
    const ahora = Date.now();
    const vida = Math.max(1, vidaMedia);
    for (const it of interacciones.all(`-${Math.max(1, Math.round(ventanaDias))} days`)) {
      const o = porClave.get(it.tipo + ":" + it.id);
      // El autor no se impulsa a sí mismo.
      if (!o || it.usuario_id === o.autor_id) continue;
      if (it.clase === "voto") {
        if (it.valor === 1) o.aFavor++;
        else o.enContra++;
      } else if (it.clase === "comentario") {
        o.comentarios++;
      } else {
        o.posturas++;
      }
      o.personas.add(it.usuario_id);
      // Pulso: cada interacción vale la mitad cada «vida media» horas.
      o.pulso += Math.pow(0.5, antiguedadEnHoras(it.cuando, ahora) / vida);
    }
    const lista = [];
    for (const o of porClave.values()) {
      if (o.personas.size === 0) continue;
      lista.push({
        tipo: o.tipo,
        id: o.id,
        institucionId: o.institucion_id,
        institucion: o.institucion,
        titulo: o.titulo,
        autorId: o.autor_id,
        aFavor: o.aFavor,
        enContra: o.enContra,
        balance: o.aFavor - o.enContra,
        comentarios: o.comentarios,
        posturas: o.posturas,
        participantes: o.personas.size,
        pulso: Math.round(o.pulso * 100) / 100,
        horas: Math.round(antiguedadEnHoras(o.creado_en, ahora) * 10) / 10,
      });
    }
    return lista;
  }

  const ordenar = (a, b) => b.puntaje - a.puntaje || b.participantes - a.participantes || b.id - a.id;

  /** El ranking de una escuela con el algoritmo de su genoma. */
  function rankingInstitucional(institucionId) {
    const regla = algoritmo(db, institucionId, "comunidad.tendencias");
    if (!regla.activo) return { activo: false, parametros: regla.parametros, items: [] };
    const p = regla.parametros;
    const items = senales({ institucionId, ventanaDias: p.ventanaDias, vidaMedia: p.vidaMedia })
      .filter((o) => o.participantes >= p.minParticipantes)
      .map((o) => ({ ...o, puntaje: redondear(regla.puntuar(o)) }))
      .filter((o) => o.puntaje > p.minimo)
      .sort(ordenar);
    return { activo: true, parametros: p, items };
  }

  /** El ranking nacional: solo lo aprobado por cada dirección, con el algoritmo de plataforma. */
  function rankingNacional() {
    const regla = algoritmoNacional(db);
    if (!regla.activo) return { activo: false, parametros: regla.parametros, items: [] };
    const p = regla.parametros;
    const elegidas = new Set(aprobadas.all().map((f) => f.objeto_tipo + ":" + f.objeto_id));
    if (elegidas.size === 0) return { activo: true, parametros: p, items: [] };
    const tamanos = new Map();
    const comunidad = (inst) => {
      if (!tamanos.has(inst)) tamanos.set(inst, comunidadDe.get(inst, ...ROLES_DE_COMUNIDAD).n);
      return tamanos.get(inst);
    };
    const puntuados = senales({
      ventanaDias: p.ventanaDias,
      vidaMedia: p.vidaMedia,
      filtro: (o) => elegidas.has(o.tipo + ":" + o.id),
    })
      .filter((o) => o.participantes >= p.minParticipantes)
      .map((o) => {
        const conTamano = { ...o, comunidad: comunidad(o.institucionId) };
        return { ...conTamano, puntaje: redondear(regla.puntuar(conTamano)) };
      })
      .filter((o) => o.puntaje > p.minimo)
      .sort(ordenar);
    // Tope por escuela: que una sola no copie la tabla nacional.
    const porEscuela = new Map();
    const items = [];
    for (const o of puntuados) {
      const n = porEscuela.get(o.institucionId) ?? 0;
      if (n >= p.maxPorEscuela) continue;
      porEscuela.set(o.institucionId, n + 1);
      items.push(o);
      if (items.length >= LARGO_LISTA) break;
    }
    return { activo: true, parametros: p, items };
  }

  // ── Propuestas automáticas a la dirección ──────────────────────────────────
  const yaDecidido = db.prepare("SELECT 1 FROM tendencias_nacionales WHERE objeto_tipo = ? AND objeto_id = ?");
  const proponer = db.prepare(
    `INSERT INTO tendencias_nacionales (institucion_id, objeto_tipo, objeto_id, estado, puntaje)
     VALUES (?, ?, ?, 'propuesta', ?)`
  );
  const direcciones = db.prepare(
    "SELECT id FROM usuarios WHERE institucion_id = ? AND rol = 'admin-academico' AND estado = 'activo'"
  );

  /**
   * Lo mejor del ranking de una escuela (las «candidatas» del genoma, si
   * superan el umbral) queda propuesto a su dirección, una sola vez por objeto.
   * Devuelve cuántas propuestas nuevas hubo.
   */
  function sincronizarPropuestas(institucionId) {
    const r = rankingInstitucional(institucionId);
    if (!r.activo || r.parametros.candidatas < 1) return 0;
    const candidatas = r.items
      .slice(0, Math.round(r.parametros.candidatas))
      .filter((o) => o.puntaje >= r.parametros.umbralNacional);
    let nuevas = 0;
    for (const o of candidatas) {
      if (yaDecidido.get(o.tipo, o.id)) continue;
      const info = proponer.run(institucionId, o.tipo, o.id, o.puntaje);
      nuevas++;
      for (const { id } of direcciones.all(institucionId)) {
        notificaciones.crear({
          usuarioId: id,
          tipo: "tendencia",
          titulo: "Una tendencia de tu escuela puede salir a lo nacional",
          cuerpo: `«${recortar(o.titulo, 70)}» reúne a ${o.participantes} personas. Revisala en Tendencias.`,
          objetoTipo: "tendencia",
          objetoId: Number(info.lastInsertRowid),
        });
      }
    }
    return nuevas;
  }

  function programarPropuestas() {
    const todas = db.prepare("SELECT id FROM instituciones");
    const pasada = () => {
      for (const { id } of todas.all()) {
        try {
          sincronizarPropuestas(id);
        } catch (error) {
          console.error("No se pudieron actualizar las propuestas nacionales", error);
        }
      }
    };
    pasada();
    const t = setInterval(pasada, 20 * 60 * 1000);
    t.unref?.();
    return t;
  }

  /** Estado nacional de cada objeto de una escuela ("tipo:id" → estado). */
  function estados(institucionId) {
    return new Map(estadosDe.all(institucionId).map((f) => [f.objeto_tipo + ":" + f.objeto_id, f]));
  }

  return { senales, rankingInstitucional, rankingNacional, sincronizarPropuestas, programarPropuestas, estados };
}

function recortar(texto, largo) {
  const t = String(texto ?? "").replace(/\s+/g, " ").trim();
  return t.length > largo ? t.slice(0, largo - 1) + "…" : t;
}

/**
 * ¿Este contenido está aprobado para lo nacional (y sigue vivo)? Lo usa el
 * detalle de la comunidad para dejar que otra escuela lo LEA. Devuelve el
 * nombre de su escuela, o null.
 */
export function tendenciaNacionalAprobada(db, tipo, id) {
  const tabla = tipo === "publicacion" ? "publicaciones" : tipo === "debate" ? "debates" : null;
  if (!tabla) return null;
  const fila = db.prepare(
    `SELECT i.nombre AS institucion
       FROM tendencias_nacionales tn
       JOIN ${tabla} o ON o.id = tn.objeto_id AND o.eliminado_en IS NULL
       JOIN instituciones i ON i.id = tn.institucion_id
      WHERE tn.objeto_tipo = ? AND tn.objeto_id = ? AND tn.estado = 'aprobada'`
  ).get(tipo, id);
  return fila ? { institucion: fila.institucion } : null;
}

export function registrarTendencias(app, db, motor, notificaciones) {
  const publico = (o) => ({
    tipo: o.tipo,
    id: String(o.id),
    titulo: recortar(o.titulo, 120),
    puntaje: o.puntaje,
    institucion: o.institucion,
    participantes: o.participantes,
    comentarios: o.comentarios,
    aFavor: o.aFavor,
    enContra: o.enContra,
  });

  app.get(
    "/api/comunidad/tendencias",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "tendencias");
      if (!usuario) return;
      const pedido = String(req.query?.alcance ?? "");
      // "todas-las-escuelas" era el nombre anterior de lo nacional.
      const alcance = pedido === "nacional" || pedido === "todas-las-escuelas" ? "nacional" : "mi-escuela";
      const esDireccion = usuario.rol === "admin-academico";

      if (alcance === "nacional") {
        const r = motor.rankingNacional();
        if (!r.activo) return res.json({ alcance, desactivado: true, tendencias: [] });
        return res.json({
          alcance,
          tendencias: r.items.map((o) => ({ ...publico(o), esDeMiEscuela: o.institucionId === usuario.institucionId, estadoNacional: "aprobada" })),
        });
      }

      const r = motor.rankingInstitucional(usuario.institucionId);
      if (!r.activo) return res.json({ alcance, desactivado: true, tendencias: [] });
      const estados = motor.estados(usuario.institucionId);
      res.json({
        alcance,
        tendencias: r.items.slice(0, LARGO_LISTA).map((o) => {
          const estado = estados.get(o.tipo + ":" + o.id)?.estado ?? null;
          return {
            ...publico(o),
            esDeMiEscuela: true,
            // El resto de la comunidad solo ve si ya salió a lo nacional; las
            // propuestas y los descartes son asunto de la dirección.
            estadoNacional: esDireccion ? estado : estado === "aprobada" ? "aprobada" : null,
          };
        }),
      });
    })
  );

  // ── La bandeja de la dirección ──────────────────────────────────────────────
  const filasDe = db.prepare(
    `SELECT tn.id AS fila, tn.objeto_tipo AS tipo, tn.objeto_id AS id, tn.estado, tn.puntaje,
            tn.propuesta_en, tn.decidido_en,
            COALESCE(substr(p.contenido, 1, 140), d.titulo) AS titulo
       FROM tendencias_nacionales tn
       LEFT JOIN publicaciones p ON tn.objeto_tipo = 'publicacion' AND p.id = tn.objeto_id AND p.eliminado_en IS NULL
       LEFT JOIN debates d       ON tn.objeto_tipo = 'debate'      AND d.id = tn.objeto_id AND d.eliminado_en IS NULL
      WHERE tn.institucion_id = ?
        AND (p.id IS NOT NULL OR d.id IS NOT NULL)
      ORDER BY COALESCE(tn.decidido_en, tn.propuesta_en) DESC
      LIMIT 60`
  );

  app.get(
    "/api/comunidad/tendencias/direccion",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "tendencias-direccion");
      if (!usuario) return;
      motor.sincronizarPropuestas(usuario.institucionId);
      const local = motor.rankingInstitucional(usuario.institucionId);
      const ahora = new Map(local.items.map((o, i) => [o.tipo + ":" + o.id, { ...o, posicion: i + 1 }]));
      const nacional = motor.rankingNacional();
      const posicionNacional = new Map(nacional.items.map((o, i) => [o.tipo + ":" + o.id, i + 1]));
      const filas = filasDe.all(usuario.institucionId).map((f) => {
        const clave = f.tipo + ":" + f.id;
        const vivo = ahora.get(clave);
        return {
          tipo: f.tipo,
          id: String(f.id),
          titulo: recortar(f.titulo, 120),
          estado: f.estado,
          puntajeAlProponer: f.puntaje,
          puntajeActual: vivo?.puntaje ?? null,
          posicionEscuela: vivo?.posicion ?? null,
          participantes: vivo?.participantes ?? null,
          posicionNacional: posicionNacional.get(clave) ?? null,
          propuestaEn: f.propuesta_en,
          decididoEn: f.decidido_en,
        };
      });
      res.json({
        propuestas: filas.filter((f) => f.estado === "propuesta"),
        aprobadas: filas.filter((f) => f.estado === "aprobada"),
        descartadas: filas.filter((f) => f.estado === "rechazada" || f.estado === "retirada"),
        reglas: {
          activo: local.activo,
          candidatas: local.parametros.candidatas,
          umbralNacional: local.parametros.umbralNacional,
          nacionalActivo: nacional.activo,
          maxPorEscuela: nacional.parametros.maxPorEscuela,
        },
      });
    })
  );

  // ── La decisión: aprobar, descartar o retirar ───────────────────────────────
  const objetoDe = {
    publicacion: db.prepare(
      `SELECT institucion_id, autor_id, eliminado_en,
              (publicar_en IS NOT NULL AND publicar_en > datetime('now')) AS programada
         FROM publicaciones WHERE id = ?`
    ),
    debate: db.prepare("SELECT institucion_id, autor_id, eliminado_en, 0 AS programada FROM debates WHERE id = ?"),
  };
  const filaDe = db.prepare("SELECT id, estado FROM tendencias_nacionales WHERE objeto_tipo = ? AND objeto_id = ?");
  const guardar = db.prepare(
    `INSERT INTO tendencias_nacionales (institucion_id, objeto_tipo, objeto_id, estado, decidido_por, decidido_en)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT (objeto_tipo, objeto_id) DO UPDATE
        SET estado = excluded.estado, decidido_por = excluded.decidido_por, decidido_en = excluded.decidido_en`
  );
  const registrarLog = db.prepare(
    "INSERT INTO logs_sistema (nivel, mensaje, contexto) VALUES ('info', ?, 'tendencias')"
  );

  app.post(
    "/api/comunidad/tendencias/nacional",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "tendencias-direccion");
      if (!usuario) return;
      const tipo = String(req.body?.tipo ?? "");
      const id = Number(req.body?.id);
      const decision = String(req.body?.decision ?? "");
      if (!objetoDe[tipo] || !Number.isInteger(id)) return res.status(400).json({ error: "Indicá una publicación o un debate." });
      if (!DECISIONES.includes(decision)) return res.status(400).json({ error: "La decisión tiene que ser aprobar, rechazar o retirar." });

      const objeto = objetoDe[tipo].get(id);
      // Contenido de otra escuela: para esta dirección, no existe.
      if (!objeto || objeto.institucion_id !== usuario.institucionId || objeto.eliminado_en) {
        return res.status(404).json({ error: "Ese contenido no existe en tu escuela." });
      }
      if (objeto.programada) return res.status(409).json({ error: "Una publicación programada todavía no salió: no puede ir a lo nacional." });

      const actual = filaDe.get(tipo, id);
      if (decision === "aprobar" && actual?.estado === "aprobada") {
        return res.status(409).json({ error: "Ya es una tendencia nacional." });
      }
      if (decision === "rechazar" && actual?.estado === "aprobada") {
        return res.status(409).json({ error: "Ya salió a lo nacional: usá «Retirar» para sacarla." });
      }
      if (decision === "retirar" && actual?.estado !== "aprobada") {
        return res.status(409).json({ error: "Solo se retira lo que ya está en las tendencias nacionales." });
      }

      const estado = decision === "aprobar" ? "aprobada" : decision === "rechazar" ? "rechazada" : "retirada";
      guardar.run(usuario.institucionId, tipo, id, estado, usuario.id);
      const fila = filaDe.get(tipo, id);

      if (estado === "aprobada" && objeto.autor_id !== usuario.id) {
        notificaciones.crear({
          usuarioId: objeto.autor_id,
          tipo: "tendencia",
          titulo: tipo === "debate" ? "¡Tu debate llegó a las tendencias nacionales!" : "¡Tu publicación llegó a las tendencias nacionales!",
          cuerpo: "La dirección de tu escuela la eligió para mostrarla en todo NEXO (sin tu nombre).",
          objetoTipo: "tendencia",
          objetoId: fila.id,
        });
      }
      registrarLog.run(
        estado === "aprobada" ? "Una dirección llevó una tendencia a lo nacional"
          : estado === "retirada" ? "Una dirección retiró una tendencia nacional"
          : "Una dirección descartó una propuesta nacional"
      );
      res.json({
        estado,
        mensaje: estado === "aprobada" ? "Listo: ya forma parte de las tendencias nacionales."
          : estado === "retirada" ? "Retirada de las tendencias nacionales."
          : "Propuesta descartada. No se volverá a proponer.",
      });
    })
  );
}
