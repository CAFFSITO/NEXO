// ============================================================================
// NEXO — Motor de flujos de nodos (perfil Maestro)
// ----------------------------------------------------------------------------
// Un flujo es una "función" que el Maestro arma conectando nodos: cuando pasa
// algo en una escuela (alguien publica, llega una queja, un estudiante entrega)
// o llega cierta hora, un pulso recorre el grafo y, si las condiciones y las
// puertas de probabilidad lo dejan pasar, ejecuta acciones (avisar a alguien,
// dejar una marca en el historial).
//
// Garantías:
//   · Solo corren flujos ACTIVOS y APROBADOS (el genoma ya lo exige al guardar).
//   · Cada flujo tiene un tope de ejecuciones por hora: un grafo mal pensado no
//     puede inundar de avisos a una escuela.
//   · Un evento anónimo (la queja) nunca expone a quien lo provocó.
//   · Lo que se registra son totales y valores, nunca personas.
//   · Un error dentro de un flujo jamás tira abajo el pedido que lo disparó.
// ============================================================================

import { leerGenoma, METRICAS, EVENTOS } from "./genoma.js";
import { compilarGrafo, sano } from "./nodos.js";

const NOMBRE_EVENTO = new Map(EVENTOS.map((e) => [e.id, e.nombre]));
const MAX_DESTINATARIOS = 300;

