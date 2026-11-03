// ============================================================================
// NEXO — Modo edición de la dirección
// ----------------------------------------------------------------------------
// El Maestro diseña cada instancia; la dirección de la escuela puede retocarla
// desde adentro sin escribir una línea de código:
//
//   · la JERARQUÍA del menú: secciones con nombre, qué módulo va en cuál y en
//     qué orden;
//   · los MÓDULOS: ocultarlos o volver a mostrarlos (para toda la escuela o para
//     un perfil), su nombre y su ícono, y el checklist de sus funciones;
//   · sus ALGORITMOS: encenderlos, apagarlos y calibrar sus perillas, o elegir
//     el diseño de nodos que el Maestro dejó aprobado;
//   · la JERARQUÍA de perfiles: los niveles de la escuela (nombre, a quién le
//     muestra cosas cada uno) y en qué nivel está cada perfil. La dirección
//     queda siempre arriba.
//
// Lo que NO toca: la identidad y los colores, crear o borrar perfiles, los
// flujos ni los grafos de nodos (eso es del Maestro), y nunca borra un módulo
// (no se puede: solo se ocultan). Cada guardado es una versión nueva del genoma
// firmada por la dirección, con la lista de cambios como nota.
//
//   GET  /api/instancia/edicion               → todo lo editable + catálogo + historial
//   POST /api/instancia/edicion/revisar       → qué cambiaría y qué conviene mirar
//   PUT  /api/instancia/edicion               → guardar (versión optimista)
//   POST /api/instancia/edicion/vista-previa  → un algoritmo con valores sin guardar,
//                                               corrido sobre los datos REALES de la escuela
// ============================================================================

import { exigirAcceso, ventanilla, antiguedadEnHoras, hoyISO } from "./comun.js";
import {
  ALGORITMOS,
  CAPACIDADES,
  MODULOS,
  ErrorGenoma,
  catalogoPublico,
  guardarGenoma,
  leerGenoma,
  moduloPorId,
  normalizarGenoma,
  perfilDeUsuario,
  puntuadorDeConfig,
  resolverParaUsuario,
  versionDeGenoma,
  grafoNativo,
} from "./genoma.js";
import { simularGrafo } from "./nodos.js";
import { calcularRacha } from "./objetivos.js";
import { eventosViejos } from "./eventos.js";

const PAGINA = "modulos-institucion";
const ALGORITMO_POR_ID = new Map(ALGORITMOS.map((a) => [a.id, a]));
const LARGO_VISTA = 8;

const objeto = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
const formato = (n) => (Math.round(Number(n) * 100) / 100).toLocaleString("es-AR");

/**
 * Lleva lo que mandó la vidriera al genoma actual, campo por campo y solo en lo
 * que la dirección puede tocar. Todo lo demás (identidad, tema, perfiles
 * nuevos, flujos, grafos) queda como estaba aunque venga en el pedido.
 */
