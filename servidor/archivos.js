// ============================================================================
// NEXO — Servicio de archivos (Etapa 4, sección 14.19)
// ----------------------------------------------------------------------------
// UNA sola pieza que sube y baja archivos para todos los módulos (entregas,
// recursos, adjuntos de chat, evidencias, comunicados). Los demás módulos NO
// guardan archivos por su cuenta: suben acá, se quedan con el `id` que devuelve
// y lo referencian. Así hay un solo lugar donde vive un archivo y un solo lugar
// donde se decide quién puede bajarlo (principio de fuente única, sección 1.4).
//
// Las dos ventanillas:
//   POST /api/archivos      → subir. El cuerpo son los bytes crudos del archivo;
//                             el nombre y el tipo viajan en cabeceras. Devuelve
//                             el registro creado en la tabla `archivos`.
//   GET  /api/archivos/:id  → bajar. Antes de entregar un solo byte comprueba
//                             que QUIEN pide tiene permiso sobre ese archivo
//                             (regla de oro 4 del plan): no alcanza con conocer
//                             el número, hay que tener una relación real con él.
//
// Por qué bytes crudos y no un formulario multipart: el navegador manda el
// archivo con `fetch(..., { body: File })`, que viaja como un cuerpo binario
// simple. Parsear multipart a mano es frágil y traería una dependencia nueva;
// con `express.raw` alcanza y no se instala nada (regla: reutilizar, no sumar).
// ============================================================================

import express from "express";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { randomBytes } from "node:crypto";
import { exigirSesion, ventanilla, estaInscripto } from "./comun.js";

// Tope de tamaño: 15 MB. Suficiente para una entrega (documento, imagen, PDF) y
// un freno para que nadie llene el disco del servidor de una.
const LIMITE_BYTES = 15 * 1024 * 1024;

// Tipos permitidos. Lista blanca, no negra: se nombra lo que SÍ entra, así un
// tipo nuevo peligroso no pasa por olvido. Cubre documentos, imágenes y los
// comprimidos habituales de una entrega escolar. Nada de ejecutables.
const TIPOS_PERMITIDOS = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-zip-compressed",
  "text/plain",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

/**
 * ¿Puede este usuario bajar este archivo? Devuelve el registro del archivo si
 * sí, o null si no (y en ese caso ya se contestó con el código correcto).
 *
 * Las reglas, de la más simple a la más específica:
 *   1. Quien lo subió siempre puede: es suyo.
 *   2. Adjunto de la consigna de una tarea → lo ven el docente de esa cátedra y
 *      los estudiantes inscriptos en su curso.
 *   3. Archivo de una entrega → lo ven el autor de la entrega y el docente que
 *      la corrige. Nadie más (ni siquiera un compañero del curso).
 *
 * A medida que otros módulos (biblioteca, chat, evidencias) usen este servicio,
 * se suman acá sus relaciones. Por defecto: si no hay una relación conocida que
 * habilite, NO se baja. Negar es la respuesta segura.
 */
