// ============================================================================
// NEXO — Servidor (la "cocina")
// ----------------------------------------------------------------------------
// Programa aparte de la aplicación. Es el ÚNICO que abre el archivador
// (base-de-datos/nexo.db) y atiende los pedidos de la vidriera en /api/*.
//
// Ventanillas abiertas hasta ahora:
//   /api/salud        → ¿está viva la cocina? (punto 5 del plan)
//   /api/sesion       → entrar, revalidar y salir (Etapa 1; ver sesiones.js)
//   /api/permisos     → ¿este rol puede ver esta pantalla? (Etapa 1; ver permisos.js)
//   /api/cuenta       → mis datos y cambio de contraseña (Etapa 1; ver cuenta.js)
//   /api/recuperacion → olvidé mi contraseña (Etapa 1; ver cuenta.js)
//
// Ventanillas de LECTURA de la Etapa 2 (una por módulo, según el punto 4.8 del
// plan). Todas devuelven datos reales de nexo.db y todas piden permiso antes de
// servir, con la misma función (`comun.js` → `exigirAcceso`):
//   /api/institucion  → nombre y ciclo lectivo reales (mata el "Ciclo 2025")
//   /api/perfiles     → la gente del colegio           (perfiles.js)
//   /api/cursos       → las divisiones y sus números   (perfiles.js)
//   /api/portafolio   → tareas, entregas y notas       (portafolio.js)
//   /api/objetivos    → metas, hábitos y competencias  (objetivos.js)
//   /api/comunidad/*  → feed, debates y tendencias     (comunidad.js)
//   /api/biblioteca/* → recursos                       (biblioteca.js)
//   /api/chat/*       → conversaciones y mensajes      (chat.js)
//   /api/calendario   → eventos y feriados             (calendario.js)
//   /api/comunicados  → comunicados a familias         (calendario.js)
//   /api/panel/*      → el panel de la dirección       (panel.js)
//
// Ventanillas de ESCRITURA de la Etapa 4 (el primer circuito completo):
//   /api/archivos     → subir y bajar archivos con permiso (archivos.js, 14.19)
//   /api/tareas/*     → crear, entregar, anular y corregir  (tareas.js, 14.7)
//   /api/entregas/*   → poner nota y devolución             (tareas.js)
//   /api/tareas-personales/* → recordatorios del estudiante (tareas.js)
//
//   Uso:  node servidor.js
//   Necesita Node.js 22.5+ (trae SQLite integrado; no hay que instalar nada).
// ============================================================================

import express from "express";
import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { registrarSesiones } from "./sesiones.js";
import { registrarPermisos } from "./permisos.js";
import { registrarCuenta } from "./cuenta.js";
import { registrarInstitucion } from "./institucion.js";
import { registrarPerfiles, programarPurgaPapelera } from "./perfiles.js";
import { registrarPortafolio } from "./portafolio.js";
import { registrarObjetivos } from "./objetivos.js";
import { registrarDiario } from "./diario.js";
import { registrarComunidad } from "./comunidad.js";
import { registrarBiblioteca } from "./biblioteca.js";
import { registrarChat } from "./chat.js";
import { registrarCalendario, programarLimpiezaEventos } from "./calendario.js";
import { registrarQuejas } from "./quejas.js";
import { registrarPanel } from "./panel.js";
import { registrarPlataforma } from "./plataforma.js";
import { registrarReportes } from "./reportes.js";
import { registrarAsistenciaIA } from "./asistencia-ia.js";
import { registrarArchivos } from "./archivos.js";
import { registrarTareas } from "./tareas.js";
import { registrarAula } from "./aula.js";
import { crearMensajero, conectarMensajero } from "./tiempo-real.js";
import { crearNotificaciones, registrarNotificaciones } from "./notificaciones.js";

const carpeta = dirname(fileURLToPath(import.meta.url));
const rutaBase = join(carpeta, "..", "base-de-datos", "nexo.db");
const PUERTO = 3000;

// ── 1. Abrir el archivador ──────────────────────────────────────────────────
// Si la base todavía no existe, avisamos claro en vez de fallar con un error
// críptico (se crea con: node ../base-de-datos/crear-base.mjs).
if (!existsSync(rutaBase)) {
  console.error(
    "No encuentro la base en " + rutaBase + "\n" +
    "Creala primero:  cd ../base-de-datos  &&  node crear-base.mjs"
  );
  process.exit(1);
}

const db = new DatabaseSync(rutaBase);

// Reglas de integridad activadas: que la base rechace datos incoherentes
// (por ejemplo, un comentario apuntando a un usuario que no existe).
db.exec("PRAGMA foreign_keys = ON;");

// ── 2. Armar la cocina ──────────────────────────────────────────────────────
const app = express();
app.use(express.json()); // entender pedidos con cuerpo en formato JSON

// El mensajero (Etapa 6): el "tubo" en vivo para chat y notificaciones. Se crea
// acá porque varias ventanillas lo necesitan (chat lo usa para empujar mensajes;
// notificaciones, para empujar avisos). Se engancha al servidor HTTP más abajo.
const mensajero = crearMensajero();
const notificaciones = crearNotificaciones(db, mensajero);

// ── 3. Primera ventanilla de prueba: ¿está viva la cocina? ──────────────────
app.get("/api/salud", (_req, res) => {
  // Consulta mínima para confirmar que además de estar viva, VE la base.
  const { total } = db
    .prepare("SELECT COUNT(*) AS total FROM usuarios")
    .get();

  res.json({
    estado: "viva",
    mensaje: "La cocina de NEXO está funcionando.",
    baseConectada: true,
    usuariosEnLaBase: total,
    hora: new Date().toISOString(),
  });
});