function aplicarCambios(actual, cuerpo) {
  const g = structuredClone(actual);
  if (cuerpo.personalizacion !== undefined) {
    const p = objeto(cuerpo.personalizacion);
    // Dirección configura su instalación; el registro de extensiones lo diseña Maestro.
    g.personalizacion = { ...g.personalizacion };
    for (const clave of ["institucion", "perfiles", "academico", "retencion", "evidencias"]) {
      if (p[clave] !== undefined) g.personalizacion[clave] = p[clave];
    }
  }
  if (Array.isArray(cuerpo.secciones)) g.secciones = cuerpo.secciones;

  const cm = objeto(cuerpo.modulos);
  for (const m of MODULOS) {
    const c = cm[m.id];
    if (!c || typeof c !== "object") continue;
    const d = g.modulos[m.id];
    for (const k of ["oculto", "orden", "etiqueta", "icono", "seccion", "funciones"]) {
      if (c[k] !== undefined) d[k] = c[k];
    }
  }

  // Perfiles: solo su inicio y cómo ven cada módulo. Crear, borrar o renombrar
  // perfiles es del Maestro.
  const cp = objeto(cuerpo.perfiles);
  for (const p of g.perfiles) {
    const c = cp[p.clave];
    if (!c || typeof c !== "object") continue;
    if (c.inicio !== undefined) p.inicio = c.inicio;
    if (c.modulos !== undefined) p.modulos = objeto(c.modulos);
  }

  // Jerarquía: niveles y en cuál está cada perfil (la normalización deja a la
  // dirección arriba y repara lo que no exista).
  if (cuerpo.jerarquia && typeof cuerpo.jerarquia === "object") {
    g.jerarquia = {
      niveles: Array.isArray(cuerpo.jerarquia.niveles) ? cuerpo.jerarquia.niveles : g.jerarquia.niveles,
      perfiles: { ...g.jerarquia.perfiles, ...objeto(cuerpo.jerarquia.perfiles) },
    };
  }

  // Capacidades: qué perfiles pueden subir multimedia, fijar, etc. (la
  // normalización descarta perfiles que no existen o no pueden tenerla).
  const cc = objeto(cuerpo.capacidades);
  g.capacidades = { ...(g.capacidades ?? {}) };
  for (const cap of CAPACIDADES) if (Array.isArray(cc[cap.id])) g.capacidades[cap.id] = cc[cap.id];

  // Algoritmos: encendido, perillas y variante. El grafo y su aprobación son
  // los del Maestro: si se pide "personalizado" sin un diseño aprobado, la
  // normalización estricta lo rechaza.
  const ca = objeto(cuerpo.algoritmos);
  for (const a of ALGORITMOS) {
    const c = ca[a.id];
    if (!c || typeof c !== "object") continue;
    const d = g.algoritmos[a.id];
    if (c.activo !== undefined) d.activo = c.activo !== false;
    if (c.parametros !== undefined) d.parametros = { ...d.parametros, ...objeto(c.parametros) };
    if (c.variante !== undefined) d.variante = c.variante === "personalizado" ? "personalizado" : "nativo";
  }
  return g;
}

/** El genoma que quedaría con estos cambios, ya validado (lanza ErrorGenoma). */
function borradorDe(actual, cuerpo) {
  return normalizarGenoma(aplicarCambios(actual, objeto(cuerpo)), { estricto: true, nombreInstitucion: actual.identidad.nombre });
}

const nombreModulo = (genoma, id) => genoma.modulos[id]?.etiqueta || moduloPorId(id)?.nombre || id;
const ordenDelMenu = (genoma) => MODULOS.map((m) => m.id).sort((a, b) => genoma.modulos[a].orden - genoma.modulos[b].orden || 0);