function archivoDescargable(db, usuario, archivoId, res) {
  const archivo = db
    .prepare("SELECT * FROM archivos WHERE id = ?")
    .get(archivoId);

  if (!archivo) {
    res.status(404).json({ error: "Ese archivo no existe." });
    return null;
  }

  // 1. El dueño.
  if (archivo.subido_por === usuario.id) return archivo;

  // 2. Adjunto de la consigna de una tarea.
  const comoAdjunto = db
    .prepare(
      `SELECT ca.profesor_id, ca.curso_id
         FROM tarea_adjuntos ta
         JOIN tareas t   ON t.id = ta.tarea_id
         JOIN catedras ca ON ca.id = t.catedra_id
        WHERE ta.archivo_id = ?`
    )
    .get(archivoId);
  if (comoAdjunto) {
    if (usuario.id === comoAdjunto.profesor_id) return archivo;
    if (estaInscripto(db, usuario.id, comoAdjunto.curso_id)) return archivo;
  }

  // 3. Archivo de una entrega.
  const comoEntrega = db
    .prepare(
      `SELECT e.estudiante_id, ca.profesor_id
         FROM entrega_archivos ea
         JOIN entregas e ON e.id = ea.entrega_id
         JOIN tareas t   ON t.id = e.tarea_id
         JOIN catedras ca ON ca.id = t.catedra_id
        WHERE ea.archivo_id = ?`
    )
    .get(archivoId);
  if (comoEntrega) {
    if (usuario.id === comoEntrega.estudiante_id) return archivo;
    if (usuario.id === comoEntrega.profesor_id) return archivo;
  }

  // 4. Adjunto de un mensaje de chat → lo ven los miembros de esa conversación
  //    (Error 2.F.3). El que lo mandó ya pasó por la regla 1; esto habilita a
  //    quien lo recibe. Solo miembros: un tercero con el número no lo baja.
  const comoAdjuntoChat = db
    .prepare(
      `SELECT 1
         FROM mensajes m
         JOIN conversacion_miembros cm ON cm.conversacion_id = m.conversacion_id
        WHERE m.archivo_id = ? AND cm.usuario_id = ?
        LIMIT 1`
    )
    .get(archivoId, usuario.id);
  if (comoAdjuntoChat) return archivo;

  // 5. Archivo de un recurso de BIBLIOTECA (Error 2.E.4). Un recurso aprobado
  //    lo baja quien puede verlo en la biblioteca: cualquiera si es nacional,
  //    la gente del colegio si es institucional. Uno todavía en revisión solo
  //    lo bajan quienes revisan (bibliotecario / dirección de ese colegio);
  //    el autor ya pasó por la regla 1.
  const comoRecurso = db
    .prepare(
      `SELECT institucion_id, alcance, estado
         FROM recursos
        WHERE archivo_id = ? AND eliminado_en IS NULL`
    )
    .get(archivoId);
  if (comoRecurso) {
    const delColegio =
      comoRecurso.institucion_id === null ||
      comoRecurso.institucion_id === usuario.institucionId;
    if (comoRecurso.estado === "aprobado") {
      if (comoRecurso.alcance === "nacional" || delColegio) return archivo;
    }
    if (
      comoRecurso.estado === "en-revision" &&
      delColegio &&
      (usuario.rol === "bibliotecario" || usuario.rol === "admin-academico")
    ) {
      return archivo;
    }
  }

  // 6. Adjunto de un COMUNICADO → lo baja la familia destinataria (14.13):
  //    si el comunicado es de toda la institución, cualquier familia del
  //    colegio; si es de un curso, la familia con un hijo inscripto en él.
  //    El emisor ya pasó por la regla 1.
  const comoComunicado = db
    .prepare(
      `SELECT institucion_id, curso_id FROM comunicados WHERE archivo_id = ?`
    )
    .get(archivoId);
  if (comoComunicado && comoComunicado.institucion_id === usuario.institucionId) {
    if (comoComunicado.curso_id === null) return archivo;
    const esDestinataria = db
      .prepare(
        `SELECT 1
           FROM familiares f
           JOIN inscripciones i ON i.estudiante_id = f.estudiante_id
          WHERE f.usuario_familia_id = ? AND i.curso_id = ?
          LIMIT 1`
      )
      .get(usuario.id, comoComunicado.curso_id);
    if (esDestinataria) return archivo;
  }

  res.status(403).json({ error: "No tenés permiso para ver este archivo." });
  return null;
}

/** Deja un nombre de archivo sin separadores de ruta ni caracteres raros. */
function nombreSeguro(nombre) {
  const limpio = basename(nombre).replace(/[^\w.\- ]+/g, "_").trim();
  return limpio || "archivo";
}

/**
 * Guarda un archivo generado POR EL SERVIDOR (no subido por el navegador) en el
 * mismo almacén y con el mismo registro que las subidas normales. Lo usa el
 * módulo de reportes (Etapa 8, 14.18): en vez de duplicar la lógica de "escribir
 * en disco + anotar en la tabla `archivos`", reutiliza esta única pieza
 * (principio de fuente única, sección 1.4). Devuelve el registro creado.
 *
 * El `subidoPor` es quien lo generó: así, la ventanilla de descarga
 * (`archivoDescargable`, regla 1: el dueño) lo deja bajar sin permisos extra.
 */
