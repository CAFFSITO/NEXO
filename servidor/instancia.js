// ============================================================================
// NEXO — La instancia de cada escuela, vista desde adentro
// ----------------------------------------------------------------------------
// Tres piezas:
//
//   1. La GUARDIA: un portero que mira cada pedido a /api antes de que llegue a
//      su ventanilla. Si el pedido toca un módulo oculto o una función apagada
//      en el genoma de la escuela de quien pide, lo frena con 403 (aunque se
//      llame a la API a mano: regla de oro 4). Y si es una escritura que terminó
//      bien, avisa al motor de flujos que ocurrió ese evento.
//
//   2. GET /api/instancia → lo que la vidriera necesita para dibujarse según el
//      genoma: colores, nombre de la escuela, el perfil de la persona y sus
//      módulos en el orden y con los nombres que eligió el Maestro.
//
//   3. Las ventanillas de la DIRECCIÓN: ver qué ocultó el Maestro y volver a
//      mostrarlo (el Maestro oculta; la dirección puede desocultar), y la lista
//      de perfiles de su escuela para asignarlos al dar de alta a alguien. El
//      modo edición completo (jerarquía, módulos, algoritmos) vive en edicion.js.
// ============================================================================

import { leerToken } from "./sesiones.js";
import { exigirAcceso, exigirSesion, ventanilla } from "./comun.js";
import {
  TEMA_BASE,
  MODULOS,
  arquetiposDeModulo,
  leerGenoma,
  versionDeGenoma,
  guardarGenoma,
  resolucionDe,
  funcionesDeRuta,
  modulosDeRuta,
  eventoDeRuta,
  ErrorGenoma,
} from "./genoma.js";

export function crearGuardiaInstancia(db, motorFlujos) {
  const buscar = db.prepare(
    `SELECT u.id, u.rol, u.institucion_id, u.perfil_clave
       FROM sesiones s
       JOIN usuarios u ON u.id = s.usuario_id
      WHERE s.token = ?
        AND s.expira_en > datetime('now')
        AND u.estado = 'activo'`
  );

  return function guardia(req, res, next) {
    if (!req.path.startsWith("/api/")) return next();
    const token = leerToken(req);
    if (!token) return next();
    const fila = buscar.get(token);
    // Sin sesión válida o sin escuela (el Maestro): cada ventanilla decide.
    if (!fila || fila.institucion_id === null) return next();

    const usuario = { id: fila.id, rol: fila.rol, institucionId: fila.institucion_id, perfilClave: fila.perfil_clave };
    const r = resolucionDe(db, usuario);

    const modulos = modulosDeRuta(req.path, usuario.rol);
    if (modulos.length && modulos.every((m) => !r.visibles.has(m))) {
      return res.status(403).json({ error: "Esta sección está oculta en tu institución.", codigo: "modulo-oculto" });
    }
    for (const f of funcionesDeRuta(req.method, req.path, req.body)) {
      if (r.funcionesOff.has(f.id)) {
        return res.status(403).json({
          error: `La función «${f.nombre}» está desactivada en tu institución.`,
          codigo: "funcion-desactivada",
          funcion: f.id,
        });
      }
    }

    const evento = eventoDeRuta(req.method, req.path);
    if (evento && motorFlujos) {
      res.on("finish", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) return;
        motorFlujos.emitir(evento.id, {
          institucionId: usuario.institucionId,
          actor: evento.anonimo ? null : { id: usuario.id, rol: usuario.rol },
        });
      });
    }
    next();
  };
}

// El Maestro no pertenece a ninguna escuela: su "instancia" es la plataforma.
const INSTANCIA_MAESTRO = {
  institucion: null,
  identidad: { nombre: "NEXO", lema: "Estudio del Maestro", icono: "hub" },
  tema: TEMA_BASE,
  perfil: { clave: "maestro", nombre: "Maestro", color: "#ff4fd8", icono: "auto_awesome", arquetipo: "administrador", predeterminado: true },
  secciones: [],
  modulos: [],
  funcionesDesactivadas: [],
  capacidades: [],
  inicio: "",
};