/** La lista legible de lo que cambia entre dos genomas (va como nota de la versión). */
export function describirCambios(antes, despues) {
  const cambios = [];
  const agregar = (icono, texto) => cambios.push({ icono, texto });
  for (const [clave, etiqueta] of Object.entries({ institucion: "Preferencias de la institución", perfiles: "Preferencias por perfil", academico: "Rango de años académicos", retencion: "Conservación de datos", evidencias: "Fichas de evidencia" })) {
    if (JSON.stringify(antes.personalizacion?.[clave]) !== JSON.stringify(despues.personalizacion?.[clave])) agregar("tune", etiqueta);
  }
  const nombreSeccion = (genoma, id) => (id ? genoma.secciones.find((s) => s.id === id)?.nombre ?? "Mi espacio" : "Mi espacio");

  // Secciones
  const previas = new Map(antes.secciones.map((s) => [s.id, s]));
  const nuevas = new Map(despues.secciones.map((s) => [s.id, s]));
  for (const s of despues.secciones) {
    const a = previas.get(s.id);
    if (!a) agregar("create_new_folder", `Nueva sección «${s.nombre}»`);
    else if (a.nombre !== s.nombre) agregar("drive_file_rename_outline", `La sección «${a.nombre}» pasa a llamarse «${s.nombre}»`);
    else if (a.icono !== s.icono) agregar("interests", `Nuevo ícono para la sección «${s.nombre}»`);
  }
  for (const s of antes.secciones) {
    if (!nuevas.has(s.id)) agregar("folder_off", `Se quita la sección «${s.nombre}» (sus módulos vuelven a Mi espacio)`);
  }
  const comunes = (lista, otras) => lista.filter((s) => otras.has(s.id)).map((s) => s.id).join(",");
  if (comunes(antes.secciones, nuevas) !== comunes(despues.secciones, previas)) agregar("low_priority", "Nuevo orden de las secciones");

  // Módulos de la escuela
  for (const m of MODULOS) {
    const a = antes.modulos[m.id];
    const d = despues.modulos[m.id];
    const nombre = nombreModulo(despues, m.id);
    if (a.oculto !== d.oculto) agregar(d.oculto ? "visibility_off" : "visibility", `${d.oculto ? "Se oculta" : "Vuelve a verse"} «${nombre}» para toda la escuela`);
    if (a.etiqueta !== d.etiqueta) agregar("drive_file_rename_outline", `«${a.etiqueta || m.nombre}» pasa a llamarse «${d.etiqueta || m.nombre}»`);
    else if (a.icono !== d.icono) agregar("interests", `Nuevo ícono para «${nombre}»`);
    // Un submódulo acompaña a su padre: su sección no es una decisión aparte.
    if (a.seccion !== d.seccion && !m.padre) agregar("drive_file_move", `«${nombre}» pasa a la sección ${nombreSeccion(despues, d.seccion)}`);
    for (const f of m.funciones) {
      const off = (g) => g.modulos[m.id].funciones[f.id] === false;
      if (off(antes) !== off(despues)) agregar(off(despues) ? "toggle_off" : "toggle_on", `${off(despues) ? "Se apaga" : "Se enciende"} «${f.nombre}» (${nombre})`);
    }
  }
  if (ordenDelMenu(antes).join(",") !== ordenDelMenu(despues).join(",")) agregar("swap_vert", "Nuevo orden de los módulos en el menú");

  // Por perfil
  for (const p of despues.perfiles) {
    const a = antes.perfiles.find((x) => x.clave === p.clave);
    if (!a) continue;
    let ordenPropio = false;
    let nombrePropio = false;
    for (const m of MODULOS) {
      const am = a.modulos[m.id] ?? {};
      const dm = p.modulos[m.id] ?? {};
      const nombre = nombreModulo(despues, m.id);
      if (Boolean(am.oculto) !== Boolean(dm.oculto)) agregar(dm.oculto ? "visibility_off" : "visibility", `${dm.oculto ? "Se oculta" : "Vuelve a verse"} «${nombre}» para ${p.nombre}`);
      for (const f of m.funciones) {
        const off = (x) => x.funciones?.[f.id] === false;
        if (off(am) !== off(dm)) agregar(off(dm) ? "toggle_off" : "toggle_on", `«${f.nombre}» ${off(dm) ? "se apaga" : "se enciende"} para ${p.nombre}`);
      }
      if (am.orden !== undefined && dm.orden === undefined) ordenPropio = true;
      if ((am.etiqueta && !dm.etiqueta) || (am.icono && !dm.icono)) nombrePropio = true;
    }
    if (ordenPropio) agregar("swap_vert", `${p.nombre} pasa a usar el orden del menú de la escuela`);
    if (nombrePropio) agregar("badge", `${p.nombre} pasa a usar los nombres de la escuela`);
    if (a.inicio !== p.inicio) agregar("home", p.inicio ? `${p.nombre} entra por «${nombreModulo(despues, p.inicio)}»` : `${p.nombre} vuelve a entrar por su pantalla habitual`);
  }

  // Jerarquía
  const POLITICA = { "nivel-y-abajo": "comparte con su nivel y los de abajo", abajo: "comparte solo con los de abajo", personal: "solo crea eventos personales" };
  const nivelesAntes = new Map(antes.jerarquia.niveles.map((n) => [n.id, n]));
  const nivelesDespues = new Map(despues.jerarquia.niveles.map((n) => [n.id, n]));
  for (const n of despues.jerarquia.niveles) {
    const a = nivelesAntes.get(n.id);
    if (!a) agregar("add_circle", `Nuevo nivel en la jerarquía: «${n.nombre}»`);
    else {
      if (a.nombre !== n.nombre) agregar("drive_file_rename_outline", `El nivel «${a.nombre}» pasa a llamarse «${n.nombre}»`);
      if (a.politica !== n.politica) agregar("share", `«${n.nombre}» ahora ${POLITICA[n.politica]}`);
    }
  }
  for (const n of antes.jerarquia.niveles) if (!nivelesDespues.has(n.id)) agregar("remove_circle", `Se quita el nivel «${n.nombre}»`);
  const ordenNiveles = (g) => g.jerarquia.niveles.map((n) => n.id).filter((id) => nivelesAntes.has(id) && nivelesDespues.has(id)).join(",");
  if (ordenNiveles(antes) !== ordenNiveles(despues)) agregar("low_priority", "Nuevo orden de los niveles");
  for (const p of despues.perfiles) {
    const de = antes.jerarquia.perfiles[p.clave];
    const a = despues.jerarquia.perfiles[p.clave];
    if (de && de !== a) agregar("swap_vert", `${p.nombre} pasa al nivel «${nivelesDespues.get(a)?.nombre ?? a}»`);
  }

  // Capacidades
  for (const cap of CAPACIDADES) {
    const a = new Set(antes.capacidades?.[cap.id] ?? []);
    const d = new Set(despues.capacidades?.[cap.id] ?? []);
    for (const p of despues.perfiles) {
      if (d.has(p.clave) && !a.has(p.clave)) agregar("add_moderator", `${p.nombre} ahora puede: ${cap.nombre.toLowerCase()}`);
      if (a.has(p.clave) && !d.has(p.clave)) agregar("remove_moderator", `${p.nombre} ya no puede: ${cap.nombre.toLowerCase()}`);
    }
  }

  // Algoritmos
  for (const def of ALGORITMOS) {
    const a = antes.algoritmos[def.id];
    const d = despues.algoritmos[def.id];
    if (a.activo !== d.activo) agregar(d.activo ? "power" : "power_off", `${d.activo ? "Se enciende" : "Se apaga"} el algoritmo «${def.nombre}»`);
    if (a.variante !== d.variante) {
      agregar("account_tree", `«${def.nombre}» usa ${d.variante === "personalizado" ? "el diseño de nodos del Maestro" : "su versión nativa"}`);
    }
    const perillas = def.parametros
      .filter((p) => a.parametros[p.id] !== d.parametros[p.id])
      .map((p) => `${p.nombre} ${formato(a.parametros[p.id])} → ${formato(d.parametros[p.id])}`);
    if (perillas.length) agregar("tune", `«${def.nombre}»: ${perillas.join(" · ")}`);
  }
  return cambios;
}

