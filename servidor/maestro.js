// ============================================================================
// NEXO — Ventanillas del perfil MAESTRO (super administrador de la plataforma)
// ----------------------------------------------------------------------------
// El Maestro es el antiguo "administrador de plataforma" con su estudio
// completo. Crea INSTANCIAS (escuelas) y diseña su genoma: módulos, checklist de
// funciones, orden, algoritmos, colores, perfiles propios y flujos de nodos.
// Nunca escribe código: conecta nodos y aprueba decisiones por probabilidad.
//
// Lo que sigue sin ver, igual que antes (sección 5.9): la vida interna de una
// escuela. Del lado de las personas solo ve TOTALES (cuántos usuarios hay por
// perfil), nunca nombres, notas ni mensajes.
//
//   GET  /api/maestro/catalogo                 → módulos, funciones, algoritmos, nodos…
//   GET  /api/maestro/instancias               → el universo de instancias
//   GET  /api/maestro/instancias/:id           → genoma + versiones + actividad de flujos
//   PUT  /api/maestro/instancias/:id/genoma    → guardar una nueva versión
//   POST /api/maestro/instancias/:id/restaurar → volver a una versión anterior
//   POST /api/maestro/instancias               → la Forja: escuela + genoma + cuentas
//   POST /api/maestro/proponer                 → genoma por probabilidad (sin IA)
//   POST /api/maestro/grafo-nativo             → el algoritmo nativo como grafo
//   POST /api/maestro/evaluar                  → correr un grafo una vez (valores por nodo)
//   POST /api/maestro/simular                  → Monte Carlo
//   POST /api/maestro/aprobar                  → simular y emitir la aprobación
// ============================================================================

import { usuarioDeLaSesion } from "./sesiones.js";
import { generarContrasenaInicial, hashearContrasena } from "./contrasenas.js";
import { ventanilla } from "./comun.js";
import { aplicarPlantillaEn } from "./plataforma.js";
import {
  catalogoPublico,
  normalizarGenoma,
  genomaPorDefecto,
  leerGenoma,
  versionDeGenoma,
  guardarGenoma,
  proponerGenoma,
  combinatoria,
  grafoNativo,
  opcionesDeGrafo,
  validarGrafo,
  huellaGrafo,
  slotPorId,
  configNacional,
  guardarConfigNacional,
  MODULOS,
  ErrorGenoma,
  ErrorGrafo,
} from "./genoma.js";
import { compilarGrafo, simularGrafo, TIPOS_NODO } from "./nodos.js";

function exigirMaestro(db, req, res) {
  const usuario = usuarioDeLaSesion(db, req);
  if (!usuario) {
    res.status(401).json({ error: "No hay sesión abierta." });
    return null;
  }
  if (usuario.rol !== "administrador") {
    res.status(403).json({ error: "Solo el perfil Maestro entra al estudio." });
    return null;
  }
  return usuario;
}

