// ============================================================================
// NEXO — Ventanillas del calendario con jerarquía (sección 14.12)
// ----------------------------------------------------------------------------
//   GET    /api/calendario                        → mis ocurrencias en un rango + feriados
//   GET    /api/calendario/destinos               → a quién le puedo mostrar un evento (mi nivel)
//   POST   /api/calendario/revisar                → cuántas personas lo verían y con qué choca
//   POST   /api/calendario/eventos                → crear
//   PUT    /api/calendario/eventos/:id            → editar (serie, "solo este" o "este y los siguientes")
//   DELETE /api/calendario/eventos/:id            → borrar (ídem)
//   POST   /api/calendario/eventos/:id/respuesta  → confirmar asistencia (sí / quizás / no)
//   POST   /api/calendario/eventos/:id/preferencias → ocultarlo de mi calendario, mis recordatorios
//   GET    /api/calendario/eventos/:id/confirmaciones → quién confirmó (quien lo puede editar)
//   GET    /api/calendario/exportar.ics           → mis eventos para otro calendario
//
// QUIÉN VE QUÉ lo decide el servidor (regla de oro 4): un evento llega solo a
// sus destinos, y un evento sin destinos es personal (ni la dirección lo ve).
// QUIÉN PUEDE MOSTRARLE QUÉ A QUIÉN lo decide la jerarquía del genoma
// (servidor/agenda.js): cada nivel al suyo y a los de abajo.
// ============================================================================

import { exigirAcceso, ventanilla } from "./comun.js";
import { algoritmo } from "./genoma.js";
import {
  CATEGORIAS,
  alcanza,
  audienciaDe,
  categoriaDe,
  crearAgenda,
  describirRecurrencia,
  diasEntre,
  esFechaValida,
  etiquetaDestino,
  expandir,
  loVe,
  normalizarColor,
  normalizarEnlace,
  normalizarRecordatorios,
  normalizarRecurrencia,
  permisosDe,
  sumarDias,
  ultimaFecha,
  validarAudiencia,
} from "./agenda.js";

/** Cuántos eventos con destinatarios por mes puede crear el Centro de Estudiantes (Error 8.B.3). */
const LIMITE_MENSUAL_CENTRO = 5;
const RANGO_MAXIMO = 3 * 366;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const CATEGORIAS_PUBLICAS = CATEGORIAS.map(({ id, nombre, color, icono }) => ({ id, nombre, color, icono }));

const json = (texto, defecto) => { try { return JSON.parse(texto); } catch { return defecto; } };
const reglaDe = (texto) => {
  if (!texto) return null;
  const r = normalizarRecurrencia(json(texto, null));
  return r && !r.error ? r : null;
};
/** "AAAA-MM-DD" de hoy en la hora local del servidor (la de la escuela). */
export function hoyLocal(ahora = new Date()) {
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
}
const momento = (fecha, hora) => {
  const [y, m, d] = fecha.split("-").map(Number);
  const [hh, mm] = (hora ?? "08:00").split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm);
};

/**
 * Lee y valida los datos de un evento. Devuelve { error } con el motivo o el
 * objeto listo para guardar. La regla "fin posterior al inicio" (Error 6.E.5)
 * se verifica acá además del CHECK del esquema, para dar un mensaje claro.
 */
function leerDatos(cuerpo, db, usuarioId) {
  const c = cuerpo && typeof cuerpo === "object" ? cuerpo : {};
  const titulo = String(c.titulo ?? "").trim().slice(0, 140);
  if (!titulo) return { error: "El evento necesita un título." };
  const fecha = String(c.fecha ?? "").trim();
  if (!esFechaValida(fecha)) return { error: "La fecha tiene que ser una fecha real (AAAA-MM-DD)." };
  let fechaFin = c.fechaFin ? String(c.fechaFin).trim() : null;
  if (fechaFin !== null) {
    if (!esFechaValida(fechaFin)) return { error: "La fecha de fin no es válida." };
    if (fechaFin < fecha) return { error: "El evento no puede terminar antes de empezar." };
    if (diasEntre(fecha, fechaFin) > 366) return { error: "Un evento puede durar hasta un año." };
    if (fechaFin === fecha) fechaFin = null;
  }
  const todoElDia = c.todoElDia === true;
  const horaInicio = todoElDia || !c.horaInicio ? null : String(c.horaInicio).trim();
  const horaFin = todoElDia || !c.horaFin ? null : String(c.horaFin).trim();
  if ((horaInicio && !HORA.test(horaInicio)) || (horaFin && !HORA.test(horaFin))) return { error: "Las horas tienen que tener el formato HH:MM." };
  if (horaFin && !horaInicio) return { error: "Si el evento tiene hora de fin, también necesita hora de inicio." };
  if (horaInicio && horaFin && !fechaFin && horaFin <= horaInicio) return { error: "La hora de fin no puede ser anterior o igual a la de inicio." };

  const recurrencia = normalizarRecurrencia(c.recurrencia);
  if (recurrencia?.error) return { error: recurrencia.error };
  if (recurrencia?.hasta && recurrencia.hasta < fecha) return { error: "La repetición no puede terminar antes de que empiece el evento." };

  const enlace = normalizarEnlace(c.enlace);
  if (enlace === undefined) return { error: "El enlace tiene que ser una dirección web (https://…)." };

  let archivoId = null;
  if (c.archivoId !== undefined && c.archivoId !== null && c.archivoId !== "") {
    archivoId = Number(c.archivoId);
    const propio = Number.isInteger(archivoId) && db.prepare("SELECT 1 FROM archivos WHERE id = ? AND subido_por = ?").get(archivoId, usuarioId);
    if (!propio) return { error: "Ese adjunto no es válido." };
  }

  return {
    titulo,
    tipo: String(c.tipo ?? "").trim().slice(0, 40) || "evento",
    descripcion: String(c.descripcion ?? "").trim().slice(0, 4000),
    lugar: String(c.lugar ?? "").trim().slice(0, 140) || null,
    enlace,
    color: normalizarColor(c.color),
    fecha,
    fechaFin,
    horaInicio,
    horaFin,
    recurrencia,
    recordatorios: normalizarRecordatorios(c.recordatorios),
    obligatorio: c.obligatorio === true,
    pideConfirmacion: c.pideConfirmacion === true,
    avisar: c.avisar === true,
    archivoId,
  };
}