/** Lo que conviene mirar antes de guardar (no frena nada). */
function advertenciasDe(despues, antes, usuario) {
  const avisos = [];
  for (const p of despues.perfiles) {
    const r = resolverParaUsuario(despues, { rol: p.arquetipo, perfilClave: p.clave });
    if (r.visibles.size === 0) avisos.push(`«${p.nombre}» no vería ningún módulo: solo le quedarían sus notificaciones y su cuenta.`);
  }
  // La propia dirección: el modo edición nunca se oculta, pero puede dejar de ver otras pantallas.
  const yo = { rol: usuario.rol, perfilClave: usuario.perfilClave };
  const antesYo = resolverParaUsuario(antes, yo).visibles;
  const pierdo = [...antesYo].filter((id) => !resolverParaUsuario(despues, yo).visibles.has(id));
  if (pierdo.length) {
    avisos.push(`Vos (${perfilDeUsuario(despues, yo).nombre}) dejarías de ver: ${pierdo.map((id) => `«${nombreModulo(despues, id)}»`).join(", ")}. Lo podés volver a mostrar desde acá.`);
  }
  for (const m of MODULOS.filter((x) => !x.padre)) {
    const hijos = MODULOS.filter((h) => h.padre === m.id);
    if (hijos.length && despues.modulos[m.id].oculto && !antes.modulos[m.id].oculto) {
      avisos.push(`${hijos.map((h) => `«${nombreModulo(despues, h.id)}»`).join(" y ")} dependen de «${nombreModulo(despues, m.id)}»: también dejan de verse.`);
    }
  }
  for (const def of ALGORITMOS) {
    if (antes.algoritmos[def.id].activo && !despues.algoritmos[def.id].activo) avisos.push(`Sin «${def.nombre}»: ${def.alDesactivar}`);
  }
  // Jerarquía: quién sube al nivel de arriba (le muestra eventos a toda la
  // escuela) y quién se queda solo con eventos personales.
  const arriba = despues.jerarquia.niveles[0].id;
  const subenArriba = despues.perfiles.filter((p) => despues.jerarquia.perfiles[p.clave] === arriba && antes.jerarquia.perfiles[p.clave] !== arriba);
  if (subenArriba.length) avisos.push(`${subenArriba.map((p) => `«${p.nombre}»`).join(", ")} ${subenArriba.length === 1 ? "queda" : "quedan"} en el nivel de arriba: podrán mostrarle eventos a toda la escuela, dirección incluida.`);
  for (const n of despues.jerarquia.niveles) {
    const antesNivel = antes.jerarquia.niveles.find((x) => x.id === n.id);
    if (n.politica === "personal" && antesNivel?.politica !== "personal") {
      const quienes = despues.perfiles.filter((p) => despues.jerarquia.perfiles[p.clave] === n.id).map((p) => p.nombre);
      if (quienes.length) avisos.push(`En «${n.nombre}» (${quienes.join(", ")}) solo se podrán crear eventos personales; los que ya mostraron a otros siguen como están.`);
    }
  }
  return avisos;
}