/** Envuelve una ventanilla del Maestro: los errores de diseño vuelven como 400. */
function deMaestro(db, manejador) {
  return ventanilla((req, res) => {
    const usuario = exigirMaestro(db, req, res);
    if (!usuario) return;
    try {
      manejador(req, res, usuario);
    } catch (error) {
      if (error instanceof ErrorGenoma || error instanceof ErrorGrafo) {
        return res.status(400).json({ error: error.message });
      }
      throw error;
    }
  });
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function resumenGenoma(genoma) {
  const visibles = MODULOS.filter((m) => !genoma.modulos[m.id].oculto).length;
  return {
    tema: genoma.tema,
    identidad: genoma.identidad,
    modulosVisibles: visibles,
    modulosOcultos: MODULOS.length - visibles,
    perfiles: genoma.perfiles.length,
    perfilesPropios: genoma.perfiles.filter((p) => !p.predeterminado).length,
    funcionesApagadas: Object.values(genoma.modulos).reduce((s, m) => s + Object.keys(m.funciones).length, 0),
    algoritmosPersonalizados: Object.values(genoma.algoritmos).filter((a) => a.variante === "personalizado").length,
    algoritmosApagados: Object.values(genoma.algoritmos).filter((a) => !a.activo).length,
    flujos: genoma.flujos.length,
    flujosActivos: genoma.flujos.filter((f) => f.activo).length,
    combinatoria: combinatoria(genoma),
  };
}

/** Rangos por defecto para simular un algoritmo: los del catálogo. */
function rangosDe(modo, slotId, crudos) {
  const rangos = {};
  if (modo === "algoritmo") {
    const def = slotPorId(slotId);
    for (const v of def?.entradas ?? []) rangos[v.id] = v.rango;
  }
  if (crudos && typeof crudos === "object") {
    for (const [k, v] of Object.entries(crudos).slice(0, 40)) {
      if (Array.isArray(v) && v.length === 2 && v.every((x) => Number.isFinite(Number(x)))) {
        rangos[String(k).slice(0, 60)] = [Number(v[0]), Number(v[1])];
      }
    }
  }
  return rangos;
}

export function registrarMaestro(app, db) {
  const institucion = db.prepare("SELECT id, nombre, ciclo_lectivo, creado_en FROM instituciones WHERE id = ?");
  const todas = db.prepare(
    `SELECT i.id, i.nombre, i.ciclo_lectivo, i.creado_en,
            (SELECT COUNT(*) FROM usuarios u WHERE u.institucion_id = i.id AND u.estado = 'activo') AS usuarios,
            (SELECT COUNT(*) FROM cursos c WHERE c.institucion_id = i.id) AS cursos,
            g.version, g.actualizado_en
       FROM instituciones i
       LEFT JOIN instancia_genomas g ON g.institucion_id = i.id
      ORDER BY i.creado_en DESC, i.id DESC`
  );
  const registrarLog = db.prepare(
    "INSERT INTO logs_sistema (nivel, mensaje, contexto) VALUES ('info', ?, 'maestro')"
  );

  app.get("/api/maestro/catalogo", deMaestro(db, (_req, res) => {
    res.json(catalogoPublico());
  }));

  app.get("/api/maestro/instancias", deMaestro(db, (_req, res) => {
    res.json({
      instancias: todas.all().map((i) => ({
        id: String(i.id),
        nombre: i.nombre,
        cicloLectivo: i.ciclo_lectivo,
        creadoEn: i.creado_en,
        usuarios: i.usuarios,
        cursos: i.cursos,
        version: i.version ?? 0,
        actualizadoEn: i.actualizado_en ?? null,
        genoma: resumenGenoma(leerGenoma(db, i.id)),
      })),
    });
  }));

  const versiones = db.prepare(
    `SELECT version, nota, autor_rol, creado_en FROM genoma_versiones
      WHERE institucion_id = ? ORDER BY version DESC LIMIT 40`
  );
  const actividadFlujos = db.prepare(
    `SELECT flujo_id, COUNT(*) AS disparos, SUM(acciones) AS acciones, MAX(creado_en) AS ultimo
       FROM flujo_ejecuciones
      WHERE institucion_id = ? AND creado_en >= datetime('now', '-30 days')
      GROUP BY flujo_id`
  );
  const usuariosPorPerfil = db.prepare(
    `SELECT rol, perfil_clave, COUNT(*) AS n FROM usuarios
      WHERE institucion_id = ? AND estado <> 'papelera'
      GROUP BY rol, perfil_clave`
  );

  function conteoPorPerfil(institucionId, genoma) {
    const filas = usuariosPorPerfil.all(institucionId);
    const claves = new Set(genoma.perfiles.map((p) => p.clave));
    const r = Object.fromEntries(genoma.perfiles.map((p) => [p.clave, 0]));
    for (const f of filas) {
      const clave = f.perfil_clave && claves.has(f.perfil_clave) ? f.perfil_clave : f.rol;
      if (clave in r) r[clave] += f.n;
    }
    return r;
  }

  function idDeInstancia(req, res) {
    const id = Number(req.params.id);
    const fila = Number.isInteger(id) ? institucion.get(id) : null;
    if (!fila) {
      res.status(404).json({ error: "Esa instancia no existe." });
      return null;
    }
    return fila;
  }

  app.get("/api/maestro/instancias/:id", deMaestro(db, (req, res) => {
    const inst = idDeInstancia(req, res);
    if (!inst) return;
    const genoma = leerGenoma(db, inst.id);
    res.json({
      institucion: { id: String(inst.id), nombre: inst.nombre, cicloLectivo: inst.ciclo_lectivo, creadoEn: inst.creado_en },
      genoma,
      version: versionDeGenoma(db, inst.id),
      versiones: versiones.all(inst.id).map((v) => ({ version: v.version, nota: v.nota, autorRol: v.autor_rol, creadoEn: v.creado_en })),
      actividad: actividadFlujos.all(inst.id).map((a) => ({
        flujoId: a.flujo_id, disparos: a.disparos, acciones: a.acciones ?? 0, ultimo: a.ultimo,
      })),
      usuariosPorPerfil: conteoPorPerfil(inst.id, genoma),
      resumen: resumenGenoma(genoma),
    });
  }));

  // Un perfil personalizado con personas asignadas no se puede borrar: esas
  // cuentas se quedarían sin diseño. Primero hay que reasignarlas.
  function verificarPerfilesQuitados(institucionId, anterior, nuevo) {
    const conteos = conteoPorPerfil(institucionId, anterior);
    for (const p of anterior.perfiles) {
      if (p.predeterminado) continue;
      if (!nuevo.perfiles.some((x) => x.clave === p.clave) && conteos[p.clave] > 0) {
        throw new ErrorGenoma(`El perfil «${p.nombre}» tiene ${conteos[p.clave]} persona(s) asignada(s): la dirección tiene que reasignarlas antes de quitarlo.`);
      }
      const nuevoP = nuevo.perfiles.find((x) => x.clave === p.clave);
      if (nuevoP && nuevoP.arquetipo !== p.arquetipo && conteos[p.clave] > 0) {
        throw new ErrorGenoma(`El perfil «${p.nombre}» tiene personas asignadas: no se le puede cambiar el arquetipo.`);
      }
    }
  }

  app.put("/api/maestro/instancias/:id/genoma", deMaestro(db, (req, res, usuario) => {
    const inst = idDeInstancia(req, res);
    if (!inst) return;
    const genoma = normalizarGenoma(req.body?.genoma, { estricto: true, nombreInstitucion: inst.nombre });
    verificarPerfilesQuitados(inst.id, leerGenoma(db, inst.id), genoma);
    let version;
    try {
      version = guardarGenoma(db, inst.id, genoma, {
        usuarioId: usuario.id,
        autorRol: "maestro",
        nota: String(req.body?.nota ?? "").slice(0, 200) || "Cambios del Maestro",
        versionBase: req.body?.versionBase,
      });
    } catch (error) {
      if (error instanceof ErrorGenoma) return res.status(409).json({ error: error.message });
      throw error;
    }
    registrarLog.run(`Genoma actualizado: ${genoma.identidad.nombre} (versión ${version})`);
    res.json({ version, genoma: leerGenoma(db, inst.id), resumen: resumenGenoma(genoma) });
  }));

  const versionGuardada = db.prepare(
    "SELECT genoma FROM genoma_versiones WHERE institucion_id = ? AND version = ?"
  );

  app.post("/api/maestro/instancias/:id/restaurar", deMaestro(db, (req, res, usuario) => {
    const inst = idDeInstancia(req, res);
    if (!inst) return;
    const numero = Number(req.body?.version);
    const fila = Number.isInteger(numero) ? versionGuardada.get(inst.id, numero) : null;
    if (!fila) return res.status(404).json({ error: "Esa versión no existe." });
    const genoma = normalizarGenoma(JSON.parse(fila.genoma), { estricto: false, nombreInstitucion: inst.nombre });
    verificarPerfilesQuitados(inst.id, leerGenoma(db, inst.id), genoma);
    const version = guardarGenoma(db, inst.id, genoma, {
      usuarioId: usuario.id,
      autorRol: "maestro",
      nota: `Restaurada la versión ${numero}`,
    });
    registrarLog.run(`Genoma restaurado: ${genoma.identidad.nombre} (de la versión ${numero})`);
    res.json({ version, genoma: leerGenoma(db, inst.id) });
  }));

  // ── La Forja: una escuela nueva, con su genoma y sus cuentas, de un golpe ──
  const buscarEmail = db.prepare("SELECT id FROM usuarios WHERE email = ?");
  const plantillaExiste = db.prepare("SELECT id FROM plantillas WHERE id = ?");

  app.post("/api/maestro/instancias", async (req, res) => {
    try {
      const usuario = exigirMaestro(db, req, res);
      if (!usuario) return;

      let genoma;
      try {
        genoma = normalizarGenoma(req.body?.genoma ?? genomaPorDefecto(), { estricto: true });
      } catch (error) {
        if (error instanceof ErrorGenoma || error instanceof ErrorGrafo) return res.status(400).json({ error: error.message });
        throw error;
      }
      const nombre = genoma.identidad.nombre.trim();
      if (!nombre || nombre === "Nueva instancia") {
        return res.status(400).json({ error: "Poné un nombre a la instancia antes de forjarla." });
      }
      const ciclo = Number(req.body?.cicloLectivo);
      if (!Number.isInteger(ciclo) || ciclo < 2000 || ciclo > 2100) {
        return res.status(400).json({ error: "El ciclo lectivo tiene que ser un año válido." });
      }
      const dirNombre = String(req.body?.direccion?.nombre ?? "").trim().slice(0, 80);
      const dirEmail = String(req.body?.direccion?.email ?? "").trim().toLowerCase();
      if (!dirNombre) return res.status(400).json({ error: "Escribí el nombre de quien dirige la escuela." });
      if (!EMAIL.test(dirEmail)) return res.status(400).json({ error: "El correo de la dirección no es válido." });

      const semilla = req.body?.cuentasSemilla === true;
      if (semilla && !genoma.identidad.dominio) {
        return res.status(400).json({ error: "Para crear cuentas semilla, definí el dominio de la escuela (ej. belgrano.nexo.edu)." });
      }
      const plantillaId = req.body?.plantillaId ? Number(req.body.plantillaId) : null;
      if (plantillaId !== null && !plantillaExiste.get(plantillaId)) {
        return res.status(404).json({ error: "Esa plantilla no existe." });
      }

      // Las cuentas: la dirección siempre; una por perfil si se pidió.
      // La cuenta de la dirección ES la cuenta del perfil de dirección: no se le
      // suma otra "semilla" de ese mismo perfil.
      const perfilDireccion = genoma.perfiles.find((p) => p.clave === "admin-academico");
      const cuentas = [{ perfil: perfilDireccion, etiqueta: `${perfilDireccion?.nombre ?? "Dirección"} · dirección`, nombre: dirNombre, email: dirEmail, rol: "admin-academico", perfilClave: null }];
      if (semilla) {
        for (const p of genoma.perfiles) {
          if (p.clave === "admin-academico") continue;
          const email = `${p.clave}@${genoma.identidad.dominio}`;
          if (email === dirEmail) continue;
          cuentas.push({ perfil: p, nombre: `${p.nombre} · cuenta semilla`, email, rol: p.arquetipo, perfilClave: p.predeterminado ? null : p.clave });
        }
      }
      const vistos = new Set();
      for (const c of cuentas) {
        if (vistos.has(c.email)) return res.status(409).json({ error: `El correo ${c.email} aparece dos veces.` });
        vistos.add(c.email);
        if (buscarEmail.get(c.email)) return res.status(409).json({ error: `Ya existe una cuenta con el correo ${c.email}.` });
      }
      for (const c of cuentas) {
        c.contrasena = generarContrasenaInicial(c.nombre);
        c.hash = await hashearContrasena(c.contrasena);
      }

      let institucionId;
      let version;
      db.exec("BEGIN");
      try {
        institucionId = Number(db.prepare("INSERT INTO instituciones (nombre, ciclo_lectivo) VALUES (?, ?)").run(nombre, ciclo).lastInsertRowid);
        const insertar = db.prepare(
          `INSERT INTO usuarios (institucion_id, email, hash_contrasena, nombre, rol, perfil_clave, primer_ingreso)
           VALUES (?, ?, ?, ?, ?, ?, 1)`
        );
        for (const c of cuentas) insertar.run(institucionId, c.email, c.hash, c.nombre, c.rol, c.perfilClave);
        if (plantillaId !== null) aplicarPlantillaEn(db, institucionId, plantillaId);
        version = guardarGenoma(db, institucionId, genoma, {
          usuarioId: usuario.id,
          autorRol: "maestro",
          nota: "Instancia forjada",
          enTransaccion: true,
        });
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }

      const r = resumenGenoma(genoma);
      registrarLog.run(`Instancia forjada: ${nombre} (${r.modulosVisibles} módulos visibles, ${r.perfiles} perfiles, ${r.flujosActivos} flujos activos)`);
      res.status(201).json({
        id: String(institucionId),
        version,
        resumen: r,
        credenciales: cuentas.map((c) => ({
          perfil: c.etiqueta ?? c.perfil?.nombre ?? c.rol,
          color: c.perfil?.color ?? "#ffffff",
          nombre: c.nombre,
          email: c.email,
          contrasena: c.contrasena,
        })),
        mensaje: "Instancia forjada. Estas contraseñas se muestran una sola vez.",
      });
    } catch (error) {
      console.error("Error forjando una instancia", error);
      res.status(500).json({ error: "La cocina no pudo forjar la instancia." });
    }
  });

  // ── Tendencias nacionales: el algoritmo de plataforma ──────────────────────
  // Uno solo para todas las escuelas (si cada una lo calibrara, podría inflar
  // sus números). Lo que ve el Maestro de la actividad: solo totales.
  const totalesNacionales = db.prepare(
    `SELECT estado, COUNT(*) AS n, COUNT(DISTINCT institucion_id) AS escuelas
       FROM tendencias_nacionales GROUP BY estado`
  );
  function estadisticasNacionales() {
    const r = { aprobadas: 0, propuestas: 0, descartadas: 0, escuelasConAprobadas: 0 };
    for (const f of totalesNacionales.all()) {
      if (f.estado === "aprobada") { r.aprobadas = f.n; r.escuelasConAprobadas = f.escuelas; }
      else if (f.estado === "propuesta") r.propuestas = f.n;
      else r.descartadas += f.n;
    }
    return r;
  }

  app.get("/api/maestro/tendencias-nacionales", deMaestro(db, (_req, res) => {
    res.json({ config: configNacional(db), estadisticas: estadisticasNacionales() });
  }));

  app.put("/api/maestro/tendencias-nacionales", deMaestro(db, (req, res) => {
    const usuario = usuarioDeLaSesion(db, req);
    const config = guardarConfigNacional(db, req.body?.config, usuario?.id ?? null);
    registrarLog.run(`Algoritmo de tendencias nacionales actualizado (${config.activo ? config.variante : "apagado"})`);
    res.json({ config, estadisticas: estadisticasNacionales() });
  }));

  // ── Revisión antes de forjar o guardar ─────────────────────────────────────
  // Lo que va a quedar (totales y combinatoria) y, si algo impide guardarlo, el
  // motivo: así la pantalla de revisión avisa ANTES del botón final.
  app.post("/api/maestro/resumen", deMaestro(db, (req, res) => {
    let error = null;
    let genoma;
    try {
      genoma = normalizarGenoma(req.body?.genoma, { estricto: true });
    } catch (e) {
      if (!(e instanceof ErrorGenoma || e instanceof ErrorGrafo)) throw e;
      error = e.message;
      genoma = normalizarGenoma(req.body?.genoma, { estricto: false });
    }
    res.json({ resumen: resumenGenoma(genoma), error });
  }));

  // ── Generador por probabilidad ─────────────────────────────────────────────
  app.post("/api/maestro/proponer", deMaestro(db, (req, res) => {
    const semilla = Math.abs(Math.round(Number(req.body?.semilla))) % 2147483647 || 1;
    const base = req.body?.base ? normalizarGenoma(req.body.base, { estricto: false }) : undefined;
    res.json(proponerGenoma({ necesidades: req.body?.necesidades ?? {}, semilla, base }));
  }));

  app.post("/api/maestro/grafo-nativo", deMaestro(db, (req, res) => {
    const grafo = grafoNativo(String(req.body?.slot ?? ""), req.body?.parametros);
    if (!grafo) return res.status(400).json({ error: "Ese algoritmo no se expresa como grafo." });
    res.json({ grafo, huella: huellaGrafo(grafo) });
  }));

  function grafoDelPedido(req) {
    const modo = req.body?.modo === "flujo" ? "flujo" : "algoritmo";
    const slotId = String(req.body?.slot ?? "");
    const genoma = req.body?.genoma ? normalizarGenoma(req.body.genoma, { estricto: false }) : undefined;
    const grafo = validarGrafo(req.body?.grafo, opcionesDeGrafo(modo, { slotId, genoma }));
    return { modo, slotId, grafo };
  }

  // Una sola corrida, con valores concretos: el editor la usa para mostrar el
  // número que viaja por cada cable.
  app.post("/api/maestro/evaluar", deMaestro(db, (req, res) => {
    const { modo, grafo } = grafoDelPedido(req);
    const valores = req.body?.valores && typeof req.body.valores === "object" ? req.body.valores : {};
    const num = (k, d = 0) => (Number.isFinite(Number(valores[k])) ? Number(valores[k]) : d);
    const disparadores = new Set(
      grafo.nodos.filter((n) => TIPOS_NODO.get(n.tipo).categoria === "disparador").map((n) => n.id)
    );
    const evaluar = compilarGrafo(grafo);
    const r = modo === "flujo"
      ? evaluar({ disparadores, hora: num("hora", 10), diaSemana: num("diaSemana", 1), metrica: (id) => num("metrica:" + id, 0) })
      : evaluar({ entradas: Object.fromEntries(Object.keys(valores).map((k) => [k, num(k)])) });
    res.json({
      salida: r.salida,
      valores: r.valores,
      acciones: r.acciones.map((a) => ({ nodoId: a.nodoId, tipo: a.tipo, valor: a.valor })),
    });
  }));

  app.post("/api/maestro/simular", deMaestro(db, (req, res) => {
    const { modo, slotId, grafo } = grafoDelPedido(req);
    res.json(simularGrafo(grafo, {
      modo,
      rangos: rangosDe(modo, slotId, req.body?.rangos),
      iteraciones: req.body?.iteraciones ?? 2000,
      semilla: Number(req.body?.semilla) || 7,
    }));
  }));

  // Aprobar = simular con una semilla fija y muchas iteraciones, y sellar el
  // resultado con la huella del grafo. Si después se toca un solo nodo, la
  // huella cambia y la aprobación deja de valer.
  app.post("/api/maestro/aprobar", deMaestro(db, (req, res) => {
    const { modo, slotId, grafo } = grafoDelPedido(req);
    const simulacion = simularGrafo(grafo, {
      modo,
      rangos: rangosDe(modo, slotId, req.body?.rangos),
      iteraciones: 5000,
      semilla: 20260,
    });
    res.json({
      aprobacion: {
        huella: huellaGrafo(grafo),
        probabilidad: simulacion.probabilidad,
        media: simulacion.media,
        iteraciones: simulacion.iteraciones,
        aprobadoEn: new Date().toISOString(),
      },
      // El grafo tal como lo entiende el servidor (datos saneados): el estudio
      // se queda con este, así la huella aprobada coincide al guardar.
      grafo,
      simulacion,
    });
  }));
}