export function guardarArchivoServidor(
  db,
  carpetaServidor,
  { nombreOriginal, tipoMime, bytes, subidoPor }
) {
  const almacen = join(carpetaServidor, "almacen");
  mkdirSync(almacen, { recursive: true });

  const nombre = nombreSeguro(nombreOriginal);
  const enDisco = randomBytes(12).toString("hex") + extname(nombre);
  writeFileSync(join(almacen, enDisco), bytes);

  const info = db
    .prepare(
      `INSERT INTO archivos (nombre_original, ruta_local, tipo_mime, tamano_bytes, subido_por)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(nombre, enDisco, tipoMime, bytes.length, subidoPor);

  return {
    id: Number(info.lastInsertRowid),
    nombreOriginal: nombre,
    tipoMime,
    tamanoBytes: bytes.length,
  };
}

export function registrarArchivos(app, db, carpetaServidor) {
  // Carpeta donde quedan los bytes. Se crea si no existe (la primera subida no
  // debería fallar por una carpeta que falta).
  const almacen = join(carpetaServidor, "almacen");
  mkdirSync(almacen, { recursive: true });

  // ── Subir ──────────────────────────────────────────────────────────────────
  // express.raw junta el cuerpo binario en un Buffer. Se limita acá también el
  // tamaño: sin esto, alguien podría mandar gigabytes antes de que miremos.
  app.post(
    "/api/archivos",
    express.raw({ type: "*/*", limit: LIMITE_BYTES }),
    ventanilla((req, res) => {
      const usuario = exigirSesion(db, req, res);
      if (!usuario) return;

      const bytes = req.body;
      if (!Buffer.isBuffer(bytes) || bytes.length === 0) {
        return res.status(400).json({ error: "No llegó ningún archivo." });
      }
      if (bytes.length > LIMITE_BYTES) {
        return res
          .status(413)
          .json({ error: "El archivo supera el límite de 15 MB." });
      }

      const tipo = String(req.headers["content-type"] || "").split(";")[0].trim();
      if (!TIPOS_PERMITIDOS.has(tipo)) {
        return res
          .status(415)
          .json({ error: "Ese tipo de archivo no está permitido." });
      }

      // El nombre original viaja codificado en una cabecera propia (una cabecera
      // HTTP no admite acentos ni espacios crudos, así que va URL-encoded).
      const nombreOriginal = decodeURIComponent(
        String(req.headers["x-nombre-archivo"] || "archivo")
      );

      // Escribir en disco y anotar en la tabla, con la MISMA pieza que usa el
      // servidor para los reportes que genera él mismo (sección 1.4).
      const guardado = guardarArchivoServidor(db, carpetaServidor, {
        nombreOriginal,
        tipoMime: tipo,
        bytes,
        subidoPor: usuario.id,
      });

      res.status(201).json({
        archivo: {
          id: String(guardado.id),
          nombreOriginal: guardado.nombreOriginal,
          tipoMime: guardado.tipoMime,
          tamanoBytes: guardado.tamanoBytes,
        },
      });
    })
  );

  // ── Bajar ────────────────────────────────────────────────────────────────
  app.get(
    "/api/archivos/:id",
    ventanilla((req, res) => {
      const usuario = exigirSesion(db, req, res);
      if (!usuario) return;

      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: "Identificador inválido." });
      }

      const archivo = archivoDescargable(db, usuario, id, res);
      if (!archivo) return; // ya contestó con 403/404

      const ruta = join(almacen, archivo.ruta_local);
      if (!existsSync(ruta)) {
        return res
          .status(404)
          .json({ error: "El archivo figura registrado pero no está en el disco." });
      }

      res.setHeader("Content-Type", archivo.tipo_mime);
      // attachment = el navegador lo descarga; el nombre que ve la persona es el
      // original, no el hexadecimal con que lo guardamos.
      res.setHeader(
        "Content-Disposition",
        `attachment; filename*=UTF-8''${encodeURIComponent(archivo.nombre_original)}`
      );
      res.send(readFileSync(ruta));
    })
  );
}