// ── 4. Ventanillas de ingreso y sesión (Etapa 1) ────────────────────────────
registrarSesiones(app, db);

// ── 5. Ventanilla de permisos (Etapa 1, Error 12.6) ─────────────────────────
registrarPermisos(app, db);

// ── 6. Cuenta propia y recuperación (Etapa 1, Errores 2.A.1 y 12.5) ─────────
registrarCuenta(app, db);

// ── 7. Ventanillas de lectura, una por módulo (Etapa 2) ─────────────────────
// El orden es el del plan: primero la institución (la usa media aplicación),
// después pantalla por pantalla.
registrarInstitucion(app, db);
registrarPerfiles(app, db);
// Etapa 4: servicio transversal de archivos (14.19) y circuito de tareas (14.7).
// El de archivos va antes que el de tareas porque las tareas lo referencian.
registrarArchivos(app, db, carpeta);
registrarTareas(app, db);
registrarPortafolio(app, db);
registrarObjetivos(app, db);
// Diario reflexivo del docente (Errores 3.C.3 y 3.C.6): crear/editar/borrar y que
// los registros sobrevivan a la recarga, contra diario_registros. Permiso por fila.
registrarDiario(app, db);
registrarComunidad(app, db);
// Biblioteca (Etapa 7): además de leer, ahora presenta recursos, arma la cola de
// revisión y aprueba/rechaza avisando al que presentó (14.11). Por eso recibe el
// servicio de notificaciones.
registrarBiblioteca(app, db, notificaciones);
// Quejas anónimas (Etapa 7, 14.14): canal sin autor, no vistas arriba y
// estadística mensual. Avisa al Centro de Estudiantes y a la dirección.
registrarQuejas(app, db, notificaciones);
// Chat (Etapa 6): además de leer, ahora envía, marca leído y modera. Recibe el
// mensajero (para el aviso en vivo) y el servicio de notificaciones (para el
// aviso pendiente de quien no está conectado).
registrarChat(app, db, mensajero, notificaciones);
// Notificaciones (Etapa 6, servicio transversal 14.15): la campana y los globitos.
registrarNotificaciones(app, db);
// Calendario (Etapa 7): además de leer, ahora crea/edita/borra eventos con
// permisos por rol y capas de visibilidad, y los comunicados se pueden emitir,
// marcar leídos y responder por chat privado (14.12 y 14.13). Recibe el servicio
// de notificaciones para avisar a las familias.
registrarCalendario(app, db, notificaciones);
registrarPanel(app, db);
// Panel del administrador de plataforma: separado del de la dirección (Etapa 3,
// sección 5). Solo instituciones, salud y logs_sistema.
registrarPlataforma(app, db);
// Reportes y expedientes de la dirección (Etapa 8, 14.18): casillas → archivo
// descargable de verdad. Recibe `carpeta` para guardar el archivo generado en el
// mismo almacén que las subidas (reutiliza archivos.js).
registrarReportes(app, db, carpeta);
// Asistencia IA real (Etapa 8, 14.16): arma el pedido con config_ia + la
// conversación y llama al proveedor gratuito. La clave vive en una variable de
// entorno del servidor (NEXO_IA_CLAVE), nunca en la base ni en el navegador.
registrarAsistenciaIA(app, db);
// Aula virtual y clases en vivo (Etapa 9, 14.3): planificación, sala con Jitsi,
// asistencia nominal, pizarra del docente, pulso con nombres, alerta de ritmo
// (regla con umbral, no IA) y trayectoria en vivo. Recibe el mensajero (para
// empujar trazos, pulso, etapas y la alerta) y las notificaciones.
registrarAula(app, db, mensajero, notificaciones);

// ── 8. Encender ─────────────────────────────────────────────────────────────
// Antes bastaba con `app.listen`. Ahora el mensajero (WebSocket) tiene que
// compartir el MISMO puerto que las ventanillas /api, así que se arma el
// servidor HTTP a mano y se le enganchan las dos cosas: Express para /api/* y
// el mensajero para /ws.
const servidor = createServer(app);
conectarMensajero(servidor, db, mensajero);

// Mantenimiento del calendario (Error 6.E.7): borra los eventos pasados con más
// de un año al arrancar y una vez por día. El temporizador no impide el apagado.
programarLimpiezaEventos(db);

// Mantenimiento de la papelera de perfiles (Error 6.B.5, sección 14.17): purga
// los perfiles con más de 7 días en la papelera al arrancar y cada seis horas,
// dejando el rastro 'purgado' en papelera_movimientos. Ya no depende de que la
// dirección abra la lista. El temporizador tampoco impide el apagado.
programarPurgaPapelera(db);

servidor.listen(PUERTO, () => {
  console.log("Cocina de NEXO encendida en http://localhost:" + PUERTO);
  console.log("Ventanilla de prueba:      http://localhost:" + PUERTO + "/api/salud");
  console.log("Mensajero en vivo:         ws://localhost:" + PUERTO + "/ws");
});

// Apagado ordenado (Ctrl+C): cerrar la base antes de salir.
process.on("SIGINT", () => {
  console.log("\nApagando la cocina...");
  servidor.close();
  db.close();
  process.exit(0);
});