export function registrarEdicion(app, db, motorTendencias) {
  const historial = db.prepare(
    `SELECT v.version, v.nota, v.autor_rol, v.creado_en, u.nombre AS autor
       FROM genoma_versiones v
       LEFT JOIN usuarios u ON u.id = v.creado_por
      WHERE v.institucion_id = ?
      ORDER BY v.version DESC
      LIMIT 12`
  );
  const registrarLog = db.prepare("INSERT INTO logs_sistema (nivel, mensaje, contexto) VALUES ('info', ?, 'instancia')");

  function vista(institucionId) {
    const genoma = leerGenoma(db, institucionId);
    const catalogo = catalogoPublico();
    return {
      version: versionDeGenoma(db, institucionId),
      escuela: { nombre: genoma.identidad.nombre, lema: genoma.identidad.lema, icono: genoma.identidad.icono },
      tema: genoma.tema,
      personalizacion: genoma.personalizacion,
      secciones: genoma.secciones,
      modulos: genoma.modulos,
      jerarquia: genoma.jerarquia,
      capacidades: genoma.capacidades,
      perfiles: genoma.perfiles.map(({ clave, nombre, arquetipo, color, icono, predeterminado, inicio, modulos }) => ({
        clave, nombre, arquetipo, color, icono, predeterminado, inicio, modulos,
      })),
      // El grafo no viaja: la dirección no lo edita. Solo sabe si hay un diseño
      // del Maestro listo para usar.
      algoritmos: Object.fromEntries(ALGORITMOS.map((a) => {
        const c = genoma.algoritmos[a.id];
        return [a.id, { activo: c.activo, variante: c.variante, parametros: c.parametros, disenoMaestro: Boolean(c.grafo && c.aprobacion) }];
      })),
      catalogo: { modulos: catalogo.modulos, algoritmos: catalogo.algoritmos, capacidades: catalogo.capacidades },
      historial: historial.all(institucionId).map((h) => ({
        version: h.version,
        nota: h.nota,
        autorRol: h.autor_rol,
        autor: h.autor_rol === "maestro" ? "Maestro de NEXO" : h.autor_rol === "sistema" ? "NEXO" : h.autor ?? "Dirección",
        creadoEn: h.creado_en,
      })),
    };
  }

  app.get(
    "/api/instancia/edicion",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, PAGINA);
      if (!usuario) return;
      res.json(vista(usuario.institucionId));
    })
  );

  app.post(
    "/api/instancia/edicion/revisar",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, PAGINA);
      if (!usuario) return;
      const actual = leerGenoma(db, usuario.institucionId);
      let despues;
      try {
        despues = borradorDe(actual, req.body);
      } catch (error) {
        if (error instanceof ErrorGenoma) return res.status(400).json({ error: error.message });
        throw error;
      }
      res.json({ cambios: describirCambios(actual, despues), advertencias: advertenciasDe(despues, actual, usuario) });
    })
  );

  app.put(
    "/api/instancia/edicion",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, PAGINA);
      if (!usuario) return;
      const cuerpo = objeto(req.body);
      if (cuerpo.version === undefined || cuerpo.version === null) {
        return res.status(400).json({ error: "Falta la versión sobre la que editaste." });
      }
      const actual = leerGenoma(db, usuario.institucionId);
      let despues;
      try {
        despues = borradorDe(actual, cuerpo);
      } catch (error) {
        if (error instanceof ErrorGenoma) return res.status(400).json({ error: error.message });
        throw error;
      }
      const cambios = describirCambios(actual, despues);
      if (cambios.length === 0) return res.status(400).json({ error: "No hay cambios para guardar." });

      const propia = String(cuerpo.nota ?? "").trim();
      const resumen = cambios.slice(0, 3).map((c) => c.texto).join(" · ") + (cambios.length > 3 ? ` y ${cambios.length - 3} cambios más` : "");
      try {
        const version = guardarGenoma(db, usuario.institucionId, despues, {
          usuarioId: usuario.id,
          autorRol: "direccion",
          nota: propia ? `${propia} — ${resumen}` : `Modo edición: ${resumen}`,
          versionBase: cuerpo.version,
        });
        registrarLog.run(`La dirección editó su instancia (${cambios.length} cambios, versión ${version})`);
        res.json({ version, cambios, edicion: vista(usuario.institucionId) });
      } catch (error) {
        // Solo queda un motivo: alguien (el Maestro u otra dirección) guardó en el medio.
        if (error instanceof ErrorGenoma) {
          return res.status(409).json({ error: "Alguien guardó cambios en la instancia mientras editabas. Recargá para ver su versión antes de guardar la tuya.", codigo: "version" });
        }
        throw error;
      }
    })
  );

  // ── Vista previa con datos reales ──────────────────────────────────────────
  const publicaciones = db.prepare(
    `SELECT p.id, p.contenido, p.creado_en, p.publicar_en, p.fijado_en, u.rol AS autor_rol,
            (SELECT COUNT(*) FROM votos v WHERE v.objeto_tipo = 'publicacion' AND v.objeto_id = p.id AND v.valor = 1) AS a_favor,
            (SELECT COUNT(*) FROM votos v WHERE v.objeto_tipo = 'publicacion' AND v.objeto_id = p.id AND v.valor = -1) AS en_contra,
            (SELECT COUNT(*) FROM comentarios c WHERE c.objeto_tipo = 'publicacion' AND c.objeto_id = p.id AND c.eliminado_en IS NULL) AS comentarios
       FROM publicaciones p
       JOIN usuarios u ON u.id = p.autor_id
      WHERE p.institucion_id = ?
        AND p.eliminado_en IS NULL
        AND (p.publicar_en IS NULL OR p.publicar_en <= datetime('now'))
      ORDER BY p.creado_en DESC
      LIMIT 60`
  );
  const recursos = db.prepare(
    `SELECT r.id, r.titulo, r.creado_en,
            (SELECT COUNT(*) FROM votos v WHERE v.objeto_tipo = 'recurso' AND v.objeto_id = r.id AND v.valor = 1) AS a_favor,
            (SELECT COUNT(*) FROM votos v WHERE v.objeto_tipo = 'recurso' AND v.objeto_id = r.id AND v.valor = -1) AS en_contra
       FROM recursos r
      WHERE r.institucion_id = ? AND r.estado = 'aprobado' AND r.eliminado_en IS NULL
      ORDER BY r.creado_en DESC
      LIMIT 60`
  );
  const enPapelera = db.prepare(
    `SELECT julianday('now') - julianday(eliminado_en) AS dias FROM usuarios
      WHERE institucion_id = ? AND estado = 'papelera' AND eliminado_en IS NOT NULL`
  );
  const habitos = db.prepare(
    `SELECT h.id FROM habitos h JOIN usuarios u ON u.id = h.estudiante_id
      WHERE u.institucion_id = ? AND h.archivado_en IS NULL AND u.estado = 'activo'`
  );
  const registros = db.prepare("SELECT fecha FROM habito_registros WHERE habito_id = ? ORDER BY fecha DESC");

  /** Un ranking antes/después: puestos, puntajes y cuánto se movió cada cosa. */
  function compararRankings(antes, despues, extra = () => ({})) {
    const puesto = new Map(antes.map((o, i) => [o.clave, i + 1]));
    return despues.slice(0, LARGO_VISTA).map((o, i) => ({
      clave: o.clave,
      titulo: o.titulo,
      detalle: o.detalle,
      antes: puesto.get(o.clave) ?? null,
      despues: i + 1,
      puntaje: o.puntaje,
      ...extra(o, i),
    }));
  }

  function rankingFeed(filas, config) {
    const puntuar = config.activo ? puntuadorDeConfig("comunidad.orden-feed", config) : null;
    const ahora = Date.now();
    const lista = filas.map((f) => ({
      clave: "publicacion:" + f.id,
      titulo: String(f.contenido).replace(/\s+/g, " ").slice(0, 90),
      detalle: `${f.a_favor} a favor · ${f.comentarios} comentarios${f.fijado_en ? " · fijada" : ""}`,
      fijada: f.fijado_en !== null,
      creado: String(f.creado_en),
      puntaje: puntuar ? Math.round(puntuar({
        votosAFavor: f.a_favor,
        votosEnContra: f.en_contra,
        comentarios: f.comentarios,
        horas: antiguedadEnHoras(f.publicar_en ?? f.creado_en, ahora),
        esDireccion: f.autor_rol === "admin-academico" ? 1 : 0,
      }) * 100) / 100 : null,
    }));
    return lista.sort((a, b) =>
      Number(b.fijada) - Number(a.fijada) || (puntuar ? b.puntaje - a.puntaje : 0) || b.creado.localeCompare(a.creado));
  }

  function rankingTendencias(institucionId, config) {
    if (!config.activo) return [];
    const p = config.parametros;
    const puntuar = puntuadorDeConfig("comunidad.tendencias", config);
    return motorTendencias.senales({ institucionId, ventanaDias: p.ventanaDias, vidaMedia: p.vidaMedia })
      .filter((o) => o.participantes >= p.minParticipantes)
      .map((o) => ({
        clave: o.tipo + ":" + o.id,
        titulo: o.titulo,
        detalle: `${o.tipo === "debate" ? "Debate" : "Publicación"} · ${o.participantes} personas · pulso ${formato(o.pulso)}`,
        participantes: o.participantes,
        id: o.id,
        puntaje: Math.round(puntuar(o) * 100) / 100,
      }))
      .filter((o) => o.puntaje > p.minimo)
      .sort((a, b) => b.puntaje - a.puntaje || b.participantes - a.participantes || b.id - a.id);
  }

  function rankingCatalogo(filas, config) {
    const puntuar = config.activo ? puntuadorDeConfig("biblioteca.orden-catalogo", config) : null;
    const ahora = Date.now();
    return filas
      .map((r) => ({
        clave: "recurso:" + r.id,
        titulo: r.titulo,
        detalle: `${r.a_favor} a favor · ${r.en_contra} en contra`,
        creado: String(r.creado_en),
        puntaje: puntuar ? Math.round(puntuar({ votosAFavor: r.a_favor, votosEnContra: r.en_contra, dias: antiguedadEnHoras(r.creado_en, ahora) / 24 }) * 100) / 100 : null,
      }))
      .sort((a, b) => (puntuar ? b.puntaje - a.puntaje : 0) || b.creado.localeCompare(a.creado));
  }

  function distribucion(slotId, config) {
    if (!config.activo) return null;
    const def = ALGORITMO_POR_ID.get(slotId);
    const grafo = config.variante === "personalizado" && config.grafo ? config.grafo : grafoNativo(slotId, config.parametros);
    const rangos = Object.fromEntries(def.entradas.map((v) => [v.id, v.rango]));
    const s = simularGrafo(grafo, { modo: "algoritmo", rangos, iteraciones: 1500, semilla: 11 });
    return { probabilidad: s.probabilidad, media: s.media, histograma: s.histograma.map((h) => h.cuenta) };
  }

  /** Lo que cambia en la escuela con la configuración `despues` frente a la guardada. */
  function vistaPrevia(institucionId, slotId, antes, despues) {
    const def = ALGORITMO_POR_ID.get(slotId);
    switch (slotId) {
      case "comunidad.orden-feed": {
        const filas = publicaciones.all(institucionId);
        if (filas.length === 0) return { tipo: "vacio", texto: "Todavía no hay publicaciones en la comunidad para probarlo." };
        return {
          tipo: "ranking",
          titulo: "Así quedaría el feed",
          texto: despues.activo ? "Las fijadas siempre arriba; el resto, por el puntaje del algoritmo." : "Apagado: lo más nuevo arriba.",
          items: compararRankings(rankingFeed(filas, antes), rankingFeed(filas, despues)),
        };
      }
      case "comunidad.tendencias": {
        const previa = rankingTendencias(institucionId, antes);
        const nueva = rankingTendencias(institucionId, despues);
        const p = despues.parametros;
        const enLaPrevia = new Set(previa.map((o) => o.clave));
        const enLaNueva = new Set(nueva.map((o) => o.clave));
        return {
          tipo: "ranking",
          titulo: "Así quedarían las tendencias de tu escuela",
          texto: !despues.activo
            ? def.alDesactivar
            : nueva.length === 0
              ? "Con estos valores nada llega a ser tendencia ahora."
              : `${nueva.length} en tendencia · se propondrían a lo nacional las que superen ${formato(p.umbralNacional)} puntos (hasta ${Math.round(p.candidatas)}).`,
          items: compararRankings(previa, nueva, (o, i) => ({ nacional: i < Math.round(p.candidatas) && o.puntaje >= p.umbralNacional })),
          entran: nueva.filter((o) => !enLaPrevia.has(o.clave)).length,
          salen: previa.filter((o) => !enLaNueva.has(o.clave)).length,
        };
      }
      case "biblioteca.orden-catalogo": {
        const filas = recursos.all(institucionId);
        if (filas.length === 0) return { tipo: "vacio", texto: "La biblioteca institucional todavía no tiene recursos aprobados." };
        return {
          tipo: "ranking",
          titulo: "Así quedaría el catálogo",
          texto: despues.activo ? "Ordenado por el puntaje del algoritmo." : "Apagado: lo más nuevo arriba.",
          items: compararRankings(rankingCatalogo(filas, antes), rankingCatalogo(filas, despues)),
        };
      }
      case "perfiles.papelera": {
        const dias = enPapelera.all(institucionId).map((f) => f.dias);
        const purgados = (c) => (c.activo ? dias.filter((d) => d >= Math.round(c.parametros.dias)).length : 0);
        return {
          tipo: "impacto",
          titulo: "En la papelera de tu escuela",
          texto: dias.length === 0 ? "La papelera está vacía ahora." : `Hay ${dias.length} ${dias.length === 1 ? "perfil" : "perfiles"} en la papelera.`,
          cifras: [{ etiqueta: "se borrarían en la próxima purga", antes: purgados(antes), despues: purgados(despues) }],
        };
      }
      case "calendario.limpieza": {
        const viejos = (c) => (c.activo ? eventosViejos(db, institucionId, c.parametros.meses).length : 0);
        return {
          tipo: "impacto",
          titulo: "En el calendario de tu escuela",
          texto: despues.activo ? `Se conservan los últimos ${Math.round(despues.parametros.meses)} meses.` : def.alDesactivar,
          cifras: [{ etiqueta: "eventos viejos se borrarían en la próxima limpieza", antes: viejos(antes), despues: viejos(despues) }],
        };
      }
      case "objetivos.racha": {
        const hoy = hoyISO();
        const fechas = habitos.all(institucionId).map((h) => registros.all(h.id).map((r) => r.fecha));
        const resumen = (c) => {
          const rachas = fechas.map((f) => (c.activo ? calcularRacha(f, hoy, Math.round(c.parametros.diasGracia)) : 0));
          return { vivas: rachas.filter((r) => r > 0).length, promedio: rachas.length ? rachas.reduce((s, r) => s + r, 0) / rachas.length : 0 };
        };
        const a = resumen(antes);
        const d = resumen(despues);
        return {
          tipo: "impacto",
          titulo: "En los hábitos de tus estudiantes",
          texto: fechas.length === 0 ? "Todavía nadie registró hábitos." : `${fechas.length} hábitos activos en la escuela.`,
          cifras: [
            { etiqueta: "hábitos con la racha viva", antes: a.vivas, despues: d.vivas },
            { etiqueta: "días de racha en promedio", antes: Math.round(a.promedio * 10) / 10, despues: Math.round(d.promedio * 10) / 10 },
          ],
        };
      }
      default: {
        // Lo que se decide en el momento (la alerta de ritmo de una clase en
        // vivo) no tiene datos guardados: se lo prueba con miles de escenarios.
        if (!def.admiteGrafo) return { tipo: "vacio", texto: "Este algoritmo actúa en el momento: no hay datos guardados para previsualizarlo." };
        return {
          tipo: "distribucion",
          titulo: "Probado en 1500 escenarios simulados",
          texto: despues.activo ? "Con qué frecuencia se activaría, antes y después del cambio." : def.alDesactivar,
          antes: distribucion(slotId, antes),
          despues: distribucion(slotId, despues),
        };
      }
    }
  }

  app.post(
    "/api/instancia/edicion/vista-previa",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, PAGINA);
      if (!usuario) return;
      const slotId = String(req.body?.slot ?? "");
      if (!ALGORITMO_POR_ID.has(slotId)) return res.status(404).json({ error: "Ese algoritmo no existe." });
      const actual = leerGenoma(db, usuario.institucionId);
      const guardado = actual.algoritmos[slotId];
      let borrador;
      try {
        borrador = borradorDe(actual, { algoritmos: { [slotId]: objeto(req.body?.config) } }).algoritmos[slotId];
      } catch (error) {
        if (error instanceof ErrorGenoma) return res.status(400).json({ error: error.message });
        throw error;
      }
      res.json(vistaPrevia(usuario.institucionId, slotId, guardado, borrador));
    })
  );
}