export function crearMotorFlujos(db, notificaciones) {
  const consultasMetrica = new Map(METRICAS.map((m) => [m.id, db.prepare(m.sql)]));
  const recientes = db.prepare(
    `SELECT COUNT(*) AS n FROM flujo_ejecuciones
      WHERE institucion_id = ? AND flujo_id = ? AND creado_en >= datetime('now', '-1 hour')`
  );
  const registrar = db.prepare(
    `INSERT INTO flujo_ejecuciones (institucion_id, flujo_id, disparador, acciones, detalle)
     VALUES (?, ?, ?, ?, ?)`
  );
  const deRol = db.prepare(
    `SELECT id FROM usuarios WHERE institucion_id = ? AND rol = ? AND estado = 'activo' LIMIT ${MAX_DESTINATARIOS}`
  );
  const dePerfilBase = db.prepare(
    `SELECT id FROM usuarios
      WHERE institucion_id = ? AND rol = ? AND estado = 'activo'
        AND (perfil_clave IS NULL OR perfil_clave = rol)
      LIMIT ${MAX_DESTINATARIOS}`
  );
  const dePerfil = db.prepare(
    `SELECT id FROM usuarios
      WHERE institucion_id = ? AND rol = ? AND perfil_clave = ? AND estado = 'activo'
      LIMIT ${MAX_DESTINATARIOS}`
  );
  const anotarFallo = db.prepare(
    "INSERT INTO logs_sistema (nivel, mensaje, contexto) VALUES ('aviso', ?, 'flujos')"
  );

  // Los grafos compilados viven mientras viva el genoma (al guardarse uno
  // nuevo, el objeto cambia y se recompila solo).
  const compilados = new WeakMap();
  function flujosDe(genoma) {
    let lista = compilados.get(genoma);
    if (!lista) {
      lista = genoma.flujos
        .filter((f) => f.activo && f.aprobacion)
        .map((f) => ({ ...f, evaluar: compilarGrafo(f.grafo) }));
      compilados.set(genoma, lista);
    }
    return lista;
  }

  function destinatarios(institucionId, genoma, destino, actor) {
    if (destino === "actor") return actor ? [actor.id] : [];
    if (destino === "direccion") return deRol.all(institucionId, "admin-academico").map((f) => f.id);
    if (destino.startsWith("arquetipo:")) return deRol.all(institucionId, destino.slice(10)).map((f) => f.id);
    if (destino.startsWith("perfil:")) {
      const clave = destino.slice(7);
      const perfil = genoma.perfiles.find((p) => p.clave === clave);
      if (!perfil) return [];
      return (perfil.predeterminado
        ? dePerfilBase.all(institucionId, perfil.arquetipo)
        : dePerfil.all(institucionId, perfil.arquetipo, clave)
      ).map((f) => f.id);
    }
    return [];
  }

  function rellenar(plantilla, valores) {
    return String(plantilla ?? "").replace(/\{(valor|hora|evento)\}/g, (_, k) => valores[k] ?? "");
  }

  function ejecutar(institucionId, genoma, flujo, { disparadores, evento, actor }) {
    try {
      if (recientes.get(institucionId, flujo.id).n >= flujo.limiteHora) return null;
      const ahora = new Date();
      const memo = new Map();
      const resultado = flujo.evaluar({
        disparadores,
        hora: ahora.getHours(),
        diaSemana: ((ahora.getDay() + 6) % 7) + 1,
        metrica: (id, dias) => {
          const clave = id + "|" + dias;
          if (!memo.has(clave)) {
            const consulta = consultasMetrica.get(id);
            const ventana = `-${Math.max(1, Math.min(90, Math.round(sano(dias)) || 7))} days`;
            memo.set(clave, consulta ? consulta.get(institucionId, ventana).n : 0);
          }
          return memo.get(clave);
        },
      });
      if (resultado.acciones.length === 0) return resultado;

      const hora = `${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`;
      let avisos = 0;
      for (const accion of resultado.acciones) {
        if (accion.tipo !== "notificar") continue;
        const valores = {
          valor: String(Math.round(sano(accion.valor) * 100) / 100),
          hora,
          evento: NOMBRE_EVENTO.get(evento) ?? "horario programado",
        };
        const titulo = rellenar(accion.datos.titulo, valores) || "Aviso automático";
        const cuerpo = rellenar(accion.datos.cuerpo, valores);
        for (const usuarioId of destinatarios(institucionId, genoma, accion.datos.destino, actor)) {
          notificaciones.crear({ usuarioId, tipo: "flujo", titulo, cuerpo });
          avisos++;
        }
      }
      registrar.run(
        institucionId,
        flujo.id,
        evento,
        resultado.acciones.length,
        JSON.stringify({
          avisos,
          acciones: resultado.acciones.map((a) => ({
            tipo: a.tipo,
            etiqueta: a.datos.etiqueta ?? a.datos.titulo ?? "",
            valor: Math.round(sano(a.valor) * 100) / 100,
          })),
        })
      );
      return resultado;
    } catch (error) {
      console.error("Error ejecutando el flujo " + flujo.id, error);
      try {
        anotarFallo.run(`Un flujo falló y se salteó (${flujo.nombre})`);
      } catch {
        // Si ni siquiera se puede anotar, no hay nada más que hacer.
      }
      return null;
    }
  }

  /** Un evento real de una escuela (lo llama la guardia al terminar un pedido). */
  function emitir(eventoId, { institucionId, actor }) {
    if (institucionId === null || institucionId === undefined) return;
    let genoma;
    try {
      genoma = leerGenoma(db, institucionId);
    } catch (error) {
      console.error("No se pudo leer el genoma para los flujos", error);
      return;
    }
    for (const flujo of flujosDe(genoma)) {
      const disparadores = new Set(
        flujo.grafo.nodos.filter((n) => n.tipo === "disparador" && n.datos.evento === eventoId).map((n) => n.id)
      );
      if (disparadores.size) ejecutar(institucionId, genoma, flujo, { disparadores, evento: eventoId, actor });
    }
  }

  // ── El reloj: flujos con «Todos los días a…» ───────────────────────────────
  const yaCorrieron = new Set();
  let diaActual = "";
  const institucionesConGenoma = db.prepare("SELECT institucion_id FROM instancia_genomas");

  function tic() {
    const ahora = new Date();
    const fecha = ahora.toISOString().slice(0, 10);
    if (fecha !== diaActual) {
      yaCorrieron.clear();
      diaActual = fecha;
    }
    const hhmm = `${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`;
    const dia = ((ahora.getDay() + 6) % 7) + 1;
    for (const { institucion_id: institucionId } of institucionesConGenoma.all()) {
      let genoma;
      try {
        genoma = leerGenoma(db, institucionId);
      } catch {
        continue;
      }
      for (const flujo of flujosDe(genoma)) {
        const relojes = flujo.grafo.nodos.filter(
          (n) => n.tipo === "reloj" && n.datos.hora === hhmm && n.datos.dias.includes(dia)
        );
        if (!relojes.length) continue;
        const clave = `${institucionId}|${flujo.id}|${hhmm}`;
        if (yaCorrieron.has(clave)) continue;
        yaCorrieron.add(clave);
        ejecutar(institucionId, genoma, flujo, {
          disparadores: new Set(relojes.map((n) => n.id)),
          evento: "reloj",
          actor: null,
        });
      }
    }
  }

  function iniciarReloj() {
    const t = setInterval(tic, 20_000);
    t.unref?.();
    return t;
  }

  return { emitir, iniciarReloj, tic };
}
