// ============================================================================
// NEXO — Piezas comunes a todas las ventanillas de datos (Etapa 2)
// ----------------------------------------------------------------------------
// La Etapa 2 suma una ventanilla de lectura por módulo. Todas necesitan lo
// mismo antes de servir un solo dato: saber QUIÉN pregunta y si tiene permiso.
// Si cada ventanilla lo resolviera a su manera, tendríamos diez versiones de la
// misma regla y bastaría con que una se olvidara de mirar el rol para que se
// filtre información (sección 1.4: una sola fuente de verdad, no una copia por
// pantalla).
//
// Acá está esa única versión. La regla de fondo es la regla de oro 4 del plan:
// el permiso se decide en la cocina, no escondiendo botones en la vidriera.
// ============================================================================

import { usuarioDeLaSesion } from "./sesiones.js";
import { puedeVer } from "./permisos.js";

/**
 * Portero de las ventanillas de datos.
 *
 * Devuelve el usuario de la sesión si puede ver `pagina`, o `null` si no. Si
 * devuelve `null` ya contestó el pedido con el código y el motivo correctos: la
 * ventanilla solo tiene que cortar (`if (!usuario) return;`).
 *
 * `pagina` es la misma pantalla que declara `ROLES_POR_PAGINA` en permisos.js:
 * la lista de roles se escribe una sola vez y sirve para las dos cosas (dejar
 * entrar a la pantalla y dejar leer sus datos). Si alguna vez se separan, hay
 * que tocar permisos.js, no cada ventanilla.
 */
export function exigirAcceso(db, req, res, pagina) {
  const usuario = usuarioDeLaSesion(db, req);

  if (!usuario) {
    res.status(401).json({ error: "No hay sesión abierta." });
    return null;
  }

  if (!puedeVer(usuario.rol, pagina)) {
    res.status(403).json({ error: "No tenés permiso para ver esta sección." });
    return null;
  }

  return usuario;
}

/**
 * Igual que `exigirAcceso`, pero sin atarse a una pantalla: sirve para los
 * datos que NO son de un módulo, sino de cualquiera que tenga sesión (por
 * ejemplo el nombre y el ciclo lectivo de la institución, que se muestran en
 * el encabezado de media aplicación).
 */
export function exigirSesion(db, req, res) {
  const usuario = usuarioDeLaSesion(db, req);
  if (!usuario) {
    res.status(401).json({ error: "No hay sesión abierta." });
    return null;
  }
  return usuario;
}

/**
 * Envoltorio para que un error inesperado de SQL no tire abajo la cocina entera
 * ni le conteste al navegador con el detalle interno de la consulta (que es
 * información útil para quien quiera atacarla). Se registra completo en la
 * terminal, donde lo ve quien opera, y afuera sale un mensaje neutro.
 */
export function ventanilla(manejador) {
  return (req, res) => {
    try {
      manejador(req, res);
    } catch (error) {
      console.error("Error atendiendo " + req.method + " " + req.originalUrl);
      console.error(error);
      res.status(500).json({ error: "La cocina no pudo preparar este pedido." });
    }
  };
}

// ── Ayudas de lectura ───────────────────────────────────────────────────────

/**
 * El curso de un estudiante, escrito como lo muestra la pantalla ("4° B").
 * Vive acá porque lo necesitan varias ventanillas y ya lo necesitaba
 * `sesiones.js`: que la respuesta sea siempre la misma cadena.
 */
export function cursoDeEstudiante(db, estudianteId) {
  const fila = db
    .prepare(
      `SELECT c.id, c.anio, c.division
         FROM inscripciones i
         JOIN cursos c ON c.id = i.curso_id
        WHERE i.estudiante_id = ?
        LIMIT 1`
    )
    .get(estudianteId);

  if (!fila) return null;
  return { id: fila.id, nombre: `${fila.anio}° ${fila.division}` };
}

/**
 * ¿Está este estudiante inscripto en este curso? Lo usan varias ventanillas
 * para decidir permisos de fila (ver la tarea de mi curso, bajar el adjunto de
 * una consigna, entregar). Vive acá para que la pregunta sea siempre la misma.
 */
export function estaInscripto(db, estudianteId, cursoId) {
  const fila = db
    .prepare(
      "SELECT 1 FROM inscripciones WHERE estudiante_id = ? AND curso_id = ?"
    )
    .get(estudianteId, cursoId);
  return fila !== undefined;
}

/** Fecha de hoy en el mismo formato que guarda la base ("2026-07-16"). */
export function hoyISO() {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

// ── Voto único, con regla de alternancia (Error 2.B.1) ──────────────────────

/**
 * La regla de voto de NEXO, en un solo lugar. La usan la comunidad (publicación,
 * debate, comentario) y la biblioteca (recurso): todas votan sobre la misma
 * tabla `votos`, así que la regla —poner, cambiar o sacar— tiene que ser una
 * sola y no una copia por módulo.
 *
 * Tocar el mismo sentido que ya se tenía QUITA el voto; tocar el otro lo CAMBIA;
 * sin voto previo lo CREA. Un solo voto por persona y objeto lo garantiza el
 * índice UNIQUE(usuario_id, objeto_tipo, objeto_id) de la tabla.
 *
 * NO valida permisos ni que el objeto exista: eso es de cada módulo, que sabe a
 * quién le deja votar qué. Acá solo se aplica el voto y se devuelven los totales
 * frescos, calculados de la tabla, para que la vidriera no invente números.
 *
 * @returns {{ miVoto: 1 | -1 | null, votosAFavor: number, votosEnContra: number }}
 */
export function aplicarVoto(db, usuarioId, objetoTipo, objetoId, valor) {
  const previo = db
    .prepare(
      "SELECT id, valor FROM votos WHERE usuario_id = ? AND objeto_tipo = ? AND objeto_id = ?"
    )
    .get(usuarioId, objetoTipo, objetoId);

  let miVoto;
  if (!previo) {
    db.prepare(
      "INSERT INTO votos (usuario_id, objeto_tipo, objeto_id, valor) VALUES (?, ?, ?, ?)"
    ).run(usuarioId, objetoTipo, objetoId, valor);
    miVoto = valor;
  } else if (previo.valor === valor) {
    db.prepare("DELETE FROM votos WHERE id = ?").run(previo.id);
    miVoto = null; // tocar el mismo sentido retira el voto
  } else {
    db.prepare(
      "UPDATE votos SET valor = ?, creado_en = datetime('now') WHERE id = ?"
    ).run(valor, previo.id);
    miVoto = valor;
  }

  const totales = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN valor = 1 THEN 1 ELSE 0 END), 0)  AS a_favor,
         COALESCE(SUM(CASE WHEN valor = -1 THEN 1 ELSE 0 END), 0) AS en_contra
       FROM votos WHERE objeto_tipo = ? AND objeto_id = ?`
    )
    .get(objetoTipo, objetoId);

  return { miVoto, votosAFavor: totales.a_favor, votosEnContra: totales.en_contra };
}

/** El voto propio como lo espera la vidriera: "a-favor" / "en-contra" / null. */
export function nombreDeVoto(valor) {
  return valor === 1 ? "a-favor" : valor === -1 ? "en-contra" : null;
}