/** Las capas del formato anterior ({ alcance, cursoId, estudianteId }) en destinos nuevos. */
function audienciaHeredada(visibilidades) {
  if (!Array.isArray(visibilidades)) return undefined;
  const lista = [];
  for (const v of visibilidades) {
    const cursoId = Number(v?.cursoId);
    if (v?.alcance === "todos") lista.push({ tipo: "todos" });
    if (v?.alcance === "curso") lista.push({ tipo: "curso", cursoId, rol: "estudiante" }, { tipo: "curso", cursoId, rol: "familia" });
    if (v?.alcance === "familias-curso") lista.push({ tipo: "curso", cursoId, rol: "familia" });
    if (v?.alcance === "familia-de-estudiante") lista.push({ tipo: "familia-de", usuarioId: Number(v.estudianteId) });
    if (v?.alcance === "familias-todas") lista.push({ tipo: "perfil", valor: "familia" });
    if (v?.alcance === "docentes") for (const p of ["profesor", "preceptor", "admin-academico"]) lista.push({ tipo: "perfil", valor: p });
  }
  return lista;
}

const fechaCorta = (iso) => { const [, m, d] = iso.split("-"); return `${d}/${m}`; };

/** "Hoy a las 15:00", "Mañana", "El 05/10 a las 09:00". */
function cuandoTexto(fecha, hora, ahora = new Date()) {
  const hoy = hoyLocal(ahora);
  const dia = fecha === hoy ? "Hoy" : fecha === sumarDias(hoy, 1) ? "Mañana" : `El ${fechaCorta(fecha)}`;
  return hora ? `${dia} a las ${hora}` : dia;
}