export function registrarInstancia(app, db) {
  const institucion = db.prepare("SELECT id, nombre, ciclo_lectivo FROM instituciones WHERE id = ?");

  app.get(
    "/api/instancia",
    ventanilla((req, res) => {
      const usuario = exigirSesion(db, req, res);
      if (!usuario) return;
      if (usuario.institucionId === null) return res.json(INSTANCIA_MAESTRO);

      const genoma = leerGenoma(db, usuario.institucionId);
      const r = resolucionDe(db, usuario);
      const inst = institucion.get(usuario.institucionId);
      res.json({
        institucion: inst ? { id: String(inst.id), nombre: inst.nombre, cicloLectivo: inst.ciclo_lectivo } : null,
        identidad: { nombre: genoma.identidad.nombre, lema: genoma.identidad.lema, icono: genoma.identidad.icono },
        tema: genoma.tema,
        perfil: {
          clave: r.perfil.clave,
          nombre: r.perfil.nombre,
          color: r.perfil.color,
          icono: r.perfil.icono,
          arquetipo: r.perfil.arquetipo,
          predeterminado: r.perfil.predeterminado,
        },
        // La jerarquía del menú que armó la dirección (o el Maestro).
        secciones: genoma.secciones,
        modulos: r.modulos.map(({ id, padre, paginas, etiqueta, icono, orden, seccion, visible }) => ({ id, padre, paginas, etiqueta, icono, orden, seccion, visible })),
        funcionesDesactivadas: [...r.funcionesOff],
        // Lo que solo algunos perfiles pueden (subir multimedia, fijar): lo
        // eligió la dirección en su modo edición.
        capacidades: [...r.capacidades],
        inicio: r.perfil.inicio && r.visibles.has(r.perfil.inicio) ? r.perfil.inicio : "",
      });
    })
  );

  // ── Perfiles de la escuela (para asignarlos al dar de alta) ────────────────
  const cuantosPorPerfil = db.prepare(
    `SELECT rol, perfil_clave, COUNT(*) AS n FROM usuarios
      WHERE institucion_id = ? AND estado <> 'papelera'
      GROUP BY rol, perfil_clave`
  );

  app.get(
    "/api/instancia/perfiles",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "perfiles-academicos");
      if (!usuario) return;
      const genoma = leerGenoma(db, usuario.institucionId);
      const conteos = cuantosPorPerfil.all(usuario.institucionId);
      res.json({
        perfiles: genoma.perfiles.map((p) => ({
          clave: p.clave,
          nombre: p.nombre,
          arquetipo: p.arquetipo,
          color: p.color,
          icono: p.icono,
          predeterminado: p.predeterminado,
          usuarios: conteos
            .filter((c) => c.rol === p.arquetipo && (p.predeterminado ? !c.perfil_clave || c.perfil_clave === p.clave : c.perfil_clave === p.clave))
            .reduce((s, c) => s + c.n, 0),
        })),
      });
    })
  );

  // ── Módulos ocultos: la dirección los ve y los puede volver a mostrar ──────
  function vistaModulos(genoma) {
    return MODULOS.map((m) => ({
      id: m.id,
      nombre: genoma.modulos[m.id].etiqueta || m.nombre,
      nombreOriginal: m.nombre,
      icono: genoma.modulos[m.id].icono || m.icono,
      color: m.color,
      descripcion: m.descripcion,
      padre: m.padre ?? null,
      arquetipos: arquetiposDeModulo(m.id),
      oculto: genoma.modulos[m.id].oculto,
      perfilesOcultos: genoma.perfiles
        .filter((p) => p.modulos[m.id]?.oculto)
        .map((p) => ({ clave: p.clave, nombre: p.nombre, color: p.color })),
    }));
  }

  app.get(
    "/api/instancia/modulos",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "modulos-institucion");
      if (!usuario) return;
      const genoma = leerGenoma(db, usuario.institucionId);
      res.json({ version: versionDeGenoma(db, usuario.institucionId), modulos: vistaModulos(genoma) });
    })
  );

  const registrarLog = db.prepare(
    "INSERT INTO logs_sistema (nivel, mensaje, contexto) VALUES ('info', ?, 'instancia')"
  );

  app.post(
    "/api/instancia/modulos/:id/desocultar",
    ventanilla((req, res) => {
      const usuario = exigirAcceso(db, req, res, "modulos-institucion");
      if (!usuario) return;
      const id = String(req.params.id);
      const actual = leerGenoma(db, usuario.institucionId);
      if (!actual.modulos[id]) return res.status(404).json({ error: "Ese módulo no existe." });

      // Se trabaja sobre una copia: el genoma en memoria no se toca hasta que
      // la nueva versión quede guardada.
      const genoma = structuredClone(actual);
      const clave = req.body?.perfil ? String(req.body.perfil) : null;
      let detalle;
      if (clave) {
        const perfil = genoma.perfiles.find((p) => p.clave === clave);
        if (!perfil?.modulos[id]?.oculto) {
          return res.status(409).json({ error: "Ese módulo ya está visible para ese perfil." });
        }
        delete perfil.modulos[id].oculto;
        if (!Object.keys(perfil.modulos[id]).length) delete perfil.modulos[id];
        detalle = `para ${perfil.nombre}`;
      } else {
        if (!genoma.modulos[id].oculto) return res.status(409).json({ error: "Ese módulo ya está visible." });
        genoma.modulos[id].oculto = false;
        detalle = "para toda la institución";
      }

      try {
        const version = guardarGenoma(db, usuario.institucionId, genoma, {
          usuarioId: usuario.id,
          autorRol: "direccion",
          nota: `La dirección volvió a mostrar «${MODULOS.find((m) => m.id === id).nombre}» ${detalle}`,
        });
        registrarLog.run(`Una dirección desocultó un módulo (${id})`);
        res.json({ version, modulos: vistaModulos(leerGenoma(db, usuario.institucionId)) });
      } catch (error) {
        if (error instanceof ErrorGenoma) return res.status(409).json({ error: error.message });
        throw error;
      }
    })
  );
}