export function registrarEventos(app, db, notificaciones) {
  const agenda = crearAgenda(db);

  const eventosDe = db.prepare(
    `SELECT e.*, u.nombre AS creador, u.rol AS creador_rol, a.nombre_original AS archivo
       FROM eventos e
       JOIN usuarios u ON u.id = e.creador_id
       LEFT JOIN archivos a ON a.id = e.archivo_id
      WHERE e.institucion_id = ?
        AND e.fecha <= ?
        AND (e.recurrencia IS NOT NULL OR COALESCE(e.fecha_fin, e.fecha) >= ?)`
  );
  const eventoPorId = db.prepare(
    `SELECT e.*, u.nombre AS creador, u.rol AS creador_rol, a.nombre_original AS archivo
       FROM eventos e
       JOIN usuarios u ON u.id = e.creador_id
       LEFT JOIN archivos a ON a.id = e.archivo_id
      WHERE e.id = ? AND e.institucion_id = ?`
  );
  const destinosDeEscuela = db.prepare(
    "SELECT d.* FROM evento_destinos d JOIN eventos e ON e.id = d.evento_id WHERE e.institucion_id = ?"
  );
  const destinosDe = db.prepare("SELECT * FROM evento_destinos WHERE evento_id = ?");
  const excepcionesDeEscuela = db.prepare(
    "SELECT x.* FROM evento_excepciones x JOIN eventos e ON e.id = x.evento_id WHERE e.institucion_id = ?"
  );
  const excepcionesDe = db.prepare("SELECT * FROM evento_excepciones WHERE evento_id = ?");
  const participacionesDe = db.prepare("SELECT * FROM evento_participantes WHERE usuario_id = ?");
  const participantesDe = db.prepare("SELECT * FROM evento_participantes WHERE evento_id = ?");
  const feriadosQ = db.prepare("SELECT fecha, nombre FROM feriados ORDER BY fecha");

  const feriados = () => {
    const lista = feriadosQ.all();
    return { lista, conjunto: new Set(lista.map((f) => f.fecha)) };
  };

  const agrupar = (filas) => {
    const m = new Map();
    for (const f of filas) {
      if (!m.has(f.evento_id)) m.set(f.evento_id, []);
      m.get(f.evento_id).push(f);
    }
    return m;
  };
  const mapaExcepciones = (filas) => new Map(filas.map((x) => [x.fecha, { cancelada: x.cancelada === 1, cambios: json(x.cambios, {}) }]));
  const preparar = (fila, destinos, excepciones) => ({ ...fila, regla: reglaDe(fila.recurrencia), destinos, excepciones: mapaExcepciones(excepciones) });

  /** Los eventos de una escuela que pueden tocar el rango, con destinos y excepciones. */
  function cargar(institucionId, desde, hasta) {
    const destinos = agrupar(destinosDeEscuela.all(institucionId));
    const excepciones = agrupar(excepcionesDeEscuela.all(institucionId));
    return eventosDe.all(institucionId, hasta, desde).map((f) => preparar(f, destinos.get(f.id) ?? [], excepciones.get(f.id) ?? []));
  }
  function cargarUno(id, institucionId) {
    const fila = Number.isInteger(id) ? eventoPorId.get(id, institucionId) : null;
    return fila ? preparar(fila, destinosDe.all(id), excepcionesDe.all(id)) : null;
  }

  /** El contexto de quien pide (con su perfil, nivel y vínculos). */
  function contextoDe(e, usuario) {
    return e.porId.get(usuario.id) ?? e.contextoDe({ id: usuario.id, nombre: usuario.nombre, rol: usuario.rol, perfil_clave: usuario.perfilClave });
  }

  /** Edita un evento su creador; la dirección, cualquiera que no sea personal de otra persona. */
  const puedeEditar = (ctx, ev) => ev.creador_id === ctx.id || (ctx.rol === "admin-academico" && ev.destinos.length > 0);

  function vista(e, ctx, ev, oc, participacion, supervision = false) {
    const c = oc.cambios;
    const cat = categoriaDe(ev.tipo);
    const creador = e.porId.get(ev.creador_id);
    const horaInicio = "horaInicio" in c ? c.horaInicio : ev.hora_inicio;
    const horaFin = "horaFin" in c ? c.horaFin : ev.hora_fin;
    return {
      id: ev.regla ? `${ev.id}@${oc.original}` : String(ev.id),
      eventoId: String(ev.id),
      ocurrencia: ev.regla ? oc.original : null,
      titulo: c.titulo ?? ev.titulo,
      tipo: ev.tipo,
      categoria: cat.id,
      color: ev.color ?? cat.color,
      descripcion: c.descripcion ?? ev.descripcion,
      lugar: (c.lugar ?? ev.lugar) || undefined,
      enlace: ev.enlace ?? undefined,
      fecha: oc.fecha,
      fechaFin: oc.fechaFin ?? undefined,
      horaInicio: horaInicio ?? undefined,
      horaFin: horaFin ?? undefined,
      todoElDia: !horaInicio,
      creador: ev.creador,
      creadorId: String(ev.creador_id),
      creadorRol: ev.creador_rol,
      nivel: creador ? { id: creador.nivel.id, nombre: creador.nivel.nombre, indice: creador.nivel.indice } : null,
      esMio: ev.creador_id === ctx.id,
      puedeEditar: puedeEditar(ctx, ev),
      personal: ev.destinos.length === 0,
      audiencia: ev.destinos.map((d) => ({ tipo: d.tipo, etiqueta: etiquetaDestino(e, d) })),
      destinos: ev.creador_id === ctx.id || puedeEditar(ctx, ev)
        ? ev.destinos.map((d) => ({ tipo: d.tipo, valor: d.valor, cursoId: d.curso_id, rol: d.rol, usuarioId: d.usuario_id }))
        : undefined,
      recurrente: Boolean(ev.regla),
      recurrencia: ev.regla,
      recurrenciaTexto: describirRecurrencia(ev.regla, ev.fecha),
      inicioSerie: ev.fecha,
      finSerie: ev.fecha_fin ?? undefined,
      modificada: Object.keys(c).length > 0,
      obligatorio: ev.obligatorio === 1,
      pideConfirmacion: ev.pide_confirmacion === 1,
      miRespuesta: participacion?.respuesta ?? null,
      oculto: participacion?.oculto === 1,
      recordatorios: json(ev.recordatorios, []),
      misRecordatorios: participacion?.recordatorios ? json(participacion.recordatorios, null) : null,
      archivo: ev.archivo_id ? { id: String(ev.archivo_id), nombre: ev.archivo } : null,
      supervision,
    };
  }

  function rango(query) {
    const hoy = hoyLocal();
    let desde = esFechaValida(query.desde) ? query.desde : sumarDias(hoy, -400);
    let hasta = esFechaValida(query.hasta) ? query.hasta : sumarDias(hoy, 500);
    if (hasta < desde) [desde, hasta] = [hasta, desde];
    if (diasEntre(desde, hasta) > RANGO_MAXIMO) hasta = sumarDias(desde, RANGO_MAXIMO);
    return { desde, hasta };
  }

  /** Todas las ocurrencias que esta persona ve en el rango (y, si supervisa, las del resto). */
  function ocurrenciasPara(e, ctx, desde, hasta, { supervisar = false } = {}) {
    const { conjunto } = feriados();
    const participaciones = new Map(participacionesDe.all(ctx.id).map((p) => [p.evento_id, p]));
    const salida = [];
    for (const ev of cargar(e.institucionId, desde, hasta)) {
      const ve = loVe(ctx, ev, ev.destinos);
      const supervision = !ve && supervisar && ev.destinos.length > 0;
      if (!ve && !supervision) continue;
      for (const oc of expandir(ev, desde, hasta, { feriados: conjunto, excepciones: ev.excepciones })) {
        salida.push(vista(e, ctx, ev, oc, participaciones.get(ev.id), supervision));
      }
    }
    return salida.sort((a, b) =>
      a.fecha.localeCompare(b.fecha) ||
      Number(!a.todoElDia) - Number(!b.todoElDia) ||
      (a.horaInicio ?? "").localeCompare(b.horaInicio ?? "") ||
      (a.nivel?.indice ?? 9) - (b.nivel?.indice ?? 9));
  }

  // ── Lectura ────────────────────────────────────────────────────────────────
  app.get(
    "/api/calendario",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "calendario-institucional");
      if (!usuario) return;
      const e = agenda.escuela(usuario.institucionId);
      const ctx = contextoDe(e, usuario);
      const { desde, hasta } = rango(req.query);
      const supervisar = req.query.supervision === "1" && ctx.rol === "admin-academico";
      const permisos = permisosDe(e, ctx);
      res.json({
        // Todos crean eventos (aunque sea solo para sí); a quién se los pueden
        // mostrar depende de su nivel.
        puedeEditar: true,
        puedeCrear: true,
        comparte: permisos.comparte,
        puedeSupervisar: ctx.rol === "admin-academico",
        nivel: { id: ctx.nivel.id, nombre: ctx.nivel.nombre, indice: ctx.nivel.indice, politica: ctx.nivel.politica },
        niveles: e.genoma.jerarquia.niveles.map((n, i) => ({ id: n.id, nombre: n.nombre, indice: i })),
        categorias: CATEGORIAS_PUBLICAS,
        desde,
        hasta,
        eventos: ocurrenciasPara(e, ctx, desde, hasta, { supervisar }),
        feriados: feriados().lista,
      });
    })
  );

  const usadosCentro = db.prepare(
    `SELECT COUNT(*) AS n FROM eventos e
      WHERE e.creador_id = ? AND substr(e.fecha, 1, 7) = ?
        AND EXISTS (SELECT 1 FROM evento_destinos d WHERE d.evento_id = e.id)`
  );

  app.get(
    "/api/calendario/destinos",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "calendario-editar");
      if (!usuario) return;
      const e = agenda.escuela(usuario.institucionId);
      const ctx = contextoDe(e, usuario);
      const p = permisosDe(e, ctx);
      const nivelNombre = (id) => e.genoma.jerarquia.niveles.find((n) => n.id === id)?.nombre ?? "";
      const detalle = (x) => {
        if (x.rol === "estudiante") return [...x.cursosEstudiante].map((c) => e.cursos.get(c)?.nombre).filter(Boolean).join(", ");
        if (x.rol === "familia") return [...x.hijos].map((h) => e.porId.get(h)?.nombre).filter(Boolean).map((n) => `familia de ${n}`).join(", ");
        return x.perfilNombre;
      };
      res.json({
        nivel: { id: ctx.nivel.id, nombre: ctx.nivel.nombre, indice: ctx.nivel.indice, politica: ctx.nivel.politica },
        comparte: p.comparte,
        todos: p.todos,
        niveles: p.niveles.map(({ id, nombre, indice, permitido, politica }) => ({ id, nombre, indice, permitido, politica })),
        perfiles: p.perfiles.map(({ clave, nombre, color, icono, nivel, permitido }) => ({ clave, nombre, color, icono, nivel, nivelNombre: nivelNombre(nivel), permitido })),
        cursos: p.cursos,
        personas: p.personas.map((x) => ({ id: x.id, nombre: x.nombre, rol: x.rol, perfil: x.perfilNombre, nivel: x.nivel.nombre, detalle: detalle(x) })),
        familiasDe: p.familiasDe.map((x) => ({ id: x.id, nombre: x.nombre, detalle: detalle(x) })),
        categorias: CATEGORIAS_PUBLICAS,
        limiteCentro: ctx.rol === "centro-estudiantes"
          ? { limite: LIMITE_MENSUAL_CENTRO, usados: usadosCentro.get(ctx.id, hoyLocal().slice(0, 7)).n }
          : null,
      });
    })
  );

  // ── Revisar antes de guardar: alcance y choques ───────────────────────────
  app.post(
    "/api/calendario/revisar",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "calendario-editar");
      if (!usuario) return;
      const e = agenda.escuela(usuario.institucionId);
      const ctx = contextoDe(e, usuario);
      const datos = leerDatos(req.body, db, usuario.id);
      if (datos.error) return res.status(400).json({ error: datos.error });
      const audiencia = validarAudiencia(e, ctx, req.body?.audiencia);
      if (audiencia.error) return res.status(audiencia.estado).json({ error: audiencia.error });

      const nuevo = { id: -1, creador_id: ctx.id, fecha: datos.fecha, fecha_fin: datos.fechaFin, regla: datos.recurrencia };
      const afectados = e.personas.filter((p) => p.id !== ctx.id && audiencia.lista.some((d) => alcanza(p, d)));
      const idsAfectados = new Set(afectados.map((p) => p.id));
      const excluir = Number(req.body?.excluir);
      const { conjunto } = feriados();
      // Las primeras 20 ocurrencias del evento nuevo contra lo que ya hay.
      const fechas = expandir(nuevo, datos.fecha, sumarDias(datos.fecha, 400), { feriados: conjunto }).slice(0, 20);
      const solapan = (a, b) => !a.horaInicio || !b.horaInicio || (a.horaInicio < (b.horaFin ?? "23:59") && b.horaInicio < (a.horaFin ?? "23:59"));
      const choques = [];
      if (idsAfectados.size && fechas.length) {
        const desde = fechas[0].fecha;
        const hasta = fechas[fechas.length - 1].fechaFin ?? fechas[fechas.length - 1].fecha;
        for (const ev of cargar(e.institucionId, desde, hasta)) {
          if (ev.id === excluir || ev.destinos.length === 0) continue; // lo personal de otros no se mira
          const suyos = audienciaDe(e, ev, ev.destinos).filter((p) => idsAfectados.has(p.id)).length;
          if (!suyos) continue;
          const visible = loVe(ctx, ev, ev.destinos);
          for (const oc of expandir(ev, desde, hasta, { feriados: conjunto, excepciones: ev.excepciones })) {
            const otro = { horaInicio: oc.cambios.horaInicio ?? ev.hora_inicio, horaFin: oc.cambios.horaFin ?? ev.hora_fin };
            const coincide = fechas.some((f) => f.fecha <= (oc.fechaFin ?? oc.fecha) && oc.fecha <= (f.fechaFin ?? f.fecha) && solapan(datos, otro));
            if (!coincide) continue;
            const cat = categoriaDe(ev.tipo);
            const creador = e.porId.get(ev.creador_id);
            choques.push({
              // Lo que no ves, sin título: solo qué tipo de evento es y de qué nivel viene.
              titulo: visible ? oc.cambios.titulo ?? ev.titulo : `${cat.nombre} (${creador?.nivel.nombre ?? "otro nivel"})`,
              categoria: cat.id,
              fecha: oc.fecha,
              horaInicio: otro.horaInicio ?? undefined,
              horaFin: otro.horaFin ?? undefined,
              afectados: suyos,
              visible,
            });
            break;
          }
        }
      }
      res.json({
        personas: afectados.length,
        porNivel: e.genoma.jerarquia.niveles
          .map((n) => ({ nivel: n.nombre, personas: afectados.filter((p) => p.nivel.id === n.id).length }))
          .filter((x) => x.personas > 0),
        ocurrencias: datos.recurrencia ? expandir(nuevo, datos.fecha, sumarDias(datos.fecha, 366), { feriados: conjunto }).length : 1,
        choques: choques.sort((a, b) => b.afectados - a.afectados).slice(0, 8),
      });
    })
  );

  // ── Escritura ──────────────────────────────────────────────────────────────
  const insertarEvento = db.prepare(
    `INSERT INTO eventos (institucion_id, creador_id, titulo, tipo, descripcion, lugar, enlace, color, fecha, fecha_fin,
                          hora_inicio, hora_fin, recurrencia, recordatorios, obligatorio, pide_confirmacion, archivo_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const actualizarEvento = db.prepare(
    `UPDATE eventos SET titulo = ?, tipo = ?, descripcion = ?, lugar = ?, enlace = ?, color = ?, fecha = ?, fecha_fin = ?,
            hora_inicio = ?, hora_fin = ?, recurrencia = ?, recordatorios = ?, obligatorio = ?, pide_confirmacion = ?,
            archivo_id = ?, actualizado_en = datetime('now')
      WHERE id = ?`
  );
  const insertarDestino = db.prepare(
    "INSERT INTO evento_destinos (evento_id, tipo, valor, curso_id, rol, usuario_id) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const borrarDestinos = db.prepare("DELETE FROM evento_destinos WHERE evento_id = ?");
  const borrarEvento = db.prepare("DELETE FROM eventos WHERE id = ?");
  const guardarExcepcion = db.prepare(
    `INSERT INTO evento_excepciones (evento_id, fecha, cancelada, cambios) VALUES (?, ?, ?, ?)
     ON CONFLICT (evento_id, fecha) DO UPDATE SET cancelada = excluded.cancelada, cambios = excluded.cambios`
  );
  const borrarExcepciones = db.prepare("DELETE FROM evento_excepciones WHERE evento_id = ?");
  const borrarExcepcionesDesde = db.prepare("DELETE FROM evento_excepciones WHERE evento_id = ? AND fecha >= ?");
  const moverExcepcionesDesde = db.prepare("UPDATE evento_excepciones SET evento_id = ? WHERE evento_id = ? AND fecha >= ?");
  const cambiarRegla = db.prepare("UPDATE eventos SET recurrencia = ?, actualizado_en = datetime('now') WHERE id = ?");

  const enTransaccion = (fn) => {
    db.exec("BEGIN");
    try {
      const r = fn();
      db.exec("COMMIT");
      return r;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  };

  const filaDe = (d) => [d.titulo, d.tipo, d.descripcion, d.lugar, d.enlace, d.color, d.fecha, d.fechaFin, d.horaInicio, d.horaFin,
    d.recurrencia ? JSON.stringify(d.recurrencia) : null, JSON.stringify(d.recordatorios), d.obligatorio ? 1 : 0, d.pideConfirmacion ? 1 : 0, d.archivoId];
  const escribirDestinos = (eventoId, lista) => {
    for (const d of lista) insertarDestino.run(eventoId, d.tipo, d.valor, d.curso_id, d.rol, d.usuario_id);
  };

  /** Lo que es para otros (obligatorio, confirmación, aviso) no tiene sentido en un evento personal. */
  const ajustarPersonal = (datos, lista) => (lista.length ? datos : { ...datos, obligatorio: false, pideConfirmacion: false, avisar: false });

  function avisarAudiencia(e, ctx, eventoId, datos, lista, titulo) {
    const evento = { creador_id: ctx.id };
    for (const p of audienciaDe(e, evento, lista)) {
      if (p.id === ctx.id) continue;
      notificaciones.crear({
        usuarioId: p.id,
        tipo: "evento",
        titulo,
        cuerpo: `${datos.titulo} · ${cuandoTexto(datos.fecha, datos.horaInicio)} · ${ctx.nombre}`,
        objetoTipo: "evento",
        objetoId: Number(eventoId),
      });
    }
  }

  app.post(
    "/api/calendario/eventos",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "calendario-editar");
      if (!usuario) return;
      const leidos = leerDatos(req.body, db, usuario.id);
      if (leidos.error) return res.status(400).json({ error: leidos.error });
      const e = agenda.escuela(usuario.institucionId);
      const ctx = contextoDe(e, usuario);
      const audiencia = validarAudiencia(e, ctx, req.body?.audiencia ?? audienciaHeredada(req.body?.visibilidades));
      if (audiencia.error) return res.status(audiencia.estado).json({ error: audiencia.error });
      const datos = ajustarPersonal(leidos, audiencia.lista);

      if (ctx.rol === "centro-estudiantes" && audiencia.lista.length) {
        const { n } = usadosCentro.get(ctx.id, datos.fecha.slice(0, 7));
        if (n >= LIMITE_MENSUAL_CENTRO) {
          return res.status(403).json({ error: `El Centro de Estudiantes puede publicar hasta ${LIMITE_MENSUAL_CENTRO} eventos por mes.` });
        }
      }

      const id = enTransaccion(() => {
        const info = insertarEvento.run(usuario.institucionId, usuario.id, ...filaDe(datos));
        escribirDestinos(info.lastInsertRowid, audiencia.lista);
        return Number(info.lastInsertRowid);
      });
      if (datos.avisar) avisarAudiencia(e, ctx, id, datos, audiencia.lista, "Evento nuevo en tu calendario");
      motor.revisarPronto();
      res.status(201).json({ id: String(id) });
    })
  );

  /** El evento, si quien pide puede editarlo; si no, responde y devuelve null. */
  function eventoEditable(req, res, usuario) {
    const e = agenda.escuela(usuario.institucionId);
    const ctx = contextoDe(e, usuario);
    const ev = cargarUno(Number(req.params.id), usuario.institucionId);
    // Lo que no ves no existe (un evento personal ajeno da 404, no 403).
    if (!ev || !(loVe(ctx, ev, ev.destinos) || puedeEditar(ctx, ev))) {
      res.status(404).json({ error: "Ese evento no existe." });
      return null;
    }
    if (!puedeEditar(ctx, ev)) {
      res.status(403).json({ error: "Solo quien creó el evento (o la dirección) lo puede cambiar." });
      return null;
    }
    return { e, ctx, ev };
  }

  /** ¿Esta fecha es una ocurrencia real de la serie? */
  const esOcurrencia = (ev, fecha) =>
    esFechaValida(fecha) && expandir({ ...ev }, fecha, fecha, { feriados: feriados().conjunto }).some((o) => o.original === fecha);

  app.put(
    "/api/calendario/eventos/:id",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "calendario-editar");
      if (!usuario) return;
      const encontrado = eventoEditable(req, res, usuario);
      if (!encontrado) return;
      const { e, ctx, ev } = encontrado;
      const leidos = leerDatos(req.body, db, usuario.id);
      if (leidos.error) return res.status(400).json({ error: leidos.error });

      let lista = ev.destinos.map((d) => ({ tipo: d.tipo, valor: d.valor, curso_id: d.curso_id, rol: d.rol, usuario_id: d.usuario_id }));
      if (req.body?.audiencia !== undefined) {
        const audiencia = validarAudiencia(e, ctx, req.body.audiencia);
        if (audiencia.error) return res.status(audiencia.estado).json({ error: audiencia.error });
        lista = audiencia.lista;
      }
      const datos = ajustarPersonal(leidos, lista);
      const alcance = ["este", "siguientes"].includes(req.body?.alcance) && ev.regla ? req.body.alcance : "serie";
      const ocurrencia = String(req.body?.ocurrencia ?? "");
      if (alcance !== "serie" && !esOcurrencia(ev, ocurrencia)) {
        return res.status(400).json({ error: "Esa fecha no es una de las ocurrencias del evento." });
      }

      let id = ev.id;
      if (alcance === "este") {
        // Solo los campos que cambian respecto de la serie.
        const cambios = {};
        if (datos.titulo !== ev.titulo) cambios.titulo = datos.titulo;
        if (datos.descripcion !== ev.descripcion) cambios.descripcion = datos.descripcion;
        if ((datos.lugar ?? null) !== (ev.lugar ?? null)) cambios.lugar = datos.lugar ?? "";
        if (datos.horaInicio !== ev.hora_inicio) cambios.horaInicio = datos.horaInicio;
        if (datos.horaFin !== ev.hora_fin) cambios.horaFin = datos.horaFin;
        if (datos.fecha !== ocurrencia) cambios.fecha = datos.fecha;
        guardarExcepcion.run(ev.id, ocurrencia, 0, JSON.stringify(cambios));
      } else if (alcance === "siguientes" && ocurrencia > ev.fecha) {
        // Se corta la serie el día anterior y nace otra desde esta ocurrencia.
        id = enTransaccion(() => {
          const regla = { ...ev.regla, hasta: sumarDias(ocurrencia, -1) };
          delete regla.veces;
          cambiarRegla.run(JSON.stringify(regla), ev.id);
          const nueva = datos.recurrencia ? { ...datos.recurrencia } : null;
          if (nueva && ev.regla.veces && nueva.veces === ev.regla.veces) {
            const hechas = expandir(ev, ev.fecha, sumarDias(ocurrencia, -1), { feriados: feriados().conjunto }).length;
            nueva.veces = Math.max(1, ev.regla.veces - hechas);
          }
          const info = insertarEvento.run(usuario.institucionId, ev.creador_id, ...filaDe({ ...datos, recurrencia: nueva }));
          const nuevoId = Number(info.lastInsertRowid);
          escribirDestinos(nuevoId, lista);
          moverExcepcionesDesde.run(nuevoId, ev.id, ocurrencia);
          return nuevoId;
        });
      } else {
        enTransaccion(() => {
          actualizarEvento.run(...filaDe(datos), ev.id);
          // Si cambió el patrón o el inicio, las excepciones viejas ya no calzan.
          if (JSON.stringify(datos.recurrencia) !== JSON.stringify(ev.regla) || datos.fecha !== ev.fecha) borrarExcepciones.run(ev.id);
          borrarDestinos.run(ev.id);
          escribirDestinos(ev.id, lista);
        });
      }
      if (datos.avisar && lista.length) avisarAudiencia(e, ctx, id, datos, lista, "Cambió un evento de tu calendario");
      motor.revisarPronto();
      res.json({ ok: true, id: String(id) });
    })
  );

  app.delete(
    "/api/calendario/eventos/:id",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "calendario-editar");
      if (!usuario) return;
      const encontrado = eventoEditable(req, res, usuario);
      if (!encontrado) return;
      const { ev } = encontrado;
      const alcance = ["este", "siguientes"].includes(req.query.alcance) && ev.regla ? req.query.alcance : "serie";
      const ocurrencia = String(req.query.ocurrencia ?? "");
      if (alcance !== "serie" && !esOcurrencia(ev, ocurrencia)) {
        return res.status(400).json({ error: "Esa fecha no es una de las ocurrencias del evento." });
      }
      if (alcance === "este") {
        guardarExcepcion.run(ev.id, ocurrencia, 1, "{}");
      } else if (alcance === "siguientes" && ocurrencia > ev.fecha) {
        enTransaccion(() => {
          const regla = { ...ev.regla, hasta: sumarDias(ocurrencia, -1) };
          delete regla.veces;
          cambiarRegla.run(JSON.stringify(regla), ev.id);
          borrarExcepcionesDesde.run(ev.id, ocurrencia);
        });
      } else {
        // Destinos, excepciones, confirmaciones y avisos se van en cascada.
        borrarEvento.run(ev.id);
      }
      res.json({ ok: true });
    })
  );

  // ── Lo de cada persona con un evento ──────────────────────────────────────
  const guardarParticipacion = db.prepare(
    `INSERT INTO evento_participantes (evento_id, usuario_id, respuesta, respondido_en, oculto, recordatorios)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (evento_id, usuario_id) DO UPDATE SET
       respuesta = excluded.respuesta, respondido_en = excluded.respondido_en,
       oculto = excluded.oculto, recordatorios = excluded.recordatorios`
  );
  const participacion = db.prepare("SELECT * FROM evento_participantes WHERE evento_id = ? AND usuario_id = ?");

  /** El evento, si quien pide lo ve; si no, 404. */
  function eventoVisible(req, res, usuario) {
    const e = agenda.escuela(usuario.institucionId);
    const ctx = contextoDe(e, usuario);
    const ev = cargarUno(Number(req.params.id), usuario.institucionId);
    if (!ev || !loVe(ctx, ev, ev.destinos)) {
      res.status(404).json({ error: "Ese evento no existe." });
      return null;
    }
    return { e, ctx, ev, actual: participacion.get(ev.id, ctx.id) ?? null };
  }

  const escribirParticipacion = (ev, ctx, actual, cambios) => {
    const p = { respuesta: actual?.respuesta ?? null, respondido_en: actual?.respondido_en ?? null, oculto: actual?.oculto ?? 0, recordatorios: actual?.recordatorios ?? null, ...cambios };
    guardarParticipacion.run(ev.id, ctx.id, p.respuesta, p.respondido_en, p.oculto, p.recordatorios);
  };

  app.post(
    "/api/calendario/eventos/:id/respuesta",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "calendario-institucional");
      if (!usuario) return;
      const v = eventoVisible(req, res, usuario);
      if (!v) return;
      if (!v.ev.pide_confirmacion) return res.status(400).json({ error: "Este evento no pide confirmación." });
      if (v.ev.creador_id === v.ctx.id) return res.status(400).json({ error: "Sos quien organiza el evento." });
      const respuesta = req.body?.respuesta ?? null;
      if (respuesta !== null && !["si", "quizas", "no"].includes(respuesta)) return res.status(400).json({ error: "La respuesta es sí, quizás o no." });
      escribirParticipacion(v.ev, v.ctx, v.actual, { respuesta, respondido_en: respuesta ? new Date().toISOString() : null });
      res.json({ ok: true, respuesta });
    })
  );

  app.post(
    "/api/calendario/eventos/:id/preferencias",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "calendario-institucional");
      if (!usuario) return;
      const v = eventoVisible(req, res, usuario);
      if (!v) return;
      const cambios = {};
      if (req.body?.oculto !== undefined) {
        if (req.body.oculto === true && v.ev.obligatorio) return res.status(400).json({ error: "Es un evento obligatorio: no se puede ocultar." });
        if (req.body.oculto === true && v.ev.creador_id === v.ctx.id) return res.status(400).json({ error: "Un evento propio no se oculta: se borra." });
        cambios.oculto = req.body.oculto === true ? 1 : 0;
      }
      if (req.body?.recordatorios !== undefined) {
        cambios.recordatorios = req.body.recordatorios === null ? null : JSON.stringify(normalizarRecordatorios(req.body.recordatorios));
      }
      escribirParticipacion(v.ev, v.ctx, v.actual, cambios);
      motor.revisarPronto();
      res.json({ ok: true });
    })
  );

  app.get(
    "/api/calendario/eventos/:id/confirmaciones",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "calendario-editar");
      if (!usuario) return;
      const encontrado = eventoEditable(req, res, usuario);
      if (!encontrado) return;
      const { e, ev } = encontrado;
      const respuestas = new Map(participantesDe.all(ev.id).map((p) => [p.usuario_id, p.respuesta]));
      const personas = audienciaDe(e, ev, ev.destinos)
        .filter((p) => p.id !== ev.creador_id)
        .map((p) => ({ id: p.id, nombre: p.nombre, perfil: p.perfilNombre, respuesta: respuestas.get(p.id) ?? null }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      const cuenta = (r) => personas.filter((p) => p.respuesta === r).length;
      res.json({
        resumen: { si: cuenta("si"), quizas: cuenta("quizas"), no: cuenta("no"), pendientes: cuenta(null), total: personas.length },
        personas,
      });
    })
  );

  // ── Exportar a otro calendario (.ics) ─────────────────────────────────────
  const escaparIcs = (t) => String(t ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  const fechaIcs = (iso) => iso.replace(/-/g, "");
  app.get(
    "/api/calendario/exportar.ics",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "calendario-institucional");
      if (!usuario) return;
      const e = agenda.escuela(usuario.institucionId);
      const ctx = contextoDe(e, usuario);
      const { desde, hasta } = rango(req.query);
      const sello = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
      const lineas = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//NEXO//Calendario escolar//ES", "CALSCALE:GREGORIAN", `X-WR-CALNAME:${escaparIcs(e.genoma.identidad.nombre)}`];
      for (const o of ocurrenciasPara(e, ctx, desde, hasta)) {
        if (o.oculto) continue;
        const fin = o.fechaFin ?? o.fecha;
        lineas.push("BEGIN:VEVENT", `UID:${o.id.replace("@", "-")}@nexo`, `DTSTAMP:${sello}`);
        if (o.todoElDia) {
          lineas.push(`DTSTART;VALUE=DATE:${fechaIcs(o.fecha)}`, `DTEND;VALUE=DATE:${fechaIcs(sumarDias(fin, 1))}`);
        } else {
          lineas.push(`DTSTART:${fechaIcs(o.fecha)}T${o.horaInicio.replace(":", "")}00`);
          lineas.push(`DTEND:${fechaIcs(fin)}T${(o.horaFin ?? o.horaInicio).replace(":", "")}00`);
        }
        lineas.push(`SUMMARY:${escaparIcs(o.titulo)}`);
        if (o.descripcion) lineas.push(`DESCRIPTION:${escaparIcs(o.descripcion)}`);
        if (o.lugar) lineas.push(`LOCATION:${escaparIcs(o.lugar)}`);
        if (o.enlace) lineas.push(`URL:${o.enlace}`);
        lineas.push(`CATEGORIES:${escaparIcs(categoriaDe(o.tipo).nombre)}`, "END:VEVENT");
      }
      lineas.push("END:VCALENDAR");
      res.setHeader("Content-Type", "text/calendar; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="calendario-nexo.ics"');
      res.send(lineas.join("\r\n") + "\r\n");
    })
  );

  const motor = crearMotorRecordatorios(db, notificaciones, agenda, { cargar, feriados, participantesDe });
  return motor;
}

// ── Recordatorios ────────────────────────────────────────────────────────────
/**
 * Cada minuto mira las ocurrencias de los próximos días y, cuando llega la hora
 * de un recordatorio (los del evento o los propios de cada persona), avisa una
 * sola vez por persona, ocurrencia y anticipación (tabla evento_avisos). Un
 * evento de todo el día se toma a las 08:00. No manda avisos viejos: si el
 * servidor estuvo apagado, lo que venció hace más de dos horas se saltea.
 */
function crearMotorRecordatorios(db, notificaciones, agenda, { cargar, feriados, participantesDe }) {
  const conRecordatorios = db.prepare(
    `SELECT DISTINCT e.institucion_id FROM eventos e
      WHERE e.recordatorios <> '[]'
         OR EXISTS (SELECT 1 FROM evento_participantes p WHERE p.evento_id = e.id AND p.recordatorios IS NOT NULL AND p.recordatorios <> '[]')`
  );
  const marcar = db.prepare("INSERT OR IGNORE INTO evento_avisos (evento_id, fecha, usuario_id, minutos) VALUES (?, ?, ?, ?)");
  const VENTANA_MS = 2 * 60 * 60 * 1000;
  let pendiente = null;

  function revisar(ahora = new Date()) {
    const hoy = hoyLocal(ahora);
    const desde = sumarDias(hoy, -1);
    const hasta = sumarDias(hoy, 29);
    const { conjunto } = feriados();
    let enviados = 0;
    for (const { institucion_id: institucionId } of conRecordatorios.all()) {
      const e = agenda.escuela(institucionId);
      for (const ev of cargar(institucionId, desde, hasta)) {
        const propios = new Map(participantesDe.all(ev.id).map((p) => [p.usuario_id, p]));
        const porDefecto = json(ev.recordatorios, []);
        if (!porDefecto.length && ![...propios.values()].some((p) => p.recordatorios)) continue;
        const ocurrencias = expandir(ev, desde, hasta, { feriados: conjunto, excepciones: ev.excepciones });
        if (!ocurrencias.length) continue;
        const audiencia = audienciaDe(e, ev, ev.destinos);
        for (const oc of ocurrencias) {
          const hora = "horaInicio" in oc.cambios ? oc.cambios.horaInicio : ev.hora_inicio;
          const inicio = momento(oc.fecha, hora);
          for (const p of audiencia) {
            const propio = propios.get(p.id);
            if (propio?.oculto) continue;
            const minutos = propio?.recordatorios ? json(propio.recordatorios, []) : porDefecto;
            for (const m of minutos) {
              const cuando = inicio.getTime() - m * 60000;
              if (cuando > ahora.getTime() || ahora.getTime() - cuando > VENTANA_MS) continue;
              if (marcar.run(ev.id, oc.original, p.id, m).changes !== 1) continue;
              notificaciones.crear({
                usuarioId: p.id,
                tipo: "recordatorio",
                titulo: `Recordatorio: ${oc.cambios.titulo ?? ev.titulo}`,
                cuerpo: [cuandoTexto(oc.fecha, hora, ahora), oc.cambios.lugar ?? ev.lugar].filter(Boolean).join(" · "),
                objetoTipo: "evento",
                objetoId: ev.id,
              });
              enviados++;
            }
          }
        }
      }
    }
    return enviados;
  }

  return {
    revisar,
    /** Después de crear o editar: revisar enseguida (por si el recordatorio ya venció). */
    revisarPronto() {
      if (pendiente) return;
      pendiente = setTimeout(() => {
        pendiente = null;
        try { revisar(); } catch (error) { console.error("Recordatorios del calendario:", error); }
      }, 50);
      pendiente.unref?.();
    },
    programar() {
      try { revisar(); } catch (error) { console.error("Recordatorios del calendario:", error); }
      const t = setInterval(() => {
        try { revisar(); } catch (error) { console.error("Recordatorios del calendario:", error); }
      }, 60 * 1000);
      t.unref?.();
      return t;
    },
  };
}

// ── Limpieza de eventos viejos (Error 6.E.7) ────────────────────────────────
/**
 * Los eventos de una escuela que ya terminaron hace más de `meses` meses. Un
 * evento que se repite cuenta desde su última ocurrencia; si se repite para
 * siempre, no se limpia nunca.
 */
export function eventosViejos(db, institucionId, meses) {
  const { c: corte } = db.prepare("SELECT date('now', ?) AS c").get(`-${Math.round(meses)} months`);
  const conjunto = new Set(db.prepare("SELECT fecha FROM feriados").all().map((f) => f.fecha));
  return db.prepare("SELECT id, fecha, fecha_fin, recurrencia FROM eventos WHERE institucion_id = ? AND fecha < ?")
    .all(institucionId, corte)
    .filter((ev) => {
      const fin = ultimaFecha({ ...ev, regla: reglaDe(ev.recurrencia) }, { feriados: conjunto });
      return fin !== null && fin < corte;
    })
    .map((ev) => ev.id);
}

/**
 * Elimina en firme los eventos viejos de cada escuela según su algoritmo
 * «Limpieza de eventos viejos» (12 meses por defecto; el Maestro o la dirección
 * pueden cambiarlo o apagarlo). Se corre al arrancar y una vez por día.
 */
export function limpiarEventosViejos(db) {
  const borrar = db.prepare("DELETE FROM eventos WHERE id = ?");
  let total = 0;
  for (const { institucion_id: institucionId } of db.prepare("SELECT DISTINCT institucion_id FROM eventos").all()) {
    const regla = algoritmo(db, institucionId, "calendario.limpieza");
    if (!regla.activo) continue;
    for (const id of eventosViejos(db, institucionId, regla.parametros.meses)) {
      borrar.run(id); // destinos, excepciones, confirmaciones y avisos se van en cascada
      total++;
    }
  }
  return total;
}

export function programarLimpiezaEventos(db) {
  limpiarEventosViejos(db); // una pasada al arrancar
  const UN_DIA = 24 * 60 * 60 * 1000;
  const t = setInterval(() => limpiarEventosViejos(db), UN_DIA);
  t.unref?.(); // que este temporizador no impida que el proceso termine
  return t;
}
